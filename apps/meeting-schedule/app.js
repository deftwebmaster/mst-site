import {dallasNow,dateFor,shiftDate,meetingsFor,timeMinutes,timeLabel,ZONE,inProgressMeetings,DEFAULT_DURATION_MINUTES} from './schedule.js';
const $=id=>document.getElementById(id);
let actual=dallasNow(),selected=actual.date,followingToday=true;
const labels={optional:'Optional',conditional:'Attend or be off property',mandatory:'Mandatory'};
function render(){
 actual=dallasNow(); if(followingToday)selected=actual.date;
 const today=selected===actual.date;const list=meetingsFor(selected);
 const active=inProgressMeetings(actual.date,actual.minutes);
 const activeTimes=new Set(active.map(m=>m.time));
 const nextToday=meetingsFor(actual.date).find(m=>timeMinutes(m.time)>actual.minutes);
 const banner=$('in-progress');
 const bannerKey=JSON.stringify([actual.date,active]);
 banner.hidden=active.length===0;
 if(banner.dataset.key!==bannerKey){
  banner.dataset.key=bannerKey;banner.replaceChildren();
  if(active.length){
   const heading=document.createElement('p');heading.className='eyebrow';heading.textContent=active.length===1?'IN PROGRESS NOW':'MEETINGS IN PROGRESS';banner.append(heading);
   active.forEach(m=>{
    const title=document.createElement('h2');title.textContent=m.title;
    const detail=document.createElement('p');detail.className='progress-detail';
    const end=(timeMinutes(m.time)+(m.durationMinutes??DEFAULT_DURATION_MINUTES))%1440;
    const endTime=`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
    detail.textContent=`${timeLabel(m.time)} – ${timeLabel(endTime)} · ${labels[m.rule]}`;
    banner.append(title,detail);
   });
  }
 }
 $('live-date').textContent=dateFor(actual.date).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'});
 $('next-label').textContent=nextToday?'NEXT MEETING TODAY':'TODAY’S START TIMES HAVE PASSED';
 $('next-title').textContent=nextToday?nextToday.title:'One day at a time.';
 $('next-detail').textContent=nextToday?`${timeLabel(nextToday.time)} · ${labels[nextToday.rule]} · ${timeMinutes(nextToday.time)===actual.minutes?'Starts now':`Starts in ${timeMinutes(nextToday.time)-actual.minutes<60?`${timeMinutes(nextToday.time)-actual.minutes} min`:`${Math.floor((timeMinutes(nextToday.time)-actual.minutes)/60)}h ${(timeMinutes(nextToday.time)-actual.minutes)%60}m`}`}`:'Tomorrow’s schedule is ready when you are.';
 $('day-heading').textContent=dateFor(selected).toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'});
 $('date-label').textContent=(today?'Today · ':'')+dateFor(selected).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 $('count').textContent=`${list.length} meetings · Phase One`;$('today').hidden=today;
 const container=$('meetings');container.replaceChildren();
 list.forEach(m=>{const row=document.createElement('article');row.className=`meeting ${m.rule}`;
 const time=document.createElement('div');time.className='time';const [clock,period]=timeLabel(m.time).split(' ');time.textContent=clock;const sm=document.createElement('small');sm.textContent=period;time.append(sm);
 const body=document.createElement('div');body.className='meeting-body';const title=document.createElement('h3');title.textContent=m.title;const rule=document.createElement('span');rule.className='rule';rule.textContent=labels[m.rule];body.append(title,rule);
 if(today&&activeTimes.has(m.time)){const el=document.createElement('span');el.className='upcoming-label';el.textContent='IN PROGRESS';body.append(el);}
 if(today&&!activeTimes.has(m.time)&&timeMinutes(m.time)<actual.minutes){const el=document.createElement('span');el.className='past';el.textContent='Started earlier';body.append(el);}
 if(today&&nextToday?.time===m.time){const el=document.createElement('span');el.className='upcoming-label';el.textContent=timeMinutes(m.time)===actual.minutes?'STARTS NOW':'UP NEXT';body.append(el);}
 if(m.note){const el=document.createElement('p');el.className='note';el.textContent=m.note;body.append(el);}row.append(time,body);container.append(row);});
 $('clock').textContent=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(new Date());
 $('connection').textContent=navigator.onLine?'Daily schedule':'Offline';
}
$('prev').onclick=()=>{followingToday=false;selected=shiftDate(selected,-1);render();};
$('next').onclick=()=>{followingToday=false;selected=shiftDate(selected,1);render();};
$('today').onclick=()=>{followingToday=true;render();};
render();setInterval(render,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});window.addEventListener('online',render);window.addEventListener('offline',render);
let prompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;$('install').hidden=false;});$('install').onclick=async()=>{await prompt.prompt();prompt=null;$('install').hidden=true;};
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(async reg=>{await navigator.serviceWorker.ready;$('offline-status').textContent='Offline access is ready on this device.';const offer=()=>{$('update').hidden=false;$('update').onclick=()=>reg.waiting?.postMessage('SKIP_WAITING');};if(reg.waiting)offer();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{if(reg.waiting&&navigator.serviceWorker.controller)offer();}));}).catch(()=>{$('offline-status').textContent='Offline access is unavailable here. Use the hosted HTTPS address to enable it.';});let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;location.reload();}});}else{$('offline-status').textContent='This browser does not support offline access.';}
