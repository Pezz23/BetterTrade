// VPM — Valutazione Partita Manuale.
//
// È l'automazione dell'iter che Mattia fa a mano prima di una giocata
// (8-9/10/2026): 1) la classifica con gol fatti, subiti e differenza reti,
// 2) come sta andando nelle ultime partite, 3) come va **nel ruolo** che avrà
// domenica — ci sono squadre che in casa sono un'altra squadra — e 4) il testa
// a testa, per sapere se quella partita pareggia sempre.
//
// ⚠️ "Manuale" sta per "riproduce il giudizio manuale", NON per "lo scrive una
// persona": VPM è calcolato. L'indice messo a mano era un'altra idea (voce 4
// della to-do) e questa l'ha sostituita.
//
// ⚠️ VPM non è una probabilità e non è calibrato su niente: dice **quale segno
// preferiscono le squadre e quanto**, guardando solo il campo. La probabilità
// resta l'attendibilità, che viene dal mercato. VPM serve a vedere **dove i due
// litigano**: è lì che il metodo di Mattia guadagnava. Non entra nella
// selezione delle spin, come il Grado.
//
// ⚠️ **Il 9/10/2026 è stato girato.** La prima versione dava un voto alla
// *giocata consigliata dal mercato*: su Lens-Lyon diceva **3,68**, perché la
// consigliata era l'1 su Lens e il campo dice Lyon. Matematicamente coerente,
// ma Mattia l'ha letto come un errore — *"sbagliatissimo, è una partita minimo
// da 6"* — e aveva ragione sulla sostanza: lui non guarda quanto è buono l'1,
// guarda **chi è più squadra**. Lo stesso calcolo dal lato di Lyon fa **7,32**
// (i due sono speculari: sommano 11). Ora VPM dice il segno del campo, e il
// disaccordo col mercato è il **colore**, non il numero.

// ── I pesi dei parametri ──────────────────────────────────────────────────────
// Scelti il 9/10/2026 sulle correlazioni misurate su 561 squadre-stagione
// (24/25 e 25/26). Le due cose che quelle correlazioni impongono:
//
// · vittorie e differenza reti correlano **0,93**: sono lo stesso numero due
//   volte. Nell'Excel di Mattia pesavano 0,30 + 0,20 = metà dell'indice su
//   un'informazione sola, quindi la differenza reti scende a 0,05 — resta per
//   distinguere chi vince di misura da chi stravince.
// · gol fatti e tiri in porta correlano 0,90, gol subiti e tiri concessi 0,81:
//   i tiri non sono un parametro nuovo, sono la **versione meno rumorosa**
//   dello stesso. Un gol è un evento fortunato, cinque tiri in porta a partita
//   no — quindi stanno accanto ai gol, non al posto loro.
//
// Le vittorie restano il peso più alto perché è quello che si gioca: non si
// mette mai la X, quindi un pareggio vale zero ed è giusto che valga zero.
// La difesa pesa più dell'attacco perché **il pareggio nasce dai gol presi**:
// chi segna poco e non prende gol vince di misura, chi segna tanto e ne prende
// tanti fa 2-2 e ci fa perdere la schedina.
export const PESI = {
  vittorie: 0.30,   // V / partite giocate
  gs:       0.18,   // gol subiti, invertito
  gf:       0.13,   // gol fatti
  dominio:  0.13,   // tiri in porta fatti / (fatti + concessi)
  tc:       0.12,   // tiri in porta concessi, invertito
  tf:       0.09,   // tiri in porta fatti
  dr:       0.05,   // differenza reti / partite giocate
}

// ⚠️ Il possesso palla NON c'è: football-data non lo pubblica, e nessuna delle
// 59 colonne di `partite` lo contiene. `dominio` è il suo sostituto e dice una
// cosa migliore: il possesso misura chi tiene la palla (il Barcellona ha il 70%
// anche quando perde), il dominio misura **chi fa male**.
export const INVERTITI = ['gs', 'tc']   // meno è meglio

// ── I pesi dei tre strati ─────────────────────────────────────────────────────
// I passi 1-2-3 dell'iter sono lo stesso calcolo su tre finestre.
export const PESI_STRATI = { stagione: 0.45, forma: 0.30, ruolo: 0.25 }

// ⚠️ A ottobre i tre strati guardano quasi le stesse partite: con 5 giornate
// giocate "le ultime 5" SONO la stagione. Lo strato forma comincia a dire
// qualcosa di diverso da gennaio, e va detto a schermo invece di far finta.
export const PARTITE_FINESTRA = 5
export const MIN_PARTITE = 3   // sotto, VPM non c'è: nessun numero, non un numero prudente

