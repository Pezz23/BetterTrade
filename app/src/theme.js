// Tema unico dell'app.
//
// Prima di questo file i colori stavano in due posti scollegati: le CSS
// variables di index.css (che il JSX non usava mai) e ~130 valori scritti a
// mano dentro gli stili inline — `#c9a84c` compariva 48 volte. Cambiare l'oro
// significava 48 sostituzioni sperando di non saltarne una.
//
// Qui la definizione è una sola. index.css rispecchia questi stessi valori per
// quel poco che stila fuori da React (body, scrollbar).

export const C = {
  // ── Superfici, dal fondo alla card ──────────────────────────────────────
  // Rifatte il 21/10/2026 sulla tavolozza scelta da Mattia.
  // ⚠️⚠️ **E QUI UNA COSA DA SAPERE, MISURATA: il passo fra il fondo e la card
  // non è migliorato.** Prima `#090909` → `#141414` dava un rapporto di
  // **1,08:1**, adesso `#0B0D10` → `#14171B` dà **1,08:1** — identico. Nella
  // tavolozza proposta la superficie secondaria sta lì, e lì l'ho messa. Quindi
  // **una card continua a vedersi grazie al bordo, non al fondo**, ed è il
  // motivo per cui questa app è un reticolo di riquadri. Per staccarla davvero
  // servirebbe portarla attorno a `#1A1F26`, un passo oltre la tavolozza: è una
  // decisione da prendere guardando lo schermo, non da infilare qui.
  // ⚠️ Il guadagno vero della palette nuova è **sul testo**: `spento` passa da
  // 2,47:1 a 6,97:1 (vedi sotto).
  fondo:    '#0B0D10',  // sfondo pagina
  barra:    '#0F1216',  // header e tab bar: appena sopra il fondo
  pozzo:    '#0E1115',  // campi di input, "incassati" **sotto** la card
  pannello: '#11151A',  // card di login, modali
  card:     '#14171B',  // card di contenuto

  // ── Bordi, dal più tenue al più marcato ─────────────────────────────────
  bordoTenue: '#1E242A',
  bordoRiga:  '#232930',
  bordo:      '#292F36',
  // ⚠️ I bordi non si usano come **colore del testo**: il 21/10/2026
  // `bordoChiaro` vestiva la seconda riga di tre stati vuoti — 1,6:1, cioè
  // illeggibile. Per un testo terziario c'è `fioco`.
  bordoChiaro: '#343B43',

  // ── Testo ───────────────────────────────────────────────────────────────
  // ⚠️⚠️ **`spento` è il cambio più importante di tutta la palette.** Era
  // `#555555` su una card `#141414`: contrasto **2,6:1**, sotto il minimo
  // leggibile di 4,5:1 — ed è il colore più usato dell'app (**173 volte**),
  // quello delle etichette. Ora è `#9AA2AC`, che fa **7,2:1**. Le etichette
  // devono essere discrete, non quasi invisibili.
  testo:      '#F1F2F3',
  spento:     '#9AA2AC',  // etichette, testo secondario
  fioco:      '#6B7480',  // testo terziario
  // ⚠️⚠️ **`fantasma` è SOLO segnaposto e disabilitato**, mai un messaggio da
  // leggere. Sta a **2,27:1**, sotto il minimo leggibile, ed è giusto così
  // perché il testo disabilitato è escluso dal requisito — ma il 21/10/2026
  // vestiva anche *"Nessuna partita inserita oggi"*, cioè l'unica cosa che la
  // Dashboard aveva da dire, e quindici altri messaggi fra stati vuoti,
  // spiegazioni e la legenda. **Trovato guardando una schermata**, non il
  // codice: in mezzo a cinquanta usi, i due mestieri non si distinguevano.
  // Uno stato vuoto, una spiegazione o un avviso usano `spento`.
  fantasma:   '#4A525C',  // SOLO placeholder e testo disabilitato
  inattivo:   '#5A626C',  // icone tab non selezionate

  // Grigi neutri: caselle senza esito, linee, dettagli
  grigio:      '#9AA2AC',
  grigioFioco: '#6B7480',
  // ⚠️ Si chiamava `quasiNero` e ora non lo è più: è la **superficie sopra la
  // card** — il fondo di una barra di avanzamento, di una casella toccata, di
  // un pallino spento. Il nome vecchio descriveva il valore, questo descrive
  // il ruolo, che è l'unica cosa che sopravvive a un cambio di tavolozza.
  attiva:      '#1B2026',
  grigioMedio: '#7A838E',
  grigioCupo:  '#3E464F',
  acciaio:     '#8A939E',  // argento spento

  // ── Accenti — anche i ruoli usano questi ───────────────────────────────
  // ⚠️ Scelti da Mattia il 21/10/2026 sulla tavolozza proposta nel briefing.
  // Sono spostati di poco dai precedenti (l'oro era `#c9a84c`), ma insieme ai
  // fondi nuovi reggono meglio il contrasto.
  oro:    '#D8B44A',  // colore dell'app, superadmin, full
  verde:  '#20B875',  // vincita, deposito, tris
  rosso:  '#E05252',  // perdita, prelievo, errore
  blu:    '#4C9FFF',  // admin, quaterna, informazione
  ambra:  '#F0A830',  // partita di oggi, avviso
  viola:  '#A878F0',  // Goal/NoGoal, riga evidenziata
  menta:  '#3DD68C',  // ruolo user
  oroChiaro: '#E8CC72',
  bianco:    '#FFFFFF',  // le linee interne della slot e la quota in Andamento
  celeste:   '#7DC8FC',

  // Tinte usate solo come sfondo trasparente. Sono più sature delle
  // corrispondenti piene qui sopra: servono a colorare un fondo senza
  // schiarirlo, e vanno tenute distinte o l'aspetto cambia.
  bluPieno:      '#3D8BFF',
  giallo:        '#E0B020',
  celestePieno:  '#38BDF8',
}

