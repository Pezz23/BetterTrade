-- PASSO 4 — Regole di accesso (RLS).
--
-- Prima: sei policy `anon_all_<tabella>` davano permesso totale al ruolo `anon`,
-- cioè a chiunque avesse la chiave pubblica, anche senza login. Servivano al
-- vecchio login, che leggeva users dal browser.
--
-- Dopo: chi ha fatto login vede tutto l'archivio; scrivono solo admin e
-- superadmin. Chi non ha fatto login non vede niente.
-- Due eccezioni, perché rispecchiano l'uso dell'app: ognuno registra i propri
-- movimenti e le proprie spunte "inserita".
--
-- Le funzioni mio_ruolo() / mio_user_id() vengono dal passo 1.

-- ── 1. Via le regole vecchie ────────────────────────────────────────────────
drop policy if exists anon_all_users        on public.users;
drop policy if exists anon_all_movimenti    on public.movimenti;
drop policy if exists anon_all_giornate     on public.giornate;
drop policy if exists anon_all_inserite     on public.inserite;
drop policy if exists anon_all_griglia      on public.griglia;
drop policy if exists anon_all_impostazioni on public.impostazioni;

-- ── 2. RLS attiva su tutte le tabelle ───────────────────────────────────────
alter table public.users        enable row level security;
alter table public.movimenti    enable row level security;
alter table public.giornate     enable row level security;
alter table public.inserite     enable row level security;
alter table public.griglia      enable row level security;
alter table public.impostazioni enable row level security;

-- ── 3. Lettura: tutto l'archivio, a chi ha fatto login ──────────────────────
drop policy if exists users_select        on public.users;
drop policy if exists movimenti_select    on public.movimenti;
drop policy if exists giornate_select     on public.giornate;
drop policy if exists inserite_select     on public.inserite;
drop policy if exists griglia_select      on public.griglia;
drop policy if exists impostazioni_select on public.impostazioni;

create policy users_select        on public.users        for select to authenticated using (true);
create policy movimenti_select    on public.movimenti    for select to authenticated using (true);
create policy giornate_select     on public.giornate     for select to authenticated using (true);
create policy inserite_select     on public.inserite     for select to authenticated using (true);
create policy griglia_select      on public.griglia      for select to authenticated using (true);
create policy impostazioni_select on public.impostazioni for select to authenticated using (true);

-- ── 4. Scrittura riservata agli admin ───────────────────────────────────────
drop policy if exists giornate_write     on public.giornate;
drop policy if exists griglia_write      on public.griglia;
drop policy if exists impostazioni_write on public.impostazioni;

create policy giornate_write on public.giornate for all to authenticated
  using      (public.mio_ruolo() in ('admin','superadmin'))
  with check (public.mio_ruolo() in ('admin','superadmin'));

create policy griglia_write on public.griglia for all to authenticated
  using      (public.mio_ruolo() in ('admin','superadmin'))
  with check (public.mio_ruolo() in ('admin','superadmin'));

create policy impostazioni_write on public.impostazioni for all to authenticated
  using      (public.mio_ruolo() in ('admin','superadmin'))
  with check (public.mio_ruolo() in ('admin','superadmin'));

-- users a parte: le policy si sommano con OR, quindi un "for all" agli admin
-- renderebbe inutile qualsiasi restrizione sul delete. Elencate una a una,
-- con la cancellazione riservata al superadmin.
drop policy if exists users_insert on public.users;
drop policy if exists users_update on public.users;
drop policy if exists users_delete on public.users;

create policy users_insert on public.users for insert to authenticated
  with check (public.mio_ruolo() in ('admin','superadmin'));

create policy users_update on public.users for update to authenticated
  using      (public.mio_ruolo() in ('admin','superadmin'))
  with check (public.mio_ruolo() in ('admin','superadmin'));

create policy users_delete on public.users for delete to authenticated
  using (public.mio_ruolo() = 'superadmin');

-- ── 5. Righe personali: il proprietario, oppure un admin ────────────────────
drop policy if exists movimenti_write on public.movimenti;
drop policy if exists inserite_write  on public.inserite;

create policy movimenti_write on public.movimenti for all to authenticated
  using      (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin','superadmin'))
  with check (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin','superadmin'));

create policy inserite_write on public.inserite for all to authenticated
  using      (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin','superadmin'))
  with check (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin','superadmin'));
