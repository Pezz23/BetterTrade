-- VPM — i dati grezzi per la Valutazione Partita Manuale, in una chiamata.
--
-- Stessa strada di classifiche() (sql/18): l'app la chiama una volta per
-- sessione e si tiene tutto. Senza, servirebbero quattro query per squadra per
-- partita — e in lista le partite sono duecento.
--
-- ⚠️ Restituisce SOMME GREZZE, non punteggi: le ancore e i pesi stanno in
-- `src/lib/vpm.js`, così si ritoccano senza una migrazione del database. È la
-- stessa divisione dell'attendibilità: il database dà i numeri, la libreria
-- decide cosa valgono.
--
-- Due blocchi:
--   squadre  → per campionato e squadra, le quattro finestre dell'iter di
--              Mattia: stagione · ultime 5 · ultime 5 in casa · ultime 5 fuori
--   scontri  → per ogni partita futura, i conti del testa a testa: ultimi 6
--              complessivi e ultimi 6 **sullo stesso campo**
--
-- ⚠️ Lo stesso campo conta più del totale: Lens-Lyon ha 1 pareggio negli
-- ultimi 6 scontri ma 3 su 6 giocati a Lens (9/10/2026). `forma_partita()`
-- (sql/17) restituisce già gli scontri, ma solo gli ultimi **5 complessivi**:
-- troppo pochi per questa bandierina, e non si tocca perché serve ad altro.

create or replace function public.vpm_dati()
returns jsonb
language sql
stable
set search_path = public
as $$
with stagioni as (
  -- La stagione in corso di ogni campionato: i campionati non iniziano insieme.
  select div, max(stagione) as stagione from partite group by div
),
viste as (
  -- Ogni partita vista dalle DUE squadre: gol fatti, subiti, tiri in porta
  -- fatti e concessi dal punto di vista di chi la ha giocata.
  select p.div, p.data, p.casa as sq, 'casa' as dove,
         p.gol_casa as gf, p.gol_trasferta as gs,
         coalesce(p.tirip_casa, 0) as tf, coalesce(p.tirip_trasf, 0) as tc
  from partite p join stagioni s on s.div = p.div and s.stagione = p.stagione
  union all
  select p.div, p.data, p.trasferta, 'fuori',
         p.gol_trasferta, p.gol_casa,
         coalesce(p.tirip_trasf, 0), coalesce(p.tirip_casa, 0)
  from partite p join stagioni s on s.div = p.div and s.stagione = p.stagione
),
num as (
  select *,
         case when gf > gs then 1 else 0 end as v,
         row_number() over (partition by div, sq order by data desc) as rn,
         row_number() over (partition by div, sq, dove order by data desc) as rn_dove
  from viste
),
agg as (
  -- Le quattro finestre, nello stesso formato.
  select div, sq, 'stagione' as finestra, count(*) as n, sum(v) as v,
         sum(gf) as gf, sum(gs) as gs, sum(tf) as tf, sum(tc) as tc
  from num group by div, sq
  union all
  select div, sq, 'forma', count(*), sum(v), sum(gf), sum(gs), sum(tf), sum(tc)
  from num where rn <= 5 group by div, sq
  union all
  select div, sq, dove, count(*), sum(v), sum(gf), sum(gs), sum(tf), sum(tc)
  from num where rn_dove <= 5 group by div, sq, dove
),
squadre as (
  select div, sq, jsonb_object_agg(finestra, jsonb_build_object(
           'n', n, 'v', v, 'gf', gf, 'gs', gs, 'tf', tf, 'tc', tc)) as finestre
  from agg group by div, sq
),
per_div as (
  select div, jsonb_object_agg(sq, finestre) as elenco from squadre group by div
),
sfide as (
  -- Gli scontri diretti di ogni partita futura, da entrambi i campi.
  -- ⚠️ **Senza filtro sul campionato**, di proposito. Il primo tentativo
  -- richiedeva `p.div = f.div` e sembrava più prudente, ma scartava gli scontri
  -- giocati quando una delle due stava in un'altra categoria: Ipswich-Fulham
  -- passava da 6 scontri a 2, e la bandierina spariva. I club sono gli stessi
  -- club, e `forma_partita()` (sql/17) gli scontri li mostra già così: due
  -- conteggi diversi sulla stessa partita, nella stessa schermata, sarebbero
  -- un difetto. Il rischio teorico — due squadre omonime in due paesi che si
  -- incontrano fra loro — non esiste nei 15 campionati che importiamo.
  select f.id as prossima_id, f.casa as fix_casa, f.trasferta as fix_trasferta,
         p.casa, p.trasferta, p.gol_casa, p.gol_trasferta,
         (p.casa = f.casa) as stesso_campo,
         row_number() over (partition by f.id order by p.data desc) as rn,
         row_number() over (partition by f.id, (p.casa = f.casa) order by p.data desc) as rn_campo
  from prossime_partite f
  join partite p on (p.casa = f.casa and p.trasferta = f.trasferta)
                 or (p.casa = f.trasferta and p.trasferta = f.casa)
  where f.data >= current_date
),
h2h as (
  select prossima_id,
         count(*) filter (where rn <= 6) as n,
         count(*) filter (where rn <= 6 and gol_casa = gol_trasferta) as pari,
         count(*) filter (where rn <= 6 and (
           (gol_casa > gol_trasferta and casa = fix_casa) or
           (gol_trasferta > gol_casa and trasferta = fix_casa))) as vinte_casa,
         count(*) filter (where rn <= 6 and (
           (gol_casa > gol_trasferta and casa = fix_trasferta) or
           (gol_trasferta > gol_casa and trasferta = fix_trasferta))) as vinte_trasferta,
         count(*) filter (where stesso_campo and rn_campo <= 6) as n_campo,
         count(*) filter (where stesso_campo and rn_campo <= 6 and gol_casa = gol_trasferta) as pari_campo
  from sfide group by prossima_id
)
select jsonb_build_object(
  'squadre', coalesce((select jsonb_object_agg(div, elenco) from per_div), '{}'::jsonb),
  'scontri', coalesce((select jsonb_object_agg(prossima_id::text, jsonb_build_object(
       'n', n, 'pari', pari, 'vinte_casa', vinte_casa, 'vinte_trasferta', vinte_trasferta,
       'n_campo', n_campo, 'pari_campo', pari_campo)) from h2h), '{}'::jsonb)
);
$$;

-- ⚠️ Tre righe, non una: Postgres concede l'esecuzione a PUBLIC e Supabase la
-- concede ad anon su tutto ciò che nasce nello schema public. Senza i due
-- revoke, questa funzione sarebbe chiamabile senza login (vedi sql/19).
revoke all on function public.vpm_dati() from public;
revoke all on function public.vpm_dati() from anon;
grant execute on function public.vpm_dati() to authenticated;
