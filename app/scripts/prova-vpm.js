// Mostra VPM da terminale su tutte le partite entro il limite del weekend,
// senza toccare niente. Serve a guardare i numeri prima di metterli a schermo,
// e soprattutto a vedere **dove VPM e mercato litigano**: è lì che l'iter
// manuale di Mattia guadagnava qualcosa.
//
//   node --env-file=.env scripts/prova-vpm.js [--tutte] [--squadra=Lens]
//
// Usa le stesse librerie dell'app (`src/lib/vpm.js`, `attendibilita.js`): se
// qui e nell'app i numeri differiscono, la differenza sta nella pagina.

import { admin } from './_admin.js';
import { valuta, martediChiusura } from '../src/lib/attendibilita.js';
import { parametri, forza, vpm, bandiere, PARTITE_FINESTRA, VPM_CONTRARIO, VPM_CONFERMA } from '../src/lib/vpm.js';

const arg = n => process.argv.find(a => a.startsWith(`--${n}`));
const soloSquadra = arg('squadra')?.split('=')[1];
const tutte = !!arg('tutte');

// ── L'archivio della stagione in corso, squadra per squadra ───────────────────
async function tuttePagine(q) {
  let out = [], da = 0;
  for (;;) {
    const { data, error } = await q(da, da + 999);
    if (error) { console.error('✗', error.message); process.exit(1); }
    out = out.concat(data);
    if (data.length < 1000) return out;
    da += 1000;
  }
}

const { data: ultima } = await admin.from('partite').select('stagione').order('stagione', { ascending: false }).limit(1);
const stagione = ultima[0].stagione;

const giocate = await tuttePagine((a, b) => admin.from('partite')
  .select('div,data,casa,trasferta,gol_casa,gol_trasferta,tirip_casa,tirip_trasf')
  .eq('stagione', stagione).order('data').range(a, b));

// Per ogni squadra, le sue partite in ordine, viste da lei.
const storia = {};
for (const m of giocate) {
  for (const [nome, gf, gs, tf, tc, dove] of [
    [m.casa, m.gol_casa, m.gol_trasferta, m.tirip_casa, m.tirip_trasf, 'casa'],
    [m.trasferta, m.gol_trasferta, m.gol_casa, m.tirip_trasf, m.tirip_casa, 'fuori'],
  ]) {
    (storia[`${m.div}|${nome}`] ??= []).push({ gf, gs, tf: tf ?? 0, tc: tc ?? 0, dove, v: gf > gs ? 1 : 0 });
  }
}

// La forza di una squadra nel ruolo che avrà: tre finestre dalla sua storia.
function forzaDi(div, squadra, dove) {
  const l = storia[`${div}|${squadra}`];
  if (!l) return null;
  const nelRuolo = l.filter(p => p.dove === dove);
  return forza({
    stagione: parametri(l),
    forma: parametri(l.slice(-PARTITE_FINESTRA)),
    ruolo: parametri(nelRuolo.slice(-PARTITE_FINESTRA)),
  }, dove);
}

// ── Le partite da valutare ────────────────────────────────────────────────────
const limite = martediChiusura();
const oggi = new Date().toISOString().slice(0, 10);
const { data: prossime } = await admin.from('prossime_partite')
  .select('id,div,data,casa,trasferta,avg_ap_1,avg_ap_x,avg_ap_2,max_ap_1,max_ap_x,max_ap_2,b365_1,b365_x,b365_2,b365_over25,book,book_1,book_x,book_2')
  .gte('data', oggi).lte('data', limite).order('data');

// Gli scontri diretti fra le squadre coinvolte, in una sola chiamata.
const squadre = [...new Set((prossime || []).flatMap(p => [p.casa, p.trasferta]))];
const scontriTutti = await tuttePagine((a, b) => admin.from('partite')
  .select('data,casa,trasferta,gol_casa,gol_trasferta')
  .in('casa', squadre).in('trasferta', squadre).order('data', { ascending: false }).range(a, b));
const scontriDi = (c, t) => ({
  tutti: scontriTutti.filter(s => (s.casa === c && s.trasferta === t) || (s.casa === t && s.trasferta === c)).slice(0, 6),
  stessoCampo: scontriTutti.filter(s => s.casa === c && s.trasferta === t).slice(0, 6),
});

// ── Il calcolo ────────────────────────────────────────────────────────────────
const righe = [];
for (const p of (prossime || [])) {
  const r = valuta(p);
  if (r.prob === null) continue;
  const fCasa = forzaDi(p.div, p.casa, 'casa');
  const fFuori = forzaDi(p.div, p.trasferta, 'fuori');
  const miaForza = r.segno === '1' ? fCasa : fFuori;
  const suaForza = r.segno === '1' ? fFuori : fCasa;
  righe.push({
    ...r,
    squadraGiocata: r.segno === '1' ? p.casa : p.trasferta,
    fCasa, fFuori,
    v: vpm(miaForza, suaForza),
    bandiere: bandiere(scontriDi(p.casa, p.trasferta), p.casa, p.trasferta),
  });
}

const pct = x => `${(x * 100).toFixed(0)}%`;
const n2 = x => (x == null ? '  — ' : x.toFixed(2).padStart(5));

console.log(`${righe.length} partite da oggi a martedì ${limite} · stagione ${stagione}`);
console.log(`VPM sotto ${VPM_CONTRARIO} = il campo contraddice la giocata · sopra ${VPM_CONFERMA} = la conferma\n`);

const mostra = righe
  .filter(r => !soloSquadra || r.casa.includes(soloSquadra) || r.trasferta.includes(soloSquadra))
  .sort((a, b) => (a.v ?? 99) - (b.v ?? 99));

const elenco = tutte || soloSquadra ? mostra : mostra.slice(0, 12);
for (const r of elenco) {
  const segnale = r.v == null ? '  ?' : r.v < VPM_CONTRARIO ? '⛔' : r.v > VPM_CONFERMA ? '✅' : '  ·';
  console.log(
    `${segnale} ${r.data.slice(5)} ${r.div.padEnd(4)} ${`${r.casa} - ${r.trasferta}`.padEnd(36)}` +
    ` ${r.giocata.padEnd(8)} att ${pct(r.probGiocata)}  VPM ${n2(r.v)}` +
    `   forza ${n2(r.fCasa?.punti)} vs ${n2(r.fFuori?.punti)}`
  );
  for (const b of r.bandiere) console.log(`        ${b.grave ? '🔴' : '⚪️'} ${b.testo}`);
}
if (!tutte && !soloSquadra && mostra.length > elenco.length) {
  console.log(`\n… e altre ${mostra.length - elenco.length}: --tutte per vederle.`);
}
console.log('\nNiente è stato scritto.');
