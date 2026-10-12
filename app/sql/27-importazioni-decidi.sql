-- Decidere un'importazione in sospeso, dalla pagina Importazioni.
--
-- ⚠️ **Perché una funzione e non due scritture dall'app.** Accettare significa
-- scrivere su `partite` **e** marcare la riga di `importazioni`: due operazioni
-- che devono riuscire o fallire insieme. Fatte dal browser, una connessione
-- che cade nel mezzo lascia un risultato scritto e la riga ancora "da
-- verificare", oppure il contrario.
--
-- ⚠️ `security definer` con il controllo dentro: scrivere su `partite` non è
-- permesso a nessuno dall'app (non ha policy di scrittura), e deve restare
-- così — qui si apre una porta sola, larga quanto serve.

create or replace function public.decidi_importazione(
  p_id bigint, p_accetta boolean, p_partita_id bigint default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_imp  public.importazioni;
  v_ruolo text := public.mio_ruolo();
  v_new  bigint;
begin
  if v_ruolo not in ('admin','superadmin') then
    raise exception 'Solo gli admin possono decidere le importazioni';
  end if;

  select * into v_imp from public.importazioni where id = p_id;
  if not found then raise exception 'Importazione % non trovata', p_id; end if;
  if v_imp.stato <> 'da_verificare' then return 'già decisa: ' || v_imp.stato; end if;

  if not p_accetta then
    update public.importazioni
       set stato = 'rifiutata', deciso_da = public.mio_user_id(), deciso_il = now()
     where id = p_id;
    return 'rifiutata';
  end if;

  if p_partita_id is not null then
    -- ⚠️ Si completa una partita che c'è già, **senza toccare il risultato**:
    -- quello di football-data resta la verità, ESPN riempie solo i buchi.
    update public.partite set
      possesso_casa  = coalesce(possesso_casa,  v_imp.possesso_casa),
      possesso_trasf = coalesce(possesso_trasf, v_imp.possesso_trasf),
      tirip_casa     = coalesce(tirip_casa,     v_imp.tirip_casa),
      tirip_trasf    = coalesce(tirip_trasf,    v_imp.tirip_trasf),
      tiri_casa      = coalesce(tiri_casa,      v_imp.tiri_casa),
      tiri_trasf     = coalesce(tiri_trasf,     v_imp.tiri_trasf)
    where id = p_partita_id;
    if not found then raise exception 'Partita % non trovata', p_partita_id; end if;
    v_new := p_partita_id;
  else
    -- ⚠️ Nessuna partita scelta: si crea. Il nome esteso del campionato si
    -- prende dall'archivio, non si inventa.
    insert into public.partite (div, campionato, stagione, data, casa, trasferta,
                                gol_casa, gol_trasferta, esito,
                                tirip_casa, tirip_trasf, tiri_casa, tiri_trasf,
                                angoli_casa, angoli_trasf, possesso_casa, possesso_trasf, fonte)
    values (v_imp.div,
            (select campionato from public.partite where div = v_imp.div limit 1),
            to_char(v_imp.data - interval '6 months', 'YY') || to_char(v_imp.data + interval '6 months', 'YY'),
            v_imp.data, v_imp.casa_fonte, v_imp.trasferta_fonte,
            v_imp.gol_casa, v_imp.gol_trasferta,
            case when v_imp.gol_casa > v_imp.gol_trasferta then 'H'
                 when v_imp.gol_casa < v_imp.gol_trasferta then 'A' else 'D' end,
            v_imp.tirip_casa, v_imp.tirip_trasf, v_imp.tiri_casa, v_imp.tiri_trasf,
            v_imp.angoli_casa, v_imp.angoli_trasf, v_imp.possesso_casa, v_imp.possesso_trasf, 'espn')
    returning id into v_new;
  end if;

  update public.importazioni
     set stato = 'accettata', partita_id = v_new,
         deciso_da = public.mio_user_id(), deciso_il = now()
   where id = p_id;
  return 'accettata → partita ' || v_new;
end $$;

-- ⚠️ Le tre righe: Postgres concede a PUBLIC e Supabase ad `anon`, quindi il
-- solo grant non restringerebbe niente (trappola di sql/19).
revoke all on function public.decidi_importazione(bigint, boolean, bigint) from public;
revoke all on function public.decidi_importazione(bigint, boolean, bigint) from anon;
grant execute on function public.decidi_importazione(bigint, boolean, bigint) to authenticated;
