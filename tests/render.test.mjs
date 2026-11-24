import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/render.mjs';
import {Game} from '../src/physics.mjs';
import {grips,AREAS} from '../src/course.mjs';
test('Three.js migration preserves finite obstacle and athlete geometry at every area',()=>{
 const canvas={clientWidth:844,clientHeight:390,addEventListener(){}},ctx=new Proxy({measureText:t=>({width:t.length*6})},{get:(t,k)=>t[k]||(()=>{})});
 const game=new Game(),r=new Renderer(canvas,{getContext:()=>ctx},game,{headless:true});
 assert(!grips.some(n=>n.kind==='spider'));assert.equal(AREAS[10].type,'press');
 for(let stage=0;stage<AREAS.length;stage++){game.reset({practice:true,stage});r.render(1/60);let meshes=0;r.scene.traverse(o=>{if(!o.isMesh)return;meshes++;for(const name of ['position','normal']){const attr=o.geometry.getAttribute(name);if(attr)assert(attr.array.every(Number.isFinite),`${stage}/${name}`);}assert(o.material.isMeshStandardMaterial);});assert(meshes>20);assert(r.vp.every(Number.isFinite));}
});
