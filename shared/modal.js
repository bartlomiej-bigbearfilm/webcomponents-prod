// shared/modal.js
// Prosty modal i popover z pełną obsługą mouse + touch (iPhone friendly)

customElements.define('ui-modal', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){
    const s=this.shadowRoot;
    s.innerHTML=`
      <style>
        :host{position:fixed;inset:0;display:none;z-index:99998}
        .backdrop{position:absolute;inset:0;background:rgba(0,0,0,.35)}
        .panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
               background:var(--surface);color:var(--text);border:1px solid var(--border);
               border-radius:14px;box-shadow:var(--elev);min-width:320px;max-width:92vw;max-height:88vh;overflow:auto}
      </style>
      <div class="backdrop"></div>
      <div class="panel"><slot></slot></div>
    `;
    const close = ()=> this.hide();
    s.querySelector('.backdrop').addEventListener('click', close);
    s.querySelector('.backdrop').addEventListener('touchstart', (e)=>{ e.preventDefault(); close(); }, {passive:false});
  }
  show(){ this.style.display='block'; }
  hide(){ this.style.display='none'; this.dispatchEvent(new CustomEvent('close')); }
});

customElements.define('ui-popover', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){
    const s=this.shadowRoot;
    s.innerHTML=`
      <style>
        :host{position:fixed;display:none;z-index:99999}
        .pop{background:var(--surface);border:1px solid var(--border);
             border-radius:12px;box-shadow:var(--elev);padding:.6rem}
      </style>
      <div class="pop"><slot></slot></div>
    `;
  }
  showFor(anchorEl){
    this.style.display='block';
    document.body.appendChild(this);
    this.updatePos(anchorEl);

    const onDown = (e)=>{
      if(!this.contains(e.target) && e.target!==anchorEl){
        this.hide();
        document.removeEventListener('mousedown', onDown, true);
        document.removeEventListener('touchstart', onDown, true);
      }
    };
    setTimeout(()=>{
      document.addEventListener('mousedown', onDown, true);
      document.addEventListener('touchstart', onDown, {capture:true, passive:true});
    },0);
  }
  updatePos(anchorEl){
    const r = anchorEl.getBoundingClientRect();
    const pad = 6;
    const x = Math.min(window.innerWidth - this.offsetWidth - 8, Math.max(8, r.left));
    const y = r.bottom + pad;
    this.style.left = x + 'px';
    this.style.top  = y + 'px';
  }
  hide(){ this.style.display='none'; this.dispatchEvent(new CustomEvent('close')); this.remove(); }
});