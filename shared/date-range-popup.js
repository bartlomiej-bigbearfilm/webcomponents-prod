// shared/date-range-popup.js
// Popup wyboru zakresu dat:
// - pierwszy klik ustawia punkt startowy (kotwicę)
// - podczas poruszania myszką kolejne dni są tymczasowo zaznaczane (podgląd zakresu)
// - drugi klik utrwala zakres
// - przyciski Anuluj/Zapisz korzystają z globalnych .btn z ui.css

customElements.define('date-range-popup', class extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._month = new Date();         // aktualnie wyświetlany miesiąc
    this._start = null;               // wybrany start
    this._end   = null;               // wybrany koniec
    this._anchor= null;               // pierwszy klik (do podglądu)
    this._hover = null;               // aktualny dzień pod kursorem (do podglądu)
  }
  connectedCallback(){ this.render(); }
  setMonth(d){ this._month = new Date(d); this._paint(); }
  setRange(s,e){ this._start = s? new Date(s) : null; this._end = e? new Date(e) : null; this._anchor=null; this._hover=null; this._paint(); }
  get value(){ return { start:this._start, end:this._end }; }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text,#0f172a)}
        .wrap{width:276px}
        .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}
        .mon{font-weight:700}
        .nav{display:flex;gap:.35rem}
        .nav button{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:.18rem .45rem;cursor:pointer}
        .dow{display:grid;grid-template-columns:repeat(7,1fr);gap:.2rem;margin:.2rem 0 .1rem 0;font-size:.78rem;opacity:.65;text-align:center}
        .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.2rem}
        .day{height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;position:relative;user-select:none}
        .day:hover{background:var(--muted)}
        /* finalny zakres */
        .in{background:rgba(109,40,217,.14)}
        .sel{outline:2px solid var(--accent,#6d28d9)}
        /* podgląd zakresu (po pierwszym kliknięciu, podczas ruszania myszką) */
        .preview{background:rgba(109,40,217,.10)}
        .foot{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.6rem}
        /* używamy globalnych .btn z ui.css; te style to jedynie fallback gdyby ui.css nie było */
        .btn{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:.35rem .7rem;cursor:pointer}
        .btn.primary{background:var(--accent,#6d28d9);border-color:var(--accent,#6d28d9);color:#fff}
      </style>
      <div class="wrap">
        <div class="hdr">
          <div class="mon"></div>
          <div class="nav">
            <button class="prev" type="button" aria-label="Poprzedni miesiąc">‹</button>
            <button class="next" type="button" aria-label="Następny miesiąc">›</button>
          </div>
        </div>
        <div class="dow">Pn Wt Śr Cz Pt So Nd</div>
        <div class="grid" role="grid"></div>
        <div class="foot">
          <button class="btn cancel" type="button">Anuluj</button>
          <button class="btn primary ok" type="button">Zapisz</button>
        </div>
      </div>
    `;
    s.querySelector('.prev').addEventListener('click', ()=>{ this._month.setMonth(this._month.getMonth()-1); this._paint(); });
    s.querySelector('.next').addEventListener('click', ()=>{ this._month.setMonth(this._month.getMonth()+1); this._paint(); });
    s.querySelector('.cancel').addEventListener('click', ()=> this.dispatchEvent(new CustomEvent('cancel')));
    s.querySelector('.ok').addEventListener('click', ()=> this._emitSave());
    this._paint();
  }

  _emitSave(){
    if(!this._start || !this._end) return;
    const iso = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    this.dispatchEvent(new CustomEvent('save', {detail:{start:iso(this._start), end:iso(this._end)}}));
  }

  _paint(){
    const s=this.shadowRoot; if(!s) return;
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

    const inFinalRange = (d)=> (this._start && this._end) && d>=this._start && d<=this._end;
    const inPreviewRange = (d)=>{
      if(this._start && !this._end && this._anchor && this._hover){
        const [lo,hi] = this._anchor <= this._hover ? [this._anchor, this._hover] : [this._hover, this._anchor];
        return d>=lo && d<=hi;
      }
      return false;
    };

    cells.forEach(d=>{
      const el=document.createElement('div');
      el.className='day';
      if(d){
        el.textContent=String(d.getDate());
        el.dataset.date=d.toISOString().slice(0,10);

        // finalny zakres / wybrane punkty
        if(inFinalRange(d)) el.classList.add('in');
        if(this._start && d.getTime()===this._start.getTime()) el.classList.add('sel');
        if(this._end   && d.getTime()===this._end.getTime())   el.classList.add('sel');

        // podgląd zakresu
        if(inPreviewRange(d)) el.classList.add('preview');

        // podgląd podczas poruszania myszką po pierwszym kliknięciu
        el.addEventListener('mouseenter', ()=>{
          if(this._anchor && !this._end){
            this._hover = d;
            this._paint();
          }
        });

        // kliknięcia
        el.addEventListener('click', ()=>{
          if(!this._start || (this._start && this._end)){
            // start nowego zakresu
            this._start = d; this._end=null; this._anchor=d; this._hover=d;
            this._paint();
          }else{
            // ustaw koniec i zakończ podgląd
            if(d < this._start){ this._end = this._start; this._start = d; }
            else { this._end = d; }
            this._anchor = null; this._hover = null;
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
