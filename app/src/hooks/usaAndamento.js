import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// I dati della pagina Andamento: **contati dal database**, non dal browser.
//
// ⚠️⚠️ **Perché non si scarica più la tabella.** Con le otto stagioni ha
// **101.237 righe**, e PostgREST ne restituisce al massimo **1000 senza
// dirlo**: misurato il 12/10/2026, la pagina ne mostrava 1000 su 1212 credendo
// di averle tutte, e il riassunto era calcolato su cinque sesti dei dati. Un
// troncamento silenzioso è peggio di un errore, perché i numeri sembrano buoni.
// Ora i conteggi li fanno le funzioni di `sql/23` e arrivano già aggregati.
//
// ⚠️ Il dettaglio di un giorno si scarica **solo quando si apre la tendina**:
// sono al massimo 15 righe (36 per il weekend), quindi il tetto non c'entra.

export const METODI = [
  // ⚠️ `soglia` = il minimo sotto cui il valore non si guarda nemmeno. Mattia
  // (12/10/2026): *"attendibilità 37% non la voglio neanche vedere… devo
  // studiare l'attendibilità dei nostri indicatori, non il rumore"*.
  // I valori di partenza vengono dalla tabella misurata su 33.141 partite:
  // sopra di essi la giocata è arrivata 71,7% (att 60%), 61,7% (VPM 7,0),
  // 67,3% (voto 100%), 70,8% (scelta 62%), contro una base del 50,8%.
  // ⚠️ La soglia della **scelta** parte a 62% e non a 60% per una ragione
  // misurata: `scelta = att + fino a 0,10`, quindi a pari soglia selezionerebbe
  // molte più partite di `att` e i due numeri non si potrebbero confrontare.
  // A 62% le partite sono 6.708 contro le 6.212 di att 60%.
  // ⚠️ `decimali` non è estetica: il confronto si fa **sul numero arrotondato
  // come si vede**, quindi un valore mostrato con meno cifre della soglia
  // darebbe celle non verdi accanto a cifre identiche.
  // ⚠️ I passi sono scelti da Mattia e **non sono uguali fra loro**:
  // l'attendibilità di 1 punto perché è la soglia che decide le spin
  // (75/72/65); il voto di 0,25 perché è il più ripido — fra 100% e 101% ci
  // sono 1.098 partite e con passo da un punto si saltava da 2.312 a 1.214.
  { id: 'vpm',  label: 'VPM',           breve: 'VPM',  soglia: 7.0,  passo: 0.10,   tipo: 'n', decimali: 1 },
  { id: 'att',  label: 'Attendibilità', breve: 'ATT',  soglia: 0.60, passo: 0.01,   tipo: '%', decimali: 0 },
  // ⚠️ La **scelta** ha preso il posto della resa il 15/10/2026, come già in
  // barra il 12/10. La resa ordina per quota, quindi mette in cima le partite
  // meno probabili: 51,2% di azzeccate contro il 60,3% dell'attendibilità.
  { id: 'scelta', label: 'Scelta',      breve: 'SCELTA', soglia: 0.62, passo: 0.01, tipo: '%', decimali: 0 },
  { id: 'voto', label: 'Voto',          breve: 'VOTO', soglia: 1.00, passo: 0.0025, tipo: '%', decimali: 2 },
]

/** Le soglie di partenza, una per metodo. */
export const SOGLIE_BASE = Object.fromEntries(METODI.map(m => [m.id, m.soglia]))

/**
 * Le soglie, con le mancanti riempite dal valore di partenza.
 *
 * ⚠️⚠️ **Non è una cintura di sicurezza teorica: è già succeduto.** Il
 * 15/10/2026 `resa` è diventata `scelta` fra i quattro metodi, e con il
 * ricaricamento a caldo di Vite **lo stato di React sopravvive al cambio del
 * modulo**: la pagina si è ritrovata con le chiavi vecchie e **senza** quella
 * nuova. Da lì due guasti in fila, entrambi silenziosi:
 *   - `p_scelta: undefined` **spariva** dal JSON della chiamata, quindi l'SQL
 *     usava il suo valore predefinito **0** — la soglia sembrava partire da
 *     zero e nessuna partita veniva filtrata;
 *   - premendo `+`, `undefined + passo` fa **NaN**, e `JSON.stringify(NaN)` è
 *     **`null`**: la funzione riceveva null, `null >= null` in SQL è null,
 *     quindi *tutti* i conteggi diventavano zero senza un errore.
 * ⚠️ Vale ogni volta che si aggiunge o si rinomina un metodo, non solo quella
 * volta — e **un conteggio sbagliato in silenzio è peggio di un errore**.
 */
export const conSoglie = (soglie) => ({
  ...SOGLIE_BASE,
  // ⚠️ Si scartano anche i valori **non finiti**, non solo quelli assenti: un
  // NaN già finito nello stato sopravvivrebbe allo spread, e la pagina
  // resterebbe bloccata su "NaN%" senza modo di tornare indietro — che è
  // esattamente come l'ha trovata Mattia.
  ...Object.fromEntries(Object.entries(soglie || {}).filter(([, v]) => Number.isFinite(v))),
})

