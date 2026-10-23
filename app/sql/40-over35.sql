-- La linea OVER/UNDER 3,5 di apertura, che ci arriva già e buttavamo via.
--
-- ⚠️⚠️ **Non è un dato nuovo da andare a prendere: è un dato che scartavamo.**
-- The Odds API manda la linea principale di **ogni** bookmaker, non la 2,5:
-- misurato su 2.227 quote, era la 2,5 nel 67% dei casi e la **3,5 nel 23%**.
-- `importa-prossime-odds.js` teneva solo `point === 2.5` e gettava il resto.
-- Quindi queste colonne costano **zero crediti**: stessa chiamata di prima.
--
-- ⚠️ **Perché proprio la 3,5.** Il consiglio over/under sceglie la soglia più
-- ambiziosa che regge, e sulle 245 partite in calendario il 23/10/2026 diceva
-- `OVER 1,5` 149 volte, **`UNDER 3,5` 50** e `OVER 2,5` 46. Il 2,5 è il
-- numero migliore del progetto (dal 64,8% al 71,2% di volte giuste) **proprio
-- perché usa il mercato**: l'under 3,5 è il secondo consiglio più frequente e
-- il mercato, per un quarto delle partite, ce l'avremmo.
--
-- ⚠️⚠️ **Solo in `prossime_partite`, e non in `partite`.** Nell'archivio le
-- quote vengono dai CSV di football-data, che la linea 3,5 **non la pubblica**:
-- una colonna là resterebbe vuota per sempre. Per misurare se questo mercato
-- vale si unirà `prossime_partite` a `partite` sulla chiave della partita —
-- le righe passate non si cancellano, ed è esattamente perché servono a questo.
--
-- ⚠️ `if not exists`: `create table` non aggiunge colonne a una tabella che
-- esiste già, ed è la trappola numero undici di questo progetto.

alter table public.prossime_partite
  add column if not exists avg_ap_over35  real,
  add column if not exists avg_ap_under35 real,
  add column if not exists max_ap_over35  real,
  add column if not exists max_ap_under35 real;

comment on column public.prossime_partite.avg_ap_over35 is
  'Media di mercato (eu) della linea OVER 3,5 di apertura. Arriva da The Odds API insieme alla 2,5: ogni book quota la SUA linea, e la 3,5 è la principale per il 23% di loro. NULL quando meno di tre book quotano quella linea.';
comment on column public.prossime_partite.max_ap_over35 is
  'Migliore quota di mercato sulla linea OVER 3,5 di apertura.';
