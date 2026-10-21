import { useState, useMemo } from 'react'
import { C, F, alpha, S } from '../theme'
import { Etichetta } from './ui'
import { usaForma } from '../hooks/usaForma'
import { striscia } from '../lib/forma'
import TestataPartita, { CATEGORIE, Stella, Barra, pct } from './TestataPartita'
import { sigla } from '../lib/campionati'
import { tocco } from '../lib/schermo'
import BarraPartita from './BarraPartita'
import { usaVpm } from '../hooks/usaVpm'
import { valutaPartita, vociPesate, verso, PESI, ETICHETTE, NOMI_STRATI, PESI_STRATI, VPM_NETTO } from '../lib/vpm'
import { golAttesi, SOGLIE_OVER, consiglioGg, FIDUCIA_GG, fasciaGol, tagliGol, intervalloGol } from '../lib/gol'

// La scheda di una partita: tutto quello che sappiamo, in blocchi.
// Pensata prima per il telefono — una colonna, numeri grandi, niente muri di
// testo — e usata anche come pannello sul desktop.
//
// Non calcola niente di suo: riceve la riga già valutata da lib/attendibilita
// e chiede la forma al database (hook usaForma). Se cambia il criterio,
// cambia lì.

const ESITO = { V: C.verde, N: C.giallo, P: C.rosso }
const COLORE_VPM = { contro: C.rosso, conferma: C.verde, incerto: C.fioco }
const PAROLA_VPM = {
  conferma: 'conferma la giocata',
  contro: 'dice il contrario della giocata',
  incerto: 'non si pronuncia: squadre troppo simili',
}

// Una riga del confronto fra le due squadre: etichetta a sinistra, i due numeri
// uno per squadra, e in grassetto quello più alto — l'occhio deve trovare da
// solo chi vince quel parametro, senza leggere le cifre.
const Confronto = ({ etichetta, nota, a, b, forte = false }) => {
  const ma = a != null && b != null && a > b
  const mb = a != null && b != null && b > a
  const n = x => (x == null ? '—' : x.toFixed(2).replace('.', ','))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px', alignItems: 'baseline', gap: 6, padding: '5px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: forte ? 12 : 11, fontWeight: forte ? 700 : 500, fontFamily: F.sans, color: forte ? C.testo : C.fioco }}>{etichetta}</div>
        {nota && <div style={{ fontSize: S.micro, fontFamily: F.mono, color: C.fantasma }}>{nota}</div>}
      </div>
      {[[a, ma], [b, mb]].map(([v, max], i) => (
        <div key={i} style={{
          textAlign: 'right', fontFamily: F.mono, fontSize: forte ? 15 : 13,
          fontWeight: max || forte ? 700 : 400,
          color: v == null ? C.fantasma : max ? C.testo : C.spento,
        }}>{n(v)}</div>
      ))}
    </div>
  )
}

const Blocco = ({ titolo, extra, children, style, sottolinea }) => (
  <div style={{ background: C.card, border: `1px solid ${C.bordo}`, borderRadius: 12, padding: '13px 14px', ...style }}>
    {titolo && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10,
        ...(sottolinea ? { paddingBottom: 9, borderBottom: `1px solid ${C.bordoChiaro}` } : {}) }}>
        <Etichetta colore={C.testo} style={{ fontSize: S.corpo, letterSpacing: '0.12em', fontWeight: 700 }}>{titolo}</Etichetta>
        {extra && <Etichetta colore={C.testo} style={{ fontSize: S.base, fontWeight: 600 }}>{extra}</Etichetta>}
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
    fontSize: S.base, fontWeight: 700, fontFamily: F.mono, padding: 0, cursor: 'pointer', flexShrink: 0,
    background: alpha(colore, scelto ? 0.35 : 0.15), color: colore,
    border: `1px solid ${alpha(colore, scelto ? 0.9 : 0.4)}`,
    boxShadow: scelto ? `0 0 0 2px ${alpha(colore, 0.25)}` : 'none',
  }}>{testo}</button>
)

