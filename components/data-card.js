// components/data-card.js
// Lekki komponent, który deleguje WSZYSTKO na istniejące pickery i helpery
// Wymaga: shared/store.js, shared/utils.js, shared/modal.js, shared/date-range-popup.js,
//         components/client-picker.js, components/status-picker.js

import { store } from '../shared/store.js';
import { fmtCurrency, fmtShort } from '../shared/utils.js';

customElements.define('data-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }

  // ————————— helpers —————————
  _save(k,v){
    if(['name','client','description','budget','fee','margin','status'].includes(k)){
      store.setProject({ [k]: v });
    } else {
      const p = store.project;
      const periods = { ...(p.periods||{}), [k]: v };
      store.setProject({ periods });
    }
    this.render();
    window.dispatchEvent(new CustomEvent('project-change'));
    document.getElementById('toast')?.show?.('Zapisano zmiany','success');
  }

  _tap(el, fn){
    if(!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchstart', (e)=>{ e.preventDefault(); fn(e); }, {passive:false});
  }

  _openRangePicker(anchor, key){
    const pop = document.createElement('ui-popover');
    const picker = document.createElement('date-range-popup');
    pop.appendChild(picker);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const p=store.project, str=(p.periods||{})[key]||'';
    if(str){
      const [s,e]=str.split('–');
      picker.setRange(s, e||s);
      if(s) picker.setMonth(new Date(s));
    }

    const onSave = (ev)=>{ const {start,end}=ev.detail; this._save(key, `${start}–${end}`); cleanup(); };
    const onCancel = ()=> cleanup();
    const onClose = ()=> cleanup();
    const cleanup=()=>{ picker.removeEventListener('save', onSave); picker.removeEventListener('cancel', onCancel); pop.removeEventListener('close', onClose); pop.hide(); pop.remove(); };
    picker.addEventListener('save', onSave);
    picker.addEventListener('cancel', onCancel);
    pop.addEventListener('close', onClose);
  }

  // ————————— render —————————
  render(){
    const s=this.shadowRoot, p=store.project;

    const rows = [
      ['Nazwa projektu','name', p.name||''],
      ['Klient','client', p.client||''],
      ['Status','status', p.status ?? 'sale'],
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
        /* tag statusu – korzysta z globalnych zmiennych kolorów z shared/ui.css */
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.22rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:var(--st-sale-bg);border-color:var(--st-sale-bd);color:var(--st-sale-tx);}
        .tag.live{background:var(--st-live-bg);border-color:var(--st-live-bd);color:var(--st-live-tx);}
        .tag.done{background:var(--st-done-bg);border-color:var(--st-done-bd);color:var(--st-done-tx);}
        .tag.fail{background:var(--st-fail-bg);border-color:var(--st-fail-bd);color:var(--st-fail-tx);}
      </style>
      <h2 style="margin-top:0">Dane</h2>
      <div class="kv">
        ${rows.map(([l,k,v])=>`<div class="label">${l}</div><div class="value ${k==='client'||k==='status'?'plain':''}" data-key="${k}" tabindex="0">${this._fmt(k,v)}</div>`).join('')}
      </div>
    `;

    // ——— klient przez <client-picker> ———
    {
      const host = s.querySelector('.value[data-key="client"]');
      const slot = host?.querySelector('.client-slot');
      if(host && slot){
        const cp = document.createElement('client-picker');
        cp.selected = p.client || '';
        // klient ma własny UI – nie dodajemy handlera na host
        cp.addEventListener('select', (ev)=> this._save('client', ev.detail.value));
        slot.replaceWith(cp);
      }
    }

    // ——— status przez <status-picker> ———
    {
      const host = s.querySelector('.value[data-key="status"]');
      const slot = host?.querySelector('.status-slot');
      if(host && slot){
        const sp = document.createElement('status-picker');
        sp.setAttribute('value', (typeof p.status==='string'? p.status : (p.status?.key || 'sale')));
        sp.addEventListener('select', (ev)=> this._save('status', ev.detail.value));
        slot.replaceWith(sp);
      }
    }

    // ——— reszta pól (klik-edycja) ———
    s.querySelectorAll('.value').forEach(v=>{
      const k = v.dataset.key;
      if(k==='client' || k==='status') return; // obsługują własne pickery

      if(['sale','pre','prod','post','fix'].includes(k)){
        this._tap(v, ()=> this._openRangePicker(v, k));
        return;
      }

      if(k==='budget'){
        this._tap(v, ()=>{
          const nv = parseFloat(prompt('Budżet', p.budget||0));
          if(!Number.isNaN(nv)) this._save('budget', nv);
        });
        return;
      }

      if(k==='fee' || k==='margin'){
        this._tap(v, ()=>{
          const nv = parseInt(prompt(k.toUpperCase(), p[k]||0),10);
          if(!Number.isNaN(nv)) this._save(k, nv);
        });
        return;
      }

      if(k==='name' || k==='description'){
        this._tap(v, ()=>{
          const nv = prompt(k==='name'?'Nazwa projektu':'Opis', p[k]||'');
          if(nv!=null) this._save(k, nv);
        });
        return;
      }
    });
  }

  _fmt(k,v){
    if(k==='client'){ return `<span class="client-slot">${v? v : 'Wybierz klienta…'}</span>`; }
    if(k==='budget') return fmtCurrency(v);
    if(k==='fee'||k==='margin') return (v||0)+'%';
    if(k==='status'){ return `<span class="status-slot"></span>`; }
    if(['sale','pre','prod','post','fix'].includes(k)){
      const r = (store.parseRange ? store.parseRange(v||'') : null); if(!r) return '—';
      return `<span class="range-inline"><span class="box" data-edit="start">${fmtShort(r.s)}</span><span class="dash">–</span><span class="box" data-edit="end">${fmtShort(r.e)}</span></span>`;
    }
    return v||'—';
  }
});
