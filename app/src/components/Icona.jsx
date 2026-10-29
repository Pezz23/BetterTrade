/**
 * ICONA — il set di segni dell'app, disegnato invece che scritto.
 *
 * ⚠️⚠️ **Esiste perché un'emoji non obbedisce al colore del testo.** Nella tab
 * bar convivevano due glifi (`◈` `⊞`) e due emoji (`🎰` `⚽`): i primi
 * prendevano `C.inattivo` quando la scheda non era attiva, le seconde restavano
 * a colori pieni **sempre**. Risultato: SPIN e PARTITE sembravano accese anche
 * da spente, e l'unico segnale di "dove sono" nella barra principale non
 * funzionava su metà dei tasti.
 *
 * ⚠️ Secondo motivo: un'emoji **la disegna il sistema operativo**, quindi la
 * stessa barra ha un aspetto su Mac, un altro su Android e un altro su Windows.
 * Un `<svg>` è identico ovunque e pesa niente.
 *
 * Le regole del set, per aggiungerne una senza stonare:
 *   · riquadro 24×24, **solo contorno**, mai riempimento
 *   · spessore 1,6 — a 18px è l'unico che non impasta i dettagli
 *   · `currentColor`: il colore lo decide chi la usa, come per il testo
 *   · estremità arrotondate, perché il resto dell'app ha raggi tondi
 */
