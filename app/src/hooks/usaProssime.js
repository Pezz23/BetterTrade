import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { valuta, oggiLocale } from '../lib/attendibilita'

// Le partite future valutate, con i voti degli admin. Le usano la pagina
// Partite, le Spin provvisorie e Road to weekend: stessa lista, stesse
// stelline, un solo posto dove si carica.
//
// ⚠️⚠️ **Con memoria di modulo, come `usaVpm` e `usaClassifiche`** (21/10/2026).
// Prima ogni montaggio rifaceva le due richieste: cambiare pagina quattro volte
// voleva dire scaricare quattro volte le stesse 67 partite, e **l'avvio di Road
// to weekend pagava un giro intero** che la pagina Partite aveva già fatto.
// ⚠️ **E le due letture partono insieme.** Erano in fila — partite, poi voti —
// cioè due andate e ritorno quando una bastava: i voti non dipendono dalle
// partite. Qui il tempo non è nei dati (31 kB in tutto), è nel numero di giri.
// ⚠️ La memoria si svuota **a richiesta** (`ricarica()`), perché il calendario
// cambia quando gira l'importazione: una cache senza modo di buttarla è il
// difetto peggiore di una cache.

const COLONNE = 'id, div, campionato, data, ora, casa, trasferta, scaricato_il, fonte, book, book_1, book_x, book_2, b365_1, b365_x, b365_2, b365_over25, b365_under25, avg_ap_over25, avg_ap_under25, avg_ap_1, avg_ap_x, avg_ap_2, max_ap_1, max_ap_x, max_ap_2'

let memoria = null      // { righe, voti, flag }, una volta arrivate
let inCorso = null      // la richiesta, finché è in volo

function carica(forza = false) {
  if (forza) { memoria = null; inCorso = null }
  if (memoria) return Promise.resolve(memoria)
  if (!inCorso) {
    inCorso = (async () => {
      // ⚠️ Data locale, non UTC: fra mezzanotte e le due italiane
      // `toISOString` dà ieri, e la lista mostrava partite già giocate. Stessa
      // funzione che usa la finestra "Oggi", così le due non possono divergere.
      const oggi = oggiLocale()
      const [p, v, f] = await Promise.all([
        supabase.from('prossime_partite').select(COLONNE)
          .gte('data', oggi).order('data').order('ora'),
        // I voti: se la tabella non c'è ancora, la lista resta senza stelle attive.
        supabase.from('voti_partite').select('prossima_id, user_id'),
        // ⚑ I flag della scalata (sql/33): stessa forma delle stelle, altro
        // significato. ⚠️ Parte **insieme** alle altre due e non dopo: qui il
        // tempo non è nei dati, è nel numero di giri.
        supabase.from('flag_partite').select('prossima_id, user_id, da_admin'),
      ])
      inCorso = null
      if (p.error) throw new Error(p.error.message)
      memoria = {
        righe: (p.data || []).map(valuta).filter(r => r.prob !== null),
        voti: v.data || [],
        flag: f.data || [],
      }
      return memoria
    })()
  }
  return inCorso
}

