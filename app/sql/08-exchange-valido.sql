-- Una colonna che dice se l'exchange di apertura è un prezzo vero.
--
-- ── Il problema ─────────────────────────────────────────────────────────────
-- All'apertura del mercato, quando nessuno ha ancora piazzato un'offerta,
-- Betfair mostra valori segnaposto: 1.02 / 1.01 / 1.01. Le tre probabilità
-- implicite sommano a ~2.9 invece che a ~1.03. NON sono prezzi: sono l'assenza
-- di un mercato. Nell'archivio ce ne sono 370 su 10.789 (3,4%).
--
-- Confrontare Bet365 con quei valori produce "valore" inesistente: il +163% che
-- era saltato fuori l'11 settembre era esattamente questo.
--
-- ── Perché una colonna e non un filtro nelle query ──────────────────────────
-- Un filtro va ricordato ogni volta, e fra un mese qualcuno lo dimenticherà.
-- Una colonna calcolata dal database è sempre vera, si vede leggendo la
-- tabella, e si usa con un semplice `where bfe_ap_valido`.
--
-- È GENERATED: Postgres la ricalcola da solo a ogni insert e update. Non si
-- scrive mai a mano e non può andare fuori sincrono con le quote.
--
-- ── La soglia ───────────────────────────────────────────────────────────────
-- Somma delle probabilità implicite fra 0.90 e 1.30. L'apertura reale sta fra
-- 1.02 e 1.15; i mercati vuoti partono da 1.30 in su. Sotto 0.90 sarebbe un
-- arbitraggio impossibile, cioè un errore della fonte.

alter table public.partite
  add column if not exists bfe_ap_valido boolean
  generated always as (
    bfe_ap_1 is not null and bfe_ap_x is not null and bfe_ap_2 is not null
    and (1.0 / bfe_ap_1 + 1.0 / bfe_ap_x + 1.0 / bfe_ap_2) between 0.90 and 1.30
  ) stored;

comment on column public.partite.bfe_ap_valido is
  'TRUE se le quote exchange di apertura sono un prezzo reale (margine implicito fra 0.90 e 1.30). FALSE = mercato vuoto o dato anomalo: escludere da ogni confronto con Bet365. Calcolata dal database, non si scrive.';

create index if not exists partite_bfe_ap_valido_idx on public.partite (bfe_ap_valido) where bfe_ap_valido;
