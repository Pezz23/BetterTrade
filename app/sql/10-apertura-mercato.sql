-- Media e massima di mercato di APERTURA nello storico.
--
-- ── Perché ──────────────────────────────────────────────────────────────────
-- La misura del 16/09 ha mostrato che l'unico riferimento onesto disponibile,
-- l'exchange di apertura, è sottile: il suo rumore si confonde col segnale, e
-- alzando la soglia di scarto il rendimento peggiora invece di migliorare.
--
-- Serve un secondo riferimento di apertura. La media di mercato (~40 book) è
-- più stabile dell'exchange e nei CSV esiste dal 2019/20 — otto stagioni contro
-- le tre dell'exchange. La massima è la migliore quota sul mercato: dice se
-- Bet365 è generoso anche rispetto ai concorrenti.
--
-- ── I nomi ──────────────────────────────────────────────────────────────────
-- avg_* e max_* già presenti sono di CHIUSURA (AvgC*, MaxC*). Le nuove sono di
-- APERTURA e si chiamano avg_ap_*, max_ap_*: stessi nomi di prossime_partite,
-- dove tutte le quote sono di apertura. Un nome uguale con significato diverso
-- è la trappola già vista sull'exchange.
--
-- Dopo: cd btscout && node --env-file=.env scripts/import-storico.js --stagioni=1920,2021,2122,2223,2324,2425,2526,2627

alter table public.partite
  add column if not exists avg_ap_1 real,
  add column if not exists avg_ap_x real,
  add column if not exists avg_ap_2 real,
  add column if not exists max_ap_1 real,
  add column if not exists max_ap_x real,
  add column if not exists max_ap_2 real,
  add column if not exists avg_ap_over25 real,
  add column if not exists avg_ap_under25 real,
  add column if not exists max_ap_over25 real,
  add column if not exists max_ap_under25 real;

comment on column public.partite.avg_ap_1 is
  'Media di mercato (~40 book), quota di APERTURA 1. Secondo riferimento onesto accanto a bfe_ap_1: più stabile dell''exchange, dal 2019/20. avg_1 è la CHIUSURA.';
comment on column public.partite.max_ap_1 is
  'Migliore quota sul mercato all''APERTURA, segno 1. Dice se Bet365 è generoso anche rispetto ai concorrenti. max_1 è la CHIUSURA.';