// ── Le ancore della scala ─────────────────────────────────────────────────────
// 5° e 95° percentile misurati il 9/10/2026 su 24/25 + 25/26 (10.466 partite):
// 561 squadre-stagione, 18.682 finestre di 5, 8.219 finestre di 5 in casa e
// altrettante fuori.
//
// ⚠️ Percentili e non minimo-massimo: una squadra mostruosa non deve schiacciare
// la scala di tutte le altre. ⚠️ **Fissi**, come GRADO_MIN/GRADO_MAX: se si
// ricalcolassero sulle squadre del weekend, la stessa squadra cambierebbe VPM
// ogni settimana e il numero non sarebbe più confrontabile con quello di sette
// giorni prima.
//
// ⚠️ Casa e fuori hanno ancore **separate**, ed è la misura a imporlo: la
// mediana del dominio è 0,548 in casa e 0,447 fuori, le vittorie 0,40 contro
// 0,20. Con ancore uniche ogni squadra di casa prenderebbe un bonus gratuito —
// e il fattore campo sta già dentro la quota, quindi sarebbe contato due volte.
// Così invece "8,0 fuori" vuol dire "forte rispetto a come vanno le altre in
// trasferta", che è il confronto giusto.
export const ANCORE = {
  stagione: { vittorie:[0.158,0.647], dr:[-0.912,1.105], gf:[0.816,2.105], gs:[1.882,0.886], tf:[3.105,6.059], tc:[5.647,3.119], dominio:[0.375,0.642] },
  forma:    { vittorie:[0,0.8],       dr:[-1.4,1.6],     gf:[0.4,2.4],     gs:[2.4,0.6],     tf:[2.4,6.6],     tc:[6.4,2.4],     dominio:[0.316,0.688] },
  casa:     { vittorie:[0,0.8],       dr:[-1.2,1.8],     gf:[0.6,2.6],     gs:[2.2,0.4],     tf:[2.8,7.2],     tc:[6.0,2.2],     dominio:[0.361,0.732] },
  fuori:    { vittorie:[0,0.8],       dr:[-1.8,1.2],     gf:[0.4,2.2],     gs:[2.6,0.6],     tf:[2.0,6.2],     tc:[7.0,2.8],     dominio:[0.273,0.641] },
}

/** Da valore grezzo a 1-10, con gli estremi già orientati (il secondo è il "meglio"). */
function inScala(x, [peggio, meglio]) {
  const t = (x - peggio) / (meglio - peggio)
  return Math.min(10, Math.max(1, 1 + 9 * t))
}

/**
 * I sette parametri per partita giocata, dalle somme grezze di una finestra:
 * `{ n, v, gf, gs, tf, tc }` — il formato che restituisce `vpm_dati()` (sql/20)
 * e che lo script costruisce dalle partite. Una forma sola, due sorgenti.
 */
export function parametri(somme) {
  if (!somme?.n) return null
  const { n, v, gf, gs, tf, tc } = somme
  return {
    n,
    vittorie: v / n,
    dr: (gf - gs) / n,
    gf: gf / n,
    gs: gs / n,
    tf: tf / n,
    tc: tc / n,
    dominio: tf + tc ? tf / (tf + tc) : 0.5,
  }
}

/** Le somme di una finestra, da una lista di partite viste dalla squadra. */
export function somme(partite) {
  if (!partite?.length) return null
  const t = (c) => partite.reduce((a, p) => a + p[c], 0)
  return { n: partite.length, v: t('v'), gf: t('gf'), gs: t('gs'), tf: t('tf'), tc: t('tc') }
}

/** Il punteggio 1-10 di uno strato, con il dettaglio parametro per parametro. */
export function strato(par, ancore) {
  if (!par) return null
  const voci = {}
  let tot = 0
  for (const [k, peso] of Object.entries(PESI)) {
    const v = inScala(par[k], ancore[k])
    voci[k] = v
    tot += peso * v
  }
  return { punti: tot, voci, n: par.n }
}

/**
 * La forza di una squadra nel ruolo che avrà: unisce i tre strati.
 *
 * ⚠️ Lo strato si guadagna il peso in proporzione alle partite che ha. A
 * ottobre le partite in casa giocate sono 1-3, non 5: invece di far finta di
 * averne cinque, il blocco prende il suo peso × (quante ne ha / 5) e il resto
 * torna alla stagione. Così l'indice si appoggia su quello che esiste, e il
 * peso cresce da sé col calendario.
 */
