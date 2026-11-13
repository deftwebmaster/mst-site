export const KEY='d24-attendance-v1';
// checkins: { [Monday ISO date]: {sheet, addon, updatedAt} } — weekly check-in sheet and QR add-on, each a timestamp or null.
export function emptyStore(){return {version:1,records:[],lastBackup:null,checkins:{}};}
export function validateStore(data){
 if(!data||data.version!==1||!Array.isArray(data.records)||data.records.length>50000)throw Error('This is not a supported meeting-log backup.');
 const ids=new Set();
 const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const stamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 const validRecord=r=>r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<200&&isoDate(r.date)&&typeof r.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)&&typeof r.title==='string'&&r.title.trim().length>0&&r.title.length<=150&&typeof r.location==='string'&&(r.location.trim().length>0||r.kind==='outside')&&r.location.length<=200&&typeof r.notes==='string'&&r.notes.length<=2000&&typeof r.counts==='boolean'&&typeof r.deleted==='boolean'&&(r.kind===undefined||['outside','club'].includes(r.kind))&&stamp(r.createdAt)&&stamp(r.updatedAt);
 for(const r of data.records){if(!validRecord(r)||ids.has(r.id)||!Array.isArray(r.changes)||r.changes.length>10000||r.changes.some(c=>!c||!stamp(c.at)||!['created','edited','removed','restored'].includes(c.action)||!validRecord(c.snapshot)))throw Error('The backup contains invalid or duplicate records. Nothing was imported.');ids.add(r.id);}
 if(data.lastBackup!==null&&data.lastBackup!==undefined&&!stamp(data.lastBackup))throw Error('Invalid backup date.');
 const checkins=data.checkins??{};
 const optStamp=v=>v===null||stamp(v);
 if(typeof checkins!=='object'||Array.isArray(checkins)||Object.keys(checkins).length>5000||Object.entries(checkins).some(([week,c])=>!isoDate(week)||!c||!optStamp(c.sheet)||!optStamp(c.addon)||!stamp(c.updatedAt)))throw Error('The backup contains invalid weekly check-ins. Nothing was imported.');
 return {version:1,records:data.records,lastBackup:data.lastBackup||null,checkins};
}
export function mergeStores(current,incoming){
 const map=new Map(current.records.map(r=>[r.id,r]));
 for(const r of incoming.records){const old=map.get(r.id);if(!old||Date.parse(r.updatedAt)>Date.parse(old.updatedAt))map.set(r.id,r);}
 const checkins={...(current.checkins||{})};
 for(const [week,c] of Object.entries(incoming.checkins||{})){const old=checkins[week];if(!old||Date.parse(c.updatedAt)>Date.parse(old.updatedAt))checkins[week]=c;}
 return {...current,records:[...map.values()],checkins};
}
