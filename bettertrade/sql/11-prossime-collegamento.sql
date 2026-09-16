-- Il collegamento fra una partita futura e la stessa partita una volta giocata.
--
-- ── Come funziona il passaggio da futuro a storico ──────────────────────────
-- Non si "sposta" niente. Quando una partita si gioca, entra in `partite`
-- dall'import settimanale dello storico, con il risultato e le quote registrate
-- da football-data. La riga in `prossime_partite` resta com'era — la fotografia
-- di cosa si vedeva prima — e riceve solo un puntatore alla riga dello storico.
--
-- Così ogni partita futura, una volta giocata, sa:
--   · il risultato                          → partite.esito
--   · le quote che football-data ha registrato come apertura → partite.b365_*
--   · le quote che NOI avevamo visto al download → prossime_partite.b365_*
-- Il confronto fra le ultime due dice se la fotografia era fedele.
--
-- Il collegamento lo fa scripts/riconcilia-prossime.js, cercando in `partite`
-- la riga con stesso campionato, data e squadre. Se la partita è stata
-- rinviata, la data non coincide: lo script cerca anche nei giorni vicini.

alter table public.prossime_partite
  add column if not exists partita_id bigint references public.partite(id) on delete set null,
  add column if not exists riconciliata_il timestamptz;

create index if not exists prossime_partita_id_idx on public.prossime_partite (partita_id);

comment on column public.prossime_partite.partita_id is
  'La riga di `partite` che corrisponde a questa partita, una volta giocata. NULL finché non si gioca o finché lo storico non è aggiornato. Lo imposta scripts/riconcilia-prossime.js.';
comment on column public.prossime_partite.riconciliata_il is
  'Quando è stato fatto il collegamento.';
