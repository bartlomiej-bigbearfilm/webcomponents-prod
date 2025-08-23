// components/data-card.js
import { store } from '../shared/store.js';
import { fmtCurrency, fmtShort } from '../shared/utils.js';

customElements.define('data-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }

  // --- helpers ---
  isTouch(){ return matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window); }

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
    try{ document.getElementById('toast')?.show('Zapisano zmiany','success'); }catch(e){}
  }

  addTap(el, handler){
    if(!el) return;
    const h = (e)=>{ handler(e); };
    el.addEventListener('click', h);
    el.addEventListener('pointerdown', (e)=>{ if(e.pointerType==='touch') { e.preventDefault(); h(e);} }, {passive:false});
    el.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(e); }, {passive:false});
  }

  openRangePicker(anchor, key){
    // jeśli dotyk – daj prosty prompt jako awaryjny tryb
    if(this.isTouch()){
      const cur = (store.project.periods||{})[key] || '';
      const nv = prompt('Zakres (RRRR-MM-DD–RRRR-MM-DD)', cur || new Date().toISOString().slice(0,10)+'–'+new Date().toISOString().slice(0,10));
      if(nv) this.saveField(key, nv);
      return;
    }
    // normalnie: popover + mini-kalendarz
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

    const onSave = (ev)=>{ const {start,end}=ev.detail; this.saveField(key, `${start}–${end}`); cleanup(); };
    const onCancel = ()=> cleanup();
    const onClose = ()=> cleanup();
    const cleanup=()=>{ picker.removeEventListener('save', onSave); picker.removeEventListener('cancel', onCancel); pop.removeEventListener('close', onClose); pop.hide(); pop.remove(); };
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
        .value.no-cursor{cursor:default}
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
      if(k==='status'){ return `<span class="status-slot"></span>`; }
      if(['sale','pre','prod','post','fix'].includes(k)){
        const r = store.parseRange ? store.parseRange(v||'') : null; if(!r) return '—';
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

    // --- CLIENT ---
    {
      const host = s.querySelector('.value[data-key="client"]');
      const slot = host?.querySelector('.client-slot');
      const ClientEl = customElements.get('client-picker');
      if(host && slot && ClientEl && !this.isTouch()){
        const cp = document.createElement('client-picker');
        cp.selected = p.client || '';
        cp.addEventListener('click', (e)=> e.stopPropagation());
        cp.addEventListener('touchstart', (e)=>{ e.stopPropagation(); }, {passive:true});
        cp.addEventListener('select', (ev)=> this.saveField('client', ev.detail.value));
        slot.replaceWith(cp);
        host.classList.add('no-cursor');
      } else if(host){
        // fallback mobilny / brak komponentu → prompt
        host.innerHTML = `<span>${p.client || 'Wybierz klienta…'}</span>`;
        this.addTap(host, ()=>{
          const list = (store.getClients?.() || []);
          const numbered = list.map((c,i)=>`${i+1}. ${c}`).join('\n');
          const input = prompt(`Wpisz nazwę klienta\nalbo numer z listy:\n${numbered}`, p.client||'');
          if(input==null) return;
          const num = parseInt(input,10);
          const val = (!Number.isNaN(num) && list[num-1]) ? list[num-1] : input.trim();
          if(val) this.saveField('client', val);
        });
      }
    }

    // --- STATUS ---
    {
      const host = s.querySelector('.value[data-key="status"]');
      const slot = host?.querySelector('.status-slot');
      const StatusEl = customElements.get('status-picker');
      if(host && slot && StatusEl && !this.isTouch()){
        const sp = document.createElement('status-picker');
        sp.setAttribute('value', p.status || 'sale');
        sp.addEventListener('click', (e)=> e.stopPropagation());
        sp.addEventListener('touchstart', (e)=>{ e.stopPropagation(); }, {passive:true});
        sp.addEventListener('select', (ev)=> this.saveField('status', ev.detail.value));
        slot.replaceWith(sp);
        host.classList.add('no-cursor');
      } else if(host){
        const map={sale:['W sprzedaży','sale'],live:['Trwające','live'],done:['Zakończone','done'],fail:['Nieudane','fail']};
        const key = map[p.status]? p.status : 'sale';
        const [txt,cls] = map[key];
        host.innerHTML = `<span class="tag ${cls}">${txt}</span>`;
        this.addTap(host, ()=>{
          const next = prompt('status: sale | live | done | fail', p.status||'sale');
          if(next) this.saveField('status', next);
        });
      }
    }

    // --- POZOSTAŁE POLA ---
    s.querySelectorAll('.value').forEach(v=>{
      const k = v.dataset.key;
      if(k==='client' || k==='status') return;

      if(['sale','pre','prod','post','fix'].includes(k)){
        this.addTap(v, ()=> this.openRangePicker(v, k));
        return;
      }
      if(k==='budget'){
        this.addTap(v, ()=>{
          const pr = store.project;
          const nv = parseFloat(prompt('Budżet', pr.budget||0));
          if(!Number.isNaN(nv)) this.saveField('budget', nv);
        });
        return;
      }
      if(k==='fee' || k==='margin'){
        this.addTap(v, ()=>{
          const pr = store.project;
          const nv = parseInt(prompt(k.toUpperCase(), pr[k]||0),10);
          if(!Number.isNaN(nv)) this.saveField(k, nv);
        });
        return;
      }
      if(k==='name' || k==='description'){
        this.addTap(v, ()=>{
          const pr = store.project;
          const nv = prompt(k==='name'?'Nazwa projektu':'Opis', pr[k]||'');
          if(nv!=null) this.saveField(k, nv);
        });
        return;
      }
    });
  }
});