// L'AVVERSARIO AFFRONTATO: conta, e quanto?  (idea di Mattia, 12/10/2026)
//
//   node --env-file=.env scripts/prova-gol-avversari.js [--stagioni=8] [--k=20]
//
// Il modello in uso misura "quanto segna" una squadra sulla media del
// campionato: chi ha incontrato tre difese di ferro sembra sterile, chi ha
// incontrato tre colabrodo sembra una corazzata. Qui ogni partita della storia
// viene **ripesata per l'avversario che c'era di fronte** prima di entrare nella
// media: i tiri fatti si dividono per quanto quell'avversario concedeva, i tiri
// subiti per quanto quell'avversario produceva.
//
// ⚠️ Tutto camminando nel tempo: la forza dell'avversario è quella che si
// conosceva PRIMA di quella partita, mai dopo.
// ⚠️ La correzione si prova a tre intensità, perché dividere per una stima
// rumorosa aggiunge rumore: 0 = il modello in uso, 0,5 = metà, 1 = piena.
// ⚠️ Niente di questo entra in `lib/gol.js` finché non vince qui.

import { sql } from '../lib/db.js';
import { giornoLocale } from '../lib/date.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8);
const K = arg('k', 20);
const FINESTRA = 5;
const MIN_AVV = 3;          // sotto 3 partite dell'avversario non si corregge niente

const righe = await sql`
  select data, stagione, div, casa, trasferta, gol_casa, gol_trasferta,
         coalesce(tirip_casa,0) as tpc, coalesce(tirip_trasf,0) as tpt,
         b365_over25, avg_ap_over25, avg_ap_under25
  from partite
  where gol_casa is not null and tirip_casa is not null
  order by data, div, casa`;
if (!righe.length) { console.error('✗ nessuna partita: controlla la connessione'); process.exit(1) }
const stagioni = [...new Set(righe.map(r => r.stagione))].sort().slice(-STAGIONI);

function poisson(k, l) { let f = 1; for (let i = 2; i <= k; i++) f *= i; return Math.exp(-l) * Math.pow(l, k) / f }
const pOver = (l, s) => { let c = 0; for (let i = 0; i <= s; i++) c += poisson(i, l); return 1 - c };
const str = (x, n) => 1 + (x - 1) * n / (n + K);

