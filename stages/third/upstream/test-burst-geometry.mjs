import assert from 'node:assert/strict';
import {Game,COURSE} from './src/engine.mjs';
import {BURST,burstFins,burstGrip} from './src/burst.mjs';
import {obstacleShapes} from './src/collision.mjs';
const dt=1/120,tick=(g,n,input={})=>{for(let i=0;i<n&&g.status==='playing';i++)g.step(dt,input);},units=COURSE.filter(n=>n.kind==='burst');
assert.deepEqual(units.map(n=>n.z),[0,0,-30,-90]);assert.equal(units[3].rotationLoadMultiplier,1.1);
for(const n of units){
 const fins=burstFins(n);assert.equal(fins.length,n.rotating?6:2);assert.equal(fins.filter(f=>f.grip).length,n.rotating?6:1);
 if(n.rotating){assert.equal(n.rotationAt,n.len/2);for(const half of[0,1]){const f=fins.filter(f=>f.half===half);assert.equal(f.length,3);assert(Math.abs(f[1].angle-f[0].angle-Math.PI*2/3)<1e-8);assert(Math.abs(f[2].angle-f[1].angle-Math.PI*2/3)<1e-8);}assert.equal(fins[3].angle-fins[0].angle,BURST.turn);}
 else assert.deepEqual(fins.map(f=>f.angle),[0,Math.PI]);
 const g=new Game();g.reset(4);assert.equal(obstacleShapes(g,n).filter(s=>s.part==='fin').length,fins.length);
}
// No rotation away from the midpoint; Move waits there until the deliberate reach/grasp.
{const g=new Game();g.reset(4);g.step(dt,{swing:true});assert.equal(g.rotation[g.burstKey()].phase,'idle');tick(g,600,{move:true});assert.equal(g.offset,g.node.len/2);assert.equal(g.rotation[g.burstKey()].angle,0);}
function rotate(index){const g=new Game();g.reset(4);g.enter(units[index].id,{offset:units[index].rotationAt});g.step(dt,{swing:true,brace:true});const r=g.rotation[g.burstKey()];assert.equal(r.phase,'regrip');tick(g,20,{brace:true});assert.equal(r.angle,0,'grasp the diagonal upper lip before turning');const p=burstGrip(g,g.node,g.offset);assert(p.y<0&&p.z<0);for(let i=0;i<700&&!g.burstDone&&g.status==='playing';i++)g.step(dt,{brace:true});assert.equal(g.status,'playing');assert(g.burstDone);assert.equal(r.angle,Math.PI/3);assert(Math.abs(g.support().y-g.node.y)<1e-8&&Math.abs(g.support().z-g.node.z)<1e-8);return g;}
const first=rotate(0),last=rotate(3),loss=g=>g.shocks.reduce((s,x)=>s+x.loss,0);assert.equal(loss(first),12);assert(Math.abs(loss(last)-13.2)<1e-8);
// Time/holding consumption during the actual rotation phases is also 10% higher.
for(const phase of['regrip','rotating']){const a=new Game(),b=new Game();a.reset(4);b.reset(4);b.enter(units[3].id);for(const g of[a,b])g.rotation[g.burstKey()]={phase,angle:.2};a.fatigue(1,{brace:true});b.fatigue(1,{brace:true});assert(Math.abs((100-b.stamina)/(100-a.stamina)-1.1)<1e-8);}
// Every join, including 30/60 cm depth changes, is continuous and can pause mid reach.
for(let i=0;i<3;i++){
 const n=units[i],g=new Game();g.reset(4);if(n.rotating)g.rotation[n.id]={phase:'settled',angle:BURST.turn,regripAlpha:1};g.enter(n.id,{offset:n.len-12});g.burstDone=true;
 let saw=false,paused=false,last={...g.p},maxStep=0;
 for(let frame=0;frame<700&&g.nodeIndex===n.id;frame++){
  g.step(dt,{move:true});maxStep=Math.max(maxStep,Math.hypot(g.p.x-last.x,g.p.y-last.y,g.p.z-last.z));last={...g.p};
  if(g.handover){saw=true;if(!paused&&g.handover.progress>.3){const p={...g.p},time=g.total;tick(g,30);assert.deepEqual(g.p,p);assert(g.total>time);paused=true;}}
 }
 assert(saw&&paused);assert.equal(g.nodeIndex,units[i+1].id);assert(maxStep<1.2,`join ${i} teleported ${maxStep}cm`);assert.equal(g.p.z,units[i+1].z);assert.equal(g.offset,12);
}
console.log('PASS BURST geometry: two 120-degree triads staggered 60 degrees, center-only reach/grasp/pull, red lower/upper fins, 30/60cm depth, +10% cost and continuous pausable joins');
