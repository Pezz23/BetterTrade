// I DERBY — le partite fra rivali (29/10/2026).
//
// ⚠️⚠️ **Perché.** La letteratura sui cartellini (Kruse & Maennig, *Yellow
// Cards and Suspension by Choice*) indica tre fattori: l'arbitro, il fattore
// campo e il **derby**. L'arbitro football-data lo dà solo per tre campionati
// su quindici; il fattore campo il modello lo ha già; il derby mancava. Per
// ora è **un'etichetta nella scheda**: se entri anche nel modello dei
// cartellini lo dirà la misura (`prova-conteggi-v2.js`), non questa lista.
//
// ⚠️ **Scritta a mano, ed è un elenco di fatti, non un calcolo**: solo
// rivalità note — stessa città, stessa regione, i grandi classici — coi nomi
// **esatti dell'archivio** (football-data, normalizzati), verificati il 29/10.
// Una coppia vale nei due sensi. Le divisioni dello stesso paese condividono
// la lista: Premier e Championship si scambiano squadre ogni anno.
// ⚠️ Le coppe (UCL & co.) hanno i nomi di ESPN e nessun derby di città: fuori.

const PAESE = {
  E0: 'eng', E1: 'eng', I1: 'ita', I2: 'ita', SP1: 'esp', SP2: 'esp', D1: 'ger', D2: 'ger',
  F1: 'fra', F2: 'fra', P1: 'por', N1: 'ned', T1: 'tur', B1: 'bel', SC0: 'sco',
}

const COPPIE = {
  eng: [
    ['Arsenal', 'Tottenham'], ['Arsenal', 'Chelsea'], ['Chelsea', 'Tottenham'], ['Chelsea', 'Fulham'],
    ['West Ham', 'Tottenham'], ['West Ham', 'Millwall'], ['Charlton', 'Millwall'], ['Brentford', 'QPR'],
    ['Liverpool', 'Everton'], ['Liverpool', 'Man United'], ['Man City', 'Man United'], ['Leeds', 'Man United'],
    ['Newcastle', 'Sunderland'], ['Middlesbrough', 'Sunderland'], ['Aston Villa', 'Birmingham'],
    ['West Brom', 'Wolves'], ['Nott\'m Forest', 'Derby'], ['Sheffield United', 'Sheffield Weds'],
    ['Ipswich', 'Norwich'], ['Portsmouth', 'Southampton'], ['Cardiff', 'Swansea'], ['Blackburn', 'Burnley'],
    ['Crystal Palace', 'Brighton'],
  ],
  ita: [
    ['Inter', 'Milan'], ['Roma', 'Lazio'], ['Juventus', 'Torino'], ['Genoa', 'Sampdoria'],
    ['Inter', 'Juventus'], ['Napoli', 'Roma'], ['Bologna', 'Fiorentina'], ['Empoli', 'Fiorentina'],
    ['Verona', 'Vicenza'], ['Venezia', 'Padova'], ['Bari', 'Lecce'], ['Modena', 'Reggiana'],
    ['Parma', 'Reggiana'], ['Benevento', 'Avellino'],
  ],
  esp: [
    ['Real Madrid', 'Barcelona'], ['Real Madrid', 'Ath Madrid'], ['Barcelona', 'Espanol'], ['Betis', 'Sevilla'],
    ['Ath Bilbao', 'Sociedad'], ['Valencia', 'Levante'], ['Valencia', 'Villarreal'], ['Sp Gijon', 'Oviedo'],
    ['Celta', 'La Coruna'], ['Las Palmas', 'Tenerife'], ['Zaragoza', 'Huesca'],
  ],
  ger: [
    ['Dortmund', 'Schalke 04'], ['Bayern Munich', 'Dortmund'], ['Hamburg', 'Werder Bremen'], ['Hamburg', 'St Pauli'],
    ['FC Koln', 'M\'gladbach'], ['FC Koln', 'Fortuna Dusseldorf'], ['FC Koln', 'Leverkusen'],
    ['Union Berlin', 'Hertha'], ['Nurnberg', 'Greuther Furth'], ['Hannover', 'Braunschweig'],
    ['Stuttgart', 'Karlsruhe'], ['Ein Frankfurt', 'Darmstadt'], ['Ein Frankfurt', 'Mainz'], ['Bielefeld', 'Paderborn'],
  ],
  fra: [
    ['Paris SG', 'Marseille'], ['Marseille', 'Lyon'], ['Lyon', 'St Etienne'], ['Nice', 'Monaco'],
    ['Lens', 'Lille'], ['Rennes', 'Nantes'], ['Paris SG', 'Paris FC'], ['Metz', 'Nancy'],
  ],
  por: [
    ['Benfica', 'Sp Lisbon'], ['Benfica', 'Porto'], ['Porto', 'Sp Lisbon'], ['Sp Braga', 'Guimaraes'],
  ],
  ned: [
    ['Ajax', 'Feyenoord'], ['Ajax', 'PSV Eindhoven'], ['Feyenoord', 'PSV Eindhoven'], ['Feyenoord', 'Sparta Rotterdam'],
    ['Feyenoord', 'Excelsior'], ['Sparta Rotterdam', 'Excelsior'], ['Twente', 'Heracles'], ['Groningen', 'Heerenveen'],
    ['Cambuur', 'Heerenveen'], ['NAC Breda', 'Willem II'], ['Go Ahead Eagles', 'Zwolle'],
  ],
  tur: [
    ['Galatasaray', 'Fenerbahce'], ['Galatasaray', 'Besiktas'], ['Besiktas', 'Fenerbahce'], ['Fenerbahce', 'Trabzonspor'],
  ],
  bel: [
    ['Anderlecht', 'Club Brugge'], ['Anderlecht', 'Standard'], ['Anderlecht', 'St. Gilloise'],
    ['Club Brugge', 'Cercle Brugge'], ['Genk', 'St Truiden'], ['Charleroi', 'Standard'],
  ],
  sco: [
    ['Celtic', 'Rangers'], ['Hearts', 'Hibernian'], ['Dundee', 'Dundee United'],
  ],
}

const INDICE = new Map()
for (const [paese, coppie] of Object.entries(COPPIE))
  for (const [a, b] of coppie) { INDICE.set(`${paese}|${a}|${b}`, true); INDICE.set(`${paese}|${b}|${a}`, true) }

/** La partita è un derby? `p` è una riga con `div`, `casa`, `trasferta`. */
export function eDerby(p) {
  const paese = PAESE[p?.div]
  return !!paese && INDICE.has(`${paese}|${p.casa}|${p.trasferta}`)
}
