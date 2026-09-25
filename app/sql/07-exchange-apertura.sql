-- Quote Betfair Exchange di APERTURA, e nomi che dicono quale sono.
--
-- ── Perché ──────────────────────────────────────────────────────────────────
-- Il criterio del progetto è riconoscere le quote più alte di quanto dovrebbero
-- essere. Serve un prezzo di riferimento da confrontare con quello di Bet365.
--
-- Il riferimento è Betfair Exchange. Ma ci sono due prezzi exchange per ogni
-- partita, e sceglierne uno a caso rovina la misura:
--
--   APERTURA  — il prezzo quando il mercato si apre, giorni prima.
--               È quello che esiste NEL MOMENTO IN CUI SI GIOCA.
--   CHIUSURA  — il prezzo all'ultimo istante, appena prima del fischio.
--               È il più accurato, ma al momento della giocata NON ESISTE ANCORA.
--
-- Misurare un segnale contro la chiusura significa dire "avrei guadagnato usando
-- un'informazione che non avevo". Il confronto onesto è:
--
--     b365_1 (Bet365 apertura)  contro  bfe_ap_1 (exchange apertura)
--
-- ── Cosa fa questo script ───────────────────────────────────────────────────
-- 1. Rinomina le colonne exchange esistenti da bfe_* a bfe_ch_*, perché erano
--    la CHIUSURA e il nome non lo diceva.
-- 2. Aggiunge le colonne di APERTURA, bfe_ap_*.
--
-- Le colonne nuove restano vuote finché non si rilancia l'import:
--   cd btscout && node --env-file=.env scripts/import-storico.js --stagioni=2425,2526,2627
--
-- ── Copertura attesa ────────────────────────────────────────────────────────
-- L'exchange esiste su football-data solo dalla stagione 2024/25. Le stagioni
-- precedenti resteranno vuote: è un limite della fonte, non un errore.

-- 1. I nomi dicono quale prezzo sono.
alter table public.partite rename column bfe_1       to bfe_ch_1;
alter table public.partite rename column bfe_x       to bfe_ch_x;
alter table public.partite rename column bfe_2       to bfe_ch_2;
alter table public.partite rename column bfe_over25  to bfe_ch_over25;
alter table public.partite rename column bfe_under25 to bfe_ch_under25;

-- 2. Le quote di apertura: quelle che esistono quando si gioca.
alter table public.partite
  add column if not exists bfe_ap_1       real,
  add column if not exists bfe_ap_x       real,
  add column if not exists bfe_ap_2       real,
  add column if not exists bfe_ap_over25  real,
  add column if not exists bfe_ap_under25 real;

comment on column public.partite.bfe_ap_1 is
  'Betfair Exchange, quota di APERTURA 1. È il riferimento onesto: esiste nel momento in cui si gioca. Dalla stagione 24/25.';
comment on column public.partite.bfe_ch_1 is
  'Betfair Exchange, quota di CHIUSURA 1. Più accurata ma NON disponibile al momento della giocata: usarla per misurare un segnale è barare col senno di poi. Dalla stagione 24/25.';
