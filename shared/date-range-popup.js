// shared/date-range-popup.js
// Minimalny popup zakresu dat: wybór od-do, HOVER maluje cały potencjalny zakres

customElements.define('date-range-popup', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this._month = new Date(); this._start=null; this._end=null; this._anchor=null; this._hover=null; }
  connectedCallback(){ this.render(); }
  setMonth(d){ this._month = new Date(d); this.renderBody(); }
  setRange(s,e){ this._start = s? new Date(s) : null; this._end = e? new Date(e) : null; }
  get value(){ return {start:this._start, end:this._end}; }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text,#0f172a)}
        .wrap{width:280px}
        .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}
        .nav button{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:.2rem .5rem;cursor:pointer}
        .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.2rem}
        .dow{opacity:.6;font-size:.8rem;text-align:center;margin-bottom:.2rem}
        .day{height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;position:relative}
        .day:hover{background:var(--muted)}
        .day.in-range, .day.hover-range{background:rgba(109,40,217,.14)}
        .day.start::after, .day.end::after{
          content:'';position:absolute;inset:auto 0 0 0;height:3px;background:var(--accent,#6d28d9);border-radius:3px;
        }
        .foot{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.6rem}
        .btn{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:.35rem .7rem;cursor:pointer}
        .btn.primary{background:var(--accent,#6d28d9);border-color:var(--accent,#6d28d9);color:#fff}
      </style>
      <div class="wrap">
        <div class="hdr">
          <div class="month"></div>
          <div class="nav">
            <button class="prev">‹</button>
            <button class="next">›</button>
          </div>
        </div>
        <div class="dow">Pn Wt Śr Cz Pt So Nd</div>
        <div class="grid"></div>
        <div class="foot">
          <button class="btn cancel">Anuluj</button>
          <button class="btn primary ok">Zapisz</button>
        </div>
      </div>
    `;
    s.querySelector('.prev').addEventListener('click', ()=>{ this._month.setMonth(this._month.getMonth()-1); this.renderBody(); });
    s.querySelector('.next').addEventListener('click', ()=>{ this._month.setMonth(this._month.getMonth()+1); this.renderBody(); });
    s.querySelector('.cancel').addEventListener('click', ()=> this.dispatchEvent(new CustomEvent('cancel')));
    s.querySelector('.ok').addEventListener('click', ()=>{
      if(!this._start || !this._end) return;
      const iso = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      this.dispatchEvent(new CustomEvent('save', {detail:{start:iso(this._start), end:iso(this._end)}}));
    });
    this.renderBody();
  }

  renderBody(){
    const s=this.shadowRoot;
    const monthEl=s.querySelector('.month');
    const grid=s.querySelector('.grid');
    const m=new Date(this._month.getFullYear(), this._month.getMonth(), 1);
    const monthName=m.toLocaleDateString('pl-PL',{month:'long', year:'numeric'});
    monthEl.textContent = monthName[0].toUpperCase()+monthName.slice(1);
    grid.innerHTML='';

    const firstDow=(m.getDay()+6)%7; // 0=Pn
    const daysInMonth=new Date(m.getFullYear(), m.getMonth()+1, 0).getDate();
    const cells = [];
    for(let i=0;i<firstDow;i++) cells.push(null);
    for(let d=1; d<=daysInMonth; d++) cells.push(new Date(m.getFullYear(), m.getMonth(), d));

    const inSelRange = (d)=>{
      if(this._start && this._end) return d>=this._start && d<=this._end;
      if(this._anchor && this._hover){
        const a=this._anchor, h=this._hover;
        const [lo,hi] = a<=h ? [a,h] : [h,a];
        return d>=lo && d<=hi;
      }
      return false;
    };
    const isStart = (d)=> this._start && d.getTime()===this._start.getTime();
    const isEnd   = (d)=> this._end   && d.getTime()===this._end.getTime();

    cells.forEach(d=>{
      const btn=document.createElement('div');
      btn.className='day';
      if(d){
        btn.textContent=String(d.getDate());
        btn.dataset.date=d.toISOString().slice(0,10);
        // klasy range/hover
        if(inSelRange(d)) btn.classList.add(this._start&&this._end?'in-range':'hover-range');
        if(isStart(d)) btn.classList.add('start');
        if(isEnd(d)) btn.classList.add('end');

        btn.addEventListener('mouseenter', ()=>{
          if(this._anchor && !this._end){ this._hover = d; this.renderBody(); }
        });
        btn.addEventListener('click', ()=>{
          if(!this._start || (this._start && this._end)){
            // start nowego zakresu
            this._start = d; this._end=null; this._anchor=d; this._hover=null; this.renderBody();
          }else{
            // ustaw koniec
            if(d < this._start){ this._end = this._start; this._start = d; }
            else { this._end = d; }
            this._anchor=null; this._hover=null; this.renderBody();
          }
        });
      } else {
        btn.classList.add('empty');
      }
      grid.appendChild(btn);
    });
  }
});
