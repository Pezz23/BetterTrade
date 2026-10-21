import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { C, F, alpha, S } from '../theme'
// ⚠️ Il campo di testo è quello di `ui.jsx`: tre copie dello stesso stile con
// tre misure diverse erano il modo di ritrovarsi con tre aspetti (15/10/2026).
import { Input } from '../components/ui'

// ⚠️ `ST` e non `S`: `S` è la scala dei caratteri del tema (`theme.js`), e
// prima questo foglio di stile locale le rubava il nome.
const ST = {
  root:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:C.fondo, position:'relative' },
  glow:  { position:'fixed', inset:0, background:`radial-gradient(ellipse 70% 40% at 50% 0%, ${alpha(C.oro,0.07)} 0%, transparent 70%)`, pointerEvents:'none' },
  card:  { background:C.pannello, border:`1px solid ${C.bordo}`, borderRadius:18, padding:'40px 32px', width:'100%', maxWidth:380, zIndex:1 },
  logo:  { display:'flex', alignItems:'center', gap:12, marginBottom:6 },
  icon:  { width:42, height:42, background:alpha(C.oro,0.12), border:`1px solid ${alpha(C.oro,0.22)}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' },
  name:  { fontSize:S.evidenza, fontWeight:700, color:C.testo, letterSpacing:'-0.4px', fontFamily:F.sans },
  sub:   { fontSize:S.corpo, color:C.spento, marginBottom:28, fontFamily:F.sans },
  form:  { display:'flex', flexDirection:'column', gap:18 },
  field: { display:'flex', flexDirection:'column', gap:6 },
  label: { fontSize:S.base, fontWeight:600, color:C.grigioFioco, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:F.mono },
  err:   { background:alpha(C.rosso,0.08), border:`1px solid ${alpha(C.rosso,0.22)}`, borderRadius:8, padding:'10px 14px', fontSize:S.media, color:C.rosso, fontFamily:F.sans },
  btn:   { background:C.oro, border:'none', borderRadius:8, padding:'13px', color:C.fondo, fontSize:S.titolo, fontWeight:700, cursor:'pointer', fontFamily:F.sans, marginTop:4 },
  hint:  { marginTop:22, fontSize:S.corpo, color:C.fantasma, textAlign:'center', fontFamily:F.sans },
}

export default function LoginPage() {
  const { login } = useAuth()
  const [u, setU]   = useState('')
  const [p, setP]   = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const r = await login(u, p)
    if (!r.ok) setErr(r.error)
    setBusy(false)
  }

  return (
    <div style={ST.root}>
      <div style={ST.glow} />
      <div style={ST.card}>
        <div style={ST.logo}>
          <div style={ST.icon}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill={C.oro} opacity=".9"/>
              <rect x="16" y="2" width="10" height="10" rx="2" fill={C.oro} opacity=".5"/>
              <rect x="2" y="16" width="10" height="10" rx="2" fill={C.oro} opacity=".5"/>
              <rect x="16" y="16" width="10" height="10" rx="2" fill={C.oro} opacity=".9"/>
            </svg>
          </div>
          <span style={ST.name}>BetterTrade</span>
        </div>
        <p style={ST.sub}>Accedi al tuo account</p>
        <form onSubmit={submit} style={ST.form}>
          <div style={ST.field}>
            <label style={ST.label}>Username</label>
            <Input value={u} onChange={e=>setU(e.target.value)} placeholder="Il tuo username" required autoComplete="username" />
          </div>
          <div style={ST.field}>
            <label style={ST.label}>Password</label>
            <div style={{ position:'relative' }}>
              <Input style={{ paddingRight:42 }} type={show?'text':'password'} value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              <button type="button" onClick={()=>setShow(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:S.titolo, padding:2 }}>{show?'🙈':'👁️'}</button>
            </div>
          </div>
          {err && <div style={ST.err}>⚠️ {err}</div>}
          <button type="submit" style={ST.btn} disabled={busy}>{busy?'Accesso…':'Accedi'}</button>
        </form>
        <p style={ST.hint}>Non hai un account? Chiedi all'amministratore.</p>
      </div>
    </div>
  )
}
