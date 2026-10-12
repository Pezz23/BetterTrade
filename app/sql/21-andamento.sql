-- PAGINA ANDAMENTO — le giocate che ogni indicatore avrebbe scelto, e com'è
-- andata. Una riga per ogni partita scelta.
--
-- ⚠️ **Perché una tabella e non un calcolo al volo**: per sapere cosa avrebbe
-- scelto un indicatore il giorno X servono VPM e gol attesi ricostruiti con le
-- sole partite precedenti, su tutto l'archivio. Dal browser non è fattibile —
-- `vpm_dati()` (sql/20) lo fa per il solo weekend in arrivo, qui la finestra è
-- l'intera stagione. Riempie `btscout/scripts/calcola-andamento.js`.
--
-- ⚠️ **Due ambiti, come li ha chiesti Mattia**: `giorno` = le prime 15 di ogni
-- singolo giorno di gioco (venerdì, sabato, domenica, lunedì…), `weekend` = le
-- prime 36 del weekend intero, **senza data**, perché lì il giorno non conta.

create table if not exists public.andamento (
  id          bigserial primary key,
  stagione    text    not null,
  ambito      text    not null check (ambito in ('giorno', 'weekend')),
  -- il giorno di gioco per l'ambito `giorno`; per `weekend` resta il lunedì
  -- che lo chiude, che è anche la chiave con cui si raggruppa.
  data        date,
  weekend     date    not null,
  metodo      text    not null check (metodo in ('att', 'vpm', 'voto', 'resa')),
  posizione   int     not null,
  -- la partita, copiata e non referenziata: `partite` non ha una chiave
  -- stabile verso `prossime_partite`, e questa riga è una fotografia di una
  -- scelta fatta in un certo giorno — deve restare leggibile anche se
  -- l'archivio viene reimportato.
  partita_id  bigint,
  div         text    not null,
  casa        text    not null,
  trasferta   text    not null,
  giocata     text    not null,          -- '1', '2', '1 + over 1,5', …
  quota       numeric not null,
  valore      numeric,                   -- il valore dell'indicatore quel giorno
  azzeccata   boolean not null,          -- la giocata PER INTERO, over compreso
  creato_il   timestamptz not null default now()
);

-- ⚠️ Una scelta sola per posizione: se lo script rigira, aggiorna invece di
-- raddoppiare. `data` è null sul weekend, e in un indice univoco i null non si
-- confrontano fra loro — perciò si usa `coalesce`.
create unique index if not exists andamento_unico
  on public.andamento (ambito, metodo, weekend, coalesce(data, '1970-01-01'::date), posizione);

create index if not exists andamento_per_stagione on public.andamento (stagione, ambito, metodo);

-- ── Permessi ────────────────────────────────────────────────────────────────
-- ⚠️ Regola 4 del progetto: una tabella nuova senza policy non è leggibile da
-- nessuno tranne la service_role. Qui si legge dopo il login e **non si scrive
-- dall'app**: la riempie solo lo script, che usa la service_role.
alter table public.andamento enable row level security;

drop policy if exists andamento_select on public.andamento;
create policy andamento_select on public.andamento
  for select to authenticated using (true);
