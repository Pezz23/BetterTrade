-- 🪜 ROAD TO WEEKEND — la CONFERMA della giocata (30/10/2026)
--
-- Mattia: *"gioco la partita delle 14, entro alle 15 e non vedo più la
-- partita e non posso recuperarla"*. Il piano non è salvato finché il giro non
-- si apre, e si ricompone dalle partite non ancora cominciate: una giocata al
-- banco ma non ancora segnata nell'app spariva. Ora il passo si **conferma**
-- quando lo si gioca (✓ Conferma giocata): da lì è salvato, con puntata e
-- quota, e l'esito arriva dopo.
--
-- ⚠️ `confermato_il` null = il passo è ancora una proposta. Un passo con un
-- esito ma senza conferma è uno di prima del 30/10: per la pagina conta come
-- giocato lo stesso (`giocato()` in lib/scalata.js).
-- ⚠️ Niente policy nuove: la colonna sta in `scalata_passi`, e le policy
-- «ognuno la sua» (sql/41) valgono già per lei.

alter table public.scalata_passi add column if not exists confermato_il timestamptz;
