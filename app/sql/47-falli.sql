-- I FALLI, accanto ai cartellini (29/10/2026).
--
-- ⚠️⚠️ **C'erano già e si buttavano via**, due volte: football-data li
-- pubblica (`HF`/`AF`) in tutti e quindici i campionati e in ogni stagione,
-- nello stesso file da cui leggiamo i cartellini; ESPN li manda
-- (`foulsCommitted`) in ogni riepilogo. Sono il meccanismo che produce il
-- giallo, e i cartellini sono il mercato dove il modello rende di più.
--
-- Solo la materia prima: se migliorino la previsione dei cartellini lo dice
-- la misura (`prova-conteggi.js`), non questa colonna.
alter table public.partite
  add column if not exists falli_casa  int,
  add column if not exists falli_trasf int;
