import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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

const formatPostTime = (value) => {
  if (!value) return 'agora'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'agora'

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizePost = (post) => ({
  id: post.id,
  author: post.author,
  handle: `@${(post.author || 'usuario').toLowerCase().replace(/\s+/g, '')}`,
  time: formatPostTime(post.created_at),
  content: post.content,
  likes: Number(post.favorites_count ?? 0),
  liked: Boolean(post.favorited_by_user),
})

const apiRequest = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {}
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível completar a requisição.')
  }

  return data
}

function App() {
  const [theme, setTheme] = useState(() => getStoredValue('social-theme', 'dark'))
  const [currentUser, setCurrentUser] = useState(() => getStoredValue('social-current-user', null))
  const [token, setToken] = useState(() => getStoredValue('social-token', null))
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
    saveStoredValue('social-current-user', currentUser)
  }, [currentUser])

  useEffect(() => {
    saveStoredValue('social-token', token)
  }, [token])

  useEffect(() => {
    saveStoredValue('social-posts', posts)
  }, [posts])

  useEffect(() => {
    const hydrateSession = async () => {
      if (!token) return

      try {
        const meResponse = await apiRequest('/api/me', { token })
        setCurrentUser(meResponse.user)

        const postsResponse = await apiRequest('/api/posts', { token })
        setPosts(postsResponse.posts.map(normalizePost))
        setFeedback(`Bem-vindo(a) de volta, ${meResponse.user.name}!`)
      } catch {
        setCurrentUser(null)
        setToken(null)
        setFeedback('Sua sessão expirou. Faça login novamente.')
      }
    }

    hydrateSession()
  }, [token])

  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0)
  const totalUsers = new Set(posts.map((post) => post.author)).size + (currentUser ? 1 : 0)
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
        const loginResponse = await apiRequest('/api/login', {
          method: 'POST',
          body: {
            email: authForm.email,
            password: authForm.password,
          },
        })

        setToken(loginResponse.token)
        setCurrentUser(loginResponse.user)
        setPosts((await apiRequest('/api/posts', { token: loginResponse.token })).posts.map(normalizePost))
        setFeedback(`Bem-vindo(a), ${loginResponse.user.name}!`)
        setAuthForm({ name: '', email: '', password: '' })
        return
      }

      if (!authForm.name || !authForm.email || !authForm.password) {
        setFeedback('Preencha todos os campos para criar a conta.')
        return
      }

      await apiRequest('/api/register', {
        method: 'POST',
        body: {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
        },
      })

      const loginResponse = await apiRequest('/api/login', {
        method: 'POST',
        body: {
          email: authForm.email,
          password: authForm.password,
        },
      })

      setToken(loginResponse.token)
      setCurrentUser(loginResponse.user)
      setPosts((await apiRequest('/api/posts', { token: loginResponse.token })).posts.map(normalizePost))
      setFeedback(`Conta criada com sucesso, ${loginResponse.user.name}!`)
      setAuthForm({ name: '', email: '', password: '' })
    } catch (error) {
      setFeedback(error.message || 'Não foi possível concluir a ação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    if (token) {
      try {
        await apiRequest('/api/logout', { method: 'POST', token })
      } catch {
        // Ignore logout errors and clear the local session anyway.
      }
    }

    setCurrentUser(null)
    setToken(null)
    setFeedback('Você saiu da sessão. Volte sempre!')
  }

  const handlePublish = async (event) => {
    event.preventDefault()

    if (!currentUser || !token) {
      setFeedback('Faça login para publicar.')
      return
    }

    const content = draft.trim()
    if (!content) {
      setFeedback('Escreva algo antes de publicar.')
      return
    }

    try {
      const response = await apiRequest('/api/posts', {
        method: 'POST',
        body: { content },
        token,
      })

      setPosts((currentPosts) => [normalizePost(response.post), ...currentPosts])
      setDraft('')
      setFeedback('Post publicado com sucesso!')
    } catch (error) {
      setFeedback(error.message || 'Não foi possível publicar o post.')
    }
  }

  const handleToggleLike = async (postId) => {
    if (!currentUser || !token) {
      setFeedback('Entre na conta para curtir posts.')
      return
    }

    const targetPost = posts.find((post) => post.id === postId)
    if (!targetPost) {
      return
    }

    try {
      await apiRequest(`/api/posts/${postId}/favorite`, {
        method: targetPost.liked ? 'DELETE' : 'POST',
        token,
      })

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
    } catch (error) {
      setFeedback(error.message || 'Não foi possível atualizar o like.')
    }
  }

  const handleDeletePost = async (postId) => {
    if (!currentUser || !token) {
      return
    }

    try {
      await apiRequest(`/api/posts/${postId}`, { method: 'DELETE', token })
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
      setFeedback('Post removido da linha do tempo.')
    } catch (error) {
      setFeedback(error.message || 'Não foi possível excluir o post.')
    }
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
              Agora a interface conecta com o backend: entrar, publicar, curtir e manter tudo
              sincronizado em tempo real.
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
