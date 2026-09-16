// L'attendibilità di una partita e la giocata suggerita. Solo calcoli, niente
// interfaccia: la usa la pagina Partite e la userà la compilazione delle spin.
//
// Attendibilità = probabilità che la giocata vinca, stimata dal consenso del
// mercato: la media di ~40 book (avg_ap_*) con il margine tolto. Sui favoriti
// il mercato è calibrato, anzi un filo conservativo (+3 punti, misurato). Nessun
// modello e nessun indice di forma lo migliora: misurato anche quello.
// Vedi STATO.md, "La misura che conta" e "Il segnale Como".
//
// Le regole di Mattia (16/09/2026):
//   · si gioca 1 o 2, mai la X secca
//   · quota < 1,25  → favorito + over 1,5 (se non basta, over 2,5)
//   · quota > 1,90  → doppia chance (1X o X2), e l'attendibilità è quella
//                     della doppia, non del segno secco
//   · gialli = le più attendibili, blu = sacrificabili, centro = la perfetta

export const REGOLA_OVER = 1.25
export const REGOLA_DOPPIA = 1.90
export const SOGLIE_DEFAULT = { centro: 0.80, giallo: 0.65, blu: 0.55 }

/** Probabilità normalizzate da una terna di quote: toglie il margine. */
export function probabilita(q1, qx, q2) {
  if (!q1 || !qx || !q2) return null
  const s = 1 / q1 + 1 / qx + 1 / q2
  return { p1: 1 / q1 / s, px: 1 / qx / s, p2: 1 / q2 / s }
}

/** Quota doppia chance da due quote secche: 1/(1/a + 1/b). È come la prezzano i book. */
export const quotaDoppia = (a, b) => (a && b) ? 1 / (1 / a + 1 / b) : null

/**
 * Arricchisce una riga di prossime_partite con attendibilità e giocata.
 * Restituisce { prob: null } se manca il consenso.
 */
export function valuta(r) {
  const p = probabilita(r.avg_ap_1, r.avg_ap_x, r.avg_ap_2)
  if (!p) return { ...r, prob: null }

  const segno = p.p1 >= p.p2 ? '1' : '2'          // il favorito fra 1 e 2: la X è esclusa
  const prob = segno === '1' ? p.p1 : p.p2
  const quota = segno === '1' ? r.b365_1 : r.b365_2 // può mancare: The Odds API non ha Bet365
  const equo = prob ? 1 / prob : null
  const scarto = quota && equo ? quota / equo - 1 : null

  let giocata = segno, quotaGiocata = quota, nota = null
  if (quota && quota < REGOLA_OVER) {
    giocata = `${segno} + over 1,5`
    quotaGiocata = null
    nota = `quota ${quota} sotto ${REGOLA_OVER}: si aggiunge l'over 1,5 (se non basta, over 2,5 @${r.b365_over25 ?? '—'}). La quota combinata va letta sul book.`
  } else if (quota && quota > REGOLA_DOPPIA) {
    giocata = segno === '1' ? '1X' : 'X2'
    quotaGiocata = segno === '1' ? quotaDoppia(r.b365_1, r.b365_x) : quotaDoppia(r.b365_x, r.b365_2)
    nota = `quota ${quota} sopra ${REGOLA_DOPPIA}: doppia chance, stimata dalle quote 1X2`
  }

  const probDoppia = segno === '1' ? p.p1 + p.px : p.p2 + p.px
  // Per "+ over" resta la probabilità del segno: un limite superiore, perché la
  // combinata vale meno (manca l'1-0) e non abbiamo le quote per dirlo.
  const probGiocata = giocata.length === 2 ? probDoppia : prob

  return { ...r, p, segno, prob, quota, equo, scarto, giocata, quotaGiocata, nota, probDoppia, probGiocata }
}

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
