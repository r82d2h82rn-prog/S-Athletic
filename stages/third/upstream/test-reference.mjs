import {aimPole} from './test-support/pole.mjs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game,COURSE} from './src/engine.mjs';
import {controlsFor} from './src/controls.mjs';
import {BURST} from './src/burst.mjs';
import {athleteDirection,athletePose} from './src/motion.mjs';
import {Renderer} from './src/render.js';
const dt=1/120,tick=(g,n,raw={})=>{for(let i=0;i<n;i++)g.step(dt,controlsFor(g,raw));};
// Hold climbs; the cylinder carries the athlete even with no lateral input.
for(const n of COURSE.filter(n=>n.kind==='pole')){
 const g=new Game();g.reset(1);g.enter(n.id);tick(g,120,{brace:true});assert.equal(g.poleTravel,0);assert(g.climb>=44);assert.equal(g.angle,0);
 const facing=athleteDirection(g);tick(g,240,{swing:true});assert(g.poleTravel>.8);assert(g.climb>=44&&g.climb<=46);assert.equal(g.state,'hang');assert.equal(g.omega,0);assert(Math.abs(athleteDirection(g).x-Math.cos(g.poleBodyAngle()))<1e-9);assert(Math.hypot(athleteDirection(g).x-facing.x,athleteDirection(g).z-facing.z)>.1);
 assert.equal(g.poleSpin[n.id]||0,g.poleAngle(n));const spin=g.poleSpin[n.id];tick(g,30);if(n.spin)assert(g.poleSpin[n.id]>spin);else assert.equal(g.poleSpin[n.id],spin);
 tick(g,120,{brace:true});
 aimPole(g,input=>g.step(dt,controlsFor(g,input)));
 const pose=athletePose(g),beforeY=pose.feet[0][1];g.step(dt,controlsFor(g,{jump:true}));assert(g.poleKick&&g.state==='hang');tick(g,12);assert(athletePose(g).feet[0][1]>beforeY,'knees load before the push');tick(g,23);assert(athletePose(g).feet[0][1]<beforeY,'leg extension precedes release');tick(g,8,{brace:true});assert.equal(g.state,'fly');tick(g,200,{brace:true});assert.equal(g.nodeIndex,n.id+1);assert.equal(g.status,'playing');
 tick(g,120);assert.equal(g.status,'playing','releasing Hold after a catch cannot drop the athlete');
}
// Entering the unchanged forgiving catch volume needs Hold, including the bar-to-pole transition.
for(const brace of[false,true])for(const n of COURSE.filter(n=>n.kind==='pole')){
 const g=new Game();g.reset();g.enter(n.id-1);g.state='fly';g.flightTime=.2;g.p={x:n.x-5,y:n.y-35,z:n.z,vx:30,vy:0,vz:0};g.step(dt,controlsFor(g,{brace}));assert.equal(g.nodeIndex===n.id,brace);assert.equal(g.status,brace?'playing':'falling');
}
console.log('PASS video sidewinder: orbit, continuous 1/3 rotation, fixed 2/4, delayed leg kick, Hold ascent, catch and release safety');
const g=new Game();g.reset(4);const r=new Renderer({getBoundingClientRect:()=>({width:1200,height:600})},g,{headless:true});
for(const n of COURSE.filter(n=>n.kind==='burst')){
 const o=r.obstacles.find(o=>o.n.id===n.id);assert.equal(o.blades.length,n.rotating?6:2);assert(o.bolts.length>0&&o.axle);assert(r.mat.brushed.map.isDataTexture);assert.notEqual(o.gripLip.parent,o.root);
 if(!n.rotating){g.enter(n.id);tick(g,100,{swing:true,brace:true});assert.equal(g.burstAngle(n),0);continue;}
 g.reset(4);g.enter(n.id);g.offset=n.rotationAt;g.step(dt,{swing:true});
 let phases=new Set();for(let i=0;i<700&&!g.burstDone;i++){g.step(dt,{brace:true});phases.add(g.rotation[g.burstKey()].phase);}
 assert(phases.has('rotating')&&phases.has('regrip')&&phases.has('settled'));assert.equal(Math.abs(g.burstAngle(n)),BURST.turn);assert.equal(g.status,'playing');r.frame(.01);r.scene.updateMatrixWorld(true);
 const hand=new THREE.Vector3(...r.pos(g.support().x,g.support().y,g.support().z));const lip=o.board.localToWorld(new THREE.Vector3(g.offset/100,-BURST.radius*Math.cos(BURST.gripAngle)/100,BURST.radius*Math.sin(BURST.gripAngle)/100));assert(hand.distanceTo(lip)<1e-8,'staggered rear grip and support match at the 60-degree stop');
 const offset=g.offset;tick(g,60,{move:true});assert(g.offset>offset);assert.equal(g.status,'playing');
}
console.log('PASS video BURST: radial triads, brushed lips, coloured cylinder, reach/grasp/60-degree pull and support alignment');
// Neither orbiting nor climbing is a prerequisite for a Sidewinder kick.
for(const n of COURSE.filter(n=>n.kind==='pole')){
 const g=new Game();g.reset(1);g.enter(n.id);tick(g,40);assert.equal(g.poleTravel,0);assert.equal(g.climb,0);
 g.launch();assert(g.poleKick,'kick must start without lateral input');tick(g,39,{brace:true});assert.equal(g.state,'fly');assert(Math.hypot(g.p.vx,g.p.vz)>300);assert(g.p.vy<0);
 // A low catch on the dropping second cylinder may still require climbing to reach the next one.
 const transfer=new Game();transfer.reset(1);transfer.enter(n.id);aimPole(transfer,input=>transfer.step(dt,controlsFor(transfer,input)));transfer.launch();tick(transfer,220,{brace:true});assert.equal(transfer.nodeIndex,n.id+1);assert.equal(transfer.status,'playing');
}
// Lateral movement continues beyond the old stop and has continuous direction/position there.
{const g=new Game();g.reset(1);g.poleTravel=.99;let prev=g.support();for(let i=0;i<180;i++){g.step(dt,{swing:true});const next=g.support();assert(Math.hypot(next.x-prev.x,next.z-prev.z)<1);prev=next;}assert(g.poleTravel>1.5);const before=g.poleTravel;tick(g,60);assert.equal(g.poleTravel,before);}
// Release keeps the loaded pose instead of popping to an unrelated air pose.
{const g=new Game();g.reset(1);tick(g,40);g.launch();tick(g,38);const before=athletePose(g);g.kickOff();const after=athletePose(g);for(const key of ['hands','feet','shoulders','hips'])assert.deepEqual(after[key],before[key]);assert.equal(after.angle,before.angle);}
console.log('PASS no lateral/climb kick gate, aligned backward ballistic transfers, continuous unlimited orbit and seamless push-off pose');
