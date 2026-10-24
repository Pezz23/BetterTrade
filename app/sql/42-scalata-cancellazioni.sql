-- 🪜 ROAD TO WEEKEND — il registro delle cancellazioni dei passi (24/10/2026)
--
-- Il 24/10 la scalata 41 di Admin è stata aperta alle 15:28 e chiusa alle
-- 15:31 **senza nessun passo dentro**, e Mattia non ha premuto «↻ nuovo
-- piano». A scalata aperta i passi si cancellano da quattro strade (nuovo
-- piano, riparti da 0, il × sull'ultima gamba, il + che svuota il passo dopo)
-- e dal database non si poteva sapere quale. Questo registro lo dice la
-- prossima volta: **chi, quando, quale passo e con quali partite**.
--
-- ⚠️ È un **trigger**, non una scrittura dell'app: deve vedere anche le
-- cancellazioni che l'app non sa di fare (la `on delete cascade` di una
-- scalata cancellata, o uno script). E gira `security definer` perché la
-- riga va scritta anche quando chi cancella non potrebbe scriverla.
-- ⚠️ `before delete`: le gambe del passo esistono ancora, e si possono
-- fotografare prima che la cascata le porti via.

create table if not exists public.scalata_cancellazioni (
  id          bigserial primary key,
  quando      timestamptz not null default now(),
  user_id     uuid,              -- chi ha cancellato (null da uno script)
  scalata_id  bigint,
  passo_id    bigint,
  numero      numeric,
  esito       text,
  fissato     boolean,
  partite     text,
  -- lo stato della scalata in quel momento: `null` vuol dire che è sparita
  -- nella stessa operazione — la cascata di «riparti da 0» o di un'apertura
  -- annullata, non un passo tolto da solo
  stato_scalata text
);
create index if not exists cancellazioni_per_utente on public.scalata_cancellazioni (user_id, quando);

alter table public.scalata_cancellazioni enable row level security;
drop policy if exists cancellazioni_select on public.scalata_cancellazioni;
create policy cancellazioni_select on public.scalata_cancellazioni
  for select to authenticated using (user_id = public.mio_user_id());
-- Nessuna policy di scrittura: la scrive solo il trigger.

create or replace function public.annota_passo_cancellato()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.scalata_cancellazioni
    (user_id, scalata_id, passo_id, numero, esito, fissato, partite, stato_scalata)
  values (
    public.mio_user_id(), old.scalata_id, old.id, old.numero, old.esito, old.fissato,
    (select string_agg(g.casa || '-' || g.trasferta || ' ' || g.data || ' ' || coalesce(g.ora, ''), ' | ' order by g.id)
       from public.scalata_gambe g where g.passo_id = old.id),
    (select s.stato from public.scalate s where s.id = old.scalata_id)
  );
  return old;
end $$;

drop trigger if exists passo_cancellato on public.scalata_passi;
create trigger passo_cancellato before delete on public.scalata_passi
  for each row execute function public.annota_passo_cancellato();
