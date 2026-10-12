-- ANDAMENTO: i conti li fa il database, non il browser.
--
-- ⚠️ **Perché.** Con le otto stagioni la tabella ha **101.237 righe**, e la
-- pagina le caricava tutte per contarle. Non solo è troppo: **PostgREST ne
-- restituisce al massimo 1000 e non lo dice** — misurato il 12/10/2026, la
-- pagina mostrava 1000 righe su 1212 credendo di averle tutte. Un troncamento
-- silenzioso è peggio di un errore, perché i numeri sembrano buoni.
--
-- ⚠️ Le soglie sono **parametri**, non costanti: servono proprio a essere
-- spostate dalla pagina per cercare dove un indicatore comincia a dire
-- qualcosa. Il filtro di un indicatore vale solo per le righe scelte da quel
-- metodo — guardando il voto si tolgono i voti bassi, non i VPM bassi.

-- ── 1. Il riassunto: per metodo e ambito, quante giocate e quante azzeccate ──
create or replace function public.andamento_riassunto(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_resa numeric default 0,
  p_stagione text default null
) returns table (metodo text, ambito text, giocate bigint, azzeccate bigint)
language sql stable as $$
  select a.metodo, a.ambito, count(*), count(*) filter (where a.azzeccata)
  from public.andamento a
  where (p_stagione is null or a.stagione = p_stagione)
    and case a.metodo
          when 'att'  then a.att  >= p_att
          when 'vpm'  then a.vpm  >= p_vpm
          when 'voto' then a.voto >= p_voto
          when 'resa' then a.resa >= p_resa
        end
  group by a.metodo, a.ambito;
$$;

-- ── 2. L'accordo: quante partite hanno 0,1,2,3,4 indicatori sopra soglia ────
-- ⚠️ Su partite **distinte**: la stessa partita può essere nelle liste di più
-- metodi, e contarla quattro volte gonfierebbe tutto.
-- ⚠️ Si guarda l'ambito `giorno`, che contiene tutte le partite scelte almeno
-- una volta; il `weekend` è un altro taglio delle stesse.
create or replace function public.andamento_accordo(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_resa numeric default 0,
  p_stagione text default null
) returns table (quanti int, giocate bigint, azzeccate bigint)
language sql stable as $$
  with distinte as (
    select distinct on (a.weekend, a.data, a.casa, a.trasferta)
           a.att, a.vpm, a.voto, a.resa, a.azzeccata
    from public.andamento a
    where a.ambito = 'giorno' and (p_stagione is null or a.stagione = p_stagione)
    order by a.weekend, a.data, a.casa, a.trasferta, a.id
  )
  select (case when att  >= p_att  then 1 else 0 end
        + case when vpm  >= p_vpm  then 1 else 0 end
        + case when voto >= p_voto then 1 else 0 end
        + case when resa >= p_resa then 1 else 0 end)::int,
         count(*), count(*) filter (where azzeccata)
  from distinte
  group by 1
  order by 1;
$$;

-- ── 3. I tasti: le chiavi disponibili, con il risultato già dentro ──────────
-- ⚠️ Il conteggio viaggia **col tasto**: altrimenti per sapere com'è andato un
-- giorno bisogna aprirlo, e con le tendine significa aprirli tutti.
drop function if exists public.andamento_chiavi(text, text, numeric, numeric, numeric, numeric, text);

-- ⚠️ `p_limite` non è una comodità: senza stagione i giorni sono **1636** e
-- PostgREST ne restituirebbe 1000 **senza dirlo**, cioè lo stesso troncamento
-- silenzioso che ha reso necessarie queste funzioni. Meglio un tetto scritto,
-- che si vede, di uno implicito che non si vede.
create or replace function public.andamento_chiavi(
  p_ambito text, p_metodo text,
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_resa numeric default 0,
  p_stagione text default null, p_limite int default 400
) returns table (chiave date, weekend date, giocate bigint, azzeccate bigint)
language sql stable as $$
  select case when p_ambito = 'giorno' then a.data else a.weekend end, a.weekend,
         count(*), count(*) filter (where a.azzeccata)
  from public.andamento a
  where a.ambito = p_ambito and a.metodo = p_metodo
    and (p_stagione is null or a.stagione = p_stagione)
    and case p_metodo
          when 'att'  then a.att  >= p_att
          when 'vpm'  then a.vpm  >= p_vpm
          when 'voto' then a.voto >= p_voto
          when 'resa' then a.resa >= p_resa
        end
  group by 1, 2
  order by 1 desc
  limit p_limite;
$$;

-- ── 4. Le quattro spunte verdi, in elenco ───────────────────────────────────
create or replace function public.andamento_verdi(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_resa numeric default 0,
  p_stagione text default null, p_limite int default 300
) returns setof public.andamento
language sql stable as $$
  select distinct on (a.weekend, a.data, a.casa, a.trasferta) a.*
  from public.andamento a
  where a.ambito = 'giorno' and (p_stagione is null or a.stagione = p_stagione)
    and a.att >= p_att and a.vpm >= p_vpm and a.voto >= p_voto and a.resa >= p_resa
  order by a.weekend desc, a.data desc, a.casa, a.trasferta, a.id
  limit p_limite;
$$;

-- ── 5. Le stagioni presenti, per il menu ────────────────────────────────────
create or replace function public.andamento_stagioni()
returns table (stagione text, righe bigint)
language sql stable as $$
  select a.stagione, count(*) from public.andamento a group by a.stagione order by a.stagione desc;
$$;

-- ── Permessi ────────────────────────────────────────────────────────────────
-- ⚠️ Tre righe per funzione, non una: Postgres concede l'esecuzione a PUBLIC e
-- Supabase la concede ad `anon`, quindi il solo `grant to authenticated` non
-- restringe niente (trappola già pagata in sql/19).
do $$
declare f text;
begin
  foreach f in array array[
    'public.andamento_riassunto(numeric, numeric, numeric, numeric, text)',
    'public.andamento_accordo(numeric, numeric, numeric, numeric, text)',
    'public.andamento_chiavi(text, text, numeric, numeric, numeric, numeric, text, int)',
    'public.andamento_verdi(numeric, numeric, numeric, numeric, text, int)',
    'public.andamento_stagioni()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
