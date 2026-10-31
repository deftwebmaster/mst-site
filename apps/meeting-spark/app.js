const topics = [
['Progress, Not Perfection','daily','discussion','What does making progress actually look like when life is messy?','Where has perfectionism gotten in your way?','What small change are you proud of?','How do you respond when you fall short?'],
['The First Step','steps','reflection','What changed when you became willing to acknowledge powerlessness?','What did trying to control drinking look like?','What does unmanageability mean to you today?','How has acceptance changed your choices?'],
['Hope Before Certainty','steps','reflection','What helped you stay when you were not sure recovery could work?','Who gave you hope early on?','Can willingness come before belief?','What would you tell someone at their first meeting?'],
['Turning It Over','steps','practical','How do you practice letting go without giving up responsibility?','What are you still trying to control?','What action is yours to take today?','How do you recognize when you need help?'],
['Honest Self-Inventory','steps','reflection','What have you learned from looking at your own patterns?','What is the difference between guilt and accountability?','Which pattern surprised you?','How can you be thorough without being cruel to yourself?'],
['The Courage to Share','steps','reflection','What changes when we stop carrying our story alone?','What made it hard to be honest?','What did being heard mean to you?','Where does secrecy still show up?'],
['Becoming Ready','steps','reflection','What does willingness to change look like in practice?','Which habit are you most attached to?','Can you want change and fear it at the same time?','What helps you become more willing?'],
['Humility in Action','principles','practical','How is humility different from thinking less of yourself?','When is asking for help an act of strength?','Where do you confuse humility with shame?','What does a humble action look like today?'],
['The Amends List','steps','reflection','How do you face past harm without getting stuck in regret?','What makes someone difficult to put on a list?','How is willingness different from readiness?','Where is guidance important?'],
['Making Things Right','relationships','practical','What makes an amends meaningful beyond saying sorry?','How is an amends different from an apology?','Why does timing matter?','How do you respect another person’s boundaries?'],
['A Daily Course Correction','steps','practical','How can we recognize mistakes and address them promptly?','How do you notice resentment building?','What gets in the way of admitting a mistake?','What helps you correct course quickly?'],
['Quiet Time','steps','practical','How do prayer or meditation fit into your daily life?','What makes quiet time difficult?','When have you benefited from pausing?','What is one small routine you can keep?'],
['Carrying the Message','steps','discussion','What does being useful to another person look like?','What did someone do for you when you arrived?','Where is listening more helpful than advising?','How can service stay simple?'],
['One Day at a Time','daily','discussion','How does focusing on today change the way you face recovery?','What happens when you project too far ahead?','What is enough for today?','How do you get through a difficult hour?'],
['Dealing With Resentment','daily','practical','How do you spot a resentment before it takes over?','What story are you telling yourself?','What is within your control?','Who can you talk with about it?'],
['Fear and Faith','principles','reflection','What can you do even when fear is still present?','What fear has become smaller over time?','What is the difference between courage and certainty?','What next right action can you take?'],
['Asking for Help','daily','discussion','Why is reaching out sometimes harder than doing everything alone?','What stops you from making the call?','What has someone taught you by helping?','How can you make asking easier?'],
['The Value of Meetings','newcomer','discussion','What do you get from meetings besides information?','What was your first meeting like?','When has someone else’s share helped you?','How can you make someone new feel welcome?'],
['Sponsorship','newcomer','practical','What makes a sponsor relationship useful?','What qualities do you look for in guidance?','How do you stay teachable?','What questions were hard to ask?'],
['Honesty With Ourselves','principles','reflection','Where does recovery ask for a different kind of honesty?','What rationalization do you recognize now?','Why can the truth feel threatening?','What gets easier when you tell it?'],
['Patience With Change','principles','discussion','How do you keep going when growth feels slow?','Where do you want immediate results?','What change only became visible in hindsight?','How do you practice patience today?'],
['Gratitude Without Denial','growth','reflection','How can gratitude coexist with a difficult day?','What ordinary thing do you appreciate now?','How do you avoid using gratitude to dismiss pain?','Who deserves a thank-you?'],
['Living Life on Life’s Terms','daily','discussion','What does acceptance look like when a day does not go your way?','What situation are you resisting?','What changes when you stop arguing with reality?','What choice is available right now?'],
['The Next Right Thing','daily','practical','How do you choose a good next action when overwhelmed?','What can you do in the next ten minutes?','Who could help you decide?','When is doing less the right choice?'],
['Repairing Trust','relationships','reflection','How is trust rebuilt through behavior over time?','What expectations are realistic?','How do you handle another person’s hesitation?','What can you change without demanding a result?'],
['Boundaries and Kindness','relationships','practical','How can you be helpful without taking responsibility for everyone?','When has saying no been healthy?','What is the difference between support and rescuing?','Which boundary needs attention?'],
['Listening Instead of Fixing','relationships','discussion','What happens when you listen without preparing advice?','When did someone make you feel heard?','How do you know advice is welcome?','What gets in the way of listening?'],
['Service Without Recognition','principles','practical','How does doing small things for others affect your recovery?','What service goes unnoticed?','What are your motives when you help?','How can newcomers participate?'],
['Keeping an Open Mind','principles','reflection','What have you learned from someone with a different experience?','Which old belief have you reconsidered?','What helps you stay teachable?','How can disagreement be respectful?'],
['Dealing With Anger','daily','practical','What helps you pause before reacting?','How does anger show up in your body?','What might be underneath it?','How can you take responsibility without denying it?'],
['Isolation vs. Solitude','daily','discussion','How can you tell whether alone time is helping or hurting?','What signs tell you you are withdrawing?','What kind of connection recharges you?','How can you reach out today?'],
['A New Definition of Success','growth','reflection','How has your idea of a successful day changed?','What matters more now than it once did?','What quiet victories go unrecognized?','What are you building over time?'],
['Getting Through a Bad Day','newcomer','practical','What helps when your only goal is to stay sober today?','Who is on your call list?','What basic needs have you overlooked?','Which simple action has helped before?'],
['Acceptance and Action','principles','reflection','How can you accept a situation and still work to improve it?','Where is acceptance mistaken for approval?','What can you influence?','What must you release?'],
['Restitution Through Consistency','relationships','practical','How do repeated small actions become a living amends?','What promise can you reliably keep?','What happens when the other person does not respond?','How do you make progress without keeping score?'],
['Being New Again','newcomer','discussion','What advice would you give yourself on day one?','What helped you feel included?','Which AA phrase initially confused you?','What questions are safe to ask here?'],
['Recognizing Old Patterns','growth','reflection','How do old habits appear even when alcohol is gone?','What triggers a familiar reaction?','What can you do differently today?','Who can give you honest perspective?'],
['Letting Go of the Outcome','principles','reflection','What does doing your part without controlling results feel like?','What outcome are you gripping tightly?','What does trust look like in action?','How do you handle uncertainty?'],
['The Gift of Perspective','growth','discussion','What problem looks different to you now than it did a year ago?','How has time changed your perspective?','What helped shift your thinking?','How can you offer that perspective without preaching?'],
['When Motivation Fades','daily','practical','What carries you when you do not feel inspired?','Which routine matters most?','What helps you show up anyway?','How does action influence motivation?'],
['Connection Over Comparison','growth','discussion','What do we miss when we compare recoveries?','How can different stories still connect us?','What is uniquely useful about your experience?','How can you celebrate others without minimizing yourself?'],
['The Pause','principles','practical','What changes when you create a little space before responding?','What is your signal to pause?','What might a pause prevent?','How do you remember to use it?'],
['Willingness Today','growth','practical','What is one thing you are willing to try today?','What was the first suggestion you followed?','How much willingness is enough to begin?','Where has action come before belief?'],
['Keeping Commitments','relationships','practical','How does keeping your word affect self-respect and trust?','Which commitments are manageable?','What do you do when you cannot follow through?','How do you avoid overpromising?'],
['Celebrating Milestones','growth','discussion','How can milestones encourage us without becoming the whole goal?','Which milestone meant more than you expected?','How do you honor someone else’s progress?','What matters apart from a day count?'],
['Unity Comes First','traditions','discussion','How does the health of the group support each person’s recovery?','When has the group carried you through?','What helps a group stay together through disagreement?','How do you put the common good ahead of being right?'],
['Group Conscience','traditions','discussion','How does a group make decisions together without anyone being in charge?','What does a good group conscience feel like?','How do you speak up without trying to win?','What helps you accept a vote that went the other way?'],
['The Door Stays Open','traditions','reflection','What does it mean that anyone with a desire to stop drinking belongs here?','When did you first feel like you belonged?','Who might feel unwelcome, and why?','How can you help keep the door open?'],
['Every Group Its Own','traditions','discussion','How does a group stay free to find its own way while respecting AA as a whole?','What makes this group’s character its own?','When could one group’s choice affect others?','How do you balance freedom with responsibility?'],
['Our Primary Purpose','traditions','reflection','What does it mean for a group to keep its focus on the alcoholic who still suffers?','What pulls a meeting away from its purpose?','How does your share serve the newcomer?','What keeps the focus clear?'],
['Staying Free of Distractions','traditions','reflection','Why might backing outside causes pull a group away from its purpose?','What good causes could become distractions?','How do money, property or prestige change things?','Where do you keep your own life simple?'],
['Paying Our Own Way','traditions','practical','How does supporting ourselves, in money and in effort, shape a group?','What does self-support mean beyond the basket?','How do you contribute when you can’t give money?','Where in your life are you practicing self-support?'],
['One Alcoholic to Another','traditions','discussion','What happens between two alcoholics that no professional can provide?','When did someone’s experience reach you when advice could not?','How do we stay helpers rather than experts?','What is the value of simply having been there?'],
['Service Without Bosses','traditions','practical','How do trusted servants serve without governing?','What service positions have taught you something?','How do you hold a role loosely?','What makes rotation healthy for a group?'],
['Staying Out of Controversy','traditions','reflection','Why does keeping out of public debates protect the fellowship?','How do outside opinions show up in meetings?','What do you leave at the door when you walk in?','How can people who disagree still recover together?'],
['Living as an Example','traditions','discussion','How does a sober life speak louder than any pitch?','What first drew you toward recovery?','What is the difference between sharing and selling?','How do you protect anonymity in public, online and off?'],
['The Spirit of Anonymity','traditions','reflection','What does anonymity give us beyond privacy?','How does anonymity keep egos in check?','When have principles mattered more than personalities?','How do you treat what you hear in this room?']
].map((t,i)=>({id:i,title:t[0],category:t[1],style:t[2],description:t[3],prompts:t.slice(4)}));
// Topic ids 1–12 follow the Steps in order, and the Traditions topics walk through the Traditions.
let traditionNumber=0;topics.forEach(t=>{if(t.id>=1&&t.id<=12)t.number='Step '+t.id;else if(t.category==='traditions')t.number='Tradition '+(++traditionNumber)});
const categories={steps:{name:'The Twelve Steps',color:'#e8bc76'},traditions:{name:'The Twelve Traditions',color:'#a9b8ff'},principles:{name:'Spiritual principles',color:'#d9b3f0'},daily:{name:'Everyday recovery',color:'#8cc8f0'},relationships:{name:'Relationships & amends',color:'#f2a0a8'},newcomer:{name:'Newcomer-friendly',color:'#7fdcd0'},growth:{name:'Growth & reflection',color:'#b9dc8a'}};
const DAY=864e5,SKIP_DAYS=28;
const $=id=>document.getElementById(id);
const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let current=topics[0],recent=[],trail=[],showPrompts=load('meeting-spark-prompts',true)!==false,installPrompt=null,busy=false;
let favorites=load('meeting-spark-favorites',[]);if(!Array.isArray(favorites))favorites=[];favorites=favorites.filter(n=>Number.isInteger(n)&&topics[n]);
// Topic id -> timestamp of the last time a chair marked it used.
let used=load('meeting-spark-used',{});if(!used||typeof used!=='object'||Array.isArray(used))used={};for(const id in used)if(!topics[id]||typeof used[id]!=='number')delete used[id];
$('skipUsed').checked=load('meeting-spark-skip-used',true)!==false;

