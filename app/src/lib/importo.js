// Un importo scritto a mano: «117,78», «117.78 €» e « 117 » sono la stessa cosa.
// Torna il numero, o `null` se non è un importo in euro maggiore di zero.
export const importoDi = (t) => {
  const s = String(t).replace(/[€\s]/g, '').replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(s) && Number(s) > 0 ? Number(s) : null
}
