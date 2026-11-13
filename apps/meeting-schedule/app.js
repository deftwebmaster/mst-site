import {dallasNow,dateFor,shiftDate,meetingsFor,timeMinutes,timeLabel,endTime,isInProgress,inProgressMeetings,ruleFor,RULES,WEEKLY_GOAL,phaseOneMandatoryCalendar,weeklyCheckinCalendar,CHECKIN_FORM_URL} from './schedule.js';
import {KEY,emptyStore,validateStore,mergeStores} from './storage.js';

const $=id=>document.getElementById(id);
const PHASE_KEY='d24-resident-phase-v1';
const CLUB='Dallas 24 Hour Club';
const HOUSE=/house meeting/i;
const GOAL=WEEKLY_GOAL;
const GOAL_WORD=['zero','one','two','three','four','five','six','seven','eight','nine','ten'][GOAL]??String(GOAL);
const DALLAS={timeZone:'America/Chicago'};
const BACKUP_REMINDER_DAYS=7;
// "2 of 3" up to the goal; "4 (goal 3)" once it's passed.
const ofGoal=n=>n>GOAL?`${n} (goal ${GOAL})`:`${n} of ${GOAL}`;

const meetingKind=r=>r.kind||(r.location===CLUB?'club':'outside');
const kindLabel=r=>meetingKind(r)==='outside'?'Outside meeting':'24 Hour Club';
const isHouseMeeting=r=>meetingKind(r)==='club'&&HOUSE.test(r.title);
// The house meeting is mandatory but never counts toward the weekly goal.
const countsToward=r=>r.counts&&!isHouseMeeting(r);
// Older outside entries saved the group name as the location when no address was given.
const place=r=>r.location&&r.location.trim().toLowerCase()!==r.title.trim().toLowerCase()?r.location:'';
const dallasStamp=iso=>new Date(iso).toLocaleString('en-US',DALLAS);
const fmt=(d,options={month:'short',day:'numeric',year:'numeric'})=>dateFor(d).toLocaleDateString('en-US',{timeZone:'UTC',...options});
const weekLabel=w=>`${fmt(w,{month:'short',day:'numeric'})} – ${fmt(shiftDate(w,6),{month:'short',day:'numeric',year:'numeric'})}`;
export function weekStart(date){const weekday=dateFor(date).getUTCDay();return shiftDate(date,-((weekday+6)%7));}

const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

/* ---------- State ---------- */
let phase='one';
try{if(localStorage.getItem(PHASE_KEY)==='two')phase='two';}catch{}
let store=emptyStore(),blocked=false;
try{const raw=localStorage.getItem(KEY);if(raw)store=validateStore(JSON.parse(raw));}catch{blocked=true;}
let today=dallasNow().date,selected=today,historyDate=today,view='schedule';
let reminderSnoozed=false;

/* ---------- DOM helpers ---------- */
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,action,cls,fkey){const b=node('button',text,cls);b.type='button';b.onclick=action;if(fkey)b.dataset.fkey=fkey;return b;}
// Rebuild a container only when its content actually changes, and keep keyboard/VoiceOver focus on the same control.
function keyed(el,key,build){
 if(el.dataset.key===key)return;
 const focused=el.contains(document.activeElement)?document.activeElement.dataset.fkey:null;
 el.dataset.key=key;el.replaceChildren(...build());
 if(focused)el.querySelector(`[data-fkey="${CSS.escape(focused)}"]`)?.focus();
}
function setValue(input,value){if(input.value!==value&&document.activeElement!==input)input.value=value;}

/* ---------- Status messages ---------- */
let statusTimer;
function clearStatus(){clearTimeout(statusTimer);$('status').replaceChildren();}
function status(message,{action,actionLabel='Undo',sticky=false}={}){
 clearTimeout(statusTimer);
 $('status').replaceChildren(node('span',message));
 if(action)$('status').append(button(actionLabel,()=>{clearStatus();action();}));
 if(!sticky)statusTimer=setTimeout(clearStatus,action?10000:6000);
}

/* ---------- Saving ---------- */
let persistenceRequested=false;
function requestPersistence(){if(persistenceRequested)return;persistenceRequested=true;navigator.storage?.persist?.().catch(()=>{});}
function persist(next){
 if(blocked){status('Storage could not be read. Your existing data has been protected. Export the raw data or restore a valid backup before saving.',{sticky:true});return false;}
 try{localStorage.setItem(KEY,JSON.stringify(next));store=next;return true;}
 catch{status('Could not save. Device storage may be full or unavailable. Your change was not saved. Download a backup of your existing records.',{sticky:true});return false;}
}
function snapshot(r){const {changes,...rest}=r;return rest;}
function changeRecord(r,action){const next={...r,updatedAt:new Date().toISOString()};next.changes=[...(r.changes||[]),{at:next.updatedAt,action,snapshot:snapshot(next)}];return next;}
function saveRecord(record,action){const updated=changeRecord(record,action);const next={...store,records:[...store.records.filter(r=>r.id!==updated.id),updated]};if(!persist(next))return false;requestPersistence();render();return true;}