const daysAgo=ts=>Math.floor((startOfDay(Date.now())-startOfDay(ts))/DAY);
function startOfDay(ts){const d=new Date(ts);d.setHours(0,0,0,0);return d.getTime()}
function whenUsed(ts){const d=daysAgo(ts);return d<=0?'today':d===1?'yesterday':d<14?`${d} days ago`:new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'})}

function display(t){
  current=t;const cat=categories[t.category];
  document.body.style.setProperty('--cat',cat.color);
  $('categoryLabel').textContent=cat.name;
  $('cardNumber').textContent=t.number||'';$('cardNumber').hidden=!t.number;
  $('topicTitle').textContent=t.title;$('topicDescription').textContent=t.description;
  $('promptList').replaceChildren(...t.prompts.map(s=>{let li=document.createElement('li');li.textContent=s;return li}));
  const saved=favorites.includes(t.id),u=used[t.id],today=u&&daysAgo(u)<=0;
  $('favorite').textContent=saved?'★ Saved':'☆ Save';$('favorite').setAttribute('aria-pressed',String(saved));
  $('markUsed').textContent=today?'✓ Used today':'✓ Mark used';$('markUsed').setAttribute('aria-pressed',String(!!today));
  $('usedBadge').hidden=!u;if(u)$('usedBadge').textContent='Last used '+whenUsed(u);
}

function pick(){
  const cat=$('category').value,style=$('style').value;
  let matches=topics.filter(t=>(cat==='all'||t.category===cat)&&(style==='all'||t.style===style));
  if(!matches.length){matches=topics.filter(t=>cat==='all'||t.category===cat);$('style').value='all'}
  const cutoff=Date.now()-SKIP_DAYS*DAY;
  const fresh=$('skipUsed').checked?matches.filter(t=>!(used[t.id]>cutoff)):matches;
  const pool=fresh.some(t=>t.id!==current.id)?fresh:matches;
  let available=pool.filter(t=>!recent.includes(t.id)&&t.id!==current.id);
  if(!available.length)available=pool.filter(t=>t.id!==current.id);
  if(!available.length)available=pool;
  const t=available[Math.floor(Math.random()*available.length)];
  recent=[t.id,...recent].slice(0,Math.min(12,Math.floor(pool.length/2)));
  return t;
}

// Card motion: the current card flies off, the next one rises from the deck.
const card=$('card');
async function deal(t,dir,fromX=0){
  if(reduceMotion.matches||!card.animate){card.style.transform='';display(t);return}
  busy=true;
  try{
    const w=card.offsetWidth+120;
    await card.animate([{transform:`translateX(${fromX}px) rotate(${fromX/18}deg)`,opacity:1},{transform:`translateX(${-dir*w}px) rotate(${-dir*12}deg)`,opacity:0}],{duration:fromX?180:240,easing:'cubic-bezier(.5,0,.75,0)'}).finished;
    card.style.transform='';display(t);
    await card.animate([{transform:dir>0?'translateY(26px) scale(.94)':`translateX(${w*.6}px) rotate(8deg)`,opacity:0},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.2,.9,.25,1.08)'}).finished;
  }finally{busy=false}
}
function next(fromX){if(busy)return;trail=[...trail,current.id].slice(-50);deal(pick(),1,fromX)}
function previous(fromX){if(busy)return;if(!trail.length){snapBack(fromX);return}deal(topics[trail.pop()],-1,fromX)}
function snapBack(fromX){if(!fromX)return;const from=card.style.transform;card.style.transform='';card.animate?.([{transform:from},{transform:'none'}],{duration:320,easing:'cubic-bezier(.2,.9,.25,1.2)'})}

let drag=null;
card.addEventListener('pointerdown',e=>{if(busy||e.button>0)return;drag={x:e.clientX,y:e.clientY,dx:0,active:false,id:e.pointerId}});
card.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.active){
    if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){drag=null;return}
    if(Math.abs(dx)<10)return;
    drag.active=true;card.setPointerCapture(e.pointerId);card.classList.add('dragging');
  }
  drag.dx=dx;card.style.transform=`translateX(${dx}px) rotate(${dx/18}deg)`;
});
function endDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  const {dx,active}=drag;drag=null;card.classList.remove('dragging');
  if(!active)return;
  if(e.type==='pointerup'&&dx<-90)next(dx);
  else if(e.type==='pointerup'&&dx>90)previous(dx);
  else snapBack(dx);
}
card.addEventListener('pointerup',endDrag);card.addEventListener('pointercancel',endDrag);

