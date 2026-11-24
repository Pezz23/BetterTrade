-- 💶 LA QUOTA VERA DEL PASSO, bonus compresi (24/11/2026)
--
-- Mattia: *"a me serve la quota totale vera comprensiva di eventuali bonus, quindi
-- quando verifico gli importi la quota totale del passo deve essere ricalcolata"*.
-- È incasso ÷ giocato, **calcolata dal database** dai due importi di «Sistema i
-- conti»: si mostra al posto di `quota` ovunque.
-- ⚠️ `quota` non si sovrascrive: `conto_rtw` è quota dell'app **più** rettifica, e
-- con la quota vera al suo posto la differenza si conterebbe due volte.
-- ⚠️ Su un perso resta quella dell'app: senza incasso non si può ricavare.

alter table public.scalata_passi add column if not exists quota_vera numeric
  generated always as (case when incasso_vero > 0 and giocato_vero > 0
    then round(incasso_vero / giocato_vero, 4) end) stored;

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
        'id', p.id, 'numero', p.numero, 'giorno', p.giorno, 'quota', p.quota, 'quota_vera', p.quota_vera, 'esito', p.esito,
        'confermato', p.confermato_il is not null,
        'mia_puntata', (select b.puntata from banco_puntate b where b.passo_id = p.id and b.user_id = (select id from me)),
        'rettifica', public.rettifica_di(p.id, (select id from me)),
        'gambe', coalesce((select lista from gambe where passo_id = p.id), '[]'::jsonb)) order by p.numero)
      from scalata_passi p where p.scalata_id = (select id from giro)), '[]'::jsonb),
    'storico', coalesce((select jsonb_agg(x order by x.quando desc) from (
        select p.deciso_il quando, p.id, p.quota, p.quota_vera, p.esito, b.puntata, public.rettifica_di(p.id, b.user_id) rettifica,
          coalesce((select lista from gambe where passo_id = p.id), '[]'::jsonb) gambe
        from banco_puntate b join scalata_passi p on p.id = b.passo_id
        where b.user_id = (select id from me) and p.esito <> 'aperto'
        order by p.deciso_il desc limit 30) x), '[]'::jsonb)
  );
$function$;
revoke all on function public.banco_utente() from public, anon;
grant execute on function public.banco_utente() to authenticated;
