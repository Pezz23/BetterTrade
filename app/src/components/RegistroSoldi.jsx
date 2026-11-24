import { useState, useMemo } from 'react'
import { C, F, S, SP, R, alpha } from '../theme'
import { stileCard, Attesa, Etichetta } from './ui'
import { vistaRegistro, NON_GUADAGNO, NOMI_TIPO as NOMI } from '../lib/registro'

// IL REGISTRO DEI SOLDI in Bilancio (24/11/2026, lotto S4, `sql/65`): ogni evento dal
// giorno 1, con il saldo dopo. Il superadmin vede tutti, un utente solo il suo: lo
// decide il database, qui si nasconde solo la scelta.
// I dati li legge la pagina (`usaRegistro`), una volta per tutti.

const eur = (x) => `€${Number(x || 0).toFixed(2)}`
const conSegno = (x) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${eur(Math.abs(x))}`
const giornoOra = (t) => new Date(t).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function Riga({ r, conNomi }) {
  // ⚠️ Un trasferimento visto da «tutto» non sposta il saldo: si dice quanto è passato.
  const interno = r.importo === 0 && r.tipo === 'trasferimento'
  const col = interno ? C.spento : NON_GUADAGNO.has(r.tipo) ? C.celeste
    : r.importo >= 0 ? C.verde : C.rosso
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: SP.m, padding: '9px 14px', borderBottom: `1px solid ${C.bordoTenue}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: F.sans, fontSize: S.corpo, color: C.testo, overflowWrap: 'anywhere' }}>{r.motivo || NOMI[r.tipo]}</div>
        <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.fioco }}>
          <span style={{ fontFamily: F.mono }}>{giornoOra(r.quando)}</span> · {NOMI[r.tipo] ?? r.tipo}
          {conNomi && (r.nomi.length === 1 ? ` · ${r.nomi[0]}` : ` · ${r.nomi.length} utenti`)}
        </div>
      </div>
      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div style={{ fontFamily: F.mono, fontVariantNumeric: 'tabular-nums', fontSize: S.media, fontWeight: 700, color: col }}>
          {interno ? `⇄ ${eur(r.mosso)}` : conSegno(r.importo)}
        </div>
        <div style={{ fontFamily: F.mono, fontVariantNumeric: 'tabular-nums', fontSize: S.minuta, color: C.fioco }}>{eur(r.saldo)}</div>
      </div>
    </div>
  )
}

export default function RegistroSoldi({ dati, errore, superadmin = false, userId }) {
  const [aperto, setAperto] = useState(false)
  const [chi, setChi] = useState(superadmin ? 'totale' : userId)
  const [conto, setConto] = useState('tutto')

  const v = useMemo(() => (dati ? vistaRegistro(dati, { chi, conto }) : null), [dati, chi, conto])
  // Chi non ha mai avuto un euro non serve nella scelta.
  const scelte = useMemo(() => {
    const mossi = new Set((dati?.eventi || []).map(e => e.user_id))
    return (dati?.utenti || []).filter(u => mossi.has(u.id) || [u.apre_cassa, u.apre_rtw, u.cassa, u.rtw].some(x => Number(x)))
  }, [dati])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: S.micro, color: C.spento, fontFamily: F.sans, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Registro dei soldi</div>
        <button onClick={() => setAperto(a => !a)} style={{ fontSize: S.base, padding: '4px 10px', borderRadius: R.m, cursor: 'pointer',
          fontFamily: F.sans, background: 'transparent', border: `1px solid ${C.bordo}`, color: C.spento }}>{aperto ? 'Nascondi' : 'Mostra'}</button>
      </div>
      {aperto && errore && <div style={stileCard({ color: C.rosso, fontFamily: F.sans, fontSize: S.base })}>{errore}</div>}
      {aperto && !errore && !v && <div style={stileCard()}><Attesa style={{ padding: 0 }}>carico il registro…</Attesa></div>}
      {aperto && !errore && v && (
        <div style={stileCard({ padding: 0, overflow: 'hidden' })}>
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.s, marginBottom: SP.l }}>
              {/* ⚠️ 16px: sotto, iOS ingrandisce la pagina da solo. */}
              {superadmin && (
                <select value={chi} onChange={e => setChi(e.target.value)} aria-label="di chi" style={{ flex: '1 1 140px', minWidth: 0,
                  background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: R.m, padding: '6px 8px', color: C.testo, fontFamily: F.sans, fontSize: 16 }}>
                  <option value="totale">Conto comune</option>
                  {scelte.map(u => <option key={u.id} value={u.id}>{u.nome}{u.in_totale === false ? ' (conto separato)' : ''}</option>)}
                </select>
              )}
              <div style={{ display: 'flex', gap: 4, flex: '1 1 180px' }}>
                {[['tutto', 'Tutto'], ['cassa', 'Slot'], ['rtw', 'RTW']].map(([k, l]) => (
                  <button key={k} onClick={() => setConto(k)} aria-pressed={conto === k} style={{ flex: 1, minWidth: 0, padding: '7px 4px', borderRadius: R.m, cursor: 'pointer',
                    background: conto === k ? alpha(C.oro, 0.14) : 'transparent', border: `1px solid ${conto === k ? alpha(C.oro, 0.5) : C.bordo}`,
                    color: conto === k ? C.oro : C.spento, fontFamily: F.sans, fontSize: S.base, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: SP.m }}>
              {[[`Al ${giornoOra(dati.dal).slice(0, 5)}`, eur(v.apre), C.testo], ['Adesso', eur(v.adesso), C.oro],
                ['Guadagno', conSegno(v.guadagno), v.guadagno >= 0 ? C.verde : C.rosso],
                ['Entrati e usciti', conSegno(v.spostato), C.celeste]].map(([l, x, col]) => (
                <div key={l} style={{ minWidth: 0 }}>
                  <Etichetta>{l}</Etichetta>
                  <div style={{ fontFamily: F.mono, fontVariantNumeric: 'tabular-nums', fontSize: S.titolo, fontWeight: 700, color: col, marginTop: 2 }}>{x}</div>
                </div>
              ))}
            </div>
            {conto !== 'cassa' && v.inGioco > 0 && (
              <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento, marginTop: SP.m }}>
                in gioco adesso <b style={{ fontFamily: F.mono, color: C.ambra }}>{eur(v.inGioco)}</b>
              </div>
            )}
            {/* ⚠️ La prova del nove: giorno 1 + eventi = adesso. Se no, qualcuno ha
                cambiato un dato vecchio (una giornata, un saldo iniziale). */}
            <div style={{ fontFamily: F.sans, fontSize: S.base, marginTop: SP.m, color: v.scarti.length ? C.rosso : C.verde }}>
              {v.scarti.length
                ? `⚠ saldo cambiato senza un evento: ${v.scarti.map(x => `${x.nome} ${conSegno(x.scarto)}`).join(' · ')}`
                : '✓ i conti tornano'}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.bordoRiga}`, maxHeight: 460, overflowY: 'auto' }}>
            {!v.righe.length && (
              <div style={{ padding: 20, textAlign: 'center', fontFamily: F.sans, fontSize: S.base, color: C.spento }}>Nessun movimento dal giorno 1.</div>
            )}
            {[...v.righe].reverse().map(r => <Riga key={r.rif} r={r} conNomi={chi === 'totale'} />)}
          </div>
        </div>
      )}
    </div>
  )
}
