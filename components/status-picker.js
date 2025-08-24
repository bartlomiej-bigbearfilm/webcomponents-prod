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
        .trigger{display:inline-flex;align-items:center;gap:.4rem;cursor:pointer}
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
    trg.innerHTML = `<span class="tag ${cur.cls}">${cur.label}</span>`;
  }

  #open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');
    const box=document.createElement('div');
    box.style.minWidth='240px';
    box.style.display='grid';
    box.style.gap='.35rem';

    // elementy listy z taką samą prezencją jak w danych
    box.innerHTML = Object.entries(STATUS).map(([k,v])=>`
      <button class="btn ghost" data-value="${k}" style="justify-content:flex-start;padding:.25rem .2rem;border:none;background:transparent">
        <span class="tag ${v.cls} hoverable" style="width:100%;justify-content:center">${v.label}</span>
      </button>
    `).join('');

    pop.appendChild(box);
    document.body.appendChild(pop);
    pop.showFor(anchor);

    const pick = (val)=>{
      this.setAttribute('value', val);
      this.dispatchEvent(new CustomEvent('select',{detail:{value:val}}));
      pop.hide(); pop.remove();
    };

    box.querySelectorAll('[data-value]').forEach(btn=>{
      const h = ()=> pick(btn.dataset.value);
      btn.addEventListener('click', h);
      btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); h(); }, {passive:false});
    });
    pop.addEventListener('close', ()=> pop.remove());
  }
});