const active=()=>store.records.filter(r=>!r.deleted);
const byNewest=(a,b)=>(b.date+b.time).localeCompare(a.date+a.time);
// The Club holds one meeting per time slot, so a Club record at that date and time is that meeting, even if renamed.
const clubRecordAt=(date,time)=>active().find(r=>meetingKind(r)==='club'&&r.date===date&&r.time===time);
const isFuture=(date,time,now=dallasNow())=>date>now.date||(date===now.date&&timeMinutes(time)>now.minutes);

function removeRecord(r){
 if(!confirm(`Remove ${r.title} on ${fmt(r.date)} from your attendance? A removal entry stays in your backup.`))return;
 if(saveRecord({...r,deleted:true},'removed'))status('Attendance removed.',{action:()=>{const found=store.records.find(x=>x.id===r.id);if(found?.deleted&&saveRecord({...found,deleted:false},'restored'))status('Attendance restored.');}});
}
function markMeeting(m,date){
 if(phase!=='two')return;
 if(isFuture(date,m.time)){status('You can log this meeting after it starts.');return;}
 if(clubRecordAt(date,m.time)){status('This meeting is already in your record.');render();return;}
 const at=new Date().toISOString(),id=crypto.randomUUID();
 const r={id,date,time:m.time,title:m.title,kind:'club',location:CLUB,notes:'',counts:m.counts!==false,deleted:false,createdAt:at,updatedAt:at,changes:[]};
 if(saveRecord(r,'created'))status(m.counts===false?'Attendance saved. The house meeting doesn’t count toward your weekly goal.':'Attendance saved on this device.',{action:()=>{const saved=store.records.find(x=>x.id===id);if(saved&&!saved.deleted&&saveRecord({...saved,deleted:true},'removed'))status('Attendance undone.');}});
}

/* ---------- Phase ---------- */
function openPhase(){$('resident-phase').value=phase;$('phase-error').textContent='';$('phase-dialog').showModal();}
$('change-phase').onclick=openPhase;
$('settings-change-phase').onclick=openPhase;
$('cancel-phase').onclick=()=>$('phase-dialog').close();
$('phase-form').onsubmit=e=>{
 e.preventDefault();const next=$('resident-phase').value;
 if(!['one','two'].includes(next))return;
 try{localStorage.setItem(PHASE_KEY,next);}catch{$('phase-error').textContent='Could not save your phase on this device. Check browser storage and try again.';return;}
 phase=next;if(phase==='two')requestPersistence();
 $('entry-dialog').close();$('phase-dialog').close();clearStatus();setView('schedule');
};

/* ---------- Entry form ---------- */
function openEntry(r){
 if(phase!=='two')return;
 const now=dallasNow();
 $('entry-form').reset();
 $('entry-id').value=r?.id||'';
 $('entry-heading').textContent=r?'Edit attendance':'Log an outside meeting';
 $('entry-date').max=now.date;
 $('entry-date').value=r?.date||(selected>now.date?now.date:selected);
 $('entry-time').value=r?.time||'';
 $('entry-title').value=r?.title||'';
 $('entry-kind').value=r?meetingKind(r):'outside';
 $('entry-location').value=r?(meetingKind(r)==='outside'?place(r):r.location):'';
 $('entry-notes').value=r?.notes||'';
 $('entry-counts').checked=r?.counts??true;
 updateEntryKind();
 $('form-error').textContent='';
 $('entry-dialog').showModal();
}
function updateEntryKind(){
 const outside=$('entry-kind').value==='outside';
 $('location-label').textContent=outside?'Location / address (optional)':'Location';
 $('entry-location').required=!outside;
 if(!outside&&!$('entry-location').value.trim())$('entry-location').value=CLUB;
 if(outside&&$('entry-location').value===CLUB)$('entry-location').value='';
 $('entry-help').textContent=outside?`Enter the group, date, and start time. Outside meetings count toward your ${GOAL_WORD} for the week. Remember to sign out in the Club’s Meeting Tracker before you leave.`:'Log a Club meeting that is missing from the schedule, or edit an existing attendance record.';
 updateCounts();
}
function updateCounts(){
 const house=$('entry-kind').value==='club'&&HOUSE.test($('entry-title').value);
 $('entry-counts').disabled=house;if(house)$('entry-counts').checked=false;
 $('counts-hint').hidden=!house;
}
$('entry-kind').onchange=updateEntryKind;
$('entry-title').oninput=updateCounts;
$('cancel-entry').onclick=()=>$('entry-dialog').close();
$('entry-form').onsubmit=e=>{
 e.preventDefault();if(phase!=='two')return;
 const error=msg=>{$('form-error').textContent=msg;};
 const old=store.records.find(r=>r.id===$('entry-id').value);
 const date=$('entry-date').value,time=$('entry-time').value,kind=$('entry-kind').value;
 const title=$('entry-title').value.trim(),location=$('entry-location').value.trim();
 if(!title)return error('Enter a meeting name.');
 if(kind==='club'&&!location)return error('Enter a location.');
 if(!date||!time)return error('Enter a date and start time.');
 if(isFuture(date,time))return error('Future meetings cannot be marked attended.');
 const duplicate=active().find(r=>r.id!==old?.id&&r.date===date&&r.time===time&&((kind==='club'&&meetingKind(r)==='club')||r.title.trim().toLowerCase()===title.toLowerCase()));
 if(duplicate)return error(kind==='club'&&meetingKind(duplicate)==='club'?`Your record already has the ${timeLabel(time)} Club meeting on this date (“${duplicate.title}”). Edit that entry instead.`:'This meeting is already in your record.');
 const counts=$('entry-counts').checked&&!(kind==='club'&&HOUSE.test(title));
 const at=new Date().toISOString();
 const r={...(old||{id:crypto.randomUUID(),createdAt:at,changes:[]}),date,time,title,kind,location,notes:$('entry-notes').value.trim(),counts,deleted:false};
 if(saveRecord(r,old?'edited':'created')){$('entry-dialog').close();status(old?'Attendance updated. Change history kept.':'Attendance saved on this device.');}
};

