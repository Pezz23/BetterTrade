import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const S = {
  page:  { padding:'20px 16px', maxWidth:700, margin:'0 auto' },
  h1:    { fontSize:20, fontWeight:700, color:'#e0d9d0', marginBottom:4, fontFamily:"'Sora',sans-serif" },
  sub:   { fontSize:12, color:'#555', marginBottom:22, fontFamily:"'Sora',sans-serif" },
  addBtn:{ background:'#c9a84c', border:'none', borderRadius:8, padding:'9px 18px', color:'#090909', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", marginBottom:18 },
  formCard:{ background:'#111', border:'1px solid #1e1e1e', borderRadius:12, padding:20, marginBottom:18 },
  grid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  field: { display:'flex', flexDirection:'column', gap:5 },
  label: { fontSize:11, fontWeight:500, color:'#555', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:"'DM Mono',monospace" },
  input: { background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:7, padding:'9px 12px', color:'#e0d9d0', fontSize:14, fontFamily:"'Sora',sans-serif", outline:'none', width:'100%' },
  err:   { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:7, padding:'9px 12px', fontSize:13, color:'#ef4444', fontFamily:"'Sora',sans-serif" },
  ok:    { background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:7, padding:'9px 12px', fontSize:13, color:'#22c55e', fontFamily:"'Sora',sans-serif", marginBottom:12 },
  saveBtn:{ background:'#c9a84c', border:'none', borderRadius:7, padding:'10px 22px', color:'#090909', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", marginTop:12 },
  table: { background:'#111', border:'1px solid #1e1e1e', borderRadius:12, overflow:'hidden' },
  row:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid #181818', gap:10 },
  avatar:{ width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, fontFamily:"'DM Mono',monospace" },
  rname: { fontSize:14, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", marginBottom:2 },
  rsub:  { fontSize:11, color:'#444', fontFamily:"'DM Mono',monospace" },
  badge: { fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:20, fontFamily:"'DM Mono',monospace", letterSpacing:'0.05em' },
  bkWrap:{ display:'flex', alignItems:'center', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:6, height:30, overflow:'hidden' },
  bkEur: { padding:'0 8px', fontSize:11, color:'#555', borderRight:'1px solid #1e1e1e', fontFamily:"'DM Mono',monospace" },
  bkInp: { background:'transparent', border:'none', outline:'none', color:'#c9a84c', fontSize:13, fontFamily:"'DM Mono',monospace", width:75, padding:'0 8px', fontWeight:500 },
  delBtn:{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:6, color:'#ef4444', fontSize:11, cursor:'pointer', padding:'5px 10px', fontFamily:"'Sora',sans-serif" },
  empty: { padding:40, textAlign:'center', color:'#333', fontSize:14, fontFamily:"'Sora',sans-serif" },
}

const ROLE_STYLE = {
  superadmin: { bg:'rgba(201,168,76,0.15)', color:'#c9a84c', av:'rgba(201,168,76,0.15)', avc:'#c9a84c' },
  admin:      { bg:'rgba(59,130,246,0.12)',  color:'#60a5fa', av:'rgba(59,130,246,0.12)',  avc:'#60a5fa' },
  user:       { bg:'rgba(34,197,94,0.10)',   color:'#4ade80', av:'rgba(34,197,94,0.10)',   avc:'#4ade80' },
}

export default function UtentiPage() {
  const { currentUser, users, fetchUsers, createUser, updateBankroll, deleteUser, isSuperAdmin, isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username:'', password:'', displayName:'', role:'user', bankroll:'' })
  const [err, setErr] = useState('')
  const [ok, setOk]   = useState('')
  const [busy, setBusy] = useState(false)
  const [changePwUser, setChangePwUser] = useState(null)
  const [newPw, setNewPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwOk, setPwOk] = useState('')

  useEffect(() => { if (isAdmin) fetchUsers() }, [])

  const visible = isSuperAdmin ? users : users.filter(u => u.created_by === currentUser?.id || u.role === 'user')

  async function cambiaPassword() {
    if (!newPw || newPw.length < 4) return
    setSavingPw(true)
    await supabase.from('users').update({ password: newPw }).eq('id', changePwUser.id)
    setPwOk(`Password di ${changePwUser.display_name||changePwUser.username} aggiornata`)
    setNewPw('')
    setChangePwUser(null)
    setSavingPw(false)
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true)
    const r = await createUser(form)
    setBusy(false)
    if (r.ok) { setOk(`Utente "${form.username}" creato!`); setForm({ username:'', password:'', displayName:'', role:'user', bankroll:'' }); setShowForm(false) }
    else setErr(r.error)
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Gestione Utenti</h1>
      <p style={S.sub}>{users.length} utenti nel database</p>

      <button style={S.addBtn} onClick={() => { setShowForm(v=>!v); setErr(''); setOk('') }}>
        {showForm ? '✕ Annulla' : '+ Nuovo utente'}
      </button>

      {ok && <div style={S.ok}>✅ {ok}</div>}

      {showForm && (
        <div style={S.formCard}>
          <form onSubmit={submit}>
            <div style={S.grid}>
              <div style={S.field}>
                <label style={S.label}>Username *</label>
                <input style={S.input} value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} placeholder="es. mario" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Nome visualizzato</label>
                <input style={S.input} value={form.displayName} onChange={e=>setForm(p=>({...p,displayName:e.target.value}))} placeholder="es. Mario Rossi" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Password *</label>
                <input style={S.input} type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Password" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Bankroll iniziale €</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.bankroll} onChange={e=>setForm(p=>({...p,bankroll:e.target.value}))} placeholder="0.00" />
              </div>
            </div>
            {isSuperAdmin && (
              <div style={{ ...S.field, marginTop:14 }}>
                <label style={S.label}>Ruolo</label>
                <select style={S.input} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {err && <div style={{ ...S.err, marginTop:12 }}>⚠️ {err}</div>}
            <button type="submit" style={S.saveBtn} disabled={busy}>{busy?'Salvataggio…':'Crea utente'}</button>
          </form>
        </div>
      )}

      {/* Modale cambio password */}
      {changePwUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:14,padding:'28px 24px',width:'100%',maxWidth:360}}>
            <div style={{fontSize:15,fontWeight:600,color:'#e0d9d0',fontFamily:"'Sora',sans-serif",marginBottom:4}}>Cambia password</div>
            <div style={{fontSize:12,color:'#555',fontFamily:"'DM Mono',monospace",marginBottom:20}}>@{changePwUser.username}</div>
            <div style={S.field}>
              <label style={S.label}>Nuova password</label>
              <input style={S.input} type="text" value={newPw}
                onChange={e=>setNewPw(e.target.value)}
                placeholder="Minimo 4 caratteri" autoFocus/>
            </div>
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button onClick={cambiaPassword} disabled={savingPw||newPw.length<4} style={{
                flex:1,background:'#c9a84c',border:'none',borderRadius:7,padding:'10px',
                color:'#090909',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:"'Sora',sans-serif",
                opacity:newPw.length<4?0.5:1,
              }}>{savingPw?'Salvataggio…':'Conferma'}</button>
              <button onClick={()=>setChangePwUser(null)} style={{
                padding:'10px 16px',borderRadius:7,cursor:'pointer',
                fontFamily:"'Sora',sans-serif",fontSize:14,background:'transparent',
                border:'1px solid #1e1e1e',color:'#555',
              }}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {pwOk && <div style={{...S.ok, marginBottom:12}}>✅ {pwOk}</div>}

      <div style={S.table}>
        {visible.length === 0 && <div style={S.empty}>Nessun utente ancora. Crea il primo!</div>}
        {visible.map((u, i) => {
          const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user
          return (
            <div key={u.id} style={{ ...S.row, borderBottom: i < visible.length-1 ? '1px solid #181818' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ ...S.avatar, background:rs.av, color:rs.avc }}>
                  {(u.display_name||u.username).substring(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={S.rname}>{u.display_name||u.username}</div>
                  <div style={S.rsub}>@{u.username}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <span style={{ ...S.badge, background:rs.bg, color:rs.color }}>{u.role}</span>
                <div style={S.bkWrap}>
                  <span style={S.bkEur}>€</span>
                  <input style={S.bkInp} type="number" min="0" step="0.01" defaultValue={u.bankroll}
                    onBlur={e=>updateBankroll(u.id, e.target.value)} />
                </div>
                {isSuperAdmin && u.role !== 'superadmin' && (
                  <button style={S.delBtn} onClick={()=>{ if(confirm(`Elimina @${u.username}?`)) deleteUser(u.id) }}>✕</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
