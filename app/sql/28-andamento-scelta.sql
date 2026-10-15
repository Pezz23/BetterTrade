-- ANDAMENTO: SCELTA al posto di RESA fra i quattro indicatori misurati.
--
-- ⚠️ **Perché.** La resa era già l'indicatore peggiore quando si guardava chi
-- *sceglie* meglio (51,2% di azzeccate contro il 60,3% dell'attendibilità), ed
-- è per questo che il 12/10/2026 la **scelta** le ha preso il posto nella barra
-- della partita. La pagina Andamento era rimasta indietro: misurava una cosa
-- che a schermo non c'è più. Mattia il 15/10: *"4 card con titolo VPM,
-- Attendibilità, Scelta, Voto"*.
--
-- ⚠️ **La resa NON è sparita dai dati**: la colonna `resa` resta su ogni riga,
-- perché ogni riga porta tutti i valori della partita e serve a chiedersi
-- "quale indicatore mi avrebbe allertato". Spariscono le righe **scelte dalla
-- resa** (`metodo = 'resa'`), che nessuna schermata legge più e che
-- `andamento_accordo` conterebbe come partite in gara.
--
-- ⚠️ `andamento` è una tabella **derivata**: si rifà da sola a ogni
-- importazione, e per intero con `calcola-andamento.js --stagioni=8 --esegui`.
-- Cancellare delle righe qui non perde niente che non si possa ricalcolare.

alter table public.andamento add column if not exists scelta numeric;

-- `metodo` ammette la scelta. 'resa' resta ammessa: una tabella che rifiuta
-- quello che ha già dentro non si può né rileggere né correggere.
alter table public.andamento drop constraint if exists andamento_metodo_check;
alter table public.andamento add constraint andamento_metodo_check
  check (metodo in ('att', 'vpm', 'voto', 'resa', 'scelta'));

delete from public.andamento where metodo = 'resa';

-- ── Le funzioni: NON più qui ────────────────────────────────────────────────
--
-- ⚠️⚠️ **Questo file conteneva le quattro funzioni con `p_scelta` al posto di
-- `p_resa`. Sono state togliere il 15/10/2026, e la ragione è una mina
-- disinnescata.** Poche ore dopo, `sql/29` le ha rifatte **con due parametri in
-- più** (la fascia di quota), cioè con un'altra firma. Rilanciare questo file
-- avrebbe creato una **seconda** `andamento_riassunto` a cinque parametri
-- accanto a quella a sette: una chiamata che nomina i cinque vecchi ne
-- troverebbe **due candidate**, e Postgres risponde *function is not unique* —
-- cioè la pagina Andamento si rompe, con un errore che non dice da dove viene.
--
-- ⚠️ **Una migrazione già applicata deve poter essere rilanciata senza fare
-- danno**: è l'unico modo di ricostruire un database da zero o di correggere a
-- metà strada. Qui resta la parte che **si può** rilanciare (la colonna, il
-- vincolo, la pulizia delle righe), e le funzioni stanno **solo in `sql/29`**,
-- nella loro forma finale e con `create or replace`.
--
-- Su un database nuovo l'ordine funziona comunque: `sql/23` crea le funzioni
-- con `p_resa`, `sql/29` le cancella e le rifà con `p_scelta` e la quota.