function renderFavorites(){const list=$('favoritesList');list.replaceChildren();$('clearFavorites').hidden=!favorites.length;if(!favorites.length){let e=document.createElement('span');e.className='sub';e.textContent='Topics you save will show up here on this device.';list.append(e)}else favorites.forEach(id=>list.append(chip(topics[id],topics[id].title)))}
function renderUsed(){
  const list=$('usedList'),entries=Object.entries(used).sort((a,b)=>b[1]-a[1]).slice(0,12);
  list.replaceChildren();$('clearUsed').hidden=!entries.length;
  if(!entries.length){let e=document.createElement('span');e.className='sub';e.textContent='Tap “Mark used” on the topic you chair with. It will be skipped for four weeks so your group gets something fresh.';list.append(e);return}
  entries.forEach(([id,ts])=>{const b=chip(topics[id],topics[id].title);let s=document.createElement('small');s.textContent=whenUsed(ts);b.append(s);list.append(b)});
}
function chip(t,label){let b=document.createElement('button');b.type='button';b.textContent=label;b.style.setProperty('--chip',categories[t.category].color);b.onclick=()=>{if(t.id!==current.id){trail=[...trail,current.id].slice(-50);deal(t,1)}window.scrollTo({top:0,behavior:'smooth'})};return b}

