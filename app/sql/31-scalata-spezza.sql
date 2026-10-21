-- SPEZZARE UN PASSO IN DUE — 21 ottobre 2026
--
-- ⚠️⚠️ **Perché serve una migrazione per un tasto.** `scalata_passi.numero` è
-- l'ordine dei passi nella catena, ed era `int` con `unique (scalata_id,
-- numero)` e `check (numero between 1 and 30)`. Con quei tre vincoli insieme
-- **inserire un passo IN MEZZO è un'operazione cara e fragile**:
--   · il vincolo di unicità vieta di rinumerare in blocco (durante la stessa
--     istruzione due righe si troverebbero con lo stesso numero);
--   · il limite 1..30 vieta anche il trucco di spostare temporaneamente i
--     successivi fuori portata e poi riportarli dentro;
--   · resta la rinumerazione **una riga per volta, dalla coda**, cioè fino a
--     nove andate e ritorno al database per un singolo tocco — su una pagina
--     dove il costo è già stato misurato in *giri*, non in kilobyte.
--
-- Con `numeric` il problema sparisce: spezzare il passo 3 vuol dire inserire
-- un passo **3,5**, cioè UNA scrittura e nessuna rinumerazione. L'ordine resta
-- quello della colonna, e la posizione nella catena resta quella che conta —
-- la regola «il numero del passo è la POSIZIONE, non la colonna» vale ancora,
-- anzi questa migrazione la rende più vera: ora la colonna è dichiaratamente
-- un'etichetta di ordinamento, non un contatore.
--
-- ⚠️ Il limite sale a 1..1000 perché i valori di mezzo sono decimali e non
-- devono mai poter sbattere contro un tetto pensato per i contatori interi.
-- Il senso del vincolo (un numero positivo e non assurdo) resta.
-- ⚠️ `using numero::numeric` conserva i valori esistenti: 1, 3, 4 restano
-- 1, 3, 4. Nessuna scalata in archivio cambia di una virgola.

alter table public.scalata_passi
  alter column numero type numeric using numero::numeric;

do $$ begin
  alter table public.scalata_passi drop constraint if exists scalata_passi_numero_check;
  alter table public.scalata_passi add constraint scalata_passi_numero_check
    check (numero > 0 and numero <= 1000);
end $$;
