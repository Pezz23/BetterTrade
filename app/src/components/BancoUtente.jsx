import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usaProssime } from '../hooks/usaProssime'
import { usaRecenti } from '../hooks/usaRecenti'
import { usaClassifiche } from '../hooks/usaClassifiche'
import { usaPercorso } from '../hooks/usaPercorso'
import { vai, chiudiVerso } from '../lib/indirizzi'
import { categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'
import SchedaScorrevole from './SchedaScorrevole'
import DettaglioPartita from './DettaglioPartita'
import { giocataArrivata } from '../lib/esito'
import { puntataDi } from '../lib/scalata'
import { eur } from '../lib/formato'
import { C, F, S, SP, alpha } from '../theme'
import { Card, Attesa, Etichetta } from './ui'
import TrasferisciConto from './TrasferisciConto'
import StatisticheRtw from './StatisticheRtw'

// ROAD TO WEEKEND per chi ha la spunta «copia il banco» (Mattia, 04/11/2026):
// vede i passi del superadmin e cosa succede ai SUOI soldi, senza toccare niente.
// ⚠️ Non legge le tabelle della scalata: `banco_utente()` (`sql/57`) gli dà le
// partite e la sua puntata, mai il totale né gli altri. Unica azione: i suoi
// trasferimenti cassa ↔ RTW.
// ⚠️ Il passo attivo è **la stessa card** di chi gioca da solo (`PassoHero`, che
// la pagina passa come `CardPasso`: importarla da qui chiuderebbe un anello),
// con `tocca={false}`: niente tasti. Gli altri passi restano nella forma corta.

const COLORE = { vinto: C.verde, perso: C.rosso }
const conSegno = (x) => `${x >= 0 ? '+' : ''}${eur(x)}`

function Gambe({ gambe }) {
  return (gambe || []).map(g => {
    const finita = g.gol_casa != null
    const arrivata = finita ? giocataArrivata(g.giocata, g.gol_casa, g.gol_trasferta) : null
    return (
      <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', gap: SP.s, marginTop: SP.s,
        fontFamily: F.sans, fontSize: S.base, color: C.testo }}>
        <span style={{ minWidth: 0 }}>
          {g.casa} - {g.trasferta}
          <span style={{ color: C.spento }}> · {g.giocata}{g.ora ? ` · ${String(g.ora).slice(0, 5)}` : ''}</span>
        </span>
        {finita && (
          <b style={{ flexShrink: 0, fontFamily: F.mono, color: arrivata === true ? C.verde : arrivata === false ? C.rosso : C.spento }}>
            {g.gol_casa}-{g.gol_trasferta}
          </b>
        )}
      </div>
    )
  })
}

function Passo({ p, stima }) {
  const giocato = p.esito !== 'aperto' || p.confermato
  const puntata = p.mia_puntata != null ? Number(p.mia_puntata) : null
  const q = Number(p.quota)
  const colore = COLORE[p.esito]
  const stato = p.esito === 'vinto' ? `vinto ${conSegno(Math.round((puntata || 0) * (q - 1) * 100) / 100)}`
    : p.esito === 'perso' ? `perso ${conSegno(-(puntata || 0))}`
    : p.confermato ? (puntata != null ? 'in gioco' : 'giocato senza di te')
    : stima >= 1 ? `prossimo: circa ${eur(stima)}` : 'in programma'
  return (
    <Card style={{ marginBottom: SP.s, ...(colore ? { borderColor: alpha(colore, 0.5) } : {}) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: SP.s, alignItems: 'baseline', fontFamily: F.sans, fontSize: S.base }}>
        <b style={{ color: C.testo }}>
          {puntata != null ? `Puntata ${eur(puntata)}` : 'Passo'}
          <span style={{ color: C.spento, fontWeight: 400 }}> · quota {q.toFixed(2).replace('.', ',')}</span>
        </b>
        <b style={{ flexShrink: 0, color: colore || (giocato ? C.ambra : C.spento) }}>{stato}</b>
      </div>
      <Gambe gambe={p.gambe} />
    </Card>
  )
}