// PESO = quanto si crede alla correzione per l'avversario (0 = il modello in uso)
function gira(PESO, STRINGI = true) {
  const storia = new Map();                 // "stagione|div|squadra" → partite viste
  const med = new Map();                    // "stagione|div" → somme correnti
  const k = (s, d, sq) => `${s}|${d}|${sq}`;
  const prove = [];

  for (const r of righe) {
    const kd = `${r.stagione}|${r.div}`;
    const m = med.get(kd);
    const lC = storia.get(k(r.stagione, r.div, r.casa)) || [];
    const lT = storia.get(k(r.stagione, r.div, r.trasferta)) || [];

    if (m && m.n >= 20) {
      const base = (m.baseC + m.baseF) / (2 * m.n);     // media unica, come in uso
      const media = (m.golC + m.golF) / (2 * m.n);

      const ritmo = (l, dove) => {
        if (l.length < 3) return null;
        const nel = l.filter(x => x.dove === dove);
        const pesa = (campo) => {
          const ult = l.slice(-FINESTRA), ruo = nel.slice(-FINESTRA);
          const pF = 0.30 * Math.min(1, ult.length / FINESTRA);
          const pR = 0.25 * Math.min(1, ruo.length / FINESTRA);
          const md = a => a.reduce((s, x) => s + x[campo], 0) / a.length;
          return (1 - pF - pR) * md(l) + pF * md(ult) + (ruo.length ? pR * md(ruo) : 0);
        };
        return { fatti: pesa('f'), subiti: pesa('s'), n: l.length };
      };

      const c = ritmo(lC, 'casa'), t = ritmo(lT, 'fuori');
      if (c && t) {
        const attC = str(c.fatti / base, c.n), difC = str(c.subiti / base, c.n);
        const attT = str(t.fatti / base, t.n), difT = str(t.subiti / base, t.n);
        const lam = (attC * difT + attT * difC) * media;
        const pm = (r.avg_ap_over25 && r.avg_ap_under25)
          ? (1 / Number(r.avg_ap_over25)) / (1 / Number(r.avg_ap_over25) + 1 / Number(r.avg_ap_under25)) : null;
        if (stagioni.includes(r.stagione)) prove.push({
          data: giornoLocale(r.data), lam, nMin: Math.min(c.n, t.n),
          p25: pOver(lam, 2), p15: pOver(lam, 1),
          gol: r.gol_casa + r.gol_trasferta,
          over: r.gol_casa + r.gol_trasferta > 2,
          over15: r.gol_casa + r.gol_trasferta > 1,
          q: r.b365_over25 ? Number(r.b365_over25) : null, pm });
      }
    }

    // ── la partita entra nella storia, ripesata per chi c'era di fronte ─────
    // La forza dell'avversario è una media semplice sulle sue partite
    // precedenti: una correzione grossolana vuole la stima meno rumorosa, non
    // i tre strati.
    const baseOra = m && m.n >= 20 ? (m.baseC + m.baseF) / (2 * m.n) : null;
    const fattore = (lAvv, campo) => {
      if (!PESO || !baseOra || lAvv.length < MIN_AVV) return 1;
      const r0 = lAvv.reduce((s, x) => s + x[campo], 0) / lAvv.length / baseOra;
      // senza stretta il rapporto su 3 partite puo' valere 0,3 o 2,5: si taglia,
      // altrimenti una sola partita strana ribalta tutta la storia della squadra.
      const grezzo = STRINGI ? str(r0, lAvv.length) : Math.min(1.6, Math.max(0.6, r0));
      return 1 + (grezzo - 1) * PESO;
    };
    // i tiri della casa valgono di più se la trasferta concedeva poco ('s'),
    // e quelli che la casa ha subito valgono di più se la trasferta produceva poco ('f')
    const fDifT = fattore(lT, 's'), fAttT = fattore(lT, 'f');
    const fDifC = fattore(lC, 's'), fAttC = fattore(lC, 'f');
    const add = (sq, f, s, dove) => { const key = k(r.stagione, r.div, sq);
      if (!storia.has(key)) storia.set(key, []); storia.get(key).push({ f, s, dove }) };
    add(r.casa,      (+r.tpc) / fDifT, (+r.tpt) / fAttT, 'casa');
    add(r.trasferta, (+r.tpt) / fDifC, (+r.tpc) / fAttC, 'fuori');

    if (!med.has(kd)) med.set(kd, { n: 0, golC: 0, golF: 0, baseC: 0, baseF: 0 });
    const mm = med.get(kd);
    mm.n++; mm.golC += r.gol_casa; mm.golF += r.gol_trasferta;
    mm.baseC += +r.tpc; mm.baseF += +r.tpt;
  }
  return prove;
}

function soldi(l) {
  if (!l.length) return '—';
  const r = l.reduce((a, p) => a + (p.over ? p.q : 0), 0) / l.length;
  const va = l.reduce((a, p) => a + Math.pow((p.over ? p.q : 0) - r, 2), 0) / l.length;
  return `${(r * 100).toFixed(1)}% ±${(1.96 * Math.sqrt(va / l.length) * 100).toFixed(1)}`;
}

console.log(`stagioni ${stagioni.join(', ')} · stretta K = ${K} · base: tiri in porta\n`);
console.log(`${'correzione'.padEnd(22)} ${'partite'.padStart(7)}  aggiunge   over2,5 prime 9   over1,5 prime 9   in soldi`);

