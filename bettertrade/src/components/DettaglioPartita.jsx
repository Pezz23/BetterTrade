import { useState } from 'react'
import { C, F, alpha } from '../theme'
import { Etichetta } from './ui'
import { usaForma, striscia } from '../hooks/usaForma'
import { CATEGORIE, pct, giorno } from './RigaPartita'
import { quotaDoppia } from '../lib/attendibilita'
import { pronosticoDa } from '../lib/spin'

// La scheda di una partita: tutto quello che sappiamo, in blocchi.
// Pensata prima per il telefono — una colonna, numeri grandi, niente muri di
// testo — e usata anche come pannello sul desktop.
//
// Non calcola niente di suo: riceve la riga già valutata da lib/attendibilita
// e chiede la forma al database (hook usaForma). Se cambia il criterio,
// cambia lì.

const ESITO = { V: C.verde, N: C.giallo, P: C.rosso }

// I loghi dei club non li abbiamo (nel database le squadre sono solo nomi).
// Al loro posto le iniziali su un tondo: costa zero e non finge.
function Scudetto({ nome, colore, dim = 44 }) {
  const iniziali = nome.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
  return (
    <div style={{
      width: dim, height: dim, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: alpha(colore, 0.12), border: `1px solid ${alpha(colore, 0.35)}`,
      color: colore, fontFamily: F.mono, fontWeight: 700, fontSize: dim * 0.32,
    }}>{iniziali}</div>
  )
}

const Blocco = ({ titolo, extra, children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.bordo}`, borderRadius: 12, padding: '13px 14px', ...style }}>
    {titolo && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <Etichetta colore={C.grigio} style={{ fontSize: 11, letterSpacing: '0.12em', fontWeight: 600 }}>{titolo}</Etichetta>
        {extra && <Etichetta style={{ fontSize: 10 }}>{extra}</Etichetta>}
      </div>
    )}
    {children}
  </div>
)

const Chip = ({ testo, colore, titolo }) => (
  <span title={titolo} style={{
    width: 26, height: 26, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, fontFamily: F.mono,
    background: alpha(colore, 0.15), color: colore, border: `1px solid ${alpha(colore, 0.4)}`,
  }}>{testo}</span>
)

// Una barra: la quota parte di quanto vale, non da zero.
const Barra = ({ frazione, colore, altezza = 6 }) => (
  <div style={{ height: altezza, borderRadius: altezza, background: C.quasiNero, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(0, Math.min(1, frazione)) * 100}%`, height: '100%', background: colore, borderRadius: altezza }} />
  </div>
)

function Stella({ voti, mio, puoVotare, onVota }) {
  return (
    <button onClick={e => { e.stopPropagation(); if (puoVotare) onVota() }} disabled={!puoVotare}
      title={puoVotare ? (mio ? 'Togli il tuo voto' : 'Vota questa partita') : `${voti} voti`}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
        background: voti ? alpha(C.oro, 0.10) : 'transparent', border: `1px solid ${voti ? alpha(C.oro, 0.3) : C.bordo}`,
        cursor: puoVotare ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 16, lineHeight: 1, color: mio ? C.oro : voti ? alpha(C.oro, 0.55) : C.fioco }}>{voti ? '★' : '☆'}</span>
      <span style={{ fontSize: 11, fontFamily: F.mono, fontWeight: 700, color: voti ? C.oro : C.fioco }}>{voti}/3</span>
    </button>
  )
}