/* ---------- Weekly summaries ---------- */
function weekStatus(week,counted,now=dallasNow()){
 const current=weekStart(now.date);
 if(week>current)return 'upcoming';
 if(counted>=GOAL)return 'met';
 return week===current?'current':'missed';
}
const STATUS_LABEL={met:'Goal met',missed:'Goal missed',current:'In progress',upcoming:'Not started'};
function weekSummaries(){
 const recs=active();if(!recs.length)return [];
 const first=weekStart(recs.reduce((min,r)=>r.date<min?r.date:min,recs[0].date));
 const out=[];
 for(let w=weekStart(dallasNow().date);w>=first&&out.length<520;w=shiftDate(w,-7)){
  const rs=recs.filter(r=>weekStart(r.date)===w),counted=rs.filter(countsToward).length;
  out.push({week:w,logged:rs.length,counted,status:weekStatus(w,counted),checkin:CHECKIN_LABEL(checkinFor(w))});
 }
 return out;
}

/* ---------- Rendering ---------- */
function ruleBadge(m){const rule=ruleFor(m,phase);return node('span',RULES[phase][rule].label,'rule');}
function rowClass(m){
 if(phase!=='two')return ' '+m.rule;
 return ruleFor(m,'two')==='common'?'':' mandatory';
}

function renderOverview(now,tracking){
 let next=meetingsFor(now.date).find(m=>timeMinutes(m.time)>now.minutes),nextDay=now.date;
 if(!next){nextDay=shiftDate(now.date,1);next=meetingsFor(nextDay)[0];}
 const wait=timeMinutes(next.time)-now.minutes+(nextDay===now.date?0:1440);
 const remaining=wait<60?`${wait} min`:`${Math.floor(wait/60)}h ${wait%60}m`;
 $('live-date').textContent=fmt(now.date,{month:'short',day:'numeric'});
 $('next-label').textContent=nextDay===now.date?'NEXT MEETING TODAY':`NEXT MEETING · TOMORROW, ${fmt(nextDay,{weekday:'long'}).toUpperCase()}`;
 $('next-title').textContent=next.title;
 $('next-detail').textContent=`${timeLabel(next.time)} · ${RULES[phase][ruleFor(next,phase)].label} · Starts in ${remaining}`;

 const ongoing=inProgressMeetings(now.date,now.minutes);
 $('in-progress').hidden=ongoing.length===0;
 keyed($('in-progress'),JSON.stringify([now.date,phase,ongoing.map(m=>m.time)]),()=>{
  if(!ongoing.length)return [];
  return [node('p',ongoing.length===1?'IN PROGRESS NOW':'MEETINGS IN PROGRESS','eyebrow'),...ongoing.flatMap(m=>[node('h2',m.title),node('p',`${timeLabel(m.time)} – ${timeLabel(endTime(m.time))} · ${RULES[phase][ruleFor(m,phase)].label}`,'progress-detail')])];
 });
 return {next,nextDay};
}

