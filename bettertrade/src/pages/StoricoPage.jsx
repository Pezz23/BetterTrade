import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { C, F, alpha } from '../theme'
import { Card, Etichetta } from '../components/ui'
import { CATEGORIE, pct, giorno } from '../components/TestataPartita'
import { valuta, categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'

// Lo stato dell'archivio e come stanno andando le proposte.
//
// I conti sulle proposte si fanno qui nel browser con la stessa `valuta()`
// della pagina Partite: la regola resta in un posto solo. Sono poche decine
// di righe, non pesa.
//
// La calibrazione sulle 37.910 partite dell'archivio NON sta qui: quella è
// `btscout/scripts/rendiconto.js`, che gira da terminale — troppa roba per il
// browser, e non serve guardarla ogni giorno.

const Riquadro = ({ label, valore, sub, colore }) => (
  <Card style={{ padding: '12px 14px' }}>
    <Etichetta style={{ marginBottom: 6 }}>{label}</Etichetta>
    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.mono, color: colore || C.testo, lineHeight: 1 }}>{valore}</div>
    {sub && <div style={{ fontSize: 10, color: C.spento, fontFamily: F.mono, marginTop: 5 }}>{sub}</div>}
  </Card>
)

const Sezione = ({ titolo, extra, children }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
      <Etichetta colore={C.testo} style={{ fontSize: 13, letterSpacing: '0.12em', fontWeight: 700 }}>{titolo}</Etichetta>
      {extra && <Etichetta style={{ fontSize: 11 }}>{extra}</Etichetta>}
    </div>
    {children}
  </div>
)

// Vinta o no: il segno secco, oppure il segno più l'over 1,5.
const vinta = (giocata, r) => {
  const atteso = giocata[0] === '1' ? 'H' : 'A'
  if (r.esito !== atteso) return false
  return giocata.includes('over') ? r.gol_casa + r.gol_trasferta > 1.5 : true
}

