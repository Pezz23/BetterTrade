-- 🪜 ROAD TO WEEKEND — la puntata all'euro PER DIFETTO (30/10/2026)
--
-- Mattia: *"sposta la puntata con arrotondamento per difetto: 113 € deve
-- consigliare 11 €"*. È la stessa regola di `puntataDi` in lib/scalata.js, e
-- deve restare identica: la pagina calcola la puntata del passo, questa
-- funzione quella del giro che riparte dopo un perso.
-- ⚠️ Cambia solo la riga della puntata rispetto a sql/49: `floor` invece di
-- `ceil`, e niente più `least(…, floor(conto))` — per difetto non supera mai
-- il conto da sé.

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

  -- la stessa regola di `puntataDi` in lib/scalata.js: all'euro per difetto
  posta := floor(round(p_conto * v.percentuale, 2));
  if posta >= 1 then
    insert into public.scalate (user_id, bankroll_iniziale, posta, quota_minima, regola, percentuale, cassa, accumulo)
      values (v.user_id, p_conto, posta, v.quota_minima, 'percentuale', v.percentuale, 0, 0)
      returning id into nuovo;
    update public.scalata_passi set scalata_id = nuovo
      where scalata_id = p_scalata and numero > p_dopo;
  else
    -- ⚠️ Conto troppo basso per 1 €: niente giro nuovo, serve una ricarica.
    -- Il piano non giocato si toglie (e il trigger di sql/42 lo annota).
    delete from public.scalata_passi
      where scalata_id = p_scalata and numero > p_dopo and esito = 'aperto';
  end if;
  return nuovo;
end $$;

revoke all on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) from public;
revoke all on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) from anon;
grant execute on function public.chiudi_giro_perso(bigint, numeric, numeric, numeric) to authenticated;
