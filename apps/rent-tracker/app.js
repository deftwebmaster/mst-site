'use strict';

// Dates are civil dates, never local-midnight timestamps. Bound the supported
// range so corrupt input cannot create unbounded ledgers or Date overflow.
const DAY_MS = 86400000;
const pad = n => String(n).padStart(2, '0');
const toMs = s => Date.parse(`${s}T00:00:00Z`);
const fromMs = ms => new Date(ms).toISOString().slice(0, 10);
function isDate(s) {
  if (typeof s !== 'string' || !/^(19|20)\d{2}-\d{2}-\d{2}$/.test(s)) return false;
  const ms = toMs(s);
  return Number.isFinite(ms) && fromMs(ms) === s;
}
const addDays = (s, n) => fromMs(toMs(s) + n * DAY_MS);
const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
const weekday = s => new Date(toMs(s)).getUTCDay();
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function fmtDate(s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(toMs(s)).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}
const fmtShort = s => fmtDate(s, { month: 'short', day: 'numeric' });
const cents = dollars => Math.round(Number(dollars) * 100);
const MAX_AMOUNT = 1000000;
function validMoney(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0.01 && n <= MAX_AMOUNT && Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
}
function parseAmount(v) {
  const s = String(v).trim().replace(/^\$\s*/, '');
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s.replace(/,/g, ''));
  return validMoney(n) ? n : null;
}
function fmtMoney(c) {
  return (c < 0 ? '-' : '') + '$' + (Math.abs(c) / 100).toLocaleString('en-US', {
    minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2,
  });
}
const uid = () => crypto.randomUUID();
const STORAGE_KEY = 'rentTracker.v1'; // Retain the existing key for migration.
const SNAPSHOT_KEY = 'rentTracker.recovery.v2';
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const MAX_BACKUP_BYTES = 200 * 1024 * 1024;
function receiptMetadata(r) {
  if (r == null) return null;
  if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.id) ||
      typeof r.name !== 'string' || !r.name.trim() || r.name.length > 180 ||
      !['image/jpeg','image/png','image/webp','application/pdf'].includes(r.type) ||
      !Number.isInteger(r.size) || r.size < 1 || r.size > MAX_RECEIPT_BYTES) throw new Error('Invalid receipt attachment.');
  return {id:r.id,name:r.name,type:r.type,size:r.size};
}
const DEFAULT_STATE = {
  version: 3, moveIn: todayStr(), dueDay: weekday(todayStr()),
  phase1Rate: 98, phase2Rate: 133, phase2Start: null,
  rateChanges: [], arrangement: { date: null, note: '' }, lastBackup: null,
  charges: [], payments: [],
};
function emptyLedger(moveIn=todayStr()) {
  return {...structuredClone(DEFAULT_STATE),moveIn,dueDay:weekday(moveIn),charges:[],payments:[]};
}
function createLedger(values) {
  const moveIn=values.moveIn;
  if(!isDate(moveIn)||moveIn>todayStr())throw new Error('Choose a real move-in date on or before today.');
  const phase1Rate=parseAmount(values.rate1),phase2Rate=parseAmount(values.rate2);
  if(!phase1Rate||!phase2Rate)throw new Error('Enter positive weekly rates, with at most two decimals.');
  const optional=(value,label)=>{
    const text=String(value||'').trim();
    if(!text||/^0(?:\.0{1,2})?$/.test(text))return 0;
    const amount=parseAmount(text);if(!amount)throw new Error(`Enter a valid ${label}, or leave it blank.`);return amount;
  };
  const fee=optional(values.fee,'move-in fee'),paid=optional(values.paid,'initial payment');
  const paidDate=values.paidDate||moveIn;
  if(paid&&(!isDate(paidDate)||paidDate<moveIn||paidDate>todayStr()))throw new Error('The payment date must be between move-in and today.');
  const next={...emptyLedger(moveIn),phase1Rate,phase2Rate,dueDay:Number(values.dueDay)};
  if(fee)next.charges.push({id:uid(),date:moveIn,amount:fee,label:'Move-in fee'});
  if(paid)next.payments.push({id:uid(),date:paidDate,amount:paid,note:'Initial payment',receipt:null});
  return normalizeState(next);
}

// Reject an entire invalid ledger; never silently remove financial records.
function normalizeState(s) {
  const fail = message => { throw new Error(message); };
  if (!s || typeof s !== 'object' || Array.isArray(s)) fail('Not a Rent Tracker ledger.');
  if (![1,2,3].includes(s.version)) fail('Unsupported backup version.');
  if (!isDate(s.moveIn)) fail('Move-in date must be a real date from 1900 through 2099.');
  if (!validMoney(s.phase1Rate) || !validMoney(s.phase2Rate)) fail('Weekly rates must be positive dollar amounts with at most two decimals (maximum $1,000,000).');
  if (s.phase2Start !== null && s.phase2Start !== undefined && !isDate(s.phase2Start)) fail('Invalid Phase 2 date.');
  if (s.phase2Start && s.phase2Start < s.moveIn) fail('Phase 2 cannot start before move-in.');
  const ids = new Set();
  const receiptIDs = new Map();
  function records(list, type) {
    if (!Array.isArray(list) || list.length > 10000) fail(`Invalid ${type} list (maximum 10,000 records).`);
    return list.map((r, i) => {
      const where = `${type} record ${i + 1}`;
      if (!r || typeof r !== 'object') fail(`Invalid ${where}.`);
      if (typeof r.id !== 'string' || !r.id || r.id.length > 100 || ids.has(r.id)) fail(`Missing or duplicate ID in ${where}.`);
      ids.add(r.id);
      if (!isDate(r.date) || r.date < s.moveIn) fail(`Invalid date in ${where}; it must be on or after move-in.`);
      if (type === 'Payment' && r.date > todayStr()) fail(`Future payment in ${where}. Use the payday planner for payments not yet made.`);
      if (!validMoney(r.amount)) fail(`Invalid amount in ${where}.`);
      const key = type === 'Payment' ? 'note' : 'label';
      const value = r[key] ?? (key === 'note' ? '' : 'Charge');
      if (typeof value !== 'string' || value.length > 500 || (key === 'label' && !value.trim())) fail(`Invalid ${key} in ${where}.`);
      const receipt = type === 'Payment' ? receiptMetadata(r.receipt) : null;
      if(receipt) {
        if(receiptIDs.has(receipt.id)&&receiptIDs.get(receipt.id)!==JSON.stringify(receipt))fail('Conflicting receipt metadata.');
        receiptIDs.set(receipt.id,JSON.stringify(receipt));
      }
      return { id: r.id, date: r.date, amount: r.amount, [key]: value.trim(), ...(type === 'Payment' ? {receipt} : {}) };
    });
  }
  const dueDay = s.version === 1 ? weekday(s.moveIn) : s.dueDay;
  if (!Number.isInteger(dueDay) || dueDay < 0 || dueDay > 6) fail('Invalid weekly due day.');
  const changes = s.version === 1 ? [] : s.rateChanges;
  if (!Array.isArray(changes) || changes.length > 500) fail('Invalid rate history.');
  const keys = new Set();
  const rateChanges = changes.map((r, i) => {
    if (!r || ![1, 2].includes(r.phase) || !isDate(r.date) || r.date < s.moveIn || !validMoney(r.amount)) fail(`Invalid rate change ${i + 1}.`);
    const key = `${r.phase}:${r.date}`;
    if (keys.has(key)) fail('Two rate changes have the same phase and effective date.');
    keys.add(key);
    return { phase: r.phase, date: r.date, amount: r.amount };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.phase - b.phase);
  const a = s.version === 1 ? { date: null, note: '' } : s.arrangement;
  if (!a || (a.date !== null && !isDate(a.date)) || typeof a.note !== 'string' || a.note.length > 500) fail('Invalid payment arrangement.');
  const lastBackup = s.version === 1 ? null : s.lastBackup;
  if (lastBackup !== null && !isDate(lastBackup)) fail('Invalid last backup date.');
  return {
    version: 3, moveIn: s.moveIn, dueDay,
    phase1Rate: s.phase1Rate, phase2Rate: s.phase2Rate, phase2Start: s.phase2Start || null,
    rateChanges, arrangement: { date: a.date, note: a.note.trim() }, lastBackup,
    charges: records(s.charges ?? (s.version === 1 ? [] : null), 'Charge'),
    payments: records(s.payments, 'Payment'),
  };
}

let storedRaw = null;
let recoveryRaw = null;
let storageError = '';
let externalChange = false;
let needsSetup = false;
function loadState() {
  try {
    storedRaw = localStorage.getItem(STORAGE_KEY);
    needsSetup=storedRaw===null;
    return needsSetup ? emptyLedger() : normalizeState(JSON.parse(storedRaw));
  } catch (e) {
    recoveryRaw = storedRaw;
    storageError = `Saved data could not be opened. ${e.message}`;
    return null;
  }
}
let state = loadState();

// Write the recovery snapshot before the ledger. Failed writes leave both the
// displayed state and the original ledger intact. Check for stale tabs first.
function saveState(next, { snapshot = true, expectedRaw = storedRaw } = {}) {
  if (!next) return false;
  try {
    const validated = normalizeState(next);
    if (storedRaw !== expectedRaw || localStorage.getItem(STORAGE_KEY) !== storedRaw) {
      externalChange = true;
      throw new Error('Data changed in another tab. Reload the latest data before saving.');
    }
    if (snapshot) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
      savedAt: new Date().toISOString(), raw: storedRaw ?? JSON.stringify(state || emptyLedger()),
    }));
    const raw = JSON.stringify(validated);
    localStorage.setItem(STORAGE_KEY, raw);
    storedRaw = raw;
    state = validated;
    needsSetup = false;
    recoveryRaw = null;
    storageError = '';
    return true;
  } catch (e) {
    storageError = `Not saved. ${e.message} Export a backup before closing.`;
    announce(storageError);
    return false;
  }
}

