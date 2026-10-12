// VARIANTI del modello dei gol, messe una contro l'altra sugli stessi dati.
//
//   node --env-file=.env scripts/prova-gol-varianti.js [--stagioni=8]
//
// Ogni variante cambia **una cosa sola** rispetto a quella in uso, così si vede
// cosa la muove. Il metro è sempre lo stesso: quanto aggiunge rispetto a
// "prevedere sempre la frequenza media" (più alto è meglio), e quante volte
// l'over 2,5 si avvera prendendo le prime 9 partite di ogni giorno.
//
// ⚠️ Niente di questo entra in `lib/gol.js` finché non vince qui.

import { sql } from '../lib/db.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8);
const K = arg('k', 20);
const FINESTRA = 5;

const righe = await sql`
  select data, stagione, div, casa, trasferta, gol_casa, gol_trasferta,
         coalesce(tirip_casa,0) as tpc, coalesce(tirip_trasf,0) as tpt,
         coalesce(tiri_casa,0) as tc_, coalesce(tiri_trasf,0) as tt_,
         coalesce(angoli_casa,0) as ac, coalesce(angoli_trasf,0) as at_,
         b365_over25, avg_ap_over25, avg_ap_under25
  from partite
  where gol_casa is not null and tirip_casa is not null
  order by data, div, casa`;
const stagioni = [...new Set(righe.map(r => r.stagione))].sort().slice(-STAGIONI);

// ── Le varianti ─────────────────────────────────────────────────────────────
// Ognuna dice da quali numeri ricava "quanto attacca" e "quanto concede", e se
// distingue la media di casa da quella di fuori.
const VARIANTI = [
  { id: 'tirip',        campo: 'tp', casaFuori: false, nota: 'quella in uso: tiri in porta, media unica' },
  { id: 'tirip+casa',   campo: 'tp', casaFuori: true,  nota: 'tiri in porta, media separata casa/fuori' },
  { id: 'tiri',         campo: 'ti', casaFuori: true,  nota: 'tiri totali' },
  { id: 'angoli',       campo: 'an', casaFuori: true,  nota: 'angoli' },
  { id: 'gol',          campo: 'go', casaFuori: true,  nota: 'i gol, per confronto' },
  { id: 'tirip+scorsa', campo: 'tp', casaFuori: true, scorsa: true, nota: 'tiri in porta + la stagione scorsa come base' },
];

function poisson(k, l) { let f = 1; for (let i = 2; i <= k; i++) f *= i; return Math.exp(-l) * Math.pow(l, k) / f }
const pOver2 = l => 1 - (poisson(0, l) + poisson(1, l) + poisson(2, l));

function gira(V) {
  const storia = new Map();                 // "stagione|div|squadra" → viste
  const prec = new Map();                   // "div|squadra" → viste della stagione prima
  const med = new Map();                    // "stagione|div" → medie correnti
  const k = (s, d, sq) => `${s}|${d}|${sq}`;
  const prove = [];

  for (const r of righe) {
    const kd = `${r.stagione}|${r.div}`;
    const m = med.get(kd);

    if (stagioni.includes(r.stagione) && m && m.n >= 20) {
      // le due medie del campionato: quanto segna chi gioca in casa e chi fuori
      const mediaC = V.casaFuori ? m.golC / m.n : (m.golC + m.golF) / (2 * m.n);
      const mediaF = V.casaFuori ? m.golF / m.n : (m.golC + m.golF) / (2 * m.n);
      const baseC = V.casaFuori ? m.baseC / m.n : (m.baseC + m.baseF) / (2 * m.n);
      const baseF = V.casaFuori ? m.baseF / m.n : (m.baseC + m.baseF) / (2 * m.n);

      const ritmo = (sq, dove) => {
        let l = storia.get(k(r.stagione, r.div, sq)) || [];
        // ⚠️ la stagione scorsa serve a inizio stagione, quando di partite ce
        // ne sono tre: senza, la stretta porta tutto alla media e il modello
        // non dice niente per due mesi.
        if (V.scorsa && l.length < 10) l = [...(prec.get(`${r.div}|${sq}`) || []).slice(-(10 - l.length)), ...l];
        if (l.length < 3) return null;
        const nel = l.filter(x => x.dove === dove);
        const pesa = (campo) => {
          const ult = l.slice(-FINESTRA), ruo = nel.slice(-FINESTRA);
          const pF = 0.30 * Math.min(1, ult.length / FINESTRA);
          const pR = 0.25 * Math.min(1, ruo.length / FINESTRA);
          const med1 = (arr) => arr.reduce((a, x) => a + x[campo], 0) / arr.length;
          return (1 - pF - pR) * med1(l) + pF * med1(ult) + (ruo.length ? pR * med1(ruo) : 0);
        };
        return { fatti: pesa(`${V.campo}f`), subiti: pesa(`${V.campo}s`), n: l.length };
      };

      const c = ritmo(r.casa, 'casa'), t = ritmo(r.trasferta, 'fuori');
      if (c && t) {
        const str = (x, n) => 1 + (x - 1) * n / (n + K);
        const attC = str(c.fatti / baseC, c.n), difC = str(c.subiti / baseF, c.n);
        const attT = str(t.fatti / baseF, t.n), difT = str(t.subiti / baseC, t.n);
        const lam = attC * difT * mediaC + attT * difC * mediaF;
        const pm = (r.avg_ap_over25 && r.avg_ap_under25)
          ? (1 / Number(r.avg_ap_over25)) / (1 / Number(r.avg_ap_over25) + 1 / Number(r.avg_ap_under25)) : null;
        prove.push({ data: String(r.data).slice(0, 10), p: pOver2(lam), over: r.gol_casa + r.gol_trasferta > 2,
                     q: r.b365_over25 ? Number(r.b365_over25) : null, pm });
      }
    }

    // la partita entra nella storia
    const v = (gf, gs, tpf, tps, tif, tis, anf, ans, dove) =>
      ({ gof: gf, gos: gs, tpf, tps, tif, tis, anf, ans, dove });
    const add = (sq, x) => { const key = k(r.stagione, r.div, sq);
      if (!storia.has(key)) storia.set(key, []); storia.get(key).push(x) };
    add(r.casa, v(r.gol_casa, r.gol_trasferta, +r.tpc, +r.tpt, +r.tc_, +r.tt_, +r.ac, +r.at_, 'casa'));
    add(r.trasferta, v(r.gol_trasferta, r.gol_casa, +r.tpt, +r.tpc, +r.tt_, +r.tc_, +r.at_, +r.ac, 'fuori'));

    if (!med.has(kd)) med.set(kd, { n: 0, golC: 0, golF: 0, baseC: 0, baseF: 0 });
    const mm = med.get(kd);
    mm.n++; mm.golC += r.gol_casa; mm.golF += r.gol_trasferta;
    const bc = V.campo === 'tp' ? +r.tpc : V.campo === 'ti' ? +r.tc_ : V.campo === 'an' ? +r.ac : r.gol_casa;
    const bf = V.campo === 'tp' ? +r.tpt : V.campo === 'ti' ? +r.tt_ : V.campo === 'an' ? +r.at_ : r.gol_trasferta;
    mm.baseC += bc; mm.baseF += bf;
  }
  return prove;
}

