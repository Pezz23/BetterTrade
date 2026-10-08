-- Le classifiche di tutti i campionati, in una chiamata sola.
--
-- Serve alla lista delle partite: accanto a ogni squadra va la sua posizione, e
-- la lista ne ha 200. `forma_partita` (sql/15) la calcola già, ma una partita
-- per volta: 200 chiamate per una pagina non stanno in piedi.
--
-- Prende l'ultima stagione di ogni campionato — non una stagione fissa: i
-- campionati non cominciano e non finiscono tutti insieme.
--
-- Ordine: punti, poi differenza reti, poi gol fatti. `rank()` e non
-- `row_number()`: a parità il posto è lo stesso, come in una classifica vera.

create or replace function public.classifiche()
returns jsonb
language sql
stable
set search_path = public
as $$
  with ultima as (
    select div, max(stagione) as stagione from partite group by div
  ),
  righe as (
    select p.div, p.casa as sq,
           case when p.gol_casa > p.gol_trasferta then 3
                when p.gol_casa = p.gol_trasferta then 1 else 0 end as punti,
           p.gol_casa as gf, p.gol_trasferta as gs
    from partite p join ultima u on u.div = p.div and u.stagione = p.stagione
    union all
    select p.div, p.trasferta,
           case when p.gol_trasferta > p.gol_casa then 3
                when p.gol_casa = p.gol_trasferta then 1 else 0 end,
           p.gol_trasferta, p.gol_casa
    from partite p join ultima u on u.div = p.div and u.stagione = p.stagione
  ),
  classifica as (
    select div, sq,
           sum(punti) as punti,
           count(*) as giocate,
           rank() over (partition by div
                        order by sum(punti) desc, sum(gf) - sum(gs) desc, sum(gf) desc) as posizione,
           count(*) over (partition by div) as squadre
    from righe group by div, sq
  )
  select jsonb_object_agg(div, elenco)
  from (
    select div, jsonb_object_agg(sq, jsonb_build_object(
             'posizione', posizione, 'punti', punti, 'giocate', giocate, 'squadre', squadre
           )) as elenco
    from classifica group by div
  ) x;
$$;

-- In Postgres ogni funzione nasce eseguibile da PUBLIC: senza la revoca la
-- potrebbe chiamare anche chi non ha fatto il login. I dati non uscirebbero
-- comunque (RLS su `partite` blocca la lettura e il risultato torna vuoto), ma
-- il permesso va detto, non lasciato al valore di partenza.
-- ⚠️ Non basta revocare a PUBLIC: Supabase concede di suo l'esecuzione ad
-- `anon` e `authenticated` su tutto ciò che nasce nello schema public
-- (default privileges). Il ruolo anonimo va tolto **per nome**.
revoke all on function public.classifiche() from public;
revoke all on function public.classifiche() from anon;
grant execute on function public.classifiche() to authenticated;
