// RIEMPIE LA TABELLA `andamento`: cosa avrebbe scelto ogni indicatore, giorno
// per giorno, e com'è andata.
//
//   node --env-file=.env scripts/calcola-andamento.js            # prova a vuoto
//   node --env-file=.env scripts/calcola-andamento.js --esegui   # scrive
//   ... --stagioni=8    per ricostruire anche il passato
//
// ⚠️ Come ogni script che tocca i dati, **di default non scrive** e mostra cosa
// cambierebbe.
//
// Due ambiti, come li ha chiesti Mattia (12/10/2026):
//   giorno   → **tutte** le partite di ogni giorno di gioco, per metodo (fino al
//              28/10/2026 erano le prime 15)
//   weekend  → le prime **36** del weekend intero, **senza data**
// ⚠️ "Azzeccata" = la giocata **per intero**: il segno, e per le combinate
// anche l'over 1,5.

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 1);
const DA_GIORNATA = arg('giornata', 5);
const ESEGUI = process.argv.includes('--esegui');
// ⚠️⚠️ **Nel giorno TUTTE le partite, dal 28/10/2026** (Mattia: *"dimentica
// l'idea delle prime 15 della giornata: voglio tutte le partite con quei
// filtri, sia nel csv sia nella pagina; tieni le prime 36 del weekend"*).
// Le soglie della pagina fanno già da filtro: le prime 15 erano un secondo
// taglio, che su un sabato pieno teneva fuori partite sopra soglia — la card
// diceva 529 e la lista vera ne aveva 532. `Infinity` e non un numero grande:
// nessun tetto, e chi legge non deve chiedersi perché proprio quello.
const PRIME_GIORNO = Infinity, PRIME_WEEKEND = 36;

const METODI = [
  { id: 'att',  val: x => x.att },
  { id: 'vpm',  val: x => x.vpm },
  { id: 'voto', val: x => x.voto },
  // ⚠️ La **scelta** ha preso il posto della resa il 15/10/2026, come già in
  // barra: la resa ordina per quota, quindi mette in cima le partite meno
  // probabili (51,2% di azzeccate contro il 60,3% dell'attendibilità). La sua
  // colonna resta su ogni riga, non le righe che avrebbe scelto lei.
  { id: 'scelta', val: x => x.scelta },
];

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: DA_GIORNATA });
console.log(`stagioni ${stagioni.join(', ')} · ${valutate.length} partite valutate dalla ${DA_GIORNATA}ª giornata\n`);

// ⚠️ Ordine deterministico: a parità di valore si decide per data e squadra,
// altrimenti due esecuzioni dello stesso script scrivono due classifiche
// diverse e la pagina cambia da sola.
const prime = (lista, val, n) => [...lista]
  .filter(x => val(x) != null)
  .sort((a, b) => val(b) - val(a) || a.data.localeCompare(b.data) || a.casa.localeCompare(b.casa))
  .slice(0, n);

const raggruppa = (lista, chiave) => {
  const m = new Map();
  for (const x of lista) { const k = chiave(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x) }
  return m;
};

const righe = [];
for (const M of METODI) {
  for (const [giorno, l] of raggruppa(valutate, x => x.data))
    prime(l, M.val, PRIME_GIORNO).forEach((x, i) => righe.push({
      stagione: x.stagione, ambito: 'giorno', data: giorno, weekend: x.weekend,
      metodo: M.id, posizione: i + 1, partita_id: x.id, div: x.div, casa: x.casa,
      trasferta: x.trasferta, giocata: x.giocata, quota: x.quota,
      // ⚠️ Tutti e quattro i valori su ogni riga, non solo quello del metodo
      // che l'ha scelta: serve a vedere "quali indicatori mi avrebbero
      // allertato" e al gruppo delle quattro spunte verdi.
      att: x.att, vpm: x.vpm, voto: x.voto, resa: x.resa, scelta: x.scelta,
      azzeccata: x.vinta,
    }));
  for (const [wk, l] of raggruppa(valutate, x => x.weekend))
    prime(l, M.val, PRIME_WEEKEND).forEach((x, i) => righe.push({
      stagione: x.stagione, ambito: 'weekend', data: null, weekend: wk,
      metodo: M.id, posizione: i + 1, partita_id: x.id, div: x.div, casa: x.casa,
      trasferta: x.trasferta, giocata: x.giocata, quota: x.quota,
      att: x.att, vpm: x.vpm, voto: x.voto, resa: x.resa, scelta: x.scelta,
      azzeccata: x.vinta,
    }));
}

// ── Cosa verrebbe scritto ───────────────────────────────────────────────────
console.log(`${righe.length} righe da scrivere\n`);
console.log(`${'metodo'.padEnd(8)} ${'ambito'.padEnd(8)} ${'giocate'.padStart(8)} ${'azzeccate'.padStart(10)}`);
for (const M of METODI) for (const amb of ['giorno', 'weekend']) {
  const l = righe.filter(r => r.metodo === M.id && r.ambito === amb);
  if (!l.length) continue;
  console.log(`${M.id.padEnd(8)} ${amb.padEnd(8)} ${String(l.length).padStart(8)} ` +
    `${(l.filter(r => r.azzeccata).length / l.length * 100).toFixed(1).padStart(9)}%`);
}

// ⚠️ Avviso che vale più di una tabella: se un giorno ha meno partite di
// quante ne chiede la classifica, **tutti i metodi scelgono le stesse** e i
// numeri coincidono. Non è un difetto del calcolo, è che non c'è niente da
// selezionare — ma senza dirlo si legge come "gli indicatori sono uguali".
{
  // ⚠️ Solo il weekend: nel giorno non c'è più un tetto (28/10/2026), e
  // senza tetto i quattro metodi non scelgono, contano — l'avviso non ha
  // più niente da dire.
  const perWk = raggruppa(valutate, x => x.weekend);
  const wkCorti = [...perWk.values()].filter(l => l.length <= PRIME_WEEKEND).length;
  if (wkCorti) console.log(`⚠️  ${wkCorti} weekend su ${perWk.size} hanno ${PRIME_WEEKEND} partite o meno: idem.`);
}

if (!ESEGUI) {
  console.log(`\nprova a vuoto: non ho scritto niente. Aggiungi --esegui per scrivere.`);
  await sql.end();
  process.exit(0);
}

// ── Scrittura ───────────────────────────────────────────────────────────────
// ⚠️ Si cancella e riscrive **solo** le stagioni ricalcolate: un `delete`
// secco butterebbe il passato di una ricostruzione precedente.
await sql.begin(async (t) => {
  await t`delete from public.andamento where stagione = any(${stagioni})`;
  for (let i = 0; i < righe.length; i += 500)
    await t`insert into public.andamento ${t(righe.slice(i, i + 500))}`;
});
const [c] = await sql`select count(*)::int as n from public.andamento`;
console.log(`\n✓ scritte. La tabella ora ha ${c.n} righe.`);
await sql.end();
