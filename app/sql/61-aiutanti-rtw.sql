-- 🪜 ROAD TO WEEKEND — gli AIUTANTI: la visione del superadmin (22/11/2026)
--
-- Mattia: *"vorrei che alcuni utenti a mia scelta vedessero ciò che faccio con
-- SuperAdmin"*, abilitati dal superadmin in Utenti, con un tasto «Visione
-- Admin» in RTW. Sono due aiutanti: **vedono tutto** (anche i conti dei singoli
-- del banco) e **per ora solo guardano** — più avanti opereranno, e il permesso
-- di scrivere si aggancerà a questa stessa spunta.
--
-- ⚠️ Solo LETTURA: le policy di scrittura restano `user_id = mio_user_id()`,
-- quindi un aiutante non tocca il giro del banco nemmeno chiamando l'API.
-- ⚠️ La spunta la cambia **solo il superadmin**, e lo dice il database: un
-- admin può aggiornare `users` (`users_update`), quindi senza il trigger potrebbe
-- darsela da solo.

alter table public.users add column if not exists aiutante boolean not null default false;

create or replace function public.sono_aiutante()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select aiutante from users where id = public.mio_user_id()), false)
$$;
revoke all on function public.sono_aiutante() from public, anon;
grant execute on function public.sono_aiutante() to authenticated;

create or replace function public.id_superadmin()
returns uuid language sql stable security definer set search_path = public as $$
  select id from users where role = 'superadmin' order by created_at limit 1
$$;
revoke all on function public.id_superadmin() from public, anon;
grant execute on function public.id_superadmin() to authenticated;

-- ── La spunta: solo il superadmin ───────────────────────────────────────────
-- ⚠️⚠️ **SENZA `security definer`**: dentro una funzione definer `current_user`
-- è il proprietario, quindi il controllo qui sotto non scattava mai — provato il
-- 22/11 con un admin simulato, che si era dato la spunta da solo.
create or replace function public.proteggi_aiutante()
returns trigger language plpgsql set search_path = public as $$
begin
  -- dentro `imposta_aiutante` (e dagli script) l'utente è il proprietario delle
  -- funzioni, non `authenticated`: lì il controllo l'ha già fatto la funzione
  if current_user in ('authenticated', 'anon')
     and coalesce(public.mio_ruolo(), '') <> 'superadmin'
     and (tg_op = 'INSERT' and new.aiutante
          or tg_op = 'UPDATE' and new.aiutante is distinct from old.aiutante) then
    raise exception 'La visione Admin la assegna solo il superadmin';
  end if;
  return new;
end $$;
drop trigger if exists users_proteggi_aiutante on public.users;
create trigger users_proteggi_aiutante before insert or update on public.users
  for each row execute function public.proteggi_aiutante();

