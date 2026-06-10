import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Home, Trophy, Users, Menu, ListChecks, ChevronRight, ChevronDown, ChevronUp,
  Lock, Unlock, Check, X, Share2, Info, Crown, Loader2, Settings, ArrowLeft, Edit3
} from "lucide-react";
import { sGet as fbGet, sSet as fbSet, listPlayerKeys as fbList, isShared } from "./storage.js";

/* =========================================================================
   DATA — Coupe du Monde 2026 (groupes officiels, tirage du 5 déc. 2025)
   ========================================================================= */
const FLAG = {
  "Mexique":"🇲🇽","Afrique du Sud":"🇿🇦","Corée du Sud":"🇰🇷","Tchéquie":"🇨🇿",
  "Suisse":"🇨🇭","Canada":"🇨🇦","Bosnie":"🇧🇦","Qatar":"🇶🇦",
  "Écosse":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Brésil":"🇧🇷","Maroc":"🇲🇦","Haïti":"🇭🇹",
  "Paraguay":"🇵🇾","Australie":"🇦🇺","Turquie":"🇹🇷","États-Unis":"🇺🇸",
  "Équateur":"🇪🇨","Allemagne":"🇩🇪","Curaçao":"🇨🇼","Côte d'Ivoire":"🇨🇮",
  "Tunisie":"🇹🇳","Pays-Bas":"🇳🇱","Japon":"🇯🇵","Suède":"🇸🇪",
  "Nouvelle-Zélande":"🇳🇿","Belgique":"🇧🇪","Égypte":"🇪🇬","Iran":"🇮🇷",
  "Uruguay":"🇺🇾","Espagne":"🇪🇸","Cap-Vert":"🇨🇻","Arabie Saoudite":"🇸🇦",
  "Norvège":"🇳🇴","France":"🇫🇷","Sénégal":"🇸🇳","Irak":"🇮🇶",
  "Algérie":"🇩🇿","Autriche":"🇦🇹","Jordanie":"🇯🇴","Argentine":"🇦🇷",
  "RD Congo":"🇨🇩","Ouzbékistan":"🇺🇿","Colombie":"🇨🇴","Portugal":"🇵🇹",
  "Croatie":"🇭🇷","Ghana":"🇬🇭","Panama":"🇵🇦","Angleterre":"🏴󠁧󠁢󠁥󠁮󠁧󠁿"
};
const SEED = ["Espagne","Argentine","France","Angleterre","Brésil","Portugal","Pays-Bas","Belgique","Allemagne","Croatie","Maroc","Colombie","Uruguay","Suisse","Japon","Sénégal","Iran","Corée du Sud","Équateur","Autriche","Australie","États-Unis","Mexique","Canada","Norvège","Panama","Égypte","Algérie","Écosse","Paraguay","Tunisie","Côte d'Ivoire","Ouzbékistan","Qatar","Arabie Saoudite","Afrique du Sud","Turquie","Suède","Tchéquie","Bosnie","RD Congo","Irak","Nouvelle-Zélande","Curaçao","Cap-Vert","Jordanie","Haïti","Ghana"];
const GROUPS = {
  A:["Mexique","Afrique du Sud","Corée du Sud","Tchéquie"],
  B:["Suisse","Canada","Bosnie","Qatar"],
  C:["Brésil","Maroc","Écosse","Haïti"],
  D:["États-Unis","Turquie","Paraguay","Australie"],
  E:["Allemagne","Équateur","Côte d'Ivoire","Curaçao"],
  F:["Pays-Bas","Japon","Suède","Tunisie"],
  G:["Belgique","Égypte","Iran","Nouvelle-Zélande"],
  H:["Espagne","Uruguay","Cap-Vert","Arabie Saoudite"],
  I:["France","Sénégal","Norvège","Irak"],
  J:["Argentine","Algérie","Autriche","Jordanie"],
  K:["Portugal","Colombie","Ouzbékistan","RD Congo"],
  L:["Angleterre","Croatie","Ghana","Panama"]
};
const GL = Object.keys(GROUPS);
const RR = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
const groupMatches = (L) => RR.map(([a,b],i)=>({ id:`${L}-${i}`, group:L, home:GROUPS[L][a], away:GROUPS[L][b] }));
const ALL_MATCHES = GL.flatMap(groupMatches);

/* third-place slots: winner-group-faced -> eligible third groups (FIFA grid) */
const THIRD_SLOTS = { E:["A","B","C","D","F"], I:["C","D","F","G","H"], D:["B","E","F","I","J"], G:["A","E","H","I","J"], A:["C","E","F","H","I"], L:["E","H","I","J","K"], B:["E","F","G","I","J"], K:["D","E","I","J","L"] };
const SLOT_ORDER = ["E","I","D","G","A","L","B","K"];

const ROUND_LABEL = { r32:"16es", r16:"8es", qf:"Quarts", sf:"Demies", final:"Finale", third:"3e place" };
const ROUND_FULL = { r32:"16es de finale", r16:"8es de finale", qf:"Quarts de finale", sf:"Demi-finales", final:"Finale", third:"Petite finale" };

/* =========================================================================
   LOGIC (vérifiée sur 3000 simulations)
   ========================================================================= */