export function forza({ stagione, forma, ruolo }, dove) {
  const sStagione = strato(stagione, ANCORE.stagione)
  if (!sStagione || stagione.n < MIN_PARTITE) return null
  const sForma = strato(forma, ANCORE.forma)
  const sRuolo = strato(ruolo, ANCORE[dove])

  const quota = (s, peso) => (s ? peso * Math.min(1, s.n / PARTITE_FINESTRA) : 0)
  const pForma = quota(sForma, PESI_STRATI.forma)
  const pRuolo = quota(sRuolo, PESI_STRATI.ruolo)
  const pStagione = 1 - pForma - pRuolo

  return {
    punti: pStagione * sStagione.punti + pForma * (sForma?.punti ?? 0) + pRuolo * (sRuolo?.punti ?? 0),
    strati: { stagione: sStagione, forma: sForma, ruolo: sRuolo },
    pesi: { stagione: pStagione, forma: pForma, ruolo: pRuolo },
  }
}

/**
 * La forza di una squadra dalle quattro finestre di `vpm_dati()`, nel ruolo
 * che avrà: `{ stagione, forma, casa, fuori }` → il punteggio del ruolo giusto.
 */
export function forzaDi(finestre, dove) {
  if (!finestre) return null
  return forza({
    stagione: parametri(finestre.stagione),
    forma: parametri(finestre.forma),
    ruolo: parametri(finestre[dove]),
  }, dove)
}

// Come si chiamano a schermo, nell'ordine dei pesi.
export const ETICHETTE = {
  vittorie: 'Vittorie',
  gs: 'Gol subiti',
  gf: 'Gol fatti',
  dominio: 'Dominio',
  tc: 'Tiri concessi',
  tf: 'Tiri in porta',
  dr: 'Differenza reti',
}

export const NOMI_STRATI = { stagione: 'Stagione', forma: 'Forma', ruolo: 'Nel ruolo' }

/**
 * Ogni parametro con i tre strati già fusi, per mostrare **da dove viene** la
 * forza nella scheda della partita.
 *
 * ⚠️ Usa gli stessi pesi degli strati, quindi vale l'identità
 * `Σ PESI[k] × vociPesate[k] = forza.punti`: se un giorno non tornasse, uno dei
 * due calcoli è stato toccato senza l'altro. `scripts/prova-scheda.js` lo
 * controlla su tutte le partite.
 */
export function vociPesate(f) {
  if (!f) return null
  const out = {}
  for (const k of Object.keys(PESI)) {
    out[k] = 0
    for (const [nome, peso] of Object.entries(f.pesi)) {
      const s = f.strati[nome]
      if (s && peso) out[k] += peso * s.voci[k]
    }
  }
  return out
}

/**
 * Il verdetto del campo: quale segno preferiscono le squadre e quanto.
 *
 * `5,5` = forze pari, `10` = divario massimo. Non scende sotto 5,5 **per
 * costruzione**, perché guarda sempre il lato più forte: la domanda è "quanto
 * è netto", non "quanto è buono il segno del mercato".
 */
export function vpm(forzaCasa, forzaFuori) {
  if (!forzaCasa || !forzaFuori) return null
  const scarto = forzaCasa.punti - forzaFuori.punti
  return {
    segno: scarto >= 0 ? '1' : '2',
    punti: Math.min(10, 5.5 + Math.abs(scarto) / 2),
  }
}

// Sotto questa soglia il campo **non si pronuncia**: le due squadre si
// assomigliano troppo perché la preferenza voglia dire qualcosa, e il colore
// resta grigio invece di gridare accordo o disaccordo.
export const VPM_NETTO = 6.0

/**
 * Le bandierine del testa a testa. ⚠️ Non entrano nel numero, di proposito:
 * sono 6-12 partite di squadre che nel frattempo sono cambiate, e Mattia le usa
 * come ultimo controllo, non come punteggio. Sotto 4 scontri non si dice niente.
 */
/**
 * Tutto quello che serve a schermo per una partita, dai dati di `vpm_dati()`.
 * Sta qui e non nella pagina: la lista e la scheda devono leggere lo stesso
 * numero, e la logica in due posti è la strada per farli divergere.
 *
 * `riga` è una partita futura già valutata (`valuta()` in attendibilita.js):
 * serve `div`, `casa`, `trasferta`, `segno` e `id`.
 */
