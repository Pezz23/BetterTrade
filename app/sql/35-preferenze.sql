-- LE PREFERENZE SALVATE — i filtri che restano (22/10/2026)
--
-- Mattia: *"vorrei poter salvare i filtri selezione"*, con due regole diverse
-- per i due ruoli: **gli admin vedono tutti la stessa schermata**, gli utenti
-- hanno i **loro** filtri.
--
-- ⚠️⚠️ **Una riga condivisa e tante righe personali, nella stessa tabella**:
-- `user_id is null` È la riga degli admin. Due tabelle per la stessa cosa
-- sarebbero due posti da tenere d'accordo — il difetto peggiore di questo
-- progetto — e un `ambito` invece di una tabella per pagina evita di rifare
-- tutto quando si vorranno salvare anche i filtri di Partite.
--
-- ⚠️ **Il `primary key` non può contenere un NULL**, quindi l'unicità si fa con
-- due indici parziali: uno per la riga condivisa (una sola per ambito) e uno
-- per quelle personali (una per persona per ambito). Sono vincoli veri, non
-- convenzioni: senza, due salvataggi quasi simultanei creerebbero due righe e
-- la lettura ne prenderebbe una a caso.
--
-- ⚠️ `dati` è **jsonb e non quattro colonne**: i filtri cambiano (ieri è
-- entrata «quota gamba», il voto minimo sta per uscire da Partite), e una
-- migrazione per ogni manopola non è sostenibile. In cambio **chi legge deve
-- reggere una chiave che non c'è**: la pagina riempie i buchi col valore di
-- partenza, come fa `conSoglie()` in Andamento — un valore che manca non dà
-- errore, dà il predefinito di qualcun altro.

create table if not exists public.preferenze (
  ambito        text not null,
  -- null = la riga condivisa degli admin
  user_id       uuid references public.users(id) on delete cascade,
  dati          jsonb not null,
  aggiornato_il timestamptz not null default now(),
  -- ⚠️ chi l'ha salvata: con sei account admin sulla stessa riga, sapere **chi**
  -- ha mosso le soglie è l'unica cosa che rende leggibile un numero cambiato
  -- da solo fra ieri e oggi.
  aggiornato_da uuid references public.users(id) on delete set null
);

create unique index if not exists preferenze_condivisa
  on public.preferenze (ambito) where user_id is null;
create unique index if not exists preferenze_personale
  on public.preferenze (ambito, user_id) where user_id is not null;

alter table public.preferenze enable row level security;

-- ⚠️ **La riga condivisa la legge chiunque**, ed è voluto: chi non ha ancora
-- salvato niente eredita i filtri degli admin invece di partire dai valori di
-- fabbrica. La catena è: la mia riga → la riga degli admin → le costanti.
drop policy if exists preferenze_select on public.preferenze;
create policy preferenze_select on public.preferenze
  for select to authenticated
  using (user_id is null or user_id = public.mio_user_id());

-- ⚠️ La riga condivisa la scrivono **solo gli admin**; la propria, ciascuno.
-- E `with check` ripete la condizione di `using`: senza, si potrebbe spostare
-- una riga propria sopra quella condivisa con una `update`.
drop policy if exists preferenze_write on public.preferenze;
create policy preferenze_write on public.preferenze
  for all to authenticated
  using (
    (user_id is null and public.mio_ruolo() in ('admin','superadmin'))
    or user_id = public.mio_user_id())
  with check (
    (user_id is null and public.mio_ruolo() in ('admin','superadmin'))
    or user_id = public.mio_user_id());