function renderWeek(now){
 const week=weekStart(view==='schedule'?selected:historyDate);
 const counted=active().filter(r=>countsToward(r)&&weekStart(r.date)===week),total=counted.length;
 const state=weekStatus(week,total,now);
 $('week-range').textContent=`${fmt(week,{month:'short',day:'numeric'})} – ${fmt(shiftDate(week,6),{month:'short',day:'numeric'})}`;
 $('weekly-total').textContent=total>GOAL?`${total} meetings attended`:`${total} of ${GOAL} meetings attended`;
 $('progress').max=GOAL;$('progress').value=Math.min(total,GOAL);
 $('weekly-message').textContent={
  met:week===weekStart(now.date)?'Weekly goal reached. Keep showing up.':`Goal met that week — ${total} counted meeting${total===1?'':'s'}.`,
  missed:`Goal missed that week — ${ofGoal(total)}.`,
  current:`${GOAL-total} more to reach your weekly goal.`,
  upcoming:'This week hasn’t started yet.'
 }[state];
 $('weekly-message').className=state==='missed'?'missed':'';
 const days=Array.from({length:7},(_,i)=>{const date=shiftDate(week,i);return {date,count:counted.filter(r=>r.date===date).length};});
 keyed($('week-days'),JSON.stringify([days,selected]),()=>days.map(({date,count})=>{
  const b=button('',()=>{selected=date;setView('schedule');},'week-day'+(date===selected?' selected':'')+(count?' has-count':''),'day-'+date);
  b.append(node('span',fmt(date,{weekday:'short'}),'wd'),node('span',String(Number(date.slice(-2))),'dn'),node('span',count?`✓${count}`:'·','ct'));
  b.setAttribute('aria-label',`${fmt(date)}: ${count} qualifying meeting${count===1?'':'s'}`);return b;
 }));
}

function renderSchedule(now,tracking,next,nextDay){
 setValue($('selected-date'),selected);
 $('day-heading').textContent=fmt(selected,{weekday:'long'});
 $('today').hidden=selected===now.date;
 const rows=meetingsFor(selected).map(m=>{
  const isToday=selected===now.date;
  const state=isFuture(selected,m.time,now)?'future':isToday&&isInProgress(m,now.minutes)?'live':'past';
  return {m,state,next:isToday&&nextDay===now.date&&next.time===m.time,r:tracking?clubRecordAt(selected,m.time):null};
 });
 $('count').textContent=`${rows.length} scheduled meetings`;
 const key=JSON.stringify([phase,selected,rows.map(({m,state,next,r})=>[m.time,m.title,state,next,r?.id,r?.updatedAt])]);
 keyed($('meetings'),key,()=>rows.map(({m,state,next,r})=>{
  const row=node('article',undefined,'meeting'+rowClass(m)+(r?' attended':''));
  const body=node('div',undefined,'meeting-body');
  body.append(node('h3',m.title),ruleBadge(m));
  if(m.note)body.append(node('p',m.note,'note'));
  if(r){
   if(r.title!==m.title)body.append(node('span',`Logged as “${r.title}”`,'attended-label'));
   body.append(node('span',countsToward(r)?'✓ Attended · counts toward goal':isHouseMeeting(r)?'✓ Attended · doesn’t count toward goal':'✓ Attended · not counted','attended-label'));
   body.append(button('Edit record',()=>openEntry(r),'text-button','edit-'+r.id));
  }else if(tracking){
   const b=button('Mark attended',()=>markMeeting(m,selected),'attend-button','mark-'+m.time);b.disabled=state==='future';body.append(b);
  }
  if(state==='live')body.append(node('span','IN PROGRESS','upcoming-label'));
  else if(next)body.append(node('span','UP NEXT','upcoming-label'));
  else if(tracking&&!r&&state==='future')body.append(node('p','Available after the meeting starts.','hint'));
  else if(!tracking&&selected===now.date&&state==='past')body.append(node('span','Started earlier','past'));
  row.append(node('div',timeLabel(m.time),'time'),body);
  return row;
 }));
}

