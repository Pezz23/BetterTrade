// Connessione al database. Unico punto in cui si dice dove sta.
//
// L'archivio viveva su Neon, raggiungibile solo da questi script. Da settembre
// 2026 sta su Supabase, nello stesso database dell'app BetterTrade: così le
// partite sono consultabili anche dall'app, che è il punto di tutto il lavoro.
//
// Gli script continuano a parlare SQL. Sarebbe stato possibile passare al client
// di Supabase, ma qui si fanno aggregazioni, GROUP BY e conteggi: in SQL sono
// una riga, tradotti in chiamate REST diventano codice. Cambia solo a quale
// Postgres si punta.
//
// DATABASE_URL sta in btscout/.env (gitignorato). La stringa si prende da
// Supabase → Settings → Database → Connection string.

import postgres from 'postgres';

let cliente = null;

function connetti() {
  if (cliente) return cliente;
  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL mancante in btscout/.env');
    console.error('  Prendila da: Supabase → Settings → Database → Connection string (URI)');
    process.exit(1);
  }
  cliente = postgres(process.env.DATABASE_URL, {
    // Il pooler di Supabase (porta 6543) lavora in transaction mode e non
    // sopporta le prepared statement: senza questo, alla seconda query salta.
    prepare: false,
    // Questi script fanno import e backtest, non servono un sito: poche
    // connessioni bastano e si evita di occupare il pool.
    max: 4,
    idle_timeout: 20,
  });
  return cliente;
}

// La connessione si apre alla prima query, non all'import: `backtest.js` con la
// cache locale gira offline, e importando questo file non deve pretendere un
// database che non gli serve.
export const sql = new Proxy(function () {}, {
  apply: (_t, _this, args) => connetti()(...args),
  get: (_t, prop) => {
    const c = connetti();
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});

// A differenza di Neon, che parlava in HTTP, qui la connessione è un socket
// aperto: senza chiuderla lo script resta appeso a fine lavoro.
export const chiudi = () => (cliente ? cliente.end({ timeout: 5 }) : Promise.resolve());
