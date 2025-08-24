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
          border:1px dashed var(--border);border-radius:10px;padding:.28rem .55rem;
          cursor:pointer;background:var(--surface);display:inline-flex;align-items:center;gap:.45rem
        }
        .trigger:hover{ background:var(--muted); }
      </style>
      <span class="trigger">—</span>
    `;
    this.paintTrigger();
    const trg=s.querySelector('.trigger');
    const open=()=> this.open();
    trg.addEventListener('click', open);
    trg.addEventListener('touchstart', (e)=>{ e.preventDefault(); open(); }, {passive:false});
  }

  paintTrigger(){
    const t=this.shadowRoot.querySelector('.trigger');
    t.textContent = this.value || 'Wybierz klienta…';
  }

  open(anchor=this.shadowRoot.querySelector('.trigger')){
    const pop=document.createElement('ui-popover');

    const menu=document.createElement('ui-menu');
    const addBtn=document.createElement('button');
    addBtn.textContent='➕ Dodaj nowego klienta';
    addBtn.className='btn primary full';
    addBtn.style.marginTop='.5rem';

    const wrap=document.createElement('div');
    const inner=document.createElement('div');
    inner.style.minWidth='280px';
    inner.append(menu, addBtn);
    wrap.appendChild(inner);
    pop.appendChild(wrap);

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

    const onAdd = ()=>{
      const name=prompt('Nazwa nowego klienta'); if(!name) return;
      const list=store.getClients(); if(!list.includes(name)) store.setClients([...list,name]);
      finish(name, true);
    };
    addBtn.addEventListener('click', onAdd);
    addBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); onAdd(); }, {passive:false});

    pop.addEventListener('close', ()=> pop.remove());
  }
});