// ---------- Rent and ledger math ----------
function rateOn(date, phase) {
  let amount = phase === 1 ? state.phase1Rate : state.phase2Rate;
  for (const r of state.rateChanges) if (r.phase === phase && r.date <= date) amount = r.amount;
  return cents(amount);
}
function nextWeeklyDate(start) {
  return addDays(start, (state.dueDay - weekday(start) + 7) % 7 || 7);
}
// Sum daily fractions, then round once per period, including rate/phase changes.
function weekRent(start, end = nextWeeklyDate(start)) {
  let total = 0;
  const phases = new Set();
  for (let d = start; d < end; d = addDays(d, 1)) {
    const phase = state.phase2Start && d >= state.phase2Start ? 2 : 1;
    phases.add(phase);
    total += rateOn(d, phase);
  }
  return { amount: Math.round(total / 7), phase: phases.size > 1 ? 'split' : String([...phases][0]), end, days: daysBetween(start, end) };
}
const obligationSort = (a, b) => a.date.localeCompare(b.date) || (a.kind === 'charge' ? 0 : 1) - (b.kind === 'charge' ? 0 : 1) || String(a.id || '').localeCompare(String(b.id || ''));
function compute(today = todayStr()) {
  if (!isDate(today)) throw new Error('Invalid calculation date.');
  const weeks = [];
  let start = state.moveIn;
  while (start <= today) {
    const end = nextWeeklyDate(start);
    weeks.push({ kind: 'week', date: start, ...weekRent(start, end) });
    start = end;
  }
  const nextDue = start;
  const charges = state.charges.filter(c => c.date <= today)
    .map(c => ({ kind: 'charge', date: c.date, amount: cents(c.amount), label: c.label, id: c.id }));
  const obligations = [...charges, ...weeks].sort(obligationSort);
  const payments = state.payments.filter(p => p.date <= today).sort((a,b)=>a.date.localeCompare(b.date));
  const totalPaid = payments.reduce((sum, p) => sum + cents(p.amount), 0);
  const totalOwed = obligations.reduce((sum, o) => sum + o.amount, 0);
  let pool = totalPaid;
  let paymentIndex = 0;
  let paymentRemaining = payments.length ? cents(payments[0].amount) : 0;
  const apply = o => {
    o.applied = Math.min(pool, o.amount);
    pool -= o.applied;
    o.allocations = [];
    let remaining = o.applied;
    while (remaining > 0 && paymentIndex < payments.length) {
      const amount = Math.min(remaining, paymentRemaining);
      if (amount) o.allocations.push({paymentId:payments[paymentIndex].id,amount});
      remaining -= amount; paymentRemaining -= amount;
      if (!paymentRemaining) {
        paymentIndex++;
        paymentRemaining = paymentIndex < payments.length ? cents(payments[paymentIndex].amount) : 0;
      }
    }
    o.status = o.applied === o.amount ? 'paid' : o.applied ? 'partial' : o.upcoming ? 'upcoming' : 'unpaid';
  };
  obligations.forEach(apply);
  // Include known future charges when estimating prepaid coverage.
  const upcoming = [];
  const futureCharges = state.charges.filter(c => c.date > today).map(c => ({...c, kind: 'charge', amount: cents(c.amount), upcoming: true})).sort(obligationSort);
  let chargeIndex = 0;
  do {
    const end = nextWeeklyDate(start);
    while (chargeIndex < futureCharges.length && futureCharges[chargeIndex].date <= start) apply(futureCharges[chargeIndex++]);
    const w = { kind: 'week', date: start, ...weekRent(start, end), upcoming: true };
    apply(w);
    upcoming.push(w);
    start = end;
  } while ((pool > 0 || upcoming[upcoming.length - 1].status === 'paid') && upcoming.length < 520 && start < '2100-01-01');
  let coveredThrough = null;
  for (const w of [...weeks, ...upcoming]) {
    if (w.status !== 'paid') break;
    coveredThrough = addDays(w.end, -1);
  }
  return { today, weeks, upcoming, charges, obligations, totalPaid, totalOwed,
    balance: totalPaid - totalOwed, nextDue, nextRent: upcoming[0].amount, coveredThrough,
    phaseNow: state.phase2Start && state.phase2Start <= today ? 2 : 1 };
}
function ledgerRows(asOf = todayStr()) {
  const c = compute(asOf);
  const entries = c.obligations.map(o => ({date:o.date, description:o.kind === 'week' ? `Rent ${o.date} to ${addDays(o.end, -1)}` : o.label, charge:o.amount, payment:0}));
  entries.push(...state.payments.filter(p => p.date <= asOf).map(p => ({date:p.date, description:p.note || 'Payment', charge:0, payment:cents(p.amount)})));
  entries.sort((a,b) => a.date.localeCompare(b.date) || (a.payment > 0) - (b.payment > 0));
  let balance = 0;
  return entries.map(r => ({...r, balance: balance += r.charge - r.payment}));
}
function csvLedger(asOf = todayStr()) {
  const cell = v => `"${String(v).replace(/"/g, '""')}"`;
  // Prefix user text that spreadsheet programs might interpret as a formula.
  const safeText = v => /^[=+\-@\t\r\n]/.test(v) ? `'${v}` : v;
  return [['Date','Description','Charge USD','Payment USD','Outstanding USD'],
    ...ledgerRows(asOf).map(r => [r.date,safeText(r.description),(r.charge/100).toFixed(2),(r.payment/100).toFixed(2),(r.balance/100).toFixed(2)])]
    .map(r => r.map(cell).join(',')).join('\r\n');
}

