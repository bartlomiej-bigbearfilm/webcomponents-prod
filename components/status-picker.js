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
  attributeChangedCallback(n,ov,nv){ if(n==='value'){ this.value=nv||'sale'; this.#paintTrigger(); } }
  connectedCallback(){ this.#render(); }

  #render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:inline-block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
        .trigger{display:inline-flex;align-items:center;gap:.4rem;cursor:pointer}
        /* Popover menu */
        .menu{min-width:260px;display:flex;flex-direction:column;gap:.6rem;padding:.2rem}
        .item{
          display:flex;justify-content:center;align-items:center;
          padding:.35rem .5rem;border-radius:10px; cursor:pointer;
          transition:background-color .12s ease;
        }
        .item:hover{ background:var(--muted); }
      </style>
      <span class="trigger"></span>
    `;
    this.#paintTrigger();
    const trg=s.querySelector('.trigger');
    const open=()=> this.#open();
    trg.addEventListener('click', open);
    trg.addEventListener('touchstart', (e)=>{ e.preventDefault(); open(); }, {passive:false});
  }

  #paintTrigger(){
    const cur = STATUS[this.value] || STATUS.sale;
    const trg = this.shadowRoot.querySelector('.trigger');
    if(!trg) return;
    // Wyświetl w „Dane” dokładnie ten sam tag, co w menu
    trg.innerHTML = `<span class="tag ${cur.cls}">${cur.label}</span>`;
  }

  #open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');
    const box=document.createElement('div'); box.className='menu';

    // Większe odstępy, wycentrowane tagi, hover na całym wierszu
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
