-- 💶 CONTI GIUSTI — un conto RTW solo, quello del database (24/11/2026, lotto S2)
--
-- Laboratorio aveva **due conti**: 138,39 € nella sua pagina e 73,39 € qui. La
-- pagina sommava ricariche e giri (`contoDi`) e non le puntate nel banco; e le
-- chiusure del giro ricevevano dalla pagina sia il finale sia il conto nuovo.
--   1. la pagina legge `mio_conto_rtw()`, e le puntate giocate quelle scritte;
--   2. `chiudi_giro` e `chiudi_giro_perso` **calcolano da sé** finale e conto:
--      i parametri restano (un telefono con la versione vecchia li manda ancora)
--      ma non si leggono più;
--   3. le righe «allineamento» di `scalata_ricariche` (24/11, al conto reale) sono
--      una **correzione del risultato**, non un versamento (Mattia);
--   4. il trasferimento non chiede più di chiudere il giro: il blocco esisteva
--      perché la pagina ricalcolava le puntate già giocate, e non lo fa più.

-- ── 1. Il conto: al centesimo passo per passo, come l'incasso vero ──────────
create or replace function public.conto_rtw(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select round(
    coalesce((select sum(importo) from scalata_ricariche where user_id = p_user), 0)
    + coalesce((select sum(bankroll_finale - bankroll_iniziale) from scalate
                where user_id = p_user and not banco and stato <> 'aperta' and bankroll_finale is not null), 0)
    + coalesce((select sum(case p.esito when 'vinto' then round(p.posta * (p.quota - 1), 2) when 'perso' then -p.posta else 0 end)
                from scalata_passi p join scalate s on s.id = p.scalata_id
                where s.user_id = p_user and not s.banco and s.stato = 'aperta'), 0)
    + coalesce((select sum(case p.esito when 'vinto' then round(b.puntata * (p.quota - 1), 2) when 'perso' then -b.puntata else 0 end)
                from banco_puntate b join scalata_passi p on p.id = b.passo_id
                where b.user_id = p_user), 0)
  , 2);
$$;
revoke all on function public.conto_rtw(uuid) from public, anon, authenticated;

-- Il bankroll di un giro adesso: da dove era partito più i suoi passi decisi.
-- `security invoker`: si legge solo un giro che si può già leggere.
create or replace function public.finale_giro(p_scalata bigint)
returns numeric language sql stable set search_path = public as $$
  select round(s.bankroll_iniziale + coalesce((
    select sum(case p.esito when 'vinto' then round(p.posta * (p.quota - 1), 2) when 'perso' then -p.posta else 0 end)
    from scalata_passi p where p.scalata_id = s.id), 0), 2)
  from scalate s where s.id = p_scalata
$$;
revoke all on function public.finale_giro(bigint) from public, anon;
grant execute on function public.finale_giro(bigint) to authenticated;

-- ── 2. Le chiusure del giro ─────────────────────────────────────────────────
create or replace function public.chiudi_giro_perso(
  p_scalata bigint, p_dopo numeric, p_finale numeric default null, p_conto numeric default null
) returns bigint language plpgsql security invoker set search_path = public as $$
declare
  v     public.scalate;
  nuovo bigint;
  conto numeric;
  posta numeric;
begin
  select * into v from public.scalate
    where id = p_scalata and user_id = public.mio_user_id() and stato = 'aperta' for update;
  if not found then raise exception 'scalata non trovata, o già chiusa'; end if;
  if v.regola <> 'percentuale' then raise exception 'solo per le scalate a percentuale'; end if;

  update public.scalate set stato = 'chiusa', chiusa_il = now(),
    bankroll_finale = public.finale_giro(p_scalata), cassa = 0, accumulo = 0
    where id = p_scalata;

  -- ⚠️ Dopo la chiusura, così il giro chiuso è già contato come chiuso.
  if v.banco then select coalesce(sum(b.conto), 0) into conto from public.stato_banco() b;
  else conto := public.mio_conto_rtw(); end if;

  -- la stessa regola di `puntataDi` in lib/scalata.js: all'euro per difetto
  posta := floor(round(conto * v.percentuale, 2));
  if posta >= 1 then
    insert into public.scalate (user_id, bankroll_iniziale, posta, quota_minima, regola, percentuale, cassa, accumulo)
      values (v.user_id, conto, posta, v.quota_minima, 'percentuale', v.percentuale, 0, 0)
      returning id into nuovo;
    update public.scalata_passi set scalata_id = nuovo
      where scalata_id = p_scalata and numero > p_dopo;
  else
    -- ⚠️ Conto troppo basso per 1 €: niente giro nuovo, serve una ricarica.
    -- Il piano non giocato si toglie (e il trigger di sql/42 lo annota).
    delete from public.scalata_passi
      where scalata_id = p_scalata and numero > p_dopo and esito = 'aperto';
  end if;
  return nuovo;
end $$;
revoke all on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) from public, anon;
grant execute on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) to authenticated;