// Receipts live as blobs in IndexedDB, outside the small localStorage ledger.
// Files are immutable: new uploads/imports get new IDs, preserving snapshots.
let receiptDatabase;
function openReceiptDatabase() {
  if (receiptDatabase) return receiptDatabase;
  receiptDatabase = new Promise((resolve,reject)=>{
    if (!globalThis.indexedDB) { reject(new Error('Receipt storage is unavailable in this browser.')); return; }
    const request = indexedDB.open('rentTracker.receipts.v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});
    request.onerror=()=>reject(request.error || new Error('Could not open receipt storage.'));
    request.onblocked=()=>reject(new Error('Close other Rent Tracker tabs, then try attaching the receipt again.'));
    request.onsuccess=()=>{
      const db=request.result;
      db.onversionchange=()=>{db.close();receiptDatabase=null;};
      resolve(db);
    };
  }).catch(e=>{receiptDatabase=null;throw e;});
  return receiptDatabase;
}
async function receiptFile(id) {
  const db=await openReceiptDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readonly'),request=tx.objectStore('files').get(id);
    request.onsuccess=()=>resolve(request.result?.blob || null);
    request.onerror=()=>reject(request.error);
    tx.onabort=()=>reject(tx.error || new Error('Receipt read failed.'));
  });
}
async function storeReceiptFiles(files) {
  if (!files.length) return;
  const db=await openReceiptDatabase();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readwrite');
    for (const f of files) tx.objectStore('files').add({...f,createdAt:Date.now()});
    tx.oncomplete=resolve;
    tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Could not save the receipt. Device storage may be full.'));
  });
}
async function assertReceiptBytes(blob,type) {
  const b=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  const text=String.fromCharCode(...b);
  const valid=type==='application/pdf' ? text.startsWith('%PDF-') :
    type==='image/jpeg' ? b[0]===255&&b[1]===216&&b[2]===255 :
    type==='image/png' ? b[0]===137&&text.slice(1,4)==='PNG' :
    type==='image/webp' ? text.startsWith('RIFF')&&text.slice(8,12)==='WEBP' : false;
  if (!valid) throw new Error('The receipt contents do not match its file type.');
}
async function prepareReceipt(file) {
  if (!file?.size || file.size > MAX_RECEIPT_BYTES) throw new Error('Choose a photo or PDF up to 10 MB.');
  let blob, name;
  if (file.type==='application/pdf' || /\.pdf$/i.test(file.name)) {
    await assertReceiptBytes(file,'application/pdf');
    blob=new Blob([file],{type:'application/pdf'}); name=file.name || 'Receipt.pdf';
  } else {
    if (!file.type.startsWith('image/') || file.type==='image/svg+xml') throw new Error('Choose a photo or PDF, not another file type.');
    const url=URL.createObjectURL(file);
    try {
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('This photo format could not be read. Try a JPEG or PNG.'));img.src=url;});
      const scale=Math.min(1,2000/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const context=canvas.getContext('2d');
      if(!context)throw new Error('Photo processing is unavailable. Try a PDF instead.');
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
      blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
      if(!blob)throw new Error('Could not prepare this photo. Try a smaller image.');
      name=(file.name.replace(/\.[^.]+$/,'') || 'Receipt')+'.jpg';
    } finally { URL.revokeObjectURL(url); }
  }
  const metadata=receiptMetadata({id:uid(),name:name.slice(-180),type:blob.type,size:blob.size});
  return {...metadata,blob};
}
function receiptReferences(ledger) {
  return [...new Map(ledger.payments.filter(p=>p.receipt).map(p=>[p.receipt.id,p.receipt])).values()];
}
async function makeBackup(ledger) {
  const attachments=[];
  let total=JSON.stringify(ledger).length;
  for(const r of receiptReferences(ledger)) {
    const blob=await receiptFile(r.id);
    if(!blob || blob.size!==r.size || blob.type!==r.type)throw new Error(`Receipt "${r.name}" is missing. Restore it from a backup or replace/remove it on the payment before exporting.`);
    total+=Math.ceil(blob.size/3)*4;
    if(total>MAX_BACKUP_BYTES-1024*1024)throw new Error('The backup exceeds 200 MB. Download and archive older receipts separately before removing their attachments.');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Could not read a receipt for backup.'));reader.readAsDataURL(blob);});
    attachments.push({...r,data});
  }
  return {app:'rent-tracker',exportedAt:new Date().toISOString(),data:ledger,attachments};
}
async function decodeBackupReceipts(parsed,ledger) {
  const references=receiptReferences(ledger),list=parsed.attachments ?? [];
  if(!Array.isArray(list) || list.length!==references.length)throw new Error('The backup must contain every attached receipt exactly once.');
  const files=[],seen=new Set();
  for(const item of list) {
    const r=receiptMetadata(item),reference=references.find(x=>x.id===r?.id);
    if(!r||!reference||seen.has(r.id)||JSON.stringify(reference)!==JSON.stringify(r))throw new Error('Receipt metadata does not match the payment.');
    seen.add(r.id);
    if(typeof item.data!=='string'||item.data.length!==4*Math.ceil(r.size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(item.data))throw new Error('Invalid receipt data in backup.');
    let bytes;
    try{bytes=Uint8Array.from(atob(item.data),c=>c.charCodeAt(0));}catch{throw new Error('Unreadable receipt data in backup.');}
    if(bytes.length!==r.size)throw new Error('Receipt size does not match the backup.');
    const blob=new Blob([bytes],{type:r.type});await assertReceiptBytes(blob,r.type);
    const replacement={...r,id:uid()};
    for(const p of ledger.payments)if(p.receipt?.id===r.id)p.receipt={...replacement};
    files.push({...replacement,blob});
  }
  return files;
}

// A small image-backed PDF writer keeps printing independent of window.print.
// Pages use the browser's fonts, preserving names/notes with Unicode characters.
function makeImagePDF(pages) {
  if(!pages.length)throw new Error('No ledger pages were generated.');
  const parts=[],offsets=[0],encoder=new TextEncoder();let position=0;
  const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);position+=bytes.byteLength;};
  const object=(id,body)=>{offsets[id]=position;append(`${id} 0 obj\n`);append(body);append('\nendobj\n');};
  append('%PDF-1.4\n');append(new Uint8Array([37,226,227,207,211,10]));
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((p,i)=>{
    const page=3+i*3,content=page+1,image=page+2;
    object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /PageImage ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    const stream='q\n612 0 0 792 0 0 cm\n/PageImage Do\nQ\n';
    object(content,`<< /Length ${encoder.encode(stream).byteLength} >>\nstream\n${stream}endstream`);
    offsets[image]=position;
    append(`${image} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.byteLength} >>\nstream\n`);
    append(p.bytes);append('\nendstream\nendobj\n');
  });
  const xref=position;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(let i=1;i<offsets.length;i++)append(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}

