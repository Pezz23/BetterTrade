import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { C, F, alpha, S } from '../theme'
import { Card, Etichetta, Attesa } from '../components/ui'
import { CATEGORIE, pct, giorno } from '../components/TestataPartita'
import { valuta, categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { usaProssime } from '../hooks/usaProssime'
import { sigla } from '../lib/campionati'

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
    <div style={{ fontSize: S.evidenza, fontWeight: 700, fontFamily: F.mono, color: colore || C.testo, lineHeight: 1 }}>{valore}</div>
    {sub && <div style={{ fontSize: S.minuta, color: C.spento, fontFamily: F.sans, marginTop: 5 }}>{sub}</div>}
  </Card>
)

const Sezione = ({ titolo, extra, children }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
      <Etichetta colore={C.testo} style={{ fontSize: S.media, letterSpacing: '0.12em', fontWeight: 700 }}>{titolo}</Etichetta>
      {extra && <Etichetta style={{ fontSize: S.base }}>{extra}</Etichetta>}
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

// Quante se ne vedono subito; dopo il tocco si vedono **tutte**.
// ⚠️ Il tetto a 30 è stato togliere il 15/10/2026 (scelta di Mattia): erano
// *"mostra tutte le partite scelte"*, e un elenco che si ferma a trenta senza
// dirlo nasconde quello che esiste — il difetto di famiglia di questo progetto.
// Le proposte sopra soglia sono qualche decina, non migliaia: si possono
// mostrare tutte.
const VISIBILI = 10

// ⚠️⚠️ **Le colonne si scrivono**, non si chiede `*`. Con `select('*')` questa
// lettura spediva **236 kB** — 36 colonne per 329 proposte già giocate, comprese
// quelle che nessuno guarda (l'exchange, le quote under, i book di dettaglio).
// Qui servono le sei che `valuta()` legge più quelle che si vedono nella riga.
const COLONNE_GIOCATE = 'id, div, data, casa, trasferta, b365_1, b365_x, b365_2, b365_over25, avg_ap_1, avg_ap_x, avg_ap_2, max_ap_1, max_ap_2, partite!inner(esito, gol_casa, gol_trasferta)'

export default function StoricoPage() {
  // ⚠️ Le future arrivano dall'hook condiviso, che ha la memoria di sessione:
  // questa pagina se le riscaricava da sé con una query quasi identica a quella
  // di `usaProssime` — la stessa lista, due volte, con il rischio di due numeri
  // diversi sulla stessa cosa.
  const { righe: future, caricamento: caricaFuture } = usaProssime()
  const [archivio, setArchivio] = useState(null)
  const [giocate, setGiocate] = useState([])
  const [errore, setErrore] = useState(null)
  const [caricamento, setCaricamento] = useState(true)
  const [tutte, setTutte] = useState(false)   // le ultime chiuse: 10 o tutte

  useEffect(() => {
    async function carica() {
      // ⚠️⚠️ **Le tre letture insieme, non in fila.** Nessuna dipende dalle
      // altre, e in fila costavano 407 ms contro i 136 della più lenta: su
      // questa pagina il tempo era tutto nell'attesa, non nei dati.
      const [totale, ultimaGiocata, fatte] = await Promise.all([
        // Il conteggio dell'archivio: solo numeri, niente righe.
        supabase.from('partite').select('*', { count: 'exact', head: true }),
        supabase.from('partite').select('div, stagione, data').order('data', { ascending: false }).limit(1),
        // Le proposte già giocate, col risultato agganciato dalla chiave esterna.
        supabase.from('prossime_partite').select(COLONNE_GIOCATE).not('partita_id', 'is', null),
      ])
      if (fatte.error) setErrore(fatte.error.message)
      setArchivio({ totale: totale.count, ultima: ultimaGiocata.data?.[0] })
      setGiocate((fatte.data || []).map(r => ({ ...r, ...r.partite })).map(valuta).filter(r => r.prob !== null))
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
  const complessivo = conto(sopra)
  const ultime = useMemo(() => [...sopra].sort((a, b) => (a.data < b.data ? 1 : -1)), [sopra])

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

  // ⚠️ Si aspettano **entrambe**: senza, per un istante la pagina scriveva
  // *"partite future 0"* con un periodo vuoto — un numero sbagliato mostrato
  // come se fosse quello giusto.
  if (caricamento || caricaFuture) return <Attesa />

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: '0 auto' }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>STORICO</Etichetta>
      <div style={{ fontSize: S.evidenza, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 14 }}>L'archivio e come stiamo andando</div>
      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: S.media, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      <Sezione titolo="📚 L'archivio">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <Riquadro label="partite in archivio" valore={archivio?.totale?.toLocaleString('it-IT') ?? '—'} sub="tutte con quote e risultato" />
          <Riquadro label="ultima giocata" valore={archivio?.ultima ? giorno(archivio.ultima.data) : '—'}
            sub={archivio?.ultima ? `${sigla(archivio.ultima.div)} · stagione ${archivio.ultima.stagione}` : ''} />
          <Riquadro label="partite future" valore={future.length} sub={periodo} colore={C.oro} />
          <Riquadro label="ultimo scarico quote" valore={ultimoScarico ? new Date(ultimoScarico).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '—'}
            sub={ultimoScarico ? new Date(ultimoScarico).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''} />
        </div>
      </Sezione>

      <Sezione titolo="⚽ Le prossime, per campionato" extra={`${catFuture.centro} centro · ${catFuture.giallo} gialle · ${catFuture.blu} blu`}>
        <Card style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {perCampionato.map(([div, n]) => (
              <span key={div} style={{ fontSize: S.base, fontFamily: F.mono, padding: '4px 10px', borderRadius: 20, background: alpha(C.bluPieno, 0.1), color: C.blu }}>
                {sigla(div)} <b style={{ color: C.testo }}>{n}</b>
              </span>
            ))}
            {!perCampionato.length && <span style={{ fontSize: S.corpo, color: C.fantasma, fontFamily: F.sans }}>nessuna partita futura in tabella</span>}
          </div>
        </Card>
      </Sezione>

      <Sezione titolo="🎯 Le nostre proposte" extra={`${giocate.length} future poi giocate`}>
        {sopra.length === 0
          ? <Card><div style={{ fontSize: S.corpo, color: C.fantasma, fontFamily: F.sans }}>Nessuna proposta ancora giocata.</div></Card>
          : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Riquadro label="prese" valore={`${complessivo.prese}/${complessivo.tot}`} sub={`dichiarato ${pct(complessivo.atteso)}`}
                colore={complessivo.reale >= complessivo.atteso ? C.verde : C.ambra} />
              <Riquadro label="resa" valore={pct(complessivo.reale)} colore={complessivo.reale >= complessivo.atteso ? C.verde : C.ambra}
                sub={complessivo.reale >= complessivo.atteso ? 'meglio del dichiarato' : 'sotto il dichiarato'} />
              {['centro', 'giallo', 'blu'].map(cat => {
                const c = conto(sopra.filter(r => categoria(r.probGiocata, SOGLIE_DEFAULT) === cat))
                return <Riquadro key={cat} label={cat} valore={c.tot ? `${c.prese}/${c.tot}` : '—'}
                  sub={c.tot ? `${pct(c.reale)} · dichiarato ${pct(c.atteso)}` : 'nessuna'} colore={CATEGORIE[cat].colore} />
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: S.base, color: C.spento, fontFamily: F.sans, lineHeight: 1.6 }}>
              Ricostruite con le regole di oggi: non è il registro di cosa avete giocato davvero.
              La calibrazione su tutto l'archivio sta in <span style={{ fontFamily: F.mono, color: C.grigio }}>btscout/scripts/rendiconto.js</span>.
            </div>
          </>}
      </Sezione>

      {/* ⚠️ Niente `extra` col conteggio (richiesta di Mattia, 15/10/2026):
          diceva "10 di 42" e quei due numeri li dice già il tasto in fondo
          all'elenco, dove servono — accanto al titolo erano un doppione. */}
      <Sezione titolo="📋 Le ultime chiuse">
        <Card style={{ padding: '6px 12px' }}>
          {(tutte ? ultime : ultime.slice(0, VISIBILI)).map((r, i, arr) => {
            const ok = vinta(r.giocata, r)
            const cat = categoria(r.probGiocata, SOGLIE_DEFAULT)
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontFamily: F.mono, fontSize: S.corpo,
                borderBottom: i < arr.length - 1 ? `1px solid ${C.bordoTenue}` : 'none' }}>
                <span style={{ color: ok ? C.verde : C.rosso, fontSize: S.grande, width: 14 }}>{ok ? '✓' : '✗'}</span>
                <span style={{ color: C.fioco, width: 62, flexShrink: 0 }}>{giorno(r.data)}</span>
                <span style={{ color: CATEGORIE[cat].colore, width: 38, flexShrink: 0 }}>{sigla(r.div)}</span>
                <span style={{ color: C.testo, fontFamily: F.sans, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.casa} – {r.trasferta}
                </span>
                <span style={{ color: C.spento, flexShrink: 0 }}>{r.gol_casa}–{r.gol_trasferta}</span>
                <span style={{ color: CATEGORIE[cat].colore, width: 70, textAlign: 'right', flexShrink: 0 }}>{r.giocata.replace(' + over ', '+O')}</span>
                <span style={{ color: C.spento, width: 40, textAlign: 'right', flexShrink: 0 }}>{pct(r.probGiocata)}</span>
              </div>
            )
          })}

          {/* Le prime dieci sempre, il resto a richiesta: trenta righe aperte
              allungano la pagina di uno schermo e mezzo. */}
          {ultime.length > VISIBILI && (
            <button onClick={() => setTutte(v => !v)} style={{
              width: '100%', marginTop: 4, padding: '9px 0', background: 'transparent',
              border: 'none', borderTop: `1px solid ${C.bordoChiaro}`,
              color: C.spento, fontFamily: F.sans, fontSize: S.base, letterSpacing: '0.08em', cursor: 'pointer',
            }}>
              {tutte
                ? `⌃ mostra solo le ultime ${VISIBILI}`
                : `⌄ altre ${ultime.length - VISIBILI} · in tutto ${ultime.length}`}
            </button>
          )}
        </Card>
      </Sezione>
    </div>
  )
}
