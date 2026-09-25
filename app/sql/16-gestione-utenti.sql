-- Creare utenti, assegnare password ed eliminare account dall'app.
--
-- Queste tre cose richiedevano la chiave service_role, che nel browser non può
-- stare: vivevano solo in scripts/. Qui le fa il database, in security definer
-- come ricalcola_bankroll (sql/04): l'app chiama una funzione, la chiave resta
-- fuori dal browser.
--
-- ⚠️ Chi può: SOLO il superadmin (deciso con Mattia il 22/09/2026). Gli altri
--    admin votano le partite e compilano le spin, ma non toccano gli account.
--    Il controllo è QUI dentro, non nel JSX: nascondere un bottone non protegge.
--
-- ⚠️ L'email è sintetica e DEVE coincidere con emailDi() delle due copie JS
--    (src/context/AuthContext.jsx e scripts/_admin.js): minuscolo, solo
--    lettere e cifre, @bettertrade.local. Se cambia lì, cambia anche qui.
--
-- Le password restano hashate in auth.users (bcrypt, come fa GoTrue): non si
-- rileggono. Se una si perde, il superadmin ne assegna un'altra.

create or replace function public.email_di(p_username text)
returns text language sql immutable as $$
  select lower(regexp_replace(p_username, '[^a-zA-Z0-9]', '', 'g')) || '@bettertrade.local';
$$;

-- Solleva se chi chiama non è superadmin. Un solo posto, tre funzioni.
create or replace function public.esigi_superadmin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.mio_ruolo(), '') <> 'superadmin' then
    raise exception 'Solo il superadmin può gestire gli account';
  end if;
end $$;

-- ── Creare un utente ────────────────────────────────────────────────────────
create or replace function public.crea_utente(
  p_username text, p_password text, p_ruolo text default 'user',
  p_nome text default null, p_bankroll numeric default 0)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_auth_id uuid := gen_random_uuid();
  v_email   text := public.email_di(p_username);
  v_id      uuid;
begin
  perform public.esigi_superadmin();

  if p_username !~ '^[A-Za-z0-9]{3,20}$' then
    raise exception 'Username: da 3 a 20 lettere o cifre, senza spazi';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La password deve avere almeno 6 caratteri';
  end if;
  if p_ruolo not in ('user', 'admin', 'superadmin') then
    raise exception 'Ruolo non valido: user, admin o superadmin';
  end if;
  if exists (select 1 from public.users where lower(username) = lower(p_username)) then
    raise exception 'Lo username "%" è già preso', p_username;
  end if;
  -- Due username diversi possono produrre la stessa email sintetica
  -- ("Marco M" e "MarcoM"): il login non saprebbe chi è.
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Esiste già un account con l''identificativo "%"', v_email;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current, reauthentication_token)
  values (
    '00000000-0000-0000-0000-000000000000', v_auth_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', p_username, 'role', p_ruolo, 'email_verified', true),
    now(), now(), '', '', '', '', '', '', '', '');

  -- Senza identità GoTrue non riconosce l'account come "email/password".
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_auth_id::text, v_auth_id,
    jsonb_build_object('sub', v_auth_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  insert into public.users (username, display_name, role, bankroll, bankroll_iniziale, auth_id)
  values (p_username, coalesce(nullif(p_nome, ''), p_username), p_ruolo,
          coalesce(p_bankroll, 0), coalesce(p_bankroll, 0), v_auth_id)
  returning id into v_id;

  return v_id;
end $$;

-- ── Assegnare una password ──────────────────────────────────────────────────
create or replace function public.assegna_password(p_username text, p_password text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_auth_id uuid;
begin
  perform public.esigi_superadmin();
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La password deve avere almeno 6 caratteri';
  end if;

  select auth_id into v_auth_id from public.users where lower(username) = lower(p_username);
  if v_auth_id is null then
    raise exception 'Utente "%" non trovato, o non agganciato ad Auth', p_username;
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_auth_id;
end $$;

-- ── Eliminare un utente ─────────────────────────────────────────────────────
-- L'app cancellava solo la riga in public.users: l'account Auth restava, e con
-- lui l'email sintetica, quindi quello username non era più ricreabile.
create or replace function public.elimina_utente(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_auth_id uuid; v_ruolo text;
begin
  perform public.esigi_superadmin();
  select auth_id, role into v_auth_id, v_ruolo from public.users where id = p_user_id;
  if not found then raise exception 'Utente non trovato'; end if;
  if v_ruolo = 'superadmin' then raise exception 'Un superadmin non si elimina dall''app'; end if;

  delete from public.users where id = p_user_id;
  if v_auth_id is not null then delete from auth.users where id = v_auth_id; end if;
end $$;

revoke all on function public.crea_utente(text, text, text, text, numeric) from public;
revoke all on function public.assegna_password(text, text) from public;
revoke all on function public.elimina_utente(uuid) from public;
grant execute on function public.email_di(text) to authenticated;
grant execute on function public.crea_utente(text, text, text, text, numeric) to authenticated;
grant execute on function public.assegna_password(text, text) to authenticated;
grant execute on function public.elimina_utente(uuid) to authenticated;
