// shared/contextmenu.js
// <ui-contextmenu> — pokazujesz obok kursora; items: [{id,label,shortcut?}]
customElements.define('ui-contextmenu', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.items=[]; }
  connectedCallback(){
    const s=this.shadowRoot;
    s.innerHTML=`
      <style>
        :host{position:fixed;z-index:999999;display:none}
        .box{min-width:200px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;box-shadow:var(--elev);padding:.35rem}
        .it{display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.45rem .6rem;border-radius:8px;cursor:pointer}
        .it:hover{background:var(--muted)}
        .sep{height:1px;background:var(--border);margin:.35rem .25rem}
        .sc{opacity:.6}
      </style>
      <div class="box"></div>
    `;
  }
  set data(list){ this.items = list||[]; this.paint(); }
  paint(){
    const box=this.shadowRoot.querySelector('.box'); if(!box) return;
    box.innerHTML=this.items.map(it=> it.id==='sep' ? `<div class="sep"></div>` :
      `<div class="it" data-id="${it.id}"><span>${it.icon||''} ${it.label}</span>${it.shortcut?`<span class="sc">${it.shortcut}</span>`:''}</div>`).join('');
    box.querySelectorAll('.it').forEach(el=>{
      el.addEventListener('click', ()=>{ this.dispatchEvent(new CustomEvent('pick',{detail:{id:el.dataset.id}})); this.hide(); });
    });
  }
  showAt(x,y){
    this.style.display='block';
    document.body.appendChild(this);
    const r= this.getBoundingClientRect(); // after append, before place
    this.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x)) + 'px';
    this.style.top  = Math.min(window.innerHeight - r.height - 8, Math.max(8, y)) + 'px';
    setTimeout(()=>{ const onDoc=(e)=>{ if(!this.contains(e.target)){ this.hide(); document.removeEventListener('mousedown',onDoc,true);} }; document.addEventListener('mousedown',onDoc,true); },0);
  }
  hide(){ this.style.display='none'; this.remove(); }
});
