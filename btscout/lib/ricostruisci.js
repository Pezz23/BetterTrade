// LA RICOSTRUZIONE CAMMINANDO NEL TEMPO: per ogni partita giocata, cosa si
// sapeva **prima** che si giocasse.
//
// ⚠️ Estratto da `scripts/prova-indicatori.js` il 12/10/2026, quando è servito
// anche a `calcola-andamento.js`. **Non duplicarlo**: è il pezzo in cui si
// sbaglia più facilmente (basta aggiornare la storia di una squadra *prima* di
// valutare la partita e il modello conosce il futuro), e due copie che
// divergono darebbero due verità sulla stessa domanda.
//
// ⚠️ Quello che restituisce è, per ogni partita: la giocata che il criterio
// del progetto avrebbe proposto, l'attendibilità dal consenso di **apertura**,
// la quota Bet365 di **apertura**, VPM e i gol attesi di quel giorno, e se la
// giocata **per intero** è andata bene (per le combinate, over 1,5 compreso).

import { sql } from './db.js';
import { giornoLocale, weekendDi } from './date.js';
import { parametri, forza, vpm, voto } from '../../app/src/lib/vpm.js';
import { golAttesi } from '../../app/src/lib/gol.js';
import { REGOLA_OVER, FATTORE_OVER } from '../../app/src/lib/attendibilita.js';
import { PARTITE_FINESTRA } from '../../app/src/lib/vpm.js';

/**
 * @param {object} opzioni
 * @param {number} opzioni.stagioni  quante stagioni finali valutare
 * @param {number} opzioni.daGiornata  si comincia da questa giornata (le prime
 *   non hanno abbastanza partite perché VPM esista)
 * @returns {{valutate: Array, stagioni: string[]}}
 */
