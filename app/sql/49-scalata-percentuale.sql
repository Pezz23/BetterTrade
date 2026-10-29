-- 🪜 ROAD TO WEEKEND — la puntata a PERCENTUALE del conto (29/10/2026)
--
-- Mattia, dopo il backtest del Filtro A: *"accantonare non è un buon piano, è
-- meglio giocare il tot % del bankroll"*. Ogni passo punta una percentuale
-- (3 · 5 · 10 · 14%) del conto di quel momento, arrotondata **all'euro per
-- eccesso** e mai oltre il conto; niente cassa, accumulo né prelievi.
--   · la percentuale si sceglie aprendo e **si cambia solo con STOP**;
--   · **a ogni passo perso il giro si chiude da solo** e va in archivio coi
--     passi giocati fino alla sconfitta (*"mi servono per studiare"*), e se ne
--     apre un altro con lo stesso conto, la stessa percentuale e i passi del
--     piano che restavano.
--
-- ⚠️ È una funzione e non tre chiamate dall'app, per la stessa ragione di
-- `riparti_scalata` (sql/41): senza transazione, a metà resterebbe un giro
-- chiuso senza il successivo. `security invoker`: le policy «ognuno la sua»
-- valgono anche qui dentro.

alter table public.scalate add column if not exists percentuale numeric
  check (percentuale is null or (percentuale > 0 and percentuale <= 0.5));

alter table public.scalate drop constraint if exists scalate_regola_check;
alter table public.scalate add  constraint scalate_regola_check
  check (regola in ('meta', 'madre', 'capitale', 'gioco', 'percentuale'));

create or replace function public.chiudi_giro_perso(
  p_scalata bigint,   -- il giro da chiudere
  p_dopo    numeric,  -- il numero del passo perso: si spostano quelli dopo
  p_finale  numeric,  -- bankroll_finale del giro (dopo la sconfitta)
  p_conto   numeric   -- il conto dopo la chiusura: bankroll del giro nuovo
) returns bigint
language plpgsql security invoker set search_path = public as $$
declare
  v     public.scalate;
  nuovo bigint;
  posta numeric;
begin
  select * into v from public.scalate
    where id = p_scalata and user_id = public.mio_user_id() and stato = 'aperta' for update;
  if not found then raise exception 'scalata non trovata, o già chiusa'; end if;
  if v.regola <> 'percentuale' then raise exception 'solo per le scalate a percentuale'; end if;

  update public.scalate set stato = 'chiusa', chiusa_il = now(),
    bankroll_finale = p_finale, cassa = 0, accumulo = 0
    where id = p_scalata;

  -- la stessa regola di `puntataDi` in lib/scalata.js: all'euro per eccesso,
  -- mai oltre il conto
  posta := least(ceil(round(p_conto * v.percentuale, 2)), floor(p_conto));
  if posta >= 1 then
    insert into public.scalate (user_id, bankroll_iniziale, posta, quota_minima, regola, percentuale, cassa, accumulo)
      values (v.user_id, p_conto, posta, v.quota_minima, 'percentuale', v.percentuale, 0, 0)
      returning id into nuovo;
    update public.scalata_passi set scalata_id = nuovo
      where scalata_id = p_scalata and numero > p_dopo;
  else
    -- ⚠️ Conto sotto 1 €: non si può giocare, quindi niente giro nuovo — serve
    -- una ricarica. Il piano non giocato si toglie (e il trigger di sql/42 lo
    -- annota nel registro delle cancellazioni).
    delete from public.scalata_passi
      where scalata_id = p_scalata and numero > p_dopo and esito = 'aperto';
  end if;
  return nuovo;
end $$;

revoke all on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) from public;
revoke all on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) from anon;
grant execute on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) to authenticated;
