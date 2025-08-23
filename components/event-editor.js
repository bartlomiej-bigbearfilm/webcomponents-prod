// components/event-editor.js
// Reużywalny edytor wydarzeń: props: event, emits: 'save', 'delete', 'cancel'
export class EventEditor extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.data = {title:'', type:'task', start:'', end:''}; }
  connectedCallback(){ this.render(); }
  set event(ev){
    const d = ev||{};
    this.data = { id:d.id, title:d.title||'', type:d.type||'task', start:(d.start||'').slice(0,16), end:(d.end||'').slice(0,16) };
    if(this.isConnected) this.fill();
  }
  get event(){ return this.data; }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text)}
        .form{display:grid;gap:.6rem;padding:1rem;min-width:320px}
        .row{display:grid;gap:.3rem}
        input,select{border:1px solid var(--border);border-radius:10px;padding:.35rem .5rem;background:var(--surface);color:var(--text)}
        .actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:.3rem}
        .left{margin-right:auto}
        .btn{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:.35rem .7rem;cursor:pointer}
        .danger{border-color:#fecaca;background:#fef2f2}
      </style>
      <div class="form">
        <div class="row"><label>Tytuł</label><input id="title" placeholder="Nazwa wydarzenia"></div>
        <div class="row"><label>Typ</label>
          <select id="type">
            <option value="task">Zadanie</option>
            <option value="meeting">Spotkanie</option>
            <option value="plan">Plan</option>
            <option value="info">Informacja</option>
          </select>
        </div>
        <div class="row"><label>Start</label><input type="datetime-local" id="start"></div>
        <div class="row"><label>Koniec</label><input type="datetime-local" id="end"></div>
        <div class="actions">
          <button class="btn danger left" id="del">Usuń</button>
          <button class="btn" id="cancel">Anuluj</button>
          <button class="btn" id="save">Zapisz</button>
        </div>
      </div>
    `;
    this.fill();
    s.getElementById('save').onclick = ()=>{
      const d=this.read();
      this.dispatchEvent(new CustomEvent('save',{detail:d}));
    };
    s.getElementById('cancel').onclick = ()=> this.dispatchEvent(new CustomEvent('cancel'));
    s.getElementById('del').onclick = ()=> this.dispatchEvent(new CustomEvent('delete',{detail:{id:this.data.id}}));
  }

  fill(){
    const s=this.shadowRoot; if(!s.getElementById) return;
    s.getElementById('title').value = this.data.title||'';
    s.getElementById('type').value = this.data.type||'task';
    s.getElementById('start').value = (this.data.start||'').slice(0,16);
    s.getElementById('end').value = (this.data.end||'').slice(0,16);
  }
  read(){
    const s=this.shadowRoot;
    const d = {
      id: this.data.id,
      title: s.getElementById('title').value.trim(),
      type: s.getElementById('type').value,
      start: s.getElementById('start').value,
      end: s.getElementById('end').value || s.getElementById('start').value
    };
    return d;
  }
}
customElements.define('event-editor', EventEditor);