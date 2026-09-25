-- Vittorie, pareggi e sconfitte nella classifica di forma_partita.
--
-- La card della classifica mostrava solo posizione e punti: "8 pt" non dice
-- se sono due vittorie e due pareggi o altro. Qui si aggiungono i tre conti
-- della stagione, dentro la stessa chiamata — nessuna query in più dal browser.
--
-- Ricrea la funzione di sql/15 cambiando solo il blocco "classifica".

create or replace function public.forma_partita(p_div text, p_casa text, p_trasferta text)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_stagione text;
  v_out jsonb := '{}'::jsonb;
begin
  select max(stagione) into v_stagione from partite where div = p_div;
  if v_stagione is null then return null; end if;

  with mie as (
    select sq, data, casa, trasferta, gol_casa, gol_trasferta,
           case when sq = casa then gol_casa else gol_trasferta end as gf,
           case when sq = casa then gol_trasferta else gol_casa end as gs
    from (values (p_casa), (p_trasferta)) as s(sq)
    join partite p on p.div = p_div and p.stagione = v_stagione and (p.casa = s.sq or p.trasferta = s.sq)
  ),
  ultime as (
    select sq, data, casa, trasferta, gol_casa, gol_trasferta,
           case when gf > gs then 'V' when gf = gs then 'N' else 'P' end as esito,
           row_number() over (partition by sq order by data desc) as rn
    from mie
  )
  select jsonb_object_agg(sq, r) into strict v_out
  from (
    select sq, jsonb_agg(jsonb_build_object(
             'data', data, 'casa', casa, 'trasferta', trasferta,
             'gol_casa', gol_casa, 'gol_trasferta', gol_trasferta, 'esito', esito
           ) order by data desc) as r
    from ultime where rn <= 5 group by sq
    union all
    select sq, '[]'::jsonb from (values (p_casa), (p_trasferta)) as s(sq)
    where not exists (select 1 from ultime u where u.sq = s.sq)
  ) x;
  v_out := jsonb_build_object('stagione', v_stagione, 'ultimi5', v_out);

  v_out := v_out || jsonb_build_object('gol', (
    select jsonb_object_agg(sq, jsonb_build_object('fatti', fatti, 'subiti', subiti, 'partite', n))
    from (
      select s.sq,
             coalesce(sum(case when p.casa = s.sq then p.gol_casa else p.gol_trasferta end), 0) as fatti,
             coalesce(sum(case when p.casa = s.sq then p.gol_trasferta else p.gol_casa end), 0) as subiti,
             count(p.id) as n
      from (values (p_casa), (p_trasferta)) as s(sq)
      left join partite p on p.div = p_div and p.stagione = v_stagione and (p.casa = s.sq or p.trasferta = s.sq)
      group by s.sq
    ) g
  ));

  v_out := v_out || jsonb_build_object('scontri', coalesce((
    select jsonb_agg(jsonb_build_object(
             'data', data, 'div', div, 'casa', casa, 'trasferta', trasferta,
             'gol_casa', gol_casa, 'gol_trasferta', gol_trasferta) order by data desc)
    from (
      select * from partite
      where (casa = p_casa and trasferta = p_trasferta) or (casa = p_trasferta and trasferta = p_casa)
      order by data desc limit 5
    ) sd
  ), '[]'::jsonb));

  with righe as (
    select sq, data, punti, gf, gs from (
      select casa as sq, data,
             case when gol_casa > gol_trasferta then 3 when gol_casa = gol_trasferta then 1 else 0 end as punti,
             gol_casa as gf, gol_trasferta as gs
      from partite where div = p_div and stagione = v_stagione
      union all
      select trasferta, data,
             case when gol_trasferta > gol_casa then 3 when gol_casa = gol_trasferta then 1 else 0 end,
             gol_trasferta, gol_casa
      from partite where div = p_div and stagione = v_stagione
    ) t
  ),
  reale as (
    select sq, sum(punti) as punti, count(*) as giocate, sum(gf) - sum(gs) as dr,
           count(*) filter (where punti = 3) as vinte,
           count(*) filter (where punti = 1) as pari,
           count(*) filter (where punti = 0) as perse,
           rank() over (order by sum(punti) desc, sum(gf) - sum(gs) desc, sum(gf) desc) as pos
    from righe group by sq
  ),
  forma as (
    select sq, sum(punti) as punti5, count(*) as giocate5,
           count(*) filter (where punti = 3) as vinte5,
           count(*) filter (where punti = 1) as pari5,
           count(*) filter (where punti = 0) as perse5,
           rank() over (order by sum(punti) desc, sum(gf) - sum(gs) desc) as pos5
    from (select *, row_number() over (partition by sq order by data desc) as rn from righe) u
    where rn <= 5 group by sq
  )
  select v_out || jsonb_build_object('classifica', jsonb_object_agg(r.sq, jsonb_build_object(
           'posizione', r.pos, 'punti', r.punti, 'giocate', r.giocate,
           'vinte', r.vinte, 'pari', r.pari, 'perse', r.perse,
           'posizione_forma', f.pos5, 'punti_forma', f.punti5, 'giocate_forma', f.giocate5,
           'vinte_forma', f.vinte5, 'pari_forma', f.pari5, 'perse_forma', f.perse5,
           'squadre', (select count(*) from reale))))
    into v_out
  from reale r join forma f using (sq)
  where r.sq in (p_casa, p_trasferta);

  return v_out;
end
$$;

grant execute on function public.forma_partita(text, text, text) to authenticated;
