import {mkdir,cp,copyFile,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {verifyThird} from './scripts/verify-third.mjs';
import {createHash} from 'node:crypto';
import {STAGES} from './src/stage-catalog.mjs';
const base=import.meta.url,root=p=>new URL(p,base),dist=root('dist/'),first=STAGES.find(s=>s.id==='first'),third=STAGES.find(s=>s.id==='third');
await verifyThird();
await rm(dist,{recursive:true,force:true});
await mkdir(root('dist'+first.path),{recursive:true});await mkdir(root('dist'+third.path+'vendor/'),{recursive:true});
await cp(root('src'),root('dist/src'),{recursive:true});
await copyFile(root('index.html'),root('dist/index.html'));
await cp(root('vendor'),root('dist/vendor'),{recursive:true});
await cp(root('docs'),root('dist/docs'),{recursive:true});
for(const stage of ['second','final']){await mkdir(root('dist/'+stage),{recursive:true});await copyFile(root('night.html'),root('dist/'+stage+'/index.html'));}
await copyFile(root('first.html'),root('dist'+first.path+'index.html'));
const upstream=root('stages/third/upstream/');
let html=await readFile(new URL('src/template.html',upstream),'utf8');
const app=await readFile(new URL('src/app.js',upstream),'utf8');
if(!html.includes('/* APP */'))throw Error('3rd app injection marker is missing');
const hooks=await readFile(root('src/third-cup.mjs.txt'),'utf8');
const audioHook=await readFile(root('src/third-audio.mjs.txt'),'utf8');
html=html.replace('/* APP */',()=>"import {cupContext} from '/src/cup.mjs';\nimport {gameAudio} from '/src/game-audio.mjs';\n"+app+'\n'+audioHook+'\n'+hooks);
// Navigation-only wrapper. The archived gameplay, physics and UI source stay byte-identical.
html=html.replace('<div class="arena-tools">','<div class="arena-tools"><a class="stage-home icon-btn" href="/" aria-label="ステージ選択に戻る" title="ステージ選択">⌂</a>');
html=html.replace('</aside>','<a class="portrait-stage-home" href="/">ステージ選択に戻る</a></aside>');
html=html.replace('</style>',".live-hint{position:absolute!important;left:16px!important;top:100px!important;bottom:auto!important;right:auto!important;width:min(290px,37vw)!important;min-width:0!important;font-size:10px!important;background:#091527d9;padding:8px;pointer-events:none;z-index:3}#toast{top:245px!important;left:16px!important;right:auto!important;bottom:auto!important;transform:none!important;max-width:290px!important;text-align:left!important}"+'.arena-tools .stage-home{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #344052;border-radius:5px;color:#e4edf7;font-size:20px}.arena-top{right:248px}.portrait-stage-home{color:#83e6e4;font-size:13px;padding:12px}@media(max-width:740px) and (orientation:landscape){.arena-top{right:230px}}\n</style>');
await writeFile(root('dist'+third.path+'index.html'),html);
for(const entry of await readdir(new URL('src/',upstream))){if(!/\.(mjs|js)$/.test(entry)||entry==='app.js')continue;
 let content=await readFile(new URL('src/'+entry,upstream),'utf8');if(entry==='render.js'){if(!content.includes("from 'three'"))throw Error('3rd Three.js import changed');content=content.replace("from 'three'","from './vendor/three.module.min.js'");content="import {enhanceScene,pixelRatio,animatedWater} from '/src/visual-quality.mjs';\n"+content;content=content.replace('this.stage=game.stage;','this.stage=game.stage;if(!headless){enhanceScene({renderer:this.renderer,scene:this.scene,key:this.key,night:true});this.updateRealWater=animatedWater(this.water);}') .replace('if(this.renderer&&!this.contextLost)this.renderer.render(this.scene,this.camera);','this.updateRealWater?.(this.time);if(this.renderer&&!this.contextLost)this.renderer.render(this.scene,this.camera);').replaceAll('Math.min(globalThis.devicePixelRatio||1,1.6)','pixelRatio()').replaceAll('CylinderGeometry(1,1,1,12)','CylinderGeometry(1,1,1,24)').replaceAll('SphereGeometry(1,12,10)','SphereGeometry(1,24,18)').replaceAll('CylinderGeometry(1,.8,1,10)','CylinderGeometry(1,.8,1,24)');}
 await writeFile(root('dist'+third.path+entry),content);
}
for(const name of['three.module.min.js','three.core.min.js','LICENSE-three.txt'])await copyFile(root('vendor/three/'+name),root('dist'+third.path+'vendor/'+name));
await copyFile(root('THIRD_PARTY_NOTICES.md'),root('dist/THIRD_PARTY_NOTICES.md'));
console.log('Built one app: stage selection, all four stages and the one-life tournament. All runtime assets are local.');

// Browser-gesture wrapper shared by all stages; archived third-stage code is untouched.
for(const stage of STAGES.filter(s=>s.available)){const path=root('dist'+stage.path+'index.html');let page=await readFile(path,'utf8');page=page.replace('</head>','<link rel="stylesheet" href="/src/touch-guard.css"></head>').replace('</body>','<script type="module" src="/src/touch-guard.mjs"></script></body>');await writeFile(path,page);}

// Offline files are generated from the complete published app, including media.
for(const name of ['manifest.webmanifest','app-icon.svg'])await copyFile(root(name),root('dist/'+name));
for(const pathname of ['/',...STAGES.filter(s=>s.available).map(s=>s.path)]){const file=root('dist'+pathname+'index.html');let page=await readFile(file,'utf8');page=page.replace('</head>','<link rel="manifest" href="/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"></head>').replace('</body>','<script type="module" src="/src/offline.mjs"></script></body>');await writeFile(file,page);}
const offlineFiles=[];
async function collectOffline(dir=''){for(const entry of await readdir(root('dist/'+dir),{withFileTypes:true})){const path=dir+entry.name;if(entry.isDirectory())await collectOffline(path+'/');else if(!path.endsWith('.txt')&&!path.endsWith('.mjs.txt')&&path!=='src/offline-worker.mjs')offlineFiles.push(path);}}
await collectOffline();offlineFiles.sort();const hash=createHash('sha256');for(const path of offlineFiles){hash.update(path);hash.update(await readFile(root('dist/'+path)));}
hash.update(await readFile(root('src/offline-worker.mjs')));
const version=hash.digest('hex').slice(0,16),urls=offlineFiles.map(path=>'/'+path.replace(/(^|\/)index\.html$/,'$1'));
const worker=(await readFile(root('src/offline-worker.mjs'),'utf8')).replace('__OFFLINE_VERSION__',JSON.stringify(version)).replace('__OFFLINE_ASSETS__',JSON.stringify(urls));await writeFile(root('dist/sw.js'),worker);await writeFile(root('dist/offline-assets.json'),JSON.stringify({version,assets:urls}));
console.log(`Offline cache: ${urls.length} files, version ${version}.`);

