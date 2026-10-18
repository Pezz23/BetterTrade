-- ROAD TO WEEKEND — la scalata a recupero con incasso parziale.
--
-- ⚠️ **Sezione a parte con tabelle sue** (scelta di Mattia, 15/10/2026): i passi
-- della scalata **non** vanno in `giornate`, o Dashboard e Reporting mescolano
-- l'esperimento con le spin del gruppo e a fine stagione non si sa più quale
-- dei due ha prodotto il numero.
--
-- ⚠️⚠️ **Il bankroll resta calcolato, non scritto** (regola 1 del progetto):
-- queste tabelle tengono le **tre casse** della scalata — bankroll fotografato
-- alla partenza, cassa da gioco, accumulo — e quando l'accumulo rientra nel
-- bankroll lo fa come **movimento**, non scrivendo `users.bankroll`.
--
-- Le tre casse, come le ha definite Mattia:
--   bankroll        le sue unità · la posta di partenza è il 10%
--   cassa da gioco  nasce con quel 10% e cresce coi passi vinti
--   accumulo        la parte messa via e il resto dell'arrotondamento;
--                   a fine scalata rientra nel bankroll

create table if not exists public.scalate (
  id            bigserial primary key,
  user_id       uuid not null references public.users(id) on delete cascade,
  -- ⚠️ `bankroll_iniziale` è una **fotografia**: il 10% si calcola su quello e
  -- non si ricalcola strada facendo, altrimenti la posta cambierebbe sotto le
  -- mani mentre la scalata è aperta.
  bankroll_iniziale numeric not null check (bankroll_iniziale > 0),
  posta         numeric not null check (posta > 0),
  quota_minima  numeric not null check (quota_minima >= 1.01),
  -- 'capitale' = al 1° passo si mette via la posta, poi 50% e 70%
  -- 'gioco'    = al 1° passo si mette via la posta, poi tutto resta in gioco
  regola        text    not null check (regola in ('capitale', 'gioco')),
  -- 'scalata' = quota bassa e molti passi · 'colpo' = quota alta, un passo solo
  -- ⚠️ Serve a **non mescolare i due esperimenti nello stesso registro**: con un
  -- numero solo a fine stagione non si saprebbe quale dei due l'ha prodotto.
  modalita      text    not null default 'scalata' check (modalita in ('scalata', 'colpo')),
  stato         text    not null default 'aperta' check (stato in ('aperta', 'chiusa', 'fallita')),
  cassa         numeric not null default 0,      -- quanto è in gioco adesso
  accumulo      numeric not null default 0,      -- quanto è al sicuro
  -- ⚠️ Il bankroll con cui la scalata **chiude**: è il capitale dedicato che
  -- la prossima eredita. Si scrive una volta sola, alla chiusura, e serve a
  -- non dover ricostruire la catena sommando i risultati di tutte le
  -- precedenti — una somma che basta un record saltato a sfalsare.
  bankroll_finale numeric,
  aperta_il     timestamptz not null default now(),
  chiusa_il     timestamptz,
  nota          text
);

-- ⚠️⚠️ **`create table if not exists` NON aggiunge colonne a una tabella che
-- esiste già**, e su una migrazione che si rilancia è esattamente il caso
-- normale: il 18/10/2026 `bankroll_finale` era stata aggiunta alla `create` e
-- non è mai comparsa nel database — l'errore è arrivato solo alla prima
-- scrittura, molto dopo. **Ogni colonna aggiunta dopo la prima applicazione
-- vuole il suo `alter table`**, che è anche l'unica forma rilanciabile.
alter table public.scalate add column if not exists bankroll_finale numeric;
alter table public.scalate add column if not exists modalita text not null default 'scalata';

-- ⚠️ `alter` e non solo la `create`: su un database dove la tabella esiste già
-- il vincolo vecchio resta, e `create table if not exists` non lo tocca.
do $$ begin
  alter table public.scalata_passi drop constraint if exists scalata_passi_numero_check;
  alter table public.scalata_passi add constraint scalata_passi_numero_check check (numero between 1 and 30);
exception when undefined_table then null; end $$;

