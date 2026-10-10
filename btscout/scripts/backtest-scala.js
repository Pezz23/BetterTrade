// BACKTEST della "scala a recupero" con VPM come filtro, su tutte le stagioni.
//
//   node --env-file=.env scripts/backtest-scala.js [--bankroll=200] [--base=20] [--passi=6]
//
// Le regole, come le ha date Mattia il 10/10/2026:
//   · bankroll 200 €, base di ogni scala 20 € fissi
//   · si parte dalla 5ª giornata di campionato (prima VPM non ha dati)
//   · UNA giocata per turno, al massimo DUE turni per weekend:
//     venerdì-sabato e domenica-lunedì (il secondo passo vuole il risultato del primo)
//   · tre versioni: SOFT una partita 1,35-1,45 · MEDIUM fino a 2 a ≥1,70 ·
//     HARD fino a 3 a ≥2,00
//   · accantonamento in % dell'utile, arrotondato per eccesso: 65/35/35/30/30/25
//   · la scala finisce quando un passo perde o quando arriva in cima: si incassa
//     tutto e si riparte con 20
//
// ⚠️ VPM è ricalcolato **per ogni partita con le sole partite precedenti**:
// niente dati che allora non c'erano. Il filtro è "VPM conferma il segno del
// mercato ed è netto".

import { sql } from '../lib/db.js';
import { parametri, forza, vpm, PARTITE_FINESTRA, MIN_PARTITE, VPM_NETTO } from '../../app/src/lib/vpm.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const BANKROLL = arg('bankroll', 200);
const BASE = arg('base', 20);
// La base può essere una percentuale del bankroll: così una scala morta costa
// sempre la stessa frazione e il conto non si azzera, si rimpicciolisce.
const BASE_PCT = arg('basepct', 0);
const baseOra = bank => (BASE_PCT ? Math.max(1, Math.floor(bank * BASE_PCT / 100)) : BASE);
const PASSI = arg('passi', 6);
// Come si scegli la partita del turno: la più probabile (att) o la meglio
// prezzata (resa = quota × probabilità). Non è un dettaglio: le più probabili
// stanno sulle quote più corte, che hanno la resa peggiore.
const SCELTA = (process.argv.find(x => x.startsWith('--scelta=')) || '--scelta=att').split('=')[1];
const SCALETTA = [0.65, 0.35, 0.35, 0.30, 0.30, 0.25, 0.25, 0.25];
const DA_GIORNATA = 5;

// --banda=1.30,1.60 cambia la fascia di quota: per la SOFT è la quota della
// giocata, per le altre due è la fascia da cui si pescano le gambe.
const BANDA = (process.argv.find(x => x.startsWith('--banda=')) || '').split('=')[1];
const b = BANDA ? BANDA.split(',').map(Number) : null;
const VERSIONI = [
  { nome: 'SOFT  ', gambe: 1, obiettivo: 0,    banda: b || [1.35, 1.45] },
  { nome: 'MEDIUM', gambe: 2, obiettivo: 1.70, banda: b || [1.20, 1.60] },
  { nome: 'HARD  ', gambe: 3, obiettivo: 2.00, banda: b || [1.20, 1.60] },
];

const righe = await sql`
  select data, stagione, div, casa, trasferta, esito,
         gol_casa, gol_trasferta, coalesce(tirip_casa,0) as tf_casa, coalesce(tirip_trasf,0) as tf_trasf,
         b365_1, b365_2, avg_ap_1, avg_ap_x, avg_ap_2
  from partite
  where esito is not null and gol_casa is not null
  order by data, div, casa`;

// ── Il turno di una partita: weekend + blocco ────────────────────────────────
// venerdì-sabato = primo turno, domenica-lunedì = secondo. Il resto non si gioca.
function turno(d) {
  const x = new Date(d); x.setHours(12, 0, 0, 0);
  const g = x.getDay();                       // 0 dom … 6 sab
  const blocco = (g === 5 || g === 6) ? 'A' : (g === 0 || g === 1) ? 'B' : null;
  if (!blocco) return null;
  const lun = new Date(x); lun.setDate(lun.getDate() + ((8 - g) % 7));
  return { weekend: lun.toISOString().slice(0, 10), blocco };
}

