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
 *   node --env-file=.env scripts/guarda.mjs --intera         # pagina intera, anche lunghissima
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
// ⚠️ Le larghezze di prova si scelgono da riga di comando
// (`--larghezze=375,430,768`). 375 resta quella di partenza perché è lo
// schermo stretto su cui questo progetto ha già rotto due layout.
const altezzaPer = w => (w >= 1024 ? 900 : w >= 700 ? 1024 : 812)

// ⚠️ **Le pagine si raggiungono CLICCANDO, non con un indirizzo**: l'app tiene
// la pagina corrente in uno stato di React e non ha rotte (è il lotto Q di
// STATO.md, mai fatto). Quindi qui ogni voce dice *da dove* si passa.
const PAGINE = [
  // ⚠️ Il login si fotografa **prima** di entrare, ed è l'unica schermata che
  // lo strumento attraversava senza guardarla: è anche la prima cosa che vede
  // chi apre l'app.
  { id: 'login',     via: 'prima' },
  { id: 'dashboard', via: 'tab',  testo: 'Dashboard' },
  { id: 'slot',      via: 'tab',  testo: 'Slot' },
  // ⚠️ Spin è scesa nel menu e Road to weekend è salita nella barra in basso
  // (21/10/2026). Questa mappa va tenuta allineata alla navigazione: il
  // 21/10 non l'ho fatto e due pagine sono andate in timeout per trenta
  // secondi l'una, con una riga `❌` in mezzo alle altre.
  { id: 'spin',      via: 'menu', testo: 'Spin',              admin: true },
  { id: 'partite',   via: 'tab',  testo: 'Partite' },
  { id: 'votate',    via: 'menu', testo: 'Partite votate' },
  { id: 'storico',   via: 'menu', testo: 'Storico' },
  { id: 'andamento', via: 'menu', testo: 'Andamento' },
  { id: 'reporting', via: 'menu', testo: 'Reporting' },
  { id: 'bilancio',  via: 'menu', testo: 'Bilancio' },
  { id: 'scalata',   via: 'tab',  testo: 'Weekend',           admin: true },
  { id: 'utenti',    via: 'menu', testo: 'Utenti',           admin: true },
  // ⚠️ La scheda di una partita è **la schermata più densa dell'app** — tre
  // livelli, dieci celle a fasce, il blocco VPM — e non si raggiunge da nessun
  // tasto: si apre toccando una riga. Senza questa voce era l'unica cosa che
  // continuava a svilupparsi alla cieca.
  { id: 'scheda',    via: 'partita' },
  // ⚠️ Il menu è una **superficie come le altre** — otto voci, un terzo dello
  // schermo — e fino al 21/10/2026 non si fotografava mai: si apriva solo per
  // attraversarlo. Si restyla quello che si vede.
  { id: 'menu',      via: 'aperto' },
]

const arg = process.argv.slice(2)
const largo = arg.includes('--largo')
const chiesteLarghezze = (arg.find(a => a.startsWith('--larghezze=')) || '').split('=')[1]
const intera = arg.includes('--intera')
// ⚠️ 2600 px: poco più di tre schermate di telefono in fila.
const MAX_ALTEZZA = 2600
const scelte = arg.filter(a => !a.startsWith('--'))
const pagine = scelte.length ? PAGINE.filter(p => scelte.includes(p.id)) : PAGINE

const utente = process.env.E2E_USER, pw = process.env.E2E_PW
if (!utente || !pw) {
  console.error('Manca E2E_USER o E2E_PW in app/.env — senza credenziali si vede solo il login.')
  process.exit(1)
}

// ⚠️ Si svuota la cartella **solo quando si fotografa tutto**: chiedendo due
// pagine si buttavano via le altre dieci, e ci si ritrovava con un giro
// incompleto credendo di avere l'insieme.
if (!scelte.length) rmSync(DOVE, { recursive: true, force: true })
mkdirSync(DOVE, { recursive: true })

// ⚠️ `channel: 'chromium'` usa il **browser intero** in modalità headless
// invece del "guscio headless", che è un secondo pacchetto da 83 MB. Su una
// connessione lenta valeva cinque minuti di scaricamento in meno, e il
// risultato a schermo è lo stesso.
const browser = await chromium.launch({ channel: 'chromium' })
const errori = []

const viste = chiesteLarghezze
  ? chiesteLarghezze.split(',').map(n => ({ width: +n, height: altezzaPer(+n) }))
  : largo ? [TELEFONO, LARGO] : [TELEFONO]

