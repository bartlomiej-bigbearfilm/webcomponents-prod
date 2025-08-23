// shared/toast.js
customElements.define('ui-toast', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.queue=[]; this.busy=false; }
  connectedCallback(){
    const s=this.shadowRoot;
    s.innerHTML = `
      <style>
        :host{position:fixed;inset:auto 16px 16px auto;z-index:999999;display:block;pointer-events:none}
        .toast{min-width:200px;max-width:360px;margin-top:.5rem;padding:.6rem .8rem;border-radius:12px;border:1px solid var(--border);
               background:var(--surface);color:var(--text);box-shadow:var(--elev);opacity:0;transform:translateY(8px);transition:.25s}
        .toast.show{opacity:1;transform:translateY(0)}
        .row{display:flex;gap:.6rem;align-items:flex-start}
        .icon{font-size:1.1rem;line-height:1}
        .msg{flex:1}
        .success{border-color:#bbf7d0;background:#ecfdf5}
        .error{border-color:#fecaca;background:#fef2f2}
        .info{border-color:var(--border);background:var(--surface)}
      </style>
      <div id="box"></div>
    `;
  }
  show(message, type='info', duration=2500){
    this.queue.push({message,type,duration});
    if(!this.busy) this.#next();
  }
  #next(){
    if(this.queue.length===0){ this.busy=false; return; }
    this.busy=true;
    const {message,type,duration}=this.queue.shift();
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    el.innerHTML=`<div class="row">
      <div class="icon">${type==='success'?'✅':type==='error'?'⚠️':'ℹ️'}</div>
      <div class="msg">${message}</div>
    </div>`;
    this.shadowRoot.getElementById('box').appendChild(el);
    // animate in
    requestAnimationFrame(()=> el.classList.add('show'));
    // out
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=>{ el.remove(); this.#next(); }, 250);
    }, duration);
  }
});
