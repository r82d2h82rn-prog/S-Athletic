import assert from 'node:assert/strict';
import {Game} from './src/engine.mjs';
import {BURST} from './src/burst.mjs';
import {BODY,athletePose,feetReach,joint2} from './src/motion.mjs';
import {pilot,DT} from './test-support/pilot.mjs';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const {trace}=pilot();const g=new Game();g.reset();let frames=0;
for(const input of trace){
 g.step(DT,input);const p=athletePose(g);
 for(let i=0;i<2;i++){
  for(const [a,b,c,l1,l2] of [[p.shoulders[i],p.elbows[i],p.hands[i],BODY.upperArm,BODY.foreArm],[p.hips[i],p.knees[i],p.feet[i],BODY.thigh,BODY.shin]]){
   assert([...a,...b,...c].every(Number.isFinite));assert(Math.abs(distance(a,b)-l1)<.002);assert(Math.abs(distance(b,c)-l2)<.012,`limb overreach at ${g.nodeIndex}: ${distance(b,c)}`);
  }
 }
 const lowest=Math.max(...p.feet.map(f=>(-f[1]*Math.cos(p.angle)-f[2]*Math.sin(p.angle))*100));assert(Math.abs(feetReach(g)-lowest)<1e-8);frames++;
}
assert(joint2([0,0,0],[0,.5,0],.3,.3,[0,1,0]).every(Number.isFinite));
console.log(`PASS articulated arms/legs, foot contact and finite poses across ${frames} input-only replay frames`);
{const g=new Game();g.reset(1);g.sinceCatch=1;g.pose.climb=Math.PI/2;const p=athletePose(g);assert(Math.abs(p.hands[0][1]-p.hands[1][1])>.1);assert(Math.abs(p.feet[0][1]-p.feet[1][1])>.1);}
{const g=new Game();g.reset(4);g.rotation[g.burstKey()]={phase:'rotating',angle:BURST.turn/2,omega:.5};assert(athletePose(g).angle>.15);g.rotation[g.burstKey()].phase='settled';assert.equal(athletePose(g).angle,0);}
console.log('PASS alternating cylinder climbing limbs and load-driven BURST body lean');