export default function DettaglioPartita({ p, cat, voti = 0, mio = false, puoVotare = false, onVota, onChiudi }) {
  const [dettagli, setDettagli] = useState(false)
  const [scelta, setScelta] = useState(null)   // "<squadra>|<indice>" della casella toccata
  const { forma, errore } = usaForma(p.div, p.casa, p.trasferta)
  // ⚠️ La scheda si calcola VPM da sé, dallo stesso hook di sessione che usa la
  // lista: stessa funzione e stessi dati, quindi non possono dire numeri
  // diversi. Passarlo come proprietà avrebbe voluto dire toccare due pagine.
  const datiVpm = usaVpm()
  // ⚠️ Dentro un `useMemo`, non nel corpo: la scheda si ridisegna quando arriva
  // la forma, quando si apre un dettaglio, a ogni tocco su una casella — e
  // questi due sono i calcoli più grossi dell'app (quattro finestre per squadra
  // più il Poisson). Dipendono solo dalla partita e dai dati, che non cambiano
  // mentre la scheda è aperta.
  const v = useMemo(() => datiVpm ? valutaPartita(datiVpm, p) : null, [datiVpm, p])
  const vs = verso(v)
  // I gol attesi: stesso hook, stesse finestre di VPM. Sta nella scheda e non
  // in barra (scelta di Mattia): è un dato da leggere, non da scorrere.
  const g = useMemo(() => datiVpm ? golAttesi(datiVpm.squadre?.[p.div], p.casa, p.trasferta) : null,
    [datiVpm, p.div, p.casa, p.trasferta])
  const c = CATEGORIE[cat]
  const squadre = [p.casa, p.trasferta]
  const q = n => n == null ? '—' : Number(n).toFixed(2).replace('.', ',')

  // ⚠️ Il confronto con la massima di mercato è uscito dalla testata il
  // 10/10/2026 con le altre informazioni di prezzo. `segnoPct` serve ancora ai
  // dettagli completi in fondo.
  const segnoPct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── 1. L'evento ─────────────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${alpha(c.colore, 0.3)}`, borderRadius: 12, padding: '13px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {onChiudi && (
              <button onClick={onChiudi} style={{ background: 'transparent', border: 'none', color: C.spento, fontSize: S.titolo, cursor: 'pointer', padding: '0 4px 0 0', fontFamily: F.sans }}>‹</button>
            )}
            <span style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, padding: '3px 9px', borderRadius: 20, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{sigla(p.div)}</span>
            {cat !== 'no' && <span style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, padding: '3px 9px', borderRadius: 20, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
          </div>
          <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={onVota} />
        </div>

        <div style={{ marginTop: 14 }}><TestataPartita p={p} cat={cat} gol={g} /></div>

        {/* ── I numeri, gli stessi della lista ──────────────────────────
            ⚠️ Qui c'erano la quota grande, le tre quote di mercato
            (max · media · equo), il Grado e il confronto con la massima.
            Togliere il 10/10/2026: erano informazioni di prezzo da consultare,
            e la scheda deve mostrare **gli stessi cinque numeri della lista**,
            dallo stesso componente, così non possono divergere. Le quote per
            intero restano nei dettagli completi in fondo. */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `2px solid ${alpha(c.colore, 0.35)}` }}>
          <BarraPartita p={p} vpm={v} colore={c.colore} />
          {/* La nota resta: spiega la giocata, non il prezzo. */}
          {p.nota && <div style={{ marginTop: 9, fontSize: S.minuta, fontFamily: F.sans, color: C.fioco, lineHeight: 1.5 }}>{p.nota}</div>}
        </div>
      </div>

      {errore && <Blocco><div style={{ color: C.rosso, fontSize: S.base, fontFamily: F.sans }}>⚠️ {errore}</div></Blocco>}
      {!forma && !errore && <Blocco><div style={{ color: C.spento, fontSize: S.base, fontFamily: F.mono }}>carico la forma…</div></Blocco>}

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
                  <div style={{ fontSize: S.media, fontWeight: 700, textTransform: 'uppercase', fontFamily: F.sans, color: C.testo, marginBottom: 6, overflowWrap: 'anywhere' }}>{sq}</div>
                  {s.length === 0
                    ? <span style={{ fontSize: S.minuta, color: C.fantasma, fontFamily: F.sans }}>nessuna partita giocata</span>
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
                    fontFamily: F.mono, fontSize: S.base,
                  }}>
                    {/* Nell'ordine vero della partita — "Cagliari 0–1 Inter",
                        non "fuori vs Cagliari 1–0": è come la si ricorda. */}
                    <span style={{ color: C.spento }}>{m.giorno}</span>
                    <span style={{ color: m.inCasa ? C.testo : C.spento, fontFamily: F.sans, fontWeight: m.inCasa ? 700 : 500 }}>{m.casa}</span>
                    <b style={{ color: ESITO[m.esito], fontSize: S.media }}>{m.gol_casa}–{m.gol_trasferta}</b>
                    <span style={{ color: m.inCasa ? C.spento : C.testo, fontFamily: F.sans, fontWeight: m.inCasa ? 500 : 700 }}>{m.trasferta}</span>
                    <span style={{ marginLeft: 'auto', color: m.over ? C.celeste : C.grigioFioco, fontSize: S.minuta }}>
                      {m.over ? 'over' : 'under'} 2,5
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.bordoChiaro}` }}>
            <Etichetta colore={C.testo} style={{ fontSize: S.corpo, letterSpacing: '0.12em', fontWeight: 700, paddingBottom: 9, marginBottom: 9, borderBottom: `1px solid ${C.bordoChiaro}` }}>⚽ gol fatti / subiti · stagione</Etichetta>
            {squadre.map(sq => {
              const g = forma.gol[sq]
              return (
                <div key={sq} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontFamily: F.mono, fontSize: S.corpo }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: S.media, textTransform: 'uppercase', color: C.testo, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sq}</span>
                  <b style={{ color: C.verde, fontSize: S.titolo }}>{g.fatti}</b><span style={{ color: C.spento, fontSize: S.base }}>fatti</span>
                  <span style={{ color: C.fantasma }}>|</span>
                  <b style={{ color: C.rosso, fontSize: S.titolo }}>{g.subiti}</b><span style={{ color: C.spento, fontSize: S.base }}>subiti</span>
                  <span style={{ color: C.fantasma, fontSize: S.base }}>({g.partite})</span>
                </div>
              )
            })}
          </div>
        </Blocco>
      </>}

      {/* ⚠️ I gol attesi stanno **subito sotto la forma** (spostati il
          12/10/2026, scelta di Mattia): sono la lettura della partita, e si
          leggono accanto a come stanno andando le squadre, non in fondo dopo
          i numeri. ⚠️ Sta **fuori** dal gruppo `{forma && …}` di proposito:
          dipende da `golAttesi`, non dalla forma, e dentro quel gruppo
          sparirebbe mentre la forma carica o se la sua query fallisce. */}
      {/* ── 3b. I gol attesi ───────────────────────────────────────────
          Stesse finestre e stessi pesi di VPM, ma guarda i gol invece dei
          risultati. ⚠️ **Non usa nessuna quota**: è una stima dalle squadre.
          Calibrata (misurato su 10.059 partite: over 2,5 previsto 50,6% contro
          52,5% vero) ma **debole** — misurato su 34.434 partite aggiunge il 42%
          dell'informazione che ha il mercato. Si legge come un colore della
          partita, non come una previsione da giocare. */}
      {g && (
        <Blocco titolo="⚽ Gol attesi" extra={`${g.totale.toFixed(2).replace('.', ',')} in tutto`} sottolinea>
          {/* ⚠️ Prima qui c'erano i due numeri affiancati con "attesi" in mezzo, e
              il totale ripetuto nel titolo. Mattia (12/10/2026): *"non si
              capisce una mazza"* — aveva ragione due volte. Il totale era
              scritto due volte, e due numeri con una parola in mezzo si leggono
              come un intervallo, mentre sono **di due squadre diverse**.
              Adesso: sopra di chi sono, sotto l'intervallo vero. */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            {[[p.casa, g.lambdaCasa], [p.trasferta, g.lambdaFuori]].map(([chi, lam], i) => (
              <div key={chi} style={{ flex: 1, textAlign: i ? 'right' : 'left', minWidth: 0 }}>
                <div style={{ fontSize: S.micro, fontFamily: F.mono, color: C.spento, letterSpacing: '0.06em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chi.toUpperCase()}</div>
                <div style={{ fontSize: S.evidenza, fontWeight: 700, fontFamily: F.mono, color: C.testo, lineHeight: 1.1 }}>
                  {lam.toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
          </div>

          {/* ⚠️ "3,01 in tutto" è una media, e una media di gol non si vede mai
              in campo: non esistono partite da 3,01 gol. L'intervallo dice la
              stessa cosa in risultati veri. ⚠️ La percentuale accanto è
              **verificata**, non calcolata e basta: su 10.059 partite dichiara
              67,9% e si avvera 67,9% (`btscout/scripts/prova-gol.js`). Senza
              quel numero un intervallo non si può leggere. */}
          {(() => {
            const iv = intervalloGol(g.totale)
            return (
              <div style={{ textAlign: 'center', marginBottom: 12, fontSize: S.minuta, fontFamily: F.mono, color: C.spento, letterSpacing: '0.04em' }}>
                ATTESI <span style={{ color: C.testo, fontWeight: 700, fontSize: S.corpo }}>DA {iv.da} A {iv.a} GOL</span>
                {' '}· {(iv.copertura * 100).toFixed(0)}% DELLE VOLTE
              </div>
            )
          })()}

          {/* ⚠️ IL COLORE È IL RISULTATO DELLA MISURA, non una decorazione.
              Verde = sopra la soglia alta, verde chiaro = sopra quella utile,
              niente colore = quel numero non dice più della media. Le soglie
              sono in `SOGLIE_COLORE` e vengono dalla tabella misurata su
              33.141 partite. ⚠️ Ogni riga ha la SUA scala: sull'over 1,5 il
              verde parte dall'82%, sull'over 2,5 dal 62%, sul 3,5 dal 40% —
              un'unica soglia direbbe il falso su metà delle righe.
              ⚠️ Due righe, over e under, perché sono due letture della stessa
              partita e Mattia le guarda entrambe: la cella spenta di una e
              accesa dell'altra è l'informazione. */}
          {(() => {
            // ⚠️ Quattro fasce, non due: rosso sotto la base, giallo attorno,
            //    verdino sopra, verde ben sopra. Le soglie sono in
            //    `tagliGol()` e vengono dalle basi misurate.
            const TINTE = { verde: C.verde, verdino: C.menta, giallo: C.giallo, rosso: C.rosso }
            // ⚠️ `famiglia` è la tinta del contorno e dell'etichetta, non del
            //    numero: serve a dire a quale gruppo appartiene la cella.
            //    Goal/NoGoal sono **viola** (scelta di Mattia, 12/10/2026)
            //    perché sono una domanda diversa dagli over/under — "segnano
            //    entrambe?" invece di "quanti gol?" — e prima si confondevano
            //    con la riga sopra. ⚠️ Il gradiente resta sul numero: la
            //    famiglia dice *cosa* stai guardando, la fascia *come sta*.
            const cella = (chiave, etichetta, p, famiglia) => {
              const f = fasciaGol(chiave, p)
              const colore = TINTE[f] || C.testo
              const bordo = famiglia || colore
              // ⚠️ Il fondo è acceso in proporzione alla fascia: un rosso o un
              // verde pieni su dieci celle farebbero un semaforo illeggibile,
              // e il giallo è il "niente di che" — deve restare sullo sfondo.
              const forza = f === 'verde' ? 0.16 : f === 'rosso' ? 0.12 : f === 'verdino' ? 0.10 : 0.05
              return (
                <div key={etichetta} style={{ textAlign: 'center', padding: '7px 2px', borderRadius: 0,
                  background: `linear-gradient(${alpha(colore, forza)},${alpha(colore, forza)}), ${C.card}`,
                  border: `1px solid ${alpha(bordo, f === 'giallo' ? 0.3 : 0.45)}` }}>
                  <div style={{ fontSize: S.media, fontWeight: 700, fontFamily: F.mono, color: colore, lineHeight: 1 }}>
                    {(p * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: S.micro, fontFamily: F.mono, color: famiglia || C.spento, letterSpacing: '0.08em', marginTop: 3 }}>{etichetta}</div>
                </div>
              )
            }
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {/* Gli over/under non hanno famiglia: contorno ed etichetta
                    seguono la fascia, perché sono la scala principale. */}
                {SOGLIE_OVER.map(sg => cella(`over${sg}`, `OVER ${sg},5`, g.over[sg]))}
                {cella('gg', 'GOAL', g.gg, C.viola)}
                {SOGLIE_OVER.map(sg => cella(`under${sg}`, `UNDER ${sg},5`, 1 - g.over[sg]))}
                {cella('ng', 'NOGOAL', 1 - g.gg, C.viola)}
              </div>
            )
          })()}

          {/* ⚠️ IL CONSIGLIO SUL GOAL/NO GOAL, e il suo silenzio.
              La percentuale sopra dice quanto è probabile; questa riga dice
              **cosa aspettarsi**, che è la domanda di chi legge. ⚠️ Sotto il
              55% di fiducia non c'è verdetto, ed è misurato: lì il consiglio
              è giusto il 52,2% delle volte, cioè quanto dire sempre GOL.
              Mostrare "in bilico" invece di un responso è il motivo per cui si
              può credere al responso quando arriva (62,0% sopra il 60%). */}
          {(() => {
            const cg = consiglioGg(g.gg)
            // ⚠️ Niente verde qui: da quando il verde vuol dire "da questo
            // valore in su la giocata ha funzionato", un CONSIGLIO verde
            // accanto a una cella GOAL spenta direbbe due cose opposte. Il
            // consiglio resta — dice quale lato preferisce il modello — nella
            // tinta della sua famiglia, il viola di GOAL/NOGOAL.
            const tinta = C.viola
            return (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '8px 10px', minHeight: 36,
                background: `linear-gradient(${alpha(tinta, 0.07)},${alpha(tinta, 0.07)}), ${C.card}`,
                border: `1px solid ${alpha(tinta, 0.25)}` }}>
                <span style={{ fontSize: S.micro, fontFamily: F.mono, color: C.spento, letterSpacing: '0.08em' }}>CONSIGLIO</span>
                <span style={{ fontSize: S.media, fontWeight: 700, fontFamily: F.mono, color: C.testo, letterSpacing: '0.04em' }}>
                  {cg.esito || 'IN BILICO'}
                </span>
                <span style={{ fontSize: S.minuta, fontFamily: F.mono, color: C.spento }}>
                  {cg.esito
                    ? `fiducia ${(cg.fiducia * 100).toFixed(0)}%`
                    : `fiducia ${(cg.fiducia * 100).toFixed(0)}%, serve ${(FIDUCIA_GG * 100).toFixed(0)}%`}
                </span>
              </div>
            )
          })()}

          {/* Da dove viene il numero: attacco e difesa rispetto alla media del
              campionato, dove 1,00 è "come tutti gli altri". */}
          <div style={{ marginTop: 10, fontSize: S.minuta, fontFamily: F.mono, color: C.spento, lineHeight: 1.6 }}>
            attacco {g.attacco.casa.toFixed(2).replace('.', ',')} · {g.attacco.trasferta.toFixed(2).replace('.', ',')}
            {'   '}difesa {g.difesa.casa.toFixed(2).replace('.', ',')} · {g.difesa.trasferta.toFixed(2).replace('.', ',')}
            {'   '}<span style={{ color: C.fantasma }}>(1,00 = media del campionato, {g.media.toFixed(2).replace('.', ',')} gol)</span>
          </div>
          {/* ⚠️ Il colore senza la sua spiegazione è una decorazione: qui si dice
              cosa è successo DAVVERO sopra quelle soglie, misurato. Il `title`
              col mouse non esiste su telefono, quindi sta scritto. */}
          <div style={{ marginTop: 6, fontSize: S.minuta, fontFamily: F.sans, color: C.fantasma, lineHeight: 1.5 }}>
            Il colore confronta il numero con quanto quell'esito arriva di solito:{' '}
            <span style={{ color: C.rosso, fontWeight: 700 }}>rosso</span> sotto il normale,{' '}
            <span style={{ color: C.giallo, fontWeight: 700 }}>giallo</span> attorno,{' '}
            <span style={{ color: C.menta, fontWeight: 700 }}>verdino</span> sopra,{' '}
            <span style={{ color: C.verde, fontWeight: 700 }}>verde</span> ben sopra — soglie dalle basi
            misurate su 33.141 partite ({(tagliGol('over2').base * 100).toFixed(0)}% per l&apos;over 2,5,{' '}
            {(tagliGol('gg').base * 100).toFixed(0)}% per il Goal). ⚠️ Verde vuol dire «più del solito», non
            «giocata vincente»: l&apos;over 3,5 in verde arriva il 44% delle volte. Le uniche dove il verde
            è anche una giocata che ha funzionato sopra il 70% sono over 0,5, over 1,5 e under 3,5.
          </div>
        </Blocco>
      )}

      {forma && <>

        {/* ── 4. La classifica ──────────────────────────────────────── */}
        <Blocco titolo="🏆 Classifica" extra={`su ${forma.classifica?.[p.casa]?.squadre ?? '—'} squadre`} sottolinea>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {squadre.map(sq => {
              const cl = forma.classifica?.[sq]
              if (!cl) return <div key={sq} style={{ fontSize: S.base, color: C.fantasma, fontFamily: F.sans }}>{sq}: —</div>
              const meglio = cl.posizione_forma < cl.posizione, peggio = cl.posizione_forma > cl.posizione
              const conti = (v, n, pe) => (
                <div style={{ display: 'flex', gap: 5, fontFamily: F.mono, fontSize: S.corpo, fontWeight: 700 }}>
                  <span style={{ color: C.verde }}>{v}V</span>
                  <span style={{ color: C.fantasma }}>·</span>
                  <span style={{ color: C.giallo }}>{n}N</span>
                  <span style={{ color: C.fantasma }}>·</span>
                  <span style={{ color: C.rosso }}>{pe}P</span>
                </div>
              )
              return (
                <div key={sq} style={{ background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 10, padding: '11px 12px' }}>
                  <div style={{ fontSize: S.corpo, fontWeight: 700, textTransform: 'uppercase', fontFamily: F.sans, color: C.testo, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sq}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                    <span style={{ fontSize: S.cifra, fontWeight: 700, fontFamily: F.mono, color: C.testo, lineHeight: 1 }}>{cl.posizione}°</span>
                    <span style={{ fontSize: S.corpo, fontFamily: F.mono, color: C.oro, fontWeight: 700 }}>{cl.punti} pt</span>
                  </div>
                  <div style={{ marginTop: 7 }}>{conti(cl.vinte, cl.pari, cl.perse)}</div>
                  <div style={{ fontSize: S.minuta, fontFamily: F.mono, color: C.fioco, marginTop: 3 }}>in {cl.giocate} partite</div>

                  {/* La classifica delle ultime 5: dice se sta salendo o scendendo. */}
                  <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.bordoChiaro}` }}>
                    <Etichetta style={{ fontSize: S.micro, marginBottom: 5 }}>forma · ultime {cl.giocate_forma}</Etichetta>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                      <span style={{ fontSize: S.evidenza, fontWeight: 700, fontFamily: F.mono, lineHeight: 1, color: meglio ? C.verde : peggio ? C.rosso : C.testo }}>{cl.posizione_forma}°</span>
                      <span style={{ fontSize: S.base, fontFamily: F.mono, color: C.spento }}>{cl.punti_forma} pt</span>
                      {meglio && <span style={{ fontSize: S.base, color: C.verde }}>▲{cl.posizione - cl.posizione_forma}</span>}
                      {peggio && <span style={{ fontSize: S.base, color: C.rosso }}>▼{cl.posizione_forma - cl.posizione}</span>}
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
          {/* Le bandierine di VPM, sopra l'elenco: è qui che si viene a
              cercarle. ⚠️ Dicono su quante partite sono calcolate, e il numero
              **non coincide** con l'elenco sotto: lì ci sono gli ultimi 5
              complessivi (`forma_partita`, sql/17), la bandierina guarda gli
              ultimi 6 e, se li ha, i 6 giocati **su questo campo** — che è la
              domanda vera. Senza quel "su 6" sembrerebbe un errore di conto. */}
          {v?.bandiere?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
              {v.bandiere.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 8,
                  background: `linear-gradient(${alpha(b.grave ? C.rosso : C.fioco, 0.10)},${alpha(b.grave ? C.rosso : C.fioco, 0.10)}), ${C.card}`,
                  border: `1px solid ${alpha(b.grave ? C.rosso : C.fioco, b.grave ? 0.45 : 0.25)}`,
                }}>
                  <span style={{ fontSize: S.corpo, lineHeight: 1 }}>{b.grave ? '🔴' : '⚪️'}</span>
                  <span style={{ fontSize: S.base, fontFamily: F.sans, color: b.grave ? C.testo : C.fioco, lineHeight: 1.4 }}>
                    {b.testo}
                    {b.tipo === 'pari' && <span style={{ color: C.spento }}> — per noi il pareggio è una sconfitta</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {forma.scontri.length === 0
            ? <div style={{ fontSize: S.base, color: C.fantasma, fontFamily: F.sans }}>nessun precedente in archivio (dal 2016)</div>
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
                  <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', background: C.attiva }}>
                    {[[vCasa, C.verde], [pari, C.giallo], [vTrasferta, C.rosso]].map(([n, col], i) =>
                      n > 0 && <div key={i} style={{ width: `${100 * n / tot}%`, background: col }} />)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: F.mono, fontSize: S.base }}>
                    <span style={{ color: C.verde, fontWeight: 700 }}>{vCasa} <span style={{ color: C.spento, fontWeight: 400, fontSize: S.minuta }}>{p.casa}</span></span>
                    <span style={{ color: pari ? C.giallo : C.fioco }}>{pari} <span style={{ color: C.spento, fontSize: S.minuta }}>pari</span></span>
                    <span style={{ color: C.rosso, fontWeight: 700 }}><span style={{ color: C.spento, fontWeight: 400, fontSize: S.minuta }}>{p.trasferta}</span> {vTrasferta}</span>
                  </div>
                </div>

                {forma.scontri.map((s, i) => {
                  const e = esitoPer(s, p.casa)   // sempre dal lato della squadra di casa di domani
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 2px', fontFamily: F.mono, fontSize: S.base, borderBottom: i < forma.scontri.length - 1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
                      {/* Chi ha vinto fra le due di domani, senza doverlo dedurre dal punteggio */}
                      <span style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, fontSize: S.minuta, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: alpha(ESITO[e], 0.15), color: ESITO[e], border: `1px solid ${alpha(ESITO[e], 0.4)}`,
                      }}>{e}</span>
                      <span style={{ color: C.fioco, flexShrink: 0 }}>{String(s.data).slice(8, 10)}/{String(s.data).slice(5, 7)}/{String(s.data).slice(2, 4)}</span>
                      <span style={{ color: s.gol_casa > s.gol_trasferta ? C.testo : C.spento, flex: 1, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.casa}</span>
                      <b style={{ color: C.testo, flexShrink: 0 }}>{s.gol_casa}–{s.gol_trasferta}</b>
                      <span style={{ color: s.gol_trasferta > s.gol_casa ? C.testo : C.spento, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.trasferta}</span>
                      {s.div !== p.div && <span style={{ color: C.fantasma, flexShrink: 0, fontSize: S.minuta }}>{sigla(s.div)}</span>}
                    </div>
                  )
                })}
              </>
            })()}
        </Blocco>
      </>}

      {/* ── 6. VPM: da dove viene il numero ────────────────────────────
          In lista si legge "2 7,32"; qui dev'essere evidente **perché**, e
          nell'ordine in cui lo si farebbe a mano: le due forze, i tre strati,
          i parametri.
          ⚠️ Sta **dopo il consenso di mercato** (scelta di Mattia, 9/10/2026):
          prima si legge cosa dice il mercato, poi cosa dice il campo. Messo in
          alto rubava la scena alla giocata, che è l'informazione principale. ⚠️ Accanto a ogni strato c'è il **peso vero**, non quello
          nominale: a ottobre le partite nel ruolo sono 1-3 e il blocco vale una
          frazione del suo 25%. Senza quel numero sembrerebbero tre strati
          indipendenti, e oggi non lo sono. */}
      {v && v.punti != null && (() => {
        const forti = [v.forzaCasa, v.forzaFuori]
        const voci = forti.map(vociPesate)
        const vincente = v.segno === '1' ? p.casa : p.trasferta
        return (
          <Blocco titolo="🧮 VPM" extra={`il campo dice ${v.segno}`} sottolinea>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: S.base, fontFamily: F.sans, color: C.fioco, lineHeight: 1.5 }}>
                <b style={{ color: COLORE_VPM[vs] }}>{vincente}</b>, e {PAROLA_VPM[vs]}.
                {vs !== 'incerto' && <> Sotto {String(VPM_NETTO).replace('.', ',')} non si pronuncia.</>}
              </div>
              <div style={{ fontSize: S.evidenza, fontWeight: 700, fontFamily: F.mono, color: COLORE_VPM[vs], lineHeight: 1, flexShrink: 0 }}>
                {v.punti.toFixed(2).replace('.', ',')}
              </div>
            </div>

            {/* L'intestazione con le due squadre: le colonne qui sotto sono
                loro, e senza i nomi non si capirebbe quale sia quale. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px', gap: 6, paddingBottom: 6, borderBottom: `1px solid ${C.bordoChiaro}` }}>
              <div />
              {squadre.map(sq => (
                <div key={sq} style={{ textAlign: 'right', fontSize: S.micro, fontFamily: F.mono, color: C.spento, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sq.length > 8 ? sq.slice(0, 8) + '…' : sq}
                </div>
              ))}
            </div>

            <Confronto etichetta="FORZA" nota="in casa · fuori" forte
              a={forti[0]?.punti} b={forti[1]?.punti} />

            <div style={{ borderTop: `1px solid ${C.bordoTenue}`, marginTop: 4, paddingTop: 4 }}>
              {['stagione', 'forma', 'ruolo'].map(nome => {
                const sa = forti[0]?.strati?.[nome], sb = forti[1]?.strati?.[nome]
                const pa = forti[0]?.pesi?.[nome] ?? 0, pb = forti[1]?.pesi?.[nome] ?? 0
                const pesoDetto = Math.round(pa * 100) === Math.round(pb * 100)
                  ? `${Math.round(pa * 100)}%` : `${Math.round(pa * 100)}% · ${Math.round(pb * 100)}%`
                return (
                  <Confronto key={nome} etichetta={NOMI_STRATI[nome]}
                    nota={`peso ${pesoDetto} · ${sa?.n ?? 0} e ${sb?.n ?? 0} partite`}
                    a={sa?.punti} b={sb?.punti} />
                )
              })}
              {forti.some(f => f && f.pesi.ruolo < PESI_STRATI.ruolo - 0.001) && (
                <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.fantasma, lineHeight: 1.5, marginTop: 4 }}>
                  Lo strato nel ruolo vale meno del suo {Math.round(PESI_STRATI.ruolo * 100)}% perché le partite
                  giocate in quel ruolo sono meno di cinque: il peso che avanza torna alla stagione.
                </div>
              )}
            </div>

            {/* I parametri, con i tre strati già fusi: la loro somma pesata
                fa esattamente la FORZA qui sopra. */}
            <div style={{ borderTop: `1px solid ${C.bordoChiaro}`, marginTop: 8, paddingTop: 6 }}>
              {Object.keys(PESI).map(k => (
                <Confronto key={k} etichetta={ETICHETTE[k]} nota={`peso ${(PESI[k] * 100).toFixed(0)}%`}
                  a={voci[0]?.[k]} b={voci[1]?.[k]} />
              ))}
            </div>
          </Blocco>
        )
      })()}

      {/* ── 7. Il consenso ──────────────────────────────────────────────
          Per ultimo, prima dei dettagli (scelta di Mattia, 9/10/2026): sono le
          quote crude, cioè il materiale da cui nasce l'attendibilità, non una
          cosa da leggere per prima. */}
      <Blocco titolo="📊 Consenso di mercato" extra={p.quotaFonte ? `quote ${p.quotaFonte}` : null} sottolinea>
        {[['1', p.p.p1, p.casa, p.q1], ['X', p.p.px, 'pareggio', p.qx], ['2', p.p.p2, p.trasferta, p.q2]].map(([segno, prob, chi, quota]) => {
          const suo = segno === p.segno
          return (
            <div key={segno} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ width: 16, fontSize: S.media, fontWeight: 700, fontFamily: F.mono, color: suo ? C.oro : C.spento }}>{segno}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                  <span style={{ fontSize: S.minuta, color: suo ? C.testo : C.fioco, fontFamily: F.sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chi}</span>
                  {/* La quota accanto alla probabilità: "il mercato dice 75%" e
                      "te la pagano 1,30" sono due metà della stessa frase. */}
                  <span style={{ fontSize: S.minuta, fontFamily: F.mono, color: quota ? (suo ? C.oro : C.spento) : C.fantasma, flexShrink: 0 }}>
                    {quota ? `@${Number(quota).toFixed(2).replace('.', ',')}` : '—'}
                  </span>
                </div>
                <Barra frazione={prob} colore={suo ? C.verde : C.grigioCupo} />
              </div>
              <span style={{ width: 42, textAlign: 'right', fontSize: S.media, fontWeight: 700, fontFamily: F.mono, color: suo ? C.testo : C.spento }}>{pct(prob)}</span>
            </div>
          )
        })}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bordoTenue}`, fontSize: S.minuta, color: C.fantasma, fontFamily: F.sans, lineHeight: 1.5 }}>
          Le percentuali vengono dalla media di ~40 bookmaker, tolto il margine. La X non si gioca mai.
        </div>
      </Blocco>

      {/* Sul telefono si torna indietro anche trascinando: va detto, o il
          gesto resta nascosto. */}
      {tocco && onChiudi && (
        <div style={{ textAlign: 'center', fontSize: S.minuta, color: C.fantasma, fontFamily: F.sans, marginTop: 2 }}>
          ‹ trascina da sinistra a destra per tornare alla lista
        </div>
      )}

      {/* ── 8. I dettagli tecnici ───────────────────────────────────── */}
      <div>
        <button onClick={() => setDettagli(v => !v)} style={{ width: '100%', background: 'transparent', border: `1px solid ${C.bordoTenue}`, borderRadius: 10, padding: '9px 12px', color: C.spento, fontFamily: F.mono, fontSize: S.minuta, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
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
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta, borderBottom: `1px solid ${C.bordoTenue}` }}>
                <span style={{ color: C.spento, minWidth: 0 }}>{l}</span>
                <span style={{ color: v[0] ? C.testo : C.fantasma, flexShrink: 0 }}>{v.map(x => q(x)).join(' / ')}</span>
              </div>
            ))}
            {/* ⚠️ **Quanto i book sono d'accordo fra loro**, scritto per esteso
                qui dentro mentre in barra c'è solo il marchio ambra su
                ATTEND.: sopra una card serve sapere *che* il mercato è
                incerto, il numero serve a chi vuole verificarlo. Il taglio
                dipende dalla fonte della massima — 6% su football-data
                (misurato), 10% su The Odds API (trasposto per percentile,
                perché la massima di 34 book è più estrema). */}
            {p.dispersione != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta, borderBottom: `1px solid ${C.bordoTenue}` }}>
                <span style={{ color: C.spento }}>disaccordo fra i book (massima / media)</span>
                <span style={{ color: p.bookSparsi ? C.ambra : C.testo }}>
                  +{(p.dispersione * 100).toFixed(1)}%{p.bookSparsi ? ' · sparsi' : ''}
                </span>
              </div>
            )}
            {p.b365_over25 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta, borderBottom: `1px solid ${C.bordoTenue}` }}>
                <span style={{ color: C.spento }}>over / under 2,5 (Bet365)</span>
                <span style={{ color: C.testo }}>{q(p.b365_over25)} / {q(p.b365_under25)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta, borderBottom: `1px solid ${C.bordoTenue}` }}>
              <span style={{ color: C.spento }}>resa · quota × probabilità</span>
              <span style={{ color: p.resa == null ? C.fantasma : C.grigio }}>{p.resa == null ? '—' : `${(p.resa * 100).toFixed(1)}%`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta, borderBottom: `1px solid ${C.bordoTenue}` }}>
              <span style={{ color: C.spento }}>margine del book sulla giocata</span>
              {/* Negativo su tutte le partite: è la ricarica del bookmaker, non un difetto della giocata. */}
              <span style={{ color: C.grigio }}>{p.scarto !== null ? segnoPct(p.scarto) : '—'} vs equo {q(p.equo)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta }}>
              <span style={{ color: C.spento }}>fonte · scaricato</span>
              <span style={{ color: C.grigio }}>{p.fonte || '—'} · {new Date(p.scaricato_il).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {forma && <div style={{ marginTop: 6, fontSize: S.minuta, fontFamily: F.mono, color: C.fantasma }}>forma e classifica: stagione {`20${forma.stagione.slice(0, 2)}/${forma.stagione.slice(2)}`}</div>}
          </Blocco>
        )}
      </div>
    </div>
  )
}
