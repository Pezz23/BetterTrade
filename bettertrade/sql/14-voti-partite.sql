-- I voti degli admin sulle partite future: la stella.
--
-- La selezione delle partite la fanno tre persone insieme (Mattia, 16/09).
-- Ogni admin può mettere una stella su una partita, una sola volta; il
-- contatore arriva al massimo al numero di admin. È la "voce" di ciascuno,
-- dentro l'app invece che in chat.
--
-- Una riga per voto. Il vincolo unique impedisce il doppio voto; il delete
-- lo toglie. Chi non è admin vede i voti ma non può votare.

create table if not exists public.voti_partite (
  prossima_id  bigint not null references public.prossime_partite(id) on delete cascade,
  user_id      uuid   not null references public.users(id) on delete cascade,
  votato_il    timestamptz not null default now(),
  primary key (prossima_id, user_id)
);

create index if not exists voti_partite_prossima_idx on public.voti_partite (prossima_id);

alter table public.voti_partite enable row level security;

-- Tutti vedono i voti: fanno parte della lista.
drop policy if exists voti_select on public.voti_partite;
create policy voti_select on public.voti_partite
  for select to authenticated using (true);

-- Solo gli admin votano, e solo a nome proprio.
drop policy if exists voti_insert on public.voti_partite;
create policy voti_insert on public.voti_partite
  for insert to authenticated
  with check (user_id = public.mio_user_id() and public.mio_ruolo() in ('admin','superadmin'));

drop policy if exists voti_delete on public.voti_partite;
create policy voti_delete on public.voti_partite
  for delete to authenticated
  using (user_id = public.mio_user_id());