export const F = {
  mono: "'DM Mono',monospace",
  sans: "'Sora',sans-serif",
}

// Colore con trasparenza: alpha(C.oro, .12) invece di 'rgba(201,168,76,0.12)'.
// Nel codice c'erano 72 rgba() diversi scritti a mano, spesso lo stesso colore
// con opacità leggermente diverse per distrazione.
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/**
 * ⚠️⚠️ **LA SCALA DEI CARATTERI.** Prima non esisteva: in `src/` c'erano **19
 * misure diverse** scritte a mano, con tre picchi (11px **102 volte**, 10px 81,
 * 9px 50) e una coda di numeri usati una o due volte — 8, 15, 17, 18, 19, 22,
 * 26, 30. Risultato: *"piccolo"* voleva dire 9, 10 o 11 a seconda di chi aveva
 * scritto la riga, e per cambiare la densità dell'app bisognava passare da
 * quattrocento punti.
 *
 * Qui i passi sono **dodici, e ognuno ha un ruolo**, non una misura: si sceglie
 * `S.base` perché è il testo corrente, non perché sono 11 pixel. Cambiando un
 * numero qui si muove tutta l'app.
 *
 * ⚠️ `nano` resta 7 e **non si tocca per fare ordine**: è l'etichetta sotto i
 * cinque numeri della barra, e cinque colonne su un telefono da 375px fanno
 * ~63px l'una — misura verificata, non scelta estetica.
 * ⚠️ `icona` **non è una misura di testo**: sono i glifi del menu e della barra
 * in basso. Sta qui perché si scrive con `fontSize`, ma segue le icone.
 * ⚠️ I nomi delle squadre **non sono in scala**: usano `clamp()` perché devono
 * restringersi col telefono invece di andare a capo. Vedi `TestataPartita`.
 */
