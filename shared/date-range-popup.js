// shared/date-range-popup.js
// Kompaktowy popup wyboru zakresu: czysty grid, nawigacja miesiącami, zapisz/anuluj

customElements.define('date-range-popup', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this._month = new Date(); this._start=null; this._end=null; }
  connectedCallback(){ this.render(); }
  setMonth(d){ this._month = new Date(d); this._paint(); }
  setRange(s,e){ this._start = s? new Date(s) : null; this._end = e? new Date(e) : null; this._paint(); }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text,#0f172a)}
        .wrap{width:268px}
        .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem}
        .mon{font-weight:700}
        .nav button{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:.18rem .45rem;cursor:pointer}
        .dow{display:grid;grid-template-columns:repeat(7,1fr);gap:.2rem;margin:.2rem 0 .1rem 0;font-size:.78rem;opacity:.65;text-align:center}
        .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.2rem}
        .day{height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer}
        .day:hover{background:var(--muted)}
        .in{background:rgba(109,40,217,.12)}
        .sel{outline:2px solid var(--accent,#6d28d9)}
        .foot{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.5rem}
        .btn{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:.35rem .7rem;cursor:pointer}
        .btn.primary{background:var(--accent,#6d28d9);border-color:var(--accent,#6d28d9);color:#fff}
      </style>
      <div class="wrap">
        <div class="hdr">
          <div class="mon"></div>
          <div class="nav">
            <button class="prev" type="button">‹</button>
            <button class="next" type="button">›</button>
          </div>
        </div>
        <div class="dow">Pn Wt Śr Cz Pt So Nd</div>
        <div class="grid"></div>
        <div class="foot">
          <button class="btn cancel" type="button">Anuluj</button>
          <button class="btn primary ok" type="button">Zapisz</button>
        </div>
      </div>
    `;
    this.shadowRoot.querySelector('.prev').addEventListener('click', ()=>{ this._month.setMonth(this._month.getMonth()-1); this._paint(); });
    this.shadowRoot.querySelector('.next').addEventListener('click', ()=>{ this._month.setMonth(this._month.getMonth()+1); this._paint(); });
    this.shadowRoot.querySelector('.cancel').addEventListener('click', ()=> this.dispatchEvent(new CustomEvent('cancel')));
    this.shadowRoot.querySelector('.ok').addEventListener('click', ()=> this._emitSave());
    this._paint();
  }

  _emitSave(){
    if(!this._start || !this._end) return;
    const iso = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    this.dispatchEvent(new CustomEvent('save', {detail:{start:iso(this._start), end:iso(this._end)}}));
  }

  _paint(){
    const s=this.shadowRoot;
    if(!s) return;
    const mon=s.querySelector('.mon');
    const grid=s.querySelector('.grid');
    const m=new Date(this._month.getFullYear(), this._month.getMonth(), 1);
    const monthName=m.toLocaleDateString('pl-PL',{month:'long', year:'numeric'});
    mon.textContent = monthName[0].toUpperCase()+monthName.slice(1);
    grid.innerHTML='';

    const firstDow=(m.getDay()+6)%7; // 0=Pn
    const daysInMonth=new Date(m.getFullYear(), m.getMonth()+1, 0).getDate();
    const cells = [];
    for(let i=0;i<firstDow;i++) cells.push(null);
    for(let d=1; d<=daysInMonth; d++) cells.push(new Date(m.getFullYear(), m.getMonth(), d));

    const inRange = (d)=> (this._start && this._end) && d>=this._start && d<=this._end;

    cells.forEach(d=>{
      const el=document.createElement('div');
      el.className='day';
      if(d){
        el.textContent=String(d.getDate());
        el.dataset.date=d.toISOString().slice(0,10);
        if(inRange(d)) el.classList.add('in');
        if(this._start && d.getTime()===this._start.getTime()) el.classList.add('sel');
        if(this._end   && d.getTime()===this._end.getTime()) el.classList.add('sel');
        el.addEventListener('click', ()=>{
          if(!this._start || (this._start && this._end)){
            this._start=d; this._end=null; this._paint();
          }else{
            if(d < this._start){ this._end = this._start; this._start = d; }
            else { this._end = d; }
            this._paint();
          }
        });
      }else{
        el.classList.add('empty');
      }
      grid.appendChild(el);
    });
  }
});
