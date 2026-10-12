-- LA SPUNTA "GIOCATA" — una per spin.
--
-- ⚠️ **Perché serve.** Finora la Dashboard contava una spin **appena una
-- casella aveva una squadra**: bastava cominciare a compilare la griglia e i
-- numeri partivano, come se quei soldi fossero stati messi. Mattia
-- (12/10/2026): *"se si mette la spunta allora la dashboard inizia a contare,
-- se non ci sono spunte deve rimanere a 0"*.
--
-- ⚠️ Compilare e giocare sono due cose diverse, e la griglia resta modificabile
-- anche dopo: la spunta è **il momento in cui si decide che quella spin è
-- andata al banco**, e nessun dato della griglia può dedurlo da solo.
--
-- ⚠️ Quattro valori perché le spin sono quattro (la quarta è la "Fun"). Il
-- default `false` vale anche per la riga che esiste già, quindi **dopo questa
-- migrazione la Dashboard parte da zero**: è voluto.
--
-- Non servono policy nuove: `griglia` ha già la sua (lettura a chi ha fatto
-- login, scrittura agli admin) e la colonna la eredita.

alter table public.griglia
  add column if not exists giocate jsonb not null default '[false,false,false,false]'::jsonb;

-- ⚠️ Deve restare un array di quattro booleani: se un giorno qualcuno ci
-- scrivesse un oggetto o una lista più corta, l'app leggerebbe `undefined` e
-- tratterebbe la spin come non giocata senza dire niente.
alter table public.griglia drop constraint if exists griglia_giocate_valide;
alter table public.griglia add constraint griglia_giocate_valide check (
  jsonb_typeof(giocate) = 'array' and jsonb_array_length(giocate) = 4
);
