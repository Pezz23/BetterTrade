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
    const result = await login(username, password)
    if (!result.ok) setError(result.error)
    setLoading(false)
  }

  return (
    <div style={S.root}>
      <div style={S.bg} />
      <div style={S.card}>
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.9"/>
              <rect x="16" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.5"/>
              <rect x="2" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.5"/>
              <rect x="16" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.9"/>
            </svg>
          </div>
          <span style={S.logoText}>BetterTrade</span>
        </div>
        <p style={S.subtitle}>Accedi al tuo account</p>
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Username</label>
            <input style={S.input} type="text" value={username}
              onChange={e => setUsername(e.target.value)} placeholder="Il tuo username" required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...S.input, paddingRight: 44 }} type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)} placeholder="La tua password" required />
              <button type="button" onClick={() => setShowPw(v => !v)} style={S.eyeBtn} tabIndex={-1}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <div style={S.errorBox}>⚠️ {error}</div>}
          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
        <p style={S.hint}>Non hai un account? Chiedi all'amministratore.</p>
      </div>
    </div>
  )
}

const S = {
  root: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 24 },
  bg: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  logoIcon: { width: 44, height: 44, background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.20)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 22, fontWeight: 600, color: '#e0d9d0', letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 32, marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px', color: '#e0d9d0', fontSize: 15, outline: 'none', width: '100%' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 },
  errorBox: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444' },
  btn: { background: '#c9a84c', border: 'none', borderRadius: 8, padding: 13, color: '#090909', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  hint: { marginTop: 24, fontSize: 12, color: '#444', textAlign: 'center' },
}
