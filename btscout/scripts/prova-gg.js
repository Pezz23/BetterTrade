// GOAL / NO GOAL: il consiglio, e quanto spesso è giusto.
//
//   node --env-file=.env scripts/prova-gg.js [--stagioni=8] [--k=20]
//
// ⚠️ Qui NON si misurano soldi, per scelta di Mattia (12/10/2026): le quote
// GG/NG non esistono in archivio e l'indicatore serve a **dare visione** —
// "questa partita sarà da gol oppure no" — non a scommetterci.
//
// Quindi i metri sono tre, e nessuno è il ROI:
//   1. AGGIUNGE   — Brier contro "prevedi sempre la frequenza media". Se è ~0,
//                   il modello non sta dicendo niente sulla singola partita.
//   2. CONSIGLIO  — quante volte ha ragione dicendo GOL / NO GOL, contro chi
//                   dice sempre la risposta più frequente. ⚠️ È il metro che
//                   conta per Mattia, e il confronto giusto NON è il 50%:
//                   è la maggioranza, perché il GG arriva ~54% delle volte.
//   3. QUANDO È SICURO — le 9 partite più nette di ogni giorno. Un indicatore
//                   di visione può tacere sulle partite in bilico: serve che
//                   sia affidabile quando parla, non su tutte.
//
// Tutto camminando nel tempo: ogni partita è prevista con le sole precedenti.

import { sql } from '../lib/db.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8);
const K = arg('k', 20);
const FINESTRA = 5;

const righe = await sql`
  select data, stagione, div, casa, trasferta, gol_casa, gol_trasferta,
         coalesce(tirip_casa,0) as tpc, coalesce(tirip_trasf,0) as tpt,
         avg_ap_over25, avg_ap_under25
  from partite
  where gol_casa is not null and tirip_casa is not null
  order by data, div, casa`;
if (!righe.length) { console.error('✗ nessuna partita: controlla la connessione'); process.exit(1) }
const stagioni = [...new Set(righe.map(r => r.stagione))].sort().slice(-STAGIONI);

const str = (x, n) => 1 + (x - 1) * n / (n + K);
const taglia = (p) => Math.min(0.97, Math.max(0.03, p));

// ── I MODELLI ───────────────────────────────────────────────────────────────
// 'poisson'  = quello in uso: dai gol attesi, GG = (1-e^-λc)(1-e^-λf)
// 'segna'    = diretto sull'evento "ha segnato", senza passare dai gol attesi
// 'misto'    = la media dei due
// ...+'corr' = con la correzione di correlazione misurata sulle stagioni prima
const MODELLI = [
  { id: 'poisson (in uso)', via: 'poisson', nota: 'dai gol attesi, due Poisson indipendenti' },
  { id: 'segna',            via: 'segna',   nota: 'diretto su "ha segnato sì/no"' },
  { id: 'misto',            via: 'misto',   nota: 'la media dei due' },
  { id: 'poisson + corr',   via: 'poisson', corr: true, nota: 'Poisson, corretto per la correlazione' },
  { id: 'segna + corr',     via: 'segna',   corr: true, nota: 'diretto, corretto per la correlazione' },
  { id: 'misto + corr',     via: 'misto',   corr: true, nota: 'media dei due, corretta' },
  // la stretta: 1 = nessuna, 0 = "sempre la media del campionato"
  { id: 'poisson str 0,8',  via: 'poisson', corr: true, stretta: 0.8, nota: 'Poisson corretto, stretta 0,8' },
  { id: 'poisson str 0,6',  via: 'poisson', corr: true, stretta: 0.6, nota: 'Poisson corretto, stretta 0,6' },
  { id: 'poisson str 0,4',  via: 'poisson', corr: true, stretta: 0.4, nota: 'Poisson corretto, stretta 0,4' },
  { id: 'misto str 0,6',    via: 'misto',   corr: true, stretta: 0.6, nota: 'media dei due, stretta 0,6' },
  { id: 'STR 0,55 c.fisso',  via: 'poisson', stretta: 0.55, centroFisso: 0.532, nota: 'la proposta: stretta 0,55 su centro 53,2%' },
  { id: 'STR 0,55 c.mobile', via: 'poisson', stretta: 0.55, nota: 'la stessa, ma centro = il campionato corrente' },
];

