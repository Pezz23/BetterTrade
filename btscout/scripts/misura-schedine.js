// BACKTEST — le schedine del weekend a quota obiettivo, misurate sull'archivio.
//
//   node --env-file=.env scripts/misura-schedine.js [--quota=5] [--gambe=6] [--fascia=1.30,1.45]
//
// L'idea di Mattia: ogni weekend si prendono le migliori partite e si compone
// una schedina alla quota voluta. Qui la si costruisce come l'avrebbe costruita
// lui, weekend per weekend, **con l'informazione di allora** (favorito e
// attendibilità dal consenso di apertura, quota Bet365 di apertura), e si
// guarda com'è andata davvero.
//
// ⚠️ Nessuna scelta a posteriori: le gambe si prendono in ordine di
// attendibilità decrescente, sempre, e si fermano appena la quota raggiunge
// l'obiettivo. Ordine deterministico anche a pari merito (data, poi squadra):
// senza, due giri dello stesso script darebbero schedine diverse.

import { sql } from '../lib/db.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const QUOTA = Number(arg('quota', 5));
const GAMBE_MAX = Number(arg('gambe', 6));
const [FLO, FHI] = String(arg('fascia', '1.30,1.45')).split(',').map(Number);

const righe = await sql`
  with base as (
    select data, stagione, div, casa, trasferta, esito,
           case when 1/avg_ap_1 >= 1/avg_ap_2 then 'H' else 'A' end as segno,
           b365_1, b365_2, avg_ap_1, avg_ap_x, avg_ap_2
    from partite
    where avg_ap_1 is not null and avg_ap_x is not null and avg_ap_2 is not null
      and b365_1 is not null and b365_2 is not null and esito is not null
  )
  select data, stagione, casa, trasferta, segno, esito,
         case when segno = 'H' then b365_1 else b365_2 end as quota,
         case when segno = 'H' then (1/avg_ap_1) else (1/avg_ap_2) end
           / (1/avg_ap_1 + 1/avg_ap_x + 1/avg_ap_2) as att
  from base
  order by data, casa`;

// Il weekend di una data: il lunedì che lo chiude, così sabato-domenica-lunedì
// stanno insieme come nelle spin.
function settimana(d) {
  const x = new Date(d); x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + ((8 - x.getDay()) % 7));
  return x.toISOString().slice(0, 10);
}

const eleggibili = righe.filter(r => Number(r.quota) >= FLO && Number(r.quota) < FHI);
const perSettimana = new Map();
for (const r of eleggibili) {
  const k = settimana(r.data);
  if (!perSettimana.has(k)) perSettimana.set(k, []);
  perSettimana.get(k).push(r);
}

const schedine = [];
for (const [sett, lista] of [...perSettimana.entries()].sort()) {
  const ordinate = [...lista].sort((a, b) => Number(b.att) - Number(a.att)
    || String(a.data).localeCompare(String(b.data)) || a.casa.localeCompare(b.casa));
  const gambe = [];
  let q = 1;
  for (const r of ordinate) {
    if (q >= QUOTA || gambe.length >= GAMBE_MAX) break;
    gambe.push(r); q *= Number(r.quota);
  }
  if (q < QUOTA) continue;                      // settimana che non arriva all'obiettivo
  const vinta = gambe.every(g => g.esito === g.segno);
  schedine.push({ sett, stagione: gambe[0].stagione, q, gambe: gambe.length, vinta, lista: gambe,
    pAttesa: gambe.reduce((a, g) => a * Number(g.att), 1) });
}

const n = schedine.length;
const vinte = schedine.filter(s => s.vinta).length;
const ritorno = schedine.reduce((a, s) => a + (s.vinta ? s.q : 0), 0) / n;
const qMedia = schedine.reduce((a, s) => a + s.q, 0) / n;
const gMedia = schedine.reduce((a, s) => a + s.gambe, 0) / n;
const pMedia = schedine.reduce((a, s) => a + s.pAttesa, 0) / n;
const varianza = schedine.reduce((a, s) => a + Math.pow((s.vinta ? s.q : 0) - ritorno, 2), 0) / n;
const es = Math.sqrt(varianza / n);

