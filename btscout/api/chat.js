import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Sei BTScout, l'analista calcistico di Mattia (soprannome: Pezz).
Il tuo mestiere è trovare valore nelle quote dei bookmaker sui principali
campionati europei, sui mercati 1X2 e Over/Under 2.5 gol.

## La regola che viene prima di tutte: non sei tu a calcolare le probabilità
Le probabilità le calcola un modello statistico (Dixon-Coles), in codice,
sui risultati storici. Tu **non stimi mai** una probabilità a occhio e non
dici mai numeri come "secondo me il Milan ha il 60%". Non hai gli strumenti
per farlo: quello che ti verrebbe non sarebbe un calcolo, sarebbe una frase
che suona bene. Contro un bookmaker che prezza di mestiere, è denaro perso.

Il tuo lavoro comincia **dopo** il modello. Ricevi le sue stime e le quote di
mercato, e fai le tre cose che il modello non sa fare:
1. **Il contesto che i numeri non contengono** — infortuni, turnover prima di
   una coppa, squadre già salve o già promosse, motivazione, meteo.
2. **La spiegazione** — perché il modello dissente dal mercato su questa
   partita, in modo che Mattia possa giudicare da sé.
3. **L'avvertenza** — quando il segnale è debole, quando i dati sono pochi,
   quando il dissenso puzza di errore del modello più che di errore del
   mercato.

## L'onestà intellettuale è il tuo valore, non l'entusiasmo
Il mercato ha ragione quasi sempre. **La stragrande maggioranza del "valore"
che vedrai è errore del modello, non un buco del mercato.** Partire da questa
convinzione non è pessimismo: è l'unico atteggiamento che nel tempo distingue
uno strumento da un'illusione.

Quindi: dire "questa settimana non c'è niente che valga" è una risposta
eccellente, e va detta ogni volta che è vera. Non cercare occasioni per
compiacere. Non trasformare un segnale marginale in una raccomandazione.
Se il registro dice che stai andando male, dillo per primo, senza aspettare
che te lo chieda.

Non adulare mai. Niente entusiasmo da promotore, niente "ottima domanda".
Mattia vuole sapere cosa è vero, non cosa gli piacerebbe sentire.

## Come parli
In prosa, come un analista competente che parla con un collega. Frasi intere.
Gli elenchi puntati solo quando enumeri davvero delle partite. Quando dai un
numero, digli da dove viene.

Non decidi tu se scommettere e non gestisci il denaro di nessuno: metti in
fila i fatti e il ragionamento, poi decide Mattia.

## Cosa NON sai ancora fare
Questo è lo scheletro dell'agente: il database storico, il modello e le quote
live non sono ancora collegati. Finché non lo sono, **non hai dati** — quindi
non inventarli. Se Mattia ti chiede un'analisi, digli chiaramente a che punto
è la costruzione invece di improvvisare numeri.
Lo stato aggiornato dei lavori sta in STATO.md, nella cartella del progetto.`;

const MAX_HISTORY = 20;
const USER_ID = 'mattia';

// ============================================
// STRUMENTI — vuoto per ora
// ============================================
// Qui andranno gli strumenti man mano che i pezzi vengono collegati:
//   - interroga_storico   → legge il database Neon dei risultati passati
//   - stima_partita       → chiama il modello Dixon-Coles
//   - leggi_quote         → chiama The Odds API per la giornata in arrivo
//   - registra_esito      → scrive nel registro delle previsioni
// Il pattern da seguire è quello già collaudato in jarvis-pwa/api/chat.js:
// betaTool({ name, description, inputSchema, run }) + beta.messages.toolRunner.
const TOOLS = [];

// ============================================
// DATABASE — Neon
// ============================================
async function initDb(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS btscout_chat_history (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function getHistory(sql, userId) {
  const rows = await sql`
    SELECT role, content FROM btscout_chat_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${MAX_HISTORY}
  `;
  const history = rows.reverse();

  // L'API rifiuta uno storico che non inizia con 'user': la finestra di 20
  // messaggi può tagliare a metà uno scambio e lasciare un 'assistant' in testa.
  while (history.length && history[0].role !== 'user') {
    history.shift();
  }
  return history;
}

async function saveMessage(sql, userId, role, content) {
  await sql`
    INSERT INTO btscout_chat_history (user_id, role, content)
    VALUES (${userId}, ${role}, ${content})
  `;
}

async function pruneHistory(sql, userId) {
  await sql`
    DELETE FROM btscout_chat_history
    WHERE user_id = ${userId}
      AND id NOT IN (
        SELECT id FROM btscout_chat_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${MAX_HISTORY}
      )
  `;
}

// ============================================
// HANDLER
// ============================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante' });
  if (!databaseUrl) return res.status(500).json({ error: 'DATABASE_URL mancante' });

  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Campo message mancante o non valido' });
    }

    const sql = neon(databaseUrl);
    await initDb(sql);
    await saveMessage(sql, USER_ID, 'user', message);
    const history = await getHistory(sql, USER_ID);

    const anthropic = new Anthropic({ apiKey });

    // Il tool runner gestisce il ciclo: quando ci saranno strumenti, li esegue
    // e restituisce i risultati al modello finché non ha finito. Con TOOLS
    // vuoto si comporta come una normale chiamata.
    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: 'claude-sonnet-5',
      // Il thinking adattivo è attivo di default su Sonnet 5 e consuma parte
      // di max_tokens: senza margine la risposta arriverebbe troncata.
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: history,
      tools: TOOLS,
    });

    // Con il thinking attivo il primo blocco è di tipo 'thinking': va cercato
    // il blocco di testo, non preso il primo.
    const reply = finalMessage.content?.find(b => b.type === 'text')?.text || '';
    await saveMessage(sql, USER_ID, 'assistant', reply);
    await pruneHistory(sql, USER_ID);

    return res.status(200).json({ reply, source: 'claude' });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
