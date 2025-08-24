// shared/date-range-popup.js
import { toISODate } from './utils.js';

class DateRangePopup extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this.view   = new Date();   // pierwszy dzień widocznego miesiąca
    this.start  = null;         // Date
    this.end    = null;         // Date
    this._hover = null;         // Date (podgląd po pierwszym kliknięciu)
    this._locked = false;       // po save/cancel ignorujemy dalsze interakcje
  }

  connectedCallback(){ this.render(); }
  setRange(s,e){
    this.start  = s ? new Date(s) : null;
    this.end    = e ? new Date(e) : null;
    this._hover = null;
    this._locked = false;
    this.renderGrid();
  }
  setMonth(d){
    this.view = new Date(d.getFullYear(), d.getMonth(), 1);
    this.renderGrid();
  }

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
        .in{background:#ddd6fe}       /* finalny zakres */
        .preview{background:#eee8ff}  /* podgląd zakresu (lżejszy) */
        .sel{background:#a78bfa;color:white}
        .tags{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem}
        /* style przycisków zgodne z client-picker: .btn, .primary, .full */
        .btn{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:.35rem .7rem;cursor:pointer}
        .btn.primary{background:var(--accent,#6d28d9);border-color:var(--accent,#6d28d9);color:#fff}
        .btn.full{width:100%}
        .bar{display:flex;justify-content:flex-end;margin-top:.5rem;gap:.35rem}
      </style>
      <div class="pop">
        <div class="hdr">
          <button class="btn prev" type="button" aria-label="Poprzedni miesiąc">‹</button>
          <strong class="title"></strong>
          <button class="btn next" type="button" aria-label="Następny miesiąc">›</button>
        </div>
        <div class="grid head"></div>
        <div class="grid days"></div>

        <div class="tags">
          <button class="btn preset" data-p="today">Dziś</button>
          <button class="btn preset" data-p="tomorrow">Jutro</button>
          <button class="btn preset" data-p="week">Bieżący tydzień</button>
          <button class="btn preset" data-p="nextweek">Następny tydzień</button>
        </div>

        <div class="bar">
          <button class="btn cancel" type="button">Anuluj</button>
          <button class="btn primary save" type="button">Zapisz</button>
        </div>
      </div>
    `;

    s.querySelector('.grid.head').innerHTML =
      ['Pn','Wt','Śr','Cz','Pt','So','Nd']
      .map(x=>`<div class="cell" style="font-weight:700;cursor:default">${x}</div>`).join('');

    s.querySelector('.prev').onclick = ()=>{ if(this._locked) return; this.setMonth(new Date(this.view.getFullYear(),this.view.getMonth()-1,1)); };
    s.querySelector('.next').onclick = ()=>{ if(this._locked) return; this.setMonth(new Date(this.view.getFullYear(),this.view.getMonth()+1,1)); };

    s.querySelector('.cancel').onclick = ()=>{
      if(this._locked) return;
      this._locked = true;
      this.dispatchEvent(new CustomEvent('cancel'));
    };

    s.querySelector('.save').onclick = ()=>{
      if(this._locked) return;
      if(!this.start) return;
      this._locked = true;
      this.#emitSave(this.start, this.end || this.start);
    };

    s.querySelectorAll('.preset').forEach(b=>b.addEventListener('click', ()=>{
      if(this._locked) return;
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

  #emitSave(startDate, endDate){
    // normalizacja (bez godzin, bez TZ): przez toISODate
    const sISO = toISODate(startDate);
    const eISO = toISODate(endDate);
    this.dispatchEvent(new CustomEvent('save', { detail:{ start:sISO, end:eISO } }));
  }

  renderGrid(){
    const s=this.shadowRoot;
    s.querySelector('.title').textContent = this.view.toLocaleString('pl-PL',{month:'long',year:'numeric'});

    const firstIdx = ((new Date(this.view.getFullYear(),this.view.getMonth(),1)).getDay()+6)%7;
    const y=this.view.getFullYear(), m=this.view.getMonth();
    const start=new Date(y,m,1-firstIdx);

    const between = (d,a,b)=>{
      // porównujemy po ISO (yyyy-mm-dd) aby nie wpaść w pułapki strefy
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

      const isSel = this.start && (toISODate(d)===toISODate(this.start));
      const inSel = (this.start && this.end) ? between(d, this.start, this.end) : false;
      const inPreview = (!this._locked && this.start && !this.end && this._hover) ? between(d, this.start, this._hover) : false;

      days.push(`<div class="cell ${dim} ${inSel?'in':''} ${inPreview?'preview':''} ${isSel?'sel':''}" data-date="${toISODate(d)}">${d.getDate()}</div>`);
    }
    s.querySelector('.grid.days').innerHTML = days.join('');

    // Interakcje komórek
    s.querySelectorAll('.grid.days .cell').forEach(c=>{
      const onEnter = ()=>{
        if(this._locked) return;
        if(this.start && !this.end){
          this._hover = new Date(c.dataset.date);
          this.renderGrid();
        }
      };
      const onClick = ()=>{
        if(this._locked) return;
        // używamy znormalizowanej daty z data-date (yyyy-mm-dd)
        const d = new Date(c.dataset.date);

        if(!this.start || (this.start && this.end)){
          // 1. klik – zaczynamy nowy zakres
          this.start = d; this.end = null; this._hover = d;
          this.renderGrid();
        } else {
          // 2. klik – domykamy i NATYCHMIAST zapisujemy (i blokujemy dalszy podgląd)
          this.end = d < this.start ? this.start : d;
          this.start = d < this.start ? d : this.start;
          this._hover = null;
          this._locked = true;
          this.#emitSave(this.start, this.end);
          // NIE renderujemy ponownie, żeby nie odpalać kolejnego preview podczas zamykania
        }
      };
      c.addEventListener('mouseenter', onEnter);
      c.addEventListener('click', onClick);
    });
  }
}
customElements.define('date-range-popup', DateRangePopup);
