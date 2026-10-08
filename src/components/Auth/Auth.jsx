import { useState, useMemo } from 'react'
import { useAuth, validatePassword } from '../../context/AuthContext'
import './Auth.css'

const Auth = ({ onClose }) => {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Client-side password strength meter
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', checks: {} }
    const checks = {
      length: password.length >= 8,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      // Bonus: special char
      special: /[^a-zA-Z0-9]/.test(password),
      // Penalty: common patterns
      notCommon: !/(password|123456|qwerty|abc123|wordhunt)/i.test(password),
    }
    const passed = Object.values(checks).filter(Boolean).length
    // Score 0-4 (5 checks, but 'special' is bonus)
    let score = passed
    if (!checks.notCommon) score = Math.max(0, score - 2) // heavy penalty
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
    return { score: Math.min(4, score), label: labels[Math.min(4, score)], checks }
  }, [password])

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
    // Reserved usernames check
    const reserved = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp', 'localhost', 'support', 'help', 'security', 'abuse', 'noreply', 'no-reply']
    if (reserved.includes(trimmed.toLowerCase())) {
      setError('This username is reserved')
      return
    }

    // Validate password on client side for signup
    if (!isLogin) {
      try {
        validatePassword(password)
      } catch (err) {
        setError(err.message)
        return
      }
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

  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

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
          <div className="password-field">
            <input
              id="wh-password"
              name="password"
              type="password"
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-describedby={!isLogin ? 'pw-strength' : undefined}
            />
            {!isLogin && (
              <div id="pw-strength" className="password-strength" role="progressbar" aria-valuenow={passwordStrength.score} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${((passwordStrength.score + 1) / 5) * 100}%`,
                      backgroundColor: strengthColors[passwordStrength.score],
                    }}
                  />
                </div>
                <span className="strength-label" style={{ color: strengthColors[passwordStrength.score] }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>
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
