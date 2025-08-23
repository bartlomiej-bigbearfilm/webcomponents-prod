import { store } from '../shared/store.js';
import { parseRange, phaseColors } from '../shared/utils.js';

customElements.define('timeline-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.onChange=this.render.bind(this); }
  connectedCallback(){ window.addEventListener('project-change', this.onChange); this.render(); }
  disconnectedCallback(){ window.removeEventListener('project-change', this.onChange); }

  render(){
    const s=this.shadowRoot;
    const style = `
      <style>
        :host{display:block}
        .mt-grid{position:relative;height:260px;margin-top:.4rem;border-radius:10px;overflow:hidden;background:var(--muted)}
        svg{position:absolute;inset:0}
        .axis-label{font-size:.68rem;fill:var(--text-dim)}
      </style>
    `;
    s.innerHTML = `
      ${style}
      <h2 style="margin-top:0">Timeline projektu</h2>
      <div class="mt-grid"><svg></svg></div>
    `;
    this.draw();
    addEventListener('resize', ()=>this.draw(), {once:true});
  }

  draw(){
    const s=this.shadowRoot;
    const svg = s.querySelector('svg');
    while(svg.firstChild) svg.removeChild(svg.firstChild);

    const p = store.project;
    const rows=['sale','pre','prod','post','fix'];
    const labels={sale:'sprzedaż',pre:'pre-produkcja',prod:'produkcja',post:'post-produkcja',fix:'poprawki'};

    const present=rows.filter(k=>p.periods && p.periods[k]);
    if(!present.length) return;

    const ranges=present.map(k=>({k,r:parseRange(p.periods[k])}));
    const min=new Date(Math.min(...ranges.map(x=>x.r.s.getTime())));
    const max=new Date(Math.max(...ranges.map(x=>x.r.e.getTime())));

    const spanDays=Math.max(1,Math.round((max-min)/86400000)+1);
    const w=svg.parentElement.clientWidth||600, h=svg.parentElement.clientHeight||260;
    svg.setAttribute('width',w); svg.setAttribute('height',h);

    for(let d=0; d<=spanDays; d++){
      const x=(d/spanDays)*w;
      const dt=new Date(min.getFullYear(),min.getMonth(),min.getDate()+d);
      const isMon=(dt.getDay()===1);
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',x); line.setAttribute('y1',0);
      line.setAttribute('x2',x); line.setAttribute('y2',h);
      line.setAttribute('stroke',isMon?'#94a3b8':'#e2e8f0');
      line.setAttribute('stroke-width',isMon?1.5:1);
      svg.appendChild(line);
      if(isMon){
        const text=document.createElementNS('http://www.w3.org/2000/svg','text');
        text.setAttribute('x',x+4); text.setAttribute('y',h-6);
        text.setAttribute('fill',getComputedStyle(document.body).color);
        text.setAttribute('class','axis-label'); text.textContent=dt.toLocaleDateString('pl-PL');
        svg.appendChild(text);
      }
    }

    const rowsList=['sale','pre','prod','post','fix'];
    const rowH=h/rowsList.length;
    rowsList.forEach((k,i)=>{
      const rs=p.periods[k]; if(!rs) return;
      const r=parseRange(rs);
      const y=i*rowH+6;
      const startDay=Math.max(0,Math.min(spanDays,Math.round((r.s-min)/86400000)));
      const endDay=Math.max(0,Math.min(spanDays,Math.round((r.e-min)/86400000)));
      const x1=(startDay/spanDays)*w, x2=(endDay/spanDays)*w;
      const left=Math.min(x1,x2), right=Math.max(x1,x2);
      const width=Math.max(w/spanDays, right-left);

      const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x',left); rect.setAttribute('y',y);
      rect.setAttribute('width',width); rect.setAttribute('height',rowH-12);
      rect.setAttribute('rx','6'); rect.setAttribute('fill', phaseColors[k]||'#8b5cf6');
      svg.appendChild(rect);

      const label1=document.createElementNS('http://www.w3.org/2000/svg','text');
      label1.setAttribute('x',left+width/2); label1.setAttribute('y',y+(rowH/2)-10);
      label1.setAttribute('text-anchor','middle'); label1.setAttribute('dominant-baseline','middle');
      label1.setAttribute('fill',getComputedStyle(document.body).color); label1.textContent={sale:'sprzedaż',pre:'pre-produkcja',prod:'produkcja',post:'post-produkcja',fix:'poprawki'}[k];
      svg.appendChild(label1);

      const label2=document.createElementNS('http://www.w3.org/2000/svg','text');
      label2.setAttribute('x',left+width/2); label2.setAttribute('y',y+(rowH/2)+6);
      label2.setAttribute('text-anchor','middle'); label2.setAttribute('dominant-baseline','middle');
      label2.setAttribute('fill',getComputedStyle(document.body).color);
      label2.textContent=r.s.toLocaleDateString('pl-PL')+' – '+r.e.toLocaleDateString('pl-PL');
      svg.appendChild(label2);
    });

    const now=new Date();
    const nx=now<=min?0:now>=max?w:((now-min)/(spanDays*86400000))*w;
    const tl=document.createElementNS('http://www.w3.org/2000/svg','line');
    tl.setAttribute('x1',nx); tl.setAttribute('y1',0); tl.setAttribute('x2',nx); tl.setAttribute('y2',h);
    tl.setAttribute('stroke','#7c5cff'); tl.setAttribute('stroke-width','3'); svg.appendChild(tl);
  }
});
