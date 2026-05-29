import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const S = {
  root:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'#090909', position:'relative' },
  glow:  { position:'fixed', inset:0, background:'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents:'none' },
  card:  { background:'#111', border:'1px solid #1e1e1e', borderRadius:18, padding:'40px 32px', width:'100%', maxWidth:380, zIndex:1 },
  logo:  { display:'flex', alignItems:'center', gap:12, marginBottom:6 },
  icon:  { width:42, height:42, background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.22)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' },
  name:  { fontSize:20, fontWeight:700, color:'#e0d9d0', letterSpacing:'-0.4px', fontFamily:"'Sora',sans-serif" },
  sub:   { fontSize:12, color:'#555', marginBottom:28, fontFamily:"'Sora',sans-serif" },
  form:  { display:'flex', flexDirection:'column', gap:18 },
  field: { display:'flex', flexDirection:'column', gap:6 },
  label: { fontSize:11, fontWeight:500, color:'#666', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'DM Mono',monospace" },
  input: { background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:8, padding:'11px 14px', color:'#e0d9d0', fontSize:15, fontFamily:"'Sora',sans-serif", outline:'none', width:'100%' },
  err:   { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.22)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#ef4444', fontFamily:"'Sora',sans-serif" },
  btn:   { background:'#c9a84c', border:'none', borderRadius:8, padding:'13px', color:'#090909', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", marginTop:4 },
  hint:  { marginTop:22, fontSize:12, color:'#333', textAlign:'center', fontFamily:"'Sora',sans-serif" },
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
    <div style={S.root}>
      <div style={S.glow} />
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.icon}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity=".9"/>
              <rect x="16" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity=".5"/>
              <rect x="2" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity=".5"/>
              <rect x="16" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity=".9"/>
            </svg>
          </div>
          <span style={S.name}>BetterTrade</span>
        </div>
        <p style={S.sub}>Accedi al tuo account</p>
        <form onSubmit={submit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Username</label>
            <input style={S.input} value={u} onChange={e=>setU(e.target.value)} placeholder="Il tuo username" required autoComplete="username" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position:'relative' }}>
              <input style={{ ...S.input, paddingRight:42 }} type={show?'text':'password'} value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              <button type="button" onClick={()=>setShow(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, padding:2 }}>{show?'🙈':'👁️'}</button>
            </div>
          </div>
          {err && <div style={S.err}>⚠️ {err}</div>}
          <button type="submit" style={S.btn} disabled={busy}>{busy?'Accesso…':'Accedi'}</button>
        </form>
        <p style={S.hint}>Non hai un account? Chiedi all'amministratore.</p>
      </div>
    </div>
  )
}
