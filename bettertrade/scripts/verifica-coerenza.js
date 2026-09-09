// Controlla che per ogni utente valga  iniziale + movimenti + giornate = bankroll.
// È l'invariante di lib/bankroll.js: se salta, i numeri dell'app non tornano.
//
// Uso:  node --env-file=.env scripts/verifica-coerenza.js

import { admin } from './_admin.js';

const { data: utenti } = await admin.from('users')
  .select('id, username, bankroll, bankroll_iniziale').order('username');

console.log('\nutente'.padEnd(15), 'iniziale'.padStart(10), 'movim.'.padStart(10),
            'giornate'.padStart(11), 'atteso'.padStart(11), 'memorizzato'.padStart(12), '  n');

let problemi = 0;
for (const u of utenti) {
  const [{ data: mv }, { data: g }] = await Promise.all([
    admin.from('movimenti').select('tipo, importo').eq('user_id', u.id),
    admin.from('giornate').select('tot_saldo').eq('user_id', u.id),
  ]);
  const totMov = mv.reduce((s, x) => s + (x.tipo === 'deposito' ? x.importo : -x.importo), 0);
  const totGio = g.reduce((s, x) => s + (x.tot_saldo || 0), 0);
  const atteso = Math.round((u.bankroll_iniziale + totMov + totGio) * 100) / 100;
  const ok = Math.abs(atteso - u.bankroll) < 0.005;
  if (!ok) problemi++;
  console.log(
    u.username.padEnd(15),
    u.bankroll_iniziale.toFixed(2).padStart(10),
    totMov.toFixed(2).padStart(10),
    totGio.toFixed(2).padStart(11),
    atteso.toFixed(2).padStart(11),
    u.bankroll.toFixed(2).padStart(12),
    String(g.length).padStart(4),
    ok ? '✓' : `✗ scarto ${(u.bankroll - atteso).toFixed(2)}`,
  );
  if (u.bankroll < 0) console.log(`${''.padEnd(15)}⚠️  bankroll negativo`);
}

console.log(problemi ? `\n✗ ${problemi} utenti incoerenti` : '\n✓ tutti coerenti');
process.exit(problemi ? 1 : 0);
