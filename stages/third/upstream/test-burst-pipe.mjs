import assert from 'node:assert/strict';
import {Game} from './src/engine.mjs';
import {controlsFor} from './src/controls.mjs';
const dt=1/120,tick=(g,s,input={})=>{for(let i=0;i<s/dt&&g.status==='playing';i++)g.step(dt,input);};
// Only the Move button moves hands. Hold has a real cost, but cannot start a rotation.
{const g=new Game();g.reset(4);tick(g,1,{brace:true});assert.equal(g.offset,0);assert.equal(g.rotation[g.burstKey()].angle,0);const before=g.offset;tick(g,.5,{move:true});assert(g.offset>before);assert.equal(g.rotation[g.burstKey()].phase,'idle');}
{const a=new Game(),b=new Game();a.reset(4);b.reset(4);tick(a,1);tick(b,1,{brace:true});assert(Math.abs(a.stamina-b.stamina-3.2)<.001);}
// A brief swing starts gravity-driven motion. Missing the regrip fails; timed holding succeeds.
{const g=new Game();g.reset(4);g.offset=g.node.rotationAt;g.step(dt,{swing:true});tick(g,2);assert(['falling','failed'].includes(g.status));assert(g.reason.includes('持ち替え'));}
{const g=new Game();g.reset(4);g.offset=g.node.rotationAt;g.step(dt,{swing:true});let heldFrames=0;for(let i=0;i<700&&!g.burstDone;i++){const r=g.rotation[g.burstKey()],brace=r.phase==='regrip'||r.phase==='rotating';g.step(dt,{brace});if(brace)heldFrames++;}assert.equal(g.status,'playing');assert(g.burstDone&&heldFrames>0);assert.equal(g.rotation[g.burstKey()].regripAlpha,1);assert(Math.abs(g.support().z-g.node.z)<1e-8,'60-degree pull brings the staggered rear lip to the bottom');const angle=g.rotation[g.burstKey()].angle;tick(g,.5,{move:true});assert.equal(g.rotation[g.burstKey()].angle,angle);assert(g.offset>0);}
// A nearly free pipe coasts. Rear weight and an unbalanced swing can reverse travel.
{const g=new Game();g.reset(5);g.offset=150;g.pipeSpeed=80;tick(g,1,{slide:6/65,pump:0});assert(g.pipeSpeed>77.5&&g.offset>225);}
{const g=new Game();g.reset(5);g.offset=300;tick(g,3,{slide:0,pump:0});assert(g.offset<280&&g.pipeSpeed<0);const x=g.offset;tick(g,2,controlsFor(g,{brace:true}));assert(g.offset>x&&g.pipeSpeed>0);}
console.log('PASS manual BURST move, hold cost, swing-triggered rotation, missed/successful regrip, low pipe damping and recoverable backslide');
// Last unit: walk along the front half before the central yellow section can rotate.
{const g=new Game();g.reset(4);const last=g.s.anchors.at(-1);g.enter(last.id);g.step(dt,{swing:true});assert.equal(g.rotation[g.burstKey()].phase,'idle');assert.equal(g.rotation[g.burstKey()].angle,0);tick(g,3,{move:true});assert.equal(g.offset,last.rotationAt);g.step(dt,{swing:true});assert.equal(g.rotation[g.burstKey()].phase,'regrip');}
console.log('PASS final rotation starts only at the central moving section, after the front half');