/** Il valore come lo si legge: è anche quello su cui si decide il verde. */
export function letto(id, v) {
  if (v == null) return null
  const M = METODI.find(m => m.id === id)
  const d = M?.decimali ?? 0
  const f = M?.tipo === 'n' ? 1 : 100
  return Math.round(Number(v) * f * 10 ** d) / 10 ** d / f
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
  // ⚠️ il margine evita che i decimali binari spengano una cella che sta
  // esattamente sulla soglia: con passi da 0,0025 non tornano mai esatti
  return v != null && v >= letto(id, soglie[id]) - 1e-9
}

// ⚠️ **Perché un'attesa prima di chiedere.** Le soglie si muovono a tocchi di
// un punto, e ogni tocco farebbe partire tre interrogazioni da ~400 ms in tutto:
// premendo `+` cinque volte di fila si lanciano quindici query per vedere solo
// l'ultima. Con 250 ms di attesa parte una richiesta sola, e il ritardo non si
// percepisce perché il numero sullo schermo cambia subito — cambiano solo i
// conteggi accanto.
const ATTESA = 250

/** Il valore, ma solo dopo che è stato fermo per `ATTESA` millisecondi. */
function usaFermo(valore) {
  const [fermo, setFermo] = useState(valore)
  useEffect(() => {
    const t = setTimeout(() => setFermo(valore), ATTESA)
    return () => clearTimeout(t)
  }, [valore])
  return fermo
}

/** I parametri delle funzioni SQL, nell'ordine in cui le aspettano. */
const par = (soglie, stagione) => {
  const s = conSoglie(soglie)
  return { p_att: s.att, p_vpm: s.vpm, p_voto: s.voto, p_scelta: s.scelta,
           p_stagione: stagione || null }
}

/** Giocate, azzeccate e percentuale, da una riga aggregata del database. */
export const quota = (r) => {
  if (!r || !Number(r.giocate)) return { giocate: 0, ok: 0, perc: null }
  const giocate = Number(r.giocate), ok = Number(r.azzeccate)
  return { giocate, ok, perc: ok / giocate }
}

/** Il riassunto e l'accordo, che dipendono solo da soglie e stagione. */
export function usaRiassunto(soglie, stagione) {
  const [dati, setDati] = useState({ riassunto: null, accordo: null })
  const [errore, setErrore] = useState(null)
  const chiave = usaFermo(JSON.stringify([soglie, stagione]))
  useEffect(() => {
    if (JSON.parse(chiave)[1] === null) return   // stagione non ancora scelta
    let vivo = true
    // ⚠️ I parametri si rileggono **dalla chiave ferma**, non dalle variabili
    // correnti: altrimenti l'effetto partirebbe in ritardo ma con i valori
    // nuovi, e i conteggi non corrisponderebbero più alla chiave che li ha
    // chiesti — un disallineamento che non si vede ma falsa i numeri.
    const [s2, st2] = JSON.parse(chiave)
    Promise.all([
      supabase.rpc('andamento_riassunto', par(s2, st2)),
      supabase.rpc('andamento_accordo', par(s2, st2)),
    ]).then(([a, b]) => {
      if (!vivo) return
      if (a.error || b.error) return setErrore((a.error || b.error).message)
      setErrore(null)
      setDati({ riassunto: a.data || [], accordo: b.data || [] })
    })
    return () => { vivo = false }
    // ⚠️ La sola dipendenza è la chiave ferma, e dentro ci sono già soglie e
    // stagione: niente deroghe al linter, che è anche la prova che l'effetto
    // non legge nulla che non sia dichiarato.
  }, [chiave])
  return { ...dati, errore }
}

/** Le chiavi (giorni o weekend) del metodo scelto, col loro risultato. */
export function usaChiavi(ambito, metodo, soglie, stagione) {
  const [chiavi, setChiavi] = useState(null)
  const k = usaFermo(JSON.stringify([ambito, metodo, soglie, stagione]))
  useEffect(() => {
    if (JSON.parse(k)[3] === null) return
    let vivo = true
    const [a2, m2, s2, st2] = JSON.parse(k)
    supabase.rpc('andamento_chiavi', { p_ambito: a2, p_metodo: m2, ...par(s2, st2), p_limite: 400 })
      .then(({ data }) => { if (vivo) setChiavi(data || []) })
    return () => { vivo = false }
  }, [k])
  return chiavi
}

/** Le stagioni presenti in tabella, per il menu. */
export function usaStagioni() {
  const [st, setSt] = useState(null)
  useEffect(() => {
    let vivo = true
    supabase.rpc('andamento_stagioni').then(({ data }) => { if (vivo) setSt(data || []) })
    return () => { vivo = false }
  }, [])
  return st
}

/** Le partite di un giorno (o weekend): al massimo 15 o 36 righe. */
export async function partiteDi(ambito, metodo, chiave) {
  const campo = ambito === 'giorno' ? 'data' : 'weekend'
  const { data } = await supabase.from('andamento').select('*')
    .eq('ambito', ambito).eq('metodo', metodo).eq(campo, chiave)
    .order('posizione')
  return data || []
}

/** Le partite con tutti e quattro gli indicatori sopra soglia. */
export async function partiteVerdi(soglie, stagione) {
  const { data } = await supabase.rpc('andamento_verdi', { ...par(soglie, stagione), p_limite: 300 })
  return data || []
}
