import { useState, useMemo, useEffect } from 'react'
import { C, F, alpha, S } from '../theme'
import { Card, Etichetta, TastoRipeti } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { usaClassifiche, postoDi } from '../hooks/usaClassifiche'
import { usaScalate } from '../hooks/usaScalate'
import { Posizione } from '../components/TestataPartita'
import { valutaPartita } from '../lib/vpm'
import { sigla } from '../lib/campionati'
import { pct, eur, gg } from '../lib/formato'
import {
  REGOLE, MAX_GAMBE, QUOTA_MINIMA_GAMBA, CONSIGLIATO, postaDi, fasce, giorno, casseDi,
  percentualeConsigliata, applicaIncasso,
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
 * La partita comincia dopo questo istante?
 * ⚠️ `usaProssime` filtra per **giorno** (`data >= current_date`), quindi alle
 * 18 di sabato la lista contiene ancora le partite delle 13. Qui si guarda
 * l'orario, e si tiene la partita quando l'ora manca (meglio mostrarla che
 * nasconderla: la correzione a mano è prevista, l'invisibilità no).
 */
const iniziaDopo = (p, istante) => {
  const g = String(p.data).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return true
  if (!p.ora) return new Date(`${g}T23:59:00`).getTime() >= istante
  return new Date(`${g}T${String(p.ora).slice(0, 5)}:00`).getTime() >= istante
}

function Passo({ numero, gambe, giorno: gio, ora, posta, regola, quotaMinima, colore, classifiche,
                quote, setQuote, perc, setPerc, esito, setEsito, onToglie, prossima, onAggiunge,
                onQuota = null }) {
  // ⚠️ La quota della schedina è il **prodotto delle quote modificate**, non di
  // quelle scaricate: Mattia gioca su book diversi e con i bonus, e una pagina
  // che mostra la quota del consenso gli racconterebbe un piano che non è il suo.
  const quota = gambe.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1)
  const montante = posta * quota
  const consiglio = percentualeConsigliata(regola, { numero, montante, puntata: posta })
  const p = perc ?? consiglio
  const r = applicaIncasso(montante, p, posta)
  // ⚠️ L'esito vince sul colore del blocco: a piano finito conta com'è andata,
  // non quale fascia era.
  const tinta = esito === 'vinto' ? C.verde : esito === 'perso' ? C.rosso : colore

  return (
    <Card style={{ marginBottom: 8, borderColor: alpha(tinta, 0.35) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Etichetta colore={tinta}>
          ● PASSO {numero} · {nomeGiorno(gio)} {gg(gio)} {ora && `· ${ora}`}
        </Etichetta>
        <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700,
          color: quota >= quotaMinima ? C.oro : C.ambra }}>
          quota {quota.toFixed(2).replace('.', ',')}
          {quota < quotaMinima && <span style={{ fontSize: S.micro, color: C.ambra }}> · sotto {quotaMinima.toFixed(2).replace('.', ',')}</span>}
        </span>
      </div>

      {gambe.map(g => (
        <div key={g.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 34px 58px 20px',
          gap: 6, alignItems: 'center', padding: '6px 0', borderTop: `1px solid ${alpha(C.testo, 0.06)}` }}>
          <div style={{ minWidth: 0 }}>
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
          <input value={quote[g.id] ?? ''} placeholder={Number(g.quota).toFixed(2)}
                onChange={e => setQuote(q => ({ ...q, [g.id]: e.target.value.replace(',', '.') }))}
                /* ⚠️ Si scrive nel registro **uscendo dal campo**, non a ogni
                   tasto: altrimenti "1,85" passerebbe per "1", "1,", "1,8" —
                   e "1" non è una quota valida. */
                onBlur={() => { if (onQuota && quote[g.id]) onQuota(g.id, quote[g.id]) }}
                inputMode="decimal" style={{ width: '100%', background: C.pozzo, color: C.oro,
                  border: `1px solid ${alpha(C.oro, 0.3)}`, borderRadius: 6, padding: '4px 6px',
                  fontFamily: F.mono, fontSize: S.corpo, textAlign: 'center' }} />
          <button onClick={() => onToglie(g.id)} title="togli dal passo"
            style={{ background: 'transparent', border: 'none', color: C.fioco, cursor: 'pointer', fontSize: S.grande }}>×</button>
        </div>
      ))}

      {/* ── la posta, il consiglio, e la decisione ──────────────────────── */}
      {/* ⚠️ **Il tasto dice QUALE partita aggiungerebbe**, non "aggiungi": un
          tasto che pesca al buio costringe a premere per sapere cosa fa. Prende
          la prima consigliata non ancora in nessun passo, in ordine di data e
          ora — che è il senso di *"aggiungo le partite successive"*. */}
      {prossima && (
        <button onClick={onAggiunge} style={{ width: '100%', marginTop: 6, padding: '6px 8px',
          background: 'transparent', border: `1px dashed ${alpha(colore, 0.4)}`, color: colore,
          fontFamily: F.mono, fontSize: S.minuta, cursor: 'pointer', textAlign: 'left' }}>
          + {prossima.casa} — {prossima.trasferta} @{Number(prossima.quota).toFixed(2).replace('.', ',')}
          {' '}<span style={{ color: C.fioco }}>({nomeGiorno(giorno(prossima.data))} {gg(prossima.data)} {prossima.ora?.slice(0, 5)})</span>
        </button>
      )}

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
          <input value={perc ?? ''} placeholder={consiglio.toFixed(0)} inputMode="decimal"
            onChange={e => setPerc(e.target.value.replace(',', '.'))}
            style={{ width: 54, background: C.pozzo, color: C.testo, border: `1px solid ${C.bordo}`,
              borderRadius: 6, padding: '4px 6px', fontFamily: F.mono, fontSize: S.media, textAlign: 'center' }} />
          <span style={{ color: C.spento, fontFamily: F.mono, fontSize: S.base }}>% dell&apos;utile</span>
          {/* ⚠️ Il consiglio si vede sempre, anche quando lo si scavalca: è
              l'unico modo di sapere *da cosa* ti stai scostando. */}
          <span style={{ color: C.fioco, fontFamily: F.mono, fontSize: S.minuta }}>consigliato {consiglio.toFixed(0)}%</span>
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
          <div style={{ fontSize: S.micro, fontFamily: F.mono, color: C.fioco, marginTop: 5, textAlign: 'center' }}>
            l&apos;arrotondamento per difetto manda {eur(r.resto)} in accumulo
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {/* ⚠️⚠️ **Nessun blocco, nemmeno a scalata aperta** (Mattia, 18/10:
            *"tutto troppo vincolante"*). Si può annullare un esito, cambiare
            una quota, togliere o aggiungere una gamba in qualunque momento:
            le casse **si ricalcolano dalla catena** (`casseDi`), quindi non
            c'è niente da disfare. Era il secondo numero memorizzato a rendere
            necessari i divieti, non il registro. */}
        {[['vinto', C.verde], ['perso', C.rosso], [null, C.spento]].map(([e, col]) => (
          <button key={e || 'aperto'} onClick={() => setEsito(e)} style={{
            flex: 1, padding: '6px 0', fontFamily: F.mono, fontSize: S.base, cursor: 'pointer',
            color: esito === e ? col : C.spento,
            background: esito === e ? `linear-gradient(${alpha(col, 0.14)},${alpha(col, 0.14)}), ${C.card}` : C.card,
            border: `1px solid ${alpha(col, esito === e ? 0.5 : 0.18)}`,
          }}>{e === 'vinto' ? '✓ vinto' : e === 'perso' ? '✗ perso' : 'da giocare'}</button>
        ))}
      </div>
    </Card>
  )
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
        fontFamily: F.mono, fontSize: S.base }}>
      {armato
        ? `⚠️ TOCCA ANCORA PER CANCELLARE ${quante === 1 ? 'LA SCALATA' : `LE ${quante} SCALATE`}`
        : '↺ riparti da 0'}
      <span style={{ display: 'block', fontSize: S.micro, color: C.fioco, marginTop: 2 }}>
        {armato ? 'non si torna indietro' : 'cancella lo storico e riparte dal capitale iniziale'}
      </span>
    </button>
  )
}