create or replace function public.chiudi_giro(p_scalata bigint, p_finale numeric default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from public.scalate
    where id = p_scalata and user_id = public.mio_user_id() and stato = 'aperta' for update;
  if not found then raise exception 'scalata non trovata, o già chiusa'; end if;

  if exists (select 1 from public.scalata_passi
             where scalata_id = p_scalata and esito = 'aperto' and confermato_il is not null) then
    raise exception 'c’è una giocata confermata senza esito: segna prima come è andata';
  end if;

  update public.scalate set stato = 'chiusa', chiusa_il = now(),
    bankroll_finale = public.finale_giro(p_scalata), cassa = 0, accumulo = 0
    where id = p_scalata;

  delete from public.scalata_passi where scalata_id = p_scalata and esito = 'aperto';
end $$;
revoke all on function public.chiudi_giro(bigint, numeric) from public, anon;
grant execute on function public.chiudi_giro(bigint, numeric) to authenticated;

-- ── 3. Il versato: dall'ultimo azzeramento, senza le righe di allineamento ──
-- ⚠️ L'azzeramento porta il conto a 0: quello che c'era prima è chiuso. Sommarlo
-- dava ad Admin un versato di −49,46 e falsava di altrettanto il banco. La stessa
-- regola sta in `versatoDi` (lib/scalata.js).
create or replace function public.versato_rtw(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(importo), 0) from scalata_ricariche
  where user_id = p_user and nota is distinct from 'allineamento'
    and fatta_il > coalesce((select max(a.fatta_il) from scalata_ricariche a
      where a.user_id = p_user and a.nota = 'azzeramento'), '-infinity')
$$;
revoke all on function public.versato_rtw(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.riepilogo_rtw()
 RETURNS TABLE(user_id uuid, versato numeric, conto numeric, in_corso boolean, giocate integer, vinte integer, ultimi numeric[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.esigi_superadmin();
  return query
    select u.id,
      public.versato_rtw(u.id),
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
end $function$;

CREATE OR REPLACE FUNCTION public.stato_banco()
 RETURNS TABLE(user_id uuid, nome text, conto numeric, versato numeric, in_gioco numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.mio_ruolo(), '') <> 'superadmin' and not public.sono_aiutante() then
    raise exception 'Solo il superadmin vede il banco';
  end if;
  return query
    select u.id, coalesce(u.display_name, u.username)::text, public.conto_rtw(u.id),
      public.versato_rtw(u.id),
      (select b.puntata from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito = 'aperto' limit 1)
    from users u where u.copia_banco or u.role = 'superadmin'
    order by u.username;
end $function$;

CREATE OR REPLACE FUNCTION public.banco_utente()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select public.mio_user_id() id),
  giro as (select s.id, s.percentuale from scalate s where s.banco and s.stato = 'aperta' order by s.id desc limit 1),
  gambe as (
    select g.passo_id, jsonb_agg(jsonb_build_object(
        'id', g.id, 'prossima_id', g.prossima_id, 'div', g.div, 'casa', g.casa, 'trasferta', g.trasferta,
        'giocata', g.giocata, 'data', g.data, 'ora', g.ora, 'quota', g.quota, 'att', g.att, 'scelta', g.scelta, 'vpm', g.vpm,
        'gol_casa', pa.gol_casa, 'gol_trasferta', pa.gol_trasferta) order by g.id) lista
    from scalata_gambe g
    left join prossime_partite pr on pr.id = g.prossima_id
    left join partite pa on pa.id = pr.partita_id
    group by g.passo_id
  )
  select jsonb_build_object(
    'conto', public.conto_rtw((select id from me)),
    'versato', public.versato_rtw((select id from me)),
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
        order by p.deciso_il desc limit 30) x), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.statistiche_rtw(p_banco boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- La correzione al conto reale è risultato, non versamento (24/11/2026).
  , correzione as (
    select coalesce(sum(r.importo), 0) v from scalata_ricariche r where r.nota = 'allineamento'
      and (case when (select sa from me)
        then exists (select 1 from users u where u.id = r.user_id and (u.copia_banco or u.role = 'superadmin'))
        else r.user_id = (select id from me) end)
  )
  select jsonb_build_object(
    'conto', (select v from conto),
    'risultato', (select v from risultato) + (select v from correzione),
    'passi', (select count(*) from passi),
    'passi_presi', (select count(*) from passi where esito = 'vinto'),
    'partite', coalesce((select jsonb_agg(jsonb_build_object('giocata', g.giocata, 'gol_casa', pa.gol_casa, 'gol_trasferta', pa.gol_trasferta))
      from scalata_gambe g
      join passi on passi.id = g.passo_id
      join prossime_partite pr on pr.id = g.prossima_id
      join partite pa on pa.id = pr.partita_id), '[]'::jsonb)
  );
$function$;

-- ── 4. Il trasferimento: non chiede più di chiudere il giro ─────────────────
CREATE OR REPLACE FUNCTION public.trasferisci_rtw(p_user uuid, p_importo numeric, p_verso text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if p_verso = 'a_rtw' then
    cassa := public.ricalcola_bankroll(p_user);
    if imp > cassa then raise exception 'in cassa ci sono solo % €', cassa; end if;
  elsif imp > public.conto_rtw(p_user) then
    raise exception 'nel conto RTW ci sono solo % €', public.conto_rtw(p_user);
  end if;

  insert into movimenti (user_id, tipo, importo, nota, rtw)
    values (p_user, case p_verso when 'a_rtw' then 'prelievo' else 'deposito' end, imp,
            case p_verso when 'a_rtw' then 'Trasferimento a RTW' else 'Ritorno da RTW' end, true)
    returning id into mov;
  insert into scalata_ricariche (user_id, importo, nota, movimento_id)
    values (p_user, case p_verso when 'a_rtw' then imp else -imp end,
            case p_verso when 'a_rtw' then 'dalla cassa' else 'in cassa' end, mov);
  -- Un giro non ancora giocato riparte dal conto nuovo; sotto 1 € non si può
  -- puntare e il piano si toglie. Un giro già giocato resta com'è.
  delete from scalate s where s.user_id = p_user and not s.banco and s.stato = 'aperta' and public.conto_rtw(p_user) < 1
    and not exists (select 1 from scalata_passi p where p.scalata_id = s.id and p.esito <> 'aperto');
  update scalate s set bankroll_iniziale = public.conto_rtw(p_user)
    where s.user_id = p_user and not s.banco and s.stato = 'aperta'
      and not exists (select 1 from scalata_passi p where p.scalata_id = s.id and p.esito <> 'aperto');
  perform public.ricalcola_bankroll(p_user);
end $function$;
revoke all on function public.riepilogo_rtw() from public, anon;
grant execute on function public.riepilogo_rtw() to authenticated;
revoke all on function public.stato_banco() from public, anon;
grant execute on function public.stato_banco() to authenticated;
revoke all on function public.banco_utente() from public, anon;
grant execute on function public.banco_utente() to authenticated;
revoke all on function public.statistiche_rtw(boolean) from public, anon;
grant execute on function public.statistiche_rtw(boolean) to authenticated;
revoke all on function public.trasferisci_rtw(uuid, numeric, text) from public, anon;
grant execute on function public.trasferisci_rtw(uuid, numeric, text) to authenticated;
