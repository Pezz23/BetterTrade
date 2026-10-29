import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { giocataArrivata } from '../lib/esito'

// ROAD TO WEEKEND — il registro: apre, segna, chiude, rilegge.
//
// ⚠️⚠️ **Senza questo l'esperimento non è falsificabile.** È la regola del
// motore: *"l'agente deve segnare cosa ha detto e verificare com'è andata;
// senza registro si ricordano i colpi e si dimenticano gli sbagli"*. Il
// backtest dice che la selezione meccanica rende 98% e Mattia pensa di fare
// meglio scegliendo a mano: **solo queste righe possono dirlo.**
//
// ⚠️ **Ogni gamba porta con sé att · scelta · VPM come erano quel giorno** e la
// **quota davvero giocata** (quella modificata a mano, non quella scaricata).
// Senza quei quattro numeri l'archivio dice solo se hai vinto; con quelli dice
// *perché l'avevi scelta*, ed è l'unica cosa che si può confrontare.
//
// ⚠️ Una scalata chiusa **non si tocca più** (scelta di Mattia, 18/10/2026): un
// registro riscrivibile non è una prova. Qui non c'è nessuna funzione che
// modifichi una riga con `stato = 'chiusa'`, ed è voluto.

// ⚠️⚠️ **Dal 24/10/2026 ogni account ha il SUO conto** (`sql/41`), admin e
// user, e ognuno vede solo il suo registro: niente più lettura aperta. Il
// conto parte da 0 e si riempie con le **ricariche**: `CAPITALE_INIZIALE`
// (100 scritti nel codice) non c'è più, perché era un versamento che non
// lasciava traccia — il contrario di quello che il conto deve dire.

/** Il passo senza le gambe annidate dalla lettura: quelle vivono a parte. */
const senzaGambe = (riga) => {
  const r = { ...riga }
  delete r.scalata_gambe
  return r
}

/**
 * Il primo errore di un gruppo di scritture partite insieme.
 * ⚠️ Serve perché `Promise.all` su supabase-js **non lancia**: ogni risposta
 * porta il suo `error`, e non guardarli vuol dire scrivere a metà e dire che è
 * andata bene.
 */
const primoErrore = (esiti) => esiti.find(r => r?.error)?.error?.message ?? null

/**
 * ⚠️⚠️ **Se un pezzo del piano non entra, si butta via tutta la scalata.**
 * supabase-js non ha transazioni, quindi senza questo rimedio un errore a metà
 * lascerebbe una scalata monca — e una scalata monca nel registro è peggio di
 * nessuna scalata. La `on delete cascade` di `sql/30` porta via passi e gambe.
 */
const annulla = async (id, messaggio) => {
  await supabase.from('scalate').delete().eq('id', id)
  return { errore: messaggio }
}

