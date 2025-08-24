// components/data-card.js
// Data Card (web component) – wersja „od zera”, mechanika 1:1 z oryginału
// - klik na wartość = edycja inline
// - client & status: otwarcie <client-picker> / <status-picker> w miejscu
// - daty (sale/pre/prod/post/fix): osobny edytor start/end po kliknięciu w box
// - zapis do localStorage jak w oryginale (bbf:proj:<pid> + rejestr)
// - po zapisie: dispatchEvent('project:change', {detail:{project}}) + legacy refresh

(function(){
  const EN_DASH = '–'; // oryginalny separator
  const TAG = 'data-card';

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function fmtPLN(n){ const v = isFinite(n)? Number(n):0; return new Intl.NumberFormat('pl-PL').format(v); }
  function parseRange(str){
    if(!str) return null;
    const [a,b] = String(str).split(EN_DASH);
    if(!a||!b) return null;
    const s = new Date(a.trim()); const e = new Date(b.trim());
    if(isNaN(s)||isNaN(e)) return null;
    return { s, e };
  }
  function fmtShort(d){
    const dd=String(d.getDate()).padStart(2,'0');
    const mm=String(d.getMonth()+1).padStart(2,'0');
    const yy=String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  }
  function isoYMD(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
  function clampDate(d){ return new Date(new Date(d).setHours(0,0,0,0)); }

  class DataCard extends HTMLElement{
    constructor(){
      super();
      this.attachShadow({mode:'open'});
      this._pid = (new URLSearchParams(location.search).get('pid')) || 'p1';
      this._SAVE_KEY = 'bbf:proj:'+this._pid;
      this._REG_KEY  = 'bbf:projects';
      this._SEED = { id:this._pid, name:'Demo projekt', client:'Acme', description:'Spot reklamowy', budget:120000, fee:8, margin:22,
        // status opcjonalny – jeśli masz, zostanie wyświetlony i edytowalny
        // status: { key:'in-progress', label:'W realizacji', color:'#3b82f6' },
        periods:{ sale:'2025-08-01–2025-08-05', pre:'2025-08-06–2025-08-10', prod:'2025-08-11–2025-08-20', post:'2025-08-21–2025-08-28', fix:'2025-08-29–2025-08-30' }
      };
      this._activePopover = null; // 1 popover naraz
    }

    connectedCallback(){
      this.render();
    }

    // --- storage (zgodnie z oryginałem)
    _deepMerge(a,b){ const r=JSON.parse(JSON.stringify(a||{})); for(const k in (b||{})){ if(b[k] && typeof b[k]==='object' && !Array.isArray(b[k])) r[k]=this._deepMerge(r[k],b[k]); else r[k]=b[k]; } return r; }
    load(){
      try{
        const raw = localStorage.getItem(this._SAVE_KEY);
        return this._deepMerge(this._SEED, raw?JSON.parse(raw):{});
      }catch(e){ return this._SEED; }
    }
    save(part){
      const cur = this.load();
      const next = this._deepMerge(cur, part||{});
      try{
        localStorage.setItem(this._SAVE_KEY, JSON.stringify(next));
        // rejestr projektów
        let reg=[]; try{ const raw=localStorage.getItem(this._REG_KEY); if(raw) reg=JSON.parse(raw)||[]; }catch(_){}
        const idx = reg.findIndex(x=>x && x.id===next.id);
        const snap = { id: next.id, name: next.name||'', client: next.client||'', budget: next.budget||0, fee: next.fee||0, margin: next.margin||0 };
        if(idx>=0) reg[idx] = Object.assign({}, reg[idx], snap);
        else reg.push(snap);
        localStorage.setItem(this._REG_KEY, JSON.stringify(reg));
      }catch(_){}
      // sygnał dla innych kart
      try{ window.dispatchEvent(new CustomEvent('project:change', { detail:{ project: next }})); }catch(_){}
      // legacy odświeżenia (jeśli są)
      try{ if (typeof window.mountFinance==='function') window.mountFinance(); }catch(_){}
      try{ if (typeof window.renderCal==='function') window.renderCal(); }catch(_){}
      try{ if (typeof window.renderTimeline==='function') window.renderTimeline(); }catch(_){}
      return next;
    }

    // --- UI helpers
    _closePopover(){
      if(this._activePopover && this._activePopover.remove){
        this._activePopover.remove();
      }
      this._activePopover = null;
    }
    _placePopover(pop, anchor, maxW=320){
      const rect = anchor.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const left = Math.max(8, Math.min(vw-8-maxW, rect.left));
      const top  = Math.max(8, Math.min(vh-8-260, rect.bottom+6));
      Object.assign(pop.style, { position:'fixed', left:left+'px', top:top+'px', zIndex:'99999' });
      document.body.appendChild(pop);
      this._activePopover = pop;
      const onDoc = (e)=>{ if(!pop.contains(e.target)){ this._closePopover(); document.removeEventListener('mousedown', onDoc, true);} };
      setTimeout(()=> document.addEventListener('mousedown', onDoc, true), 0);
    }

    // --- edytory specjalne
    _openClientPicker(anchor){
      // pokaż inline picker w miejscu
      const p = this.load();
      const wrapper = document.createElement('div');
      wrapper.className = 'dc-pop';
      wrapper.innerHTML = `<style>
        .dc-pop{background:var(--surface, #fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:.5rem;min-width:260px}
      </style>`;
      const cp = document.createElement('client-picker');
      if (p.client) cp.selected = p.client;
      cp.addEventListener('select', (ev)=>{
        const name = ev.detail && ev.detail.value ? String(ev.detail.value).trim() : '';
        this.save({ client: name });
        this.render(); this._closePopover();
      });
      wrapper.appendChild(cp);
      this._placePopover(wrapper, anchor, 360);
    }

    _openStatusPicker(anchor){
      const p = this.load();
      const wrap = document.createElement('div');
      wrap.className = 'dc-pop';
      wrap.innerHTML = `<style>
        .dc-pop{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:.5rem;min-width:260px}
      </style>`;
      const sp = document.createElement('status-picker');
      if (p.status) sp.value = p.status; // zgodnie z Twoją implementacją (może być string / obiekt)
      sp.addEventListener('select', (ev)=>{
        const val = ev.detail && (ev.detail.value ?? ev.detail); // wspiera różny kształt
        this.save({ status: val });
        this.render(); this._closePopover();
      });
      wrap.appendChild(sp);
      this._placePopover(wrap, anchor, 360);
    }

    _openDateEditor(anchor, key, which){ // which: 'start' | 'end'
      const p = this.load();
      const r = parseRange((p.periods||{})[key]||'') || { s: new Date(), e: new Date() };
      const cur = which==='start' ? r.s : r.e;

      const pop = document.createElement('div');
      pop.className = 'dc-pop';
      pop.innerHTML = `
        <style>
          .dc-pop{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:.75rem;min-width:240px}
          .dc-row{display:flex;align-items:center;gap:.5rem}
          .dc-row input[type="date"]{padding:.45rem .6rem;border:1px solid var(--border,#e5e7eb);border-radius:10px;font:inherit}
          .dc-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:.6rem}
          .dc-actions button{padding:.45rem .8rem;border-radius:10px;border:1px solid var(--border,#e5e7eb);background:var(--surface,#fff);cursor:pointer}
          .dc-actions .ok{background:var(--accent,#6d28d9);border-color:var(--accent,#6d28d9);color:#fff}
        </style>
        <div class="dc-row">
          <label class="small" style="opacity:.7">${which==='start'?'Start':'Koniec'}</label>
          <input id="d" type="date" value="${isoYMD(cur)}">
        </div>
        <div class="dc-actions">
          <button class="cancel" type="button">Anuluj</button>
          <button class="ok" type="button">OK</button>
        </div>
      `;
      const input = pop.querySelector('#d');
      pop.querySelector('.cancel').addEventListener('click', ()=> this._closePopover());
      pop.querySelector('.ok').addEventListener('click', ()=>{
        const val = input.value ? clampDate(new Date(input.value)) : cur;
        const next = parseRange((this.load().periods||{})[key]||'') || { s: r.s, e: r.e };
        if (which==='start'){ next.s = val; if (next.e < next.s) next.e = next.s; }
        else { next.e = val; if (next.e < next.s) next.s = next.e; }
        const str = `${isoYMD(next.s)}${EN_DASH}${isoYMD(next.e)}`;
        const periods = Object.assign({}, (this.load().periods||{}), { [key]: str });
        this.save({ periods }); this.render(); this._closePopover();
      });
      this._placePopover(pop, anchor, 280);
      input.focus();
    }

    // --- render
    _statusTag(status){
      // status może być stringiem lub obiektem {label,color}
      if(!status) return '—';
      let label='', color='';
      if (typeof status==='string'){ label = status; color = ''; }
      else { label = status.label || status.key || 'Status'; color = status.color || ''; }
      const bg = color ? `${color}22` : 'rgba(125,125,140,.15)';
      const bd = color ? color : 'rgba(125,125,140,.35)';
      const fg = color ? color : 'inherit';
      return `<span class="tag" style="--tag-bg:${bg};--tag-bd:${bd};--tag-fg:${fg}">${esc(label)}</span>`;
    }

    _formatVal(k, v){
      if (['sale','pre','prod','post','fix'].includes(k)){
        const r = parseRange(v); if(!r) return '—';
        const s = fmtShort(r.s), e = fmtShort(r.e);
        return `<span class="range-inline">
          <span class="box" data-edit="start">${s}</span>
          <span class="dash">${EN_DASH}</span>
          <span class="box" data-edit="end">${e}</span>
        </span>`;
      }
      if (k==='budget') return fmtPLN(v);
      if (k==='fee' || k==='margin') return (v==null?'0':v)+'%';
      if (k==='status') return this._statusTag(v);
      if (k==='client'){
        const name = v || '—';
        return `<span class="client-pill" title="Zmień klienta">${esc(name)}</span>`;
      }
      if (k==='description') return esc(v||'');
      return v==null || v==='' ? '—' : esc(v);
    }

    render(){
      const p = this.load();
      const rows = [
        { key:'name', label:'Nazwa' },
        { key:'client', label:'Klient' },
        { key:'status', label:'Status' },  // pokaże „—” jeśli brak
        { key:'description', label:'Opis' },
        { key:'budget', label:'Budżet' },
        { key:'fee', label:'Prowizja' },
        { key:'margin', label:'Marża' },
        { key:'sale', label:'Sprzedaż (kampania)' },
        { key:'pre', label:'Pre-produkcja' },
        { key:'prod', label:'Produkcja' },
        { key:'post', label:'Post-produkcja' },
        { key:'fix', label:'Poprawki' },
      ];

      const css = `
        :host{display:block}
        .card{border:1px solid var(--border,#e5e7eb);border-radius:16px;background:var(--surface,#fff);padding:1rem}
        h2{margin:0 0 .8rem 0;font-size:1.05rem}
        .kv{display:grid;grid-template-columns:160px 1fr;gap:.35rem .75rem;align-items:center}
        .kv .key{opacity:.7;font-size:.9rem}
        .value{border:1px dashed transparent;padding:.25rem .5rem;border-radius:10px;min-height:28px;display:flex;align-items:center;gap:.4rem}
        .value:hover{border-color:var(--border,#e5e7eb);background:rgba(125,125,140,.06);cursor:pointer}
        .value.editing{outline:2px solid var(--accent,#6d28d9);background:rgba(109,40,217,.06);border-color:transparent}
        input[type="text"], textarea, input[type="number"]{width:100%;border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:.5rem .6rem;font:inherit;background:var(--surface,#fff)}
        textarea{min-height:80px;resize:vertical}
        .range-inline{display:flex;align-items:center;gap:.45rem}
        .range-inline .box{border:1.5px dashed var(--border,#d1d5db);border-radius:10px;padding:.2rem .45rem;background:var(--surface,#fff)}
        .range-inline .box:hover{box-shadow:0 0 0 3px rgba(109,40,217,.14);border-color:var(--accent,#6d28d9)}
        .range-inline .dash{opacity:.6}
        .client-pill{display:inline-flex;align-items:center;padding:.2rem .5rem;border-radius:8px;background:rgba(125,125,140,.12);border:1px solid rgba(125,125,140,.26)}
        .tag{display:inline-flex;align-items:center;padding:.2rem .5rem;border-radius:8px;background:var(--tag-bg, rgba(125,125,140,.12));border:1px solid var(--tag-bd, rgba(125,125,140,.26));color:var(--tag-fg,inherit)}
        .sr{position:absolute;left:-9999px}
      `;

      const html = `
        <div class="card">
          <h2>Dane</h2>
          <div class="kv" id="kv">
            ${rows.map(r=>`
              <div class="key">${esc(r.label)}</div>
              <div class="value" data-key="${esc(r.key)}">${this._formatVal(r.key, r.key==='status'?p.status:(r.key in (p.periods||{})?(p.periods||{})[r.key]:p[r.key]))}</div>
            `).join('')}
          </div>
          <span class="sr">Kliknij wartość, aby edytować</span>
        </div>
      `;

      this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;
      this._wire();
    }

    _wire(){
      const kv = this.shadowRoot.getElementById('kv');
      kv.querySelectorAll('.value').forEach(val=>{
        val.addEventListener('click', (ev)=>{
          const key = val.dataset.key;
          if (['sale','pre','prod','post','fix'].includes(key)){
            const target = ev.target && ev.target.closest('[data-edit]') ? ev.target.closest('[data-edit]') : val.querySelector('.box:first-child');
            const which = target && target.getAttribute('data-edit') ? target.getAttribute('data-edit') : 'start';
            this._openDateEditor(target || val, key, which);
            return;
          }
          if (key==='client'){ this._openClientPicker(val); return; }
          if (key==='status'){ this._openStatusPicker(val); return; }

          // zwykłe pola: name / description / budget / fee / margin
          this._editInline(val, key);
        });
      });
    }

    _editInline(cell, key){
      if (cell.classList.contains('editing')) return;
      cell.classList.add('editing');
      const p = this.load();

      const commit = (val)=>{
        cell.classList.remove('editing');
        if (key==='description') this.save({ description: val });
        else if (key==='name') this.save({ name: val });
        else if (key==='budget') this.save({ budget: Number(val)||0 });
        else if (key==='fee') this.save({ fee: parseInt(val,10)||0 });
        else if (key==='margin') this.save({ margin: parseInt(val,10)||0 });
        this.render();
      };
      const cancel = ()=>{ this.render(); };

      if (key==='description'){
        cell.innerHTML = `<textarea id="eDesc" placeholder="Opis…">${esc(p.description||'')}</textarea>`;
        const ta = cell.querySelector('#eDesc');
        ta.focus();
        ta.addEventListener('keydown', e=>{
          if (e.key==='Escape'){ e.preventDefault(); cancel(); }
          if (e.key==='Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); commit(ta.value); }
        });
        ta.addEventListener('blur', ()=> commit(ta.value));
        return;
      }

      if (key==='name' || key==='client'){
        const old = key==='name' ? (p.name||'') : (p.client||'');
        cell.innerHTML = `<input id="eTxt" type="text" value="${esc(old)}" placeholder="${key==='name'?'Nazwa':'Klient'}">`;
        const inp = cell.querySelector('#eTxt');
        inp.focus(); inp.select();
        inp.addEventListener('keydown', e=>{
          if (e.key==='Escape'){ e.preventDefault(); cancel(); }
          if (e.key==='Enter'){ e.preventDefault(); commit(inp.value.trim()); }
        });
        inp.addEventListener('blur', ()=> commit(inp.value.trim()));
        return;
      }

      if (key==='budget'){
        cell.innerHTML = `<input id="eBudget" type="number" step="1" min="0" value="${Number(p.budget||0)}">`;
        const inp = cell.querySelector('#eBudget'); inp.focus(); inp.select();
        const go = ()=> commit(inp.value);
        inp.addEventListener('keydown', e=>{ if(e.key==='Escape'){ e.preventDefault(); cancel(); } if(e.key==='Enter'){ e.preventDefault(); go(); } });
        inp.addEventListener('blur', go);
        return;
      }

      if (key==='fee' || key==='margin'){
        cell.innerHTML = `<input id="eNum" type="number" step="1" min="0" max="100" value="${parseInt(key==='fee'?p.fee:p.margin)||0}">`;
        const inp = cell.querySelector('#eNum'); inp.focus(); inp.select();
        const go = ()=> commit(inp.value);
        inp.addEventListener('keydown', e=>{ if(e.key==='Escape'){ e.preventDefault(); cancel(); } if(e.key==='Enter'){ e.preventDefault(); go(); } });
        inp.addEventListener('blur', go);
        return;
      }
    }
  }

  customElements.define(TAG, DataCard);
})();
