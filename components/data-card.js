// components/data-card.js
import { store } from '../shared/store.js';
import { fmtCurrency, fmtShort } from '../shared/utils.js';

customElements.define('data-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }

  // ---------- helpers ----------
  _on(el, ev, fn, opts){ if(el) el.addEventListener(ev, fn, opts); }
  _tap(el, fn){ if(!el) return;
    this._on(el,'click',fn);
    this._on(el,'touchstart', (e)=>{ e.preventDefault(); fn(e); }, {passive:false});
  }
  _save(k,v){
    if(['name','client','description','budget','fee','margin','status'].includes(k)){
      store.setProject({ [k]: v });
    } else {
      const p=store.project;
      const periods={...(p.periods||{}), [k]: v};
      store.setProject({ periods });
    }
    this.render();
    window.dispatchEvent(new CustomEvent('project-change'));
    document.getElementById('toast')?.show?.('Zapisano zmiany','success');
  }

  _openRange(anchor, key){
    const pop=document.createElement('ui-popover');
    const picker=document.createElement('date-range-popup');
    pop.appendChild(picker);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const str=(store.project.periods||{})[key]||'';
    if(str){ const [s,e]=str.split('–'); picker.setRange(s,e||s); if(s) picker.setMonth(new Date(s)); }

    const done=()=>{ pop.hide(); pop.remove(); };
    picker.addEventListener('save', (ev)=>{ const {start,end}=ev.detail; this._save(key, `${start}–${end}`); done(); });
    picker.addEventListener('cancel', done);
    pop.addEventListener('close', done);
  }

  // Menu statusów – własne, bez zależności od status-picker.js
  _openStatusMenu(anchor, current){
    const STATUS = {
      sale: {label:'W sprzedaży',  cls:'sale'},
      live: {label:'Trwające',     cls:'live'},
      done: {label:'Zakończone',   cls:'done'},
      fail: {label:'Nieudane',     cls:'fail'},
    };
    const pop=document.createElement('ui-popover');
    const box=document.createElement('div');
    box.innerHTML = `
      <style>
        .menu{min-width:260px;display:flex;flex-direction:column;gap:.6rem;padding:.2rem}
        .item{display:flex;justify-content:center;align-items:center;padding:.35rem .5rem;border-radius:10px;cursor:pointer;transition:background-color .12s ease}
        .item:hover{background:var(--muted)}
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.22rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:var(--st-sale-bg);border-color:var(--st-sale-bd);color:var(--st-sale-tx);}
        .tag.live{background:var(--st-live-bg);border-color:var(--st-live-bd);color:var(--st-live-tx);}
        .tag.done{background:var(--st-done-bg);border-color:var(--st-done-bd);color:var(--st-done-tx);}
        .tag.fail{background:var(--st-fail-bg);border-color:var(--st-fail-bd);color:var(--st-fail-tx);}
      </style>
      <div class="menu">
        ${Object.entries(STATUS).map(([k,v])=>`
          <div class="item" data-val="${k}">
            <span class="tag ${v.cls}">${v.label}</span>
          </div>
        `).join('')}
      </div>
    `;
    pop.appendChild(box);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    box.querySelectorAll('.item').forEach(it=>{
      const pick=()=>{ this._save('status', it.dataset.val); pop.hide(); pop.remove(); };
      this._tap(it, pick);
    });
    pop.addEventListener('close', ()=> pop.remove());
  }

  // ---------- render ----------
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
        .value.plain{border:0;background:transparent;padding:0;cursor:pointer}
        .range-inline{display:inline-flex;align-items:center;gap:.35rem;white-space:nowrap}
        .range-inline .box{display:inline-flex;align-items:center;border:1.5px dashed var(--border);border-radius:10px;padding:.2rem .4rem;min-width:92px}
        .range-inline .dash{opacity:.7}
        /* Tagi statusów – spójne w danych i w menu */
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.22rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:var(--st-sale-bg);border-color:var(--st-sale-bd);color:var(--st-sale-tx);}
        .tag.live{background:var(--st-live-bg);border-color:var(--st-live-bd);color:var(--st-live-tx);}
        .tag.done{background:var(--st-done-bg);border-color:var(--st-done-bd);color:var(--st-done-tx);}
        .tag.fail{background:var(--st-fail-bg);border-color:var(--st-fail-bd);color:var(--st-fail-tx);}
      </style>
      <h2 style="margin-top:0">Dane</h2>
      <div class="kv">
        ${rows.map(([l,k,v])=>`<div class="label">${l}</div><div class="value ${k==='client' || k==='status' ? 'plain':''}" data-key="${k}" tabindex="0">${this._fmt(k,v)}</div>`).join('')}
      </div>
    `;

    // --- Klient: wstaw <client-picker> jeśli jest, inaczej fallback ---
    {
      const host = s.querySelector('.value[data-key="client"]');
      const slot = host?.querySelector('.client-slot');
      if(host && slot){
        const ClientEl = customElements.get('client-picker');
        if (ClientEl){
          const cp = document.createElement('client-picker');
          cp.selected = p.client || '';
          // klik na child nie powinien „wpadać” do hosta
          this._tap(cp, (e)=> e.stopPropagation());
          cp.addEventListener('select', (ev)=> this._save('client', ev.detail.value));
          slot.replaceWith(cp);
        } else {
          // brak komponentu – prosty fallback
          host.innerHTML = `<span>${p.client || 'Wybierz klienta…'}</span>`;
          this._tap(host, ()=>{
            const list = (store.getClients?.() || []);
            const numbered = list.map((c,i)=>`${i+1}. ${c}`).join('\n');
            const txt = prompt(`Wpisz nazwę klienta\nalbo numer z listy:\n${numbered}`, p.client||'');
            if(txt==null) return;
            const n=parseInt(txt,10);
            const val=(!Number.isNaN(n) && list[n-1]) ? list[n-1] : txt.trim();
            if(val) this._save('client', val);
          });
        }
      }
    }

    // --- Status: render tag i pokaż menu po kliknięciu (bez zależności od status-picker.js) ---
    {
      const host = s.querySelector('.value[data-key="status"]');
      if(host){
        const map={sale:['W sprzedaży','sale'],live:['Trwające','live'],done:['Zakończone','done'],fail:['Nieudane','fail']};
        const key = map[p.status] ? p.status : 'sale';
        const [txt,cls] = map[key];
        host.innerHTML = `<span class="tag ${cls}">${txt}</span>`;
        this._tap(host, ()=> this._openStatusMenu(host, key));
      }
    }

    // --- Pozostałe pola ---
    s.querySelectorAll('.value').forEach(v=>{
      const k=v.dataset.key;
      if(k==='client' || k==='status') return;

      if(['sale','pre','prod','post','fix'].includes(k)){
        this._tap(v, ()=> this._openRange(v, k));
      } else if(k==='budget'){
        this._tap(v, ()=>{ const nv=parseFloat(prompt('Budżet', p.budget||0)); if(!Number.isNaN(nv)) this._save('budget', nv); });
      } else if(k==='fee' || k==='margin'){
        this._tap(v, ()=>{ const nv=parseInt(prompt(k.toUpperCase(), p[k]||0),10); if(!Number.isNaN(nv)) this._save(k, nv); });
      } else if(k==='name' || k==='description'){
        this._tap(v, ()=>{ const nv=prompt(k==='name'?'Nazwa projektu':'Opis', p[k]||''); if(nv!=null) this._save(k, nv); });
      }
    });
  }

  _fmt(k,v){
    if(k==='client') return `<span class="client-slot">${v? v : 'Wybierz klienta…'}</span>`;
    if(k==='budget') return fmtCurrency(v);
    if(k==='fee'||k==='margin') return (v||0)+'%';
    if(k==='status'){
      // placeholder – zaraz podmienimy na tag + menu
      return `<span class="tag sale">W sprzedaży</span>`;
    }
    if(['sale','pre','prod','post','fix'].includes(k)){
      const r = store.parseRange ? store.parseRange(v||'') : null; if(!r) return '—';
      return `<span class="range-inline"><span class="box">${fmtShort(r.s)}</span><span class="dash">–</span><span class="box">${fmtShort(r.e)}</span></span>`;
    }
    return v||'—';
  }
});
