// components/calendar-card.js
import { store, cryptoId } from '../shared/store.js';

customElements.define('calendar-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.view = new Date(); this.events = store.loadEvents(); this.onChange=this.refresh.bind(this); }
  connectedCallback(){ window.addEventListener('project-change', this.onChange); this.render(); }
  disconnectedCallback(){ window.removeEventListener('project-change', this.onChange); }

  refresh(){ this.events = store.loadEvents(); this.renderGrid(); }

  render(){
    const s=this.shadowRoot;
    const style = `
      <style>
        :host{display:block}
        .calendar{background:var(--surface);border:2px solid var(--border);border-radius:12px;overflow:hidden}
        .cal-header{display:flex;align-items:center;justify-content:space-between;padding:.6rem .8rem;border-bottom:1px solid var(--border);background:var(--surface)}
        .cal-stack{position:relative}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr)}
        .cal-grid.head .cell{padding:.45rem .6rem;background:var(--muted);font-weight:700;color:var(--text-dim);border-right:1px solid var(--border);border-bottom:1px solid var(--border)}
        .cal-grid.head .cell:nth-child(7n){border-right:0}
        .cal-grid.cells{grid-template-rows:repeat(6, var(--row-h,120px));position:relative;z-index:1}
        .cal-grid.bars{grid-template-rows:repeat(6, var(--row-h,120px));position:absolute;inset:0;z-index:2;pointer-events:none}
        .cal-cell{position:relative;padding:.35rem;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface)}
        .cal-cell:nth-child(7n){border-right:0}
        .cal-daynum{position:absolute;top:.25rem;right:.35rem;font-weight:800;font-size:.9rem;color:var(--text-dim)}
        .cal-cell:hover{background:var(--muted);outline:2px solid var(--accent);outline-offset:-2px;cursor:pointer}
        .cal-bar{pointer-events:auto;position:relative;display:grid;grid-template-rows:auto auto auto;justify-items:center;text-align:center;gap:.12rem;padding:.28rem .4rem;border-radius:10px;border:1px solid;margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:#bfdbfe;border-color:#60a5fa}
        .tag{display:inline-block;padding:.06rem .35rem;border-radius:6px;border:1px solid transparent;font-size:.78rem;line-height:1.3}
        .tag-task{background:#e2e8f0;border-color:#cbd5e1}.tag-meeting{background:#fde68a;border-color:#f59e0b}
        .tag-plan{background:#bfdbfe;border-color:#60a5fa}.tag-info{background:#e9d5ff;border-color:#a78bfa}
      </style>
    `;
    s.innerHTML = `
      ${style}
      <div class="calendar">
        <div class="cal-header">
          <div><button data-act="prev">‹</button> <button data-act="today">Dziś</button> <button data-act="next">›</button></div>
          <div><strong class="title"></strong></div>
          <div class="small" style="opacity:.7">Kliknij dzień, aby dodać • kliknij belkę, aby edytować</div>
        </div>
        <div class="cal-stack">
          <div class="cal-grid head"></div>
          <div class="cal-grid cells"></div>
          <div class="cal-grid bars" style="--row-h:120px"></div>
        </div>
      </div>

      <!-- globalny modal dla edycji -->
      <ui-modal id="modal"><event-editor></event-editor></ui-modal>
    `;

    s.querySelector('[data-act="prev"]').addEventListener('click', ()=>{ this.view=new Date(this.view.getFullYear(),this.view.getMonth()-1,1); this.renderGrid();});
    s.querySelector('[data-act="next"]').addEventListener('click', ()=>{ this.view=new Date(this.view.getFullYear(),this.view.getMonth()+1,1); this.renderGrid();});
    s.querySelector('[data-act="today"]').addEventListener('click', ()=>{ this.view=new Date(); this.renderGrid();});

    const head = s.querySelector('.cal-grid.head');
    head.innerHTML = ['Pon','Wto','Śro','Czw','Pią','Sob','Nie'].map(n=>`<div class='cell'>${n}</div>`).join('');
    this.renderGrid();
  }

  openEditor(ev){ // ev: null -> tworzenie
    const s=this.shadowRoot;
    const modal = s.getElementById('modal');
    const editor = modal.querySelector('event-editor');

    if(ev){ // edycja istniejącego
      editor.event = { id:ev.id, title:ev.title, type:ev.type||'task', start:ev.start.slice(0,16), end:ev.end.slice(0,16) };
    }else{ // nowy
      const today = new Date();
      const iso = new Date(today.getFullYear(),today.getMonth(),today.getDate(),9,0).toISOString().slice(0,16);
      editor.event = { title:'', type:'task', start:iso, end:iso };
    }

    const onSave = (e)=>{
      const d=e.detail;
      if(ev){ // update
        Object.assign(ev, {title:d.title, type:d.type, start:d.start, end:d.end});
      }else{ // create
        this.events = [...this.events, {id:cryptoId(), ...d}];
      }
      store.saveEvents(this.events);
      this.renderGrid();
      cleanup();
    };
    const onDelete = (e)=>{
      const id = e.detail?.id || ev?.id;
      if(!id) return;
      this.events = this.events.filter(x=>x.id!==id);
      store.saveEvents(this.events);
      this.renderGrid();
      cleanup();
    };
    const onCancel = ()=> cleanup();
    const cleanup=()=>{
      editor.removeEventListener('save', onSave);
      editor.removeEventListener('delete', onDelete);
      editor.removeEventListener('cancel', onCancel);
      modal.hide();
    };

    editor.addEventListener('save', onSave);
    editor.addEventListener('delete', onDelete);
    editor.addEventListener('cancel', onCancel);
    modal.show();
  }

  renderGrid(){
    const s=this.shadowRoot;
    s.querySelector('.title').textContent = this.view.toLocaleString('pl-PL',{month:'long',year:'numeric'});

    const firstIdx = ((new Date(this.view.getFullYear(),this.view.getMonth(),1)).getDay()+6)%7;
    const y=this.view.getFullYear(), m=this.view.getMonth();
    const start=new Date(y,m,1-firstIdx);

    const cells = s.querySelector('.cal-grid.cells');
    const boxes=[];
    for(let i=0;i<42;i++){
      const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      const inMonth=d.getMonth()===m;
      boxes.push(`<div class="cal-cell" data-date="${d.toISOString()}"><div class="cal-daynum" style="opacity:${inMonth?1:.4}">${d.getDate()}</div></div>`);
    }
    cells.innerHTML = boxes.join('');
    cells.querySelectorAll('.cal-cell').forEach(c=>{
      c.addEventListener('click', ()=>{
        const d = new Date(c.dataset.date);
        const st = `${d.toISOString().slice(0,10)}T09:00`;
        const en = `${d.toISOString().slice(0,10)}T18:00`;
        this.openEditor({title:'', type:'task', start:st, end:en}); // nowy
      });
    });

    const bars = s.querySelector('.cal-grid.bars');
    bars.innerHTML='';
    const dayIndex = (dt)=> Math.floor((new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()) - start)/86400000);

    const weekly=Array.from({length:6},()=>[]);
    this.events.forEach(ev=>{
      const sdt=new Date(ev.start), edt=new Date(ev.end||ev.start);
      let a=dayIndex(sdt), b=dayIndex(edt);
      if(b<0||a>41) return;
      a=Math.max(0,a); b=Math.min(41,b);
      for(let w=0;w<6;w++){
        const ws=w*7, we=ws+6;
        const ss=Math.max(a,ws), ee=Math.min(b,we);
        if(ss<=ee) weekly[w].push({ev,start:ss,end:ee});
      }
    });

    const any=cells.querySelector('.cal-cell');
    const rowH=any?any.getBoundingClientRect().height:120;
    bars.style.setProperty('--row-h', rowH+'px');
    const topOffset=28;

    weekly.forEach((list,w)=>{
      list.sort((A,B)=>A.start-B.start||A.end-B.end);
      const lanes=[];list.forEach(seg=>{let li=lanes.findIndex(lastEnd=>seg.start>lastEnd);if(li===-1){lanes.push(-1);li=lanes.length-1;}lanes[li]=seg.end;seg._lane=li;});
      const available=Math.max(20,rowH-topOffset-8);
      const laneH=Math.max(18,Math.floor(available/Math.max(1,lanes.length)));
      const baseTop=topOffset;

      list.forEach(seg=>{
        const colStart=(seg.start-w*7)+1;
        const colEnd=(seg.end-w*7)+2;
        const bar=document.createElement('div');
        bar.className='cal-bar';
        bar.style.gridRow=String(w+1);
        bar.style.gridColumn=String(colStart)+' / '+String(colEnd);
        bar.style.marginTop=(baseTop+seg._lane*laneH)+'px';
        bar.style.height=laneH+'px';
        bar.innerHTML=`<div><strong>${seg.ev.title||'(bez tytułu)'}</strong></div>
                       <div class="small">${new Date(seg.ev.start).toLocaleString('pl-PL')} – ${new Date(seg.ev.end||seg.ev.start).toLocaleString('pl-PL')}</div>
                       <div class="tag tag-${seg.ev.type||'info'}">${({task:'Zadanie',meeting:'Spotkanie',plan:'Plan',info:'Informacja'})[seg.ev.type]||seg.ev.type}</div>`;
        bar.addEventListener('click',(e)=>{
          e.stopPropagation();
          this.openEditor(seg.ev);
        });
        bars.appendChild(bar);
      });
    });
  }
});
