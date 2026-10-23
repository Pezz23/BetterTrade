-- CONTEGGI — angoli e cartellini per squadra, in una chiamata per competizione.
--
-- Stessa strada di vpm_dati() (sql/20): il database dà i **numeri grezzi**, la
-- libreria (`src/lib/conteggi.js`) decide cosa valgono. Così la stretta verso
-- la media e le soglie si ritoccano senza una migrazione.
--
-- ⚠️⚠️ **Per competizione e non per tutto l'archivio.** `vpm_dati()` torna 77
-- kB perché serve alla lista di duecento partite; questa serve alla **scheda di
-- UNA partita**, e tornare 54.000 righe di conteggi per mostrarne due sarebbe
-- pagare mille volte quello che serve.
--
-- ⚠️ **Casa e fuori separati, e fatti separati dai subiti.** Quattro liste per
-- squadra, non una media: in Champions chi gioca in casa batte 4,9 angoli
-- contro i 3,9 dell'ospite, e una media unica spalmerebbe quel vantaggio su
-- tutt'e due.
--
-- ⚠️⚠️ **Solo partite con le statistiche.** `angoli_casa is not null` non è
-- una finezza: nelle stagioni vecchie ESPN non ha il riepilogo, e una media
-- calcolata su righe vuote sarebbe uno zero travestito da dato.

create or replace function public.conteggi_dati(p_div text, p_ultime int default 10)
returns jsonb
language sql
stable
set search_path = public
as $$
-- ⚠️⚠️ **Tre anni, non tutto l'archivio.** Le ultime dieci partite in casa di
-- una squadra che in Champions ci torna ogni tanto possono arrivare dal 2017:
-- il suo tasso di angoli di nove anni fa non descrive la squadra di stasera —
-- sono altri giocatori e spesso un altro allenatore. Meglio poche partite
-- recenti, con `nCasa`/`nFuori` scritti accanto, che una media lunga e falsa.
with recenti as (
  select data, casa, trasferta, angoli_casa, angoli_trasf, gialli_casa, gialli_trasf
  from partite
  where div = p_div and angoli_casa is not null and gialli_casa is not null
    and data > current_date - 1095
),
-- ⚠️ Le medie della competizione si contano sulle **ultime due stagioni**, non
-- su dieci anni: gli arbitri e i regolamenti cambiano, e la media dei
-- cartellini del 2016 non descrive una partita di oggi.
media_lega as (
  select avg(angoli_casa) as ang_casa, avg(angoli_trasf) as ang_trasf,
         avg(gialli_casa) as car_casa, avg(gialli_trasf) as car_trasf,
         count(*) as n
  from recenti where data > current_date - 730
),
-- le ultime N in casa e le ultime N fuori, per squadra
in_casa as (
  select casa as sq, angoli_casa a_fatti, angoli_trasf a_subiti,
         gialli_casa c_fatti, gialli_trasf c_subiti,
         row_number() over (partition by casa order by data desc) rn
  from recenti
),
in_trasferta as (
  select trasferta as sq, angoli_trasf a_fatti, angoli_casa a_subiti,
         gialli_trasf c_fatti, gialli_casa c_subiti,
         row_number() over (partition by trasferta order by data desc) rn
  from recenti
),
squadre as (
  select sq,
    avg(a_fatti) filter (where dove = 'casa') as ang_fatti_casa,
    avg(a_subiti) filter (where dove = 'casa') as ang_subiti_casa,
    avg(c_fatti) filter (where dove = 'casa') as car_fatti_casa,
    avg(c_subiti) filter (where dove = 'casa') as car_subiti_casa,
    count(*) filter (where dove = 'casa') as n_casa,
    avg(a_fatti) filter (where dove = 'fuori') as ang_fatti_fuori,
    avg(a_subiti) filter (where dove = 'fuori') as ang_subiti_fuori,
    avg(c_fatti) filter (where dove = 'fuori') as car_fatti_fuori,
    avg(c_subiti) filter (where dove = 'fuori') as car_subiti_fuori,
    count(*) filter (where dove = 'fuori') as n_fuori
  from (
    select 'casa' as dove, * from in_casa where rn <= p_ultime
    union all
    select 'fuori' as dove, * from in_trasferta where rn <= p_ultime
  ) t group by sq
)
select jsonb_build_object(
  'div', p_div,
  'ultime', p_ultime,
  'lega', (select jsonb_build_object(
      'angoli_casa', round(ang_casa::numeric, 3), 'angoli_trasferta', round(ang_trasf::numeric, 3),
      'cartellini_casa', round(car_casa::numeric, 3), 'cartellini_trasferta', round(car_trasf::numeric, 3),
      'n', n) from media_lega),
  'squadre', coalesce((select jsonb_object_agg(sq, jsonb_build_object(
      'angoli', jsonb_build_object(
        'fattiCasa', round(ang_fatti_casa::numeric, 2), 'subitiCasa', round(ang_subiti_casa::numeric, 2),
        'fattiFuori', round(ang_fatti_fuori::numeric, 2), 'subitiFuori', round(ang_subiti_fuori::numeric, 2)),
      'cartellini', jsonb_build_object(
        'fattiCasa', round(car_fatti_casa::numeric, 2), 'subitiCasa', round(car_subiti_casa::numeric, 2),
        'fattiFuori', round(car_fatti_fuori::numeric, 2), 'subitiFuori', round(car_subiti_fuori::numeric, 2)),
      'nCasa', n_casa, 'nFuori', n_fuori)) from squadre), '{}'::jsonb)
);
$$;

-- ⚠️ Tre righe, non una: senza i due revoke la funzione sarebbe chiamabile
-- senza login (vedi sql/19).
revoke all on function public.conteggi_dati(text, int) from public;
revoke all on function public.conteggi_dati(text, int) from anon;
grant execute on function public.conteggi_dati(text, int) to authenticated;
