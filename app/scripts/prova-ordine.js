// Prova i tre ordini della lista Partite sui dati veri, compresi i casi limite:
// il valore che manca e il pari merito. Non scrive niente.
//
//   node --env-file=.env scripts/prova-ordine.js
//
// Esiste perché l'ordinamento in un componente non si prova, e i suoi difetti
// non si vedono: un confronto che torna NaN non lancia niente, lascia solo la
// lista in un ordine qualunque.

import { admin } from './_admin.js';
import { valuta, martediChiusura } from '../src/lib/attendibilita.js';
import { valutaPartita } from '../src/lib/vpm.js';
import { ORDINI, confronto } from '../src/lib/ordine.js';

const oggi = new Date().toISOString().slice(0, 10);
const { data } = await admin.from('prossime_partite').select('*')
  .gte('data', oggi).lte('data', martediChiusura()).order('data');
const { data: dati } = await admin.rpc('vpm_dati');
const righe = (data || []).map(valuta).filter(r => r.prob !== null);
const vpmDi = new Map(righe.map(r => [r.id, valutaPartita(dati, r)]));

const n2 = x => (x == null ? ' —  ' : x.toFixed(2));
console.log(`${righe.length} partite · senza Grado: ${righe.filter(r => r.grado == null).length}` +
  ` · senza VPM: ${righe.filter(r => vpmDi.get(r.id)?.punti == null).length}`);

for (const o of ORDINI) {
  const lista = [...righe].sort(confronto(o.id, vpmDi));
  console.log(`\n── ${o.label} ──`);
  for (const r of lista.slice(0, 5)) {
    const v = vpmDi.get(r.id);
    console.log(`  ${`${r.casa} - ${r.trasferta}`.padEnd(34)} att ${n2(r.probGiocata * 100)}  G ${n2(r.grado)}  VPM ${v?.segno ?? '?'} ${n2(v?.punti)}`);
  }
  // I controlli che contano, e che a schermo non si vedrebbero.
  const vuoti = lista.map((r, i) => [i, o.id === 'grado' ? r.grado : o.id === 'vpm' ? vpmDi.get(r.id)?.punti : 1]).filter(([, v]) => v == null).map(([i]) => i);
  const primoVuoto = vuoti.length ? Math.min(...vuoti) : null;
  console.log(`  valori mancanti: ${vuoti.length}${vuoti.length ? ` · primo in posizione ${primoVuoto + 1} di ${lista.length}` : ''}` +
    `${vuoti.length && primoVuoto < lista.length - vuoti.length ? '  ⚠️ NON sono in fondo' : ' ✓'}`);
  // Stabilità: riordinare una lista già ordinata non deve cambiare niente.
  const ancora = [...lista].sort(confronto(o.id, vpmDi));
  const stabile = ancora.every((r, i) => r.id === lista[i].id);
  console.log(`  ordine stabile a pari merito: ${stabile ? '✓' : '⚠️ NO'}`);
}
// ── I casi limite, con righe finte ───────────────────────────────────────────
// Oggi i dati veri sono tutti completi, quindi la protezione sui valori
// mancanti non verrebbe provata da niente. Queste righe la mettono alla prova:
// senza `fondo()` il confronto restituisce NaN e l'ordine salta del tutto.
console.log('\n── casi limite (righe finte) ──');
const finte = [
  { id: 'a', casa: 'Pieno',   trasferta: 'X', probGiocata: 0.70, grado: 8.0,  data: '2026-10-10' },
  { id: 'b', casa: 'SenzaG',  trasferta: 'X', probGiocata: 0.69, grado: null, data: '2026-10-10' },
  { id: 'c', casa: 'Medio',   trasferta: 'X', probGiocata: 0.68, grado: 5.0,  data: '2026-10-10' },
  { id: 'd', casa: 'SenzaG2', trasferta: 'X', probGiocata: 0.67, grado: null, data: '2026-10-10' },
  { id: 'e', casa: 'PariG',   trasferta: 'X', probGiocata: 0.66, grado: 8.0,  data: '2026-10-10' },
];
const vpmFinti = new Map([
  ['a', { punti: 7.0, segno: '1' }], ['b', { punti: null, segno: null }],
  ['c', { punti: 9.0, segno: '2' }], ['d', { punti: null, segno: null }],
  ['e', { punti: 7.0, segno: '1' }],
]);
for (const o of ORDINI) {
  const l = [...finte].sort(confronto(o.id, vpmFinti));
  const chiave = r => (o.id === 'grado' ? r.grado : o.id === 'vpm' ? vpmFinti.get(r.id).punti : Math.round(r.probGiocata * 100));
  const valori = l.map(r => chiave(r));
  const pieni = valori.filter(v => v != null);
  const decrescente = pieni.every((v, i) => i === 0 || pieni[i - 1] >= v);
  const vuotiInFondo = valori.findIndex(v => v == null) === -1 || valori.slice(pieni.length).every(v => v == null);
  console.log(`  ${o.label.padEnd(14)} ${l.map(r => r.casa).join(' → ')}`);
  console.log(`  ${''.padEnd(14)} decrescente ${decrescente ? '✓' : '⚠️ NO'} · mancanti in fondo ${vuotiInFondo ? '✓' : '⚠️ NO'}`);
}

console.log('\nNiente è stato scritto.');
