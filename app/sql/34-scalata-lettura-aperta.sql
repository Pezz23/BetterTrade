-- ROAD TO WEEKEND in sola lettura per tutti (22/10/2026)
--
-- Mattia: *"apri agli utenti «user» la possibilità di vedere la schermata,
-- senza interagire"*. Finché la `select` era riservata agli admin, un utente
-- normale vedeva la pagina **mezza vuota**: le partite future sì (sono di
-- tutti), la scalata aperta no — cioè proprio la road map del weekend.
--
-- ⚠️⚠️ **Si apre la LETTURA e non si tocca la scrittura.** Le policy di
-- scrittura restano com'erano: chi non è admin non crea, non modifica e non
-- cancella niente, e il controllo è **nel database**. Nel JSX i tasti vengono
-- nascosti, ma quello nasconde — non protegge (regola 4 del progetto).
--
-- ⚠️ **Conseguenza da sapere, non è un dettaglio:** da qui in avanti un utente
-- normale vede anche le CASSE — bankroll iniziale, accumulo, cassa in gioco —
-- e l'archivio delle scalate chiuse. È il capitale dedicato alla scalata, non
-- il conto del gruppo, e la pagina è nata come road map condivisa. Se un
-- giorno quei numeri dovranno restare privati, la strada non è richiudere la
-- lettura (la pagina tornerebbe vuota) ma togliere la card delle casse a chi
-- non è admin.

drop policy if exists scalate_select on public.scalate;
create policy scalate_select on public.scalate for select to authenticated
  using (true);

drop policy if exists passi_select on public.scalata_passi;
create policy passi_select on public.scalata_passi for select to authenticated
  using (true);

drop policy if exists gambe_select on public.scalata_gambe;
create policy gambe_select on public.scalata_gambe for select to authenticated
  using (true);

-- ⚠️⚠️ **E la SCRITTURA si stringe, perché era più larga di quanto dicesse.**
-- `scalate_write` era `user_id = mio_user_id() OR admin`: quell'OR lasciava a
-- **chiunque abbia fatto login** creare una scalata a nome proprio. Non si
-- vedeva, perché la lettura era riservata agli admin e la pagina pure —
-- aprendo tutt'e due, un utente normale potrebbe crearsi un registro che
-- **comparirebbe a chi guarda la pagina** (gli spettatori leggono il registro
-- che c'è, non il proprio).
-- Trovato il 22/10/2026 simulando una sessione utente contro le policy, non
-- leggendo il codice: dal ruolo postgres RLS non si vede, e dal JSX nemmeno.
-- ⚠️ Resta `user_id = mio_user_id()` **insieme** al ruolo: un admin scrive solo
-- nel proprio registro, o due admin si correggerebbero le scalate a vicenda.

drop policy if exists scalate_write on public.scalate;
create policy scalate_write on public.scalate for all to authenticated
  using (user_id = public.mio_user_id() and public.mio_ruolo() in ('admin', 'superadmin'))
  with check (user_id = public.mio_user_id() and public.mio_ruolo() in ('admin', 'superadmin'));
