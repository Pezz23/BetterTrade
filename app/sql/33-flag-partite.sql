-- ⚑ LE PARTITE FLAGGATE — il segno della scalata (22/10/2026)
--
-- Chiesta da Mattia per Road to weekend: *"la possibilità di mettere un flag
-- verde e segnare quelle che mi piacciono. Come le stelle, ma le chiameremo
-- partite flaggate, così da non confondere con le stelle"*.
--
-- ⚠️⚠️ **È lo stesso schema di `voti_partite`, e la differenza è il
-- SIGNIFICATO, non la forma**: la stella dice *"questa entra nella spin"* e
-- scavalca la soglia in `lib/spin.js`; il flag dice *"questa mi piace per la
-- scalata"* e **non scavalca niente** — le soglie di Road to weekend
-- alimentano anche il taglio automatico delle schedine a 2,00, e una gamba
-- corta entrata di straforo abbasserebbe la qualità del passo in silenzio.
-- Due segni separati perché rispondono a due domande diverse.
--
-- ⚠️ **Flaggano tutti gli admin e il conto si vede** (decisione di Mattia,
-- 22/10): come le stelle, è la voce di ciascuno dentro l'app invece che in
-- chat. Per questo la lettura è aperta a chi ha fatto login — senza, il
-- contatore saprebbe solo di sé.
--
-- ⚠️ **La protezione è qui, non nel JSX**: `soloAdmin` nasconde il tasto, la
-- policy decide chi scrive. E si scrive solo a nome proprio.

create table if not exists public.flag_partite (
  prossima_id  bigint not null references public.prossime_partite(id) on delete cascade,
  user_id      uuid   not null references public.users(id) on delete cascade,
  flaggato_il  timestamptz not null default now(),
  primary key (prossima_id, user_id)
);

create index if not exists flag_partite_prossima_idx on public.flag_partite (prossima_id);

alter table public.flag_partite enable row level security;

-- Tutti quelli che sono entrati vedono i flag: fanno parte della lista.
drop policy if exists flag_select on public.flag_partite;
create policy flag_select on public.flag_partite
  for select to authenticated using (true);

-- Solo gli admin flaggano, e solo a nome proprio.
drop policy if exists flag_insert on public.flag_partite;
create policy flag_insert on public.flag_partite
  for insert to authenticated
  with check (user_id = public.mio_user_id() and public.mio_ruolo() in ('admin','superadmin'));

drop policy if exists flag_delete on public.flag_partite;
create policy flag_delete on public.flag_partite
  for delete to authenticated
  using (user_id = public.mio_user_id());
