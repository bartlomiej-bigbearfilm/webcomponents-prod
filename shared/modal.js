// shared/modal.js
import { placePopover } from './utils.js';

/** Prosty modal na środek ekranu */
customElements.define('ui-modal', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){
    const s=this.shadowRoot;
    s.innerHTML=`
      <style>
        :host{position:fixed;inset:0;display:none;z-index:99998}
        .backdrop{position:absolute;inset:0;background:rgba(0,0,0,.35)}
        .panel{position:absolute;inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;box-shadow:var(--elev);min-width:320px;max-width:92vw;max-height:88vh;overflow:auto}
      </style>
      <div class="backdrop"></div>
      <div class="panel"><slot></slot></div>
    `;
    s.querySelector('.backdrop').addEventListener('click',()=>this.hide());
  }
  show(){ this.style.display='block'; }
  hide(){ this.style.display='none'; this.dispatchEvent(new CustomEvent('close')); }
});

/** Popover przy elemencie kotwiczącym (anchor) */
customElements.define('ui-popover', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); }
  connectedCallback(){
    const s=this.shadowRoot;
    s.innerHTML=`
      <style>
        :host{position:fixed;display:none;z-index:99999}
        .pop{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--elev);padding:.6rem}
      </style>
      <div class="pop"><slot></slot></div>
    `;
  }
  showFor(anchorEl){
    this.style.display='block';
    this.updatePos(anchorEl);
    setTimeout(()=>{
      const onDoc = (e)=>{ if(!this.contains(e.target) && e.target!==anchorEl){ this.hide(); document.removeEventListener('mousedown', onDoc, true); } };
      document.addEventListener('mousedown', onDoc, true);
    },0);
  }
  updatePos(anchorEl){ placePopover(this, anchorEl); }
  hide(){ this.style.display='none'; this.dispatchEvent(new CustomEvent('close')); }
});
