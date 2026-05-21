import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// Le 8 combinazioni fisse della slot 3x3
// Griglia:  1 2 3
//           4 5 6
//           7 8 9
const COMBINAZIONI = [
  { id: 1, nome: 'Tris 1-2-3',         tipo: 'tris',    pos: [1, 2, 3] }, // riga 1
  { id: 2, nome: 'Tris 4-5-6',         tipo: 'tris',    pos: [4, 5, 6] }, // riga 2
  { id: 3, nome: 'Tris 7-8-9',         tipo: 'tris',    pos: [7, 8, 9] }, // riga 3
  { id: 4, nome: 'Tris 1-5-9',         tipo: 'tris',    pos: [1, 5, 9] }, // diagonale principale
  { id: 5, nome: 'Tris 7-5-3',         tipo: 'tris',    pos: [7, 5, 3] }, // diagonale inversa
  { id: 6, nome: 'Quaterna 1-3-7-9',   tipo: 'quaterna',pos: [1, 3, 7, 9] }, // 4 angoli
  { id: 7, nome: 'Quaterna 2-4-6-8',   tipo: 'quaterna',pos: [2, 4, 6, 8] }, // croce centrale
  { id: 8, nome: 'Full 1-9',           tipo: 'full',    pos: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
]

const TIPO_COLOR = {
  tris:     { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.20)',  accent: '#22c55e', label: 'TRIS' },
  quaterna: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.20)', accent: '#60a5fa', label: 'QUATERNA' },
  full:     { bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.20)', accent: '#c9a84c', label: 'FULL' },
}

