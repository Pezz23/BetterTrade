import { C, F, alpha } from '../theme'
import { verso } from '../lib/vpm'
import { pct } from '../lib/formato'

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

// ⚠️ Ri-esportata per chi la importa da qui, ma serve anche in questo file:
// `export … from` non porta il nome nello scope del modulo.
export { pct }
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
    <>
    {/* ⚠️ Le due fonti dicono cose diverse su chi vince: uno dei due prezzi è
        sbagliato e non sappiamo quale, quindi **nessuno dei cinque numeri
        sotto vale**. Si dice qui, sopra la barra, perché è il posto dove
        l'occhio arriva prima — e la partita resta visibile apposta: nasconderla
        vorrebbe dire che il difetto non lo trova più nessuno.
        ⚠️ **Una riga sola** (scelta di Mattia, 12/10/2026): la spiegazione per
        esteso — quanti punti di scarto, quale fonte dice cosa — sta in
        `controlla-dati.js`, che la stampa quando serve. A schermo, sopra una
        card, serve sapere *che* c'è un problema, non perché. */}
    {p.quoteIncoerenti && (
      <div style={{ padding: '5px 8px', marginBottom: 4, fontSize: 10, fontFamily: F.mono,
        lineHeight: 1.4, color: C.rosso, letterSpacing: '0.02em',
        background: alpha(C.rosso, 0.1), border: `1px solid ${alpha(C.rosso, 0.4)}` }}>
        ⚠️ QUOTE IN CONFLITTO — Partita da verificare.
      </div>
    )}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '7px 0',
      background: alpha(c, 0.07), border: `1px solid ${alpha(p.quoteIncoerenti ? C.rosso : c, 0.28)}`, borderRadius: 0 }}>
      {/* ⚠️ L'etichetta dice **da quale book** viene la quota (12/10/2026): da
          quando Bet365 ha la precedenza le fonti sono tre e si alternano nella
          stessa lista — Bet365 sul weekend in corso, Codere o la massima sulle
          partite più lontane. Sapere chi paga quel prezzo conta, soprattutto
          perché la **massima** non è un prezzo che si può davvero ottenere.
          Col segno davanti quando la quota mostrata è del segno secco e la
          giocata è la combinata con l'over. */}
      <Colonna primo divisore={c} colore={C.oro}
        valore={quota ? quota.toFixed(2).replace('.', ',') : '—'}
        etichetta={!quota ? 'QUOTA'
          : `${(p.quotaFonte || 'quota').toUpperCase()}${!p.quotaGiocata && p.quota ? ` ${p.segno}` : ''}`} />

      {/* ⚠️⚠️ **L'ambra sull'etichetta dice che i book non sono d'accordo fra
          loro**, e sta su ATTEND. perché è quel numero a valerne meno:
          l'attendibilità **è** la media di mercato, e una media di opinioni
          sparse non è un consenso. Misurato su 8 stagioni: sopra la soglia di
          dispersione l'attendibilità dichiarava 66,1% e manteneva **59,8%**
          (resa 84,6%), mentre sotto dichiarava 68,3% e manteneva 71,8% (resa
          99,1%).
          ⚠️ **Marchio sull'etichetta e non sul valore, e nessuna riga rossa
          sopra**: non è un dato rotto come le quote in conflitto — è un dato
          buono che dice *il mercato è incerto*. Due avvisi con lo stesso peso
          renderebbero illeggibile quello grave. */}
      <Colonna divisore={c} colore={c} valore={pct(p.probGiocata)}
        coloreEtichetta={p.bookSparsi ? C.ambra : undefined}
        etichetta={p.bookSparsi ? 'ATTEND. ~' : 'ATTEND.'} />

      <Colonna divisore={c} colore={COLORE_VPM[vs] || C.fantasma}
        coloreEtichetta={vs && vs !== 'incerto' ? COLORE_VPM[vs] : undefined}
        prefisso={vpm?.punti != null ? vpm.segno : null}
        valore={vpm?.punti != null ? num2(vpm.punti) : '—'} etichetta="VPM" />

      {/* ⚠️ Resa e voto si **spengono** quando la quota è la media di mercato:
          lì `resa = quota × attendibilità` si semplifica in 1/margine, perché
          l'attendibilità viene dalla stessa media. Direbbero quanto margine ha
          preso il book, non quanto conviene la partita. Il grigio dice "questo
          numero non è confrontabile con gli altri". */}
      {/* ⚠️ **SCELTA, al posto della resa** (12/10/2026). La resa non serviva a
          scegliere: `quota × attendibilità` vuol dire che resa alta = quota
          lunga = partita meno probabile, e infatti era l'ultima fra gli
          indicatori sulle azzeccate (51,2%). Qui c'è l'attendibilità corretta
          dal campo, che sul 10% migliore di 33.133 partite rende 99,2%.
          ⚠️ **Non ha il pareggio a 100%**: serve a ordinare, non a dire quanto
          rende. Per quello c'è il voto, accanto.
          ⚠️ `—` quando il campo contraddice il mercato: lì il segno del campo
          vince il 27,2% contro il 29,5% del book, quindi non è un punteggio
          basso, è una partita da non scegliere. La resa per intero resta nei
          dettagli completi della scheda. */}
      <Colonna divisore={c} colore={vpm?.scelta == null ? C.fantasma : C.testo}
        valore={pct(vpm?.scelta)} etichetta="SCELTA" />

      {/* Il voto è la resa corretta dal campo: verde sopra il pareggio, rosso
          sotto. È l'unico numero della barra che dice "conviene o no". */}
      <Colonna divisore={c}
        colore={p.quotaDaConsenso || vpm?.voto == null ? C.fantasma : vpm.voto >= 1 ? C.verde : C.ambra}
        valore={pct(vpm?.voto)} etichetta="VOTO" />
    </div>
    </>
  )
}
