// Le sigle dei campionati come le vuole leggere Mattia (23/09/2026).
//
// ⚠️ Nel database la colonna `div` resta quella di football-data — `I1`, `E0`,
// `SC0` — perché è la chiave dei dati: sta in tutte le 53.951 righe
// dell'archivio, nei file scaricati e negli script di import. Rinominarla
// spaccherebbe l'aggiornamento. Qui si cambia **solo quello che si vede**.
//
// Se football-data aggiunge un campionato, va aggiunto anche qui: senza, la
// pagina mostra la sigla originale, che è brutta ma non rompe niente.

const SIGLE = {
  E0: 'ENG1', E1: 'ENG2',
  I1: 'ITA1', I2: 'ITA2',
  SP1: 'ESP1', SP2: 'ESP2',
  D1: 'GER1', D2: 'GER2',
  F1: 'FRA1', F2: 'FRA2',
  P1: 'POR1',
  N1: 'NED1',
  T1: 'TUR1',
  B1: 'BEL1',
  SC0: 'SCO1',
}

const NOMI = {
  E0: 'Premier League', E1: 'Championship',
  I1: 'Serie A', I2: 'Serie B',
  SP1: 'Liga', SP2: 'Liga 2',
  D1: 'Bundesliga', D2: '2. Bundesliga',
  F1: 'Ligue 1', F2: 'Ligue 2',
  P1: 'Primeira Liga',
  N1: 'Eredivisie',
  T1: 'Süper Lig',
  B1: 'Pro League',
  SC0: 'Premiership',
}

/** ITA1 da I1. Se non la conosciamo, torna la sigla originale. */
export const sigla = div => SIGLE[div] || div

/** "ITA1 – Serie A", per i menu a tendina. */
export const etichetta = (div, nome) => `${sigla(div)} – ${nome || NOMI[div] || div}`

export const nome = div => NOMI[div] || div