function gira(M) {
  const storia = new Map();                 // "stagione|div|squadra" → partite viste
  const med = new Map();                    // "stagione|div" → somme correnti
  const k = (s, d, sq) => `${s}|${d}|${sq}`;
  const prove = [];
  // ⚠️ La correzione di correlazione si impara SOLO dalle stagioni già chiuse:
  // misurarla sulle stesse partite che poi si prevedono è barare.
  const perStagione = new Map();            // stagione → { att, osservato }

  for (const r of righe) {
    const kd = `${r.stagione}|${r.div}`;
    const m = med.get(kd);
    const lC = storia.get(k(r.stagione, r.div, r.casa)) || [];
    const lT = storia.get(k(r.stagione, r.div, r.trasferta)) || [];

    if (m && m.n >= 20 && lC.length >= 3 && lT.length >= 3) {
      const base = (m.tpC + m.tpF) / (2 * m.n);
      const media = (m.golC + m.golF) / (2 * m.n);
      const pSegnaC = m.segnaC / m.n, pSegnaF = m.segnaF / m.n;   // quanto spesso segna chi gioca in casa / fuori
      const ggMedio = m.gg / m.n;                                 // quanto spesso finisce GG in questo campionato

      const pesa = (l, dove, campo) => {
        const nel = l.filter(x => x.dove === dove);
        const ult = l.slice(-FINESTRA), ruo = nel.slice(-FINESTRA);
        const pF = 0.30 * Math.min(1, ult.length / FINESTRA);
        const pR = 0.25 * Math.min(1, ruo.length / FINESTRA);
        const md = a => a.reduce((s, x) => s + x[campo], 0) / a.length;
        return (1 - pF - pR) * md(l) + pF * md(ult) + (ruo.length ? pR * md(ruo) : 0);
      };

      // --- via Poisson: gol attesi dai tiri in porta, come lib/gol.js --------
      const att = (l, d) => str(pesa(l, d, 'tpf') / base, l.length);
      const dif = (l, d) => str(pesa(l, d, 'tps') / base, l.length);
      const lamC = att(lC, 'casa') * dif(lT, 'fuori') * media;
      const lamF = att(lT, 'fuori') * dif(lC, 'casa') * media;
      const ggPoisson = (1 - Math.exp(-lamC)) * (1 - Math.exp(-lamF));

      // --- via "ha segnato": l'evento che ci interessa, senza i conteggi -----
      // ⚠️ Perché può essere meglio: il GG non chiede quanti gol, chiede se
      // almeno uno arriva. Poisson ci arriva passando per la media dei gol, e
      // una squadra che segna 1 a settimana non è una che ne segna 3 ogni tre.
      const rS = (l, d) => str(pesa(l, d, 'seg') / (d === 'casa' ? pSegnaC : pSegnaF), l.length);
      const rC = (l, d) => str(pesa(l, d, 'conc') / (d === 'casa' ? pSegnaF : pSegnaC), l.length);
      const pC = taglia(pSegnaC * rS(lC, 'casa') * rC(lT, 'fuori'));
      const pF = taglia(pSegnaF * rS(lT, 'fuori') * rC(lC, 'casa'));
      const ggSegna = pC * pF;

      let gg = M.via === 'poisson' ? ggPoisson : M.via === 'segna' ? ggSegna : (ggPoisson + ggSegna) / 2;

      // --- la correzione di correlazione ------------------------------------
      // ⚠️ Poisson assume le due squadre indipendenti; nella realtà non lo
      // sono (una partita aperta produce gol da entrambe le parti). Il
      // prodotto di due probabilità sbaglia quindi in modo SISTEMATICO, e un
      // errore sistematico si misura: quanto il GG osservato supera quello
      // previsto, sulle stagioni già chiuse.
      if (M.corr) {
        const passate = [...perStagione.entries()].filter(([s]) => s < r.stagione);
        if (passate.length) {
          const prev = passate.reduce((a, [, v]) => a + v.att, 0);
          const oss = passate.reduce((a, [, v]) => a + v.osservato, 0);
          const n = passate.reduce((a, [, v]) => a + v.n, 0);
          if (n > 500) gg = taglia(gg * (oss / n) / (prev / n));
        }
      }

      // ⚠️ LA STRETTA VERSO LA MEDIA. Misurato: il modello dichiarava 68% dove
      // arriva il 63% e 37% dove arriva il 45% — l'ordine giusto, l'ampiezza
      // più larga del vero. È lo stesso difetto dei gol attesi (K_STRETTA), e
      // nasce dallo stesso motivo: un prodotto di rapporti stimati su 5-10
      // partite moltiplica i rumori. La cura è tirare la probabilità verso la
      // frequenza del campionato invece di correggere a sentimento.
      // Il centro può essere la frequenza corrente del campionato o la costante
      // misurata sull'archivio: la seconda è quella che si può portare nell'app,
      // dove non si tiene il conto dei GG di ogni campionato.
      if (M.stretta != null) { const centro = M.centroFisso ?? ggMedio; gg = centro + (gg - centro) * M.stretta }

      if (stagioni.includes(r.stagione)) prove.push({
        data: String(r.data).slice(0, 10), stagione: r.stagione, gg,
        // il grezzo e l'indizio di mercato servono alla ritaratura più sotto
        grezzo: M.via === 'segna' ? ggSegna : M.via === 'misto' ? (ggPoisson + ggSegna) / 2 : ggPoisson,
        pm: (r.avg_ap_over25 && r.avg_ap_under25)
          ? (1 / Number(r.avg_ap_over25)) / (1 / Number(r.avg_ap_over25) + 1 / Number(r.avg_ap_under25)) : null,
        vero: r.gol_casa > 0 && r.gol_trasferta > 0,
      });
      // il consuntivo della stagione, per la correzione delle successive
      if (!perStagione.has(r.stagione)) perStagione.set(r.stagione, { att: 0, osservato: 0, n: 0 });
      const ps = perStagione.get(r.stagione);
      ps.att += M.via === 'segna' ? ggSegna : M.via === 'misto' ? (ggPoisson + ggSegna) / 2 : ggPoisson;
      ps.osservato += (r.gol_casa > 0 && r.gol_trasferta > 0) ? 1 : 0;
      ps.n++;
    }

    // la partita entra nella storia
    const v = (gf, gs, tpf, tps, dove) =>
      ({ gof: gf, gos: gs, tpf, tps, seg: gf > 0 ? 1 : 0, conc: gs > 0 ? 1 : 0, dove });
    const add = (sq, x) => { const key = k(r.stagione, r.div, sq);
      if (!storia.has(key)) storia.set(key, []); storia.get(key).push(x) };
    add(r.casa,      v(r.gol_casa, r.gol_trasferta, +r.tpc, +r.tpt, 'casa'));
    add(r.trasferta, v(r.gol_trasferta, r.gol_casa, +r.tpt, +r.tpc, 'fuori'));

    if (!med.has(kd)) med.set(kd, { n: 0, golC: 0, golF: 0, tpC: 0, tpF: 0, segnaC: 0, segnaF: 0, gg: 0 });
    const mm = med.get(kd);
    mm.n++; mm.golC += r.gol_casa; mm.golF += r.gol_trasferta;
    mm.tpC += +r.tpc; mm.tpF += +r.tpt;
    mm.segnaC += r.gol_casa > 0 ? 1 : 0; mm.segnaF += r.gol_trasferta > 0 ? 1 : 0;
    mm.gg += (r.gol_casa > 0 && r.gol_trasferta > 0) ? 1 : 0;
  }
  return prove;
}

