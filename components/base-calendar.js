// components/base-calendar.js
customElements.define('base-calendar', class extends HTMLElement{
  constructor(){
    super(); this.attachShadow({mode:'open'});
    this._view = this.getAttribute('view') || 'month'; // month|week|day
    this._viewDate = new Date();
    this._events = [];
    this._drag = null; // {mode:'move'|'resizeStart'|'resizeEnd', id, refDate/refPx, orig}
  }
  static get observedAttributes(){ return ['view']; }
  attributeChangedCallback(n,o,v){ if(n==='view'){ this._view=v||'month'; if(this.isConnected) this._renderGrid(); } }

  set view(val){ this.setAttribute('view', val); }
  get view(){ return this._view; }

  set viewDate(d){ this._viewDate = d instanceof Date ? d : new Date(d); if(this.isConnected) this._renderGrid(); }
  get viewDate(){ return this._viewDate; }

  set events(arr){ this._events = Array.isArray(arr)? arr : []; if(this.isConnected) this._renderGrid(); }
  get events(){ return this._events; }

  connectedCallback(){ this._render(); }

  setViewDate(d){ this.viewDate = d; this.dispatchEvent(new CustomEvent('month-change',{detail:{viewDate:this._viewDate}})); }
  setEvents(list){ this.events = list; }

  // --- UI skeleton
  _render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:block}
        .calendar{background:var(--surface);border:2px solid var(--border);border-radius:12px;overflow:hidden;user-select:none}
        .cal-header{display:flex;align-items:center;justify-content:space-between;padding:.6rem .8rem;border-bottom:1px solid var(--border);background:var(--surface)}
        .btn{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:.25rem .6rem;cursor:pointer}
        .tabs{display:inline-flex;border:1px solid var(--border);border-radius:10px;overflow:hidden}
        .tabs button{border:0;padding:.25rem .6rem;background:var(--surface);cursor:pointer}
        .tabs button[aria-pressed="true"]{background:var(--muted)}
        .cal-stack{position:relative}
        .cal-grid{display:grid}
        /* Month grid */
        .month .head{grid-template-columns:repeat(7,1fr)}
        .month .cells{grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(6, var(--row-h,120px))}
        .cell{position:relative;padding:.35rem;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface)}
        .cell:nth-child(7n){border-right:0}
        .daynum{position:absolute;top:.25rem;right:.35rem;font-weight:800;font-size:.9rem;color:var(--text-dim)}
        .cell:hover{background:var(--muted);outline:2px solid var(--accent);outline-offset:-2px;cursor:pointer}
        .bars{position:absolute;inset:0;pointer-events:none;display:grid}
        .bar{pointer-events:auto;position:relative;display:grid;grid-template-rows:auto auto auto;justify-items:center;text-align:center;gap:.12rem;padding:.28rem .4rem;border-radius:10px;border:1px solid;margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:#bfdbfe;border-color:#60a5fa}
        .bar .resize{position:absolute;top:0;bottom:0;width:6px;cursor:ew-resize}
        .bar .resize.start{left:0} .bar .resize.end{right:0}
        .small{font-size:.86rem;opacity:.85}
        .tag{display:inline-block;padding:.06rem .35rem;border-radius:6px;border:1px solid transparent;font-size:.78rem;line-height:1.3}
        .tag-task{background:#e2e8f0;border-color:#cbd5e1}.tag-meeting{background:#fde68a;border-color:#f59e0b}
        .tag-plan{background:#bfdbfe;border-color:#60a5fa}.tag-info{background:#e9d5ff;border-color:#a78bfa}

        /* Week/Day (hour grid) */
        .time-grid{display:grid}
        .week .time-grid{grid-template-columns:60px repeat(7, 1fr)}
        .day .time-grid{grid-template-columns:60px 1fr}
        .time-rows{position:relative}
        .hour{height:48px;border-bottom:1px solid var(--border);font-size:.8rem;color:var(--text-dim)}
        .hour > span{position:relative;top:-.6rem;left:.25rem}
        .col{position:relative;border-left:1px solid var(--border)}
        .event{position:absolute;border:1px solid #60a5fa;background:#bfdbfe;border-radius:8px;padding:.2rem .3rem;box-sizing:border-box;cursor:move}
        .handle{position:absolute;left:0;right:0;height:6px;cursor:ns-resize}
        .handle.top{top:-2px} .handle.bottom{bottom:-2px}
      </style>
      <div class="calendar">
        <div class="cal-header">
          <div><button class="btn nav-prev">‹</button> <button class="btn nav-today">Dziś</button> <button class="btn nav-next">›</button></div>
          <div><strong class="title"></strong></div>
          <div>
            <div class="tabs">
              <button class="t-month" aria-pressed="${this._view==='month'}">Miesiąc</button>
              <button class="t-week"  aria-pressed="${this._view==='week'}">Tydzień</button>
              <button class="t-day"   aria-pressed="${this._view==='day'}">Dzień</button>
            </div>
          </div>
        </div>
        <div class="cal-stack"></div>
      </div>
    `;
    const sroot = s;
    sroot.querySelector('.nav-prev').addEventListener('click', ()=> this._nav(-1));
    sroot.querySelector('.nav-next').addEventListener('click', ()=> this._nav(+1));
    sroot.querySelector('.nav-today').addEventListener('click', ()=> this.setViewDate(new Date()));
    sroot.querySelector('.t-month').addEventListener('click', ()=>{ this.view='month'; this._renderGrid();});
    sroot.querySelector('.t-week').addEventListener('click',  ()=>{ this.view='week';  this._renderGrid();});
    sroot.querySelector('.t-day').addEventListener('click',   ()=>{ this.view='day';   this._renderGrid();});

    this._renderGrid();
  }

  _nav(dir){
    if(this._view==='month') this.setViewDate(new Date(this._viewDate.getFullYear(), this._viewDate.getMonth()+dir, 1));
    if(this._view==='week')  this.setViewDate(new Date(this._viewDate.getFullYear(), this._viewDate.getMonth(), this._viewDate.getDate()+7*dir));
    if(this._view==='day')   this.setViewDate(new Date(this._viewDate.getFullYear(), this._viewDate.getMonth(), this._viewDate.getDate()+dir));
  }

  _renderGrid(){
    const cont=this.shadowRoot.querySelector('.cal-stack');
    cont.innerHTML='';
    this.shadowRoot.querySelector('.title').textContent =
      this._viewDate.toLocaleString('pl-PL',{month:'long',year:'numeric'}) + (this._view!=='month' ? ' • ' + this._formatRangeForHeader() : '');

    if(this._view==='month') this._renderMonth(cont);
    if(this._view==='week')  this._renderWeek(cont);
    if(this._view==='day')   this._renderDay(cont);
  }

  // ---------- MONTH ----------
  _renderMonth(cont){
    const wrap=document.createElement('div'); wrap.className='month';
    const head=document.createElement('div'); head.className='cal-grid head';
    head.innerHTML=['Pon','Wto','Śro','Czw','Pią','Sob','Nie'].map(n=>`<div class="cell">${n}</div>`).join('');
    const cells=document.createElement('div'); cells.className='cal-grid cells';
    const bars=document.createElement('div'); bars.className='bars'; bars.style.setProperty('--row-h','120px'); bars.style.gridTemplateColumns='repeat(7,1fr)'; bars.style.gridTemplateRows='repeat(6, var(--row-h))';
    wrap.append(head, cells, bars);
    cont.appendChild(wrap);

    const firstIdx=((new Date(this._viewDate.getFullYear(),this._viewDate.getMonth(),1)).getDay()+6)%7;
    const y=this._viewDate.getFullYear(), m=this._viewDate.getMonth();
    const start=new Date(y,m,1-firstIdx);

    const gridDates=[];
    for(let i=0;i<42;i++){
      const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      const inMonth=d.getMonth()===m;
      gridDates.push(d);
      const cell=document.createElement('div'); cell.className='cell'; cell.dataset.date=d.toISOString();
      cell.innerHTML=`<div class="daynum" style="opacity:${inMonth?1:.4}">${d.getDate()}</div>`;
      cell.addEventListener('click', ()=> this.dispatchEvent(new CustomEvent('day-click',{detail:d})));
      cells.appendChild(cell);
    }
    const any=cells.querySelector('.cell');
    const rowH=any?any.getBoundingClientRect().height:120;
    bars.style.setProperty('--row-h', rowH+'px');

    // Split events to week lanes like before
    const dayIndex=(dt)=> Math.floor((new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()) - start)/86400000);
    const weekly=Array.from({length:6},()=>[]);
    (this._events||[]).forEach(ev=>{
      const sdt=new Date(ev.start), edt=new Date(ev.end||ev.start);
      let a=dayIndex(sdt), b=dayIndex(edt);
      if(b<0||a>41) return; a=Math.max(0,a); b=Math.min(41,b);
      for(let w=0;w<6;w++){ const ws=w*7,we=ws+6; const ss=Math.max(a,ws),ee=Math.min(b,we); if(ss<=ee) weekly[w].push({ev,start:ss,end:ee}); }
    });

    const topOffset=28;
    weekly.forEach((list,w)=>{
      list.sort((A,B)=>A.start-B.start||A.end-B.end);
      const lanes=[]; list.forEach(seg=>{let li=lanes.findIndex(lastEnd=>seg.start>lastEnd); if(li===-1){lanes.push(-1); li=lanes.length-1;} lanes[li]=seg.end; seg._lane=li;});
      const available=Math.max(20,rowH-topOffset-8);
      const laneH=Math.max(18,Math.floor(available/Math.max(1,lanes.length)));
      const baseTop=topOffset;

      list.forEach(seg=>{
        const bar=document.createElement('div');
        bar.className='bar';
        bar.style.gridRow=String(w+1);
        bar.style.gridColumn=String((seg.start-w*7)+1)+' / '+String((seg.end-w*7)+2);
        bar.style.marginTop=(baseTop+seg._lane*laneH)+'px';
        bar.style.height=laneH+'px';
        bar.innerHTML=`<div><strong>${seg.ev.title||'(bez tytułu)'}</strong></div>
                       <div class="small">${new Date(seg.ev.start).toLocaleDateString('pl-PL')} – ${new Date(seg.ev.end||seg.ev.start).toLocaleDateString('pl-PL')}</div>
                       <div class="tag tag-${seg.ev.type||'info'}">${({task:'Zadanie',meeting:'Spotkanie',plan:'Plan',info:'Informacja'})[seg.ev.type]||seg.ev.type}</div>
                       <div class="resize start"></div><div class="resize end"></div>`;
        // Click (open editor upstream)
        bar.addEventListener('click', (e)=>{ e.stopPropagation(); this.dispatchEvent(new CustomEvent('event-click',{detail:seg.ev})); });
        // Context menu
        bar.addEventListener('contextmenu',(e)=>{ e.preventDefault(); this._openContextMenu(e.clientX,e.clientY, seg.ev); });
        // DnD
        bar.addEventListener('mousedown', (e)=>{
          const rect=bar.getBoundingClientRect();
          const nearStart = e.offsetX < 8;
          const nearEnd   = rect.width - e.offsetX < 8;
          const mode = nearStart ? 'resizeStart' : (nearEnd ? 'resizeEnd' : 'move');
          this._startDragMonth(mode, seg.ev, e.clientX, start);
          e.preventDefault();
        });
        bars.appendChild(bar);
      });
    });
    // mouse handlers
    this._installGlobalMouse();
  }

  _startDragMonth(mode, ev, startX, gridStartDate){
    this._drag = {mode, id:ev.id, orig: {...ev}, startX, gridStartDate};
  }
  _onMouseMoveMonth(e){
    if(!this._drag) return;
    const {mode, id, orig, startX, gridStartDate} = this._drag;
    const dx = e.clientX - startX;
    // width of one day cell:
    const any = this.shadowRoot.querySelector('.month .cells .cell'); if(!any) return;
    const dayW = any.getBoundingClientRect().width;
    const daysDelta = Math.round(dx / dayW);
    const cur = this._events.find(x=>x.id===id); if(!cur) return;
    const addDays = (iso, d)=> { const dt=new Date(iso); dt.setDate(dt.getDate()+d); return dt.toISOString().slice(0,16); };

    if(mode==='move'){
      const diffDays = daysDelta;
      const dur = (new Date(orig.end||orig.start) - new Date(orig.start))/(1000*60*60*24) || 0;
      cur.start = addDays(orig.start, diffDays);
      cur.end   = addDays(orig.end||orig.start, diffDays);
      if(!orig.end && dur===0) cur.end = cur.start;
    } else if(mode==='resizeStart'){
      const newStart = addDays(orig.start, daysDelta);
      if(new Date(newStart) <= new Date(cur.end||orig.end||newStart)) cur.start = newStart;
    } else if(mode==='resizeEnd'){
      const newEnd = addDays(orig.end||orig.start, daysDelta);
      if(new Date(newEnd) >= new Date(cur.start)) cur.end = newEnd;
    }
    this._renderGrid(); // simple re-render
  }

  // ---------- WEEK / DAY ----------
  _renderWeek(cont){ this._renderTimeGrid(cont, 7); }
  _renderDay(cont){  this._renderTimeGrid(cont, 1); }

  _renderTimeGrid(cont, days){
    const wrap=document.createElement('div'); wrap.className= (days===7?'week':'day');
    const grid=document.createElement('div'); grid.className='time-grid';
    grid.style.gridTemplateColumns = days===7 ? '60px repeat(7,1fr)' : '60px 1fr';
    // header row
    const header=document.createElement('div'); header.style.display='contents';
    const col0=document.createElement('div'); col0.textContent=''; header.appendChild(col0);
    const start = this._getWeekStart(this._viewDate);
    for(let d=0; d<days; d++){
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate()+d);
      const h=document.createElement('div');
      h.style.textAlign='center'; h.style.borderLeft='1px solid var(--border)';
      h.textContent = cur.toLocaleDateString('pl-PL',{weekday:'short', day:'2-digit', month:'2-digit'});
      header.appendChild(h);
    }
    grid.appendChild(header);

    // hours rows
    const rows=document.createElement('div'); rows.style.display='contents';
    for(let r=0;r<24;r++){
      // label
      const lab=document.createElement('div'); lab.className='hour'; lab.innerHTML=`<span>${String(r).padStart(2,'0')}:00</span>`;
      rows.appendChild(lab);
      // columns
      for(let d=0; d<days; d++){
        const col=document.createElement('div'); col.className='col hour';
        col.addEventListener('click', (e)=>{ const date=this._posToDateTime(col, e.offsetY, start, d); this.dispatchEvent(new CustomEvent('day-click',{detail:date})); });
        rows.appendChild(col);
      }
    }
    grid.appendChild(rows);
    wrap.appendChild(grid);
    cont.appendChild(wrap);

    // place events
    const cols = Array.from(grid.querySelectorAll('.col'));
    const colH = cols[0]?.getBoundingClientRect().height || 48;
    const pxPerHour = colH;
    const pxPerMin  = pxPerHour/60;

    const events = (this._events||[]).filter(ev=>{
      const sdt=new Date(ev.start), edt=new Date(ev.end||ev.start);
      const endRange=new Date(start); endRange.setDate(endRange.getDate()+days);
      return edt>start && sdt<endRange;
    });

    // For each day, simple lane stacking by overlap
    for(let d=0; d<days; d++){
      const cStart=new Date(start); cStart.setDate(cStart.getDate()+d);
      const cEnd=new Date(cStart); cEnd.setDate(cEnd.getDate()+1);
      const dayEvents=events.filter(ev=> new Date(ev.end||ev.start)>cStart && new Date(ev.start)<cEnd )
                            .sort((a,b)=> new Date(a.start)-new Date(b.start));
      const lanes=[];
      dayEvents.forEach(ev=>{
        const sMin = Math.max(0, (new Date(ev.start)-cStart)/60000);
        const eMin = Math.min(24*60, (new Date(ev.end||ev.start)-cStart)/60000);
        let lane = lanes.findIndex(L => sMin >= L); if(lane===-1){ lane=lanes.length; lanes.push(-1); }
        lanes[lane] = eMin + 1;
        // draw
        const col = grid.querySelector(`.time-grid > :nth-child(${1 + (24* (days+1)) + 1 + d + (days)*1})`); // not reliable -> instead:
        const idx = 1 /*header*/ + 1 /*rows container start*/; // we'll compute manually
      });

      // Instead of complicated nth-child, just get all columns of this day:
      const dayCols = cols.filter((_,i)=> i%days===d);
      const dayCol = dayCols[0]?.parentElement; // absolute layer per day not trivial; simpler approach: place in each column
      dayEvents.forEach((ev, i)=>{
        const cStart2=new Date(start); cStart2.setDate(cStart2.getDate()+d);
        const sMin = Math.max(0, (new Date(ev.start)-cStart2)/60000);
        const eMin = Math.min(24*60, (new Date(ev.end||ev.start)-cStart2)/60000);
        const lane=i; // simple vertical stacking with slight indent
        const top = sMin*pxPerMin;
        const height = Math.max(18, (eMin - sMin)*pxPerMin);
        const leftPct = 2 + (lane*3); const widthPct = 96 - (lane*3);
        const el=document.createElement('div');
        el.className='event';
        el.style.top=top+'px'; el.style.height=height+'px';
        el.style.left=leftPct+'%'; el.style.width=widthPct+'%';
        el.innerHTML = `<div class="handle top"></div><div class="handle bottom"></div><div><strong>${ev.title||'(bez tytułu)'}</strong></div>`;
        el.addEventListener('click',(e)=>{ e.stopPropagation(); this.dispatchEvent(new CustomEvent('event-click',{detail:ev})); });
        el.addEventListener('contextmenu',(e)=>{ e.preventDefault(); this._openContextMenu(e.clientX,e.clientY, ev); });
        // DnD (move/resize)
        el.addEventListener('mousedown', (e)=>{
          const rect=el.getBoundingClientRect();
          const mode = e.offsetY<8 ? 'resizeTop' : (rect.height - e.offsetY < 8 ? 'resizeBottom' : 'moveTime');
          this._startDragTime(mode, ev, e.clientY, {day:d, start:cStart2, pxPerMin});
          e.preventDefault();
        });
        cols.filter((_,i)=> i%days===d).forEach(col=>{ col.appendChild(el); }); // show in each hour row col for day (they overlay)
      });
    }
    this._installGlobalMouse();
  }

  _posToDateTime(col, offsetY, weekStart, dayIdx){
    const colRect=col.getBoundingClientRect();
    const pxPerHour = 48;
    const pxPerMin = pxPerHour/60;
    const mins = Math.round(offsetY / pxPerMin / 30) * 30; // 30-min snap
    const d=new Date(weekStart); d.setDate(d.getDate()+dayIdx);
    d.setHours(0,0,0,0); d.setMinutes(mins);
    return d;
  }
  _getWeekStart(d){ const dt=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const w=(dt.getDay()+6)%7; dt.setDate(dt.getDate()-w); return dt; }

  // ---- DnD for month
  _installGlobalMouse(){
    if(this._mouseInstalled) return;
    this._mouseInstalled = true;
    window.addEventListener('mousemove', (e)=>{
      if(!this._drag) return;
      if(this._view==='month') this._onMouseMoveMonth(e);
      if(this._view!=='month') this._onMouseMoveTime(e);
    });
    window.addEventListener('mouseup', ()=>{
      if(!this._drag) return;
      const ev = this._events.find(x=>x.id===this._drag.id);
      this.dispatchEvent(new CustomEvent('event-update',{detail:ev}));
      this._drag=null;
    });
  }

  // ---- DnD for week/day (time-based)
  _startDragTime(mode, ev, startY, ctx){ // ctx: {day,start:px day start, pxPerMin}
    this._drag = {mode, id:ev.id, orig:{...ev}, startY, ctx};
  }
  _onMouseMoveTime(e){
    if(!this._drag) return;
    const {mode, id, orig, startY, ctx} = this._drag;
    const dy = e.clientY - startY;
    const minsDelta = Math.round((dy / ctx.pxPerMin) / 15) * 15; // 15-min snap
    const cur = this._events.find(x=>x.id===id); if(!cur) return;
    const addMins = (iso, m)=> { const dt=new Date(iso); dt.setMinutes(dt.getMinutes()+m); return dt.toISOString().slice(0,16); };

    if(mode==='moveTime'){
      const dur = (new Date(orig.end||orig.start) - new Date(orig.start))/60000;
      cur.start = addMins(orig.start, minsDelta);
      cur.end   = addMins(orig.start, minsDelta + Math.max(30, dur||30)); // min 30 min
    }
    if(mode==='resizeTop'){
      const newStart = addMins(orig.start, minsDelta);
      if(new Date(newStart) < new Date(orig.end||orig.start)) cur.start = newStart;
    }
    if(mode==='resizeBottom'){
      const newEnd = addMins(orig.end||orig.start, minsDelta);
      if(new Date(newEnd) > new Date(orig.start)) cur.end = newEnd;
    }
    this._renderGrid();
  }

  // context
  _openContextMenu(x,y, ev){
    const menu=document.createElement('ui-contextmenu');
    menu.data = [
      {id:'rename', label:'Zmień nazwę', shortcut:'F2'},
      {id:'sep'},
      {id:'delete', label:'Usuń', shortcut:'Del'}
    ];
    menu.addEventListener('pick', (e)=>{
      if(e.detail.id==='rename'){
        const nv = prompt('Nowy tytuł', ev.title||''); if(nv!=null){ ev.title=nv; this._renderGrid(); this.dispatchEvent(new CustomEvent('event-update',{detail:ev})); }
      }
      if(e.detail.id==='delete'){ this.dispatchEvent(new CustomEvent('event-update',{detail:{...ev,_delete:true}})); }
    });
    menu.showAt(x,y);
  }

  _formatRangeForHeader(){
    if(this._view==='week'){
      const ws=this._getWeekStart(this._viewDate), we=new Date(ws); we.setDate(ws.getDate()+6);
      return `${ws.toLocaleDateString('pl-PL')} – ${we.toLocaleDateString('pl-PL')}`;
    }
    if(this._view==='day'){
      return this._viewDate.toLocaleDateString('pl-PL',{weekday:'long', day:'2-digit', month:'long', year:'numeric'});
    }
    return '';
  }
});
