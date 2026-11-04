-- 🪜 ROAD TO WEEKEND — chiudere un giro a mano, senza sconfitta (04/11/2026)
--
-- Mattia: *"vorrei poter chiudere un giro senza mettere la sconfitta"*. Finora
-- un giro con passi giocati si chiudeva solo con un perso (`chiudi_giro_perso`).
-- Il giro va in archivio col conto di quel momento e i passi non giocati si
-- tolgono (il trigger di sql/42 li annota). Non ne riparte uno nuovo: il
-- prossimo si apre confermando il passo 1.
-- ⚠️ Una giocata confermata senza esito **blocca**: ci sono soldi sul banco, e
-- chiudere qui vorrebbe dire far sparire quel risultato dal conto. Il controllo
-- sta qui e non solo nel tasto (regola 4).
-- ⚠️ `security invoker`, come chiudi_giro_perso: valgono le policy di sql/41.

create or replace function public.chiudi_giro(
  p_scalata bigint,   -- il giro da chiudere
  p_finale  numeric   -- bankroll_finale: il conto del giro adesso
) returns void
language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from public.scalate
    where id = p_scalata and user_id = public.mio_user_id() and stato = 'aperta' for update;
  if not found then raise exception 'scalata non trovata, o già chiusa'; end if;

  if exists (select 1 from public.scalata_passi
             where scalata_id = p_scalata and esito = 'aperto' and confermato_il is not null) then
    raise exception 'c’è una giocata confermata senza esito: segna prima come è andata';
  end if;

  update public.scalate set stato = 'chiusa', chiusa_il = now(),
    bankroll_finale = p_finale, cassa = 0, accumulo = 0
    where id = p_scalata;

  delete from public.scalata_passi where scalata_id = p_scalata and esito = 'aperto';
end $$;

revoke all on function public.chiudi_giro(bigint, numeric) from public;
revoke all on function public.chiudi_giro(bigint, numeric) from anon;
grant execute on function public.chiudi_giro(bigint, numeric) to authenticated;
