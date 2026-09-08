// Espone l'identità della build corrente alla PWA.
// Vercel popola le VERCEL_GIT_* a ogni deploy: nessun numero da aggiornare a mano.
// Richiede "Enable access to System Environment Variables" nelle impostazioni del progetto.

export default function handler(req, res) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  const branch = process.env.VERCEL_GIT_COMMIT_REF || '';
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || '';

  // Vercel non espone alcun timestamp di build o commit: l'hash è l'identificativo.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    sha: sha.slice(0, 7),
    branch,
    message: message.split('\n')[0].slice(0, 80),
    env: process.env.VERCEL_ENV || 'local',
  });
}
