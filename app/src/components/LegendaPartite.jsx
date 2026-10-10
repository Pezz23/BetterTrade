import { useState } from 'react'
import { C, F, alpha } from '../theme'
import { VPM_NETTO } from '../lib/vpm'

// La spiegazione dei cinque numeri della barra, in una card che si apre solo se
// serve. Sta **sopra il titolo** della pagina (10/10/2026, scelta di Mattia):
// chiusa è una riga, e chi già sa cosa guarda non la incontra.
//
// ⚠️ Chiusa di default, e lo stato resta nel componente: non va salvato: un
// pannello che si riapre da solo dopo che l'hai chiuso è un difetto.

const VOCI = [
  { nome: 'QUOTA', colore: C.oro, testo: <>Quanto paga la giocata sul book. Se dice <b>1 SECCO</b> o <b>2 SECCO</b> è la quota del segno, perché la combinata con l'over 1,5 non è quotata da nessuna fonte e va letta sul book.</> },
  { nome: 'ATTEND.', colore: C.menta, testo: <>La probabilità che la giocata vinca <b>secondo il consenso del mercato</b> (media di ~40 bookmaker, tolto il margine). Non è una verità: è la stima del mercato, e sui favoriti è un filo <b>prudente</b> — misurato sull'archivio, dove dichiarava 69% il favorito ha vinto 72,5%.</> },
  { nome: 'VPM', colore: C.celeste, testo: <>Valutazione Partita Manuale: guarda <b>solo le squadre</b> — classifica, forma, forma nel ruolo di casa o fuori — e dice <b>quale segno preferisce il campo e quanto è netto</b>, da 5,5 (forze pari) a 10. <span style={{ color: C.verde }}>Verde</span> se è lo stesso segno del mercato, <span style={{ color: C.rosso }}>rosso</span> se è l'altro, grigio sotto {String(VPM_NETTO).replace('.', ',')} — squadre troppo simili perché voglia dire qualcosa.</> },
  { nome: 'RESA', colore: C.testo, testo: <>Quota × attendibilità: <b>quanto torna in media per ogni euro giocato</b>. 100% è il pareggio, sotto si perde. È il dato grezzo, senza giudizi.</> },
  { nome: 'VOTO', colore: C.verde, testo: <>La resa <b>corretta dal campo</b>: resa × un fattore che va da 1,00 quando VPM non si pronuncia a 1,10 quando è netto al massimo. È il numero che riassume tutto: <span style={{ color: C.verde }}>sopra 100%</span> conviene, <span style={{ color: C.ambra }}>sotto</span> no. Ha preso il posto del Grado.</> },
]

export default function LegendaPartite() {
  const [aperta, setAperta] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setAperta(v => !v)} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: aperta ? `linear-gradient(${alpha(C.oro, 0.06)},${alpha(C.oro, 0.06)}), ${C.card}` : 'transparent',
        border: `1px solid ${aperta ? alpha(C.oro, 0.3) : C.bordo}`, borderRadius: 0,
        padding: '9px 12px', color: C.spento, fontFamily: F.mono, fontSize: 11, letterSpacing: '0.08em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: C.oro }}>{aperta ? '⌃' : '⌄'}</span>
        <span>COME SI LEGGE UNA PARTITA</span>
      </button>

      {aperta && (
        <div style={{ border: `1px solid ${alpha(C.oro, 0.3)}`, borderTop: 'none', padding: '4px 12px 12px' }}>
          {VOCI.map(v => (
            <div key={v.nome} style={{ padding: '9px 0', borderBottom: `1px solid ${C.bordoTenue}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: F.mono, letterSpacing: '0.1em', color: v.colore, marginBottom: 4 }}>{v.nome}</div>
              <div style={{ fontSize: 12, fontFamily: F.sans, color: C.fioco, lineHeight: 1.55 }}>{v.testo}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, fontFamily: F.sans, color: C.fantasma, lineHeight: 1.55, marginTop: 10 }}>
            In mezzo alle due squadre c'è <b style={{ color: C.fioco }}>la giocata</b>: si gioca sempre il segno secco, 1 o 2,
            mai la X. Sotto quota 1,25 si aggiunge l'over 1,5, e l'attendibilità viene scontata del fattore misurato (0,908).
          </div>
        </div>
      )}
    </div>
  )
}
