const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { join } = require('path');
const sqlite3 = require('sqlite3');

const app = express();
const port = process.env.PORT || 4000;
const dbFile = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile);

app.use(cors({ origin: true }));
app.use(express.json());

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initializeDatabase() {
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);
}

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function getUserByToken(token) {
  if (!token) return null;
  const row = await get(`SELECT u.id, u.name, u.email FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ?`, [token]);
  return row || null;
}

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const { salt, hash } = hashPassword(password);
    const result = await run('INSERT INTO users (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)', [name, email, hash, salt]);
    const user = await get('SELECT id, name, email, created_at FROM users WHERE id = ?', [result.id]);
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await get('SELECT id, name, email, password_hash, password_salt FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const { hash } = hashPassword(password, user.password_salt);
    if (hash !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = createToken();
    await run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(400).json({ error: 'Token required.' });
    await run('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/posts', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const currentUser = await getUserByToken(token);
    const posts = await all(`
      SELECT p.id, p.user_id, u.name AS author, p.content, p.created_at,
        (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count,
        EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = ?) AS favorited_by_user
      FROM posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `, [currentUser?.id || null]);

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const currentUser = await getUserByToken(token);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized.' });

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content is required.' });
    }

    const result = await run('INSERT INTO posts (user_id, content) VALUES (?, ?)', [currentUser.id, content.trim()]);
    const post = await get(`
      SELECT p.id, p.user_id, u.name AS author, p.content, p.created_at,
        0 AS favorites_count,
        0 AS favorited_by_user
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const currentUser = await getUserByToken(token);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized.' });

    const postId = Number(req.params.postId);
    const post = await get('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== currentUser.id) return res.status(403).json({ error: 'Forbidden.' });

    await run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:postId/favorite', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const currentUser = await getUserByToken(token);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized.' });

    const postId = Number(req.params.postId);
    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    await run('INSERT OR IGNORE INTO favorites (user_id, post_id) VALUES (?, ?)', [currentUser.id, postId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:postId/favorite', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const currentUser = await getUserByToken(token);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized.' });

    const postId = Number(req.params.postId);
    await run('DELETE FROM favorites WHERE user_id = ? AND post_id = ?', [currentUser.id, postId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const currentUser = await getUserByToken(token);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized.' });
    res.json({ user: currentUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Back-end running on http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});