let mercato = null, baseFreq = null;
const VAR = [['nessuna (in uso)', 0, true], ['metà', 0.5, true], ['piena', 1, true], ['piena, senza stretta', 1, false]];
const fette = [];
for (const [nome, PESO, STRINGI] of VAR) {
  const prove = gira(PESO, STRINGI);
  fette.push([nome, prove]);
  const b25 = prove.filter(p => p.over).length / prove.length;
  const b15 = prove.filter(p => p.over15).length / prove.length;
  baseFreq = [b25, b15];
  const brier = f => prove.reduce((a, p) => a + Math.pow(f(p) - (p.over ? 1 : 0), 2), 0) / prove.length;
  const aggiunge = brier(() => b25) - brier(p => p.p25);

  const perG = new Map();
  for (const p of prove) { if (!perG.has(p.data)) perG.set(p.data, []); perG.get(p.data).push(p) }
  let top = [];
  for (const l of perG.values()) top = top.concat([...l].sort((a, b) => b.p25 - a.p25).slice(0, 9));
  const ok25 = top.filter(p => p.over).length / top.length;
  const ok15 = top.filter(p => p.over15).length / top.length;

  console.log(`${nome.padEnd(22)} ${String(prove.length).padStart(7)}  ${aggiunge >= 0 ? '+' : ''}${aggiunge.toFixed(4)}` +
    `   ${(ok25 * 100).toFixed(1)}% (${(ok25 * 100 - b25 * 100 >= 0 ? '+' : '')}${(ok25 * 100 - b25 * 100).toFixed(1)})` +
    `     ${(ok15 * 100).toFixed(1)}% (${(ok15 * 100 - b15 * 100 >= 0 ? '+' : '')}${(ok15 * 100 - b15 * 100).toFixed(1)})` +
    `     ${soldi(top.filter(p => p.q))}`);

  // la calibrazione: i gol previsti contro quelli arrivati, a fasce
  if (PESO === 0 || !STRINGI) {
    const fasce = [[0, 2.2], [2.2, 2.5], [2.5, 2.8], [2.8, 10]];
    const det = fasce.map(([a, b]) => {
      const l = prove.filter(p => p.lam >= a && p.lam < b);
      return l.length ? `${a}-${b}: previsti ${(l.reduce((s, p) => s + p.lam, 0) / l.length).toFixed(2)} arrivati ${(l.reduce((s, p) => s + p.gol, 0) / l.length).toFixed(2)} (${l.length})` : null;
    }).filter(Boolean);
    console.log(`   ${det.join(' · ')}`);
  }

  if (!mercato) {
    const conM = prove.filter(p => p.pm != null);
    const bm = conM.filter(p => p.over).length / conM.length;
    const brierM = f => conM.reduce((a, p) => a + Math.pow(f(p) - (p.over ? 1 : 0), 2), 0) / conM.length;
    mercato = brierM(() => bm) - brierM(p => p.pm);
  }
}
// ⚠️ Controllo che la correzione morda: se le due previsioni fossero identiche
// il confronto sopra non direbbe niente sull'idea, solo che il codice non fa nulla.
// ⚠️ LA FETTA CHE CONTA: a stagione avanzata ogni squadra ha incontrato quasi
// tutti, quindi la forza degli avversari si compensa da sé e correggerla non
// può cambiare niente. Se l'idea vale, vale **qui**: alla 3ª-8ª partita, quando
// una squadra può aver incontrato solo le prime tre in classifica.
console.log(`\n── solo quando le due squadre hanno giocato meno di 8 partite ──`);
console.log(`${'correzione'.padEnd(22)} ${'partite'.padStart(7)}  aggiunge   over2,5 prime 9   in soldi`);
for (const [nome, tutte] of fette) {
  const prove = tutte.filter(p => p.nMin < 8);
  const b25 = prove.filter(p => p.over).length / prove.length;
  const brier = f => prove.reduce((a, p) => a + Math.pow(f(p) - (p.over ? 1 : 0), 2), 0) / prove.length;
  const perG = new Map();
  for (const p of prove) { if (!perG.has(p.data)) perG.set(p.data, []); perG.get(p.data).push(p) }
  let top = [];
  for (const l of perG.values()) top = top.concat([...l].sort((a, b) => b.p25 - a.p25).slice(0, 9));
  const ok = top.filter(p => p.over).length / top.length;
  console.log(`${nome.padEnd(22)} ${String(prove.length).padStart(7)}  ${(brier(() => b25) - brier(p => p.p25)).toFixed(4)}` +
    `   ${(ok * 100).toFixed(1)}% (${(ok * 100 - b25 * 100 >= 0 ? '+' : '')}${(ok * 100 - b25 * 100).toFixed(1)})     ${soldi(top.filter(p => p.q))}`);
}

{
  const a = gira(0), b = gira(1, false);
  let somma = 0, massimo = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i].lam - b[i].lam); somma += d; if (d > massimo) massimo = d }
  console.log(`\nquanto sposta (correzione piena senza stretta): i gol attesi cambiano in media di ${(somma / a.length).toFixed(3)} (massimo ${massimo.toFixed(3)}).`);
}
console.log(`\nil mercato, sulle stesse partite, aggiunge +${mercato.toFixed(4)}.`);
console.log(`base del periodo: over 2,5 ${(baseFreq[0] * 100).toFixed(1)}% · over 1,5 ${(baseFreq[1] * 100).toFixed(1)}%`);

await sql.end();
