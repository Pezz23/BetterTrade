import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { C, F, alpha, S } from '../theme'
import { Card, Etichetta, Attesa } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { sigla } from '../lib/campionati'
// ⚠️ `ggAnno` e non `gg`: questa coda attraversa gli anni, e una data senza
// anno in un elenco di cose rimaste in attesa non si può leggere.
import { ggAnno as gg } from '../lib/formato'

// IMPORTAZIONI — le partite che la seconda fonte non ha saputo agganciare.
//
// ⚠️ **Perché esiste questa pagina.** `importa-espn.js` scrive da solo **solo**
// quando trova una e una sola partita nostra che combacia su campionato, data
// (±1 giorno) e tutt'e due le squadre. Tutto il resto finisce qui invece di
// essere indovinato: un risultato messo sulla partita sbagliata non si vede,
// non si corregge, e sporca ogni misura che ci sta sopra.
//
// ⚠️ Le decisioni passano da `decidi_importazione()` (sql/27) e non da due
// scritture dal browser: accettare tocca `partite` **e** `importazioni`, e le
// due devono riuscire o fallire insieme.

const STATI = [
  { id: 'da_verificare', label: 'Da verificare', colore: C.ambra },
  { id: 'accettata',     label: 'Accettate',     colore: C.verde },
  { id: 'rifiutata',     label: 'Rifiutate',     colore: C.rosso },
]

export default function ImportazioniPage() {
  const { isAdmin } = useAuth()
  const [stato, setStato] = useState('da_verificare')
  const [righe, setRighe] = useState(null)
  const [conti, setConti] = useState({})
  const [inCorso, setInCorso] = useState(null)
  const [errore, setErrore] = useState(null)

  const carica = useCallback(async () => {
    const { data, error } = await supabase.from('importazioni').select('*')
      .eq('stato', stato).order('data', { ascending: false }).order('id').limit(200)
    if (error) return setErrore(error.message)
    setErrore(null)
    setRighe(data || [])
    // i conteggi di tutti e tre gli stati, per i tasti
    const { data: tutti } = await supabase.from('importazioni').select('stato')
    const c = {}
    for (const r of tutti || []) c[r.stato] = (c[r.stato] || 0) + 1
    setConti(c)
  }, [stato])

  useEffect(() => { carica() }, [carica])

  async function decidi(id, accetta, partitaId = null) {
    setInCorso(id)
    const { error } = await supabase.rpc('decidi_importazione',
      { p_id: id, p_accetta: accetta, p_partita_id: partitaId })
    setInCorso(null)
    // ⚠️ L'errore si mostra: RLS e i controlli dentro la funzione bloccano in
    // silenzio, e una riga che resta lì senza spiegazione sembra un difetto.
    if (error) return setErrore(error.message)
    setErrore(null)
    carica()
  }


  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <h2 style={{ fontSize: S.titolo, fontFamily: F.sans, letterSpacing: '0.1em', color: C.testo, margin: '4px 0 4px' }}>
        IMPORTAZIONI
      </h2>
      <div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, marginBottom: 12, lineHeight: 1.5 }}>
        Partite viste da ESPN che non si agganciano da sole alle nostre. Niente viene scritto
        finché non decidi tu.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {STATI.map(s => (
          <button key={s.id} onClick={() => { setStato(s.id); setRighe(null) }} style={{
            flex: 1, padding: '7px 4px', fontSize: S.minuta, fontFamily: F.sans, letterSpacing: '0.04em',
            cursor: 'pointer', color: stato === s.id ? s.colore : C.spento,
            background: stato === s.id ? `linear-gradient(${alpha(s.colore, 0.12)},${alpha(s.colore, 0.12)}), ${C.card}` : C.card,
            border: `1px solid ${alpha(s.colore, stato === s.id ? 0.45 : 0.18)}`,
          }}>{s.label.toUpperCase()} {conti[s.id] ? `· ${conti[s.id]}` : ''}</button>
        ))}
      </div>

      {errore && <Card style={{ marginBottom: 10, borderColor: alpha(C.rosso, 0.4) }}>
        <div style={{ color: C.rosso, fontSize: S.corpo }}>{errore}</div>
      </Card>}

      {righe === null && <Attesa style={{ padding: 0 }} />}
      {righe?.length === 0 && (
        <Card><div style={{ fontSize: S.media, color: C.spento, textAlign: 'center', padding: '24px 8px' }}>
          {stato === 'da_verificare' ? 'Niente in sospeso: tutto si è agganciato da solo.' : 'Nessuna.'}
        </div></Card>
      )}

      {righe?.map(r => (
        <Card key={r.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <Etichetta>{sigla(r.div) || r.div} · {gg(r.data)}</Etichetta>
            <span style={{ fontSize: S.micro, fontFamily: F.sans, color: C.ambra }}>{r.motivo}</span>
          </div>
          <div style={{ fontSize: S.grande, color: C.testo, fontFamily: F.sans, marginBottom: 2 }}>
            {r.casa_fonte} <strong style={{ fontFamily: F.mono }}>{r.gol_casa}-{r.gol_trasferta}</strong> {r.trasferta_fonte}
          </div>
          <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento, marginBottom: 8 }}>
            tiri in porta {r.tirip_casa ?? '—'}-{r.tirip_trasf ?? '—'} · possesso {r.possesso_casa ?? '—'}-{r.possesso_trasf ?? '—'}
          </div>

          {/* ⚠️ I candidati si mostrano **per intero**, con data e squadre come
              le scriviamo noi: è l'unica cosa che permette a una persona di
              dire "sì, è quella" invece di fidarsi. */}
          {(r.candidati || []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: S.micro, fontFamily: F.sans, color: C.spento, marginBottom: 3 }}>
                NOSTRE PARTITE CHE POTREBBERO ESSERE QUESTA
              </div>
              {r.candidati.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: S.corpo, color: C.testo }}>{c.data} · {c.casa} — {c.trasferta}</span>
                  {isAdmin && stato === 'da_verificare' && (
                    <button onClick={() => decidi(r.id, true, c.id)} disabled={inCorso === r.id} style={{
                      padding: '4px 10px', fontSize: S.minuta, fontFamily: F.sans, cursor: 'pointer',
                      color: C.verde, background: 'transparent', border: `1px solid ${alpha(C.verde, 0.45)}`,
                    }}>È QUESTA</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && stato === 'da_verificare' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {/* ⚠️ "Crea nuova" compare sempre, anche con dei candidati: può
                  darsi che nessuno sia quello giusto. */}
              <button onClick={() => decidi(r.id, true, null)} disabled={inCorso === r.id} style={{
                flex: 1, padding: '7px', fontSize: S.base, fontFamily: F.sans, cursor: 'pointer',
                color: C.oro, background: 'transparent', border: `1px solid ${alpha(C.oro, 0.4)}`,
              }}>CREA PARTITA NUOVA</button>
              <button onClick={() => decidi(r.id, false)} disabled={inCorso === r.id} style={{
                flex: 1, padding: '7px', fontSize: S.base, fontFamily: F.sans, cursor: 'pointer',
                color: C.rosso, background: 'transparent', border: `1px solid ${alpha(C.rosso, 0.35)}`,
              }}>SCARTA</button>
            </div>
          )}
          {!isAdmin && stato === 'da_verificare' && (
            <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento }}>decide un admin</div>
          )}
        </Card>
      ))}
    </div>
  )
}