export function usaProssime() {
  const { currentUser, isAdmin } = useAuth()
  const [righe, setRighe] = useState(() => memoria?.righe ?? [])
  const [voti, setVoti] = useState(() => memoria?.voti ?? [])
  const [flag, setFlag] = useState(() => memoria?.flag ?? [])
  const [caricamento, setCaricamento] = useState(!memoria)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    let vivo = true
    if (memoria) return
    carica()
      .then(d => { if (!vivo) return; setRighe(d.righe); setVoti(d.voti); setFlag(d.flag); setCaricamento(false) })
      .catch(e => { if (vivo) { setErrore(e.message); setCaricamento(false) } })
    return () => { vivo = false }
  }, [])

  // ⚠️⚠️ **Queste quattro sono avvolte in `useCallback` perché le righe della
  // lista sono `memo`.** Una funzione ricostruita a ogni ridisegno è una
  // proprietà nuova, e una proprietà nuova fa ridisegnare la riga: con 67
  // partite erano ~270 componenti rifatti **a ogni tasto premuto** in un campo
  // dei filtri. Il `memo` sulla riga non serve a niente se chi gli passa le
  // proprietà le rifà ogni volta.
  /** Rifà le due letture buttando la memoria: lo chiama il tasto ↻. */
  const ricarica = useCallback(async () => {
    setCaricamento(true)
    try {
      const d = await carica(true)
      setRighe(d.righe); setVoti(d.voti); setFlag(d.flag); setErrore(null)
    } catch (e) { setErrore(e.message) }
    setCaricamento(false)
  }, [])

  // Voto: una riga per admin per partita. Si scrive prima in memoria — la
  // risposta del database arriva dopo — e se fallisce si torna indietro.
  // ⚠️ Si aggiorna **anche la memoria di modulo**: senza, una stellina messa
  // nella pagina Partite sparirebbe tornandoci dopo essere passati altrove.
  const vota = useCallback(async (prossimaId) => {
    if (!isAdmin || !currentUser) return
    const mio = voti.some(v => v.prossima_id === prossimaId && v.user_id === currentUser.id)
    const prima = voti
    const dopo = mio
      ? voti.filter(v => !(v.prossima_id === prossimaId && v.user_id === currentUser.id))
      : [...voti, { prossima_id: prossimaId, user_id: currentUser.id }]
    setVoti(dopo)
    if (memoria) memoria.voti = dopo
    const { error } = mio
      ? await supabase.from('voti_partite').delete().eq('prossima_id', prossimaId).eq('user_id', currentUser.id)
      : await supabase.from('voti_partite').insert({ prossima_id: prossimaId, user_id: currentUser.id })
    if (error) {
      setVoti(prima)
      if (memoria) memoria.voti = prima
      setErrore(`Voto non salvato: ${error.message}`)
    }
  }, [isAdmin, currentUser, voti])
  const votiDi = useCallback((id) => voti.filter(v => v.prossima_id === id).length, [voti])

  // ⚑ Il flag della scalata: **identico al voto nel meccanismo** — una riga
  // per admin per partita, scritta prima in memoria e disfatta se il database
  // rifiuta — e diverso nel significato. Non si astrae in una funzione sola
  // con `vota`: sono due tabelle e due domande, e il giorno in cui una delle
  // due cambia regola (la stella scavalca la soglia, il flag no) una funzione
  // condivisa diventerebbe un albero di `if`.
  // ⚠️⚠️ **Dal 24/10/2026 il flag lo mette chiunque** (`sql/41`), e porta con
  // sé `da_admin`: verde se l'ha messo un admin, blu se un utente (Mattia).
  // È una fotografia del ruolo al momento del flag, e la policy rifiuta chi
  // prova a dichiararsi admin senza esserlo.
  const flagga = useCallback(async (prossimaId) => {
    if (!currentUser) return
    const mio = flag.some(f => f.prossima_id === prossimaId && f.user_id === currentUser.id)
    const prima = flag
    const dopo = mio
      ? flag.filter(f => !(f.prossima_id === prossimaId && f.user_id === currentUser.id))
      : [...flag, { prossima_id: prossimaId, user_id: currentUser.id, da_admin: isAdmin }]
    setFlag(dopo)
    if (memoria) memoria.flag = dopo
    const { error } = mio
      ? await supabase.from('flag_partite').delete().eq('prossima_id', prossimaId).eq('user_id', currentUser.id)
      : await supabase.from('flag_partite').insert({ prossima_id: prossimaId, user_id: currentUser.id, da_admin: isAdmin })
    if (error) {
      setFlag(prima)
      if (memoria) memoria.flag = prima
      setErrore(`Flag non salvato: ${error.message}`)
    }
  }, [isAdmin, currentUser, flag])
  const flagDi = useCallback((id) => flag.filter(f => f.prossima_id === id).length, [flag])
  // Quanti flag di admin e quanti di utenti: decide il colore della bandiera.
  const flagTipiDi = useCallback((id) => {
    const qui = flag.filter(f => f.prossima_id === id)
    return { admin: qui.filter(f => f.da_admin).length, user: qui.filter(f => !f.da_admin).length }
  }, [flag])
  const mioFlag = useCallback((id) =>
    !!currentUser && flag.some(f => f.prossima_id === id && f.user_id === currentUser.id), [flag, currentUser])
  const mioVoto = useCallback((id) =>
    !!currentUser && voti.some(v => v.prossima_id === id && v.user_id === currentUser.id), [currentUser, voti])

  return { righe, voti, vota, votiDi, mioVoto, flag, flagga, flagDi, flagTipiDi, mioFlag, caricamento, errore, ricarica }
}
