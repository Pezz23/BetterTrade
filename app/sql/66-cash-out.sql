-- 💶 LA SPUNTA «CASH OUT» sul passo (25/11/2026)
--
-- Mattia: *"ieri c'era una differenza di 35 € perché in realtà ho fatto cash out.
-- Possiamo aggiungere una spunta «CashOut» nel pop up di conferma? mi serve solo per
-- tracciare quante volte lo faccio"*. Solo un segno sul passo: i conti non cambiano,
-- li fanno già gli importi veri (`sql/63`).
-- ⚠️ Solo su ✓: un cash out ha sempre un incasso, anche quando è in perdita.

alter table public.scalata_passi add column if not exists cashout boolean not null default false;

CREATE OR REPLACE FUNCTION public.passo_esito_cambiato()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from scalata_ricariche where passo_id = new.id;
  new.giocato_vero := null;
  new.incasso_vero := null;
  new.cashout := false;
  return new;
end $function$;

-- ⚠️ La vecchia firma si toglie: due funzioni con gli stessi nomi di parametri e
-- PostgREST non sa quale chiamare. Un'app vecchia chiama questa, senza la spunta.
drop function if exists public.decidi_passo(bigint, text, numeric, numeric);
CREATE OR REPLACE FUNCTION public.decidi_passo(p_passo bigint, p_esito text, p_giocato numeric, p_incasso numeric DEFAULT NULL::numeric, p_cashout boolean DEFAULT false)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v       record;
  giocato numeric := round(p_giocato, 2);
  incasso numeric := round(p_incasso, 2);
  nell_app numeric;
  diff    numeric;
  totale  numeric;
  dati    numeric;
  resto   uuid;
begin
  if p_esito not in ('vinto', 'perso') then raise exception 'esito sconosciuto'; end if;
  if giocato is null or giocato <= 0 then raise exception 'importo giocato non valido'; end if;
  if p_esito = 'vinto' and (incasso is null or incasso <= 0) then raise exception 'importo vinto non valido'; end if;
  if p_esito = 'perso' then incasso := 0; end if;

  -- ⚠️ Solo il titolare del giro, e il giro del banco è del superadmin.
  select p.id, p.numero, p.posta, p.quota, p.esito, p.confermato_il, s.id giro, s.banco, s.user_id into v
    from scalata_passi p join scalate s on s.id = p.scalata_id
    where p.id = p_passo and s.user_id = public.mio_user_id() and s.stato = 'aperta'
    for update of p, s;
  if not found then raise exception 'non è un passo di un tuo giro aperto'; end if;
  if v.confermato_il is null and v.esito = 'aperto' then raise exception 'prima conferma la giocata'; end if;
  if v.esito = p_esito then raise exception 'l’esito è già segnato: prima toglilo con la matita'; end if;
  if p_esito = 'perso' and exists (select 1 from scalata_passi
       where scalata_id = v.giro and numero > v.numero and (esito <> 'aperto' or confermato_il is not null)) then
    raise exception 'prima togli l’esito e la conferma dei passi dopo: un perso chiude il giro qui';
  end if;

  update scalata_passi set esito = p_esito, deciso_il = now(),
    montante = case when p_esito = 'vinto' then incasso end, messo_via = null, resto = null
    where id = p_passo;
  -- ⚠️ In due scritture: il trigger azzera i valori veri quando cambia l'esito.
  update scalata_passi set giocato_vero = giocato, incasso_vero = incasso,
    cashout = p_esito = 'vinto' and coalesce(p_cashout, false) where id = p_passo;
  update scalata_gambe set esito = p_esito where passo_id = p_passo;

  if v.banco then
    select sum(puntata), sum(case p_esito when 'vinto' then round(puntata * (v.quota - 1), 2) else -puntata end)
      into totale, nell_app from banco_puntate where passo_id = p_passo;
    if totale is null then raise exception 'il passo non ha puntate: toglilo e confermalo di nuovo'; end if;
  else
    nell_app := case p_esito when 'vinto' then round(v.posta * (v.quota - 1), 2) else -v.posta end;
  end if;
  diff := (incasso - giocato) - nell_app;

  if diff <> 0 and v.banco then
    insert into scalata_ricariche (user_id, importo, nota, passo_id)
      select x.user_id, x.parte, 'rettifica', p_passo
      from (select user_id, trunc(diff * puntata / totale, 2) parte from banco_puntate where passo_id = p_passo) x
      where x.parte <> 0;
    select coalesce(sum(importo), 0) into dati from scalata_ricariche where passo_id = p_passo;
    if diff <> dati then
      select id into resto from users where lower(username) = 'laboratorio';
      if resto is null then
        select user_id into resto from banco_puntate where passo_id = p_passo order by puntata desc, user_id limit 1;
      end if;
      insert into scalata_ricariche (user_id, importo, nota, passo_id) values (resto, diff - dati, 'rettifica', p_passo);
    end if;
  elsif diff <> 0 then
    insert into scalata_ricariche (user_id, importo, nota, passo_id) values (v.user_id, diff, 'rettifica', p_passo);
  end if;

  -- ⚠️ Dopo la rettifica: il giro che riparte nasce dal conto vero.
  if p_esito = 'perso' then perform public.chiudi_giro_perso(v.giro, v.numero); end if;
  return diff;
