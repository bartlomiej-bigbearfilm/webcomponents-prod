// components/data-card.js
import { store } from '../shared/store.js';
import { fmtCurrency, fmtShort } from '../shared/utils.js';

customElements.define('data-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){ this.render(); }

  // ---------------- helpers ----------------
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
    const cleanup=()=>{ picker.removeEventListener('save', onSave); pop.removeEventListener('close', cleanup); pop.hide(); pop.remove(); };
    picker.addEventListener('save', onSave);
    pop.addEventListener('close', cleanup);
  }

  // --------------- render ------------------
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
        .kv{display:grid;grid-template-columns:160px 1fr;gap:.5rem .75rem;align-items:center}
        .label{color:var(--text-dim)}
        .value{
          cursor:pointer;border-radius:10px;padding:.35rem .45rem;
          border:1.5px dashed var(--border);background:var(--surface);
          transition: background-color .12s ease, border-color .12s ease, box-shadow .12s ease;
          min-height:34px; display:flex; align-items:center; gap:.5rem;
        }
        .value:hover{ background:var(--muted); border-color:var(--border); box-shadow:0 2px 10px rgba(0,0,0,.04) }
        .value.editing{ background:rgba(109,40,217,.06); outline:2px solid rgba(109,40,217,.3); border-color:transparent; }
        .value :is(input,textarea){ width:100%; border:1px solid var(--border); border-radius:10px; padding:.5rem .6rem; font:inherit; background:var(--surface); }

        .range-inline{display:inline-flex;align-items:center;gap:.45rem;white-space:nowrap}
        .range-inline .box{
          display:inline-flex;align-items:center;border:1.5px dashed var(--border);
          border-radius:10px;padding:.25rem .5rem;min-width:92px;background:var(--surface);
          transition: box-shadow .12s ease, border-color .12s ease;
        }
        .range-inline .box:hover{ box-shadow:0 0 0 3px rgba(109,40,217,.14); border-color:var(--accent,#6d28d9) }
        .range-inline .dash{opacity:.65}

        /* Tagi statusów (jak w całym systemie) */
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.22rem .55rem;font-weight:600;border:1px solid transparent}
        .tag.sale{background:var(--st-sale-bg);border-color:var(--st-sale-bd);color:var(--st-sale-tx);}
        .tag.live{background:var(--st-live-bg);border-color:var(--st-live-bd);color:var(--st-live-tx);}
        .tag.done{background:var(--st-done-bg);border-color:var(--st-done-bd);color:var(--st-done-tx);}
        .tag.fail{background:var(--st-fail-bg);border-color:var(--st-fail-bd);color:var(--st-fail-tx);}
      </style>

      <h2 style="margin-top:0">Dane</h2>
      <div class="kv">
        ${rows.map(([l,k,v])=>`
          <div class="label">${l}</div>
          <div class="value" data-key="${k}" tabindex="0">${this._fmt(k,v)}</div>
        `).join('')}
      </div>
    `;

    // ---- klient: picker w środku pola (ramka zostaje) ----
    {
      const host = s.querySelector('.value[data-key="client"]');
      const slot = host?.querySelector('.client-slot');
      if(host && slot){
        const cp = document.createElement('client-picker');
        slot.replaceWith(cp);                         // wpinamy
        queueMicrotask(()=> { try{ cp.selected = p.client || ''; }catch(_){} }); // ustaw wartość po wpięciu
        // klik obsługuje sam picker; nic nie bąbelkujemy
        cp.addEventListener('click', (e)=> e.stopPropagation());
        cp.addEventListener('touchstart', (e)=> e.stopPropagation(), {passive:true});
        cp.addEventListener('select', (ev)=> this._save('client', ev.detail.value));
      }
    }

    // ---- status: tag + picker w środku pola ----
    {
      const host = s.querySelector('.value[data-key="status"]');
      const slot = host?.querySelector('.status-slot');
      if(host && slot){
        const sp = document.createElement('status-picker');
        slot.replaceWith(sp);
        queueMicrotask(()=> { try{ sp.setAttribute('value', (typeof p.status==='string'? p.status : (p.status?.key || 'sale'))); }catch(_){} });
        sp.addEventListener('click', (e)=> e.stopPropagation());
        sp.addEventListener('touchstart', (e)=> e.stopPropagation(), {passive:true});
        sp.addEventListener('select', (ev)=> this._save('status', ev.detail.value));
      }
    }

    // ---- edycja inline dla pozostałych pól ----
    s.querySelectorAll('.value').forEach(val=>{
      const k = val.dataset.key;
      if(k==='client' || k==='status') return;

      if(['sale','pre','prod','post','fix'].includes(k)){
        // klik w całe pole, ale pozycjonujemy po pierwszym boxie
        const anchor = val.querySelector('.box') || val;
        this._tap(val, ()=> this._openRangePicker(anchor, k));
        return;
      }

      if(k==='budget' || k==='fee' || k==='margin'){
        this._tap(val, ()=>{
          if(val.classList.contains('editing')) return;
          val.classList.add('editing');
          const cur = (k==='budget') ? Number(p.budget||0) : parseInt(p[k]||0,10);
          val.innerHTML = `<input type="number" ${k==='budget'?'step="1" min="0"':'step="1" min="0" max="100"'} value="${isNaN(cur)?0:cur}">`;
          const inp = val.querySelector('input'); inp.focus(); inp.select();
          const commit=()=>{ const v = inp.value;
            if(k==='budget'){ const n=parseFloat(v); if(!Number.isNaN(n)) this._save('budget', n); }
            else { const n=parseInt(v,10); if(!Number.isNaN(n)) this._save(k, n); }
          };
          const cancel=()=> this.render();
          inp.addEventListener('keydown', e=>{
            if(e.key==='Escape'){ e.preventDefault(); cancel(); }
            if(e.key==='Enter'){ e.preventDefault(); commit(); }
          });
          inp.addEventListener('blur', commit);
        });
        return;
      }

      if(k==='name' || k==='description'){
        this._tap(val, ()=>{
          if(val.classList.contains('editing')) return;
          val.classList.add('editing');
          if(k==='description'){
            val.innerHTML = `<textarea>${p.description||''}</textarea>`;
            const ta = val.querySelector('textarea'); ta.focus(); ta.selectionStart = ta.value.length;
            const commit=()=> this._save('description', ta.value);
            const cancel=()=> this.render();
            ta.addEventListener('keydown', e=>{
              if(e.key==='Escape'){ e.preventDefault(); cancel(); }
              if((e.key==='Enter' && (e.metaKey||e.ctrlKey))){ e.preventDefault(); commit(); }
            });
            ta.addEventListener('blur', commit);
          } else {
            val.innerHTML = `<input type="text" value="${p.name||''}">`;
            const inp = val.querySelector('input'); inp.focus(); inp.select();
            const commit=()=> this._save('name', inp.value.trim());
            const cancel=()=> this.render();
            inp.addEventListener('keydown', e=>{
              if(e.key==='Escape'){ e.preventDefault(); cancel(); }
              if(e.key==='Enter'){ e.preventDefault(); commit(); }
            });
            inp.addEventListener('blur', commit);
          }
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
