// Un file CSV da scaricare, fatto per **Excel in italiano** (28/10/2026).
//
// ⚠️ Separatore `;` e virgola nei decimali: è quello che Excel italiano si
// aspetta, e il file si apre con un doppio clic invece che con l'importazione
// guidata. ⚠️ In testa il BOM (`\uFEFF`): senza, Excel legge il file come
// Latin-1 e «Fürth» diventa «FÃ¼rth».
// ⚠️ Solo calcolo e un `Blob`: niente React, così si prova da Node.

/** Una cella: i numeri con la virgola, il testo fra virgolette se serve. */
export function cella(v) {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : ''
  const s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Il testo del file: `colonne` = [{ titolo, valore: riga => … }]. */
export function testoCsv(colonne, righe) {
  const testa = colonne.map(c => cella(c.titolo)).join(';')
  const corpo = righe.map(r => colonne.map(c => cella(c.valore(r))).join(';'))
  return '\uFEFF' + [testa, ...corpo].join('\r\n') + '\r\n'
}

/** Fa scaricare il testo come file, dal browser. */
export function scarica(nome, testo) {
  const url = URL.createObjectURL(new Blob([testo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