$('generate').onclick=()=>next();
$('category').onchange=$('style').onchange=()=>next();
$('skipUsed').onchange=()=>store('meeting-spark-skip-used',$('skipUsed').checked);
$('favorite').onclick=()=>{if(favorites.includes(current.id))favorites=favorites.filter(x=>x!==current.id);else favorites.unshift(current.id);store('meeting-spark-favorites',favorites);display(current);renderFavorites()};
$('markUsed').onclick=()=>{if(used[current.id]&&daysAgo(used[current.id])<=0)delete used[current.id];else used[current.id]=Date.now();store('meeting-spark-used',used);display(current);renderUsed()};
$('clearFavorites').onclick=()=>{if(confirm('Remove all saved topics from this device?')){favorites=[];store('meeting-spark-favorites',favorites);display(current);renderFavorites()}};
$('clearUsed').onclick=()=>{if(confirm('Forget which topics you have used? They will all be back in rotation.')){used={};store('meeting-spark-used',used);display(current);renderUsed()}};
function renderPrompts(){$('promptSection').hidden=!showPrompts;$('togglePrompts').textContent=showPrompts?'Hide discussion prompts':'Show discussion prompts'}
$('togglePrompts').onclick=()=>{showPrompts=!showPrompts;store('meeting-spark-prompts',showPrompts);renderPrompts()};
const appUrl=location.protocol.startsWith('http')?location.origin+location.pathname:'';
function topicText(){return `${current.number?current.number+': ':''}${current.title}\n\n${current.description}${showPrompts?'\n\nDiscussion prompts:\n'+current.prompts.map((p,i)=>`${i+1}. ${p}`).join('\n'):''}\n\nFrom Meeting Spark${appUrl?' · '+appUrl:''}`}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(topicText());$('copy').textContent='✓ Copied';setTimeout(()=>$('copy').textContent='⧉ Copy',1500)}catch{window.prompt('Copy this topic:',topicText())}};
$('share').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'AA meeting topic: '+current.title,text:topicText()})}catch{}}else $('copy').click()};