// ---------- Rendering ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sheet = $('#sheet');
const sheetForm = $('#sheet-form');
let activeView = 'home';
let plannerDate = todayStr();
let plannerAmount = '';
let pendingWorker = null;
let sheetReturnFocus = null;
let sheetBusy = false;
function announce(message) { const box = $('#notice'); if (box) box.textContent = message; }
function render() {
  $('#storage-banner').hidden = !storageError && !externalChange;
  $('#storage-message').textContent = externalChange ? 'Data changed in another tab. Reload the latest data before saving.' : storageError;
  $('#app').hidden = !state || needsSetup;
  $('.tabbar').hidden = !state || needsSetup;
  $('#setup-view').hidden = !state || !needsSetup;
  $('#recovery').hidden = !!state;
  if (!state) { $('#recovery-message').textContent = storageError; return; }
  if(needsSetup){renderSetupScreen();return;}
  $('#setup-view').replaceChildren();
  const c = compute();
  renderHome(c); renderWeeks(c); renderSettings(); renderPrint();
}
function renderHome(c) {
  const weekly = rateOn(c.today, c.phaseNow);
  const behind = c.balance < 0;
  const label = behind ? 'Outstanding balance' : c.balance > 0 ? 'Rent credit' : 'All paid up';
  const hint = behind ? `Including next ${DAYS[state.dueDay]}, ${fmtShort(c.nextDue)}: <strong>${fmtMoney(-c.balance + c.nextRent)}</strong>.`
    : c.balance > 0 ? `Estimated rent coverage through <strong>${c.coveredThrough ? fmtDate(c.coveredThrough) : 'the last fully paid week'}</strong>. Known charges are included.`
    : `Next rent of <strong>${fmtMoney(c.nextRent)}</strong> is due <strong>${fmtDate(c.nextDue)}</strong>.`;
  const recent = [...state.payments].sort((a,b) => b.date.localeCompare(a.date));
  const a = state.arrangement;
  const backupDue = !state.lastBackup || daysBetween(state.lastBackup, c.today) >= 7;
  $('#view-home').innerHTML = `
    <h1>24 Rent</h1>
    <p class="hint intro">A rent tracker for residents of the Dallas 24 Hour Club, supporting Phase 1 and Phase 2 rent, payments, and receipts.</p>
    <div class="hero ${behind ? 'behind' : c.balance > 0 ? 'ahead' : 'even'}">
      <p class="label">${label}</p><p class="amount">${fmtMoney(Math.abs(c.balance))}</p>
      <p class="sub">${behind ? 'Unpaid rent and charges to date' : c.balance > 0 ? 'Available toward upcoming rent and charges' : 'Nothing owed right now'}</p>
    </div>
    <div class="stats">
      <div class="stat"><p class="k">Next rent charge</p><p class="v">${fmtDate(c.nextDue)}</p></div>
      <div class="stat"><p class="k">Weekly rate</p><p class="v">${fmtMoney(weekly)} · Phase ${c.phaseNow}</p></div>
    </div>
    <p class="hint">${hint}</p>
    ${a.date || a.note ? `<div class="callout"><strong>Payment arrangement${a.date ? ` · ${fmtShort(a.date)}` : ''}</strong><p>${esc(a.note || 'Payment arranged.')}</p><p class="field-note">A reminder only. Your balance changes when you log a payment.</p></div>` : ''}
    <button class="btn primary" data-action="add-payment">Log payment</button>
    <button class="btn small" data-action="planner">Plan payday catch-up</button>
    ${backupDue ? `<div class="callout"><p>${state.lastBackup ? 'Your last backup was at least a week ago.' : 'Keep a backup outside this device.'}</p><button class="btn small" data-action="export">Export backup</button></div>` : ''}
    <h2>Payments</h2><div class="list">${recent.length ? recent.map(p => `
      <button class="row" data-action="edit-payment" data-id="${esc(p.id)}"><div><p class="main">${fmtDate(p.date)}</p>${p.note ? `<p class="meta">${esc(p.note)}</p>` : ''}</div><span class="amt">${fmtMoney(cents(p.amount))}</span></button>`).join('') : '<p class="empty">No payments logged yet.</p>'}</div>
    <div class="summary"><span>Total paid <b>${fmtMoney(c.totalPaid)}</b></span><span>Total charged <b>${fmtMoney(c.totalOwed)}</b></span></div>`;
}
function statusBadge(o) {
  const label = { paid:'Paid', partial:`${fmtMoney(o.amount-o.applied)} left`, unpaid:'Unpaid', upcoming:'Not due yet' }[o.status];
  return `<span class="badge ${o.status}">${label}</span>`;
}
function renderWeeks(c) {
  const futureCharges = state.charges.filter(ch => ch.date > c.today).map(ch => ({...ch,kind:'charge',amount:cents(ch.amount),status:'upcoming'}));
  const items = [...c.obligations, ...c.upcoming, ...futureCharges].sort((a,b) => -obligationSort(a,b));
  $('#view-weeks').innerHTML = `<h1>Weeks</h1>
    <p class="hint intro">Rent is due each ${DAYS[state.dueDay]} for the week ahead. Payments cover the oldest rent and charges first. Tap a week to see its payments and receipts.${weekday(state.moveIn) !== state.dueDay ? ' The first partial week is prorated by day.' : ''}</p>
    <div class="btn-row"><button class="btn small" data-action="csv">Export CSV</button><button class="btn small" data-action="print">Print / PDF ledger</button></div>
    <div class="list ledger-list">${items.map(o => {
      const isWeek=o.kind==='week';
      const hasReceipt=isWeek&&o.allocations.some(a=>state.payments.find(p=>p.id===a.paymentId)?.receipt);
      return `<${isWeek?'button':'div'} class="row" ${isWeek?`data-action="week-detail" data-date="${o.date}"`:''}><div><p class="main">${!isWeek ? esc(o.label) : `${fmtShort(o.date)} – ${fmtShort(addDays(o.end,-1))}${o.date === state.moveIn ? ' · move-in' : ''}`}</p><p class="meta">${fmtMoney(o.amount)} · ${!isWeek ? fmtDate(o.date) : o.phase === 'split' ? 'Phase 1 / 2 split' : `Phase ${o.phase}${o.days < 7 ? ' · partial week' : ''}`}${hasReceipt?' · Receipt attached':''}</p></div>${statusBadge(o)}</${isWeek?'button':'div'}>`;
    }).join('')}</div>`;
}
function weekDetail(date) {
  const c=compute(),w=[...c.weeks,...c.upcoming].find(x=>x.date===date);
  if(!w)return;
  openSheet(`${fmtShort(w.date)} – ${fmtShort(addDays(w.end,-1))}`,
    `<p class="hint intro">Rent ${fmtMoney(w.amount)} · ${fmtMoney(w.applied)} paid${w.amount>w.applied?` · ${fmtMoney(w.amount-w.applied)} remaining`:''}</p>
    ${w.allocations.length?w.allocations.map(a=>{
      const p=state.payments.find(p=>p.id===a.paymentId);
      return `<div class="callout"><strong>${fmtMoney(a.amount)} applied to this week</strong><p>${fmtMoney(cents(p.amount))} payment · ${fmtDate(p.date)}</p>${p.note?`<p>${esc(p.note)}</p>`:''}
      ${p.receipt?`<p class="field-note">${esc(p.receipt.name)}</p><button class="btn small" type="button" data-action="view-receipt" data-id="${esc(p.id)}">View receipt</button>`:'<p class="field-note">No receipt attached.</p>'}
      <button class="btn small" type="button" data-action="edit-payment" data-id="${esc(p.id)}">${p.receipt?'Edit payment / receipt':'Add receipt / edit payment'}</button></div>`;
    }).join(''):'<p class="hint intro">No payments have been applied to this week yet. Attach a receipt when logging a payment.</p>'}
    <p class="field-note">Payments are applied oldest first. A payment covering several weeks has the same receipt available on each of those weeks.</p>`,()=>null,null,'Close');
  sheetForm.onsubmit=e=>{e.preventDefault();sheet.close();};
  sheetForm.querySelector('[data-cancel]').hidden=true;
  const receipts=[...new Map(w.allocations.map(a=>state.payments.find(p=>p.id===a.paymentId)?.receipt).filter(Boolean).map(r=>[r.id,r])).values()];
  if(receipts.length===1)viewReceipt(receipts[0]);
}
function renderSettings() {
  $('#view-settings').innerHTML = `<h1>Settings</h1>
    <h2>Rent and schedule</h2><div class="settings-card">
      <p class="hint intro">Move-in: ${fmtDate(state.moveIn)}<br>Due each ${DAYS[state.dueDay]}<br>Phase 2 starts: ${state.phase2Start ? fmtDate(state.phase2Start) : 'Not set'}</p>
      <button class="btn small" data-action="schedule">Edit move-in / due day / Phase 2</button>
      <p class="field-note">Schedule and Phase 2 corrections can change past balances. A recovery snapshot is saved first.</p>
    </div>
    <h2>Rate history</h2><div class="list">
      <div class="row"><div><p class="main">Starting rates</p><p class="meta">Phase 1 ${fmtMoney(cents(state.phase1Rate))} · Phase 2 ${fmtMoney(cents(state.phase2Rate))}</p></div></div>
      ${state.rateChanges.map(r => `<button class="row" data-action="edit-rate" data-phase="${r.phase}" data-date="${r.date}"><div><p class="main">Phase ${r.phase} · ${fmtMoney(cents(r.amount))}/week</p><p class="meta">From ${fmtDate(r.date)}</p></div><span>Edit</span></button>`).join('')}
    </div><div class="btn-row"><button class="btn small" data-action="add-rate">Add rate change</button><button class="btn small" data-action="base-rates">Correct starting rates</button></div>
    <h2>Payment arrangement</h2><div class="settings-card"><p class="hint intro">${esc(state.arrangement.note || 'Add an optional note about an agreed payment date.')}${state.arrangement.date ? `<br>${fmtDate(state.arrangement.date)}` : ''}</p><button class="btn small" data-action="arrangement">Edit arrangement</button></div>
    <h2>One-time charges</h2><div class="list">${state.charges.length ? [...state.charges].sort((a,b)=>b.date.localeCompare(a.date)).map(ch => `<button class="row" data-action="edit-charge" data-id="${esc(ch.id)}"><div><p class="main">${esc(ch.label)}</p><p class="meta">${fmtDate(ch.date)}</p></div><span class="amt">${fmtMoney(cents(ch.amount))}</span></button>`).join('') : '<p class="empty">No one-time charges.</p>'}</div><button class="btn small" data-action="add-charge">Add charge</button>
    <h2>Backup and recovery</h2><div class="settings-card"><p class="hint intro">Data is saved only in this browser or installed app. Export to Files or another device regularly. A local recovery snapshot cannot protect against clearing site data.</p>
      <p class="field-note">Last backup export: ${state.lastBackup ? fmtDate(state.lastBackup) : 'Not yet exported'}. An export opens sharing or downloads a file; check that you kept it.</p>
      <div class="btn-row"><button class="btn" data-action="export">Export backup</button><button class="btn" data-action="import">Import backup</button></div>
      <button class="btn small" data-action="snapshot">Restore recovery snapshot</button>
    </div><h2>New resident</h2><p class="hint intro">Each friend sets up their own ledger on their own device. To start a different ledger on this device, export your backup first.</p><button class="btn small" data-action="new-ledger">Set up a new ledger</button><h2>App</h2><p class="hint intro" id="offline-status">${offlineMessage}</p><button class="btn small" data-action="check-update">Check for update</button><p class="field-note">Version 2.8 · Updates never require clearing your saved data.</p>`;
}
function renderPrint() {
  const c = compute();
  $('#print-ledger').innerHTML = `<h1>Rent ledger</h1><p>As of ${fmtDate(c.today, {year:'numeric',month:'long',day:'numeric'})} · Move-in ${state.moveIn}</p><p>Outstanding: ${fmtMoney(-c.balance)} (negative means credit)</p><table><thead><tr><th>Date</th><th>Description</th><th>Charge</th><th>Payment</th><th>Outstanding</th></tr></thead><tbody>${ledgerRows().map(r => `<tr><td>${r.date}</td><td>${esc(r.description)}</td><td>${r.charge ? fmtMoney(r.charge) : ''}</td><td>${r.payment ? fmtMoney(r.payment) : ''}</td><td>${fmtMoney(r.balance)}</td></tr>`).join('')}</tbody></table>`;
}
function wrapLedgerText(context,text,width) {
  const lines=[];
  for(const paragraph of String(text).split('\n')) {
    let line='';
    for(const word of paragraph.split(/\s+/)) {
      const candidate=line?`${line} ${word}`:word;
      if(context.measureText(candidate).width<=width){line=candidate;continue;}
      if(line){lines.push(line);line='';}
      for(const character of Array.from(word)){
        if(line&&context.measureText(line+character).width>width){lines.push(line);line='';}
        line+=character;
      }
    }
    lines.push(line);
  }
  return lines;
}
async function ledgerPDF(isCancelled=()=>false) {
  const rows=ledgerRows(),c=compute(),moveIn=state.moveIn;
  const canvas=document.createElement('canvas');canvas.width=1836;canvas.height=2376;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF creation is unavailable in this browser.');
  ctx.scale(3,3);ctx.font='9px Arial, sans-serif';
  const pages=[[]];let y=158;
  for(const row of rows) {
    const wrapped=wrapLedgerText(ctx,row.description,208);
    for(let start=0;start<wrapped.length;start+=45) {
      const lines=wrapped.slice(start,start+45),height=Math.max(28,lines.length*12+12);
      if(y+height>744&&pages.at(-1).length){pages.push([]);y=158;}
      pages.at(-1).push({...row,lines,height,y,continued:start>0});y+=height;
    }
  }
  const images=[];
  for(let i=0;i<pages.length;i++) {
    if(isCancelled())return null;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,612,792);
    ctx.textAlign='left';ctx.fillStyle='#15151c';ctx.font='bold 24px Arial, sans-serif';ctx.fillText('Rent ledger',36,52);
    ctx.font='11px Arial, sans-serif';ctx.fillText(`As of ${fmtDate(c.today,{year:'numeric',month:'long',day:'numeric'})}`,36,76);
    ctx.fillText(`Move-in: ${moveIn}   |   Due each ${DAYS[state.dueDay]}`,36,94);
    ctx.font='bold 12px Arial, sans-serif';ctx.fillText(`${c.balance>0?'Rent credit':'Outstanding'}: ${fmtMoney(Math.abs(c.balance))}`,36,117);
    ctx.fillStyle='#ebedf2';ctx.fillRect(36,134,540,24);ctx.fillStyle='#15151c';ctx.font='bold 9px Arial, sans-serif';
    ctx.fillText('Date',42,150);ctx.fillText('Description',110,150);
    ctx.textAlign='right';ctx.fillText('Charge',402,150);ctx.fillText('Payment',482,150);ctx.fillText('Outstanding',570,150);
    pages[i].forEach((r,j)=>{
      if(j%2===1){ctx.fillStyle='#f6f7f9';ctx.fillRect(36,r.y,540,r.height);}
      ctx.fillStyle='#15151c';ctx.font='9px Arial, sans-serif';ctx.textAlign='left';
      ctx.fillText(r.continued?'(continued)':r.date,42,r.y+17);r.lines.forEach((line,n)=>ctx.fillText(line,110,r.y+17+n*12));
      if(!r.continued){ctx.textAlign='right';ctx.fillText(r.charge?fmtMoney(r.charge):'',402,r.y+17);ctx.fillText(r.payment?fmtMoney(r.payment):'',482,r.y+17);ctx.fillText(fmtMoney(r.balance),570,r.y+17);}
      ctx.strokeStyle='#d9dce3';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(36,r.y+r.height);ctx.lineTo(576,r.y+r.height);ctx.stroke();
    });
    if(!rows.length){ctx.textAlign='left';ctx.fillStyle='#555';ctx.font='11px Arial, sans-serif';ctx.fillText('No rent charges or payments through this date.',42,181);}
    ctx.textAlign='left';ctx.fillStyle='#555';ctx.font='9px Arial, sans-serif';ctx.fillText('Outstanding is positive for unpaid rent; negative for credit.',36,767);
    ctx.textAlign='right';ctx.fillText(`Page ${i+1} of ${pages.length}`,576,767);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));
    if(!blob)throw new Error('The ledger page could not be created.');
    images.push({width:canvas.width,height:canvas.height,bytes:new Uint8Array(await blob.arrayBuffer())});
  }
  if(isCancelled())return null;
  return makeImagePDF(images);
}
async function printLedger() {
  openSheet('Print / PDF ledger','<p id="print-status" class="hint intro" role="status">Preparing your printable ledger…</p><p class="field-note">On iPhone, choose Share / Print PDF, then Print in the share sheet. You can also save the PDF to Files.</p><button type="button" class="btn" id="download-ledger" hidden>Download PDF</button>',()=>null,null,'Preparing PDF…');
  const status=$('#print-status'),submit=sheetForm.querySelector('[type=submit]'),download=$('#download-ledger');
  submit.disabled=true;sheetForm.querySelector('[data-cancel]').textContent='Close';
  sheetForm.onsubmit=e=>e.preventDefault();
  try {
    const blob=await ledgerPDF(()=>!sheet.open||!status.isConnected);
    if(!blob||!sheet.open||!status.isConnected)return;
    const file=new File([blob],`rent-ledger-${todayStr()}.pdf`,{type:'application/pdf'});
    const share=!!navigator.canShare?.({files:[file]});
    status.textContent='Your PDF is ready.';submit.disabled=false;submit.textContent=share?'Share / Print PDF':'Download PDF';
    download.hidden=!share;download.onclick=()=>downloadFile(file);
    sheetForm.onsubmit=async e=>{
      e.preventDefault();
      try{if(share)await navigator.share({files:[file],title:'Rent ledger'});else downloadFile(file);}
      catch(e){if(e.name!=='AbortError')status.textContent='Sharing did not open. Choose Download PDF, then open the saved file to print.';}
    };
  }catch(e){if(status.isConnected){status.textContent=`Could not create the PDF. ${e.message}`;submit.hidden=true;}}
}

