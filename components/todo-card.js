import { store, cryptoId } from '../shared/store.js';

customElements.define('todo-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.list = store.loadTodos(); }
  connectedCallback(){ this.render(); }

  save(){ store.saveTodos(this.list); this.render(); }

  render(){
    const s=this.shadowRoot;
    const style = `
      <style>
        :host{display:block}
        .todo{display:grid;gap:.5rem}
        .todo-item{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.6rem;border:1px solid var(--border);border-radius:12px;padding:.5rem .6rem;background:var(--surface);box-shadow:0 1px 0 rgba(0,0,0,.03)}
        .todo-empty{opacity:.7}
        .row{margin-top:.5rem;display:flex;gap:.5rem}
      </style>
    `;
    s.innerHTML = `
      ${style}
      <h2 style="margin-top:0">To-do list (projekt)</h2>
      <div class="todo">
        ${this.list.length? this.list.map(t=>`
          <div class="todo-item" data-id="${t.id}">
            <span class="handle">⋮⋮</span>
            <label class="text"><input type="checkbox" ${t.done?'checked':''} data-act="toggle" data-id="${t.id}"> ${t.text}</label>
            <button data-act="del" data-id="${t.id}" title="Usuń">×</button>
          </div>`).join('') : `<div class="todo-empty">Brak zadań</div>`}
      </div>
      <div class="row"><button data-act="add">+ Dodaj</button><button data-act="clear">Usuń wykonane</button></div>
    `;

    s.querySelectorAll('[data-act="toggle"]').forEach(ch=>{
      ch.addEventListener('change', e=>{
        const id=e.target.dataset.id;
        this.list=this.list.map(x=>x.id===id?{...x,done:e.target.checked}:x);
        this.save();
      });
    });
    s.querySelectorAll('[data-act="del"]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id=e.target.dataset.id;
        this.list=this.list.filter(x=>x.id!==id);
        this.save();
      });
    });
    s.querySelector('[data-act="add"]').addEventListener('click', ()=>{
      const txt = prompt('Treść zadania'); if(!txt) return;
      this.list=[...this.list,{text:txt,done:false,id:cryptoId()}]; this.save();
    });
    s.querySelector('[data-act="clear"]').addEventListener('click', ()=>{
      this.list=this.list.filter(t=>!t.done); this.save();
    });
  }
});
