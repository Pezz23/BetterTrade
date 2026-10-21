-- ROAD TO WEEKEND — il metodo diventa uno: la Scalata madre (21/10/2026)
--
-- ⚠️ `regola` nasceva con `check (regola in ('capitale','gioco'))`: erano le
-- due regole di incasso che servivano a **misurare** quale conviene. La misura
-- ha risposto (sull'utile, mediana 81 contro 42 su 100) e Mattia ha scelto il
-- metodo dei pavimenti — quindi serve un terzo valore ammesso.
--
-- ⚠️⚠️ **I valori vecchi NON si convertono.** Quella colonna è la fotografia
-- di come si giocava quando la scalata è stata aperta: riscriverla farebbe
-- dire all'archivio che una scalata di settembre seguiva un metodo che non
-- esisteva. Resta `NOMI_REGOLA` in `lib/scalata.js` per leggerle a schermo.
--
-- ⚠️ Un `check` si sostituisce in due mosse, e `if exists` / `not valid` non
-- c'entrano: il vincolo nuovo è più **largo** del vecchio, quindi nessuna riga
-- esistente lo viola e la validazione passa subito.

alter table scalate drop constraint if exists scalate_regola_check;
alter table scalate add  constraint scalate_regola_check
  check (regola in ('madre', 'capitale', 'gioco'));
