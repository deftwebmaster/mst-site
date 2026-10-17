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
const DEFAULT_STATE = {
  version: 2, moveIn: '2026-10-02', dueDay: 5,
  phase1Rate: 98, phase2Rate: 133, phase2Start: null,
  rateChanges: [], arrangement: { date: null, note: '' }, lastBackup: null,
  charges: [{ id: 'movein-fee', date: '2026-10-02', amount: 50, label: 'Move-in fee' }],
  payments: [{ id: 'first-payment', date: '2026-10-02', amount: 148, note: 'Week 1 rent + move-in fee' }],
};

// Reject an entire invalid ledger; never silently remove financial records.
function normalizeState(s) {
  const fail = message => { throw new Error(message); };
  if (!s || typeof s !== 'object' || Array.isArray(s)) fail('Not a Rent Tracker ledger.');
  if (s.version !== 1 && s.version !== 2) fail('Unsupported backup version.');
  if (!isDate(s.moveIn)) fail('Move-in date must be a real date from 1900 through 2099.');
  if (!validMoney(s.phase1Rate) || !validMoney(s.phase2Rate)) fail('Weekly rates must be positive dollar amounts with at most two decimals (maximum $1,000,000).');
  if (s.phase2Start !== null && s.phase2Start !== undefined && !isDate(s.phase2Start)) fail('Invalid Phase 2 date.');
  if (s.phase2Start && s.phase2Start < s.moveIn) fail('Phase 2 cannot start before move-in.');
  const ids = new Set();
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
      return { id: r.id, date: r.date, amount: r.amount, [key]: value.trim() };
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
    version: 2, moveIn: s.moveIn, dueDay,
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
function loadState() {
  try {
    storedRaw = localStorage.getItem(STORAGE_KEY);
    return storedRaw === null ? structuredClone(DEFAULT_STATE) : normalizeState(JSON.parse(storedRaw));
  } catch (e) {
    recoveryRaw = storedRaw;
    storageError = `Saved data could not be opened. ${e.message}`;
    return null;
  }
}
let state = loadState();

// Write the recovery snapshot before the ledger. Failed writes leave both the
// displayed state and the original ledger intact. Check for stale tabs first.
function saveState(next, { snapshot = true } = {}) {
  if (!next) return false;
  try {
    const validated = normalizeState(next);
    if (localStorage.getItem(STORAGE_KEY) !== storedRaw) {
      externalChange = true;
      throw new Error('Data changed in another tab. Reload the latest data before saving.');
    }
    if (snapshot) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
      savedAt: new Date().toISOString(), raw: storedRaw ?? JSON.stringify(state || DEFAULT_STATE),
    }));
    const raw = JSON.stringify(validated);
    localStorage.setItem(STORAGE_KEY, raw);
    storedRaw = raw;
    state = validated;
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
  const totalPaid = state.payments.filter(p => p.date <= today).reduce((sum, p) => sum + cents(p.amount), 0);
  const totalOwed = obligations.reduce((sum, o) => sum + o.amount, 0);
  let pool = totalPaid;
  const apply = o => {
    o.applied = Math.min(pool, o.amount);
    pool -= o.applied;
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
function announce(message) { const box = $('#notice'); if (box) box.textContent = message; }
function render() {
  $('#storage-banner').hidden = !storageError && !externalChange;
  $('#storage-message').textContent = externalChange ? 'Data changed in another tab. Reload the latest data before saving.' : storageError;
  $('#app').hidden = !state;
  $('.tabbar').hidden = !state;
  $('#recovery').hidden = !!state;
  if (!state) { $('#recovery-message').textContent = storageError; return; }
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
    <h1>Rent</h1>
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
    <p class="hint intro">Rent is due each ${DAYS[state.dueDay]} for the week ahead. Payments cover the oldest rent and charges first.${weekday(state.moveIn) !== state.dueDay ? ' The first partial week is prorated by day.' : ''}</p>
    <div class="btn-row"><button class="btn small" data-action="csv">Export CSV</button><button class="btn small" data-action="print">Print ledger</button></div>
    <div class="list ledger-list">${items.map(o => `<div class="row"><div><p class="main">${o.kind === 'charge' ? esc(o.label) : `${fmtShort(o.date)} – ${fmtShort(addDays(o.end,-1))}${o.date === state.moveIn ? ' · move-in' : ''}`}</p><p class="meta">${fmtMoney(o.amount)} · ${o.kind === 'charge' ? fmtDate(o.date) : o.phase === 'split' ? 'Phase 1 / 2 split' : `Phase ${o.phase}${o.days < 7 ? ' · partial week' : ''}`}</p></div>${statusBadge(o)}</div>`).join('')}</div>`;
}
function renderSettings() {
  $('#view-settings').innerHTML = `<h1>Settings</h1>
    <h2>Rent and schedule</h2><div class="settings-card">
      <p class="hint intro">Move-in: ${fmtDate(state.moveIn)}<br>Due each ${DAYS[state.dueDay]}<br>Phase 2 starts: ${state.phase2Start ? fmtDate(state.phase2Start) : 'Not set'}</p>
      <button class="btn small" data-action="schedule">Edit schedule / Phase 2</button>
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
    </div><h2>App</h2><p class="hint intro" id="offline-status">${offlineMessage}</p><button class="btn small" data-action="check-update">Check for update</button><p class="field-note">Version 2.1 · Updates never require clearing your saved data.</p>`;
}
function renderPrint() {
  const c = compute();
  $('#print-ledger').innerHTML = `<h1>Rent ledger</h1><p>As of ${fmtDate(c.today, {year:'numeric',month:'long',day:'numeric'})} · Move-in ${state.moveIn}</p><p>Outstanding: ${fmtMoney(-c.balance)} (negative means credit)</p><table><thead><tr><th>Date</th><th>Description</th><th>Charge</th><th>Payment</th><th>Outstanding</th></tr></thead><tbody>${ledgerRows().map(r => `<tr><td>${r.date}</td><td>${esc(r.description)}</td><td>${r.charge ? fmtMoney(r.charge) : ''}</td><td>${r.payment ? fmtMoney(r.payment) : ''}</td><td>${fmtMoney(r.balance)}</td></tr>`).join('')}</tbody></table>`;
}

// ---------- Forms ----------
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
  sheetReturnFocus = document.activeElement;
  sheetForm.oninput = e => {
    $('#form-error').hidden = true;
    e.target.removeAttribute('aria-invalid');
  };
  sheetForm.innerHTML = `<h2 id="sheet-title">${title}</h2>${html}<p class="error" id="form-error" role="alert" hidden></p><button class="btn primary" type="submit">${button}</button><div class="btn-row">${onDelete ? '<button class="btn danger" type="button" data-delete>Delete</button>' : ''}<button class="btn" type="button" data-cancel>Cancel</button></div>`;
  sheetForm.onsubmit = e => {
    e.preventDefault();
    const next = structuredClone(state);
    const result = onSubmit(new FormData(sheetForm), next);
    if (result) return formError(result.message || result, result.field);
    if (!saveState(next)) { formError(storageError); renderStorageBanner(); return; }
    sheet.close(); render(); announce('Saved on this device.');
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
function paymentSheet(existing) {
  const p=existing || {date:todayStr(),amount:rateOn(todayStr(),compute().phaseNow)/100,note:''};
  openSheet(existing ? 'Edit payment' : 'Log payment',
    field('Amount','amount',p.amount,'text','inputmode="decimal" required') +
    field('Date paid','date',p.date,'date',`min="${state.moveIn}" max="${todayStr()}" required`) +
    field('Note (optional)','note',p.note,'text','maxlength="500"') + '<p class="field-note">Log money already paid. Use the payday planner for future payments.</p>',
    (fd,next)=>{
      const amount=parseAmount(fd.get('amount')),date=fd.get('date');
      if (!amount) return {message:'Enter $0.01 to $1,000,000, with at most two decimal places.',field:'amount'};
      if (!isDate(date) || date < state.moveIn || date > todayStr()) return {message:'Choose a real date between move-in and today.',field:'date'};
      const value={id:existing?.id || uid(),amount,date,note:String(fd.get('note')).trim()};
      if(existing) next.payments=next.payments.map(x=>x.id===existing.id ? value : x); else next.payments.push(value);
    },existing ? next=>{next.payments=next.payments.filter(x=>x.id!==existing.id)} : null,existing?'Save':'Add payment');
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
  const next={...state,lastBackup:todayStr()};
  const json=JSON.stringify({app:'rent-tracker',exportedAt:new Date().toISOString(),data:next},null,2);
  const file=new File([json],`rent-backup-${todayStr()}.json`,{type:'application/json'});
  try {
    if(navigator.canShare?.({files:[file]})) {
      try {await navigator.share({files:[file],title:'Rent backup'});}
      catch(e){if(e.name==='AbortError')return;downloadFile(file);}
    } else downloadFile(file);
    if(saveState(next,{snapshot:false})){render();announce('Backup export opened. Check that you saved the file outside this device.');}
    else renderStorageBanner();
  } catch(e){announce(`Backup export failed. ${e.message}`);}
}
function parseBackup(text) {
  const parsed=JSON.parse(text);
  if(parsed.app!==undefined&&parsed.app!=='rent-tracker')throw new Error('This backup belongs to another app.');
  return normalizeState(parsed.data??parsed);
}
async function importBackup(file) {
  try {
    if(file.size>5*1024*1024)throw new Error('Backup is too large (maximum 5 MB).');
    const next=parseBackup(await file.text());
    if(!confirm(`Replace this ledger with ${next.payments.length} payments and ${next.charges.length} charges? The current data will be kept as a recovery snapshot.`))return;
    if(!saveState(next)){render();return;}
    render();announce('Backup restored and saved on this device.');
  }catch(e){announce(`Backup not imported. ${e.message}`);}
}
function restoreSnapshot() {
  try {
    const saved=JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
    if(!saved||typeof saved.raw!=='string')throw new Error('No recovery snapshot is available yet.');
    const next=parseBackup(saved.raw);
    if(!confirm(`Restore the snapshot from ${saved.savedAt}? Current data will become the new recovery snapshot.`))return;
    if(saveState(next)){render();announce('Recovery snapshot restored.');}else render();
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
    case 'edit-payment':return paymentSheet(state.payments.find(p=>p.id===el.dataset.id));
    case 'add-charge':return chargeSheet();
    case 'edit-charge':return chargeSheet(state.charges.find(p=>p.id===el.dataset.id));
    case 'schedule':return scheduleSheet();
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
    case 'print':renderPrint();window.print();return;
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
