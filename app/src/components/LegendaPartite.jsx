import { useState } from 'react'
import { C, F, alpha, S } from '../theme'
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
  { nome: 'SCELTA', colore: C.testo, testo: <>L&apos;attendibilità <b>corretta dal campo</b>: sale quando VPM è alto e d&apos;accordo col mercato. Serve a <b>ordinare</b> le partite, non dice quanto rendono — qui <b>non c&apos;è un 100% che separa</b>. Fa <b>—</b> quando il campo contraddice il mercato: lì il segno del campo vince il 27% dove il book ne dà il 30%, quindi è una partita da lasciare. <span style={{ color: C.spento }}>Ha preso il posto della resa, che ordinava male: resa alta vuol dire quota lunga, cioè partita meno probabile. La resa per intero resta nei dettagli della scheda.</span></> },
  { nome: 'VOTO', colore: C.verde, testo: <>La <b>resa</b> (quota × attendibilità) corretta dal campo: resa × un fattore che va da 1,00 quando VPM non si pronuncia a 1,10 quando è netto al massimo. È il numero che riassume tutto: <span style={{ color: C.verde }}>sopra 100%</span> conviene, <span style={{ color: C.ambra }}>sotto</span> no. Ha preso il posto del Grado.</> },
]

export default function LegendaPartite() {
  const [aperta, setAperta] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setAperta(v => !v)} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        // ⚠️ Prova del 21/10/2026: niente scatola squadrata e niente
        // monospaziato spaziato — una riga che si apre, non un campo di un
        // gestionale. Il bordo compare **solo da aperta**, dove racchiude
        // davvero qualcosa.
        background: aperta ? `linear-gradient(${alpha(C.oro, 0.06)},${alpha(C.oro, 0.06)}), ${C.card}` : C.card,
        border: `1px solid ${aperta ? alpha(C.oro, 0.3) : 'transparent'}`, borderRadius: 10,
        padding: '10px 13px', color: C.spento, fontFamily: F.sans, fontSize: S.corpo, letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: C.oro }}>{aperta ? '⌃' : '⌄'}</span>
        <span>COME SI LEGGE UNA PARTITA</span>
      </button>

      {aperta && (
        <div style={{ border: `1px solid ${alpha(C.oro, 0.3)}`, borderTop: 'none', padding: '4px 12px 12px' }}>
          {VOCI.map(v => (
            <div key={v.nome} style={{ padding: '9px 0', borderBottom: `1px solid ${C.bordoTenue}` }}>
              <div style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, letterSpacing: '0.1em', color: v.colore, marginBottom: 4 }}>{v.nome}</div>
              <div style={{ fontSize: S.corpo, fontFamily: F.sans, color: C.fioco, lineHeight: 1.55 }}>{v.testo}</div>
            </div>
          ))}
          <div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, lineHeight: 1.55, marginTop: 10 }}>
            In mezzo alle due squadre c'è <b style={{ color: C.fioco }}>la giocata</b>: si gioca sempre il segno secco, 1 o 2,
            mai la X. Sotto quota 1,25 si aggiunge l'over 1,5, e l'attendibilità viene scontata del fattore misurato (0,908).
          </div>
        </div>
      )}
    </div>
  )
}
