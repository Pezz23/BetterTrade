// Porta il bankroll aggregato di tutti gli utenti a un totale dato, registrando
// la differenza come movimento su Laboratorio.
//
// È lo stesso meccanismo del pulsante "Trasferisci differenza a Laboratorio"
// nella pagina Bilancio: la differenza diventa un movimento, non una scrittura
// diretta sul saldo. Così resta vera l'invariante di lib/bankroll.js
//   iniziale + movimenti + giornate = bankroll
// e la correzione resta tracciata invece che sparire dentro un numero.
//
// Uso:
//   node --env-file=.env scripts/allinea-totale.js 3955.66
//   node --env-file=.env scripts/allinea-totale.js 3955.66 --esegui

import { admin } from './_admin.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ESEGUI = process.argv.includes('--esegui');
const CONTENITORE = 'Laboratorio';

const obiettivo = parseFloat(args[0]);
if (!Number.isFinite(obiettivo)) {
  console.error('Uso: node --env-file=.env scripts/allinea-totale.js <totale-desiderato> [--esegui]');
  process.exit(1);
}

const arr = n => Math.round(n * 100) / 100;
const eur = n => (n < 0 ? '-' : '') + '€' + Math.abs(n).toFixed(2);

const { data: utenti } = await admin.from('users').select('id, username, bankroll, bankroll_iniziale');
const totale = arr(utenti.reduce((s, u) => s + (u.bankroll || 0), 0));
const differenza = arr(obiettivo - totale);

const lab = utenti.find(u => u.username.toLowerCase() === CONTENITORE.toLowerCase());
if (!lab) { console.error(`✗ utente "${CONTENITORE}" non trovato`); process.exit(1); }

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  totale attuale     ${eur(totale)}`);
console.log(`  totale desiderato  ${eur(obiettivo)}`);
console.log(`  differenza         ${differenza > 0 ? '+' : ''}${eur(differenza)}  → ${CONTENITORE}`);
console.log(`\n  ${CONTENITORE}: ${eur(lab.bankroll)} → ${eur(arr(lab.bankroll + differenza))}`);

if (differenza === 0) { console.log('\n→ niente da fare: il totale è già quello desiderato'); process.exit(0); }
if (!ESEGUI) process.exit(0);

const tipo = differenza > 0 ? 'deposito' : 'prelievo';
const nota = `Allineamento totale · aggregato ${eur(totale)} → ${eur(obiettivo)}`;

const { error: e1 } = await admin.from('movimenti')
  .insert([{ user_id: lab.id, tipo, importo: Math.abs(differenza), nota }]);
if (e1) { console.error('✗ movimento:', e1.message); process.exit(1); }
console.log(`\n✓ movimento registrato: ${tipo} ${eur(Math.abs(differenza))}`);

// Ricalcolo con la stessa formula di src/lib/bankroll.js
const [{ data: mv }, { data: g }] = await Promise.all([
  admin.from('movimenti').select('tipo, importo').eq('user_id', lab.id),
  admin.from('giornate').select('tot_saldo').eq('user_id', lab.id),
]);
const totMov = mv.reduce((s, x) => s + (x.tipo === 'deposito' ? x.importo : -x.importo), 0);
const totGio = g.reduce((s, x) => s + (x.tot_saldo || 0), 0);
const nuovo = arr(lab.bankroll_iniziale + totMov + totGio);

const { error: e2 } = await admin.from('users').update({ bankroll: nuovo }).eq('id', lab.id);
if (e2) { console.error('✗ bankroll:', e2.message); process.exit(1); }
console.log(`✓ ${CONTENITORE}: bankroll ${eur(nuovo)}`);

const { data: dopo } = await admin.from('users').select('bankroll');
console.log(`✓ totale aggregato: ${eur(arr(dopo.reduce((s, u) => s + (u.bankroll || 0), 0)))}`);
