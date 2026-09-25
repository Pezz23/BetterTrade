-- FASE 1 — La tabella dell'archivio partite su Supabase.
--
-- Ricalca lo schema che l'archivio ha su Neon (btscout/scripts/import-storico.js),
-- con due aggiunte: le policy RLS, che su Neon non servivano perché ci arrivavano
-- solo gli script, e qui invece decidono chi può leggere.
--
-- 38.613 righe, 38 colonne, ~25 MB. Sta nel free tier senza problemi.
--
-- Le colonne delle quote sono tutte opzionali: le stagioni vecchie non hanno le
-- medie di chiusura, e dal 2025/26 Pinnacle copre solo metà partite. Un NULL qui
-- significa "quota non disponibile", non "zero".

create table if not exists public.partite (
  id            bigint generated always as identity primary key,

  -- Identità della partita
  div           text not null,          -- codice campionato: E0, I1, SP1…
  campionato    text not null,          -- nome leggibile
  stagione      text not null,          -- '2425', '2526'…
  data          date not null,
  casa          text not null,
  trasferta     text not null,

  -- Esito
  gol_casa      int  not null,
  gol_trasferta int  not null,
  esito         char(1) not null,       -- 'H' casa, 'D' pareggio, 'A' trasferta

  -- Statistiche di gioco
  tiri_casa     int, tiri_trasf   int,
  tirip_casa    int, tirip_trasf  int,  -- tiri in porta
  angoli_casa   int, angoli_trasf int,
  gialli_casa   int, gialli_trasf int,
  rossi_casa    int, rossi_trasf  int,
  gol1t_casa    int, gol1t_trasf  int,  -- gol del primo tempo

  -- Quote 1X2
  ps_1   real, ps_x   real, ps_2   real,   -- Pinnacle, chiusura (la più affilata)
  avg_1  real, avg_x  real, avg_2  real,   -- media di mercato, chiusura
  max_1  real, max_x  real, max_2  real,   -- migliore di ~40 book, chiusura
  b365_1 real, b365_x real, b365_2 real,   -- Bet365, apertura (quota che prendi davvero)

  -- Quote Over/Under 2.5
  avg_over25   real, avg_under25   real,   -- media, chiusura
  b365_over25  real, b365_under25  real,   -- Bet365, apertura

  -- La stessa partita non può entrare due volte: rende l'import ripetibile.
  unique (div, stagione, data, casa, trasferta)
);

create index if not exists partite_data_idx    on public.partite (data);
create index if not exists partite_squadre_idx on public.partite (div, casa, trasferta);
create index if not exists partite_stagione_idx on public.partite (div, stagione);

comment on table public.partite is
  'Archivio storico: solo partite già giocate. Il calendario delle partite future è un''altra cosa e non sta qui.';

-- ── Permessi ────────────────────────────────────────────────────────────────
-- Lettura a chi ha fatto login. Nessuna policy di scrittura: a scrivere è solo
-- lo script di import, che usa la service_role e le policy le ignora.
alter table public.partite enable row level security;

drop policy if exists partite_select on public.partite;
create policy partite_select on public.partite
  for select to authenticated using (true);
