// components/status-picker.js
const STATUS = {
  sale: {label:'W sprzedaży',  cls:'sale',  emoji:'🟠'},
  live: {label:'Trwające',     cls:'live',  emoji:'🟢'},
  done: {label:'Zakończone',   cls:'done',  emoji:'🔵'},
  fail: {label:'Nieudane',     cls:'fail',  emoji:'🔴'},
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
        .trigger{display:inline-flex;align-items:center;gap:.4rem;border-radius:999px;padding:.18rem .55rem;font-weight:600;border:1px solid transparent;cursor:pointer}
        .sale{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
        .live{background:#ecfeff;border-color:#a5f3fc;color:#155e75}
        .done{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
        .fail{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
        .menu{min-width:220px}
        .item{padding:.45rem .6rem;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:.5rem}
        .item:hover{background:var(--muted)}
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
    trg.className = `trigger ${cur.cls}`;
    trg.textContent = `${cur.label}`;
  }

  #open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');
    const box=document.createElement('div'); box.className='menu';
    box.innerHTML = Object.entries(STATUS).map(([k,v])=>`
      <div class="item" data-value="${k}">${v.emoji} ${v.label}</div>
    `).join('');
    pop.appendChild(box);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const pick = (val)=>{
      this.setAttribute('value', val);
      this.dispatchEvent(new CustomEvent('select',{detail:{value:val}}));
      pop.hide(); pop.remove();
    };

    box.querySelectorAll('.item').forEach(it=>{
      const h = ()=> pick(it.dataset.value);
      it.addEventListener('click', h);
      it.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(); }, {passive:false});
    });
    pop.addEventListener('close', ()=> pop.remove());
  }
});