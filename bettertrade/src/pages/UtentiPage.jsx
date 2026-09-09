import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
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
}

const ROLE_STYLE = {
  superadmin: { bg:alpha(C.oro,0.15), color:C.oro, av:alpha(C.oro,0.15), avc:C.oro },
  admin:      { bg:alpha(C.bluPieno,0.12),  color:C.blu, av:alpha(C.bluPieno,0.12),  avc:C.blu },
  user:       { bg:alpha(C.verde,0.10),   color:C.menta, av:alpha(C.verde,0.10),   avc:C.menta },
}

export default function UtentiPage() {
  const { currentUser, users, fetchUsers, cambiaMiaPassword, deleteUser, isSuperAdmin, isAdmin } = useAuth()
  const [showPw, setShowPw] = useState(false)
  const [miaPw, setMiaPw]   = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk]   = useState('')
  const [busy, setBusy] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwOk, setPwOk] = useState('')

  useEffect(() => { if (isAdmin) fetchUsers() }, [])

  const visible = isSuperAdmin ? users : users.filter(u => u.created_by === currentUser?.id || u.role === 'user')

  // Cambio password della PROPRIA utenza. Per resettare quella di qualcun altro
  // serve la chiave service_role, che nel browser non può stare: si usa
  // `node --env-file=.env scripts/reset-password.js <username>`.
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

      <button style={S.addBtn} onClick={() => { setShowPw(v=>!v); setErr(''); setPwOk('') }}>
        {showPw ? '✕ Annulla' : '🔑 Cambia la mia password'}
      </button>

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

      {isAdmin && (
        <div style={{ ...S.formCard, borderColor:alpha(C.bluPieno,0.2), background:alpha(C.bluPieno,0.05) }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.blu, fontFamily:F.sans, marginBottom:8 }}>
            Creare utenti e resettare password
          </div>
          <div style={{ fontSize:12, color:C.grigioScuro, lineHeight:1.7, fontFamily:F.sans }}>
            Queste due operazioni richiedono la chiave <code style={{color:C.oro}}>service_role</code>, che
            non può stare nel browser: chiunque la leggesse avrebbe accesso completo al database.
            Si fanno da terminale, nella cartella <code style={{color:C.oro}}>bettertrade/</code>:
            <div style={{ marginTop:10, padding:'10px 12px', background:C.pozzo, border:`1px solid ${C.bordo}`, borderRadius:7, fontFamily:F.mono, fontSize:11, color:C.grigio, lineHeight:2 }}>
              node --env-file=.env scripts/crea-utente.js<br/>
              node --env-file=.env scripts/reset-password.js &lt;username&gt;
            </div>
          </div>
        </div>
      )}


      <div style={S.table}>
        {visible.length === 0 && <div style={S.empty}>Nessun utente ancora. Crea il primo!</div>}
        {visible.map((u, i) => {
          const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user
          return (
            <div key={u.id} style={{ ...S.row, borderBottom: i < visible.length-1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
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
                {isSuperAdmin && u.role !== 'superadmin' && (
                  <button style={S.delBtn} onClick={()=>{ if(confirm(`Elimina @${u.username}?`)) deleteUser(u.id) }}>✕</button>
                )}
              </div>
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
