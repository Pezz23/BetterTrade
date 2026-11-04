-- 🪜 Chi segue il banco vede il passo attivo con la stessa card di chi gioca da
-- solo (Mattia, 04/11/2026): alla riga servono anche campionato, quota e i tre
-- numeri della selezione. Sono i dati della partita: niente totale, niente altri.

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
          and p.scalata_id is distinct from (select id from giro)
        order by p.deciso_il desc limit 30) x), '[]'::jsonb)
  );
$$;
revoke all on function public.banco_utente() from public, anon;
grant execute on function public.banco_utente() to authenticated;