export default function DettaglioPartita({ p, cat, voti = 0, mio = false, puoVotare = false, onVota, onChiudi }) {
  const [dettagli, setDettagli] = useState(false)
  const { forma, errore } = usaForma(p.div, p.casa, p.trasferta)
  const c = CATEGORIE[cat]
  const squadre = [p.casa, p.trasferta]
  const q = n => n == null ? '—' : Number(n).toFixed(2).replace('.', ',')

  // La massima di mercato sulla stessa giocata: è il confronto che dice
  // qualcosa ("altrove pagano meglio"). Lo scarto contro la quota equa non lo
  // direbbe: essendo l'equa senza margine, sarebbe negativo su tutte.
  const massima = p.giocata === '1X' ? quotaDoppia(p.max_ap_1, p.max_ap_x)
                : p.giocata === 'X2' ? quotaDoppia(p.max_ap_x, p.max_ap_2)
                : p.segno === '1' ? p.max_ap_1 : p.max_ap_2
  const quotaMostrata = p.quotaGiocata ?? p.quota
  const vsMassima = quotaMostrata && massima ? quotaMostrata / massima - 1 : null
  const segnoPct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── 1. L'evento ─────────────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${alpha(c.colore, 0.3)}`, borderRadius: 12, padding: '13px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {onChiudi && (
              <button onClick={onChiudi} style={{ background: 'transparent', border: 'none', color: C.spento, fontSize: 18, cursor: 'pointer', padding: '0 4px 0 0', fontFamily: F.sans }}>‹</button>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: F.mono, padding: '3px 9px', borderRadius: 20, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{p.div}</span>
            {cat !== 'no' && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: F.mono, padding: '3px 9px', borderRadius: 20, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
          </div>
          <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={onVota} />
        </div>

        {/* attendibilità: l'unico numero davvero grande della scheda */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Etichetta style={{ fontSize: 10, letterSpacing: '0.12em', marginBottom: 6 }}>attendibilità</Etichetta>
            <Barra frazione={p.probGiocata} colore={c.colore} altezza={8} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: F.mono, color: c.colore, lineHeight: 0.9 }}>{pct(p.probGiocata)}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <Scudetto nome={p.casa} colore={p.segno === '1' ? c.colore : C.grigioFioco} />
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.sans, color: p.segno === '1' ? C.testo : C.spento, lineHeight: 1.2 }}>{p.casa}</div>
            <div style={{ fontSize: 10, color: C.fioco, fontFamily: F.mono, margin: '3px 0' }}>— vs —</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.sans, color: p.segno === '2' ? C.testo : C.spento, lineHeight: 1.2 }}>{p.trasferta}</div>
          </div>
          <Scudetto nome={p.trasferta} colore={p.segno === '2' ? c.colore : C.grigioFioco} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.bordoTenue}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: F.mono, color: C.testo }}>{giorno(p.data).toUpperCase()}</span>
          {p.ora && <span style={{ fontSize: 14, fontWeight: 600, fontFamily: F.mono, color: C.spento }}>{p.ora.slice(0, 5)}</span>}
        </div>
      </div>

      {/* ── 2. La giocata ───────────────────────────────────────────── */}
      <Blocco>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
            background: alpha(c.colore, 0.08), border: `1px solid ${alpha(c.colore, 0.35)}`, flex: '1 1 190px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: F.mono, color: c.colore, whiteSpace: 'nowrap' }}>{pronosticoDa(p.giocata)}</div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: F.mono, color: C.oro, lineHeight: 1 }}>{quotaMostrata ? q(quotaMostrata) : '—'}</div>
              <Etichetta style={{ fontSize: 9, marginTop: 3 }}>{p.quotaGiocata ? p.quotaFonte : 'la combinata si legge sul book'}</Etichetta>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flex: '1 1 200px' }}>
            {[['max', q(massima)], ['media', q(p.segno === '1' ? p.avg_ap_1 : p.avg_ap_2)], ['equo', q(p.equo)]].map(([l, v]) => (
              <div key={l} style={{ background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
                <Etichetta style={{ fontSize: 9, marginBottom: 3 }}>{l}</Etichetta>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.mono, color: C.testo }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {vsMassima !== null && (
          <div style={{ marginTop: 9, fontSize: 11, fontFamily: F.mono, color: C.spento }}>
            Rispetto alla massima di mercato: <b style={{ color: vsMassima >= 0 ? C.verde : C.ambra }}>{segnoPct(vsMassima)}</b>
            {vsMassima < -0.03 && <span> · altrove pagano meglio</span>}
          </div>
        )}
        {p.nota && <div style={{ marginTop: 6, fontSize: 11, fontFamily: F.sans, color: C.fioco, lineHeight: 1.5 }}>{p.nota}</div>}
      </Blocco>

      {errore && <Blocco><div style={{ color: C.rosso, fontSize: 12, fontFamily: F.sans }}>⚠️ {errore}</div></Blocco>}
      {!forma && !errore && <Blocco><div style={{ color: C.spento, fontSize: 12, fontFamily: F.mono }}>carico la forma…</div></Blocco>}

      {forma && <>
        {/* ── 3. La forma ───────────────────────────────────────────── */}
        <Blocco titolo="Forma" extra="ultime 5">
          {squadre.map(sq => {
            const s = striscia(forma.ultimi5[sq])
            return (
              <div key={sq} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: F.sans, color: C.testo, flex: '1 1 110px', minWidth: 0 }}>{sq}</span>
                {s.length === 0
                  ? <span style={{ fontSize: 11, color: C.fantasma, fontFamily: F.sans }}>nessuna partita giocata</span>
                  : <>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {s.map((m, i) => <Chip key={i} testo={m.esito} colore={ESITO[m.esito]} titolo={m.titolo} />)}
                    </span>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {s.map((m, i) => <Chip key={i} testo={m.over ? 'O' : 'U'} colore={m.over ? C.celeste : C.grigioFioco} titolo={`${m.titolo} · ${m.over ? 'over' : 'under'} 2,5`} />)}
                    </span>
                  </>}
              </div>
            )
          })}
          <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.bordoTenue}` }}>
            <Etichetta style={{ marginBottom: 7 }}>gol fatti / subiti · stagione</Etichetta>
            {squadre.map(sq => {
              const g = forma.gol[sq]
              return (
                <div key={sq} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: F.mono, fontSize: 13 }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 600, color: C.testo, flex: 1, minWidth: 0 }}>{sq}</span>
                  <b style={{ color: C.verde }}>{g.fatti}</b><span style={{ color: C.spento, fontSize: 11 }}>fatti</span>
                  <span style={{ color: C.fantasma }}>|</span>
                  <b style={{ color: C.rosso }}>{g.subiti}</b><span style={{ color: C.spento, fontSize: 11 }}>subiti</span>
                  <span style={{ color: C.fantasma, fontSize: 11 }}>({g.partite})</span>
                </div>
              )
            })}
          </div>
        </Blocco>

        {/* ── 4. La classifica ──────────────────────────────────────── */}
        <Blocco titolo="Classifica">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 }}>
            {squadre.map(sq => {
              const cl = forma.classifica?.[sq]
              if (!cl) return <div key={sq} style={{ fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>{sq}: —</div>
              const meglio = cl.posizione_forma < cl.posizione, peggio = cl.posizione_forma > cl.posizione
              return (
                <div key={sq} style={{ background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: F.sans, color: C.testo, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sq}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: F.mono, color: C.testo, lineHeight: 1 }}>{cl.posizione}°</span>
                    <span style={{ fontSize: 12, fontFamily: F.mono, color: C.spento }}>{cl.punti} pt</span>
                  </div>
                  <div style={{ marginTop: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Etichetta style={{ fontSize: 9 }}>forma</Etichetta>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: F.mono, color: meglio ? C.verde : peggio ? C.rosso : C.testo }}>{cl.posizione_forma}°</span>
                    </div>
                    {/* 15 punti = cinque vittorie: la barra dice quanto ha raccolto */}
                    <Barra frazione={cl.punti_forma / 15} colore={meglio ? C.verde : peggio ? C.rosso : C.oro} />
                    <div style={{ marginTop: 4, fontSize: 10, fontFamily: F.mono, color: C.fioco }}>{cl.punti_forma} pt nelle ultime 5 · su {cl.squadre} squadre</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Blocco>

        {/* ── 5. Gli scontri diretti ────────────────────────────────── */}
        <Blocco titolo="Scontri diretti" extra={forma.scontri.length ? `ultimi ${forma.scontri.length}` : null}>
          {forma.scontri.length === 0
            ? <div style={{ fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>nessun precedente in archivio (dal 2016)</div>
            : <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '0 2px 9px', borderBottom: `1px solid ${C.bordoTenue}`, fontFamily: F.mono, fontSize: 12 }}>
                {(() => {
                  const vinte = s => forma.scontri.filter(x => (x.casa === s && x.gol_casa > x.gol_trasferta) || (x.trasferta === s && x.gol_trasferta > x.gol_casa)).length
                  const pari = forma.scontri.filter(x => x.gol_casa === x.gol_trasferta).length
                  return [[p.casa, vinte(p.casa), C.verde], ['pareggi', pari, C.giallo], [p.trasferta, vinte(p.trasferta), C.rosso]].map(([l, n, col]) => (
                    <span key={l} style={{ color: C.spento, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l} <b style={{ color: n ? col : C.fioco, fontSize: 14 }}>{n}</b>
                    </span>
                  ))
                })()}
              </div>
              {forma.scontri.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', fontFamily: F.mono, fontSize: 12, borderBottom: i < forma.scontri.length - 1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
                  <span style={{ color: C.fioco, flexShrink: 0 }}>{String(s.data).slice(8, 10)}/{String(s.data).slice(5, 7)}/{String(s.data).slice(2, 4)}</span>
                  <span style={{ color: s.gol_casa > s.gol_trasferta ? C.testo : C.spento, flex: 1, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.casa}</span>
                  <b style={{ color: C.testo, flexShrink: 0 }}>{s.gol_casa}–{s.gol_trasferta}</b>
                  <span style={{ color: s.gol_trasferta > s.gol_casa ? C.testo : C.spento, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.trasferta}</span>
                  {s.div !== p.div && <span style={{ color: C.fantasma, flexShrink: 0 }}>[{s.div}]</span>}
                </div>
              ))}
            </>}
        </Blocco>
      </>}

      {/* ── 6. Il consenso ──────────────────────────────────────────── */}
      <Blocco titolo="Consenso di mercato" extra={`${p.quotaFonte || '—'}`}>
        {[['1', p.p.p1, p.casa], ['X', p.p.px, 'pareggio'], ['2', p.p.p2, p.trasferta]].map(([segno, prob, chi]) => (
          <div key={segno} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
            <span style={{ width: 16, fontSize: 13, fontWeight: 700, fontFamily: F.mono, color: segno === p.segno ? C.oro : C.spento }}>{segno}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: C.fioco, fontFamily: F.sans, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chi}</div>
              <Barra frazione={prob} colore={segno === p.segno ? C.verde : C.grigioCupo} />
            </div>
            <span style={{ width: 42, textAlign: 'right', fontSize: 13, fontWeight: 700, fontFamily: F.mono, color: segno === p.segno ? C.testo : C.spento }}>{pct(prob)}</span>
          </div>
        ))}
      </Blocco>

      {/* ── 7. I dettagli tecnici ───────────────────────────────────── */}
      <div>
        <button onClick={() => setDettagli(v => !v)} style={{ width: '100%', background: 'transparent', border: `1px solid ${C.bordoTenue}`, borderRadius: 10, padding: '9px 12px', color: C.spento, fontFamily: F.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {dettagli ? '⌃ chiudi i dettagli' : '⌄ dettagli completi'}
        </button>
        {dettagli && (
          <Blocco style={{ marginTop: 8 }}>
            {[
              [`${p.quotaFonte} 1X2`, [p.q1, p.qx, p.q2]],
              ['consenso di mercato (avg ap)', [p.avg_ap_1, p.avg_ap_x, p.avg_ap_2]],
              ['massima di mercato (max ap)', [p.max_ap_1, p.max_ap_x, p.max_ap_2]],
              ['Bet365 apertura', [p.b365_1, p.b365_x, p.b365_2]],
              ['Betfair exchange apertura', [p.bfe_ap_1, p.bfe_ap_x, p.bfe_ap_2]],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', fontFamily: F.mono, fontSize: 11, borderBottom: `1px solid ${C.bordoTenue}` }}>
                <span style={{ color: C.spento, minWidth: 0 }}>{l}</span>
                <span style={{ color: v[0] ? C.testo : C.fantasma, flexShrink: 0 }}>{v.map(x => q(x)).join(' / ')}</span>
              </div>
            ))}
            {p.b365_over25 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: 11, borderBottom: `1px solid ${C.bordoTenue}` }}>
                <span style={{ color: C.spento }}>over / under 2,5 (Bet365)</span>
                <span style={{ color: C.testo }}>{q(p.b365_over25)} / {q(p.b365_under25)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: 11, borderBottom: `1px solid ${C.bordoTenue}` }}>
              <span style={{ color: C.spento }}>margine del book sulla giocata</span>
              {/* Negativo su tutte le partite: è la ricarica del bookmaker, non un difetto della giocata. */}
              <span style={{ color: C.grigio }}>{p.scarto !== null ? segnoPct(p.scarto) : '—'} vs equo {q(p.equo)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: 11 }}>
              <span style={{ color: C.spento }}>fonte · scaricato</span>
              <span style={{ color: C.grigio }}>{p.fonte || '—'} · {new Date(p.scaricato_il).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {forma && <div style={{ marginTop: 6, fontSize: 10, fontFamily: F.mono, color: C.fantasma }}>forma e classifica: stagione {`20${forma.stagione.slice(0, 2)}/${forma.stagione.slice(2)}`}</div>}
          </Blocco>
        )}
      </div>
    </div>
  )
}
