// Pezzi comuni agli script di amministrazione: client con service_role e
// generatore di password. Non si esegue da solo.

import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY in .env');
  console.error('  La service_role sta in: Supabase → Settings → API → service_role');
  process.exit(1);
}

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DOMINIO = 'bettertrade.local';

// Deve restare identica a emailDi() in src/context/AuthContext.jsx.
export const emailDi = username =>
  `${String(username).toLowerCase().replace(/[^a-z0-9]/g, '')}@${DOMINIO}`;

// Password corte e pronunciabili: l'app è un archivio di giocate, non un conto.
// Devono essere dicibili a voce e digitabili sul telefono, non inespugnabili.
// Formato: parola-NNN (es. "lampo-427"), ~9 caratteri.
const PAROLE = [
  'lampo', 'porto', 'fuoco', 'sabbia', 'monte', 'onda', 'pietra', 'vento',
  'campo', 'notte', 'sole', 'luna', 'ferro', 'rame', 'nave', 'faro',
  'bosco', 'neve', 'ponte', 'rosa', 'cielo', 'lago', 'muro', 'sale',
];

export function generaPassword() {
  const b = randomBytes(4);
  const parola = PAROLE[b[0] % PAROLE.length];
  const numero = String(((b[1] << 8 | b[2]) % 900) + 100); // 100-999
  return `${parola}-${numero}`;
}
