const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname,'build');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GameSetupHub PoC</title>
  <style>
    :root{--bg:#0f1724;--card:#0b1220;--accent:#7dd3fc;--muted:#94a3b8;--glass: rgba(255,255,255,0.03)}
    html,body{height:100%;margin:0;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Arial;background:linear-gradient(180deg,#071029 0%, #071429 60%);color:#e6eef8}
    .app{max-width:1100px;margin:24px auto;padding:20px}
    header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
    header h1{margin:0;font-size:20px;color:var(--accent)}
    .controls{display:flex;gap:8px;align-items:center}
    .btn{background:var(--accent);color:#022;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
    .ghost{background:transparent;border:1px solid rgba(255,255,255,0.06);padding:6px 10px;border-radius:8px;color:var(--muted)}
    .grid{display:grid;grid-template-columns:1fr 360px;gap:18px}
    .card{background:var(--card);padding:14px;border-radius:12px;box-shadow:0 6px 18px rgba(2,6,23,0.6)}
    .search{display:flex;gap:8px}
    input[type=text], textarea, select{width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:var(--glass);color:inherit}
    .list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .config-card{background:linear-gradient(180deg, rgba(255,255,255,0.02), transparent);padding:12px;border-radius:10px}
    .meta{font-size:12px;color:var(--muted)}
    .tag{display:inline-block;background:rgba(125,211,252,0.08);color:var(--accent);padding:4px 8px;border-radius:999px;margin-right:6px;font-size:12px}
    .results-empty{text-align:center;color:var(--muted);padding:40px}
    .modal{position:fixed;inset:0;background:rgba(2,6,23,0.6);display:flex;align-items:center;justify-content:center;padding:20px}
    .modal .card{width:100%;max-width:900px}
    footer{margin-top:18px;text-align:center;color:var(--muted);font-size:13px}
    .small{font-size:13px;color:var(--muted)}
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1>GameSetupHub <span class="small">— PoC</span></h1>
      <div class="controls">
        <div id="userArea" class="small">Not logged</div>
        <button id="btnLogin" class="btn">Login</button>
        <button id="btnRegister" class="ghost">Register</button>
        <button id="btnLogout" class="ghost" style="display:none">Logout</button>
      </div>
    </header>

    <div class="grid">
      <div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong>Search configurations</strong>
            <div class="small">Enter game name or free text</div>
          </div>
          <div class="search">
            <input id="inQuery" type="text" placeholder="game, keyword or tag" />
            <button id="btnSearch" class="btn">Search</button>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <select id="sortSelect"><option value="newest">Newest</option><option value="popular">Most liked</option></select>
            <input id="pageSize" type="text" style="width:120px" placeholder="page size (20)" />
            <button id="btnNew" class="ghost">New config</button>
          </div>
        </div>

        <div id="resultsWrap" style="margin-top:12px">
          <div id="results" class="list"></div>
          <div id="empty" class="results-empty" style="display:none">No results</div>
        </div>
      </div>

      <aside>
        <div class="card">
          <strong>Upload a configuration</strong>
          <div class="small">You must be logged in to upload</div>
          <div style="margin-top:8px">
            <input id="fGame" placeholder="Game name" />
            <input id="fTags" placeholder="comma tags" />
            <textarea id="fDescription" placeholder="Short description"></textarea>
            <textarea id="fContent" placeholder="Configuration content"></textarea>
            <button id="btnUpload" class="btn">Upload</button>
          </div>
        </div>

        <div class="card" style="margin-top:12px">
          <strong>Settings</strong>
          <div class="small">API bases (change if running in Docker)</div>
          <input id="apiUsers" placeholder="http://localhost:4001" />
          <input id="apiConfigs" placeholder="http://localhost:4002" />
          <button id="btnSaveApi" class="ghost">Save</button>
        </div>
      </aside>
    </div>

    <footer>Simple PoC UI — actions call backend APIs. Use Settings to adjust API base URLs.</footer>
  </div>

  <template id="cardTpl">
    <div class="config-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600" data-role="game">Game</div>
          <div class="meta" data-role="author">by -</div>
        </div>
        <div style="text-align:right">
          <div class="meta" data-role="likes">0 likes</div>
          <div style="margin-top:8px"><button data-role="open" class="btn">Open</button></div>
        </div>
      </div>
      <div style="margin-top:8px" data-role="desc"></div>
      <div style="margin-top:8px" data-role="tags"></div>
    </div>
  </template>

  <div id="modal" class="modal" style="display:none">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong id="mGame">Game</strong>
        <div><button id="mClose" class="ghost">Close</button></div>
      </div>
      <div class="meta" id="mAuthor">by -</div>
      <pre id="mContent" style="white-space:pre-wrap;background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;margin-top:10px"></pre>
      <div style="margin-top:10px">
        <button id="mLike" class="btn">Like</button>
        <button id="mUnlike" class="ghost">Unlike</button>
      </div>
      <div style="margin-top:12px">
        <strong>Comments</strong>
        <div id="comments"></div>
        <textarea id="cText" placeholder="Write a comment"></textarea>
        <button id="cSend" class="btn">Send</button>
      </div>
      <div style="margin-top:12px">
        <strong>Versions</strong>
        <div id="versions" class="small"></div>
      </div>
    </div>
  </div>

  <script>
    // API bases with defaults
    const DEFAULT_USERS = 'http://localhost:4001';
    const DEFAULT_CONFIGS = 'http://localhost:4002';
    let API_USERS = localStorage.getItem('apiUsers') || DEFAULT_USERS;
    let API_CONFIGS = localStorage.getItem('apiConfigs') || DEFAULT_CONFIGS;

    // state
    let token = localStorage.getItem('gsh_token') || '';
    let currentUser = null;
    let currentConfigId = null;

    // dom
  const userArea = document.getElementById('userArea');
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
    const btnSearch = document.getElementById('btnSearch');
    const inQuery = document.getElementById('inQuery');
    const resultsEl = document.getElementById('results');
    const emptyEl = document.getElementById('empty');
    const cardTpl = document.getElementById('cardTpl');
    const modal = document.getElementById('modal');
    const mClose = document.getElementById('mClose');
    const mGame = document.getElementById('mGame');
    const mAuthor = document.getElementById('mAuthor');
    const mContent = document.getElementById('mContent');
    const mLike = document.getElementById('mLike');
    const mUnlike = document.getElementById('mUnlike');
    const commentsEl = document.getElementById('comments');
    const cText = document.getElementById('cText');
    const cSend = document.getElementById('cSend');

    const fGame = document.getElementById('fGame');
    const fTags = document.getElementById('fTags');
    const fDesc = document.getElementById('fDescription');
    const fContent = document.getElementById('fContent');
    const btnUpload = document.getElementById('btnUpload');
    const btnNew = document.getElementById('btnNew');

    const apiUsersEl = document.getElementById('apiUsers');
    const apiConfigsEl = document.getElementById('apiConfigs');
    const btnSaveApi = document.getElementById('btnSaveApi');

    apiUsersEl.value = API_USERS;
    apiConfigsEl.value = API_CONFIGS;

  function setToken(t){ token = t; if(t){ localStorage.setItem('gsh_token', t); btnLogout.style.display='inline-block'; btnLogin.style.display='none'; if(btnRegister) btnRegister.style.display='none'; } else { localStorage.removeItem('gsh_token'); btnLogout.style.display='none'; btnLogin.style.display='inline-block'; if(btnRegister) btnRegister.style.display='inline-block'; }}

    async function api(path, opts={}){
      const headers = opts.headers || {};
      if(opts.json !== false) headers['Content-Type'] = 'application/json';
      if(token) headers['Authorization'] = 'Bearer '+token;
      const res = await fetch(path, Object.assign({headers, method: opts.method||'GET'}, opts.body?{body: opts.json===false?opts.body:JSON.stringify(opts.body)}:{}))
      if(!res.ok){ const txt = await res.text(); throw new Error(txt || res.statusText); }
      const ct = res.headers.get('content-type') || '';
      if(ct.includes('application/json')) return res.json();
      return res.text();
    }

    async function checkUser(){
      if(!token) { userArea.innerText='Not logged'; return; }
      try{
        const u = await api(API_USERS + '/api/auth/me');
        currentUser = u; userArea.innerText = 'Hi, '+(u.username||'user'); setToken(token);
      }catch(e){ console.warn(e); setToken(''); userArea.innerText='Not logged'; }
    }

    btnLogin.addEventListener('click', async ()=>{
      const username = prompt('username');
      const password = prompt('password');
      if(!username||!password) return;
      try{
        const res = await api(API_USERS + '/api/auth/login', {method:'POST', body:{username,password}});
        setToken(res.token);
        await checkUser();
        alert('Logged in');
      }catch(e){ alert('Login failed: '+e.message); }
    });

    btnRegister.addEventListener('click', async ()=>{
      const username = prompt('choose a username');
      const password = prompt('choose a password');
      if(!username||!password) return;
      try{
        await api(API_USERS + '/api/auth/register', {method:'POST', body:{username,password}});
        // auto-login
        const res = await api(API_USERS + '/api/auth/login', {method:'POST', body:{username,password}});
        setToken(res.token);
        await checkUser();
        alert('Registered and logged in');
      }catch(e){ alert('Register failed: '+e.message); }
    });

    btnLogout.addEventListener('click', ()=>{ setToken(''); currentUser=null; userArea.innerText='Not logged'; alert('logged out'); });

    btnSaveApi.addEventListener('click', ()=>{ API_USERS = apiUsersEl.value||DEFAULT_USERS; API_CONFIGS = apiConfigsEl.value||DEFAULT_CONFIGS; localStorage.setItem('apiUsers', API_USERS); localStorage.setItem('apiConfigs', API_CONFIGS); alert('API saved'); });

    btnUpload.addEventListener('click', async ()=>{
      if(!token){ alert('Login required'); return; }
      const game = fGame.value.trim(); if(!game) return alert('game required');
      const tags = fTags.value.split(',').map(s=>s.trim()).filter(Boolean);
      try{
        const res = await api(API_CONFIGS+'/api/configs', {method:'POST', body:{game,description:fDesc.value,content:fContent.value,tags}});
        alert('Uploaded');
        fGame.value=''; fTags.value=''; fDesc.value=''; fContent.value='';
        doSearch();
      }catch(e){ alert('Upload error: '+e.message); }
    });

    btnNew.addEventListener('click', ()=>{ window.scrollTo({top:0,behavior:'smooth'}); fGame.focus(); });

    btnSearch.addEventListener('click', ()=>doSearch());
    inQuery.addEventListener('keyup', (e)=>{ if(e.key==='Enter') doSearch(); });

    async function doSearch(){
      const q = inQuery.value.trim();
      const sort = document.getElementById('sortSelect').value;
      const pageSize = parseInt(document.getElementById('pageSize').value) || 20;
      try{
        const res = await api(API_CONFIGS + '/api/configs?q='+encodeURIComponent(q)+'&sort='+(sort==='popular'?'popular':'')+'&limit='+pageSize);
        renderResults(res.results||res || []);
      }catch(e){ console.error(e); alert('Search error: '+e.message); }
    }

    function renderResults(items){
      resultsEl.innerHTML = '';
      if(!items || items.length===0){ emptyEl.style.display='block'; return; } else emptyEl.style.display='none';
      items.forEach(it=>{
        const el = cardTpl.content.cloneNode(true);
        el.querySelector('[data-role="game"]').innerText = it.game;
        el.querySelector('[data-role="author"]').innerText = 'by '+(it.author?.username||'anon');
        el.querySelector('[data-role="desc"]').innerText = it.description||'';
        el.querySelector('[data-role="likes"]').innerText = (it.likes||0) + ' likes';
        const tagsEl = el.querySelector('[data-role="tags"]'); tagsEl.innerHTML = '';
        (it.tags||[]).forEach(t=>{ const s = document.createElement('span'); s.className='tag'; s.innerText=t; tagsEl.appendChild(s); });
        const btn = el.querySelector('[data-role="open"]');
        btn.addEventListener('click', ()=>openModal(it));
        resultsEl.appendChild(el);
      });
    }

    function openModal(it){
      currentConfigId = it.id || it._id;
      mGame.innerText = it.game;
      mAuthor.innerText = 'by '+(it.author?.username||'anon');
      mContent.innerText = it.content || '';
      document.getElementById('mLike').innerText = 'Like ('+(it.likes||0)+')';
      loadComments(it.id || it._id);
      loadVersions(it.id || it._id);
      modal.style.display='flex';
    }

    mClose.addEventListener('click', ()=>{ modal.style.display='none'; currentConfigId = null; });

    async function loadComments(id){
      try{ const res = await api(API_CONFIGS + '/api/configs/'+id+'/comments'); commentsEl.innerHTML = ''; (res||[]).forEach(c=>{ const d = document.createElement('div'); d.className='small'; d.style.padding='6px 0'; d.innerText = (c.authorName||'')+': '+c.text; commentsEl.appendChild(d); }); }catch(e){ commentsEl.innerHTML=''; }
    }

    async function loadVersions(id){
      try{ const res = await api(API_CONFIGS + '/api/configs/'+id+'/versions'); const v = document.getElementById('versions'); v.innerHTML = ''; (res||[]).forEach((ver,idx)=>{ const d = document.createElement('div'); d.className='small'; d.style.padding='6px 0'; d.innerText = '#'+(idx+1)+': '+(ver.content||ver); v.appendChild(d); }); }catch(e){ document.getElementById('versions').innerHTML=''; }
    }

    mLike.addEventListener('click', async ()=>{
      if(!token) return alert('login required');
      try{ const res = await api(API_CONFIGS + '/api/configs/'+currentConfigId+'/like', {method:'POST'}); mLike.innerText = 'Like ('+res.likes+')'; doSearch(); }catch(e){ alert(e.message); }
    });
    mUnlike.addEventListener('click', async ()=>{ if(!token) return alert('login required'); try{ const res = await api(API_CONFIGS + '/api/configs/'+currentConfigId+'/unlike', {method:'POST'}); mLike.innerText = 'Like ('+res.likes+')'; doSearch(); }catch(e){ alert(e.message); } });

    cSend.addEventListener('click', async ()=>{
      if(!token) return alert('login required');
      const text = cText.value.trim(); if(!text) return;
      try{ const res = await api(API_CONFIGS + '/api/configs/'+currentConfigId+'/comments', {method:'POST', body:{text}}); cText.value=''; loadComments(currentConfigId); }catch(e){ alert('comment error: '+e.message); }
    });

    // init
    checkUser(); doSearch();
  </script>
</body>
</html>`;
fs.writeFileSync(path.join(outDir,'index.html'), html);
console.log('build complete');