export const S = {
  nano:    7,    // le etichette della barra dei cinque numeri
  micro:   9,    // etichette maiuscole, note dentro una cella
  minuta: 10,    // contrassegni, sigle, didascalie
  base:   11,    // il testo corrente in mono — il più usato dell'app
  corpo:  12,    // una frase breve da leggere
  media:  13,    // i valori in riga, il testo delle spiegazioni
  grande: 14,    // un valore in evidenza
  titolo: 16,    // il titolo di una pagina o di una card
  evidenza: 20,  // il titolo grande di una pagina, o un numero che conta
  cifra:  28,    // un numero solo, grosso
  mega:   48,    // la percentuale della Dashboard, che è tutta la pagina
  icona:  18,    // i glifi del menu e della tab bar (non è testo)
}

/**
 * ⚠️⚠️ **LA SCALA DELLE SPAZIATURE.** Come per i caratteri, prima non
 * esisteva: `gap` usava 8 (49 volte), 6 (25), 10 (19), 4 (15), più 7, 5, 3 e
 * 12 sparsi — cioè gli stessi valori a occhio, scritti da mani diverse. I sette
 * passi qui sotto **sono** quei valori, messi in fila.
 *
 * ⚠️ **Si adotta una pagina per volta, non tutta in un colpo.** Cambiare 500
 * `padding` e `gap` alla cieca sposta i layout, e un trabordamento su un
 * telefono stretto non si vede da qui: la scala entra nei pezzi condivisi
 * subito (dove i numeri sono gli stessi di prima, quindi non cambia un pixel) e
 * nelle pagine mentre le si rifà.
 */
/**
 * ⚠️⚠️ **Il 12 mancava, ed era il quarto valore più usato dell'app**
 * (21/10/2026). Contati i numeri scritti a mano in `src/`: `gap` 8×46, 6×23,
 * 10×18, 4×15 · `marginBottom` 4×23, 8×22, 10×21, **12×20**, 16×16. La scala
 * era stata ricavata dai `gap`, dove il 12 compare solo 4 volte, e i margini
 * non erano stati guardati: **una scala che non contiene un valore in uso 24
 * volte costringe a scriverlo a mano, cioè si scavalca da sola.**
 *
 * ⚠️ E qui c'è una critica onesta da tenere in vista: 4-6-8-10-12-14-16 non è
 * una scala, è *ogni numero pari*. Una scala serve a **ridurre le scelte**, e
 * questa non lo fa. Stringerla davvero (4-8-12-16-24) vuol dire spostare un
 * centinaio di punti di qualche pixel ciascuno: è una decisione che si prende
 * **guardando lo schermo**, non da terminale, ed è di Mattia. Finché non è
 * presa, questa scala descrive quello che c'è invece di mentire.
 */
export const SP = {
  xs:   4,   // fra due cose attaccate
  s:    6,
  m:    8,   // il più usato: fra gli elementi di una riga
  l:   10,
  ml:  12,   // margini fra blocchi: 24 volte, e non era in scala
  xl:  14,   // il riempimento verticale di una card
  xxl: 16,   // il margine della pagina, il riempimento orizzontale di una card
  sez: 24,   // fra due sezioni
}

/**
 * I raggi. ⚠️ `pastiglia` è 999 e non 20: su un elemento basso 20 è già un
 * mezzo cerchio, ma se l'elemento cresce 20 torna a essere uno spigolo
 * arrotondato. 999 è "tonda qualunque sia l'altezza" — una proprietà, non una
 * misura.
 */
export const R = {
  s:   4,
  m:   6,
  g:  10,   // la card
  xl: 14,
  pastiglia: 999,
}

// I tre tipi di schedina, con il loro colore.
export const TIPO = {
  tris:     C.verde,
  quaterna: C.blu,
  full:     C.oro,
}

// I ruoli, con colore ed etichetta leggibile.
export const RUOLO = {
  superadmin: { colore: C.oro,   nome: 'SuperAdmin' },
  admin:      { colore: C.blu,   nome: 'Admin' },
  user:       { colore: C.menta, nome: 'User' },
}

