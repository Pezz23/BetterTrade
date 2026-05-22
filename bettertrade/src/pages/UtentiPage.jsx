import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function UtentiPage() {
  const { currentUser, users, fetchUsers, createUser, deleteUser, updateUserBankroll, isSuperAdmin, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'user', bankroll: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isAdmin) fetchUsers() }, [])

  const visibleUsers = isSuperAdmin ? users : users.filter(u => u.created_by === currentUser?.id || u.role === 'user')

  async function handleCreate(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setSaving(true)
    const result = await createUser(form)
    setSaving(false)
    if (result.ok) {
      setSuccess(`Utente "${form.username}" creato con successo`)
      setForm({ username: '', password: '', displayName: '', role: 'user', bankroll: '' })
      setShowForm(false)
    } else setError(result.error)
  }

  async function handleDelete(userId, username) {
    if (!confirm(`Eliminare l'utente "${username}"?`)) return
    await deleteUser(userId)
  }

  const roleBadge = (role) => {
    const map = {
      superadmin: { label: 'SuperAdmin', bg: 'rgba(201,168,76,0.15)', color: '#c9a84c' },
      admin:      { label: 'Admin',      bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
      user:       { label: 'User',       bg: 'rgba(34,197,94,0.10)',   color: '#4ade80' },
    }
    const s = map[role] || map.user
    return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, fontFamily: 'monospace' }}>{s.label}</span>
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Gestione Utenti</h1>
          <p style={S.sub}>{users.length} utenti totali</p>
        </div>
        <button style={S.addBtn} onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}>
          {showForm ? '✕ Annulla' : '+ Nuovo utente'}
        </button>
      </div>

      {showForm && (
        <div style={S.formCard}>
          <h3 style={S.formTitle}>Crea nuovo utente</h3>
          <form onSubmit={handleCreate} style={S.form}>
            <div style={S.formRow}>
              <div style={S.field}>
                <label style={S.label}>Username *</label>
                <input style={S.input} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="es. mario_rossi" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Nome visualizzato</label>
                <input style={S.input} value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="es. Mario Rossi" />
              </div>
            </div>
            <div style={S.formRow}>
              <div style={S.field}>
                <label style={S.label}>Password *</label>
                <input style={S.input} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Bankroll iniziale (€)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.bankroll} onChange={e => setForm(p => ({ ...p, bankroll: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            {isSuperAdmin && (
              <div style={S.field}>
                <label style={S.label}>Ruolo</label>
                <select style={S.input} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {error && <div style={S.errorBox}>⚠️ {error}</div>}
            <button type="submit" style={S.submitBtn} disabled={saving}>{saving ? 'Salvataggio...' : 'Crea utente'}</button>
          </form>
        </div>
      )}

      {success && <div style={S.successBox}>✅ {success}</div>}

      <div style={S.tableCard}>
        {visibleUsers.length === 0 && <div style={S.empty}>Nessun utente. Clicca "+ Nuovo utente" per iniziare.</div>}
        {visibleUsers.map((u, i) => (
          <div key={u.id} style={{ ...S.row, borderTop: i > 0 ? '1px solid #1a1a1a' : 'none' }}>
            <div style={S.rowLeft}>
              <div style={{ ...S.avatar, background: u.role === 'superadmin' ? 'rgba(201,168,76,0.15)' : u.role === 'admin' ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.08)', color: u.role === 'superadmin' ? '#c9a84c' : u.role === 'admin' ? '#60a5fa' : '#4ade80' }}>
                {(u.display_name || u.username).substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={S.rowName}>{u.display_name || u.username}</p>
                <p style={S.rowSub}>@{u.username}</p>
              </div>
            </div>
            <div style={S.rowRight}>
              {roleBadge(u.role)}
              <div style={S.bankrollEdit}>
                <span style={S.euroSign}>€</span>
                <input style={S.bankrollInput} type="number" min="0" step="0.01"
                  defaultValue={u.bankroll}
                  onBlur={e => updateUserBankroll(u.id, e.target.value)} />
              </div>
              {isSuperAdmin && u.role !== 'superadmin' && (
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
  page: { padding: '32px 24px', maxWidth: 860, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 600, color: '#e0d9d0', marginBottom: 4 },
  sub: { fontSize: 13, color: '#555' },
  addBtn: { background: '#c9a84c', border: 'none', borderRadius: 8, padding: '10px 18px', color: '#090909', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  formCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24, marginBottom: 20 },
  formTitle: { fontSize: 15, fontWeight: 500, color: '#e0d9d0', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 500, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 7, padding: '10px 12px', color: '#e0d9d0', fontSize: 14, outline: 'none', width: '100%' },
  errorBox: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 7, padding: '10px 14px', fontSize: 13, color: '#ef4444' },
  successBox: { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#22c55e', marginBottom: 16 },
  submitBtn: { background: '#c9a84c', border: 'none', borderRadius: 7, padding: '11px 24px', color: '#090909', fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' },
  tableCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', gap: 12 },
  rowLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  rowRight: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  avatar: { width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 },
  rowName: { fontSize: 14, fontWeight: 500, color: '#e0d9d0', marginBottom: 2 },
  rowSub: { fontSize: 12, color: '#444', fontFamily: 'monospace' },
  bankrollEdit: { display: 'flex', alignItems: 'center', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, overflow: 'hidden', height: 32 },
  euroSign: { padding: '0 8px', fontSize: 12, color: '#555', borderRight: '1px solid #1e1e1e', fontFamily: 'monospace' },
  bankrollInput: { background: 'transparent', border: 'none', outline: 'none', color: '#c9a84c', fontSize: 13, fontFamily: 'monospace', width: 80, padding: '0 8px', fontWeight: 500 },
  delBtn: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: '5px 9px' },
  empty: { padding: 40, textAlign: 'center', color: '#444', fontSize: 14 },
}
