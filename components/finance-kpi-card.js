// components/finance-kpi-card.js (patched to match 'Podsumowanie finansowe' from produkcja-ogolne.html)
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

    const rows = [
      {label:'Budżet całkowity', val:b, full:true},
      {label:'Koszty', val:kos},
      {label:'Prowizje', val:prow},
      {label:'Zysk', val:zysk},
      {label:'Budżet do wykorzystania', val:doUzy}
    ];

    function colorFor(label){
      switch(label){
        case 'Budżet całkowity': return '#94a3b8'; // neutral
        case 'Budżet do wykorzystania': return '#3b82f6'; // blue
        case 'Koszty': return '#ef4444'; // red
        case 'Prowizje': return '#f59e0b'; // amber
        case 'Zysk': return '#10b981'; // emerald
        default: return '#8b5cf6';
      }
    }

    s.innerHTML = `
      <style>
        :host{display:block}
        h2{margin:0 0 .4rem 0}
        .kpi-tiles{display:flex;flex-direction:column;gap:12px}
        .tile{position:relative;border:1px solid var(--border);border-radius:12px;padding:.6rem .8rem;background:var(--surface);overflow:hidden}
        .tile-fill{position:absolute;inset:0;width:var(--fill,0%);background:linear-gradient(90deg,var(--tile-clr,#8b5cf6),var(--tile-clr,#8b5cf6));opacity:.14;pointer-events:none}
        .tile-content{position:relative;display:flex;align-items:baseline;justify-content:space-between;gap:.8rem}
        .tile-label{font-size:.92rem;opacity:.9}
        .tile-val{font-weight:800}
      </style>
      <h2>Finanse – KPI</h2>
      <div class="kpi-tiles"></div>
    `;

    const box = s.querySelector('.kpi-tiles');
    box.innerHTML = rows.map(r=>{
      const pct = r.full?100:(b?Math.max(0, Math.min(100, Math.round(r.val/b*100))):0);
      const valTxt = (typeof r.val==='number' ? fmtPL(r.val)+' zł' : '—');
      const clr = colorFor(r.label);
      return `
        <div class="tile" style="--fill:${pct}%;--tile-clr:${clr}">
          <div class="tile-fill"></div>
          <div class="tile-content">
            <div class="tile-label">${r.label}</div>
            <div class="tile-val">${valTxt}</div>
          </div>
        </div>
      `;
    }).join('');

    
      // Auto‑align vertical gaps with the bottom of the "poprawki" end date (like in produkcja-ogólne)
      (function(){
        function adjust(){
          try{
            const tiles = box;
            if (!tiles) return false;
            const endBox = document.querySelector('.value[data-key="fix"] .box[data-edit="end"]')
                          || document.querySelector('.value[data-key="fix"] .range-inline .box:last-child')
                          || document.querySelector('.value[data-key="fix"]');
            if (!endBox) return false;

            const tilesTop = tiles.getBoundingClientRect().top;
            const targetBottom = endBox.getBoundingClientRect().bottom;

            const items = Array.from(tiles.querySelectorAll('.tile'));
            if (items.length < 2) return false;

            const sumHeights = items.reduce((acc, it)=> acc + it.getBoundingClientRect().height, 0);
            let gap = (Math.round(targetBottom - tilesTop) - sumHeights) / (items.length - 1);
            if (!isFinite(gap)) gap = 12;
            gap = Math.max(6, Math.min(36, Math.round(gap)));
            tiles.style.gap = gap + 'px';
            return true;
          }catch(_){ return false; }
        }
        requestAnimationFrame(()=>{ adjust(); });
        setTimeout(()=>{ adjust(); }, 120);
        if (document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>{ adjust(); }); }
        window.addEventListener('resize', ()=>{ setTimeout(adjust, 50); });
      })();

  }
});