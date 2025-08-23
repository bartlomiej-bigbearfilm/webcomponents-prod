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
  }

  openRangePicker(anchor, key){
    // Popover + date-range-popup
    const pop = document.createElement('ui-popover');
    const picker = document.createElement('date-range-popup');
    pop.appendChild(picker);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const p=store.project, str=(p.periods||{})[key]||'';
    if(str){
      const [s,e]=str.split('–');
      picker.setRange(s, e||s);
      picker.setMonth(new Date(s));
    }

    const onSave = (ev)=>{ const {start,end}=ev.detail; this.saveField(key, `${start}–${end}`); cleanup(); };
    const onCancel = ()=> cleanup();
    const onClose = ()=> cleanup();
    function cleanup(){ picker.removeEventListener('save', onSave); picker.removeEventListener('cancel', onCancel); pop.removeEventListener('close', onClose); pop.hide(); pop.remove(); }
    picker.addEventListener('save', onSave);
    picker.addEventListener('cancel', onCancel);
    pop.addEventListener('close', onClose);
  }

  render(){
    const s = this.shadowRoot;
    const p = store.project;

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

    const style = `
      <style>
        :host{display:block}
        .kv{display:grid;grid-template-columns:160px 1fr;gap:.4rem .6rem;align-items:center}
        .label{color:var(--text-dim)}
        .value{cursor:pointer;border-radius:8px;padding:.2rem .3rem;border:1px dashed var(--border);background:var(--surface)}
        .range-inline{display:inline-flex;align-items:center;gap:.35rem;white-space:nowrap}
        .range-inline .box{display:inline-flex;align-items:center;border:1.5px dashed var(--border);border-radius:10px;padding:.2rem .4rem;min-width:92px}
        .range-inline .dash{opacity:.7}
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:999px;padding:.18rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
        .tag.live{background:#ecfeff;border-color:#a5f3fc;color:#155e75}
        .tag.done{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
        .tag.fail{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
      </style>
    `;

    const formatVal = (k,v)=>{
      if(k==='client'){ return `<span class="client-slot"></span>`; }
      if(k==='budget') return fmtCurrency(v);
      if(k==='fee'||k==='margin') return (v||0)+'%';
      if(k==='status'){
        const map={sale:['W sprzedaży','sale'],live:['Trwające','live'],done:['Zakończone','done'],fail:['Nieudane','fail']};
        const key = map[v]? v : 'sale';
        const [txt,cls] = map[key];
        return `<span class="tag ${cls}">${txt}</span>`;
      }
      if(['sale','pre','prod','post','fix'].includes(k)){
        const r = store.parseRange(v||''); if(!r) return '—';
        return `<span class="range-inline"><span class="box" data-edit="start">${fmtShort(r.s)}</span><span class="dash">–</span><span class="box" data-edit="end">${fmtShort(r.e)}</span></span>`;
      }
      return v||'—';
    };

    s.innerHTML = `
      ${style}
      <h2 style="margin-top:0">Dane</h2>
      <div class="kv">
        ${rows.map(([l,k,v])=>`<div class="label">${l}</div><div class="value" data-key="${k}" tabindex="0">${formatVal(k,v)}</div>`).join('')}
      </div>
    `;

    // ——— klient przez <client-picker> ———
    {
      const slot = s.querySelector('.client-slot');
      if(slot){
        const cp = document.createElement('client-picker');
        cp.selected = p.client || '';
        cp.addEventListener('select', (ev)=> this.saveField('client', ev.detail.value));
        slot.replaceWith(cp);
      }
    }

    // ——— obsługa klików ———
    s.querySelectorAll('.value').forEach(v=>{
      v.addEventListener('click', ()=>{
        const k = v.dataset.key;
        const pr = store.project;

        if(k==='client'){ /* client-picker obsłuży */ return; }

        if(k==='status'){
          const next = prompt('status: sale | live | done | fail', pr.status||'sale');
          if(next) this.saveField('status', next);
          return;
        }

        if(['sale','pre','prod','post','fix'].includes(k)){
          this.openRangePicker(v, k);
          return;
        }

        if(k==='budget'){
          const nv = parseFloat(prompt('Budżet', pr.budget||0));
          if(!Number.isNaN(nv)) this.saveField('budget', nv);
          return;
        }

        if(k==='fee' || k==='margin'){
          const nv = parseInt(prompt(k.toUpperCase(), pr[k]||0),10);
          if(!Number.isNaN(nv)) this.saveField(k, nv);
          return;
        }

        if(k==='name' || k==='description'){
          const nv = prompt(k==='name'?'Nazwa projektu':'Opis', pr[k]||'');
          if(nv!=null) this.saveField(k, nv);
          return;
        }
      });
    });
  }
});