function historyRecords(){
 const scope=$('history-scope').value,all=active().sort(byNewest);
 return scope==='week'?all.filter(r=>weekStart(r.date)===weekStart(historyDate)):all;
}
function recordCard(r){
 const item=node('article',undefined,'record');
 item.append(node('p',`${fmt(r.date,{weekday:'short',month:'short',day:'numeric',year:'numeric'})} · ${timeLabel(r.time)}`,'eyebrow'),node('h3',r.title),node('span',kindLabel(r),'meeting-kind'));
 const where=place(r);if(where&&!(meetingKind(r)==='club'&&where===CLUB))item.append(node('p',where));
 item.append(node('p',countsToward(r)?'Counts toward weekly goal':isHouseMeeting(r)?'House meeting · doesn’t count toward weekly goal':'Not counted toward weekly goal','hint'));
 if(r.notes)item.append(node('p',r.notes,'record-notes'));
 item.append(node('p',`Recorded ${dallasStamp(r.createdAt)} Dallas time`,'hint'));
 if(r.changes.length>1)item.append(node('p',`Last changed ${dallasStamp(r.updatedAt)} · ${r.changes.length-1} change(s)`,'hint'));
 const actions=node('div',undefined,'actions');
 actions.append(button('Edit',()=>openEntry(r),undefined,'edit-'+r.id),button('Remove',()=>removeRecord(r),undefined,'remove-'+r.id));
 item.append(actions);return item;
}
function renderHistory(now){
 const scope=$('history-scope').value;
 setValue($('history-date'),historyDate);
 $('history-date-label').hidden=scope!=='week';
 $('share-report').textContent=canShareFiles()?'Share with staff':'Download report';
 if(scope==='weeks'){
  const weeks=weekSummaries();
  $('history-summary').textContent=weeks.length?`${weeks.length} week${weeks.length===1?'':'s'} · ${weeks.filter(w=>w.status==='met').length} met · ${weeks.filter(w=>w.status==='missed').length} missed`:'';
  keyed($('history-list'),JSON.stringify(['weeks',weeks]),()=>weeks.length?weeks.map(w=>{
   const b=button('',()=>{historyDate=w.week;$('history-scope').value='week';render();},'week-card '+w.status,'week-'+w.week);
   b.append(node('span',weekLabel(w.week),'week-card-range'),node('span',`${w.counted>GOAL?`${w.counted} counted (goal ${GOAL})`:`${w.counted} of ${GOAL} counted`}${w.logged>w.counted?` · ${w.logged} logged`:''} · Check-in: ${w.checkin.toLowerCase()}`,'week-card-count'),node('span',STATUS_LABEL[w.status],'status-chip'));
   b.setAttribute('aria-label',`${weekLabel(w.week)}: ${ofGoal(w.counted)} counted, ${STATUS_LABEL[w.status]}. Show this week.`);
   return b;
  }):[node('p','No meetings logged yet. Weeks appear here once you log your first meeting.','empty')]);
  return;
 }
 const records=historyRecords();
 let summary=`${records.length} meeting${records.length===1?'':'s'} logged · ${records.filter(countsToward).length} counted toward goals`;
 if(scope==='week')summary+=` · ${STATUS_LABEL[weekStatus(weekStart(historyDate),records.filter(countsToward).length,now)]}`;
 $('history-summary').textContent=summary;
 keyed($('history-list'),JSON.stringify([scope,records.map(r=>r.id+r.updatedAt)]),()=>records.length?records.map(recordCard):[node('p','No meetings logged for this range. Check one off in the schedule or log an outside meeting.','empty')]);
}

function backupDue(){
 // Remind when something changed since the last backup and that backup (or, with none, the first entry) is over a week old.
 const changes=[...store.records.map(r=>Date.parse(r.updatedAt)),...Object.values(store.checkins||{}).map(c=>Date.parse(c.updatedAt))];
 if(!changes.length)return false;
 const last=store.lastBackup?Date.parse(store.lastBackup):0;
 if(!changes.some(t=>t>last))return false;
 const since=last||Math.min(...store.records.map(r=>Date.parse(r.createdAt)),...changes);
 return Date.now()-since>BACKUP_REMINDER_DAYS*864e5;
}

function render(){
 const tracking=phase==='two';
 const now=dallasNow();
 // If the app stays open (or is resumed) past midnight, move "today" views forward.
 if(now.date!==today){if(selected===today)selected=now.date;if(historyDate===today)historyDate=now.date;today=now.date;}

 $('phase-indicator').textContent=tracking?'Phase Two':'Phase One';
 $('overview-phase').textContent=tracking?'PHASE TWO':'PHASE ONE';
 for(const id of ['attendance-overview','record-tabs','outside-callout','attendance-tools','phase-two-key'])$(id).hidden=!tracking;
 $('phase-one-key').hidden=tracking;
 $('schedule-view').hidden=view!=='schedule';$('history-view').hidden=!tracking||view!=='history';
 $('intro-eyebrow').textContent=tracking?'YOUR RECOVERY, YOUR RECORD':'YOUR DAY, AT A GLANCE';
 const relative={[now.date]:'Today',[shiftDate(now.date,1)]:'Tomorrow',[shiftDate(now.date,-1)]:'Yesterday'}[selected];
 $('intro-title').textContent=tracking&&view==='history'?'Your record.':relative?`${relative}’s meetings.`:`Meetings for ${fmt(selected,{weekday:'long',month:'short',day:'numeric'})}.`;
 $('intro-subtitle').textContent=tracking?'Your schedule, with a personal record of showing up.':'A little clarity for the day ahead.';
 $('settings-phase-description').textContent=tracking?`Phase Two shows Phase Two requirements and adds personal attendance tracking with a ${GOAL_WORD}-meeting weekly goal.`:'Phase One shows the original schedule and attendance requirements.';
 for(const el of document.querySelectorAll('.goal-word'))el.textContent=GOAL_WORD;
 $('install-note').hidden=!(tracking&&isIOS&&!isStandalone());
 $('backup-reminder').hidden=!(tracking&&!blocked&&!reminderSnoozed&&backupDue());
 $('backup-reminder-text').textContent=store.lastBackup?`Your last backup was more than ${BACKUP_REMINDER_DAYS} days ago, and your records have changed since.`:'You haven’t backed up your records yet.';

 const {next,nextDay}=renderOverview(now,tracking);
 renderCheckin(now);
 if(tracking)renderWeek(now);
 renderSchedule(now,tracking,next,nextDay);
 if(tracking)renderHistory(now);

 $('backup-info').textContent=store.lastBackup?`Last backup: ${dallasStamp(store.lastBackup)} Dallas time. Keep the file somewhere safe.`:'No backup saved yet.';
 $('connection').classList.toggle('offline',!navigator.onLine);
 $('connection').textContent=navigator.onLine?(tracking?'Saved on device':'Daily schedule'):(tracking?'Offline · saved on device':'Offline');
}
function setView(next){
 if(phase!=='two')next='schedule';
 if(next!==view)clearStatus();
 view=next;
 for(const name of ['schedule','history']){if(name===next)$(name+'-tab').setAttribute('aria-current','page');else $(name+'-tab').removeAttribute('aria-current');}
 render();
}
$('schedule-tab').onclick=()=>setView('schedule');
$('history-tab').onclick=()=>setView('history');
$('prev').onclick=()=>{selected=shiftDate(selected,-1);render();};
$('next').onclick=()=>{selected=shiftDate(selected,1);render();};
$('today').onclick=()=>{selected=dallasNow().date;render();};
$('selected-date').onchange=e=>{if(e.target.value){selected=e.target.value;render();}};
$('history-date').onchange=e=>{if(e.target.value){historyDate=e.target.value;render();}};
$('history-scope').onchange=render;
$('add-meeting').onclick=()=>openEntry();

