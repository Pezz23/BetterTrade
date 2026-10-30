// ⚠️ Dal 30/10/2026 ESPN sta in `app/src/lib/espn.js`: la usa anche il tasto
// «Scarica risultati» di Road to weekend, che chiede i risultati a ESPN dal
// telefono (i server di Supabase ESPN li rifiuta con un 403). Una copia sola,
// come per gli altri calcoli che il motore prende dall'app.
export * from '../../app/src/lib/espn.js';
