-- PASSO 5 — Rimozione definitiva delle password in chiaro.
--
-- ⚠️ ESEGUIRE PER ULTIMO, solo quando tutti sono entrati con le credenziali
--    nuove. Da qui non si torna indietro: le vecchie password spariscono.
--    (Restano nel backup su disco, che va cancellato una volta finito.)

-- Controllo di sicurezza: si ferma se qualcuno non è ancora agganciato ad Auth.
do $$
declare orfani int;
begin
  select count(*) into orfani from public.users where auth_id is null;
  if orfani > 0 then
    raise exception 'Ci sono ancora % utenti senza auth_id. Lancia prima migra-auth.js.', orfani;
  end if;
end $$;

alter table public.users drop column if exists password;
