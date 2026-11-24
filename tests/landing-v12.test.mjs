import test from 'node:test';import assert from 'node:assert/strict';
import {NightGame} from '../src/night/engine.mjs';import {NightRenderer} from '../src/night/render.mjs';import {FLOOR,WATER,BACKSTREAM} from '../src/night/geometry.mjs';import {pilot} from './night-pilot.mjs';
const run=(g,n,i={})=>{for(let k=0;k<n;k++)g.step(1/120,i);};
test('each shore landing commits the clear and selects the next area in that physics tick',()=>{
 const g=new NightGame();g.reset();const step=g.step.bind(g);let landings=0;
 g.step=(dt,i)=>{const a=g.a,events=g.events.length;step(dt,i);if(g.events.slice(events).includes('land')){landings++;assert.equal(g.area,a.index+1);assert.equal(g.state,'entry');assert(g.completed.includes(a.id));assert.equal(g.p.y,FLOOR);assert.equal(g.v,0);assert(g.q<=0&&g.q>=-3.1);}};
 pilot(g);assert.equal(g.status,'complete',g.reason);assert.equal(landings,8);
});
test('the next challenge can be requested on the landing bank and runs into a continuous takeoff',()=>{
 const g=new NightGame();g.reset({practice:true});g.q=g.a.length+.7;g.y=0;g.pose();const p={...g.p};g.land();assert.equal(g.a.id,'salmonUp');assert.deepEqual(g.p,p);
 run(g,1,{simple:true,jump:true});for(let k=0;k<200&&g.state==='entry';k++)g.step(1/120,{simple:true});assert.equal(g.state,'ready');
 run(g,1,{simple:true});assert.equal(g.state,'approach');let last={...g.p};for(let k=0;k<80;k++){g.step(1/120,{simple:true});assert(Math.hypot(g.p.x-last.x,g.p.y-last.y,g.p.z-last.z)<.12);last={...g.p};}assert.equal(g.state,'ladder');
});
test('goal contact immediately ends the clock without an extra HOLD or a delayed clear',()=>{
 const g=new NightGame();g.reset({area:9});g.q=g.a.length-.56;g.pose();run(g,1,{forward:1});assert.equal(g.status,'complete');assert(g.events.includes('clear'));const t=g.time;run(g,480);assert.equal(g.time,t);
});
test('backstream has a higher surface and the crawl body is aligned along the course',()=>{
 const g=new NightGame();g.reset({area:7,practice:true});run(g,1,{forward:1});run(g,70,{forward:1});assert.equal(g.state,'swim');const r=new NightRenderer(null,g,{headless:true});r.frame(1/60);r.scene.updateMatrixWorld(true);
 const water=r.waters.find(w=>w.userData.pool==='swim');assert.equal(water.position.y,BACKSTREAM.waterY);assert(BACKSTREAM.waterY>=WATER+.35);assert(Math.abs(g.p.y-BACKSTREAM.waterY-BACKSTREAM.swimmerOffset)<1e-8);
 const e=r.actor.matrixWorld.elements;assert(Math.abs(e[4]-1)<1e-8);assert(Math.abs(e[5])<1e-8);assert(Math.abs(e[6])<1e-8);
 for(const phase of[Math.PI/2,.3]){g.stroke=phase;r.frame(1/60);r.scene.updateMatrixWorld(true);const heights=r.hands.map(h=>h.matrixWorld.elements[13]);if(phase===Math.PI/2){assert(Math.max(...heights)>water.position.y+.3);assert(Math.min(...heights)<water.position.y-.2);}const kicks=r.feet.map(f=>f.position.z);assert(Math.abs(kicks[0]+kicks[1]-.12)<1e-8);}
});
