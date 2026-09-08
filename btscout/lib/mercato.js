// Matematica delle quote — sola matematica, nessuna dipendenza.
//
// Le quote NON sono probabilità: contengono il margine del bookmaker (vig). Le
// probabilità implicite grezze (1/quota) di una partita sommano a ~1.03-1.07,
// non a 1. Chi confronta le quote grezze col proprio modello trova "valore"
// ovunque — sta solo misurando la commissione del banco. Va tolto SEMPRE prima
// di confrontare probabilità con probabilità. Vedi CLAUDE.md, trappola #1.

// Probabilità implicite grezze e overround (la somma, = 1 + margine).
export function implicite(quote) {
  const p = quote.map(q => 1 / q);
  const overround = p.reduce((s, x) => s + x, 0);
  return { p, overround };
}

/**
 * Toglie il margine e restituisce probabilità eque che sommano a 1.
 *
 * @param {number[]} quote  quote decimali (2 o 3 esiti)
 * @param {string} metodo   'proporzionale' (default) | 'shin'
 *
 * 'proporzionale': divide ogni probabilità implicita per l'overround. Assume che
 *   il margine sia spalmato in proporzione — semplice, lo standard di partenza.
 * 'shin': stima una quota di scommettitori informati e corregge la distorsione
 *   favoriti/outsider (il margine pesa di più sugli outsider). Più corretto quando
 *   le quote sono molto sbilanciate; da usare se il proporzionale è al limite.
 */
export function togliMargine(quote, metodo = 'proporzionale') {
  const { p, overround } = implicite(quote);

  if (metodo === 'proporzionale') {
    return p.map(x => x / overround);
  }

  if (metodo === 'shin') {
    // z = quota di volume da scommettitori informati (Shin 1992). Le probabilità
    // eque sono p_eq_i = (√(z² + 4(1−z)·p_i²/overround) − z) / (2(1−z)), e z è
    // scelto perché sommino a 1. La somma decresce in modo monotòno da √overround
    // (a z=0) verso il basso: bisezione su z ∈ [0, 0.5].
    const eqCon = z => p.map(pi =>
      (Math.sqrt(z * z + 4 * (1 - z) * (pi * pi) / overround) - z) / (2 * (1 - z)));
    const sommaCon = z => eqCon(z).reduce((s, x) => s + x, 0);

    let lo = 0, hi = 0.5;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (lo + hi) / 2;
      if (sommaCon(mid) > 1) lo = mid; else hi = mid;
    }
    return eqCon((lo + hi) / 2);
  }

  throw new Error(`togliMargine: metodo sconosciuto "${metodo}"`);
}

/**
 * Margine atteso di una scommessa a quota lorda, secondo la probabilità del
 * modello: edge = p_modello · quota − 1. Positivo = valore atteso positivo a
 * quella quota. NB: usa la quota LORDA, non quella depurata — è quella che
 * incassi davvero. Il margine del banco è già dentro (la quota lorda è più bassa
 * di quella equa), quindi il modello deve superarlo per mostrare edge positivo.
 */
export function edge(pModello, quota) {
  return pModello * quota - 1;
}