// ── I metri ─────────────────────────────────────────────────────────────────
function misura(prove) {
  const base = prove.filter(p => p.vero).length / prove.length;
  const brier = f => prove.reduce((a, p) => a + Math.pow(f(p) - (p.vero ? 1 : 0), 2), 0) / prove.length;
  const aggiunge = brier(() => base) - brier(p => p.gg);
  // il consiglio: GOL se sopra 50%, altrimenti NO GOL
  const giusti = prove.filter(p => (p.gg >= 0.5) === p.vero).length / prove.length;
  const maggioranza = Math.max(base, 1 - base);
  // le 9 più nette di ogni giorno: netto = distanza dal 50%
  const perG = new Map();
  for (const p of prove) { if (!perG.has(p.data)) perG.set(p.data, []); perG.get(p.data).push(p) }
  let top = [];
  for (const l of perG.values()) top = top.concat([...l].sort((a, b) => Math.abs(b.gg - .5) - Math.abs(a.gg - .5)).slice(0, 9));
  const giustiTop = top.filter(p => (p.gg >= 0.5) === p.vero).length / top.length;
  return { n: prove.length, base, aggiunge, giusti, maggioranza, giustiTop, nTop: top.length };
}

console.log(`stagioni ${stagioni.join(', ')} · stretta K = ${K}\n`);
console.log(`${'modello'.padEnd(20)} ${'partite'.padStart(7)}  aggiunge   consiglio giusto   quando è sicuro`);
const risultati = [];
for (const M of MODELLI) {
  const prove = gira(M);
  const x = misura(prove);
  risultati.push([M, prove, x]);
  console.log(`${M.id.padEnd(20)} ${String(x.n).padStart(7)}  ${x.aggiunge >= 0 ? '+' : ''}${x.aggiunge.toFixed(4)}` +
    `   ${(x.giusti * 100).toFixed(1)}% (sempre-GOL ${(x.maggioranza * 100).toFixed(1)})` +
    `   ${(x.giustiTop * 100).toFixed(1)}%   ${M.nota}`);
}

