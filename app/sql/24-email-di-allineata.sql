-- `email_di()` allineata alle due copie JS.
--
-- ⚠️⚠️ **Le tre copie si erano allontanate su un dettaglio invisibile**: le due
-- JS fanno `toLowerCase()` **e poi** tolgono tutto ciò che non è `[a-z0-9]`;
-- l'SQL toglieva tutto ciò che non è `[a-zA-Z0-9]` **e poi** abbassava. Per
-- `Mario`, `MarcoM`, `MNM` e qualunque nome italiano il risultato è identico —
-- ma per una lettera che diventa `a-z` solo dopo l'abbassamento (la `İ` turca)
-- i due risultati divergono: `irem@` da una parte, `rem@` dall'altra.
--
-- Conseguenza: un account creato dall'app avrebbe un'email che il login non
-- ricostruisce, cioè **account creato e login impossibile**. È esattamente il
-- guasto che la regola "devono restare identiche" vuole impedire.
--
-- ⚠️ Verificato prima di applicare: **nessuno degli 11 utenti esistenti cambia
-- email** (12/10/2026). Se un domani ne esistesse uno, questa migrazione gli
-- cambierebbe l'identificatore e andrebbe rifatta la riga in `auth.users`.
--
-- ⚠️ Si allinea l'SQL al JS, non il contrario: abbassare prima **conserva** la
-- lettera (`İ` → `i`), togliere prima la butta. Un identificatore che butta
-- caratteri crea collisioni — `İrem` e `rem` diventerebbero lo stesso account.

create or replace function public.email_di(p_username text)
returns text language sql immutable as $$
  select regexp_replace(lower(p_username), '[^a-z0-9]', '', 'g') || '@bettertrade.local';
$$;

-- ⚠️ Le tre righe, come per ogni funzione: Postgres concede a PUBLIC e Supabase
-- ad `anon`, quindi il solo grant non restringerebbe niente.
revoke all on function public.email_di(text) from public;
revoke all on function public.email_di(text) from anon;
grant execute on function public.email_di(text) to authenticated;
