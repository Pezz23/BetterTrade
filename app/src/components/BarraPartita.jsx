import { C, F, alpha } from '../theme'
import { verso } from '../lib/vpm'

// La barra dei cinque numeri di una partita: quota · attendibilità · VPM ·
// resa · voto. **La usano sia la riga della lista sia la scheda** (10/10/2026,
// scelta di Mattia): nella scheda ha preso il posto del riquadro con le quote
// di mercato, così i numeri sono gli stessi in entrambe le schermate e non
// possono divergere.
//
// ⚠️ Cinque colonne su un telefono da 375px fanno ~63px ciascuna: il valore sta
// a 14px e l'etichetta a 7px. Con i caratteri di prima (17px) `2 7,32` di VPM
// non ci stava. ⚠️ **La fascia del valore ha altezza fissa**: senza, le cinque
// etichette finirebbero a quote diverse perché i numeri non sono tutti larghi
// uguali.

const COLORE_VPM = { contro: C.rosso, conferma: C.verde, incerto: C.fioco }
const ALTA_VALORE = 19

export const pct1 = v => (v == null ? '—' : `${(v * 100).toFixed(0)}%`)
const num2 = v => (v == null ? '—' : v.toFixed(2).replace('.', ','))

function Colonna({ valore, etichetta, colore, coloreEtichetta, divisore, prefisso = null, primo = false }) {
  return (
    <div style={{
      textAlign: 'center', padding: '0 3px', minWidth: 0,
      borderLeft: primo ? 'none' : `1px solid ${alpha(divisore, 0.3)}`,
    }}>
      <div style={{
        position: 'relative',
        height: ALTA_VALORE, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, fontFamily: F.mono, color: colore, lineHeight: 1, whiteSpace: 'nowrap',
      }}>
        {/* il prefisso è appoggiato al bordo sinistro, fuori dal flusso: accanto
            alla cifra la spostava fuori centro e si confondeva con lei */}
        {prefisso != null && (
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700 }}>{prefisso}</span>
        )}
        {valore}
      </div>
      <div style={{ fontSize: 7, fontFamily: F.mono, letterSpacing: '0.08em', marginTop: 2,
        color: coloreEtichetta || C.spento, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {etichetta}
      </div>
    </div>
  )
}

export default function BarraPartita({ p, cat, vpm = null, colore }) {
  const c = colore ?? cat
  const quota = p.quotaGiocata ?? p.quota
  const vs = verso(vpm)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '7px 0',
      background: alpha(c, 0.07), border: `1px solid ${alpha(c, 0.28)}`, borderRadius: 0 }}>
      <Colonna primo divisore={c} colore={C.oro}
        valore={quota ? quota.toFixed(2).replace('.', ',') : '—'}
        etichetta={!p.quotaGiocata && p.quota ? `${p.segno} SECCO` : 'QUOTA'} />

      <Colonna divisore={c} colore={c} valore={pct1(p.probGiocata)} etichetta="ATTEND." />

      <Colonna divisore={c} colore={COLORE_VPM[vs] || C.fantasma}
        coloreEtichetta={vs && vs !== 'incerto' ? COLORE_VPM[vs] : undefined}
        prefisso={vpm?.punti != null ? vpm.segno : null}
        valore={vpm?.punti != null ? num2(vpm.punti) : '—'} etichetta="VPM" />

      <Colonna divisore={c} colore={C.testo} valore={pct1(p.resa)} etichetta="RESA" />

      {/* Il voto è la resa corretta dal campo: verde sopra il pareggio, rosso
          sotto. È l'unico numero della barra che dice "conviene o no". */}
      <Colonna divisore={c} colore={vpm?.voto == null ? C.fantasma : vpm.voto >= 1 ? C.verde : C.ambra}
        valore={pct1(vpm?.voto)} etichetta="VOTO" />
    </div>
  )
}