end $function$;
revoke all on function public.decidi_passo(bigint, text, numeric, numeric, boolean) from public, anon;
grant execute on function public.decidi_passo(bigint, text, numeric, numeric, boolean) to authenticated;

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
    select p.id, p.esito, p.quota, p.cashout,
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
    select coalesce(sum(r.importo), 0) v from scalata_ricariche r where (r.nota = 'allineamento' or r.passo_id is not null)
      and (case when (select sa from me)
        then (r.passo_id is null and exists (select 1 from users u where u.id = r.user_id and (u.copia_banco or u.role = 'superadmin')))
          or exists (select 1 from scalata_passi p join scalate s on s.id = p.scalata_id where p.id = r.passo_id and s.banco)
        else r.user_id = (select id from me) end)
  )
  select jsonb_build_object(
    'conto', (select v from conto),
    'risultato', (select v from risultato) + (select v from correzione),
    'passi', (select count(*) from passi),
    'passi_presi', (select count(*) from passi where esito = 'vinto'),
    'cashout', (select count(*) from passi where cashout),
    'partite', coalesce((select jsonb_agg(jsonb_build_object('giocata', g.giocata, 'gol_casa', pa.gol_casa, 'gol_trasferta', pa.gol_trasferta))
      from scalata_gambe g
      join passi on passi.id = g.passo_id
      join prossime_partite pr on pr.id = g.prossima_id
      join partite pa on pa.id = pr.partita_id), '[]'::jsonb)
  );
$function$;
revoke all on function public.statistiche_rtw(boolean) from public, anon;
grant execute on function public.statistiche_rtw(boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.eventi_soldi(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(quando timestamp with time zone, user_id uuid, conto text, tipo text, importo numeric, motivo text, rif text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with schedina as (
    select g.passo_id, string_agg(g.casa || '-' || g.trasferta || ' ' || g.giocata, ' · ' order by g.id) testo
    from scalata_gambe g group by g.passo_id
  ),
  e as (
    -- la cassa: movimenti
    select m.created_at at time zone 'UTC' quando, m.user_id, 'cassa'::text conto,
      case when m.rtw then 'trasferimento'
           when m.nota like 'Trasferimento SuperAdmin%' or m.nota like 'Allineamento totale%' then 'correzione'
           else m.tipo end tipo,
      case when m.tipo = 'deposito' then m.importo else -m.importo end importo,
      m.nota motivo, 'm' || m.id rif
    from movimenti m
    union all
    -- la cassa: giornate di slot
    select g.created_at at time zone 'UTC', g.user_id, 'cassa', 'slot', g.tot_saldo::numeric,
      'Slot ' || g.stagione || ' week ' || g.week_number, 'g' || g.stagione || '/' || g.week_number
    from giornate g
    union all
    -- RTW: trasferimenti, allineamenti, azzeramenti
    select r.fatta_il, r.user_id, 'rtw',
      case when r.movimento_id is not null then 'trasferimento'
           when r.nota in ('allineamento', 'azzeramento') then 'correzione'
           when r.importo > 0 then 'deposito' else 'prelievo' end,
      r.importo, r.nota, coalesce('m' || r.movimento_id, 'r' || r.id)
    from scalata_ricariche r where r.passo_id is null
    union all
    -- RTW: i passi decisi, con la rettifica dei soldi veri dentro
    select p.deciso_il, x.user_id, 'rtw', 'passo', x.importo,
      (case p.esito when 'vinto' then '✓ ' else '✗ ' end) || coalesce(sc.testo, 'passo')
        || ' @' || replace(to_char(coalesce(p.quota_vera, p.quota), 'FM999990.00'), '.', ',') || case when p.cashout then ' · cash out' else '' end,
      'p' || p.id
    from scalata_passi p join scalate s on s.id = p.scalata_id
    left join schedina sc on sc.passo_id = p.id
    cross join lateral (
      select y.user_id, sum(y.importo) importo from (
        select b.user_id, case p.esito when 'vinto' then round(b.puntata * (p.quota - 1), 2) else -b.puntata end importo
          from banco_puntate b where b.passo_id = p.id and s.banco
        union all
        select s.user_id, case p.esito when 'vinto' then round(p.posta * (p.quota - 1), 2) else -p.posta end
          where not s.banco
        union all
        select r.user_id, r.importo from scalata_ricariche r where r.passo_id = p.id
      ) y group by y.user_id
    ) x
    where p.esito <> 'aperto'
  )
  select e.quando, e.user_id, e.conto, e.tipo, e.importo, e.motivo, e.rif from e
  where e.quando > public.giorno_uno() and (p_user is null or e.user_id = p_user) and e.importo <> 0
$function$;
revoke all on function public.eventi_soldi(uuid) from public, anon, authenticated;
