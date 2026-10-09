// Quello che la scheda della partita mostrerà nel blocco VPM, da terminale:
// le due forze, i tre strati col peso vero, i parametri fusi e le bandierine.
//
//   node --env-file=.env scripts/prova-scheda.js [--squadra=Lens]
//
// ⚠️ Controlla anche l'identità `Σ pesi × parametri = FORZA`: i parametri fusi
// e la forza sono due strade sugli stessi numeri, e se un giorno non tornano
// vuol dire che una delle due è stata toccata senza l'altra.

import { admin } from './_admin.js';
import { valuta, martediChiusura, oggiLocale } from '../src/lib/attendibilita.js';
import { valutaPartita, vociPesate, verso, PESI, ETICHETTE, NOMI_STRATI } from '../src/lib/vpm.js';

const soloSquadra = process.argv.find(a => a.startsWith('--squadra='))?.split('=')[1];

const { data, error } = await admin.from('prossime_partite').select('*')
  .gte('data', oggiLocale()).lte('data', martediChiusura()).order('data');
if (error) { console.error('✗', error.message); process.exit(1); }
const { data: dati, error: e2 } = await admin.rpc('vpm_dati');
if (e2) { console.error('✗ vpm_dati:', e2.message); process.exit(1); }

const righe = (data || []).map(valuta).filter(r => r.prob !== null);
const n2 = x => (x == null ? '   —' : x.toFixed(2).padStart(5));

// ── L'identità, su tutte le partite ──────────────────────────────────────────
let peggio = 0, quante = 0;
for (const r of righe) {
  const v = valutaPartita(dati, r);
  for (const f of [v.forzaCasa, v.forzaFuori]) {
    if (!f) continue;
    const voci = vociPesate(f);
    const somma = Object.entries(PESI).reduce((a, [k, w]) => a + w * voci[k], 0);
    peggio = Math.max(peggio, Math.abs(somma - f.punti)); quante++;
  }
}
console.log(`Σ pesi × parametri = FORZA · su ${quante} squadre-partita · scarto massimo ${peggio.toExponential(1)} ${peggio < 1e-9 ? '✓' : '⚠️'}\n`);

// ── Il dettaglio di una partita ──────────────────────────────────────────────
const scelte = soloSquadra
  ? righe.filter(r => r.casa.includes(soloSquadra) || r.trasferta.includes(soloSquadra))
  : righe.slice(0, 1);

for (const r of scelte) {
  const v = valutaPartita(dati, r);
  if (v.punti == null) { console.log(`${r.casa} - ${r.trasferta}: VPM non calcolabile`); continue; }
  const F = [v.forzaCasa, v.forzaFuori], voci = F.map(vociPesate);
  console.log(`${r.casa} - ${r.trasferta}  ·  giocata ${r.giocata} (${(r.probGiocata * 100).toFixed(0)}%)`);
  console.log(`VPM ${v.segno} ${v.punti.toFixed(2)} — ${verso(v)}\n`);
  console.log(`${''.padEnd(22)}${r.casa.slice(0, 7).padStart(7)}${r.trasferta.slice(0, 7).padStart(8)}`);
  console.log(`${'FORZA'.padEnd(22)}${n2(F[0]?.punti).padStart(7)}${n2(F[1]?.punti).padStart(8)}`);
  for (const nome of ['stagione', 'forma', 'ruolo']) {
    const a = F[0]?.strati?.[nome], b = F[1]?.strati?.[nome];
    const pa = Math.round((F[0]?.pesi?.[nome] ?? 0) * 100), pb = Math.round((F[1]?.pesi?.[nome] ?? 0) * 100);
    console.log(`  ${NOMI_STRATI[nome].padEnd(12)} ${`${pa}%/${pb}%`.padEnd(7)}${n2(a?.punti).padStart(7)}${n2(b?.punti).padStart(8)}   (${a?.n ?? 0} e ${b?.n ?? 0} partite)`);
  }
  console.log('');
  for (const k of Object.keys(PESI)) {
    console.log(`  ${ETICHETTE[k].padEnd(16)} ${`${(PESI[k] * 100).toFixed(0)}%`.padEnd(4)}${n2(voci[0]?.[k]).padStart(7)}${n2(voci[1]?.[k]).padStart(8)}`);
  }
  if (v.bandiere.length) {
    console.log('');
    for (const b of v.bandiere) console.log(`  ${b.grave ? '🔴' : '⚪️'} ${b.testo}`);
  }
  console.log('');
}
console.log('Niente è stato scritto.');
