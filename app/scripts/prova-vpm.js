// Mostra VPM da terminale su tutte le partite entro il limite del weekend,
// senza toccare niente. Serve a guardare i numeri prima di metterli a schermo,
// e soprattutto a vedere **dove VPM e mercato litigano**: è lì che l'iter
// manuale di Mattia guadagnava qualcosa.
//
//   node --env-file=.env scripts/prova-vpm.js [--tutte] [--squadra=Lens]
//
// Calcola **due volte**: dalle partite grezze e dalla funzione `vpm_dati()`
// (sql/20), e confronta. Se le due strade divergono il confronto lo dice: è
// l'unico modo di accorgersi che la funzione SQL e la libreria si sono
// allontanate, prima che il numero sbagliato finisca a schermo.
//
// Usa le stesse librerie dell'app (`src/lib/vpm.js`, `attendibilita.js`): se
// qui e nell'app i numeri differiscono, la differenza sta nella pagina.

import { admin } from './_admin.js';
import { valuta, martediChiusura } from '../src/lib/attendibilita.js';
import { somme, forza, parametri, vpm, bandiere, valutaPartita, verso, PARTITE_FINESTRA, VPM_NETTO } from '../src/lib/vpm.js';

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

// La forza di una squadra nel ruolo che avrà, dalle partite grezze: è la
// strada di riferimento, quella con cui si confronta il database.
function forzaLocale(div, squadra, dove) {
  const l = storia[`${div}|${squadra}`];
  if (!l) return null;
  const nelRuolo = l.filter(p => p.dove === dove);
  return forza({
    stagione: parametri(somme(l)),
    forma: parametri(somme(l.slice(-PARTITE_FINESTRA))),
    ruolo: parametri(somme(nelRuolo.slice(-PARTITE_FINESTRA))),
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
// ⚠️ **`id` come secondo criterio, e non è un vezzo**: queste sono ~34.000
// righe, cioè 35 pagine, e `data` ha migliaia di pari merito. Paginando con
// `.range()` su un ordine non deterministico, fra una pagina e l'altra il
// database può restituire le righe in ordine diverso: alcune escono due volte
// e altre si perdono. Il 9/10/2026 così sparivano 2 dei 4 scontri di
// Virtus Entella-Juve Stabia, e il confronto con `vpm_dati()` lo ha scoperto.
const scontriTutti = await tuttePagine((a, b) => admin.from('partite')
  .select('data,casa,trasferta,gol_casa,gol_trasferta')
  .in('casa', squadre).in('trasferta', squadre)
  .order('data', { ascending: false }).order('id').range(a, b));
// I conti del testa a testa nella stessa forma che restituisce vpm_dati().
function contiDi(c, t) {
  const tutti = scontriTutti.filter(s => (s.casa === c && s.trasferta === t) || (s.casa === t && s.trasferta === c)).slice(0, 6);
  const campo = scontriTutti.filter(s => s.casa === c && s.trasferta === t).slice(0, 6);
  const vinte = sq => tutti.filter(s => (s.gol_casa > s.gol_trasferta ? s.casa : s.gol_casa < s.gol_trasferta ? s.trasferta : null) === sq).length;
  return {
    n: tutti.length, pari: tutti.filter(s => s.gol_casa === s.gol_trasferta).length,
    vinte_casa: vinte(c), vinte_trasferta: vinte(t),
    n_campo: campo.length, pari_campo: campo.filter(s => s.gol_casa === s.gol_trasferta).length,
  };
}

// La seconda strada: tutto in una chiamata, come farà l'app.
const { data: dati, error: eDati } = await admin.rpc('vpm_dati');
if (eDati) { console.error('✗ vpm_dati:', eDati.message); process.exit(1); }

// ── Il calcolo ────────────────────────────────────────────────────────────────
const righe = [];
for (const p of (prossime || [])) {
  const r = valuta(p);
  if (r.prob === null) continue;
  const fCasa = forzaLocale(p.div, p.casa, 'casa');
  const fFuori = forzaLocale(p.div, p.trasferta, 'fuori');
  const vLocale = vpm(fCasa, fFuori);
  righe.push({
    ...r,
    squadraGiocata: r.segno === '1' ? p.casa : p.trasferta,
    fCasa, fFuori,
    v: vLocale?.punti ?? null,
    segnoCampo: vLocale?.segno ?? null,
    accordo: vLocale ? vLocale.segno === r.segno : null,
    bandiere: bandiere(contiDi(p.casa, p.trasferta), p.casa, p.trasferta),
    // La stessa cosa dai dati del database, **passando per la funzione che usa
    // l'app** (`valutaPartita`): così il confronto verifica il codice vero e
    // non una sua copia scritta qui.
    ...(() => { const v = valutaPartita(dati, r); return { vSql: v.punti, bandiereSql: v.bandiere, versoSql: verso(v) } })(),
  });
}

const pct = x => `${(x * 100).toFixed(0)}%`;
const n2 = x => (x == null ? '  — ' : x.toFixed(2).padStart(5));

console.log(`${righe.length} partite da oggi a martedì ${limite} · stagione ${stagione}`);
console.log(`VPM = il segno che dice il campo e quanto è netto (5,5 pari … 10) · sotto ${VPM_NETTO} non si pronuncia`);
console.log(`⛔ il campo dice l'altro segno · ✅ d'accordo col mercato · · indeciso\n`);

// L'ordine utile: prima i disaccordi, dal più netto. È la domanda vera —
// dove il campo dice il contrario del mercato, e lo dice con forza.
const peso = r => (r.accordo === false ? -(r.v ?? 0) : 100 - (r.v ?? 0));
const mostra = righe
  .filter(r => !soloSquadra || r.casa.includes(soloSquadra) || r.trasferta.includes(soloSquadra))
  .sort((a, b) => peso(a) - peso(b));

const elenco = tutte || soloSquadra ? mostra : mostra.slice(0, 12);
for (const r of elenco) {
  const v = r.versoSql;
  const segnale = !v ? '  ?' : v === 'contro' ? '⛔' : v === 'conferma' ? '✅' : '  ·';
  console.log(
    `${segnale} ${r.data.slice(5)} ${r.div.padEnd(4)} ${`${r.casa} - ${r.trasferta}`.padEnd(36)}` +
    ` ${r.giocata.padEnd(8)} att ${pct(r.probGiocata)}  VPM ${r.segnoCampo ?? '?'}${n2(r.v)}` +
    `   forza ${n2(r.fCasa?.punti)} vs ${n2(r.fFuori?.punti)}`
  );
  for (const b of r.bandiere) console.log(`        ${b.grave ? '🔴' : '⚪️'} ${b.testo}`);
}
if (!tutte && !soloSquadra && mostra.length > elenco.length) {
  console.log(`\n… e altre ${mostra.length - elenco.length}: --tutte per vederle.`);
}
// ── Il confronto fra le due strade ────────────────────────────────────────────
const diversi = righe.filter(r => Math.abs((r.v ?? -1) - (r.vSql ?? -1)) > 0.005);
const bandiereDiverse = righe.filter(r =>
  r.bandiere.map(b => b.testo).join('|') !== r.bandiereSql.map(b => b.testo).join('|'));
console.log(`\nConfronto partite grezze ↔ vpm_dati(): ${righe.length - diversi.length}/${righe.length} identiche` +
  (diversi.length ? ' ⚠️' : ' ✓') + ` · bandierine: ${righe.length - bandiereDiverse.length}/${righe.length}` +
  (bandiereDiverse.length ? ' ⚠️' : ' ✓'));
for (const r of diversi.slice(0, 5)) console.log(`  ⚠️ ${r.casa} - ${r.trasferta}: locale ${n2(r.v)} vs sql ${n2(r.vSql)}`);
for (const r of bandiereDiverse.slice(0, 5)) {
  console.log(`  ⚠️ ${r.casa} - ${r.trasferta}: locale [${r.bandiere.map(b => b.testo)}] vs sql [${r.bandiereSql.map(b => b.testo)}]`);
}

console.log('\nNiente è stato scritto.');
