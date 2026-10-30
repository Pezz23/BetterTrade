// «SCARICA RISULTATI» — la funzione del tasto in fondo a Road to weekend
// (30/10/2026, Mattia: *"un tasto che lancio dall'app, che chiede solo i
// risultati a ESPN"*; solo superadmin, solo i risultati, ultimi 2 giorni).
//
// ⚠️⚠️ **ESPN la chiede il TELEFONO, non questa funzione.** Dai server di
// Supabase ESPN risponde 403 (provato il 30/10/2026), dal telefono e dal Mac
// no. Quindi il lavoro è a due tempi, per ogni campionato:
//   1. `{ voce }`          → i giorni da guardare (quelli dell'archivio ±1);
//   2. `{ voce, eventi }`  → le partite che il telefono ha scaricato da ESPN
//      per quei giorni: qui si abbinano e si scrivono.
// L'abbinamento è **lo stesso codice** degli script del Mac
// (`btscout/lib/risultati-espn.js`, regola «una e una sola partita»), con le
// statistiche sempre nulle: dal telefono solo i risultati. Tiri, angoli e
// cartellini li porta football-data il martedì e il venerdì, che con la
// stessa chiave completa la riga invece di raddoppiarla.
// ⚠️ **Solo i quindici campionati**: nelle coppe ESPN è l'unica fonte, e una
// riga scritta senza statistiche non la completerebbe più nessuno.
// ⚠️⚠️ **Solo il superadmin**, e il controllo è QUI, non nel JSX: si chiede ad
// Auth chi è il portatore del token, e a `users` che ruolo ha (regola 4).
// ⚠️ Scrive col ruolo del database (`SUPABASE_DB_URL`), come gli script.
// ⚠️ Niente ricalcolo di `andamento`: lo fa la routine del Mac.

import postgres from 'npm:postgres@3.4.9'
import { CAMPIONATI } from '../../../app/src/lib/espn.js'
import { aggiornaCampionato, giorniDaGuardare } from '../../../btscout/lib/risultati-espn.js'
import { giornoLocale } from '../../../btscout/lib/date.js'

const GIORNI = 2
const LEGHE = ['E0', 'E1', 'I1', 'I2', 'SP1', 'SP2', 'D1', 'D2', 'F1', 'F2', 'P1', 'N1', 'T1', 'B1', 'SC0']

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const risposta = (dati: unknown, status = 200) => Response.json(dati, { status, headers: CORS })

/** Chi sta chiamando: lo dice Auth dal token, non il token da solo. */
async function chiEDi(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id ?? null
}

// ⚠️ Le partite arrivano dal telefono: si tiene solo quello che ha la forma di
// una partita finita, e solo i campi che servono. Il resto si scarta.
const testo = (x: unknown) => (typeof x === 'string' && x.length < 120 ? x : null)
function pulisci(e: Record<string, unknown>) {
  const gc = Number(e?.golCasa), gt = Number(e?.golTrasferta)
  const nomi = (x: unknown) => (Array.isArray(x) ? x.map(testo).filter(Boolean).slice(0, 6) : [])
  if (e?.finita !== true || !Number.isInteger(gc) || !Number.isInteger(gt) || gc < 0 || gt < 0 || gc > 30 || gt > 30) return null
  const data = testo(e.data)
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null
  return { id: testo(String(e.id)), data, finita: true, casa: testo(e.casa), trasferta: testo(e.trasferta),
    nomiCasa: nomi(e.nomiCasa), nomiTrasferta: nomi(e.nomiTrasferta), golCasa: gc, golTrasferta: gt }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1 })
  try {
    const authId = await chiEDi(req)
    if (!authId) return risposta({ errore: 'serve il login' }, 401)
    const [u] = await sql`select role from users where auth_id = ${authId}`
    if (u?.role !== 'superadmin') return risposta({ errore: 'solo il superadmin' }, 403)

    const { voce, eventi } = await req.json().catch(() => ({}))
    if (!voce) return risposta({ voci: LEGHE })
    if (!LEGHE.includes(voce) || !CAMPIONATI[voce]) return risposta({ errore: `campionato sconosciuto: ${voce}` }, 400)

    const a = giornoLocale(new Date())
    const da = giornoLocale(new Date(Date.now() - GIORNI * 864e5))
    if (!eventi) return risposta({ voce, giorni: await giorniDaGuardare(sql, voce, da, a) })

    // `eventi` è { aaaammgg: [partite di quel giorno] }, come le ha lette il telefono
    const perGiorno = new Map<string, unknown[]>()
    for (const [g, lista] of Object.entries(eventi as Record<string, unknown[]>))
      if (/^\d{8}$/.test(g) && Array.isArray(lista)) perGiorno.set(g, lista.slice(0, 60).map(x => pulisci(x as Record<string, unknown>)).filter(Boolean))
    const fonte = {
      partiteDelGiorno: async (_div: string, g: string) => perGiorno.get(g) ?? [],
      statistiche: async () => null,
    }
    const r = await aggiornaCampionato(sql, voce, { da, a, esegui: true, fonte })
    return risposta({ voce, ...r.conto, nuove: r.create, dubbie: r.dubbie.length, problemi: r.saltate.slice(0, 5) })
  } catch (e) {
    return risposta({ errore: String((e as Error).message ?? e) }, 500)
  } finally {
    await sql.end()
  }
})
