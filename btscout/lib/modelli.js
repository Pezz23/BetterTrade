// Modelli candidati, tutti con la stessa interfaccia così il backtest li può
// scambiare senza saperne i dettagli:
//   modello.fit(training, opts)   → stato (le forze stimate)
//   modello.prevedi(stato, casa, ospite) → {pCasa, pPareggio, pOspite, pOver25, pUnder25}
//
// training è una lista di partite con: casa, trasferta, golCasa, golTrasferta,
// tiripCasa, tiripTrasf, data. Ogni modello prende ciò che gli serve.

import { fit as fitDC, prevedi as prevediDC, mediaAttesa, matriceDaMedie, esitiDaMatrice }
  from './dixon-coles.js';

// Interfaccia comune: prevedi(stato, casa, ospite) restituisce le probabilità,
// oppure null se il modello non può predire questa partita (squadra sconosciuta,
// dati insufficienti). Il backtest salta i null. Così nessun modello lancia
// eccezioni a metà run per un campionato con dati mancanti.

// --- Modello 1: Dixon-Coles sui gol (quello del primo backtest, il riferimento) ---
export const modelloGol = {
  nome: 'gol',
  fit: (training, opts) => fitDC(training, opts),
  prevedi: (m, casa, ospite) =>
    (casa in m.attacco && ospite in m.attacco) ? prevediDC(m, casa, ospite) : null,
};

// --- Modello 2: Dixon-Coles sui TIRI IN PORTA, convertiti in gol ---
// Ipotesi: i tiri in porta sono un segnale meno rumoroso dei gol (un "xG del
// povero"). Si stima la forza in "tiri", si prevede quanti tiri farà ogni
// squadra, poi si converte in gol attesi con il tasso medio di realizzazione
// del campionato. Convertire con un tasso UNICO è voluto: toglie la finalizzazione
// (over/under-performance al tiro), che è proprio la parte fortunata e instabile.
export const modelloTiri = {
  nome: 'tiri',
  fit: (training, opts) => {
    const conTiri = training.filter(p => p.tiripCasa != null && p.tiripTrasf != null);
    // Dati coi tiri insufficienti (es. serie minori senza statistiche): stato
    // vuoto, prevedi restituirà null e il backtest salterà. Niente eccezioni.
    if (conTiri.length < 50) return { attacco: {}, difesa: {}, fattoreCampo: 1, rho: 0, scala: 0, insufficiente: true };

    const datiTiri = conTiri.map(p => ({
      casa: p.casa, trasferta: p.trasferta,
      golCasa: p.tiripCasa, golTrasferta: p.tiripTrasf, data: p.data,
    }));
    const m = fitDC(datiTiri, opts);

    // Conversione globale gol / tiri in porta sul training.
    let gol = 0, tiri = 0;
    for (const p of conTiri) {
      gol += p.golCasa + p.golTrasferta;
      tiri += p.tiripCasa + p.tiripTrasf;
    }
    m.scala = tiri > 0 ? gol / tiri : 0.33;
    // La correzione ρ è stata stimata in spazio-tiri: non vale per lo spazio-gol.
    // Azzerata per ora (effetto piccolo); si rifinisce se il modello promette.
    m.rho = 0;
    return m;
  },
  prevedi: (m, casa, ospite) => // usa m.scala e m.rho
    (casa in m.attacco && ospite in m.attacco) ? prevediDC(m, casa, ospite) : null,
};

// --- Modello 3: MISTO — fonde le medie attese di gol e di tiri ---
// Idea dal primo confronto: i gol predicono meglio CHI vince (1X2), i tiri
// QUANTI gol (Over/Under). Si stimano entrambi e si fondono le medie attese:
//   λ = peso·λ_gol + (1−peso)·λ_tiri,   idem per μ.
// peso=1 → solo gol; peso=0 → solo tiri. La correzione ρ è quella dei gol.
export function modelloMisto(peso = 0.5) {
  return {
    nome: `misto(${peso})`,
    fit: (training, opts) => {
      const mGol = fitDC(training, opts);
      const mTiri = modelloTiri.fit(training, opts); // non lancia più: stato vuoto se pochi tiri
      return { mGol, mTiri, peso };
    },
    prevedi: (stato, casa, ospite) => {
      const { mGol, mTiri, peso } = stato;
      if (!(casa in mGol.attacco) || !(ospite in mGol.attacco)) return null;
      const gGol = mediaAttesa(mGol, casa, ospite);
      // Se i tiri non ci sono per queste squadre, ricadi sulle medie dei gol.
      const usaTiri = mTiri && !mTiri.insufficiente && casa in mTiri.attacco && ospite in mTiri.attacco;
      const gTiri = usaTiri ? mediaAttesa(mTiri, casa, ospite) : gGol;
      const lambda = peso * gGol.lambda + (1 - peso) * gTiri.lambda;
      const mu = peso * gGol.mu + (1 - peso) * gTiri.mu;
      const { M } = matriceDaMedie(lambda, mu, mGol.rho);
      return esitiDaMatrice(M);
    },
  };
}

export const MODELLI = {
  gol: modelloGol,
  tiri: modelloTiri,
};
