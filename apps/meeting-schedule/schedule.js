export const ZONE = 'America/Chicago';
export const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// Phase Two weekly attendance goal (Monday–Sunday). Change it here only.
export const WEEKLY_GOAL = 3;

// Every Club meeting lasts one hour.
export const MEETING_MINUTES = 60;

// Requirement labels, taken from the handout's legend.
// Phase One: mandatory (dark), conditional (medium), optional (white).
// Phase Two (from the Phase 2 Policies sheet): mandatory, onproperty (mandatory if on property),
// common (at the meeting, off property, or in your room or the Phase 2 common area).
export const RULES = {
 one: {
  mandatory: {label:'Mandatory', detail:'You must attend.'},
  conditional: {label:'Attend or be off property', detail:'If you stay on property, you must attend.'},
  optional: {label:'Optional', detail:'You can choose to attend.'}
 },
 two: {
  mandatory: {label:'Mandatory', detail:'You must attend.'},
  onproperty: {label:'Mandatory if on property', detail:'If you are on property, you must attend.'},
  common: {label:'Meeting, your room, or Phase 2 common area', detail:'During the meeting, be at the meeting, in your room, in the Phase 2 common area, or off property.'}
 }
};
export const ruleFor = (meeting, phase) => phase === 'two' ? meeting.phase2 : meeting.rule;

// rule = Phase One rule; phase2 = Phase Two rule; counts = counts toward the Phase Two weekly goal.
const m = (time, title, rule='optional', note='', extra={}) => ({time, title, rule, phase2:'common', counts:true, note, ...extra});
const morning = () => m('07:00','Prayer & Meditation');
const noon = () => m('12:00','Open Discussion','conditional');
const houseMeeting = () => m('21:15','Monday Night House Meeting','mandatory','Doesn’t count toward the Phase Two weekly goal.',{phase2:'mandatory', counts:false});

export const WEEK = [
 // Sunday
 [morning(),m('11:00','Open Discussion','conditional'),m('14:00','Open Al-Anon'),m('16:00','Big Book Study','conditional','The printed schedule marks this with ***; no explanation is provided.'),m('18:00','Big Book Study','mandatory')],
 // Monday
 [morning(),noon(),m('17:00','Big Book Study'),m('18:30','DAA Big Book Study','conditional'),m('20:00','Story Speaker','mandatory'),houseMeeting()],
 // Tuesday
 [morning(),noon(),m('17:00','Big Book Study'),m('18:30','Open Big Book Study','conditional'),m('20:00','DAA Speaker','mandatory')],
 // Wednesday
 [morning(),noon(),m('15:00','PL Big Book','optional','Printed as “**3 PM PL BIG BOOK.” The abbreviation and asterisks are not explained.'),m('17:00','Big Book Study'),m('18:30','Big Book Study','conditional'),m('20:00','Big Book Study','mandatory')],
 // Thursday
 [morning(),noon(),m('17:00','Opiates Anonymous'),m('18:30','Big Book Study','conditional'),m('20:00','Step Speaker','mandatory')],
 // Friday
 [morning(),noon(),m('17:00','AA Topic Meeting'),m('18:30','Big Book Study'),m('20:00','Bag of Hope','conditional'),m('22:00','Call Up Meeting','mandatory')],
 // Saturday
 [morning(),noon(),m('14:00','Big Book Study'),m('16:00','12 & 12 Book Study','optional','The printed schedule marks this with ***; no explanation is provided.'),m('18:00','NA Discussion'),m('20:00','Big Book Study / Speaker','conditional'),m('22:00','4D CA Big Book Topic','mandatory','The meeting name is faint on the scan. Confirm with staff.')]
];