console.log(`SCHEDINE a quota ≥ ${QUOTA}, gambe nella fascia ${FLO}-${FHI}, max ${GAMBE_MAX}\n`);
console.log(`weekend utili            ${n}  (su ${perSettimana.size} con partite in fascia)`);
console.log(`gambe per schedina       ${gMedia.toFixed(1)} · quota media ${qMedia.toFixed(2)}`);
console.log(`vinte                    ${vinte} su ${n} = ${(vinte / n * 100).toFixed(1)}%   (attese ${(pMedia * 100).toFixed(1)}%)`);
console.log(`resa realizzata          ${(ritorno * 100).toFixed(1)}%  [${((ritorno - 1.96 * es) * 100).toFixed(1)} … ${((ritorno + 1.96 * es) * 100).toFixed(1)}]`);
console.log(`\n⚠️ incertezza ±${(1.96 * es * 100).toFixed(1)} punti: con ${n} schedine è il minimo visibile.`);
console.log(`   per dimostrare un vantaggio del 2% servirebbero ${Math.round(Math.pow(1.96 * Math.sqrt(varianza) / 0.02, 2)).toLocaleString('it-IT')} schedine` +
  ` (${Math.round(Math.pow(1.96 * Math.sqrt(varianza) / 0.02, 2) / 38)} anni a una per weekend).`);

// ── La stima che conta: dalle GAMBE, non dalle schedine ──────────────────────
// ⚠️ Con 242 schedine l'incertezza è ±27 punti: il numero sopra non distingue
// nulla. Ma le gambe sono ~1.500 osservazioni, e la resa di una combinata è il
// **prodotto** delle rese delle gambe: stimarla da lì è dieci volte più
// preciso. Chi guarda solo la resa delle schedine finisce per scegliere la
// fascia che "ha fatto 100%" — cioè il rumore (misurato il 10/10/2026: quattro
// fasce davano 60%, 78%, 88% e 101%, con gli intervalli tutti sovrapposti).
const tutteGambe = schedine.flatMap(s => s.lista);
const nG = tutteGambe.length;
const resaGamba = tutteGambe.reduce((a, g) => a + (g.esito === g.segno ? Number(g.quota) : 0), 0) / nG;
const varG = tutteGambe.reduce((a, g) => a + Math.pow((g.esito === g.segno ? Number(g.quota) : 0) - resaGamba, 2), 0) / nG;
const esG = Math.sqrt(varG / nG);
console.log(`\n── stima dalle gambe (${nG} osservazioni) ──`);
console.log(`resa per gamba           ${(resaGamba * 100).toFixed(1)}%  [${((resaGamba - 1.96 * esG) * 100).toFixed(1)} … ${((resaGamba + 1.96 * esG) * 100).toFixed(1)}]`);
console.log(`→ resa attesa su ${gMedia.toFixed(1)} gambe   ${(Math.pow(resaGamba, gMedia) * 100).toFixed(1)}%` +
  `  [${(Math.pow(resaGamba - 1.96 * esG, gMedia) * 100).toFixed(1)} … ${(Math.pow(resaGamba + 1.96 * esG, gMedia) * 100).toFixed(1)}]`);
console.log(`   (è la stima da usare: la resa delle schedine qui sopra è troppo rumorosa)`);

console.log('\n── per stagione ──');
for (const st of [...new Set(schedine.map(s => s.stagione))].sort()) {
  const l = schedine.filter(s => s.stagione === st);
  const r = l.reduce((a, s) => a + (s.vinta ? s.q : 0), 0) / l.length;
  console.log(`  ${st}  ${String(l.length).padStart(3)} schedine · vinte ${String(l.filter(s => s.vinta).length).padStart(2)} · resa ${(r * 100).toFixed(0).padStart(4)}%`);
}

// La serie peggiore: è il numero che conta per chi gioca, non la media.
let secco = 0, peggiore = 0;
for (const s of schedine) { if (s.vinta) secco = 0; else { secco++; peggiore = Math.max(peggiore, secco) } }
console.log(`\nserie più lunga senza vincere: ${peggiore} weekend di fila`);

await sql.end();