// ---------- Forms ----------
function setupFields() {
  const fresh=emptyLedger();
  return field('Move-in date','moveIn',fresh.moveIn,'date',`required min="1900-01-01" max="${todayStr()}"`)+
    selectField('Weekly rent due day','dueDay',DAYS,fresh.dueDay)+
    '<p class="field-note" id="setup-schedule-note">Rent follows your move-in weekday. Choose another due day if needed.</p>'+
    field('Weekly rent (Phase 1)','rate1',fresh.phase1Rate,'text','inputmode="decimal" required')+
    '<details><summary>Move-in fee, first payment, and Phase 2 rate (optional)</summary>'+
    field('Move-in fee (leave blank for none)','fee','','text','inputmode="decimal"')+
    field('Payment already made (leave blank for none)','paid','','text','inputmode="decimal"')+
    field('Date that payment was made','paidDate',fresh.moveIn,'date',`min="1900-01-01" max="${todayStr()}"`)+
    field('Phase 2 weekly rate','rate2',fresh.phase2Rate,'text','inputmode="decimal" required')+'</details>';
}
function bindScheduleDates(form,customDay=false) {
  let dayEdited=customDay,paidDateEdited=false;
  form.onchange=e=>{
    if(e.target.name==='dueDay')dayEdited=true;
    if(e.target.name==='paidDate')paidDateEdited=true;
    if(e.target.name==='moveIn'&&isDate(e.target.value)) {
      if(!dayEdited)form.elements.dueDay.value=weekday(e.target.value);
      if(form.elements.paidDate&&!paidDateEdited)form.elements.paidDate.value=e.target.value;
    }
    const note=form.querySelector('#setup-schedule-note');
    if(note)note.textContent=`Weekly rent is due each ${DAYS[Number(form.elements.dueDay.value)]}.`;
  };
}
function renderSetupScreen() {
  if($('#onboarding-form'))return;
  $('#setup-view').innerHTML=`<h1>Set up your rent</h1><p class="hint intro">24 Rent helps Dallas 24 Hour Club residents track Phase 1 and Phase 2 rent, payments, and receipts. Default weekly rates are $98 for Phase 1 and $133 for Phase 2.</p><p class="hint intro">Choose your own move-in date and weekly rent. No payments or fees are added unless you enter them.</p><form id="onboarding-form" class="settings-card">${setupFields().replaceAll('aria-describedby="form-error"','aria-describedby="setup-error"')}<p class="error" id="setup-error" role="alert" hidden></p><button class="btn primary" type="submit">Start my ledger</button></form><button class="btn" data-action="import">Import an existing backup</button>`;
  const form=$('#onboarding-form');bindScheduleDates(form);
  form.onsubmit=e=>{
    e.preventDefault();
    try{
      const next=createLedger(Object.fromEntries(new FormData(form)));
      if(!saveState(next))throw new Error(storageError);
      render();announce('Your ledger is ready.');
    }catch(e){$('#setup-error').hidden=false;$('#setup-error').textContent=e.message;renderStorageBannerIfNeeded();}
  };
}
function renderStorageBannerIfNeeded(){if(storageError)renderStorageBanner();}
function newLedgerSheet() {
  openSheet('Set up a new ledger','<p class="hint intro">This replaces this device’s current ledger after confirmation. Export your backup first. A recovery snapshot will also be saved.</p>'+setupFields(),(fd,next)=>{
    let fresh;try{fresh=createLedger(Object.fromEntries(fd));}catch(e){return e.message;}
    if(!confirm('Replace the current ledger with this new resident’s setup? The current ledger will be saved as a recovery snapshot.'))return 'No changes saved.';
    Object.assign(next,fresh);
  },null,'Start new ledger');
  bindScheduleDates(sheetForm);
}
function field(label, name, value='', type='text', extra='') {
  return `<label class="field"><span>${label}</span><input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra} aria-describedby="form-error"></label>`;
}
function selectField(label, name, options, selected) {
  return `<label class="field"><span>${label}</span><select name="${name}">${options.map((text,i)=>`<option value="${i}" ${String(selected)===String(i) ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
}
function formError(message, fieldName) {
  const box = $('#form-error'); box.hidden=false; box.textContent=message;
  sheetForm.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  const input = fieldName && sheetForm.elements.namedItem(fieldName);
  if (input) { input.setAttribute('aria-invalid','true'); input.focus(); }
}
function openSheet(title, html, onSubmit, onDelete, button='Save') {
  if(sheet.open)throw new Error('Close the current form before opening another.');
  sheetBusy=false;
  sheetForm.onchange=null;
  sheetReturnFocus = document.activeElement;
  sheetForm.oninput = e => {
    $('#form-error').hidden = true;
    e.target.removeAttribute('aria-invalid');
  };
  sheetForm.innerHTML = `<h2 id="sheet-title">${title}</h2>${html}<p class="error" id="form-error" role="alert" hidden></p><button class="btn primary" type="submit">${button}</button><div class="btn-row">${onDelete ? '<button class="btn danger" type="button" data-delete>Delete</button>' : ''}<button class="btn" type="button" data-cancel>Cancel</button></div>`;
  sheetForm.onsubmit = async e => {
    e.preventDefault();
    if(sheetBusy)return;
    sheetBusy=true;
    const fd=new FormData(sheetForm);
    sheetForm.querySelectorAll('button,input,select').forEach(b=>b.disabled=true);
    try {
      const originalRaw=storedRaw;
      const next = structuredClone(state);
      const result = await onSubmit(fd, next);
      if (result) return formError(result.message || result, result.field);
      if (!saveState(next,{expectedRaw:originalRaw})) { formError(storageError); renderStorageBanner(); return; }
      sheet.close(); render(); announce('Saved on this device.');
    } catch(e) {formError(`Not saved. ${e.message}`);}
    finally {sheetBusy=false;sheetForm.querySelectorAll('button,input,select').forEach(b=>b.disabled=false);}
  };
  sheetForm.querySelector('[data-cancel]').onclick=()=>sheet.close();
  const del=sheetForm.querySelector('[data-delete]');
  if (del) del.onclick=()=>{
    if (!confirm('Delete this entry? A recovery snapshot will be saved first.')) return;
    const next=structuredClone(state); onDelete(next);
    if (!saveState(next)) { formError(storageError); renderStorageBanner(); return; }
    sheet.close();render();announce('Deleted. Previous data is available in the recovery snapshot.');
  };
  sheet.showModal();
}
function renderStorageBanner() {
  $('#storage-banner').hidden=false; $('#storage-message').textContent=storageError;
}
sheet.addEventListener('close',()=>{ if (sheetReturnFocus?.isConnected) sheetReturnFocus.focus(); else $('.tab.active')?.focus(); });
sheet.addEventListener('cancel',e=>{if(sheetBusy)e.preventDefault();});
function editPayment(id) {
  const open=()=>paymentSheet(state.payments.find(p=>p.id===id));
  if(sheet.open){sheet.addEventListener('close',open,{once:true});sheet.close();}else open();
}
function paymentSheet(existing) {
  const p=existing || {date:todayStr(),amount:rateOn(todayStr(),compute().phaseNow)/100,note:''};
  let receipt=p.receipt || null,staged=null,processing=false;
  openSheet(existing ? 'Edit payment' : 'Log payment',
    field('Amount','amount',p.amount,'text','inputmode="decimal" required') +
    field('Date paid','date',p.date,'date',`min="${state.moveIn}" max="${todayStr()}" required`) +
    field('Note (optional)','note',p.note,'text','maxlength="500"') +
    `<fieldset class="receipt-field"><legend>Receipt (optional)</legend>
      <p class="field-note">Take a photo, choose a photo, or attach a PDF. Up to 10 MB. Photos are resized for storage.</p>
      <div class="btn-row"><button class="btn small" type="button" id="take-receipt">Take photo</button><button class="btn small" type="button" id="choose-receipt">Upload photo / PDF</button></div>
      <input id="receipt-camera" type="file" accept="image/*" capture="environment" hidden>
      <input id="receipt-upload" type="file" accept="image/*,application/pdf,.pdf" hidden>
      <p id="receipt-status" class="field-note" role="status"></p>
      <div class="btn-row"><button class="btn small" type="button" id="preview-receipt">View receipt</button><button class="btn small danger" type="button" id="remove-receipt">Remove receipt</button></div>
    </fieldset><p class="field-note">Log money already paid. Use the payday planner for future payments.</p>`,
    async (fd,next)=>{
      const amount=parseAmount(fd.get('amount')),date=fd.get('date');
      if (!amount) return {message:'Enter $0.01 to $1,000,000, with at most two decimal places.',field:'amount'};
      if (!isDate(date) || date < state.moveIn || date > todayStr()) return {message:'Choose a real date between move-in and today.',field:'date'};
      if(processing)return 'Wait for the receipt to finish processing.';
      const value={id:existing?.id || uid(),amount,date,note:String(fd.get('note')).trim(),receipt};
      if(staged) {
        const stored=await receiptFile(staged.id);
        if(!stored)await storeReceiptFiles([staged]);
      }
      if(existing) next.payments=next.payments.map(x=>x.id===existing.id ? value : x); else next.payments.push(value);
    },existing ? next=>{next.payments=next.payments.filter(x=>x.id!==existing.id)} : null,existing?'Save':'Add payment');
  const status=$('#receipt-status'),preview=$('#preview-receipt'),remove=$('#remove-receipt');
  const refresh=()=>{
    status.textContent=processing?'Preparing receipt…':receipt?`${receipt.name} · ${(receipt.size/1024).toFixed(0)} KB · ${staged?'ready to save':'saved'}`:'No receipt attached.';
    preview.hidden=remove.hidden=!receipt;
    sheetForm.querySelector('[type=submit]').disabled=processing;
    $('#take-receipt').disabled=$('#choose-receipt').disabled=processing;
  };
  const attach=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file||processing)return;
    processing=true;refresh();
    try {
      const prepared=await prepareReceipt(file);
      if(!sheet.open||!status.isConnected)return;
      staged=prepared;receipt=receiptMetadata(prepared);
    }catch(e){if(status.isConnected)formError(e.message);}
    finally{processing=false;if(status.isConnected)refresh();}
  };
  $('#take-receipt').onclick=()=>$('#receipt-camera').click();
  $('#choose-receipt').onclick=()=>$('#receipt-upload').click();
  $('#receipt-camera').onchange=$('#receipt-upload').onchange=attach;
  preview.onclick=()=>viewReceipt(receipt,staged?.blob);
  remove.onclick=()=>{receipt=null;staged=null;refresh();};
  refresh();
}
const receiptViewer=$('#receipt-viewer');
let receiptViewURL=null,receiptViewToken=null,pdfLoadingTask=null;
receiptViewer.addEventListener('close',()=>{
  receiptViewToken=null;
  if(pdfLoadingTask){pdfLoadingTask.destroy().catch(()=>{});pdfLoadingTask=null;}
  if(receiptViewURL)URL.revokeObjectURL(receiptViewURL);
  receiptViewURL=null;$('#receipt-content').replaceChildren();
});
$('#close-receipt').onclick=()=>receiptViewer.close();
async function viewReceipt(receipt,preparedBlob) {
  if(!receipt)return;
  if(pdfLoadingTask){pdfLoadingTask.destroy().catch(()=>{});pdfLoadingTask=null;}
  const token=receiptViewToken={};
  if(receiptViewURL)URL.revokeObjectURL(receiptViewURL);
  receiptViewURL=null;
  $('#receipt-title').textContent=receipt.name;
  $('#receipt-content').textContent='Opening receipt…';
  $('#download-receipt').hidden=$('#open-receipt').hidden=true;
  if(!receiptViewer.open)receiptViewer.showModal();
  try {
    const blob=preparedBlob || await receiptFile(receipt.id);
    if(!blob)throw new Error('This receipt file is missing from this device. Import a backup that includes it, or replace it on the payment.');
    await assertReceiptBytes(blob,receipt.type);
    if(!receiptViewer.open||receiptViewToken!==token)return;
    receiptViewURL=URL.createObjectURL(blob);
    const open=$('#open-receipt');open.href=receiptViewURL;open.hidden=false;
    const download=$('#download-receipt');download.hidden=false;
    download.onclick=()=>downloadFile(new File([blob],receipt.name,{type:receipt.type}));
    if(receipt.type==='application/pdf')await renderReceiptPDF(blob,token);
    else {
      const element=document.createElement('img');element.src=receiptViewURL;element.alt=`Receipt: ${receipt.name}`;
      element.onerror=()=>{if(receiptViewToken===token)$('#receipt-content').textContent='The photo could not be displayed. You can still download the original file.';};
      $('#receipt-content').replaceChildren(element);
    }
  }catch(e){if(receiptViewToken===token)$('#receipt-content').textContent=e.message;}
}
async function renderReceiptPDF(blob,token) {
  const pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');
  if(receiptViewToken!==token)return;
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.mjs',document.baseURI).href;
  const base=new URL('vendor/pdfjs/',document.baseURI).href;
  const data=new Uint8Array(await blob.arrayBuffer());
  if(receiptViewToken!==token)return;
  pdfLoadingTask=pdfjs.getDocument({data,
    cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',
    wasmUrl:base+'wasm/',iccUrl:base+'iccs/',canvasMaxAreaInBytes:16000000});
  const pdf=await pdfLoadingTask.promise;
  if(receiptViewToken!==token)return;
  $('#receipt-content').innerHTML='<div class="pdf-pages"><div class="btn-row"><button type="button" class="btn small" id="pdf-previous">Previous page</button><button type="button" class="btn small" id="pdf-next">Next page</button></div><p id="pdf-page-label" class="field-note" role="status"></p><canvas id="pdf-page" role="img" aria-label="Receipt page"></canvas><details id="pdf-text" hidden><summary>Receipt text</summary><p></p></details></div>';
  let current=1,busy=false;
  const previous=$('#pdf-previous'),next=$('#pdf-next'),label=$('#pdf-page-label'),canvas=$('#pdf-page'),text=$('#pdf-text');
  const draw=async number=>{
    if(busy||receiptViewToken!==token)return;
    busy=true;previous.disabled=next.disabled=true;label.textContent=`Opening page ${number} of ${pdf.numPages}…`;
    try {
      const page=await pdf.getPage(number);
      if(receiptViewToken!==token)return;
      const original=page.getViewport({scale:1});
      const desired=Math.min(1400,Math.max(600,$('#receipt-content').clientWidth*2));
      const viewport=page.getViewport({scale:Math.min(desired/original.width,Math.sqrt(4000000/(original.width*original.height)))});
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
      if(receiptViewToken!==token)return;
      current=number;label.textContent=`Page ${current} of ${pdf.numPages}`;canvas.setAttribute('aria-label',`Receipt page ${current} of ${pdf.numPages}`);
      const extracted=await page.getTextContent();
      text.querySelector('p').textContent=extracted.items.map(i=>i.str||'').join(' ');text.hidden=!text.querySelector('p').textContent.trim();
    }catch(e){if(receiptViewToken===token)label.textContent='This page could not be rendered. Open or download the original file.';}
    finally {busy=false;if(receiptViewToken===token){previous.disabled=current<=1;next.disabled=current>=pdf.numPages;}}
  };
  previous.onclick=()=>draw(current-1);next.onclick=()=>draw(current+1);
  await draw(1);
}
function chargeSheet(existing) {
  const ch=existing || {date:todayStr(),amount:'',label:''};
  openSheet(existing?'Edit charge':'Add charge', field('What for','label',ch.label,'text','required maxlength="500"') + field('Amount','amount',ch.amount,'text','inputmode="decimal" required') + field('Date charged','date',ch.date,'date',`min="${state.moveIn}" max="2099-12-31" required`),
    (fd,next)=>{
      const amount=parseAmount(fd.get('amount')),date=fd.get('date'),label=String(fd.get('label')).trim();
      if(!label) return {message:'Enter what the charge is for.',field:'label'};
      if(!amount) return {message:'Enter a positive dollar amount with at most two decimals.',field:'amount'};
      if(!isDate(date)||date<state.moveIn) return {message:'Choose a real date on or after move-in.',field:'date'};
      const value={id:existing?.id||uid(),amount,date,label};
      if(existing) next.charges=next.charges.map(x=>x.id===existing.id?value:x);else next.charges.push(value);
    },existing?next=>{next.charges=next.charges.filter(x=>x.id!==existing.id)}:null,existing?'Save':'Add charge');
}
function scheduleSheet() {
  openSheet('Schedule and Phase 2',field('Move-in date','moveIn',state.moveIn,'date','required min="1900-01-01" max="2099-12-31"') + selectField('Weekly rent due day','dueDay',DAYS,state.dueDay) + field('Phase 2 start date (optional)','phase2Start',state.phase2Start||'','date','min="1900-01-01" max="2099-12-31"') + '<p class="hint intro">Changing these settings recalculates historical rent. A partial first week is prorated to the selected due day. Export a backup before correcting history.</p>',
    (fd,next)=>{
      const moveIn=fd.get('moveIn'),p2=fd.get('phase2Start')||null,dueDay=Number(fd.get('dueDay'));
      if(!isDate(moveIn))return {message:'Choose a real move-in date.',field:'moveIn'};
      if(p2&&(!isDate(p2)||p2<moveIn))return {message:'Phase 2 must start on or after move-in.',field:'phase2Start'};
      if([...state.payments,...state.charges,...state.rateChanges].some(r=>r.date<moveIn))return {message:'Existing records are before this move-in date. Correct those records first.',field:'moveIn'};
      if(!confirm('Recalculate rent history using this schedule and Phase 2 date? A recovery snapshot will be saved.'))return 'No changes saved.';
      Object.assign(next,{moveIn,dueDay,phase2Start:p2});
    });
  bindScheduleDates(sheetForm,state.dueDay!==weekday(state.moveIn));
}
function baseRateSheet() {
  openSheet('Correct starting rates',field('Phase 1 starting weekly rate','rate1',state.phase1Rate,'text','inputmode="decimal" required')+field('Phase 2 starting weekly rate','rate2',state.phase2Rate,'text','inputmode="decimal" required')+'<p class="hint intro">These are historical corrections. To change rent from a specific date onward, cancel and choose Add rate change.</p>',(fd,next)=>{
    const a=parseAmount(fd.get('rate1')),b=parseAmount(fd.get('rate2'));
    if(!a||!b)return 'Enter valid positive rates with at most two decimals.';
    if(!confirm('Correct starting rates and recalculate past rent? A recovery snapshot will be saved.'))return 'No changes saved.';
    next.phase1Rate=a;next.phase2Rate=b;
  });
}
function rateSheet(existing) {
  openSheet(existing?'Edit rate change':'Add rate change',selectField('Phase','phase',['Phase 1','Phase 2'],existing?existing.phase-1:0)+field('Effective date','date',existing?.date||todayStr(),'date',`min="${state.moveIn}" max="2099-12-31" required`)+field('New weekly rate','amount',existing?.amount||'','text','inputmode="decimal" required')+'<p class="field-note">The rate applies from this date onward. Midweek changes are prorated by day.</p>',(fd,next)=>{
    const phase=Number(fd.get('phase'))+1,date=fd.get('date'),amount=parseAmount(fd.get('amount'));
    if(!isDate(date)||date<state.moveIn)return {message:'Choose a date on or after move-in.',field:'date'};
    if(!amount)return {message:'Enter a valid positive weekly rate.',field:'amount'};
    const list=next.rateChanges.filter(r=>!existing||r.phase!==existing.phase||r.date!==existing.date);
    if(list.some(r=>r.phase===phase&&r.date===date))return 'That phase already has a rate change on this date. Edit it instead.';
    if(date<todayStr()&&!confirm('This effective date is in the past and will recalculate rent from that date. Continue?'))return 'No changes saved.';
    next.rateChanges=[...list,{phase,date,amount}];
  },existing?next=>{next.rateChanges=next.rateChanges.filter(r=>r.phase!==existing.phase||r.date!==existing.date)}:null);
}
function arrangementSheet() {
  openSheet('Payment arrangement',field('Agreed payment date (optional)','date',state.arrangement.date||'','date','min="1900-01-01" max="2099-12-31"')+field('Note (optional)','note',state.arrangement.note,'text','maxlength="500" placeholder="Payment arranged for first paycheck"')+'<p class="field-note">This note never counts as a payment. Clear both fields to remove it.</p>',(fd,next)=>{
    const date=fd.get('date')||null;
    if(date&&!isDate(date))return {message:'Choose a real date.',field:'date'};
    next.arrangement={date,note:String(fd.get('note')).trim()};
  });
}
function planner() {
  plannerDate=state.arrangement.date&&state.arrangement.date>=todayStr()?state.arrangement.date:todayStr();
  plannerAmount='';
  openSheet('Plan payday catch-up',field('Payday','payday',plannerDate,'date',`min="${todayStr()}" max="2099-12-31" required`)+field('Planned payment (optional)','planned','','text','inputmode="decimal"')+'<div class="callout" id="planner-result" aria-live="polite"></div><p class="field-note">Projection only, including rent and known charges through payday. No payment is recorded.</p>',()=> 'Use Close when you have finished planning.',null,'Close');
  // This form is a calculator, not a ledger mutation.
  sheetForm.onsubmit=e=>{e.preventDefault();sheet.close()};
  const update=()=>{
    const date=sheetForm.elements.payday.value,value=sheetForm.elements.planned.value;
    if(!isDate(date)||date<todayStr()){$('#planner-result').textContent='Choose today or a future payday.';return;}
    const amount=value?parseAmount(value):0;
    if(value&&!amount){$('#planner-result').textContent='Enter a valid planned dollar amount.';return;}
    const c=compute(date),owed=Math.max(0,-c.balance),after=c.balance+cents(amount);
    $('#planner-result').innerHTML=`<p>To catch up by <strong>${fmtDate(date)}</strong>: <strong>${fmtMoney(owed)}</strong></p>${value?`<p>After your planned payment: <strong>${fmtMoney(Math.abs(after))} ${after<0?'still outstanding':after>0?'credit':'outstanding'}</strong></p>`:''}<p class="field-note">Next rent charge after payday: ${fmtMoney(c.nextRent)} on ${fmtDate(c.nextDue)}.</p>`;
  };
  sheetForm.oninput=update;update();
}