/* ---------- Files: share sheet on phones, download elsewhere ---------- */
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function canShareFiles(){try{return matchMedia('(pointer:coarse)').matches&&!!navigator.canShare?.({files:[new File(['x'],'x.txt',{type:'text/plain'})]});}catch{return false;}}
// Must be called directly from a tap so the share sheet is allowed to open.
async function deliver(content,name,type,{title,text}={}){
 if(canShareFiles()){
  const file=new File([content],name,{type});
  if(navigator.canShare({files:[file]})){
   try{await navigator.share(text?{files:[file],title,text}:{files:[file],title});return 'shared';}
   catch(err){if(err.name==='AbortError')return 'cancelled';}
  }
 }
 download(content,name,type);return 'downloaded';
}

/* ---------- Calendars ---------- */
// Each feed is a static .ics file next to the app, rebuilt by tools/build-calendar.mjs.
function wireCalendar({feedFile,subscribe,google,download:downloadButton,build,fileName,done,leadWithGoogle=true}){
 const feed=new URL('./'+feedFile,location.href);
 const webcal='webcal://'+feed.host+feed.pathname;
 $(subscribe).href=webcal;
 $(google).href='https://calendar.google.com/calendar/r?cid='+encodeURIComponent(webcal);
 // Android has no webcal handler; hide Subscribe there.
 if(/Android/i.test(navigator.userAgent)){$(subscribe).hidden=true;if(leadWithGoogle)$(google).classList.add('primary');}
 $(downloadButton).onclick=()=>{download(build(),fileName,'text/calendar;charset=utf-8');status(done);};
}
wireCalendar({feedFile:'phase-one-mandatory.ics',subscribe:'calendar-subscribe',google:'calendar-google',download:'calendar-download',build:phaseOneMandatoryCalendar,fileName:'phase-one-mandatory-meetings.ics',done:'Calendar file downloaded. Open it to add the meetings to your calendar.'});
wireCalendar({feedFile:'weekly-checkin.ics',subscribe:'checkin-cal-subscribe',google:'checkin-cal-google',download:'checkin-cal-download',build:weeklyCheckinCalendar,fileName:'weekly-check-in-reminder.ics',done:'Calendar file downloaded. Open it and choose Add All to get the Sunday reminder.',leadWithGoogle:false});

