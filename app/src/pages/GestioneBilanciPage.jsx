import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { C, F, S, SP, R, alpha } from '../theme'
import { Card, Attesa, Etichetta } from '../components/ui'

// GESTIONE BILANCI — i soldi di Road to weekend, utente per utente (04/11/2026).
//
// Mattia: *"trasferire il denaro dalla cassa a RTW e viceversa"*. Solo il
// superadmin: la voce di menu si nasconde, ma a proteggere sono `riepilogo_rtw`
// e `trasferisci_rtw` (`sql/55`), che rifiutano chiunque altro.
// ⚠️ I saldi qui sono letti, mai scritti: il trasferimento registra due righe
// nel database, e cassa e conto si ricalcolano (regola 1).

const eur = (x) => `${Number(x || 0).toFixed(2).replace('.', ',')} €`

function RigaUtente({ u, riga, occupato, onTrasferisci, onSpunta }) {
  const [importo, setImporto] = useState('')
  const conto = Number(riga?.conto || 0)
  const risultato = conto - Number(riga?.versato || 0)
  const inCorso = !!riga?.in_corso
  const valido = Number(importo) > 0 && !occupato && !inCorso
  const tasto = (verso, testo) => (
    <button disabled={!valido} onClick={async () => {
      if (await onTrasferisci(u.id, Number(importo), verso)) setImporto('')
    }} style={{ flex: 1, minWidth: 0, padding: '7px 4px', borderRadius: R.m, cursor: valido ? 'pointer' : 'default',
      background: alpha(C.oro, valido ? 0.14 : 0.04), border: `1px solid ${alpha(C.oro, valido ? 0.5 : 0.18)}`,
      color: valido ? C.oro : C.fioco, fontFamily: F.sans, fontSize: S.base, fontWeight: 700 }}>
      {testo}
    </button>
  )
  return (
    <Card style={{ marginBottom: SP.m }}>
      <div style={{ fontFamily: F.sans, fontSize: S.media, fontWeight: 700, color: C.testo }}>
        {u.display_name || u.username}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: SP.s, marginTop: SP.s }}>
        {[['CASSA', eur(u.bankroll), C.testo], ['RTW', eur(conto), C.oro],
          ['RISULTATO RTW', `${risultato >= 0 ? '+' : ''}${eur(risultato)}`, risultato >= 0 ? C.verde : C.rosso]].map(([l, v, col]) => (
          <div key={l} style={{ minWidth: 0 }}>
            <Etichetta>{l}</Etichetta>
            <div style={{ fontFamily: F.mono, fontSize: S.base, fontWeight: 700, color: col, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      {/* L'andamento nel banco: i risultati dal più recente. */}
      {riga?.giocate > 0 && (
        <div style={{ marginTop: SP.s, fontFamily: F.sans, fontSize: S.micro, color: C.spento }}>
          {riga.giocate} giocate · {riga.vinte} vinte
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 2, fontFamily: F.mono }}>
            {(riga.ultimi || []).map((x, i) => (
              <span key={i} style={{ color: Number(x) >= 0 ? C.verde : C.rosso }}>{Number(x) >= 0 ? '+' : ''}{Number(x).toFixed(2).replace('.', ',')}</span>
            ))}
          </div>
        </div>
      )}
      {/* ⚠️ La spunta: chi la ha segue i passi del superadmin coi suoi soldi. */}
      {u.role !== 'superadmin' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: SP.s, marginTop: SP.m, cursor: 'pointer',
          fontFamily: F.sans, fontSize: S.base, color: u.copia_banco ? C.testo : C.spento }}>
          <input type="checkbox" checked={!!u.copia_banco} disabled={occupato} onChange={() => onSpunta(u.id, !u.copia_banco)} />
          copia il banco
        </label>
      )}
      {/* ⚠️ Campo a 16px: sotto, iOS ingrandisce la pagina da solo. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.s, marginTop: SP.m }}>
        <input value={importo} onChange={e => setImporto(e.target.value.replace(',', '.'))}
          inputMode="decimal" placeholder="€" aria-label={`importo per ${u.username}`}
          style={{ width: 76, flexShrink: 0, boxSizing: 'border-box', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: R.m,
            padding: '6px 8px', color: C.testo, fontFamily: F.mono, fontSize: 16, outline: 'none' }} />
        {tasto('a_rtw', 'Cassa → RTW')}
        {tasto('a_cassa', 'RTW → Cassa')}
      </div>
      {inCorso && (
        <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.ambra, marginTop: SP.s }}>
          c’è una giocata senza esito: si trasferisce dopo
        </div>
      )}
    </Card>
  )
}

export default function GestioneBilanciPage() {
  const { users, fetchUsers } = useAuth()
  const [righe, setRighe] = useState(null)
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)

  const leggi = useCallback(async () => {
    const { data, error } = await supabase.rpc('riepilogo_rtw')
    if (error) { setErrore(error.message); return }
    setRighe(new Map((data || []).map(r => [r.user_id, r])))
  }, [])
  useEffect(() => { leggi() }, [leggi])

  const onTrasferisci = async (userId, importo, verso) => {
    setOccupato(true); setErrore(null)
    const { error } = await supabase.rpc('trasferisci_rtw', { p_user: userId, p_importo: importo, p_verso: verso })
    if (error) setErrore(error.message)
    await Promise.all([leggi(), fetchUsers()])
    setOccupato(false)
    return !error
  }

  const onSpunta = async (userId, valore) => {
    setOccupato(true); setErrore(null)
    const { error } = await supabase.rpc('imposta_copia_banco', { p_user: userId, p_valore: valore })
    if (error) setErrore(error.message)
    await Promise.all([leggi(), fetchUsers()])
    setOccupato(false)
  }

  if (!righe && !errore) return <Attesa>carico i conti…</Attesa>
  const totale = [...(righe?.values() || [])].reduce((a, r) => a + Number(r.conto || 0), 0)
  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <h2 style={{ fontSize: S.titolo, fontFamily: F.sans, letterSpacing: '0.1em', color: C.testo, margin: '4px 0 4px' }}>GESTIONE BILANCI</h2>
      <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento, marginBottom: SP.m }}>
        totale in RTW <b style={{ fontFamily: F.mono, color: C.oro }}>{eur(totale)}</b>
      </div>
      {errore && (
        <Card style={{ marginBottom: SP.m, borderColor: alpha(C.rosso, .4) }}>
          <div style={{ color: C.rosso, fontSize: S.base, fontFamily: F.sans }}>{errore}</div>
        </Card>
      )}
      {righe && users.map(u => (
        <RigaUtente key={u.id} u={u} riga={righe.get(u.id)} occupato={occupato} onTrasferisci={onTrasferisci} onSpunta={onSpunta} />
      ))}
    </div>
  )
}
