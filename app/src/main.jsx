import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
// ⚠️ `theme.js` si può importare qui: non dipende da Supabase né da niente
// che possa fallire, ed è il motivo per cui questa schermata può usare i
// colori veri. Prima erano scritti a mano — `#090909`, `#e0d9d0`, `#c9a84c` —
// cioè la **tavolozza precedente**, rimasta indietro di un restyling: l'unica
// schermata che nessuno guarda mai era l'unica ancora vestita da ieri.
import { C, F, S, alpha } from './theme'

// Se manca la configurazione, `supabase.js` lancia durante l'import: senza
// questo blocco React non monta niente e resta lo sfondo scuro del body —
// una schermata nera senza spiegazione. Meglio dire cosa manca.
const radice = ReactDOM.createRoot(document.getElementById('root'))

import('./App.jsx')
  .then(({ default: App }) => radice.render(<React.StrictMode><App /></React.StrictMode>))
  .catch(err => radice.render(
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: C.fondo, fontFamily: F.sans,
    }}>
      <div style={{
        background: C.pannello, border: `1px solid ${alpha(C.rosso, 0.25)}`, borderRadius: 14,
        padding: '28px 26px', maxWidth: 460, color: C.testo,
      }}>
        <div style={{ fontSize: S.titolo, fontWeight: 700, marginBottom: 10 }}>
          L'app non riesce ad avviarsi
        </div>
        <div style={{ fontSize: S.media, color: C.spento, lineHeight: 1.7, marginBottom: 16 }}>
          Manca la configurazione di Supabase. In locale serve un file{' '}
          <code style={{ color: C.oro }}>app/.env</code> con{' '}
          <code style={{ color: C.oro }}>VITE_SUPABASE_URL</code> e{' '}
          <code style={{ color: C.oro }}>VITE_SUPABASE_ANON_KEY</code>; se il sito
          è pubblicato, le stesse due variabili vanno impostate nel pannello del
          servizio di hosting e il sito va ricostruito.
        </div>
        <pre style={{
          background: C.pozzo, border: `1px solid ${C.bordoTenue}`, borderRadius: 8,
          padding: '10px 12px', fontSize: S.base, color: C.rosso,
          fontFamily: F.mono, whiteSpace: 'pre-wrap', margin: 0,
        }}>{String(err && err.message || err)}</pre>
      </div>
    </div>
  ))