/* ---------- Weekly check-in ---------- */
const checkinFor=week=>store.checkins?.[week]||{sheet:null,addon:null};
const checkinDone=c=>!!(c.sheet&&c.addon);
const CHECKIN_LABEL=c=>checkinDone(c)?'Done':c.sheet||c.addon?'Partly done':'Not marked';
// Shown only when the schedule is on a Saturday or Sunday; it tracks the check-in for the week being viewed.
function renderCheckin(now){
 const weekday=dateFor(selected).getUTCDay(),card=$('checkin-card');
 card.hidden=!(weekday===0||weekday===6);
 if(card.hidden)return;
 const week=weekStart(selected),sunday=shiftDate(week,6),c=checkinFor(week),done=checkinDone(c);
 const past=sunday<now.date,soon=sunday===now.date||sunday===shiftDate(now.date,1);
 card.dataset.week=week;
 card.className='checkin'+(done?' done':(past||soon)?' due':'');
 $('checkin-sheet').checked=!!c.sheet;$('checkin-addon').checked=!!c.addon;
 const sun=fmt(sunday,{weekday:'short',month:'short',day:'numeric'}).toUpperCase();
 $('checkin-due').textContent=done?'✓ DONE':past?`WAS DUE ${sun}`:sunday===now.date?'DUE TODAY':sunday===shiftDate(now.date,1)?'DUE TOMORROW':`DUE ${sun}`;
 const range=`${fmt(week,{month:'short',day:'numeric'})} – ${fmt(sunday,{month:'short',day:'numeric'})}`;
 $('checkin-message').textContent=done?`Your check-in for ${range} is marked done.`
  :past?`The check-in for ${range} isn’t marked done. If you turned it in, check it off below.`
  :c.sheet?'Sheet turned in. Don’t forget to scan the QR code for the add-on check-in.'
  :c.addon?'Add-on check-in done. Don’t forget to turn in the sheet.'
  :`Turn in your completed check-in sheet by Sunday${sunday===now.date?' (today)':''}, and scan its QR code for the quick add-on check-in.`;
 $('checkin-link').hidden=!CHECKIN_FORM_URL||done;
 if(CHECKIN_FORM_URL)$('checkin-link').href=CHECKIN_FORM_URL;
}
function setCheckin(field,checked){
 const week=$('checkin-card').dataset.week,at=new Date().toISOString(),c=checkinFor(week);
 const next={...store,checkins:{...(store.checkins||{}),[week]:{sheet:c.sheet??null,addon:c.addon??null,[field]:checked?at:null,updatedAt:at}}};
 if(!persist(next)){render();return;}
 render();
 if(checkinDone(checkinFor(week)))status('Weekly check-in marked done.');
}
$('checkin-sheet').onchange=e=>setCheckin('sheet',e.target.checked);
$('checkin-addon').onchange=e=>setCheckin('addon',e.target.checked);

/* ---------- Backups ---------- */
async function backup(safety=false){
 if(blocked){let raw='';try{raw=localStorage.getItem(KEY)||'';}catch{}download(raw,`meeting-log-unreadable-${dallasNow().date}.txt`,'text/plain');return;}
 const at=new Date().toISOString();
 const content=JSON.stringify({...store,lastBackup:at},null,2);
 const name=`meeting-log-${safety?'before-import-':''}${dallasNow().date}.json`;
 // The safety copy runs after a file is read, when the share sheet is no longer allowed, so it always downloads.
 const result=safety?(download(content,name,'application/json'),'downloaded'):await deliver(content,name,'application/json',{title:'Meeting log backup'});
 if(result==='cancelled'){status('Backup not saved.');return;}
 persist({...store,lastBackup:at});reminderSnoozed=false;render();
 if(!safety)status(result==='shared'?'Backup ready. Save it somewhere safe, such as Files or iCloud Drive.':'Backup downloaded. Keep the file somewhere safe.');
}
$('backup').onclick=()=>backup();
$('reminder-backup').onclick=()=>backup();
$('reminder-later').onclick=()=>{reminderSnoozed=true;render();};
$('restore').onclick=()=>$('backup-file').click();
$('backup-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>25000000)throw Error('This backup is too large (maximum 25 MB).');
  const incoming=validateStore(JSON.parse(await file.text()));
  if(!confirm(`Merge ${incoming.records.length} backup records? Matching IDs keep the most recently changed version. A safety backup will download first.`))return;
  await backup(true);
  if(blocked){if(!confirm('Existing saved data is unreadable. A raw safety copy was downloaded. Replace it with this validated backup?'))return;blocked=false;}
  if(persist(mergeStores(store,incoming))){render();status('Backup merged successfully.');}
 }catch(err){status(`Import failed: ${err.message}`,{sticky:true});}
 finally{e.target.value='';}
};

