-- 🪜 ROAD TO WEEKEND — un conto per account, che si ricarica (24/10/2026)
--
-- Mattia: *"il bankroll deve essere sempre solo 1, quando finisce devo poterlo
-- ricaricare. Lo scopo è tenere traccia di tutti i movimenti: se perdo 3
-- bankroll interi, quindi 300 €, e una volta incasso 200 €, devo capire di
-- essere in perdita e non in utile"*. E: *"ogni account avrà il suo conto
-- personale, sia Admin che user"*.
--
-- ⚠️⚠️ **Il conto è CALCOLATO, mai scritto** — la stessa regola del bankroll
-- del gruppo (regola 1 di CLAUDE.md), su soldi diversi:
--
--     conto = Σ ricariche + Σ (bankroll_finale − bankroll_iniziale) delle chiuse
--
-- Prima il capitale era *"l'ultimo bankroll_finale"* e si poteva cambiare con
-- −/+ senza lasciare traccia: cioè non si poteva sapere quanto ci si era messo
-- dentro. La formula vive in `lib/scalata.js` (`contoDi`).
-- ⚠️ **Non è il bankroll del Bilancio**: una ricarica qui non tocca
-- `users.bankroll` né `movimenti` (Mattia: *"sono 2 conti diversi"*).
--
-- Cinque cose:
--   1. `scalata_ricariche`, i versamenti nel conto;
--   2. `scalata_passi.fissato`, che prima era stato della pagina e spariva
--      chiudendo l'app;
--   3. le policy della scalata: **ognuno vede e scrive solo la sua**;
--   4. i flag ⚑ aperti a tutti, col segno di chi li ha messi;
--   5. `riparti_scalata()`, il tasto ⟳ RIPARTI in una transazione sola.

-- ── 1. Le ricariche ─────────────────────────────────────────────────────────
create table if not exists public.scalata_ricariche (
  id        bigserial primary key,
  user_id   uuid not null references public.users(id) on delete cascade,
  importo   numeric not null check (importo > 0),
  fatta_il  timestamptz not null default now(),
  nota      text
);
create index if not exists ricariche_per_utente on public.scalata_ricariche (user_id, fatta_il);

alter table public.scalata_ricariche enable row level security;

-- ⚠️ Niente `update`: una ricarica sbagliata si **cancella** e si rifà, così
-- nel conto non esiste un numero che sia stato ritoccato.
drop policy if exists ricariche_select on public.scalata_ricariche;
create policy ricariche_select on public.scalata_ricariche
  for select to authenticated using (user_id = public.mio_user_id());
drop policy if exists ricariche_insert on public.scalata_ricariche;
create policy ricariche_insert on public.scalata_ricariche
  for insert to authenticated with check (user_id = public.mio_user_id());
drop policy if exists ricariche_delete on public.scalata_ricariche;
create policy ricariche_delete on public.scalata_ricariche
  for delete to authenticated using (user_id = public.mio_user_id());

-- ── 2. Il passo fissato ─────────────────────────────────────────────────────
alter table public.scalata_passi add column if not exists fissato boolean not null default false;

-- ── 3. Ognuno la sua ────────────────────────────────────────────────────────
-- ⚠️⚠️ Sostituisce `sql/34` (lettura aperta a tutti) e corregge un resto di
-- `sql/30`: `passi_write` e `gambe_write` lasciavano ancora a **qualunque
-- admin** scrivere i passi di chiunque — `sql/34` aveva stretto solo
-- `scalate_write`. Ora ogni policy guarda `user_id`, admin compresi: sono i
-- soldi di una persona, come le schedine del Bet Builder (`sql/36`).
drop policy if exists scalate_select on public.scalate;
create policy scalate_select on public.scalate for select to authenticated
  using (user_id = public.mio_user_id());
drop policy if exists scalate_write on public.scalate;
create policy scalate_write on public.scalate for all to authenticated
  using (user_id = public.mio_user_id())
  with check (user_id = public.mio_user_id());

drop policy if exists passi_select on public.scalata_passi;
create policy passi_select on public.scalata_passi for select to authenticated
  using (exists (select 1 from public.scalate s where s.id = scalata_id and s.user_id = public.mio_user_id()));
drop policy if exists passi_write on public.scalata_passi;
create policy passi_write on public.scalata_passi for all to authenticated
  using (exists (select 1 from public.scalate s where s.id = scalata_id and s.user_id = public.mio_user_id()))
  with check (exists (select 1 from public.scalate s where s.id = scalata_id and s.user_id = public.mio_user_id()));

