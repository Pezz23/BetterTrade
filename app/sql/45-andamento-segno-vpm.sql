-- 📈 ANDAMENTO — il segno di VPM (29/10/2026)
--
-- Mattia: *"nell'esportazione del CSV vorrei l'esito dato da VPM oltre al
-- valore"*. VPM non dice solo *quanto* è netta una partita (`vpm`, 5,5-10):
-- dice anche **quale squadra** è più forte sul campo, '1' o '2'. Fino a oggi
-- `andamento` teneva il numero e non il segno. Lo scrive
-- `calcola-andamento.js` (da `ricostruisci.js`); `null` dove VPM non c'è
-- (meno di tre partite giocate da una delle due squadre).

alter table public.andamento add column if not exists vpm_segno text
  check (vpm_segno in ('1', '2'));
