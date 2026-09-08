// Modello Dixon-Coles (1997) — sola matematica, nessuna dipendenza, nessun I/O.
//
// Cosa fa: da una lista di partite passate stima la forza d'attacco e di difesa
// di ogni squadra, il vantaggio del fattore campo e la correzione per i risultati
// bassi. Da quelle forze produce, per una partita futura, la matrice dei punteggi
// e da lì le probabilità di 1X2 e Over/Under 2.5.
//
// ⚠️ Questo file NON stima probabilità "a occhio": è un calcolo deterministico
// sui gol reali. È il "matematica calcola" della regola in CLAUDE.md. Claude non
// entra qui dentro.
//
// Il modello. I gol in casa seguono una Poisson di media
//     λ = attacco_casa · difesa_ospite · fattore_campo
// i gol fuori casa una Poisson di media
//     μ = attacco_ospite · difesa_casa
// dove "difesa" alta = squadra che subisce di più (difesa debole). La correzione
// di Dixon-Coles (τ, parametro ρ) aggiusta l'indipendenza fra i due Poisson sui
// soli punteggi bassi (0-0, 1-0, 0-1, 1-1), dove il modello indipendente sbaglia.

const LOG_FATT = (() => {
  // log(k!) per k piccoli: la Poisson qui non vede più di ~10 gol.
  const t = [0];
  for (let k = 1; k <= 20; k++) t[k] = t[k - 1] + Math.log(k);
  return t;
})();

function poisson(k, lambda) {
  // In log per non perdere precisione con λ piccolo.
  return Math.exp(-lambda + k * Math.log(lambda) - LOG_FATT[k]);
}