create or replace function public.imposta_aiutante(p_user uuid, p_valore boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.esigi_superadmin();
  update users set aiutante = p_valore where id = p_user and role <> 'superadmin';
  if not found then raise exception 'utente non trovato'; end if;
end $$;
revoke all on function public.imposta_aiutante(uuid, boolean) from public, anon;
grant execute on function public.imposta_aiutante(uuid, boolean) to authenticated;

-- ── Le letture: il giro del banco, le sue puntate, i filtri del superadmin ──
drop policy if exists scalate_aiutante on public.scalate;
create policy scalate_aiutante on public.scalate for select
  using (banco and public.sono_aiutante());

drop policy if exists passi_aiutante on public.scalata_passi;
create policy passi_aiutante on public.scalata_passi for select
  using (public.sono_aiutante() and exists (
    select 1 from scalate s where s.id = scalata_passi.scalata_id and s.banco));

drop policy if exists gambe_aiutante on public.scalata_gambe;
create policy gambe_aiutante on public.scalata_gambe for select
  using (public.sono_aiutante() and exists (
    select 1 from scalata_passi p join scalate s on s.id = p.scalata_id
    where p.id = scalata_gambe.passo_id and s.banco));

drop policy if exists banco_puntate_aiutante on public.banco_puntate;
create policy banco_puntate_aiutante on public.banco_puntate for select
  using (public.sono_aiutante());

-- le ricariche del superadmin: l'Archivio le mette in fila coi giri
drop policy if exists ricariche_aiutante on public.scalata_ricariche;
create policy ricariche_aiutante on public.scalata_ricariche for select
  using (public.sono_aiutante() and user_id = public.id_superadmin());

-- i filtri e il piano del superadmin: è da lì che si compone la scaletta
drop policy if exists preferenze_aiutante on public.preferenze;
create policy preferenze_aiutante on public.preferenze for select
  using (public.sono_aiutante() and ambito = 'scalata' and user_id = public.id_superadmin());

-- ── Chi c'è nel banco e quanto mette: anche agli aiutanti ───────────────────
create or replace function public.stato_banco()
returns table (user_id uuid, nome text, conto numeric, versato numeric, in_gioco numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.mio_ruolo(), '') <> 'superadmin' and not public.sono_aiutante() then
    raise exception 'Solo il superadmin vede il banco';
  end if;
  return query
    select u.id, coalesce(u.display_name, u.username)::text, public.conto_rtw(u.id),
      coalesce((select sum(r.importo) from scalata_ricariche r where r.user_id = u.id), 0)::numeric,
      (select b.puntata from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito = 'aperto' limit 1)
    from users u where u.copia_banco or u.role = 'superadmin'
    order by u.username;
end $$;

-- ── Le statistiche dell'Archivio: con `p_banco` un aiutante vede quelle del banco
drop function if exists public.statistiche_rtw();
create or replace function public.statistiche_rtw(p_banco boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select case when p_banco and public.sono_aiutante() then public.id_superadmin() else public.mio_user_id() end id,
      public.mio_ruolo() = 'superadmin' or (p_banco and public.sono_aiutante()) sa
  ),
  passi as (
    select p.id, p.esito, p.quota,
      case when s.banco and not (select sa from me)
        then (select b.puntata from banco_puntate b where b.passo_id = p.id and b.user_id = (select id from me))
        else p.posta end puntata
    from scalata_passi p join scalate s on s.id = p.scalata_id
    where p.esito <> 'aperto'
      -- ⚠️ Dopo l'azzeramento, se c'è: Laboratorio aveva un passo vinto alle 00:13
      -- del 4/11, su un conto poi azzerato, che avrebbe gonfiato il suo guadagno.
      and p.deciso_il >= greatest(timestamptz '2026-11-04 00:00:00+01',
        (select max(r.fatta_il) from scalata_ricariche r where r.user_id = (select id from me) and r.nota = 'azzeramento'))
      and ((s.banco and ((select sa from me)
             or exists (select 1 from banco_puntate b where b.passo_id = p.id and b.user_id = (select id from me))))
           or (not s.banco and s.user_id = (select id from me)))
  ),
  conto as (
    select case when (select sa from me)
      then (select coalesce(sum(public.conto_rtw(u.id)), 0) from users u where u.copia_banco or u.role = 'superadmin')
      else public.conto_rtw((select id from me)) end v
  ),
  risultato as (
    select coalesce(sum(case esito when 'vinto' then round(puntata * (quota - 1), 2) else -puntata end), 0) v from passi
  )
  select jsonb_build_object(
    'conto', (select v from conto),
    'risultato', (select v from risultato),
    'passi', (select count(*) from passi),
    'passi_presi', (select count(*) from passi where esito = 'vinto'),
    'partite', coalesce((select jsonb_agg(jsonb_build_object('giocata', g.giocata, 'gol_casa', pa.gol_casa, 'gol_trasferta', pa.gol_trasferta))
      from scalata_gambe g
      join passi on passi.id = g.passo_id
      join prossime_partite pr on pr.id = g.prossima_id
      join partite pa on pa.id = pr.partita_id), '[]'::jsonb)
  );
$$;
revoke all on function public.statistiche_rtw(boolean) from public, anon;
grant execute on function public.statistiche_rtw(boolean) to authenticated;
