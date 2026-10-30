-- 🎰 SPIN — chi entra nel calcolo della percentuale (30/10/2026)
--
-- Mattia: *"dentro Bilancio metti un flag di fianco agli utenti: tutti gli
-- utenti con flag vanno dentro al calcolo della % delle spin"*. Serve anche al
-- **conto demo** (ContoDemoPerSpin): un utente vero, con le sue giornate e il
-- suo bankroll, che però non sposta i totali del gruppo.
--
-- ⚠️ `true` per tutti all'inizio: finché non si spegne un flag, i conti
-- restano quelli di prima.
-- ⚠️ Niente policy nuove: `users_update` (sql/02) lascia già scrivere gli
-- admin; il tasto in Bilancio lo mostra solo al superadmin.
-- ⚠️ Dove si legge: `getTotalBankroll` in AuthContext (la base aggregata delle
-- spin) e la selezione iniziale di «Salva per tutti» in Reporting.

alter table public.users add column if not exists in_spin boolean not null default true;