// ── Lo stato delle squadre, costruito camminando avanti nel tempo ────────────
const storia = new Map();                     // "stagione|div|squadra" → partite viste da lei
const chiave = (s, d, sq) => `${s}|${d}|${sq}`;
function vista(r, dove) {
  const casa = dove === 'casa';
  return { gf: casa ? r.gol_casa : r.gol_trasferta, gs: casa ? r.gol_trasferta : r.gol_casa,
           tf: casa ? Number(r.tf_casa) : Number(r.tf_trasf), tc: casa ? Number(r.tf_trasf) : Number(r.tf_casa),
           dove, v: (casa ? r.gol_casa > r.gol_trasferta : r.gol_trasferta > r.gol_casa) ? 1 : 0 };
}
const somme = l => l.length ? { n: l.length, v: l.reduce((a,x)=>a+x.v,0), gf: l.reduce((a,x)=>a+x.gf,0),
  gs: l.reduce((a,x)=>a+x.gs,0), tf: l.reduce((a,x)=>a+x.tf,0), tc: l.reduce((a,x)=>a+x.tc,0) } : null;
function forzaDi(s, d, sq, dove) {
  const l = storia.get(chiave(s, d, sq));
  if (!l || l.length < MIN_PARTITE) return null;
  const nelRuolo = l.filter(x => x.dove === dove);
  return forza({ stagione: parametri(somme(l)), forma: parametri(somme(l.slice(-PARTITE_FINESTRA))),
                 ruolo: parametri(somme(nelRuolo.slice(-PARTITE_FINESTRA))) }, dove);
}

// ── Prima passata: per ogni partita, cosa si sapeva prima ────────────────────
const candidate = [];
const giornate = new Map();                   // "stagione|div" → quante giornate viste
for (const r of righe) {
  const t = turno(r.data);
  const kg = `${r.stagione}|${r.div}`;
  const giornata = (giornate.get(kg) || 0);

  if (t && r.avg_ap_1 && r.avg_ap_x && r.avg_ap_2 && r.b365_1 && r.b365_2 && giornata >= DA_GIORNATA) {
    const s = 1/Number(r.avg_ap_1) + 1/Number(r.avg_ap_x) + 1/Number(r.avg_ap_2);
    const p1 = (1/Number(r.avg_ap_1))/s, p2 = (1/Number(r.avg_ap_2))/s;
    const segno = p1 >= p2 ? 'H' : 'A';
    const att = segno === 'H' ? p1 : p2;
    const quota = Number(segno === 'H' ? r.b365_1 : r.b365_2);
    const fc = forzaDi(r.stagione, r.div, r.casa, 'casa');
    const ff = forzaDi(r.stagione, r.div, r.trasferta, 'fuori');
    const v = vpm(fc, ff);
    const segnoVpm = v ? (v.segno === '1' ? 'H' : 'A') : null;
    candidate.push({ ...t, data: r.data, stagione: r.stagione, div: r.div, casa: r.casa, trasferta: r.trasferta,
      segno, att, quota, esito: r.esito, vinta: r.esito === segno,
      vpm: v?.punti ?? null, accordo: v ? segnoVpm === segno : null });
  }

  // la partita è giocata: ora entra nella storia
  for (const [sq, dove] of [[r.casa, 'casa'], [r.trasferta, 'fuori']]) {
    const k = chiave(r.stagione, r.div, sq);
    if (!storia.has(k)) storia.set(k, []);
    storia.get(k).push(vista(r, dove));
  }
  // giornata = numero di partite viste in quel campionato diviso le squadre... si
  // approssima con il minimo delle partite giocate dalle due squadre
  const nCasa = storia.get(chiave(r.stagione, r.div, r.casa)).length;
  const nTras = storia.get(chiave(r.stagione, r.div, r.trasferta)).length;
  giornate.set(kg, Math.min(nCasa, nTras));
}

