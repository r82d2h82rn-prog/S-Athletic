import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game,COURSE} from './src/engine.mjs';
import {Renderer} from './src/render.js';
import {athletePose} from './src/motion.mjs';
import {controlsFor} from './src/controls.mjs';
import {bodySamples,applyContact,obstacleShapes,solveImpulse,contactDynamics} from './src/collision.mjs';
const dt=1/120,canvas={getBoundingClientRect:()=>({width:1200,height:600})},close=(a,b)=>Math.abs(a-b)<1e-8;
// Continuous cylinder motors are independent of player input and the currently played area.
{const g=new Game();g.reset();const r=new Renderer(canvas,g,{headless:true});for(let i=0;i<240;i++)g.step(dt);r.frame(.01);
 for(const n of COURSE.filter(n=>n.kind==='pole')){assert.equal(g.poleAngle(n),n.spin?g.time*.72:0);assert.equal(r.obstacles.find(o=>o.n.id===n.id).cylinder.rotation.y,g.poleAngle(n));}
 const n=COURSE.find(n=>n.kind==='pole'&&n.spin),shape=obstacleShapes(g,n)[0];assert(Math.hypot(...contactDynamics(g,{node:n,shape,point:[n.x+21,n.y,n.z],normal:[1,0,0]}).velocity)>10);
}
// Hold and lateral motion have separate axes; neither input latches on release.
{const g=new Game();g.reset(1);for(let i=0;i<120;i++)g.step(dt,controlsFor(g,{swing:true}));assert.equal(g.climb,0);assert(g.poleTravel>.4);const x=g.poleTravel;
 for(let i=0;i<120;i++)g.step(dt,controlsFor(g,{brace:true}));assert.equal(g.poleTravel,x);assert(g.climb>=44);const height=g.climb;for(let i=0;i<120;i++)g.step(dt,controlsFor(g,{}));assert.equal(g.climb,height);assert.equal(g.status,'playing');}
// At every cliff, failed backside jumps preserve full orientation, reach and momentum.
for(const n of COURSE.filter(n=>n.kind==='cliff'))for(const rotated of[false,true]){
 const g=new Game();g.reset(3);g.enter(n.id);g.state='fly';g.flightTime=.24;g.rotated=rotated;g.angle=.65;g.p.vx=130;g.p.vy=-55;g.p.vz=-170;
 const r=new Renderer(canvas,g,{headless:true});r.frame(.01);r.scene.updateMatrixWorld(true);const q=r.actor.quaternion.clone(),p=r.actor.position.clone(),pose=athletePose(g),samples=bodySamples(g);g.fail('cliff miss');r.frame(.01);
 assert(g.cliffFall&&!g.edgeFall);assert.equal(g.cliffFall.turn,rotated?Math.PI:0);assert(q.angleTo(r.actor.quaternion)<1e-7);assert(r.actor.position.distanceTo(p)<1e-8);assert.deepEqual(athletePose(g).hands,pose.hands);
 assert(bodySamples(g).every((s,i)=>s.p.every((v,j)=>close(v,samples[i].p[j]))));g.step(dt);assert.equal(g.p.vx,130);assert.equal(g.p.vz,-170);assert(g.p.vy>-55);
 g.cliffFall.time=.45;const release=athletePose(g);assert(release.hands.every(h=>h[1]>-.2),'arms remain above the head after release');assert(release.feet.every(f=>f[1]>-2));assert.notEqual(release.feet[0][1],release.feet[1][1]);
}
// Only Sidewinder uses sliding contact; cliffs retain the ordinary collision response.
{const v=solveImpulse([300,200,40],[-1,0,0],[0,0,0],0,{restitution:0,frictionCoefficient:.04});assert(close(v.velocity[0],0));assert(v.velocity[1]>180);}
for(const kind of['pole','cliff']){
 const g=new Game();g.reset(kind==='pole'?1:3);const n=g.node,shape=obstacleShapes(g,n)[0],prev={x:n.x-40,y:n.y,z:n.z,vx:300,vy:180,vz:20},next={...prev,x:n.x+10};g.p={...next};
 const hit={node:n,shape,t:.5,point:[n.x,n.y,n.z],normal:[-1,0,0],part:'hand'};const d=contactDynamics(g,hit),expected=solveImpulse([next.vx,next.vy,next.vz],hit.normal,d.velocity,d.inv,kind==='pole'?{restitution:0,frictionCoefficient:.04}:{});assert(applyContact(g,hit,prev,next));assert([g.p.vx,g.p.vy,g.p.vz].every((v,i)=>close(v,expected.velocity[i])));if(kind==='pole'){assert(g.p.vx>=-1e-8,'pole contact slides');assert(g.p.vy>150);}else{assert(g.p.vx<0,'cliff retains ordinary impact response');}assert.equal(g.status,'falling');assert(kind==='pole'?g.poleFall:g.cliffFall);
 if(kind==='pole'){assert(g.poleFall.near);const y=g.p.y,vy=g.p.vy;g.step(dt);assert(g.p.y>y);assert(g.p.vy<vy+981*dt,'initial contact glide has drag');}
}
console.log('PASS cliff video fall: preserved backside orientation, overhead release and soft knees; continuous cylinders, Hold-only ascent, pole-only sliding and ordinary cliff contacts');

// Player and cylinder keep a fixed relative angle with no input, from any catch time.
for(const n of COURSE.filter(n=>n.kind==='pole')){
 const g=new Game();g.reset(1);g.time=7;g.enter(n.id);const a=g.support(),initial=g.poleBodyAngle();
 for(let i=0;i<120;i++)g.step(dt,{});const b=g.support(),angle=g.poleBodyAngle();
 assert(close(angle-initial,-(n.spinRate||0)));assert(close(Math.hypot(b.x-n.x,b.z-n.z),22));
 if(n.spin)assert(Math.hypot(b.x-a.x,b.z-a.z)>10);else assert(close(a.x,b.x)&&close(a.z,b.z));
 assert.equal(g.poleTravel,0);assert.equal(g.climb,0);assert.equal(g.status,'playing');
 g.poleTravel=.7;g.climb=50;g.kickOff();const release=g.poleBodyAngle();g.time+=.2;assert.equal(g.poleBodyAngle(),release,'airborne player is no longer carried by the motor');
}
console.log('PASS Sidewinder carries player position and facing at motor speed, including late catches and release');
