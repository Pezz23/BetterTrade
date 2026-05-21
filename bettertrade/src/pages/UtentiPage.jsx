import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function UtentiPage() {
  const { currentUser, users, createUser, deleteUser, updateUserBankroll, isSuperAdmin, getAllUsers } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'user', bankroll: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const allUsers = getAllUsers()
  // Admin vede solo i propri utenti creati, superadmin vede tutti
  const visibleUsers = isSuperAdmin
    ? users
    : users.filter(u => u.createdBy === currentUser.id)

  function handleCreate(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    const result = createUser(form)
    if (result.ok) {
      setSuccess(`Utente "${form.username}" creato con successo`)
      setForm({ username: '', password: '', displayName: '', role: 'user', bankroll: '' })
      setShowForm(false)
    } else {
      setError(result.error)
    }
  }

  function handleDelete(userId, username) {
    if (!confirm(`Eliminare l'utente "${username}"?`)) return
    deleteUser(userId)
  }

  function handleBankrollChange(userId, val) {
    updateUserBankroll(userId, val)
  }

  const roleBadge = (role) => {
    const map = {
      superadmin: { label: 'SuperAdmin', bg: 'rgba(201,168,76,0.15)', color: '#c9a84c' },
      admin:      { label: 'Admin',      bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
      user:       { label: 'User',       bg: 'rgba(34,197,94,0.10)',  color: '#4ade80' },
    }
    const s = map[role] || map.user
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: '11px', fontWeight: '500',
        padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.04em', fontFamily: "'DM Mono', monospace" }}>
        {s.label}
      </span>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Gestione Utenti</h1>
          <p style={S.sub}>{allUsers.length} utenti totali</p>
        </div>
        <button style={S.addBtn} onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}>
          {showForm ? '✕ Annulla' : '+ Nuovo utente'}
        </button>
      </div>

      {/* Form creazione */}
      {showForm && (
        <div style={S.formCard}>
          <h3 style={S.formTitle}>Crea nuovo utente</h3>
          <form onSubmit={handleCreate} style={S.form}>
            <div style={S.formRow}>
              <div style={S.field}>
                <label style={S.label}>Username *</label>
                <input style={S.input} value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="es. mario_rossi" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Nome visualizzato</label>
                <input style={S.input} value={form.displayName}
                  onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="es. Mario Rossi" />
              </div>
            </div>
            <div style={S.formRow}>
              <div style={S.field}>
                <label style={S.label}>Password *</label>
                <input style={S.input} type="password" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Password sicura" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Bankroll iniziale (€)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.bankroll}
                  onChange={e => setForm(p => ({ ...p, bankroll: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>
            {isSuperAdmin && (
              <div style={S.field}>
                <label style={S.label}>Ruolo</label>
                <select style={S.input} value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {error && <div style={S.errorBox}>⚠️ {error}</div>}
            <button type="submit" style={S.submitBtn}>Crea utente</button>
          </form>
        </div>
      )}

      {success && (
        <div style={S.successBox}>✅ {success}</div>
      )}

      {/* Tabella utenti */}
      <div style={S.tableCard}>
        {/* SuperAdmin row */}
        <div style={{ ...S.row, borderBottom: '1px solid #1a1a1a' }}>
          <div style={S.rowLeft}>
            <div style={{ ...S.avatar, background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>SA</div>
            <div>
              <p style={S.rowName}>Admin</p>
              <p style={S.rowSub}>Account principale</p>
            </div>
          </div>
          <div style={S.rowRight}>
            {roleBadge('superadmin')}
            {isSuperAdmin && (
              <div style={S.bankrollEdit}>
                <span style={S.euroSign}>€</span>
                <input
                  style={S.bankrollInput}
                  type="number" min="0" step="0.01"
                  defaultValue={currentUser?.id === 'superadmin' ? currentUser.bankroll : 0}
                  onBlur={e => handleBankrollChange('superadmin', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Altri utenti */}
        {visibleUsers.length === 0 && (
          <div style={S.empty}>Nessun utente creato. Clicca "+ Nuovo utente" per iniziare.</div>
        )}
        {visibleUsers.map(u => (
          <div key={u.id} style={S.row}>
            <div style={S.rowLeft}>
              <div style={{ ...S.avatar, background: u.role === 'admin' ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.08)',
                color: u.role === 'admin' ? '#60a5fa' : '#4ade80' }}>
                {(u.displayName || u.username).substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={S.rowName}>{u.displayName || u.username}</p>
                <p style={S.rowSub}>@{u.username} · creato il {u.createdAt}</p>
              </div>
            </div>
            <div style={S.rowRight}>
              {roleBadge(u.role)}
              <div style={S.bankrollEdit}>
                <span style={S.euroSign}>€</span>
                <input
                  style={S.bankrollInput}
                  type="number" min="0" step="0.01"
                  defaultValue={u.bankroll}
                  onBlur={e => handleBankrollChange(u.id, e.target.value)}
                />
              </div>
              {isSuperAdmin && (
                <button style={S.delBtn} onClick={() => handleDelete(u.id, u.username)}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const S = {
  page: { padding: '32px 24px', maxWidth: '860px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  title: { fontFamily: "'Sora',sans-serif", fontSize: '22px', fontWeight: '600', color: '#e0d9d0', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#555', fontFamily: "'Sora',sans-serif" },
  addBtn: { background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '10px 18px',
    color: '#090909', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
  formCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
  formTitle: { fontSize: '15px', fontWeight: '500', color: '#e0d9d0', marginBottom: '20px', fontFamily: "'Sora',sans-serif" },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '500', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Sora',sans-serif" },
  input: { background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '7px', padding: '10px 12px',
    color: '#e0d9d0', fontSize: '14px', fontFamily: "'Sora',sans-serif", outline: 'none', width: '100%' },
  errorBox: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
    borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#ef4444', fontFamily: "'Sora',sans-serif" },
  successBox: { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)',
    borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#22c55e',
    fontFamily: "'Sora',sans-serif", marginBottom: '16px' },
  submitBtn: { background: '#c9a84c', border: 'none', borderRadius: '7px', padding: '11px',
    color: '#090909', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Sora',sans-serif", alignSelf: 'flex-start', paddingLeft: '24px', paddingRight: '24px' },
  tableCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', gap: '12px' },
  rowLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  rowRight: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
  avatar: { width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '13px', fontWeight: '600', fontFamily: "'DM Mono',monospace", flexShrink: 0 },
  rowName: { fontSize: '14px', fontWeight: '500', color: '#e0d9d0', fontFamily: "'Sora',sans-serif", marginBottom: '2px' },
  rowSub: { fontSize: '12px', color: '#444', fontFamily: "'DM Mono',monospace" },
  bankrollEdit: { display: 'flex', alignItems: 'center', background: '#0d0d0d', border: '1px solid #1e1e1e',
    borderRadius: '6px', overflow: 'hidden', height: '32px' },
  euroSign: { padding: '0 8px', fontSize: '12px', color: '#555', fontFamily: "'DM Mono',monospace", borderRight: '1px solid #1e1e1e' },
  bankrollInput: { background: 'transparent', border: 'none', outline: 'none', color: '#c9a84c',
    fontSize: '13px', fontFamily: "'DM Mono',monospace", width: '80px', padding: '0 8px', fontWeight: '500' },
  delBtn: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '6px', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '5px 9px',
    fontFamily: "'Sora',sans-serif" },
  empty: { padding: '40px', textAlign: 'center', color: '#444', fontSize: '14px', fontFamily: "'Sora',sans-serif" },
}