// Parsing data formato "GG.MM. HH:MM"
function parseData(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null
  // es: "10.04. 21:00"
  const match = dataStr.trim().match(/^(\d{1,2})\.(\d{2})\.\s*(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, giorno, mese, ore, minuti] = match
  const anno = new Date().getFullYear()
  return new Date(anno, parseInt(mese) - 1, parseInt(giorno), parseInt(ore), parseInt(minuti))
}

function isOggi(dataStr) {
  const d = parseData(dataStr)
  if (!d) return false
  const oggi = new Date()
  return d.getDate() === oggi.getDate() &&
    d.getMonth() === oggi.getMonth() &&
    d.getFullYear() === oggi.getFullYear()
}

function formatDataDisplay(dataStr) {
  if (!dataStr) return ''
  return dataStr.trim()
}

const STORAGE_KEY = 'bt_schedine_state'

function loadSchedineState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export default function SchedinePage({ partite = [] }) {
  const { getTotalBankroll, calcSchedule, isAdmin } = useAuth()
  const [schedineState, setSchedineState] = useState(loadSchedineState)
  // partite: array di 9 oggetti { pos, pronostico, casa, ospite, quota, data, campionato }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedineState))
  }, [schedineState])

  const totale = getTotalBankroll()
  const sched = calcSchedule(totale)
  const isWip = totale === 0

  function getImporto(tipo) {
    if (tipo === 'tris') return sched.tris
    if (tipo === 'quaterna') return sched.quaterna
    if (tipo === 'full') return sched.full
    return 0
  }

  function toggleInserita(schedId) {
    if (!isAdmin) return
    setSchedineState(prev => ({
      ...prev,
      [schedId]: {
        ...prev[schedId],
        inserita: !prev[schedId]?.inserita,
        inseritaDa: !prev[schedId]?.inserita ? new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,
      }
    }))
  }

  function setQuota(schedId, posIdx, val) {
    setSchedineState(prev => ({
      ...prev,
      [schedId]: {
        ...prev[schedId],
        quote: {
          ...(prev[schedId]?.quote || {}),
          [posIdx]: val,
        }
      }
    }))
  }

  function calcolaVincita(tipo, schedId, posizioni) {
    const imp = getImporto(tipo)
    if (isWip || imp === 0) return null
    const state = schedineState[schedId] || {}
    const quote = state.quote || {}
    let prod = 1
    let tutte = true
    for (let i = 0; i < posizioni.length; i++) {
      const q = parseFloat(quote[i])
      if (!q || isNaN(q)) { tutte = false; break }
      prod *= q
    }
    if (!tutte) return null
    return (imp * prod).toFixed(2)
  }

  const hasPartite = partite.length > 0 && partite.some(p => p?.casa)

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Schedine</h1>
          <p style={S.sub}>8 combinazioni · {hasPartite ? 'partite caricate' : 'nessuna partita inserita'}</p>
        </div>
        {isWip && (
          <div style={S.wipBadge}>
            <span style={S.wipDot} />
            Bankroll WIP
          </div>
        )}
        {!isWip && (
          <div style={S.totaleBankroll}>
            Bankroll totale <span style={{ color: '#c9a84c', marginLeft: 6 }}>€ {totale.toFixed(2)}</span>
          </div>
        )}
      </div>

      {!hasPartite && (
        <div style={S.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎰</div>
          <p style={{ color: '#555', fontFamily: "'Sora',sans-serif", fontSize: 14 }}>
            Inserisci le 9 partite nel tab Slot per vedere le schedine generate.
          </p>
        </div>
      )}

      {hasPartite && (
        <div style={S.grid}>
          {COMBINAZIONI.map(combo => {
            const state = schedineState[combo.id] || {}
            const inserita = !!state.inserita
            const colori = TIPO_COLOR[combo.tipo]
            const importo = getImporto(combo.tipo)
            const vincitaCalc = calcolaVincita(combo.tipo, combo.id, combo.pos)

            // Partite di questa schedina
            const partiteSchedina = combo.pos.map((pos, idx) => {
              const p = partite.find(x => x.pos === pos)
              return { ...p, idx }
            }).filter(p => p?.casa)

            return (
              <div key={combo.id} style={{
                ...S.card,
                background: inserita ? 'rgba(34,197,94,0.04)' : '#111',
                borderColor: inserita ? 'rgba(34,197,94,0.30)' : '#1e1e1e',
                opacity: inserita ? 0.85 : 1,
              }}>
                {/* Header schedina */}
                <div style={S.cardHeader}>
                  <div style={S.cardLeft}>
                    <span style={{ ...S.tipoBadge, background: colori.bg, border: `1px solid ${colori.border}`, color: colori.accent }}>
                      {colori.label}
                    </span>
                    <span style={S.cardNome}>{combo.nome}</span>
                  </div>
                  <div style={S.cardRight}>
                    {isWip ? (
                      <span style={S.wipImporto}>WIP</span>
                    ) : (
                      <span style={{ ...S.importo, color: colori.accent }}>€ {importo}</span>
                    )}
                    {/* Checkbox inserita — solo admin */}
                    {isAdmin && (
                      <button
                        style={{ ...S.checkBtn, ...(inserita ? S.checkBtnOn : {}) }}
                        onClick={() => toggleInserita(combo.id)}
                        title={inserita ? 'Segna come non inserita' : 'Segna come inserita'}
                      >
                        {inserita ? '✓ Inserita' : 'Inserisci'}
                      </button>
                    )}
                    {!isAdmin && inserita && (
                      <span style={S.inseritaTag}>✓ Inserita</span>
                    )}
                  </div>
                </div>

                {state.inseritaDa && (
                  <div style={S.inseritaInfo}>Inserita alle {state.inseritaDa}</div>
                )}

                {/* Vincita potenziale */}
                {vincitaCalc && (
                  <div style={S.vincitaRow}>
                    <span style={S.vincitaLabel}>Vincita potenziale</span>
                    <span style={S.vincitaVal}>€ {vincitaCalc}</span>
                  </div>
                )}

                {/* Lista partite */}
                <div style={S.partiteList}>
                  {partiteSchedina.map((p, i) => {
                    const oggi = isOggi(p?.data)
                    const qVal = (schedineState[combo.id]?.quote || {})[i] || ''
                    return (
                      <div key={i} style={{ ...S.partitaRow, borderTop: i > 0 ? '1px solid #161616' : 'none' }}>
                        <div style={S.partitaLeft}>
                          {/* Indicatore OGGI */}
                          {oggi && <span style={S.oggiDot} title="Partita oggi" />}
                          {!oggi && <span style={S.dotGray} />}

                          <div style={S.partitaInfo}>
                            <div style={S.squadre}>
                              <span style={{ ...S.pronostico, color: colori.accent }}>{p?.pronostico}</span>
                              <span style={S.squadreNomi}>
                                {p?.casa}
                                <span style={S.vs}>vs</span>
                                {p?.ospite}
                              </span>
                            </div>
                            <div style={S.dataCamp}>
                              {p?.campionato && <span style={S.campionato}>{p.campionato}</span>}
                              {p?.data && (
                                <span style={{ ...S.dataOra, color: oggi ? '#f59e0b' : '#444' }}>
                                  {formatDataDisplay(p.data)}
                                  {oggi && <span style={S.oggiLabel}>OGGI</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Campo quota */}
                        <div style={S.quotaWrap}>
                          <input
                            style={S.quotaInput}
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="quota"
                            value={qVal}
                            onChange={e => setQuota(combo.id, i, e.target.value)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Sommario combinazione */}
                <div style={S.cardFooter}>
                  <span style={S.footerNp}>{combo.pos.length} partite</span>
                  {!isWip && <span style={S.footerImporto}>Puntata: € {importo}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const S = {
  page: { padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: 12 },
  title: { fontFamily: "'Sora',sans-serif", fontSize: '22px', fontWeight: '600', color: '#e0d9d0', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#555', fontFamily: "'Sora',sans-serif" },
  wipBadge: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#f59e0b', fontFamily: "'Sora',sans-serif", fontWeight: 500 },
  wipDot: { width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s infinite' },
  totaleBankroll: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#888', fontFamily: "'Sora',sans-serif" },
  emptyState: { textAlign: 'center', padding: '80px 24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  card: { border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', transition: 'border-color 0.2s, background 0.2s' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  cardRight: { display: 'flex', alignItems: 'center', gap: 10 },
  tipoBadge: { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em' },
  cardNome: { fontSize: 14, fontWeight: 500, color: '#e0d9d0', fontFamily: "'Sora',sans-serif" },
  importo: { fontSize: 18, fontWeight: 600, fontFamily: "'DM Mono',monospace" },
  wipImporto: { fontSize: 13, fontWeight: 600, color: '#f59e0b', fontFamily: "'DM Mono',monospace", background: 'rgba(245,158,11,0.10)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(245,158,11,0.20)' },
  checkBtn: { fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a2a', background: 'transparent', color: '#555', cursor: 'pointer', fontFamily: "'Sora',sans-serif", transition: 'all 0.15s' },
  checkBtnOn: { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', color: '#22c55e' },
  inseritaTag: { fontSize: 12, color: '#22c55e', fontFamily: "'Sora',sans-serif", fontWeight: 500 },
  inseritaInfo: { fontSize: 11, color: '#444', fontFamily: "'DM Mono',monospace", marginBottom: 10, marginTop: -8 },
  vincitaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 7, padding: '7px 12px', marginBottom: 12 },
  vincitaLabel: { fontSize: 11, color: '#888', fontFamily: "'Sora',sans-serif" },
  vincitaVal: { fontSize: 15, fontWeight: 600, color: '#c9a84c', fontFamily: "'DM Mono',monospace" },
  partiteList: { display: 'flex', flexDirection: 'column' },
  partitaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 8 },
  partitaLeft: { display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 },
  oggiDot: { width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: 5, boxShadow: '0 0 6px rgba(245,158,11,0.6)' },
  dotGray: { width: 8, height: 8, borderRadius: '50%', background: '#222', flexShrink: 0, marginTop: 5 },
  partitaInfo: { flex: 1, minWidth: 0 },
  squadre: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  pronostico: { fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", flexShrink: 0 },
  squadreNomi: { fontSize: 13, color: '#e0d9d0', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  vs: { fontSize: 10, color: '#333', fontFamily: "'DM Mono',monospace", margin: '0 2px' },
  dataCamp: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  campionato: { fontSize: 10, color: '#444', fontFamily: "'DM Mono',monospace", background: '#161616', padding: '2px 6px', borderRadius: 4 },
  dataOra: { fontSize: 11, fontFamily: "'DM Mono',monospace", display: 'flex', alignItems: 'center', gap: 6 },
  oggiLabel: { fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '1px 6px', borderRadius: 10, letterSpacing: '0.06em', fontFamily: "'DM Mono',monospace" },
  quotaWrap: { flexShrink: 0 },
  quotaInput: { background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, padding: '5px 8px', color: '#c9a84c', fontSize: 13, fontFamily: "'DM Mono',monospace", width: 68, outline: 'none', textAlign: 'center' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #161616' },
  footerNp: { fontSize: 11, color: '#333', fontFamily: "'DM Mono',monospace" },
  footerImporto: { fontSize: 11, color: '#555', fontFamily: "'DM Mono',monospace" },
}
