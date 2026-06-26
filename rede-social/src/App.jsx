import { useEffect, useState } from 'react'
import './App.css'
import { hashPassword, isHashedPassword, verifyPassword } from './utils/password'

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

const initialUsers = [
  {
    id: 1,
    name: 'Maya',
    email: 'maya@rede.com',
    password: '123456',
  },
]

const getStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback

  const storedValue = window.localStorage.getItem(key)
  if (!storedValue) return fallback

  try {
    return JSON.parse(storedValue)
  } catch {
    return fallback
  }
}

const saveStoredValue = (key, value) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
}

function App() {
  const [theme, setTheme] = useState(() => getStoredValue('social-theme', 'dark'))
  const [users, setUsers] = useState(() => getStoredValue('social-users', initialUsers))
  const [currentUser, setCurrentUser] = useState(() => getStoredValue('social-current-user', null))
  const [posts, setPosts] = useState(() => getStoredValue('social-posts', initialPosts))
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState('Bem-vindo(a) à rede social!')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeFilter, setActiveFilter] = useState('recentes')

  useEffect(() => {
    saveStoredValue('social-theme', theme)
  }, [theme])

  useEffect(() => {
    saveStoredValue('social-users', users)
  }, [users])

  useEffect(() => {
    saveStoredValue('social-current-user', currentUser)
  }, [currentUser])

  useEffect(() => {
    saveStoredValue('social-posts', posts)
  }, [posts])

  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0)
  const totalUsers = users.length
  const myPostsCount = currentUser
    ? posts.filter((post) => post.author === currentUser.name).length
    : 0

  const sortedPosts = [...posts].sort((firstPost, secondPost) => {
    if (activeFilter === 'curtidos') {
      return secondPost.likes - firstPost.likes
    }

    return secondPost.id - firstPost.id
  })

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      if (authMode === 'login') {
        const foundUser = users.find((user) => user.email === authForm.email)

        if (!foundUser) {
          setFeedback('E-mail ou senha inválidos. Tente novamente.')
          return
        }

        const storedPassword = foundUser.password
        const passwordMatches = isHashedPassword(storedPassword)
          ? await verifyPassword(authForm.password, storedPassword)
          : authForm.password === storedPassword

        if (!passwordMatches) {
          setFeedback('E-mail ou senha inválidos. Tente novamente.')
          return
        }

        const normalizedUser = {
          ...foundUser,
          password: isHashedPassword(storedPassword)
            ? storedPassword
            : await hashPassword(authForm.password),
        }

        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === normalizedUser.id ? normalizedUser : user)),
        )
        setCurrentUser(normalizedUser)
        setFeedback(`Bem-vindo(a), ${normalizedUser.name}!`)
        setAuthForm({ name: '', email: '', password: '' })
        return
      }

      if (!authForm.name || !authForm.email || !authForm.password) {
        setFeedback('Preencha todos os campos para criar a conta.')
        return
      }

      const userExists = users.some((user) => user.email === authForm.email)
      if (userExists) {
        setFeedback('Este e-mail já está cadastrado.')
        return
      }

      const newUser = {
        id: Date.now(),
        name: authForm.name,
        email: authForm.email,
        password: await hashPassword(authForm.password),
      }

      setUsers((prevUsers) => [...prevUsers, newUser])
      setCurrentUser(newUser)
      setFeedback(`Conta criada com sucesso, ${newUser.name}!`)
      setAuthForm({ name: '', email: '', password: '' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setFeedback('Você saiu da sessão. Volte sempre!')
  }

  const handlePublish = (event) => {
    event.preventDefault()

    if (!currentUser) {
      setFeedback('Faça login para publicar.')
      return
    }

    const content = draft.trim()
    if (!content) {
      setFeedback('Escreva algo antes de publicar.')
      return
    }

    const newPost = {
      id: Date.now(),
      author: currentUser.name,
      handle: `@${currentUser.name.toLowerCase()}`,
      time: 'agora',
      content,
      likes: 0,
      liked: false,
    }

    setPosts((currentPosts) => [newPost, ...currentPosts])
    setDraft('')
    setFeedback('Post publicado com sucesso!')
  }

  const handleToggleLike = (postId) => {
    if (!currentUser) {
      setFeedback('Entre na conta para curtir posts.')
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

  const handleDeletePost = (postId) => {
    if (!currentUser) {
      return
    }

    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
    setFeedback('Post removido da linha do tempo.')
  }

  return (
    <div className={`app-shell ${theme}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Rede social • segunda etapa</p>
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
              Agora a interface já simula a experiência completa: entrar, publicar, curtir e
              manter tudo salvo no navegador.
            </p>

            <div className="stats">
              <div>
                <strong>{posts.length}</strong>
                <span>posts</span>
              </div>
              <div>
                <strong>{totalLikes}</strong>
                <span>curtidas</span>
              </div>
              <div>
                <strong>{totalUsers}</strong>
                <span>usuários</span>
              </div>
            </div>

            <div className="mini-badge">✨ Feed vivo com atualização em tempo real</div>
          </div>

          <div className="auth-card">
            {!currentUser ? (
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
                      value={authForm.name}
                      onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    />
                  ) : null}
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={authForm.email}
                    onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={authForm.password}
                    onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  />
                  <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Processando...' : authMode === 'login' ? 'Entrar agora' : 'Criar conta'}
                  </button>
                </form>
              </>
            ) : (
              <div className="welcome-card">
                <p className="eyebrow">Você está dentro</p>
                <h3>Olá, {currentUser.name}!</h3>
                <p>{feedback}</p>
                <div className="profile-highlight">
                  <span>Posts seus</span>
                  <strong>{myPostsCount}</strong>
                </div>
                <div className="profile-highlight">
                  <span>Seu estilo</span>
                  <strong>{theme === 'dark' ? 'Noite' : 'Dia'}</strong>
                </div>
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
              placeholder={currentUser ? 'Compartilhe uma novidade...' : 'Entre para publicar'}
              maxLength={280}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!currentUser}
            />
            <div className="composer-footer">
              <span className="composer-hint">{280 - draft.length} caracteres restantes</span>
              <button type="submit" disabled={!currentUser || !draft.trim()}>
                Publicar
              </button>
            </div>
          </form>

          <div className="feed-toolbar">
            <h3>Feed</h3>
            <div className="filter-group">
              <button
                type="button"
                className={activeFilter === 'recentes' ? 'active' : ''}
                onClick={() => setActiveFilter('recentes')}
              >
                Recentes
              </button>
              <button
                type="button"
                className={activeFilter === 'curtidos' ? 'active' : ''}
                onClick={() => setActiveFilter('curtidos')}
              >
                Mais curtidos
              </button>
            </div>
          </div>

          <div className="feed-list">
            {sortedPosts.length === 0 ? (
              <div className="empty-state">
                <strong>Nada por aqui ainda.</strong>
                <p>Seja a primeira pessoa a publicar uma ideia, um pensamento ou uma novidade.</p>
              </div>
            ) : (
              sortedPosts.map((post) => (
                <article key={post.id} className="post-card">
                  <div className="post-header">
                    <div>
                      <h3>{post.author}</h3>
                      <p>
                        {post.handle} • {post.time}
                      </p>
                    </div>
                    {currentUser?.name === post.author ? (
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>
                  <p className="post-content">{post.content}</p>
                  <div className="post-footer">
                    <button
                      type="button"
                      className={`like-button ${post.liked ? 'active' : ''}`}
                      onClick={() => handleToggleLike(post.id)}
                      disabled={!currentUser}
                    >
                      {post.liked ? '💜' : '🤍'} {post.likes}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
