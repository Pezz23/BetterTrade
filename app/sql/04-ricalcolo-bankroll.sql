-- PASSO 6 — Il ricalcolo del bankroll diventa una funzione del database.
--
-- Il problema che risolve: con RLS attiva un utente normale può registrare un
-- proprio movimento ma NON può scrivere `users.bankroll` (la modifica su users
-- è riservata agli admin). Il risultato era un movimento registrato e il saldo
-- fermo, senza nessun errore visibile — la peggiore delle combinazioni.
--
-- La soluzione non è dare agli utenti il permesso di scrivere il saldo: il
-- bankroll è un valore CALCOLATO, e poterlo scrivere a mano significa poterlo
-- falsificare. Invece si dà il permesso di CHIEDERNE IL RICALCOLO. La funzione
-- gira con i privilegi del proprietario (security definer), legge le fonti e
-- scrive il risultato: nessuno può imporre un numero, solo farlo ricalcolare.
--
-- Stessa formula di src/lib/bankroll.js:
--   bankroll = bankroll_iniziale + movimenti + saldo delle giornate

create or replace function public.ricalcola_bankroll(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuovo numeric;
begin
  -- Si ricalcola solo il proprio, o quello di chiunque se si è admin.
  if not (p_user_id = public.mio_user_id()
          or public.mio_ruolo() in ('admin', 'superadmin')) then
    raise exception 'Non autorizzato a ricalcolare il bankroll di questo utente';
  end if;

  select round(
           coalesce(u.bankroll_iniziale, 0)
           + coalesce((select sum(case when m.tipo = 'deposito' then m.importo else -m.importo end)
                       from movimenti m where m.user_id = p_user_id), 0)
           + coalesce((select sum(g.tot_saldo)
                       from giornate g where g.user_id = p_user_id), 0)
         ::numeric, 2)
    into v_nuovo
    from users u
   where u.id = p_user_id;

  if v_nuovo is null then
    raise exception 'Utente % inesistente', p_user_id;
  end if;

  update users set bankroll = v_nuovo where id = p_user_id;
  return v_nuovo;
end
$$;

grant execute on function public.ricalcola_bankroll(uuid) to authenticated;
