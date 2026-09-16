// Scaricare da football-data senza farsi fermare da un DNS che singhiozza.
//
// Il sito risponde su due nomi — con e senza www — e reindirizza dall'uno
// all'altro. Un risolutore che fallisce a intermittenza (è successo il 16/09/2026
// più volte, anche con 1.1.1.1 impostato) fa cadere un nome e non l'altro, e
// il minuto dopo il contrario. Si provano entrambi, più volte, con pause
// crescenti. Gli script di aggiornamento girano due volte a settimana senza
// nessuno a guardarli: non possono dipendere da un tentativo fortunato.

const HOST = ['https://www.football-data.co.uk', 'https://football-data.co.uk'];

/**
 * Scarica un percorso da football-data provando entrambi gli host.
 * @param {string} percorso  es. '/mmz4281/2627/E0.csv' o '/fixtures.csv'
 * @returns {Promise<string>} il testo del file
 */
export async function scaricaDaFootballData(percorso, { tentativi = 4, silenzioso = false } = {}) {
  let ultimo;
  for (let t = 1; t <= tentativi; t++) {
    for (const host of HOST) {
      const url = host + percorso;
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok) return await res.text();
        // 404 su entrambi gli host = il file non esiste davvero, inutile insistere
        ultimo = Object.assign(new Error(`${url} → HTTP ${res.status}`), { status: res.status });
      } catch (e) {
        ultimo = new Error(`${url} → ${e.cause?.code || e.message}`);
      }
    }
    if (ultimo.status === 404) throw ultimo;
    if (t < tentativi) {
      if (!silenzioso) console.log(`  · ${percorso}: tentativo ${t} fallito (${ultimo.message.split(' → ')[1]}), riprovo fra ${t * 5}s`);
      await new Promise(r => setTimeout(r, t * 5000));
    }
  }
  throw ultimo;
}
