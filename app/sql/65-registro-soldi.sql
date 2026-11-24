-- 💶 IL REGISTRO DEI SOLDI — dal giorno 1, 24/11/2026 (lotto S4)
--
-- Mattia: *"avere visione del denaro di tutti, il loro andamento, la visione
-- completa del conto (slot e RTW), così da avere il polso della situazione e
-- verificare eventuali discrepanze"*.
--
-- ⚠️ **Gli eventi non si scrivono: si leggono** dalle tabelle che già fanno il conto
-- (movimenti, giornate, passi, ricariche). Un registro scritto a parte sarebbe una
-- seconda verità da tenere allineata (regola 1).
-- ⚠️ L'unica cosa scritta è la **foto del giorno 1**, e serve a controllare: foto +
-- eventi deve fare il saldo di adesso. Se qualcuno tocca un dato VECCHIO (una
-- giornata del 2025, un movimento, un saldo iniziale) il saldo cambia senza un
-- evento, e lo **scarto** lo dice.
-- ⚠️ Torna un `jsonb` e non una tabella: PostgREST taglia a 1000 righe in silenzio.

create table if not exists public.foto_conti (
  user_id  uuid not null references public.users(id) on delete cascade,
  fatta_il timestamptz not null,
  cassa    numeric not null,
  rtw      numeric not null,
  primary key (user_id, fatta_il)
);
alter table public.foto_conti enable row level security;
drop policy if exists foto_conti_select on public.foto_conti;
create policy foto_conti_select on public.foto_conti for select to authenticated
  using (user_id = public.mio_user_id() or public.mio_ruolo() = 'superadmin');
-- Nessuna policy di scrittura: la foto la fa questa migrazione e non si cambia.

-- La cassa calcolata dalle fonti: la stessa somma di `ricalcola_bankroll`, senza
-- scrivere la cache.
create or replace function public.cassa_di(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select round((coalesce(u.bankroll_iniziale, 0)
    + coalesce((select sum(case when m.tipo = 'deposito' then m.importo else -m.importo end) from movimenti m where m.user_id = u.id), 0)
    + coalesce((select sum(g.tot_saldo) from giornate g where g.user_id = u.id), 0))::numeric, 2)
  from users u where u.id = p_user
$$;
revoke all on function public.cassa_di(uuid) from public, anon, authenticated;

-- Il giorno 1: subito dopo l'allineamento al conto reale (13:56:58 UTC).
create or replace function public.giorno_uno()
returns timestamptz language sql immutable as $$ select timestamptz '2026-11-24 14:00:00+00' $$;
revoke all on function public.giorno_uno() from public, anon, authenticated;

-- ── Gli eventi dal giorno 1 ─────────────────────────────────────────────────
-- `tipo`: slot · passo · correzione (sono risultato) | deposito · prelievo ·
-- trasferimento (spostano soldi, non sono guadagno). `rif` lega le righe dello
-- stesso fatto: un passo del banco, i due lati di un trasferimento.
-- ⚠️ `movimenti.created_at` e `giornate.created_at` sono SENZA fuso, in UTC.
create or replace function public.eventi_soldi(p_user uuid default null)
returns table (quando timestamptz, user_id uuid, conto text, tipo text, importo numeric, motivo text, rif text)
language sql stable security definer set search_path = public as $$
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
        || ' @' || replace(to_char(coalesce(p.quota_vera, p.quota), 'FM999990.00'), '.', ','),
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
$$;
revoke all on function public.eventi_soldi(uuid) from public, anon, authenticated;

-- ── La foto ─────────────────────────────────────────────────────────────────
-- ⚠️ Il saldo di adesso **meno** gli eventi già successi: rieseguita più tardi, o con
-- una giocata chiusa nel frattempo, la foto è comunque quella delle 14:00 UTC.
insert into public.foto_conti (user_id, fatta_il, cassa, rtw)
  select u.id, public.giorno_uno(),
    public.cassa_di(u.id) - coalesce((select sum(e.importo) from public.eventi_soldi(u.id) e where e.conto = 'cassa'), 0),
    public.conto_rtw(u.id) - coalesce((select sum(e.importo) from public.eventi_soldi(u.id) e where e.conto = 'rtw'), 0)
  from public.users u
  on conflict do nothing;

-- ── Quello che legge l'app ──────────────────────────────────────────────────
-- Il superadmin tutto, ogni utente il suo, gli aiutanti solo il proprio (Mattia).
create or replace function public.registro_soldi()
returns jsonb language plpgsql stable security definer set search_path = public as $$
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
          'tipo', tipo, 'importo', importo, 'motivo', motivo, 'rif', rif) order by quando, rif, conto)
        from ev where user_id in (select id from chi)), '[]'::jsonb)
    )
  );
end $$;
revoke all on function public.registro_soldi() from public, anon;
grant execute on function public.registro_soldi() to authenticated;
