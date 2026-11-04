-- 🪜 Due richieste di Mattia (04/11/2026)
--
-- 1. *"una spunta per dire se il suo totale deve essere considerato nel totale
--    aggregato"*: `users.in_totale`. Tocca solo il confronto col saldo reale,
--    non la percentuale delle spin (quella è `in_spin`, sql/52). Fuori dal
--    totale vanno sia la cassa sia il conto RTW di quell'utente.
-- 2. *"Ogni utente deve essere libero di spostare i soldi da RTW a cassa e
--    viceversa"*: `trasferisci_rtw` accetta il proprio conto, il superadmin
--    resta l'unico a muovere quello degli altri.
--
-- ⚠️ Con un giro aperto che ha passi giocati il trasferimento si rifiuta: la
-- catena delle puntate (`contiPercentuale`) parte dal bankroll del giro e
-- ricalcolerebbe male quelle già giocate. Un giro senza passi giocati invece si
-- butta: è solo un piano, nato su un conto che sta cambiando.

alter table public.users add column if not exists in_totale boolean not null default true;

create or replace function public.trasferisci_rtw(p_user uuid, p_importo numeric, p_verso text)
returns void language plpgsql security definer set search_path = public as $$
declare
  imp   numeric := round(p_importo, 2);
  cassa numeric;
  mov   bigint;
begin
  if p_user is distinct from public.mio_user_id() then perform public.esigi_superadmin(); end if;
  if p_verso not in ('a_rtw', 'a_cassa') then raise exception 'verso sconosciuto'; end if;
  if not (imp > 0) then raise exception 'importo non valido'; end if;
  -- ⚠️ Due trasferimenti insieme sullo stesso utente si mettono in fila.
  perform 1 from users where id = p_user for update;
  if not found then raise exception 'utente non trovato'; end if;
  if public.giocata_in_corso(p_user) then
    raise exception 'c’è una giocata confermata senza esito: si trasferisce dopo';
  end if;
  if exists (select 1 from scalata_passi p join scalate s on s.id = p.scalata_id
             where s.user_id = p_user and s.stato = 'aperta' and p.esito <> 'aperto') then
    raise exception 'il giro aperto ha passi giocati: prima «Chiudi giro»';
  end if;

  if p_verso = 'a_rtw' then
    cassa := public.ricalcola_bankroll(p_user);
    if imp > cassa then raise exception 'in cassa ci sono solo % €', cassa; end if;
  elsif imp > public.conto_rtw(p_user) then
    raise exception 'nel conto RTW ci sono solo % €', public.conto_rtw(p_user);
  end if;

  delete from scalate where user_id = p_user and stato = 'aperta';

  insert into movimenti (user_id, tipo, importo, nota, rtw)
    values (p_user, case p_verso when 'a_rtw' then 'prelievo' else 'deposito' end, imp,
            case p_verso when 'a_rtw' then 'Trasferimento a RTW' else 'Ritorno da RTW' end, true)
    returning id into mov;
  insert into scalata_ricariche (user_id, importo, nota, movimento_id)
    values (p_user, case p_verso when 'a_rtw' then imp else -imp end,
            case p_verso when 'a_rtw' then 'dalla cassa' else 'in cassa' end, mov);
  perform public.ricalcola_bankroll(p_user);
end $$;
revoke all on function public.trasferisci_rtw(uuid, numeric, text) from public, anon;
grant execute on function public.trasferisci_rtw(uuid, numeric, text) to authenticated;
