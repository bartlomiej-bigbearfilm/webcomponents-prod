// components/data-card.js
import { store } from '../shared/store.js';
import { fmtCurrency, fmtShort } from '../shared/utils.js';

customElements.define('data-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }

  // --- helpers ---
  isTouch(){ return matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window); }
  tap(el, handler){
    if(!el) return;
    const h=(e)=>{ handler(e); };
    el.addEventListener('click', h);
    el.addEventListener('pointerdown', (e)=>{ if(e.pointerType==='touch'){ e.preventDefault(); h(e); } }, {passive:false,capture:true});
    el.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(e); }, {passive:false,capture:true});
  }
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
  openRangePicker(anchor, key){
    if(this.isTouch()){
      const cur = (store.project.periods||{})[key] || '';
      const today = new Date().toISOString().slice(0,10);
      const nv = prompt('Zakres (RRRR-MM-DD–RRRR-MM-DD)', cur || `${today}–${today}`);
      if(nv) this.saveField(key, nv);
      return;
    }
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
        .value{cursor:pointer;border-radius:8px;padding:.28rem .36rem;border:1px dashed var(--border);background:var(--surface);outline:none}
        .value[role="button"]{user-select:none}
        .value.no-cursor{cursor:default}
        .value *{pointer-events:none} /* ważne: klik łapiemy na kontenerze, dzieci nie przechwytują */
        .range-inline{display:inline-flex;align-items:center;gap:.35rem;white-space:nowrap}
        .range-inline .box{display:inline-flex;align-items:center;border:1.5px dashed var(--border);border-radius:10px;padding:.2rem .4rem;min-width:92px}
        .range-inline .dash{opacity:.7}
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:999px;padding:.18rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
        .tag.live{background:#ecfeff;border-color:#a5f3fc;color:#155e75}
        .tag.done{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
        .tag.fail{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
      </style>
      <h2 style="margin-top:0">Dane</h2>
      <div class="kv">
        ${rows.map(([l,k,v])=>`<div class="label">${l}</div><div class="value" data-key="${k}" tabindex="0" role="button">${this._fmt(k,v)}</div>`).join('')}
      </div>
    `;

    // bindy
    s.querySelectorAll('.value').forEach(el=>{
      const k = el.dataset.key;
      if(k==='client') this._bindClient(el, p);
      else if(k==='status') this._bindStatus(el, p);
      else if(['sale','pre','prod','post','fix'].includes(k)){
        this.tap(el, ()=> this.openRangePicker(el, k));
      } else if(k==='budget'){
        this.tap(el, ()=>{ const nv = parseFloat(prompt('Budżet', p.budget||0)); if(!Number.isNaN(nv)) this.saveField('budget', nv); });
      } else if(k==='fee' || k==='margin'){
        this.tap(el, ()=>{ const nv = parseInt(prompt(k.toUpperCase(), p[k]||0),10); if(!Number.isNaN(nv)) this.saveField(k, nv); });
      } else if(k==='name' || k==='description'){
        this.tap(el, ()=>{ const nv = prompt(k==='name'?'Nazwa projektu':'Opis', p[k]||''); if(nv!=null) this.saveField(k, nv); });
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

  _bindClient(host, p){
    const ClientEl = customElements.get('client-picker');
    if(ClientEl && !this.isTouch()){
      // użyj komponentu tylko na desktopie
      host.classList.add('no-cursor');
      host.innerHTML = `<client-picker></client-picker>`;
      const cp = host.querySelector('client-picker');
      cp.selected = p.client || '';
      // mimo że dzieci mają pointer-events:none w CSS, tu chcemy wyjątek:
      cp.style.pointerEvents = 'auto';
      this.tap(cp, (e)=> e.stopPropagation()); // nie przepuszczaj do hosta
      cp.addEventListener('select', (ev)=> this.saveField('client', ev.detail.value));
      return;
    }
    // fallback (iPhone / brak komponentu)
    this.tap(host, ()=>{
      const list = (store.getClients?.() || []);
      const numbered = list.map((c,i)=>`${i+1}. ${c}`).join('\n');
      const input = prompt(`Wpisz nazwę klienta\nalbo numer z listy:\n${numbered}`, p.client||'');
      if(input==null) return;
      const num = parseInt(input,10);
      const val = (!Number.isNaN(num) && list[num-1]) ? list[num-1] : input.trim();
      if(val) this.saveField('client', val);
    });
  }

  _bindStatus(host, p){
    const StatusEl = customElements.get('status-picker');
    if(StatusEl && !this.isTouch()){
      host.classList.add('no-cursor');
      host.innerHTML = `<status-picker value="${p.status||'sale'}"></status-picker>`;
      const sp = host.querySelector('status-picker');
      sp.style.pointerEvents='auto';
      this.tap(sp, (e)=> e.stopPropagation());
      sp.addEventListener('select', (ev)=> this.saveField('status', ev.detail.value));
      return;
    }
    // fallback (iPhone / brak komponentu)
    const map={sale:['W sprzedaży','sale'],live:['Trwające','live'],done:['Zakończone','done'],fail:['Nieudane','fail']};
    const key = map[p.status]? p.status : 'sale';
    const [txt,cls] = map[key];
    host.innerHTML = `<span class="tag ${cls}">${txt}</span>`;
    this.tap(host, ()=>{
      const next = prompt('status: sale | live | done | fail', p.status||'sale');
      if(next) this.saveField('status', next);
    });
  }
});