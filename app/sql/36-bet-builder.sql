-- 🎟️ BET BUILDER — le schedine a quota obiettivo (22/10/2026)
--
-- Mattia: *"voglio costruire una schedina a quota 5, lui mi sceglie le partite
-- in base ai filtri; voglio poterne fare più d'una, e le nuove devono
-- escludere le partite già usate"*. Più: **tracciarle**, con un tasto
-- «giocata» e uno «cancella».
--
-- ⚠️⚠️ **Ogni schedina è di chi la fa, e non si condivide** (richiesta
-- esplicita). È la differenza con `scalate`, dove dal 22/10 la lettura è
-- aperta a tutti: lì è la road map del weekend del gruppo, qui è il tuo
-- foglio. Quindi niente riga condivisa e niente lettura aperta: **ogni policy
-- guarda `user_id`**.
--
-- ⚠️ **Le gambe portano la fotografia dei numeri di quel giorno** (att, scelta,
-- VPM, e la quota davvero giocata), come le gambe della scalata. Senza, fra
-- due mesi l'archivio direbbe solo *se* hai vinto; con quelli dice **perché
-- l'avevi scelta** — ed è l'unica cosa che si potrà confrontare con la
-- selezione automatica.
--
-- ⚠️ `stato` è `bozza` o `giocata`: compilare e giocare sono due momenti
-- diversi, ed è la stessa distinzione della spunta GIOCATA nella Slot. Una
-- schedina che non è andata al banco non deve contare in nessuna misura.

create table if not exists public.schedine (
  id              bigserial primary key,
  user_id         uuid not null references public.users(id) on delete cascade,
  quota_obiettivo numeric not null check (quota_obiettivo > 1),
  -- con che criterio sono state scelte le gambe: serve a leggere l'archivio
  criterio        text not null default 'voto',
  stato           text not null default 'bozza' check (stato in ('bozza', 'giocata')),
  creata_il       timestamptz not null default now(),
  giocata_il      timestamptz
);

create table if not exists public.schedina_gambe (
  id          bigserial primary key,
  schedina_id bigint not null references public.schedine(id) on delete cascade,
  -- ⚠️ Niente chiave esterna su `prossime_partite`: quella tabella è una
  -- fotografia che non si cancella mai, ma se un giorno si ripulisse non deve
  -- portarsi dietro le schedine già giocate.
  prossima_id bigint,
  div         text,
  data        date,
  ora         text,
  casa        text,
  trasferta   text,
  giocata     text,
  quota       numeric not null check (quota > 1),
  att         numeric,
  scelta      numeric,
  vpm         numeric
);

create index if not exists schedine_per_utente on public.schedine (user_id, creata_il desc);
create index if not exists gambe_per_schedina on public.schedina_gambe (schedina_id);

alter table public.schedine enable row level security;
alter table public.schedina_gambe enable row level security;

-- ⚠️ **Nessuna condivisione**: si vede e si tocca solo la propria roba.
drop policy if exists schedine_mie on public.schedine;
create policy schedine_mie on public.schedine for all to authenticated
  using (user_id = public.mio_user_id())
  with check (user_id = public.mio_user_id());

-- ⚠️ La policy sul figlio passa dal padre con un `exists`: senza, sarebbe
-- aperta a chiunque — è la stessa forma delle gambe della scalata.
drop policy if exists gambe_schedina_mie on public.schedina_gambe;
create policy gambe_schedina_mie on public.schedina_gambe for all to authenticated
  using (exists (select 1 from public.schedine s
                 where s.id = schedina_id and s.user_id = public.mio_user_id()))
  with check (exists (select 1 from public.schedine s
                      where s.id = schedina_id and s.user_id = public.mio_user_id()));