export default function BancoUtente({ CardPasso, coloreDi }) {
  const { currentUser, aggiornaSaldo } = useAuth()
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)
  const [vista, setVista] = useState('piano')
  const classifiche = usaClassifiche()
  const { righe: prossime, vota, votiDi, votiTipiDi, mioVoto } = usaProssime()
  const { ieri } = usaRecenti()
  const percorso = usaPercorso()
  const apertaId = Number(percorso.split('/')[2]) || null
  const partitaAperta = useMemo(() => [...(ieri || []), ...(prossime || [])].find(r => r.id === apertaId),
    [ieri, prossime, apertaId])
  const chiudi = () => chiudiVerso('/scalata')

  const leggi = useCallback(async () => {
    const { data, error } = await supabase.rpc('banco_utente')
    if (error) setErrore(error.message); else setDati(data)
  }, [])
  useEffect(() => { leggi() }, [leggi])

  if (!dati && !errore) return <Attesa>carico i passi…</Attesa>
  const conto = Number(dati?.conto || 0)
  const versato = Number(dati?.versato || 0)
  const risultato = conto - versato
  const passi = dati?.passi || []
  const stima = dati?.percentuale ? puntataDi(conto, dati.percentuale) : 0
  // la stima solo sul prossimo passo da giocare: quelli dopo dipendono da com'è andata
  const iProssimo = passi.findIndex(p => p.esito === 'aperto' && !p.confermato)
  const iAttivo = passi.findIndex(p => p.esito === 'aperto')
  const risultati = new Map(passi.flatMap(p => p.gambe || []).filter(g => g.gol_casa != null)
    .map(g => [g.prossima_id, { casa: g.gol_casa, trasferta: g.gol_trasferta }]))

  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px', gap: SP.s }}>
        <h2 style={{ fontSize: S.titolo, fontFamily: F.sans, letterSpacing: '0.1em', color: C.testo, margin: 0 }}>ROAD TO WEEKEND</h2>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {[['piano', 'PIANO'], ['archivio', 'ARCHIVIO']].map(([k, l]) => (
            <button key={k} onClick={() => setVista(k)} style={{ padding: '5px 10px', fontSize: S.base, fontFamily: F.sans, cursor: 'pointer',
              color: vista === k ? C.celestePieno : C.spento, background: vista === k ? `linear-gradient(${alpha(C.celestePieno, .14)},${alpha(C.celestePieno, .14)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(C.celestePieno, vista === k ? .5 : .18)}` }}>{l}</button>
          ))}
        </div>
      </div>
      {errore && (
        <Card style={{ marginBottom: SP.m, borderColor: alpha(C.rosso, .4) }}>
          <div style={{ color: C.rosso, fontSize: S.base, fontFamily: F.sans }}>{errore}</div>
        </Card>
      )}
      {vista === 'archivio' && <>
        <StatisticheRtw />
        {!dati?.storico?.length && (
          <Card><div style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento }}>Nessuna giocata con un esito, per ora.</div></Card>
        )}
        {(dati?.storico || []).map(p => <Passo key={p.id} p={{ ...p, mia_puntata: p.puntata }} stima={0} />)}
      </>}

      {vista === 'piano' && <>
      <Card style={{ marginBottom: SP.m }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: SP.s }}>
          {[['CONTO', eur(conto), C.oro], ['VERSATO', eur(versato), C.testo],
            ['RISULTATO', conSegno(risultato), risultato >= 0 ? C.verde : C.rosso]].map(([l, v, col]) => (
            <div key={l} style={{ minWidth: 0 }}>
              <Etichetta>{l}</Etichetta>
              <div style={{ fontFamily: F.mono, fontSize: S.base, fontWeight: 700, color: col, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <TrasferisciConto cassa={currentUser?.bankroll} occupato={occupato} onTrasferisci={async (importo, verso) => {
          setOccupato(true); setErrore(null)
          const { error } = await supabase.rpc('trasferisci_rtw', { p_user: currentUser.id, p_importo: importo, p_verso: verso })
          if (error) setErrore(error.message)
          else { await aggiornaSaldo(currentUser.id); await leggi() }
          setOccupato(false)
          return !error
        }} />
      </Card>

      {!passi.length && (
        <Card style={{ marginBottom: SP.m }}>
          <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento }}>
            Nessun giro in corso: i passi compaiono qui appena il banco gioca.
          </div>
        </Card>
      )}
      {passi.map((p, i) => (i === iAttivo
        ? <CardPasso key={p.id} tocca={false} numero={i + 1} gambe={p.gambe || []} giorno={p.giorno}
            ora={p.gambe?.[0]?.ora?.slice(0, 5)} posta={p.mia_puntata != null ? Number(p.mia_puntata) : stima}
            conto={conto} colore={coloreDi(i)} classifiche={classifiche} quote={{}} setQuote={() => {}}
            esito={null} confermato={p.confermato} risultatoDi={(id) => risultati.get(id) ?? null}
            stelleDi={votiDi} onApri={(id) => vai(`/scalata/${id}`)} />
        : <Passo key={p.id} p={p} stima={i === iProssimo ? stima : 0} />))}
      </>}

      {partitaAperta && (
        <SchedaScorrevole onChiudi={chiudi}>
          <DettaglioPartita p={partitaAperta} cat={categoria(partitaAperta.probGiocata, SOGLIE_DEFAULT)}
            voti={votiTipiDi(partitaAperta.id)} mio={mioVoto(partitaAperta.id)} puoVotare
            onVota={() => vota(partitaAperta.id)} onChiudi={chiudi} />
        </SchedaScorrevole>
      )}
    </div>
  )
}
