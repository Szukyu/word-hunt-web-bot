import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import './Auth.css'

const Auth = ({ onClose }) => {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = username.trim()
    if (trimmed.includes('@') || trimmed.includes(' ')) {
      setError('No @ or spaces.')
      return
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError('Username 3-20 chars.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Only letters, numbers, _')
      return
    }

    setLoading(true)
    try {
      if (isLogin) await signIn(trimmed, password)
      else await signUp(trimmed, password)
      onClose?.()
    } catch (err) {
      console.error('[auth] failed', err)
      const msg = err.message || String(err)
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('Username taken — try Sign In.')
      } else if (msg.toLowerCase().includes('invalid login')) {
        setError('Wrong username or password.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on" noValidate>
          <input
            id="wh-username"
            name="username"
            type="text"
            inputMode="text"
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            id="wh-password"
            name="password"
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
          <button type="button" className="auth-switch" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Auth
