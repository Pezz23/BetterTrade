-- 🪜 ROAD TO WEEKEND — il BANCO: un giro solo, i soldi di tutti (04/11/2026)
--
-- Mattia: il superadmin sceglie e gioca; chi ha la spunta «copia il banco» segue
-- i suoi passi coi propri soldi, senza toccare niente.
--
-- ⚠️⚠️ **Non si copia nessun passo**: esiste un giro solo, quello del superadmin
-- (`scalate.banco`). Quando conferma una giocata si fotografa quanto mette
-- ciascuno in `banco_puntate`; l'esito sta sul passo, e i conti si ricalcolano.
-- Correggere un esito corregge tutti, e non c'è niente da sincronizzare.
-- ⚠️⚠️ **L'arrotondamento è per utente** (Mattia: *"143,25 €, con il 10%
-- arrotonda a 14 € e questi 14 si sommano"*): ognuno `floor(% × suo conto)`, la
-- stessa regola di `puntataDi`, e la giocata è la somma. Chi non arriva a 1 €
-- salta il passo. Le vincite hanno i centesimi.
-- ⚠️ Il totale e i conti degli altri li vede **solo il superadmin**: gli utenti
-- non leggono `scalata_passi` del banco (policy di sql/41), ma `banco_utente()`,
-- che restituisce le partite e la loro puntata e nient'altro.

alter table public.users  add column if not exists copia_banco boolean not null default false;
alter table public.scalate add column if not exists banco boolean not null default false;

-- ⚠️ Nessuno se lo sceglie: un giro nuovo del superadmin è del banco, gli altri
-- no, anche nei giri che fa ripartire `chiudi_giro_perso`. I giri già chiusi
-- restano com'erano.
create or replace function public.scalata_segna_banco()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.banco := exists (select 1 from users where id = new.user_id and role = 'superadmin');
  else
    new.banco := old.banco;
  end if;
  return new;
end $$;
drop trigger if exists scalata_banco on public.scalate;
create trigger scalata_banco before insert or update on public.scalate
  for each row execute function public.scalata_segna_banco();

create table if not exists public.banco_puntate (
  passo_id bigint not null references public.scalata_passi(id) on delete cascade,
  user_id  uuid   not null references public.users(id) on delete cascade,
  puntata  numeric not null check (puntata >= 1),
  primary key (passo_id, user_id)
);
create index if not exists banco_puntate_per_utente on public.banco_puntate (user_id);
alter table public.banco_puntate enable row level security;
drop policy if exists banco_puntate_select on public.banco_puntate;
create policy banco_puntate_select on public.banco_puntate for select to authenticated
  using (user_id = public.mio_user_id() or public.mio_ruolo() = 'superadmin');
-- Nessuna policy di scrittura: scrive solo `conferma_banco`.

-- ⚠️ Chi segue il banco non si apre giri suoi: i soldi sono gli stessi.
drop policy if exists scalate_non_chi_copia on public.scalate;
create policy scalate_non_chi_copia on public.scalate as restrictive for insert to authenticated
  with check (not coalesce((select copia_banco from public.users where id = public.mio_user_id()), false));