// La correzione di Dixon-Coles. Vale 1 ovunque tranne i quattro punteggi bassi.
function tau(x, y, lambda, mu, rho) {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

// Media geometrica: serve a fissare l'unico grado di libertà ridondante del
// modello (scalare tutti gli attacchi di c e tutte le difese di 1/c lascia λ e μ
// identici). Ancoriamo la media geometrica degli attacchi a 1.
function geomean(valori) {
  let s = 0;
  for (const v of valori) s += Math.log(v);
  return Math.exp(s / valori.length);
}

/**
 * Stima il modello sui dati passati.
 *
 * @param {Array} partite  [{casa, trasferta, golCasa, golTrasferta, data}]
 * @param {Object} opts
 *   xi            decadimento temporale per giorno (più alto = il passato conta
 *                 meno in fretta). Default: emivita ~200 giorni.
 *   dataRiferimento  Date da cui misurare l'anzianità. Default: la partita più
 *                 recente nei dati (= "forza di oggi").
 *   maxIter, tol  criteri di arresto dell'iterazione.
 * @returns {Object} { attacco:{sq:val}, difesa:{sq:val}, fattoreCampo, rho,
 *                     squadre:[...], iterazioni, xi, dataRiferimento }
 */
export function fit(partite, opts = {}) {
  const xi = opts.xi ?? Math.log(2) / 200;
  const maxIter = opts.maxIter ?? 500;
  const tol = opts.tol ?? 1e-10;
  // Sotto-rilassamento: passo parziale in scala logaritmica. Senza, il fattore
  // campo e le difese oscillano con ampiezza crescente e il fit diverge (l'una
  // compensa l'altro a ogni giro, rimbalzando). Con η<1 l'oscillazione si spegne
  // e il punto d'arrivo non cambia. Verificato con un test di recupero parametri.
  const eta = opts.eta ?? 0.5;

  if (!partite.length) throw new Error('fit: nessuna partita');

  const dataRiferimento = opts.dataRiferimento
    ?? new Date(Math.max(...partite.map(p => +new Date(p.data))));

  // Peso di ogni partita: exp(-xi · giorni_fa). Le partite future al riferimento
  // (non dovrebbero esserci in un fit onesto) avrebbero peso >1: le tagliamo a 1.
  const MS_GIORNO = 86400000;
  const pesate = partite.map(p => {
    const giorni = (dataRiferimento - new Date(p.data)) / MS_GIORNO;
    return { ...p, w: Math.exp(-xi * Math.max(0, giorni)) };
  });

  const squadre = [...new Set(pesate.flatMap(p => [p.casa, p.trasferta]))].sort();
  const idx = new Map(squadre.map((s, i) => [s, i]));
  const n = squadre.length;

  // Costanti (non dipendono dai parametri): gol segnati e subiti, pesati.
  const segnati = new Array(n).fill(0);
  const subiti = new Array(n).fill(0);
  let golCasaTot = 0; // per il fattore campo
  for (const p of pesate) {
    const h = idx.get(p.casa), a = idx.get(p.trasferta);
    segnati[h] += p.w * p.golCasa;
    subiti[h] += p.w * p.golTrasferta;
    segnati[a] += p.w * p.golTrasferta;
    subiti[a] += p.w * p.golCasa;
    golCasaTot += p.w * p.golCasa;
  }

  // Punto di partenza. Con opts.iniziale (un modello già stimato) si parte dalle
  // forze precedenti: nel backtest walk-forward si ri-stima a ogni giornata e i
  // dati cambiano poco fra una e l'altra, quindi bastano pochissime iterazioni.
  // Le squadre nuove partono da 1. Non cambia il punto d'arrivo, solo il cammino.
  const prec = opts.iniziale;
  let att = squadre.map(s => prec?.attacco?.[s] ?? 1);
  let dif = squadre.map(s => prec?.difesa?.[s] ?? 1);
  let campo = prec?.fattoreCampo ?? 1.35;

  let iterazioni = 0;
  for (; iterazioni < maxIter; iterazioni++) {
    const attDen = new Array(n).fill(0);
    const difDen = new Array(n).fill(0);
    let campoDen = 0;

    for (const p of pesate) {
      const h = idx.get(p.casa), a = idx.get(p.trasferta);
      // Attacco: chi segna, contro quale difesa (col campo solo se in casa).
      attDen[h] += p.w * dif[a] * campo;
      attDen[a] += p.w * dif[h];
      // Difesa: chi subisce, da quale attacco (il campo sta sull'attaccante di casa).
      difDen[h] += p.w * att[a];
      difDen[a] += p.w * att[h] * campo;
      // Fattore campo: gol di casa attesi senza il campo.
      campoDen += p.w * att[h] * dif[a];
    }

    // Passo smorzato: nuovo = vecchio^(1-η) · candidato^η.
    const smorza = (vecchio, candidato) =>
      Math.pow(vecchio, 1 - eta) * Math.pow(candidato, eta);

    let delta = 0;
    const nuovoAtt = new Array(n), nuovoDif = new Array(n);
    for (let i = 0; i < n; i++) {
      // Se una squadra non ha ancora segnato (o subito) nella storia pesata, il
      // candidato sarebbe 0 e manderebbe la media geometrica a NaN. Succede con
      // squadre a pochissimi dati (inizio del walk-forward, neopromosse): si
      // tiene il valore precedente finché non arriva informazione.
      nuovoAtt[i] = attDen[i] > 0 && segnati[i] > 0 ? smorza(att[i], segnati[i] / attDen[i]) : att[i];
      nuovoDif[i] = difDen[i] > 0 && subiti[i] > 0 ? smorza(dif[i], subiti[i] / difDen[i]) : dif[i];
    }
    const nuovoCampo = campoDen > 0 ? smorza(campo, golCasaTot / campoDen) : campo;

    // Riancoraggio: media geometrica degli attacchi = 1, difese compensate.
    const g = geomean(nuovoAtt);
    for (let i = 0; i < n; i++) {
      // Banda di sicurezza: una squadra con pochissimi dati (es. 1 partita) può
      // vedere il rating esplodere e, oltre a rendere assurda la sua previsione,
      // contamina gli avversari di quella partita. Le squadre vere stanno fra
      // ~0.3 e ~2.6, quindi questa banda non le tocca mai: blocca solo i casi
      // degeneri. Chi predice quelle squadre va comunque escluso a monte.
      nuovoAtt[i] = Math.min(25, Math.max(0.02, nuovoAtt[i] / g));
      nuovoDif[i] = Math.min(25, Math.max(0.02, nuovoDif[i] * g));
      delta = Math.max(delta, Math.abs(Math.log(nuovoAtt[i] / att[i])),
                              Math.abs(Math.log(nuovoDif[i] / dif[i])));
    }
    delta = Math.max(delta, Math.abs(Math.log(nuovoCampo / campo)));

    att = nuovoAtt; dif = nuovoDif; campo = nuovoCampo;
    if (delta < tol) { iterazioni++; break; }
  }

  // Stima di ρ tenendo fisso il resto: solo i punteggi bassi contribuiscono.
  const rho = stimaRho(pesate, idx, att, dif, campo);

  const attacco = {}, difesa = {};
  for (let i = 0; i < n; i++) { attacco[squadre[i]] = att[i]; difesa[squadre[i]] = dif[i]; }

  return { attacco, difesa, fattoreCampo: campo, rho, squadre, iterazioni, xi, dataRiferimento };
}

// Ricerca 1-D di ρ che massimizza la verosimiglianza sui punteggi bassi. La
// parte della log-verosimiglianza che dipende da ρ è solo Σ w·log τ(x,y).
function stimaRho(pesate, idx, att, dif, campo) {
  const bassi = [];
  for (const p of pesate) {
    if (p.golCasa <= 1 && p.golTrasferta <= 1) {
      const h = idx.get(p.casa), a = idx.get(p.trasferta);
      bassi.push({
        x: p.golCasa, y: p.golTrasferta, w: p.w,
        lambda: att[h] * dif[a] * campo,
        mu: att[a] * dif[h],
      });
    }
  }
  // Con pochissime partite a punteggio basso la correlazione non è stimabile: è
  // rumore, e (peggio) può spingere la ricerca fuori scala. Meglio ρ=0.
  if (bassi.length < 20) return 0;

  const logVeros = rho => {
    let s = 0;
    for (const b of bassi) {
      const t = tau(b.x, b.y, b.lambda, b.mu, rho);
      if (t <= 0) return -Infinity; // ρ non ammissibile: rende una probabilità negativa
      s += b.w * Math.log(t);
    }
    return s;
  };

  // Griglia grezza poi raffinamento attorno al migliore. ρ è vincolato a [-0.2,
  // 0.2]: la correzione di Dixon-Coles è piccola, e vincolarlo evita che una
  // verosimiglianza monotòna (poche partite) mandi la stima all'infinito.
  let best = 0, bestV = -Infinity;
  for (let r = -0.2; r <= 0.2 + 1e-9; r += 0.005) {
    const v = logVeros(r);
    if (v > bestV) { bestV = v; best = r; }
  }
  // I limiti del raffinamento vanno FISSATI prima del ciclo: usare `best` nella
  // condizione mentre lo si aggiorna dentro fa inseguire al ciclo il proprio
  // bersaglio e non termina mai (bug trovato col modello sui tiri).
  const lo = best - 0.005, hi = best + 0.005;
  for (let r = lo; r <= hi + 1e-9; r += 0.0002) {
    const v = logVeros(r);
    if (v > bestV) { bestV = v; best = r; }
  }
  return best;
}

/**
 * Matrice dei punteggi P(x,y) per una singola partita, già normalizzata (la
 * correzione τ fa sì che la somma grezza non faccia esattamente 1).
 */
// Matrice dei punteggi a partire direttamente dalle medie attese di gol delle
// due squadre. Separata da matricePunteggi così i modelli che calcolano λ e μ in
// altro modo (es. il misto, che fonde gol e tiri) possono riusarla.
export function matriceDaMedie(lambda, mu, rho, maxGol = 10) {
  const pc = [], po = [];
  for (let k = 0; k <= maxGol; k++) { pc[k] = poisson(k, lambda); po[k] = poisson(k, mu); }

  const M = [];
  let somma = 0;
  for (let x = 0; x <= maxGol; x++) {
    M[x] = [];
    for (let y = 0; y <= maxGol; y++) {
      const p = tau(x, y, lambda, mu, rho) * pc[x] * po[y];
      M[x][y] = p;
      somma += p;
    }
  }
  for (let x = 0; x <= maxGol; x++)
    for (let y = 0; y <= maxGol; y++) M[x][y] /= somma;

  return { M, lambda, mu };
}

// Aggrega la matrice nei mercati: 1X2 e Over/Under 2.5.
export function esitiDaMatrice(M, maxGol = 10) {
  let pCasa = 0, pPareggio = 0, pOspite = 0, pOver25 = 0, pUnder25 = 0;
  for (let x = 0; x <= maxGol; x++) {
    for (let y = 0; y <= maxGol; y++) {
      const p = M[x][y];
      if (x > y) pCasa += p; else if (x < y) pOspite += p; else pPareggio += p;
      if (x + y >= 3) pOver25 += p; else pUnder25 += p;
    }
  }
  return { pCasa, pPareggio, pOspite, pOver25, pUnder25 };
}

export function matricePunteggi(attCasa, difCasa, attOspite, difOspite, campo, rho, maxGol = 10, scala = 1) {
  // `scala` converte una previsione fatta in un'unità diversa dai gol (es. tiri
  // in porta) in gol attesi, moltiplicando entrambe le medie. Con scala=1 il
  // modello lavora direttamente sui gol.
  const lambda = attCasa * difOspite * campo * scala;
  const mu = attOspite * difCasa * scala;
  return matriceDaMedie(lambda, mu, rho, maxGol);
}

/**
 * Probabilità di mercato per una partita, dal modello già stimato.
 * @returns {Object} { pCasa, pPareggio, pOspite, pOver25, pUnder25, lambda, mu }
 */
export function prevedi(modello, casa, ospite, opts = {}) {
  const { attacco, difesa, fattoreCampo } = modello;
  const maxGol = opts.maxGol ?? 10;
  const scala = opts.scala ?? modello.scala ?? 1;   // conversione tiri→gol se serve
  const rho = opts.rho ?? modello.rho ?? 0;          // override per i modelli non-gol
  for (const [ruolo, sq] of [['casa', casa], ['ospite', ospite]]) {
    if (!(sq in attacco)) throw new Error(`prevedi: squadra ${ruolo} sconosciuta al modello: "${sq}"`);
  }

  const { M, lambda, mu } = matricePunteggi(
    attacco[casa], difesa[casa], attacco[ospite], difesa[ospite], fattoreCampo, rho, maxGol, scala);
  return { ...esitiDaMatrice(M, maxGol), lambda, mu };
}

// Medie attese di gol per una partita, senza costruire la matrice. Serve al
// modello misto per fondere le medie di due modelli diversi.
export function mediaAttesa(modello, casa, ospite) {
  const { attacco, difesa, fattoreCampo } = modello;
  const scala = modello.scala ?? 1;
  return {
    lambda: attacco[casa] * difesa[ospite] * fattoreCampo * scala,
    mu: attacco[ospite] * difesa[casa] * scala,
  };
}
