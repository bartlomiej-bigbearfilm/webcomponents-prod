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
        .trigger{
          cursor:pointer; display:inline-flex; align-items:center; gap:.45rem;
          padding:0; background:transparent; border:0; color:inherit; font:inherit;
        }
        .chev{opacity:.6}
        .trigger:hover .label{ text-decoration:underline; }
      </style>
      <button class="trigger" type="button">
        <span class="label">—</span><span class="chev">▾</span>
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

    const menu=document.createElement('ui-menu');
    const box=document.createElement('div');
    box.style.minWidth='300px';
    box.style.display='grid';
    box.style.gap='.5rem';

    const addRow=document.createElement('div');
    addRow.innerHTML = `
      <style>
        .row{display:flex;gap:.4rem}
        .row input{flex:1;border:1px solid var(--border);border-radius:10px;padding:.45rem .6rem;background:var(--surface);color:var(--text)}
      </style>
      <div class="row">
        <input placeholder="Dodaj nowego klienta…" />
        <button class="btn primary" type="button">Dodaj</button>
      </div>
    `;
    box.append(menu, addRow);
    pop.appendChild(box);
    document.body.appendChild(pop);

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

    const input = addRow.querySelector('input');
    const btn   = addRow.querySelector('button');

    const create = ()=>{
      const name=(input.value||'').trim(); if(!name) return;
      const list=store.getClients(); if(!list.includes(name)) store.setClients([...list,name]);
      finish(name, true);
    };
    btn.addEventListener('click', create);
    btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); create(); }, {passive:false});
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') create(); });

    pop.addEventListener('close', ()=> pop.remove());
    // autofocus
    setTimeout(()=> input?.focus(), 50);
  }
});