export default function StoricoPage() {
  const [archivio, setArchivio] = useState(null)
  const [giocate, setGiocate] = useState([])
  const [future, setFuture] = useState([])
  const [errore, setErrore] = useState(null)
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    async function carica() {
      const oggi = new Date().toISOString().slice(0, 10)
      // Il conteggio dell'archivio: solo numeri, niente righe.
      const totale = await supabase.from('partite').select('*', { count: 'exact', head: true })
      const ultime = await supabase.from('partite').select('div, stagione, data').order('data', { ascending: false }).limit(1)
      // Le proposte già giocate, con il risultato agganciato dalla chiave esterna.
      const { data: fatte, error } = await supabase
        .from('prossime_partite')
        .select('*, partite!inner(esito, gol_casa, gol_trasferta)')
        .not('partita_id', 'is', null)
      const { data: prossime } = await supabase.from('prossime_partite')
        .select('id, div, campionato, data, ora, casa, trasferta, scaricato_il, fonte, book, book_1, book_x, book_2, b365_1, b365_x, b365_2, b365_over25, avg_ap_1, avg_ap_x, avg_ap_2, max_ap_1, max_ap_x, max_ap_2')
        .gte('data', oggi)
      if (error) setErrore(error.message)
      setArchivio({ totale: totale.count, ultima: ultime.data?.[0] })
      setGiocate((fatte || []).map(r => ({ ...r, ...r.partite })).map(valuta).filter(r => r.prob !== null))
      setFuture((prossime || []).map(valuta).filter(r => r.prob !== null))
      setCaricamento(false)
    }
    carica()
  }, [])

  const sopra = useMemo(() => giocate.filter(r => categoria(r.probGiocata, SOGLIE_DEFAULT) !== 'no'), [giocate])
  const conto = lista => {
    const prese = lista.filter(r => vinta(r.giocata, r)).length
    const atteso = lista.length ? lista.reduce((s, r) => s + r.probGiocata, 0) / lista.length : 0
    return { prese, tot: lista.length, reale: lista.length ? prese / lista.length : 0, atteso }
  }
  const tutte = conto(sopra)

  const perCampionato = useMemo(() => {
    const m = new Map()
    for (const r of future) m.set(r.div, (m.get(r.div) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [future])

  const ultimoScarico = future.reduce((m, r) => (!m || r.scaricato_il > m ? r.scaricato_il : m), null)
  const periodo = future.length
    ? `${giorno(future.reduce((m, r) => r.data < m ? r.data : m, future[0].data))} → ${giorno(future.reduce((m, r) => r.data > m ? r.data : m, future[0].data))}`
    : '—'
  const catFuture = useMemo(() => {
    const c = { centro: 0, giallo: 0, blu: 0 }
    for (const r of future) { const k = categoria(r.probGiocata, SOGLIE_DEFAULT); if (k !== 'no') c[k]++ }
    return c
  }, [future])

  if (caricamento) return <div style={{ padding: 16, color: C.spento, fontFamily: F.mono, fontSize: 12 }}>Carico…</div>

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: '0 auto' }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>STORICO</Etichetta>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 14 }}>L'archivio e come stiamo andando</div>
      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: 13, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      <Sezione titolo="📚 L'archivio">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <Riquadro label="partite in archivio" valore={archivio?.totale?.toLocaleString('it-IT') ?? '—'} sub="tutte con quote e risultato" />
          <Riquadro label="ultima giocata" valore={archivio?.ultima ? giorno(archivio.ultima.data) : '—'}
            sub={archivio?.ultima ? `${archivio.ultima.div} · stagione ${archivio.ultima.stagione}` : ''} />
          <Riquadro label="partite future" valore={future.length} sub={periodo} colore={C.oro} />
          <Riquadro label="ultimo scarico quote" valore={ultimoScarico ? new Date(ultimoScarico).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '—'}
            sub={ultimoScarico ? new Date(ultimoScarico).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''} />
        </div>
      </Sezione>

      <Sezione titolo="⚽ Le prossime, per campionato" extra={`${catFuture.centro} centro · ${catFuture.giallo} gialle · ${catFuture.blu} blu`}>
        <Card style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {perCampionato.map(([div, n]) => (
              <span key={div} style={{ fontSize: 11, fontFamily: F.mono, padding: '4px 10px', borderRadius: 20, background: alpha(C.bluPieno, 0.1), color: C.blu }}>
                {div} <b style={{ color: C.testo }}>{n}</b>
              </span>
            ))}
            {!perCampionato.length && <span style={{ fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>nessuna partita futura in tabella</span>}
          </div>
        </Card>
      </Sezione>

      <Sezione titolo="🎯 Le nostre proposte" extra={`${giocate.length} future poi giocate`}>
        {sopra.length === 0
          ? <Card><div style={{ fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>Nessuna proposta ancora giocata.</div></Card>
          : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Riquadro label="prese" valore={`${tutte.prese}/${tutte.tot}`} sub={`dichiarato ${pct(tutte.atteso)}`}
                colore={tutte.reale >= tutte.atteso ? C.verde : C.ambra} />
              <Riquadro label="resa" valore={pct(tutte.reale)} colore={tutte.reale >= tutte.atteso ? C.verde : C.ambra}
                sub={tutte.reale >= tutte.atteso ? 'meglio del dichiarato' : 'sotto il dichiarato'} />
              {['centro', 'giallo', 'blu'].map(cat => {
                const c = conto(sopra.filter(r => categoria(r.probGiocata, SOGLIE_DEFAULT) === cat))
                return <Riquadro key={cat} label={cat} valore={c.tot ? `${c.prese}/${c.tot}` : '—'}
                  sub={c.tot ? `${pct(c.reale)} · dichiarato ${pct(c.atteso)}` : 'nessuna'} colore={CATEGORIE[cat].colore} />
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: C.spento, fontFamily: F.sans, lineHeight: 1.6 }}>
              Ricostruite con le regole di oggi: non è il registro di cosa avete giocato davvero.
              La calibrazione su tutto l'archivio sta in <span style={{ fontFamily: F.mono, color: C.grigio }}>btscout/scripts/rendiconto.js</span>.
            </div>
          </>}
      </Sezione>

      <Sezione titolo="📋 Le ultime chiuse" extra="le più recenti">
        <Card style={{ padding: '6px 12px' }}>
          {[...sopra].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 12).map((r, i, arr) => {
            const ok = vinta(r.giocata, r)
            const cat = categoria(r.probGiocata, SOGLIE_DEFAULT)
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontFamily: F.mono, fontSize: 12,
                borderBottom: i < arr.length - 1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
                <span style={{ color: ok ? C.verde : C.rosso, fontSize: 14, width: 14 }}>{ok ? '✓' : '✗'}</span>
                <span style={{ color: C.fioco, width: 62, flexShrink: 0 }}>{giorno(r.data)}</span>
                <span style={{ color: CATEGORIE[cat].colore, width: 30, flexShrink: 0 }}>{r.div}</span>
                <span style={{ color: C.testo, fontFamily: F.sans, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.casa} – {r.trasferta}
                </span>
                <span style={{ color: C.spento, flexShrink: 0 }}>{r.gol_casa}–{r.gol_trasferta}</span>
                <span style={{ color: CATEGORIE[cat].colore, width: 70, textAlign: 'right', flexShrink: 0 }}>{r.giocata.replace(' + over ', '+O')}</span>
                <span style={{ color: C.spento, width: 40, textAlign: 'right', flexShrink: 0 }}>{pct(r.probGiocata)}</span>
              </div>
            )
          })}
        </Card>
      </Sezione>
    </div>
  )
}
