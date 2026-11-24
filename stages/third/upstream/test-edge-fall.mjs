import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game,COURSE} from './src/engine.mjs';
import {athletePose} from './src/motion.mjs';
import {bodySamples,applyContact,obstacleShapes} from './src/collision.mjs';
import {Renderer} from './src/render.js';
const dt=1/120,canvas={getBoundingClientRect:()=>({width:1200,height:600})};
// A failed edge flight retains its decayed flight angle and all limb positions at release.
for(const state of['hang','fly']){
 const g=new Game();g.reset(2);g.state=state;g.angle=.8;g.omega=1.2;g.flightTime=.25;g.p.vx=state==='fly'?180:0;g.p.vy=state==='fly'?-80:0;
 const r=new Renderer(canvas,g,{headless:true});r.frame(.01);r.scene.updateMatrixWorld(true);const before=athletePose(g),q=r.actor.quaternion.clone(),p=r.actor.position.clone(),points=bodySamples(g);
 g.fail('edge release');r.frame(.01);r.scene.updateMatrixWorld(true);const after=athletePose(g);assert.equal(after.angle,before.angle);assert(q.angleTo(r.actor.quaternion)<1e-7);assert(p.distanceTo(r.actor.position)<1e-8);
 for(const k of['hands','feet','elbows','knees'])assert.deepEqual(after[k],before[k]);assert(bodySamples(g).every((s,i)=>s.p.every((v,j)=>Math.abs(v-points[i].p[j])<1e-8)));
 assert(g.edgeFall);const vx=g.p.vx;assert(vx>0);g.step(dt);assert.equal(g.p.vx,vx,'release keeps tangential momentum');assert(g.p.vy>(state==='fly'?-80:-100*1.2*Math.sin(.8)));
 const a=athletePose(g);g.edgeFall.time=.45;const b=athletePose(g);assert.notDeepEqual(a.hands,b.hands);assert.notDeepEqual(a.feet,b.feet);assert.notDeepEqual(b.hands[0],b.hands[1]);
 for(let i=0;i<2;i++){const l=(a,b)=>Math.hypot(...a.map((v,j)=>v-b[j]));assert(Math.abs(l(b.shoulders[i],b.elbows[i])-.38)<.002);assert(Math.abs(l(b.elbows[i],b.hands[i])-.37)<.012);assert(Math.abs(l(b.hips[i],b.knees[i])-.44)<.002);assert(Math.abs(l(b.knees[i],b.feet[i])-.44)<.012);}
}
// A torso/acrylic collision uses the back-entry preparation; hand loss stays feet-first.
for(const [part,back]of[['hand',false],['torso',true]]){
 const g=new Game();g.reset(2);const n=COURSE.find(n=>n.kind==='edge'&&n.acrylic),shape=obstacleShapes(g,n).find(s=>s.part==='strut'),prev={x:n.x-50,y:n.y,z:n.z,vx:900,vy:60,vz:0},next={...prev,x:n.x+10};g.p={...next};
 applyContact(g,{node:n,shape,t:.5,point:[n.x,n.y+80,n.z],normal:[-1,0,0],part},prev,next);assert.equal(g.edgeFall.back,back);assert(Math.abs(g.tumble.wx)<=2.6&&Math.abs(g.tumble.wy)<=.9&&Math.abs(g.tumble.wz)<=2.2);assert.notEqual(g.p.vx,0);
 const speed=Math.abs(g.tumble.wz);g.updateImpactMotion(.2);assert(Math.abs(g.tumble.wz)<speed);
}
// Other areas retain the existing generic fall; live edge play never acquires the new pose.
for(const stage of[0,1,3,4,5]){const g=new Game();g.reset(stage);g.fail('other area');assert.equal(g.edgeFall,null);}
{const g=new Game();g.reset(2);const before=athletePose(g);g.edgeFall={time:9};assert.deepEqual(athletePose(g),before);g.edgeFall=null;g.tumble.wx=8;g.fail('limited rotation');for(let i=0;i<240;i++)g.updateImpactMotion(dt);assert(Math.abs(g.tumble.x)<1.2);}
console.log('PASS edge-only video fall: seamless release, retained swing/air momentum, independent arms/legs, impact-specific posture and restrained rotation');
