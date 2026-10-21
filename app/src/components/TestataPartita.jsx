import { C, F, alpha, S } from '../theme'
import { pct, giorno } from '../lib/formato'
import { pronosticoDa } from '../lib/spin'
import { Etichetta } from './ui'
import { usaClassifiche, postoDi, fasciaDi } from '../hooks/usaClassifiche'
import { consiglioOver, consiglioGg, mercatoOver25, BASI_GOL } from '../lib/gol'

// La testata di una partita: squadra sinistra — attendibilità — squadra destra,
// con data e ora sotto. La usano sia la riga della lista (compatta) sia la
// scheda (grande): stessa grafica, un posto solo, così non divergono.

export const CATEGORIE = {
  centro: { nome: 'Centro', colore: C.menta,     desc: 'la partita perfetta' },
  giallo: { nome: 'Giallo', colore: C.oroChiaro, desc: 'i 4 angoli: le più attendibili' },
  blu:    { nome: 'Blu',    colore: C.celeste,   desc: 'i 4 lati: sacrificabili' },
  no:     { nome: '—',      colore: C.fantasma,  desc: 'sotto soglia' },
}

// ⚠️ Definite in `lib/formato.js` e ri-esportate qui **solo** perché mezzo
// progetto le importa da questo file: il posto dove vivono è uno.
export { pct, giorno }

// ⚠️ **La posizione in classifica è una targhetta `1/20`, non un tondo**
// (15/10/2026, dopo tre proposte: tondo bocciato da Mattia).
//
// ⚠️⚠️ **Il difetto che risolve non è estetico.** Nel tondo stava la sola
// posizione, e *"su quante squadre"* viveva nel `title` — che **su telefono non
// esiste**, ed è una regola già scritta in questo progetto: il `title` non è
// mai l'unico posto dove mettere un'informazione. Senza il denominatore la
// cifra non si può leggere: **12° è metà classifica in un campionato da 24
// squadre e ultimo in uno da 12**, e i nostri vanno da 12 a 24. È la stessa
// ragione per cui `fasciaDi` colora **a terzi** e non a soglie fisse.
//
// Il colore resta quello della fascia: verde il primo terzo, giallo il secondo,
// rosso l'ultimo. Se la posizione non la sappiamo — nome nuovo, campionato
// senza partite giocate — restano le iniziali, che almeno dicono di chi si
// parla.
const COLORE_FASCIA = { alta: C.verde, media: C.giallo, bassa: C.rosso }

/**
 * ⚠️ `style` **si accetta e si sovrascrive in fondo.** Il 18/10/2026 la pagina
 * Road to weekend passava uno `style` per rimpicciolire la targhetta e il
 * componente **non aveva quella prop**: l'override veniva ignorato in silenzio
 * e la targhetta restava a corpo 13 — due giri di "ho rimpicciolito" che non
 * avevano cambiato un pixel. **Un oggetto passato a una prop che non esiste
 * non dà errore**, e un conto aritmetico sull'altezza non lo scopre: bisogna
 * guardare la firma.
 */
export function Posizione({ nome, colore, posto, compatta = false, style }) {
  const tinta = COLORE_FASCIA[fasciaDi(posto)] || colore
  const iniziali = nome.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
  return (
    <div title={posto ? `${posto.posizione}° su ${posto.squadre} · ${posto.punti} punti in ${posto.giocate}` : nome}
      style={{
        flexShrink: 0, borderRadius: 5, padding: compatta ? '2px 5px' : '3px 7px',
        background: alpha(tinta, 0.12), border: `1px solid ${alpha(tinta, 0.4)}`,
        color: tinta, fontFamily: F.mono, fontWeight: 700, lineHeight: 1.2,
        fontSize: compatta ? 10 : 13, whiteSpace: 'nowrap',
        ...style,
      }}>
      {/* ⚠️ Il denominatore è più piccolo e più tenue: la posizione è il dato,
          "su quante" è il contesto che la rende leggibile. Alla stessa misura
          sarebbero due numeri in gara fra loro. */}
      {posto
        ? <>{posto.posizione}<span style={{ fontSize: '0.78em', fontWeight: 400, opacity: 0.65 }}>/{posto.squadre}</span></>
        : iniziali}
    </div>
  )
}

