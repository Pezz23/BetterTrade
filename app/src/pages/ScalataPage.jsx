import { useState, useMemo, useEffect, useRef } from 'react'
import { C, F, alpha, S, SP, R } from '../theme'
import { Card, Etichetta, Attesa } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { usaClassifiche, postoDi } from '../hooks/usaClassifiche'
import { usaScalate } from '../hooks/usaScalate'
import { usaPreferenze } from '../hooks/usaPreferenze'
import { Posizione } from '../components/TestataPartita'
import SchedaScorrevole from '../components/SchedaScorrevole'
import DettaglioPartita from '../components/DettaglioPartita'
import Icona from '../components/Icona'
import ScegliGamba from '../components/ScegliGamba'
import { valutaPartita } from '../lib/vpm'
import { sigla } from '../lib/campionati'
import { weekendDi, categoria, SOGLIE_DEFAULT, iniziaDopo } from '../lib/attendibilita'
import { pct, eur, gg, quando } from '../lib/formato'
import {
  METODO, NOMI_REGOLA, QUOTA_MINIMA_GAMBA, QUOTA_MINIMA_SCHEDINA, CONSIGLIATO,
  postaDi, fasce, spezzaFasce, spezzaAlMinimo, giorno, casseDi, percentualeConsigliata, applicaIncasso,
  puoSpezzare, contoDi,
} from '../lib/scalata'

// ROAD TO WEEKEND — la road map delle giocate del weekend.
//
// ⚠️⚠️ **È uno strumento di pianificazione, non un ottimizzatore** (Mattia,
// 15/10/2026): *"lo scopo è avere una road map precisa delle giocate del week
// end, possibilità di modificare la quota, e accumulare quanto voglio con un
// consiglio da parte dell'app"*. Quindi la pagina **propone** e lui decide:
// quali partite, con che quota, quanto mettere via.
//
// ⚠️ **Nessuno stop automatico, in nessun passo** (richiesta esplicita): la
// scalata si ferma solo col tasto. Un'app che chiude da sé toglierebbe
// l'unica cosa che la misura non sa fare — il giudizio su *quella* partita.
//
// ⚠️ Quello che il backtest ha detto resta scritto in `lib/scalata.js` e in
// STATO.md: un passo rende circa il 98%, e su otto stagioni la scalata
// meccanica chiudeva in utile 1 volta su 8. Mattia lo sa e vuole provarla con
// la selezione a mano. **Il registro dirà chi ha ragione**, ed è esattamente
// il motivo per cui la pagina salva tutto.

/**
 * ⚠️ **Un colore per blocco**, e serve a legare le due viste: lo stesso verde
 * sta sul PASSO 1 e sulle sue righe nell'elenco in fondo, così si vede a colpo
 * d'occhio quali partite finiscono in quale passo senza leggere gli orari.
 * L'ordine parte dal verde per richiesta di Mattia; dopo i quattro che ha
 * chiesto si continua con gli altri token del tema, mai con valori scritti a
 * mano (convenzione del progetto).
 */
const COLORI_PASSO = [C.verde, C.giallo, C.rosso, C.blu, C.viola, C.menta, C.ambra, C.celestePieno, C.oroChiaro, C.acciaio]
const coloreDi = (i) => COLORI_PASSO[i % COLORI_PASSO.length]

const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const nomeGiorno = (d) => d ? GIORNI[new Date(d + 'T12:00:00').getDay()] : ''


/**
 * ⚠️⚠️ **BOZZA del 26/10/2026 — la card in evidenza del passo da giocare.**
 * Mattia: *"la parte passi è troppo confusionaria"*. La card di prima mette
 * sullo stesso piano una ventina di cose; qui sopra la piega ce n'è **una**:
 * quanto punto, a che quota, e cosa succede se vince. Le partite e i conti
 * scendono in due **tendine**, che dentro disegnano la card di prima (`Passo`
 * con `parte` e `nudo`) — non una seconda versione.
 * ⚠️ **Reversibile**: `NUOVO_PASSO = false` rimette la card di prima per
 * tutti i passi, senza toccare altro.
 */
const NUOVO_PASSO = true

function Passo({ numero, gambe, giorno: gio, ora, posta, postaIniziale, accumulato, colore, classifiche,
                quote, setQuote, perc, setPerc, esito, setEsito, onToglie, prossima, onAggiunge,
                onQuota = null, onSpezza = null, onApri = null, onManuale = null, tocca = true,
                stelleDi = () => 0, anteprima = false, fissato = false, onFissa = null, fermo = false,
                parte = 'tutto', nudo = false }) {
  // ⚠️ La quota della schedina è il **prodotto delle quote modificate**, non di
  // quelle scaricate: Mattia gioca su book diversi e con i bonus, e una pagina
  // che mostra la quota del consenso gli racconterebbe un piano che non è il suo.
  const quoteGambe = gambe.map(g => Number(quote[g.id] ?? g.quota) || 1)
  const quota = quoteGambe.reduce((a, q) => a * q, 1)
  const montante = posta * quota
  const consiglio = percentualeConsigliata({ numero, montante, puntata: posta, posta: postaIniziale, accumulato })
  const p = perc ?? consiglio
  const r = applicaIncasso(montante, p, posta)
  // ⚠️ L'esito vince sul colore del blocco: a piano finito conta com'è andata,
  // non quale fascia era.
  const tinta = esito === 'vinto' ? C.verde : esito === 'perso' ? C.rosso : colore

  /**
   * ⚠️⚠️ **«Fissa passo» NON è un esito**, e per questo è un tasto a parte
   * (Mattia, 23/10/2026). L'esito dice *com'è andata*; questo dice *questo
   * passo mi va bene, fammi vedere il prossimo*. Si comporta come l'esito —
   * si accende, si spegne ritoccandolo — ma non racconta niente di falso sul
   * risultato.
   * ⚠️ **Compare anche in anteprima**, e deve: senza, fissato il passo 2 non
   * ci sarebbe modo di arrivare al 3, e la catena si fermerebbe al secondo.
   */
  const tastoFissa = onFissa && !esito && tocca && (
    <button onClick={onFissa} style={{
      flex: 1, padding: '6px 0', fontFamily: F.sans, fontSize: S.base, cursor: 'pointer',
      color: fissato ? C.viola : C.spento,
      background: fissato ? `linear-gradient(${alpha(C.viola, 0.14)},${alpha(C.viola, 0.14)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(C.viola, fissato ? 0.5 : 0.18)}`,
    }}>{fissato ? '✓ fissato' : 'fissa passo'}</button>
  )

  // ⚠️ `parte` e `nudo` servono alla **card in evidenza** (`PassoHero`, bozza
  // del 26/10/2026): lì le partite e i conti stanno in due tendine, e questa
  // card ne disegna un pezzo per volta, senza cornice né intestazione. Il
  // disegno resta **uno solo**: la tendina mostra questa card, non una copia.
  const contenuto = (<>
      {!nudo && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Etichetta colore={tinta}>
          ● PASSO {numero} · {nomeGiorno(gio)} {gg(gio)} {ora && `· ${ora}`}
        </Etichetta>
        {/* ⚠️⚠️ **L'avviso dice QUANTO manca, non solo che manca** (Mattia,
            21/10/2026: *"il passo mi deve avvisare quanto la quota è sotto"*).
            La manopola «quota schedina ≥» è uscita dai filtri — il minimo è
            uno e non si negozia — quindi questa è l'unica cosa che lo dice, e
            *"sotto 2,00"* da solo costringe a fare la sottrazione a mente
            mentre si cerca una gamba da aggiungere. */}
        <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700,
          color: quota >= QUOTA_MINIMA_SCHEDINA ? C.oro : C.ambra }}>
          quota {quota.toFixed(2).replace('.', ',')}
          {quota < QUOTA_MINIMA_SCHEDINA && (
            <span style={{ fontSize: S.micro, color: C.ambra }}>
              {' · '}manca {(QUOTA_MINIMA_SCHEDINA - quota).toFixed(2).replace('.', ',')} al minimo {QUOTA_MINIMA_SCHEDINA.toFixed(2).replace('.', ',')}
            </span>
          )}
        </span>
      </div>}

      {parte !== 'conti' && <>
      {gambe.map((g, iG) => (
        <div key={g.id}>
        {/* ⚠️⚠️ **Il taglio sta FRA due gambe, non su una** (richiesta di
            Mattia, 21/10/2026: *"se mi propone 4 partite vicine devo poter
            dividerle in 2"*). Un tasto "spezza" sul passo dovrebbe indovinare
            **dove** tagliare — a metà? dopo la prima? — e con tre gambe non
            esiste una metà. Messo in mezzo, il punto di taglio è quello che
            si tocca: nessuna regola da ricordare.
            ⚠️ Non compare dopo l'ultima gamba (lì non c'è niente da staccare)
            né su un passo già giocato: quello che è accaduto non si tocca. */}
        {/* ⚠️⚠️ **Il taglio si offre OVUNQUE, e avvisa invece di vietare**
            (Mattia, 23/10/2026). Il 21/10 l'avevo chiuso ai soli punti dove
            **tutt'e due** i pezzi arrivano a 2,00, e il risultato è che non
            compariva quasi mai: col taglio automatico a 2,00 un passo da
            quattro gambe sta a 2,07, e spezzarlo in 2+2 fa 1,44 e 1,44.
            Cioè vietava proprio il caso per cui era stato chiesto — *"me ne
            propone 4 e io ne voglio 2"*.
            ⚠️ **Chi decide è lui, e il minimo resta scritto**: il pezzo sotto
            2,00 lo dice da sé, in ambra, con quanto gli manca (riga sopra). È
            la stessa scelta dei filtri: la pagina avvisa, non impedisce.
            ⚠️ `puoSpezzare` **non si butta**: qui serve a colorare il comando,
            cioè a far vedere *prima* di toccare che quel taglio lascia un
            pezzo corto. */}
        {iG > 0 && onSpezza && !esito && tocca && (() => {
          const aNorma = puoSpezzare(quoteGambe, iG)
          return (
          <button onClick={() => onSpezza(iG)}
            title={aNorma ? 'Da qui in giù diventa un passo a parte'
              : `Da qui in giù diventa un passo a parte — ma uno dei due pezzi resta sotto ${QUOTA_MINIMA_SCHEDINA.toFixed(2).replace('.', ',')}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '3px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              color: aNorma ? C.fioco : C.ambra, fontFamily: F.sans,
              fontSize: S.micro, letterSpacing: '0.04em' }}>
            <span style={{ flex: 1, height: 1, background: alpha(C.testo, 0.10) }} />
            spezza qui{aNorma ? '' : ' ⚠'}
            <span style={{ flex: 1, height: 1, background: alpha(C.testo, 0.10) }} />
          </button>
          )
        })()}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 34px 58px 20px',
          gap: 6, alignItems: 'center', padding: '6px 0', borderTop: `1px solid ${alpha(C.testo, 0.06)}` }}>
          {/* ⚠️⚠️ **Si apre la scheda toccando i NOMI, non tutta la riga**
              (Mattia, 22/10/2026: *"vorrei cliccare la partita e vedere la
              scheda"*). Nella riga ci sono già due comandi — il campo della
              quota e la × che la toglie dal passo — e un contenitore
              cliccabile sopra di loro vuol dire aprire un foglio a tutto
              schermo mentre si cerca di correggere una quota.
              ⚠️ **È la stessa scheda della pagina Partite**, non una versione
              ridotta: `DettaglioPartita` dentro `SchedaScorrevole`. Un secondo
              posto per la stessa cosa prima o poi diverge — ed è la regola per
              cui `TestataPartita` è condivisa fra lista e scheda.
              ⚠️ L'id da aprire è `prossima_id` quando la gamba viene dal
              registro: lì `id` è la gamba, non la partita. */}
          <div onClick={() => onApri?.(g.prossima_id ?? g.id)} role={onApri ? 'button' : undefined}
            style={{ minWidth: 0, cursor: onApri ? 'pointer' : 'default' }}>
            {/* ⚠️ **I numeri SOPRA le squadre** (richiesta di Mattia, 18/10):
                att · scelta · VPM · campionato · orario. Si guarda prima
                *quanto vale la partita* e poi *quale partita è* — chi compone
                una schedina cerca i numeri, i nomi li riconosce comunque.
                ⚠️ `Number(g.vpm)` e non `g.vpm.toFixed()`: dal database i
                numerici arrivano come **stringhe**, e sul piano salvato quel
                `.toFixed` sarebbe stato uno schermo bianco. */}
            {/* ⚠️ **Acceso il VALORE, spenta l'etichetta**: `att` e `scelta`
                sono parole che si imparano una volta, i numeri si leggono ogni
                volta. Accendere anche le etichette raddoppierebbe il peso della
                riga senza aggiungere niente da leggere. */}
            <div style={{ fontSize: S.micro, fontFamily: F.mono, color: C.spento, marginBottom: 3 }}>
              att <b style={{ color: C.testo }}>{pct(g.att)}</b>
              {' · '}scelta <b style={{ color: C.testo }}>{pct(g.scelta)}</b>
              {g.vpm != null && <> · VPM <b style={{ color: C.testo }}>{Number(g.vpm).toFixed(2).replace('.', ',')}</b></>}
              {' · '}{sigla(g.div)} · {g.ora?.slice(0, 5)}
              {/* ⚠️⚠️ **La stella si vede DENTRO il passo** (23/10/2026). Da
                  quando scavalca i filtri, una gamba può stare lì con
                  l'attendibilità al 40% — e senza questo segno sembrerebbe un
                  errore del programma invece di una scelta di chi l'ha
                  stellata. ⚠️ È anche l'unico modo di capire perché il passo
                  si è spezzato in quel punto: una stella a quota bassa sposta
                  il taglio. */}
              {stelleDi(g.prossima_id ?? g.id) > 0 && (
                <span title="entrata perché stellata" style={{ color: C.oro }}> · ★</span>
              )}
            </div>
            {/* ⚠️ **La posizione sta a destra di OGNI squadra**, non in una
                colonna a parte (richiesta di Mattia, 18/10/2026): così si legge
                *"Nott'm Forest 15/20"* come una cosa sola, invece di dover
                accoppiare due targhette incolonnate ai due nomi.
                ⚠️ È la stessa `Posizione` della testata — formato `1/20`,
                colorata a terzi del campionato — solo rimpicciolita con uno
                `style`: **non una copia**, perché un secondo posto per la stessa
                cosa prima o poi diverge.
                ⚠️ `flexWrap` e `minWidth: 0` sui nomi: su un telefono i due
                blocchi vanno a capo invece di tagliare il nome, e senza
                `minWidth: 0` un elemento flessibile non scende sotto il suo
                contenuto — la trappola della griglia della Slot. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: S.corpo, color: C.testo }}>
              {[g.casa, g.trasferta].map((sq, n) => (
                <span key={sq} style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  {n === 1 && <span style={{ color: C.fioco, marginRight: 1 }}>—</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sq}</span>
                  {/* ⚠️ **Alta come il testo che le sta accanto, non di più**
                      (correzione di Mattia, 18/10): corpo 7 senza riempimento
                      verticale fa ~11px, cioè appena sotto i 12 del nome. Una
                      targhetta più alta del nome diventa l'elemento principale
                      della riga, mentre è un contesto. Il riempimento resta
                      solo ai lati, o le cifre toccherebbero il bordo. */}
                  <Posizione nome={sq} colore={C.grigioFioco} posto={postoDi(classifiche, g.div, sq)}
                    style={{ fontSize: S.micro, padding: '0 3px', borderRadius: 3, lineHeight: 1.3, fontWeight: 600 }} />
                </span>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: S.corpo, fontWeight: 700, color: C.testo, textAlign: 'center' }}>
            {g.giocata}
          </div>
          {/* ⚠️ La quota è **modificabile**: book diversi e bonus. Il valore
              scaricato resta come segnaposto, così si vede se l'hai cambiata. */}
          {/* ⚠️ `readOnly` e non `disabled`: la quota si deve **leggere** anche
              da spettatori, e un campo disabilitato in questo tema diventa
              quasi invisibile (`fantasma` è 2,27:1). */}
          <input value={quote[g.id] ?? ''} placeholder={Number(g.quota).toFixed(2)} readOnly={!tocca}
                onChange={e => setQuote(q => ({ ...q, [g.id]: e.target.value.replace(',', '.') }))}
                /* ⚠️ Si scrive nel registro **uscendo dal campo**, non a ogni
                   tasto: altrimenti "1,85" passerebbe per "1", "1,", "1,8" —
                   e "1" non è una quota valida. */
                onBlur={() => { if (onQuota && quote[g.id]) onQuota(g.id, quote[g.id]) }}
                inputMode="decimal" style={{ width: '100%', background: C.pozzo, color: C.oro,
                  border: `1px solid ${alpha(C.oro, 0.3)}`, borderRadius: 6, padding: '4px 6px',
                  fontFamily: F.mono, fontSize: S.corpo, textAlign: 'center' }} />
          {tocca && <button onClick={() => onToglie(g.id)} title="togli dal passo"
            style={{ background: 'transparent', border: 'none', color: C.fioco, cursor: 'pointer', fontSize: S.grande }}>×</button>}
        </div>
        </div>
      ))}

      {/* ⚠️⚠️ **Sotto la consigliata, e con un'aria diversa** (Mattia,
          22/10/2026). Sono due gesti diversi: quello sopra **accetta** la
          proposta dell'app (e dice quale partita sarebbe), questo **la
          scavalca** aprendo il calendario intero. Lo stesso aspetto per
          entrambi vorrebbe dire che l'app consiglia anche il secondo, e non è
          vero: lì sotto la qualità la giudichi tu.
          ⚠️ C'è **anche quando non c'è niente da consigliare**: è il caso in
          cui serve di più — la fascia è finita e il passo è sotto quota. */}
      {onManuale && !esito && tocca && (
        <button onClick={onManuale} style={{ width: '100%', marginTop: 6, padding: '6px 8px',
          background: 'transparent', border: `1px dashed ${alpha(C.testo, 0.18)}`, color: C.spento,
          fontFamily: F.sans, fontSize: S.minuta, cursor: 'pointer', textAlign: 'left' }}>
          + aggiungi partita manuale
        </button>
      )}

      {/* ── la posta, il consiglio, e la decisione ──────────────────────── */}
      {/* ⚠️ **Il tasto dice QUALE partita aggiungerebbe**, non "aggiungi": un
          tasto che pesca al buio costringe a premere per sapere cosa fa. Prende
          la prima consigliata non ancora in nessun passo, in ordine di data e
          ora — che è il senso di *"aggiungo le partite successive"*. */}
      {prossima && tocca && (
        <button onClick={onAggiunge} style={{ width: '100%', marginTop: 6, padding: '6px 8px',
          background: 'transparent', border: `1px dashed ${alpha(colore, 0.4)}`, color: colore,
          fontFamily: F.sans, fontSize: S.minuta, cursor: 'pointer', textAlign: 'left' }}>
          + {prossima.casa} — {prossima.trasferta} @{Number(prossima.quota).toFixed(2).replace('.', ',')}
          {' '}<span style={{ color: C.fioco }}>({nomeGiorno(giorno(prossima.data))} {gg(prossima.data)} {prossima.ora?.slice(0, 5)})</span>
        </button>
      )}
      </>}

      {/* ⚠️⚠️ **In anteprima i soldi non si mostrano, e non è pudore.** Un
          passo staccato a mano si vede subito — è quello che hai appena fatto,
          non il futuro — ma la sua **puntata non esiste ancora**: è la cassa
          che arriva dal passo prima, e quel passo non è chiuso. Mettere un
          numero lì vorrebbe dire inventarlo, ed è esattamente il motivo per
          cui i passi successivi restano nascosti. Qui si vede **cosa** si
          gioca, non **quanto**. */}
      {parte !== 'gambe' && (anteprima ? (<>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${alpha(C.testo, 0.1)}`,
          fontFamily: F.sans, fontSize: S.minuta, color: C.fioco, textAlign: 'center', lineHeight: 1.5 }}>
          {/* ⚠️ Dopo un passo perso la puntata non arriva dal passo prima:
              arriva da ⟳ RIPARTI, che apre un giro nuovo sul conto. */}
          {fermo ? 'la scalata è ferma: questo passo riparte con ⟳ RIPARTI' : `la puntata si calcola quando chiudi il passo ${numero - 1}`}
        </div>
        {tastoFissa && <div style={{ display: 'flex', marginTop: 8 }}>{tastoFissa}</div>}
      </>) : <>

      {/* ── Sotto la linea: puntata · incassato · utile ──────────────────── */}
      {/* ⚠️ I nomi sono quelli che usa Mattia (15/10/2026): *puntata* e non
          "posta", *incassato* e non "se vince", *da rigiocare* e non
          "rigiochi". Un'app che chiama le cose con parole sue costringe a
          tradurre mentre si decide. */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${alpha(C.testo, 0.1)}`,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, textAlign: 'center' }}>
        {[['PUNTATA', eur(posta), C.testo], ['INCASSATO', eur(montante), C.verde], ['UTILE', eur(r.utile), C.oroChiaro]].map(([l, v, col]) => (
          <div key={l}>
            <Etichetta>{l}</Etichetta>
            <div style={{ fontFamily: F.mono, fontSize: S.grande, fontWeight: 700, color: col, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── Staccato: quanto se ne mette via, in % DELL'UTILE ───────────── */}
      {/* ⚠️ La percentuale è l'unica cosa che resta in percentuale (richiesta
          di Mattia): tutto il resto è in euro, perché è in euro che si decide. */}
      <div style={{ marginTop: 10, padding: '8px 10px',
        background: `linear-gradient(${alpha(C.oro, .05)},${alpha(C.oro, .05)}), ${C.card}`,
        border: `1px solid ${alpha(C.oro, 0.22)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <Etichetta>METTI VIA</Etichetta>
          <input value={perc ?? ''} placeholder={consiglio.toFixed(0)} inputMode="decimal" readOnly={!tocca}
            onChange={e => setPerc(e.target.value.replace(',', '.'))}
            style={{ width: 54, background: C.pozzo, color: C.testo, border: `1px solid ${C.bordo}`,
              borderRadius: 6, padding: '4px 6px', fontFamily: F.mono, fontSize: S.media, textAlign: 'center' }} />
          <span style={{ color: C.spento, fontFamily: F.sans, fontSize: S.base }}>% dell&apos;utile</span>
          {/* ⚠️ Il consiglio si vede sempre, anche quando lo si scavalca: è
              l'unico modo di sapere *da cosa* ti stai scostando. */}
          <span style={{ color: C.fioco, fontFamily: F.sans, fontSize: S.minuta }}>consigliato {consiglio.toFixed(0)}%</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8, textAlign: 'center' }}>
          <div>
            <Etichetta colore={C.verde}>ACCUMULO</Etichetta>
            <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: C.verde, marginTop: 2 }}>{eur(r.via)}</div>
          </div>
          <div>
            <Etichetta colore={C.oro}>DA RIGIOCARE</Etichetta>
            <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: C.oro, marginTop: 2 }}>{eur(r.rigioca)}</div>
          </div>
        </div>
        {r.resto > 0.005 && (
          <div style={{ fontSize: S.micro, fontFamily: F.sans, color: C.fioco, marginTop: 5, textAlign: 'center' }}>
            l&apos;arrotondamento per difetto manda {eur(r.resto)} in accumulo
          </div>
        )}
      </div>

      {/* ⚠️ I tre tasti dell'esito spariscono per chi guarda e basta: sono
          l'unica cosa della card che **scrive nel registro**. */}
      {tocca && parte === 'tutto' && NUOVO_PASSO && (
        <div style={{ marginTop: SP.m }}>
          <TastiEsito esito={esito} setEsito={setEsito} fissato={fissato} onFissa={tocca ? onFissa : null} />
        </div>
      )}
      {tocca && parte === 'tutto' && !NUOVO_PASSO && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {/* ⚠️⚠️ **Nessun blocco, nemmeno a scalata aperta** (Mattia, 18/10:
            *"tutto troppo vincolante"*). Si può annullare un esito, cambiare
            una quota, togliere o aggiungere una gamba in qualunque momento:
            le casse **si ricalcolano dalla catena** (`casseDi`), quindi non
            c'è niente da disfare. Era il secondo numero memorizzato a rendere
            necessari i divieti, non il registro. */}
        {[['vinto', C.verde], ['perso', C.rosso], [null, C.spento]].map(([e, col]) => (
          <button key={e || 'aperto'} onClick={() => setEsito(e)} style={{
            flex: 1, padding: '6px 0', fontFamily: F.sans, fontSize: S.base, cursor: 'pointer',
            color: esito === e ? col : C.spento,
            background: esito === e ? `linear-gradient(${alpha(col, 0.14)},${alpha(col, 0.14)}), ${C.card}` : C.card,
            border: `1px solid ${alpha(col, esito === e ? 0.5 : 0.18)}`,
          }}>{e === 'vinto' ? '✓ vinto' : e === 'perso' ? '✗ perso' : 'da giocare'}</button>
        ))}
        {/* ⚠️ A destra di «da giocare», come chiesto: è il gesto che viene
            dopo, quando il passo è composto e non c'è ancora niente da dire
            sull'esito. */}
        {tastoFissa}
      </div>}
      </>)}
  </>)
  return nudo ? <div>{contenuto}</div>
    : <Card style={{ marginBottom: 8, borderColor: alpha(tinta, 0.35) }}>{contenuto}</Card>
}

