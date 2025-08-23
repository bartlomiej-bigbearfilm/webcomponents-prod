// components/finance-breakdown-card.js
import { store } from '../shared/store.js';

customElements.define('finance-breakdown-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.onChange=this.render.bind(this); }
  connectedCallback(){ window.addEventListener('project-change', this.onChange); this.render(); }
  disconnectedCallback(){ window.removeEventListener('project-change', this.onChange); }

  render(){
    const s=this.shadowRoot;
    const p=store.project, b=p.budget||0, fee=p.fee||0, margin=p.margin||0;
    const prow=Math.round(b*fee/100);
    const kos=Math.round(b*(1-margin/100));

    s.innerHTML=`
      <style>
        :host{display:block}
        canvas{display:block;margin:.5rem auto}
        .legend{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center}
        .chip{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--border);background:var(--muted);border-radius:999px;padding:.18rem .5rem}
        .dot{width:10px;height:10px;border-radius:50%}
      </style>
      <h2 style="margin-top:0">Finanse – rozbicie</h2>
      <canvas width="240" height="240"></canvas>
      <div class="legend"></div>
    `;

    const breakdown=[
      ['Wynagrodzenia',Math.round(kos*0.45),'#ef4444'],
      ['Materiały',Math.round(kos*0.18),'#f59e0b'],
      ['Usługi',Math.round(kos*0.2),'#3b82f6'],
      ['Transport',Math.round(kos*0.08),'#14b8a6'],
      ['Prowizje',prow,'#8b5cf6']
    ];
    this.drawPie(breakdown);
  }

  drawPie(entries){
    const s=this.shadowRoot;
    const el=s.querySelector('canvas'); const ctx=el.getContext('2d');
    ctx.clearRect(0,0,el.width,el.height);
    const total=entries.reduce((a,b)=>a+b[1],0)||1; let start=-Math.PI/2;

    entries.forEach(e=>{
      const val=e[1]/total*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(el.width/2,el.height/2);
      ctx.arc(el.width/2,el.height/2,Math.min(el.width,el.height)/2-6,start,start+val);
      ctx.closePath(); ctx.fillStyle=e[2]; ctx.fill(); start+=val;
    });
    start=-Math.PI/2;
    entries.forEach(e=>{
      const val=e[1]/total*Math.PI*2, mid=start+val/2;
      const r=Math.min(el.width,el.height)/2-34;
      const x=el.width/2+Math.cos(mid)*r, y=el.height/2+Math.sin(mid)*r;
      ctx.fillStyle=getComputedStyle(document.body).color; ctx.font='12px system-ui';
      const pct=Math.round(e[1]/total*100); ctx.fillText(pct+'%', x-8, y+4); start+=val;
    });

    const legend = s.querySelector('.legend');
    legend.innerHTML = entries.map(([name,val,color])=>`<span class="chip"><span class="dot" style="background:${color}"></span><span>${name}</span><strong>${new Intl.NumberFormat('pl-PL').format(val)} zł</strong></span>`).join(' ');
  }
});
