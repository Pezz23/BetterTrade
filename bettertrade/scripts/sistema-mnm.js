// Sistema i numeri di MNM.
//
// Diagnosi del 9 settembre: MNM aveva bankroll_iniziale €106,11 — un saldo
// residuo finito nel campo del capitale di partenza — e una stagione 23/24 che
// nessun altro utente ha. MNM e Bermani sono due persone diverse che dal 24/25
// hanno giocato le stesse schedine.
//
// Cosa fa:
//   1. cancella le giornate 23/24 di MNM
//   2. rimette bankroll_iniziale a €3000, il capitale vero
//   3. allinea a Bermani le giornate che differiscono   [solo con --allinea]
//   4. ricalcola il bankroll
//
// Uso:
//   node --env-file=.env scripts/sistema-mnm.js                     # prova a vuoto
//   node --env-file=.env scripts/sistema-mnm.js --esegui
//   node --env-file=.env scripts/sistema-mnm.js --esegui --allinea

import { admin } from './_admin.js';

const ESEGUI  = process.argv.includes('--esegui');
const ALLINEA = process.argv.includes('--allinea');
const INIZIALE = 3000;
const STAGIONE_DA_TOGLIERE = '23/24';

const utente = async n => (await admin.from('users').select('id, username, bankroll, bankroll_iniziale').ilike('username', n).single()).data;
const giornate = async id => (await admin.from('giornate').select('*').eq('user_id', id)).data;

const mnm = await utente('MNM');
const ber = await utente('Bermani');
const gM = await giornate(mnm.id);
const gB = await giornate(ber.id);

const chiave = x => `${x.stagione}|${x.week_number}`;
const perBermani = new Map(gB.map(x => [chiave(x), x]));

const daCancellare = gM.filter(x => x.stagione === STAGIONE_DA_TOGLIERE);
const restanti     = gM.filter(x => x.stagione !== STAGIONE_DA_TOGLIERE);
const disallineate = restanti.filter(x => {
  const y = perBermani.get(chiave(x));
  return y && (x.tot_investito !== y.tot_investito || x.tot_incasso !== y.tot_incasso || x.tot_saldo !== y.tot_saldo);
});

const saldoRestanti = restanti.reduce((s, x) => s + (x.tot_saldo || 0), 0);
const scarto = disallineate.reduce((s, x) => s + (x.tot_saldo - perBermani.get(chiave(x)).tot_saldo), 0);
const arr = n => Math.round(n * 100) / 100;

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  stato attuale     iniziale €${mnm.bankroll_iniziale} · bankroll €${mnm.bankroll} · ${gM.length} giornate`);
console.log(`  da cancellare     ${daCancellare.length} giornate della stagione ${STAGIONE_DA_TOGLIERE}`);
console.log(`  restano           ${restanti.length} giornate · saldo €${arr(saldoRestanti)}`);
console.log(`  nuovo iniziale    €${INIZIALE}`);
console.log(`  disallineate      ${disallineate.length} giornate · scarto €${arr(scarto)} rispetto a Bermani`);
console.log(`\n  bankroll senza allineamento  €${arr(INIZIALE + saldoRestanti)}`);
console.log(`  bankroll con allineamento    €${arr(INIZIALE + saldoRestanti - scarto)}   (Bermani: €${ber.bankroll})`);
console.log(`\n  --allinea ${ALLINEA ? 'ATTIVO: le ' + disallineate.length + ' giornate verranno copiate da Bermani' : 'non attivo: le giornate di MNM restano come sono'}`);

if (!ESEGUI) process.exit(0);

// 1. via la stagione 23/24
const { error: e1 } = await admin.from('giornate').delete().eq('user_id', mnm.id).eq('stagione', STAGIONE_DA_TOGLIERE);
if (e1) { console.error('\n✗ cancellazione giornate:', e1.message); process.exit(1); }
console.log(`\n✓ cancellate ${daCancellare.length} giornate ${STAGIONE_DA_TOGLIERE}`);

// 2. allineamento, se richiesto
if (ALLINEA) {
  for (const x of disallineate) {
    const y = perBermani.get(chiave(x));
    const { error } = await admin.from('giornate')
      .update({ tot_investito: y.tot_investito, tot_incasso: y.tot_incasso, tot_saldo: y.tot_saldo })
      .eq('id', x.id);
    if (error) { console.error('✗ allineamento', chiave(x), error.message); process.exit(1); }
  }
  console.log(`✓ allineate ${disallineate.length} giornate ai valori di Bermani`);
}

// 3. capitale iniziale
const { error: e2 } = await admin.from('users').update({ bankroll_iniziale: INIZIALE }).eq('id', mnm.id);
if (e2) { console.error('✗ bankroll_iniziale:', e2.message); process.exit(1); }
console.log(`✓ bankroll_iniziale portato a €${INIZIALE}`);

// 4. ricalcolo, con la stessa formula di src/lib/bankroll.js
const { data: mv } = await admin.from('movimenti').select('tipo, importo').eq('user_id', mnm.id);
const { data: gg } = await admin.from('giornate').select('tot_saldo').eq('user_id', mnm.id);
const totMov = (mv || []).reduce((s, x) => s + (x.tipo === 'deposito' ? x.importo : -x.importo), 0);
const totGio = (gg || []).reduce((s, x) => s + (x.tot_saldo || 0), 0);
const nuovo = arr(INIZIALE + totMov + totGio);
const { error: e3 } = await admin.from('users').update({ bankroll: nuovo }).eq('id', mnm.id);
if (e3) { console.error('✗ bankroll:', e3.message); process.exit(1); }

console.log(`\n✓ MNM: ${gg.length} giornate · saldo €${arr(totGio)} · bankroll €${nuovo}`);
console.log(`  Bermani: €${ber.bankroll}`);
