import { useState } from 'react'
import { C, F, alpha } from '../theme'
import { Etichetta } from './ui'
import { usaForma } from '../hooks/usaForma'
import { striscia } from '../lib/forma'
import TestataPartita, { CATEGORIE, Scudetto, Stella, Barra, pct, giorno } from './TestataPartita'
import { pronosticoDa } from '../lib/spin'
import { sigla } from '../lib/campionati'

// La scheda di una partita: tutto quello che sappiamo, in blocchi.
// Pensata prima per il telefono — una colonna, numeri grandi, niente muri di
// testo — e usata anche come pannello sul desktop.
//
// Non calcola niente di suo: riceve la riga già valutata da lib/attendibilita
// e chiede la forma al database (hook usaForma). Se cambia il criterio,
// cambia lì.

const ESITO = { V: C.verde, N: C.giallo, P: C.rosso }

const Blocco = ({ titolo, extra, children, style, sottolinea }) => (
  <div style={{ background: C.card, border: `1px solid ${C.bordo}`, borderRadius: 12, padding: '13px 14px', ...style }}>
    {titolo && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10,
        ...(sottolinea ? { paddingBottom: 9, borderBottom: `1px solid ${C.bordoChiaro}` } : {}) }}>
        <Etichetta colore={C.testo} style={{ fontSize: 13, letterSpacing: '0.12em', fontWeight: 700 }}>{titolo}</Etichetta>
        {extra && <Etichetta colore={C.testo} style={{ fontSize: 12, fontWeight: 600 }}>{extra}</Etichetta>}
      </div>
    )}
    {children}
  </div>
)

// Cliccabile: il risultato stava solo nel `title`, cioè si vedeva col mouse
// sopra e su telefono mai.
const Chip = ({ testo, colore, titolo, onClick, scelto }) => (
  <button type="button" onClick={onClick} title={titolo} style={{
    // elastiche: due strisce da cinque devono stare su una riga sola anche su
    // uno schermo da 320px, dove 25px fisse andavano a capo
    width: 'clamp(21px, 6.2vw, 25px)', height: 'clamp(21px, 6.2vw, 25px)',
    borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, fontFamily: F.mono, padding: 0, cursor: 'pointer', flexShrink: 0,
    background: alpha(colore, scelto ? 0.35 : 0.15), color: colore,
    border: `1px solid ${alpha(colore, scelto ? 0.9 : 0.4)}`,
    boxShadow: scelto ? `0 0 0 2px ${alpha(colore, 0.25)}` : 'none',
  }}>{testo}</button>
)