function Archivio({ storico, onAzzera }) {
  const chiuse = (storico || []).filter(s => s.stato === 'chiusa')
  if (!storico) return <Card><div style={{ fontSize: S.base, fontFamily: F.mono, color: C.spento }}>carico…</div></Card>
  if (!chiuse.length) return (
    <div>
      <Card><div style={{ fontSize: S.base, fontFamily: F.mono, color: C.spento, lineHeight: 1.6 }}>
        Nessuna scalata chiusa. Apri un piano, segna gli esiti e premi <b>STOP</b>:
        da quel momento resta qui dentro, com&apos;era.
      </div></Card>
      {/* ⚠️ Il tasto c'è anche senza scalate chiuse: quella **aperta** è il
          caso in cui serve più spesso — si è provato, non torna, si ricomincia. */}
      {!!storico.length && <Riparti quante={storico.length} onAzzera={onAzzera} />}
    </div>
  )
  const tot = chiuse.reduce((a, s) => a + (Number(s.bankroll_finale) - Number(s.bankroll_iniziale)), 0)
  return (
    <div>
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center' }}>
          {[['SCALATE', String(chiuse.length), C.testo],
            ['CAPITALE ORA', eur(chiuse[0]?.bankroll_finale), C.oro],
            ['IN TUTTO', (tot >= 0 ? '+' : '') + eur(tot), tot >= 0 ? C.verde : C.rosso]].map(([l, v, col]) => (
            <div key={l}>
              <Etichetta>{l}</Etichetta>
              <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: col, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      {chiuse.map(s => {
        const d = Number(s.bankroll_finale) - Number(s.bankroll_iniziale)
        return (
          <Card key={s.id} style={{ marginBottom: 6, padding: '9px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: S.base, color: C.testo }}>
                {String(s.chiusa_il).slice(8, 10)}/{String(s.chiusa_il).slice(5, 7)}
                <span style={{ color: C.spento }}> · {REGOLE[s.regola]?.nome ?? s.regola}</span>
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
      <Riparti quante={storico.length} onAzzera={onAzzera} />
    </div>
  )
}

export default function ScalataPage() {
  const { currentUser } = useAuth()
  const { righe, ricarica: ricaricaPartite } = usaProssime()
  const datiVpm = usaVpm()
  const classifiche = usaClassifiche()
  const reg = usaScalate(currentUser?.id)
  const [modo, setModo] = useState('piano')
  const [erroreApri, setErroreApri] = useState(null)

  const [attMin, setAttMin] = useState(CONSIGLIATO.att)
  const [sceMin, setSceMin] = useState(CONSIGLIATO.scelta)
  const [vpmMin, setVpmMin] = useState(0)
  // ⚠️ `daOra` è il momento da cui ripartire: il tasto ricarica lo rimette ad
  // adesso, così le partite già cominciate escono dalla scaletta. `usaProssime`
  // filtra solo per giorno, quindi a metà pomeriggio la lista conterrebbe
  // ancora le partite delle 13.
  const [daOra, setDaOra] = useState(() => Date.now())
  const [quotaMin, setQuotaMin] = useState(1.70)
  // ⚠️⚠️ **Capitale dedicato, non il conto vero** (scelta di Mattia,
  // 18/10/2026): la scalata ha un suo capitale che vive nelle sue tabelle, e il
  // bankroll del gruppo non si muove. Quando si vorrà renderlo reale,
  // l'accumulo rientrerà come **movimento** — mai scrivendo `users.bankroll`,
  // che è calcolato (regola 1).
  // ⚠️ Il valore proposto è **l'ultimo capitale chiuso**: è la catena del
  // capitale, e si legge da `bankroll_finale` invece di ricostruirla sommando
  // i risultati di tutte le scalate — una somma che basta un record saltato a
  // sfalsare.
  const [bankroll, setBankroll] = useState(null)
  // le partite aggiunte a mano a un passo, per indice di passo
  const [aggiunte, setAggiunte] = useState({})
  const [regola, setRegola] = useState('capitale')
  const [quote, setQuote] = useState({})
  const [perc, setPerc] = useState({})
  const [esiti, setEsiti] = useState({})
  const [tolte, setTolte] = useState([])

  const aperta = reg.aperta
  const bankrollIniziale = aperta ? Number(aperta.bankroll_iniziale) : (bankroll ?? Math.floor(reg.capitale))
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
    return valutate.filter(r =>
      !tolte.includes(r.id) &&
      !r.quoteIncoerenti &&
      iniziaDopo(r, daOra) &&
      r.att != null && r.att * 100 >= attMin &&
      r.scelta != null && r.scelta * 100 >= sceMin &&
      (vpmMin <= 0 || (r.vpm != null && r.vpm >= vpmMin)) &&
      (r.quota ?? 0) >= QUOTA_MINIMA_GAMBA)
  }, [righe, valutate, attMin, sceMin, vpmMin, tolte, daOra])

  // ⚠️ Le fasce sono una **proposta**: stesso giorno, orari entro tre ore. Poi
  // si toglie a mano quello che non piace — è il motivo per cui la pagina esiste.
  // ⚠️ La quota minima **non nasconde** le fasce che non ci arrivano: le marca.
  // Nasconderle vorrebbe dire far sparire partite buone senza dire perché, e
  // la pagina serve a comporre a mano — magari aggiungendo una gamba.
  const passi = useMemo(() => {
    const base = fasce(candidate)
    // ⚠️ Le aggiunte a mano **non ricompongono le fasce**: una partita messa nel
    // passo 1 resta nel passo 1 anche se il suo orario sarebbe di un altro
    // blocco. È il punto della pagina — il raggruppamento è una proposta, la
    // composizione è sua.
    const usate = new Set(Object.values(aggiunte).flat())
    return base.map((f, i) => ({
      ...f,
      partite: [
        ...f.partite.filter(p => !usate.has(p.id)),
        ...(aggiunte[i] || []).map(id => candidate.find(c => c.id === id)).filter(Boolean),
      ],
    })).filter(f => f.partite.length)
  }, [candidate, aggiunte])

  // ⚠️ Il conto filtro per filtro: quando non esce niente bisogna sapere
  // **quale** soglia ha tagliato, o si gira la manopola sbagliata.
  const imbuto = useMemo(() => {
    if (!righe) return null
    const a = valutate.filter(r => r.att != null && r.att * 100 >= attMin)
    const b = a.filter(r => r.scelta != null && r.scelta * 100 >= sceMin)
    const c = b.filter(r => vpmMin <= 0 || (r.vpm != null && r.vpm >= vpmMin))
    const d = c.filter(r => (r.quota ?? 0) >= QUOTA_MINIMA_GAMBA)
    return { future: righe.length, att: a.length, scelta: b.length, vpm: c.length, quota: d.length }
  }, [righe, valutate, attMin, sceMin, vpmMin])

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
      : (i) => !!esiti[i]
    let i = 0
    while (dato(i)) i++
    return i
  }, [aperta, reg.passi, esiti])

  // ⚠️⚠️ **Le casse si RICALCOLANO dalla catena dei passi**, sempre: né lette
  // dal database né aggiornate a ogni esito. È quello che permette di togliere
  // tutti i blocchi — annullare un esito o cambiare una quota si propaga da
  // solo, perché non c'è un secondo numero da disfare.
  const casse = useMemo(() => {
    const c = aperta
      ? casseDi(reg.passi, posta, regola, (i) => perc[i])
      : casseDi(passi.map((f, i) => ({
        quota: f.partite.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1),
        esito: esiti[i] ?? 'aperto',
      })), posta, regola, (i) => perc[i])
    const live = bankrollIniziale - posta + c.accumulo + c.cassa
    return { inGioco: c.cassa, accumulo: c.accumulo, vivi: c.vivi, live, risultato: c.accumulo + c.cassa - posta }
  }, [aperta, reg.passi, passi, esiti, quote, perc, regola, posta, bankrollIniziale])

  if (!righe) return <div style={{ padding: 16, color: C.spento, fontFamily: F.mono, fontSize: S.corpo }}>carico le partite…</div>

  const Tasto = ({ onClick, children, attivo, colore = C.oro, style }) => (
    <button onClick={onClick} style={{ padding: '5px 10px', fontSize: S.base, fontFamily: F.mono, cursor: 'pointer',
      color: attivo ? colore : C.spento, background: attivo ? `linear-gradient(${alpha(colore, .14)},${alpha(colore, .14)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(colore, attivo ? .5 : .18)}`, ...style }}>{children}</button>
  )
  const Numero = ({ label, valore, passo, set, suffisso = '' }) => (
    <div style={{ display: 'contents' }}>
      <div style={{ fontSize: S.corpo, fontFamily: F.mono, color: C.testo }}>{label}</div>
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
        <h2 style={{ fontSize: S.titolo, fontFamily: F.mono, letterSpacing: '0.1em', color: C.testo, margin: 0 }}>ROAD TO WEEKEND</h2>
        {/* ⚠️ Un **interruttore**, non una voce di menu: il menu è per le
            pagine, questa è un'altra vista della stessa cosa — e ci si passa
            dentro continuamente mentre si gioca. */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['piano', 'PIANO'], ['archivio', `ARCHIVIO${reg.storico?.length ? ` ${reg.storico.filter(x => x.stato === 'chiusa').length}` : ''}`]].map(([k, l]) => (
            <Tasto key={k} attivo={modo === k} onClick={() => setModo(k)} colore={C.celestePieno}>{l}</Tasto>
          ))}
        </div>
      </div>

      {reg.errore && (
        <Card style={{ marginBottom: 10, borderColor: alpha(C.rosso, .4) }}>
          <div style={{ color: C.rosso, fontSize: S.base, fontFamily: F.mono }}>registro: {reg.errore}</div>
        </Card>
      )}

      {/* ⚠️ Azzerare il registro azzera anche lo stato della pagina: esiti e
          percentuali sono indicizzati per passo, e passi non ce ne sono più. */}
      {modo === 'archivio' && (
        <Archivio storico={reg.storico} onAzzera={async () => {
          await reg.azzeraTutto()
          setEsiti({}); setPerc({}); setTolte([]); setAggiunte({}); setQuote({}); setBankroll(null)
        }} />
      )}
      {modo === 'piano' && <>



      {/* ── Le casse ───────────────────────────────────────────────────── */}
      {/* ⚠️ **In cima e col bordo acceso** (richiesta di Mattia): è il conto, e
          un conto che sta in mezzo alla pagina si legge dopo le partite — cioè
          dopo aver già deciso. Il fondo è una tinta d'oro appena accesa su
          fondo opaco (`linear-gradient(tinta,tinta), C.card`): una tinta
          semitrasparente da sola si illuminerebbe su sfondo chiaro. */}
      <Card style={{ marginBottom: 12, borderColor: alpha(C.oro, 0.45),
        background: `linear-gradient(${alpha(C.oro, 0.045)},${alpha(C.oro, 0.045)}), ${C.card}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center' }}>
          {[['IN GIOCO', casse.inGioco, C.oro], ['ACCUMULO', casse.accumulo, C.verde],
            ['BANKROLL LIVE', casse.live, casse.live >= bankrollIniziale ? C.verde : C.rosso]].map(([l, v, col]) => (
            <div key={l}>
              <Etichetta>{l}</Etichetta>
              <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: col, marginTop: 3 }}>{eur(v)}</div>
            </div>
          ))}
        </div>

        {/* ⚠️ Il bankroll iniziale sta **qui** e non fra i filtri (richiesta di
            Mattia): i filtri scelgono le partite, questo è un conto. Il valore
            che propone è quello vero del conto, e `↺` ci torna. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto 1fr', gap: 6,
          alignItems: 'center', marginTop: 10, paddingTop: 9, borderTop: `1px solid ${alpha(C.testo, 0.1)}` }}>
          <div style={{ fontSize: S.base, fontFamily: F.mono, color: C.spento }}>bankroll iniziale</div>
          {/* ⚠️ **Un euro per scatto, tenendo premuto** (Mattia, 18/10): a 10 € per
              tocco il bankroll si poteva solo approssimare, e la puntata è il suo
              10% — cioè il passo del bankroll decide il passo della puntata. */}
          <TastoRipeti onScatto={() => setBankroll(Math.max(10, bankrollIniziale - 1))}>−</TastoRipeti>
          <div style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.testo, minWidth: 64, textAlign: 'center' }}>
            {eur(bankrollIniziale)}
          </div>
          <TastoRipeti onScatto={() => setBankroll(bankrollIniziale + 1)}>+</TastoRipeti>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            {currentUser?.bankroll != null && Math.floor(Number(currentUser.bankroll)) !== bankrollIniziale && (
              <button onClick={() => setBankroll(null)} title="torna al bankroll vero del conto"
                style={{ background: 'transparent', border: 'none', color: C.oro, cursor: 'pointer', fontFamily: F.mono, fontSize: S.minuta }}>
                ↺ conto: {eur(Math.floor(Number(currentUser.bankroll)))}
              </button>
            )}
            <span style={{ fontFamily: F.mono, fontSize: S.base, color: C.spento }}>
              prossima puntata <b style={{ color: C.oro }}>{eur(posta)}</b>
              <span style={{ fontSize: S.micro, color: C.fioco }}> (10%)</span>
            </span>
          </div>
        </div>

        {casse.vivi > 0 && (
          <div style={{ fontSize: S.minuta, fontFamily: F.mono, color: C.spento, marginTop: 8, textAlign: 'center' }}>
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
            await reg.chiudi(Math.floor(casse.live), { cassa: casse.inGioco, accumulo: casse.accumulo })
            setEsiti({}); setPerc({}); setTolte([]); setAggiunte({}); setBankroll(null)
          }}
            style={{ width: '100%', marginTop: 10, padding: '8px 0', background: `linear-gradient(${alpha(C.rosso, .1)},${alpha(C.rosso, .1)}), ${C.card}`,
              border: `1px solid ${alpha(C.rosso, 0.4)}`, color: C.rosso, fontFamily: F.mono, fontSize: S.base, cursor: 'pointer' }}>
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
          <button disabled={!passi.length || reg.occupato}
            onClick={async () => {
              const piano = []
              let p = posta
              for (const [i, f] of passi.entries()) {
                const q = f.partite.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1)
                piano.push({
                  giorno: f.giorno, posta: p, quota: Number(q.toFixed(4)),
                  gambe: f.partite.map(g => ({ ...g, quota: Number(quote[g.id] ?? g.quota) })),
                })
                // il piano salva la catena ipotetica: le puntate vere le
                // ricalcola la pagina man mano che gli esiti arrivano
                const m = p * q
                const pc = perc[i] ?? percentualeConsigliata(regola, { numero: i + 1, montante: m, puntata: p })
                p = applicaIncasso(m, pc, p).rigioca
                if (p < 1) break
              }
              const r = await reg.apri({ bankroll: bankrollIniziale, posta, quotaMinima: quotaMin, regola, piano })
              // ⚠️ L'errore va **a schermo**: un tasto che non fa niente e non
              // dice perché è il modo di non capire mai cosa è andato storto.
              if (r.errore) setErroreApri(r.errore)
              else { setErroreApri(null); setEsiti({}); setPerc({}) }
            }}
            style={{ width: '100%', marginTop: 10, padding: '9px 0',
              background: passi.length ? `linear-gradient(${alpha(C.verde, .12)},${alpha(C.verde, .12)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(C.verde, passi.length ? 0.5 : 0.15)}`,
              color: passi.length ? C.verde : C.fioco, fontFamily: F.mono, fontSize: S.base,
              cursor: passi.length ? 'pointer' : 'default' }}>
            {reg.occupato ? 'salvo il piano…' : `▶ APRI SCALATA — congela ${passi.length} passi e comincia a registrare`}
          </button>
        )}
        {erroreApri && (
          <div style={{ marginTop: 6, fontSize: S.minuta, fontFamily: F.mono, color: C.rosso, textAlign: 'center' }}>
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
          <button onClick={() => { setAttMin(CONSIGLIATO.att); setSceMin(CONSIGLIATO.scelta); setVpmMin(0) }}
            style={{
              textAlign: 'right', cursor: 'pointer', padding: '4px 8px', lineHeight: 1.35,
              color: C.testo, fontFamily: F.mono,
              background: attMin === CONSIGLIATO.att && sceMin === CONSIGLIATO.scelta && !vpmMin
                ? `linear-gradient(${alpha(C.verde, .12)},${alpha(C.verde, .12)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(C.verde, attMin === CONSIGLIATO.att && sceMin === CONSIGLIATO.scelta && !vpmMin ? 0.5 : 0.2)}`,
            }}>
            <div style={{ fontSize: S.micro, color: C.verde, letterSpacing: '0.08em' }}>✓ CONSIGLIATO</div>
            <div style={{ fontSize: S.corpo, fontWeight: 700, color: C.testo }}>
              att {CONSIGLIATO.att}% · scelta {CONSIGLIATO.scelta}%
            </div>
            <div style={{ fontSize: S.micro, color: C.spento }}>{CONSIGLIATO.perche}</div>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: '4px 6px',
          alignItems: 'center', marginTop: 7 }}>
          <Numero label="attendibilità ≥" valore={attMin} passo={1} set={setAttMin} suffisso="%" />
          <Numero label="scelta ≥" valore={sceMin} passo={1} set={setSceMin} suffisso="%" />
          <Numero label="VPM ≥" valore={vpmMin ? vpmMin.toFixed(1).replace('.', ',') : 'tutti'} passo={0.5} set={setVpmMin} />
          <Numero label="quota schedina ≥" valore={quotaMin.toFixed(2).replace('.', ',')} passo={0.05} set={setQuotaMin} />
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(REGOLE).map(([k, R]) => (
            <Tasto key={k} attivo={regola === k} onClick={() => setRegola(k)} colore={C.celestePieno}>{R.nome}</Tasto>
          ))}
          {/* ⚠️ A scalata aperta il ricarica **azzera il piano e lascia i
              soldi dove sono**: è la risposta di Mattia a *"cosa succede alle
              scalate dimenticate"* — il denaro è lo stato della scalata, il
              piano è settimanale. */}
          <Tasto colore={C.oro} style={{ marginLeft: 'auto' }}
            onClick={() => {
              setTolte([]); setAggiunte({}); setDaOra(Date.now())
              // ⚠️ **E rilegge davvero le partite.** Finché `usaProssime` non
              // aveva memoria questo tasto non ricaricava niente — spostava
              // solo l'orologio — e il nome mentiva: le partite erano quelle
              // scaricate all'avvio della sessione. Ora la memoria si butta
              // qui, che è l'unico posto dove qualcuno ha chiesto dati nuovi.
              ricaricaPartite()
              if (aperta) reg.azzeraPiano()
            }}>
            ↻ {aperta ? 'nuovo piano' : 'ricarica'}
          </Tasto>
        </div>
        <div style={{ fontSize: S.minuta, fontFamily: F.mono, color: C.spento, marginTop: 7, lineHeight: 1.5 }}>
          {REGOLE[regola].desc} · posta <b style={{ color: C.testo }}>{posta}</b> (10% del bankroll, per difetto)
          · gamba ≥ {QUOTA_MINIMA_GAMBA} · massimo {MAX_GAMBE} gambe
        </div>
      </Card>

      {/* ── La scaletta ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Etichetta>LA SCALETTA</Etichetta>
        <span style={{ fontFamily: F.mono, fontSize: S.minuta, color: C.spento }}>
          {candidate.length} partite · {passi.length} passi
        </span>
      </div>

      {!passi.length && imbuto && (
        <Card><div style={{ fontSize: S.base, fontFamily: F.mono, color: C.spento, lineHeight: 1.7 }}>
          Nessuna partita passa i filtri. Dove si sono fermate:
          <div style={{ marginTop: 6, color: C.testo }}>
            {imbuto.future} future → <b>{imbuto.att}</b> sopra attendibilità {attMin}%
            {' '}→ <b>{imbuto.scelta}</b> sopra scelta {sceMin}%
            {vpmMin > 0 && <> → <b>{imbuto.vpm}</b> sopra VPM {vpmMin.toFixed(1).replace('.', ',')}</>}
            {' '}→ <b>{imbuto.quota}</b> sopra quota {QUOTA_MINIMA_GAMBA}
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
          const p = casseDi(reg.passi.slice(0, i), posta, regola, (k) => perc[k]).cassa
          if (p < 1 || i > frontiera) return null
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
            <Passo key={riga.id} numero={i + 1} gambe={gambe} giorno={riga.giorno} ora={gambe[0]?.ora?.slice(0, 5)}
              posta={p} regola={regola} quotaMinima={quotaMin} colore={coloreDi(i)} classifiche={classifiche}
              quote={quote} setQuote={setQuote}
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
              perc={perc[i]} setPerc={(v) => setPerc(x => ({ ...x, [i]: v }))}
              esito={riga.esito === 'aperto' ? null : riga.esito}
              setEsito={(e) => {
                const q = gambe.reduce((a, g) => a * Number(g.quota), 1)
                const m = p * q
                const pc = perc[i] ?? percentualeConsigliata(regola, { numero: i + 1, montante: m, puntata: p })
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
          let p = posta
          for (let k = 0; k < i; k++) {
            if (esiti[k] !== 'vinto') { p = 0; break }
            const q = passi[k].partite.reduce((a, g) => a * (Number(quote[g.id] ?? g.quota) || 1), 1)
            const m = p * q
            const pc = perc[k] ?? percentualeConsigliata(regola, { numero: k + 1, montante: m, puntata: p })
            p = applicaIncasso(m, pc, p).rigioca
          }
          if (p < 1 || i > frontiera) return null
          return (
            <Passo key={f.giorno + f.ora} numero={i + 1} gambe={f.partite} giorno={f.giorno} ora={f.ora}
              posta={p} regola={regola} quotaMinima={quotaMin} colore={coloreDi(i)} classifiche={classifiche}
              prossima={prossimaDi(i)}
              onAggiunge={() => { const n = prossimaDi(i); if (n) setAggiunte(a => ({ ...a, [i]: [...(a[i] || []), n.id] })) }}
              quote={quote} setQuote={setQuote}
              perc={perc[i]} setPerc={(v) => setPerc(x => ({ ...x, [i]: v }))}
              esito={esiti[i] ?? null} setEsito={(e) => setEsiti(x => ({ ...x, [i]: e }))}
              onToglie={(id) => setTolte(t => [...t, id])} />
          )
        })}

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
          <div style={{ fontFamily: F.mono, fontSize: S.minuta, color: C.spento, textAlign: 'center',
            marginTop: 8, padding: '7px 0', border: `1px dashed ${alpha(C.testo, 0.12)}` }}>
            {nascosti === 1 ? 'un altro passo in programma' : `altri ${nascosti} passi in programma`}
            {' · '}<span style={{ color: C.fioco }}>compare quando segni l&apos;esito del passo {frontiera + 1}</span>
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
            <span style={{ fontFamily: F.mono, fontSize: S.micro, color: C.fioco }}>
              {candidate.length} in scaletta{tolte.length ? ` · ${tolte.length} tolte` : ''}
            </span>
          </div>
          {/* ⚠️ Un filo meno spenta di prima (0,62 → 0,78): con tutta la riga
              colorata il velo rendeva illeggibili le tinte scure, soprattutto
              il blu e il viola dei passi più in là. */}
          <Card style={{ padding: '4px 10px', opacity: 0.78 }}>
            {[...candidate, ...(righe || []).filter(r => tolte.includes(r.id))].map((g, k) => {
              const fuori = tolte.includes(g.id)
              // ⚠️ Il colore è **quello del passo che la contiene**: è il filo
              // che lega l'elenco ai passi sopra. Chi non sta in nessun passo
              // resta grigio, e si vede subito che è materiale non usato.
              const iPasso = passi.findIndex(f => f.partite.some(x => x.id === g.id))
              const col = fuori ? C.fioco : iPasso >= 0 ? coloreDi(iPasso) : C.grigio
              return (
                <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '58px minmax(0,1fr) 26px 42px 18px',
                  gap: 6, alignItems: 'center', padding: '5px 0', fontFamily: F.mono, fontSize: S.minuta,
                  borderTop: k ? `1px solid ${alpha(C.testo, 0.05)}` : 'none',
                  textDecoration: fuori ? 'line-through' : 'none' }}>
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
                    <span style={{ color: fuori ? C.fioco : col, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.sans, fontSize: S.base, display: 'block' }}>
                      {g.casa} — {g.trasferta}
                    </span>
                    <span style={{ color: fuori ? C.fioco : alpha(col, 0.75), fontSize: S.micro, display: 'block' }}>
                      att {pct(g.att)} · sce {pct(g.scelta)}
                      {g.vpm != null && ` · VPM ${Number(g.vpm).toFixed(2).replace('.', ',')}`}
                    </span>
                  </span>
                  <span style={{ color: fuori ? C.fioco : col, textAlign: 'center' }}>{g.giocata}</span>
                  <span style={{ color: col, textAlign: 'right' }}>{Number(g.quota).toFixed(2).replace('.', ',')}</span>
                  <button onClick={() => setTolte(t => fuori ? t.filter(x => x !== g.id) : [...t, g.id])}
                    title={fuori ? 'rimetti in scaletta' : 'togli dalla scaletta'}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                      color: fuori ? C.verde : C.fioco, fontSize: S.media }}>{fuori ? '+' : '×'}</button>
                </div>
              )
            })}
          </Card>
        </div>
      )}
      </>}
    </div>
  )
}
