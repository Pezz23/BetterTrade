-- 📈 ANDAMENTO — via `partite_valutate` (28/10/2026)
--
-- Creata e tolta lo stesso giorno, mai usata da una versione pubblicata.
-- Serviva all'esportazione delle card quando `andamento` teneva solo le
-- prime 15 partite di ogni giorno. Mattia: *"dimentica l'idea delle prime 15
-- della giornata: voglio tutte le partite con quei filtri, sia nel csv sia
-- nella pagina; tieni le prime 36 del weekend"*. Da allora `andamento` tiene
-- **tutte** le partite del giorno (`calcola-andamento.js`), e la tabella a
-- parte sarebbe stata una seconda copia dello stesso elenco.

drop table if exists public.partite_valutate;
