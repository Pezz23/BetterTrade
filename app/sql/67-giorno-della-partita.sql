-- 🕯️ IL GIORNO DI UN EVENTO, per le candele (25/11/2026)
--
-- Mattia: *"la candela deve iniziare con il saldo iniziale e finire con il saldo di
-- fine giornata solare (non quando chiudo la schedina)"*. Una schedina sta nel giorno
-- della sua **ultima partita**, anche se l'esito si segna il giorno dopo; un cash out
-- fatto prima sta nel giorno del cash out. Una slot nella data della giornata; un
-- movimento nel giorno in cui è fatto (ora italiana).
-- ⚠️ `least` in Postgres ignora i null: senza data resta il giorno di `quando`.
-- ⚠️ Cambia il tipo di ritorno: serve il drop. Il Registro resta ordinato per `quando`.

drop function if exists public.eventi_soldi(uuid);
CREATE OR REPLACE FUNCTION public.eventi_soldi(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(quando timestamp with time zone, user_id uuid, conto text, tipo text, importo numeric, motivo text, rif text, giorno date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with schedina as (
    select g.passo_id, string_agg(g.casa || '-' || g.trasferta || ' ' || g.giocata, ' · ' order by g.id) testo,
      max(g.data)::date ultima
    from scalata_gambe g group by g.passo_id
  ),
  e as (
    -- la cassa: movimenti
    select m.created_at at time zone 'UTC' quando, m.user_id, 'cassa'::text conto,
      case when m.rtw then 'trasferimento'
           when m.nota like 'Trasferimento SuperAdmin%' or m.nota like 'Allineamento totale%' then 'correzione'
           else m.tipo end tipo,
      case when m.tipo = 'deposito' then m.importo else -m.importo end importo,
      m.nota motivo, 'm' || m.id rif, null::date giorno
    from movimenti m
    union all
    -- la cassa: giornate di slot
    select g.created_at at time zone 'UTC', g.user_id, 'cassa', 'slot', g.tot_saldo::numeric,
      'Slot ' || g.stagione || ' week ' || g.week_number, 'g' || g.stagione || '/' || g.week_number,
      case when g.data ~ '^\d{2}/\d{2}/\d{4}$' then to_date(g.data, 'DD/MM/YYYY') end
    from giornate g
    union all
    -- RTW: trasferimenti, allineamenti, azzeramenti
    select r.fatta_il, r.user_id, 'rtw',
      case when r.movimento_id is not null then 'trasferimento'
           when r.nota in ('allineamento', 'azzeramento') then 'correzione'
           when r.importo > 0 then 'deposito' else 'prelievo' end,
      r.importo, r.nota, coalesce('m' || r.movimento_id, 'r' || r.id), null::date
    from scalata_ricariche r where r.passo_id is null
    union all
    -- RTW: i passi decisi, con la rettifica dei soldi veri dentro
    select p.deciso_il, x.user_id, 'rtw', 'passo', x.importo,
      (case p.esito when 'vinto' then '✓ ' else '✗ ' end) || coalesce(sc.testo, 'passo')
        || ' @' || replace(to_char(coalesce(p.quota_vera, p.quota), 'FM999990.00'), '.', ',') || case when p.cashout then ' · cash out' else '' end,
      'p' || p.id, sc.ultima
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
  select e.quando, e.user_id, e.conto, e.tipo, e.importo, e.motivo, e.rif,
    -- il giorno della partita, mai dopo quello in cui si è segnato (cash out) e mai
    -- prima del giorno 1
    greatest(least(e.giorno, (e.quando at time zone 'Europe/Rome')::date), (public.giorno_uno() at time zone 'Europe/Rome')::date)
  from e
  where e.quando > public.giorno_uno() and (p_user is null or e.user_id = p_user) and e.importo <> 0
$function$;
revoke all on function public.eventi_soldi(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.registro_soldi()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  io    uuid := public.mio_user_id();
  tutti boolean := coalesce(public.mio_ruolo(), '') = 'superadmin';
begin
  if io is null then raise exception 'serve il login'; end if;
  return (
    with chi as (
      select u.* from users u where (tutti and u.role <> 'superadmin') or u.id = io
    ),
    ev as (select * from public.eventi_soldi(case when tutti then null else io end)),
    conti as (
      select c.id, coalesce(c.display_name, c.username) nome, c.in_totale, c.copia_banco,
        -- chi nasce dopo il giorno 1 parte dal suo saldo iniziale
        coalesce(f.cassa, c.bankroll_iniziale, 0) apre_cassa, coalesce(f.rtw, 0) apre_rtw,
        public.cassa_di(c.id) cassa, public.conto_rtw(c.id) rtw,
        coalesce((select sum(b.puntata) from banco_puntate b join scalata_passi p on p.id = b.passo_id
                  where b.user_id = c.id and p.esito = 'aperto'), 0)
        + coalesce((select sum(p.posta) from scalata_passi p join scalate s on s.id = p.scalata_id
                  where s.user_id = c.id and not s.banco and s.stato = 'aperta' and p.esito = 'aperto' and p.confermato_il is not null), 0) in_gioco,
        coalesce((select sum(e.importo) from ev e where e.user_id = c.id and e.conto = 'cassa'), 0) ev_cassa,
        coalesce((select sum(e.importo) from ev e where e.user_id = c.id and e.conto = 'rtw'), 0) ev_rtw
      from chi c left join foto_conti f on f.user_id = c.id and f.fatta_il = public.giorno_uno()
    )
    select jsonb_build_object(
      'dal', public.giorno_uno(),
      'utenti', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'in_totale', in_totale,
          'copia_banco', copia_banco, 'apre_cassa', apre_cassa, 'apre_rtw', apre_rtw, 'cassa', cassa, 'rtw', rtw,
          'in_gioco', in_gioco, 'scarto', round(cassa + rtw - apre_cassa - apre_rtw - ev_cassa - ev_rtw, 2)) order by nome)
        from conti), '[]'::jsonb),
      'eventi', coalesce((select jsonb_agg(jsonb_build_object('quando', quando, 'user_id', user_id, 'conto', conto,
          'tipo', tipo, 'importo', importo, 'motivo', motivo, 'rif', rif, 'giorno', giorno) order by quando, rif, conto)
        from ev where user_id in (select id from chi)), '[]'::jsonb)
    )
  );
end $function$;
revoke all on function public.registro_soldi() from public, anon;
grant execute on function public.registro_soldi() to authenticated;
