-- ANDAMENTO: la fascia di quota come filtro, accanto alle soglie.
--
-- ⚠️ **La domanda di Mattia (15/10/2026)**: *"vorrei una ricerca anche per
-- quota: voglio capire con quel filtro e quella quota quale indicatore è più
-- preciso"*. È la domanda giusta, perché **l'attendibilità alta È la quota
-- bassa**: senza fissare il prezzo, "questo indicatore azzecca più spesso" può
-- voler dire soltanto "questo indicatore sceglie favoriti più corti".
--
-- ⚠️⚠️ **Aggiungere parametri con un valore predefinito è retrocompatibile,
-- rinominarli no.** PostgREST costruisce la chiamata **per nome**: una versione
-- vecchia dell'app che passa solo i cinque nomi di prima continua a funzionare,
-- perché i due nuovi prendono il default. Il 15/10, rinominando `p_resa` in
-- `p_scelta`, l'app pubblicata è rimasta rotta fino al deploy — qui non
-- succede. ⚠️ Ma la vecchia funzione **va cancellata**: con entrambe vive, una
-- chiamata che nomina cinque parametri ne troverebbe due candidate e Postgres
-- risponderebbe "function is not unique".
--
-- ⚠️ **`create or replace`, non `create`**: con `create` secco la migrazione
-- non si può rilanciare — i `drop` qui sopra togliono le firme *vecchie*, e al
-- secondo giro la creazione trova la propria già lì, va in errore e **annulla
-- tutta la transazione**. È già succeduto applicandola due volte: la prima
-- parte era passata, la seconda no, e il database è rimasto a metà strada
-- senza che nulla lo dicesse. Una migrazione che non si può rilanciare non si
-- può nemmeno correggere.
--
-- ⚠️ `p_quota_max` è **esclusivo** e `p_quota_min` inclusivo: con fasce
-- contigue (1,45-1,70 e 1,70-2,20) una partita a 1,70 esatta starebbe
-- altrimenti in due fasce, e le somme non tornerebbero.

drop function if exists public.andamento_base(text, numeric, numeric);
drop function if exists public.andamento_riassunto(numeric, numeric, numeric, numeric, text);
drop function if exists public.andamento_accordo(numeric, numeric, numeric, numeric, text);
drop function if exists public.andamento_chiavi(text, text, numeric, numeric, numeric, numeric, text, int);
drop function if exists public.andamento_verdi(numeric, numeric, numeric, numeric, text, int);

create or replace function public.andamento_riassunto(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null,
  p_quota_min numeric default 0, p_quota_max numeric default 999
) returns table (metodo text, ambito text, giocate bigint, azzeccate bigint)
language sql stable as $$
  select a.metodo, a.ambito, count(*), count(*) filter (where a.azzeccata)
  from public.andamento a
  where (p_stagione is null or a.stagione = p_stagione)
    and a.quota >= p_quota_min and a.quota < p_quota_max
    and case a.metodo
          when 'att'    then a.att    >= p_att
          when 'vpm'    then a.vpm    >= p_vpm
          when 'voto'   then a.voto   >= p_voto
          when 'scelta' then a.scelta >= p_scelta
        end
  group by a.metodo, a.ambito;
$$;

-- ⚠️ **La base della fascia**, che senza il resto non si può leggere: quante
-- partite di questa fascia sono state scelte da *qualcuno* e come sono andate.
-- Senza, "att azzecca il 74,7% fra le quote corte" sembra un merito — e invece
-- in quella fascia **tutte** le partite fanno il 74,7%.
-- ⚠️ `p_ambito` serve: le due viste pescano da insiemi diversi (le prime 15 di
-- un giorno, le prime 36 di un weekend), e confrontare la percentuale del
-- weekend con la base del giorno sarebbe un confronto fra due universi.
create or replace function public.andamento_base(
  p_stagione text default null,
  p_quota_min numeric default 0, p_quota_max numeric default 999,
  p_ambito text default 'giorno'
) returns table (giocate bigint, azzeccate bigint)
language sql stable as $$
  with distinte as (
    select distinct on (a.weekend, a.data, a.casa, a.trasferta) a.azzeccata
    from public.andamento a
    where a.ambito = p_ambito and (p_stagione is null or a.stagione = p_stagione)
      and a.quota >= p_quota_min and a.quota < p_quota_max
    order by a.weekend, a.data, a.casa, a.trasferta, a.id
  )
  select count(*), count(*) filter (where azzeccata) from distinte;
$$;

create or replace function public.andamento_accordo(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null,
  p_quota_min numeric default 0, p_quota_max numeric default 999
) returns table (quanti int, giocate bigint, azzeccate bigint)
language sql stable as $$
  with distinte as (
    select distinct on (a.weekend, a.data, a.casa, a.trasferta)
           a.att, a.vpm, a.voto, a.scelta, a.azzeccata
    from public.andamento a
    where a.ambito = 'giorno' and (p_stagione is null or a.stagione = p_stagione)
      and a.quota >= p_quota_min and a.quota < p_quota_max
    order by a.weekend, a.data, a.casa, a.trasferta, a.id
  )
  select (case when att    >= p_att    then 1 else 0 end
        + case when vpm    >= p_vpm    then 1 else 0 end
        + case when voto   >= p_voto   then 1 else 0 end
        + case when scelta >= p_scelta then 1 else 0 end)::int,
         count(*), count(*) filter (where azzeccata)
  from distinte
  group by 1
  order by 1;
$$;

create or replace function public.andamento_chiavi(
  p_ambito text, p_metodo text,
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null, p_limite int default 400,
  p_quota_min numeric default 0, p_quota_max numeric default 999
) returns table (chiave date, weekend date, giocate bigint, azzeccate bigint)
language sql stable as $$
  select case when p_ambito = 'giorno' then a.data else a.weekend end, a.weekend,
         count(*), count(*) filter (where a.azzeccata)
  from public.andamento a
  where a.ambito = p_ambito and a.metodo = p_metodo
    and (p_stagione is null or a.stagione = p_stagione)
    and a.quota >= p_quota_min and a.quota < p_quota_max
    and case p_metodo
          when 'att'    then a.att    >= p_att
          when 'vpm'    then a.vpm    >= p_vpm
          when 'voto'   then a.voto   >= p_voto
          when 'scelta' then a.scelta >= p_scelta
        end
  group by 1, 2
  order by 1 desc
  limit p_limite;
$$;

create or replace function public.andamento_verdi(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null, p_limite int default 300,
  p_quota_min numeric default 0, p_quota_max numeric default 999
) returns setof public.andamento
language sql stable as $$
  select distinct on (a.weekend, a.data, a.casa, a.trasferta) a.*
  from public.andamento a
  where a.ambito = 'giorno' and (p_stagione is null or a.stagione = p_stagione)
    and a.quota >= p_quota_min and a.quota < p_quota_max
    and a.att >= p_att and a.vpm >= p_vpm and a.voto >= p_voto and a.scelta >= p_scelta
  order by a.weekend desc, a.data desc, a.casa, a.trasferta, a.id
  limit p_limite;
$$;

-- ── Permessi: tre righe per funzione, non una (trappola di sql/19) ──────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.andamento_riassunto(numeric, numeric, numeric, numeric, text, numeric, numeric)',
    'public.andamento_base(text, numeric, numeric, text)',
    'public.andamento_accordo(numeric, numeric, numeric, numeric, text, numeric, numeric)',
    'public.andamento_chiavi(text, text, numeric, numeric, numeric, numeric, text, int, numeric, numeric)',
    'public.andamento_verdi(numeric, numeric, numeric, numeric, text, int, numeric, numeric)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
