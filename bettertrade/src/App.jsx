import { useState } from "react";

// ─── Combinazioni ─────────────────────────────────────────────────────────────
const COMBOS = [
  { label: "Tris 1-2-3",       positions: [1,2,3],             type: "tris" },
  { label: "Tris 1-5-9",       positions: [1,5,9],             type: "tris" },
  { label: "Tris 4-5-6",       positions: [4,5,6],             type: "tris" },
  { label: "Tris 7-8-9",       positions: [7,8,9],             type: "tris" },
  { label: "Tris 7-5-3",       positions: [7,5,3],             type: "tris" },
  { label: "Quaterna 1-3-7-9", positions: [1,3,7,9],           type: "quaterna" },
  { label: "Quaterna 2-4-6-8", positions: [2,4,6,8],           type: "quaterna" },
  { label: "Full 1→9",         positions: [1,2,3,4,5,6,7,8,9], type: "full" },
];

const emptyTiles = () =>
  Array.from({ length: 9 }, (_, i) => ({ id: i + 1, giocata: "", casa: "", ospite: "", quota: "", result: null }));

const emptySlot = (n) => ({
  id: n, name: `Spin ${n}`,
  bankroll: "", pct3: 25, pct4: 16, pct9: 4,
  tiles: emptyTiles(),
});

const comboStatus = (tiles, positions) => {
  const rel = tiles.filter(t => positions.includes(t.id));
  if (rel.some(t => t.result === 0)) return "loss";
  if (rel.every(t => t.result === 1)) return "win";
  return "pending";
};

const comboQuota = (tiles, positions) =>
  positions.reduce((acc, pos) => {
    const q = parseFloat(tiles.find(t => t.id === pos)?.quota);
    return acc * (isNaN(q) ? 1 : q);
  }, 1);

const puntata = (bk, pct) => Math.round((parseFloat(bk) || 0) * pct / 100);

const TABLE_ORDER = [1,3,7,9, 2,4,6,8, 5];
const ANGOLI  = [1,3,7,9];
const LATI    = [2,4,6,8];

const C = {
  bg: "#090909", surface: "#0f0f0f", card: "#141414",
  border: "#1f1f1f", borderLight: "#282828",
  gold: "#c9a84c", goldBg: "rgba(201,168,76,0.10)",
  green: "#22c55e", greenBg: "rgba(34,197,94,0.12)",
  red: "#ef4444", redBg: "rgba(239,68,68,0.10)",
  text: "#e0d9d0", muted: "#484340", mutedMid: "#6b6460",
  mono: "'DM Mono','Courier New',monospace",
  sans: "'Sora','Segoe UI',sans-serif",
  yellowBg: "rgba(234,179,8,0.10)",
  yellowBorder: "rgba(234,179,8,0.30)",
  blueBg: "rgba(56,189,248,0.09)",
  blueBorder: "rgba(56,189,248,0.28)",
};

const fasciaBg     = (id) => ANGOLI.includes(id) ? C.yellowBg   : LATI.includes(id) ? C.blueBg     : "transparent";
const fasciaBorder = (id) => ANGOLI.includes(id) ? C.yellowBorder : LATI.includes(id) ? C.blueBorder : C.border;

// ─── Slot components ──────────────────────────────────────────────────────────

function SlotGrid({ tiles }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
      {tiles.map(tile => {
        const isWin  = tile.result === 1;
        const isLoss = tile.result === 0;
        const bg   = isWin ? C.greenBg : isLoss ? C.redBg : fasciaBg(tile.id);
        const bord = isWin ? C.green   : isLoss ? C.red   : fasciaBorder(tile.id);
        const glow = isWin ? "0 0 12px rgba(34,197,94,0.30)" : isLoss ? "0 0 12px rgba(239,68,68,0.20)" : "none";
        return (
          <div key={tile.id} style={{
            position: "relative", borderRadius: 9,
            border: `1px solid ${bord}`, background: bg,
            boxShadow: glow, padding: "7px 5px", minHeight: 64,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
            transition: "all .2s",
          }}>
            <span style={{ position:"absolute", top:4, left:6, fontSize:9, color:C.muted, fontFamily:C.mono }}>{tile.id}</span>
            {isWin  && <span style={{ position:"absolute", top:3, right:5, fontSize:11, color:C.green }}>✓</span>}
            {isLoss && <span style={{ position:"absolute", top:3, right:5, fontSize:11, color:C.red }}>✗</span>}
            {tile.giocata && <span style={{ fontSize:8, color:C.gold, fontFamily:C.mono, marginBottom:1 }}>{tile.giocata}</span>}
            <span style={{ fontSize:9, color:(tile.casa||tile.ospite)?C.text:C.muted, textAlign:"center", lineHeight:1.4, wordBreak:"break-word", maxWidth:"100%", padding:"0 2px" }}>
              {tile.casa || tile.ospite ? <>{tile.casa||"?"}<br/><span style={{color:C.muted,fontSize:8}}>vs</span><br/>{tile.ospite||"?"}</> : "—"}
            </span>
            {tile.quota && <span style={{ fontSize:10, color:C.gold, fontFamily:C.mono }}>×{tile.quota}</span>}
          </div>
        );
      })}
    </div>
  );
}

