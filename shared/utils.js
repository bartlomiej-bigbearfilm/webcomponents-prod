// Esc / formaty
export const escHtml = (s) =>
  String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
           .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export const fmtPL = (n)=> (n||0).toLocaleString('pl-PL');
export const fmtCurrency = (z)=> `${fmtPL(z)} zł`;

export function parseDateLocal(s){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');
  if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  return new Date(s);
}

export function toISODate(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10); }

// Zakresy "YYYY-MM-DD–YYYY-MM-DD" (en dash)
export function parseRange(r){
  if(!r) return null;
  const p=r.split('–');
  const s=parseDateLocal(p[0].trim());
  const e=parseDateLocal((p[1]||p[0]).trim());
  return {s,e};
}

export function fmtShort(d){
  const dd=String(d.getDate()).padStart(2,'0');
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const yy=String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

// Kolory
export const phaseColors = { sale:'#f59e0b', pre:'#ef4444', prod:'#10b981', post:'#60a5fa', fix:'#a78bfa' };

// Pozycjonowanie popovera
export function placePopover(pop, anchor, gap=6){
  const r=anchor.getBoundingClientRect();
  pop.style.left = Math.min(window.innerWidth - pop.offsetWidth - 8, Math.max(8, r.left))+'px';
  pop.style.top  = (r.bottom + gap)+'px';
}