/* ---------- Reports ---------- */
function report(){
 const scope=$('history-scope').value,now=dallasNow();
 if(scope==='weeks'){
  const weeks=weekSummaries();
  return {scope,slug:'weekly-summary',range:'Week-by-week summary (Monday–Sunday)',
   summary:`${weeks.length} weeks · ${weeks.filter(w=>w.status==='met').length} met · ${weeks.filter(w=>w.status==='missed').length} missed · goal ${GOAL} per week`,
   columns:['Week (Mon–Sun)','Counted meetings','Logged meetings','Status','Weekly check-in'],
   rows:weeks.map(w=>[weekLabel(w.week),ofGoal(w.counted),String(w.logged),STATUS_LABEL[w.status],w.checkin]),
   csv:[['Week starting','Week ending','Counted meetings','Logged meetings','Weekly goal','Status','Weekly check-in'],...weeks.map(w=>[w.week,shiftDate(w.week,6),w.counted,w.logged,GOAL,STATUS_LABEL[w.status],w.checkin])],
   lines:weeks.map(w=>`${weekLabel(w.week)}: ${ofGoal(w.counted)} · ${STATUS_LABEL[w.status]} · check-in ${w.checkin.toLowerCase()}`)};
 }
 const records=historyRecords(),counted=records.filter(countsToward).length,week=weekStart(historyDate);
 const chronological=[...records].reverse();
 return {scope,slug:scope==='all'?'all':`week-of-${week}`,
  range:scope==='all'?'All logged attendance':`Monday ${fmt(week)} – Sunday ${fmt(shiftDate(week,6))}`,
  summary:`${records.length} logged · ${counted} counted toward weekly goals`+(scope==='week'?` · ${ofGoal(counted)} · ${STATUS_LABEL[weekStatus(week,counted,now)]}`:''),
  columns:['Date / time','Meeting / location','Goal','Recorded / changed'],
  rows:chronological.map(r=>[`${fmt(r.date)} ${timeLabel(r.time)}`,[r.title,kindLabel(r),place(r),r.notes].filter(Boolean).join('\n'),countsToward(r)?'Counts':'Not counted',`Recorded: ${dallasStamp(r.createdAt)}\nChanged: ${dallasStamp(r.updatedAt)}`]),
  csv:[['Meeting date','Start time (Dallas)','Meeting','Location','Meeting type','Counts toward goal','Notes','Recorded at','Last changed at'],...chronological.map(r=>[r.date,r.time,r.title,place(r),kindLabel(r),countsToward(r)?'Yes':'No',r.notes,r.createdAt,r.updatedAt])],
  lines:chronological.map(r=>`${fmt(r.date,{weekday:'short',month:'short',day:'numeric'})} ${timeLabel(r.time)} — ${r.title} (${kindLabel(r)})${countsToward(r)?'':' · not counted'}`)};
}
function reportNode(rep){
 const area=document.createElement('div');
 area.append(node('h1','Personal meeting attendance record'),node('p','Dallas 24 Hour Club · Self-reported attendance · All meeting times in America/Chicago'),node('p',rep.range),node('p',rep.summary));
 const table=node('table'),head=node('tr');
 for(const h of rep.columns)head.append(node('th',h));
 table.append(head);
 for(const row of rep.rows){const tr=node('tr');for(const cell of row)tr.append(node('td',cell));table.append(tr);}
 area.append(table,node('p',`Generated ${dallasStamp(new Date().toISOString())} Dallas time. Entries are personally recorded and have not been independently verified.`));
 return area;
}
$('print-report').onclick=()=>{$('print-area').replaceChildren(...reportNode(report()).childNodes);window.print();};
$('export-csv').onclick=()=>{
 const rep=report();
 const quote=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 deliver('﻿'+rep.csv.map(row=>row.map(quote).join(',')).join('\r\n'),`meeting-attendance-${rep.slug}.csv`,'text/csv;charset=utf-8',{title:'Meeting attendance (CSV)'});
};
$('share-report').onclick=async()=>{
 const rep=report();
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meeting attendance · ${rep.range}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:14px}h1{font-size:22px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;text-align:left;padding:8px;vertical-align:top;white-space:pre-line}th{background:#eee}</style></head><body>${reportNode(rep).innerHTML}</body></html>`;
 const text=`Meeting attendance — ${rep.range}\n${rep.summary}\n\n${rep.lines.join('\n')}`;
 const result=await deliver(html,`meeting-attendance-${rep.slug}.html`,'text/html',{title:'Meeting attendance',text});
 if(result==='downloaded')status('Report downloaded. Open it to print or attach it to an email.');
};

/* ---------- Other tabs, timers, app updates ---------- */
window.addEventListener('storage',e=>{
 if(e.key===PHASE_KEY||e.key===null){phase=e.key===null?'one':e.newValue==='two'?'two':'one';$('entry-dialog').close();setView('schedule');}
 if(e.key===KEY||e.key===null){try{store=e.newValue?validateStore(JSON.parse(e.newValue)):emptyStore();blocked=false;render();status('Records refreshed from another tab.');}catch{blocked=true;status('Saved data changed but could not be read. Saving is paused.',{sticky:true});}}
});
window.addEventListener('online',render);window.addEventListener('offline',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();checkForUpdates();}});
setInterval(()=>{if(!$('entry-dialog').open&&!$('phase-dialog').open)render();},15000);
render();
if(phase==='two')requestPersistence();
if(blocked)status('Saved data could not be read. Saving is paused to protect it. Download a safety copy using Backups, then restore a valid backup.',{sticky:true});

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
if('serviceWorker' in navigator){
 const hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.register('./sw.js').then(async reg=>{
  swReg=reg;
  await navigator.serviceWorker.ready;
  $('offline-status').textContent='Offline access is ready on this device.';
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
