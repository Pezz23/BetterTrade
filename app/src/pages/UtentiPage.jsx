import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { C, F, alpha, S } from '../theme'
// ⚠️ `Input` e `Badge` vengono da qui e non più riscritti in questa pagina
// (15/10/2026): erano tre copie dello stesso campo di testo — ui.jsx, qui e
// LoginPage — con tre raggi e tre riempimenti diversi.
import { Input, Badge } from '../components/ui'

// ⚠️ `ST` e non `S`: `S` è la scala dei caratteri del tema (`theme.js`), e
// prima questo foglio di stile locale le rubava il nome.
const ST = {
  page:  { padding:'20px 16px', maxWidth:700, margin:'0 auto' },
  h1:    { fontSize:S.evidenza, fontWeight:700, color:C.testo, marginBottom:4, fontFamily:F.sans },
  sub:   { fontSize:S.corpo, color:C.spento, marginBottom:22, fontFamily:F.sans },
  addBtn:{ background:C.oro, border:'none', borderRadius:8, padding:'9px 18px', color:C.fondo, fontSize:S.media, fontWeight:700, cursor:'pointer', fontFamily:F.sans, marginBottom:18 },
  formCard:{ background:C.pannello, border:`1px solid ${C.bordo}`, borderRadius:12, padding:20, marginBottom:18 },
  grid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  field: { display:'flex', flexDirection:'column', gap:5 },
  label: { fontSize:S.base, fontWeight:500, color:C.spento, textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:F.mono },
  err:   { background:alpha(C.rosso,0.08), border:`1px solid ${alpha(C.rosso,0.2)}`, borderRadius:7, padding:'9px 12px', fontSize:S.media, color:C.rosso, fontFamily:F.sans },
  ok:    { background:alpha(C.verde,0.08), border:`1px solid ${alpha(C.verde,0.2)}`, borderRadius:7, padding:'9px 12px', fontSize:S.media, color:C.verde, fontFamily:F.sans, marginBottom:12 },
  saveBtn:{ background:C.oro, border:'none', borderRadius:7, padding:'10px 22px', color:C.fondo, fontSize:S.grande, fontWeight:700, cursor:'pointer', fontFamily:F.sans, marginTop:12 },
  table: { background:C.pannello, border:`1px solid ${C.bordo}`, borderRadius:12, overflow:'hidden' },
  row:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${C.bordoTenue}`, gap:10 },
  avatar:{ width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:S.media, fontWeight:700, flexShrink:0, fontFamily:F.mono },
  rname: { fontSize:S.grande, fontWeight:600, color:C.testo, fontFamily:F.sans, marginBottom:2 },
  rsub:  { fontSize:S.base, color:C.fioco, fontFamily:F.mono },
  bkWrap:{ display:'flex', alignItems:'center', background:C.pozzo, border:`1px solid ${C.bordo}`, borderRadius:6, height:30, overflow:'hidden' },
  bkEur: { padding:'0 8px', fontSize:S.base, color:C.spento, borderRight:`1px solid ${C.bordo}`, fontFamily:F.mono },
  bkInp: { background:'transparent', border:'none', outline:'none', color:C.oro, fontSize:S.media, fontFamily:F.mono, width:75, padding:'0 8px', fontWeight:500 },
  delBtn:{ background:alpha(C.rosso,0.08), border:`1px solid ${alpha(C.rosso,0.18)}`, borderRadius:6, color:C.rosso, fontSize:S.base, cursor:'pointer', padding:'5px 10px', fontFamily:F.sans },
  empty: { padding:40, textAlign:'center', color:C.fantasma, fontSize:S.grande, fontFamily:F.sans },
  pwBtn: { background:alpha(C.oro,0.10), border:`1px solid ${alpha(C.oro,0.3)}`, borderRadius:6, color:C.oro, fontSize:S.base, cursor:'pointer', padding:'5px 10px', fontFamily:F.sans },
  select:{ background:C.pozzo, border:`1px solid ${C.bordo}`, borderRadius:7, padding:'9px 12px', color:C.testo, fontSize:S.grande, fontFamily:F.sans, outline:'none', width:'100%' },
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
    <div style={ST.page}>
      <h1 style={ST.h1}>Gestione Utenti</h1>
      <p style={ST.sub}>{users.length} utenti nel database</p>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button style={ST.addBtn} onClick={() => { setShowPw(v=>!v); setErr(''); setPwOk('') }}>
          {showPw ? '✕ Annulla' : '🔑 Cambia la mia password'}
        </button>
        {isSuperAdmin && (
          <button style={ST.addBtn} onClick={() => { setNuovo(n => n ? null : { ...VUOTO }); setErr(''); setOk('') }}>
            {nuovo ? '✕ Annulla' : '＋ Nuovo utente'}
          </button>
        )}
      </div>

      {ok && <div style={ST.ok}>✅ {ok}</div>}
      {pwOk && <div style={ST.ok}>✅ {pwOk}</div>}

      {showPw && (
        <div style={ST.formCard}>
          <div style={ST.field}>
            <label style={ST.label}>Nuova password (minimo 6 caratteri)</label>
            <Input type="text" value={miaPw} autoFocus
              onChange={e=>setMiaPw(e.target.value)} placeholder="Nuova password" />
          </div>
          {err && <div style={{...ST.err, marginTop:12}}>⚠️ {err}</div>}
          <button style={ST.saveBtn} onClick={salvaMiaPassword} disabled={savingPw || miaPw.length < 6}>
            {savingPw ? 'Salvataggio…' : 'Conferma'}
          </button>
        </div>
      )}

      {nuovo && (
        <div style={ST.formCard}>
          <div style={ST.grid}>
            <div style={ST.field}>
              <label style={ST.label}>Username (lettere e cifre)</label>
              <Input value={nuovo.username} autoFocus placeholder="mario"
                onChange={e=>campo('username', e.target.value)} />
            </div>
            <div style={ST.field}>
              <label style={ST.label}>Nome visualizzato</label>
              <Input value={nuovo.nome} placeholder="Mario Rossi"
                onChange={e=>campo('nome', e.target.value)} />
            </div>
            <div style={ST.field}>
              <label style={ST.label}>Password (la scegli tu, minimo 6)</label>
              <Input value={nuovo.password} placeholder="fuoco-530"
                onChange={e=>campo('password', e.target.value)} />
            </div>
            <div style={ST.field}>
              <label style={ST.label}>Ruolo</label>
              <select style={ST.select} value={nuovo.ruolo} onChange={e=>campo('ruolo', e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div style={ST.field}>
              <label style={ST.label}>Bankroll iniziale</label>
              <Input value={nuovo.bankroll} placeholder="0" inputMode="decimal"
                onChange={e=>campo('bankroll', e.target.value)} />
            </div>
          </div>
          {err && <div style={{...ST.err, marginTop:12}}>⚠️ {err}</div>}
          <button style={ST.saveBtn} onClick={salvaNuovo}
            disabled={busy || nuovo.username.length < 3 || nuovo.password.length < 6}>
            {busy ? 'Creazione…' : 'Crea utente'}
          </button>
        </div>
      )}


      <div style={ST.table}>
        {visible.length === 0 && <div style={ST.empty}>Nessun utente ancora. Crea il primo!</div>}
        {visible.map((u, i) => {
          const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user
          return (
            <div key={u.id}>
            <div style={{ ...ST.row, borderBottom: i < visible.length-1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ ...ST.avatar, background:rs.av, color:rs.avc }}>
                  {(u.display_name||u.username).substring(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={ST.rname}>{u.display_name||u.username}</div>
                  <div style={ST.rsub}>@{u.username}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <Badge colore={rs.color} sfondo={rs.bg}>{u.role}</Badge>
                <div style={{background:C.pozzo,border:`1px solid ${C.bordo}`,borderRadius:6,padding:'5px 12px',display:'flex',alignItems:'center',gap:4,minWidth:90}}>
                  <span style={{fontSize:S.base,color:C.spento,fontFamily:F.mono}}>€</span>
                  <span style={{fontSize:S.media,color:C.oro,fontFamily:F.mono,fontWeight:500}}>
                    {(u.bankroll||0).toFixed(2)}
                  </span>
                </div>
                {isSuperAdmin && (
                  <button style={ST.pwBtn} title="Assegna una password"
                    onClick={()=>{ setErr(''); setOk(''); setCambio(c => c?.username === u.username ? null : { username:u.username, password:'' }) }}>🔑</button>
                )}
                {isSuperAdmin && u.role !== 'superadmin' && (
                  <button style={ST.delBtn} onClick={()=>elimina(u)}>✕</button>
                )}
              </div>
            </div>
            {cambio?.username === u.username && (
              <div style={{ padding:'0 18px 14px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <Input style={{ width:200 }} autoFocus value={cambio.password}
                  placeholder="Nuova password" onChange={e=>setCambio({ ...cambio, password:e.target.value })} />
                <button style={{ ...ST.saveBtn, marginTop:0, padding:'9px 16px', fontSize:S.media }}
                  disabled={busy || cambio.password.length < 6} onClick={()=>salvaPasswordDi(u)}>
                  {busy ? 'Salvo…' : `Assegna a @${u.username}`}
                </button>
                <span style={{ fontSize:S.base, color:C.spento, fontFamily:F.sans }}>La scegli tu: falla dicibile a voce.</span>
              </div>
            )}
            </div>
          )
        })}
      </div>
      {/* Totale SuperAdmin — sola lettura */}
      {isSuperAdmin && users.length > 0 && (
        <div style={{...ST.row, borderTop:`1px solid ${C.bordo}`, marginTop:4}}>
          <span style={{fontSize:S.media,fontWeight:700,color:C.testo,fontFamily:F.sans}}>Totale aggregato</span>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{fontSize:S.base,color:C.spento,fontFamily:F.mono}}>€</span>
            <span style={{fontSize:S.titolo,fontWeight:700,color:C.oro,fontFamily:F.mono}}>
              {users.reduce((s,u)=>s+(u.bankroll||0),0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