// ---------- Backup, recovery, export ----------
function downloadFile(file) {
  const url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function exportBackup() {
  const originalRaw=storedRaw;
  const next={...structuredClone(state),lastBackup:todayStr()};
  try {
    announce('Preparing backup, including receipts…');
    const json=JSON.stringify(await makeBackup(next));
    const file=new File([json],`rent-backup-${todayStr()}.json`,{type:'application/json'});
    if(file.size>MAX_BACKUP_BYTES)throw new Error('The backup exceeds 200 MB.');
    if(navigator.canShare?.({files:[file]})) {
      try {await navigator.share({files:[file],title:'Rent backup'});}
      catch(e){if(e.name==='AbortError')return;downloadFile(file);}
    } else downloadFile(file);
    if(storedRaw!==originalRaw){announce('Backup export opened for the ledger before your latest edit. Export again to include the latest changes.');return;}
    if(saveState(next,{snapshot:false,expectedRaw:originalRaw})){render();announce('Backup export opened, including receipts. Check that you saved the file outside this device.');}
    else renderStorageBanner();
  } catch(e){announce(`Backup export failed. ${e.message}`);}
}
function parseBackup(text) {
  const parsed=JSON.parse(text);
  if(parsed.app!==undefined&&parsed.app!=='rent-tracker')throw new Error('This backup belongs to another app.');
  return normalizeState(parsed.data??parsed);
}
async function importBackup(file) {
  const originalRaw=storedRaw;
  try {
    if(file.size>MAX_BACKUP_BYTES)throw new Error('Backup is too large (maximum 200 MB).');
    const text=await file.text(),next=parseBackup(text);
    const files=await decodeBackupReceipts(JSON.parse(text),next);
    if(!confirm(`Replace this ledger with ${next.payments.length} payments and ${next.charges.length} charges? The current data will be kept as a recovery snapshot.`))return;
    if(sheet.open)throw new Error('Close the open form before importing a backup.');
    await storeReceiptFiles(files);
    if(!saveState(next,{expectedRaw:originalRaw})){render();return;}
    render();announce('Backup restored and saved on this device.');
  }catch(e){announce(`Backup not imported. ${e.message}`);}
}
async function restoreSnapshot() {
  const originalRaw=storedRaw;
  try {
    const saved=JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
    if(!saved||typeof saved.raw!=='string')throw new Error('No recovery snapshot is available yet.');
    const next=parseBackup(saved.raw);
    for(const r of receiptReferences(next))if(!await receiptFile(r.id))throw new Error('A receipt in this snapshot is missing. Import a complete backup instead.');
    if(!confirm(`Restore the snapshot from ${saved.savedAt}? Current data will become the new recovery snapshot.`))return;
    if(!saveState(next,{expectedRaw:originalRaw})){render();return;}
    render();announce('Recovery snapshot restored.');
  }catch(e){announce(`Snapshot not restored. ${e.message}`);}
}
function exportRaw() {
  const raw=recoveryRaw??storedRaw;
  if(raw===null){announce('No saved data could be read. Check browser storage permissions, then reload.');return;}
  downloadFile(new File([raw],`rent-unreadable-${todayStr()}.txt`,{type:'text/plain'}));
  announce('Original saved data download opened. Keep it before attempting recovery.');
}

// ---------- Events and lifecycle ----------
function showView(name) {
  activeView=name;
  document.querySelectorAll('.view').forEach(v=>{v.hidden=v.id!==`view-${name}`});
  document.querySelectorAll('.tab').forEach(t=>{const active=t.dataset.view===name;t.classList.toggle('active',active);if(active)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current')});
  window.scrollTo(0,0);
}
document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab');if(tab)return showView(tab.dataset.view);
  const el=e.target.closest('[data-action]');if(!el)return;
  switch(el.dataset.action){
    case 'add-payment':return paymentSheet();
    case 'edit-payment':return editPayment(el.dataset.id);
    case 'week-detail':return weekDetail(el.dataset.date);
    case 'view-receipt':return viewReceipt(state.payments.find(p=>p.id===el.dataset.id)?.receipt);
    case 'add-charge':return chargeSheet();
    case 'edit-charge':return chargeSheet(state.charges.find(p=>p.id===el.dataset.id));
    case 'schedule':return scheduleSheet();
    case 'new-ledger':return newLedgerSheet();
    case 'base-rates':return baseRateSheet();
    case 'add-rate':return rateSheet();
    case 'edit-rate':return rateSheet(state.rateChanges.find(r=>r.phase===Number(el.dataset.phase)&&r.date===el.dataset.date));
    case 'arrangement':return arrangementSheet();
    case 'planner':return planner();
    case 'export':return exportBackup();
    case 'import':return $('#import-file').click();
    case 'snapshot':return restoreSnapshot();
    case 'raw':return exportRaw();
    case 'reload':if(!sheet.open||confirm('Close this form and reload the latest saved data?'))location.reload();return;
    case 'csv':downloadFile(new File(['\uFEFF'+csvLedger()],`rent-ledger-${todayStr()}.csv`,{type:'text/csv;charset=utf-8'}));announce('CSV download opened.');return;
    case 'print':return printLedger();
    case 'check-update':return checkUpdate();
    case 'apply-update':
      if(sheet.open){announce('Finish or cancel your open form before updating.');return;}
      if(pendingWorker?.state==='activated'){location.reload();return;}
      if(pendingWorker){pendingWorker.postMessage({type:'ACTIVATE_UPDATE'});announce('Applying update…');}return;
  }
});
$('#import-file').addEventListener('change',e=>{const file=e.target.files[0];if(file)importBackup(file);e.target.value=''});
window.addEventListener('storage',e=>{
  if(e.key!==STORAGE_KEY&&e.key!==null)return;
  externalChange=true;storageError='Data changed in another tab. Reload the latest data before saving.';renderStorageBanner();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!sheet.open)render()});
