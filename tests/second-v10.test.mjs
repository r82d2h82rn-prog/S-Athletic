import test from 'node:test';
import assert from 'node:assert/strict';
import {NightGame} from '../src/night/engine.mjs';
import {NightRenderer} from '../src/night/render.mjs';
import {FLOOR,SPIDER,SALMON} from '../src/night/geometry.mjs';
import {pilot} from './night-pilot.mjs';
const run=(g,n,i={})=>{for(let k=0;k<n;k++)g.step(1/120,i);};
function practice(id){const g=new NightGame();g.reset({practice:true,area:g.course.findIndex(a=>a.id===id)});return g;}
for(const simple of [false,true])test(`complete 60-second course without teleportation (${simple?'touch':'raw'} inputs)`,()=>{
 const g=new NightGame();g.reset();const step=g.step.bind(g);let last={...g.p},oldArea=0,landed=false;
 g.step=(dt,i)=>{const state=g.state;step(dt,{...i,simple});
 if(oldArea>0)assert(Math.hypot(g.p.x-last.x,g.p.y-last.y,g.p.z-last.z)<.11,`${g.a.id}/${state} → ${g.state}`);
 if(state!=='entry'&&g.state==='entry'){landed=true;assert.equal(g.y,0);assert.equal(g.v,0);assert.equal(g.vz,0);}
 last={...g.p};oldArea=g.area;
 };pilot(g);assert.equal(g.status,'complete',g.reason);assert.equal(g.limit,50);assert(g.time<50);assert(landed);
 assert(g.completed.includes('swing'));assert(!g.course.some(a=>a.id==='tank'));
});
test('landing plants both feet and stays in place until the player presses forward',()=>{
 const g=practice('unstable');g.q=g.a.length+.6;g.y=.01;g.v=3;g.vz=.2;g.vy=-1;g.state='air';run(g,2);assert.equal(g.state,'entry');
 const p={...g.p};run(g,120);assert.deepEqual(g.p,p);assert.equal(g.v,0);run(g,120,{forward:1});assert(g.p.x>p.x);
});
for(const id of ['salmonUp','salmonDown','spider','swing','swim'])test(id+' enters through a visible trajectory rather than attaching at a new coordinate',()=>{
 const g=practice(id),before={...g.p};run(g,1,{simple:true,jump:true,hold:true,forward:1});
 assert.equal(g.state,'approach');assert.deepEqual(g.p,before);const t=g.approach.duration;
 run(g,1,{simple:true,hold:true,forward:1});assert(Math.hypot(g.p.x-before.x,g.p.y-before.y)<.12);
 run(g,Math.ceil(t*120)+2,{simple:true,hold:true});assert.notEqual(g.state,'approach');assert.equal(g.status,'playing');
});
test('both bridge catches require raw HOLD even when simplified controls are enabled',()=>{
 const no=practice('unstable');run(no,1,{simple:true,jump:true});run(no,220,{simple:true});assert.equal(no.status,'failed');assert(!no.grabbed);
 const yes=practice('unstable');run(yes,1,{simple:true,jump:true,hold:true});run(yes,130,{simple:true,hold:true});assert.equal(yes.state,'board');
 // Move to the end of the first board by actual hand-over-hand input, then jump without HOLD.
 run(yes,150,{simple:true,forward:1});run(yes,1,{simple:true,jump:true});run(yes,220,{simple:true});assert.equal(yes.status,'failed');
});
test('the drop does not move the wall and requires HOLD throughout the descent',()=>{
 const g=practice('spider');g.state='spider';g.grabbed=true;g.spiderPanel=4;g.q=SPIDER[4].right;g.y=SPIDER[4].feet-FLOOR;g.pose();
 run(g,1,{simple:true,descend:true,hold:true});assert.equal(g.state,'spiderDrop');run(g,12,{simple:true,hold:true});assert(g.p.y<SPIDER[4].feet);
 run(g,1,{simple:true});assert.equal(g.state,'air');assert(!g.grabbed);run(g,220);assert.equal(g.status,'failed');
 assert(Math.abs(SPIDER[4].feet-SPIDER[5].feet-1.8)<1e-8);
});
test('a well-timed metal release heads toward the bank and lands within its bounds',()=>{
 const g=practice('metal');run(g,100,{forward:1});run(g,1,{simple:true,jump:true,hold:true,forward:1});
 for(let k=0;k<500&&!(g.state==='spin'&&g.angle>.5);k++)g.step(1/120,{simple:true,hold:true});
 assert.equal(g.state,'spin');run(g,1,{simple:true,jump:true,hold:true});assert.equal(g.state,'air');
 assert(g.v>0);assert(g.vz*g.z<=0);for(let k=0;k<240&&g.state==='air';k++)g.step(1/120,{});
 assert.equal(g.state,'entry');assert(g.q>=-3&&g.q<=0);assert.equal(g.y,0);
});
class Unbatched extends NightRenderer{bakeStatic(){}}
test('every area owns a separate pool and the spider has twelve framed transparent stationary panels',()=>{
 const g=new NightGame(),r=new Unbatched(null,g,{headless:true});assert.equal(r.waters.length,g.course.length);
 assert.deepEqual(r.waters.map(w=>w.userData.pool),g.course.map(a=>a.id));
 const panes=r.world.children.filter(o=>o.userData.spiderPanel!==undefined);assert.equal(panes.length,12);assert(panes.every(o=>o.material.transparent&&!o.material.depthWrite));
 const positions=panes.map(o=>o.position.clone());g.reset({area:3,practice:true});g.q=10.7;g.state='spiderDrop';g.y=1;r.frame(1/60);
 panes.forEach((p,k)=>assert(p.position.equals(positions[k])));assert(!r.dynamic.some(o=>o.kind==='dropGroup'||o.kind==='tank'));
 const ladder=g.course[1],postX=ladder.start+ladder.length/2+.12,barX=ladder.start+ladder.length/2+SALMON.offset;
 assert(barX<postX);assert(r.dynamic.some(o=>o.kind==='swing'));
 const wall=r.dynamic.find(o=>o.kind==='wall');assert.equal(wall.mesh.children[0].material,r.mat('hazard','#ffffff'));
 assert.equal(r.belt.material,r.mat('tread','#ffffff'));
});
