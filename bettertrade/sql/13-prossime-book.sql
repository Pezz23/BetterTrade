-- Le quote del bookmaker di riferimento nelle partite future.
--
-- The Odds API non ha Bet365. Fra i bookmaker che espone, l'unico con licenza
-- italiana — quindi l'unico su cui si può davvero puntare dall'Italia — è
-- Codere. Scelto da Mattia il 16/09/2026: le differenze fra book italiani sono
-- di qualche centesimo, per scegliere QUALE partita giocare non cambia niente.
--
-- Il nome del book sta nella colonna `book`, non nel nome delle colonne: se un
-- giorno si cambia bookmaker, cambia un valore e non lo schema.
-- (Eseguito sulla dashboard il 16/09/2026; qui per memoria e per rifarlo.)

alter table public.prossime_partite
  add column if not exists book text,
  add column if not exists book_1 real,
  add column if not exists book_x real,
  add column if not exists book_2 real;
