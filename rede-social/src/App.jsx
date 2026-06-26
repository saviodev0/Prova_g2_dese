import { useState } from 'react'
import './App.css'

const initialPosts = [
  {
    id: 1,
    author: 'Maya',
    handle: '@maya',
    time: 'há 8 min',
    content: 'Amanhecer com café e uma ideia nova. O dia já começou com energia!',
    likes: 12,
    liked: false,
  },
  {
    id: 2,
    author: 'Davi',
    handle: '@davi',
    time: 'há 22 min',
    content: 'Minha primeira publicação aqui. Quero construir uma rede leve e acolhedora.',
    likes: 7,
    liked: false,
  },
]

function App() {
  const [theme, setTheme] = useState('dark')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [draft, setDraft] = useState('')
  const [posts, setPosts] = useState(initialPosts)

  const handleAuthSubmit = (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      return
    }

    setIsLoggedIn(true)
    setPassword('')
    setName(authMode === 'register' ? name.trim() || 'Usuário' : 'Usuário')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setName('')
    setEmail('')
    setPassword('')
    setDraft('')
  }

  const handlePublish = (event) => {
    event.preventDefault()

    if (!draft.trim()) {
      return
    }

    const newPost = {
      id: Date.now(),
      author: name.trim() || 'Você',
      handle: '@voce',
      time: 'agora',
      content: draft.trim(),
      likes: 0,
      liked: false,
    }

    setPosts((currentPosts) => [newPost, ...currentPosts])
    setDraft('')
  }

  const handleToggleLike = (postId) => {
    if (!isLoggedIn) {
      return
    }

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post
        }

        return {
          ...post,
          liked: !post.liked,
          likes: post.likes + (post.liked ? -1 : 1),
        }
      }),
    )
  }

  return (
    <div className={`app-shell ${theme}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Rede social • primeira etapa</p>
          <h1>Conecta+</h1>
        </div>
        <button
          type="button"
          className="theme-button"
          onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="layout">
        <section className="hero-panel">
          <div className="hero-card">
            <p className="eyebrow">Seu espaço para compartilhar</p>
            <h2>Uma rede simples, rápida e com personalidade.</h2>
            <p className="hero-copy">
              Nesta primeira parte, a interface já mostra a experiência principal: ver posts,
              entrar na conta e publicar mensagens.
            </p>

            <div className="stats">
              <div>
                <strong>{posts.length}</strong>
                <span>posts</span>
              </div>
              <div>
                <strong>{posts.reduce((sum, post) => sum + post.likes, 0)}</strong>
                <span>curtidas</span>
              </div>
            </div>
          </div>

          <div className="auth-card">
            {!isLoggedIn ? (
              <>
                <div className="auth-toggle">
                  <button
                    type="button"
                    className={authMode === 'login' ? 'active' : ''}
                    onClick={() => setAuthMode('login')}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className={authMode === 'register' ? 'active' : ''}
                    onClick={() => setAuthMode('register')}
                  >
                    Criar conta
                  </button>
                </div>

                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  {authMode === 'register' ? (
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  ) : null}
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button type="submit">
                    {authMode === 'login' ? 'Entrar agora' : 'Criar conta'}
                  </button>
                </form>
              </>
            ) : (
              <div className="welcome-card">
                <p className="eyebrow">Você está dentro</p>
                <h3>Olá, {name || 'usuário'}!</h3>
                <p>Você já pode publicar pensamentos, curtir posts e acompanhar o feed.</p>
                <button type="button" onClick={handleLogout}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="feed-panel">
          <form className="composer" onSubmit={handlePublish}>
            <label htmlFor="postDraft">O que estou pensando?</label>
            <textarea
              id="postDraft"
              placeholder={isLoggedIn ? 'Compartilhe uma novidade...' : 'Entre para publicar'}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!isLoggedIn}
            />
            <button type="submit" disabled={!isLoggedIn}>
              Publicar
            </button>
          </form>

          <div className="feed-list">
            {posts.map((post) => (
              <article key={post.id} className="post-card">
                <div className="post-header">
                  <div>
                    <h3>{post.author}</h3>
                    <p>
                      {post.handle} • {post.time}
                    </p>
                  </div>
                </div>
                <p className="post-content">{post.content}</p>
                <div className="post-footer">
                  <button
                    type="button"
                    className={`like-button ${post.liked ? 'active' : ''}`}
                    onClick={() => handleToggleLike(post.id)}
                    disabled={!isLoggedIn}
                  >
                    {post.liked ? '💜' : '🤍'} {post.likes}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
