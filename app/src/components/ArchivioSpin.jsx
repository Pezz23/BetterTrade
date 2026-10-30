import { useState } from 'react'
import { C, F, S, SP, R, alpha } from '../theme'
import { stileCard } from './ui'

// L'ARCHIVIO DELLE SPIN, la terza scheda della Slot (30/10/2026).
//
// Mattia: *"un archivio dei risultati senza intaccare i soldi"*. In cima il
// totale — quante spin, quante schedine uscite, la resa in unità — e sotto una
// card per spin, che si apre toccandola: le caselle col risultato e le
// schedine. ⚠️ **La resa è in unità, non in euro**: una spin vale 1 (vedi
// `resaInUnita` in lib/spin.js). Dice se il metodo rende, non quanto ha fatto
// il gruppo: quello resta in Dashboard e in Reporting.
// ⚠️ «Giocate» = spuntate GIOCATA nella Slot quando si è archiviato.

const NOMI = ['Spin 1', 'Spin 2', 'Spin 3', 'Fun']
const percento = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1).replace('.', ',')}%`
const giorno = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '')

export default function ArchivioSpin({ righe, errore }) {
  const [soloGiocate, setSoloGiocate] = useState(false)
  const [aperta, setAperta] = useState(null)
  if (errore) return <div style={{ color: C.rosso, fontFamily: F.sans, fontSize: S.corpo }}>{errore}</div>
  if (!righe) return <div style={{ color: C.spento, fontFamily: F.sans, fontSize: S.corpo }}>carico l'archivio…</div>

  const visibili = soloGiocate ? righe.filter(r => r.giocata) : righe
  const chiuse = visibili.filter(r => r.resa != null)
  const uscite = visibili.reduce((n, r) => n + (r.schedine || []).filter(s => s.stato === 'win').length, 0)
  const schedineTot = visibili.reduce((n, r) => n + (r.schedine || []).length, 0)
  const resa = chiuse.length ? chiuse.reduce((a, r) => a + Number(r.incasso), 0) / chiuse.length - 1 : null

  return (
    <div>
      <div style={stileCard({ padding: `${SP.m}px ${SP.l}px`, marginBottom: SP.m })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.m, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: F.sans, fontSize: S.micro, color: C.spento, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Archivio spin</span>
          <div style={{ marginLeft: 'auto', display: 'flex', border: `1px solid ${C.bordo}`, borderRadius: R.m, overflow: 'hidden' }}>
            {[[false, 'Tutte'], [true, 'Giocate']].map(([v, et]) => (
              <button key={et} onClick={() => setSoloGiocate(v)} style={{ padding: '4px 10px', border: 'none', cursor: 'pointer',
                fontFamily: F.sans, fontSize: S.minuta, background: soloGiocate === v ? alpha(C.oro, 0.16) : 'transparent',
                color: soloGiocate === v ? C.oro : C.spento }}>{et}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: SP.s, marginTop: SP.m, textAlign: 'center' }}>
          {[['spin', `${visibili.length}`, C.testo],
            ['schedine uscite', `${uscite}/${schedineTot}`, C.testo],
            ['resa', resa == null ? '—' : percento(resa), resa == null ? C.spento : resa >= 0 ? C.verde : C.rosso]].map(([l, v, col]) => (
            <div key={l}>
              <div style={{ fontFamily: F.mono, fontVariantNumeric: 'tabular-nums', fontSize: S.grande, fontWeight: 700, color: col }}>{v}</div>
              <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.fioco }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: SP.s, fontFamily: F.sans, fontSize: S.micro, color: C.fioco, textAlign: 'center' }}>
          in unità: una spin vale 1 · {chiuse.length} con tutti gli esiti{visibili.length > chiuse.length ? `, ${visibili.length - chiuse.length} ancora aperte o senza quota` : ''}
        </div>
      </div>

      {!visibili.length && (
        <div style={{ fontFamily: F.sans, fontSize: S.corpo, color: C.spento, padding: SP.m, lineHeight: 1.5 }}>
          Ancora niente in archivio. Una spin ci entra con «↺ Nuova spin», prima che la griglia si svuoti,
          o col tasto «salva in archivio» sotto la griglia.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.s }}>
        {visibili.map(r => {
          const apri = aperta === r.id
          const col = r.resa == null ? C.spento : r.resa >= 0 ? C.verde : C.rosso
          const vinte = (r.schedine || []).filter(s => s.stato === 'win')
          return (
            <div key={r.id} style={stileCard({ padding: `${SP.m}px ${SP.l}px` }, r.resa == null ? null : col)}>
              <button onClick={() => setAperta(apri ? null : r.id)} style={{ display: 'flex', alignItems: 'baseline', gap: SP.m, width: '100%',
                padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: C.testo }}>
                <span style={{ fontFamily: F.mono, fontSize: S.base, color: C.spento }}>{apri ? '▾' : '▸'}</span>
                <span style={{ fontFamily: F.sans, fontSize: S.media, fontWeight: 700 }}>{NOMI[r.spin_idx]}</span>
                <span style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>
                  {r.dal ? (r.dal === r.al ? giorno(r.dal) : `${giorno(r.dal)}-${giorno(r.al)}`) : giorno(String(r.archiviata_il).slice(0, 10))}
                  {' · '}{r.giocata ? <b style={{ color: C.oro }}>giocata</b> : 'non giocata'}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontVariantNumeric: 'tabular-nums', fontSize: S.media, fontWeight: 700, color: col }}>
                  {r.resa == null ? 'aperta' : percento(Number(r.resa))}
                </span>
              </button>
              {vinte.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: SP.s }}>
                  {vinte.map(s => (
                    <span key={s.id} style={{ fontFamily: F.sans, fontSize: S.micro, padding: '2px 8px', borderRadius: R.pastiglia,
                      background: alpha(C.verde, 0.12), color: C.verde, border: `1px solid ${alpha(C.verde, 0.3)}` }}>✓ {s.nome}</span>
                  ))}
                </div>
              )}
              {apri && (
                <div style={{ marginTop: SP.m, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {(r.caselle || []).filter(t => t.casa || t.ospite).map(t => (
                    <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '18px 56px minmax(0,1fr) auto 18px', gap: SP.s, alignItems: 'baseline',
                      fontFamily: F.sans, fontSize: S.base, color: C.testo }}>
                      <span style={{ fontFamily: F.mono, color: C.fioco }}>{t.id}</span>
                      <span style={{ fontFamily: F.mono, color: C.oro }}>{t.pronostico || '—'}</span>
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{t.casa} – {t.ospite}
                        {t.quota ? <span style={{ color: C.fioco, fontFamily: F.mono }}> @{t.quota}</span> : null}</span>
                      <span style={{ fontFamily: F.mono, color: C.spento }}>{t.gol || ''}</span>
                      <span style={{ color: t.result === 'win' ? C.verde : t.result === 'loss' ? C.rosso : C.fioco }}>
                        {t.result === 'win' ? '✓' : t.result === 'loss' ? '✗' : '·'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