console.log(`${candidate.length} partite giocabili (dalla ${DA_GIORNATA}ª giornata, venerdì-lunedì, con quota Bet365 e VPM)`);
const conVpm = candidate.filter(c => c.vpm != null);
console.log(`di cui con VPM calcolabile: ${conVpm.length}\n`);

// ── VPM è attendibile? la domanda sola ──────────────────────────────────────
console.log('── VPM dice qualcosa? (quota 1,35-1,45) ──');
const banda = conVpm.filter(c => c.quota >= 1.35 && c.quota < 1.45);
for (const [et, filtro] of [
  ['VPM conferma e netto',  c => c.accordo && c.vpm >= VPM_NETTO],
  ['VPM conferma, non netto', c => c.accordo && c.vpm < VPM_NETTO],
  ['VPM contraddice',       c => !c.accordo],
]) {
  const l = banda.filter(filtro);
  if (!l.length) continue;
  const vinte = l.filter(c => c.vinta).length;
  const resa = l.reduce((a,c)=>a+(c.vinta?c.quota:0),0)/l.length;
  console.log(`  ${et.padEnd(24)} ${String(l.length).padStart(5)} partite · vinte ${(vinte/l.length*100).toFixed(1)}% · resa ${(resa*100).toFixed(1)}%`);
}

// ── Il turno: la giocata scelta per ogni versione ────────────────────────────
const turni = new Map();
for (const c of conVpm) {
  const k = `${c.weekend}|${c.blocco}`;
  if (!turni.has(k)) turni.set(k, []);
  turni.get(k).push(c);
}
const ordinati = [...turni.keys()].sort();

function giocata(lista, V) {
  // solo dove VPM conferma ed è netto
  const chiave = c => (SCELTA === 'resa' ? c.quota * c.att : SCELTA === 'vpm' ? c.vpm : c.att);
  const ok = lista.filter(c => c.accordo && c.vpm >= VPM_NETTO && c.quota >= V.banda[0] && c.quota < V.banda[1])
    .sort((a, b) => chiave(b) - chiave(a) || a.data.localeCompare(b.data) || a.casa.localeCompare(b.casa));
  const gambe = [];
  let q = 1;
  for (const c of ok) {
    if (gambe.length >= V.gambe) break;
    gambe.push(c); q *= c.quota;
    if (V.obiettivo && q >= V.obiettivo) break;
  }
  if (!gambe.length) return null;
  if (V.obiettivo && q < V.obiettivo) return null;           // non si arriva all'obiettivo
  if (!V.obiettivo && (q < V.banda[0] || q >= V.banda[1])) return null;
  return { gambe, quota: q, vinta: gambe.every(g => g.vinta) };
}

