// IMPORTA UNA COMPETIZIONE INTERA DA ESPN — Champions, Europa, Olanda 2, J1.
//
//   node --env-file=.env scripts/importa-competizione.js --comp=UCL            (prova a vuoto)
//   node --env-file=.env scripts/importa-competizione.js --comp=UCL --esegui
//   pomelli: --da=2016 --a=2026 --comp=UCL,UEL,N2,JPN1
//
// ⚠️⚠️ **Qui ESPN non è la seconda fonte: è l'UNICA.** Negli altri quindici
// campionati football-data porta la riga e ESPN la arricchisce, quindi ogni
// numero ha un secondo parere; in Champions non c'è niente con cui
// confrontarlo. Per questo:
//   · si importano **solo le partite finite** — una riga senza risultato non è
//     una partita giocata, è un calendario;
//   · si scrive `fonte = 'espn'`, così una query potrà sempre dire da dove
//     viene un numero e quale parte dell'archivio ha un solo testimone;
//   · **niente quote**: ESPN non le ha. Vedi il blocco in fondo.
//
// ⚠️ **I nomi delle squadre sono quelli di ESPN**, non quelli di
// football-data: "Internazionale" e non "Inter", "Atlético Madrid" e non
// "Ath Madrid". Dentro la competizione sono coerenti — ed è quello che serve
// per le medie di squadra. ⚠️⚠️ Ma **non si agganciano da sé allo stesso club
// nel suo campionato**: unire Champions e Serie A per la stessa squadra vuole
// la tabella dei nomi (`lib/nomi-espn.js`), e non è questo script a farlo.

import { sql, chiudi } from '../lib/db.js';
import { CAMPIONATI, COMPETIZIONI, partiteDelMese, statistiche } from '../lib/espn.js';

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const ESEGUI = process.argv.includes('--esegui');
const COMPS = arg('comp', 'UCL').split(',').filter(c => COMPETIZIONI[c] && CAMPIONATI[c]);
const DA = Number(arg('da', 0));
const A = Number(arg('a', new Date().getFullYear()));

if (!COMPS.length) {
  console.error('✗ nessuna competizione valida. Disponibili:', Object.keys(COMPETIZIONI).join(' '));
  process.exit(1);
}

/**
 * La stagione di una data, nella forma che usa l'archivio.
 *
 * ⚠️ Due calendari, non uno: in Europa la stagione va da luglio a giugno
 * (`'2526'`), in Giappone **è l'anno solare** (`'2025'`). Forzare la J1 nello
 * schema europeo spezzerebbe ogni campionato in due stagioni nostre, e
 * `calcola-andamento`, che conta per stagione, conterebbe metà campionati.
 */
const stagioneDi = (data, annoSolare) => {
  const d = new Date(data), a = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (annoSolare) return String(a);
  const inizio = m >= 7 ? a : a - 1;
  return `${String(inizio).slice(2)}${String(inizio + 1).slice(2)}`;
};

const esitoDi = (gc, gt) => (gc > gt ? 'H' : gc < gt ? 'A' : 'D');
const dormi = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Una scrittura che sopravvive alla connessione che cade.
 *
 * ⚠️⚠️ **Trovato sul campo la notte del 22/10/2026**: dopo un'ora di lavoro
 * continuo il pooler di Supabase ha chiuso la connessione (`ECONNRESET`) e il
 * recupero è **morto a metà Europa League**, con Conference e Olanda 2 mai
 * partite. Non era ESPN: era il database. Un recupero che dura ore deve
 * aspettarselo — un'eccezione non gestita butta via tutto il tempo rimasto,
 * non le righe già scritte.
 * ⚠️ Si può riprovare senza pensarci perché la scrittura è **idempotente**
 * (`on conflict do nothing`): nel dubbio, due volte la stessa riga non fa
 * danno.
 */
async function conRipetizione(fn, tentativi = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tentativi) throw e;
      console.log(`   ⚠ scrittura fallita (${e.code || e.message}), riprovo fra ${i * 2}s`);
      await dormi(i * 2000);
    }
  }
}
const mesiDi = (anno) => Array.from({ length: 12 }, (_, i) => `${anno}${String(i + 1).padStart(2, '0')}`);

