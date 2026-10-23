import { Fragment } from 'react'
import { C, F, alpha, S, SP, R } from '../theme'
import { pct, giorno } from '../lib/formato'
import { pronosticoDa } from '../lib/spin'
import { Etichetta } from './ui'
import Icona from './Icona'
import { usaClassifiche, postoDi, fasciaDi } from '../hooks/usaClassifiche'
import { consiglioOver, consiglioGg, mercatoOver25, BASI_GOL } from '../lib/gol'

/**
 * Il corpo del verdetto dei consigli nella scheda — e **la data e l'ora
 * prendono lo stesso** (Mattia, 22/10/2026: *"data e ora con la stessa
 * grandezza del carattere esito OVER"*). Sta in una costante sola perché sono
 * due numeri che devono restare uguali: scritti a mano in due posti, al primo
 * ritocco divergono.
 */
const CORPO_CONSIGLIO = S.base

// La testata di una partita: squadra sinistra — attendibilità — squadra destra,
// con data e ora sotto. La usano sia la riga della lista (compatta) sia la
// scheda (grande): stessa grafica, un posto solo, così non divergono.

export const CATEGORIE = {
  centro: { nome: 'Centro', colore: C.menta,     desc: 'la partita perfetta' },
  giallo: { nome: 'Giallo', colore: C.oroChiaro, desc: 'i 4 angoli: le più attendibili' },
  blu:    { nome: 'Blu',    colore: C.celeste,   desc: 'i 4 lati: sacrificabili' },
  // ⚠️ `spento` e non `fantasma` (21/10/2026): **sotto soglia non vuol dire
  // illeggibile.** Questo colore veste il pronostico in mezzo alla card — il
  // dato principale — la sua barra e i numeri della barra sotto, e a 2,27:1
  // non si leggevano. A 6,97:1 sì, e restano comunque i più quieti dei
  // quattro, perché gli altri tre sono **colori** e questo è un grigio: la
  // differenza la fa la tinta, non il buio.
  no:     { nome: '—',      colore: C.spento,    desc: 'sotto soglia' },
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

// ⚠️⚠️ **Il corpo del nome lo decide la PAROLA più lunga, non il nome.**
// `ASTON VILLA` sono 11 caratteri ma va a capo fra le due parole senza
// danno; `BOURNEMOUTH` sono gli stessi 11 in un pezzo solo, e misurato
// occupa **8,774px per ogni px di corpo** — a 11px fa 96,5px, dove la colonna
// ne offre ~80. Un corpo unico deve quindi essere tarato sul caso peggiore,
// cioè rimpicciolire **tutti** i nomi per colpa di quattro squadre.
// Qui scende solo chi ha davvero una parola lunga: le altre restano leggibili.
// ⚠️ Le soglie vengono dai nomi veri in calendario (132 squadre): la parola
// più lunga è `Bournemouth` (11), poi dieci squadre a 10.
const corpoNome = (sq, compatta) => {
  const lunga = Math.max(...sq.split(/[\s-]+/).map(x => x.length))
  if (lunga >= 10) return compatta ? 'clamp(8px, 2.2vw, 10px)' : 'clamp(8px, 2.3vw, 11px)'
  return compatta ? 'clamp(9px, 2.6vw, 12px)' : 'clamp(10px, 2.9vw, 14px)'
}

// ⚠️⚠️ **Due righe riservate al nome, sempre.** È *questa* la cosa che tiene
// allineate le due squadre, non la speranza che il testo ci stia: se un nome
// va a capo e l'altro no, un blocco diventa più alto e i due nomi finiscono a
// quote diverse — `ASTON VILLA` sopra, `MAN CITY` sotto (Mattia, 21/10/2026).
// Riservando lo spazio l'altezza non dipende più da cosa c'è scritto.
// È la stessa regola per cui nella Slot il ✓/✗ non allunga la casella.
//
// ⚠️⚠️ **E NON si scrive in `em`.** Provato così, restavano 9 righe su 67
// sfalsate di 1,7px: `em` si misura sul corpo dell'elemento, e il nome con
// una parola lunga ha un corpo più piccolo (`corpoNome`), quindi le sue due
// righe riservate erano più basse di quelle dell'altra squadra. Lo spazio
// riservato deve essere **lo stesso numero per tutte e due**, cioè due righe
// del corpo GRANDE, qualunque corpo abbia poi il singolo nome.
/**
 * ⚠️⚠️ **La colonna della giocata ha una larghezza FISSA, e la scritta si
 * adatta a lei** (Mattia, 21/10/2026: *"quando la partita indica 1+O1,5 la
 * barra diventa più lunga, io la vorrei sempre uguale — piuttosto
 * rimpiccioliamo la scritta"*).
 * Prima era un `minWidth`: la colonna cresceva per contenere il testo, e
 * misurato `1+O1,5` occupa **3,6px per ogni px di corpo** — a 19px fa 68px
 * contro i 58 del minimo. Quei **22px** li guadagnava la barra, che così
 * cambiava lunghezza da una riga all'altra e smetteva di essere un metro, e
 * li perdevano i due nomi, che si stringevano **solo sulle combinate**.
 * Con la larghezza fissa ogni riga ha la stessa impaginazione.
 */
const LARGA_GIOCATA = compatta => (compatta ? 62 : 76)
// lo spazio vero dentro la colonna, tolto il riempimento laterale di 6px
const corpoGiocata = (testo, compatta) => {
  const dentro = LARGA_GIOCATA(compatta) - 12
  const grande = compatta ? 19 : 24
  // 0,6px di larghezza per carattere per ogni px di corpo, misurato su DM Mono
  const serve = testo.length * 0.6
  return Math.min(grande, Math.floor(dentro / serve))
}

const DUE_RIGHE = compatta => compatta
  ? 'calc(2.3 * clamp(9px, 2.6vw, 12px))'
  : 'calc(2.3 * clamp(10px, 2.9vw, 14px))'

/**
 * ⚠️ `style` **si accetta e si sovrascrive in fondo.** Il 18/10/2026 la pagina
 * Road to weekend passava uno `style` per rimpicciolire la targhetta e il
 * componente **non aveva quella prop**: l'override veniva ignorato in silenzio
 * e la targhetta restava a corpo 13 — due giri di "ho rimpicciolito" che non
 * avevano cambiato un pixel. **Un oggetto passato a una prop che non esiste
 * non dà errore**, e un conto aritmetico sull'altezza non lo scopre: bisogna
 * guardare la firma.
 */

/**
 * I due consigli — over/under e Goal/NoGoal — **su una riga loro**, uno a
 * sinistra e uno a destra (disposizione chiesta da Mattia il 22/10/2026).
 *
 * ⚠️⚠️ **Perché non stanno più sotto la giocata.** Ci sono stati dal
 * 15/10/2026, incolonnati dentro la colonna della giocata: larga 76px, quindi
 * i due verdetti e le due percentuali facevano **quattro righe di testo** che
 * allungavano la card di una sessantina di pixel, e per starci dentro erano a
 * corpo 11 con `nowrap` — `UNDER 3,5` è 9 caratteri, cioè 5,4px per px di
 * corpo, e oltre gli 11px sborderebbe in silenzio. Spostati sui due lati
 * hanno **tutta la larghezza della card** e costano **una riga invece di
 * quattro**.
 * ⚠️ Restano dello stesso genere della giocata — *cosa farei* — mentre il
 * blocco ⚽ più in basso dice *com'è messa la partita*: per questo il verdetto
 * è bianco e non prende il colore della categoria, che lì vuol dire un'altra
 * cosa (centro, giallo, blu).
 * ⚠️ **Arrivano da fuori** (`gol`): la testata non calcola niente, e nella
 * riga della lista quella proprietà non c'è — quindi lì questa riga non
 * compare affatto. In lista i gol attesi non sono caricati, e inventarli per
 * riempire uno spazio sarebbe peggio di lasciarlo vuoto.
 */
function Consigli({ p, gol, compatta, conteggi = null, ultimo = false }) {
  return (
    /* ⚠️ **Vicini e separati da una riga verticale**, non ai due estremi
       (correzione di Mattia, 22/10/2026). Ai lati opposti sembravano due
       informazioni di due blocchi diversi; attaccati con un divisore si
       leggono per quello che sono — **due risposte alla stessa domanda**,
       *cosa farei*. ⚠️ `stretch` sul divisore: deve essere alto quanto il più
       alto dei due, e uno dei due può non avere la riga della percentuale
       (IN BILICO). */
    /* ⚠️⚠️ **Le colonne si spartiscono la riga, non si stringono al centro**
       (Mattia, 23/10/2026). Con `justifyContent: center` le quattro voci
       stavano appiccicate in mezzo e i due terzi ai lati restavano vuoti: ora
       ogni voce è `flex: 1` e i divisori restano larghi un pixel, quindi le
       colonne vengono tutte uguali e i divisori cadono nei punti giusti.
       ⚠️ `minWidth: 0` su ogni voce: senza, una scritta lunga allargherebbe la
       sua colonna e romperebbe l'uguaglianza invece di andare a capo. */
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
      /* ⚠️ Lo spazio sotto i consigli è **più largo di prima** (Mattia,
         22/10/2026): i consigli e la data sono due cose diverse — *cosa
         farei* e *quando si gioca* — e stavano appiccicate come se fossero
         la stessa riga. */
      /* ⚠️⚠️ **Senza lo spazio grande sotto quando questa è l'ultima riga**
         (23/10/2026). I 24px di `SP.sez` c'erano per staccare i consigli dalla
         data, che stava sotto: spostata la data in cima, quello spazio non
         separa più niente — teneva alta la card e basta. Era metà
         dell'accorciamento chiesto da Mattia.
         ⚠️ Con quattro voci lo spazio orizzontale si stringe: `SP.s` invece di
         `SP.l`, perché i divisori contano come colonne. */
      gap: conteggi ? SP.s : (compatta ? SP.m : SP.l),
      marginBottom: ultimo ? 0 : (compatta ? SP.s : SP.sez) }}>
      {[
        ['O/U', consiglioOver(gol.over, mercatoOver25(p))],
        ['GG/NG', consiglioGg(gol.gg)],
        /* ⚠️⚠️ **Angoli e gialli accanto agli altri due, con gli stessi
           divisori** (Mattia, 23/10/2026): sono quattro risposte alla stessa
           domanda — *come viene questa partita*. ⚠️ Arrivano da fuori come i
           consigli: la testata non calcola niente, e in lista non ci sono
           perché lì i conteggi non sono caricati. */
        ...(conteggi ?? []),
      ].filter(Boolean).map(([et, cons], i) => {
        // ⚠️⚠️ **Lo scarto dalla base è il numero che rende leggibile il
        // consiglio**, e senza di lui una parola sola mente per omissione:
        // `UNDER 3,5` si avvera il 75% delle volte ma **da solo** arriva il
        // 71%, mentre `OVER 2,5` al 66% vale +15. Misurato, lo scarto sta fra
        // +3 e +15 a seconda della riga: la percentuale nuda fa sembrare forte
        // il consiglio debole e debole quello forte.
        const base = cons?.chiave ? BASI_GOL[cons.chiave] : null
        const scarto = cons?.p != null && base != null ? cons.p - base : null
        // verde solo dove lo scarto è grande davvero: sotto i 5 punti il
        // consiglio sta ripetendo quello che è già vero
        const tinta = scarto == null ? C.fioco
          : scarto >= 0.10 ? C.verde : scarto >= 0.05 ? C.testo : C.spento
        return (
          <Fragment key={et}>
          {i > 0 && <div style={{ width: 1, background: alpha(C.testo, 0.12) }} />}
          <div style={{ lineHeight: 1.25, textAlign: 'center', flex: 1, minWidth: 0 }}>
            {/* ⚠️ **Ogni riga porta il nome della domanda** (Mattia, 15/10:
                *"in bilico da solo non si capisce"*): `IN BILICO` da solo non
                dice **su cosa**, e il Goal tace nel 65% dei casi — cioè nella
                maggior parte delle partite quella riga era una parola senza
                soggetto.
                ⚠️ **E chi ha parlato va scritto**: sul 2,5 il consiglio può
                venire dalle quote (71% di volte giuste) o dal nostro modello
                (63%), e sono due cose di valore diverso. Stessa regola della
                colonna QUOTA, che dice sempre `BET365` o `MEDIA`. */}
            <Etichetta style={{ fontSize: compatta ? 7 : 8, letterSpacing: '0.1em' }}>
              {et}{cons?.fonte === 'mercato' && <span style={{ color: C.oroChiaro }}> · quote</span>}
            </Etichetta>
            <div style={{
              fontFamily: F.mono, fontWeight: 700, fontSize: compatta ? 10 : CORPO_CONSIGLIO,
              letterSpacing: '0.03em', whiteSpace: 'nowrap',
              // ⚠️ IN BILICO resta spento: un consiglio che non c'è non deve
              // avere lo stesso peso di uno che c'è.
              color: cons?.esito ? C.bianco : C.fioco,
            }}>{cons?.esito || 'IN BILICO'}</div>
            {/* ⚠️ La percentuale si vede **anche senza lo scarto**: angoli e
                cartellini non hanno una base per soglia con cui confrontarsi
                (quella misurata sta nelle loro card, per competizione), ma
                `52%` da solo è comunque il numero che si legge. Lo scarto,
                dove c'è, resta la cosa che rende leggibile un consiglio. */}
            {cons?.esito && cons?.p != null && (
              <div style={{ fontFamily: F.mono, fontSize: compatta ? 9 : 10, whiteSpace: 'nowrap', color: C.spento }}>
                {(cons.p * 100).toFixed(0)}%
                {scarto != null && <span style={{ color: tinta, fontWeight: 700 }}>
                  {' '}{scarto >= 0 ? '+' : ''}{(scarto * 100).toFixed(0)}
                </span>}
              </div>
            )}
          </div>
          </Fragment>
        )
      })}
    </div>
  )
}


