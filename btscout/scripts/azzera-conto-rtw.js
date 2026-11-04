// Azzera il conto RTW di alcuni utenti tenendo i giri in archivio (04/11/2026,
// Mattia: Admin e Laboratorio ripartono da 0).
// ⚠️ Non cancella niente: scrive una riga negativa pari al conto, con la nota
// «azzeramento». Nessun soldo entra in cassa: la riga non ha movimento.
// Rifiuta chi ha un giro aperto con passi giocati: prima «Chiudi giro».
//
//   node --env-file=.env scripts/azzera-conto-rtw.js Admin Laboratorio [--esegui]

import { sql } from '../lib/db.js'

const ESEGUI = process.argv.includes('--esegui')
const nomi = process.argv.slice(2).filter(a => !a.startsWith('--'))
if (!nomi.length) { console.error('indica almeno un utente'); process.exit(1) }

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n')
let codice = 0
for (const nome of nomi) {
  const [u] = await sql`select id from users where username = ${nome}`
  if (!u) { console.log(`✗ ${nome}: utente non trovato`); codice = 1; continue }
  const [{ giocati }] = await sql`select count(*)::int giocati from scalata_passi p join scalate s on s.id = p.scalata_id
    where s.user_id = ${u.id} and s.stato = 'aperta' and (p.esito <> 'aperto' or p.confermato_il is not null)`
  if (giocati) { console.log(`✗ ${nome}: giro aperto con ${giocati} passi giocati, prima «Chiudi giro»`); codice = 1; continue }
  const [{ conto }] = await sql`select public.conto_rtw(${u.id}) conto`
  console.log(`  ${nome}: conto ${conto} € → 0 €`)
  if (ESEGUI && Number(conto) !== 0)
    await sql`insert into scalata_ricariche (user_id, importo, nota) values (${u.id}, ${-Number(conto)}, 'azzeramento')`
}
await sql.end()
process.exit(codice)
