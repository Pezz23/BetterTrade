// L'attendibilità di una partita e la giocata suggerita. Solo calcoli, niente
// interfaccia: la usa la pagina Partite e la userà la compilazione delle spin.
//
// Attendibilità = probabilità che la giocata vinca, stimata dal consenso del
// mercato: la media di ~40 book (avg_ap_*) con il margine tolto. Sui favoriti
// il mercato è calibrato, anzi un filo conservativo (+3 punti, misurato). Nessun
// modello e nessun indice di forma lo migliora: misurato anche quello.
// Vedi STATO.md, "La misura che conta" e "Il segnale Como".
//
// Le regole di Mattia (16/09/2026, riviste il 23/09):
//   · si gioca il segno secco, 1 o 2 — mai la X
//   · quota < 1,25  → favorito + over 1,5 (se non basta, over 2,5), e
//     l'attendibilità è quella del segno scontata del fattore over (FATTORE_OVER)
//   · gialli = le più attendibili, blu = sacrificabili, centro = la perfetta
//
// La doppia chance è stata tolta il 23/09: "troppo conservativa". Misurato
// sulle 127 proposte già giocate, le doppie prendevano il 64% ma 25 delle 57
// vinte erano finite in pareggio — si vinceva grazie alla X, non al pronostico.
// Le stesse partite giocate a secco: 45%. Si accetta di prenderne meno,
// giocando quello che si è davvero previsto.
//
// Conseguenza: le probabilità crollano (una doppia sta al 75%, il secco sotto)
// e le soglie sono state abbassate di conseguenza. Sulle 189 partite future
// del 23/09: 3 sopra l'80%, 11 sopra il 75%, 28 sopra il 65%, 58 sopra il 55%.

export const REGOLA_OVER = 1.25

// Quando si aggiunge l'over 1,5 non basta che il favorito vinca: servono anche
// due gol. Misurato sull'archivio (rendiconto.js, 1.411 partite dal 19/20):
// fra le volte in cui il favorito ha vinto, il 90,8% aveva almeno due gol.
// Senza questa correzione l'attendibilità dichiarata era 81,1% e la resa
// vera 76,2% — cinque punti di troppo, sempre sulle partite più importanti.
export const FATTORE_OVER = 0.908
export const SOGLIE_DEFAULT = { centro: 0.75, giallo: 0.62, blu: 0.52 }

/** Probabilità normalizzate da una terna di quote: toglie il margine. */
export function probabilita(q1, qx, q2) {
  if (!q1 || !qx || !q2) return null
  const s = 1 / q1 + 1 / qx + 1 / q2
  return { p1: 1 / q1 / s, px: 1 / qx / s, p2: 1 / q2 / s }
}

/**
 * Arricchisce una riga di prossime_partite con attendibilità e giocata.
 * Restituisce { prob: null } se manca il consenso.
 */
export function valuta(r) {
  const p = probabilita(r.avg_ap_1, r.avg_ap_x, r.avg_ap_2)
  if (!p) return { ...r, prob: null }

  const segno = p.p1 >= p.p2 ? '1' : '2'          // il favorito fra 1 e 2: la X è esclusa
  const prob = segno === '1' ? p.p1 : p.p2

  // La terna di quote su cui si gioca, in ordine di preferenza: il bookmaker di
  // riferimento (Codere, l'unico italiano fra quelli disponibili), poi Bet365
  // quando football-data lo porta, poi la massima sul mercato. Codere non quota
  // tutto — mancano Belgio e Portogallo, e le partite lontane — quindi la
  // scala serve davvero. `quotaFonte` dice quale delle tre è.
  const terna = r.book_1 ? { q: [r.book_1, r.book_x, r.book_2], fonte: nomeBook(r.book) }
              : r.b365_1 ? { q: [r.b365_1, r.b365_x, r.b365_2], fonte: 'Bet365' }
              : r.max_ap_1 ? { q: [r.max_ap_1, r.max_ap_x, r.max_ap_2], fonte: 'massima' }
              : null
  const [q1, qx, q2] = terna?.q ?? [null, null, null]
  const quotaFonte = terna?.fonte ?? null
  const quota = segno === '1' ? q1 : q2
  const equo = prob ? 1 / prob : null
  const scarto = quota && equo ? quota / equo - 1 : null

  let giocata = segno, quotaGiocata = quota, nota = null
  if (quota && quota < REGOLA_OVER) {
    giocata = `${segno} + over 1,5`
    quotaGiocata = null
    nota = `quota ${quota} sotto ${REGOLA_OVER}: si aggiunge l'over 1,5 (se non basta, over 2,5 @${r.b365_over25 ?? '—'}). La quota combinata va letta sul book.`
  }

  // Sulla combinata la probabilità è quella del segno scontata del fattore
  // misurato: non abbiamo le quote dell'over 1,5, ma abbiamo lo storico.
  const probGiocata = giocata.includes('over') ? prob * FATTORE_OVER : prob

  return { ...r, p, segno, prob, quota, quotaFonte, q1, qx, q2, equo, scarto, giocata, quotaGiocata, nota, probGiocata }
}

// Il nome leggibile del bookmaker di riferimento, dalla chiave di The Odds API.
const NOMI_BOOK = { codere_it: 'Codere', pinnacle: 'Pinnacle', williamhill: 'William Hill', unibet_eu: 'Unibet', betfair_ex_eu: 'Betfair' }
export const nomeBook = chiave => NOMI_BOOK[chiave] || chiave || '—'

/** centro | giallo | blu | no, dalla probabilità della giocata e dalle soglie. */
export function categoria(probGiocata, soglie = SOGLIE_DEFAULT) {
  if (probGiocata === null || probGiocata === undefined) return 'no'
  if (probGiocata >= soglie.centro) return 'centro'
  if (probGiocata >= soglie.giallo) return 'giallo'
  if (probGiocata >= soglie.blu) return 'blu'
  return 'no'
}

// ── La settimana di gioco ─────────────────────────────────────────────────────
// Va da oggi al lunedì che la chiude. Il lunedì stesso chiude la settimana in
// corso; da martedì si guarda al lunedì successivo.
export function lunediProssimo(settimaneAvanti = 0, oggi = new Date()) {
  const d = new Date(oggi); d.setHours(12, 0, 0, 0)
  const g = d.getDay()                        // 0 dom … 6 sab
  const avanti = g === 1 ? 0 : (8 - g) % 7
  d.setDate(d.getDate() + avanti + 7 * settimaneAvanti)
  return d.toISOString().slice(0, 10)
}

export const FINESTRE = [
  { id: 'settimana', label: 'Fino a lunedì',     fine: () => lunediProssimo(0) },
  { id: 'due',       label: 'Anche la prossima', fine: () => lunediProssimo(1) },
  { id: 'tutte',     label: 'Tutte',             fine: () => '9999-12-31' },
]
