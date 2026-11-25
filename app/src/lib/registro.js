// IL REGISTRO DEI SOLDI — cosa mostrare degli eventi del database (24/11/2026, S4).
//
// Gli eventi li legge `registro_soldi()` (`sql/65`); qui si sommano e basta: conto
// del gruppo o di una persona, cassa o RTW, e il saldo dopo ogni evento.
// ⚠️ **Guadagno e movimenti di denaro sono due cose**: un deposito alza il saldo e
// non è un guadagno. Guadagno = slot, passi e correzioni al conto reale (Mattia: la
// correzione è risultato, non versamento).

export const GUADAGNO = new Set(['slot', 'passo', 'correzione'])
export const NON_GUADAGNO = new Set(['deposito', 'prelievo', 'trasferimento'])
export const NOMI_TIPO = { slot: 'slot', passo: 'RTW', correzione: 'correzione', deposito: 'deposito', prelievo: 'prelievo', trasferimento: 'trasferimento' }
const cent = (x) => Math.round(x * 100) / 100
const somma = (l, f) => cent(l.reduce((a, x) => a + Number(f(x) || 0), 0))

/** Chi c'è in una vista: una persona, o `'totale'` = chi sta sul conto comune. */
export const chiNelRegistro = (utenti, chi) =>
  (utenti || []).filter(u => (chi === 'totale' ? u.in_totale !== false : u.id === chi))

/**
 * La vista: `chi` = id o `'totale'`, `conto` = `'tutto' | 'cassa' | 'rtw'`.
 * Torna apertura, adesso, guadagno, denaro entrato o uscito, scarti e le righe dalla
 * più vecchia. Le righe dello stesso fatto (`rif`: un passo del banco, i due lati di
 * un trasferimento) diventano una sola. ⚠️ `adesso` viene dal database, **non** dalla
 * somma: se non coincidono è lo `scarto`, ed è quello che il registro serve a dire.
 */
export function vistaRegistro(dati, { chi = 'totale', conto = 'tutto' } = {}) {
  const utenti = chiNelRegistro(dati?.utenti, chi)
  const dentro = new Map(utenti.map(u => [u.id, u.nome]))
  const cassa = conto !== 'rtw', rtw = conto !== 'cassa'
  const apre = somma(utenti, u => (cassa ? Number(u.apre_cassa) : 0) + (rtw ? Number(u.apre_rtw) : 0))
  const adesso = somma(utenti, u => (cassa ? Number(u.cassa) : 0) + (rtw ? Number(u.rtw) : 0))
  const eventi = (dati?.eventi || []).filter(e => dentro.has(e.user_id) && (conto === 'tutto' || e.conto === conto))

  const fatti = new Map()
  for (const e of eventi) {
    const f = fatti.get(e.rif) || { rif: e.rif, quando: e.quando, tipo: e.tipo, motivo: null, importo: 0, mosso: 0, nomi: new Set() }
    f.importo += Number(e.importo)
    f.mosso = Math.max(f.mosso, Math.abs(Number(e.importo)))
    f.motivo = f.motivo && e.conto !== 'cassa' ? f.motivo : e.motivo || f.motivo
    f.nomi.add(dentro.get(e.user_id))
    fatti.set(e.rif, f)
  }
  let saldo = apre
  const righe = [...fatti.values()]
    .sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando) || a.rif.localeCompare(b.rif))
    .map(f => {
      saldo = cent(saldo + f.importo)
      return { ...f, importo: cent(f.importo), nomi: [...f.nomi], saldo }
    })
  return {
    apre, adesso, righe,
    guadagno: somma(eventi.filter(e => GUADAGNO.has(e.tipo)), e => e.importo),
    // Con «tutto» i trasferimenti si annullano da soli: entrano e escono.
    spostato: somma(eventi.filter(e => !GUADAGNO.has(e.tipo)), e => e.importo),
    inGioco: somma(utenti, u => u.in_gioco),
    scarti: utenti.filter(u => Math.abs(Number(u.scarto)) >= 0.01).map(u => ({ nome: u.nome, scarto: Number(u.scarto) })),
  }
}

// ── Le candele (25/11/2026) ─────────────────────────────────────────────────
const GIORNO_ROMA = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' })
/** Il periodo di un istante, in ora italiana: il giorno, il lunedì della settimana, il mese. */
export function periodoDi(quando, periodo) {
  const g = GIORNO_ROMA.format(new Date(quando))
  if (periodo === 'mese') return g.slice(0, 7)
  if (periodo === 'giorno') return g
  const [a, m, d] = g.split('-').map(Number)
  const t = new Date(Date.UTC(a, m - 1, d))
  t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7)
  return t.toISOString().slice(0, 10)
}

/**
 * Le candele di una vista: una per periodo **in cui è successo qualcosa** (come i
 * grafici di borsa, che saltano i giorni chiusi): apertura, massimo, minimo, chiusura.
 * ⚠️⚠️ **Il corpo è il guadagno**: un deposito non fa una candela verde (Mattia: si
 * vede ma non è guadagno). I soldi mossi alzano o abbassano tutto il periodo, quindi
 * la chiusura è sempre il **saldo vero** e fra due candele resta uno scalino, segnato
 * in `mosso`. Senza movimenti l'apertura è la chiusura di prima.
 */
export function candeleDi(vista, periodo) {
  const gruppi = new Map()
  let prima = vista.apre
  for (const r of vista.righe) {
    if (r.importo === 0) continue
    const k = periodoDi(r.quando, periodo)
    const g = gruppi.get(k) || { chiave: k, parte: prima, guadagni: [], mosso: 0 }
    if (GUADAGNO.has(r.tipo)) g.guadagni.push(r.importo); else g.mosso = cent(g.mosso + r.importo)
    gruppi.set(k, g)
    prima = r.saldo
  }
  return [...gruppi.values()].map(g => {
    const apre = cent(g.parte + g.mosso)
    let v = apre, alto = apre, basso = apre
    for (const x of g.guadagni) { v = cent(v + x); alto = Math.max(alto, v); basso = Math.min(basso, v) }
    return { chiave: g.chiave, apre, chiude: v, alto, basso, mosso: g.mosso, guadagno: cent(v - apre), quante: g.guadagni.length }
  })
}
