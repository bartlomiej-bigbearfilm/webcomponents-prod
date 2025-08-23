customElements.define('board-card', class extends HTMLElement{
  constructor(){ super(); this.attachShadow({mode:'open'}); this.posts=[]; }
  connectedCallback(){ this.render(); }

  render(){
    const s=this.shadowRoot;
    const style = `
      <style>
        :host{display:block}
        .board{display:grid;gap:.6rem}
        .composer{display:grid;grid-template-columns:auto 1fr;gap:.6rem;border:1px solid var(--border);border-radius:14px;padding:.6rem;background:var(--surface)}
        .avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--muted);border:1px solid var(--border)}
        textarea{width:100%;min-height:38px;resize:vertical;border:1px solid var(--border);border-radius:10px;padding:.5rem;background:var(--surface);color:var(--text);outline:none}
        .row{display:flex;align-items:center;gap:.6rem;margin-top:.35rem}
        .post{border:1px solid var(--border);border-radius:14px;padding:.6rem;background:var(--surface);display:grid;gap:.35rem}
        .meta{font-size:.86rem;opacity:.7}
      </style>
    `;
    s.innerHTML = `
      ${style}
      <h2 style="margin-top:0">Tablica projektu</h2>
      <div class="board">
        <div class="composer">
          <div class="avatar" title="Autor">👤</div>
          <div>
            <textarea placeholder="Napisz wpis…"></textarea>
            <div class="row">
              <input type="text" placeholder="Autor" style="height:32px;border:1px solid var(--border);border-radius:10px;padding:.2rem .45rem;background:var(--surface)">
              <button data-act="pub" style="margin-left:auto;height:32px;border:1px solid var(--border);border-radius:10px;padding:.2rem .6rem;background:var(--surface)">Opublikuj</button>
            </div>
          </div>
        </div>
        <div class="posts"></div>
        <div class="empty" style="display:${this.posts.length?'none':'block'};opacity:.65;text-align:center;padding:.6rem;border:1px dashed var(--border);border-radius:12px">Brak wpisów. Bądź pierwszą osobą, która coś doda ✨</div>
      </div>
    `;

    s.querySelector('[data-act="pub"]').addEventListener('click', ()=>{
      const txt = s.querySelector('textarea').value.trim();
      const who = s.querySelector('input[type="text"]').value.trim() || 'Ja';
      if(!txt) return;
      this.posts.unshift({txt,who,ts:Date.now()});
      s.querySelector('textarea').value='';
      this.paintPosts();
    });
    this.paintPosts();
  }

  paintPosts(){
    const s=this.shadowRoot;
    const box = s.querySelector('.posts');
    box.innerHTML = this.posts.map(p=>`
      <div class="post">
        <div><strong>${p.who}</strong></div>
        <div class="meta">${new Date(p.ts).toLocaleString('pl-PL')}</div>
        <div class="body" style="white-space:pre-wrap">${p.txt.replace(/[<>&]/g, m=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m]))}</div>
      </div>`).join('');
    s.querySelector('.empty').style.display = this.posts.length?'none':'block';
  }
});
