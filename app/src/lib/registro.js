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
    const f = fatti.get(e.rif) || { rif: e.rif, quando: e.quando, giorno: e.giorno, tipo: e.tipo, motivo: null, importo: 0, mosso: 0, nomi: new Set() }
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
/** Il giorno italiano di un istante, `aaaa-mm-gg`. */
export const giornoRoma = (quando) => GIORNO_ROMA.format(new Date(quando))
const utc = (g) => { const [a, m, d] = g.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)) }
const testo = (t) => t.toISOString().slice(0, 10)

/** Il periodo di un giorno: il giorno, il lunedì della sua settimana, il mese. */
export function periodoDi(giorno, periodo) {
  if (periodo === 'mese') return giorno.slice(0, 7)
  if (periodo === 'giorno') return giorno
  const t = utc(giorno)
  t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7)
  return testo(t)
}

/** Tutti i periodi da un giorno a un altro, anche quelli vuoti. */
export function periodiFra(da, a, periodo) {
  const l = []
  const fine = utc(a)
  for (const t = utc(da); t <= fine; t.setUTCDate(t.getUTCDate() + 1)) {
    const k = periodoDi(testo(t), periodo)
    if (l.at(-1) !== k) l.push(k)
  }
  return l
}

/**
 * Le candele di una vista, una per **ogni** giorno, settimana o mese solare dal giorno
 * 1 a oggi (Mattia, 25/11/2026): parte dal saldo con cui il periodo comincia e finisce
 * con quello con cui si chiude; gli stoppini sono il punto più alto e più basso.
 * ⚠️⚠️ **Una schedina sta nel giorno della partita** (`giorno`, `sql/67`), non in quello
 * in cui si segna l'esito: gli eventi si rimettono in fila per giorno, quindi il saldo
 * si ricammina da qui e non è quello del Registro, che resta per ora di segnatura.
 * ⚠️⚠️ **Il massimo e il minimo nascono solo dagli esiti**: giocare 10 € da 100 e
 * vincere fa 100 → 110, e non tocca 90 (Mattia).
 * ⚠️ **Il corpo è il guadagno**: un deposito non fa una candela verde. Alza tutto il
 * suo periodo: fra due candele resta uno scalino, segnato in `mosso`.
 * Un periodo senza eventi è una linea piatta.
 */
export function candeleDi(vista, periodo, dal, ora = Date.now()) {
  const giornoDi = (r) => r.giorno || giornoRoma(r.quando)
  const righe = vista.righe.filter(r => r.importo !== 0)
    .map(r => ({ ...r, g: giornoDi(r) }))
    .sort((a, b) => a.g.localeCompare(b.g) || Date.parse(a.quando) - Date.parse(b.quando))
  const gruppi = new Map()
  for (const r of righe) {
    const k = periodoDi(r.g, periodo)
    const g = gruppi.get(k) || { guadagni: [], mosso: 0 }
    if (GUADAGNO.has(r.tipo)) g.guadagni.push(r.importo); else g.mosso = cent(g.mosso + r.importo)
    gruppi.set(k, g)
  }
  const primo = [giornoRoma(dal), ...righe.map(r => r.g)].sort()[0]
  const ultimo = [giornoRoma(Math.max(ora, Date.parse(dal))), ...righe.map(r => r.g)].sort().at(-1)
  let saldo = vista.apre
  return periodiFra(primo, ultimo, periodo).map(chiave => {
    const g = gruppi.get(chiave) || { guadagni: [], mosso: 0 }
    const apre = cent(saldo + g.mosso)
    let alto = apre, basso = apre
    saldo = apre
    for (const x of g.guadagni) { saldo = cent(saldo + x); alto = Math.max(alto, saldo); basso = Math.min(basso, saldo) }
    return { chiave, apre, chiude: saldo, alto, basso, mosso: g.mosso, guadagno: cent(saldo - apre), quante: g.guadagni.length }
  })
}
