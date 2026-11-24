-- 💶 L'ESITO COI SOLDI VERI — il pop-up «Sistema i conti» (24/11/2026, lotto S3)
--
-- Mattia: *"un pop-up quando confermo: importo giocato, importo vinto e sotto un
-- tasto sistema i conti"*, a ogni passo, su ✓ e su ✗. Serve perché l'app scrive la
-- puntata del momento in cui si registra (8 passi del banco su 19 a cose fatte) e
-- la quota della media dei book: da lì nasceva il disallineamento col conto reale.
--
-- La differenza fra vero e app diventa righe di `scalata_ricariche` legate al passo
-- (`passo_id`, nota «rettifica»): nel banco **in proporzione alle puntate**, coi
-- centesimi che avanzano a Laboratorio; in un giro personale tutta al titolare.
-- ⚠️ `posta` e `banco_puntate` restano quelle dell'app: la storia dice cosa si era
-- deciso, la rettifica dice cos'è successo. Il conto (`conto_rtw`) somma tutto.
-- ⚠️ La rettifica vive e muore col passo: se l'esito cambia o si toglie (matita) la
-- cancella il trigger, qualunque sia la versione dell'app che scrive.

alter table public.scalata_passi add column if not exists giocato_vero numeric check (giocato_vero > 0);
alter table public.scalata_passi add column if not exists incasso_vero numeric check (incasso_vero >= 0);
alter table public.scalata_ricariche add column if not exists passo_id bigint references public.scalata_passi(id) on delete cascade;
create index if not exists ricariche_per_passo on public.scalata_ricariche (passo_id) where passo_id is not null;

-- `security definer`: nessuno può cancellare una ricarica dall'app (sql/55).
create or replace function public.passo_esito_cambiato()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from scalata_ricariche where passo_id = new.id;
  new.giocato_vero := null;
  new.incasso_vero := null;
  return new;
end $$;
drop trigger if exists passo_esito_cambiato on public.scalata_passi;
create trigger passo_esito_cambiato before update on public.scalata_passi
  for each row when (old.esito is distinct from new.esito)
  execute function public.passo_esito_cambiato();

create or replace function public.decidi_passo(p_passo bigint, p_esito text, p_giocato numeric, p_incasso numeric default null)
returns numeric language plpgsql security definer set search_path = public as $$
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
  update scalata_passi set giocato_vero = giocato, incasso_vero = incasso where id = p_passo;
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
end $$;
revoke all on function public.decidi_passo(bigint, text, numeric, numeric) from public, anon;
grant execute on function public.decidi_passo(bigint, text, numeric, numeric) to authenticated;

-- ── La rettifica è risultato, non versamento ────────────────────────────────
create or replace function public.versato_rtw(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(importo), 0) from scalata_ricariche
  where user_id = p_user and nota is distinct from 'allineamento' and passo_id is null
    and fatta_il > coalesce((select max(a.fatta_il) from scalata_ricariche a
      where a.user_id = p_user and a.nota = 'azzeramento'), '-infinity')
$$;
revoke all on function public.versato_rtw(uuid) from public, anon, authenticated;

-- Quanto la rettifica di un passo ha spostato sul conto di un utente.
create or replace function public.rettifica_di(p_passo bigint, p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(importo), 0) from scalata_ricariche where passo_id = p_passo and user_id = p_user
$$;
revoke all on function public.rettifica_di(bigint, uuid) from public, anon, authenticated;

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
        select case p.esito when 'vinto' then round(b.puntata * (p.quota - 1), 2) else -b.puntata end
          + public.rettifica_di(p.id, u.id) r
        from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = u.id and p.esito <> 'aperto'
        order by p.deciso_il desc limit 8) x), '{}'::numeric[])
    from users u;
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
        'rettifica', public.rettifica_di(p.id, (select id from me)),
        'gambe', coalesce((select lista from gambe where passo_id = p.id), '[]'::jsonb)) order by p.numero)
      from scalata_passi p where p.scalata_id = (select id from giro)), '[]'::jsonb),
    'storico', coalesce((select jsonb_agg(x order by x.quando desc) from (
        select p.deciso_il quando, p.id, p.quota, p.esito, b.puntata, public.rettifica_di(p.id, b.user_id) rettifica,
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
    'partite', coalesce((select jsonb_agg(jsonb_build_object('giocata', g.giocata, 'gol_casa', pa.gol_casa, 'gol_trasferta', pa.gol_trasferta))
      from scalata_gambe g
      join passi on passi.id = g.passo_id
      join prossime_partite pr on pr.id = g.prossima_id
      join partite pa on pa.id = pr.partita_id), '[]'::jsonb)
  );
$function$;
revoke all on function public.riepilogo_rtw() from public, anon;
grant execute on function public.riepilogo_rtw() to authenticated;
revoke all on function public.banco_utente() from public, anon;
grant execute on function public.banco_utente() to authenticated;
revoke all on function public.statistiche_rtw(boolean) from public, anon;
grant execute on function public.statistiche_rtw(boolean) to authenticated;