/**
 * I tasti dell'esito, **piccoli** (Mattia, 26/10/2026: *"occupano troppo
 * spazio, facciamoli icone o più piccoli"*): quattro quadratini allineati a
 * destra invece di una fila a tutta larghezza. Il significato sta nel segno e
 * nel colore, la parola nel `title`.
 * ⚠️ 34×30 e non meno: è il bersaglio di un dito, non di un mouse.
 */
function TastiEsito({ esito, setEsito, fissato = false, onFissa = null }) {
  const tasto = (attivo, col, onClick, segno, titolo) => (
    <button key={titolo} onClick={onClick} title={titolo} aria-label={titolo} style={{
      width: 34, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.sans, fontSize: S.grande, cursor: 'pointer', borderRadius: R.m,
      color: attivo ? col : C.spento,
      background: attivo ? `linear-gradient(${alpha(col, 0.16)},${alpha(col, 0.16)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(col, attivo ? 0.55 : 0.2)}`,
    }}>{segno}</button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP.s, justifyContent: 'flex-end' }}>
      <span style={{ fontFamily: F.sans, fontSize: S.micro, color: C.fioco, marginRight: 'auto' }}>
        {esito === 'vinto' ? 'vinto' : esito === 'perso' ? 'perso' : fissato ? 'fissato' : 'da giocare'}
      </span>
      {tasto(esito === 'vinto', C.verde, () => setEsito('vinto'), '✓', 'vinto')}
      {tasto(esito === 'perso', C.rosso, () => setEsito('perso'), '✗', 'perso')}
      {tasto(!esito, C.spento, () => setEsito(null), '·', 'da giocare')}
      {onFissa && !esito && tasto(fissato, C.viola, onFissa, <Icona nome="lucchetto" misura={14} />, fissato ? 'togli il fissato' : 'fissa il passo')}
    </div>
  )
}


/** Una tendina: un titolo con un riassunto, che si apre toccandolo. */
function Tendina({ titolo, riassunto, children, colore = C.spento }) {
  const [aperta, setAperta] = useState(false)
  return (
    <div style={{ borderTop: `1px solid ${alpha(C.testo, 0.08)}` }}>
      <button onClick={() => setAperta(a => !a)} style={{
        display: 'flex', alignItems: 'baseline', gap: SP.m, width: '100%', padding: `${SP.l}px 0`,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: C.testo,
      }}>
        <span style={{ fontFamily: F.mono, fontSize: S.base, color: colore, flexShrink: 0 }}>{aperta ? '▾' : '▸'}</span>
        <span style={{ fontFamily: F.sans, fontSize: S.corpo, fontWeight: 600, color: C.testo, flexShrink: 0 }}>{titolo}</span>
        {/* ⚠️ Il riassunto si **taglia** e non va a capo: è una riga sola per
            costruzione, e una larghezza elastica senza `minWidth: 0` uscirebbe. */}
        {!aperta && riassunto && (
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>{riassunto}</span>
        )}
      </button>
      {aperta && <div style={{ paddingBottom: SP.m }}>{children}</div>}
    </div>
  )
}

/**
 * La card in evidenza: il passo da giocare adesso. Riceve **le stesse
 * proprietà di `Passo`**, così la pagina sceglie quale disegnare senza
 * calcolare niente due volte.
 */
