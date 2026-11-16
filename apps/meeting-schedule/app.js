// LEGACY (MattST) — schedule-only viewer that points residents to the new app at
// https://lab.maniczone.com/apps/24/meetings/. Attendance tracking, outside meetings, records,
// backups, check-ins, and the sobriety counter were removed here; they live in ManicZone/.
// Saved localStorage data is never read, changed, or cleared by this version (except the phase choice).
import {dallasNow,dateFor,shiftDate,meetingsFor,timeMinutes,timeLabel,endTime,isInProgress,inProgressMeetings,ruleFor,RULES} from './schedule.js';

const $=id=>document.getElementById(id);
const PHASE_KEY='d24-resident-phase-v1';
const fmt=(d,options={month:'short',day:'numeric',year:'numeric'})=>dateFor(d).toLocaleDateString('en-US',{timeZone:'UTC',...options});

/* ---------- State ---------- */
let phase='one';
try{if(localStorage.getItem(PHASE_KEY)==='two')phase='two';}catch{}
let today=dallasNow().date,selected=today;
const isFuture=(date,time,now=dallasNow())=>date>now.date||(date===now.date&&timeMinutes(time)>now.minutes);

/* ---------- DOM helpers ---------- */
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
// Rebuild a container only when its content actually changes.
function keyed(el,key,build){if(el.dataset.key===key)return;el.dataset.key=key;el.replaceChildren(...build());}
function setValue(input,value){if(input.value!==value&&document.activeElement!==input)input.value=value;}

/* ---------- Phase (requirement labels only) ---------- */
function openPhase(){$('resident-phase').value=phase;$('phase-error').textContent='';$('phase-dialog').showModal();}
$('change-phase').onclick=openPhase;
$('settings-change-phase').onclick=openPhase;
$('cancel-phase').onclick=()=>$('phase-dialog').close();
$('phase-form').onsubmit=e=>{
 e.preventDefault();const next=$('resident-phase').value;
 if(!['one','two'].includes(next))return;
 try{localStorage.setItem(PHASE_KEY,next);}catch{$('phase-error').textContent='Could not save your phase on this device. Check browser storage and try again.';return;}
 phase=next;$('phase-dialog').close();render();
};

/* ---------- Rendering ---------- */
const ruleLabel=m=>RULES[phase][ruleFor(m,phase)].label;
function rowClass(m){
 if(phase!=='two')return ' '+m.rule;
 return ruleFor(m,'two')==='common'?'':' mandatory';
}

function renderOverview(now){
 let next=meetingsFor(now.date).find(m=>timeMinutes(m.time)>now.minutes),nextDay=now.date;
 if(!next){nextDay=shiftDate(now.date,1);next=meetingsFor(nextDay)[0];}
 const wait=timeMinutes(next.time)-now.minutes+(nextDay===now.date?0:1440);
 const remaining=wait<60?`${wait} min`:`${Math.floor(wait/60)}h ${wait%60}m`;
 $('live-date').textContent=fmt(now.date,{month:'short',day:'numeric'});
 $('next-label').textContent=nextDay===now.date?'NEXT MEETING TODAY':`NEXT MEETING · TOMORROW, ${fmt(nextDay,{weekday:'long'}).toUpperCase()}`;
 $('next-title').textContent=next.title;
 $('next-detail').textContent=`${timeLabel(next.time)} · ${ruleLabel(next)} · Starts in ${remaining}`;

 const ongoing=inProgressMeetings(now.date,now.minutes);
 $('in-progress').hidden=ongoing.length===0;
 keyed($('in-progress'),JSON.stringify([now.date,phase,ongoing.map(m=>m.time)]),()=>{
  if(!ongoing.length)return [];
  return [node('p',ongoing.length===1?'IN PROGRESS NOW':'MEETINGS IN PROGRESS','eyebrow'),...ongoing.flatMap(m=>[node('h2',m.title),node('p',`${timeLabel(m.time)} – ${timeLabel(endTime(m.time))} · ${ruleLabel(m)}`,'progress-detail')])];
 });
 return {next,nextDay};
}

