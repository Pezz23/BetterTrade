import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Se manca la configurazione, `supabase.js` lancia durante l'import: senza
// questo blocco React non monta niente e resta lo sfondo scuro del body —
// una schermata nera senza spiegazione. Meglio dire cosa manca.
const radice = ReactDOM.createRoot(document.getElementById('root'))

import('./App.jsx')
  .then(({ default: App }) => radice.render(<React.StrictMode><App /></React.StrictMode>))
  .catch(err => radice.render(
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#090909', fontFamily: "'Sora',sans-serif",
    }}>
      <div style={{
        background: '#111', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14,
        padding: '28px 26px', maxWidth: 460, color: '#e0d9d0',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          L'app non riesce ad avviarsi
        </div>
        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginBottom: 16 }}>
          Manca la configurazione di Supabase. In locale serve un file{' '}
          <code style={{ color: '#c9a84c' }}>bettertrade/.env</code> con{' '}
          <code style={{ color: '#c9a84c' }}>VITE_SUPABASE_URL</code> e{' '}
          <code style={{ color: '#c9a84c' }}>VITE_SUPABASE_ANON_KEY</code>; se il sito
          è pubblicato, le stesse due variabili vanno impostate nel pannello del
          servizio di hosting e il sito va ricostruito.
        </div>
        <pre style={{
          background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8,
          padding: '10px 12px', fontSize: 11, color: '#ef4444',
          fontFamily: "'DM Mono',monospace", whiteSpace: 'pre-wrap', margin: 0,
        }}>{String(err && err.message || err)}</pre>
      </div>
    </div>
  ))
