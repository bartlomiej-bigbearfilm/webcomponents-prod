// components/data-card.js
import { store } from '../shared/store.js';
import { fmtCurrency, fmtShort } from '../shared/utils.js';

customElements.define('data-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }

  saveField(k,v){
    if(['name','client','description','budget','fee','margin','status'].includes(k)){
      store.setProject({ [k]: v });
    } else {
      const p = store.project;
      const periods = { ...(p.periods||{}), [k]: v };
      store.setProject({ periods });
    }
    this.render();
    window.dispatchEvent(new CustomEvent('project-change'));
    try{ document.getElementById('toast')?.show('Zapisano zmiany','success'); }catch(_){}
  }

  tap(el, handler){
    if(!el) return;
    const h=(e)=>{ handler(e); };
    el.addEventListener('click', h);
    el.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(e); }, {passive:false});
  }

  openRangePicker(anchor, key){
    const pop = document.createElement('ui-popover');
    const picker = document.createElement('date-range-popup');
    pop.appendChild(picker);
    document.body.appendChild(pop);
    pop.showFor(anchor);
    const str=(store.project.periods||{})[key]||'';
    if(str){ const [s,e]=str.split('–'); picker.setRange(s, e||s); if(s) picker.setMonth(new Date(s)); }
    const done=()=>{ pop.hide(); pop.remove(); };
    picker.addEventListener('save', (ev)=>{ const {start,end}=ev.detail; this.saveField(key, `${start}–${end}`); done(); });
    picker.addEventListener('cancel', done);
    pop.addEventListener('close', done);
  }

  render(){
    const s=this.shadowRoot, p=store.project;
    const rows = [
      ['Nazwa projektu','name', p.name||''],
      ['Klient','client', p.client||''],
      ['Status','status', p.status||'sale'],
      ['Opis','description', p.description||''],
      ['Budżet','budget', p.budget||0],
      ['Prowizja %','fee', p.fee||0],
      ['Szac. marża %','margin', p.margin||0],
      ['Okres sprzedaż','sale', (p.periods||{}).sale||''],
      ['Okres pre-produkcja','pre', (p.periods||{}).pre||''],
      ['Okres produkcja','prod', (p.periods||{}).prod||''],
      ['Okres post-produkcja','post', (p.periods||{}).post||''],
      ['Okres poprawki','fix', (p.periods||{}).fix||'']
    ];

    s.innerHTML = `
      <style>
        :host{display:block}
        .kv{display:grid;grid-template-columns:160px 1fr;gap:.4rem .6rem;align-items:center}
        .label{color:var(--text-dim)}
        .value{cursor:pointer;border-radius:8px;padding:.28rem .36rem;border:1px dashed var(--border);background:var(--surface)}
        .value.plain{border:0;background:transparent;padding:0;cursor:default}
        .range-inline{display:inline-flex;align-items:center;gap:.35rem;white-space:nowrap}
        .range-inline .box{display:inline-flex;align-items:center;border:1.5px dashed var(--border);border-radius:10px;padding:.2rem .4rem;min-width:92px}
        .range-inline .dash{opacity:.7}
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.22rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:var(--st-sale-bg);border-color:var(--st-sale-bd);color:var(--st-sale-tx);}
        .tag.live{background:var(--st-live-bg);border-color:var(--st-live-bd);color:var(--st-live-tx);}
        .tag.done{background:var(--st-done-bg);border-color:var(--st-done-bd);color:var(--st-done-tx);}
        .tag.fail{background:var(--st-fail-bg);border-color:var(--st-fail-bd);color:var(--st-fail-tx);}
      </style>
      <h2 style="margin-top:0">Dane</h2>
      <div class="kv">
        ${rows.map(([l,k,v])=>`<div class="label">${l}</div><div class="value" data-key="${k}" tabindex="0">${this._fmt(k,v)}</div>`).join('')}
      </div>
    `;

    // --- CLIENT ---
    {
      const host = s.querySelector('.value[data-key="client"]');
      const slot = host?.querySelector('.client-slot');
      if(host && slot){
        const cp = document.createElement('client-picker');
        cp.selected = p.client || '';
        cp.addEventListener('select', (ev)=> this.saveField('client', ev.detail.value));
        slot.replaceWith(cp);
        host.classList.add('plain');
      }
    }

    // --- STATUS ---
    {
      const host = s.querySelector('.value[data-key="status"]');
      const slot = host?.querySelector('.status-slot');
      if(host && slot){
        const sp = document.createElement('status-picker');
        sp.setAttribute('value', p.status || 'sale');
        sp.addEventListener('select', (ev)=> this.saveField('status', ev.detail.value));
        slot.replaceWith(sp);
        host.classList.add('plain');
      }
    }

    // --- POZOSTAŁE POLA ---
    s.querySelectorAll('.value').forEach(v=>{
      const k = v.dataset.key;
      if(k==='client' || k==='status') return;

      if(['sale','pre','prod','post','fix'].includes(k)){
        this.tap(v, ()=> this.openRangePicker(v, k));
      } else if(k==='budget'){
        this.tap(v, ()=>{ const nv = parseFloat(prompt('Budżet', p.budget||0)); if(!Number.isNaN(nv)) this.saveField('budget', nv); });
      } else if(k==='fee' || k==='margin'){
        this.tap(v, ()=>{ const nv = parseInt(prompt(k.toUpperCase(), p[k]||0),10); if(!Number.isNaN(nv)) this.saveField(k, nv); });
      } else if(k==='name' || k==='description'){
        this.tap(v, ()=>{ const nv = prompt(k==='name'?'Nazwa projektu':'Opis', p[k]||''); if(nv!=null) this.saveField(k, nv); });
      }
    });
  }

  _fmt(k,v){
    if(k==='client') return `<span class="client-slot">${v? v : 'Wybierz klienta…'}</span>`;
    if(k==='budget') return fmtCurrency(v);
    if(k==='fee'||k==='margin') return (v||0)+'%';
    if(k==='status') return `<span class="status-slot"></span>`;
    if(['sale','pre','prod','post','fix'].includes(k)){
      const r = store.parseRange ? store.parseRange(v||'') : null; if(!r) return '—';
      return `<span class="range-inline"><span class="box">${fmtShort(r.s)}</span><span class="dash">–</span><span class="box">${fmtShort(r.e)}</span></span>`;
    }
    return v||'—';
  }
});