let lastRenderedDate=todayStr();
setInterval(()=>{const now=todayStr();if(now!==lastRenderedDate&&!sheet.open){lastRenderedDate=now;render()}},30000);

// The waiting worker activates only after an explicit action. Cached app-shell
// files are immutable within a release; HTML references versioned CSS and JS.
let registration=null;
let offlineMessage='Checking offline readiness…';
function showUpdate(worker){pendingWorker=worker;$('#update-banner').hidden=false;}
async function checkUpdate(){
  if(!registration){announce(offlineMessage);return;}
  try{await registration.update();if(registration.waiting)showUpdate(registration.waiting);else announce('Update check complete. Any available update will appear above.');}
  catch(e){announce('Could not check for updates. Try again when online.');}
}
async function setupWorker(){
  if(!('serviceWorker' in navigator)){offlineMessage='Offline installation is unavailable in this browser.';render();return;}
  try{
    registration=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});
    if(registration.waiting)showUpdate(registration.waiting);
    const track=worker=>worker.addEventListener('statechange',()=>{
      if(worker.state==='installed'&&navigator.serviceWorker.controller&&registration.waiting)showUpdate(registration.waiting);
      if(worker.state==='redundant'){
        offlineMessage='Offline setup did not finish. Try checking for an update when online.';
        if(!sheet.open)render();
      }
    });
    if(registration.installing)track(registration.installing);
    registration.addEventListener('updatefound',()=>{if(registration.installing)track(registration.installing)});
    await navigator.serviceWorker.ready;
    offlineMessage='Offline files are ready on this device.';
    if(!sheet.open)render();
  }catch(e){offlineMessage='Offline setup failed. Open the app over HTTPS and try again online.';if(!sheet.open)render();}
}
let reloading=false;
navigator.serviceWorker?.addEventListener('controllerchange',()=>{
  if(!pendingWorker||reloading)return;
  if(sheet.open){announce('Update ready. Close your form and reload when finished.');return;}
  reloading=true;location.reload();
});
render();
setupWorker();