function computeStanding(L, picks){
  const t = GROUPS[L]; const st = {}; t.forEach(n=>st[n]={team:n,pts:0,played:0});
  for(const m of groupMatches(L)){
    const p = picks[m.id]; if(!p) continue;
    st[m.home].played++; st[m.away].played++;
    if(p==="draw"){ st[m.home].pts++; st[m.away].pts++; }
    else if(p==="home"){ st[m.home].pts+=3; }
    else if(p==="away"){ st[m.away].pts+=3; }
  }
  return t.map(n=>st[n]);
}
const defaultOrder = rows => [...rows].sort((a,b)=> b.pts-a.pts || (SEED.indexOf(a.team)-SEED.indexOf(b.team)));
const groupComplete = (L,picks)=> groupMatches(L).every(m=>picks[m.id]);
const allGroupsComplete = picks => ALL_MATCHES.every(m=>picks[m.id]);
function groupHasTie(L,picks){
  const rows = computeStanding(L,picks);
  if(rows.some(r=>r.played<3)) return false;
  const pts = rows.map(r=>r.pts);
  return new Set(pts).size !== pts.length;
}
function groupRanking(L,picks,tieOrders){
  const rows = computeStanding(L,picks);
  const byName = Object.fromEntries(rows.map(r=>[r.team,r]));
  let order = defaultOrder(rows).map(r=>r.team);
  const ov = tieOrders && tieOrders[L];
  if(ov && ov.length===4 && ov.every(n=>byName[n])) order = ov;
  return order.map((team,i)=>({rank:i+1, team, pts:byName[team].pts}));
}
function thirdsAnalysis(picks,tieOrders){
  const thirds = GL.map(L=>{ const r = groupRanking(L,picks,tieOrders)[2]; return { group:L, team:r.team, pts:r.pts }; });
  const sorted = [...thirds].sort((a,b)=> b.pts-a.pts || (SEED.indexOf(a.team)-SEED.indexOf(b.team)));
  const cutoffPts = sorted[7].pts;
  const above = sorted.filter(x=>x.pts>cutoffPts);
  const atCutoff = sorted.filter(x=>x.pts===cutoffPts);
  const need = 8 - above.length;
  return { sorted, autoIn: above.map(x=>x.group), bubble: atCutoff.map(x=>x.group), need,
    ambiguous: atCutoff.length>need, defaultQualified:[...above,...atCutoff.slice(0,need)].map(x=>x.group) };
}
function qualifiedThirds(picks,tieOrders,thirdsChoice){
  const a = thirdsAnalysis(picks,tieOrders);
  if(thirdsChoice && thirdsChoice.length===8){
    const set = new Set(thirdsChoice); const allowed = new Set([...a.autoIn,...a.bubble]);
    if(a.autoIn.every(g=>set.has(g)) && thirdsChoice.every(g=>allowed.has(g))) return [...thirdsChoice];
  }
  return a.defaultQualified;
}
function assignThirds(qualified){
  const used = new Set(); const res = {};
  const bt = i => {
    if(i===SLOT_ORDER.length) return true;
    const slot = SLOT_ORDER[i];
    for(const g of THIRD_SLOTS[slot]){
      if(qualified.includes(g) && !used.has(g)){ used.add(g); res[slot]=g; if(bt(i+1)) return true; used.delete(g); delete res[slot]; }
    }
    return false;
  };
  return bt(0) ? res : null;
}
function buildBracket(picks,tieOrders,thirdsChoice){
  const rank = {}; GL.forEach(L=> rank[L]=groupRanking(L,picks,tieOrders));
  const first = L=>rank[L][0].team, second = L=>rank[L][1].team, third = L=>rank[L][2].team;
  const qual = qualifiedThirds(picks,tieOrders,thirdsChoice);
  const slotMap = assignThirds(qual);
  if(!slotMap) return { error:"Impossible de placer les 8 meilleurs 3es. Ajuste tes pronos." };
  const tf = wg => third(slotMap[wg]);
  const R32 = [
    { id:"r32_1", a:first("E"), b:tf("E") }, { id:"r32_2", a:first("I"), b:tf("I") },
    { id:"r32_3", a:second("A"),b:second("B") }, { id:"r32_4", a:first("F"), b:second("C") },
    { id:"r32_5", a:second("K"),b:second("L") }, { id:"r32_6", a:first("H"), b:second("J") },
    { id:"r32_7", a:first("D"), b:tf("D") }, { id:"r32_8", a:first("G"), b:tf("G") },
    { id:"r32_9", a:first("C"), b:second("F") }, { id:"r32_10", a:second("E"),b:second("I") },
    { id:"r32_11", a:first("A"), b:tf("A") }, { id:"r32_12", a:first("L"), b:tf("L") },
    { id:"r32_13", a:first("J"), b:second("H") }, { id:"r32_14", a:second("D"),b:second("G") },
    { id:"r32_15", a:first("B"), b:tf("B") }, { id:"r32_16", a:first("K"), b:tf("K") },
  ];
  return { R32, qual, slotMap };
}
function resolveTree(R32, winners){
  const tree = { r32: R32.map(m=>({key:m.id, a:m.a, b:m.b, w:winners[m.id]||null})) };
  let prev = tree.r32;
  for(const r of ["r16","qf","sf","final"]){
    const arr = [];
    for(let i=0;i<prev.length/2;i++){
      const top=prev[2*i], bot=prev[2*i+1]; const key=`${r}_${i+1}`;
      arr.push({ key, a: top.w, b: bot.w, w: winners[key]||null });
    }
    tree[r]=arr; prev=arr;
  }
  const sf = tree.sf; const loser = m => (m.w&&m.a&&m.b)?(m.w===m.a?m.b:m.a):null;
  tree.third = [{ key:"third_1", a:loser(sf[0]), b:loser(sf[1]), w:winners["third_1"]||null }];
  return tree;
}
function userStages(tree){
  return {
    huitiemes: tree.r32.map(m=>m.w).filter(Boolean),
    quarts: tree.r16.map(m=>m.w).filter(Boolean),
    demis: tree.qf.map(m=>m.w).filter(Boolean),
    finale: tree.sf.map(m=>m.w).filter(Boolean),
    champion: tree.final.map(m=>m.w).filter(Boolean),
  };
}

/* =========================================================================
   STORAGE — wrappers vers Firebase (voir src/storage.js)
   ========================================================================= */
const MEM = { _device_name: null };
const slug = s => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "joueur";
const sGet = fbGet;
const sSet = fbSet;
const listPlayerKeys = fbList;

/* =========================================================================
   THEME & HELPERS
   ========================================================================= */
const C = {
  bg:"#070d1b", grad1:"#0b1733", grad2:"#070c19",
  card:"#101c3a", card2:"#0c1631", line:"#1e2c54", lineSoft:"#16223f",
  ink:"#eaf0ff", sub:"#8a9cc6", dim:"#5c6e9c",
  turf:"#27e0a3", turfDeep:"#11b083", turfDk:"#0c3a2f",
  gold:"#ffce5c", goldDeep:"#d99e30",
  coral:"#ff6f7d", sky:"#5cc2ff", violet:"#9d8cff",
};
const DISP = "'Barlow Condensed', system-ui, sans-serif";
const BODY = "'Inter', system-ui, sans-serif";

const Flag = ({t,size=20}) => <span style={{fontSize:size, lineHeight:1, filter:"saturate(1.1)"}}>{FLAG[t]||"🏳️"}</span>;

function Team({name, size=15, dim=false, strong=false}){
  if(!name) return <span style={{color:C.dim, fontFamily:DISP, fontWeight:600, fontSize:size, letterSpacing:.3}}>À déterminer</span>;
  return (
    <span style={{display:"inline-flex", alignItems:"center", gap:8, minWidth:0}}>
      <Flag t={name} size={size+5}/>
      <span style={{ fontFamily:DISP, fontWeight: strong?700:600, fontSize:size, letterSpacing:.3,
        color: dim?C.sub:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</span>
    </span>
  );
}
function Eyebrow({children, color=C.turf}){
  return <div style={{ fontFamily:DISP, fontWeight:700, fontSize:12, letterSpacing:2.5, textTransform:"uppercase", color }}>{children}</div>;
}
function Card({children, style, onClick}){
  return <div onClick={onClick} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, ...style }}>{children}</div>;
}
function Stat({label,value,color=C.ink}){
  return <div><div style={{ fontFamily:DISP, fontWeight:700, fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.sub }}>{label}</div>
    <div style={{ fontFamily:DISP, fontWeight:700, fontSize:18, color, marginTop:2 }}>{value}</div></div>;
}

/* =========================================================================
   APP ROOT
   ========================================================================= */
export default function App(){
  const [booted,setBooted] = useState(false);
  const [name,setName] = useState(null);
  const [key,setKey] = useState(null);
  const [state,setState] = useState(null);
  const [tab,setTab] = useState("home");
  const [menuOpen,setMenuOpen] = useState(false);
  const [results,setResults] = useState({groups:{},stages:{huitiemes:[],quarts:[],demis:[],finale:[],champion:[]}});
  const [players,setPlayers] = useState([]);
  const [toast,setToast] = useState(null);

  useEffect(()=>{
    const id="cdp-fonts"; if(document.getElementById(id)) return;
    const l=document.createElement("link"); l.id=id; l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  },[]);

  const refreshShared = useCallback(async()=>{
    const r = await sGet("results"); if(r) setResults(r);
    const keys = await listPlayerKeys();
    const list = [];
    for(const k of keys){ const st = await sGet(k); if(st) list.push({ name:st.name, key:k, state:st }); }
    list.sort((a,b)=> a.name.localeCompare(b.name));
    setPlayers(list);
  },[]);

  const enter = useCallback(async(displayName, remember=true)=>{
    const k = "p1:"+slug(displayName);
    setName(displayName); setKey(k);
    let st = await sGet(k);
    if(!st) st = { name:displayName, groupPicks:{}, tieOrders:{}, thirdsChoice:null, winners:{}, locked:false };
    else st.name = displayName;
    setState(st);
    if(remember){ MEM["_device_name"]=displayName; await sSet("_device:name", displayName); }
    await refreshShared();
  },[refreshShared]);

  useEffect(()=>{ (async()=>{
    const last = await sGet("_device:name");
    if(last){ await enter(last, false); }
    setBooted(true);
  })(); },[enter]);

  const saveTimer = useRef(null);
  const persist = useCallback((next)=>{
    setState(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>{ sSet(key, next); refreshShared(); }, 400);
  },[key, refreshShared]);

  const flash = (msg)=>{ setToast(msg); setTimeout(()=>setToast(null), 2200); };

  if(!booted) return <Splash/>;
  if(!name || !state) return <NameGate onEnter={enter}/>;

  return (
    <div style={{ fontFamily:BODY, background:`radial-gradient(1200px 600px at 50% -10%, ${C.grad1}, ${C.grad2})`, color:C.ink, minHeight:"100vh" }}>
      <style>{`*{box-sizing:border-box} button{font-family:inherit} ::selection{background:${C.turf};color:#06140f}
        @keyframes pop{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`}</style>

      <Header name={name} onName={()=>setMenuOpen(true)} />

      <main style={{ maxWidth:760, margin:"0 auto", padding:"14px 14px 110px" }}>
        {tab==="home" && <HomeScreen name={name} state={state} setTab={setTab} players={players} results={results}/>}
        {tab==="partie1" && <Partie1 state={state} persist={persist} flash={flash}/>}
        {tab==="classement" && <Classements players={players} results={results} refresh={refreshShared}/>}
        {tab==="joueurs" && <Joueurs players={players} me={name}/>}
        {tab==="partie2" && <Partie2/>}
        {tab==="orga" && <Organisateur results={results} setResults={setResults} flash={flash}/>}
      </main>

      <BottomNav tab={tab} setTab={setTab} onMenu={()=>setMenuOpen(true)}/>

      {menuOpen && <Sheet onClose={()=>setMenuOpen(false)} name={name}
        go={(t)=>{ setTab(t); setMenuOpen(false); }}
        switchUser={()=>{ setMenuOpen(false); setName(null); setState(null); sSet("_device:name", null); MEM["_device_name"]=null; }} />}

      {toast && <div style={{ position:"fixed", bottom:96, left:"50%", transform:"translateX(-50%)", zIndex:60,
        background:C.ink, color:"#06140f", fontWeight:600, fontSize:14, padding:"10px 16px", borderRadius:12,
        boxShadow:"0 10px 30px rgba(0,0,0,.4)", animation:"pop .2s" }}>{toast}</div>}
    </div>
  );
}

