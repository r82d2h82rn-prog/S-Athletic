import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NightGame} from '../src/night/engine.mjs';
import {NightRenderer} from '../src/night/render.mjs';
import {SPIDER} from '../src/night/geometry.mjs';
import {installTouchGuard} from '../src/touch-guard.mjs';
const run=(g,n,i={})=>{for(let k=0;k<n;k++)g.step(1/120,i);};
function swing(){const g=new NightGame();g.reset({practice:true,area:g.course.findIndex(a=>a.id==='swing')});run(g,1,{simple:true,jump:true,hold:true});run(g,70,{simple:true,hold:true});assert.equal(g.state,'swing');return g;}
test('holding forward advances one rung only; a released and renewed press advances exactly one more',()=>{
 const g=swing();run(g,180,{simple:true,forward:1});assert(Math.abs(g.swingQ-1.28)<1e-8);run(g,360,{simple:true,forward:1});assert(Math.abs(g.swingQ-1.28)<1e-8);
 run(g,1,{simple:true});run(g,180,{simple:true,forward:1});assert(Math.abs(g.swingQ-1.96)<1e-8);
});
test('rapid taps queue rung targets without teleportation or auto-repeat',()=>{
 const g=swing();let last={...g.p};for(let k=0;k<8;k++){run(g,1,{simple:true,forward:1});assert(Math.hypot(g.p.x-last.x,g.p.y-last.y,g.p.z-last.z)<.08);last={...g.p};run(g,1,{simple:true});last={...g.p};}
 assert(Math.abs(g.swingGoal-(.6+8*.68))<1e-8);run(g,300,{simple:true});assert(Math.abs(g.swingQ-g.swingGoal)<1e-8);
});
test('touch guard cancels gameplay zoom gestures without cancelling click, pointer or menu input',()=>{
 const listeners=new Map(),button={addEventListener:(name,fn,options)=>listeners.set(name,{fn,options})};
 installTouchGuard({querySelectorAll:()=>[button]});assert.deepEqual([...listeners.keys()],['touchend','dblclick']);assert.equal(listeners.get('touchend').options.passive,false);
 let canceled=0;listeners.get('touchend').fn({cancelable:true,preventDefault(){canceled++;}});listeners.get('dblclick').fn({preventDefault(){canceled++;}});assert.equal(canceled,2);
 listeners.get('touchend').fn({cancelable:false,preventDefault(){throw Error('noncancelable event');}});
});
test('all four built stages include the gesture wrapper without adding a global viewport lock',async()=>{
 for(const stage of ['first','second','third','final']){const page=await readFile(new URL('../dist/'+stage+'/index.html',import.meta.url),'utf8');assert(page.includes('/src/touch-guard.css'));assert(page.includes('/src/touch-guard.mjs'));const source=await readFile(new URL('../'+(stage==='first'?'first.html':stage==='third'?'stages/third/upstream/src/template.html':'night.html'),import.meta.url),'utf8');assert.equal(page.match(/<meta[^>]+name="viewport"[^>]+>/)?.[0],source.match(/<meta[^>]+name="viewport"[^>]+>/)?.[0]);}
});
class Unbatched extends NightRenderer{bakeStatic(){}}
test('only the final independent spider wall pair has red framing',()=>{
 const g=new NightGame(),r=new Unbatched(null,g,{headless:true}),a=g.course.find(a=>a.id==='spider');
 for(const [j,p]of SPIDER.entries())for(const z of[-.64,.64]){
 const border=r.world.children.find(o=>o.isMesh&&Math.abs(o.position.x-a.start-p.left)<1e-8&&Math.abs(o.position.z-z)<1e-8&&o.geometry.parameters.width===.075);
 assert(border,'each panel has its own visible border');assert.equal(border.material.color.getHexString(),j===SPIDER.length-1?'ed3d4d':'f2cf21');
 }
});

test('click-only challenge button is excluded from touchend cancellation while gameplay controls stay protected',()=>{const make=(id,input,action,third=false)=>({id,input,action,third,events:[],addEventListener(name){this.events.push(name);}}),challenge=make('challenge'),forward=make('forward',false,true),jump=make('jump',true),third=make('hold',false,false,true),buttons=[challenge,forward,jump,third];installTouchGuard({querySelectorAll:selector=>buttons.filter(b=>selector.split(',').some(s=>s.trim()==='[data-input]'?b.input:s.trim()==='[data-action]'?b.action:s.trim()==='#playControls button'?b.third:s.trim()==='#controls button'))});assert.deepEqual(challenge.events,[]);for(const b of[forward,jump,third])assert.deepEqual(b.events,['touchend','dblclick']);});
