-- 🎟️ BET BUILDER — con quali filtri è stata costruita (22/10/2026)
--
-- Mattia: *"riusciamo a tracciare anche con quali filtri è stata costruita?"*.
-- Sì, ed è la metà che mancava al registro: `criterio` diceva **come** si
-- ordinavano le candidate, ma non **da quali partite** si pescava. Due
-- schedine «per voto» da due filtri diversi sono due esperimenti diversi, e
-- senza questa colonna l'archivio non saprebbe distinguerli.
--
-- ⚠️ `jsonb` e non quattro colonne: i filtri cambiano (ieri è entrata «quota
-- gamba»), e una migrazione per ogni manopola non è sostenibile. In cambio chi
-- legge deve reggere una chiave che non c'è — stessa regola di `preferenze`.
-- ⚠️ `add column if not exists`, mai dentro la `create table` già applicata.

alter table public.schedine add column if not exists filtri jsonb;