/* ---------- Splash / Gate ---------- */
function Splash(){
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.turf}}>
    <Loader2 size={28} style={{animation:"spin 1s linear infinite"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

function NameGate({onEnter}){
  const [v,setV] = useState("");
  useEffect(()=>{ const id="cdp-fonts"; if(!document.getElementById(id)){ const l=document.createElement("link"); l.id=id; l.rel="stylesheet"; l.href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"; document.head.appendChild(l);} },[]);
  const ok = v.trim().length>=2;
  return (
    <div style={{ fontFamily:BODY, minHeight:"100vh", color:C.ink,
      background:`radial-gradient(1000px 500px at 50% -10%, ${C.grad1}, ${C.grad2})`,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, border:`2px solid ${C.turf}`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg, transparent 49%, ${C.turfDk} 49% 51%, transparent 51%)` }}/>
            <div style={{ position:"absolute", top:"50%", left:"50%", width:14, height:14, transform:"translate(-50%,-50%)", borderRadius:999, border:`2px solid ${C.turf}` }}/>
          </div>
          <Eyebrow>Mondial 2026 · USA · Canada · Mexique</Eyebrow>
        </div>
        <h1 style={{ fontFamily:DISP, fontWeight:700, fontSize:46, lineHeight:.95, letterSpacing:.5, margin:"18px 0 6px" }}>
          LA COUPE<br/><span style={{color:C.turf}}>DES POTES</span>
        </h1>
        <p style={{ color:C.sub, fontSize:15, margin:"0 0 26px" }}>Pronostics du Mondial 2026, entre vous. Entre ton prénom — tes pronos seront enregistrés à ton nom.</p>
        <label style={{ fontFamily:DISP, fontWeight:700, fontSize:12, letterSpacing:2, textTransform:"uppercase", color:C.turf }}>Ton prénom</label>
        <input autoFocus value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&ok) onEnter(v.trim()); }}
          placeholder="ex. Florent" style={{ width:"100%", marginTop:8, padding:"14px 16px", fontSize:18, fontFamily:DISP, fontWeight:600,
          background:C.card, border:`1px solid ${C.line}`, borderRadius:14, color:C.ink, outline:"none" }}/>
        <button disabled={!ok} onClick={()=>onEnter(v.trim())} style={{ width:"100%", marginTop:14, padding:"15px",
          fontFamily:DISP, fontWeight:700, fontSize:18, letterSpacing:1, textTransform:"uppercase", borderRadius:14, border:"none",
          cursor: ok?"pointer":"default", background: ok? C.turf : C.line, color: ok? "#06140f" : C.dim }}>
          Entrer dans le jeu
        </button>
        <p style={{ color:C.dim, fontSize:12.5, marginTop:16, lineHeight:1.5 }}>
          Pas de mot de passe — qui ouvre le même lien partage le même jeu. Reprends le même prénom pour retrouver tes pronos.
        </p>
      </div>
    </div>
  );
}

/* ---------- Header & Nav ---------- */
function Header({name,onName}){
  return (
    <header style={{ position:"sticky", top:0, zIndex:40, backdropFilter:"blur(10px)",
      background:"rgba(7,12,25,.72)", borderBottom:`1px solid ${C.lineSoft}` }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"11px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:9, border:`2px solid ${C.turf}`, position:"relative" }}>
            <div style={{ position:"absolute", top:"50%", left:"50%", width:9, height:9, transform:"translate(-50%,-50%)", borderRadius:999, border:`2px solid ${C.turf}` }}/>
          </div>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:18, letterSpacing:.6 }}>LA COUPE <span style={{color:C.turf}}>DES POTES</span></div>
        </div>
        <button onClick={onName} style={{ display:"flex", alignItems:"center", gap:7, background:C.card, border:`1px solid ${C.line}`,
          borderRadius:999, padding:"5px 10px 5px 6px", cursor:"pointer" }}>
          <div style={{ width:24, height:24, borderRadius:999, background:C.turf, color:"#06140f", fontFamily:DISP, fontWeight:700,
            fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>{name[0]?.toUpperCase()}</div>
          <span style={{ fontFamily:DISP, fontWeight:600, fontSize:14, color:C.ink, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
        </button>
      </div>
    </header>
  );
}
function BottomNav({tab,setTab,onMenu}){
  const items = [["home","Accueil",Home],["partie1","Pronos",ListChecks],["classement","Classement",Trophy],["joueurs","Joueurs",Users]];
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:40, background:"rgba(7,12,25,.92)",
      backdropFilter:"blur(10px)", borderTop:`1px solid ${C.lineSoft}`, paddingBottom:"env(safe-area-inset-bottom)" }}>
      <div style={{ maxWidth:760, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(5,1fr)" }}>
        {items.map(([id,label,Icon])=>{
          const a = tab===id;
          return <button key={id} onClick={()=>setTab(id)} style={{ background:"none", border:"none", cursor:"pointer",
            padding:"10px 0 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:a?C.turf:C.dim }}>
            <Icon size={20}/><span style={{ fontFamily:DISP, fontWeight:600, fontSize:11, letterSpacing:.6 }}>{label}</span>
          </button>;
        })}
        <button onClick={onMenu} style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 0 12px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:C.dim }}>
          <Menu size={20}/><span style={{ fontFamily:DISP, fontWeight:600, fontSize:11, letterSpacing:.6 }}>Menu</span>
        </button>
      </div>
    </nav>
  );
}
function Sheet({onClose,go,switchUser,name}){
  const Row = ({icon:Icon,label,sub,onClick,color=C.ink}) => (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
      background:"none", border:"none", borderBottom:`1px solid ${C.lineSoft}`, cursor:"pointer", textAlign:"left" }}>
      <Icon size={20} color={color}/>
      <div><div style={{ fontFamily:DISP, fontWeight:600, fontSize:16, color }}>{label}</div>
      {sub && <div style={{ color:C.dim, fontSize:12.5 }}>{sub}</div>}</div>
    </button>
  );
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:760, margin:"0 auto", background:C.card2,
        borderTop:`1px solid ${C.line}`, borderRadius:"22px 22px 0 0", overflow:"hidden", animation:"pop .18s", paddingBottom:"env(safe-area-inset-bottom)" }}>
        <div style={{ padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:18 }}>Menu</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer" }}><X size={22}/></button>
        </div>
        <Row icon={Trophy} label="Partie 2 — Phase finale réelle" sub="S'ouvre fin juin, avec le vrai tableau" onClick={()=>go("partie2")} color={C.gold}/>
        <Row icon={Settings} label="Espace organisateur" sub="Saisir les vrais résultats" onClick={()=>go("orga")}/>
        <Row icon={Users} label="Changer de joueur" sub={`Connecté : ${name}`} onClick={switchUser}/>
      </div>
    </div>
  );
}

/* =========================================================================
   HOME SCREEN
   ========================================================================= */
function HomeScreen({name,state,setTab,players,results}){
  const done = ALL_MATCHES.filter(m=>state.groupPicks[m.id]).length;
  const bracket = useMemo(()=> buildBracket(state.groupPicks,state.tieOrders,state.thirdsChoice),[state]);
  const tree = (!bracket.error) ? resolveTree(bracket.R32, state.winners) : null;
  const champ = tree?.final?.[0]?.w || null;
  const bracketDone = tree && tree.final[0].w && tree.third[0].w;
  return (
    <div>
      <div style={{ marginTop:6, marginBottom:18 }}>
        <Eyebrow>Salut {name} 👋</Eyebrow>
        <h2 style={{ fontFamily:DISP, fontWeight:700, fontSize:34, lineHeight:1, margin:"6px 0 0" }}>
          Le Mondial commence <span style={{color:C.gold}}>le 11 juin</span>.
        </h2>
        <p style={{ color:C.sub, fontSize:14.5, margin:"8px 0 0" }}>Remplis ta <b style={{color:C.ink}}>Partie 1</b> avant le coup d'envoi : les 72 matchs de poule, puis ton tableau perso jusqu'au titre.</p>
      </div>

      <Card onClick={()=>setTab("partie1")} style={{ padding:18, cursor:"pointer", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, width:120, height:120, borderRadius:999, background:C.turfDk, opacity:.5 }}/>
        <div style={{ position:"relative" }}>
          <Eyebrow>Le Grand Pronostic</Eyebrow>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:24, margin:"6px 0 2px" }}>Partie 1</div>
          <p style={{ color:C.sub, fontSize:13.5, margin:"0 0 14px" }}>Pronostique tout le tournoi. 1 pt par bon match de poule, 1 pt par équipe bien placée dans le tableau.</p>
          <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
            <Stat label="Poules" value={`${done}/72`} color={done===72?C.turf:C.gold}/>
            <Stat label="Tableau" value={bracketDone?"Complet":"À faire"} color={bracketDone?C.turf:C.dim}/>
            <Stat label="Ton champion" value={champ?FLAG[champ]+" "+champ:"—"} color={champ?C.gold:C.dim}/>
          </div>
          <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:6, fontFamily:DISP, fontWeight:700,
            color:C.turf, fontSize:14, letterSpacing:.8 }}>
            {state.locked ? "VOIR / MODIFIER MES PRONOS" : (done<72 ? "CONTINUER MES PRONOS" : "FINIR LE TABLEAU")} <ChevronRight size={16}/>
          </div>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
        <Card onClick={()=>setTab("classement")} style={{ padding:16, cursor:"pointer" }}>
          <Trophy size={22} color={C.gold}/>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:19, marginTop:8 }}>Classement</div>
          <div style={{ color:C.sub, fontSize:12.5 }}>Poules · Phase finale · Général</div>
        </Card>
        <Card onClick={()=>setTab("joueurs")} style={{ padding:16, cursor:"pointer" }}>
          <Users size={22} color={C.sky}/>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:19, marginTop:8 }}>Les potes</div>
          <div style={{ color:C.sub, fontSize:12.5 }}>{players.length} joueur{players.length>1?"s":""} dans la partie</div>
        </Card>
      </div>

      <Card style={{ marginTop:12, padding:16 }}>
        <Eyebrow color={C.gold}>Règles du jeu</Eyebrow>
        <div style={{ marginTop:10, color:C.sub, fontSize:13.5, lineHeight:1.55 }}>
          <div>• <b style={{color:C.ink}}>Poules</b> : 1 pt par match dont tu trouves l'issue (V/N/D).</div>
          <div>• <b style={{color:C.ink}}>Tableau</b> : tu construis ton propre tableau à partir de tes pronos de poule. 1 pt par équipe que tu places au bon tour (8es, quarts, demis, finale, champion).</div>
          <div>• <b style={{color:C.ink}}>Partie 2</b> (s'ouvre fin juin) : sur le vrai tableau, 1 pt par match dont tu trouves le vainqueur. Classement séparé.</div>
        </div>
      </Card>

      <Card style={{ marginTop:12, padding:16, background:`linear-gradient(135deg, ${C.card} 0%, ${C.turfDk} 200%)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Share2 size={18} color={C.turf}/>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:17 }}>Inviter les potes</div>
        </div>
        <p style={{ color:C.sub, fontSize:13, margin:"6px 0 12px" }}>Partage ce lien — chacun entre son prénom et c'est parti.</p>
        <button onClick={()=>{
            const url = window.location.href;
            if(navigator.share){ navigator.share({title:"La Coupe des Potes", url}).catch(()=>{}); }
            else { navigator.clipboard?.writeText(url); alert("Lien copié !"); }
          }} style={{ width:"100%", padding:"12px", background:C.turf, color:"#06140f", border:"none", borderRadius:12,
          fontFamily:DISP, fontWeight:700, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
          Partager le lien
        </button>
      </Card>
    </div>
  );
}

/* =========================================================================
   PARTIE 1 — Poules + Tableau personnalisé
   ========================================================================= */
function Partie1({state, persist, flash}){
  const [view,setView] = useState("groups"); // groups | bracket
  const allDone = allGroupsComplete(state.groupPicks);
  const bracket = useMemo(()=> buildBracket(state.groupPicks,state.tieOrders,state.thirdsChoice),[state]);
  const treeIsReady = !bracket.error && allDone;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"6px 2px 14px" }}>
        <div>
          <Eyebrow>Partie 1 · Le Grand Pronostic</Eyebrow>
          <h2 style={{ fontFamily:DISP, fontWeight:700, fontSize:26, margin:"4px 0 0" }}>Tes pronos</h2>
        </div>
        {state.locked ? <span style={{ display:"inline-flex", alignItems:"center", gap:6, color:C.gold, fontFamily:DISP, fontWeight:700, fontSize:13, letterSpacing:1 }}><Lock size={14}/>VERROUILLÉ</span>
          : <span style={{ display:"inline-flex", alignItems:"center", gap:6, color:C.turf, fontFamily:DISP, fontWeight:700, fontSize:13, letterSpacing:1 }}><Unlock size={14}/>OUVERT</span>}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <Pill active={view==="groups"} onClick={()=>setView("groups")}>Phase de poules</Pill>
        <Pill active={view==="bracket"} onClick={()=>setView("bracket")} disabled={!treeIsReady} color={C.gold}>
          Phase finale {!allDone && "🔒"}
        </Pill>
      </div>

      {view==="groups" && <PoolesEditor state={state} persist={persist}/>}
      {view==="bracket" && treeIsReady && <BracketEditor state={state} persist={persist} bracket={bracket}/>}
      {view==="bracket" && !treeIsReady && (
        <Card style={{ padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, color:C.gold }}>
            <Lock size={18}/><div style={{ fontFamily:DISP, fontWeight:700, fontSize:18 }}>Termine d'abord les 72 matchs de poule</div>
          </div>
          <p style={{ color:C.sub, fontSize:13.5, marginTop:8 }}>Le tableau se construit automatiquement à partir de tes pronos de poule.</p>
        </Card>
      )}

      <div style={{ marginTop:18, display:"flex", gap:10, flexWrap:"wrap" }}>
        {!state.locked && allDone && bracket && !bracket.error && resolveTree(bracket.R32,state.winners).final[0].w && resolveTree(bracket.R32,state.winners).third[0].w && (
          <button onClick={()=>{ persist({...state, locked:true}); flash("Pronos verrouillés ✓"); }}
            style={{ flex:1, minWidth:200, padding:"14px", background:C.turf, color:"#06140f", border:"none", borderRadius:12,
            fontFamily:DISP, fontWeight:700, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
            ✓ Valider et verrouiller
          </button>
        )}
        {state.locked && (
          <button onClick={()=>{ persist({...state, locked:false}); flash("Pronos déverrouillés"); }}
            style={{ flex:1, minWidth:200, padding:"14px", background:"transparent", color:C.gold, border:`1px solid ${C.gold}`, borderRadius:12,
            fontFamily:DISP, fontWeight:700, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
            Modifier mes pronos
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({active, children, onClick, color=C.turf, disabled}){
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily:DISP, fontWeight:700, fontSize:13.5, letterSpacing:1.2, textTransform:"uppercase",
      padding:"8px 14px", borderRadius:999, whiteSpace:"nowrap", cursor:disabled?"default":"pointer",
      border:`1px solid ${active?color:C.line}`, transition:"all .15s",
      background: active? color : "transparent", color: active? "#06140f" : C.sub, opacity:disabled?.5:1
    }}>{children}</button>
  );
}

/* ---------- Pool editor ---------- */
function PoolesEditor({state, persist}){
  const [open,setOpen] = useState(null);
  return (
    <div style={{ display:"grid", gap:10 }}>
      {GL.map(L=>{
        const matches = groupMatches(L);
        const filled = matches.filter(m=>state.groupPicks[m.id]).length;
        const isOpen = open===L;
        return (
          <Card key={L} style={{ overflow:"hidden" }}>
            <button onClick={()=>setOpen(isOpen?null:L)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 16px", background:"none", border:"none", cursor:"pointer", color:C.ink }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:C.card2, border:`1px solid ${C.line}`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontFamily:DISP, fontWeight:700, fontSize:18, color:C.turf }}>{L}</div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontFamily:DISP, fontWeight:700, fontSize:17 }}>Groupe {L}</div>
                  <div style={{ color:C.sub, fontSize:12 }}>{GROUPS[L].join(" · ")}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontFamily:DISP, fontWeight:700, fontSize:13, color: filled===6?C.turf:C.sub, minWidth:30, textAlign:"right" }}>{filled}/6</div>
                {isOpen?<ChevronUp size={18} color={C.sub}/>:<ChevronDown size={18} color={C.sub}/>}
              </div>
            </button>
            {isOpen && <PoolMatches L={L} state={state} persist={persist}/>}
          </Card>
        );
      })}
    </div>
  );
}

function PoolMatches({L, state, persist}){
  const matches = groupMatches(L);
  const set = (mid,val)=>{
    if(state.locked) return;
    const next = {...state, groupPicks:{...state.groupPicks, [mid]:val}};
    // wipe tie order for this group if standings change
    if(next.tieOrders && next.tieOrders[L]) { next.tieOrders = {...next.tieOrders}; delete next.tieOrders[L]; }
    persist(next);
  };
  const tie = groupHasTie(L,state.groupPicks);
  const complete = groupComplete(L,state.groupPicks);
  return (
    <div style={{ borderTop:`1px solid ${C.lineSoft}`, padding:"6px 10px 14px" }}>
      {matches.map(m=>{
        const p = state.groupPicks[m.id];
        return (
          <div key={m.id} style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8, padding:"10px 6px" }}>
            <div style={{ textAlign:"right", minWidth:0 }}>
              <button disabled={state.locked} onClick={()=>set(m.id, p==="home"?null:"home")} style={{
                background: p==="home"?C.turf:"transparent", border:`1px solid ${p==="home"?C.turf:C.line}`,
                color: p==="home"?"#06140f":C.ink, padding:"8px 10px", borderRadius:10, cursor:state.locked?"default":"pointer",
                width:"100%", textAlign:"right", overflow:"hidden" }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  <Flag t={m.home} size={18}/>
                  <span style={{ fontFamily:DISP, fontWeight:600, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.home}</span>
                </span>
              </button>
            </div>
            <button disabled={state.locked} onClick={()=>set(m.id, p==="draw"?null:"draw")} style={{
              background: p==="draw"?C.gold:"transparent", border:`1px solid ${p==="draw"?C.gold:C.line}`,
              color: p==="draw"?"#1a1300":C.sub, fontFamily:DISP, fontWeight:700, fontSize:13, letterSpacing:1.2,
              padding:"8px 12px", borderRadius:10, cursor:state.locked?"default":"pointer" }}>N</button>
            <div style={{ textAlign:"left", minWidth:0 }}>
              <button disabled={state.locked} onClick={()=>set(m.id, p==="away"?null:"away")} style={{
                background: p==="away"?C.turf:"transparent", border:`1px solid ${p==="away"?C.turf:C.line}`,
                color: p==="away"?"#06140f":C.ink, padding:"8px 10px", borderRadius:10, cursor:state.locked?"default":"pointer",
                width:"100%", textAlign:"left", overflow:"hidden" }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  <Flag t={m.away} size={18}/>
                  <span style={{ fontFamily:DISP, fontWeight:600, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.away}</span>
                </span>
              </button>
            </div>
          </div>
        );
      })}
      {complete && <StandingPanel L={L} state={state} persist={persist} hasTie={tie}/>}
    </div>
  );
}

function StandingPanel({L, state, persist, hasTie}){
  const rows = groupRanking(L, state.groupPicks, state.tieOrders);
  const [editing,setEditing] = useState(false);
  const moveTo = (team, newRank)=>{
    const order = rows.map(r=>r.team);
    const i = order.indexOf(team);
    order.splice(i,1);
    order.splice(newRank-1, 0, team);
    persist({...state, tieOrders:{...state.tieOrders, [L]:order}});
  };
  return (
    <div style={{ marginTop:8, background:C.card2, border:`1px solid ${C.line}`, borderRadius:12, padding:12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Eyebrow>Classement déduit</Eyebrow>
        {hasTie && !state.locked && (
          <button onClick={()=>setEditing(!editing)} style={{ background:"none", border:"none", color:C.gold, cursor:"pointer",
            display:"inline-flex", alignItems:"center", gap:4, fontFamily:DISP, fontWeight:700, fontSize:12, letterSpacing:1 }}>
            <Edit3 size={13}/>{editing?"Terminé":"Départager"}
          </button>
        )}
      </div>
      {hasTie && (
        <div style={{ marginTop:6, fontSize:12, color:C.gold, display:"flex", gap:6, alignItems:"flex-start" }}>
          <Info size={13} style={{flexShrink:0, marginTop:2}}/>
          <span>Égalité de points : {editing?"choisis l'ordre manuellement (1er en haut).":"clique sur 'Départager' pour fixer ton ordre."}</span>
        </div>
      )}
      <div style={{ marginTop:8, display:"grid", gap:4 }}>
        {rows.map((r,i)=>(
          <div key={r.team} style={{ display:"grid", gridTemplateColumns:"28px 1fr auto", alignItems:"center", gap:8,
            padding:"6px 8px", background: i<2? "rgba(39,224,163,.10)" : i===2? "rgba(255,206,92,.10)" : "transparent",
            borderRadius:8 }}>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:14, color: i<2?C.turf : i===2?C.gold : C.dim }}>{r.rank}</div>
            <Team name={r.team} size={14}/>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontFamily:DISP, fontWeight:700, fontSize:14, color:C.ink }}>{r.pts} pt{r.pts>1?"s":""}</div>
              {editing && (
                <select value={r.rank} onChange={e=>moveTo(r.team, parseInt(e.target.value))}
                  style={{ background:C.card, border:`1px solid ${C.line}`, color:C.ink, borderRadius:6, padding:"2px 4px", fontSize:12 }}>
                  {[1,2,3,4].map(n=><option key={n} value={n}>{n}e</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Bracket editor (Partie 1) ---------- */
function BracketEditor({state, persist, bracket}){
  const tree = resolveTree(bracket.R32, state.winners);
  const analysis = thirdsAnalysis(state.groupPicks, state.tieOrders);
  const setWinner = (key, team)=>{
    if(state.locked) return;
    const w = {...state.winners};
    const set = (k, t)=>{ if(t) w[k]=t; else delete w[k]; };
    if(w[key]===team){ delete w[key]; }
    else { w[key]=team; }
    // wipe descendants if changed
    const idx = bracket.R32.findIndex(m=>m.id===key);
    if(idx>=0){
      const i16 = Math.floor(idx/2), i8 = Math.floor(i16/2), i4 = Math.floor(i8/2);
      delete w[`r16_${i16+1}`]; delete w[`qf_${i8+1}`]; delete w[`sf_${i4+1}`]; delete w["final_1"]; delete w["third_1"];
    } else {
      const m = key.match(/^(r16|qf|sf|final)_(\d+)$/);
      if(m){
        const r = m[1], n = parseInt(m[2]);
        if(r==="r16"){ const i8=Math.floor((n-1)/2); delete w[`qf_${i8+1}`]; delete w[`sf_${Math.floor(i8/2)+1}`]; delete w["final_1"]; delete w["third_1"]; }
        if(r==="qf"){ const i4=Math.floor((n-1)/2); delete w[`sf_${i4+1}`]; delete w["final_1"]; delete w["third_1"]; }
        if(r==="sf"){ delete w["final_1"]; delete w["third_1"]; }
      }
    }
    persist({...state, winners:w});
  };
  return (
    <div>
      {analysis.ambiguous && <ThirdsPicker state={state} persist={persist} analysis={analysis}/>}

      <Card style={{ padding:14, marginBottom:12 }}>
        <Eyebrow color={C.gold}>Ton tableau</Eyebrow>
        <p style={{ color:C.sub, fontSize:13, margin:"6px 0 0" }}>
          Calculé à partir de tes pronos de poule. Clique sur l'équipe que tu vois gagner chaque match jusqu'à la finale.
        </p>
      </Card>

      <Round title="16es de finale" matches={tree.r32} onPick={setWinner} locked={state.locked}/>
      <Round title="8es de finale"  matches={tree.r16} onPick={setWinner} locked={state.locked}/>
      <Round title="Quarts de finale" matches={tree.qf} onPick={setWinner} locked={state.locked}/>
      <Round title="Demi-finales" matches={tree.sf} onPick={setWinner} locked={state.locked}/>
      <Round title="Petite finale" matches={tree.third} onPick={setWinner} locked={state.locked} accent={C.sky}/>
      <Round title="Finale" matches={tree.final} onPick={setWinner} locked={state.locked} accent={C.gold} champion/>
    </div>
  );
}

function ThirdsPicker({state, persist, analysis}){
  const need = analysis.need;
  const auto = new Set(analysis.autoIn);
  const cur = new Set(qualifiedThirds(state.groupPicks, state.tieOrders, state.thirdsChoice));
  const toggle = (g)=>{
    if(auto.has(g) || state.locked) return;
    const next = new Set(cur);
    if(next.has(g)) next.delete(g);
    else {
      // ensure size == 8
      const bubblePicked = [...next].filter(x=>!auto.has(x));
      if(bubblePicked.length >= need){
        next.delete(bubblePicked[0]);
      }
      next.add(g);
    }
    persist({...state, thirdsChoice:[...next]});
  };
  return (
    <Card style={{ padding:14, marginBottom:12, borderColor:C.gold }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Info size={16} color={C.gold}/>
        <Eyebrow color={C.gold}>Meilleurs 3es — choisis</Eyebrow>
      </div>
      <p style={{ color:C.sub, fontSize:13, margin:"6px 0 10px" }}>
        Plusieurs 3es sont à égalité. Choisis-en {need} parmi les surlignés (les autres sont déjà qualifiés d'office).
      </p>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {analysis.sorted.map(({group,team,pts})=>{
          const isAuto = auto.has(group);
          const isPicked = cur.has(group);
          const isBubble = analysis.bubble.includes(group);
          return (
            <button key={group} disabled={isAuto||state.locked} onClick={()=>toggle(group)} style={{
              border:`1px solid ${isAuto?C.turf:isPicked?C.gold:C.line}`,
              background: isAuto?"rgba(39,224,163,.15)":isPicked?"rgba(255,206,92,.18)":"transparent",
              color: C.ink, padding:"6px 10px", borderRadius:999, cursor:(isAuto||state.locked)?"default":"pointer",
              display:"inline-flex", alignItems:"center", gap:6, fontFamily:DISP, fontWeight:600, fontSize:13 }}>
              <span style={{color:C.sub}}>{group}</span> <Flag t={team} size={14}/> {team} <span style={{color:C.sub, fontSize:11}}>{pts}pt</span>
              {isAuto && <Check size={12} color={C.turf}/>}
              {isBubble && !isAuto && (isPicked? <Check size={12} color={C.gold}/> : <span style={{ width:12, height:12, border:`1px solid ${C.gold}`, borderRadius:999 }}/>)}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Round({title, matches, onPick, locked, accent=C.turf, champion=false}){
  return (
    <Card style={{ padding:14, marginBottom:10 }}>
      <Eyebrow color={accent}>{title}</Eyebrow>
      <div style={{ marginTop:8, display:"grid", gap:6 }}>
        {matches.map((m,i)=> <BracketMatch key={m.key} m={m} onPick={onPick} locked={locked} accent={accent} champion={champion}/>)}
      </div>
    </Card>
  );
}

function BracketMatch({m, onPick, locked, accent, champion}){
  const Side = ({team, picked, side})=>{
    const ready = !!team;
    return (
      <button disabled={!ready || locked} onClick={()=>onPick(m.key, team)} style={{
        flex:1, minWidth:0, textAlign:"left", padding:"9px 11px",
        background: picked? accent : C.card2, border:`1px solid ${picked?accent:C.line}`, borderRadius:10,
        color: picked? "#06140f" : (ready? C.ink : C.dim), cursor:(ready&&!locked)?"pointer":"default",
        display:"flex", alignItems:"center", gap:8 }}>
        {ready ? <Flag t={team} size={18}/> : <span style={{ width:18, height:14, background:C.line, borderRadius:3, display:"inline-block" }}/>}
        <span style={{ fontFamily:DISP, fontWeight: picked?700:600, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{team||"—"}</span>
        {champion && picked && <Crown size={14} style={{marginLeft:"auto"}}/>}
      </button>
    );
  };
  return (
    <div style={{ display:"flex", alignItems:"stretch", gap:6 }}>
      <Side team={m.a} picked={m.w && m.w===m.a} side="a"/>
      <div style={{ width:18, display:"flex", alignItems:"center", justifyContent:"center", color:C.dim, fontFamily:DISP, fontSize:11 }}>vs</div>
      <Side team={m.b} picked={m.w && m.w===m.b} side="b"/>
    </div>
  );
}

/* =========================================================================
   CLASSEMENTS
   ========================================================================= */
function scoreGroupsForPlayer(player, results){
  // results.groups[matchId] = "home"|"draw"|"away"
  let pts=0, max=0;
  for(const m of ALL_MATCHES){
    const r = results.groups[m.id]; if(!r) continue;
    max++;
    if(player.state.groupPicks[m.id]===r) pts++;
  }
  return {pts, max};
}
function scoreBracketForPlayer(player, results){
  // results.stages = {huitiemes:[teams who reached 8es], quarts:[], demis:[], finale:[], champion:[1]}
  const b = buildBracket(player.state.groupPicks, player.state.tieOrders, player.state.thirdsChoice);
  if(b.error) return {pts:0, max:0, byStage:{huitiemes:0,quarts:0,demis:0,finale:0,champion:0}};
  const tree = resolveTree(b.R32, player.state.winners);
  const st = userStages(tree);
  const real = results.stages || {};
  const stages = ["huitiemes","quarts","demis","finale","champion"];
  const byStage = {}; let pts=0, max=0;
  for(const s of stages){
    const realArr = real[s] || [];
    const myArr = st[s] || [];
    const inter = myArr.filter(t=>realArr.includes(t)).length;
    byStage[s] = inter;
    pts += inter;
    max += realArr.length;
  }
  return {pts, max, byStage};
}

function Classements({players, results, refresh}){
  const [view,setView] = useState("general"); // general | groups | bracket
  useEffect(()=>{ refresh(); /* eslint-disable-next-line */ },[]);
  const scored = players.map(p=>{
    const g = scoreGroupsForPlayer(p, results);
    const b = scoreBracketForPlayer(p, results);
    return { ...p, groupsPts:g.pts, groupsMax:g.max, bracketPts:b.pts, bracketMax:b.max, byStage:b.byStage, total:g.pts+b.pts };
  });
  const sortedBy = (key)=> [...scored].sort((a,b)=> b[key]-a[key] || a.name.localeCompare(b.name));

  return (
    <div>
      <div style={{ margin:"6px 2px 14px" }}>
        <Eyebrow>Classement</Eyebrow>
        <h2 style={{ fontFamily:DISP, fontWeight:700, fontSize:26, margin:"4px 0 0" }}>Partie 1</h2>
        <p style={{ color:C.sub, fontSize:13, margin:"4px 0 0" }}>
          {Object.keys(results.groups||{}).length===0
            ? "Les classements s'activent dès que l'organisateur saisit les premiers résultats."
            : "Mis à jour à chaque résultat saisi."}
        </p>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto" }}>
        <Pill active={view==="general"} onClick={()=>setView("general")}>Général</Pill>
        <Pill active={view==="groups"} onClick={()=>setView("groups")}>Poules</Pill>
        <Pill active={view==="bracket"} onClick={()=>setView("bracket")} color={C.gold}>Phase finale</Pill>
      </div>

      {view==="general" && <Leaderboard rows={sortedBy("total")} valueKey="total" maxKey={null}
        maxFixed={ (results.groups?Object.keys(results.groups).length:0) + (results.stages?Object.values(results.stages).reduce((a,b)=>a+(b?.length||0),0):0) } />}
      {view==="groups" && <Leaderboard rows={sortedBy("groupsPts")} valueKey="groupsPts" maxKey="groupsMax"/>}
      {view==="bracket" && <BracketLeaderboard rows={sortedBy("bracketPts")} />}

      {players.length===0 && <Card style={{ padding:18, textAlign:"center", color:C.sub }}>Aucun joueur pour l'instant.</Card>}
    </div>
  );
}

function Leaderboard({rows, valueKey, maxKey, maxFixed}){
  return (
    <div style={{ display:"grid", gap:8 }}>
      {rows.map((p,i)=>(
        <Card key={p.key} style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, fontFamily:DISP, fontWeight:700, fontSize:20,
            color: i===0?C.gold : i===1?C.sky : i===2?C.coral : C.dim }}>{i+1}</div>
          <div style={{ width:34, height:34, borderRadius:999, background:C.turf, color:"#06140f", fontFamily:DISP, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center" }}>{p.name[0]?.toUpperCase()}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:17 }}>{p.name}</div>
            <div style={{ color:C.sub, fontSize:12 }}>
              {valueKey==="total" ? `Poules ${p.groupsPts} · Tableau ${p.bracketPts}` :
                valueKey==="groupsPts" ? `${p.groupsPts}/${p.groupsMax||0} bons pronos` :
                `${p.bracketPts} équipes bien placées`}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:24, color:C.turf }}>{p[valueKey]}</div>
            <div style={{ color:C.dim, fontSize:11, fontFamily:DISP, fontWeight:700, letterSpacing:1 }}>
              {maxKey ? `/${p[maxKey]||0}` : (maxFixed?`/${maxFixed}`:"PTS")}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BracketLeaderboard({rows}){
  return (
    <div style={{ display:"grid", gap:8 }}>
      {rows.map((p,i)=>(
        <Card key={p.key} style={{ padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, fontFamily:DISP, fontWeight:700, fontSize:20,
              color: i===0?C.gold : i===1?C.sky : i===2?C.coral : C.dim }}>{i+1}</div>
            <div style={{ width:34, height:34, borderRadius:999, background:C.gold, color:"#1a1300", fontFamily:DISP, fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center" }}>{p.name[0]?.toUpperCase()}</div>
            <div style={{ flex:1, fontFamily:DISP, fontWeight:700, fontSize:17 }}>{p.name}</div>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:24, color:C.gold }}>{p.bracketPts}</div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8, fontSize:11, fontFamily:DISP, fontWeight:700, letterSpacing:.8, color:C.sub, flexWrap:"wrap" }}>
            <span>8es: <b style={{color:C.ink}}>{p.byStage.huitiemes}</b></span>
            <span>· Q: <b style={{color:C.ink}}>{p.byStage.quarts}</b></span>
            <span>· Demi: <b style={{color:C.ink}}>{p.byStage.demis}</b></span>
            <span>· Finale: <b style={{color:C.ink}}>{p.byStage.finale}</b></span>
            <span>· Champion: <b style={{color:p.byStage.champion?C.gold:C.ink}}>{p.byStage.champion}</b></span>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* =========================================================================
   JOUEURS
   ========================================================================= */
function Joueurs({players, me}){
  const [open,setOpen] = useState(null);
  return (
    <div>
      <div style={{ margin:"6px 2px 14px" }}>
        <Eyebrow>Les potes</Eyebrow>
        <h2 style={{ fontFamily:DISP, fontWeight:700, fontSize:26, margin:"4px 0 0" }}>{players.length} joueur{players.length>1?"s":""}</h2>
        <p style={{ color:C.sub, fontSize:13, margin:"4px 0 0" }}>Tape sur un nom pour voir ses pronos.</p>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {players.map(p=>{
          const filled = ALL_MATCHES.filter(m=>p.state.groupPicks[m.id]).length;
          const b = buildBracket(p.state.groupPicks, p.state.tieOrders, p.state.thirdsChoice);
          const tree = !b.error ? resolveTree(b.R32, p.state.winners) : null;
          const champ = tree?.final?.[0]?.w;
          const isOpen = open===p.key;
          return (
            <Card key={p.key} style={{ overflow:"hidden" }}>
              <button onClick={()=>setOpen(isOpen?null:p.key)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px", textAlign:"left" }}>
                <div style={{ width:38, height:38, borderRadius:999, background: p.name===me?C.gold:C.turf, color:"#06140f",
                  fontFamily:DISP, fontWeight:700, fontSize:17, display:"flex", alignItems:"center", justifyContent:"center" }}>{p.name[0]?.toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ fontFamily:DISP, fontWeight:700, fontSize:17 }}>{p.name}</div>
                    {p.name===me && <span style={{ color:C.gold, fontFamily:DISP, fontWeight:700, fontSize:10, letterSpacing:1 }}>TOI</span>}
                    {p.state.locked && <Lock size={12} color={C.sub}/>}
                  </div>
                  <div style={{ color:C.sub, fontSize:12 }}>
                    Poules {filled}/72 · Champion : {champ ? <span style={{color:C.gold}}>{FLAG[champ]} {champ}</span> : <span style={{color:C.dim}}>—</span>}
                  </div>
                </div>
                {isOpen?<ChevronUp size={18} color={C.sub}/>:<ChevronDown size={18} color={C.sub}/>}
              </button>
              {isOpen && <PlayerPreview player={p}/>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PlayerPreview({player}){
  const b = buildBracket(player.state.groupPicks, player.state.tieOrders, player.state.thirdsChoice);
  if(b.error) return <div style={{ padding:14, color:C.sub, fontSize:13, borderTop:`1px solid ${C.lineSoft}` }}>Tableau pas encore constructible.</div>;
  const tree = resolveTree(b.R32, player.state.winners);
  const st = userStages(tree);
  return (
    <div style={{ borderTop:`1px solid ${C.lineSoft}`, padding:"10px 14px 14px" }}>
      <Eyebrow>Son parcours prédit</Eyebrow>
      <Line label="Champion" arr={st.champion} color={C.gold}/>
      <Line label="Finalistes" arr={st.finale} color={C.coral}/>
      <Line label="Demi-finalistes" arr={st.demis}/>
      <Line label="Quart de finale" arr={st.quarts}/>
    </div>
  );
}
function Line({label, arr, color=C.ink}){
  if(!arr || arr.length===0) return null;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontFamily:DISP, fontWeight:700, fontSize:11, letterSpacing:1.5, color:C.sub }}>{label.toUpperCase()}</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
        {arr.map(t=>(
          <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 8px",
            background:C.card2, border:`1px solid ${C.line}`, borderRadius:999, fontSize:13 }}>
            <Flag t={t} size={15}/><span style={{ fontFamily:DISP, fontWeight:600, color }}>{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   PARTIE 2 — placeholder (s'ouvre fin juin avec le vrai tableau)
   ========================================================================= */
function Partie2(){
  return (
    <div>
      <div style={{ margin:"6px 2px 14px" }}>
        <Eyebrow color={C.gold}>Partie 2</Eyebrow>
        <h2 style={{ fontFamily:DISP, fontWeight:700, fontSize:26, margin:"4px 0 0" }}>Phase finale réelle</h2>
      </div>
      <Card style={{ padding:20, background:`linear-gradient(135deg, ${C.card} 0%, rgba(255,206,92,.10) 200%)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, color:C.gold }}>
          <Lock size={18}/><div style={{ fontFamily:DISP, fontWeight:700, fontSize:20 }}>Ouverture le 28 juin</div>
        </div>
        <p style={{ color:C.sub, fontSize:14, marginTop:10, lineHeight:1.55 }}>
          Une fois la phase de poules réelle terminée, le tableau officiel sera connu. Une <b style={{color:C.ink}}>deuxième partie</b> démarrera ici : tu paries match par match les vrais affrontements jusqu'à la finale du 19 juillet.
        </p>
        <div style={{ marginTop:14, padding:12, background:C.card2, border:`1px solid ${C.line}`, borderRadius:10 }}>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:13, color:C.turf, letterSpacing:1 }}>RÈGLES PARTIE 2</div>
          <div style={{ color:C.sub, fontSize:13, marginTop:6 }}>• 1 pt par vrai match dont tu trouves le vainqueur.</div>
          <div style={{ color:C.sub, fontSize:13 }}>• Classement séparé de la Partie 1.</div>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
   ORGANISATEUR — saisie des vrais résultats
   ========================================================================= */
function Organisateur({results, setResults, flash}){
  const [view,setView] = useState("groups"); // groups | stages
  const update = (next)=>{ setResults(next); sSet("results", next); };
  return (
    <div>
      <div style={{ margin:"6px 2px 14px" }}>
        <Eyebrow color={C.sky}>Organisateur</Eyebrow>
        <h2 style={{ fontFamily:DISP, fontWeight:700, fontSize:26, margin:"4px 0 0" }}>Saisie des résultats</h2>
        <p style={{ color:C.sub, fontSize:13, margin:"4px 0 0" }}>Renseigne les vrais résultats au fil du tournoi. Les classements se mettent à jour automatiquement.</p>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <Pill active={view==="groups"} onClick={()=>setView("groups")}>Matchs de poules</Pill>
        <Pill active={view==="stages"} onClick={()=>setView("stages")} color={C.gold}>Phase finale</Pill>
      </div>
      {view==="groups" && <OrgaGroups results={results} update={update} flash={flash}/>}
      {view==="stages" && <OrgaStages results={results} update={update} flash={flash}/>}
    </div>
  );
}

function OrgaGroups({results, update, flash}){
  const [open,setOpen] = useState(null);
  const set = (mid, val)=>{
    const g = {...(results.groups||{})};
    if(g[mid]===val) delete g[mid]; else g[mid]=val;
    update({...results, groups:g});
    flash("Résultat enregistré");
  };
  return (
    <div style={{ display:"grid", gap:10 }}>
      {GL.map(L=>{
        const matches = groupMatches(L);
        const filled = matches.filter(m=>(results.groups||{})[m.id]).length;
        const isOpen = open===L;
        return (
          <Card key={L}>
            <button onClick={()=>setOpen(isOpen?null:L)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 14px", background:"none", border:"none", cursor:"pointer", color:C.ink }}>
              <div style={{ fontFamily:DISP, fontWeight:700, fontSize:17 }}>Groupe {L}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:DISP, fontWeight:700, fontSize:13, color:filled===6?C.turf:C.sub }}>{filled}/6</span>
                {isOpen?<ChevronUp size={18} color={C.sub}/>:<ChevronDown size={18} color={C.sub}/>}
              </div>
            </button>
            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.lineSoft}`, padding:"4px 10px 12px" }}>
                {matches.map(m=>{
                  const r = (results.groups||{})[m.id];
                  return (
                    <div key={m.id} style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8, padding:"8px 4px" }}>
                      <button onClick={()=>set(m.id,"home")} style={{ background:r==="home"?C.turf:"transparent", border:`1px solid ${r==="home"?C.turf:C.line}`,
                        color:r==="home"?"#06140f":C.ink, padding:"7px 9px", borderRadius:10, cursor:"pointer", textAlign:"right" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><Flag t={m.home} size={16}/>
                        <span style={{ fontFamily:DISP, fontWeight:600, fontSize:13.5 }}>{m.home}</span></span>
                      </button>
                      <button onClick={()=>set(m.id,"draw")} style={{ background:r==="draw"?C.gold:"transparent", border:`1px solid ${r==="draw"?C.gold:C.line}`,
                        color:r==="draw"?"#1a1300":C.sub, fontFamily:DISP, fontWeight:700, fontSize:13, padding:"7px 11px", borderRadius:10, cursor:"pointer" }}>N</button>
                      <button onClick={()=>set(m.id,"away")} style={{ background:r==="away"?C.turf:"transparent", border:`1px solid ${r==="away"?C.turf:C.line}`,
                        color:r==="away"?"#06140f":C.ink, padding:"7px 9px", borderRadius:10, cursor:"pointer", textAlign:"left" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><Flag t={m.away} size={16}/>
                        <span style={{ fontFamily:DISP, fontWeight:600, fontSize:13.5 }}>{m.away}</span></span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function OrgaStages({results, update, flash}){
  const stages = [
    { key:"huitiemes", label:"Équipes en 8es (16 max)", cap:16, color:C.ink },
    { key:"quarts", label:"Quarts de finale (8 max)", cap:8, color:C.ink },
    { key:"demis", label:"Demi-finalistes (4 max)", cap:4, color:C.coral },
    { key:"finale", label:"Finalistes (2 max)", cap:2, color:C.gold },
    { key:"champion", label:"Champion du monde (1)", cap:1, color:C.gold },
  ];
  const st = results.stages || {huitiemes:[],quarts:[],demis:[],finale:[],champion:[]};
  const toggle = (stage, team, cap)=>{
    const arr = [...(st[stage]||[])];
    const i = arr.indexOf(team);
    if(i>=0) arr.splice(i,1);
    else { if(arr.length>=cap) arr.shift(); arr.push(team); }
    const nextStages = {...st, [stage]:arr};
    update({...results, stages:nextStages});
    flash("Mis à jour");
  };
  const [openStage,setOpenStage] = useState("huitiemes");
  const allTeams = Object.values(GROUPS).flat().sort();
  return (
    <div style={{ display:"grid", gap:10 }}>
      <Card style={{ padding:14 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
          <Info size={16} color={C.sky} style={{flexShrink:0, marginTop:2}}/>
          <p style={{ color:C.sub, fontSize:13, margin:0 }}>
            Coche les équipes qui atteignent chaque tour. Les points des joueurs sont calculés au fur et à mesure.
          </p>
        </div>
      </Card>
      {stages.map(s=>{
        const arr = st[s.key]||[];
        const isOpen = openStage===s.key;
        return (
          <Card key={s.key}>
            <button onClick={()=>setOpenStage(isOpen?null:s.key)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 14px", background:"none", border:"none", cursor:"pointer", color:C.ink }}>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:DISP, fontWeight:700, fontSize:16, color:s.color }}>{s.label}</div>
                <div style={{ color:C.sub, fontSize:12, marginTop:2 }}>{arr.length}/{s.cap} sélectionnées</div>
              </div>
              {isOpen?<ChevronUp size={18} color={C.sub}/>:<ChevronDown size={18} color={C.sub}/>}
            </button>
            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.lineSoft}`, padding:"10px 12px 14px" }}>
                {arr.length>0 && (
                  <div style={{ marginBottom:10, display:"flex", flexWrap:"wrap", gap:6 }}>
                    {arr.map(t=>(
                      <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 8px",
                        background:s.color==C.gold?"rgba(255,206,92,.16)":"rgba(39,224,163,.14)", border:`1px solid ${s.color===C.gold?C.gold:C.turf}`,
                        borderRadius:999, fontSize:13 }}>
                        <Flag t={t} size={15}/><span style={{ fontFamily:DISP, fontWeight:600 }}>{t}</span>
                        <button onClick={()=>toggle(s.key, t, s.cap)} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer", padding:0, lineHeight:0 }}><X size={13}/></button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {allTeams.filter(t=>!arr.includes(t)).map(t=>(
                    <button key={t} onClick={()=>toggle(s.key, t, s.cap)} style={{
                      display:"inline-flex", alignItems:"center", gap:5, padding:"4px 8px",
                      background:"transparent", border:`1px solid ${C.line}`, borderRadius:999, cursor:"pointer", color:C.sub, fontSize:12.5 }}>
                      <Flag t={t} size={14}/><span style={{ fontFamily:DISP, fontWeight:600 }}>{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