export function valutaPartita(dati, riga) {
  if (!dati || !riga) return null
  const squadre = dati.squadre?.[riga.div]
  const forzaCasa = forzaDi(squadre?.[riga.casa], 'casa')
  const forzaFuori = forzaDi(squadre?.[riga.trasferta], 'fuori')
  const v = vpm(forzaCasa, forzaFuori)
  return {
    segno: v?.segno ?? null,          // il segno che dice il campo
    punti: v?.punti ?? null,          // quanto è netto, 5,5-10
    // il voto sta qui e non in attendibilita.js perché ha bisogno di VPM, che
    // arriva dal database: la riga da sola non può calcolarlo
    voto: voto(riga.resa, v?.punti ?? null),
    // ⚠️ L'accordo si misura sul **segno**, non sul numero: la giocata
    // consigliata può essere "1 + over 1,5", e lì conta solo l'1.
    accordo: v ? v.segno === riga.segno : null,
    forzaCasa,
    forzaFuori,
    bandiere: bandiere(dati.scontri?.[riga.id], riga.casa, riga.trasferta),
  }
}

/** Il verso di VPM: conferma il mercato, lo contraddice, o non si pronuncia. */
export function verso(v) {
  if (!v || v.punti == null) return null
  if (v.punti < VPM_NETTO) return 'incerto'
  return v.accordo ? 'conferma' : 'contro'
}

// ── Il VOTO: la resa corretta dal campo ──────────────────────────────────────
// Deciso il 10/10/2026. `voto = attendibilità × quota × fattore(VPM)`, cioè la
// **resa** (che è già quota × attendibilità) moltiplicata per un fattore che
// vale 1,00 quando il campo non si pronuncia e 1,10 quando è netto al massimo.
//
// ⚠️ Il fattore è vicino a 1 **di proposito**: VPM va da 5,5 a 10, e
// moltiplicare per quei numeri avrebbe reso il voto 5-10 volte più grande,
// perdendo il significato di "quanto torna per ogni euro" — dove 100% è il
// pareggio. Il tetto del +10% è anche la misura del peso che VPM si è
// guadagnato: nel backtest sulla fascia dei favoriti corti conferma il mercato
// nel 95% dei casi, quindi può correggere, non comandare.
//
// ⚠️ **Ha preso il posto del Grado** (che era la resa in scala 1-10 più il
// livello della quota): due numeri costruiti sulla resa a schermo erano un
// doppione, lo stesso difetto per cui il 2/10 la resa era stata togliere dalla
// barra. Ora la resa si vede accanto al voto, e il Grado non c'è più.
export const FATTORE_SCALA = 45     // (vpm − 5,5) / 45 → da 0 a +0,10

export function fattoreVpm(punti) {
  if (punti == null) return 1
  return 1 + (punti - 5.5) / FATTORE_SCALA
}

/** Il voto di una partita: null se manca la resa (combinata senza quota). */
export function voto(resa, punti) {
  if (resa == null) return null
  return resa * fattoreVpm(punti)
}

export const MIN_SCONTRI = 4      // sotto, il testa a testa non dice niente
export const H2H_PARI = 0.35      // oltre questa quota di X, è una partita da pareggio
export const H2H_DOMINIO = 2 / 3  // una delle due ha vinto almeno due terzi

export function bandiere(conti, casa, trasferta) {
  if (!conti) return []
  const b = []
  const { n = 0, pari = 0, n_campo = 0, pari_campo = 0, vinte_casa = 0, vinte_trasferta = 0 } = conti

  // ⚠️ Si guardano **due** finestre, e la seconda è quella che conta di più:
  // Lens-Lyon ha 1 pareggio negli ultimi 6 scontri, ma 3 su 6 **giocati a
  // Lens** (9/10/2026). È il campo che fa la partita, e la domanda di Mattia
  // era proprio "su questo campo pareggiano sempre?".
  for (const [tot, quanti, dove] of [[n_campo, pari_campo, `a ${casa}`], [n, pari, 'negli scontri']]) {
    if (tot >= MIN_SCONTRI && quanti / tot >= H2H_PARI) {
      b.push({ tipo: 'pari', grave: true, testo: `${quanti} pareggi su ${tot} ${dove}` })
      break   // una sola volta: è lo stesso avviso
    }
  }

  if (n >= MIN_SCONTRI) {
    for (const [sq, v] of [[casa, vinte_casa], [trasferta, vinte_trasferta]]) {
      if (v / n >= H2H_DOMINIO) {
        b.push({ tipo: 'dominio', grave: false, testo: `${sq} ha vinto ${v} degli ultimi ${n}` })
      }
    }
  }
  return b
}
