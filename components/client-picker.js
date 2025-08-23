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
        .trigger{border:1px dashed var(--border);border-radius:10px;padding:.2rem .45rem;cursor:pointer;background:var(--surface)}
      </style>
      <span class="trigger">—</span>
    `;
    this.paintTrigger();
    s.querySelector('.trigger').addEventListener('click', ()=> this.open());
  }

  paintTrigger(){
    const t=this.shadowRoot.querySelector('.trigger');
    t.textContent = this.value || 'Wybierz klienta…';
  }

  open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');
    // panel: lista + przycisk „dodaj”
    const menu=document.createElement('ui-menu');
    const addBtn=document.createElement('button');
    addBtn.textContent='➕ Dodaj nowego…';
    addBtn.className='btn';
    addBtn.style.cssText='margin-top:.4rem;width:100%';

    const wrap=document.createElement('div');
    wrap.innerHTML=`<div style="min-width:260px"></div>`;
    wrap.firstChild.append(menu, addBtn);
    pop.appendChild(wrap);

    document.body.appendChild(pop);
    const clients=store.getClients().map(c=>({label:c,value:c}));
    menu.data = clients;
    pop.showFor(anchor);

    menu.addEventListener('select', (e)=>{
      this.value = e.detail.value;
      this.paintTrigger();
      this.dispatchEvent(new CustomEvent('select', {detail:{value:this.value}}));
      pop.hide(); pop.remove();
    });
    addBtn.addEventListener('click', ()=>{
      const name=prompt('Nazwa klienta'); if(!name) return;
      const list=store.getClients(); if(!list.includes(name)) store.setClients([...list,name]);
      this.value=name; this.paintTrigger();
      this.dispatchEvent(new CustomEvent('select', {detail:{value:this.value, created:true}}));
      pop.hide(); pop.remove();
    });
    pop.addEventListener('close', ()=> pop.remove());
  }
});