export function Posizione({ nome, colore, posto, compatta = false, style }) {
  const tinta = COLORE_FASCIA[fasciaDi(posto)] || colore
  const iniziali = nome.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
  return (
    <div title={posto ? `${posto.posizione}° su ${posto.squadre} · ${posto.punti} punti in ${posto.giocate}` : nome}
      style={{
        flexShrink: 0, borderRadius: R.s, padding: compatta ? '1px 3px' : '1px 4px',
        background: alpha(tinta, 0.12), border: `1px solid ${alpha(tinta, 0.4)}`,
        color: tinta, fontFamily: F.mono, fontWeight: 700, lineHeight: 1.2,
        // ⚠️ Scesa di un passo il 21/10/2026 (Mattia: *"anche la posizione è
        // troppo grande"*): ogni px che lascia qui è un px che va al nome.
        fontSize: compatta ? S.micro : S.minuta, whiteSpace: 'nowrap',
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

/**
 * ⚠️⚠️ **La traccia non può essere un colore del tema: deve essere "un po' più
 * chiara di quello che c'è sotto".** Il 21/10/2026, dando alle righe della
 * lista il fondo `C.attiva`, la traccia — che era `C.attiva` anche lei — è
 * diventata **1,00:1 contro la riga**, cioè invisibile: restava solo la parte
 * piena, e senza vedere dove finisce la corsa non si capisce più **a che punto
 * della percentuale** sei (trovato da Mattia).
 * ⚠️ Non si cura rimettendo un bordo: il bordo nasconderebbe il sintomo
 * rimettendo una linea, mentre il guasto è che due superfici hanno lo stesso
 * colore. `alpha(bianco, .12)` si schiarisce su **qualunque** fondo — la riga
 * della lista e la card della scheda — quindi non può più sparire per colpa di
 * un cambio di superficie.
 */
export const Barra = ({ frazione, colore, altezza = 6 }) => (
  <div style={{ height: altezza, borderRadius: altezza, background: C.traccia, overflow: 'hidden' }}>
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
      /* ⚠️⚠️ **`opacity: 1` scritta qui apposta.** `index.css` spegne al 45%
         ogni `<button>` disabilitato, ed è giusto per un comando che non si
         può premere — ma questo **mostra un dato a chi non lo può toccare**:
         un utente normale legge da qui quante stelline ha la partita.
         Spegnerlo vorrebbe dire nascondere l'informazione a metà del gruppo. */
      style={{ opacity: 1, display: 'flex', alignItems: 'center', gap: SP.s, padding: `${SP.xs}px ${SP.m}px`, borderRadius: R.pastiglia,
        background: voti ? alpha(C.oro, 0.10) : 'transparent', border: `1px solid ${voti ? alpha(C.oro, 0.3) : C.bordo}`,
        cursor: puoVotare ? 'pointer' : 'default' }}>
      {/* ⚠️ Piena quando qualcuno l'ha votata, vuota quando no: è la stessa
          distinzione che facevano `★` e `☆`, con lo spessore del resto del set. */}
      <span style={{ display: 'flex', color: mio ? C.oro : voti ? alpha(C.oro, 0.55) : C.fioco }}>
        <Icona nome="stella" misura={15} pieno={!!voti} />
      </span>
      <span style={{ fontSize: S.base, fontFamily: F.mono, fontWeight: 700, color: voti ? C.oro : C.fioco }}>{voti}/3</span>
    </button>
  )
}

/**
 * ⚠️⚠️ **`senzaData` e `conteggi` li passa SOLO la scheda partita**
 * (23/10/2026). Questa testata la usano in sette posti — la lista, la scheda,
 * le due finestre di scelta, lo Storico, Road to weekend — e cambiarla per
 * tutti vorrebbe dire due cose: la lista cambierebbe forma senza che nessuno
 * l'abbia chiesto, e soprattutto i conteggi costano **una chiamata per
 * competizione**: nella scheda è una, in una lista di duecento partite di
 * quindici campionati sarebbero quindici.
 * Passandoli da fuori, gli altri sei posti restano identici e non chiamano
 * niente.
 */
export default function TestataPartita({ p, cat, compatta = false, gol = null,
                                         senzaData = false, conteggi = null }) {
  const c = CATEGORIE[cat]
  const classifiche = usaClassifiche()
  /* ⚠️ Scritta **una volta** e messa in due posti diversi a seconda di
     `senzaData`: nella scheda la data sta nella riga del campionato, in
     lista sotto le squadre — ma la riga è **una sola**, perché due copie
     prima o poi mostrano due cose diverse. */
  const dataOra = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: SP.xl }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: SP.s, fontSize: compatta ? S.corpo : CORPO_CONSIGLIO,
        fontWeight: 600, fontFamily: F.mono, color: C.testo }}>
        <Icona nome="calendario" misura={13} style={{ color: C.spento }} />
        {giorno(p.data).toUpperCase()}
      </span>
      {p.ora && (
        <span style={{ display: 'flex', alignItems: 'center', gap: SP.s, fontSize: compatta ? S.corpo : CORPO_CONSIGLIO,
          fontWeight: 600, fontFamily: F.mono, color: C.testo }}>
          <Icona nome="ora" misura={13} style={{ color: C.spento }} />
          {p.ora.slice(0, 5)}
        </span>
      )}
    </div>
  )
  return (
    <>
      {/* ⚠️⚠️ **Nella scheda la data NON è qui** (Mattia, 23/10/2026): è salita
          nella riga del campionato e delle stelle, dove c'era spazio vuoto —
          `senzaData` dice alla testata di non disegnarla. Prima l'avevo messa
          in cima su una riga sua, e una riga sua costa comunque altezza: il
          punto era guadagnarne.
          ⚠️ In lista resta sotto, com'era: lì la riga si scorre a decine. */}
      {/* ⚠️ `center` e non più `start`: con il tondo sopra il nome le due
          colonne andavano allineate in alto, ora che è in linea col nome
          vanno allineate al centro, come il blocco della giocata in mezzo. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        {[[p.casa, '1'], [p.trasferta, '2']].map(([sq, segno], i) => (
          <div key={sq} style={{ display: 'contents' }}>
            {/* ⚠️ In mezzo alle squadre sta **la giocata** (10/10/2026, scelta di
                Mattia): è la cosa che si decide, e deve stare dove l'occhio va
                per primo. L'attendibilità era qui e si è spostata nella barra
                sotto, con gli altri quattro numeri.
                ⚠️ La larghezza minima è **64 e non 76** in versione compatta:
                quei 12px servivano al nome delle squadre, e qui dentro non li
                usava nessuno — l'etichetta GIOCATA ne chiede una cinquantina. */}
            {i === 1 && (
              <div style={{ alignSelf: 'center', textAlign: 'center', padding: '0 6px', width: LARGA_GIOCATA(compatta) }}>
                <Etichetta style={{ fontSize: S.micro, letterSpacing: '0.12em', marginBottom: 4 }}>giocata</Etichetta>
                {/* ⚠️ Il corpo lo decide quanto è lunga la giocata: `2` resta
                    grande, `1+O1,5` scende fino a stare nella colonna. È la
                    scritta che si adatta alla colonna, non il contrario. */}
                {/* ⚠️ Anche l'ALTEZZA è riservata, per la stessa ragione della
                    larghezza: se la combinata scende a 13px la sua riga di
                    testo è più bassa, il blocco si accorcia e **la barra si
                    alza** rispetto alle altre righe. Lo spazio è quello della
                    giocata grande, qualunque corpo abbia poi la scritta. */}
                <div style={{
                  fontSize: corpoGiocata(pronosticoDa(p.giocata), compatta),
                  fontWeight: 700, fontFamily: F.mono, color: c.colore, lineHeight: 1.1,
                  minHeight: Math.round((compatta ? 19 : 24) * 1.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{pronosticoDa(p.giocata)}</div>
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
                {/* ⚠️⚠️ **I due consigli NON stanno più qui sotto** (Mattia,
                    22/10/2026): incolonnati dentro i 76px della giocata
                    facevano crescere la card di sessanta pixel, e per starci
                    dentro erano a corpo 11 con `nowrap`. Sono scesi su una
                    riga loro, larga quanto la card — vedi `Consigli` più
                    sotto. Qui resta quello che la giocata **è**: l'etichetta,
                    il pronostico e la barra. */}
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
            {/* ⚠️ **`nowrap`, per richiesta di Mattia (21/10/2026).** Prima
                il blocco andava a capo e la targhetta scendeva sotto il nome
                quando non ci stava: risolveva lo sbordo ma **sfalsava
                l'allineamento**, perché quel lato diventava alto due righe e
                l'altro no. Adesso la targhetta resta sempre in linea e a
                reggere l'altezza è `DUE_RIGHE` sul nome. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexWrap: 'nowrap', gap: compatta ? 4 : SP.s, minWidth: 0 }}>
              <div style={{
                fontSize: corpoNome(sq, compatta),
                fontWeight: 700, fontFamily: F.sans, letterSpacing: '0.02em',
                // ⚠️ `break-word` e non `anywhere`: spezza una parola solo se
                // **da sola** non entra nella riga, mentre `anywhere` la
                // spezzava appena conveniva. Resta l'ultima difesa.
                textTransform: 'uppercase', lineHeight: 1.15, overflowWrap: 'break-word',
                textAlign: 'center', minWidth: 0,
                // lo spazio è riservato: una riga o due, l'altezza non cambia
                minHeight: DUE_RIGHE(compatta), display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: p.segno === segno ? C.testo : C.spento,
              }}>{sq}</div>
              <Posizione nome={sq} colore={p.segno === segno ? c.colore : C.grigioFioco} compatta={compatta}
                posto={postoDi(classifiche, p.div, sq)} />
            </div>
          </div>
        ))}
      </div>

      {/* ⚠️ Il calendario e l'orologio erano **emoji** (`📅` `🕐`): le disegna
          il sistema operativo, quindi la stessa riga aveva tre aspetti su tre
          telefoni, e restavano a colori pieni accanto a un testo spento. Qui
          sono due segni del set, che prendono il colore del testo accanto. */}
      {/* ⚠️ **Nella scheda data e ora scendono da `S.grande` a `S.media`**
          (Mattia, 22/10/2026): erano il testo più grande del blocco dopo i nomi
          delle squadre, e non sono il dato — sono il contesto. In lista
          restano come erano. */}
      {/* ⚠️ La linea separa **il blocco delle squadre** da quello che viene
          dopo: i due consigli quando ci sono, e sempre la data. In lista i
          consigli non esistono, quindi lì sotto la linea c'è solo la data —
          com'era prima. */}
      <div style={{ marginTop: compatta ? 9 : SP.xl, paddingTop: compatta ? SP.m : SP.l,
        borderTop: `1px solid ${C.bordoTenue}` }}>
      {gol && <Consigli p={p} gol={gol} compatta={compatta} conteggi={conteggi} ultimo={senzaData} />}
      {!senzaData && dataOra}
      </div>
    </>
  )
}
