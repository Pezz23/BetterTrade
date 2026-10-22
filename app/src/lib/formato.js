// Come si scrivono i numeri e le date a schermo.
//
// ⚠️⚠️ **Nati da tre copie e due nomi** (tagliando del 21/10/2026). La
// percentuale era definita in `TestataPartita` (`pct`), in `BarraPartita`
// (`pct1`) e dentro `ScalataPage`, e le copie **erano già divergute**: due
// guardavano il valore nullo e la terza no, quindi su una probabilità assente
// scriveva `NaN%` invece di `—`. La data breve esisteva in tre pagine, una con
// l'anno e due senza.
//
// È lo stesso difetto che il progetto ha già pagato col campo di testo (tre
// stili per la stessa cosa) e con la chiave del giorno negli script: **una
// copia che nessuno confronta non si accorge di essere sbagliata.**

/** `0,671` → `67%`. ⚠️ Il nullo diventa `—`, non `NaN%`. */
export const pct = (v) => v == null || !Number.isFinite(Number(v)) ? '—' : `${(Number(v) * 100).toFixed(0)}%`

/** `17.4` → `€ 17,40`. La virgola, perché l'app parla italiano. */
export const eur = (v) => '€ ' + (Number(v) || 0).toFixed(2).replace('.', ',')

/** `2026-10-25` → `25/10`. Lavora sulla stringa: niente fusi orari. */
export const gg = (d) => d ? `${String(d).slice(8, 10)}/${String(d).slice(5, 7)}` : '—'

/**
 * Un **istante** → `22/10 18:30`, nell'ora di chi guarda.
 *
 * ⚠️⚠️ **Non si taglia a fette una `timestamptz`**, ed è la trappola di
 * famiglia di questo progetto: PostgREST la consegna come
 * `2026-10-22T16:30:00+00:00`, quindi `slice(11,16)` dà **le 16:30** per un
 * salvataggio fatto alle 18:30, e `slice(8,10)` sbaglia perfino il giorno per
 * tutto quello che succede dopo le 22. `gg()` va bene sulle **date** (che
 * arrivano come `2026-10-25`), non sugli istanti.
 */
export const quando = (d) => {
  if (!d) return '—'
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return '—'
  const z = (n) => String(n).padStart(2, '0')
  return `${z(x.getDate())}/${z(x.getMonth() + 1)} ${z(x.getHours())}:${z(x.getMinutes())}`
}

/** `2026-10-25` → `25/10/26`, per gli elenchi che attraversano gli anni. */
export const ggAnno = (d) => d ? `${gg(d)}/${String(d).slice(2, 4)}` : '—'

/**
 * `2026-10-25` → `dom 25/10`.
 * ⚠️ **Mezzogiorno di proposito**: `new Date('2026-10-25')` è mezzanotte UTC,
 * che in Italia è ancora il giorno prima solo d'inverno — ma `T12:00:00` lo
 * rende indipendente dal fuso in ogni stagione. È la stessa ragione per cui
 * esiste `oggiLocale()`.
 */
export const giorno = (d) => new Date(d + 'T12:00:00')
  .toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })
