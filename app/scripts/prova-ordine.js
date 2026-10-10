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
const pc = x => (x == null ? ' — ' : `${(x * 100).toFixed(0)}%`);
console.log(`${righe.length} partite · senza resa: ${righe.filter(r => r.resa == null).length}` +
  ` · senza VPM: ${righe.filter(r => vpmDi.get(r.id)?.punti == null).length}`);

for (const o of ORDINI) {
  const lista = [...righe].sort(confronto(o.id, vpmDi));
  console.log(`\n── ${o.label} ──`);
  for (const r of lista.slice(0, 5)) {
    const v = vpmDi.get(r.id);
    console.log(`  ${`${r.casa} - ${r.trasferta}`.padEnd(34)} q ${n2(r.quotaGiocata ?? r.quota)}  att ${pc(r.probGiocata)}` +
      `  VPM ${v?.segno ?? '?'} ${n2(v?.punti)}  resa ${pc(r.resa)}  voto ${pc(v?.voto)}`);
  }
  const chiave = r => o.chiave(r, vpmDi);
  const valori = lista.map(chiave);
  const pieni = valori.filter(x => x != null);
  const decrescente = pieni.every((x, i) => i === 0 || pieni[i - 1] >= x);
  const vuotiInFondo = valori.slice(pieni.length).every(x => x == null);
  // riordinare una lista già ordinata non deve cambiare niente
  const ancora = [...lista].sort(confronto(o.id, vpmDi));
  const stabile = ancora.every((r, i) => r.id === lista[i].id);
  // e il verso inverso deve essere crescente, con i vuoti SEMPRE in fondo
  const su = [...righe].sort(confronto(o.id, vpmDi, true)).map(chiave);
  const suPieni = su.filter(x => x != null);
  const crescenteOk = suPieni.every((x, i) => i === 0 || suPieni[i - 1] <= x)
    && su.slice(suPieni.length).every(x => x == null);
  console.log(`  decrescente ${decrescente ? '✓' : '⚠️'} · vuoti in fondo ${vuotiInFondo ? '✓' : '⚠️'}` +
    ` · stabile ${stabile ? '✓' : '⚠️'} · inverso ${crescenteOk ? '✓' : '⚠️'}`);
}

console.log('\nNiente è stato scritto.');
