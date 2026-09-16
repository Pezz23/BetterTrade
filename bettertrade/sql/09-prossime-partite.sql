-- Le partite future: cosa si gioca e a che quota, PRIMA che si giochi.
--
-- ── Perché una tabella separata dallo storico ───────────────────────────────
-- `partite` contiene solo partite giocate, con il risultato. Queste non hanno
-- ancora un risultato e le loro quote hanno un altro significato: sono quelle
-- disponibili nel momento in cui si sceglie, non quelle di chiusura.
-- Mescolarle nella stessa tabella costringerebbe ogni query a distinguerle.
--
-- ── Fonte ───────────────────────────────────────────────────────────────────
-- https://football-data.co.uk/fixtures.csv — verificato il 10/09/2026.
-- Non è una finestra di 7 giorni: è IL PROSSIMO BLOCCO di partite, sostituito
-- ogni volta. Quote raccolte il venerdì pomeriggio (weekend) e il martedì
-- (infrasettimanale). Si scarica due volte a settimana e si accumula qui.
--
-- ── Non si cancella mai niente ──────────────────────────────────────────────
-- Ogni riga è la fotografia delle quote nel momento in cui si poteva giocare,
-- con l'istante del download. Quando la partita si gioca entra in `partite`
-- dall'import normale, ma qui resta cosa vedevamo prima. Fra mesi sarà il modo
-- per verificare se il criterio funzionava davvero, senza senno di poi.
-- L'app legge `where data >= current_date`.
--
-- ── Nomi delle colonne ──────────────────────────────────────────────────────
-- Stessi nomi di `partite` DOVE il significato coincide: b365_* e bfe_ap_* sono
-- quote di apertura in entrambe. Media e massima qui sono di apertura, mentre
-- in `partite` sono di chiusura: quindi si chiamano avg_ap_* e max_ap_*, non
-- avg_* — un nome uguale con un significato diverso è una trappola.

create table if not exists public.prossime_partite (
  id            bigint generated always as identity primary key,

  -- Identità
  div           text not null,
  campionato    text not null,
  data          date not null,
  ora           time,
  casa          text not null,
  trasferta     text not null,

  -- Quando l'abbiamo vista: la fotografia ha senso solo con l'istante
  scaricato_il  timestamptz not null default now(),

  -- Quote 1X2, tutte di apertura
  b365_1     real, b365_x     real, b365_2     real,   -- quella che si gioca
  bfe_ap_1   real, bfe_ap_x   real, bfe_ap_2   real,   -- il riferimento
  avg_ap_1   real, avg_ap_x   real, avg_ap_2   real,   -- media di mercato
  max_ap_1   real, max_ap_x   real, max_ap_2   real,   -- migliore sul mercato

  -- Over/Under 2.5, apertura
  b365_over25   real, b365_under25   real,
  bfe_ap_over25 real, bfe_ap_under25 real,
  avg_ap_over25 real, avg_ap_under25 real,
  max_ap_over25 real, max_ap_under25 real,

  -- Stessa regola di `partite`: TRUE solo se l'exchange è un prezzo reale e non
  -- il segnaposto di un mercato vuoto (1.02/1.01/1.01). Calcolata dal database.
  bfe_ap_valido boolean generated always as (
    bfe_ap_1 is not null and bfe_ap_x is not null and bfe_ap_2 is not null
    and (1.0 / bfe_ap_1 + 1.0 / bfe_ap_x + 1.0 / bfe_ap_2) between 0.90 and 1.30
  ) stored,

  -- La stessa partita entra una volta sola: rilanciare l'import aggiorna le
  -- quote e l'istante, non duplica.
  unique (div, data, casa, trasferta)
);

create index if not exists prossime_data_idx on public.prossime_partite (data);
create index if not exists prossime_div_idx  on public.prossime_partite (div, data);

comment on table public.prossime_partite is
  'Partite non ancora giocate con le quote disponibili al momento della scelta. Fonte: football-data fixtures.csv, due volte a settimana. Non si cancella mai: è la fotografia di cosa si vedeva prima. L''app legge where data >= current_date.';
comment on column public.prossime_partite.scaricato_il is
  'Istante del download. Le quote sono quelle di quel momento, non di ora.';

-- ── Permessi ────────────────────────────────────────────────────────────────
alter table public.prossime_partite enable row level security;

drop policy if exists prossime_select on public.prossime_partite;
create policy prossime_select on public.prossime_partite
  for select to authenticated using (true);
-- Nessuna policy di scrittura: scrive solo lo script con la service_role.