drop policy if exists gambe_select on public.scalata_gambe;
create policy gambe_select on public.scalata_gambe for select to authenticated
  using (exists (select 1 from public.scalata_passi p join public.scalate s on s.id = p.scalata_id
                 where p.id = passo_id and s.user_id = public.mio_user_id()));
drop policy if exists gambe_write on public.scalata_gambe;
create policy gambe_write on public.scalata_gambe for all to authenticated
  using (exists (select 1 from public.scalata_passi p join public.scalate s on s.id = p.scalata_id
                 where p.id = passo_id and s.user_id = public.mio_user_id()))
  with check (exists (select 1 from public.scalata_passi p join public.scalate s on s.id = p.scalata_id
                 where p.id = passo_id and s.user_id = public.mio_user_id()));

-- ── 4. I flag a tutti ───────────────────────────────────────────────────────
-- ⚠️ `da_admin` è una **fotografia** di chi ha flaggato, non un ruolo letto
-- ogni volta: serve al colore (verde admin, blu user) e un utente normale non
-- può leggere i ruoli degli altri. Il `with check` impedisce di dichiararsi
-- admin: il valore deve coincidere col proprio ruolo vero.
alter table public.flag_partite add column if not exists da_admin boolean not null default false;
update public.flag_partite f set da_admin = true
  from public.users u where u.id = f.user_id and u.role in ('admin', 'superadmin') and not f.da_admin;

drop policy if exists flag_insert on public.flag_partite;
create policy flag_insert on public.flag_partite
  for insert to authenticated
  with check (user_id = public.mio_user_id()
              and da_admin = (public.mio_ruolo() in ('admin', 'superadmin')));

-- ── 5. ⟳ RIPARTI ────────────────────────────────────────────────────────────
-- Dopo un passo perso: chiude il giro (come STOP) e ne apre uno nuovo con i
-- **passi programmati che restano**, spostati e non copiati. Una funzione e
-- non tre chiamate dal browser perché supabase-js non ha transazioni: a metà
-- resterebbe un giro chiuso senza il successivo, o due giri aperti.
-- ⚠️ `security invoker`: le scritture passano dalle policy qui sopra, quindi
-- si riparte solo dalla **propria** scalata. I numeri (finale, conto, posta)
-- li calcola la pagina con `casseDi` e `contoDi`: la formula resta in un
-- posto solo, in JavaScript, e qui si controlla solo che abbiano senso.
create or replace function public.riparti_scalata(
  p_scalata  bigint,   -- il giro da chiudere
  p_dopo     numeric,  -- il numero del passo perso: si spostano quelli dopo
  p_finale   numeric,  -- bankroll_finale del giro che si chiude
  p_cassa    numeric,
  p_accumulo numeric,
  p_conto    numeric,  -- il conto dopo la chiusura: bankroll del giro nuovo
  p_posta    numeric   -- la puntata del giro nuovo (10% del conto)
) returns bigint
language plpgsql security invoker set search_path = public as $$
declare
  v     public.scalate;
  nuovo bigint;
begin
  select * into v from public.scalate
    where id = p_scalata and user_id = public.mio_user_id() and stato = 'aperta' for update;
  if not found then raise exception 'scalata non trovata, o già chiusa'; end if;
  if not (p_posta >= 1) then raise exception 'la puntata sarebbe sotto 1 €: serve una ricarica'; end if;
  if not exists (select 1 from public.scalata_passi
                 where scalata_id = p_scalata and numero > p_dopo and esito = 'aperto')
    then raise exception 'non ci sono passi da cui ripartire'; end if;

  update public.scalate set stato = 'chiusa', chiusa_il = now(),
    bankroll_finale = p_finale, cassa = p_cassa, accumulo = p_accumulo
    where id = p_scalata;

  insert into public.scalate (user_id, bankroll_iniziale, posta, quota_minima, regola, cassa, accumulo)
    values (v.user_id, p_conto, p_posta, v.quota_minima, v.regola, p_posta, 0)
    returning id into nuovo;

  update public.scalata_passi set scalata_id = nuovo
    where scalata_id = p_scalata and numero > p_dopo;
  return nuovo;
end $$;

grant execute on function public.riparti_scalata(bigint, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;
