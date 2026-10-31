const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
process.chdir(require('node:path').resolve(__dirname,'..'));
const nodes=new Map(),store=new Map();const node=()=>({innerHTML:'',textContent:'',value:'',checked:false,files:[],classList:{add(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){}});const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)};
const ctx=vm.createContext({console,Date,Map,Set,JSON,String,Number,Array,Object,Error,Promise,structuredClone,Blob,URL,setTimeout:()=>0,clearTimeout(){},navigator:{onLine:true},location:{_hash:'#today',get hash(){return this._hash},set hash(v){this._hash=v.startsWith('#')?v:'#'+v}},window:{addEventListener(){},scrollTo(){}},document:{querySelector:get,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}}}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{
assert.equal(run("validDate('2026-02-30')"),false);assert.equal(run("validDate('2024-02-29')"),true);assert.equal(run("esc('<img src=x onerror=alert(1)>')"),'&lt;img src=x onerror=alert(1)&gt;');
run("draft.answers.resentment='A test';draft.answers.harms='Repair';draft.amendsOpen=true;persistDraft()");assert.equal(JSON.parse(store.get('still.draft.v1')).answers.resentment,'A test');
await run('saveEntry()');assert.equal(run('entries.length'),1);assert.equal(run('draft'),null);assert.equal(store.has('still.draft.v1'),false);
run("edit(entries[0].date);draft.answers.gratitude='Updated gratitude'");await run('saveEntry()');assert.equal(run('entries.length'),1);assert.equal(run('entries[0].answers.gratitude'),'Updated gratitude');
get('#import-preview');await run("readImport({target:{files:[{size:10,text:async()=>'{bad json'}]}})");assert.equal(run('entries.length'),1);assert.match(get('#import-preview').textContent,/invalid/);
run("globalThis.fixture={app:'still-daily-inventory',version:1,entries:[{...entries[0],date:'2026-10-29'}],draft:null}");await run('readImport({target:{files:[{size:100,text:async()=>JSON.stringify(fixture)}]}})');get('#import-mode').value='keep';get('#restore-draft').checked=false;await run('applyImport()');assert.equal(run('entries.length'),2);
run("fixture.entries=[{...entries[0],answers:{...entries[0].answers,gratitude:'Backup version'}}]");await run('readImport({target:{files:[{size:100,text:async()=>JSON.stringify(fixture)}]}})');await run('applyImport()');assert.equal(run('entries[0].answers.gratitude'),'Updated gratitude');
await run("readImport({target:{files:[{size:100,text:async()=>JSON.stringify({...fixture,entries:[fixture.entries[0],fixture.entries[0]]})}]}})");assert.equal(run('imported'),null);

run("confirmAction=async()=>true");
await run('readImport({target:{files:[{size:100,text:async()=>JSON.stringify(fixture)}]}})');get('#import-mode').value='replace';await run('applyImport()');assert.equal(run('entries[0].answers.gratitude'),'Backup version');
const buttons=[node()];buttons[0].dataset={delete:'2026-10-29'};ctx.document.querySelectorAll=s=>s==='[data-delete]'?buttons:[];run('bindEntries()');await buttons[0].onclick();assert.equal(run('entries.length'),1);
run('renderSettings()');await get('#clear').onclick();assert.equal(run('entries.length'),0);assert.equal(store.has('still.draft.v1'),false);
const assets=fs.readFileSync('sw.js','utf8').match(/const ASSETS=(\[[^;]+\])/)[1];for(const path of JSON.parse(assets.replaceAll("'",'"')))assert.ok(fs.existsSync(''+(path==='./'?'index.html':path)));
run("localStorage.setItem=()=>{throw Error('quota')};draft=fresh('2026-10-28');draft.answers.fear='Still here'");await run('saveEntry()');assert.equal(run('draft.answers.fear'),'Still here');assert.equal(run('storageOK'),false);
console.log('PASS: valid dates, HTML escaping, draft persistence, save/edit, invalid import, merge import, conflict keep, duplicate rejection, offline asset integrity, storage failure retention.');
})().catch(e=>{console.error(e);process.exitCode=1});
