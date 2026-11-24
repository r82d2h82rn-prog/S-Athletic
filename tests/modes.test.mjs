import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {STAGES} from '../src/stage-catalog.mjs';
import {verifyThird} from '../scripts/verify-third.mjs';
import {Game as FirstGame} from '../src/physics.mjs';
import {Game as ThirdGame} from '../stages/third/upstream/src/engine.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');

test('stage catalog enables all four stages in broadcast order',()=>{assert.deepEqual(STAGES.filter(s=>s.available).map(s=>s.id),['first','second','third','final']);assert.deepEqual(STAGES.filter(s=>!s.available).map(s=>s.id),[]);assert(STAGES.filter(s=>!s.available).every(s=>s.path===null));assert.equal(STAGES.find(s=>s.id==='first').path,'/first/');assert.equal(STAGES.find(s=>s.id==='third').path,'/third/');});
test('the complete original 3rd snapshot and vendored Three.js match their source blobs',async()=>{const manifest=await verifyThird();assert.equal(manifest.commit,'207396d7416a7fc3ef6727b00c2e8cecc590985a');assert.equal(manifest.files.length,32);});
test('1st and 3rd keep independent live state',()=>{const first=new FirstGame(),third=new ThirdGame();first.reset({practice:true,stage:7});const p={...first.p};first.time=8;third.reset(3);third.step(1/120,{brace:true});assert.deepEqual(first.p,p);assert.equal(first.time,8);assert.equal(first.stage,7);assert.equal(third.stage,3);first.reset();assert.equal(third.stage,3);});
test('existing 1st records and original 3rd records stay in separate storage namespaces',async()=>{const first=await read('src/app.mjs'),third=await read('stages/third/upstream/src/app.js');assert(first.includes('nathletic-v6-progress'));assert(third.includes('third-stage-record-v3'));assert(!first.includes('third-stage-record-v3'));assert(!third.includes('nathletic-v6-progress'));});
test('3rd generated engine, collisions, controls and poses retain original bytes',async()=>{for(const name of['engine.mjs','collision.mjs','controls.mjs','motion.mjs','course.mjs','burst.mjs','hit-targets.mjs'])assert.equal(await read('dist/third/'+name),await read('stages/third/upstream/src/'+name));});
test('3rd generated app preserves gameplay and applies the S-Athletic rendering upgrade',async()=>{const html=await read('dist/third/index.html'),app=await read('stages/third/upstream/src/app.js');assert(html.includes(app));assert(!html.includes('/* APP */'));const original=await read('stages/third/upstream/src/render.js');const generated=await read('dist/third/render.js');assert(generated.includes("from './vendor/three.module.min.js'"));assert(generated.includes('enhanceScene({renderer:this.renderer'));assert(generated.includes('this.updateRealWater?.(this.time)'));assert(original.includes("from 'three'"));});
test('both modes provide a home link, including the 3rd portrait rotation screen',async()=>{const first=await read('dist/first/index.html'),third=await read('dist/third/index.html');assert.match(first,/href="\/" aria-label="ステージ選択に戻る"/);assert.match(third,/class="stage-home icon-btn" href="\/"/);assert.match(third,/class="portrait-stage-home" href="\/"/);});
test('the hub renders playable links and non-clickable future cards',async()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};}append(...items){this.children.push(...items);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}}
 const targets={playableStages:new El('section'),futureStages:new El('section')},doc={createElement:tag=>new El(tag),getElementById:id=>targets[id]};
 const old=globalThis.document;globalThis.document=doc;
 try{await import('../src/hub.mjs');assert.equal(targets.playableStages.children.length,4);assert.deepEqual(targets.playableStages.children.map(c=>c.href),['/first/','/second/','/third/','/final/']);assert(targets.playableStages.children.every(c=>c.tag==='a'));assert.equal(targets.futureStages.children.length,0);assert(targets.futureStages.children.every(c=>c.tag==='article'&&!c.href));}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('HTTP serves the hub, both games and local graphics dependencies with safe relative-import routes',async()=>{
 const server=spawn(process.execPath,['server.mjs','dist'],{cwd:fileURLToPath(root),env:{...process.env,NATHLETIC_PORT:'0'},stdio:['ignore','pipe','pipe']});
 try{
 const base=await new Promise((resolve,reject)=>{let buffer='';const timeout=setTimeout(()=>reject(Error('Server startup timeout')),10000);server.stdout.on('data',chunk=>{buffer+=chunk;const match=buffer.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});server.on('error',e=>{clearTimeout(timeout);reject(e);});server.on('exit',code=>{if(code){clearTimeout(timeout);reject(Error('Server exit '+code));}});});
 const routes=['/','/first/','/third/','/src/hub.mjs','/src/stage-catalog.mjs','/src/app.mjs','/third/engine.mjs','/third/render.js','/third/vendor/three.module.min.js','/third/vendor/three.core.min.js','/third/vendor/LICENSE-three.txt','/second/','/final/','/src/night/app.mjs','/src/night/render.mjs','/vendor/three/three.module.min.js','/src/cup.mjs'];
 const responses=await Promise.all(routes.map(async route=>{const response=await fetch(base+route);assert.equal(response.status,200,route);const content=await response.text();assert(content.length>0,route);if(/\.(mjs|js)$/.test(route))assert.match(response.headers.get('content-type'),/javascript/);return content;}));
 assert(responses[0].includes('playableStages'));assert(responses[1].includes('100<span>.00'));assert(responses[2].includes('playControls'));assert(responses[8].includes('three.core.min.js'));
 for(const route of['/first','/third']){const redirect=await fetch(base+route,{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),route+'/');}
 const missing=await fetch(base+'/unknown/');assert.equal(missing.status,404);
 }finally{server.kill();}
});
