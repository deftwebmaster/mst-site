export const ZONE = 'America/Chicago';
export const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// Phase Two weekly attendance goal (Monday–Sunday). Change it here only.
export const WEEKLY_GOAL = 3;

// Every Club meeting lasts one hour.
export const MEETING_MINUTES = 60;

// Requirement labels, taken from the handout's legend.
// Phase One: mandatory (dark), conditional (medium), optional (white).
// Phase Two: mandatory, onproperty (mandatory if on property), common (in the meeting, a common area, or off property).
export const RULES = {
 one: {
  mandatory: {label:'Mandatory', detail:'You must attend.'},
  conditional: {label:'Attend or be off property', detail:'If you stay on property, you must attend.'},
  optional: {label:'Optional', detail:'You can choose to attend.'}
 },
 two: {
  mandatory: {label:'Mandatory', detail:'You must attend.'},
  onproperty: {label:'Mandatory if on property', detail:'If you are on property, you must attend.'},
  common: {label:'Meeting, common area, or off property', detail:'During the meeting, be in the meeting, a common area, or off property.'}
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
export function meetingsFor(iso) {
 const d=dateFor(iso);const list=WEEK[d.getUTCDay()].map(x=>({...x}));
 if(d.getUTCDay()===6 && dateFor(shiftDate(iso,7)).getUTCMonth()!==d.getUTCMonth()) {
  const item=list.find(x=>x.time==='20:00');
  Object.assign(item,{title:'Ross Ave. Group Birthday Night',rule:'mandatory',phase2:'onproperty',note:'Last Saturday of the month.'});
 }
 return list;
}
export function timeMinutes(time) {const [h,m]=time.split(':').map(Number);return h*60+m;}
export function timeLabel(time) {const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export function endTime(time) {const end=(timeMinutes(time)+MEETING_MINUTES)%1440;return `${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;}
export function isInProgress(meeting, minutes) {const start=timeMinutes(meeting.time);return minutes>=start&&minutes<start+MEETING_MINUTES;}
export function inProgressMeetings(iso, minutes) {return meetingsFor(iso).filter(m=>isInProgress(m,minutes));}