// ── La calibrazione del migliore: quando dice 65%, succede il 65%? ──────────
const migliore = risultati.reduce((a, b) => b[2].aggiunge > a[2].aggiunge ? b : a);
console.log(`\n── calibrazione di "${migliore[0].id}" ──`);
const fasce = [[0, .40], [.40, .48], [.48, .54], [.54, .60], [.60, .66], [.66, 1]];
for (const [a, b] of fasce) {
  const l = migliore[1].filter(p => p.gg >= a && p.gg < b);
  if (!l.length) continue;
  const prev = l.reduce((s, p) => s + p.gg, 0) / l.length;
  const oss = l.filter(p => p.vero).length / l.length;
  const barra = '█'.repeat(Math.round(oss * 30));
  console.log(`  ${(a * 100).toFixed(0)}-${(b * 100).toFixed(0)}%  previsto ${(prev * 100).toFixed(1)}%  arrivato ${(oss * 100).toFixed(1)}%  (${String(l.length).padStart(6)})  ${barra}`);
}

// ── Il consiglio, per quanto è netto ────────────────────────────────────────
// ⚠️ Serve a scegliere la soglia: se il consiglio sotto il 55% di fiducia è
// un'ipotesi, l'indicatore deve dirlo invece di dare un verdetto.
console.log(`\n── quanto è giusto il consiglio, per fiducia ──`);
for (const [lo, hi] of [[.5, .55], [.55, .60], [.60, .65], [.65, 1]]) {
  const l = migliore[1].filter(p => Math.max(p.gg, 1 - p.gg) >= lo && Math.max(p.gg, 1 - p.gg) < hi);
  if (!l.length) continue;
  const g = l.filter(p => (p.gg >= .5) === p.vero).length / l.length;
  const quanteGol = l.filter(p => p.gg >= .5).length;
  console.log(`  fiducia ${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)}%:  giusto ${(g * 100).toFixed(1)}%  su ${String(l.length).padStart(6)} partite  (dice GOL ${(quanteGol / l.length * 100).toFixed(0)}% delle volte)`);
}