function renderSchedule(now,next,nextDay){
 setValue($('selected-date'),selected);
 $('day-heading').textContent=fmt(selected,{weekday:'long'});
 $('today').hidden=selected===now.date;
 const rows=meetingsFor(selected).map(m=>{
  const isToday=selected===now.date;
  const state=isFuture(selected,m.time,now)?'future':isToday&&isInProgress(m,now.minutes)?'live':'past';
  return {m,state,next:isToday&&nextDay===now.date&&next.time===m.time};
 });
 $('count').textContent=`${rows.length} scheduled meetings`;
 keyed($('meetings'),JSON.stringify([phase,selected,rows.map(({m,state,next})=>[m.time,m.title,state,next])]),()=>rows.map(({m,state,next})=>{
  const row=node('article',undefined,'meeting'+rowClass(m));
  const body=node('div',undefined,'meeting-body');
  body.append(node('h3',m.title),node('span',ruleLabel(m),'rule'));
  if(m.note)body.append(node('p',m.note,'note'));
  if(state==='live')body.append(node('span','IN PROGRESS','upcoming-label'));
  else if(next)body.append(node('span','UP NEXT','upcoming-label'));
  else if(selected===now.date&&state==='past')body.append(node('span','Started earlier','past'));
  row.append(node('div',timeLabel(m.time),'time'),body);
  return row;
 }));
}

function render(){
 const two=phase==='two';
 const now=dallasNow();
 // If the app stays open (or is resumed) past midnight, move "today" forward.
 if(now.date!==today){if(selected===today)selected=now.date;today=now.date;}
 $('phase-indicator').textContent=two?'Phase Two':'Phase One';
 $('overview-phase').textContent=two?'PHASE TWO':'PHASE ONE';
 $('phase-one-key').hidden=two;$('phase-two-key').hidden=!two;
 const relative={[now.date]:'Today',[shiftDate(now.date,1)]:'Tomorrow',[shiftDate(now.date,-1)]:'Yesterday'}[selected];
 $('intro-title').textContent=relative?`${relative}’s meetings.`:`Meetings for ${fmt(selected,{weekday:'long',month:'short',day:'numeric'})}.`;
 $('intro-subtitle').textContent=two?'Attendance tracking now lives in the new app above.':'A little clarity for the day ahead.';
 $('settings-phase-description').textContent=two?'Phase Two shows the Phase Two requirement labels on the schedule.':'Phase One shows the original schedule and attendance requirements.';
 const {next,nextDay}=renderOverview(now);
 renderSchedule(now,next,nextDay);
 $('connection').classList.toggle('offline',!navigator.onLine);
 $('connection').textContent=navigator.onLine?'Daily schedule':'Offline';
}
$('prev').onclick=()=>{selected=shiftDate(selected,-1);render();};
$('next').onclick=()=>{selected=shiftDate(selected,1);render();};
$('today').onclick=()=>{selected=dallasNow().date;render();};
$('selected-date').onchange=e=>{if(e.target.value){selected=e.target.value;render();}};

/* ---------- Other tabs, timers, app updates ---------- */
window.addEventListener('storage',e=>{if(e.key===PHASE_KEY||e.key===null){phase=e.newValue==='two'?'two':'one';render();}});
window.addEventListener('online',render);window.addEventListener('offline',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();checkForUpdates();}});
setInterval(()=>{if(!$('phase-dialog').open)render();},15000);
render();

function showUpdate(message,label,action){
 $('update-text').textContent=message;$('update-action').textContent=label;$('update-action').onclick=action;$('update-banner').hidden=false;
}
let swReg=null,lastUpdateCheck=0;
function checkForUpdates(){
 if(!swReg||!navigator.onLine||Date.now()-lastUpdateCheck<30*60*1000)return;
 lastUpdateCheck=Date.now();
 navigator.serviceWorker.controller?.postMessage('CHECK_FOR_UPDATES');
 swReg.update().catch(()=>{});
}
// Keep the same registration (./sw.js, default scope) as earlier versions so installed copies keep updating.
if('serviceWorker' in navigator){
 const hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.register('./sw.js').then(async reg=>{
  swReg=reg;
  await navigator.serviceWorker.ready;
  $('offline-status').textContent='Offline access to the schedule is ready on this device.';
  const applyWaiting=()=>reg.waiting?.postMessage('SKIP_WAITING');
  const offer=()=>{$('update').hidden=false;$('update').onclick=applyWaiting;showUpdate('An app update is ready.','Load update',applyWaiting);};
  if(reg.waiting)offer();
  reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{if(reg.waiting&&navigator.serviceWorker.controller)offer();}));
  checkForUpdates();
 }).catch(()=>{$('offline-status').textContent='Offline installation needs a hosted HTTPS address.';});
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data==='APP_UPDATED')showUpdate('The schedule or app was updated.','Reload',()=>location.reload());});
 // Reload once when a new version takes over, but not on the very first install.
 let reloading=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!reloading){reloading=true;location.reload();}});
}
