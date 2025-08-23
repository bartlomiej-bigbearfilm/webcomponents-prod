// components/prod-calendar.js
// Używa <base-calendar>, store oraz <event-editor> w <ui-modal>.
import { store, cryptoId } from '../shared/store.js';

customElements.define('prod-calendar', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.events = store.loadEvents(); }
  connectedCallback(){ this._render(); }

  _render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>:host{display:block}</style>
      <base-calendar></base-calendar>
      <ui-modal id="modal"><event-editor></event-editor></ui-modal>
    `;
    const cal = s.querySelector('base-calendar');
    cal.viewDate = new Date();
    cal.events = this.events;

    cal.addEventListener('day-click', (e)=> this._createOnDay(e.detail));
    cal.addEventListener('event-click', (e)=> this._editEvent(e.detail));
    cal.addEventListener('month-change', ()=>{/* możesz logować / zsynchronizować toolbar gdzie indziej */});

    this._cal = cal;
  }

  _createOnDay(d){
    const st = `${new Date(d).toISOString().slice(0,10)}T09:00`;
    const en = `${new Date(d).toISOString().slice(0,10)}T18:00`;
    this._openEditor({title:'', type:'task', start:st, end:en});
  }

  _editEvent(ev){ this._openEditor(ev); }

  _openEditor(ev){
    const s=this.shadowRoot;
    const modal=s.getElementById('modal');
    const editor=modal.querySelector('event-editor');

    if(ev && ev.id){ // istniejący
      editor.event = { id:ev.id, title:ev.title, type:ev.type||'task', start:(ev.start||'').slice(0,16), end:(ev.end||ev.start||'').slice(0,16) };
    } else { // nowy
      const now = new Date(); const iso = new Date(now.getFullYear(),now.getMonth(),now.getDate(),9,0).toISOString().slice(0,16);
      editor.event = { title:ev?.title||'', type:ev?.type||'task', start:ev?.start?.slice(0,16) || iso, end:ev?.end?.slice(0,16) || iso };
    }

    const onSave = (e)=>{
      const d=e.detail;
      if(editor.event.id){ // update
        this.events = this.events.map(x=> x.id===editor.event.id ? {...x, ...d, id:x.id} : x);
      } else { // create
        this.events = [...this.events, {id:cryptoId(), ...d}];
      }
      store.saveEvents(this.events);
      this._cal.setEvents(this.events);
      modal.hide();
      document.getElementById('toast')?.show('Zapisano wydarzenie','success');
    };
    const onDelete = (e)=>{
      const id = e.detail?.id || editor.event.id;
      if(!id) return;
      this.events = this.events.filter(x=>x.id!==id);
      store.saveEvents(this.events);
      this._cal.setEvents(this.events);
      modal.hide();
      document.getElementById('toast')?.show('Usunięto wydarzenie','info');
    };
    const onCancel = ()=> modal.hide();

    editor.addEventListener('save', onSave, {once:true});
    editor.addEventListener('delete', onDelete, {once:true});
    editor.addEventListener('cancel', onCancel, {once:true});
    modal.show();
  }
});
