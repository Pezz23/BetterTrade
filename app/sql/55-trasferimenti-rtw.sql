-- 🪜 ROAD TO WEEKEND — i soldi passano dalla cassa (04/11/2026)
--
-- Mattia: *"trasferire il denaro dalla cassa a RTW e viceversa"*; i soldi reali
-- sono gli stessi, quindi è un *"trasferimento su altro conto"*, non un prelievo.
-- Supera la riga di sql/41 «una ricarica non tocca users.bankroll»: da oggi ogni
-- euro di RTW esce da una cassa e ci può tornare.
--
-- ⚠️ I movimenti restano `deposito`/`prelievo`, così la formula del bankroll
-- (sql/04 e gli script) non cambia: il segno `rtw` dice che non sono soldi
-- entrati o usciti davvero.
-- ⚠️ Il conto RTW resta CALCOLATO: `scalata_ricariche` ora ammette importi
-- negativi (i ritorni in cassa), e nessuno ci scrive direttamente, solo
-- `trasferisci_rtw`. Niente più ricarica libera: creava soldi dal nulla.
-- ⚠️ Gli importi dei singoli li vede solo il superadmin (Mattia, 04/11/2026).

alter table public.movimenti add column if not exists rtw boolean not null default false;

alter table public.scalata_ricariche drop constraint if exists scalata_ricariche_importo_check;
alter table public.scalata_ricariche add constraint scalata_ricariche_importo_check check (importo <> 0);
alter table public.scalata_ricariche add column if not exists movimento_id bigint references public.movimenti(id);

-- ── Permessi ────────────────────────────────────────────────────────────────
drop policy if exists movimenti_select on public.movimenti;
create policy movimenti_select on public.movimenti for select to authenticated
  using (not rtw or user_id = public.mio_user_id() or public.mio_ruolo() = 'superadmin');

-- ⚠️ Un movimento di trasferimento non si tocca a mano, nemmeno da admin: ha la
-- sua riga gemella in `scalata_ricariche`, e toccarne una sola crea soldi.
drop policy if exists movimenti_write on public.movimenti;
create policy movimenti_write on public.movimenti for all to authenticated
  using      (not rtw and (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin','superadmin')))
  with check (not rtw and (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin','superadmin')));

drop policy if exists ricariche_select on public.scalata_ricariche;
create policy ricariche_select on public.scalata_ricariche for select to authenticated
  using (user_id = public.mio_user_id() or public.mio_ruolo() = 'superadmin');
drop policy if exists ricariche_insert on public.scalata_ricariche;
drop policy if exists ricariche_delete on public.scalata_ricariche;

-- ── Il conto RTW in SQL ─────────────────────────────────────────────────────
-- Lo stesso di `contoDi` in lib/scalata.js: ricariche + giri chiusi + quanto il
-- giro aperto ha fatto finora, dalle puntate scritte sui passi con un esito.
create or replace function public.conto_rtw(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select round(
    coalesce((select sum(importo) from scalata_ricariche where user_id = p_user), 0)
    + coalesce((select sum(bankroll_finale - bankroll_iniziale) from scalate
                where user_id = p_user and stato <> 'aperta' and bankroll_finale is not null), 0)
    + coalesce((select sum(case p.esito when 'vinto' then p.posta * (p.quota - 1) when 'perso' then -p.posta else 0 end)
                from scalata_passi p join scalate s on s.id = p.scalata_id
                where s.user_id = p_user and s.stato = 'aperta'), 0)
  , 2);
$$;
revoke all on function public.conto_rtw(uuid) from public, anon, authenticated;

create or replace function public.giocata_in_corso(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from scalata_passi p join scalate s on s.id = p.scalata_id
    where s.user_id = p_user and s.stato = 'aperta' and p.esito = 'aperto' and p.confermato_il is not null);
$$;
revoke all on function public.giocata_in_corso(uuid) from public, anon, authenticated;

-- ── Il riepilogo di Gestione Bilanci e del totale ───────────────────────────
create or replace function public.riepilogo_rtw()
returns table (user_id uuid, versato numeric, conto numeric, in_corso boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.esigi_superadmin();
  return query
    select u.id,
      coalesce((select sum(r.importo) from scalata_ricariche r where r.user_id = u.id), 0)::numeric,
      public.conto_rtw(u.id), public.giocata_in_corso(u.id)
    from users u;
end $$;
revoke all on function public.riepilogo_rtw() from public, anon;
grant execute on function public.riepilogo_rtw() to authenticated;

-- ── Il trasferimento: le due righe insieme o nessuna ────────────────────────
create or replace function public.trasferisci_rtw(p_user uuid, p_importo numeric, p_verso text)
returns void language plpgsql security definer set search_path = public as $$
declare
  imp   numeric := round(p_importo, 2);
  cassa numeric;
  mov   bigint;
begin
  perform public.esigi_superadmin();
  if p_verso not in ('a_rtw', 'a_cassa') then raise exception 'verso sconosciuto'; end if;
  if not (imp > 0) then raise exception 'importo non valido'; end if;
  -- ⚠️ Due trasferimenti insieme sullo stesso utente si mettono in fila.
  perform 1 from users where id = p_user for update;
  if not found then raise exception 'utente non trovato'; end if;
  if public.giocata_in_corso(p_user) then
    raise exception 'c’è una giocata confermata senza esito: si trasferisce dopo';
  end if;

  if p_verso = 'a_rtw' then
    cassa := public.ricalcola_bankroll(p_user);
    if imp > cassa then raise exception 'in cassa ci sono solo % €', cassa; end if;
  elsif imp > public.conto_rtw(p_user) then
    raise exception 'nel conto RTW ci sono solo % €', public.conto_rtw(p_user);
  end if;

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