export async function ricostruisci({ stagioni: quante = 3, daGiornata = 5 } = {}) {
  const righe = await sql`
    select id, data, stagione, div, casa, trasferta, esito, gol_casa, gol_trasferta,
           coalesce(tirip_casa,0) as tfc, coalesce(tirip_trasf,0) as tft,
           b365_1, b365_2, avg_ap_1, avg_ap_x, avg_ap_2
    from partite
    where esito is not null and gol_casa is not null
    order by data, div, casa, id`;
  if (!righe.length) throw new Error('nessuna partita letta: controlla la connessione');

  const stagioni = [...new Set(righe.map(r => r.stagione))].sort().slice(-quante);
  const storia = new Map(), totali = new Map(), giornate = new Map();
  const k = (s, d, sq) => `${s}|${d}|${sq}`;
  const somme = l => (l.length ? {
    n: l.length, v: l.reduce((a, x) => a + x.v, 0),
    gf: l.reduce((a, x) => a + x.gf, 0), gs: l.reduce((a, x) => a + x.gs, 0),
    tf: l.reduce((a, x) => a + x.tf, 0), tc: l.reduce((a, x) => a + x.tc, 0),
  } : null);
  const finestreDi = (s, d, sq) => {
    const l = storia.get(k(s, d, sq));
    if (!l) return null;
    return { stagione: somme(l), forma: somme(l.slice(-PARTITE_FINESTRA)),
             casa: somme(l.filter(x => x.dove === 'casa').slice(-PARTITE_FINESTRA)),
             fuori: somme(l.filter(x => x.dove === 'fuori').slice(-PARTITE_FINESTRA)) };
  };

  const valutate = [];
  for (const r of righe) {
    const kd = `${r.stagione}|${r.div}`;
    const giornata = giornate.get(kd) || 0;
    const med = totali.get(kd);

    if (stagioni.includes(r.stagione) && giornata >= daGiornata && med?.partite
        && r.avg_ap_1 && r.avg_ap_x && r.avg_ap_2 && r.b365_1 && r.b365_2) {
      const S = 1 / Number(r.avg_ap_1) + 1 / Number(r.avg_ap_x) + 1 / Number(r.avg_ap_2);
      const p1 = (1 / Number(r.avg_ap_1)) / S, p2 = (1 / Number(r.avg_ap_2)) / S;
      const segno = p1 >= p2 ? 'H' : 'A';
      const prob = segno === 'H' ? p1 : p2;
      const quota = Number(segno === 'H' ? r.b365_1 : r.b365_2);

      // la regola del progetto: sotto 1,25 si aggiunge l'over 1,5
      const combinata = quota < REGOLA_OVER;
      const probGiocata = combinata ? prob * FATTORE_OVER : prob;
      const quotaResa = combinata ? quota / FATTORE_OVER : quota;
      const resa = quotaResa * probGiocata;

      const fc = finestreDi(r.stagione, r.div, r.casa), ff = finestreDi(r.stagione, r.div, r.trasferta);
      const v = vpm(forza({ stagione: parametri(fc?.stagione), forma: parametri(fc?.forma), ruolo: parametri(fc?.casa) }, 'casa'),
                    forza({ stagione: parametri(ff?.stagione), forma: parametri(ff?.forma), ruolo: parametri(ff?.fuori) }, 'fuori'));
      const gol = golAttesi({ [r.casa]: fc, [r.trasferta]: ff }, r.casa, r.trasferta,
        med.gol / med.partite, undefined, undefined, med.tiri / med.partite);

      // ⚠️ azzeccata = la giocata PER INTERO: il segno, e se è combinata anche l'over 1,5
      const segnoGiusto = r.esito === segno;
      const vinta = segnoGiusto && (!combinata || r.gol_casa + r.gol_trasferta >= 2);

      valutate.push({
        id: r.id, data: giornoLocale(r.data), weekend: weekendDi(r.data),
        stagione: r.stagione, div: r.div, casa: r.casa, trasferta: r.trasferta,
        segno, combinata, vinta, segnoGiusto,
        giocata: `${segno === 'H' ? '1' : '2'}${combinata ? ' + over 1,5' : ''}`,
        quota, quotaResa, att: probGiocata, resa,
        vpm: v?.punti ?? null, voto: voto(resa, v?.punti ?? null),
        golAttesi: gol?.totale ?? null, gg: gol?.gg ?? null,
        over: gol?.over ?? null,
        // gli esiti veri dei gol, accanto alle previsioni: servono a chi misura
        // over/under e Goal, e tenerli qui evita di rileggere le partite
        golTotali: r.gol_casa + r.gol_trasferta,
        ggVero: r.gol_casa > 0 && r.gol_trasferta > 0,
        accordoVpm: v ? (v.segno === '1' ? 'H' : 'A') === segno : null,
        // ⚠️ Serve a chiedersi **chi ha ragione quando campo e mercato
        // litigano**: senza l'esito vero e le due probabilità grezze si può
        // solo sapere se ha vinto il favorito del mercato, non se ha vinto il
        // segno che preferiva VPM.
        esito: r.esito,
        segnoVpm: v ? (v.segno === '1' ? 'H' : 'A') : null,
        p1, p2,
        q1: Number(r.b365_1), q2: Number(r.b365_2),
      });
    }

    // ⚠️ La partita entra nella storia SOLO ADESSO, dopo essere stata valutata.
    for (const [sq, gf, gs, tf, tc, dove] of [
      [r.casa, r.gol_casa, r.gol_trasferta, Number(r.tfc), Number(r.tft), 'casa'],
      [r.trasferta, r.gol_trasferta, r.gol_casa, Number(r.tft), Number(r.tfc), 'fuori'],
    ]) {
      const key = k(r.stagione, r.div, sq);
      if (!storia.has(key)) storia.set(key, []);
      storia.get(key).push({ gf, gs, tf, tc, dove, v: gf > gs ? 1 : 0 });
    }
    if (!totali.has(kd)) totali.set(kd, { gol: 0, tiri: 0, partite: 0 });
    const t = totali.get(kd);
    t.gol += r.gol_casa + r.gol_trasferta; t.tiri += Number(r.tfc) + Number(r.tft); t.partite += 2;
    giornate.set(kd, Math.min(storia.get(k(r.stagione, r.div, r.casa)).length,
                              storia.get(k(r.stagione, r.div, r.trasferta)).length));
  }
  return { valutate, stagioni };
}