function PassoHero(props) {
  const { numero, gambe, giorno: gio, ora, posta, postaIniziale, accumulato, quote, perc, esito, setEsito,
    tocca = true, onFissa, fissato } = props
  const quota = gambe.map(g => Number(quote[g.id] ?? g.quota) || 1).reduce((a, q) => a * q, 1)
  const montante = posta * quota
  const consiglio = percentualeConsigliata({ numero, montante, puntata: posta, posta: postaIniziale, accumulato })
  const r = applicaIncasso(montante, perc ?? consiglio, posta)
  const sotto = quota < QUOTA_MINIMA_SCHEDINA
  const virgola = (x) => x.toFixed(2).replace('.', ',')
  return (
    <Card style={{ marginBottom: SP.ml, borderColor: alpha(C.oro, 0.5),
      background: `linear-gradient(${alpha(C.oro, 0.05)},${alpha(C.oro, 0.05)}), ${C.card}` }}>
      <Etichetta colore={C.oro}>
        PASSO {numero} · {nomeGiorno(gio)} {gg(gio)}{ora ? ` · ${ora}` : ''}
      </Etichetta>

      {/* ⚠️⚠️ **I due numeri che servono al banco**, e nient'altro alla stessa
          altezza: quanto punto e a che quota. La puntata in oro e grande — è
          il punto focale — la quota accanto, con il minimo sotto. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end', gap: SP.m, marginTop: SP.m }}>
        <div>
          <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>punta</div>
          <div style={{ fontFamily: F.mono, fontSize: S.cifra, fontWeight: 700, color: C.oro, lineHeight: 1.1 }}>{eur(posta)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>quota</div>
          <div style={{ fontFamily: F.mono, fontSize: S.evidenza, fontWeight: 700, color: sotto ? C.ambra : C.oro, lineHeight: 1.1 }}>
            {virgola(quota)}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: S.micro, color: sotto ? C.ambra : C.fioco }}>
            {sotto ? `manca ${virgola(QUOTA_MINIMA_SCHEDINA - quota)} al minimo` : `minimo ${virgola(QUOTA_MINIMA_SCHEDINA)}`}
          </div>
        </div>
      </div>

      {/* ⚠️ **Il guadagno possibile in verde, su una riga**: cosa succede se
          vince, già diviso come lo divide il metodo. Il dettaglio — utile e
          percentuale da cambiare a mano — sta nella tendina «Conti». */}
      {/* ⚠️ **Senza fondo verde** (Mattia, 26/10/2026: *"ingannevole"*): un
          riquadro verde si legge come «vinto», mentre qui è un *se*. Resta solo
          un divisore sopra, e il verde sui numeri. */}
      <div style={{ marginTop: SP.l, paddingTop: SP.m, borderTop: `1px solid ${alpha(C.testo, 0.1)}`,
        fontFamily: F.sans, fontSize: S.base, color: C.spento, lineHeight: 1.5 }}>
        se vince incassi <b style={{ color: C.verde, fontFamily: F.mono }}>{eur(montante)}</b>
        {' · '}metti via <b style={{ color: C.verde, fontFamily: F.mono }}>{eur(r.via)}</b>
        {' · '}rigiochi <b style={{ color: C.oro, fontFamily: F.mono }}>{eur(r.rigioca)}</b>
      </div>

      {tocca && (
        <div style={{ marginTop: SP.l }}>
          <TastiEsito esito={esito} setEsito={setEsito} fissato={fissato} onFissa={onFissa} />
        </div>
      )}

      <div style={{ marginTop: SP.m }}>
        <Tendina titolo={`Partite (${gambe.length})`} colore={C.oro}
          riassunto={gambe.map(g => `${g.casa} ${g.giocata}`).join(' · ')}>
          <Passo {...props} parte="gambe" nudo />
        </Tendina>
        <Tendina titolo="Conti" colore={C.verde}
          riassunto={`utile ${eur(r.utile)} · metti via ${(perc ?? consiglio) === consiglio ? 'il consigliato' : `${perc}%`}`}>
          <Passo {...props} parte="conti" nudo />
        </Tendina>
      </div>
    </Card>
  )
}

/**
 * Gli altri passi — quelli già giocati e quelli in anteprima — in **una
 * riga**: numero, giorno, quota, esito. Toccandola si apre la card di prima.
 * ⚠️ La riga di un passo giocato porta il colore dell'esito, come la card.
 */
function PassoRiga(props) {
  const { numero, gambe, giorno: gio, ora, quote, esito, anteprima, fissato } = props
  const [aperta, setAperta] = useState(false)
  const quota = gambe.map(g => Number(quote[g.id] ?? g.quota) || 1).reduce((a, q) => a * q, 1)
  const tinta = esito === 'vinto' ? C.verde : esito === 'perso' ? C.rosso : C.spento
  // ⚠️⚠️ **Una card sola, chiusa o aperta** (Mattia, 26/10/2026: *"la card
  // che si apre ha i bordi tondi, la testata quadrati, ed è staccata: sembrano
  // due card diverse"*). La barra è l'intestazione della card, e aperta il
  // contenuto le scende sotto, dopo un divisore, **dentro la stessa cornice**.
  // Si chiude toccando la barra: il bersaglio è grande quanto quello per aprire.
  return (
    <Card style={{ marginBottom: SP.s, padding: `${SP.m}px ${SP.l}px`,
      borderColor: alpha(tinta, esito ? 0.35 : aperta ? 0.2 : 0.1) }}>
      <button onClick={() => setAperta(a => !a)} style={{
        display: 'flex', alignItems: 'baseline', gap: SP.m, width: '100%', padding: 0,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ fontFamily: F.mono, fontSize: S.base, color: C.spento, flexShrink: 0 }}>{aperta ? '▾' : '▸'}</span>
        <span style={{ fontFamily: F.sans, fontSize: S.corpo, fontWeight: 600, color: esito ? tinta : C.testo, flexShrink: 0 }}>
          {esito === 'vinto' ? '✓ ' : esito === 'perso' ? '✗ ' : ''}PASSO {numero}
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>
          {nomeGiorno(gio)} {gg(gio)}{ora ? ` ${ora}` : ''} · {gambe.length} partite
          {anteprima && !esito ? ' · in anteprima' : ''}{fissato ? ' · fissato' : ''}
        </span>
        <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: esito ? tinta : C.oro, flexShrink: 0 }}>
          {quota.toFixed(2).replace('.', ',')}
        </span>
      </button>
      {aperta && (
        <div style={{ marginTop: SP.m, borderTop: `1px solid ${alpha(C.testo, 0.08)}` }}>
          <Passo {...props} nudo />
        </div>
      )}
    </Card>
  )
}

/**
 * Quale card disegnare. Con la bozza accesa il passo **da giocare** è in
 * evidenza e gli altri sono righe; spenta, tutti tornano la card di prima.
 */
function QualePasso({ attivo, ...props }) {
  if (!NUOVO_PASSO) return <Passo {...props} />
  return attivo ? <PassoHero {...props} /> : <PassoRiga {...props} />
}

/**
 * L'archivio delle scalate chiuse.
 *
 * ⚠️⚠️ **È il motivo per cui la pagina salva.** Il backtest dice che la
 * selezione meccanica rende il 98% e Mattia pensa di fare meglio scegliendo a
 * mano: queste righe sono l'unico posto dove quella domanda ha una risposta.
 * ⚠️ Il riepilogo con le tre domande (quanto in accumulo · quante rientrate ·
 * le gambe a mano hanno reso più del 98%) arriva **quando ci saranno dieci o
 * venti scalate**: prima di allora direbbe rumore, e questo progetto ha già
 * imparato a non leggere un percorso solo.
 */
/**
 * ⚠️⚠️ **Riparti da 0 — l'unica cosa irreversibile della pagina.** Cancella
 * tutto il registro: *"come se partissi quel giorno per la prima volta"*
 * (Mattia, 18/10).
 * ⚠️ **La conferma è il tasto stesso**, non una finestra: il primo tocco lo
 * trasforma e scrive quante scalate sta per cancellare, il secondo esegue.
 * Un `confirm()` del browser si legge e si accetta senza vederlo, e qui il
 * numero di scalate è l'unica cosa che fa capire **cosa** si sta buttando.
 * ⚠️ E si disarma da sé dopo cinque secondi: un tasto rosso che resta armato
 * in fondo alla pagina è una trappola per il tocco successivo.
 */
function Riparti({ quante, onAzzera }) {
  const [armato, setArmato] = useState(false)
  useEffect(() => {
    if (!armato) return
    const t = setTimeout(() => setArmato(false), 5000)
    return () => clearTimeout(t)
  }, [armato])
  const colore = armato ? C.rosso : C.spento
  return (
    <button
      onClick={() => { if (armato) { setArmato(false); onAzzera() } else setArmato(true) }}
      style={{ width: '100%', marginTop: 14, padding: '9px 0', cursor: 'pointer',
        background: armato ? `linear-gradient(${alpha(C.rosso, .12)},${alpha(C.rosso, .12)}), ${C.card}` : 'transparent',
        border: `1px solid ${alpha(colore, armato ? 0.5 : 0.25)}`, color: colore,
        fontFamily: F.sans, fontSize: S.base }}>
      {armato
        ? `⚠️ TOCCA ANCORA PER CANCELLARE ${quante === 1 ? 'LA SCALATA' : `LE ${quante} SCALATE`}`
        : '↺ riparti da 0'}
      <span style={{ display: 'block', fontSize: S.micro, color: C.fioco, marginTop: 2 }}>
        {armato ? 'non si torna indietro' : 'cancella scalate e ricariche: il conto torna a 0'}
      </span>
    </button>
  )
}

function Archivio({ storico, ricariche = [], conto, onAzzera, onAnnulla, tocca = true }) {
  const chiuse = (storico || []).filter(s => s.stato === 'chiusa')
  if (!storico) return <Card><Attesa style={{ padding: 0 }} /></Card>
  // ⚠️ Si annulla **solo l'ultima ricarica, e solo se dopo non si è aperta
  // nessuna scalata**: quella scalata è nata su quel conto, e toglierle la
  // ricarica da sotto riscriverebbe il passato. Serve al dito che scrive
  // 1000 invece di 100.
  const ultima = ricariche[0]
  const annullabile = ultima && !(storico || []).some(s => s.aperta_il > ultima.fatta_il)
  // ⚠️⚠️ **Ricariche e giri nella stessa colonna, in ordine di tempo**: il
  // conto è la somma delle due cose, e leggerle separate nasconderebbe
  // proprio quello che Mattia ha chiesto di vedere — quante volte si è
  // ricaricato fra un giro e l'altro.
  const eventi = [
    ...ricariche.map(r => ({ tipo: 'ricarica', quando: r.fatta_il, r })),
    ...chiuse.map(s => ({ tipo: 'giro', quando: s.chiusa_il, s })),
  ].sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
  if (!chiuse.length && !ricariche.length) return (
    <div>
      <Card><div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, lineHeight: 1.6 }}>
        Nessuna scalata chiusa. Apri un piano, segna gli esiti e premi <b>STOP</b>:
        da quel momento resta qui dentro, com&apos;era.
      </div></Card>
      {/* ⚠️ Il tasto c'è anche senza scalate chiuse: quella **aperta** è il
          caso in cui serve più spesso — si è provato, non torna, si ricomincia. */}
      {!!storico.length && tocca && <Riparti quante={storico.length} onAzzera={onAzzera} />}
    </div>
  )
  // ⚠️⚠️ **Il risultato è conto meno versato**, non la somma dei giri: è la
  // domanda di Mattia — *"tre bankroll persi e un incasso da 200 devono dire
  // perdita"*. La somma dei giri lo dice lo stesso, ma solo finché nessuno
  // ricarica a scalata aperta; questa lo dice sempre.
  const tot = conto.risultato
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center' }}>
          {[['VERSATO', eur(conto.versato), C.testo],
            ['CONTO', eur(conto.conto), C.oro],
            ['RISULTATO', (tot >= 0 ? '+' : '') + eur(tot), tot >= 0 ? C.verde : C.rosso]].map(([l, v, col]) => (
            <div key={l}>
              <Etichetta>{l}</Etichetta>
              <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: col, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      {eventi.map(({ tipo, r, s }) => {
        if (tipo === 'ricarica') return (
          <Card key={`r${r.id}`} style={{ marginBottom: 6, padding: '9px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: F.sans, fontSize: S.base, color: C.testo }}>
                {String(r.fatta_il).slice(8, 10)}/{String(r.fatta_il).slice(5, 7)}
                <span style={{ color: C.spento }}> · ricarica</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                {tocca && annullabile && r.id === ultima.id && (
                  <button onClick={() => onAnnulla(r.id)} style={{ background: 'transparent', border: 'none', padding: 0,
                    cursor: 'pointer', color: C.spento, fontFamily: F.sans, fontSize: S.minuta, textDecoration: 'underline' }}>annulla</button>
                )}
                <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro }}>+{eur(r.importo)}</span>
              </span>
            </div>
          </Card>
        )
        const d = Number(s.bankroll_finale) - Number(s.bankroll_iniziale)
        return (
          <Card key={s.id} style={{ marginBottom: 6, padding: '9px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: F.sans, fontSize: S.base, color: C.testo }}>
                {String(s.chiusa_il).slice(8, 10)}/{String(s.chiusa_il).slice(5, 7)}
                <span style={{ color: C.spento }}> · {NOMI_REGOLA[s.regola] ?? s.regola}</span>
              </span>
              <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: d >= 0 ? C.verde : C.rosso }}>
                {d >= 0 ? '+' : ''}{eur(d)}
              </span>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: S.minuta, color: C.spento, marginTop: 3 }}>
              {eur(s.bankroll_iniziale)} → {eur(s.bankroll_finale)} · puntata {eur(s.posta)} · quota min {Number(s.quota_minima).toFixed(2).replace('.', ',')}
              {/* ⚠️ L'accumulo si scrive solo se c'è stato. Le scalate chiuse
                  **prima** del 18/10/2026 ce l'hanno a zero perché le casse
                  erano diventate derivate e nessuno le congelava alla chiusura:
                  scrivere *"accumulo € 0,00"* su una scalata che ha portato 100
                  a 131 è una riga falsa, e un archivio che mente su una cifra
                  non si crede più sulle altre. */}
              {Number(s.accumulo) > 0 && <>{' · '}accumulo {eur(s.accumulo)}</>}
            </div>
          </Card>
        )
      })}
      {tocca && <Riparti quante={storico.length} onAzzera={onAzzera} />}
    </div>
  )
}

