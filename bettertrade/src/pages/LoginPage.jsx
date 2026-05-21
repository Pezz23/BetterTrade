import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const result = login(username, password)
    if (!result.ok) setError(result.error)
    setLoading(false)
  }

  return (
    <div style={styles.root}>
      <div style={styles.bg} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.9"/>
              <rect x="16" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.5"/>
              <rect x="2" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.5"/>
              <rect x="16" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.9"/>
            </svg>
          </div>
          <span style={styles.logoText}>BetterTrade</span>
        </div>

        <p style={styles.subtitle}>Accedi al tuo account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Il tuo username"
              autoComplete="username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...styles.input, paddingRight: '44px' }}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="La tua password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p style={styles.hint}>
          Non hai un account? Chiedi all'amministratore.
        </p>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '24px',
  },
  bg: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: '#111111',
    border: '1px solid #1e1e1e',
    borderRadius: '16px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    zIndex: 1,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  logoIcon: {
    width: '44px',
    height: '44px',
    background: 'rgba(201,168,76,0.10)',
    border: '1px solid rgba(201,168,76,0.20)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: "'Sora', sans-serif",
    fontSize: '22px',
    fontWeight: '600',
    color: '#e0d9d0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: '13px',
    color: '#666058',
    marginBottom: '32px',
    marginTop: '4px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontFamily: "'Sora', sans-serif",
    fontSize: '12px',
    fontWeight: '500',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#e0d9d0',
    fontSize: '15px',
    fontFamily: "'Sora', sans-serif",
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    lineHeight: 1,
  },
  errorBox: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.20)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#ef4444',
    fontFamily: "'Sora', sans-serif",
  },
  btn: {
    background: '#c9a84c',
    border: 'none',
    borderRadius: '8px',
    padding: '13px',
    color: '#090909',
    fontSize: '15px',
    fontWeight: '600',
    fontFamily: "'Sora', sans-serif",
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'opacity 0.2s',
  },
  hint: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#444',
    textAlign: 'center',
    fontFamily: "'Sora', sans-serif",
  },
}