function TileTable({ tiles, onChange }) {
  const updateTile = (id, field, value) =>
    onChange(tiles.map(t => t.id === id ? { ...t, [field]: value } : t));
  const cellBase = { padding:0, border:"none", borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` };
  const cellInput = (extra={}) => ({ width:"100%", boxSizing:"border-box", background:"transparent", border:"none", outline:"none", color:C.text, fontFamily:C.sans, fontSize:"16px", padding:"7px 8px", ...extra });
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", fontFamily:C.sans }}>
        <thead>
          <tr style={{ background:C.surface }}>
            {["Giocata","Casa","Ospite","Quota","Risultato"].map((h,i) => (
              <th key={h} style={{ ...cellBase, padding:"7px 10px", textAlign:"left", fontSize:10, color:C.muted, fontFamily:C.mono, letterSpacing:1.5, fontWeight:500, width:i===0?90:i===3?72:i===4?136:"auto" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_ORDER.map(pos => {
            const tile = tiles.find(t => t.id === pos);
            const isWin = tile.result===1, isLoss = tile.result===0;
            const rowBg = isWin ? C.greenBg : isLoss ? C.redBg : fasciaBg(tile.id);
            return (
              <tr key={tile.id} style={{ background:rowBg, transition:"background .15s" }}>
                <td style={{ ...cellBase, width:90 }}>
                  <input value={tile.giocata} onChange={e=>updateTile(tile.id,"giocata",e.target.value)} autoComplete="off" autoCorrect="off" spellCheck="false" style={cellInput({ color:C.gold, fontFamily:C.mono, background:C.bg })} />
                </td>
                <td style={{ ...cellBase }}>
                  <input value={tile.casa} onChange={e=>updateTile(tile.id,"casa",e.target.value)} style={cellInput()} />
                </td>
                <td style={{ ...cellBase }}>
                  <input value={tile.ospite} onChange={e=>updateTile(tile.id,"ospite",e.target.value)} style={cellInput()} />
                </td>
                <td style={{ ...cellBase, width:72 }}>
                  <input type="number" step="0.01" min="1" value={tile.quota} onChange={e=>updateTile(tile.id,"quota",e.target.value)} placeholder="1.00" style={cellInput({ color:C.gold, fontFamily:C.mono, textAlign:"center" })} />
                </td>
                <td style={{ ...cellBase, borderRight:"none", width:136 }}>
                  <div style={{ display:"flex", gap:4, padding:"4px 6px" }}>
                    {[{v:null,label:"—",col:C.muted},{v:1,label:"✓ Win",col:C.green},{v:0,label:"✗ Loss",col:C.red}].map(b => (
                      <button key={String(b.v)} onClick={()=>updateTile(tile.id,"result",b.v)} style={{ flex:1, padding:"6px 2px", borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:C.sans, border:`1px solid ${tile.result===b.v?b.col:C.border}`, background:tile.result===b.v?`${b.col}25`:"transparent", color:tile.result===b.v?b.col:C.muted, transition:"all .12s" }}>{b.label}</button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Schedine({ tiles, bankroll, pct3, pct4, pct9 }) {
  const bk = parseFloat(bankroll) || 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <div style={{ fontSize:10, color:C.muted, fontFamily:C.mono, letterSpacing:2, marginBottom:3 }}>SCHEDINE</div>
      {COMBOS.map(c => {
        const status = comboStatus(tiles, c.positions);
        const pct = c.type==="tris"?pct3:c.type==="quaterna"?pct4:pct9;
        const p = puntata(bk, pct);
        const inc = p * comboQuota(tiles, c.positions);
        const isWin = status==="win", isLoss = status==="loss";
        return (
          <div key={c.label} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 9px", borderRadius:7, background:isWin?C.greenBg:isLoss?C.redBg:"transparent", borderLeft:`3px solid ${isWin?C.green:isLoss?C.red:C.border}` }}>
            <span style={{ fontSize:11, minWidth:14 }}>{isWin?"🏆":isLoss?"✗":"·"}</span>
            <span style={{ flex:1, fontSize:11, color:isWin?C.green:isLoss?C.red:C.mutedMid, fontFamily:C.mono }}>{c.label}</span>
            <span style={{ fontSize:11, color:C.muted }}>€{p}</span>
            {isWin && <span style={{ fontSize:12, color:C.green, fontFamily:C.mono, fontWeight:700 }}>→€{inc.toFixed(2)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function SlotCard({ slot, onChange, onReset }) {
  const set = (field, val) => onChange({ ...slot, [field]: val });
  const bk = parseFloat(slot.bankroll) || 0;
  const totalInvestito = puntata(bk,slot.pct3)*5 + puntata(bk,slot.pct4)*2 + puntata(bk,slot.pct9);
  let totalIncasso = 0;
  COMBOS.forEach(c => {
    if (comboStatus(slot.tiles, c.positions)==="win") {
      const pct = c.type==="tris"?slot.pct3:c.type==="quaterna"?slot.pct4:slot.pct9;
      totalIncasso += puntata(bk,pct) * comboQuota(slot.tiles, c.positions);
    }
  });
  const saldo = totalIncasso - totalInvestito;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
        <input value={slot.name} onChange={e=>set("name",e.target.value)} style={{ flex:1, background:"transparent", border:"none", outline:"none", color:C.gold, fontFamily:C.mono, fontSize:"16px", letterSpacing:1 }} />
        <div style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontFamily:C.mono, background:saldo>=0?C.greenBg:C.redBg, color:saldo>=0?C.green:C.red }}>{saldo>=0?"+":""}{saldo.toFixed(0)}€</div>
        <button onClick={onReset} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.muted, cursor:"pointer", fontFamily:C.mono, fontSize:9, letterSpacing:1, padding:"4px 8px" }}>RESET</button>
      </div>
      <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
          {[{label:"Bankroll €",field:"bankroll",wide:true},{label:"% Tris",field:"pct3"},{label:"% Quat.",field:"pct4"},{label:"% Full",field:"pct9"}].map(({label,field,wide})=>(
            <label key={field} style={{ display:"flex", flexDirection:"column", gap:3, fontSize:10, color:C.muted, fontFamily:C.mono, letterSpacing:1 }}>
              {label}
              <input type="number" value={slot[field]} onChange={e=>set(field,field==="bankroll"?e.target.value:+e.target.value)} style={{ width:wide?90:55, background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:7, color:C.text, padding:"6px 8px", fontSize:"16px", fontFamily:C.mono, outline:"none", textAlign:"center" }} />
            </label>
          ))}
          <div style={{ marginLeft:"auto", textAlign:"right", lineHeight:1.8 }}>
            <div style={{ fontSize:11, color:C.muted }}>Inv. <span style={{ color:C.text, fontFamily:C.mono }}>€{totalInvestito}</span></div>
            <div style={{ fontSize:11, color:C.muted }}>Inc. <span style={{ color:C.green, fontFamily:C.mono }}>€{totalIncasso.toFixed(2)}</span></div>
          </div>
        </div>
        <div style={{ display:"flex", gap:14 }}>
          <div style={{ flexShrink:0, width:180 }}><SlotGrid tiles={slot.tiles} /></div>
          <div style={{ flex:1, minWidth:0 }}><Schedine tiles={slot.tiles} bankroll={slot.bankroll} pct3={slot.pct3} pct4={slot.pct4} pct9={slot.pct9} /></div>
        </div>
        <TileTable tiles={slot.tiles} onChange={tiles=>onChange({...slot,tiles})} />
      </div>
    </div>
  );
}

function PageSlot() {
  const [slots, setSlots] = useState([emptySlot(1),emptySlot(2),emptySlot(3),emptySlot(4)]);
  const updateSlot = u => setSlots(p => p.map(s => s.id===u.id?u:s));
  const resetSlot  = id => setSlots(p => p.map(s => s.id===id?{...emptySlot(id),name:s.name}:s));
  const totalSaldo = slots.reduce((acc,slot) => {
    const bk = parseFloat(slot.bankroll)||0;
    const inv = puntata(bk,slot.pct3)*5+puntata(bk,slot.pct4)*2+puntata(bk,slot.pct9);
    let inc=0;
    COMBOS.forEach(c=>{ if(comboStatus(slot.tiles,c.positions)==="win"){ const pct=c.type==="tris"?slot.pct3:c.type==="quaterna"?slot.pct4:slot.pct9; inc+=puntata(bk,pct)*comboQuota(slot.tiles,c.positions); } });
    return acc+(inc-inv);
  },0);
  return (
    <div style={{ padding:"20px 16px" }}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:13, fontFamily:C.mono, color:totalSaldo>=0?C.green:C.red, background:totalSaldo>=0?C.greenBg:C.redBg, display:"inline-block", padding:"4px 16px", borderRadius:20 }}>
          Saldo totale {totalSaldo>=0?"+":""}{totalSaldo.toFixed(2)}€
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:860, margin:"0 auto" }}>
        {slots.map(slot => <SlotCard key={slot.id} slot={slot} onChange={updateSlot} onReset={()=>resetSlot(slot.id)} />)}
      </div>
    </div>
  );
}

// ─── Placeholder pages ────────────────────────────────────────────────────────

function Placeholder({ icon, title, description }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16, textAlign:"center", padding:"40px 24px" }}>
      <div style={{ fontSize:48 }}>{icon}</div>
      <div style={{ fontSize:10, color:C.gold, fontFamily:C.mono, letterSpacing:4, marginBottom:4 }}>COMING SOON</div>
      <div style={{ fontSize:24, fontWeight:700, color:C.text }}>{title}</div>
      <div style={{ fontSize:14, color:C.muted, maxWidth:320, lineHeight:1.7 }}>{description}</div>
      <div style={{ marginTop:8, padding:"6px 18px", borderRadius:20, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, fontFamily:C.mono, letterSpacing:1 }}>In sviluppo</div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id:"dashboard", label:"Dashboard", icon:"📊" },
  { id:"slot",      label:"Slot",      icon:"🎰" },
  { id:"reporting", label:"Reporting", icon:"📈" },
  { id:"bilancio",  label:"Bilancio",  icon:"💶" },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.surface, position:"sticky", top:0, zIndex:50 }}>
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button key={tab.id} onClick={()=>onChange(tab.id)} style={{ flex:1, padding:"13px 4px", background:"transparent", border:"none", borderBottom:`2px solid ${isActive?C.gold:"transparent"}`, color:isActive?C.gold:C.muted, fontFamily:C.mono, fontSize:10, letterSpacing:1.2, cursor:"pointer", transition:"all .15s", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:16 }}>{tab.icon}</span>
            {tab.label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("slot");
  const renderPage = () => {
    switch(activeTab) {
      case "dashboard": return <Placeholder icon="📊" title="Dashboard" description="Panoramica generale della giornata. Saldo live, spin attivi, andamento." />;
      case "slot":      return <PageSlot />;
      case "reporting": return <Placeholder icon="📈" title="Reporting" description="Storico giornate. Puntate, incassi e saldo per ogni sessione." />;
      case "bilancio":  return <Placeholder icon="💶" title="Bilancio" description="Riepilogo finanziario complessivo. Bankroll, versamenti e andamento stagione." />;
      default:          return <PageSlot />;
    }
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.sans }}>
      {/* Header */}
      <div style={{ textAlign:"center", padding:"18px 16px 14px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
        <div style={{ fontSize:10, color:C.gold, fontFamily:C.mono, letterSpacing:4, marginBottom:3 }}>BETTERTRADE</div>
        <div style={{ fontSize:18, fontWeight:700, letterSpacing:-0.5 }}>Sport Betting Tracker</div>
      </div>
      {/* Tabs */}
      <TabBar active={activeTab} onChange={setActiveTab} />
      {/* Page */}
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        {renderPage()}
      </div>
    </div>
  );
}