// Share timer. Times off the wall clock so a backgrounded tab stays accurate.
let timer={total:0,end:0,left:0,running:false,done:false,tick:0},lastMinutes=load('meeting-spark-timer',3),audio=null;
if(![2,3,4,5].includes(lastMinutes))lastMinutes=3;
function unlockAudio(){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume?.()}catch{}}
function chime(){
  try{
    unlockAudio();const now=audio.currentTime;
    [[659.25,0],[987.77,.22]].forEach(([freq,delay])=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,now+delay);gain.gain.linearRampToValueAtTime(.22,now+delay+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+2.6);osc.connect(gain).connect(audio.destination);osc.start(now+delay);osc.stop(now+delay+2.7)});
  }catch{}
  navigator.vibrate?.([120,80,120]);
}
function startTimer(minutes){unlockAudio();lastMinutes=minutes;store('meeting-spark-timer',minutes);timer={...timer,total:minutes*6e4,end:Date.now()+minutes*6e4,running:true,done:false};runTimer();syncWakeLock()}
function runTimer(){clearInterval(timer.tick);timer.tick=setInterval(renderTimer,250);renderTimer()}
function stopTimer(){clearInterval(timer.tick);timer={total:0,end:0,left:0,running:false,done:false,tick:0};renderTimer();syncWakeLock()}
function renderTimer(){
  let left=timer.running?timer.end-Date.now():timer.left;
  if(timer.running&&left<=0){left=0;clearInterval(timer.tick);timer={...timer,running:false,left:0,done:true};chime();syncWakeLock()}
  const shown=timer.total?left:lastMinutes*6e4,s=Math.ceil(shown/1000);
  $('timerDisplay').textContent=timer.done?'Time':`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  $('timerBar').style.transform=`scaleX(${timer.total?1-left/timer.total:0})`;
  $('timer').dataset.state=timer.done?'done':!timer.total?'idle':!timer.running?'paused':left<=3e4?'warn':'running';
  $('timerHint').textContent=timer.done?'Tap to restart':!timer.total?'Tap to start':timer.running?'Tap to pause':'Paused · tap to resume';
  $('timerReset').hidden=!timer.total;
  document.querySelectorAll('.tpresets button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.min===lastMinutes)));
}
document.querySelectorAll('.tpresets button').forEach(b=>b.onclick=()=>startTimer(+b.dataset.min));
$('timerToggle').onclick=()=>{
  if(!timer.total||timer.done)startTimer(lastMinutes);
  else if(timer.running){clearInterval(timer.tick);timer={...timer,running:false,left:timer.end-Date.now()};renderTimer()}
  else{unlockAudio();timer={...timer,running:true,end:Date.now()+timer.left};runTimer()}
  syncWakeLock();
};
$('timerReset').onclick=stopTimer;

// Keep the screen on while presenting or timing a share. Browsers drop the lock when the page is hidden, so take it again on return.
let wakeLock=null,wakePending=false;
async function syncWakeLock(){
  const want=document.body.classList.contains('present')||timer.running;
  if(want&&!wakeLock&&!wakePending&&navigator.wakeLock&&document.visibilityState==='visible'){
    wakePending=true;
    try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}catch{}
    wakePending=false;
    if(!(document.body.classList.contains('present')||timer.running))syncWakeLock();
  }else if(!want&&wakeLock){const lock=wakeLock;wakeLock=null;lock.release().catch(()=>{})}
}
document.addEventListener('visibilitychange',syncWakeLock);

// Present mode. Leaving browser fullscreen (Esc, swipe down) also leaves present mode.
let wentFullscreen=false;
function setPresent(on){
  document.body.classList.toggle('present',on);$('presentBtn').textContent=on?'✕ Exit':'⛶ Present';
  if(on)document.documentElement.requestFullscreen?.().then(()=>wentFullscreen=true).catch(()=>{});
  else{wentFullscreen=false;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
  syncWakeLock();
}
$('presentBtn').onclick=()=>setPresent(!document.body.classList.contains('present'));
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&wentFullscreen)setPresent(false)});
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey||['SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(e.key==='Escape'&&document.body.classList.contains('present'))setPresent(false);
  else if(e.key==='ArrowRight'){e.preventDefault();next()}
  else if(e.key==='ArrowLeft'){e.preventDefault();previous()}
});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false});$('install').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true}};
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
display(current);renderPrompts();renderFavorites();renderUsed();renderTimer();
// Settle the first card's color before turning on color fades, so the page doesn't fade in from another color.
getComputedStyle(document.body).getPropertyValue('--cat');document.body.classList.add('ready');
