// components/status-picker.js
const STATUS = {
  sale: {label:'W sprzedaży',  cls:'sale'},
  live: {label:'Trwające',     cls:'live'},
  done: {label:'Zakończone',   cls:'Zakończone'},
  fail: {label:'Nieudane',     cls:'fail'},
};

customElements.define('status-picker', class extends HTMLElement{
  static get observedAttributes(){ return ['value']; }
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this.value=this.getAttribute('value')||'sale';
  }
  attributeChangedCallback(n,ov,nv){ if(n==='value'){ this.value=nv||'sale'; this.#paintTrigger(); } }
  connectedCallback(){ this.#render(); }

  #render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:inline-block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
        .trigger{display:inline-flex;align-items:center;gap:.4rem;cursor:pointer}
        /* Tag wyglądem jak w danych */
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.18rem .5rem;font-weight:600;border:1px solid transparent}
        .sale{ background:var(--st-sale-bg, rgba(249,115,22,.12)); border-color:var(--st-sale-bd,#fdba74); color:var(--st-sale-tx,#9a3412); }
        .live{ background:var(--st-live-bg, rgba(8,145,178,.12)); border-color:var(--st-live-bd,#67e8f9); color:var(--st-live-tx,#155e75); }
        .done{ background:var(--st-done-bg, rgba(5,150,105,.12)); border-color:var(--st-done-bd,#86efac); color:var(--st-done-tx,#065f46); }
        .fail{ background:var(--st-fail-bg, rgba(220,38,38,.12)); border-color:var(--st-fail-bd,#fca5a5); color:var(--st-fail-tx,#7f1d1d); }
      </style>
      <span class="trigger"></span>
    `;
    const trg=s.querySelector('.trigger');
    const open=()=> this.#open();
    trg.addEventListener('click', open);
    trg.addEventListener('touchstart', (e)=>{ e.preventDefault(); open(); }, {passive:false});
    this.#paintTrigger();
  }

  #paintTrigger(){
    const trg = this.shadowRoot.querySelector('.trigger');
    const cur = STATUS[this.value] || STATUS.sale;
    if(!trg) return;
    trg.innerHTML = `<span class="tag ${cur.cls}">${cur.label}</span>`;
  }

  #open(anchor=this.shadowRoot.querySelector('.trigger')){
    // Tworzymy popover w DOM głównym
    const pop=document.createElement('ui-popover');

    // Kontener menu + STYLE WSTRZYKNIĘTE DO POPOVERA (poza shadow!)
    const box=document.createElement('div');
    box.innerHTML = `
      <style>
        .menu{
          min-width:280px; display:flex; flex-direction:column; gap:14px;
          padding:.35rem;
        }
        .item{
          display:flex; align-items:center; justify-content:center;
          width:100%; padding:.55rem .7rem; border-radius:12px;
          cursor:pointer; transition: background-color .12s ease, transform .06s ease;
        }
        .item:hover{ background:var(--muted, #f0f2f8); }
        .item:focus{ outline:2px solid var(--accent,#6d28d9); }
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.18rem .6rem;font-weight:600;border:1px solid transparent}
        .sale{ background:var(--st-sale-bg, rgba(249,115,22,.12)); border-color:var(--st-sale-bd,#fdba74); color:var(--st-sale-tx,#9a3412); }
        .live{ background:var(--st-live-bg, rgba(8,145,178,.12)); border-color:var(--st-live-bd,#67e8f9); color:var(--st-live-tx,#155e75); }
        .done{ background:var(--st-done-bg, rgba(5,150,105,.12)); border-color:var(--st-done-bd,#86efac); color:var(--st-done-tx,#065f46); }
        .fail{ background:var(--st-fail-bg, rgba(220,38,38,.12)); border-color:var(--st-fail-bd,#fca5a5); color:var(--st-fail-tx,#7f1d1d); }
      </style>
      <div class="menu" role="listbox" aria-label="Wybierz status">
        ${Object.entries(STATUS).map(([k,v])=>`
          <div class="item" role="option" tabindex="0" data-value="${k}">
            <span class="tag ${v.cls}">${v.label}</span>
          </div>
        `).join('')}
      </div>
    `;
    pop.appendChild(box);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const pick = (val)=>{
      this.setAttribute('value', val);
      this.dispatchEvent(new CustomEvent('select',{detail:{value:val}}));
      pop.hide(); pop.remove();
    };

    // Klik i dotyk
    box.querySelectorAll('.item').forEach(el=>{
      const h = ()=> pick(el.dataset.value);
      el.addEventListener('click', h);
      el.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(); }, {passive:false});
    });

    // Klawiatura (opcjonalnie)
    const items = Array.from(box.querySelectorAll('.item'));
    let idx = Math.max(0, items.findIndex(i=>i.dataset.value===this.value));
    items[idx]?.focus();

    const onKey = (e)=>{
      if(e.key==='Escape'){ pop.hide(); pop.remove(); }
      if(e.key==='ArrowDown' || e.key==='ArrowRight'){ e.preventDefault(); idx = (idx+1)%items.length; items[idx].focus(); }
      if(e.key==='ArrowUp' || e.key==='ArrowLeft'){ e.preventDefault(); idx = (idx-1+items.length)%items.length; items[idx].focus(); }
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); pick(items[idx].dataset.value); }
    };
    box.addEventListener('keydown', onKey);

    pop.addEventListener('close', ()=> pop.remove());
  }
});