export function dallasNow(now=new Date()) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,minutes:Number(parts.hour)*60+Number(parts.minute)};
}
export function dateFor(iso) {return new Date(`${iso}T12:00:00Z`);}
export function shiftDate(iso,n) {const d=dateFor(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
// Ross Ave. Group Birthday Night replaces the 8 PM meeting on the last Saturday of each month.
export const BIRTHDAY_NIGHT = {time:'20:00',title:'Ross Ave. Group Birthday Night',rule:'mandatory',phase2:'onproperty',note:'Last Saturday of the month.'};
export function isLastSaturday(iso) {const d=dateFor(iso);return d.getUTCDay()===6&&dateFor(shiftDate(iso,7)).getUTCMonth()!==d.getUTCMonth();}
export function meetingsFor(iso) {
 const list=WEEK[dateFor(iso).getUTCDay()].map(x=>({...x}));
 if(isLastSaturday(iso))Object.assign(list.find(x=>x.time===BIRTHDAY_NIGHT.time),BIRTHDAY_NIGHT);
 return list;
}
export function timeMinutes(time) {const [h,m]=time.split(':').map(Number);return h*60+m;}
export function timeLabel(time) {const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export function endTime(time) {const end=(timeMinutes(time)+MEETING_MINUTES)%1440;return `${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;}
export function isInProgress(meeting, minutes) {const start=timeMinutes(meeting.time);return minutes>=start&&minutes<start+MEETING_MINUTES;}
export function inProgressMeetings(iso, minutes) {return meetingsFor(iso).filter(m=>isInProgress(m,minutes));}

/* ---------- Phase One mandatory meetings as a calendar (.ics) ----------
   Used by the app's "Download calendar file" button and by tools/build-calendar.mjs,
   which writes phase-one-mandatory.ics for calendar subscriptions. */
const BYDAY=['SU','MO','TU','WE','TH','FR','SA'];
const icsText=s=>s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
function icsFold(line){
 // Lines may be at most 75 bytes; continuation lines start with a space.
 const enc=new TextEncoder(),parts=[];let cur='',bytes=0;
 for(const ch of line){const b=enc.encode(ch).length;if(bytes+b>(parts.length?74:75)){parts.push(cur);cur='';bytes=0;}cur+=ch;bytes+=b;}
 parts.push(cur);return parts.join('\r\n ');
}
const icsLocal=(iso,time)=>`${iso.replaceAll('-','')}T${time.replace(':','')}00`;
const icsUtc=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function icsEnd(iso,time){const total=timeMinutes(time)+MEETING_MINUTES;return icsLocal(shiftDate(iso,Math.floor(total/1440)),endTime(time));}
const firstOnOrAfter=(iso,test)=>{for(let i=0;i<400;i++){const d=shiftDate(iso,i);if(test(d))return d;}throw Error('No matching date');};

function icsHeader(name,description){
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Dallas 24 Hour Club//Daily Meetings//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
  'X-WR-CALNAME:'+icsText(name),'X-WR-CALDESC:'+icsText(description),'X-WR-TIMEZONE:'+ZONE,
  'REFRESH-INTERVAL;VALUE=DURATION:PT12H','X-PUBLISHED-TTL:PT12H',
  'BEGIN:VTIMEZONE','TZID:'+ZONE,
  'BEGIN:DAYLIGHT','TZOFFSETFROM:-0600','TZOFFSETTO:-0500','TZNAME:CDT','DTSTART:19700308T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','END:DAYLIGHT',
  'BEGIN:STANDARD','TZOFFSETFROM:-0500','TZOFFSETTO:-0600','TZNAME:CST','DTSTART:19701101T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','END:STANDARD',
  'END:VTIMEZONE'];
}
const icsFinish=lines=>[...lines,'END:VCALENDAR'].map(icsFold).join('\r\n')+'\r\n';

export function phaseOneMandatoryCalendar({start=dallasNow().date, stamp=new Date()}={}) {
 const lines=icsHeader('Phase One Mandatory Meetings','Mandatory Dallas 24 Hour Club meetings for Phase One residents.');
 const event=(uid,iso,m,rrule,description)=>lines.push('BEGIN:VEVENT',`UID:${uid}@daily-meetings.dallas24hourclub`,'DTSTAMP:'+icsUtc(stamp),
  `DTSTART;TZID=${ZONE}:${icsLocal(iso,m.time)}`,`DTEND;TZID=${ZONE}:${icsEnd(iso,m.time)}`,'RRULE:'+rrule,
  'SUMMARY:'+icsText(`${m.title} (Mandatory)`),'LOCATION:'+icsText('Dallas 24 Hour Club'),'DESCRIPTION:'+icsText(description),'TRANSP:OPAQUE',
  'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT30M','DESCRIPTION:'+icsText(`${m.title} starts in 30 minutes`),'END:VALARM','END:VEVENT');
 WEEK.forEach((day,weekday)=>{
  for(const m of day.filter(x=>x.rule==='mandatory')){
   const first=firstOnOrAfter(start,d=>dateFor(d).getUTCDay()===weekday);
   event(`phase1-${BYDAY[weekday].toLowerCase()}-${m.time.replace(':','')}`,first,m,`FREQ=WEEKLY;BYDAY=${BYDAY[weekday]}`,'Mandatory for Phase One residents.');
  }
 });
 event('phase1-birthday-night',firstOnOrAfter(start,isLastSaturday),BIRTHDAY_NIGHT,'FREQ=MONTHLY;BYDAY=-1SA','Last Saturday of the month. Mandatory for Phase One; Phase Two must attend if on property.');
 return icsFinish(lines);
}

/* ---------- Weekly check-in (due every Sunday, both phases) ---------- */
// If the QR code on the sheet points to a web form, put its address here to show an "Open the add-on check-in" button.
export const CHECKIN_FORM_URL = '';

// All-day event every Sunday, with reminders Saturday at 6 PM and Sunday at 9 AM.
export function weeklyCheckinCalendar({start=dallasNow().date, stamp=new Date()}={}) {
 const sunday=firstOnOrAfter(start,d=>dateFor(d).getUTCDay()===0);
 const day=iso=>iso.replaceAll('-','');
 const alarm=(trigger,text)=>['BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:'+trigger,'DESCRIPTION:'+icsText(text),'END:VALARM'];
 return icsFinish([...icsHeader('Weekly Check-In','Reminder to turn in the Dallas 24 Hour Club weekly check-in sheet every Sunday.'),
  'BEGIN:VEVENT','UID:weekly-checkin-sunday@daily-meetings.dallas24hourclub','DTSTAMP:'+icsUtc(stamp),
  'DTSTART;VALUE=DATE:'+day(sunday),'DTEND;VALUE=DATE:'+day(shiftDate(sunday,1)),'RRULE:FREQ=WEEKLY;BYDAY=SU',
  'SUMMARY:Turn in weekly check-in sheet','LOCATION:'+icsText('Dallas 24 Hour Club'),
  'DESCRIPTION:'+icsText('Turn in your completed weekly check-in sheet and scan its QR code for the add-on check-in. Mark both done in the Daily Meetings app.'),
  'TRANSP:TRANSPARENT',
  ...alarm('-PT6H','Weekly check-in sheet is due tomorrow'),
  ...alarm('PT9H','Turn in your weekly check-in sheet today'),
  'END:VEVENT']);
}
