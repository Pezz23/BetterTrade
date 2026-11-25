import { useState, useEffect } from 'react'
import { C, F, alpha, S, SP, R } from '../theme'
import { tocco } from '../lib/schermo'

// «SISTEMA I CONTI» — il pop-up dell'esito di un passo (24/11/2026, `sql/63`).
//
// Mattia: *"un pop-up quando confermo: importo giocato, importo vinto e sotto un
// tasto sistema i conti"*. Si apre su ✓ e su ✗ di ogni passo, coi numeri
// dell'app già scritti: se sono quelli veri basta confermare, altrimenti si
// correggono e la differenza va sul conto (nel banco si divide fra chi c'è).
// ⚠️ Chiuderlo non salva niente: l'esito si scrive solo col tasto, insieme ai soldi
// (`decidi_passo`, una transazione sola).
// ⚠️ L'incasso è quello **totale**, come lo mostra il bookmaker, puntata compresa.

const eur = (x) => `${Number(x || 0).toFixed(2).replace('.', ',')} €`
const conSegno = (x) => `${x >= 0 ? '+' : '−'}${eur(Math.abs(x))}`
const numero = (t) => { const s = String(t).trim().replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : null }
const cent = (x) => Math.round(x * 100) / 100
const scrivi = (x) => Number(x).toFixed(2).replace('.', ',')

export default function SistemaConti({ titolo, esito, posta, quota, banco = false, onSalva, onChiudi }) {
  const vinto = esito === 'vinto'
  const [giocato, setGiocato] = useState(scrivi(posta))
  // `null` = non ancora toccato: segue l'importo giocato alla quota del passo.
  const [incasso, setIncasso] = useState(null)
  // «Cash out»: solo un segno per contarli (Mattia, 25/11/2026, `sql/66`).
  const [cashout, setCashout] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  const g = numero(giocato)
  const testoIncasso = incasso ?? (g != null ? scrivi(cent(g * quota)) : '')
  const v = vinto ? numero(testoIncasso) : 0
  const valido = g > 0 && (!vinto || v > 0)
  const nellApp = vinto ? cent(posta * quota) - posta : -posta
  const vero = valido ? v - g : null
  const diff = valido ? cent(vero - nellApp) : 0
  // La quota vera, bonus compresi: è quella che resta scritta sul passo (sql/64).
  const quotaVera = valido && vinto ? v / g : null
  const virgola = (x) => x.toFixed(2).replace('.', ',')
  const col = vinto ? C.verde : C.rosso

  const salva = async () => {
    if (!valido || occupato) return
    setOccupato(true); setErrore(null)
    const x = await onSalva({ giocato: g, incasso: vinto ? v : null, cashout: vinto && cashout })
    if (x?.errore) { setErrore(x.errore); setOccupato(false) }
  }

  // ⚠️ Campi a 16px: sotto, iOS ingrandisce la pagina da solo.
  const campo = (etichetta, valore, cambia, buono, auto) => (
    <label style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', alignItems: 'center', gap: SP.m, marginBottom: SP.m }}>
      <span style={{ fontFamily: F.sans, fontSize: S.media, color: C.testo }}>{etichetta}</span>
      <input value={valore} inputMode="decimal" autoFocus={auto} onChange={e => cambia(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') salva() }}
        style={{ width: '100%', boxSizing: 'border-box', textAlign: 'right', background: C.pozzo, outline: 'none',
          border: `1px solid ${buono ? C.bordo : C.rosso}`, borderRadius: R.m, padding: '9px 10px',
          color: C.testo, fontFamily: F.mono, fontSize: 16 }} />
    </label>
  )

  return (
    <>
      <div onClick={occupato ? undefined : onChiudi} style={{ position: 'fixed', inset: 0, zIndex: 80, background: alpha(C.fondo, 0.75) }} />
      <div role="dialog" aria-modal="true" aria-label={`${titolo} ${esito}`} style={{
        position: 'fixed', zIndex: 90, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(380px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', boxSizing: 'border-box',
        background: C.pannello, border: `1px solid ${alpha(col, 0.5)}`, borderRadius: R.g, padding: SP.xxl,
        boxShadow: `0 20px 48px ${alpha(C.fondo, 0.9)}`,
      }}>
        <div style={{ fontFamily: F.sans, fontSize: S.grande, fontWeight: 700, color: col, marginBottom: SP.l }}>
          {titolo} · {esito}
        </div>
        {campo('Importo giocato', giocato, setGiocato, g > 0, !tocco)}
        {vinto && campo('Importo vinto', testoIncasso, setIncasso, v > 0)}
        {vinto && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', alignItems: 'baseline', gap: SP.m,
            marginBottom: SP.m, paddingTop: SP.m, borderTop: `1px solid ${C.bordoRiga}` }}>
            <span style={{ fontFamily: F.sans, fontSize: S.media, color: C.testo }}>
              Quota totale <span style={{ fontSize: S.minuta, color: C.spento }}>· nell’app {virgola(quota)}</span>
            </span>
            <b style={{ textAlign: 'right', paddingRight: 11, fontFamily: F.mono, fontSize: S.grande, color: C.oro }}>
              {quotaVera != null ? virgola(quotaVera) : '—'}
            </b>
          </div>
        )}
        {vinto && (
          <label style={{ display: 'flex', alignItems: 'center', gap: SP.m, minHeight: 34, marginBottom: SP.s, cursor: 'pointer',
            fontFamily: F.sans, fontSize: S.media, color: cashout ? C.testo : C.spento }}>
            <input type="checkbox" checked={cashout} onChange={e => setCashout(e.target.checked)} style={{ width: 18, height: 18, flexShrink: 0, accentColor: C.oro }} />
            Cash out
          </label>
        )}
        <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento, lineHeight: 1.6, minHeight: 38 }}>
          {valido && <>
            Risultato <b style={{ fontFamily: F.mono, color: vero >= 0 ? C.verde : C.rosso }}>{conSegno(vero)}</b>
            {diff === 0
              ? ' · uguale all’app'
              : <> · rispetto all’app <b style={{ fontFamily: F.mono, color: C.ambra }}>{conSegno(diff)}</b>
                <br />{banco ? 'si divide fra chi è nel banco, in proporzione alle puntate' : 'va sul tuo conto'}</>}
          </>}
          {!valido && <span style={{ color: C.rosso }}>Scrivi {vinto ? 'i due importi' : 'l’importo'}, per esempio 12,50.</span>}
        </div>
        {!vinto && (
          <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.ambra, marginTop: SP.s }}>
            Con un perso il giro va in archivio e non si torna indietro.
          </div>
        )}
        {errore && <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.rosso, marginTop: SP.s }}>{errore}</div>}
        <div style={{ display: 'flex', gap: SP.m, marginTop: SP.l }}>
          <button onClick={onChiudi} disabled={occupato} style={{ flex: 1, padding: '11px 8px', borderRadius: R.m, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${C.bordo}`, color: C.spento, fontFamily: F.sans, fontSize: S.media }}>Annulla</button>
          <button onClick={salva} disabled={!valido || occupato} style={{ flex: 2, padding: '11px 8px', borderRadius: R.m,
            cursor: valido && !occupato ? 'pointer' : 'default', background: alpha(col, valido ? 0.16 : 0.05),
            border: `1px solid ${alpha(col, valido ? 0.55 : 0.2)}`, color: valido ? col : C.fioco,
            fontFamily: F.sans, fontSize: S.media, fontWeight: 700 }}>{occupato ? 'Salvo…' : 'Sistema i conti'}</button>
        </div>
      </div>
    </>
  )
}
