// Optional release checks. Run: node tools/verify.mjs (Node 18+).
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const context={window:{}};vm.runInNewContext(read('cards.js'),context);
const cards=context.window.DECK;
assert.equal(cards.length,72);assert.equal(new Set(cards.map(c=>c.id)).size,72);assert.equal(new Set(cards.map(c=>c.question)).size,72);
for(const t of ['honesty','willingness','character','humility','relationships','accountability','service','spirituality'])assert.equal(cards.filter(c=>c.topic===t).length,6);
for(let s=1;s<=12;s++)assert.equal(cards.filter(c=>c.step===s).length,2);
for(const c of cards){assert.ok(c.title&&c.question.endsWith('?')&&c.follow.endsWith('?'));assert.ok(/^[a-z0-9-]+$/.test(c.id));}
const manifest=JSON.parse(read('manifest.webmanifest'));
for(const key of ['id','start_url','scope'])assert.equal(manifest[key],'./');
for(const icon of manifest.icons){assert.ok(existsSync(resolve(root,icon.src)));const b=readFileSync(resolve(root,icon.src));assert.equal(b.subarray(1,4).toString(),'PNG');const width=b.readUInt32BE(16),height=b.readUInt32BE(20);assert.equal(`${width}x${height}`,icon.sizes);}
const sw=read('sw.js');const assetLiteral=sw.match(/const ASSETS=(\[[^;]+\]);/)[1];const assets=vm.runInNewContext(assetLiteral);
for(const asset of assets)assert.ok(existsSync(resolve(root,asset)),`Missing cached asset: ${asset}`);
for(const match of read('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)){const path=match[1];if(!path.startsWith('#'))assert.ok(existsSync(resolve(root,path)),`Broken HTML asset: ${path}`);}
for(const f of ['app.js','cards.js','sw.js'])new vm.Script(read(f),{filename:f});
assert.ok(!/<script[^>]+src="https?:/i.test(read('index.html')));
console.log('PASS: 72 unique cards, 8 topics × 6 cards, 12 Steps × 2 cards, PNG dimensions, relative PWA paths, all offline/HTML assets, JavaScript syntax, no external runtime scripts.');
