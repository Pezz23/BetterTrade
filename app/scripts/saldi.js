// Riepilogo dei saldi di tutti gli utenti.
//
// Uso:  node --env-file=.env scripts/saldi.js

import { admin } from './_admin.js';

const eur = n => (n < 0 ? '-' : '') + '€' + Math.abs(n).toFixed(2);
const arr = n => Math.round(n * 100) / 100;

const { data: utenti } = await admin.from('users')
  .select('id, username, display_name, role, bankroll, bankroll_iniziale').order('username');

const righe = [];
for (const u of utenti) {
  const [{ data: mv }, { data: g }] = await Promise.all([
    admin.from('movimenti').select('tipo, importo').eq('user_id', u.id),
    admin.from('giornate').select('stagione, tot_investito, tot_incasso, tot_saldo').eq('user_id', u.id),
  ]);
  const movimenti = mv.reduce((s, x) => s + (x.tipo === 'deposito' ? x.importo : -x.importo), 0);
  const investito = g.reduce((s, x) => s + (x.tot_investito || 0), 0);
  const incasso   = g.reduce((s, x) => s + (x.tot_incasso   || 0), 0);
  const saldo     = g.reduce((s, x) => s + (x.tot_saldo     || 0), 0);
  const capitale  = u.bankroll_iniziale + movimenti;
  righe.push({
    nome: u.display_name || u.username, ruolo: u.role,
    iniziale: u.bankroll_iniziale, movimenti, investito, incasso, saldo,
    bankroll: u.bankroll,
    variazione: capitale ? (u.bankroll - capitale) / capitale * 100 : null,
    giornate: g.length,
    stagioni: [...new Set(g.map(x => x.stagione))].sort(),
  });
}

const C = { nome: 13, iniz: 10, mov: 9, sal: 11, bank: 11, var: 8, gg: 4 };
console.log();
console.log(
  'UTENTE'.padEnd(C.nome), 'INIZIALE'.padStart(C.iniz), 'MOVIM.'.padStart(C.mov),
  'GIORNATE'.padStart(C.sal), 'SALDO'.padStart(C.bank), 'VAR.'.padStart(C.var),
  'N'.padStart(C.gg), ' STAGIONI',
);
console.log('─'.repeat(84));

for (const r of righe.filter(r => r.giornate > 0 || r.bankroll !== 0)) {
  console.log(
    r.nome.padEnd(C.nome),
    eur(r.iniziale).padStart(C.iniz),
    (r.movimenti ? eur(r.movimenti) : '—').padStart(C.mov),
    eur(arr(r.saldo)).padStart(C.sal),
    eur(r.bankroll).padStart(C.bank),
    (r.variazione === null ? '—' : (r.variazione > 0 ? '+' : '') + r.variazione.toFixed(1) + '%').padStart(C.var),
    String(r.giornate).padStart(C.gg),
    ' ' + r.stagioni.join(' '),
  );
}

const vuoti = righe.filter(r => r.giornate === 0 && r.bankroll === 0);
for (const r of vuoti) console.log(`${r.nome.padEnd(C.nome)} ${'(nessun dato · ' + r.ruolo + ')'}`);

const tot = righe.reduce((a, r) => ({
  iniziale: a.iniziale + r.iniziale, movimenti: a.movimenti + r.movimenti,
  investito: a.investito + r.investito, incasso: a.incasso + r.incasso,
  saldo: a.saldo + r.saldo, bankroll: a.bankroll + r.bankroll,
}), { iniziale:0, movimenti:0, investito:0, incasso:0, saldo:0, bankroll:0 });

const capitale = tot.iniziale + tot.movimenti;
console.log('─'.repeat(84));
console.log(
  'TOTALE'.padEnd(C.nome),
  eur(arr(tot.iniziale)).padStart(C.iniz),
  (tot.movimenti ? eur(arr(tot.movimenti)) : '—').padStart(C.mov),
  eur(arr(tot.saldo)).padStart(C.sal),
  eur(arr(tot.bankroll)).padStart(C.bank),
  ((tot.bankroll - capitale) / capitale * 100).toFixed(1) + '%'.padStart(1),
);

console.log(`\n  capitale versato   ${eur(arr(capitale))}`);
console.log(`  bankroll attuale   ${eur(arr(tot.bankroll))}`);
console.log(`  differenza         ${eur(arr(tot.bankroll - capitale))}`);
console.log(`\n  giocato            ${eur(arr(tot.investito))} su ${righe.reduce((s,r)=>s+r.giornate,0)} giornate`);
console.log(`  incassato          ${eur(arr(tot.incasso))}`);
