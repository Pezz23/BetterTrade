import { useState } from 'react'
import { supabase } from '../supabase'
import { partiteDelGiorno } from '../lib/espn'
import { nome } from '../lib/campionati'
import { aggiornaEsitiGriglia } from '../hooks/usaRecenti'
import { C, F, S, SP, R, alpha } from '../theme'
import { Card } from './ui'

// «SCARICA RISULTATI» — in fondo a Road to weekend, solo per il superadmin
// (30/10/2026, Mattia: *"un tasto che lancio dall'app che chiede solo i
// risultati a ESPN"*, *"una schermata che mi indica lo stato dell'avanzamento,
// simile a una barra dei download"*).
//
// ⚠️⚠️ **I risultati li chiede a ESPN il TELEFONO**: dai server di Supabase
// ESPN risponde 403. Per ogni campionato, tre tempi:
//   1. la funzione `aggiorna-risultati` dice quali giorni guardare;
//   2. il telefono scarica da ESPN quei giorni (lo stesso `lib/espn.js` del
//      motore);
//   3. la funzione abbina e scrive, con la regola «una e una sola partita».
// ⚠️ Solo i risultati e solo i quindici campionati, ultimi 2 giorni: tiri,
// angoli e cartellini li porta football-data, e nelle coppe ESPN è l'unica
// fonte (lì scrive il Mac, completo).
// ⚠️ Il tasto nascosto non protegge niente: il controllo del superadmin sta
// **dentro la funzione**.

export default function ScaricaRisultati({ onFinito }) {
  // null = fermo; altrimenti { fatti, totale, ora, nuove, giaAPosto, dubbie, problemi, errore, finito }
  const [stato, setStato] = useState(null)
  const lavora = stato && !stato.finito

  const chiama = async (body) => {
    const { data, error } = await supabase.functions.invoke('aggiorna-risultati', { body })
    if (error) {
      // l'errore della funzione è nel corpo della risposta
      let msg = error.message
      try { msg = (await error.context?.json())?.errore ?? msg } catch { /* resta quello di supabase */ }
      throw new Error(msg)
    }
    if (data?.errore) throw new Error(data.errore)
    return data
  }

  const avvia = async () => {
    const s = { fatti: 0, totale: 0, ora: 'mi collego…', nuove: [], giaAPosto: 0, dubbie: 0, problemi: 0, errore: null, finito: false }
    setStato({ ...s })
    try {
      const { voci } = await chiama({})
      s.totale = voci.length
      for (const voce of voci) {
        s.ora = nome(voce); setStato({ ...s })
        try {
          const { giorni } = await chiama({ voce })
          const eventi = {}
          for (const g of giorni) {
            // un giorno che ESPN non dà non ferma il campionato
            try { eventi[g] = await partiteDelGiorno(voce, g) } catch { s.problemi++ }
          }
          const r = await chiama({ voce, eventi })
          s.nuove.push(...(r.nuove || []))
          s.giaAPosto += r.invariate || 0
          s.dubbie += r.dubbie || 0
          s.problemi += r.saltate || 0
        } catch { s.problemi++ }
        s.fatti++; setStato({ ...s })
      }
      // ⚠️ E gli esiti automatici delle spin (30/10/2026): la Dashboard conta
      // dalle caselle, e così è aggiornata senza aprire la Slot.
      s.ora = 'esiti delle spin…'; setStato({ ...s })
      s.esitiSpin = await aggiornaEsitiGriglia()
    } catch (e) { s.errore = e.message }
    s.finito = true; s.ora = null
    setStato({ ...s })
    onFinito?.()
  }

  const quota = stato?.totale ? stato.fatti / stato.totale : 0
  return (
    <Card style={{ marginTop: SP.l }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.m, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.sans, fontSize: S.base, fontWeight: 700, color: C.testo }}>Risultati da ESPN</div>
          <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.fioco }}>
            i 15 campionati, ultimi 2 giorni · solo i risultati · dal telefono
          </div>
        </div>
        <button onClick={avvia} disabled={lavora} style={{ padding: '8px 14px', cursor: lavora ? 'default' : 'pointer',
          borderRadius: R.m, background: alpha(C.celeste, lavora ? 0.06 : 0.14), border: `1px solid ${alpha(C.celeste, 0.5)}`,
          color: lavora ? C.spento : C.celeste, fontFamily: F.sans, fontSize: S.base, fontWeight: 700 }}>
          {lavora ? 'scarico…' : '⤓ Scarica risultati'}
        </button>
      </div>

      {stato && (
        <div style={{ marginTop: SP.m }}>
          {/* ⚠️ La barra: un campionato per tacca, e accanto quale sta facendo. */}
          <div style={{ height: 6, borderRadius: 3, background: alpha(C.testo, 0.08), overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(quota * 100)}%`, background: stato.errore ? C.rosso : C.celeste,
              transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', gap: SP.m, marginTop: SP.s, fontFamily: F.sans, fontSize: S.micro, color: C.spento }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stato.errore ? <b style={{ color: C.rosso }}>{stato.errore}</b>
                : stato.finito ? 'finito' : stato.ora}
            </span>
            <span style={{ fontFamily: F.mono, fontVariantNumeric: 'tabular-nums' }}>{stato.fatti}/{stato.totale || 15}</span>
          </div>
          {stato.finito && !stato.errore && (
            <div style={{ marginTop: SP.s, fontFamily: F.sans, fontSize: S.minuta, color: C.testo, lineHeight: 1.5 }}>
              <b style={{ color: stato.nuove.length ? C.verde : C.spento }}>{stato.nuove.length} risultati nuovi</b>
              {' · '}{stato.giaAPosto} già in archivio
              {stato.dubbie ? <span style={{ color: C.ambra }}>{' · '}{stato.dubbie} da verificare in Importazioni</span> : null}
              {stato.problemi ? <span style={{ color: C.ambra }}>{' · '}{stato.problemi} non letti, riprova</span> : null}
              {stato.esitiSpin ? <>{' · '}<b style={{ color: C.verde }}>{stato.esitiSpin} esiti scritti nelle spin</b></> : null}
              {stato.nuove.slice(0, 12).map(x => (
                <div key={x} style={{ fontFamily: F.mono, fontSize: S.micro, color: C.spento }}>
                  {x.replace(/\s+tiri in porta.*$/, '')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