// ⚠️⚠️ **Lo sbordo si MISURA, non si guarda.** Controllare a occhio dodici
// pagine per quattro larghezze vuol dire guardare quarantotto immagini e
// fidarsi di non aver saltato la riga che esce di sei pixel. Il browser invece
// sa esattamente quanto è largo il contenuto: se supera la finestra, c'è uno
// scorrimento orizzontale — che su un telefono è il difetto più fastidioso e
// il più facile da non notare in una schermata ferma.
const sbordi = []

for (const vista of viste) {
  const suffisso = vista === LARGO ? '-largo' : (viste.length > 1 && vista.width !== TELEFONO.width ? `-${vista.width}` : '')
  const ctx = await browser.newContext({ viewport: vista, deviceScaleFactor: 2 })
  const pagina = await ctx.newPage()
  // ⚠️ Gli errori del browser si raccolgono: una pagina può *sembrare* a posto
  // e aver lanciato tre eccezioni. È la differenza fra "si disegna" e "funziona".
  pagina.on('pageerror', e => errori.push(`${e.message}`))
  pagina.on('console', m => { if (m.type() === 'error') errori.push(m.text()) })

  await pagina.goto(URL, { waitUntil: 'domcontentloaded' })
  if (pagine.some(p => p.via === 'prima')) {
    await pagina.waitForTimeout(1200)
    await pagina.screenshot({ path: `${DOVE}/login${suffisso}.png`, fullPage: true })
    console.log(`  ✅ login${suffisso}`)
  }
  await pagina.getByPlaceholder('Il tuo username').fill(utente)
  await pagina.getByPlaceholder('••••••••').fill(pw)
  await pagina.getByRole('button', { name: 'Accedi' }).click()
  await pagina.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 15000 })

  for (const p of pagine) {
    if (p.via === 'prima') continue   // già fatta sopra, prima di entrare
    try {
      if (p.via === 'partita') {
        await pagina.getByRole('button', { name: 'Partite' }).first().click()
        // ⚠️⚠️ **Si aspetta la riga, non un tempo.** C'era un `waitForTimeout`
        // di 1,5 s: bastava con 67 partite in calendario, **non con 207** — il
        // 22/10/2026 il clic è andato in timeout di trenta secondi e la riga
        // `❌ scheda` sembrava un difetto della pagina, che invece stava solo
        // ancora disegnando. Un'attesa a tempo è giusta finché i dati non
        // crescono, e i dati crescono sempre.
        const riga = pagina.locator('[role="button"]').filter({ hasText: /giocata/i }).first()
        await riga.waitFor({ timeout: 20000 })
        await riga.click()
        await pagina.waitForTimeout(1500)
        // ⚠️⚠️ **La scheda non si fotografa con `fullPage`**: è un foglio
        // `position: fixed` con uno scorrimento suo (`SchedaScorrevole`),
        // quindi una pagina intera cattura **la lista che sta sotto** — ci ho
        // creduto per un giro, guardando una foto che sembrava giusta.
        // Si scatta quello che si vede e si scorre il foglio, come farebbe un
        // dito: più schermate numerate, che per di più si leggono meglio di
        // una striscia lunga cinquemila pixel.
        const foglio = pagina.locator('.scheda-entra')
        for (let n = 1; n <= 6; n++) {
          await pagina.screenshot({ path: `${DOVE}/${p.id}-${n}${suffisso}.png` })
          const avanti = await foglio.evaluate((e, h) => {
            const prima = e.scrollTop
            e.scrollTop += h - 60   // una schermata meno un dito di sovrapposizione
            return e.scrollTop > prima
          }, vista.height)
          await pagina.waitForTimeout(400)
          if (!avanti) break
        }
        // si richiude, o la pagina dopo verrebbe scattata con il foglio davanti
        await pagina.keyboard.press('Escape').catch(() => {})
        console.log(`  ✅ ${p.id}${suffisso}`)
        continue
      } else if (p.via === 'aperto') {
        // il menu si fotografa aperto e poi si richiude, o la pagina dopo
        // verrebbe scattata con il pannello ancora davanti
        await pagina.locator('.icona-menu').click()
      } else if (p.via === 'tab') {
        // ⚠️ **Senza `exact`**: finché le icone erano caratteri il nome
        // accessibile del tasto era `◈ Dashboard` e un confronto esatto non
        // combaciava mai — trenta secondi di attesa a vuoto per ognuna delle
        // quattro. Ora le icone sono SVG con `aria-hidden`, quindi il nome è
        // pulito, ma il confronto largo resta: costa niente e regge il
        // prossimo cambio di etichetta.
        await pagina.getByRole('button', { name: p.testo }).first().click()
      } else {
        await pagina.locator('.icona-menu').click()
        await pagina.getByText(p.testo, { exact: true }).first().click()
      }
      // ⚠️ Un'attesa fissa e non "rete ferma": questa app continua a parlare col
      // database (memoria di sessione, voti), quindi `networkidle` non arriva
      // mai. 1,2 s copre una lettura lenta senza far durare il giro un'ora.
      await pagina.waitForTimeout(1200)
      // ⚠️⚠️ **Ma 1,2 s non bastano a tutte, e questo ha prodotto due falsi
      // allarmi** (21/10/2026): Bilancio fotografato su «Caricamento…», e
      // Andamento con quattro card che dicevano «nessuna partita sopra
      // soglia» — segnalato a Mattia **due volte** come possibile difetto dei
      // dati, mentre la pagina era solo ancora in attesa delle sue RPC.
      // **Una foto scattata presto non è una pagina rotta, ma è
      // indistinguibile da una.** Quindi si aspetta che il testo del
      // caricamento sparisca, con un tetto: se resta, la pagina è davvero
      // ferma e la foto lo deve mostrare.
      await pagina.waitForFunction(
        () => !/\b(carico|caricamento)\b/i.test(document.body.innerText),
        null, { timeout: 8000 },
      ).catch(() => {})
      // ⚠️⚠️ **La pagina intera è illeggibile su una lista lunga.** Partite
      // con 67 partite fa **28.758 pixel** di altezza: ridotta per starci in
      // uno schermo diventa una striscia dove non si distingue una riga da
      // un'altra. Si taglia a `MAX_ALTEZZA`, che è abbastanza per vedere la
      // testata e le prime righe — dove sta quasi sempre il difetto. Con
      // `--intera` si prende tutto, quando serve davvero.
      const alta = await pagina.evaluate(() => document.body.scrollHeight)
      await pagina.screenshot({
        path: `${DOVE}/${p.id}${suffisso}.png`,
        fullPage: true,
        ...(intera || alta <= MAX_ALTEZZA ? {} : {
          clip: { x: 0, y: 0, width: vista.width, height: MAX_ALTEZZA },
        }),
      })
      // ⚠️ Il menu non si chiude da sé e **non ha un tasto Escape**: lo chiude
      // il suo sfondo. Senza questo, la voce successiva trovava il pannello
      // davanti e il clic andava in timeout dopo trenta secondi.
      if (p.via === 'aperto') {
        await pagina.locator('.icona-menu').click().catch(() => {})
        await pagina.waitForTimeout(300)
      }
      // ⚠️⚠️ **Un commento JSX senza graffe diventa TESTO A SCHERMO.**
      // `/* … */` fra due tag è contenuto, non un commento: ci sono cascato
      // due volte, e la seconda la riga «/* stessa traccia della barra…»
      // stava in mezzo alla scheda di una partita. Né il lint né il build se
      // ne accorgono — per loro è una stringa legittima. Qui si guarda il
      // testo che la pagina mostra davvero.
      const commenti = await pagina.evaluate(() => {
        const t = document.body.innerText
        const i = t.indexOf('/*')
        return i < 0 ? null : t.slice(i, i + 60).replace(/\s+/g, ' ')
      })
      if (commenti) errori.push(`COMMENTO A SCHERMO in ${p.id}: ${commenti}`)
      const fuori = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (fuori > 1) sbordi.push(`${p.id} a ${vista.width}px esce di ${fuori}px`)
      console.log(`  ✅ ${p.id}${suffisso}${fuori > 1 ? `  ⚠️ esce di ${fuori}px` : ''}`)
    } catch (e) {
      console.log(`  ❌ ${p.id}${suffisso}: ${String(e).split('\n')[0].slice(0, 90)}`)
    }
  }
  await ctx.close()
}
await browser.close()

console.log(`\nSchermate in app/${DOVE}/`)
if (sbordi.length) {
  console.log(`\n⚠️ ${sbordi.length} pagine escono dallo schermo:`)
  for (const r of sbordi) console.log('   ' + r)
} else {
  console.log('Nessuna pagina esce dallo schermo.')
}
if (errori.length) {
  console.log(`\n⚠️ ${errori.length} errori dal browser:`)
  for (const e of [...new Set(errori)].slice(0, 10)) console.log('   ' + e.slice(0, 160))
}
