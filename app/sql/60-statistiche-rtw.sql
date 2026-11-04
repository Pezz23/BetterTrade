-- 🪜 ROAD TO WEEKEND — i numeri in cima all'Archivio (04/11/2026)
--
-- Mattia: % di guadagno sui soldi versati, passi presi, partite prese, e *"i
-- conteggi falli partire da oggi per tutti"*.
-- ⚠️ `conto − versato` qui non si può usare: il conto di chi è stato azzerato
-- porta con sé i risultati di prima. Si sommano solo i risultati da oggi, e la
-- base è il conto meno quei risultati: i soldi che ci sono, da oggi.
-- ⚠️ Le partite tornano coi gol: «presa» la decide `giocataArrivata` nel browser,
-- la regola resta in un posto solo.
-- ⚠️ Chi segue vede la sua puntata, mai il totale. Il superadmin vede il banco.

create or replace function public.statistiche_rtw()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select public.mio_user_id() id, public.mio_ruolo() = 'superadmin' sa
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
revoke all on function public.statistiche_rtw() from public, anon;
grant execute on function public.statistiche_rtw() to authenticated;

-- L'archivio di chi segue: tutte le sue giocate, anche quelle del giro in corso.
create or replace function public.banco_utente()
returns jsonb language sql stable security definer set search_path = public as $$
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
        order by p.deciso_il desc limit 30) x), '[]'::jsonb)
  );
$$;
revoke all on function public.banco_utente() from public, anon;
grant execute on function public.banco_utente() to authenticated;
