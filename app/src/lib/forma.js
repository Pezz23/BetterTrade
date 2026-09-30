// Gli ultimi 5 di una squadra, pronti da mostrare.
//
// Calcolo puro, senza React né database: sta qui e non nell'hook così si può
// provare da terminale sui dati veri (vedi la convenzione in CLAUDE.md).

// Ultimi 5 di una squadra, dalla più vecchia alla più recente come si legge
// una striscia, con l'over/under 2,5 della stessa partita.
export function striscia(lista = [], squadra) {
  return [...lista].reverse().map(m => {
    const inCasa = m.casa === squadra
    return {
      ...m,
      over: m.gol_casa + m.gol_trasferta > 2.5,
      inCasa,
      avversario: inCasa ? m.trasferta : m.casa,
      // I gol nell'ordine giusto per chi legge: prima i suoi.
      gf: inCasa ? m.gol_casa : m.gol_trasferta,
      gs: inCasa ? m.gol_trasferta : m.gol_casa,
      giorno: `${String(m.data).slice(8, 10)}/${String(m.data).slice(5, 7)}`,
      titolo: `${String(m.data).slice(8, 10)}/${String(m.data).slice(5, 7)} · ${m.casa} ${m.gol_casa}–${m.gol_trasferta} ${m.trasferta}`,
    }
  })
}
