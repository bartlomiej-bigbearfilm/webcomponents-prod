// shared/date-range-popup.js
import { toISODate } from './utils.js';

class DateRangePopup extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this.view=new Date();
    this.start=null;
    this.end=null;
    this._hover=null; // <- podgląd zakresu po pierwszym kliknięciu
  }
  connectedCallback(){ this.render(); }
  setRange(s,e){ this.start=s?new Date(s):null; this.end=e?new Date(e):null; this._hover=null; this.renderGrid(); }
  setMonth(d){ this.view=new Date(d.getFullYear(), d.getMonth(), 1); this.renderGrid(); }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{all:initial;contain:content}
        .pop{font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color: var(--text, #0f172a)}
        .hdr{display:flex;align-items:center;justify-content:space-between;gap:.4rem;margin-bottom:.4rem}
        .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
        .cell{padding:.35rem .3rem;text-align:center;border-radius:8px;cursor:pointer;border:1px solid transparent}
        .cell:hover{background:var(--muted,#f0f2f8)}
        .dim{opacity:.45}
        .in{background:#ddd6fe}       /* finalny wybrany zakres */
        .preview{background:#eee8ff}  /* podgląd zakresu podczas ruchu myszką */
        .sel{background:#a78bfa;color:white}
        .tags{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem}
        .btn{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:.25rem .6rem;cursor:pointer}
        .btn.primary{background:var(--accent,#6d28d9);border-color:var(--accent,#6d28d9);color:#fff}
      </style>
      <div class="pop">
        <div class="hdr">
          <button class="btn prev">‹</button>
          <strong class="title"></strong>
          <button class="btn next">›</button>
        </div>
        <div class="grid head"></div>
        <div class="grid days"></div>
        <div class="tags">
          <button class="btn preset" data-p="today">Dziś</button>
          <button class="btn preset" data-p="tomorrow">Jutro</button>
          <button class="btn preset" data-p="week">Bieżący tydzień</button>
          <button class="btn preset" data-p="nextweek">Następny tydzień</button>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:.5rem;gap:.35rem">
          <button class="btn cancel">Anuluj</button>
          <button class="btn primary save">Zapisz</button>
        </div>
      </div>
    `;
    s.querySelector('.grid.head').innerHTML =
      ['Pn','Wt','Śr','Cz','Pt','So','Nd']
      .map(x=>`<div class="cell" style="font-weight:700;cursor:default">${x}</div>`).join('');

    s.querySelector('.prev').onclick = ()=>{ this.setMonth(new Date(this.view.getFullYear(),this.view.getMonth()-1,1)); };
    s.querySelector('.next').onclick = ()=>{ this.setMonth(new Date(this.view.getFullYear(),this.view.getMonth()+1,1)); };

    // ✅ Anuluj: emituj 'cancel' (popover nasłuchuje i zamknie)
    s.querySelector('.cancel').onclick = ()=> {
      this.dispatchEvent(new CustomEvent('cancel'));
    };

    // „Zapisz” – jak wcześniej
    s.querySelector('.save').onclick = ()=>{
      if(!this.start) return;
      const sISO=toISODate(this.start);
      const eISO=toISODate(this.end||this.start);
      this.dispatchEvent(new CustomEvent('save',{detail:{start:sISO,end:eISO}}));
    };

    // Presety jak wcześniej
    s.querySelectorAll('.preset').forEach(b=>b.addEventListener('click', ()=>{
      const now=new Date(); const dow=(now.getDay()+6)%7;
      if(b.dataset.p==='today'){ this.start=now; this.end=now; }
      if(b.dataset.p==='tomorrow'){ const t=new Date(now); t.setDate(t.getDate()+1); this.start=t; this.end=t; }
      if(b.dataset.p==='week'){ const st=new Date(now); st.setDate(st.getDate()-dow); const en=new Date(st); en.setDate(en.getDate()+6); this.start=st; this.end=en; }
      if(b.dataset.p==='nextweek'){ const st=new Date(now); st.setDate(st.getDate()+(7-dow)); const en=new Date(st); en.setDate(en.getDate()+6); this.start=st; this.end=en; }
      this._hover=null;
      this.renderGrid();
    }));

    this.renderGrid();
  }

  renderGrid(){
    const s=this.shadowRoot;
    s.querySelector('.title').textContent = this.view.toLocaleString('pl-PL',{month:'long',year:'numeric'});

    const firstIdx = ((new Date(this.view.getFullYear(),this.view.getMonth(),1)).getDay()+6)%7;
    const y=this.view.getFullYear(), m=this.view.getMonth();
    const start=new Date(y,m,1-firstIdx);

    const isoStart = this.start ? toISODate(this.start) : null;

    const between = (d,a,b)=>{
      const dd = new Date(toISODate(d));
      const aa = new Date(toISODate(a));
      const bb = new Date(toISODate(b));
      const [lo,hi] = aa<=bb ? [aa,bb] : [bb,aa];
      return dd>=lo && dd<=hi;
    };

    const days=[];
    for(let i=0;i<42;i++){
      const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      const inMonth=d.getMonth()===m;
      const dim = inMonth? '' : 'dim';
      const isSel = isoStart && toISODate(d)===isoStart;
      const inSel = (this.start && this.end) ? between(d, this.start, this.end) : false;
      const inPreview = (this.start && !this.end && this._hover) ? between(d, this.start, this._hover) : false;

      days.push(`<div class="cell ${dim} ${inSel?'in':''} ${inPreview?'preview':''} ${isSel?'sel':''}" data-date="${d.toISOString()}">${d.getDate()}</div>`);
    }
    s.querySelector('.grid.days').innerHTML = days.join('');

    s.querySelectorAll('.grid.days .cell').forEach(c=>{
      // podgląd zakresu tylko w trybie „po pierwszym kliknięciu”
      c.addEventListener('mouseenter', ()=>{
        if(this.start && !this.end){
          this._hover = new Date(c.dataset.date);
          this.renderGrid();
        }
      });

      c.addEventListener('click', ()=>{
        const d=new Date(c.dataset.date);

        if(!this.start || (this.start && this.end)){
          // 1. klik – zaczynamy nowy zakres
          this.start=d; this.end=null; this._hover=d;
          this.renderGrid();
        } else {
          // 2. klik – domykamy zakres i OD RAZU AKCEPTUJEMY (save)
          if(d < this.start){ this.end=this.start; this.start=d; }
          else this.end=d;
          const sISO=toISODate(this.start);
          const eISO=toISODate(this.end);
          this._hover=null;
          this.renderGrid(); // tylko żeby na moment pokazać finalny stan
          this.dispatchEvent(new CustomEvent('save',{detail:{start:sISO,end:eISO}}));
        }
      });
    });
  }
}
customElements.define('date-range-popup', DateRangePopup);
