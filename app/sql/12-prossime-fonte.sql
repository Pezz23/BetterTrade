-- Da quale fonte arriva ogni partita futura.
--
-- Da oggi le fonti sono due: football-data (fixtures.csv, il prossimo blocco,
-- con Bet365) e The Odds API (tre-quattro settimane in anticipo, senza Bet365
-- ma con 40+ bookmaker). La stessa partita può arrivare da entrambe: la seconda
-- aggiorna le quote che ha e lascia stare quelle che non ha. Sapere da dove
-- viene l'ultima fotografia serve a leggere le differenze.

alter table public.prossime_partite
  add column if not exists fonte text;

comment on column public.prossime_partite.fonte is
  'Chi ha scritto l''ultima fotografia: football-data oppure odds-api. Le due si integrano sulla stessa riga.';
