// components/prod-calendar.js
import { store, cryptoId } from '../shared/store.js';

customElements.define('prod-calendar', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.events = store.loadEvents(); }
  connectedCallback(){ this._render(); }

  _render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>:host{display:block}</style>
      <base-calendar view="month"></base-calendar>
      <ui-modal id="modal"><event-editor></event-editor></ui-modal>
    `;
    const cal = s.querySelector('base-calendar');
    cal.viewDate = new Date();
    cal.events = this.events;

    cal.addEventListener('day-click', (e)=> this._createOn(e.detail));
    cal.addEventListener('event-click', (e)=> this._openEditor(e.detail));
    cal.addEventListener('event-update', (e)=> this._applyUpdate(e.detail));

    // (opcjonalnie) przełącznik widoku z zewnątrz
    this._cal = cal;
  }

  _createOn(date){
    // dla month: date jest Date bez czasu; dla week/day: też Date z zaokrągleniem do slotu
    const isoDate = new Date(date);
    const start = new Date(isoDate); start.setHours(9,0,0,0);
    const end   = new Date(isoDate); end.setHours(18,0,0,0);
    this._openEditor({title:'', type:'task', start:start.toISOString().slice(0,16), end:end.toISOString().slice(0,16)});
  }

  _openEditor(ev){
    const s=this.shadowRoot;
    const modal=s.getElementById('modal');
    const editor=modal.querySelector('event-editor');

    if(ev && ev.id){
      editor.event = { id:ev.id, title:ev.title, type:ev.type||'task', start:(ev.start||'').slice(0,16), end:(ev.end||ev.start||'').slice(0,16) };
    } else {
      const now = new Date(); const iso = new Date(now.getFullYear(),now.getMonth(),now.getDate(),9,0).toISOString().slice(0,16);
      editor.event = { title:ev?.title||'', type:ev?.type||'task', start:ev?.start?.slice(0,16) || iso, end:ev?.end?.slice(0,16) || iso };
    }

    const onSave = (e)=>{
      const d=e.detail;
      if(editor.event.id){ this.events = this.events.map(x=> x.id===editor.event.id ? {...x, ...d, id:x.id} : x); }
      else { this.events = [...this.events, {id:cryptoId(), ...d}]; }
      store.saveEvents(this.events);
      this._cal.setEvents(this.events);
      modal.hide();
      document.getElementById('toast')?.show('Zapisano wydarzenie','success');
    };
    const onDelete = (e)=>{
      const id = e.detail?.id || editor.event.id; if(!id) return;
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

  _applyUpdate(detail){
    // z base-calendar przychodzi event zmodyfikowany (lub _delete)
    const ev=detail;
    if(ev?._delete){
      this.events = this.events.filter(x=>x.id!==ev.id);
      store.saveEvents(this.events);
      this._cal.setEvents(this.events);
      document.getElementById('toast')?.show('Usunięto wydarzenie','info');
      return;
    }
    this.events = this.events.map(x=> x.id===ev.id ? {...x, ...ev} : x);
    store.saveEvents(this.events);
    this._cal.setEvents(this.events);
    document.getElementById('toast')?.show('Zaktualizowano wydarzenie','success');
  }
});
