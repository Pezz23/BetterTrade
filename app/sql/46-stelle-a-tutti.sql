-- ⭐ LE STELLINE A TUTTI, separate per ruolo (29/10/2026)
--
-- Mattia: *"vorrei che anche gli user mettano le stelline dentro Partite, però
-- separate da quelle degli admin"*. Stessa strada dei flag (`sql/41`): ogni
-- stellina porta `da_admin`, una **fotografia** del ruolo di chi l'ha messa.
-- A schermo: oro gli admin, blu gli user.
--
-- ⚠️ Cosa CONTANO, deciso da Mattia: nelle **Spin** (del gruppo) solo quelle
-- degli admin; in **Road to weekend** e **Bet Builder** (personali) tutte.
-- La distinzione la fa l'app (`votiAdminDi` / `votiDi` in `usaProssime`), qui
-- si garantisce solo che `da_admin` dica il vero.

alter table public.voti_partite add column if not exists da_admin boolean not null default false;
update public.voti_partite v set da_admin = true
  from public.users u where u.id = v.user_id and u.role in ('admin', 'superadmin') and not v.da_admin;

-- ⚠️ Prima solo gli admin potevano votare (`sql/14`). Ora chiunque, a nome
-- proprio, e con `da_admin` uguale al proprio ruolo vero.
drop policy if exists voti_insert on public.voti_partite;
create policy voti_insert on public.voti_partite
  for insert to authenticated
  with check (user_id = public.mio_user_id()
              and da_admin = (public.mio_ruolo() in ('admin', 'superadmin')));
