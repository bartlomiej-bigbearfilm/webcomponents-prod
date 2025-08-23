// components/finance-kpi-card.js
import { store } from '../shared/store.js';
import { fmtPL } from '../shared/utils.js';

customElements.define('finance-kpi-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.onChange=this.render.bind(this); }
  connectedCallback(){ window.addEventListener('project-change', this.onChange); this.render(); }
  disconnectedCallback(){ window.removeEventListener('project-change', this.onChange); }

  render(){
    const s = this.shadowRoot;
    const p = store.project;
    const b=p.budget||0, fee=p.fee||0, margin=p.margin||0;
    const prow=Math.round(b*fee/100);
    const kos=Math.round(b*(1-margin/100));
    const doUzy=Math.max(0,b-kos);
    const zysk=Math.max(0,b-kos-prow);
    const rows=[
      {label:'Budżet całkowity', val:b, full:true},
      {label:'Koszty', val:kos},
      {label:'Prowizje', val:prow},
      {label:'Zysk', val:zysk},
      {label:'Budżet do wykorzystania', val:doUzy}
    ];

    s.innerHTML = `
      <style>
        :host{display:block}
        .kpi-vert{display:grid;gap:.8rem}
        .tile{border:1px solid var(--border);border-radius:12px;padding:.5rem .6rem}
        .tile-content{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
        .bar{height:10px;background:var(--muted);border-radius:999px;margin-top:.4rem;overflow:hidden;border:1px solid var(--border)}
      </style>
      <h2 style="margin-top:0">Finanse – KPI</h2>
      <div class="kpi-vert">
        ${rows.map(r=>{
          const pct = r.full?100:(b?Math.max(0, Math.min(100, Math.round(r.val/b*100))):0);
          return `<div class="tile">
            <div class="tile-content"><div>${r.label}</div><div><strong>${fmtPL(r.val)} zł</strong></div></div>
            <div class="bar"><span style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),#8b5cf6)"></span></div>
          </div>`;
        }).join('')}
      </div>
    `;
  }
});
