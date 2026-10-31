'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'sponsor-deck.v1';
  const TOPICS = {all: ['The whole deck','✳'], honesty:['Honesty','◇'], willingness:['Willingness','↗'], character:['Character defects','⌁'], humility:['Humility','◡'], relationships:['Relationships','∞'], accountability:['Accountability','◎'], service:['Service','✧'], spirituality:['Spirituality','☼'], steps:['The 12 Steps','≋']};
  const byId = new Map(DECK.map(c => [c.id,c]));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label = c => c.step ? `Step ${c.step}` : TOPICS[c.topic][0];
  const blank = () => ({format:'sponsor-deck', version:1, favorites:[], sessions:[], activeId:null});
  let staleTab = false, reloading = false;
  let state = blank(), current = null, topic = 'all', step = '', view = 'draw', selected, bag = [], bagKey = '', toastTimer, installEvent;
  function validate(data) {
    if (!data || data.format !== 'sponsor-deck' || data.version !== 1 || !Array.isArray(data.favorites) || !Array.isArray(data.sessions)) throw new Error('This is not a supported Sponsor Deck backup (version 1).');
    if (data.favorites.length > DECK.length || data.sessions.length > 200) throw new Error('The backup exceeds the supported size.');
    if (data.favorites.some(id => !byId.has(id))) throw new Error('The backup contains an unknown card.');
    const ids = new Set();
    const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(s) && Number.isFinite(Date.parse(s)) && s.length < 40;
    const sessions = data.sessions.map(s => {
      if (!s || typeof s.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(s.id) || ids.has(s.id) || !validDate(s.startedAt) || (s.completedAt !== null && !validDate(s.completedAt)) || !Object.hasOwn(TOPICS,s.topic) || !(s.step === '' || (Number.isInteger(s.step) && s.step >= 1 && s.step <= 12)) || !Array.isArray(s.cards) || s.cards.length < 1 || s.cards.length > 12 || s.cards.some(id => !byId.has(id)) || new Set(s.cards).size !== s.cards.length || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.cards.length || !s.notes || typeof s.notes !== 'object' || Array.isArray(s.notes)) throw new Error('A session in this backup is invalid. Nothing has been imported.');
      const notes = {};
      for (const [id, note] of Object.entries(s.notes)) {
        if (!s.cards.includes(id) || typeof note !== 'string' || note.length > 10000) throw new Error('The backup contains invalid or oversized notes.');
        notes[id] = note;
      }
      ids.add(s.id);
      return {id:s.id,startedAt:s.startedAt,completedAt:s.completedAt,topic:s.topic,step:s.step,cards:[...s.cards],index:s.index,notes};
    });
    return {format:'sponsor-deck',version:1,favorites:[...new Set(data.favorites)],sessions,activeId:typeof data.activeId === 'string' && sessions.some(s => s.id === data.activeId && !s.completedAt) ? data.activeId : null};
  }
  function storageWarning(message) { $('storage-warning').textContent = message; $('storage-warning').hidden = false; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = validate(JSON.parse(raw));
    // Probe storage before making promises about saving.
    localStorage.setItem('sponsor-deck.probe','1'); localStorage.removeItem('sponsor-deck.probe');
  } catch { storageWarning('Browser storage is unavailable or saved data could not be read. Changes may last only until you close this page. Export a backup to keep them.'); }
  current = state.sessions.find(s => s.id === state.activeId) || null;
  function persist() {
    if(staleTab)return false;
    try { localStorage.setItem(KEY,JSON.stringify(state)); return true; }
    catch { storageWarning('Changes could not be saved on this device. Export a backup before closing this page.'); return false; }
  }
  function toast(message) { if($('space-dialog').open)$('space-status').textContent=message; clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'),3500); }
  function shuffled(list) { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function pool(t=topic,s=step) { return DECK.filter(c => (t==='all'||c.topic===t) && (t!=='steps'||!s||c.step===Number(s))); }
  function cardHTML(c) {
    const fav = state.favorites.includes(c.id);
    return `<article class="conversation-card" aria-label="${escape(label(c))} conversation card"><div class="card-top"><span class="tag">${escape(label(c).toUpperCase())}</span><button class="icon-button favorite-button" data-favorite="${c.id}" aria-pressed="${fav}" aria-label="${fav?'Remove from':'Add to'} favorites: ${escape(c.title)}"><span aria-hidden="true">${fav?'★':'☆'}</span></button></div><p class="card-title">${escape(c.title)}</p><h3 class="card-question">${escape(c.question)}</h3><div class="followup"><span>GO A LITTLE DEEPER</span><p>${escape(c.follow)}</p></div><div class="card-bottom"><span>Take your time with this one.</span><span>${String(DECK.indexOf(c)+1).padStart(2,'0')} / 72</span></div></article>`;
  }
  function updateCounts() { $('favorite-count').textContent=state.favorites.length; }
  function renderTopics() {
    $('topics').innerHTML = Object.entries(TOPICS).map(([key,[name,symbol]]) => `<button class="topic-button" data-topic="${key}" aria-pressed="${topic===key}"><span class="topic-symbol" aria-hidden="true">${symbol}</span>${name}<span class="count">${pool(key,'').length}</span></button>`).join('');
    $('step-filter-wrap').hidden=topic!=='steps';
    $('step-filter').value=step;
    $('pool-label').textContent=`${topic==='steps'&&step?`STEP ${step}`:TOPICS[topic][0].toUpperCase()} · ${pool().length} CARDS`;
  }
  function draw(speak=true) {
    const key=`${topic}:${step}`;
    if (bagKey!==key || !bag.length) {
      bag=shuffled(pool().map(c=>c.id)); bagKey=key;
      if(bag.length>1 && bag[bag.length-1]===selected) [bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
    }
    selected=bag.pop();
    $('card-host').innerHTML=cardHTML(byId.get(selected));
    $('card-host').classList.remove('card-enter'); void $('card-host').offsetWidth; $('card-host').classList.add('card-enter');
    if(speak) announce(`${label(byId.get(selected))}: ${byId.get(selected).question}`);
  }
  // Screen-reader only; a visible toast would cover the card on phones.
  function announce(message) { $('announcer').textContent=''; setTimeout(()=>{$('announcer').textContent=message;},50); }
  function changeTopic(t) { topic=t; step='';renderTopics();draw(); }
  function renderFavorites() {
    $('favorites-list').innerHTML = state.favorites.length ? state.favorites.map(id=>cardHTML(byId.get(id))).join('') : `<div class="empty-state"><span aria-hidden="true">☆</span><h3>Keep a question close.</h3><p>Tap the star on any card to save it here for another conversation.</p><button class="primary" data-go="draw">Explore the deck</button></div>`;
  }
  function switchView(next, focus=true) {
    view=next;
    for(const name of ['draw','favorites','sessions']) $(`${name}-view`).hidden = name!==next;
    document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(next==='favorites') renderFavorites();
    if(next==='sessions') renderSessions();
    if(focus){ const target=$(next==='draw'?'draw-view':next==='favorites'?'favorites-title':current?'session-active':'sessions-title');target.tabIndex=-1;target.focus({preventScroll:true}); }
  }
  function renderSessionAvailable() {
    const count=pool($('session-topic').value,$('session-step').value).length;
    $('session-step-wrap').hidden=$('session-topic').value!=='steps';
    $('session-available').textContent=`${count} cards available. Longer sessions use all available cards.`;
  }
  const dateText = s => new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  function sessionTitle(s) { return s.topic==='steps'&&s.step ? `Step ${s.step}` : TOPICS[s.topic][0]; }
  function renderHistory() {
    $('session-history').innerHTML = state.sessions.length ? [...state.sessions].sort((a,b)=>b.startedAt.localeCompare(a.startedAt)).map(s=>`<div class="history-item"><div><h3>${escape(sessionTitle(s))}</h3><p>${escape(dateText(s.startedAt))} · ${s.cards.length} cards · ${s.completedAt?'Completed':'In progress'}</p></div><div><button class="secondary" data-session="${s.id}">${s.completedAt?'Review':'Resume'}</button><button class="icon-button" data-delete="${s.id}" aria-label="Delete session from ${escape(dateText(s.startedAt))}">×</button></div></div>`).join('') : `<p class="muted small">Nothing saved yet. If you choose to save a session, you’ll find it here.</p>`;
  }
  function renderSessions() {
    $('session-home').hidden=!!current; $('session-active').hidden=!current;
    if(!current){ renderHistory();return; }
    renderActive();
  }
  function savedCurrent() { return current && state.sessions.some(s=>s.id===current.id); }
  function renderActive() {
    const c=byId.get(current.cards[current.index]);
    $('session-active').innerHTML=`<div class="session-shell"><div class="session-meta"><span>${escape(sessionTitle(current))} · Card ${current.index+1} of ${current.cards.length}</span><button class="text-button" id="leave-session">${savedCurrent()?'Save & leave':'End session'}</button></div><div class="progress" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${current.cards.length}" aria-valuenow="${current.index+1}"><div style="width:${(current.index+1)/current.cards.length*100}%"></div></div>${cardHTML(c)}<div class="session-notes"><label for="session-note">A note to return to <span>${savedCurrent()?'Saved on this device':'Not saved · this session only'}</span></label><textarea id="session-note" maxlength="10000" placeholder="An insight, a question, a small next action…">${escape(current.notes[c.id]||'')}</textarea><p class="session-note-help">${savedCurrent()?'Notes are saved as you type in this browser. They are not encrypted.':'Notes stay in memory and disappear when this session ends or the page reloads.'} No need to name names.</p></div><div class="session-nav"><button class="secondary" id="session-prev" ${current.index===0?'disabled':''}>← Previous</button><button class="primary" id="session-next">${current.index===current.cards.length-1?'Finish session':'Next card →'}</button></div><p class="small muted">Passing is part of the process. Use Next card whenever you’re ready.</p></div>`;
  }
  function persistCurrent() { if(savedCurrent())persist(); }
  function confirmAction(title,copy,actionLabel='Continue') {
    const dialog=$('confirm-dialog'); $('confirm-title').textContent=title; $('confirm-copy').textContent=copy; $('confirm-ok').textContent=actionLabel;
    return new Promise(resolve=>{
      const done = yes=>{dialog.close();dialog.removeEventListener('cancel',cancel);$('confirm-ok').onclick=null;$('confirm-cancel').onclick=null;resolve(yes);};
      const cancel=e=>{e.preventDefault();done(false);};
      $('confirm-ok').onclick=()=>done(true);$('confirm-cancel').onclick=()=>done(false);dialog.addEventListener('cancel',cancel);dialog.showModal();$('confirm-cancel').focus();
    });
  }
  async function protectCurrent() {
    if(!current)return true;
    if(!savedCurrent() && !await confirmAction('Leave this session?', 'This session and its notes have not been saved. Leaving will discard them.','Discard session'))return false;
    if(savedCurrent())state.activeId=null;
    current=null;persist();return true;
  }
  async function beginSession() {
    if(!await protectCurrent())return;
    const save=$('save-session').checked;
    if(save && state.sessions.length>=200){toast('Your space holds 200 saved sessions. Export and delete an older one first.');return;}
    const t=$('session-topic').value,s=t==='steps'?$('session-step').value:'';
    const cards=shuffled(pool(t,s).map(c=>c.id)).slice(0,Number($('session-length').value));
    current={id:crypto.randomUUID?crypto.randomUUID():`session-${Date.now()}-${Math.random().toString(36).slice(2)}`,startedAt:new Date().toISOString(),completedAt:null,topic:t,step:s?Number(s):'',cards,index:0,notes:{}};
    if(save){state.sessions.push(current);state.activeId=current.id;persist();}
    renderSessions();$('session-active').tabIndex=-1;$('session-active').focus();toast('Session started. Take your time.');
  }
  function showReview(s,ephemeral=false) {
    $('session-home').hidden=true;$('session-active').hidden=false;
    $('session-active').innerHTML=`<div class="session-shell"><p class="eyebrow">${ephemeral?'A MOMENT WELL SPENT':'YOUR SAVED CONVERSATION'}</p><h2>${s.completedAt?'A little more to carry with you.':'A conversation in progress.'}</h2><p class="muted">${escape(sessionTitle(s))} · ${escape(dateText(s.startedAt))} · ${s.cards.length} cards</p><p class="small muted">${ephemeral?'This session was not saved. Your notes are no longer retained.':'Your questions and saved notes, here when you need them.'}</p>${s.cards.map(id=>{const c=byId.get(id);return `<div class="review-entry"><span class="tag">${escape(label(c))}</span><h3>${escape(c.question)}</h3>${!ephemeral&&s.notes[id]?`<p>${escape(s.notes[id])}</p>`:''}</div>`;}).join('')}<div class="session-nav"><button class="primary" id="review-done">Back to sessions</button></div></div>`;
    $('session-active').tabIndex=-1;$('session-active').focus();
  }
  async function finishSession() {
    const saved=savedCurrent();
    if(!saved && Object.values(current.notes).some(Boolean) && !await confirmAction('Finish without saving notes?', 'You chose a session without saving. Finishing will discard all its notes. You can go back and read them before you finish.','Finish & discard notes')) return;
    current.completedAt=new Date().toISOString();
    const finished=current; current=null;state.activeId=null;persist();
    if(!saved)finished.notes={};
    showReview(finished,!saved);toast(saved?'Session saved. Thank you for showing up.':'Session complete. Thank you for showing up.');
  }
  document.addEventListener('click', async e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.favorite){
      const id=b.dataset.favorite,existing=state.favorites.includes(id);
      state.favorites=existing?state.favorites.filter(x=>x!==id):[...state.favorites,id];const saved=persist();updateCounts();
      document.querySelectorAll('[data-favorite]').forEach(el=>{if(el.dataset.favorite===id){el.setAttribute('aria-pressed',String(!existing));el.setAttribute('aria-label',`${existing?'Add to':'Remove from'} favorites: ${byId.get(id).title}`);el.firstElementChild.textContent=existing?'☆':'★';}});
      if(view==='favorites'){const oldIndex=[...document.querySelectorAll('#favorites-list [data-favorite]')].indexOf(b);renderFavorites();const remaining=document.querySelectorAll('#favorites-list [data-favorite]');(remaining[Math.min(oldIndex,remaining.length-1)]||document.querySelector('#favorites-list button'))?.focus();}
      toast(saved?(existing?'Removed from favorites.':'Saved to favorites.'):'Favorite updated for this visit. Device storage is unavailable.');
    }
    if(b.dataset.topic)changeTopic(b.dataset.topic);
    if(b.dataset.view)switchView(b.dataset.view);
    if(b.dataset.go)switchView(b.dataset.go);
    if(b.hasAttribute('data-close'))b.closest('dialog').close();
    if(b.dataset.session){const s=state.sessions.find(x=>x.id===b.dataset.session);if(!s)return;if(current?.id!==s.id && !await protectCurrent())return;if(s.completedAt){showReview(s);}else{current=s;state.activeId=s.id;persist();renderSessions();$('session-active').tabIndex=-1;$('session-active').focus();}}
    if(b.dataset.delete && await confirmAction('Delete this session?', 'Its questions and notes will be removed from this browser. Export a backup first if you want to keep them.','Delete session')){state.sessions=state.sessions.filter(s=>s.id!==b.dataset.delete);if(current?.id===b.dataset.delete){current=null;state.activeId=null;}persist();renderSessions();toast('Session deleted.');}
    if(b.id==='leave-session' && await protectCurrent()){renderSessions();$('sessions-title').tabIndex=-1;$('sessions-title').focus();}
    if(b.id==='session-prev'){current.index--;persistCurrent();renderActive();$('session-active').focus();}
    if(b.id==='session-next'){if(current.index===current.cards.length-1)await finishSession();else{current.index++;persistCurrent();renderActive();$('session-active').focus();}}
    if(b.id==='review-done')renderSessions();
  });
  document.addEventListener('input',e=>{if(e.target.id==='session-note'&&current){current.notes[current.cards[current.index]]=e.target.value;persistCurrent();}});
  $('draw-button').onclick=()=>draw();
  $('step-filter').onchange=e=>{step=e.target.value;renderTopics();draw();};
  $('start-session').onclick=()=>{$('session-topic').value=topic;$('session-step').value=step;renderSessionAvailable();switchView('sessions');};
  $('session-topic').onchange=()=>{$('session-step').value='';renderSessionAvailable();};
  $('session-step').onchange=renderSessionAvailable;
  $('begin-session').onclick=beginSession;
  $('settings-button').onclick=()=>$('space-dialog').showModal();
  $('about-button').onclick=()=>$('about-dialog').showModal();
  $('export-button').onclick=()=>{
    const payload={...state,activeId:null,exportedAt:new Date().toISOString()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`sponsor-deck-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Backup exported. Keep it somewhere private.');
  };
  $('import-button').onclick=()=>$('import-file').click();
  $('import-file').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{
      if(file.size>3*1024*1024)throw new Error('Choose a backup smaller than 3 MB.');
      const data=validate(JSON.parse(await file.text()));
      const existing=new Set(state.sessions.map(s=>s.id));
      const incoming=data.sessions.filter(s=>!existing.has(s.id));
      if(incoming.length+state.sessions.length>200)throw new Error('This import would exceed 200 saved sessions. Export and remove older sessions first.');
      if(!await confirmAction('Merge this backup?', `${data.favorites.length} favorites and ${incoming.length} new saved sessions are available to merge. Existing sessions with matching IDs stay unchanged. Notes in this file will be stored on this device.`, 'Merge backup'))return;
      state.favorites=[...new Set([...state.favorites,...data.favorites])];state.sessions.push(...incoming);persist();updateCounts();renderFavorites();if(view==='sessions')renderSessions();refreshStars();toast('Backup merged.');
    }catch(error){toast(error instanceof SyntaxError?'That file is not valid JSON. Nothing was imported.':error.message);}
  };
  function refreshStars(){document.querySelectorAll('[data-favorite]').forEach(b=>{const yes=state.favorites.includes(b.dataset.favorite);b.setAttribute('aria-pressed',String(yes));b.setAttribute('aria-label',`${yes?'Remove from':'Add to'} favorites: ${byId.get(b.dataset.favorite).title}`);b.firstElementChild.textContent=yes?'★':'☆';});}
  $('clear-button').onclick=async()=>{
    if(!await confirmAction('Clear all local data?', 'All favorites, saved sessions, private notes, and any session in progress will be removed from this browser. Export a backup first if needed. This cannot be undone.','Clear all data'))return;
    if(staleTab){toast('Reload this tab before clearing data changed in another tab.');return;}
    state=blank();current=null;
    try{localStorage.removeItem(KEY);localStorage.removeItem('sponsor-deck.visited');}catch{storageWarning('Browser storage could not be cleared. Use your browser’s site data settings to remove stored data.');}
    updateCounts();refreshStars();renderFavorites();renderSessions();$('space-dialog').close();toast('Local data cleared.');
  };
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('install-button').hidden=false;});
  $('install-button').onclick=async()=>{if(installEvent){await installEvent.prompt();await installEvent.userChoice;installEvent=null;$('install-button').hidden=true;}};
  window.addEventListener('appinstalled',()=>{installEvent=null;$('install-button').hidden=true;toast('Sponsor Deck is installed.');});
  window.addEventListener('offline',()=>toast('You’re offline. Your deck is still here.'));
  // Temporary session notes live only in memory, so ask before a reload or close discards them.
  const unsavedNotes = () => current && !savedCurrent() && Object.values(current.notes).some(Boolean);
  window.addEventListener('beforeunload',e=>{if(!reloading&&unsavedNotes()){e.preventDefault();e.returnValue='';}});
  document.querySelector('.brand').addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;e.preventDefault();switchView('draw');window.scrollTo({top:0});});
  // Prevent stale open tabs from silently overwriting newer browser data.
  window.addEventListener('storage',e=>{if(e.key===KEY){staleTab=true;storageWarning('Sponsor Deck data changed in another tab. Export any unsaved work, then reload this tab before making more changes.');}});
  for(const id of ['step-filter','session-step'])for(let i=1;i<=12;i++)$(id).add(new Option(`Step ${i}`,String(i)));
  $('session-topic').innerHTML=Object.entries(TOPICS).map(([key,[name]])=>`<option value="${key}">${name}</option>`).join('');
  renderTopics();draw(false);updateCounts();renderSessionAvailable();
  try{localStorage.setItem('sponsor-deck.visited','1');}catch{}
  if('serviceWorker' in navigator && location.protocol!=='file:'){
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      // A new version waits until a reload is safe for any notes in progress.
      const offerUpdate=()=>{$('update-banner').hidden=false;};
      $('update-button').onclick=async()=>{
        if(unsavedNotes() && !await confirmAction('Reload to update?', 'This session was not saved. Reloading now will discard its notes.','Discard & reload'))return;
        // Set reloading only at the moment of reload, so a stalled update never disables the unsaved-notes guard.
        if(!reg.waiting){reloading=true;location.reload();return;}
        navigator.serviceWorker.addEventListener('controllerchange',()=>{reloading=true;location.reload();},{once:true});
        reg.waiting.postMessage('skip-waiting');
      };
      if(reg.waiting)offerUpdate();
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)offerUpdate();else toast('Ready for offline conversations.');}});});
    }).catch(()=>toast('Offline setup could not finish. Keep this page online and reload to try again.'));
  }
})();
