-- PASSO 1 — Aggancio fra la tabella users e Supabase Auth.
--
-- Non tocchiamo users.id: è referenziato da movimenti, giornate e inserite.
-- Aggiungiamo invece una colonna auth_id che punta all'account Auth.
-- Innocuo: l'app continua a funzionare come prima dopo questo script.

alter table public.users
  add column if not exists auth_id uuid unique references auth.users(id) on delete set null;

comment on column public.users.auth_id is
  'Account Supabase Auth corrispondente. Popolato da scripts/migra-auth.js.';

-- Serve alle policy RLS del passo 3: dice il ruolo di chi sta chiamando.
-- SECURITY DEFINER = legge users ignorando RLS, altrimenti la policy su users
-- interrogherebbe users e andrebbe in ricorsione infinita.
create or replace function public.mio_ruolo()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where auth_id = auth.uid()
$$;

-- E l'id della riga users di chi chiama (non è uguale a auth.uid()).
create or replace function public.mio_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid()
$$;

grant execute on function public.mio_ruolo()   to authenticated;
grant execute on function public.mio_user_id() to authenticated;