export const Barra = ({ frazione, colore, altezza = 6 }) => (
  <div style={{ height: altezza, borderRadius: altezza, background: C.attiva, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(0, Math.min(1, frazione)) * 100}%`, height: '100%', background: colore, borderRadius: altezza }} />
  </div>
)

// La stella: il voto di un admin. `voti` è il totale, `mio` se l'utente
// corrente ha già votato, `puoVotare` se è admin. Il massimo naturale è il
// numero di admin — ognuno vota una volta sola.
export function Stella({ voti, mio, puoVotare, onVota }) {
  return (
    <button onClick={e => { e.stopPropagation(); if (puoVotare) onVota() }} disabled={!puoVotare}
      title={puoVotare ? (mio ? 'Togli il tuo voto' : 'Vota questa partita') : `${voti} voti`}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
        background: voti ? alpha(C.oro, 0.10) : 'transparent', border: `1px solid ${voti ? alpha(C.oro, 0.3) : C.bordo}`,
        cursor: puoVotare ? 'pointer' : 'default' }}>
      <span style={{ fontSize: S.titolo, lineHeight: 1, color: mio ? C.oro : voti ? alpha(C.oro, 0.55) : C.fioco }}>{voti ? '★' : '☆'}</span>
      <span style={{ fontSize: S.base, fontFamily: F.mono, fontWeight: 700, color: voti ? C.oro : C.fioco }}>{voti}/3</span>
    </button>
  )
}

export default function TestataPartita({ p, cat, compatta = false, gol = null }) {
  const c = CATEGORIE[cat]
  const classifiche = usaClassifiche()
  return (
    <>
      {/* ⚠️ `center` e non più `start`: con il tondo sopra il nome le due
          colonne andavano allineate in alto, ora che è in linea col nome
          vanno allineate al centro, come il blocco della giocata in mezzo. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        {[[p.casa, '1'], [p.trasferta, '2']].map(([sq, segno], i) => (
          <div key={sq} style={{ display: 'contents' }}>
            {/* ⚠️ In mezzo alle squadre sta **la giocata** (10/10/2026, scelta di
                Mattia): è la cosa che si decide, e deve stare dove l'occhio va
                per primo. L'attendibilità era qui e si è spostata nella barra
                sotto, con gli altri quattro numeri. */}
            {i === 1 && (
              <div style={{ alignSelf: 'center', textAlign: 'center', padding: '0 6px', minWidth: compatta ? 76 : 96 }}>
                <Etichetta style={{ fontSize: S.micro, letterSpacing: '0.12em', marginBottom: 4 }}>giocata</Etichetta>
                <div style={{ fontSize: compatta ? 19 : 24, fontWeight: 700, fontFamily: F.mono, color: c.colore, lineHeight: 1.1 }}>{pronosticoDa(p.giocata)}</div>
                <div style={{ marginTop: compatta ? 5 : 7 }}><Barra frazione={p.probGiocata} colore={c.colore} altezza={compatta ? 5 : 6} /></div>
                {/* ⚠️ **I due consigli sotto la giocata, in bianco** (scelta di
                    Mattia, 15/10/2026). Stanno qui perché sono dello stesso
                    genere della giocata — *cosa farei* — mentre il blocco ⚽
                    più in basso dice *com'è messa la partita*. Il bianco li
                    lega fra loro e li separa dal colore della categoria, che
                    sulla giocata vuol dire un'altra cosa (centro, giallo, blu).
                    ⚠️ Arrivano da **fuori** (`gol`): la testata non calcola
                    niente, e nella riga della lista quella proprietà non c'è —
                    quindi lì le due righe non compaiono. È voluto: in lista i
                    gol attesi non sono caricati, e inventarli per riempire uno
                    spazio sarebbe peggio di lasciarlo vuoto. */}
                {gol && (
                  <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {/* ⚠️ **Ogni riga porta il nome della domanda** (Mattia,
                        15/10/2026: *"in bilico da solo non si capisce"*). Aveva
                        ragione: `IN BILICO` da solo non dice **su cosa** sia in
                        bilico, e il Goal tace nel 65% dei casi — cioè nella
                        maggior parte delle partite quella riga era una parola
                        senza soggetto. L'etichetta resta spenta e il verdetto
                        bianco: il nome della domanda è contesto, la risposta è
                        il dato. */}
                    {[['O/U', consiglioOver(gol.over, mercatoOver25(p))], ['GG/NG', consiglioGg(gol.gg)]].map(([et, cons]) => {
                      // ⚠️⚠️ **Lo scarto dalla base è il numero che rende
                      // leggibile il consiglio**, e senza di lui una parola
                      // sola mente per omissione: `UNDER 3,5` si avvera il 75%
                      // delle volte ma **da solo** arriva il 71%, mentre
                      // `OVER 2,5` al 66% vale +15. Misurato, lo scarto del
                      // consiglio sta fra +3 e +15 a seconda della riga: la
                      // percentuale nuda fa sembrare forte il consiglio debole
                      // e debole quello forte.
                      const base = cons?.chiave ? BASI_GOL[cons.chiave] : null
                      const scarto = cons?.p != null && base != null ? cons.p - base : null
                      // verde solo dove lo scarto è grande davvero: sotto i 5
                      // punti il consiglio sta ripetendo quello che è già vero
                      const tinta = scarto == null ? C.fioco
                        : scarto >= 0.10 ? C.verde : scarto >= 0.05 ? C.testo : C.spento
                      return (
                        <div key={et} style={{ lineHeight: 1.25 }}>
                          {/* ⚠️ **Chi ha parlato va scritto**: sul 2,5 il
                              consiglio può venire dalle quote (71% di volte
                              giuste) o dal nostro modello (63%), e sono due
                              cose di valore diverso. È la stessa regola della
                              colonna QUOTA, che dice sempre `BET365` o
                              `MEDIA`: un numero senza la sua fonte non si può
                              pesare. */}
                          <Etichetta style={{ fontSize: compatta ? 7 : 8, letterSpacing: '0.1em' }}>
                            {et}{cons?.fonte === 'mercato' && <span style={{ color: C.oroChiaro }}> · quote</span>}
                          </Etichetta>
                          <div style={{
                            fontFamily: F.mono, fontWeight: 700, fontSize: compatta ? 11 : 12, letterSpacing: '0.03em',
                            whiteSpace: 'nowrap',
                            // ⚠️ IN BILICO resta spento: un consiglio che non
                            // c'è non deve avere lo stesso peso di uno che c'è.
                            color: cons?.esito ? C.bianco : C.fioco,
                          }}>{cons?.esito || 'IN BILICO'}</div>
                          {cons?.esito && scarto != null && (
                            <div style={{ fontFamily: F.mono, fontSize: compatta ? 9 : 10, whiteSpace: 'nowrap', color: C.spento }}>
                              {(cons.p * 100).toFixed(0)}%{' '}
                              <span style={{ color: tinta, fontWeight: 700 }}>
                                {scarto >= 0 ? '+' : ''}{(scarto * 100).toFixed(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {/* ⚠️ **Il tondo sta a DESTRA del nome, non sopra** (scelta di
                Mattia, 15/10/2026). Due conseguenze volute:
                - la riga guadagna in altezza quello che perde in larghezza —
                  spariscono i 34-52px che il tondo prendeva sopra il nome, e
                  il nome può andare su due righe senza allungare la card;
                - il nome ha ~40px in meno, per questo il carattere scende di
                  due punti: era già `clamp()` e resta `clamp()`, perché su un
                  telefono da 320px e su uno da 430px lo spazio non è lo stesso.
                ⚠️ Il tondo è a destra per **entrambe** le squadre, quindi i due
                blocchi non sono più specchiati. È quello che è stato chiesto:
                "a destra del nome" vale per il nome, non per il lato della
                card. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: compatta ? 6 : 9, minWidth: 0 }}>
              <div style={{
                fontSize: compatta ? 'clamp(11px, 3.4vw, 14px)' : 'clamp(13px, 4.4vw, 19px)',
                fontWeight: 700, fontFamily: F.sans, letterSpacing: '0.02em',
                textTransform: 'uppercase', lineHeight: 1.15, overflowWrap: 'anywhere',
                textAlign: 'center', minWidth: 0,
                color: p.segno === segno ? C.testo : C.spento,
              }}>{sq}</div>
              <Posizione nome={sq} colore={p.segno === segno ? c.colore : C.grigioFioco} compatta={compatta}
                posto={postoDi(classifiche, p.div, sq)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: compatta ? 9 : 14,
        paddingTop: compatta ? 8 : 10, borderTop: `1px solid ${C.bordoTenue}` }}>
        <span style={{ fontSize: compatta ? 12 : 14, fontWeight: 600, fontFamily: F.mono, color: C.testo }}>📅 {giorno(p.data).toUpperCase()}</span>
        {p.ora && <span style={{ fontSize: compatta ? 12 : 14, fontWeight: 600, fontFamily: F.mono, color: C.testo }}>🕐 {p.ora.slice(0, 5)}</span>}
      </div>
    </>
  )
}
