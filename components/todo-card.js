import { store, cryptoId } from '../shared/store.js';

customElements.define('todo-card', class extends HTMLElement{
  constructor(){ 
    super(); 
    this.attachShadow({mode:'open'}); 
    this.list = store.loadTodos(); 
    this._dragId = null;
  }
  connectedCallback(){ this.render(); }

  save(){ store.saveTodos(this.list); this.render(); }

  render(){
    const s=this.shadowRoot;
    const style = `
      <style>
        :host{display:block}
        .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}
        .todo{display:grid;gap:.5rem}
        .todo-item{
          display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.6rem;
          border:1px solid var(--border);border-radius:12px;padding:.5rem .6rem;
          background:var(--surface);box-shadow:0 1px 0 rgba(0,0,0,.03)
        }
        .todo-item.dragging{opacity:.6}
        .todo-item .handle{cursor:grab;user-select:none}
        .todo-item .text{line-height:1.3}
        .todo-empty{opacity:.7}
        .actions{display:flex;gap:.5rem;margin-top:.5rem}
        button{border:1px solid var(--border);border-radius:10px;padding:.3rem .6rem;background:var(--surface);cursor:pointer}
        button:hover{filter:brightness(.97)}
      </style>
    `;
    s.innerHTML = style + `
      <div class="head"><h2 style="margin:0">To‑do list (projekt)</h2></div>
      <div class="todo"></div>
      <div class="actions">
        <button data-act="add">+ Dodaj</button>
        <button data-act="clear">Usuń wykonane</button>
      </div>
    `;

    const list = this.list;
    const root = s.querySelector('.todo');
    if(!list || !list.length){
      root.innerHTML = '<div class="todo-empty">Brak zadań</div>';
    } else {
      root.innerHTML = list.map(t=>`
        <div class="todo-item" draggable="true" data-id="${t.id}">
          <span class="handle" title="Przeciągnij">⋮⋮</span>
          <label class="text"><input style="margin-right:.5rem" type="checkbox" ${t.done?'checked':''} data-act="toggle" data-id="${t.id}"> ${t.text}</label>
          <button data-act="del" data-id="${t.id}" title="Usuń">×</button>
        </div>
      `).join('');
    }

    // Toggle
    s.querySelectorAll('[data-act="toggle"]').forEach(inp=>{
      inp.addEventListener('change', e=>{
        const id=e.target.dataset.id;
        this.list=this.list.map(x=>x.id===id?{...x,done:e.target.checked}:x);
        this.save();
      });
    });

    // Delete
    s.querySelectorAll('[data-act="del"]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id=e.target.dataset.id;
        this.list=this.list.filter(x=>x.id!==id);
        this.save();
      });
    });

    // Drag & drop reorder (like in produkcja‑ogólne)
    const items = s.querySelectorAll('.todo-item');
    items.forEach(el=>{
      const id = el.getAttribute('data-id');
      el.addEventListener('dragstart', ()=>{
        this._dragId = id;
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', ()=>{
        el.classList.remove('dragging');
        this._dragId = null;
      });
      el.addEventListener('dragover', (e)=>{
        e.preventDefault();
        const overId = id;
        if(!this._dragId || this._dragId===overId) return;
        const from = this.list.findIndex(x=>x.id===this._dragId);
        const to   = this.list.findIndex(x=>x.id===overId);
        if(from<0||to<0) return;
        const item = this.list.splice(from,1)[0];
        this.list.splice(to,0,item);
        store.saveTodos(this.list);
        // Re-render quickly but keep dragging state
        this.render();
      });
    });

    // Actions
    s.querySelector('[data-act="add"]').addEventListener('click', ()=>{
      const txt = prompt('Treść zadania'); if(!txt) return;
      this.list=[...this.list,{text:txt,done:false,id:cryptoId()}]; this.save();
    });
    s.querySelector('[data-act="clear"]').addEventListener('click', ()=>{
      this.list=this.list.filter(t=>!t.done); this.save();
    });
  }
});