/** Le scalate dell'utente: la aperta (se c'è) e lo storico. */
export function usaScalate(userId) {
  const [stato, setStato] = useState({ aperta: null, passi: [], gambe: [], storico: null, ricariche: [], errore: null })
  // ⚠️ **`occupato` serve a schermo.** Ogni gesto è un giro al database, e un
  // tasto che per mezzo secondo non dice niente sembra rotto: è il motivo per
  // cui la lentezza di prima si notava più di quanto durasse.
  const [occupato, setOccupato] = useState(false)

  /**
   * ⚠️⚠️ **Due letture, non tre**, e questa è la correzione che si vede
   * (18/10/2026: *"quando apro scalata ci mette davvero tanto"*). I passi
   * arrivano con le loro gambe **dentro** — `select('*, scalata_gambe(*)')`,
   * che PostgREST annida seguendo la chiave esterna — invece di una seconda
   * richiesta `in(passo_id, …)`.
   * ⚠️ **Il costo di questa pagina non sono i dati, sono i giri**: una scalata
   * ha quattro passi e una decina di gambe, cioè niente, ma ogni andata e
   * ritorno su una connessione di casa costa 150-300 ms. Si conta il numero di
   * richieste, non i kilobyte.
   * ⚠️ L'ordine delle gambe si rifà **qui** e non nella query: il nome
   * dell'opzione per ordinare una tabella annidata è cambiato fra le versioni
   * di supabase-js, e un ordinamento che non viene applicato non dà errore —
   * lascia solo le righe in un ordine qualunque.
   * ⚠️ E gli errori delle due letture **si sollevano**: prima la seconda era
   * `const { data: p } = …`, quindi un rifiuto di RLS tornava una scalata
   * aperta **senza passi** — una risposta sbagliata presentata come giusta.
   */
  const ricarica = useCallback(async () => {
    if (!userId) return
    // ⚠️ Il filtro sull'utente resta anche se la policy fa già da sé
    // (`sql/41`): dice cosa si vuole, e non dipende dal ricordarsi la policy.
    // Scalate e ricariche non dipendono l'una dall'altra: partono insieme, e
    // il conto costa un'attesa in più solo sulla carta.
    const [{ data: scalate, error }, { data: ricariche, error: eR }] = await Promise.all([
      supabase.from('scalate').select('*').eq('user_id', userId).order('aperta_il', { ascending: false }),
      supabase.from('scalata_ricariche').select('*').eq('user_id', userId).order('fatta_il', { ascending: false }),
    ])
    if (error || eR) return setStato(s => ({ ...s, errore: (error || eR).message }))

    const aperta = (scalate || []).find(s => s.stato === 'aperta') || null
    let passi = [], gambe = []
    if (aperta) {
      // ⚠️ I passi in ordine di numero, non di inserimento: la posta di uno è
      // quello che il precedente ha rigiocato, quindi l'ordine è semantica.
      const { data: p, error: e2 } = await supabase.from('scalata_passi')
        .select('*, scalata_gambe(*)').eq('scalata_id', aperta.id).order('numero')
      if (e2) return setStato(s => ({ ...s, errore: e2.message }))
      passi = (p || []).map(senzaGambe)
      gambe = (p || []).flatMap(r => r.scalata_gambe || []).sort((a, b) => a.id - b.id)
    }
    setStato({ aperta, passi, gambe, storico: scalate || [], ricariche: ricariche || [], errore: null })
  }, [userId])

  useEffect(() => { ricarica() }, [ricarica])

  /**
   * Apre una scalata e **congela il piano**: le quote sono quelle scritte a
   * mano, non quelle scaricate.
   * ⚠️ Una alla volta (scelta di Mattia): se ce n'è già una aperta, si rifiuta
   * invece di crearne una seconda — due scalate aperte sullo stesso capitale
   * sarebbero due verità sullo stesso conto.
   */
  const apri = useCallback(async ({ bankroll, posta, quotaMinima, regola, piano }) => {
    if (stato.aperta) return { errore: 'c’è già una scalata aperta' }
    // ⚠️ **Si controlla PRIMA di scrivere.** Il database ha i suoi vincoli
    // (puntata > 0, quote > 1) ma scoprirli a metà inserimento lascia una
    // scalata monca; e un messaggio di Postgres non dice a una persona cosa
    // deve correggere.
    if (!piano?.length) return { errore: 'non c’è nessun passo da salvare' }
    if (!(posta > 0)) return { errore: 'la puntata è zero: il conto è troppo basso, serve una ricarica' }
    for (const [i, p] of piano.entries()) {
      const brutta = p.gambe.find(g => !(Number(g.quota) > 1))
      if (brutta) return { errore: `passo ${i + 1}: la quota di ${brutta.casa} non è valida` }
      if (!(p.quota > 1)) return { errore: `passo ${i + 1}: quota complessiva non valida` }
    }
    const { data: s, error } = await supabase.from('scalate').insert({
      user_id: userId, bankroll_iniziale: bankroll, posta, quota_minima: quotaMinima,
      regola, cassa: posta, accumulo: 0,
    }).select().single()
    if (error) return { errore: error.message }

    // ⚠️⚠️ **Tutti i passi in una scrittura, tutte le gambe in un'altra.**
    // Prima era un inserimento per passo più uno per le sue gambe, in fila:
    // con quattro passi facevano **nove** richieste invece di tre, e sommate
    // alla rilettura erano i secondi che Mattia vedeva girare dopo APRI
    // SCALATA. Le gambe hanno bisogno degli id dei passi, quindi i due gruppi
    // restano in ordine: due attese, non nove.
    const { data: salvati, error: e2 } = await supabase.from('scalata_passi').insert(
      piano.map((p, i) => ({
        scalata_id: s.id, numero: i + 1, giorno: p.giorno, posta: p.posta, quota: p.quota,
      }))).select()
    if (e2) return annulla(s.id, e2.message)

    // ⚠️ Gli id si riagganciano per **numero**, non per posizione nell'array:
    // `insert` non promette di restituire le righe nell'ordine in cui le hai
    // mandate, e un piano con le gambe sul passo sbagliato è un registro che
    // mente senza dare errore.
    const perNumero = new Map((salvati || []).map(r => [r.numero, r.id]))
    const { error: e3 } = await supabase.from('scalata_gambe').insert(
      piano.flatMap((p, i) => p.gambe.map(g => ({
        passo_id: perNumero.get(i + 1), prossima_id: g.id, div: g.div, data: g.data, ora: g.ora,
        casa: g.casa, trasferta: g.trasferta, giocata: g.giocata,
        quota: g.quota, att: g.att, scelta: g.scelta, vpm: g.vpm,
      }))))
    if (e3) return annulla(s.id, e3.message)

    await ricarica()
    return { id: s.id }
  }, [userId, stato.aperta, ricarica])

  /**
   * Segna l'esito di un passo.
   * ⚠️⚠️ **Non tocca le casse**: quelle si ricalcolano dalla catena
   * (`casseDi` in `lib/scalata.js`). Tenerle aggiornate qui voleva dire
   * doverle *disfare* a ogni annullamento — ed è il motivo per cui la prima
   * versione proibiva di annullare. Le colonne `cassa`/`accumulo` restano come
   * fotografia, la verità è il calcolo.
   */
  const segna = useCallback(async (passoId, esito, { montante, messoVia, resto }) => {
    // ⚠️ Le gambe seguono il passo: una schedina è vinta solo se tutte le
    // gambe lo sono, quindi il loro esito è lo stesso del passo. Le due
    // scritture non dipendono l'una dall'altra, quindi partono insieme.
    const errore = primoErrore(await Promise.all([
      supabase.from('scalata_passi').update({
        esito, montante: montante ?? null, messo_via: messoVia ?? null, resto: resto ?? null,
        deciso_il: new Date().toISOString(),
      }).eq('id', passoId),
      supabase.from('scalata_gambe').update({ esito }).eq('passo_id', passoId),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [ricarica])

  /**
   * Chiude la scalata consolidando: accumulo e cassa rientrano nel capitale.
   * ⚠️ `bankroll_finale` si scrive **una volta sola, qui**: è il capitale che
   * la prossima eredita, e averlo scritto evita di ricostruire la catena
   * sommando i risultati di tutte le precedenti — una somma che basta un
   * record saltato a sfalsare.
   */
  const chiudi = useCallback(async (bankrollFinale, { cassa, accumulo } = {}) => {
    if (!stato.aperta) return { errore: 'nessuna scalata aperta' }
    const { error } = await supabase.from('scalate').update({
      stato: 'chiusa', chiusa_il: new Date().toISOString(), bankroll_finale: bankrollFinale,
      // ⚠️ **L'unico momento in cui le casse si scrivono.** Finché la scalata
      // è aperta sono derivate (`casseDi`), e tenerle aggiornate a ogni esito
      // era il secondo numero che obbligava a vietare le modifiche. Alla
      // chiusura però la catena non cambia più, e l'archivio ha bisogno del
      // valore: senza, una scalata in utile dichiarava accumulo zero.
      ...(cassa != null ? { cassa } : {}),
      ...(accumulo != null ? { accumulo } : {}),
    }).eq('id', stato.aperta.id)
    if (error) return { errore: error.message }
    // ⚠️⚠️ **In archivio restano solo i passi GIOCATI** (Mattia, 29/10/2026:
    // *"quando chiudo una scalata deve tracciare solo i passi giocati"*). I
    // passi ancora aperti erano il piano, non una giocata, e il resoconto li
    // mostrava come se lo fossero. Si tolgono **dopo** la chiusura, così nel
    // registro delle cancellazioni (`sql/42`, *"aiuta a migliorare il
    // modello"*) risultano con `stato_scalata = 'chiusa'`: distinguibili dai
    // passi tolti a mano a scalata aperta.
    // ⚠️ Solo per STOP: «⟳ RIPARTI» i passi rimasti li sposta nel giro nuovo.
    const aperti = stato.passi.filter(p => p.esito === 'aperto').map(p => p.id)
    if (aperti.length) {
      const { error: e2 } = await supabase.from('scalata_passi').delete().in('id', aperti)
      if (e2) { await ricarica(); return { errore: `scalata chiusa, ma il piano non giocato è rimasto: ${e2.message}` } }
    }
    await ricarica()
    return {}
  }, [stato.aperta, stato.passi, ricarica])

  /**
   * Butta via i passi non ancora giocati e tiene i soldi dove sono.
   * ⚠️ È la risposta di Mattia a *"cosa succede alle scalate dimenticate"*:
   * **"rimane lì ferma a livello di denaro, le partite si azzerano"**. Il
   * denaro è lo stato della scalata, il piano è settimanale.
   */
  const azzeraPiano = useCallback(async () => {
    if (!stato.aperta) return
    const aperti = stato.passi.filter(p => p.esito === 'aperto').map(p => p.id)
    if (aperti.length) await supabase.from('scalata_passi').delete().in('id', aperti)
    await ricarica()
  }, [stato.aperta, stato.passi, ricarica])

  /**
   * ⚠️⚠️ **Si modifica solo quello che non è ancora stato giocato.**
   * All'inizio avevo congelato tutto il piano all'apertura, e Mattia l'ha
   * trovato subito usandolo: *"se apro la scalata non posso aggiungere o
   * togliere partite al passo"*. Era un errore di disegno — **immutabile deve
   * essere ciò che è ACCADUTO**, non ciò che è programmato. Un passo con un
   * esito non si tocca più; un passo ancora aperto è un piano, e i piani
   * cambiano: le partite si rinviano, e si cambia idea.
   *
   * La quota del passo è il **prodotto delle gambe**, e va riscritta a ogni
   * modifica: lasciarla vecchia darebbe due numeri diversi sulla stessa
   * schedina.
   * ⚠️⚠️ **Si calcola dalle gambe che l'hook ha già in mano**, non rileggendole
   * dal database: la versione prima faceva un `select` per saperle, cioè un
   * giro in più per ogni tocco — mentre erano già nello stato, perché è lo
   * stesso elenco che la pagina sta disegnando.
   */
  const quotaDi = useCallback((passoId, cambia) => {
    const g = cambia(stato.gambe.filter(x => x.passo_id === passoId))
    return { quante: g.length, quota: Number(g.reduce((a, x) => a * Number(x.quota), 1).toFixed(4)) }
  }, [stato.gambe])

  // ⚠️ `quota > 1` è un vincolo del database: un passo rimasto senza gambe non
  // si può salvare con quota 1, quindi **si cancella** — una schedina senza
  // partite non è una schedina.
  const scriviQuota = (passoId, { quante, quota }) => quante
    ? supabase.from('scalata_passi').update({ quota }).eq('id', passoId)
    : supabase.from('scalata_passi').delete().eq('id', passoId)

  // ⚠️ La scrittura della gamba e quella della quota del passo non dipendono
  // l'una dall'altra: partono insieme, e l'attesa è una invece di due.
  const togliGamba = useCallback(async (gambaId, passoId) => {
    const errore = primoErrore(await Promise.all([
      supabase.from('scalata_gambe').delete().eq('id', gambaId),
      scriviQuota(passoId, quotaDi(passoId, g => g.filter(x => x.id !== gambaId))),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [quotaDi, ricarica])

  /**
   * Aggiunge una gamba a un passo salvato.
   * ⚠️ Dal 22/10/2026 la usa anche **«+ aggiungi partita manuale»**, che pesca
   * dal calendario intero e non dalle candidate: da lì può arrivare una quota
   * strana o una partita già nel passo, e il database se ne accorgerebbe con
   * un messaggio che non dice a una persona cosa correggere.
   * ⚠️ La stessa partita due volte nello stesso passo è una schedina che al
   * banco non esiste.
   * ⚠️ I quattro numeri (att, scelta, VPM, quota giocata) entrano **com'erano
   * oggi**: senza, l'archivio direbbe solo che l'hai giocata, non perché
   * l'avevi scelta.
   */
  const aggiungiGamba = useCallback(async (passoId, g) => {
    if (!(Number(g?.quota) > 1)) return { errore: `la quota di ${g?.casa ?? 'questa partita'} non è valida` }
    if (stato.gambe.some(x => x.passo_id === passoId && x.prossima_id === g.id))
      return { errore: 'questa partita è già nel passo' }
    const errore = primoErrore(await Promise.all([
      supabase.from('scalata_gambe').insert({
        passo_id: passoId, prossima_id: g.id, div: g.div, data: g.data, ora: g.ora,
        casa: g.casa, trasferta: g.trasferta, giocata: g.giocata,
        quota: g.quota, att: g.att, scelta: g.scelta, vpm: g.vpm,
      }),
      scriviQuota(passoId, quotaDi(passoId, x => [...x, { quota: g.quota }])),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [stato.gambe, quotaDi, ricarica])

  /**
   * Allungare un passo con la gamba di un altro è uno **spostamento**, e qui
   * è una cosa sola.
   * ⚠️⚠️ Prima la pagina chiamava `togliGamba` e poi `aggiungiGamba`: due giri
   * completi, **ciascuno con la sua rilettura**, cioè una dozzina di andate e
   * ritorno per un tocco sul `+`. Ora le quattro scritture partono insieme e si
   * rilegge una volta.
   * ⚠️ La gamba non si "sposta" davvero: si cancella e si riscrive sotto l'altro
   * passo, perché l'id della riga è di quel passo. I quattro numeri della
   * selezione (att, scelta, VPM, quota giocata) la seguono — sono il motivo per
   * cui il registro esiste.
   */
  const spostaGamba = useCallback(async (gamba, aPassoId) => {
    const da = gamba.passo_id
    if (!da || da === aPassoId) return { errore: 'la gamba è già in questo passo' }
    const errore = primoErrore(await Promise.all([
      supabase.from('scalata_gambe').delete().eq('id', gamba.id),
      supabase.from('scalata_gambe').insert({
        passo_id: aPassoId, prossima_id: gamba.prossima_id, div: gamba.div, data: gamba.data,
        ora: gamba.ora, casa: gamba.casa, trasferta: gamba.trasferta, giocata: gamba.giocata,
        quota: gamba.quota, att: gamba.att, scelta: gamba.scelta, vpm: gamba.vpm,
      }),
      scriviQuota(da, quotaDi(da, g => g.filter(x => x.id !== gamba.id))),
      scriviQuota(aPassoId, quotaDi(aPassoId, g => [...g, { quota: gamba.quota }])),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [quotaDi, ricarica])

  /**
   * **Spezzare un passo in due** (21/10/2026, richiesta di Mattia: *"se mi
   * propone 4 partite vicine devo poter dividerle in 2"*).
   *
   * Le gambe passate restano dove sono, tutte le **altre** scendono in un
   * passo nuovo inserito subito dopo. Da lì in poi sono due schedine distinte,
   * e la catena delle casse se ne accorge da sola — `casseDi` cammina sui
   * passi, quindi la puntata del pezzo nuovo è quella che arriva fin lì.
   *
   * ⚠️⚠️ **Il numero del passo nuovo è un valore DI MEZZO** (3 e 4 → 3,5), ed è
   * il motivo per cui `sql/31` ha portato la colonna a `numeric`. Con un
   * intero, unico per scalata e limitato a 1..30, inserire in mezzo voleva
   * dire rinumerare i successivi **uno per volta dalla coda** — fino a nove
   * andate e ritorno per un tocco, su una pagina il cui costo è già stato
   * misurato in giri.
   * ⚠️ La `posta` si copia da quella del passo spezzato solo perché la colonna
   * non ammette nulli: **non la legge nessuno**, la puntata vera la ricalcola
   * `casseDi` dalla catena.
   */
  const spezzaPasso = useCallback(async (passo, prossimoNumero, gambeGiu) => {
    if (!gambeGiu.length) return { errore: 'niente da spostare' }
    const numero = prossimoNumero != null
      ? (Number(passo.numero) + Number(prossimoNumero)) / 2
      : Number(passo.numero) + 1
    const { data: nuovo, error } = await supabase.from('scalata_passi').insert({
      scalata_id: passo.scalata_id, numero, giorno: passo.giorno, posta: passo.posta,
      quota: gambeGiu.reduce((a, g) => a * Number(g.quota), 1),
    }).select('id').single()
    if (error) return { errore: error.message }

    const errore = primoErrore(await Promise.all([
      ...gambeGiu.map(g => supabase.from('scalata_gambe').update({ passo_id: nuovo.id }).eq('id', g.id)),
      scriviQuota(passo.id, quotaDi(passo.id, g => g.filter(x => !gambeGiu.some(y => y.id === x.id)))),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [quotaDi, ricarica])

  const cambiaQuota = useCallback(async (gambaId, passoId, quota) => {
    if (!(Number(quota) > 1)) return { errore: 'quota non valida' }
    const errore = primoErrore(await Promise.all([
      supabase.from('scalata_gambe').update({ quota: Number(quota) }).eq('id', gambaId),
      scriviQuota(passoId, quotaDi(passoId, g => g.map(x => x.id === gambaId ? { ...x, quota } : x))),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [quotaDi, ricarica])

  /**
   * ⚠️⚠️ **⟳ RIPARTI dopo un passo perso** (Mattia, 24/10/2026: *"se metto
   * perso non mi presenta i passi successivi, motivo per il quale ho chiuso la
   * scalata"*). Chiude il giro come STOP e ne apre uno nuovo coi **passi
   * programmati che restano** — spostati, non copiati — e la puntata del 10%
   * del conto. Gli accumuli ripartono dalla prima vittoria del giro nuovo,
   * perché `casseDi` cammina sui passi del giro.
   * ⚠️ È una funzione del database (`riparti_scalata`, `sql/41`) e non tre
   * chiamate: senza transazione, a metà resterebbe un giro chiuso senza il
   * successivo. I numeri li calcola la pagina, la formula resta in un posto.
   */
  const riparti = useCallback(async (passoPerso, { finale, cassa, accumulo, conto, posta }) => {
    if (!stato.aperta) return { errore: 'nessuna scalata aperta' }
    const { error } = await supabase.rpc('riparti_scalata', {
      p_scalata: stato.aperta.id, p_dopo: Number(passoPerso.numero), p_finale: finale,
      p_cassa: cassa, p_accumulo: accumulo, p_conto: conto, p_posta: posta,
    })
    if (error) return { errore: error.message }
    await ricarica()
    return {}
  }, [stato.aperta, ricarica])

  /**
   * Una ricarica del conto. ⚠️ È l'**unico** modo in cui entrano soldi: i
   * tasti −/+ sul bankroll non ci sono più, perché cambiavano il conto senza
   * lasciare traccia.
   */
  const ricaricaConto = useCallback(async (importo) => {
    const n = Number(importo)
    if (!(n > 0)) return { errore: 'importo non valido' }
    const { error } = await supabase.from('scalata_ricariche').insert({ user_id: userId, importo: n })
    if (error) return { errore: error.message }
    await ricarica()
    return {}
  }, [userId, ricarica])

  /**
   * Annulla una ricarica sbagliata. ⚠️ La pagina la offre **solo per
   * l'ultima, e solo se dopo non si è aperta nessuna scalata**: quella scalata
   * è nata su quel conto, e toglierle la ricarica da sotto riscriverebbe il
   * passato.
   */
  const annullaRicarica = useCallback(async (id) => {
    const { error } = await supabase.from('scalata_ricariche').delete().eq('id', id)
    if (error) return { errore: error.message }
    await ricarica()
    return {}
  }, [ricarica])

  /**
   * «fissa passo» a scalata aperta. ⚠️ Era stato della pagina e **spariva
   * chiudendo l'app**: i passi fissati tornavano nascosti, e sembrava che la
   * scalata li avesse persi (Mattia, 24/10/2026). Ora è una colonna del passo.
   */
  const fissa = useCallback(async (passoId, valore) => {
    const { error } = await supabase.from('scalata_passi').update({ fissato: !!valore }).eq('id', passoId)
    if (error) return { errore: error.message }
    await ricarica()
    return {}
  }, [ricarica])

  /**
   * ⚠️⚠️ **Il resoconto di una scalata chiusa** (Mattia, 26/10/2026: *"quando
   * chiudo la scalata non deve dirmi solo gli importi, voglio un resoconto
   * delle giocate"*): passo per passo, ogni partita con il **suo** esito vero.
   * ⚠️ Il registro sa solo se il PASSO è vinto: le gambe copiano l'esito del
   * passo (`segna`). L'esito di ogni partita si ricava dal risultato in
   * archivio — gamba → `prossime_partite.partita_id` → `partite` — con la
   * regola di `lib/esito.js`, la stessa che usa il motore.
   * ⚠️ Si legge **solo quando si apre** una scalata dell'archivio: sono tre
   * giri al database, e il costo di questa pagina sono i giri.
   * ⚠️ Una partita non ancora collegata al suo risultato (football-data in
   * ritardo) torna `arrivata: null` — *in attesa*, non *persa*.
   */
  const resoconto = useCallback(async (scalataId) => {
    const { data: p, error } = await supabase.from('scalata_passi')
      .select('*, scalata_gambe(*)').eq('scalata_id', scalataId).order('numero')
    if (error) return { errore: error.message }
    const gambe = (p || []).flatMap(r => r.scalata_gambe || [])
    const idProssime = [...new Set(gambe.map(g => g.prossima_id).filter(Boolean))]
    let golDi = new Map()
    if (idProssime.length) {
      const { data: pr, error: e2 } = await supabase.from('prossime_partite').select('id, partita_id').in('id', idProssime)
      if (e2) return { errore: e2.message }
      const idPartite = [...new Set((pr || []).map(x => x.partita_id).filter(Boolean))]
      if (idPartite.length) {
        const { data: pa, error: e3 } = await supabase.from('partite').select('id, gol_casa, gol_trasferta').in('id', idPartite)
        if (e3) return { errore: e3.message }
        const perPartita = new Map((pa || []).map(x => [x.id, x]))
        golDi = new Map((pr || []).map(x => [x.id, perPartita.get(x.partita_id)]).filter(([, v]) => v))
      }
    }
    // ⚠️ Solo i passi con un esito: le scalate chiuse prima del 29/10/2026
    // hanno ancora dentro il piano non giocato, e il resoconto è delle giocate.
    return {
      passi: (p || []).filter(r => r.esito !== 'aperto').map(r => ({
        ...senzaGambe(r),
        gambe: (r.scalata_gambe || []).sort((a, b) => a.id - b.id).map(g => {
          const ris = golDi.get(g.prossima_id)
          return {
            ...g,
            risultato: ris ? `${ris.gol_casa}-${ris.gol_trasferta}` : null,
            arrivata: ris ? giocataArrivata(g.giocata, ris.gol_casa, ris.gol_trasferta) : null,
          }
        }),
      })),
    }
  }, [])

  /**
   * ⚠️⚠️ **Riparti da 0: cancella tutto il registro di questo utente**, come
   * se fosse il primo giorno (Mattia, 18/10). È l'unica operazione
   * irreversibile della pagina, e non ha una via di ritorno: non esiste un
   * annulla, perché non esiste una copia.
   * ⚠️ Basta cancellare le righe di `scalate`: passi e gambe hanno
   * `on delete cascade` (`sql/30`), quindi se ne vanno con loro. Cancellarle a
   * mano in tre giri lascerebbe orfani al primo errore in mezzo.
   * ⚠️ **Le scalate aperte vanno via anche loro**: *"come se partissi quel
   * giorno per la prima volta"*.
   * ⚠️⚠️ **E vanno via anche le ricariche** (24/10/2026): il conto è
   * `ricariche + risultati`, e cancellare solo le scalate restituirebbe le
   * perdite — un conto che dopo un azzeramento vale più di prima. Dopo, il
   * conto è 0 e si ricomincia da una ricarica.
   */
  const azzeraTutto = useCallback(async () => {
    if (!userId) return { errore: 'nessun utente' }
    const errore = primoErrore(await Promise.all([
      supabase.from('scalate').delete().eq('user_id', userId),
      supabase.from('scalata_ricariche').delete().eq('user_id', userId),
    ]))
    if (errore) return { errore }
    await ricarica()
    return {}
  }, [userId, ricarica])

  // ⚠️ Le scritture escono avvolte in `occupato`: il conto dell'attesa sta in
  // un posto solo, invece che ripetuto dentro ognuna. Si avvolge **qui** e non
  // dentro i `useCallback` per non far dipendere ogni funzione dallo stato che
  // lei stessa cambia — sarebbe un'identità nuova a ogni scrittura.
  const attendendo = (f) => async (...a) => {
    setOccupato(true)
    try { return await f(...a) } finally { setOccupato(false) }
  }

  return {
    ...stato, occupato, ricarica, resoconto,
    riparti: attendendo(riparti),
    ricaricaConto: attendendo(ricaricaConto),
    annullaRicarica: attendendo(annullaRicarica),
    fissa: attendendo(fissa),
    apri: attendendo(apri),
    segna: attendendo(segna),
    chiudi: attendendo(chiudi),
    azzeraPiano: attendendo(azzeraPiano),
    azzeraTutto: attendendo(azzeraTutto),
    togliGamba: attendendo(togliGamba),
    aggiungiGamba: attendendo(aggiungiGamba),
    spostaGamba: attendendo(spostaGamba),
    spezzaPasso: attendendo(spezzaPasso),
    cambiaQuota: attendendo(cambiaQuota),
  }
}