create table if not exists public.scalata_passi (
  id          bigserial primary key,
  scalata_id  bigint not null references public.scalate(id) on delete cascade,
  -- ⚠️ 1..30 e non 1..8: il piano di un weekend lungo arriva a **dieci fasce**
  -- (provato il 18/10/2026 sul calendario vero), e col vincolo stretto la
  -- scalata si salvava **a metà** — scalata creata, primi otto passi dentro,
  -- il nono rifiutato. Un vincolo che riflette un'aspettativa invece dei dati
  -- non protegge: rompe.
  numero      int     not null check (numero between 1 and 30),
  giorno      date    not null,
  posta       numeric not null check (posta > 0),
  -- ⚠️ La quota si **congela** quando si pianifica: il piano si fa giovedì e si
  -- gioca sabato, e se la pagina ricalcolasse il piano cambierebbe sotto le
  -- mani. È la stessa ragione per cui `prossime_partite` è una fotografia.
  quota       numeric not null check (quota > 1),
  esito       text    not null default 'aperto' check (esito in ('aperto', 'vinto', 'perso')),
  montante    numeric,                            -- posta × quota, se vinto
  messo_via   numeric,                            -- quanto è andato in accumulo
  resto       numeric,                            -- l'arrotondamento per difetto
  deciso_il   timestamptz,
  unique (scalata_id, numero)
);

create table if not exists public.scalata_gambe (
  id           bigserial primary key,
  passo_id     bigint not null references public.scalata_passi(id) on delete cascade,
  -- la partita futura da cui nasce; si tiene anche il testo, perché la riga
  -- deve restare leggibile anche se il calendario viene reimportato
  prossima_id  bigint,
  div          text    not null,
  data         date    not null,
  ora          text,
  casa         text    not null,
  trasferta    text    not null,
  giocata      text    not null,
  quota        numeric not null check (quota > 1),
  -- quello che si sapeva al momento del piano, per misurare dopo
  att          numeric,
  scelta       numeric,
  vpm          numeric,
  esito        text    not null default 'aperto' check (esito in ('aperto', 'vinto', 'perso'))
);

create index if not exists scalate_per_utente on public.scalate (user_id, stato);
create index if not exists passi_per_scalata on public.scalata_passi (scalata_id, numero);
create index if not exists gambe_per_passo on public.scalata_gambe (passo_id);

-- ── Permessi ────────────────────────────────────────────────────────────────
-- ⚠️ Regola 4: una tabella nuova senza policy non è leggibile da nessuno
-- tranne la service_role.
-- ⚠️⚠️ **Solo gli admin, anche in lettura** (scelta di Mattia, 18/10/2026:
-- *"solo gli admin per ora"*). E sta **nella policy**, non nel JSX: il
-- `soloAdmin` della voce di menu nasconde il tasto, non protegge la tabella —
-- un utente normale con la chiave pubblica leggerebbe tutto.
-- ⚠️ `mio_user_id()` e `mio_ruolo()` vengono da sql/01.
alter table public.scalate       enable row level security;
alter table public.scalata_passi enable row level security;
alter table public.scalata_gambe enable row level security;

drop policy if exists scalate_select on public.scalate;
create policy scalate_select on public.scalate for select to authenticated
  using (public.mio_ruolo() in ('admin', 'superadmin'));
drop policy if exists scalate_write on public.scalate;
create policy scalate_write on public.scalate for all to authenticated
  using (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin', 'superadmin'))
  with check (user_id = public.mio_user_id() or public.mio_ruolo() in ('admin', 'superadmin'));

-- ⚠️ I figli non hanno `user_id`: il permesso si legge **risalendo** alla
-- scalata. Senza `exists`, una policy sul figlio sarebbe aperta a chiunque.
drop policy if exists passi_select on public.scalata_passi;
create policy passi_select on public.scalata_passi for select to authenticated
  using (public.mio_ruolo() in ('admin', 'superadmin'));
drop policy if exists passi_write on public.scalata_passi;
create policy passi_write on public.scalata_passi for all to authenticated
  using (exists (select 1 from public.scalate s where s.id = scalata_id
                 and (s.user_id = public.mio_user_id() or public.mio_ruolo() in ('admin', 'superadmin'))))
  with check (exists (select 1 from public.scalate s where s.id = scalata_id
                 and (s.user_id = public.mio_user_id() or public.mio_ruolo() in ('admin', 'superadmin'))));

drop policy if exists gambe_select on public.scalata_gambe;
create policy gambe_select on public.scalata_gambe for select to authenticated
  using (public.mio_ruolo() in ('admin', 'superadmin'));
drop policy if exists gambe_write on public.scalata_gambe;
create policy gambe_write on public.scalata_gambe for all to authenticated
  using (exists (select 1 from public.scalata_passi p join public.scalate s on s.id = p.scalata_id
                 where p.id = passo_id
                 and (s.user_id = public.mio_user_id() or public.mio_ruolo() in ('admin', 'superadmin'))))
  with check (exists (select 1 from public.scalata_passi p join public.scalate s on s.id = p.scalata_id
                 where p.id = passo_id
                 and (s.user_id = public.mio_user_id() or public.mio_ruolo() in ('admin', 'superadmin'))));
