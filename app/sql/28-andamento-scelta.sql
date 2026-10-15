-- ANDAMENTO: SCELTA al posto di RESA fra i quattro indicatori misurati.
--
-- ⚠️ **Perché.** La resa era già l'indicatore peggiore quando si guardava chi
-- *sceglie* meglio (51,2% di azzeccate contro il 60,3% dell'attendibilità), ed
-- è per questo che il 12/10/2026 la **scelta** le ha preso il posto nella barra
-- della partita. La pagina Andamento era rimasta indietro: misurava una cosa
-- che a schermo non c'è più. Mattia il 15/10: *"4 card con titolo VPM,
-- Attendibilità, Scelta, Voto"*.
--
-- ⚠️ **La resa NON è sparita dai dati**: la colonna `resa` resta su ogni riga,
-- perché ogni riga porta tutti i valori della partita e serve a chiedersi
-- "quale indicatore mi avrebbe allertato". Spariscono le righe **scelte dalla
-- resa** (`metodo = 'resa'`), che nessuna schermata legge più e che
-- `andamento_accordo` conterebbe come partite in gara.
--
-- ⚠️ `andamento` è una tabella **derivata**: si rifà da sola a ogni
-- importazione, e per intero con `calcola-andamento.js --stagioni=8 --esegui`.
-- Cancellare delle righe qui non perde niente che non si possa ricalcolare.

alter table public.andamento add column if not exists scelta numeric;

-- `metodo` ammette la scelta. 'resa' resta ammessa: una tabella che rifiuta
-- quello che ha già dentro non si può né rileggere né correggere.
alter table public.andamento drop constraint if exists andamento_metodo_check;
alter table public.andamento add constraint andamento_metodo_check
  check (metodo in ('att', 'vpm', 'voto', 'resa', 'scelta'));

delete from public.andamento where metodo = 'resa';

-- ── Le funzioni, con p_scelta al posto di p_resa ────────────────────────────
-- ⚠️ `create or replace` **non** può cambiare il nome di un parametro: va
-- cancellata prima. Con la vecchia firma viva, la pagina chiamerebbe ancora
-- quella e il cambio non si vedrebbe.
drop function if exists public.andamento_riassunto(numeric, numeric, numeric, numeric, text);
drop function if exists public.andamento_accordo(numeric, numeric, numeric, numeric, text);
drop function if exists public.andamento_chiavi(text, text, numeric, numeric, numeric, numeric, text, int);
drop function if exists public.andamento_verdi(numeric, numeric, numeric, numeric, text, int);

create function public.andamento_riassunto(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null
) returns table (metodo text, ambito text, giocate bigint, azzeccate bigint)
language sql stable as $$
  select a.metodo, a.ambito, count(*), count(*) filter (where a.azzeccata)
  from public.andamento a
  where (p_stagione is null or a.stagione = p_stagione)
    and case a.metodo
          when 'att'    then a.att    >= p_att
          when 'vpm'    then a.vpm    >= p_vpm
          when 'voto'   then a.voto   >= p_voto
          when 'scelta' then a.scelta >= p_scelta
        end
  group by a.metodo, a.ambito;
$$;

-- ⚠️ La scelta è **null** quando il campo contraddice il mercato, e in SQL
-- `null >= soglia` è null, quindi quelle partite contano come "sotto soglia".
-- È la risposta giusta: il disaccordo col mercato è da evitare (misurato:
-- 27,2% contro il 29,5% che dava il book), non da contare come un'opinione.
create function public.andamento_accordo(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null
) returns table (quanti int, giocate bigint, azzeccate bigint)
language sql stable as $$
  with distinte as (
    select distinct on (a.weekend, a.data, a.casa, a.trasferta)
           a.att, a.vpm, a.voto, a.scelta, a.azzeccata
    from public.andamento a
    where a.ambito = 'giorno' and (p_stagione is null or a.stagione = p_stagione)
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

create function public.andamento_chiavi(
  p_ambito text, p_metodo text,
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null, p_limite int default 400
) returns table (chiave date, weekend date, giocate bigint, azzeccate bigint)
language sql stable as $$
  select case when p_ambito = 'giorno' then a.data else a.weekend end, a.weekend,
         count(*), count(*) filter (where a.azzeccata)
  from public.andamento a
  where a.ambito = p_ambito and a.metodo = p_metodo
    and (p_stagione is null or a.stagione = p_stagione)
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

create function public.andamento_verdi(
  p_att numeric default 0, p_vpm numeric default 0,
  p_voto numeric default 0, p_scelta numeric default 0,
  p_stagione text default null, p_limite int default 300
) returns setof public.andamento
language sql stable as $$
  select distinct on (a.weekend, a.data, a.casa, a.trasferta) a.*
  from public.andamento a
  where a.ambito = 'giorno' and (p_stagione is null or a.stagione = p_stagione)
    and a.att >= p_att and a.vpm >= p_vpm and a.voto >= p_voto and a.scelta >= p_scelta
  order by a.weekend desc, a.data desc, a.casa, a.trasferta, a.id
  limit p_limite;
$$;

-- ── Permessi ────────────────────────────────────────────────────────────────
-- ⚠️ Tre righe per funzione, non una: una funzione appena creata è chiamabile
-- da `anon` anche senza login (trappola di sql/19). Le funzioni qui sono nuove
-- a tutti gli effetti — i grant della vecchia firma sono morti con lei.
do $$
declare f text;
begin
  foreach f in array array[
    'public.andamento_riassunto(numeric, numeric, numeric, numeric, text)',
    'public.andamento_accordo(numeric, numeric, numeric, numeric, text)',
    'public.andamento_chiavi(text, text, numeric, numeric, numeric, numeric, text, int)',
    'public.andamento_verdi(numeric, numeric, numeric, numeric, text, int)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
