import test from 'node:test';import assert from 'node:assert/strict';
import {NightGame} from '../src/night/engine.mjs';import {NightRenderer} from '../src/night/render.mjs';import {FINAL_RULES} from '../src/night/geometry.mjs';
const run=(g,n,i={})=>{for(let k=0;k<n;k++)g.step(1/120,i);};
function game(area){const g=new NightGame('final');g.reset({area,practice:true});return g;}
test('speed climbing requires physical HOLD and fresh JUMP, no charge, with exactly .2s between accepted presses',()=>{
 const g=game(0);run(g,120,{simple:true,jump:true});assert.equal(g.q,0);run(g,1);run(g,1,{simple:true,hold:true,jump:true});assert.equal(g.hand,1);assert.equal(g.charge,0);
 run(g,1,{simple:true,hold:true});run(g,1,{simple:true,hold:true,jump:true});assert.equal(g.hand,1);run(g,21,{simple:true,hold:true});run(g,1,{simple:true,hold:true,jump:true});assert.equal(g.hand,2);
 run(g,240,{simple:true,hold:true,jump:true});assert.equal(g.hand,2);assert(Math.abs(g.q-1.06)<1e-8);assert.equal(FINAL_RULES.climbInterval,.2);
});
for(const [ticks,expected]of[[53,false],[54,true],[60,true],[66,true],[67,false]])test('ladder accepts only 90–100%, released at tick '+ticks,()=>{
 const g=game(1);run(g,1,{simple:true,hold:true});run(g,ticks,{simple:true,jump:true});run(g,1,{simple:true});assert.equal(g.state==='barFlight',expected);
});
test('rope cannot use synthetic HOLD from JUMP and cannot repeat pulls while JUMP stays down',()=>{
 const g=game(2);run(g,120,{simple:true,jump:true});assert.equal(g.ropeCharge,0);assert.equal(g.q,0);run(g,1);run(g,50,{simple:true,hold:true});run(g,1,{simple:true,hold:true,jump:true});assert.equal(g.q,0);
 run(g,5,{simple:true,hold:true});run(g,1,{simple:true,hold:true,jump:true});assert.equal(g.q,.275);run(g,180,{simple:true,hold:true,jump:true});assert.equal(g.q,.275);
});
class Unbatched extends NightRenderer{bakeStatic(){}}
test('tower crossbeams occupy the previously open sides and final bar, posts and hands rotate together',()=>{
 const g=game(1),r=new Unbatched(null,g,{headless:true});run(g,1,{simple:true,hold:true});r.frame(1/60);r.scene.updateMatrixWorld(true);
 const bar=r.dynamic.find(o=>o.kind==='barFinal').mesh,axis=bar.matrixWorld.elements;assert(Math.abs(axis[4])>.99);assert(Math.abs(axis[6])<1e-8);assert.equal(r.actor.rotation.y,0);
 assert(!r.world.children.some(o=>o.userData.finalSpider));assert.equal(g.course[0].name,'スピードクライミング');
 const beams=r.world.children.filter(o=>o.geometry?.parameters.height===4.2&&o.geometry?.parameters.radiusTop===.07);assert.equal(beams.length,28);for(const b of beams){assert(Math.abs(b.position.x)===2.1);assert(Math.abs(b.position.z)<1e-8);}
 for(const hand of r.hands){const m=hand.matrixWorld.elements;assert(Math.abs(m[14])<1e-8);assert(Math.abs(m[13]-bar.position.y)<1e-8);}
});

test('retry clears previous climbing and rope targets before the first new pull',()=>{const g=game(0);run(g,1,{hold:true,jump:true});run(g,100,{hold:true});assert.equal(g.goal,.53);g.reset({practice:true});assert.equal(g.goal,0);run(g,1,{hold:true,jump:true});assert.equal(g.goal,.53);g.reset({area:2,practice:true});run(g,60,{hold:true});run(g,1,{hold:true,jump:true});assert.equal(g.q,.275);g.reset({area:2,practice:true});assert.equal(g.ropeCharge,0);assert.equal(g.goal,0);assert.equal(g.q,0);});
