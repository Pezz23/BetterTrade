// Com'è fatto lo schermo di chi sta guardando.
//
// `tocco` è vero su telefoni e tablet. Serve a non aprire la tastiera da sola:
// su iOS il fuoco su un campo fa ingrandire la pagina, e ci si ritrova zoomati
// sulla tastiera senza aver visto il contenuto.

export const tocco = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(pointer: coarse)').matches
