-- 🎟️ BET BUILDER — l'esito e l'importo (22/10/2026)
--
-- Mattia: *"una volta giocata vorrei un secondo menù di vinto o perso, così da
-- tracciare l'andamento nel tempo"*, e *"aggiungi un campo importo, che mi
-- mostra subito quanto diventa la vincita"*.
--
-- ⚠️⚠️ **`alter table ... add column if not exists`, non `create table`.**
-- Una colonna aggiunta dentro la `create table` di `sql/36` **non comparirebbe
-- mai**: la migrazione rilanciata vede la tabella e salta tutto il blocco,
-- senza un errore. È già successo il 18/10 con `bankroll_finale`, e il guasto
-- è arrivato molto dopo, alla prima scrittura.
--
-- ⚠️ **L'esito sta sulla SCHEDINA, non sulle gambe**: una combinata è persa
-- appena cade una gamba, quindi un tocco solo basta a tracciare l'andamento.
-- E la singola gamba non si perde: ha `prossima_id`, quindi un giorno si
-- potrà dire chi l'ha azzeccata **leggendola dall'archivio**, senza cliccare.
--
-- ⚠️ L'importo è **facoltativo**: serve a vedere la vincita possibile e a fare
-- un saldo, non a obbligare a dichiarare quanto si gioca.

alter table public.schedine add column if not exists esito     text;
alter table public.schedine add column if not exists chiusa_il timestamptz;
alter table public.schedine add column if not exists importo   numeric;

do $$ begin
  alter table public.schedine add constraint schedine_esito_check
    check (esito is null or esito in ('vinta', 'persa'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.schedine add constraint schedine_importo_check
    check (importo is null or importo > 0);
exception when duplicate_object then null; end $$;
