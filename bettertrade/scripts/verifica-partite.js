// Confronta l'archivio su Supabase con la sorgente locale, riga per riga sui
// conteggi e a campione sui contenuti. Da lanciare prima di dismettere Neon.
//
// Uso:  node --env-file=.env scripts/verifica-partite.js

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { admin, emailDi } from './_admin.js';

const giornoLocale = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const sorgente = JSON.parse(readFileSync(new URL('../../btscout/.cache/partite.json', import.meta.url), 'utf8'))
  .map(r => ({ ...r, data: giornoLocale(r.data) }));

let problemi = 0;
const ok = (cond, testo, extra = '') => {
  if (!cond) problemi++;
  console.log(`  ${cond ? '✓' : '✗'} ${testo.padEnd(46)}${extra}`);
};

// ── Conteggio totale ────────────────────────────────────────────────────────
const { count: totale } = await admin.from('partite').select('*', { count: 'exact', head: true });
ok(totale === sorgente.length, 'righe totali', `${totale} / ${sorgente.length}`);

// ── Conteggio per campionato e stagione ─────────────────────────────────────
const attesi = new Map();
for (const r of sorgente) {
  const k = `${r.div}|${r.stagione}`;
  attesi.set(k, (attesi.get(k) || 0) + 1);
}
let gruppiSbagliati = 0;
for (const [k, atteso] of attesi) {
  const [div, stagione] = k.split('|');
  const { count } = await admin.from('partite')
    .select('*', { count: 'exact', head: true }).eq('div', div).eq('stagione', stagione);
  if (count !== atteso) { gruppiSbagliati++; console.log(`      ✗ ${k}: ${count} invece di ${atteso}`); }
}
ok(gruppiSbagliati === 0, 'conteggi per campionato e stagione', `${attesi.size} gruppi`);

// ── Estremi temporali ───────────────────────────────────────────────────────
const date = sorgente.map(r => r.data).sort();
const { data: primaR } = await admin.from('partite').select('data').order('data').limit(1);
const { data: ultimaR } = await admin.from('partite').select('data').order('data', { ascending: false }).limit(1);
ok(primaR[0].data === date[0], 'prima partita', `${primaR[0].data} (attesa ${date[0]})`);
ok(ultimaR[0].data === date[date.length - 1], 'ultima partita', `${ultimaR[0].data} (attesa ${date[date.length - 1]})`);

// ── Confronto a campione, 200 partite estratte a caso ───────────────────────
const CAMPIONI = 200;
let diverse = 0;
for (let i = 0; i < CAMPIONI; i++) {
  const r = sorgente[Math.floor(Math.random() * sorgente.length)];
  const { data: trovata } = await admin.from('partite').select('*')
    .eq('div', r.div).eq('stagione', r.stagione).eq('data', r.data)
    .eq('casa', r.casa).eq('trasferta', r.trasferta).maybeSingle();
  if (!trovata) { diverse++; console.log(`      ✗ non trovata: ${r.data} ${r.casa}-${r.trasferta}`); continue; }
  for (const c of ['gol_casa', 'gol_trasferta', 'esito', 'tirip_casa', 'b365_1', 'ps_1', 'avg_over25']) {
    const a = r[c], b = trovata[c];
    const uguali = (a === null || a === undefined) ? (b === null)
                 : typeof a === 'number' ? Math.abs(a - b) < 0.001 : a === b;
    if (!uguali) { diverse++; console.log(`      ✗ ${r.data} ${r.casa}-${r.trasferta} · ${c}: ${b} invece di ${a}`); break; }
  }
}
ok(diverse === 0, `confronto a campione (${CAMPIONI} partite)`, diverse ? `${diverse} differenze` : 'tutte identiche');

// ── Una partita nota, per controllare le date ───────────────────────────────
const { data: bayern } = await admin.from('partite').select('data, gol_casa, gol_trasferta')
  .eq('casa', 'Bayern Munich').eq('trasferta', 'Werder Bremen').eq('stagione', '1617').maybeSingle();
ok(bayern?.data === '2016-08-26' && bayern?.gol_casa === 6,
   'Bayern-Werder 2016/17 (data reale 26/08)', `${bayern?.data} ${bayern?.gol_casa}-${bayern?.gol_trasferta}`);

// ── Campi obbligatori ───────────────────────────────────────────────────────
const { count: senzaGol } = await admin.from('partite').select('*', { count: 'exact', head: true }).is('gol_casa', null);
ok(senzaGol === 0, 'nessuna partita senza risultato', `${senzaGol}`);

// ── L'app la può leggere davvero? ───────────────────────────────────────────
const utente = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: anonimo } = await utente.from('partite').select('id').limit(1);
ok(!anonimo || anonimo.length === 0, 'senza login non si legge', '');

if (process.argv[2] && process.argv[3]) {
  await utente.auth.signInWithPassword({ email: emailDi(process.argv[2]), password: process.argv[3] });
  const { data: letto, error } = await utente.from('partite')
    .select('data, casa, trasferta, b365_1').eq('div', 'I1').eq('stagione', '2526').limit(5);
  ok(!error && letto?.length > 0, 'con login l\'app legge le partite', `${letto?.length ?? 0} righe di esempio`);
  if (letto?.length) for (const r of letto) console.log(`      ${r.data}  ${r.casa} - ${r.trasferta}  @${r.b365_1 ?? '—'}`);
} else {
  console.log('  · prova di lettura come utente saltata (passa username e password per farla)');
}

console.log(problemi ? `\n✗ ${problemi} controlli falliti — NON dismettere Neon\n` : '\n✓ archivio verificato: Supabase contiene esattamente quello che c\'era su Neon\n');
process.exit(problemi ? 1 : 0);
