# 🎟️ BET BUILDER — le schedine a quota obiettivo

> Nato il 22/10/2026 da una richiesta di Mattia, e con un tono dichiarato:
> ***"questa funzione deve essere più fanny che profittevole"*** — quindi nella
> pagina non ci sono prediche sul valore atteso. La frase onesta sta scritta
> **una volta sola**, in piccolo, in fondo.

**Cosa fa**: scegli i filtri e la quota che vuoi raggiungere, lui compone la
schedina con le migliori partite finché il prodotto arriva a quella quota. Ne
puoi fare più d'una: **le partite già usate escono dalle candidate**, così non
si gioca due volte la stessa.

⚠️⚠️ **Non compone niente da sé: usa `componiPasso` di `lib/scalata.js`**, la
stessa funzione dei passi della scalata. *Un passo* e *una schedina a quota
obiettivo* **sono la stessa cosa** — gambe prese dalle migliori finché il
prodotto arriva alla quota — e scriverne due sarebbe il difetto di famiglia di
questo progetto. La funzione ha preso un parametro **`ordina`**: la scalata usa
l'attendibilità (il miglior selettore misurato), il Builder lascia scegliere
**schedina per schedina** fra voto · attendibilità · scelta · VPM, e il
criterio finisce nel registro — così fra due mesi si potrà dire quale
sceglieva meglio.
⚠️ **Si ferma appena SUPERA la quota**, non appena ha abbastanza gambe: ogni
gamba moltiplica il margine del book, quindi la schedina giusta è la **più
corta** che arriva dove vuoi.

## I dati — `sql/36` e `sql/37`

`schedine` + `schedina_gambe`. ⚠️⚠️ **Sono PRIVATE** (richiesta esplicita:
*"ogni utente ha il suo bet builder, nessuna condivisione"*), ed è l'opposto
della scalata, dove dal 22/10 la lettura è aperta a tutti: quella è la road map
del weekend del gruppo, questa è il foglio di una persona. Verificato
simulando le sessioni: **nemmeno un admin** vede le schedine di un altro, né
può crearne o cancellarne a nome d'altri. L'hook non filtra nemmeno per
`user_id` — lo fa il database.

⚠️ **Le gambe portano la fotografia** di `att · scelta · VPM` e della quota
giocata: senza, fra due mesi l'archivio direbbe solo *se* hai vinto, non
**perché l'avevi scelta**. È la stessa ragione delle gambe della scalata.

⚠️ `stato` è `bozza` o `giocata`, e **l'esito compare solo dopo «giocata»**:
una schedina che non è andata al banco non ha un esito da registrare — stessa
distinzione della spunta GIOCATA nella Slot, dove *compilare non è giocare*.
L'esito si **annulla** ritoccando il tasto acceso: un esito sbagliato e non
togliibile è un registro che mente.

⚠️ **L'esito sta sulla SCHEDINA, non sulle gambe**: una combinata è persa
appena cade una gamba, quindi un tocco solo basta. E la gamba non si perde —
ha `prossima_id`, quindi un giorno si potrà dire chi l'ha azzeccata
**leggendola dall'archivio**. ⚠️⚠️ Ma quel giorno la regola che decide *"questa
giocata è arrivata"* (segno, e per le combinate anche l'over 1,5) va
**spostata** da `btscout/lib/ricostruisci.js` a `app/src/lib/`, **non copiata**:
due versioni direbbero prima o poi cose diverse sulla stessa schedina.

⚠️ **L'importo è facoltativo e `null` non è zero**: vuoto vuol dire *non lo
dico*, e un saldo costruito su uno zero finto sarebbe falso. Si scrive già
sulla proposta, perché **la vincita possibile è il numero che fa decidere** se
quella quota vale la pena — chiederlo dopo aver salvato vorrebbe dire deciderlo
senza.

⚠️ `sql/37` aggiunge le colonne con **`alter table … add column if not
exists`** e non dentro la `create table` di `sql/36`: una colonna aggiunta lì
non comparirebbe mai, perché la migrazione rilanciata vede la tabella e salta
il blocco senza un errore. È già successo il 18/10 con `bankroll_finale`.

## A schermo

**Il tasto è in basso al posto di Slot** (che è scesa nel menu, sopra Spin): in
basso sta il **giro settimanale**, e la griglia si compila una volta a
settimana mentre una schedina si costruisce ogni volta che si gioca.
⚠️ Spostando una voce **va aggiornata la mappa di `guarda.mjs`**, o quella
pagina smette di essere fotografata in silenzio.

⚠️ **La proposta si vede PRIMA di salvarla**: un tasto che scrive nel registro
qualcosa che non hai visto lo riempie di schedine buttate.
⚠️ Il riepilogo conta **solo le giocate** e mostra il saldo **solo se gli
importi ci sono**. ⚠️ Il riassunto con le domande vere (quale criterio sceglie
meglio, quanto rende davvero) arriva **quando ci saranno dieci o venti
schedine**: prima direbbe rumore, ed è la stessa regola della scalata.

## I filtri nel registro, e le partite scartate (22/10/2026)

**`sql/38` aggiunge `filtri jsonb`** alla schedina: `criterio` dice *come* si
ordinavano le candidate, questi dicono **da quali partite si pescava**. Due
schedine «per voto» con filtri diversi sono **due esperimenti diversi**, e
senza questa colonna l'archivio non saprebbe distinguerli.

⚠️⚠️ **La `×` su una gamba della proposta SCARTA la partita, non toglie la
gamba** (*"non devono tornare nella selezione"*): esce dalle candidate, quindi
la schedina **si ricompone da sé** pescando la prossima migliore e resta alla
quota chiesta. Verificato sui dati veri: scartando la prima gamba la schedina
passa da 5,45 a 5,69, sempre sei gambe, e la scartata non torna. **Due
richieste risolte con un gesto solo.**
⚠️ E si **rimettono** (*"rimettile"* accanto al conto): un gesto che toglie per
sempre e non si disfa è una trappola per il tocco sbagliato.

⚠️⚠️ **Le scartate vivono in `preferenze`, riga PERSONALE**, non in una tabella
nuova: è la tabella nata la mattina stessa per i filtri della scalata.
`usaPreferenze(ambito, { personale: true })` esiste **per questo** — senza quel
flag un admin scriverebbe la **riga condivisa**, e le sue partite scartate le
vedrebbe il gruppo: l'opposto di quello che è stato chiesto per il Builder.

## Quello che resta da fare

- **L'esito automatico** dall'archivio, col vincolo scritto sopra.
