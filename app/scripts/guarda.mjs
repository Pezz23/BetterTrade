/**
 * GUARDA — apre l'app in un browser vero e fotografa le pagine.
 *
 * ⚠️⚠️ **Esiste perché chi sviluppa questa app da terminale non vede lo
 * schermo.** Il restyling del 21/10/2026 si faceva a occhi chiusi: lint, build
 * e confronti numerici dicono che il codice è giusto, **non che la pagina si
 * legge**. Due difetti erano già passati così — uno `style` ignorato in
 * silenzio e un tondo che Mattia odiava — e si sono visti solo con una foto.
 *
 * ⚠️ **Non è un test**: non verifica niente, non fallisce se una pagina è
 * brutta. Fa una cosa sola, bene: apre, entra, gira le pagine, salva i PNG.
 * Il giudizio è di chi li guarda.
 *
 *   node --env-file=.env scripts/guarda.mjs                  # tutte, da telefono
 *   node --env-file=.env scripts/guarda.mjs scalata partite  # solo queste
 *   node --env-file=.env scripts/guarda.mjs --largo          # anche a 1280px
 */
import { chromium } from 'playwright'
import { mkdirSync, rmSync } from 'fs'

const URL = process.env.GUARDA_URL || 'http://localhost:5173/'
const DOVE = '.schermate'
// ⚠️ 390 è l'iPhone 14, ma il numero che conta è **375**: è lo schermo stretto
// su cui questo progetto ha già rotto due layout (la griglia della Slot e le
// scorciatoie di Andamento). Si fotografa lì, non su un desktop comodo.
const TELEFONO = { width: 375, height: 812 }
const LARGO = { width: 1280, height: 900 }

// ⚠️ **Le pagine si raggiungono CLICCANDO, non con un indirizzo**: l'app tiene
// la pagina corrente in uno stato di React e non ha rotte (è il lotto Q di
// STATO.md, mai fatto). Quindi qui ogni voce dice *da dove* si passa.
const PAGINE = [
  { id: 'dashboard', via: 'tab',  testo: 'Dashboard' },
  { id: 'slot',      via: 'tab',  testo: 'Slot' },
  { id: 'spin',      via: 'tab',  testo: 'Spin',             admin: true },
  { id: 'partite',   via: 'tab',  testo: 'Partite' },
  { id: 'votate',    via: 'menu', testo: 'Partite votate' },
  { id: 'storico',   via: 'menu', testo: 'Storico' },
  { id: 'andamento', via: 'menu', testo: 'Andamento' },
  { id: 'reporting', via: 'menu', testo: 'Reporting' },
  { id: 'bilancio',  via: 'menu', testo: 'Bilancio' },
  { id: 'scalata',   via: 'menu', testo: 'Road to weekend',  admin: true },
  { id: 'utenti',    via: 'menu', testo: 'Utenti',           admin: true },
]

const arg = process.argv.slice(2)
const largo = arg.includes('--largo')
const scelte = arg.filter(a => !a.startsWith('--'))
const pagine = scelte.length ? PAGINE.filter(p => scelte.includes(p.id)) : PAGINE

const utente = process.env.E2E_USER, pw = process.env.E2E_PW
if (!utente || !pw) {
  console.error('Manca E2E_USER o E2E_PW in app/.env — senza credenziali si vede solo il login.')
  process.exit(1)
}

rmSync(DOVE, { recursive: true, force: true })
mkdirSync(DOVE, { recursive: true })

const browser = await chromium.launch()
const errori = []

for (const vista of largo ? [TELEFONO, LARGO] : [TELEFONO]) {
  const suffisso = vista === LARGO ? '-largo' : ''
  const ctx = await browser.newContext({ viewport: vista, deviceScaleFactor: 2 })
  const pagina = await ctx.newPage()
  // ⚠️ Gli errori del browser si raccolgono: una pagina può *sembrare* a posto
  // e aver lanciato tre eccezioni. È la differenza fra "si disegna" e "funziona".
  pagina.on('pageerror', e => errori.push(`${e.message}`))
  pagina.on('console', m => { if (m.type() === 'error') errori.push(m.text()) })

  await pagina.goto(URL, { waitUntil: 'domcontentloaded' })
  await pagina.getByPlaceholder('Il tuo username').fill(utente)
  await pagina.getByPlaceholder('••••••••').fill(pw)
  await pagina.getByRole('button', { name: 'Accedi' }).click()
  await pagina.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 15000 })

  for (const p of pagine) {
    try {
      if (p.via === 'tab') {
        await pagina.getByRole('button', { name: p.testo, exact: true }).first().click()
      } else {
        await pagina.locator('.icona-menu').click()
        await pagina.getByText(p.testo, { exact: true }).first().click()
      }
      // ⚠️ Un'attesa fissa e non "rete ferma": questa app continua a parlare col
      // database (memoria di sessione, voti), quindi `networkidle` non arriva
      // mai. 1,2 s copre una lettura lenta senza far durare il giro un'ora.
      await pagina.waitForTimeout(1200)
      await pagina.screenshot({ path: `${DOVE}/${p.id}${suffisso}.png`, fullPage: true })
      console.log(`  ✅ ${p.id}${suffisso}`)
    } catch (e) {
      console.log(`  ❌ ${p.id}${suffisso}: ${String(e).split('\n')[0].slice(0, 90)}`)
    }
  }
  await ctx.close()
}
await browser.close()

console.log(`\nSchermate in app/${DOVE}/`)
if (errori.length) {
  console.log(`\n⚠️ ${errori.length} errori dal browser:`)
  for (const e of [...new Set(errori)].slice(0, 10)) console.log('   ' + e.slice(0, 160))
}
