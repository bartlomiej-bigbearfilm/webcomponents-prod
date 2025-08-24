// components/status-picker.js
const STATUS = {
  sale: {label:'W sprzedaży',  cls:'sale'},
  live: {label:'Trwające',     cls:'live'},
  done: {label:'Zakończone',   cls:'done'},
  fail: {label:'Nieudane',     cls:'fail'},
};

customElements.define('status-picker', class extends HTMLElement{
  static get observedAttributes(){ return ['value']; }
  constructor(){ super(); this.attachShadow({mode:'open'}); this.value=this.getAttribute('value')||'sale'; }
  attributeChangedCallback(n,ov,nv){ if(n==='value'){ this.value=nv||'sale'; this.#paint(); } }
  connectedCallback(){ this.#render(); }

  #render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:inline-block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
        .trigger{display:inline-flex;align-items:center;gap:.4rem;cursor:pointer}
        /* lokalne style tagu – pobierają kolory z :root jeśli są, inaczej fallback */
        .tag{display:inline-flex;align-items:center;gap:.4rem;border-radius:10px;padding:.18rem .5rem;font-weight:600;border:1px solid transparent}
        .sale{ background:var(--st-sale-bg, rgba(249,115,22,.12)); border-color:var(--st-sale-bd,#fdba74); color:var(--st-sale-tx,#9a3412); }
        .live{ background:var(--st-live-bg, rgba(8,145,178,.12)); border-color:var(--st-live-bd,#67e8f9); color:var(--st-live-tx,#155e75); }
        .done{ background:var(--st-done-bg, rgba(5,150,105,.12)); border-color:var(--st-done-bd,#86efac); color:var(--st-done-tx,#065f46); }
        .fail{ background:var(--st-fail-bg, rgba(220,38,38,.12)); border-color:var(--st-fail-bd,#fca5a5); color:var(--st-fail-tx,#7f1d1d); }
        /* menu */
        .menu{min-width:260px;display:flex;flex-direction:column;gap:.6rem;padding:.2rem}
        .item{display:flex;justify-content:center;align-items:center;padding:.35rem .5rem;border-radius:10px;cursor:pointer;transition:background-color .12s ease}
        .item:hover{ background:var(--muted, #f0f2f8); }
      </style>
      <span class="trigger"></span>
    `;
    const trg=s.querySelector('.trigger');
    const open=()=> this.#open();
    trg.addEventListener('click', open);
    trg.addEventListener('touchstart', (e)=>{ e.preventDefault(); open(); }, {passive:false});
    this.#paint();
  }

  #paint(){
    const cur = STATUS[this.value] || STATUS.sale;
    const trg = this.shadowRoot.querySelector('.trigger');
    if(!trg) return;
    trg.innerHTML = `<span class="tag ${cur.cls}">${cur.label}</span>`;
  }

  #open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');
    const box=document.createElement('div'); box.className='menu';
    box.innerHTML = Object.entries(STATUS).map(([k,v])=>`
      <div class="item" data-value="${k}">
        <span class="tag ${v.cls}">${v.label}</span>
      </div>
    `).join('');
    pop.appendChild(box);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const pick = (val)=>{
      this.setAttribute('value', val);
      this.dispatchEvent(new CustomEvent('select',{detail:{value:val}}));
      pop.hide(); pop.remove();
    };

    box.querySelectorAll('[data-value]').forEach(el=>{
      const h = ()=> pick(el.dataset.value);
      el.addEventListener('click', h);
      el.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(); }, {passive:false});
    });
    pop.addEventListener('close', ()=> pop.remove());
  }
});
