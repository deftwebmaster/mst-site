export const ZONE = 'America/Chicago';
export const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const m = (time, title, rule='optional', note='') => ({time,title,rule,note});
const morning = () => m('07:00','Prayer & Meditation');
const noon = () => m('12:00','Open Discussion','conditional');
export const WEEK = [
 [morning(),m('11:00','Open Discussion','conditional'),m('14:00','Open Al-Anon'),m('16:00','Big Book Study','conditional','The printed schedule marks this with ***; no explanation is provided.'),m('18:00','Open Discussion','mandatory','The meeting name is faint on the scan. Confirm with staff.')],
 [morning(),noon(),m('17:00','Big Book Study'),m('18:30','DAA Big Book Study','conditional'),m('20:00','Story Speaker','mandatory'),m('21:15','Monday Night House Meeting','mandatory')],
 [morning(),noon(),m('17:00','Big Book Study'),m('18:30','Open Big Book Study','conditional'),m('20:00','DAA Speaker','mandatory')],
 [morning(),noon(),m('15:00','PL Big Book','optional','Printed as “**3 PM PL BIG BOOK.” The abbreviation and asterisks are not explained.'),m('17:00','Big Book Study'),m('18:30','Big Book Study','conditional'),m('20:00','Big Book Study','mandatory')],
 [morning(),noon(),m('17:00','Opiates Anonymous'),m('18:30','Big Book Study','conditional'),m('20:00','Speaker','mandatory','The prefix before “Speaker” is faint on the scan. Confirm the full name with staff.')],
 [morning(),noon(),m('17:00','AA Topic Meeting'),m('18:30','Big Book Study'),m('20:00','Bag of Hope','conditional'),m('22:00','Call Up Meeting','mandatory')],
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
  const item=list.find(x=>x.time==='20:00');Object.assign(item,{title:'Ross Ave. Group Birthday Night',rule:'mandatory',note:'Last Saturday of the month. Mandatory for Phase One; Phase Two must attend if on property.'});
 }
 return list;
}
export function timeMinutes(time) {const [h,m]=time.split(':').map(Number);return h*60+m;}
export function timeLabel(time) {const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}

// Meetings last one hour, confirmed by the resident. Individual entries may override the default.
export const DEFAULT_DURATION_MINUTES = 60;
export function inProgressMeetings(iso, minutes) {
 return meetingsFor(iso).filter(m => {
  const start = timeMinutes(m.time);
  return minutes >= start && minutes < start + (m.durationMinutes ?? DEFAULT_DURATION_MINUTES);
 });
}
