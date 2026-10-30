-- 🎰 SPIN — l'ARCHIVIO dei risultati, senza soldi (30/10/2026)
--
-- Mattia: *"vorrei tracciare le spin senza toccare il conto reale, un
-- archivio dei risultati senza intaccare i soldi"*. Fino a oggi la griglia era
-- **una riga sola** (`griglia` id=1) che «↺ Nuova spin» svuotava: il weekend
-- si perdeva per sempre (limite noto n. 2 di `note/spin.md`).
--
-- Una riga per spin archiviata: la **fotografia** delle nove caselle (squadre,
-- pronostico, quota, risultato, esito), le schedine uscite, se era spuntata
-- GIOCATA, e la **resa in unità** (`resaInUnita` in lib/spin.js: una spin vale
-- 1). ⚠️ Niente euro, niente bankroll, niente giornate: non tocca i soldi.
-- ⚠️ Anche le spin NON giocate e la Fun (scelte di Mattia): misura il metodo,
-- e `giocata` dice quali sono andate al banco.
-- ⚠️ `firma` = la stessa spin (stesse partite): archiviarla di nuovo
-- **aggiorna** la fotografia invece di raddoppiarla — «salva in archivio» a
-- metà weekend e poi «↺ Nuova spin» a fine weekend fanno una riga sola.
--
-- Chi legge: tutti (come le spin in Dashboard). Chi scrive: gli admin (come la
-- griglia). Chi cancella: il superadmin.

create table if not exists public.spin_archivio (
  id          bigserial primary key,
  archiviata_il timestamptz not null default now(),
  archiviata_da uuid references public.users(id) on delete set null,
  spin_idx    int not null check (spin_idx between 0 and 3),
  firma       text not null,
  giocata     boolean not null default false,
  dal         date,          -- la prima e l'ultima partita della spin
  al          date,
  caselle     jsonb not null,
  schedine    jsonb not null,
  incasso     numeric,       -- in unità; null se aperta o con una quota mancante
  resa        numeric,
  unique (spin_idx, firma)
);

alter table public.spin_archivio enable row level security;

drop policy if exists spin_archivio_select on public.spin_archivio;
create policy spin_archivio_select on public.spin_archivio for select to authenticated using (true);

drop policy if exists spin_archivio_insert on public.spin_archivio;
create policy spin_archivio_insert on public.spin_archivio for insert to authenticated
  with check (public.mio_ruolo() in ('admin', 'superadmin'));

drop policy if exists spin_archivio_update on public.spin_archivio;
create policy spin_archivio_update on public.spin_archivio for update to authenticated
  using (public.mio_ruolo() in ('admin', 'superadmin'))
  with check (public.mio_ruolo() in ('admin', 'superadmin'));

drop policy if exists spin_archivio_delete on public.spin_archivio;
create policy spin_archivio_delete on public.spin_archivio for delete to authenticated
  using (public.mio_ruolo() = 'superadmin');

grant select, insert, update, delete on public.spin_archivio to authenticated;
grant usage, select on sequence public.spin_archivio_id_seq to authenticated;
