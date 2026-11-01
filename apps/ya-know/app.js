const KEY='kevin-ya-know-v1';
const fresh=()=>({version:1,count:0,total:0,completed:0,best:0,started:null,taps:[],history:[],sound:false,haptics:true});
let state=fresh(),storageOK=true,audio,installPrompt,toastTimer,boardView='top';
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1&&Number.isSafeInteger(saved.count)&&saved.count>=0&&Number.isSafeInteger(saved.total)&&saved.total>=saved.count&&Array.isArray(saved.history)&&Array.isArray(saved.taps))state={...fresh(),...saved};}catch{storageOK=false}
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString(),plural=n=>n===1?'ya know':'ya knows';
const TRASH='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

function toast(message,action,onAction,ms=4000){clearTimeout(toastTimer);$('toast-text').textContent=message;const btn=$('toast-action');btn.hidden=!action;btn.textContent=action||'';btn.onclick=()=>{hideToast();onAction()};$('toast').hidden=false;toastTimer=setTimeout(hideToast,ms)}
function hideToast(){clearTimeout(toastTimer);$('toast').hidden=true}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;toast('Storage unavailable. Keep this page open to retain your count.',null,null,8000)}}
function render(){const el=$('count');el.textContent=fmt(state.count);el.classList.toggle('large',state.count>999);$('undo').disabled=state.count===0;$('save').disabled=state.count===0;$('session').textContent=state.started?'Started '+new Date(state.started).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'New meeting'}
function feedback(){if(state.haptics&&navigator.vibrate)navigator.vibrate(20);if(state.sound){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;osc.type='sine';osc.frequency.setValueAtTime(680,t);osc.frequency.exponentialRampToValueAtTime(340,t+.09);gain.gain.setValueAtTime(.12,t);gain.gain.exponentialRampToValueAtTime(.001,t+.12);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.13)}catch{toast('Sound is unavailable in this browser.')}}}
function tap(){if(state.count>=Number.MAX_SAFE_INTEGER||state.total>=Number.MAX_SAFE_INTEGER)return;const now=Date.now();state.started??=now;state.count++;state.total++;state.taps.push(now);state.taps=state.taps.slice(-500);persist();render();feedback();$('tap').classList.add('pressed');setTimeout(()=>$('tap').classList.remove('pressed'),100)}
$('tap').addEventListener('click',tap);
$('undo').addEventListener('click',()=>{if(!state.count)return;state.count--;state.total--;state.taps.pop();if(!state.count)state.started=null;persist();render()});

// Ties share a rank: 1 + number of meetings with strictly more ya knows.
const rankOf=count=>1+state.history.filter(h=>h.count>count).length;
const medal=rank=>['🥇','🥈','🥉'][rank-1];
const dayLabel=t=>{const d=new Date(t);return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',...(d.getFullYear()!==new Date().getFullYear()&&{year:'numeric'})})};
const timeLabel=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});

// Match by value, not reference: a storage event from another tab replaces state.history with fresh objects.
const same=(a,b)=>a.ended===b.ended&&a.count===b.count&&a.started===b.started;
// Removes a saved meeting from history and the totals derived from it. Returns false if it was already gone.
function unrecord(entry){const before=state.history.length;state.history=state.history.filter(h=>!same(h,entry));if(state.history.length===before)return false;state.completed=Math.max(0,state.completed-1);if(entry.count>=state.best)state.best=Math.max(0,...state.history.map(h=>h.count));return true}

function saveMeeting(){if(!state.count)return;const prevBest=state.best,taps=state.taps,entry={count:state.count,started:state.started,ended:Date.now()},record=state.count>state.best&&state.history.length>0;
state.history.unshift(entry);state.completed++;state.best=Math.max(state.best,entry.count);state.count=0;state.started=null;state.taps=[];persist();render();if(state.haptics&&navigator.vibrate)navigator.vibrate([30,40,30]);
const rank=rankOf(entry.count),msg=record?`🏆 New record! ${fmt(entry.count)} ${plural(entry.count)}`:`Saved ${fmt(entry.count)} ${plural(entry.count)} · ${medal(rank)?medal(rank)+' ':''}#${rank} all time`;
// Undo folds the saved meeting back into the live count, keeping any taps made since the save. total never changed on save.
toast(msg,'Undo',()=>{if(!unrecord(entry))return toast('That meeting was already removed.');state.best=Math.max(state.best,prevBest);state.count+=entry.count;state.started=entry.started;state.taps=[...taps,...state.taps].slice(-500);persist();render();toast('Save undone. Keep counting.')},6000)}
$('save').addEventListener('click',saveMeeting);

function open(title,html){$('modal-title').textContent=title;$('modal-body').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
$('close').onclick=()=>$('modal').close();$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close()}});

