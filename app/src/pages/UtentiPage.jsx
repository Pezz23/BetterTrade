import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { C, F, alpha } from '../theme'

const S = {
  page:  { padding:'20px 16px', maxWidth:700, margin:'0 auto' },
  h1:    { fontSize:20, fontWeight:700, color:C.testo, marginBottom:4, fontFamily:F.sans },
  sub:   { fontSize:12, color:C.spento, marginBottom:22, fontFamily:F.sans },
  addBtn:{ background:C.oro, border:'none', borderRadius:8, padding:'9px 18px', color:C.fondo, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F.sans, marginBottom:18 },
  formCard:{ background:C.pannello, border:`1px solid ${C.bordo}`, borderRadius:12, padding:20, marginBottom:18 },
  grid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  field: { display:'flex', flexDirection:'column', gap:5 },
  label: { fontSize:11, fontWeight:500, color:C.spento, textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:F.mono },
  input: { background:C.pozzo, border:`1px solid ${C.bordo}`, borderRadius:7, padding:'9px 12px', color:C.testo, fontSize:14, fontFamily:F.sans, outline:'none', width:'100%' },
  err:   { background:alpha(C.rosso,0.08), border:`1px solid ${alpha(C.rosso,0.2)}`, borderRadius:7, padding:'9px 12px', fontSize:13, color:C.rosso, fontFamily:F.sans },
  ok:    { background:alpha(C.verde,0.08), border:`1px solid ${alpha(C.verde,0.2)}`, borderRadius:7, padding:'9px 12px', fontSize:13, color:C.verde, fontFamily:F.sans, marginBottom:12 },
  saveBtn:{ background:C.oro, border:'none', borderRadius:7, padding:'10px 22px', color:C.fondo, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F.sans, marginTop:12 },
  table: { background:C.pannello, border:`1px solid ${C.bordo}`, borderRadius:12, overflow:'hidden' },
  row:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${C.bordoTenue}`, gap:10 },
  avatar:{ width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, fontFamily:F.mono },
  rname: { fontSize:14, fontWeight:600, color:C.testo, fontFamily:F.sans, marginBottom:2 },
  rsub:  { fontSize:11, color:C.fioco, fontFamily:F.mono },
  badge: { fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:20, fontFamily:F.mono, letterSpacing:'0.05em' },
  bkWrap:{ display:'flex', alignItems:'center', background:C.pozzo, border:`1px solid ${C.bordo}`, borderRadius:6, height:30, overflow:'hidden' },
  bkEur: { padding:'0 8px', fontSize:11, color:C.spento, borderRight:`1px solid ${C.bordo}`, fontFamily:F.mono },
  bkInp: { background:'transparent', border:'none', outline:'none', color:C.oro, fontSize:13, fontFamily:F.mono, width:75, padding:'0 8px', fontWeight:500 },
  delBtn:{ background:alpha(C.rosso,0.08), border:`1px solid ${alpha(C.rosso,0.18)}`, borderRadius:6, color:C.rosso, fontSize:11, cursor:'pointer', padding:'5px 10px', fontFamily:F.sans },
  empty: { padding:40, textAlign:'center', color:C.fantasma, fontSize:14, fontFamily:F.sans },
  pwBtn: { background:alpha(C.oro,0.10), border:`1px solid ${alpha(C.oro,0.3)}`, borderRadius:6, color:C.oro, fontSize:11, cursor:'pointer', padding:'5px 10px', fontFamily:F.sans },
  select:{ background:C.pozzo, border:`1px solid ${C.bordo}`, borderRadius:7, padding:'9px 12px', color:C.testo, fontSize:14, fontFamily:F.sans, outline:'none', width:'100%' },
}

const ROLE_STYLE = {
  superadmin: { bg:alpha(C.oro,0.15), color:C.oro, av:alpha(C.oro,0.15), avc:C.oro },
  admin:      { bg:alpha(C.bluPieno,0.12),  color:C.blu, av:alpha(C.bluPieno,0.12),  avc:C.blu },
  user:       { bg:alpha(C.verde,0.10),   color:C.menta, av:alpha(C.verde,0.10),   avc:C.menta },
}

const VUOTO = { username:'', password:'', ruolo:'user', nome:'', bankroll:'' }

export default function UtentiPage() {
  const { currentUser, users, fetchUsers, cambiaMiaPassword, creaUtente, assegnaPassword, deleteUser, isSuperAdmin, isAdmin } = useAuth()
  const [showPw, setShowPw] = useState(false)
  const [miaPw, setMiaPw]   = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk]   = useState('')
  const [busy, setBusy] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwOk, setPwOk] = useState('')
  const [nuovo, setNuovo] = useState(null)          // il form, null quando è chiuso
  const [cambio, setCambio] = useState(null)        // { username, password } della riga aperta

  useEffect(() => { if (isAdmin) fetchUsers() }, [])

  const campo = (k, v) => setNuovo(n => ({ ...n, [k]: v }))

  async function salvaNuovo() {
    setErr(''); setOk(''); setBusy(true)
    const r = await creaUtente(nuovo)
    setBusy(false)
    if (!r.ok) { setErr(r.error); return }
    // La password si vede una volta sola: dopo è hashata e non si rilegge.
    setOk(`Utente @${nuovo.username} creato. Password: ${nuovo.password} — segnala adesso, non si rilegge più.`)
    setNuovo(null)
  }

  async function salvaPasswordDi(u) {
    setErr(''); setOk(''); setBusy(true)
    const r = await assegnaPassword(u.username, cambio.password)
    setBusy(false)
    if (!r.ok) { setErr(r.error); return }
    setOk(`Password di @${u.username} aggiornata: ${cambio.password}`)
    setCambio(null)
  }

  async function elimina(u) {
    if (!confirm(`Elimina @${u.username}? Sparisce anche il suo accesso.`)) return
    setErr(''); setOk('')
    const r = await deleteUser(u.id)
    if (!r.ok) setErr(r.error); else setOk(`@${u.username} eliminato`)
  }

  const visible = isSuperAdmin ? users : users.filter(u => u.created_by === currentUser?.id || u.role === 'user')

  // Cambio password della PROPRIA utenza: la fa Supabase Auth per l'utente
  // loggato. Quella di un altro la assegna il superadmin con la 🔑 sulla riga.
  async function salvaMiaPassword() {
    setErr(''); setPwOk(''); setSavingPw(true)
    const r = await cambiaMiaPassword(miaPw)
    setSavingPw(false)
    if (!r.ok) { setErr(r.error); return }
    setPwOk('Password aggiornata'); setMiaPw(''); setShowPw(false)
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Gestione Utenti</h1>
      <p style={S.sub}>{users.length} utenti nel database</p>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button style={S.addBtn} onClick={() => { setShowPw(v=>!v); setErr(''); setPwOk('') }}>
          {showPw ? '✕ Annulla' : '🔑 Cambia la mia password'}
        </button>
        {isSuperAdmin && (
          <button style={S.addBtn} onClick={() => { setNuovo(n => n ? null : { ...VUOTO }); setErr(''); setOk('') }}>
            {nuovo ? '✕ Annulla' : '＋ Nuovo utente'}
          </button>
        )}
      </div>

      {ok && <div style={S.ok}>✅ {ok}</div>}
      {pwOk && <div style={S.ok}>✅ {pwOk}</div>}

      {showPw && (
        <div style={S.formCard}>
          <div style={S.field}>
            <label style={S.label}>Nuova password (minimo 6 caratteri)</label>
            <input style={S.input} type="text" value={miaPw} autoFocus
              onChange={e=>setMiaPw(e.target.value)} placeholder="Nuova password" />
          </div>
          {err && <div style={{...S.err, marginTop:12}}>⚠️ {err}</div>}
          <button style={S.saveBtn} onClick={salvaMiaPassword} disabled={savingPw || miaPw.length < 6}>
            {savingPw ? 'Salvataggio…' : 'Conferma'}
          </button>
        </div>
      )}

      {nuovo && (
        <div style={S.formCard}>
          <div style={S.grid}>
            <div style={S.field}>
              <label style={S.label}>Username (lettere e cifre)</label>
              <input style={S.input} value={nuovo.username} autoFocus placeholder="mario"
                onChange={e=>campo('username', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Nome visualizzato</label>
              <input style={S.input} value={nuovo.nome} placeholder="Mario Rossi"
                onChange={e=>campo('nome', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Password (la scegli tu, minimo 6)</label>
              <input style={S.input} value={nuovo.password} placeholder="fuoco-530"
                onChange={e=>campo('password', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Ruolo</label>
              <select style={S.select} value={nuovo.ruolo} onChange={e=>campo('ruolo', e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Bankroll iniziale</label>
              <input style={S.input} value={nuovo.bankroll} placeholder="0" inputMode="decimal"
                onChange={e=>campo('bankroll', e.target.value)} />
            </div>
          </div>
          {err && <div style={{...S.err, marginTop:12}}>⚠️ {err}</div>}
          <button style={S.saveBtn} onClick={salvaNuovo}
            disabled={busy || nuovo.username.length < 3 || nuovo.password.length < 6}>
            {busy ? 'Creazione…' : 'Crea utente'}
          </button>
        </div>
      )}


      <div style={S.table}>
        {visible.length === 0 && <div style={S.empty}>Nessun utente ancora. Crea il primo!</div>}
        {visible.map((u, i) => {
          const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user
          return (
            <div key={u.id}>
            <div style={{ ...S.row, borderBottom: i < visible.length-1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
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
                <div style={{background:C.pozzo,border:`1px solid ${C.bordo}`,borderRadius:6,padding:'5px 12px',display:'flex',alignItems:'center',gap:4,minWidth:90}}>
                  <span style={{fontSize:11,color:C.spento,fontFamily:F.mono}}>€</span>
                  <span style={{fontSize:13,color:C.oro,fontFamily:F.mono,fontWeight:500}}>
                    {(u.bankroll||0).toFixed(2)}
                  </span>
                </div>
                {isSuperAdmin && (
                  <button style={S.pwBtn} title="Assegna una password"
                    onClick={()=>{ setErr(''); setOk(''); setCambio(c => c?.username === u.username ? null : { username:u.username, password:'' }) }}>🔑</button>
                )}
                {isSuperAdmin && u.role !== 'superadmin' && (
                  <button style={S.delBtn} onClick={()=>elimina(u)}>✕</button>
                )}
              </div>
            </div>
            {cambio?.username === u.username && (
              <div style={{ padding:'0 18px 14px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <input style={{ ...S.input, width:200 }} autoFocus value={cambio.password}
                  placeholder="Nuova password" onChange={e=>setCambio({ ...cambio, password:e.target.value })} />
                <button style={{ ...S.saveBtn, marginTop:0, padding:'9px 16px', fontSize:13 }}
                  disabled={busy || cambio.password.length < 6} onClick={()=>salvaPasswordDi(u)}>
                  {busy ? 'Salvo…' : `Assegna a @${u.username}`}
                </button>
                <span style={{ fontSize:11, color:C.spento, fontFamily:F.sans }}>La scegli tu: falla dicibile a voce.</span>
              </div>
            )}
            </div>
          )
        })}
      </div>
      {/* Totale SuperAdmin — sola lettura */}
      {isSuperAdmin && users.length > 0 && (
        <div style={{...S.row, borderTop:`1px solid ${C.bordo}`, marginTop:4}}>
          <span style={{fontSize:13,fontWeight:700,color:C.testo,fontFamily:F.sans}}>Totale aggregato</span>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{fontSize:11,color:C.spento,fontFamily:F.mono}}>€</span>
            <span style={{fontSize:16,fontWeight:700,color:C.oro,fontFamily:F.mono}}>
              {users.reduce((s,u)=>s+(u.bankroll||0),0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