async function unaCompetizione(comp) {
  const info = COMPETIZIONI[comp];
  const daAnno = Math.max(DA || info.da, info.da);
  console.log(`\n── ${comp} · ${info.nome} · ${daAnno}-${A} ${ESEGUI ? '' : '(prova a vuoto)'}`);

  // ⚠️ Quello che c'è già si chiede **una volta**, non una query per partita:
  // la chiave è la stessa dell'indice unico della tabella.
  const viste = new Set((await conRipetizione(() => sql`
    select data, casa, trasferta from partite where div = ${comp}
  `)).map(r => `${r.data.toISOString().slice(0, 10)}|${r.casa}|${r.trasferta}`));
  console.log(`   già in archivio: ${viste.size}`);

  let nuove = 0, saltate = 0, senzaStat = 0;
  for (let anno = daAnno; anno <= A; anno++) {
    // ⚠️ Un anno solare di mesi, non una stagione: una stagione europea sta a
    // cavallo di due anni, e chiedere i dodici mesi di ciascuno li copre
    // entrambi senza doverci ragionare.
    for (const mese of mesiDi(anno)) {
      let partite;
      try { partite = await partiteDelMese(comp, mese); }
      catch (e) { console.log(`   ⚠ ${mese}: ${e.message}`); continue; }

      for (const p of partite) {
        if (!p.finita || p.golCasa == null || p.golTrasferta == null) { saltate++; continue; }
        if (viste.has(`${p.data}|${p.casa}|${p.trasferta}`)) { saltate++; continue; }

        // ⚠️ Le statistiche costano una chiamata a partita, quindi si chiedono
        // **solo** per le partite che si stanno per scrivere — e **solo quando
        // si scrive davvero**: una prova a vuoto che fa millecinquecento
        // richieste a una fonte non documentata non è una prova a vuoto.
        let st = null;
        if (ESEGUI) {
          // ⚠️ **Un tentativo solo**: ESPN non ha il riepilogo delle partite
          // vecchie, e insistere tre volte su un buco che è un buco e basta
          // moltiplicava per cinque il tempo di tutto il recupero.
          try { st = await statistiche(comp, p.id, 1); } catch { /* si scrive lo stesso */ }
          if (!st) senzaStat++;
        }

        if (ESEGUI) {
          await conRipetizione(() => sql`
            insert into partite (div, campionato, stagione, data, casa, trasferta,
                                 gol_casa, gol_trasferta, esito,
                                 tiri_casa, tiri_trasf, tirip_casa, tirip_trasf,
                                 angoli_casa, angoli_trasf, gialli_casa, gialli_trasf,
                                 rossi_casa, rossi_trasf, falli_casa, falli_trasf,
                                 possesso_casa, possesso_trasf, fonte)
            values (${comp}, ${info.nome}, ${stagioneDi(p.data, info.annoSolare)}, ${p.data},
                    ${p.casa}, ${p.trasferta}, ${p.golCasa}, ${p.golTrasferta},
                    ${esitoDi(p.golCasa, p.golTrasferta)},
                    ${st?.casa.tiri ?? null}, ${st?.trasferta.tiri ?? null},
                    ${st?.casa.tirip ?? null}, ${st?.trasferta.tirip ?? null},
                    ${st?.casa.angoli ?? null}, ${st?.trasferta.angoli ?? null},
                    ${st?.casa.gialli ?? null}, ${st?.trasferta.gialli ?? null},
                    ${st?.casa.rossi ?? null}, ${st?.trasferta.rossi ?? null},
                    ${st?.casa.falli ?? null}, ${st?.trasferta.falli ?? null},
                    ${st?.casa.possesso ?? null}, ${st?.trasferta.possesso ?? null}, 'espn')
            on conflict (div, stagione, data, casa, trasferta) do nothing`);
        }
        viste.add(`${p.data}|${p.casa}|${p.trasferta}`);
        nuove++;
        if (nuove % 50 === 0) process.stdout.write(`   ${nuove} nuove…\r`);
      }
    }
  }
  console.log(`   ${ESEGUI ? 'scritte' : 'da scrivere'}: ${nuove} · già viste o non finite: ${saltate} · senza statistiche: ${senzaStat}`);
  return nuove;
}

let totale = 0;
for (const c of COMPS) totale += await unaCompetizione(c);

console.log(`\n${ESEGUI ? '✓ scritte' : '→ scriverebbe'} ${totale} partite`);
// ⚠️⚠️ **Nessuna quota, ed è un limite da sapere, non un difetto da correggere
// qui.** L'attendibilità di BetterTrade È il consenso dei bookmaker: senza
// quote queste partite hanno i gol, i tiri, gli angoli e i cartellini, ma
// **non hanno un'attendibilità** e non possono comparire nella lista delle
// consigliate. Le quote delle partite FUTURE di Champions esistono su The Odds
// API (`soccer_uefa_champs_league`, verificato il 22/10/2026); quelle storiche
// non le ha nessuno gratis.
if (!ESEGUI) console.log('  (niente è stato scritto: aggiungi --esegui)');
await chiudi();
