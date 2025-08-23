// shared/menu.js
// <ui-menu> – reużywalne menu z filtrowaniem i zdarzeniem 'select'
customElements.define('ui-menu', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.items=[]; this.filter=''; }
  connectedCallback(){ this.render(); }
  set data(arr){ this.items = Array.isArray(arr)? arr : []; this.paint(); }
  get data(){ return this.items; }

  render(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{all:initial;contain:content;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text,#0f172a)}
        .box{min-width:240px}
        .search{display:flex;align-items:center;gap:.4rem;margin-bottom:.35rem}
        input{flex:1;border:1px solid var(--border);border-radius:10px;padding:.35rem .55rem;background:var(--surface);color:var(--text);outline:none}
        .list{max-height:280px;overflow:auto;border-top:1px solid var(--border)}
        .item{padding:.45rem .6rem;cursor:pointer;border-bottom:1px solid var(--border)}
        .item:hover{background:var(--muted)}
        .muted{opacity:.65}
      </style>
      <div class="box">
        <div class="search"><input placeholder="Szukaj…"></div>
        <div class="list"></div>
      </div>
    `;
    s.querySelector('input').addEventListener('input', e=>{ this.filter = e.target.value.toLowerCase(); this.paint(); });
    this.paint();
  }

  paint(){
    const s=this.shadowRoot;
    const list = s.querySelector('.list'); if(!list) return;
    const arr = (this.items||[]).filter(x=> !this.filter || String(x.label||x.value).toLowerCase().includes(this.filter));
    list.innerHTML = arr.length
      ? arr.map(x=>`<div class="item" data-value="${String(x.value)}">${x.label??x.value}</div>`).join('')
      : `<div class="item muted">Brak wyników</div>`;
    list.querySelectorAll('.item').forEach(el=>{
      el.addEventListener('click', ()=>{
        if(!el.dataset.value) return;
        const value = this.items.find(x=>String(x.value)===el.dataset.value);
        this.dispatchEvent(new CustomEvent('select', {detail: value||{value:el.dataset.value}}));
      });
    });
  }
});