function deleteMeeting(entry){if(!confirm(`Delete ${dayLabel(entry.started??entry.ended)} (${fmt(entry.count)} ${plural(entry.count)}) from the leaderboard?`))return;if(unrecord(entry))state.total=Math.max(state.count,state.total-entry.count);persist();showBoard()}
function showBoard(){open('🏆 Leaderboard',`<div class="seg" role="group" aria-label="Sort meetings"><button data-view="top" aria-pressed="${boardView==='top'}">Top meetings</button><button data-view="recent" aria-pressed="${boardView==='recent'}">Most recent</button></div>${state.count?`<div class="live"><span>This meeting so far: <strong>${fmt(state.count)}</strong></span><span>on pace for #${rankOf(state.count)}</span></div>`:''}<ul id="board-list" class="board"></ul>`);
for(const b of document.querySelectorAll('.seg button'))b.onclick=()=>{boardView=b.dataset.view;showBoard()};
if(!state.history.length){$('board-list').outerHTML='<p class="empty">No meetings saved yet.<br>Count some ya knows, then tap <strong>Save meeting</strong> when it wraps up.</p>';return}
const list=boardView==='top'?[...state.history].sort((a,b)=>b.count-a.count||a.ended-b.ended):state.history;
for(const entry of list){const rank=rankOf(entry.count),when=entry.started??entry.ended,li=document.createElement('li');li.innerHTML=`<span class="rank${medal(rank)?'':' num'}">${medal(rank)||'#'+rank}</span><span class="when"></span><span class="num-yk">${fmt(entry.count)}<small>${plural(entry.count)}</small></span><button class="del" aria-label="Delete this meeting">${TRASH}</button>`;li.querySelector('.when').append(dayLabel(when),Object.assign(document.createElement('small'),{textContent:timeLabel(when)}));li.querySelector('.del').onclick=()=>deleteMeeting(entry);$('board-list').append(li)}}
$('board').onclick=showBoard;

function showStats(){const minutes=state.started?(Date.now()-state.started)/60000:0,rate=minutes>=1?(state.count/minutes).toFixed(1):'—',saved=state.history.length,avg=saved?(state.history.reduce((n,h)=>n+h.count,0)/saved).toFixed(1):'—';open('The “Ya Know” numbers',`<div class="stat-grid"><div class="stat-card"><strong>${fmt(state.total)}</strong><span>All-time ya knows</span></div><div class="stat-card"><strong>${fmt(Math.max(state.best,state.count))}</strong><span>Best meeting</span></div><div class="stat-card"><strong>${avg}</strong><span>Average per meeting</span></div><div class="stat-card"><strong>${fmt(state.completed)}</strong><span>Meetings saved</span></div></div><p class="copy">This meeting: ${fmt(state.count)} so far, ${rate} per minute. Rate includes all time since the first tap, including time away from the app.</p><button id="export" class="primary">Export data (JSON)</button>`);$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='kevin-counter-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}
$('stats').onclick=showStats;

$('settings').onclick=()=>{open('Settings',`<label class="setting">Tap sound<input id="sound" type="checkbox" ${state.sound?'checked':''}></label><label class="setting">Vibration, where supported<input id="haptics" type="checkbox" ${state.haptics?'checked':''}></label><button id="discard" class="primary danger" ${state.count?'':'disabled'}>Reset without saving</button><p class="install-info">Counts and settings are saved on this device. Clearing browser data removes them. Export a backup from Stats.</p><h3>Install on your phone</h3><p class="install-info">iPhone: open in Safari, tap Share, then Add to Home Screen.<br>Android: use your browser’s Install app or Add to Home screen menu.<br>After the first online visit, the app works offline.</p>${installPrompt?'<button id="install" class="primary">Install app</button>':''}<p class="credit">Developed by <a href="https://matt.st/" target="_blank" rel="noopener">Matt Livingston</a></p>`);for(const key of ['sound','haptics'])$(key).onchange=e=>{state[key]=e.target.checked;persist();if(key==='sound'&&state.sound)feedback()};
$('discard').onclick=()=>{if(!confirm(`Throw away this meeting’s ${fmt(state.count)} ${plural(state.count)} without saving?`))return;state.total-=state.count;state.count=0;state.started=null;state.taps=[];persist();render();$('modal').close();toast('Count cleared. Nothing was saved.')};
if($('install'))$('install').onclick=async()=>{await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true}};

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
window.addEventListener('storage',event=>{if(event.key===KEY){try{const other=JSON.parse(event.newValue);if(other?.version===1&&Number.isSafeInteger(other.count)&&Array.isArray(other.taps)&&Array.isArray(other.history)){state=other;render()}}catch{}}});
render();if(!storageOK)toast('Saved data could not be read. New taps will try saving again.',null,null,8000);
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js?v=3').catch(()=>toast('Offline mode could not start. You can still count while online.'))}