// ── LA RITARATURA SU TABELLA, e il tetto di quello che si può sapere ────────
// ⚠️ La stretta lineare non ha raddrizzato la coda: dove dichiara 68% arriva
// il 62%. Allora non si inventa una formula — si **impara la tabella**: a ogni
// fascia del numero grezzo si associa la frequenza di GG vista nelle stagioni
// GIÀ CHIUSE, e si mostra quella. Così il numero a schermo non può mentire,
// qualunque cosa faccia il modello sotto.
// ⚠️ E serve un tetto: sul GG non abbiamo quote, ma la quota OVER 2,5 è un
// indizio del mercato sullo stesso fenomeno. Ritarata nello stesso modo, dice
// quanto si potrebbe sapere con l'informazione di un book. Se nemmeno quella
// va oltre, il GG non è prevedibile — non è il nostro modello che è scarso.
{
  const prove = gira(MODELLI[0]);
  const PASSI = 12;
  const tabella = (campo) => {
    // conteggi per stagione, così ogni stagione usa solo le precedenti
    const perSt = new Map();
    for (const p of prove) {
      if (p[campo] == null) continue;
      if (!perSt.has(p.stagione)) perSt.set(p.stagione, Array.from({ length: PASSI }, () => ({ n: 0, s: 0 })));
      const b = Math.min(PASSI - 1, Math.max(0, Math.floor(p[campo] * PASSI)));
      const c = perSt.get(p.stagione)[b]; c.n++; c.s += p.vero ? 1 : 0;
    }
    const out = [];
    for (const p of prove) {
      if (p[campo] == null) { out.push(null); continue }
      const b = Math.min(PASSI - 1, Math.max(0, Math.floor(p[campo] * PASSI)));
      let n = 0, s = 0, nTot = 0, sTot = 0;
      for (const [st, bins] of perSt) if (st < p.stagione) { n += bins[b].n; s += bins[b].s; for (const x of bins) { nTot += x.n; sTot += x.s } }
      // sotto 200 partite nella fascia la frequenza è rumore: si usa la media
      out.push(nTot < 500 ? null : (n < 200 ? sTot / nTot : s / n));
    }
    return out;
  };
  const nostra = tabella('grezzo'), mercato = tabella('pm');
  console.log(`\n── ritarati sulla tabella delle stagioni passate ──`);
  console.log(`${'numero'.padEnd(26)} ${'partite'.padStart(7)}  aggiunge   consiglio giusto   quando è sicuro`);
  for (const [nome, col] of [['il nostro modello', nostra], ['il mercato (indizio over 2,5)', mercato]]) {
    const l = prove.map((p, i) => ({ ...p, gg: col[i] })).filter(p => p.gg != null);
    if (l.length < 2000) { console.log(`${nome.padEnd(26)} troppo poche (${l.length})`); continue }
    const x = misura(l);
    console.log(`${nome.padEnd(26)} ${String(x.n).padStart(7)}  ${x.aggiunge >= 0 ? '+' : ''}${x.aggiunge.toFixed(4)}` +
      `   ${(x.giusti * 100).toFixed(1)}% (sempre-GOL ${(x.maggioranza * 100).toFixed(1)})   ${(x.giustiTop * 100).toFixed(1)}%`);
    const f = [[0, .45], [.45, .5], [.5, .55], [.55, .6], [.6, 1]];
    for (const [a, b] of f) {
      const q = l.filter(p => p.gg >= a && p.gg < b);
      if (q.length < 200) continue;
      console.log(`     ${(a * 100).toFixed(0)}-${(b * 100).toFixed(0)}%  previsto ${(q.reduce((s2, p) => s2 + p.gg, 0) / q.length * 100).toFixed(1)}%  arrivato ${(q.filter(p => p.vero).length / q.length * 100).toFixed(1)}%  (${q.length})`);
    }
  }
}

// ── LA TABELLA DA PORTARE NELL'APP ──────────────────────────────────────────
// ⚠️ Come le ANCORE di VPM: misurata una volta su tutto l'archivio, scritta
// nel codice con la data, e rimisurata solo per aggiungere una stagione.
// Qui si guarda anche se una formula semplice (una stretta verso la media)
// basterebbe al posto della tabella: una costante si spiega, una tabella no.
{
  const prove = gira(MODELLI[0]);
  const base = prove.filter(p => p.vero).length / prove.length;
  console.log(`\n── la tabella su tutto l'archivio (base GG ${(base * 100).toFixed(1)}%) ──`);
  const bordi = [0, .35, .42, .46, .50, .54, .58, .62, .70, 1];
  const righeT = [];
  for (let i = 0; i < bordi.length - 1; i++) {
    const l = prove.filter(p => p.grezzo >= bordi[i] && p.grezzo < bordi[i + 1]);
    if (!l.length) continue;
    const prev = l.reduce((s2, p) => s2 + p.grezzo, 0) / l.length;
    const oss = l.filter(p => p.vero).length / l.length;
    const es = Math.sqrt(oss * (1 - oss) / l.length);
    righeT.push([prev, oss]);
    console.log(`  grezzo ${(bordi[i] * 100).toFixed(0)}-${(bordi[i + 1] * 100).toFixed(0)}%  (medio ${(prev * 100).toFixed(1)}%)  →  GG vero ${(oss * 100).toFixed(1)}% ±${(1.96 * es * 100).toFixed(1)}  su ${l.length}`);
  }
  // la stretta che meglio approssima la tabella: una costante invece di 9 numeri
  let best = null;
  for (let a = 0.2; a <= 1.001; a += 0.05) {
    const err = righeT.reduce((s2, [prev, oss]) => s2 + Math.pow(base + (prev - base) * a - oss, 2), 0) / righeT.length;
    if (!best || err < best.err) best = { a, err };
  }
  console.log(`\n  la stretta che approssima meglio la tabella: ${best.a.toFixed(2)} (errore medio ${(Math.sqrt(best.err) * 100).toFixed(2)} punti)`);
  for (const [prev, oss] of righeT)
    console.log(`     grezzo ${(prev * 100).toFixed(1)}% → stretta dice ${((base + (prev - base) * best.a) * 100).toFixed(1)}%, il vero è ${(oss * 100).toFixed(1)}%`);
}

await sql.end();
