// components/client-picker.js
import { store } from '../shared/store.js';

customElements.define('client-picker', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.value=''; }
  connectedCallback(){ this.render(); }
  set selected(v){ this.value=v||''; this.paintTrigger(); }
  get selected(){ return this.value; }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:inline-block}
        /* W „Dane” ma wyglądać jak zwykły tekst (bez podkreślenia/strzałki/ramki) */
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
    const t=this.shadowRoot.querySelector('.label');
    t.textContent = this.value || 'Wybierz klienta…';
  }

  open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');

    const menu=document.createElement('ui-menu');           // lista istniejących klientów
    const box=document.createElement('div');
    box.style.minWidth='320px';
    box.style.display='grid';
    box.style.gap='.6rem';

    // Sekcja „Nowy klient”: najpierw duży przycisk; po kliknięciu pokazuje się input + Dodaj
    const newWrap=document.createElement('div');
    newWrap.innerHTML = `
      <style>
        .row{display:flex;gap:.5rem}
        .row input{flex:1;border:1px solid var(--border);border-radius:10px;padding:.5rem .7rem;background:var(--surface);color:var(--text)}
        .hidden{display:none}
      </style>
      <button class="btn primary full" type="button">➕ Nowy klient</button>
      <div class="row hidden">
        <input placeholder="Nazwa nowego klienta…" />
        <button class="btn" type="button">Dodaj</button>
      </div>
    `;
    const newBtn = newWrap.querySelector('button.btn.primary');
    const row    = newWrap.querySelector('.row');
    const input  = newWrap.querySelector('input');
    const addBtn = newWrap.querySelector('.row .btn');

    newBtn.addEventListener('click', ()=>{
      newBtn.classList.add('hidden');
      row.classList.remove('hidden');
      setTimeout(()=> input?.focus(), 30);
    });

    const create = ()=>{
      const name=(input.value||'').trim(); if(!name) return;
      const list=store.getClients(); if(!list.includes(name)) store.setClients([...list,name]);
      finish(name, true);
    };
    addBtn.addEventListener('click', create);
    addBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); create(); }, {passive:false});
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') create(); });

    // Złożenie popovera
    box.append(newWrap, menu);
    pop.appendChild(box);
    document.body.appendChild(pop);

    // Załaduj listę
    const clients=store.getClients().map(c=>({label:c,value:c}));
    menu.data = clients;
    pop.showFor(anchor);

    const finish = (val, created=false)=>{
      this.value = val;
      this.paintTrigger();
      this.dispatchEvent(new CustomEvent('select', {detail:{value:this.value, created}}));
      pop.hide(); pop.remove();
    };

    menu.addEventListener('select', (e)=> finish(e.detail.value, false));
    pop.addEventListener('close', ()=> pop.remove());
  }
});
