import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Le giocate che ogni indicatore avrebbe scelto, e com'è andata (tabella
// `andamento`, sql/21, riempita da `btscout/scripts/calcola-andamento.js`).
//
// ⚠️ Una chiamata per sessione come `usaClassifiche`: la pagina ne ha bisogno
// tutta insieme (il riassunto in cima e il dettaglio dei tasti sotto vengono
// dalle stesse righe), e rifare la query a ogni tasto premuto sarebbe un
// viaggio in rete per mostrare dati che si hanno già.

let memoria = null
let inCorso = null

function carica() {
  if (memoria) return Promise.resolve(memoria)
  if (!inCorso) {
    inCorso = supabase.from('andamento')
      .select('stagione, ambito, data, weekend, metodo, posizione, div, casa, trasferta, giocata, quota, att, vpm, voto, resa, azzeccata')
      .order('weekend', { ascending: false })
      .order('data', { ascending: false })
      .order('metodo')
      .order('posizione')
      .then(({ data, error }) => {
        inCorso = null
        if (error) throw error
        memoria = data || []
        return memoria
      })
  }
  return inCorso
}

export function usaAndamento() {
  const [righe, setRighe] = useState(memoria)
  const [errore, setErrore] = useState(null)
  useEffect(() => {
    if (memoria) return
    let vivo = true
    carica().then(r => { if (vivo) setRighe(r) }).catch(e => { if (vivo) setErrore(e.message) })
    return () => { vivo = false }
  }, [])
  return { righe, errore }
}

// ⚠️ I nomi dei metodi stanno **qui e non nel database**: la tabella tiene
// sigle corte (`att`, `vpm`…), che è quello che serve a una chiave, mentre
// l'etichetta è roba da schermo e cambia senza migrazioni.
export const METODI = [
  // ⚠️ `soglia` = il minimo sotto cui il valore non si guarda nemmeno. Mattia
  // (12/10/2026): *"attendibilità 37% non la voglio neanche vedere… devo
  // studiare l'attendibilità dei nostri indicatori, non il rumore"*.
  // I valori di partenza vengono dalla tabella delle soglie misurata su 33.141
  // partite: sopra di essi la giocata è arrivata 71,6% (att 60%), 60,8%
  // (VPM 7,0), 67,3% (voto 100%), 52,7% (resa 95%), contro una base del 50,8%.
  // ⚠️ Si cambiano dalla pagina: servono a **cercare** la soglia buona, non a
  // dichiararla già trovata.
  // ⚠️ `decimali` non è estetica: il confronto con la soglia si fa **sul numero
  // arrotondato come si vede**, quindi un valore mostrato con meno cifre di
  // quante ne ha la soglia darebbe celle non verdi accanto a cifre identiche.
  // Stessa trappola già pagata sulle caselle dei gol.
  // ⚠️ L'attendibilità si muove di **1 punto** (scelta di Mattia, 12/10/2026):
  // è la soglia che decide le spin — 75/72/65 — e con scatti da cinque punti
  // non si poteva nemmeno appoggiarsi sopra.
  { id: 'att',  label: 'Attendibilità', breve: 'ATT',  soglia: 0.60, passo: 0.01,   tipo: '%', decimali: 0 },
  // ⚠️ VPM si muove di **0,10** (scelta di Mattia, 12/10/2026): va da 5,5 a 10,
  // e col passo da mezzo punto si saltavano interi gruppi di partite.
  { id: 'vpm',  label: 'VPM',           breve: 'VPM',  soglia: 7.0,  passo: 0.10,   tipo: 'n', decimali: 1 },
  // ⚠️ Il voto si muove di **0,25 punti** per scatto (scelta di Mattia,
  // 12/10/2026) perché è l'indicatore più ripido: fra il 100% e il 101% ci
  // sono 1.098 partite e ogni quarto di punto ne sposta qualche centinaio.
  // Con il passo da un punto si saltava da 2.312 partite a 1.214.
  { id: 'voto', label: 'Voto',          breve: 'VOTO', soglia: 1.00, passo: 0.0025, tipo: '%', decimali: 2 },
  { id: 'resa', label: 'Resa',          breve: 'RESA', soglia: 0.95, passo: 0.01,   tipo: '%', decimali: 0 },
]

/** Il valore come lo si legge: è anche quello su cui si decide il verde. */
export function letto(id, v) {
  if (v == null) return null
  const M = METODI.find(m => m.id === id)
  const d = M?.decimali ?? 0
  const fattore = M?.tipo === 'n' ? 1 : 100
  return Math.round(Number(v) * fattore * 10 ** d) / 10 ** d / fattore
}

/** Come si scrive il valore di un indicatore: VPM è un numero, gli altri sono %. */
export const scrivi = (id, v) => {
  if (v == null) return '—'
  const M = METODI.find(m => m.id === id)
  return M?.tipo === 'n'
    ? Number(v).toFixed(M.decimali).replace('.', ',')
    : (Number(v) * 100).toFixed(M?.decimali ?? 0).replace('.', ',') + '%'
}

/** Il valore di quell'indicatore sta sopra la sua soglia? (sul numero letto) */
export const sopra = (r, id, soglie) => {
  const v = letto(id, r[id])
  // ⚠️ il margine evita che 0,1+0,2 ≠ 0,3 spenga una cella che è esattamente
  // sulla soglia: con passi da 0,0025 i decimali binari non tornano mai esatti
  return v != null && v >= letto(id, soglie[id]) - 1e-9
}

/** La riga supera tutte e quattro le soglie? (le "quattro spunte verdi") */
export const tutteVerdi = (r, soglie) => METODI.every(m => sopra(r, m.id, soglie))

/** Giocate, azzeccate e percentuale di un gruppo di righe. */
export function conta(righe) {
  const giocate = righe.length
  const ok = righe.filter(r => r.azzeccata).length
  return { giocate, ok, perc: giocate ? ok / giocate : null }
}
