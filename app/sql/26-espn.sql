-- ESPN COME SECONDA FONTE — schema.
--
-- ⚠️ **Perché serve una seconda fonte.** Il 12/10/2026 football-data era fermo
-- al 20 settembre: tre settimane di risultati mancanti, server che risponde
-- 200, nessun errore da nessuna parte. Una fonte sola senza allarme non è una
-- fonte, è una speranza.
--
-- ⚠️ **ESPN non sostituisce football-data, lo affianca**: non dà le quote, e la
-- sua API non è documentata né garantita. Dà però i risultati in giornata, i
-- tiri in porta su tutti e 15 i campionati e — cosa che non abbiamo — il
-- **possesso palla**.

-- ── 1. Da dove viene una riga ───────────────────────────────────────────────
-- ⚠️ Senza questa colonna una riga scritta da ESPN sarebbe indistinguibile da
-- una di football-data: non si saprebbe perché le mancano le quote, e quando
-- football-data pubblica si creerebbe un doppione invece di completarla.
alter table public.partite add column if not exists fonte text not null default 'football-data';
create index if not exists partite_per_fonte on public.partite (fonte) where fonte <> 'football-data';

-- ── 2. Il possesso palla ────────────────────────────────────────────────────
-- ⚠️ **Si raccoglie, non si usa ancora.** VPM al suo posto ha `dominio` (tiri
-- in porta fatti / totali) per una ragione scritta: *il possesso misura chi
-- tiene la palla, il dominio chi fa male*. Prima di metterlo in un indice va
-- **misurato** se aggiunge qualcosa — altrimenti si torna a pesare a sentimento.
alter table public.partite add column if not exists possesso_casa  numeric;
alter table public.partite add column if not exists possesso_trasf numeric;

-- ── 3. Le importazioni da verificare a mano ─────────────────────────────────
-- ⚠️⚠️ **Il cuore della sicurezza.** Lo script scrive **solo** quando trova
-- una e una sola partita nostra che combacia su campionato, data (±1 giorno) e
-- **entrambe** le squadre. Tutto il resto — nessun candidato, più di uno, un
-- nome mai visto — finisce qui e **aspetta una persona**. Un risultato messo
-- sulla partita sbagliata non si vede e non si corregge: sporca l'archivio e
-- tutte le misure che ci stanno sopra.
create table if not exists public.importazioni (
  id            bigserial primary key,
  creato_il     timestamptz not null default now(),
  fonte         text    not null default 'espn',
  stato         text    not null default 'da_verificare'
                check (stato in ('da_verificare', 'accettata', 'rifiutata')),
  motivo        text    not null,   -- perché non è stata agganciata da sola
  -- come la chiama la fonte, senza traduzioni: serve a riconoscerla a occhio
  div           text    not null,
  data          date    not null,
  casa_fonte    text    not null,
  trasferta_fonte text  not null,
  -- i numeri che porterebbe
  gol_casa      int,
  gol_trasferta int,
  tirip_casa    int,
  tirip_trasf   int,
  tiri_casa     int,
  tiri_trasf    int,
  angoli_casa   int,
  angoli_trasf  int,
  possesso_casa numeric,
  possesso_trasf numeric,
  -- le partite nostre che potrebbero essere quella: le sceglie una persona
  candidati     jsonb   not null default '[]'::jsonb,
  partita_id    bigint,             -- riempito quando qualcuno decide
  deciso_da     uuid,
  deciso_il     timestamptz
);

-- ⚠️ La stessa partita non deve entrare due volte se lo script rigira.
create unique index if not exists importazioni_unica
  on public.importazioni (fonte, div, data, casa_fonte, trasferta_fonte);

create index if not exists importazioni_da_fare on public.importazioni (stato) where stato = 'da_verificare';

-- ── Permessi ────────────────────────────────────────────────────────────────
-- ⚠️ Regola 4: una tabella nuova senza policy non la legge nessuno. Qui la
-- leggono tutti quelli che hanno fatto login (serve a sapere che c'è del
-- lavoro in sospeso) e la decidono solo gli admin.
alter table public.importazioni enable row level security;

drop policy if exists importazioni_select on public.importazioni;
create policy importazioni_select on public.importazioni for select to authenticated using (true);

drop policy if exists importazioni_write on public.importazioni;
create policy importazioni_write on public.importazioni for all to authenticated
  using      (public.mio_ruolo() in ('admin','superadmin'))
  with check (public.mio_ruolo() in ('admin','superadmin'));