// ── La simulazione ──────────────────────────────────────────────────────────
console.log('\n── la scala a recupero, stagione per stagione ──');
for (const V of VERSIONI) {
  const stagioni = [...new Set(conVpm.map(c => c.stagione))].sort();
  const esiti = [];
  console.log(`\n${V.nome}  (${V.gambe === 1 ? 'una partita' : `fino a ${V.gambe}, obiettivo ${V.obiettivo}`})`);
  for (const st of stagioni) {
    let bank = BANKROLL, minBank = BANKROLL, scale = 0, chiuse = 0, giocate = 0, turniVisti = 0, falliSu = null;
    let passo = 0, inGioco = 0, cassa = 0;
    for (const k of ordinati.filter(k => turni.get(k).some(c => c.stagione === st))) {
      turniVisti++;
      const lista = turni.get(k).filter(c => c.stagione === st);
      const g = giocata(lista, V);
      // ⚠️ La giocata si cerca PRIMA di aprire la scala: nella prima versione la
      // base usciva dal bankroll anche nei turni senza partite adatte, e il
      // conto si svuotava senza aver scommesso (10 scale per 2 giocate).
      if (!g) continue;
      if (passo === 0) {                        // nuova scala, solo ora
        const b0 = baseOra(bank);
        if (bank < b0 || bank < 1) { falliSu = turniVisti; break }
        inGioco = b0; cassa = 0; bank -= b0; scale++;
      }
      giocate++;
      if (!g.vinta) {                            // la scala muore, la cassa torna
        bank += cassa; if (cassa > 0) chiuse++;
        passo = 0; inGioco = 0; cassa = 0;
        minBank = Math.min(minBank, bank);
        continue;
      }
      const montante = inGioco * g.quota;
      const utile = montante - inGioco;
      const acc = Math.ceil(SCALETTA[Math.min(passo, SCALETTA.length-1)] * utile);
      const resto = montante - acc;
      const nuovo = Math.floor(resto);
      cassa += acc + (resto - nuovo);
      inGioco = nuovo;
      passo++;
      if (passo >= PASSI) {                      // arrivata in cima: si incassa
        bank += cassa + inGioco; chiuse++;
        passo = 0; inGioco = 0; cassa = 0;
      }
      minBank = Math.min(minBank, bank);
    }
    if (passo > 0) bank += cassa + inGioco;      // scala aperta a fine stagione
    const esito = falliSu ? `✗ FINITI dopo ${falliSu} turni` : `${bank.toFixed(0)} €`;
    console.log(`  ${st}  ${String(turniVisti).padStart(3)} turni · ${String(giocate).padStart(3)} giocate · ${String(scale).padStart(3)} scale (${chiuse} con cassa)` +
      ` · minimo ${minBank.toFixed(0)} € · fine ${esito}`);
    if (turniVisti >= 30) esiti.push({ st, fine: falliSu ? bank : bank, falliSu, giocate });
  }
  V.esiti = esiti;
}

// ── Il riepilogo: la risposta alle domande di Mattia ────────────────────────
console.log('\n══ RIEPILOGO (solo stagioni complete, almeno 30 turni) ══\n');
console.log(`${''.padEnd(8)} stagioni  falliti  MEDIANA  fine media  peggiore  migliore   stagioni sopra ${BANKROLL} €`);
for (const V of VERSIONI) {
  const e = V.esiti;
  if (!e.length) continue;
  const falliti = e.filter(x => x.falliSu);
  const media = e.reduce((a, x) => a + x.fine, 0) / e.length;
  const fini = e.map(x => x.fine).sort((a, b) => a - b);
  // ⚠️ La MEDIANA, non la media: con sette stagioni una sola scala fortunata
  // gonfia la media senza che il metodo funzioni (10/10/2026: la fascia
  // 1,50-2,20 dava media 1.158 € con sei stagioni su sette in perdita e una a
  // 7.549 €). La mediana dice cosa succede in una stagione normale.
  const mediana = fini.length % 2 ? fini[(fini.length - 1) / 2] : (fini[fini.length/2 - 1] + fini[fini.length/2]) / 2;
  const inAttivo = e.filter(x => x.fine > BANKROLL).length;
  console.log(`${V.nome}  ${String(e.length).padStart(5)}    ${String(falliti.length).padStart(5)}` +
    `  ${mediana.toFixed(0).padStart(7)} €  ${media.toFixed(0).padStart(8)} €  ${fini[0].toFixed(0).padStart(7)} €  ${fini.at(-1).toFixed(0).padStart(7)} €` +
    `   ${inAttivo}/${e.length} in attivo`);
  if (falliti.length) console.log(`${''.padEnd(8)} finiti i soldi dopo ${falliti.map(x => x.falliSu).join(', ')} turni (${falliti.map(x => x.st).join(', ')})`);
}

await sql.end();