const SEGNI = {
  // la stessa figura del logo: le quattro caselle
  dashboard: <>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </>,
  // la griglia della Slot è letteralmente una griglia
  slot: <>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
  </>,
  // "spin" = il giro: la freccia che torna su sé stessa
  spin: <>
    <path d="M20.5 13a8.5 8.5 0 1 1-2.2-6.4" /><path d="M21 3.5V8h-4.5" />
  </>,
  // il campo visto dall'alto: si legge a 18px, un pallone no
  partite: <>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="M12 4.5v15" /><circle cx="12" cy="12" r="3.2" />
  </>,
  stella: <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z" />,
  // 🎟️ il biglietto del Bet Builder: un rettangolo col tagliando staccabile.
  // ⚠️ Non una forchetta di quote né un grafico: a 18px conta la **sagoma**,
  // e un biglietto si riconosce dalla linea verticale che lo divide.
  schedina: <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M9 5.5v13" />
    <path d="M12.5 10h6" /><path d="M12.5 14h4" />
  </>,
  // ⚑ il flag della scalata: l'asta resta un contorno anche da pieno, o
  // riempiendo il tracciato intero diventerebbe una macchia senza forma.
  bandiera: <>
    <path d="M6 21V3.5" /><path d="M6 4.5h11.5l-2.3 3.8 2.3 3.8H6z" />
  </>,
  // i fogli impilati dell'archivio
  storico: <>
    <path d="M12 3L3 7.5 12 12l9-4.5z" /><path d="M3 16.5L12 21l9-4.5" /><path d="M3 12l9 4.5 9-4.5" />
  </>,
  // la spezzata che sale
  andamento: <>
    <path d="M3 17.5l5.5-5.5 3.5 3.5L21 7" /><path d="M15.5 7H21v5.5" />
  </>,
  // il foglio con le righe: un rendiconto
  reporting: <>
    <rect x="4.5" y="2.5" width="15" height="19" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </>,
  // il portafoglio: saldi e movimenti
  bilancio: <>
    <rect x="2.5" y="5.5" width="19" height="14" rx="2.5" /><path d="M16 11h5.5v4H16a2 2 0 0 1 0-4z" />
  </>,
  // la freccia che entra nel vassoio
  importazioni: <>
    <path d="M12 3v10" /><path d="M8 9.5l4 4 4-4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </>,
  // i gradini: è esattamente quello che fa la scalata
  scalata: <path d="M3 20.5h4.5V16H12v-4.5h4.5V7H21" />,
  utenti: <>
    <circle cx="12" cy="8" r="3.6" /><path d="M5 20.5c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6" />
  </>,
  // il pallone: cerchio, pentagono centrale e i raggi verso le cuciture
  gol: <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.4l3.1 2.25-1.2 3.65h-3.8l-1.2-3.65z" />
    <path d="M12 3v4.4M20.3 9.3l-5.2 1.3M17.2 19.6l-3.3-4.3M6.8 19.6l3.3-4.3M3.7 9.3l5.2 1.3" />
  </>,
  classifica: <>
    <path d="M8 3.5h8V8a4 4 0 0 1-8 0z" /><path d="M8 5H5v1.5a3 3 0 0 0 3 3M16 5h3v1.5a3 3 0 0 1-3 3" />
    <path d="M12 12v3.5M8.5 20.5h7l-.8-5h-5.4z" />
  </>,
  scontri: <>
    <path d="M3.5 9h12M12 5.5L15.5 9 12 12.5" /><path d="M20.5 15h-12M12 18.5L8.5 15 12 11.5" />
  </>,
  // la bilancia: VPM pesa due squadre una contro l'altra
  vpm: <>
    <path d="M12 4.5v15M7 19.5h10" /><path d="M4 9l8-2.6L20 9" />
    <path d="M4 9l-2 4.6a2.9 2.9 0 0 0 4 0z" /><path d="M20 9l-2 4.6a2.9 2.9 0 0 0 4 0z" />
  </>,
  // il cartellino del prezzo: le quote di mercato
  consenso: <>
    <path d="M3.5 12.6V4.5h8.1l8.9 8.9-8.1 8.1z" /><circle cx="8" cy="8.6" r="1.3" />
  </>,
  chiave: <>
    <circle cx="8" cy="12" r="4.2" /><path d="M12.2 12H21M18.5 12v3M15.5 12v2.3" />
  </>,
  lucchetto: <>
    <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>,
  // 📌 la puntina del «fissa passo» (29/10/2026, Mattia: *"la classica
  // graffetta del pinnare"*): al posto del lucchetto, che diceva «chiuso»
  // mentre il gesto vuol dire «tienilo qui»
  puntina: <>
    <path d="M12 16.5V22" /><path d="M9 4h6M10 4v5.2l-3.2 3.3a1.2 1.2 0 0 0 .9 2h8.6a1.2 1.2 0 0 0 .9-2L14 9.2V4" />
  </>,
  bersaglio: <>
    <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" />
  </>,
  elenco: <>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.6" cy="6.5" r="1.1" /><circle cx="4.6" cy="12" r="1.1" /><circle cx="4.6" cy="17.5" r="1.1" />
  </>,
  occhio: <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3.2" />
  </>,
  occhioChiuso: <>
    <path d="M3 4l18 16" /><path d="M10.6 7a9.4 9.4 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.6" />
    <path d="M6.8 8A17 17 0 0 0 2.5 13.4S6 19.9 12 19.9a8.9 8.9 0 0 0 3.6-.8" />
  </>,
  calendario: <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </>,
  ora: <>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" />
  </>,
  // l'interruttore: l'uscita
  esci: <>
    <path d="M12 3.5v8" /><path d="M7.6 6.6a7.2 7.2 0 1 0 8.8 0" />
  </>,
}

/**
 * ⚠️ `pieno` esiste per **due** icone, e per lo stesso motivo: la **stella**
 * del voto e la **bandiera** della scalata dicono ciascuna due stati — mia o
 * non mia — e devono distinguerli come facevano `★` e `☆`. Il resto del set è
 * di soli contorni, e va tenuto così.
 * ⚠️ Sulla bandiera il riempimento prende **il drappo e anche l'asta**, che
 * resta visibile perché è disegnata come linea a parte: è il tratto che la fa
 * leggere come bandiera a 14px invece che come un rettangolo.
 */
export default function Icona({ nome, misura = 18, pieno = false, style }) {
  const segno = SEGNI[nome]
  // ⚠️ Un nome sbagliato non deve lasciare un buco muto nella barra: in
  // sviluppo si vede subito in console invece di cercare un'icona invisibile.
  if (!segno) { console.warn(`Icona sconosciuta: ${nome}`); return null }
  return (
    <svg
      width={misura} height={misura} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={pieno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ display:'block', flexShrink:0, ...style }}
    >{segno}</svg>
  )
}