// il campo giusto per ogni variante: 'tpf'/'tps' = tiri in porta fatti/subiti…
const rinomina = { tp: ['tpf', 'tps'], ti: ['tif', 'tis'], an: ['anf', 'ans'], go: ['gof', 'gos'] };

console.log(`stagioni ${stagioni.join(', ')} · stretta K = ${K}\n`);
console.log(`${'variante'.padEnd(16)} ${'partite'.padStart(7)}  aggiunge   over2,5 prime 9   in soldi`);
for (const V of VARIANTI) {
  Object.assign(V, {});                                  // i campi li legge da V.campo
  const prove = gira(V);
  if (prove.length < 1000) { console.log(`${V.id.padEnd(16)} troppo poche (${prove.length})`); continue }
  const base = prove.filter(p => p.over).length / prove.length;
  const brier = f => prove.reduce((a, p) => a + Math.pow(f(p) - (p.over ? 1 : 0), 2), 0) / prove.length;
  const aggiunge = brier(() => base) - brier(p => p.p);

  const perG = new Map();
  for (const p of prove) { if (!perG.has(p.data)) perG.set(p.data, []); perG.get(p.data).push(p) }
  let top = [];
  for (const l of perG.values()) top = top.concat([...l].sort((a, b) => b.p - a.p).slice(0, 9));
  const ok = top.filter(p => p.over).length / top.length;
  const conQ = top.filter(p => p.q);
  const resa = conQ.length ? conQ.reduce((a, p) => a + (p.over ? p.q : 0), 0) / conQ.length : null;

  console.log(`${V.id.padEnd(16)} ${String(prove.length).padStart(7)}  ${(aggiunge >= 0 ? '+' : '')}${aggiunge.toFixed(4)}` +
    `   ${(ok * 100).toFixed(1)}% (base ${(base * 100).toFixed(1)})` +
    `   ${resa ? (resa * 100).toFixed(1) + '%' : '—'}    ${V.nota}`);
}
// ── Il metro: quanto sa il mercato sulle stesse partite ─────────────────────
// ⚠️ Serve a sapere **se c'è ancora spazio**. Se il mercato aggiunge il doppio
// di noi, migliorare ha senso; se aggiunge quanto noi, il modello ha già preso
// quello che c'era da prendere nei dati che abbiamo.
{
  const prove = gira(VARIANTI[0]).filter(p => p.pm != null);
  const base = prove.filter(p => p.over).length / prove.length;
  const brier = f => prove.reduce((a, p) => a + Math.pow(f(p) - (p.over ? 1 : 0), 2), 0) / prove.length;
  const nostro = brier(() => base) - brier(p => p.p);
  const mercato = brier(() => base) - brier(p => p.pm);
  const perG = new Map();
  for (const p of prove) { if (!perG.has(p.data)) perG.set(p.data, []); perG.get(p.data).push(p) }
  let topM = [];
  for (const l of perG.values()) topM = topM.concat([...l].sort((a, b) => b.pm - a.pm).slice(0, 9));
  const conQ = topM.filter(p => p.q);
  console.log(`\n${'IL MERCATO'.padEnd(16)} ${String(prove.length).padStart(7)}  +${mercato.toFixed(4)}` +
    `   ${(topM.filter(p => p.over).length / topM.length * 100).toFixed(1)}% (base ${(base * 100).toFixed(1)})` +
    `   ${(conQ.reduce((a, p) => a + (p.over ? p.q : 0), 0) / conQ.length * 100).toFixed(1)}%    le quote over/under del consenso`);
  console.log(`${'il nostro'.padEnd(16)} ${String(prove.length).padStart(7)}  +${nostro.toFixed(4)}` +
    `   ← sulle stesse partite, per confronto`);
  console.log(`\nil modello cattura il ${(nostro / mercato * 100).toFixed(0)}% di quello che sa il mercato.`);
}

await sql.end();