-- ── Il conto: giri propri + risultati delle puntate nel banco ───────────────
create or replace function public.conto_rtw(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select round(
    coalesce((select sum(importo) from scalata_ricariche where user_id = p_user), 0)
    + coalesce((select sum(bankroll_finale - bankroll_iniziale) from scalate
                where user_id = p_user and not banco and stato <> 'aperta' and bankroll_finale is not null), 0)
    + coalesce((select sum(case p.esito when 'vinto' then p.posta * (p.quota - 1) when 'perso' then -p.posta else 0 end)
                from scalata_passi p join scalate s on s.id = p.scalata_id
                where s.user_id = p_user and not s.banco and s.stato = 'aperta'), 0)
    + coalesce((select sum(case p.esito when 'vinto' then round(b.puntata * (p.quota - 1), 2) when 'perso' then -b.puntata else 0 end)
                from banco_puntate b join scalata_passi p on p.id = b.passo_id
                where b.user_id = p_user), 0)
  , 2);
$$;
revoke all on function public.conto_rtw(uuid) from public, anon, authenticated;

create or replace function public.giocata_in_corso(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from scalata_passi p join scalate s on s.id = p.scalata_id
      where s.user_id = p_user and not s.banco and s.stato = 'aperta' and p.esito = 'aperto' and p.confermato_il is not null)
    or exists (select 1 from banco_puntate b join scalata_passi p on p.id = b.passo_id
      where b.user_id = p_user and p.esito = 'aperto');
$$;
revoke all on function public.giocata_in_corso(uuid) from public, anon, authenticated;

-- ── Il trasferimento: il giro del banco non blocca e non si butta ───────────
create or replace function public.trasferisci_rtw(p_user uuid, p_importo numeric, p_verso text)
returns void language plpgsql security definer set search_path = public as $$
declare
  imp   numeric := round(p_importo, 2);
  cassa numeric;
  mov   bigint;
begin
  if p_user is distinct from public.mio_user_id() then perform public.esigi_superadmin(); end if;
  if p_verso not in ('a_rtw', 'a_cassa') then raise exception 'verso sconosciuto'; end if;
  if not (imp > 0) then raise exception 'importo non valido'; end if;
  perform 1 from users where id = p_user for update;
  if not found then raise exception 'utente non trovato'; end if;
  if public.giocata_in_corso(p_user) then
    raise exception 'c’è una giocata confermata senza esito: si trasferisce dopo';
  end if;
  if exists (select 1 from scalata_passi p join scalate s on s.id = p.scalata_id
             where s.user_id = p_user and not s.banco and s.stato = 'aperta' and p.esito <> 'aperto') then
    raise exception 'il giro aperto ha passi giocati: prima «Chiudi giro»';
  end if;

  if p_verso = 'a_rtw' then
    cassa := public.ricalcola_bankroll(p_user);
    if imp > cassa then raise exception 'in cassa ci sono solo % €', cassa; end if;
  elsif imp > public.conto_rtw(p_user) then
    raise exception 'nel conto RTW ci sono solo % €', public.conto_rtw(p_user);
  end if;

  delete from scalate where user_id = p_user and not banco and stato = 'aperta';

  insert into movimenti (user_id, tipo, importo, nota, rtw)
    values (p_user, case p_verso when 'a_rtw' then 'prelievo' else 'deposito' end, imp,
            case p_verso when 'a_rtw' then 'Trasferimento a RTW' else 'Ritorno da RTW' end, true)
    returning id into mov;
  insert into scalata_ricariche (user_id, importo, nota, movimento_id)
    values (p_user, case p_verso when 'a_rtw' then imp else -imp end,
            case p_verso when 'a_rtw' then 'dalla cassa' else 'in cassa' end, mov);
  perform public.ricalcola_bankroll(p_user);
end $$;
revoke all on function public.trasferisci_rtw(uuid, numeric, text) from public, anon;
grant execute on function public.trasferisci_rtw(uuid, numeric, text) to authenticated;

-- ── La spunta ───────────────────────────────────────────────────────────────
create or replace function public.imposta_copia_banco(p_user uuid, p_valore boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.esigi_superadmin();
  if p_valore then
    if exists (select 1 from users where id = p_user and role = 'superadmin') then
      raise exception 'il superadmin guida il banco: non lo copia';
    end if;
    if exists (select 1 from scalata_passi p join scalate s on s.id = p.scalata_id
               where s.user_id = p_user and s.stato = 'aperta'
                 and (p.esito <> 'aperto' or p.confermato_il is not null)) then
      raise exception 'ha un giro suo con passi giocati: prima va chiuso';
    end if;
    delete from scalate where user_id = p_user and stato = 'aperta';
  end if;
  update users set copia_banco = p_valore where id = p_user;
end $$;
revoke all on function public.imposta_copia_banco(uuid, boolean) from public, anon;
grant execute on function public.imposta_copia_banco(uuid, boolean) to authenticated;

-- ── Chi c'è nel banco, e quanto mette ───────────────────────────────────────
create or replace function public.stato_banco()
returns table (user_id uuid, nome text, conto numeric, versato numeric, in_gioco numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.esigi_superadmin();
  return query
    select u.id, coalesce(u.display_name, u.username)::text, public.conto_rtw(u.id),
      coalesce((select sum(r.importo) from scalata_ricariche r where r.user_id = u.id), 0)::numeric,
      (select b.puntata from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito = 'aperto' limit 1)
    from users u where u.copia_banco or u.role = 'superadmin'
    order by u.username;
end $$;
revoke all on function public.stato_banco() from public, anon;
grant execute on function public.stato_banco() to authenticated;

-- ── La conferma: qui si decide quanto mette ciascuno ────────────────────────
create or replace function public.conferma_banco(p_passo bigint)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v      record;
  totale numeric;
begin
  perform public.esigi_superadmin();
  select p.id, p.esito, p.confermato_il, p.scalata_id, s.percentuale, s.banco, s.stato into v
    from scalata_passi p join scalate s on s.id = p.scalata_id where p.id = p_passo for update of p;
  if not found or not v.banco or v.stato <> 'aperta' then raise exception 'non è un passo aperto del banco'; end if;
  if v.esito <> 'aperto' or v.confermato_il is not null then raise exception 'questo passo è già giocato'; end if;
  if exists (select 1 from scalata_passi where scalata_id = v.scalata_id and esito = 'aperto' and confermato_il is not null) then
    raise exception 'c’è una giocata senza esito: segna prima come è andata';
  end if;

  insert into banco_puntate (passo_id, user_id, puntata)
    select p_passo, x.id, x.puntata from (
      -- la stessa regola di `puntataDi` in lib/scalata.js: all'euro per difetto
      select u.id, floor(round(public.conto_rtw(u.id) * v.percentuale, 2)) puntata
      from users u where u.copia_banco or u.role = 'superadmin'
    ) x where x.puntata >= 1;
  select sum(puntata) into totale from banco_puntate where passo_id = p_passo;
  if totale is null then raise exception 'nel banco nessuno arriva a 1 € di puntata'; end if;

  update scalata_passi set confermato_il = now(), posta = totale where id = p_passo;
  return totale;
end $$;
revoke all on function public.conferma_banco(bigint) from public, anon;
grant execute on function public.conferma_banco(bigint) to authenticated;

create or replace function public.annulla_conferma_banco(p_passo bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.esigi_superadmin();
  if not exists (select 1 from scalata_passi where id = p_passo and esito = 'aperto') then
    raise exception 'il passo ha un esito: prima va tolto quello';
  end if;
  delete from banco_puntate where passo_id = p_passo;
  update scalata_passi set confermato_il = null where id = p_passo;
end $$;
revoke all on function public.annulla_conferma_banco(bigint) from public, anon;
grant execute on function public.annulla_conferma_banco(bigint) to authenticated;

-- ── Quello che vede chi segue: mai il totale, mai gli altri ─────────────────
create or replace function public.banco_utente()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select public.mio_user_id() id),
  giro as (select s.id, s.percentuale from scalate s where s.banco and s.stato = 'aperta' order by s.id desc limit 1),
  gambe as (
    select g.passo_id, jsonb_agg(jsonb_build_object(
        'id', g.id, 'casa', g.casa, 'trasferta', g.trasferta, 'giocata', g.giocata, 'data', g.data, 'ora', g.ora,
        'gol_casa', pa.gol_casa, 'gol_trasferta', pa.gol_trasferta) order by g.id) lista
    from scalata_gambe g
    left join prossime_partite pr on pr.id = g.prossima_id
    left join partite pa on pa.id = pr.partita_id
    group by g.passo_id
  )
  select jsonb_build_object(
    'conto', public.conto_rtw((select id from me)),
    'versato', coalesce((select sum(importo) from scalata_ricariche where user_id = (select id from me)), 0),
    'percentuale', (select percentuale from giro),
    'passi', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'giorno', p.giorno, 'quota', p.quota, 'esito', p.esito,
        'confermato', p.confermato_il is not null,
        'mia_puntata', (select b.puntata from banco_puntate b where b.passo_id = p.id and b.user_id = (select id from me)),
        'gambe', coalesce((select lista from gambe where passo_id = p.id), '[]'::jsonb)) order by p.numero)
      from scalata_passi p where p.scalata_id = (select id from giro)), '[]'::jsonb),
    'storico', coalesce((select jsonb_agg(x order by x.quando desc) from (
        select p.deciso_il quando, p.id, p.quota, p.esito, b.puntata,
          coalesce((select lista from gambe where passo_id = p.id), '[]'::jsonb) gambe
        from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = (select id from me) and p.esito <> 'aperto'
          and p.scalata_id is distinct from (select id from giro)
        order by p.deciso_il desc limit 30) x), '[]'::jsonb)
  );
$$;
revoke all on function public.banco_utente() from public, anon;
grant execute on function public.banco_utente() to authenticated;

-- ── Gestione Bilanci: anche l'andamento dei singoli ─────────────────────────
drop function if exists public.riepilogo_rtw();
create function public.riepilogo_rtw()
returns table (user_id uuid, versato numeric, conto numeric, in_corso boolean, giocate int, vinte int, ultimi numeric[])
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.esigi_superadmin();
  return query
    select u.id,
      coalesce((select sum(r.importo) from scalata_ricariche r where r.user_id = u.id), 0)::numeric,
      public.conto_rtw(u.id), public.giocata_in_corso(u.id),
      (select count(*)::int from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito <> 'aperto'),
      (select count(*)::int from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito = 'vinto'),
      coalesce((select array_agg(x.r) from (
        select case p.esito when 'vinto' then round(b.puntata * (p.quota - 1), 2) else -b.puntata end r
        from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito <> 'aperto'
        order by p.deciso_il desc limit 8) x), '{}'::numeric[])
    from users u;
end $$;
revoke all on function public.riepilogo_rtw() from public, anon;
grant execute on function public.riepilogo_rtw() to authenticated;
