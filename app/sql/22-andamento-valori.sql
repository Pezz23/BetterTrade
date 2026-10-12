-- ANDAMENTO: ogni riga porta tutti e quattro i valori, non solo il suo.
--
-- ⚠️ **Perché**: Mattia (12/10/2026) — *"quando clicco Voto, nelle partite
-- vorrei vedere gli altri 3 valori, per capire quali indicatori mi avrebbero
-- allertato"*. Con la sola colonna `valore` la domanda non è rispondibile: la
-- riga scelta dal voto non sa quanto diceva VPM su quella partita.
--
-- ⚠️ Serve anche al **gruppo delle quattro spunte verdi**: le partite in cui
-- tutti e quattro gli indicatori stanno sopra la loro soglia. Senza i quattro
-- valori sulla stessa riga bisognerebbe incrociare quattro liste.

alter table public.andamento add column if not exists att  numeric;
alter table public.andamento add column if not exists vpm  numeric;
alter table public.andamento add column if not exists voto numeric;
alter table public.andamento add column if not exists resa numeric;

-- `valore` diventa un doppione di una delle quattro: si toglie, perché due
-- posti per lo stesso numero è il difetto che prima o poi li fa divergere.
alter table public.andamento drop column if exists valore;
