// components/client-picker.js
import { store } from '../shared/store.js';

customElements.define('client-picker', class extends HTMLElement{
  static get observedAttributes(){ return ['value','selected']; }
  constructor(){ super(); this.attachShadow({mode:'open'}); this.value=''; }
  attributeChangedCallback(name, oldV, newV){
    if(oldV === newV) return;
    if(name === 'value' || name === 'selected'){
      this.value = newV || '';
      this.paintTrigger();
    }
  }
  connectedCallback(){ this.render(); }

  set selected(v){ this.value = v || ''; this.paintTrigger(); }
  get selected(){ return this.value; }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:inline-block}
        .trigger{
          cursor:pointer; display:inline-flex; align-items:center; gap:.45rem;
          padding:0; background:transparent; border:0; color:inherit; font:inherit;
        }
        .trigger:hover{ text-decoration:none; }
      </style>
      <button class="trigger" type="button">
        <span class="label">—</span>
      </button>
    `;
    this.paintTrigger();
    const trg=s.querySelector('.trigger');
    const open=()=> this.open();
    trg.addEventListener('click', open);
    trg.addEventListener('touchstart', (e)=>{ e.preventDefault(); open(); }, {passive:false});
  }

  paintTrigger(){
    const t=this.shadowRoot?.querySelector('.label');
    if(!t) return;
    t.textContent = this.value || 'Wybierz klienta…';
  }

  open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');

    const menu=document.createElement('ui-menu');           // lista istniejących klientów
    const box=document.createElement('div');
    box.style.minWidth='320px';
    box.style.display='grid';
    box.style.gap='.6rem';

    // Sekcja „Nowy klient” NA DOLE popovera
    const newWrap=document.createElement('div');
    newWrap.innerHTML = `
      <style>
        .row{display:flex;gap:.5rem;margin-top:.4rem}
        .row input{flex:1;border:1px solid var(--border);border-radius:10px;padding:.5rem .7rem;background:var(--surface);color:var(--text)}
        .hidden{display:none}
      </style>
      <div class="row hidden">
        <input placeholder="Nazwa nowego klienta…" />
        <button class="btn" type="button">Dodaj</button>
      </div>
      <button class="btn primary full new-btn" type="button" style="margin-top:.2rem">➕ Nowy klient</button>
    `;
    const row    = newWrap.querySelector('.row');
    const input  = newWrap.querySelector('input');
    const addBtn = newWrap.querySelector('.row .btn');
    const newBtn = newWrap.querySelector('.new-btn');

    newBtn.addEventListener('click', ()=>{
      newBtn.classList.add('hidden');
      row.classList.remove('hidden');
      setTimeout(()=> input?.focus(), 30);
    });

    const create = ()=>{
      const name=(input.value||'').trim(); if(!name) return;
      const list=store.getClients(); if(!list.includes(name)) store.setClients([...list,name]);
      this.value = name;
      this.paintTrigger();
      this.dispatchEvent(new CustomEvent('select', {detail:{value:this.value, created:true}}));
      pop.hide(); pop.remove();
    };
    addBtn.addEventListener('click', create);
    addBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); create(); }, {passive:false});
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') create(); });

    // Złożenie popovera – najpierw lista, potem nowy klient na DOLE
    box.append(menu, newWrap);
    pop.appendChild(box);
    document.body.appendChild(pop);

    // Załaduj listę
    const clients=store.getClients().map(c=>({label:c,value:c}));
    menu.data = clients;
    pop.showFor(anchor);

    menu.addEventListener('select', (e)=>{
      this.value = e.detail.value;
      this.paintTrigger();
      this.dispatchEvent(new CustomEvent('select', {detail:{value:this.value}}));
      pop.hide(); pop.remove();
    });
    pop.addEventListener('close', ()=> pop.remove());
  }
});
