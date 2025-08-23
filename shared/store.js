import { parseRange } from './utils.js';

const pid = new URLSearchParams(location.search).get('pid') || 'p1';
const SAVE_KEY = 'bbf:proj:'+pid;
const REG_KEY  = 'bbf:projects';
const TODO_KEY = pid+':bbf:todo';
const EV_KEY   = pid+':bbf:events';
const POST_KEY = pid+':bbf:posts';

const SEED = {
  id: pid, name:'Demo projekt', client:'Acme', description:'Spot reklamowy',
  budget:120000, fee:8, margin:22,
  periods:{
    sale:'2025-08-01–2025-08-05', pre:'2025-08-06–2025-08-10',
    prod:'2025-08-11–2025-08-20', post:'2025-08-21–2025-08-28',
    fix:'2025-08-29–2025-08-30'
  }
};

function deepMerge(a,b){
  const r = JSON.parse(JSON.stringify(a||{}));
  for (const k in (b||{})){
    if (b[k] && typeof b[k]==='object' && !Array.isArray(b[k])) r[k]=deepMerge(r[k],b[k]);
    else r[k]=b[k];
  }
  return r;
}

export function load(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    const merged = deepMerge(SEED, base);
    ['sale','pre','prod','post','fix'].forEach(k=>{
      if(!merged.periods[k]){
        const iso=new Date().toISOString().slice(0,10);
        merged.periods[k]=`${iso}–${iso}`;
      }
    });
    return merged;
  } catch(e){ return SEED; }
}

export function save(part){
  try {
    const cur = load();
    const next = deepMerge(cur, part);
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));

    let reg=[]; try{ const raw=localStorage.getItem(REG_KEY); if(raw) reg=JSON.parse(raw)||[]; }catch(e){}
    const i=reg.findIndex(x=>x.id===pid);
    const entry={id:pid,name:next.name||cur.name||SEED.name,client:next.client||cur.client||SEED.client};
    if(i>-1) reg[i] = { ...reg[i], ...entry }; else reg.push(entry);
    try{ localStorage.setItem(REG_KEY, JSON.stringify(reg)); }catch(e){}
  } catch(e){}
}

export const store = {
  pid, keys:{SAVE_KEY,REG_KEY,TODO_KEY,EV_KEY,POST_KEY},

  // project
  get project(){ return load(); },
  setProject(part){ save(part); },

  // clients
  getClients(){
    let x=[]; try{ const raw=localStorage.getItem('bbf:clients'); if(raw) x=JSON.parse(raw)||[]; }catch(e){}
    try{
      const raw=localStorage.getItem(REG_KEY);
      if(raw){ (JSON.parse(raw)||[]).forEach(r=>{ if(r.client && !x.includes(r.client)) x.push(r.client); }); }
    }catch(e){}
    return x.sort((a,b)=>a.localeCompare(b,'pl',{sensitivity:'base'}));
  },
  setClients(list){ try{ localStorage.setItem('bbf:clients', JSON.stringify(list||[])); }catch(e){} },

  // todos
  loadTodos(){
    try{ const r=localStorage.getItem(TODO_KEY); if(r) return JSON.parse(r); }catch(e){}
    return [
      {text:"Przygotować draft planu pracy",done:false,id:cryptoId()},
      {text:"Kontakt z klientem ws. terminów",done:false,id:cryptoId()},
      {text:"Weryfikacja kosztorysu v1",done:true,id:cryptoId()}
    ];
  },
  saveTodos(list){ try{ localStorage.setItem(TODO_KEY,JSON.stringify(list)); }catch(e){} },

  // events
  loadEvents(){
    try{ const r=localStorage.getItem(EV_KEY); if(r) return JSON.parse(r); }catch(e){}
    const today = new Date().toISOString().slice(0,10);
    return [{id:cryptoId(),title:"Plan zdjęć D1",type:"plan",start:`${today}T09:00`,end:`${today}T18:00`}];
  },
  saveEvents(list){ try{ localStorage.setItem(EV_KEY,JSON.stringify(list)); }catch(e){} },

  // board posts
  loadPosts(){
    try{ const r=localStorage.getItem(POST_KEY); if(r) return JSON.parse(r); }catch(e){}
    return [];
  },
  savePosts(list){ try{ localStorage.setItem(POST_KEY,JSON.stringify(list)); }catch(e){} },

  parseRange
};

export function cryptoId(){ return Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2); }
