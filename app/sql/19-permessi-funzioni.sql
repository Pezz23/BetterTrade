-- Chi può chiamare le funzioni: solo chi ha fatto il login.
--
-- ⚠️ **Supabase concede di suo l'esecuzione ad `anon`** su tutto ciò che nasce
-- nello schema `public` (default privileges), e Postgres aggiunge PUBLIC.
-- Scoperto l'8/10/2026 creando `classifiche()`: `grant ... to authenticated`
-- non restringe niente, perché il permesso c'era già per tutti.
--
-- Nessuna di queste era sfruttabile — provate dall'API senza login l'8/10,
-- rispondono tutte "Solo il superadmin…" o tornano vuote perché RLS blocca la
-- lettura. Ma una funzione `security definer`, che scavalca le regole, non
-- deve essere nemmeno **chiamabile** da chi non si è identificato: se un
-- giorno un controllo interno venisse scritto male, la porta sarebbe già
-- chiusa.

do $$
declare f text;
begin
  foreach f in array array[
    'public.classifiche()',
    'public.forma_partita(text, text, text)',
    'public.ricalcola_bankroll(uuid)',
    'public.crea_utente(text, text, text, text, numeric)',
    'public.assegna_password(text, text)',
    'public.elimina_utente(uuid)',
    'public.esigi_superadmin()',
    'public.email_di(text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