export default function DettaglioPartita({ p, cat, voti = 0, mio = false, puoVotare = false, onVota, onChiudi }) {
  const [dettagli, setDettagli] = useState(false)
  const [scelta, setScelta] = useState(null)   // "<squadra>|<indice>" della casella toccata
  const { forma, errore } = usaForma(p.div, p.casa, p.trasferta)
  const c = CATEGORIE[cat]
  const squadre = [p.casa, p.trasferta]
  const q = n => n == null ? '—' : Number(n).toFixed(2).replace('.', ',')

  // La massima di mercato sulla stessa giocata: è il confronto che dice
  // qualcosa ("altrove pagano meglio"). Lo scarto contro la quota equa non lo
  // direbbe: essendo l'equa senza margine, sarebbe negativo su tutte.
  const massima = p.segno === '1' ? p.max_ap_1 : p.max_ap_2
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
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: F.mono, padding: '3px 9px', borderRadius: 20, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{sigla(p.div)}</span>
            {cat !== 'no' && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: F.mono, padding: '3px 9px', borderRadius: 20, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
          </div>
          <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={onVota} />
        </div>

        <div style={{ marginTop: 14 }}><TestataPartita p={p} cat={cat} /></div>

        {/* ── La giocata, nello stesso riquadro dell'evento ──────────── */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `2px solid ${alpha(c.colore, 0.35)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
            background: alpha(c.colore, 0.08), border: `1px solid ${alpha(c.colore, 0.35)}`, flex: '1 1 190px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: F.mono, color: c.colore, whiteSpace: 'nowrap' }}>{pronosticoDa(p.giocata)}</div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: F.mono, color: C.oro, lineHeight: 1 }}>{quotaMostrata ? q(quotaMostrata) : '—'}</div>
              <Etichetta style={{ fontSize: 9, marginTop: 3 }}>{p.quotaGiocata ? p.quotaFonte : 'la combinata si legge sul book'}</Etichetta>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flex: '1 1 250px' }}>
            {[['max', q(massima)], ['media', q(p.segno === '1' ? p.avg_ap_1 : p.avg_ap_2)], ['equo', q(p.equo)]].map(([l, v]) => (
              <div key={l} style={{ background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
                <Etichetta style={{ fontSize: 9, marginBottom: 3 }}>{l}</Etichetta>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.mono, color: C.testo }}>{v}</div>
              </div>
            ))}
            {/* Il Grado: 70% la resa, 30% quanto paga la quota. La resa in
                percentuale sta nei dettagli completi — qui serve il numero da
                confrontare a colpo d'occhio, non la misura esatta. */}
            <div style={{ background: C.pozzo, border: `1px solid ${alpha(C.oro, 0.35)}`, borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
              <Etichetta style={{ fontSize: 9, marginBottom: 3 }}>grado</Etichetta>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: F.mono, color: p.grado == null ? C.fantasma : C.oro }}>
                {p.grado == null ? '—' : p.grado.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        </div>
        {vsMassima !== null && (
          <div style={{ marginTop: 9, fontSize: 11, fontFamily: F.mono, color: C.spento }}>
            Rispetto alla massima di mercato: <b style={{ color: vsMassima >= 0 ? C.verde : C.ambra }}>{segnoPct(vsMassima)}</b>
            {vsMassima < -0.03 && <span> · altrove pagano meglio</span>}
          </div>
        )}
        {p.nota && <div style={{ marginTop: 6, fontSize: 11, fontFamily: F.sans, color: C.fioco, lineHeight: 1.5 }}>{p.nota}</div>}
        </div>
      </div>

      {errore && <Blocco><div style={{ color: C.rosso, fontSize: 12, fontFamily: F.sans }}>⚠️ {errore}</div></Blocco>}
      {!forma && !errore && <Blocco><div style={{ color: C.spento, fontSize: 12, fontFamily: F.mono }}>carico la forma…</div></Blocco>}

      {forma && <>
        {/* ── 3. La forma ───────────────────────────────────────────── */}
        <Blocco titolo="📈 Forma" extra="ultime 5" sottolinea>
          {squadre.map(sq => {
            const s = striscia(forma.ultimi5[sq], sq)
            const apri = i => setScelta(v => v === `${sq}|${i}` ? null : `${sq}|${i}`)
            const iScelto = scelta?.startsWith(`${sq}|`) ? Number(scelta.split('|')[1]) : null
            const m = iScelto != null ? s[iScelto] : null
            return (
              <div key={sq}>
                {/* Il nome sopra, le due strisce sotto su una riga sola: sul
                    telefono il nome e dieci caselle non ci stanno insieme, e
                    l'over/under andava a capo. */}
                <div style={{ padding: '6px 0 0' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', fontFamily: F.sans, color: C.testo, marginBottom: 6, overflowWrap: 'anywhere' }}>{sq}</div>
                  {s.length === 0
                    ? <span style={{ fontSize: 11, color: C.fantasma, fontFamily: F.sans }}>nessuna partita giocata</span>
                    : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-flex', gap: 3 }}>
                          {s.map((x, i) => <Chip key={i} testo={x.esito} colore={ESITO[x.esito]} titolo={x.titolo} onClick={() => apri(i)} scelto={iScelto === i} />)}
                        </span>
                        <span style={{ width: 1, alignSelf: 'stretch', minHeight: 25, background: C.bordoChiaro, flexShrink: 0 }} />
                        <span style={{ display: 'inline-flex', gap: 3 }}>
                          {s.map((x, i) => <Chip key={i} testo={x.over ? 'O' : 'U'} colore={x.over ? C.celeste : C.grigioFioco} titolo={`${x.titolo} · ${x.over ? 'over' : 'under'} 2,5`} onClick={() => apri(i)} scelto={iScelto === i} />)}
                        </span>
                      </div>}
                </div>

                {/* La partita dietro la casella toccata: serve a capire se
                    quelle V e quelle P valgono qualcosa o venivano da incontri
                    senza peso. */}
                {m && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    margin: '2px 0 8px', padding: '8px 10px', borderRadius: 8,
                    background: alpha(ESITO[m.esito], 0.08), border: `1px solid ${alpha(ESITO[m.esito], 0.3)}`,
                    fontFamily: F.mono, fontSize: 12,
                  }}>
                    {/* Nell'ordine vero della partita — "Cagliari 0–1 Inter",
                        non "fuori vs Cagliari 1–0": è come la si ricorda. */}
                    <span style={{ color: C.spento }}>{m.giorno}</span>
                    <span style={{ color: m.inCasa ? C.testo : C.spento, fontFamily: F.sans, fontWeight: m.inCasa ? 700 : 500 }}>{m.casa}</span>
                    <b style={{ color: ESITO[m.esito], fontSize: 15 }}>{m.gol_casa}–{m.gol_trasferta}</b>
                    <span style={{ color: m.inCasa ? C.spento : C.testo, fontFamily: F.sans, fontWeight: m.inCasa ? 500 : 700 }}>{m.trasferta}</span>
                    <span style={{ marginLeft: 'auto', color: m.over ? C.celeste : C.grigioFioco, fontSize: 11 }}>
                      {m.over ? 'over' : 'under'} 2,5
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.bordoChiaro}` }}>
            <Etichetta colore={C.testo} style={{ fontSize: 13, letterSpacing: '0.12em', fontWeight: 700, paddingBottom: 9, marginBottom: 9, borderBottom: `1px solid ${C.bordoChiaro}` }}>⚽ gol fatti / subiti · stagione</Etichetta>
            {squadre.map(sq => {
              const g = forma.gol[sq]
              return (
                <div key={sq} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontFamily: F.mono, fontSize: 13 }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: C.testo, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sq}</span>
                  <b style={{ color: C.verde, fontSize: 18 }}>{g.fatti}</b><span style={{ color: C.spento, fontSize: 12 }}>fatti</span>
                  <span style={{ color: C.fantasma }}>|</span>
                  <b style={{ color: C.rosso, fontSize: 18 }}>{g.subiti}</b><span style={{ color: C.spento, fontSize: 12 }}>subiti</span>
                  <span style={{ color: C.fantasma, fontSize: 12 }}>({g.partite})</span>
                </div>
              )
            })}
          </div>
        </Blocco>

        {/* ── 4. La classifica ──────────────────────────────────────── */}
        <Blocco titolo="🏆 Classifica" extra={`su ${forma.classifica?.[p.casa]?.squadre ?? '—'} squadre`} sottolinea>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {squadre.map(sq => {
              const cl = forma.classifica?.[sq]
              if (!cl) return <div key={sq} style={{ fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>{sq}: —</div>
              const meglio = cl.posizione_forma < cl.posizione, peggio = cl.posizione_forma > cl.posizione
              const conti = (v, n, pe) => (
                <div style={{ display: 'flex', gap: 5, fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: C.verde }}>{v}V</span>
                  <span style={{ color: C.fantasma }}>·</span>
                  <span style={{ color: C.giallo }}>{n}N</span>
                  <span style={{ color: C.fantasma }}>·</span>
                  <span style={{ color: C.rosso }}>{pe}P</span>
                </div>
              )
              return (
                <div key={sq} style={{ background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 10, padding: '11px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', fontFamily: F.sans, color: C.testo, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sq}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                    <span style={{ fontSize: 30, fontWeight: 700, fontFamily: F.mono, color: C.testo, lineHeight: 1 }}>{cl.posizione}°</span>
                    <span style={{ fontSize: 13, fontFamily: F.mono, color: C.oro, fontWeight: 700 }}>{cl.punti} pt</span>
                  </div>
                  <div style={{ marginTop: 7 }}>{conti(cl.vinte, cl.pari, cl.perse)}</div>
                  <div style={{ fontSize: 10, fontFamily: F.mono, color: C.fioco, marginTop: 3 }}>in {cl.giocate} partite</div>

                  {/* La classifica delle ultime 5: dice se sta salendo o scendendo. */}
                  <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.bordoChiaro}` }}>
                    <Etichetta style={{ fontSize: 9, marginBottom: 5 }}>forma · ultime {cl.giocate_forma}</Etichetta>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, fontFamily: F.mono, lineHeight: 1, color: meglio ? C.verde : peggio ? C.rosso : C.testo }}>{cl.posizione_forma}°</span>
                      <span style={{ fontSize: 12, fontFamily: F.mono, color: C.spento }}>{cl.punti_forma} pt</span>
                      {meglio && <span style={{ fontSize: 12, color: C.verde }}>▲{cl.posizione - cl.posizione_forma}</span>}
                      {peggio && <span style={{ fontSize: 12, color: C.rosso }}>▼{cl.posizione_forma - cl.posizione}</span>}
                    </div>
                    <div style={{ marginTop: 6 }}>{conti(cl.vinte_forma, cl.pari_forma, cl.perse_forma)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Blocco>

        {/* ── 5. Gli scontri diretti ────────────────────────────────── */}
        <Blocco titolo="⚔️ Scontri diretti" extra={forma.scontri.length ? `ultimi ${forma.scontri.length}` : null} sottolinea>
          {forma.scontri.length === 0
            ? <div style={{ fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>nessun precedente in archivio (dal 2016)</div>
            : (() => {
              // Chi ha vinto, dal punto di vista delle due squadre di domani.
              const esitoPer = (s, squadra) =>
                s.gol_casa === s.gol_trasferta ? 'N'
                  : (s.casa === squadra) === (s.gol_casa > s.gol_trasferta) ? 'V' : 'P'
              const conta = sq => forma.scontri.filter(s => esitoPer(s, sq) === 'V').length
              const pari = forma.scontri.filter(s => s.gol_casa === s.gol_trasferta).length
              const vCasa = conta(p.casa), vTrasferta = conta(p.trasferta)
              const tot = forma.scontri.length

              return <>
                {/* La sintesi è una barra, non tre nomi accorciati: i nomi
                    lunghi venivano tagliati e il confronto spariva. */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', background: C.quasiNero }}>
                    {[[vCasa, C.verde], [pari, C.giallo], [vTrasferta, C.rosso]].map(([n, col], i) =>
                      n > 0 && <div key={i} style={{ width: `${100 * n / tot}%`, background: col }} />)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: F.mono, fontSize: 12 }}>
                    <span style={{ color: C.verde, fontWeight: 700 }}>{vCasa} <span style={{ color: C.spento, fontWeight: 400, fontSize: 11 }}>{p.casa}</span></span>
                    <span style={{ color: pari ? C.giallo : C.fioco }}>{pari} <span style={{ color: C.spento, fontSize: 11 }}>pari</span></span>
                    <span style={{ color: C.rosso, fontWeight: 700 }}><span style={{ color: C.spento, fontWeight: 400, fontSize: 11 }}>{p.trasferta}</span> {vTrasferta}</span>
                  </div>
                </div>

                {forma.scontri.map((s, i) => {
                  const e = esitoPer(s, p.casa)   // sempre dal lato della squadra di casa di domani
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 2px', fontFamily: F.mono, fontSize: 12, borderBottom: i < forma.scontri.length - 1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
                      {/* Chi ha vinto fra le due di domani, senza doverlo dedurre dal punteggio */}
                      <span style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, fontSize: 10, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: alpha(ESITO[e], 0.15), color: ESITO[e], border: `1px solid ${alpha(ESITO[e], 0.4)}`,
                      }}>{e}</span>
                      <span style={{ color: C.fioco, flexShrink: 0 }}>{String(s.data).slice(8, 10)}/{String(s.data).slice(5, 7)}/{String(s.data).slice(2, 4)}</span>
                      <span style={{ color: s.gol_casa > s.gol_trasferta ? C.testo : C.spento, flex: 1, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.casa}</span>
                      <b style={{ color: C.testo, flexShrink: 0 }}>{s.gol_casa}–{s.gol_trasferta}</b>
                      <span style={{ color: s.gol_trasferta > s.gol_casa ? C.testo : C.spento, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.trasferta}</span>
                      {s.div !== p.div && <span style={{ color: C.fantasma, flexShrink: 0, fontSize: 10 }}>{sigla(s.div)}</span>}
                    </div>
                  )
                })}
              </>
            })()}
        </Blocco>
      </>}

      {/* ── 6. Il consenso ──────────────────────────────────────────── */}
      <Blocco titolo="📊 Consenso di mercato" extra={p.quotaFonte ? `quote ${p.quotaFonte}` : null} sottolinea>
        {[['1', p.p.p1, p.casa, p.q1], ['X', p.p.px, 'pareggio', p.qx], ['2', p.p.p2, p.trasferta, p.q2]].map(([segno, prob, chi, quota]) => {
          const suo = segno === p.segno
          return (
            <div key={segno} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ width: 16, fontSize: 14, fontWeight: 700, fontFamily: F.mono, color: suo ? C.oro : C.spento }}>{segno}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                  <span style={{ fontSize: 11, color: suo ? C.testo : C.fioco, fontFamily: F.sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chi}</span>
                  {/* La quota accanto alla probabilità: "il mercato dice 75%" e
                      "te la pagano 1,30" sono due metà della stessa frase. */}
                  <span style={{ fontSize: 11, fontFamily: F.mono, color: quota ? (suo ? C.oro : C.spento) : C.fantasma, flexShrink: 0 }}>
                    {quota ? `@${Number(quota).toFixed(2).replace('.', ',')}` : '—'}
                  </span>
                </div>
                <Barra frazione={prob} colore={suo ? C.verde : C.grigioCupo} />
              </div>
              <span style={{ width: 42, textAlign: 'right', fontSize: 14, fontWeight: 700, fontFamily: F.mono, color: suo ? C.testo : C.spento }}>{pct(prob)}</span>
            </div>
          )
        })}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bordoTenue}`, fontSize: 10, color: C.fantasma, fontFamily: F.sans, lineHeight: 1.5 }}>
          Le percentuali vengono dalla media di ~40 bookmaker, tolto il margine. La X non si gioca mai.
        </div>
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
              <span style={{ color: C.spento }}>resa · quota × probabilità</span>
              <span style={{ color: p.resa == null ? C.fantasma : C.grigio }}>{p.resa == null ? '—' : `${(p.resa * 100).toFixed(1)}%`}</span>
            </div>
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