export default function ScalataPage() {
  const { currentUser, isAdmin } = useAuth()
  const { righe, ricarica: ricaricaPartite, vota, votiDi, mioVoto, flagga, flagDi, flagTipiDi, mioFlag } = usaProssime()
  const datiVpm = usaVpm()
  const classifiche = usaClassifiche()
  // ⚠️⚠️ **Ognuno il suo registro e il suo conto** (Mattia, 24/10/2026:
  // *"ogni utente sia indipendente"*), admin e user: lo garantisce `sql/41`,
  // non questa pagina. Prima un utente leggeva la scalata di Admin.
  const reg = usaScalate(currentUser?.id)
  // ⚠️ **Personale, come nel Bet Builder**: la riga condivisa fra gli admin
  // aveva senso finché la scalata era una sola per tutti.
  const pref = usaPreferenze('scalata', { personale: true })
  const [modo, setModo] = useState('piano')
  // la partita aperta a tutto schermo, come nella pagina Partite
  const [apertaId, setApertaId] = useState(null)
  // il passo a cui si sta aggiungendo una partita a mano: { titolo, nelPasso, metti }
  const [manuale, setManuale] = useState(null)
  // ⚠️ L'errore di un'aggiunta a mano va **in cima**, con quelli del registro,
  // non sotto APRI SCALATA: lì sembrerebbe che non si possa aprire la scalata.
  const [avviso, setAvviso] = useState(null)
  const [erroreApri, setErroreApri] = useState(null)

  const [attMin, setAttMin] = useState(CONSIGLIATO.att)
  const [sceMin, setSceMin] = useState(CONSIGLIATO.scelta)
  const [vpmMin, setVpmMin] = useState(0)
  // ⚠️⚠️ **La quota della GAMBA è un filtro come gli altri tre** (Mattia,
  // 22/10/2026), non una costante: sceglie **quali partite** entrano nella
  // scaletta, esattamente come attendibilità, scelta e VPM. Da non confondere
  // con `QUOTA_MINIMA_SCHEDINA`, che invece non si tocca — quella decide
  // quando una schedina è chiusa, e il metodo la fissa a 1,90 (2,00 fino al 26/10).
  // ⚠️ Parte da **1,30 perché è misurato**: dentro `att ≥ 67%`, sotto 1,20 la
  // resa è 88,5%, fra 1,20 e 1,30 il 95,1%, fra 1,30 e 1,45 il 99,0%. Si può
  // abbassare, e la misura dice cosa si compra.
  const [quotaGamba, setQuotaGamba] = useState(QUOTA_MINIMA_GAMBA)
  // ⚠️ `daOra` è il momento da cui ripartire: il tasto ricarica lo rimette ad
  // adesso, così le partite già cominciate escono dalla scaletta. `usaProssime`
  // filtra solo per giorno, quindi a metà pomeriggio la lista conterrebbe
  // ancora le partite delle 13.
  const [daOra, setDaOra] = useState(() => Date.now())
  // ⚠️⚠️ **Il calendario del PIANO è fermo** (Mattia, 24/10/2026: *"continua a
  // perdersi tutto, quando passa l'orario delle partite le cancella"*). Il
  // piano non è salvato come oggetto: si ricompone dalle candidate, e le
  // candidate escludevano le partite **già cominciate rispetto ad adesso** —
  // quindi alla prima partita del passo 1 il passo spariva, quelli dopo
  // scalavano di un posto e i fissati perdevano il loro passo. Ora l'istante
  // è quello dell'ultimo **«Aggiorna calendario»**, salvato con il resto del
  // piano: il piano resta com'era finché non lo si aggiorna, anche riaprendo
  // l'app il giorno dopo. `daOra` resta l'orologio vivo del `+` e della
  // finestra manuale, dove una partita già cominciata non si pianifica.
  const [calendarioDa, setCalendarioDa] = useState(() => Date.now())
  const [armaNuovo, setArmaNuovo] = useState(false)
  useEffect(() => {
    if (!armaNuovo) return
    const t = setTimeout(() => setArmaNuovo(false), 5000)
    return () => clearTimeout(t)
  }, [armaNuovo])
  // ⚠️⚠️ **Niente più bankroll da regolare a mano** (24/10/2026): il bankroll
  // è il **conto** (`contoDi`), che si muove solo con le ricariche e i giri.
  // I tasti −/+ cambiavano il capitale senza lasciare traccia, ed è il motivo
  // per cui non si poteva sapere quanto ci si era messo dentro. Il conto della
  // scalata **non è** il bankroll del gruppo: `users.bankroll` non si muove.
  // L'importo della ricarica che si sta scrivendo.
  const [importo, setImporto] = useState('')
  // le partite aggiunte a mano a un passo, per indice di passo
  const [aggiunte, setAggiunte] = useState({})
  const [quote, setQuote] = useState({})
  const [perc, setPerc] = useState({})
  const [esiti, setEsiti] = useState({})
  const [tolte, setTolte] = useState([])
  // ⚠️ Gli id della **prima gamba di ogni pezzo staccato**: il taglio si ancora
  // alla partita, non alla posizione, così non si sposta quando il piano cambia.
  const [tagli, setTagli] = useState([])
  // ⚠️ I passi fissati **nel piano** (a scalata aperta è una colonna del
  // passo, `sql/41`). Sta qui in alto e non accanto a `limiteVisibile` perché
  // la legge anche la rilettura delle preferenze, più sotto.
  const [fissati, setFissati] = useState([])

  // ⚠️ La scheda vuole la **riga intera** di `prossime_partite`, non la gamba:
  // le gambe salvate portano una copia dei quattro numeri di quel giorno, non
  // le quote di mercato né il resto. Si risale per id.
  const partitaAperta = (righe || []).find(r => r.id === apertaId)
  // ⚠️⚠️ **Si applica UNA VOLTA SOLA**, alla prima lettura. Senza il
  // guardiano, ogni ridisegno rimetterebbe i valori salvati sopra quelli che
  // stai muovendo adesso — cioè le manopole tornerebbero indietro da sole.
  const applicato = useRef(false)
  // ⚠️ `letta` è uno **stato** e non il ref: il salvataggio automatico deve
  // partire dal ridisegno in cui i valori salvati sono già nelle manopole, non
  // da quello prima — altrimenti la prima cosa che farebbe è riscrivere i
  // valori di fabbrica sopra quelli salvati.
  const [letta, setLetta] = useState(false)
  useEffect(() => {
    if (applicato.current || !pref.pronte) return
    applicato.current = true
    setLetta(true)
    const d = pref.dati
    if (!d) return
    // ⚠️ **Un valore che manca non dà errore, dà il predefinito di qualcun
    // altro**: ogni chiave ha il suo valore di partenza e si scartano i numeri
    // non finiti — è la lezione del NaN delle soglie di Andamento, dove uno
    // `undefined` finito nello stato aveva inchiodato la pagina.
    const n = (x, se) => (Number.isFinite(Number(x)) ? Number(x) : se)
    const f = d.filtri || {}
    setAttMin(n(f.att, CONSIGLIATO.att))
    setSceMin(n(f.scelta, CONSIGLIATO.scelta))
    setVpmMin(n(f.vpm, 0))
    setQuotaGamba(n(f.quotaGamba, QUOTA_MINIMA_GAMBA))
    // ⚠️ E il **piano**: tolte, aggiunte, tagli, quote, percentuali ed esiti
    // (Mattia, 22/10: *"gli admin devono vedere tutti la stessa situazione,
    // bankroll e partite del passo x compreso"*). Le partite che nel frattempo
    // sono sparite dal calendario non fanno danno: un taglio o un'aggiunta
    // ancorati a un id che non c'è più semplicemente non trovano niente.
    const pi = d.piano || {}
    if (Array.isArray(pi.tolte)) setTolte(pi.tolte)
    if (Array.isArray(pi.tagli)) setTagli(pi.tagli)
    if (pi.aggiunte && typeof pi.aggiunte === 'object') setAggiunte(pi.aggiunte)
    if (pi.quote && typeof pi.quote === 'object') setQuote(pi.quote)
    if (pi.perc && typeof pi.perc === 'object') setPerc(pi.perc)
    if (pi.esiti && typeof pi.esiti === 'object') setEsiti(pi.esiti)
    if (Array.isArray(pi.fissati)) setFissati(pi.fissati)
    if (Number.isFinite(Number(pi.calendarioDa)) && pi.calendarioDa) setCalendarioDa(Number(pi.calendarioDa))
  }, [pref.pronte, pref.dati])

  // ⚠️⚠️ **Si salva da sola** (Mattia, 24/10/2026), come nel Bet Builder: il
  // tasto «salva» serviva perché la riga era condivisa fra sei admin e ogni
  // tocco l'avrebbe riscritta agli altri mentre guardavano. Personale, non c'è
  // nessuno da disturbare.
  // ⚠️ `salva` dentro un ref: `pref` è un oggetto nuovo a ogni ridisegno, e
  // metterlo fra le dipendenze di un effetto è il ciclo infinito già pagato.
  // ⚠️ E il primo giro **non scrive**: annota com'era la situazione appena
  // letta, così chi apre e non tocca non crea una riga nel database.
  const salvaPref = useRef(pref.salva); salvaPref.current = pref.salva
  const ultimaSalvata = useRef(null)
  useEffect(() => {
    if (!letta) return
    const dati = {
      filtri: { att: attMin, scelta: sceMin, vpm: vpmMin, quotaGamba },
      piano: { tolte, aggiunte, tagli, quote, perc, esiti, fissati, calendarioDa },
    }
    const j = JSON.stringify(dati)
    if (ultimaSalvata.current === null) { ultimaSalvata.current = j; return }
    if (ultimaSalvata.current === j) return
    const t = setTimeout(async () => {
      const r = await salvaPref.current(dati)
      if (r?.errore) setAvviso(r.errore)
      else ultimaSalvata.current = j
    }, 800)
    return () => clearTimeout(t)
  }, [letta, attMin, sceMin, vpmMin, quotaGamba, tolte, aggiunte, tagli, quote, perc, esiti, fissati, calendarioDa])

  // Dal 24/10/2026 l'archivio è di tutti: ognuno ha il suo.
  const vista = modo

  const aperta = reg.aperta
  // ⚠️ Il conto **fermo**: ricariche più i giri chiusi. È il bankroll con cui
  // si apre il prossimo giro; con un giro aperto vale il suo.
  const contoFermo = contoDi({ ricariche: reg.ricariche, storico: reg.storico || [] }).fermo
  const bankrollIniziale = aperta ? Number(aperta.bankroll_iniziale) : Math.round(contoFermo * 100) / 100
  const posta = aperta ? Number(aperta.posta) : postaDi(bankrollIniziale)

  // ⚠️ Le candidate: **attendibilità E scelta** sopra le soglie, più il
  // pavimento di quota per gamba — che non è prudenza ma misura (sotto 1,30 la
  // resa crolla a 88,5%). La scelta è `null` quando il campo contraddice il
  // mercato, e quelle partite restano fuori da sole.
  // ⚠️⚠️ **VPM si calcola una volta per partita**, e solo quando cambiano le
  // partite o i dati: prima la valutazione girava **due volte** — una per le
  // candidate e una per l'imbuto — e **a ogni tocco di una soglia**, perché
  // `attMin` e compagnia stavano fra le dipendenze. Erano ~400 valutazioni per
  // ogni scatto del `+`, cioè la manopola che si muove a scatti. Qui si
  // valuta, sotto si filtra.
  // ⚠️ **Una forma sola** per le gambe: `{ id, div, data, ora, casa, trasferta,
  // giocata, quota, att, scelta, vpm }` — la stessa che salva il database. Così
  // il piano dal vivo e quello riletto dall'archivio si disegnano con lo stesso
  // componente, e non possono divergere.
  const valutate = useMemo(() => (righe || []).map(r => {
    // ⚠️ `valutaPartita(dati, riga)`: i dati PRIMA, la riga dopo. Invertendoli
    // torna `null` senza lanciare niente, quindi `scelta` era sempre null e la
    // pagina mostrava **zero partite** — trovato da Mattia aprendola.
    const v = datiVpm ? valutaPartita(datiVpm, r) : null
    return {
      ...r, scelta: v?.scelta ?? null, vpm: v?.punti ?? null,
      att: r.probGiocata, quota: r.quotaResa ?? r.quota,
    }
  }), [righe, datiVpm])

  const candidate = useMemo(() => {
    if (!righe) return []
    // ⚠️⚠️ **La stella scavalca TUTTI i filtri di qualità** (Mattia,
    // 23/10/2026: *"le partite con la stella entrino nella scaletta come le
    // altre, e la stella scavalca tutto"*). Fino a ieri finivano solo
    // nell'elenco qui sotto: la stella è un gesto esplicito su una partita
    // sola, e un filtro che la butta fuori sta discutendo con chi l'ha messa.
    // ⚠️ **I tre filtri che restano non sono di qualità**: una partita già
    // cominciata non si pianifica, una con le quote incoerenti è un dato
    // rotto, e una tolta a mano è stata tolta a mano. Quelli valgono per
    // tutti, stella compresa.
    // ⚠️ **Il flag ⚑ no, e non è una dimenticanza**: Mattia lo usa per
    // marcare a vista partite che nella scaletta ci sono già — è una
    // verifica, non una scelta.
    // ⚠️⚠️ **Effetto da sapere**: i passi si spezzano appena superano 2,00,
    // quindi una stella a quota 1,05 non aggiunge solo una gamba — cambia
    // **dove si taglia** la schedina. Per questo dentro il passo la gamba
    // entrata per la stella la si vede (★).
    const stellata = (r) => votiDi(r.id) > 0
    return valutate.filter(r =>
      !tolte.includes(r.id) &&
      !r.quoteIncoerenti &&
      iniziaDopo(r, calendarioDa) &&
      (stellata(r) || (
        r.att != null && r.att * 100 >= attMin &&
        r.scelta != null && r.scelta * 100 >= sceMin &&
        (vpmMin <= 0 || (r.vpm != null && r.vpm >= vpmMin)) &&
        (r.quota ?? 0) >= quotaGamba)))
  }, [righe, valutate, attMin, sceMin, vpmMin, quotaGamba, tolte, calendarioDa, votiDi])

  // ⚠️ Le fasce sono una **proposta**: stesso giorno, orari entro tre ore. Poi
  // si toglie a mano quello che non piace — è il motivo per cui la pagina esiste.
  // ⚠️ La quota minima **non nasconde** le fasce che non ci arrivano: le marca.
  // Nasconderle vorrebbe dire far sparire partite buone senza dire perché, e
  // la pagina serve a comporre a mano — magari aggiungendo una gamba.
  const passi = useMemo(() => {
    // ⚠️⚠️ **I tagli si applicano PRIMA delle aggiunte**, e l'ordine conta:
    // `aggiunte` è indicizzata sulla posizione del passo **come si vede a
    // schermo**, quindi deve riferirsi alla stessa lista che viene disegnata.
    // Applicando i tagli dopo, un passo spezzato avrebbe spostato di uno tutti
    // gli indici successivi e le aggiunte si sarebbero riferite al passo
    // sbagliato — in silenzio.
    // ⚠️ Limite noto: spezzare un passo sposta comunque di uno gli indici dei
    // passi **dopo** di lui, quindi un'aggiunta fatta prima su uno di quelli si
    // ritrova sul vicino. Si compone a mano e si vede subito; chiuderlo per
    // davvero vuol dire indicizzare le aggiunte per id invece che per
    // posizione, ed è una rifattorizzazione, non una riga.
    // ⚠️⚠️ **Prima si taglia alla quota, poi a mano.** La fascia dice *quando*
    // si gioca, non *quanto* ci sta dentro: un sabato pieno ne mette otto nello
    // stesso blocco, cioè una schedina da quota 21. `spezzaAlMinimo` chiude la
    // schedina appena supera 2,00 (Mattia, 21/10), e i tagli a mano lavorano
    // su quello che resta.
    const base = spezzaFasce(spezzaAlMinimo(fasce(candidate)), tagli)
    // ⚠️ Le aggiunte a mano **non ricompongono le fasce**: una partita messa nel
    // passo 1 resta nel passo 1 anche se il suo orario sarebbe di un altro
    // blocco. È il punto della pagina — il raggruppamento è una proposta, la
    // composizione è sua.
    const usate = new Set(Object.values(aggiunte).flat())
    return base.map((f, i) => ({
      ...f,
      partite: [
        ...f.partite.filter(p => !usate.has(p.id)),
        // ⚠️⚠️ **Si cerca in `valutate`, non in `candidate`**: dal
        // «+ aggiungi partita manuale» può arrivare una partita che i filtri
        // non prendono, e cercandola fra le candidate sarebbe sparita
        // **in silenzio** — il tasto avrebbe fatto finta di funzionare.
        // ⚠️⚠️ **Le tolte escono anche da qui** (Mattia, 24/10/2026: *"aggiungo
        // una partita e non mi permette più di cancellarla"*). Le tolte
        // filtravano solo le candidate, e una partita aggiunta col `+` o a mano
        // viene da questa lista: il × la segnava tolta e lei restava nel passo
        // — e col piano che si salva da solo, restava anche riaprendo l'app.
        ...(aggiunte[i] || []).filter(id => !tolte.includes(id))
          .map(id => valutate.find(c => c.id === id)).filter(Boolean),
      ],
    })).filter(f => f.partite.length)
  }, [candidate, valutate, aggiunte, tagli, tolte])

  // ⚠️⚠️ **Esiti e percentuali si agganciano al PASSO, non alla posizione**
  // (24/10/2026). Erano `esiti[i]`: quando un passo spariva, quello dopo
  // ereditava l'esito e la percentuale del passo sparito. La chiave è quella
  // di «fissa»: la riga salvata a scalata aperta (`s:`), la prima gamba nel
  // piano (`p:`). Le chiavi vecchie, numeriche, non trovano più niente.
  const kp = (i) => (aperta
    ? (reg.passi[i]?.id != null ? `s:${reg.passi[i].id}` : `#${i}`)
    : (passi[i]?.partite?.[0]?.id != null ? `p:${passi[i].partite[0].id}` : `#${i}`))

  // ⚠️⚠️ **Flaggate e votate restano in lista anche se i filtri le tagliano**
  // (Mattia, 22/10/2026). Senza, bastava alzare una soglia per far sparire un
  // segno messo a mano — e un segno che scompare in silenzio è il difetto
  // peggiore di tutti. ⚠️ **Entrano nell'ELENCO, non nella scaletta**: i passi
  // si compongono dalle candidate, perché le soglie alimentano anche il taglio
  // automatico a 2,00 e una gamba corta entrata di straforo abbasserebbe la
  // qualità del passo senza dirlo.
  const fuoriFiltri = useMemo(() => {
    if (!righe) return []
    const dentro = new Set(candidate.map(c => c.id))
    return valutate.filter(r => !dentro.has(r.id) && !tolte.includes(r.id)
      && iniziaDopo(r, calendarioDa) && (flagDi(r.id) > 0 || votiDi(r.id) > 0))
  }, [righe, valutate, candidate, tolte, calendarioDa, flagDi, votiDi])

  // ⚠️ Si fondono **in ordine di data**, non in coda: una partita flaggata
  // appartiene al suo weekend, e messa in fondo finirebbe sotto il divisore
  // sbagliato.
  const elenco = useMemo(() => [...candidate, ...fuoriFiltri].sort((a, b) =>
    giorno(a.data).localeCompare(giorno(b.data))
    || String(a.ora || '').localeCompare(String(b.ora || ''))), [candidate, fuoriFiltri])

  // ⚠️ **Dove sta già ogni partita**, per la finestra dell'aggiunta a mano:
  // `id della partita → numero del passo`. ⚠️ Si guarda **la catena giusta**:
  // a scalata aperta i passi veri sono quelli salvati (e la gamba punta alla
  // partita con `prossima_id`), nel piano sono le fasce composte dal vivo.
  const inPassoDi = useMemo(() => {
    const m = {}
    if (aperta) {
      reg.passi.forEach((r, i) => {
        for (const g of reg.gambe) if (g.passo_id === r.id && g.prossima_id) m[g.prossima_id] = i + 1
      })
    } else {
      passi.forEach((f, i) => { for (const g of f.partite) m[g.id] = i + 1 })
    }
    return m
  }, [aperta, reg.passi, reg.gambe, passi])

  // ⚠️ Il conto filtro per filtro: quando non esce niente bisogna sapere
  // **quale** soglia ha tagliato, o si gira la manopola sbagliata.
  const imbuto = useMemo(() => {
    if (!righe) return null
    const a = valutate.filter(r => r.att != null && r.att * 100 >= attMin)
    const b = a.filter(r => r.scelta != null && r.scelta * 100 >= sceMin)
    const c = b.filter(r => vpmMin <= 0 || (r.vpm != null && r.vpm >= vpmMin))
    const d = c.filter(r => (r.quota ?? 0) >= quotaGamba)
    return { future: righe.length, att: a.length, scelta: b.length, vpm: c.length, quota: d.length }
  }, [righe, valutate, attMin, sceMin, vpmMin, quotaGamba])

  // ⚠️⚠️ **"La prossima" è la prima partita dei passi SUCCESSIVI**, non una
  // partita libera: `fasce()` mette *ogni* candidata in un blocco, quindi di
  // libere non ce ne sono mai e il tasto `+` non compariva. Il senso di
  // *"aggiungo le partite successive"* è **tirare su** la prima del passo dopo
  // per allungare questo — che è come si arriva alla quota minima quando una
  // fascia ha una gamba sola. Trovato da Mattia: il tasto non si vedeva.
  const prossimaDi = useMemo(() => (i) =>
    passi.slice(i + 1).flatMap(f => f.partite)[0] ?? null, [passi])

  // ⚠️⚠️ **A scalata aperta il `+` fa la stessa cosa: tira su la prima gamba
  // dei passi SUCCESSIVI.** Prima offriva le "candidate ancora libere" — e
  // libere non ce n'è mai nessuna, perché aprendo la scalata ogni candidata
  // finisce dentro un passo: il tasto non compariva, cioè **lo stesso difetto
  // che Mattia aveva già trovato nella versione dal vivo, rientrato dalla
  // finestra**. Due rami per lo stesso gesto divergono sempre, e questo l'ha
  // fatto subito.
  // ⚠️ **E non offre una partita già cominciata**: a scalata aperta i passi si
  // scoprono uno dopo l'altro, quindi quando si arriva al secondo qualche
  // orario è passato — allungare un passo con una partita già giocata non è
  // pianificare, è registrare.
  // ⚠️ E **non ruba a un passo già giocato**: quello che è accaduto non si
  // tocca, è la regola del registro. Può succedere — se il passo 2 è segnato e
  // l'1 no, la catena è ferma all'1 e il `+` dell'1 guarderebbe dentro il 2.
  const prossimaSalvata = useMemo(() => (i) =>
    reg.passi.slice(i + 1)
      .filter(r => r.esito === 'aperto')
      .flatMap(r => reg.gambe.filter(g => g.passo_id === r.id))
      .filter(g => iniziaDopo(g, daOra))[0] ?? null, [reg.passi, reg.gambe, daOra])

  // ⚠️⚠️ **I passi si scoprono uno per volta** (Mattia, 18/10: *"passo 2 deve
  // comparire solo una volta dato l'esito di passo 1"*), e non è solo ordine:
  // la puntata del passo 2 **non esiste** finché il passo 1 non ha un esito —
  // è la cassa che arriva fin lì. Mostrarlo prima vuol dire mostrare un numero
  // inventato, ed è il difetto che questo progetto evita dappertutto.
  // È il **primo senza esito**, non quanti ne hanno uno: se il 2 è segnato e
  // l'1 no, la catena è ferma all'1.
  const frontiera = useMemo(() => {
    const dato = aperta
      ? (i) => reg.passi[i] && reg.passi[i].esito !== 'aperto'
      : (i) => !!esiti[kp(i)]
    let i = 0
    while (dato(i)) i++
    return i
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperta, reg.passi, passi, esiti])

  /**
   * Fin dove si disegna: la frontiera, **più** i pezzi staccati a mano che le
   * stanno attaccati.
   *
   * ⚠️ Come si riconosce un pezzo staccato a mano, nei due modi:
   * a scalata **aperta** ha un `numero` **decimale** — `spezzaPasso` inserisce
   * la riga a metà fra due interi (1,5 fra l'1 e il 2), ed è il motivo per cui
   * `sql/31` ha reso quella colonna `numeric`; nel **piano** la sua prima gamba
   * è uno dei punti di taglio.
   * ⚠️ Si scorre finché la catena regge: due tagli di fila mostrano tre pezzi,
   * ma un pezzo staccato dal passo 7 **non** tira fuori anche i sei in mezzo.
   */
  /**
   * ⚠️⚠️ **I passi fissati a tavolino** (Mattia, 23/10/2026: *"devo poter
   * fissare un passo e l'app mi mostra il passo 2 — lo scopo è programmare a
   * tavolino tutto il percorso"*).
   *
   * ⚠️ Si tiene **un id, non l'indice del passo**: nel piano quello della
   * prima gamba (la stessa chiave di `tagli`), a scalata aperta quello della
   * riga salvata. Il motivo è preciso — spezzare un passo sposta di uno gli
   * indici di tutti quelli dopo, quindi un elenco di indici si ritroverebbe a
   * segnare il passo sbagliato **in silenzio**. È il limite che `aggiunte` ha
   * ancora e che qui non si ripete.
   * ⚠️⚠️ **La chiave porta davanti da quale dei due mondi viene** (`p:` o
   * `s:`): sono due tabelle diverse, due contatori diversi, e un id di
   * `scalata_passi` può benissimo valere quanto un id di `prossime_partite`.
   * Senza il prefisso, aprendo una scalata un passo si sarebbe trovato fissato
   * da solo — una volta ogni tanto, senza che si capisse perché.
   * ⚠️⚠️ **Dal 24/10/2026 si salva** (Mattia: i passi fissati sparivano
   * chiudendo l'app). A scalata aperta è la colonna `fissato` del passo
   * (`sql/41`), nel piano va con il resto delle preferenze.
   */
  const chiaveFissa = (i) => (passi[i]?.partite?.[0]?.id != null ? `p:${passi[i].partite[0].id}` : null)
  const eFissato = (i) => (aperta ? !!reg.passi[i]?.fissato : fissati.includes(chiaveFissa(i)))
  const fissa = (i) => {
    if (aperta) { const r = reg.passi[i]; if (r) reg.fissa(r.id, !r.fissato); return }
    const k = chiaveFissa(i); if (k) setFissati(t => t.includes(k) ? t.filter(x => x !== k) : [...t, k])
  }

  const limiteVisibile = useMemo(() => {
    const staccato = aperta
      ? (i) => reg.passi[i] && Number(reg.passi[i].numero) % 1 !== 0
      : (i) => passi[i] && tagli.includes(passi[i].partite?.[0]?.id)
    // ⚠️ Fissare il passo `i` apre il passo `i+1`: è una cosa diversa dallo
    // staccato, che si apre da sé. Due condizioni, non una.
    // ⚠️ **Vale anche a scalata aperta** (Mattia, 23/10/2026: *"magari voglio
    // portarmi avanti"*): lì il passo dopo si vede comunque senza soldi, e le
    // sue quote si possono già sistemare — la cassa resta quella che arriva
    // dall'esito, che è l'unica cosa che non si può anticipare.
    const fissato = (i) => (aperta ? !!reg.passi[i]?.fissato
      : (passi[i]?.partite?.[0]?.id != null && fissati.includes(`p:${passi[i].partite[0].id}`)))
    const quanti = aperta ? reg.passi.length : passi.length
    let i = frontiera
    while (i + 1 < quanti && (staccato(i + 1) || fissato(i))) i++
    return i
  }, [aperta, reg.passi, passi, tagli, fissati, frontiera])

  // ⚠️⚠️ **Il primo passo perso ferma la catena**, ma i passi dopo restano
  // nel piano (Mattia, 24/10/2026: *"se metto perso non mi presenta i passi
  // successivi, motivo per il quale ho chiuso la scalata"*). Da lì in poi si
  // vedono **spenti**, come anteprima, e ⟳ RIPARTI li rimette in gioco.
  const perso = aperta
    ? reg.passi.findIndex(r => r.esito === 'perso')
    : passi.findIndex((_, k) => esiti[kp(k)] === 'perso')

  // ⚠️⚠️ **Le casse si RICALCOLANO dalla catena dei passi**, sempre: né lette
  // dal database né aggiornate a ogni esito. È quello che permette di togliere
  // tutti i blocchi — annullare un esito o cambiare una quota si propaga da
  // solo, perché non c'è un secondo numero da disfare.
  const casse = useMemo(() => {
    const c = aperta
      ? casseDi(reg.passi, posta, (i) => perc[kp(i)])
      : casseDi(passi.map((f, i) => ({
        quota: f.partite.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1),
        esito: esiti[kp(i)] ?? 'aperto',
      })), posta, (i) => perc[kp(i)])
    const live = bankrollIniziale - posta + c.accumulo + c.cassa
    return { inGioco: c.cassa, accumulo: c.accumulo, vivi: c.vivi, live, risultato: c.accumulo + c.cassa - posta }
    // ⚠️ `kp` è una funzione nuova a ogni ridisegno: dipende solo da `aperta`,
    // `reg.passi` e `passi`, che sono già qui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperta, reg.passi, passi, esiti, quote, perc, posta, bankrollIniziale])

  // Il conto di adesso: ricariche, giri chiusi e quanto il giro in corso ha
  // fatto finora (nel piano, quanto farebbe con gli esiti provati).
  const conto = contoDi({ ricariche: reg.ricariche, storico: reg.storico || [],
    aperta: { bankroll_iniziale: bankrollIniziale }, live: casse.live })
  // Arrotondato al centesimo: è un importo, e i decimali della quota non
  // devono finire nel registro.
  const cent = (x) => Math.round(x * 100) / 100

  if (!righe) return <Attesa>carico le partite…</Attesa>

  const Tasto = ({ onClick, children, attivo, colore = C.oro, style }) => (
    <button onClick={onClick} style={{ padding: '5px 10px', fontSize: S.base, fontFamily: F.sans, cursor: 'pointer',
      color: attivo ? colore : C.spento, background: attivo ? `linear-gradient(${alpha(colore, .14)},${alpha(colore, .14)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(colore, attivo ? .5 : .18)}`, ...style }}>{children}</button>
  )
  const Numero = ({ label, valore, passo, set, suffisso = '' }) => (
    <div style={{ display: 'contents' }}>
      <div style={{ fontSize: S.corpo, fontFamily: F.sans, color: C.testo }}>{label}</div>
      <Tasto onClick={() => set(v => Math.max(0, Math.round((v - passo) * 100) / 100))} colore={C.spento}>−</Tasto>
      <div style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro, minWidth: 54, textAlign: 'center' }}>
        {valore}{suffisso}
      </div>
      <Tasto onClick={() => set(v => Math.round((v + passo) * 100) / 100)} colore={C.spento}>+</Tasto>
    </div>
  )

  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
        <h2 style={{ fontSize: S.titolo, fontFamily: F.sans, letterSpacing: '0.1em', color: C.testo, margin: 0 }}>ROAD TO WEEKEND</h2>
        {/* ⚠️ Un **interruttore**, non una voce di menu: il menu è per le
            pagine, questa è un'altra vista della stessa cosa — e ci si passa
            dentro continuamente mentre si gioca.
            ⚠️⚠️ **E non c'è per chi non è admin** (Mattia, 22/10/2026, dopo
            averlo provato con un utente vero): l'archivio è il **registro dei
            soldi** — capitale, accumulo, quanto ha reso ogni scalata — quindi
            segue le casse, che sono già nascoste. Sparisce l'interruttore
            intero e non il solo tasto: con una vista sola non c'è niente da
            commutare, e un interruttore con un bottone solo è un comando che
            non comanda. */}
        {/* ⚠️ Dal 24/10/2026 c'è per tutti: ognuno ha il suo registro. */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['piano', 'PIANO'], ['archivio', `ARCHIVIO${reg.storico?.length ? ` ${reg.storico.filter(x => x.stato === 'chiusa').length}` : ''}`]].map(([k, l]) => (
            <Tasto key={k} attivo={modo === k} onClick={() => setModo(k)} colore={C.celestePieno}>{l}</Tasto>
          ))}
        </div>
      </div>

      {reg.errore && (
        <Card style={{ marginBottom: 10, borderColor: alpha(C.rosso, .4) }}>
          <div style={{ color: C.rosso, fontSize: S.base, fontFamily: F.sans }}>registro: {reg.errore}</div>
        </Card>
      )}

      {/* ⚠️ Si chiude col tocco: un avviso che resta lì per sempre diventa
          arredamento, e il prossimo non si nota. */}
      {avviso && (
        <Card onClick={() => setAvviso(null)} style={{ marginBottom: 10, borderColor: alpha(C.ambra, .45), cursor: 'pointer' }}>
          <div style={{ color: C.ambra, fontSize: S.base, fontFamily: F.sans }}>{avviso}</div>
        </Card>
      )}

      {/* ⚠️ Azzerare il registro azzera anche lo stato della pagina: esiti e
          percentuali sono indicizzati per passo, e passi non ce ne sono più. */}
      {vista === 'archivio' && (
        <Archivio storico={reg.storico} ricariche={reg.ricariche} conto={conto}
          onAnnulla={async (id) => { const x = await reg.annullaRicarica(id); setAvviso(x?.errore ?? null) }}
          onAzzera={async () => {
            await reg.azzeraTutto()
            setEsiti({}); setPerc({}); setTolte([]); setAggiunte({}); setQuote({}); setFissati([])
          }} />
      )}
      {vista === 'piano' && <>



      {/* ── Le casse ───────────────────────────────────────────────────── */}
      {/* ⚠️⚠️ **Il conto lo vede solo chi lo gioca** (Mattia, 22/10/2026).
          Aprendo la pagina a tutti, bankroll, accumulo e cassa in gioco erano
          finiti sotto gli occhi di chiunque fosse entrato: la road map del
          weekend è una cosa da condividere, **i soldi no**.
          ⚠️ La strada giusta era questa e non richiudere la lettura delle
          tabelle: senza quelle righe la pagina tornerebbe vuota per tutti, e
          gli spettatori non vedrebbero più nemmeno i passi.
          ⚠️ E resta un `if` che **nasconde**: a proteggere è la policy — ma qui
          non c'è niente da proteggere, perché i passi e le gambe sono già
          leggibili per scelta. Questo toglie solo il conto dalla vista. */}
      {/* ⚠️ Dal 24/10/2026 la vede **ognuno sul suo conto**: il motivo per
          nasconderla agli utenti era che il conto era quello di Admin. */}
      {/* ⚠️ **In cima e col bordo acceso** (richiesta di Mattia): è il conto, e
          un conto che sta in mezzo alla pagina si legge dopo le partite — cioè
          dopo aver già deciso. Il fondo è una tinta d'oro appena accesa su
          fondo opaco (`linear-gradient(tinta,tinta), C.card`): una tinta
          semitrasparente da sola si illuminerebbe su sfondo chiaro. */}
      <Card style={{ marginBottom: 12, borderColor: alpha(C.oro, 0.45),
        background: `linear-gradient(${alpha(C.oro, 0.045)},${alpha(C.oro, 0.045)}), ${C.card}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center' }}>
          {/* ⚠️ «CONTO» e non più «BANKROLL LIVE»: è lo stesso numero, ma
              adesso comprende le ricariche e tutti i giri, non solo questo. */}
          {[['IN GIOCO', casse.inGioco, C.oro], ['ACCUMULO', casse.accumulo, C.verde],
            ['CONTO', conto.conto, conto.conto >= bankrollIniziale ? C.verde : C.rosso]].map(([l, v, col]) => (
            <div key={l}>
              <Etichetta>{l}</Etichetta>
              <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: col, marginTop: 3 }}>{eur(v)}</div>
            </div>
          ))}
        </div>

        {/* ⚠️⚠️ **Versato e risultato, sempre in vista** (Mattia, 24/10/2026:
            *"se perdo 3 bankroll interi e una volta incasso 200 € devo capire
            di essere in perdita e non in utile"*). Il risultato è **conto
            meno versato**: è l'unico numero che non si fa ingannare
            dall'ultimo incasso. Sopra il riepilogo, sotto il gesto che lo
            muove — la ricarica, l'unico modo in cui entrano soldi. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.s,
          marginTop: SP.l, paddingTop: SP.m, borderTop: `1px solid ${alpha(C.testo, 0.1)}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: SP.m, flexWrap: 'wrap', fontFamily: F.sans, fontSize: S.base, color: C.spento }}>
            <span>versato <b style={{ color: C.testo, fontFamily: F.mono }}>{eur(conto.versato)}</b></span>
            <span style={{ marginLeft: 'auto' }}>risultato{' '}
              <b style={{ fontFamily: F.mono, color: conto.risultato >= 0 ? C.verde : C.rosso }}>
                {conto.risultato >= 0 ? '+' : ''}{eur(conto.risultato)}
              </b>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.m }}>
            {/* ⚠️ **16px**: sotto, iOS ingrandisce la pagina da solo quando
                si tocca il campo (trappola già pagata). */}
            <input value={importo} onChange={e => setImporto(e.target.value.replace(',', '.'))}
              inputMode="decimal" placeholder="importo"
              style={{ width: 90, minWidth: 0, background: C.pozzo, border: `1px solid ${C.bordo}`, padding: '6px 8px',
                color: C.testo, fontFamily: F.mono, fontSize: 16, outline: 'none' }} />
            <Tasto colore={C.oro} attivo={Number(importo) > 0} onClick={async () => {
              if (!(Number(importo) > 0)) return
              const x = await reg.ricaricaConto(cent(Number(importo)))
              setAvviso(x?.errore ?? null)
              if (!x?.errore) setImporto('')
            }}>＋ ricarica</Tasto>
            <span style={{ marginLeft: 'auto', fontFamily: F.sans, fontSize: S.base, color: C.spento, textAlign: 'right' }}>
              puntata <b style={{ color: C.oro }}>{eur(posta)}</b>
              <span style={{ fontSize: S.micro, color: C.fioco }}> (10%)</span>
            </span>
          </div>
          {!aperta && posta < 1 && (
            <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.ambra }}>
              {conto.versato > 0
                ? 'Il conto è sotto 10 €: la puntata sarebbe sotto 1 €. Ricarica per aprire una scalata.'
                : 'Il conto parte da 0: fai una ricarica per aprire la prima scalata.'}
            </div>
          )}
        </div>

        {casse.vivi > 0 && (
          <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento, marginTop: 8, textAlign: 'center' }}>
            {casse.vivi} {casse.vivi === 1 ? 'passo giocato' : 'passi giocati'} · risultato{' '}
            <b style={{ color: casse.risultato >= 0 ? C.verde : C.rosso }}>
              {casse.risultato >= 0 ? '+' : ''}{eur(casse.risultato)}
            </b>
          </div>
        )}

        {/* ⚠️ Lo stop è l'UNICO modo di fermare la scalata, e **consolida**:
            accumulo e cassa in gioco rientrano nel capitale, che diventa il
            live, e la puntata successiva è il 10% di quello. Senza il
            consolidamento il tasto azzererebbe la scalata *perdendo* i soldi
            guadagnati, che è il contrario di "incassa tutto".
            ⚠️ E **chiude il record**: da lì in poi quella scalata non si tocca
            più, perché un registro riscrivibile non è una prova. */}
        {/* ⚠️ Per chi guarda e basta i due tasti **non ci sono**, né spenti:
            un tasto disabilitato racconta una cosa che si potrebbe fare, e
            qui non si può — lo dice la policy, non solo questo `if`. */}
        {aperta ? (
          <button onClick={async () => {
            // ⚠️⚠️ **Le casse si scrivono qui, una volta sola.** Da quando si
            // ricalcolano dalla catena, `scalate.cassa` e `scalate.accumulo`
            // non vengono più aggiornate a ogni esito — e una scalata chiusa
            // le ha ancora come erano all'apertura: nel registro di Mattia
            // l'archivio diceva *"100 → 131 · accumulo € 0,00"*, cioè un
            // guadagno senza nessun posto da cui fosse arrivato. Una volta
            // chiusa la catena non si ricalcola più (i passi restano, ma la
            // verità di quella scalata è ferma): va **congelata**.
            // ⚠️ **Al centesimo, non per difetto** (24/10/2026): con il conto
            // calcolato dai giri, un `Math.floor` qui toglieva i centesimi
            // dell'accumulo dal conto a ogni STOP.
            await reg.chiudi(cent(casse.live), { cassa: casse.inGioco, accumulo: casse.accumulo })
            setEsiti({}); setPerc({}); setTolte([]); setAggiunte({})
          }}
            style={{ width: '100%', marginTop: 10, padding: '8px 0', background: `linear-gradient(${alpha(C.rosso, .1)},${alpha(C.rosso, .1)}), ${C.card}`,
              border: `1px solid ${alpha(C.rosso, 0.4)}`, color: C.rosso, fontFamily: F.sans, fontSize: S.base, cursor: 'pointer' }}>
            ⏹ STOP SCALATA — porta {eur(casse.accumulo + casse.inGioco)} nel capitale e chiudi
          </button>
        ) : (
          /* ⚠️ **Il record nasce con un tasto, non da solo** (scelta di Mattia):
             il salvataggio automatico riempirebbe l'archivio di bozze mentre si
             compone, e la fotografia delle quote perderebbe senso. */
          /* ⚠️ **Disabilitato mentre scrive**, e lo dice: aprire una scalata
             sono tre scritture più la rilettura, e un tasto che resta uguale
             per un secondo invita a premerlo due volte — cioè a provare ad
             aprire due scalate sullo stesso capitale. */
          <button disabled={!passi.length || reg.occupato || posta < 1}
            onClick={async () => {
              const piano = []
              let p = posta, acc = 0
              for (const [i, f] of passi.entries()) {
                const q = f.partite.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1)
                piano.push({
                  giorno: f.giorno, posta: p, quota: Number(q.toFixed(4)),
                  gambe: f.partite.map(g => ({ ...g, quota: Number(quote[g.id] ?? g.quota) })),
                })
                // il piano salva la catena ipotetica: le puntate vere le
                // ricalcola la pagina man mano che gli esiti arrivano
                const m = p * q
                const pc = perc[kp(i)] ?? percentualeConsigliata({ numero: i + 1, montante: m, puntata: p, posta, accumulato: acc })
                const inc = applicaIncasso(m, pc, p)
                acc += inc.via
                p = inc.rigioca
                if (p < 1) break
              }
              // ⚠️ `regola: METODO.id` ('meta' dal 26/10/2026) è il metodo di oggi, e si scrive nel
              // registro perché l'archivio deve poter dire **come si giocava**
              // quando quella scalata è stata aperta: le righe vecchie hanno
              // 'capitale' o 'gioco' e restano così.
              const r = await reg.apri({ bankroll: bankrollIniziale, posta, quotaMinima: QUOTA_MINIMA_SCHEDINA, regola: METODO.id, piano })
              // ⚠️ L'errore va **a schermo**: un tasto che non fa niente e non
              // dice perché è il modo di non capire mai cosa è andato storto.
              if (r.errore) setErroreApri(r.errore)
              else { setErroreApri(null); setEsiti({}); setPerc({}) }
            }}
            style={{ width: '100%', marginTop: 10, padding: '9px 0',
              background: passi.length && posta >= 1 ? `linear-gradient(${alpha(C.verde, .12)},${alpha(C.verde, .12)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(C.verde, passi.length && posta >= 1 ? 0.5 : 0.15)}`,
              color: passi.length && posta >= 1 ? C.verde : C.fioco, fontFamily: F.sans, fontSize: S.base,
              cursor: passi.length && posta >= 1 ? 'pointer' : 'default' }}>
            {reg.occupato ? 'salvo il piano…' : `▶ APRI SCALATA — congela ${passi.length} passi e comincia a registrare`}
          </button>
        )}
        {erroreApri && (
          <div style={{ marginTop: 6, fontSize: S.minuta, fontFamily: F.sans, color: C.rosso, textAlign: 'center' }}>
            {erroreApri}
          </div>
        )}
      </Card>

      {/* ── I tasti di selezione ───────────────────────────────────────── */}
      <Card style={{ marginBottom: 10 }}>
        {/* ⚠️ **Il consigliato sta qui, in testa e a destra** (richiesta di
            Mattia): accanto ai tasti delle regole non si capiva cosa fosse —
            sembrava una terza regola. E **dice su cosa si basa**: la prima
            versione diceva solo "consigliato 62 · 62", su un numero proposto a
            occhio. Un'app che consiglia deve poter dire perché, o quella parola
            non va scritta. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <Etichetta>SELEZIONE</Etichetta>
          <button onClick={() => { setAttMin(CONSIGLIATO.att); setSceMin(CONSIGLIATO.scelta); setVpmMin(0); setQuotaGamba(QUOTA_MINIMA_GAMBA) }}
            style={{
              textAlign: 'right', cursor: 'pointer', padding: '4px 8px', lineHeight: 1.35,
              color: C.testo, fontFamily: F.sans,
              background: attMin === CONSIGLIATO.att && sceMin === CONSIGLIATO.scelta && !vpmMin && quotaGamba === QUOTA_MINIMA_GAMBA
                ? `linear-gradient(${alpha(C.verde, .12)},${alpha(C.verde, .12)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(C.verde, attMin === CONSIGLIATO.att && sceMin === CONSIGLIATO.scelta && !vpmMin && quotaGamba === QUOTA_MINIMA_GAMBA ? 0.5 : 0.2)}`,
            }}>
            <div style={{ fontSize: S.micro, color: C.verde, letterSpacing: '0.08em' }}>✓ CONSIGLIATO</div>
            <div style={{ fontSize: S.corpo, fontWeight: 700, color: C.testo }}>
              att {CONSIGLIATO.att}%{CONSIGLIATO.scelta ? ` · scelta ${CONSIGLIATO.scelta}%` : ''}
            </div>
            {/* ⚠️ **Il numero dei weekend sta qui e non è un di più**: a
                soglie più strette la resa sale e il materiale sparisce — a 68%
                sarebbe stato *"resa 100,2%"*, la frase più bella della
                tabella, con **metà dei weekend senza un passo componibile**.
                Un consiglio che tace quanto spesso è giocabile non è un
                consiglio. */}
            <div style={{ fontSize: S.micro, color: C.spento }}>{CONSIGLIATO.perche}</div>
            <div style={{ fontSize: S.micro, color: C.spento }}>un passo in {CONSIGLIATO.weekend} weekend su 100</div>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: '4px 6px',
          alignItems: 'center', marginTop: 7 }}>
          <Numero label="attendibilità ≥" valore={attMin} passo={1} set={setAttMin} suffisso="%" />
          <Numero label="scelta ≥" valore={sceMin} passo={1} set={setSceMin} suffisso="%" />
          <Numero label="VPM ≥" valore={vpmMin ? vpmMin.toFixed(1).replace('.', ',') : 'tutti'} passo={0.5} set={setVpmMin} />
          {/* ⚠️ **"quota gamba", non "quota"**: a due centimetri da qui c'è la
              quota della schedina (1,90, fissa), e due filtri chiamati "quota"
              nella stessa card sono il modo di girare la manopola sbagliata. */}
          <Numero label="quota gamba ≥" valore={quotaGamba.toFixed(2).replace('.', ',')} passo={0.05} set={setQuotaGamba} />
        </div>
        {/* ⚠️⚠️ **Qui non ci sono più né la quota schedina né le due regole**
            (Mattia, 21/10/2026). La quota minima è **una e basta** (1,90 dal 26/10/2026): era una
            manopola quando si cercava dove stare, adesso il metodo l'ha fissata
            — e il posto dove dirlo è la card del passo che non ci arriva.
            Le due regole di incasso servivano a misurare quale conviene, e la
            misura ha risposto: ne resta una, e un tasto che offre quella
            bocciata è un modo di giocarla per sbaglio. */}
        <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <Etichetta colore={C.celestePieno}>METODO · {METODO.nome.toUpperCase()}</Etichetta>
          {/* ⚠️ Niente più tasto «salva» (24/10/2026): la selezione è
              personale e **si salva da sola**, come nel Bet Builder. */}
          {/* ⚠️ A scalata aperta il ricarica **azzera il piano e lascia i
              soldi dove sono**: è la risposta di Mattia a *"cosa succede alle
              scalate dimenticate"* — il denaro è lo stato della scalata, il
              piano è settimanale. */}
          {/* ⚠️ **Rosso e acceso** (Mattia, 22/10/2026: *"lo voglio ben
              evidente"*). `C.rosso` è il token già in uso per perdita,
              prelievo ed errore — qui dice la stessa cosa in un altro modo:
              **questo tasto butta via qualcosa** (il piano composto a mano, e
              a scalata aperta i passi non giocati). In oro e spento sembrava
              un ricarica qualunque, come quello di un browser.
              ⚠️ `attivo` non vuol dire "selezionato": qui serve solo a dargli
              fondo e bordo pieni, che è l'unico modo che ha `Tasto` di
              gridare. */}
          {/* ⚠️⚠️ **A scalata aperta chiede conferma** (Mattia, 24/10/2026):
              lì cancella i passi non giocati, e in un tocco solo era il gesto
              più distruttivo della pagina accanto ai filtri. Il primo tocco lo
              arma e dice **quanti** passi butta, il secondo esegue; si disarma
              da sé dopo cinque secondi, come «Riparti da 0». */}
          <Tasto colore={C.rosso} attivo style={{ marginLeft: 'auto' }}
            onClick={() => {
              const daButtare = aperta ? reg.passi.filter(x => x.esito === 'aperto').length : 0
              if (daButtare && !armaNuovo) { setArmaNuovo(true); return }
              setArmaNuovo(false)
              const ora = Date.now()
              setTolte([]); setAggiunte({}); setDaOra(ora); setCalendarioDa(ora)
              // ⚠️ **E rilegge davvero le partite.** Finché `usaProssime` non
              // aveva memoria questo tasto non ricaricava niente — spostava
              // solo l'orologio — e il nome mentiva: le partite erano quelle
              // scaricate all'avvio della sessione. Ora la memoria si butta
              // qui, che è l'unico posto dove qualcuno ha chiesto dati nuovi.
              ricaricaPartite()
              if (aperta) reg.azzeraPiano()
            }}>
            {armaNuovo
              ? `⚠️ tocca ancora: cancella ${reg.passi.filter(x => x.esito === 'aperto').length} passi non giocati`
              : `↻ ${aperta ? 'nuovo piano' : 'ricarica'}`}
          </Tasto>
        </div>
        {/* ⚠️ Una selezione che si salva da sola deve dirlo, e dire **quando**:
            chi non lo sa crede che le soglie tornino quelle di fabbrica. */}
        <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento, marginTop: 7, lineHeight: 1.5 }}>
          {pref.info ? <>si salva da sola · ultima volta {quando(pref.info.quando)}</> : <>si salva da sola, appena cambi qualcosa</>}
          {pref.errore && <span style={{ color: C.ambra }}>{' · '}{pref.errore}</span>}
        </div>
        {/* ⚠️⚠️ **«Aggiorna calendario» al posto della riga del metodo**
            (Mattia, 24/10/2026): il piano è fermo all'istante dell'ultimo
            aggiornamento, e questo è il gesto che lo sposta ad adesso — le
            partite già cominciate escono, quelle nuove entrano. ⚠️ **Non
            cancella niente**: né le tolte, né le aggiunte, né a scalata aperta
            i passi salvati — quello resta al tasto rosso, con la conferma. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Tasto colore={C.celestePieno} attivo onClick={() => {
            const ora = Date.now()
            setCalendarioDa(ora); setDaOra(ora)
            ricaricaPartite()
          }}>⟳ Aggiorna calendario</Tasto>
          <span style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento }}>
            partite dalle {new Date(calendarioDa).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </Card>

      {/* ── La scaletta ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Etichetta>LA SCALETTA</Etichetta>
        <span style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>
          {candidate.length} partite · {passi.length} passi
        </span>
      </div>

      {!passi.length && imbuto && (
        <Card><div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, lineHeight: 1.7 }}>
          Nessuna partita passa i filtri. Dove si sono fermate:
          <div style={{ marginTop: 6, color: C.testo }}>
            {imbuto.future} future → <b>{imbuto.att}</b> sopra attendibilità {attMin}%
            {' '}→ <b>{imbuto.scelta}</b> sopra scelta {sceMin}%
            {vpmMin > 0 && <> → <b>{imbuto.vpm}</b> sopra VPM {vpmMin.toFixed(1).replace('.', ',')}</>}
            {' '}→ <b>{imbuto.quota}</b> sopra quota {quotaGamba.toFixed(2).replace('.', ',')}
          </div>
          <div style={{ marginTop: 6 }}>
            ⚠️ Con le soglie strette capita spesso: misurato sull&apos;archivio, quasi un giorno su
            due non ha nemmeno due partite sopra 1,30 con attendibilità ≥ 67%. E la <b>scelta</b> è
            nulla quando il campo contraddice il mercato, quindi taglia più di quanto sembri.
          </div>
        </div></Card>
      )}

      {/* ⚠️⚠️ **Due sorgenti, un componente solo.** Senza scalata aperta i passi
          sono le fasce composte dal vivo e si possono modificare; con una
          scalata aperta sono le **righe salvate**, in sola lettura, e segnare
          un esito scrive nel registro. Lo stesso `Passo` disegna entrambe
          perché le gambe hanno la stessa forma — se fossero due componenti,
          prima o poi mostrerebbero due cose diverse. */}
      {aperta
        ? reg.passi.map((riga, i) => {
          const gambe = reg.gambe.filter(g => g.passo_id === riga.id)
          // ⚠️ La puntata di un passo è **la cassa che arriva fin lì**,
          // ricalcolata dalla stessa catena delle casse: quella salvata al
          // momento del piano non sa quale percentuale sceglierai.
          // ⚠️ Dalla stessa catena arriva anche **quanto c'è già in
          // accumulo**: i pavimenti del metodo sono cumulativi, quindi il
          // consiglio di questo passo dipende da quello che i passi prima
          // hanno già messo via — compresi i centesimi dell'arrotondamento.
          const { cassa: p, accumulo: acc } = casseDi(reg.passi.slice(0, i), posta, (k) => perc[kp(k)])
          // ⚠️ Vale anche qui: un passo staccato a mano (numero decimale) si
          // vede subito, in anteprima e senza i soldi.
          const fermo = perso >= 0 && i > perso
          const inAnteprima = i > frontiera || fermo
          if ((p < 1 && !inAnteprima) || i > limiteVisibile) return null
          return (
            /* ⚠️⚠️ **`i + 1`, non `riga.numero`.** La colonna `numero` è
               l'ordine con cui i passi sono stati salvati, e **lascia dei
               buchi**: svuotando un passo la riga si cancella, quindi nel
               registro vero di Mattia i passi sono 1, 3, 4… Il numero che
               conta è la **posizione nella catena**, perché è quella che
               `casseDi` usa per decidere la percentuale consigliata — col
               numero della colonna il consiglio scritto nella card e quello
               applicato alle casse erano due numeri diversi (al primo passo
               della catena: tutto l'utile contro il 70%). */
            <QualePasso key={riga.id} attivo={i === frontiera && !inAnteprima} numero={i + 1} gambe={gambe} giorno={riga.giorno} ora={gambe[0]?.ora?.slice(0, 5)} stelleDi={votiDi} anteprima={inAnteprima}
              fermo={fermo} fissato={eFissato(i)} onFissa={() => fissa(i)}
              posta={p} postaIniziale={posta} accumulato={acc} colore={coloreDi(i)} classifiche={classifiche}
              quote={quote} setQuote={setQuote} onApri={setApertaId}
              onQuota={(id, v) => reg.cambiaQuota(id, riga.id, v)}
              onToglie={(id) => reg.togliGamba(id, riga.id)}
              prossima={prossimaSalvata(i)}
              /* ⚠️ Allungare un passo con la gamba di un altro è uno
                 **spostamento**, non una copia: senza il togliere, la stessa
                 partita starebbe in due schedine e la quota di entrambe sarebbe
                 quella di un piano che non esiste. Lo fa `spostaGamba` in un
                 gesto solo — prima erano due chiamate in fila, cioè una dozzina
                 di andate e ritorno al database per un tocco. */
              onAggiunge={() => { const n = prossimaSalvata(i); if (n) reg.spostaGamba(n, riga.id) }}
              onManuale={() => setManuale({
                titolo: `PASSO ${i + 1}`,
                nelPasso: gambe.map(g => g.prossima_id),
                metti: (p) => reg.aggiungiGamba(riga.id, p),
              })}
              /* ⚠️ Qui il taglio è una **riga nuova nel database**, non uno
                 stato della pagina: da `gambe[iG]` in giù scendono in un passo
                 inserito subito dopo, col numero di mezzo (3 e 4 → 3,5). */
              onSpezza={(iG) => reg.spezzaPasso(riga, reg.passi[i + 1]?.numero ?? null, gambe.slice(iG))}
              perc={perc[kp(i)]} setPerc={(v) => setPerc(x => ({ ...x, [kp(i)]: v }))}
              esito={riga.esito === 'aperto' ? null : riga.esito}
              setEsito={(e) => {
                const q = gambe.reduce((a, g) => a * Number(g.quota), 1)
                const m = p * q
                const pc = perc[kp(i)] ?? percentualeConsigliata({ numero: i + 1, montante: m, puntata: p, posta, accumulato: acc })
                const r = applicaIncasso(m, pc, p)
                // ⚠️ Si scrive **solo l'esito e la fotografia del passo**: le
                // casse non si toccano, le ricalcola `casseDi`. Annullare è
                // quindi un'operazione come le altre.
                reg.segna(riga.id, e || 'aperto', e === 'vinto'
                  ? { montante: m, messoVia: r.via, resto: r.resto }
                  : { montante: null, messoVia: null, resto: null })
                // ⚠️ Segnare un esito è il momento in cui il tempo avanza: da
                // qui in poi le partite di quell'orario sono **giocate**, e non
                // devono più comparire fra quelle che il `+` può tirare su. A
                // scalata aperta i passi sono righe salvate, quindi rinfrescare
                // l'orologio non ricompone niente — sposta solo il materiale.
                setDaOra(Date.now())
              }} />
          )
        })
        : passi.map((f, i) => {
          // la posta di un passo è quello che il precedente ha rigiocato
          // ⚠️⚠️ **Un passo per volta, anche nel piano** (Mattia, 22/10/2026:
          // *"voglio tornare come prima, il passo 2 si apre solo quando do
          // l'esito del passo 1"*). Il 21/10 li avevo aperti tutti per poterli
          // spezzare, e lui li ha rivisti e **rifiutati**: ventidue card fino
          // al 1° novembre non sono una road map, sono una pagina da scorrere.
          // ⚠️ E la ragione di prima regge comunque: la puntata del passo 2 è
          // la cassa che arriva fin lì, quindi senza l'esito del 1 è un numero
          // ipotetico. ⚠️ Lo spezza del passo 2 si raggiunge segnando l'esito
          // del 1 — e col taglio automatico a 2,00 serve molto di rado.
          let p = posta, acc = 0
          for (let k = 0; k < i; k++) {
            if (esiti[kp(k)] !== 'vinto') { p = 0; break }
            const q = passi[k].partite.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1)
            const m = p * q
            const pc = perc[kp(k)] ?? percentualeConsigliata({ numero: k + 1, montante: m, puntata: p, posta, accumulato: acc })
            const inc = applicaIncasso(m, pc, p)
            acc += inc.via
            p = inc.rigioca
          }
          // ⚠️ Un pezzo staccato a mano si vede anche oltre la frontiera, e
          // **anche se la cassa non c'è ancora**: `p < 1` qui vorrebbe dire
          // *"non so quanto puntare"*, che in anteprima è proprio il punto.
          // ⚠️ Nel piano un passo perso è una **prova**, e RIPARTI non c'è:
          // i passi dopo restano nascosti come prima.
          const fermo = false
          const inAnteprima = i > frontiera
          if ((p < 1 && !inAnteprima) || i > limiteVisibile) return null
          return (
            /* ⚠️ La chiave è **l'id della prima gamba**: due pezzi tagliati
               dalla stessa fascia hanno lo stesso giorno e la stessa ora,
               quindi `giorno + ora` ne faceva due chiavi uguali — e React con
               due chiavi uguali ridisegna la cosa sbagliata, in silenzio. */
            <QualePasso key={f.partite[0]?.id ?? f.giorno + f.ora} attivo={i === frontiera && !inAnteprima} numero={i + 1} gambe={f.partite} giorno={f.giorno} ora={f.ora} stelleDi={votiDi} anteprima={inAnteprima}
              /* ⚠️ Solo nel piano: a scalata aperta i passi si scoprono con
                 l'esito, che lì è un fatto registrato e non una simulazione. */
              fermo={fermo} fissato={eFissato(i)}
              onFissa={() => fissa(i)}
              posta={p} postaIniziale={posta} accumulato={acc} colore={coloreDi(i)} classifiche={classifiche}
              onApri={setApertaId} prossima={prossimaDi(i)}
              onAggiunge={() => { const n = prossimaDi(i); if (n) setAggiunte(a => ({ ...a, [i]: [...(a[i] || []), n.id] })) }}
              onManuale={() => setManuale({
                titolo: `PASSO ${i + 1}`,
                nelPasso: f.partite.map(g => g.id),
                /* ⚠️ Nel piano l'aggiunta è **stato della pagina**, non una
                   scrittura: qui niente è ancora successo. Diventa una riga
                   del registro solo con APRI SCALATA. */
                metti: (p) => { setAggiunte(a => ({ ...a, [i]: [...(a[i] || []), p.id] })); return {} },
              })}
              onSpezza={(iG) => { const id = f.partite[iG]?.id; if (id) setTagli(t => [...t, id]) }}
              quote={quote} setQuote={setQuote}
              perc={perc[kp(i)]} setPerc={(v) => setPerc(x => ({ ...x, [kp(i)]: v }))}
              esito={esiti[kp(i)] ?? null} setEsito={(e) => setEsiti(x => ({ ...x, [kp(i)]: e }))}
              /* ⚠️ Toglie **anche dalle aggiunte**: rimessa dall'elenco, la
                 partita torna nel suo passo naturale, non in quello dove
                 l'avevi spostata. */
              onToglie={(id) => {
                setTolte(t => [...t, id])
                setAggiunte(a => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.filter(x => x !== id)])))
              }} />
          )
        })}

      {/* ⚠️⚠️ **⟳ RIPARTI** (Mattia, 24/10/2026): dopo un passo perso, chiude
          il giro e ne apre uno nuovo coi passi programmati che restano, sulla
          puntata del 10% del conto. Prima l'unico modo di andare avanti era
          STOP, che si portava via i passi e lasciava da ricomporre tutto. */}
      {aperta && perso >= 0 && reg.passi.slice(perso + 1).some(r => r.esito === 'aperto') && (() => {
        const finale = cent(casse.live)
        const nuovoConto = cent(contoFermo + finale - bankrollIniziale)
        const nuovaPosta = postaDi(nuovoConto)
        const puo = nuovaPosta >= 1 && !reg.occupato
        return (
          <div style={{ marginTop: 10 }}>
            <button disabled={!puo} onClick={async () => {
              const x = await reg.riparti(reg.passi[perso], {
                finale, cassa: casse.inGioco, accumulo: casse.accumulo, conto: nuovoConto, posta: nuovaPosta })
              setAvviso(x?.errore ?? null)
              if (!x?.errore) setPerc({})
            }} style={{ width: '100%', padding: '9px 0', cursor: puo ? 'pointer' : 'default',
              background: puo ? `linear-gradient(${alpha(C.celestePieno, .12)},${alpha(C.celestePieno, .12)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(C.celestePieno, puo ? 0.5 : 0.15)}`,
              color: puo ? C.celestePieno : C.fioco, fontFamily: F.sans, fontSize: S.base }}>
              {reg.occupato ? 'riparto…' : `⟳ RIPARTI dal passo ${perso + 2} — nuovo giro con puntata ${eur(nuovaPosta)}`}
            </button>
            <div style={{ marginTop: 4, fontFamily: F.sans, fontSize: S.minuta, color: puo ? C.spento : C.ambra, textAlign: 'center' }}>
              {puo
                ? `chiude questo giro (conto ${eur(nuovoConto)}) e rimette in gioco i passi che restano`
                : `il conto sarebbe ${eur(nuovoConto)}: la puntata scende sotto 1 €, serve prima una ricarica`}
            </div>
          </div>
        )
      })()}

      {/* ⚠️⚠️ **Un passo nascosto deve dire di esserci.** I passi dopo la
          frontiera non si vedono, ma esistono e sono già nel piano salvato:
          senza questa riga la pagina sembrerebbe aver perso metà della scalata,
          ed è la regola del progetto — un limite che non si vede non si può
          raccontare a chi guarda. */}
      {(() => {
        const totali = aperta ? reg.passi.length : passi.length
        const nascosti = totali - (frontiera + 1)
        if (nascosti < 1) return null
        return (
          <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento, textAlign: 'center',
            marginTop: 8, padding: '7px 0', border: `1px dashed ${alpha(C.testo, 0.12)}` }}>
            {nascosti === 1 ? 'un altro passo in programma' : `altri ${nascosti} passi in programma`}
            {/* ⚠️ **Con la cassa a zero quei passi non arriveranno mai**, e
                dire *"compare quando segni l'esito del passo 3"* sarebbe una
                promessa falsa: il passo prima è perso, la catena è finita e
                non c'è più niente da segnare. Visto provando il ritorno al
                passo per volta (22/10/2026). */}
            {' · '}<span style={{ color: C.fioco }}>
              {casse.inGioco < 1
                ? (aperta && perso >= 0 ? 'si rimettono in gioco con ⟳ RIPARTI' : 'la scalata si è fermata qui: restano nel piano, non in gioco')
                : `compare quando segni l'esito del passo ${frontiera + 1}`}
            </span>
          </div>
        )
      })()}

      {/* ── Tutte le consigliate, in chiaro e spente ─────────────────────── */}
      {/* ⚠️ **Spente di proposito** (richiesta di Mattia): sono il materiale,
          non il piano. Il piano sono i passi sopra, e se questa lista avesse lo
          stesso peso visivo non si capirebbe più quale delle due stai
          guardando. Serve a vedere **subito** cosa c'è, e a rimettere dentro
          quello che hai tolto per sbaglio.
          ⚠️ Mostra anche le **tolte**, barrate: una partita che sparisce
          senza lasciare traccia è un piano che non si può ricostruire. */}
      {!!candidate.length && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <Etichetta>TUTTE LE CONSIGLIATE</Etichetta>
            <span style={{ fontFamily: F.sans, fontSize: S.micro, color: C.fioco }}>
              {candidate.length} in scaletta{fuoriFiltri.length ? ` · ${fuoriFiltri.length} segnate fuori filtri` : ''}{tolte.length ? ` · ${tolte.length} tolte` : ''}
            </span>
          </div>
          {/* ⚠️ Un filo meno spenta di prima (0,62 → 0,78): con tutta la riga
              colorata il velo rendeva illeggibili le tinte scure, soprattutto
              il blu e il viola dei passi più in là. */}
          <Card style={{ padding: '4px 10px', opacity: 0.78 }}>
            {[...elenco, ...(righe || []).filter(r => tolte.includes(r.id))].map((g, k, tutte) => {
              const fuori = tolte.includes(g.id)
              // fuori dai filtri: ci sta solo perché qualcuno l'ha segnata
              const soloSegno = !fuori && fuoriFiltri.some(x => x.id === g.id)
              // ⚠️⚠️ **Un divisore per weekend** (Mattia, 21/10). L'elenco è
              // lungo e in ordine di data: senza una riga che separa le
              // giornate, la partita di sabato prossimo e quella del sabato
              // dopo si leggono come se fossero lo stesso blocco — e la
              // scalata è una cosa che vive **dentro** un weekend.
              // ⚠️⚠️ **Barrate le partite SPOSTATE A MANO**, non tutte quelle
              // che stanno in un passo (Mattia, 21/10: *"lasciamole ma
              // barrale, per far capire che sono state scelte"*). Provato a
              // barrare "chi sta in un passo" e il risultato era **l'elenco
              // intero sbarrato**: `fasce()` mette *ogni* candidata in un
              // blocco, quindi "scelta" non distingue niente. Quello che
              // distingue è il gesto — la partita che hai tirato su col `+` da
              // un altro passo — ed è esattamente quella che, senza un segno,
              // si va a cercare due volte.
              const spostata = Object.values(aggiunte).flat().includes(g.id)
              const wk = weekendDi(g.data)
              const nuovoWk = !fuori && (k === 0 || weekendDi(tutte[k - 1].data) !== wk)
              // ⚠️ Il colore è **quello del passo che la contiene**: è il filo
              // che lega l'elenco ai passi sopra. Chi non sta in nessun passo
              // resta grigio, e si vede subito che è materiale non usato.
              const iPasso = passi.findIndex(f => f.partite.some(x => x.id === g.id))
              // ⚠️ Una riga che sta in lista **solo** perché è segnata deve
              // dirlo: altrimenti sembra una candidata come le altre, e non
              // si capisce perché non finisce in nessun passo.
              const col = fuori || soloSegno ? C.fioco : iPasso >= 0 ? coloreDi(iPasso) : C.grigio
              return (
                <div key={g.id}>
                {nuovoWk && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 0 4px',
                    borderTop: k ? `1px solid ${alpha(C.testo, 0.10)}` : 'none' }}>
                    <Etichetta>WEEKEND DEL {gg(wk)}</Etichetta>
                    <span style={{ flex: 1, height: 1, background: alpha(C.testo, 0.08) }} />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '24px 52px minmax(0,1fr) 24px 40px 16px',
                  gap: 5, alignItems: 'center', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta,
                  borderTop: k && !nuovoWk ? `1px solid ${alpha(C.testo, 0.05)}` : 'none',
                  /* ⚠️⚠️ **Barrata anche quando è GIÀ IN UN PASSO** (Mattia,
                     21/10: *"lasciamole ma barrale, per far capire che sono
                     state scelte"*). Prima la riga restava identica a quelle
                     libere e l'unico segnale era il pallino col numero: con
                     quaranta righe non si vedeva. ⚠️ Il barrato qui vuol dire
                     **"non è più da scegliere"**, per due motivi diversi —
                     tolta o già usata — e a distinguerli è il colore: grigio
                     fioco la tolta, la tinta del passo quella scelta. */
                  textDecoration: fuori || spostata ? 'line-through' : 'none' }}>
                  {/* ⚑ ── I DUE SEGNI, incolonnati a sinistra ──────────────
                      ⚠️ **Stanno insieme e staccati dal resto** perché sono la
                      stessa famiglia — *"qualcuno ha detto qualcosa su questa
                      partita"* — e perché il colore della riga dice già
                      un'altra cosa (in quale passo sta). Un flag verde in
                      mezzo a una riga verde sarebbe illeggibile.
                      ⚠️ **La bandiera si tocca, la stella no**: la stella si
                      mette nella pagina Partite e qui è un'informazione. Un
                      segno cliccabile accanto a uno che non lo è vuole che si
                      veda quale dei due risponde — per questo la stella non ha
                      né bordo né tasto.
                      ⚠️ Il numero compare **solo se c'è**: uno zero accanto a
                      ogni riga è rumore su quaranta righe. */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    textDecoration: 'none' }}>
                    {/* ⚠️⚠️ **Dal 24/10/2026 il flag lo mette chiunque**
                        (Mattia): **verde** se l'ha messo un admin, **blu** se
                        un utente. Quando ci sono tutti e due vince il verde,
                        che è il segno di prima; il numero dice quanti sono. */}
                    {(() => { const t = flagTipiDi(g.id), mio = mioFlag(g.id)
                      const tinta = mio ? (isAdmin ? C.verde : C.blu) : t.admin ? C.verde : C.blu
                      return (
                    <button onClick={() => flagga(g.id)}
                      title={mio ? 'togli il flag' : `mi piace per la scalata${t.admin + t.user ? ` · ${t.admin} admin, ${t.user} utenti` : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 1, background: 'transparent',
                        border: 'none', padding: 0, cursor: 'pointer',
                        /* ⚠️ `C.fioco` e non `C.fantasma`: la bandiera spenta è un tasto che
                           si può premere, e `fantasma` in questo progetto vuol dire
                           **disabilitato**. Lo stesso grigio della × qui accanto. */
                        color: mio ? tinta : flagDi(g.id) ? alpha(tinta, 0.75) : C.fioco }}>
                      <Icona nome="bandiera" misura={13} pieno={mioFlag(g.id)} />
                      {flagDi(g.id) > 1 && <span style={{ fontSize: S.micro }}>{flagDi(g.id)}</span>}
                    </button>
                      ) })()}
                    {votiDi(g.id) > 0 && (
                      <span title={`${votiDi(g.id)} stelle dalla pagina Partite`}
                        style={{ display: 'flex', alignItems: 'center', gap: 1, color: C.oro }}>
                        <Icona nome="stella" misura={11} pieno={mioVoto(g.id)} />
                        {votiDi(g.id) > 1 && <span style={{ fontSize: S.micro }}>{votiDi(g.id)}</span>}
                      </span>
                    )}
                  </div>
                  <span style={{ color: col }}>
                    {iPasso >= 0 && !fuori ? `● ${iPasso + 1} ` : ''}
                    {nomeGiorno(giorno(g.data))} {gg(g.data)} {g.ora?.slice(0, 5)}
                  </span>
                  {/* ⚠️ I tre numeri anche qui (richiesta di Mattia, 18/10):
                      l'elenco serve a decidere cosa tirare dentro un passo, e
                      senza att/scelta/VPM bisognerebbe risalire al passo per
                      saperlo — cioè fare il giro al contrario. */}
                  <span style={{ minWidth: 0 }}>
                    {/* ⚠️ **Tutta la riga nel colore del suo passo** (richiesta
                        di Mattia, 18/10): prima solo la data e la quota erano
                        colorate e il resto grigio, quindi il filo che lega la
                        riga al passo si spezzava in mezzo. Il colore è il
                        legame — o lo porta tutta la riga, o non serve. */}
                    {/* ⚠️ Anche qui si apre toccando i nomi: l'elenco serve a
                        decidere cosa tirare dentro un passo, ed è il momento
                        in cui si vuole guardare la partita per davvero. */}
                    <span onClick={() => setApertaId(g.id)} role="button"
                      style={{ color: fuori ? C.fioco : col, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.sans, fontSize: S.base, display: 'block', cursor: 'pointer' }}>
                      {g.casa} — {g.trasferta}
                    </span>
                    <span style={{ color: fuori ? C.fioco : alpha(col, 0.75), fontSize: S.micro, display: 'block' }}>
                      att {pct(g.att)} · sce {pct(g.scelta)}
                      {g.vpm != null && ` · VPM ${Number(g.vpm).toFixed(2).replace('.', ',')}`}
                    </span>
                    {/* ⚠️ **Terza riga, sotto i nomi e i numeri** (Mattia,
                        22/10/2026): nella colonna della data finiva incastrata
                        fra l'ora e il bordo, su due righe strette. Qui ha
                        tutta la larghezza della partita e sta su una riga
                        sola, dove la si legge insieme a ciò che spiega. */}
                    {soloSegno && (
                      <span style={{ display: 'block', color: C.ambra, fontSize: S.micro,
                        whiteSpace: 'nowrap' }}>
                        fuori filtri
                      </span>
                    )}
                  </span>
                  <span style={{ color: fuori ? C.fioco : col, textAlign: 'center' }}>{g.giocata}</span>
                  <span style={{ color: col, textAlign: 'right' }}>{Number(g.quota).toFixed(2).replace('.', ',')}</span>
                  <button onClick={() => setTolte(t => fuori ? t.filter(x => x !== g.id) : [...t, g.id])}
                    title={fuori ? 'rimetti in scaletta' : 'togli dalla scaletta'}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                      textDecoration: 'none', color: fuori ? C.verde : C.fioco, fontSize: S.media }}>{fuori ? '+' : '×'}</button>
                </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}
      </>}

      {/* ⚠️⚠️ **Fuori dal ramo `modo === 'piano'`**: il foglio copre la pagina,
          e legarlo a una vista vorrebbe dire che cambiando vista resta aperto
          sopra il nulla. ⚠️ `SOGLIE_DEFAULT` è la stessa base da cui parte la
          pagina Partite (lì sono uno stato locale, non salvate): la categoria
          decide solo il colore della giocata nella scheda. */}
      {/* ⚠️ Le partite offerte sono **tutte le future valutate**, non le
          candidate: è il senso del tasto. ⚠️ `iniziaDopo` resta — una partita
          già cominciata non si aggiunge a un piano, e quello non è un filtro
          di qualità ma di tempo. */}
      {manuale && (
        <ScegliGamba titolo={manuale.titolo} nelPasso={manuale.nelPasso} inPasso={inPassoDi}
          partite={valutate.filter(r => iniziaDopo(r, daOra) && !r.quoteIncoerenti)}
          flagDi={flagDi} votiDi={votiDi}
          onScegli={async (p) => {
            const r = await manuale.metti(p)
            setAvviso(r?.errore ?? null)
            setManuale(null)
          }}
          onChiudi={() => setManuale(null)} />
      )}

      {partitaAperta && (
        <SchedaScorrevole onChiudi={() => setApertaId(null)}>
          <DettaglioPartita p={partitaAperta} cat={categoria(partitaAperta.probGiocata, SOGLIE_DEFAULT)}
            voti={votiDi(partitaAperta.id)} mio={mioVoto(partitaAperta.id)} puoVotare={isAdmin}
            onVota={() => vota(partitaAperta.id)} onChiudi={() => setApertaId(null)} />
        </SchedaScorrevole>
      )}
    </div>
  )
}
