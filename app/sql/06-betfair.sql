-- Quote di Betfair Exchange nell'archivio.
--
-- Perché serve: football-data ha smesso di pubblicare Pinnacle. Le colonne
-- PSCH/PSCD/PSCA esistevano fino alla stagione 25/26 e non ci sono più nella
-- 26/27 — e già nella 25/26 coprivano meno della metà delle partite. Pinnacle
-- era il riferimento "affilato", il prezzo più vicino a quello vero.
--
-- Al suo posto c'è Betfair Exchange, presente dalla stagione 24/25. È un
-- exchange: il prezzo che le persone si scambiano davvero, senza il margine del
-- banco sopra. Come riferimento è almeno altrettanto buono.
--
-- Le stagioni 24/25 e 25/26 hanno ENTRAMBI, quindi il passaggio si può
-- calibrare sui dati invece che subirlo.
--
-- Si prendono le quote di CHIUSURA (BFEC*), le stesse che si prendevano da
-- Pinnacle: sono il prezzo finale, quello che incorpora tutte le informazioni.
-- La quota che si gioca davvero resta quella di apertura di Bet365 (b365_*),
-- che c'è già.

alter table public.partite
  add column if not exists bfe_1 real,
  add column if not exists bfe_x real,
  add column if not exists bfe_2 real,
  add column if not exists bfe_over25 real,
  add column if not exists bfe_under25 real;

comment on column public.partite.bfe_1 is
  'Betfair Exchange, quota di chiusura 1. Dalla stagione 24/25. Sostituisce ps_1, che football-data non pubblica più dalla 26/27.';
