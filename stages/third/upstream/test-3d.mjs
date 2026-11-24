import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game,COURSE} from './src/engine.mjs';
import {Renderer} from './src/render.js';
const canvas={getBoundingClientRect:()=>({width:1200,height:600})};const g=new Game(),r=new Renderer(canvas,g,{headless:true});let draws=0;r.renderer={render(){draws++;},setSize(){}};
r.frame(.02);const pool=r.water,root=r.course,objects=r.obstacles.map(o=>o.root.uuid);assert.equal(r.obstacles.length,COURSE.filter(n=>n.kind!=='deck').length);
for(let stage=0;stage<6;stage++){
 g.reset(stage);for(let t=0;t<40;t++){g.step(1/120,{brace:true});r.frame(.025);}assert.equal(r.course,root);assert.equal(r.water,pool);assert.deepEqual(r.obstacles.map(o=>o.root.uuid),objects);assert.equal(r.courseBuilds,1);
 r.scene.updateMatrixWorld(true);r.scene.traverse(o=>{for(const v of o.matrixWorld.elements)assert(Number.isFinite(v));});
 for(let c=0;c<5;c++){r.cameraMode=c;r.frame(.04);assert(r.camera.isPerspectiveCamera);const p=r.camera.position.toArray();assert(p.every(Number.isFinite));if(c===3){assert.equal(r.parts.head.visible,false);assert.equal(r.parts.torso.visible,false);assert.equal(r.parts['hand1'].visible,true);assert(r.camera.position.distanceTo(r.actor.position)<1);}}
 console.log(`PASS area ${stage+1}: same world meshes and water retained, five cameras including player eye position`);
}
g.reset();r.cameraMode=0;r.frame(.01);assert.equal(r.parts.head.visible,true);assert(draws>240);r.splash();r.frame(.02);assert(r.ripple.visible);
console.log('PASS continuous scene (one build), transforms, first-person self-occlusion handling, water ripple');

for(const aspect of[.65,1,2.17]){
 r.camera.aspect=aspect;r.camera.updateProjectionMatrix();g.reset();r.cameraMode=0;for(let i=0;i<100;i++)r.frame(.04);const far=r.camera.position.distanceTo(r.actor.position);
 r.cameraMode=4;for(let i=0;i<100;i++)r.frame(.04);const close=r.camera.position.distanceTo(r.actor.position);assert(close<far*.8);assert(r.parts.head.visible);
 const head=r.parts.head.getWorldPosition(new THREE.Vector3()).project(r.camera),feet=r.parts['shoe1'].getWorldPosition(new THREE.Vector3()).project(r.camera);assert(Math.abs(head.y)<1&&Math.abs(feet.y)<1,'close camera crops athlete');
}
 r.cameraMode=0;assert.deepEqual(Array.from({length:5},()=>{r.cycleCamera();return r.cameraMode;}),[4,1,2,3,0]);
 console.log('PASS close follow is nearer, frames head and feet in portrait/landscape, and cycles through all five cameras');
// Four unit meshes: yellow/red/red/yellow, each with two visible edge strips.
g.reset(4);g.offset=g.node.rotationAt;g.step(1/120,{swing:true});for(let i=0;i<360;i++)g.step(1/120,{brace:true});r.frame(.04);
const units=r.obstacles.filter(o=>o.n.kind==='burst');assert.equal(units.length,4);assert.deepEqual(units.map(o=>o.n.rotating),[true,false,false,true]);for(const o of units){assert(o.gripLip&&o.oppositeLip);assert.equal(o.board.rotation.x,g.burstAngle(o.n));}
const pole=COURSE.find(n=>n.kind==='pole'&&n.drop),rig=r.obstacles.find(o=>o.n.id===pole.id);g.time=0;g.loads[pole.id]=0;r.frame(.04);const initialTop=rig.root.position.y+rig.suspension.position.y+rig.suspension.scale.y/2;
g.time=1;r.frame(.04);assert(Math.abs(rig.root.position.y+rig.suspension.position.y+rig.suspension.scale.y/2-initialTop)<1e-8);
console.log('PASS four BURST unit meshes and fixed upper suspension during load-triggered cylinder drop');
g.reset();g.enter(0);g.state='fly';r.frame(.01);assert(r.heldBar.visible,'bar is carried between cradles');
g.enter(2);g.state='hang';r.frame(.01);assert(r.heldBar.visible);g.cooldown=0;g.omega=2;g.launch();r.frame(.01);assert(!r.heldBar.visible,'hands must be empty when leaving for sidewinder');assert(r.obstacles.find(o=>o.n.id===2).bar.visible,'bar remains in last cradle');
console.log('PASS carried bar is left in final cradle during the sidewinder transfer');
const edges=r.obstacles.filter(o=>o.n.kind==='edge');assert.deepEqual(edges.map(o=>o.grips.length),[2,1,2]);
for(const o of edges){for(const strut of o.struts){const axis=new THREE.Vector3(0,1,0).applyQuaternion(strut.quaternion);assert(Math.abs(strut.position.x)<1e-8&&Math.abs(axis.x)<1e-8,'edge frame must face across the lane');}for(const grip of o.grips)assert.equal(grip.position.x,0);}
assert(edges[2].acrylic.scale.x<.02&&edges[2].acrylic.scale.z>1,'acrylic must be in the same YZ plane');
g.reset(2);g.edgeRotation[g.nodeIndex]=.2;r.frame(.01);r.scene.updateMatrixWorld(true);const gripCenter=new THREE.Vector3(0,-1.1,0).applyMatrix4(edges[0].pivot.matrixWorld),anchor=g.support();assert(gripCenter.distanceTo(new THREE.Vector3(...r.pos(anchor.x,anchor.y,anchor.z)))<1e-8);
console.log('PASS X/Y/X transverse frames, two/one/two grips, acrylic direction and moving visual/physical support alignment');
assert.equal(COURSE.filter(n=>n.kind==='pole').length,4);
const burstUnits=r.obstacles.filter(o=>o.n.kind==='burst');assert.deepEqual(burstUnits.map(o=>o.n.z),[0,0,-30,-90]);
for(const o of burstUnits)assert.equal(o.rotatingFace.material,o.n.rotating?r.mat.yellow:r.mat.red);
for(const o of burstUnits){assert.equal(o.blades.length,o.n.rotating?6:2);assert.equal(o.n.rotationAt,o.n.rotating?o.n.len/2:null);}
g.reset(4);r.cameraMode=4;for(let i=0;i<100;i++)r.frame(.04);assert(r.camera.position.z>r.actor.position.z,'moving to negative Z must go away from the follow camera');
console.log('PASS four sidewinder cylinders, yellow rotating faces, staggered radial triads, 60-degree grip change, and 30/60cm depth steps');

// Impact-driven animation follows physics; the pole suspension top stays fixed while the body recoils.
g.reset();const hitPole=COURSE.find(n=>n.kind==='pole');g.impactMotion[hitPole.id]={x:20,z:12,vx:30,vz:15,angle:0,omega:0};g.fail('collision render');g.tumble.x=.4;g.tumble.z=.3;r.frame(.04);const struck=r.obstacles.find(o=>o.n.id===hitPole.id);r.scene.updateMatrixWorld(true);
const wireTop=new THREE.Vector3(0,-.5,0).applyMatrix4(struck.suspension.matrixWorld);assert(Math.abs(wireTop.x-hitPole.x/100)<1e-8&&Math.abs(wireTop.z-hitPole.z/100)<1e-8);assert(Math.abs(r.actor.quaternion.x)>0);
r.cameraMode=3;r.frame(.04);assert(r.camera.position.toArray().every(Number.isFinite));assert(Math.abs(r.camera.up.x)+Math.abs(r.camera.up.z)>0);r.cameraMode=0;r.frame(.04);assert.deepEqual(r.camera.up.toArray(),[0,1,0]);
console.log('PASS obstacle recoil rendering, fixed wire top, body tumble and first-person fall rotation');
// Live swing-edge attempts use the original choreography; recoil belongs only to a fall.
for(const edge of COURSE.filter(n=>n.kind==='edge')){
 g.reset(2);g.enter(edge.id);g.edgeRotation[edge.id]=.22;g.angle=.4;g.impactMotion[edge.id]={x:0,z:0,vx:0,vz:0,angle:.3,omega:1};g.tumble.x=.6;g.tumble.z=.4;
 const obstacle=r.obstacles.find(o=>o.n.id===edge.id);
 for(const state of['hang','fly']){g.state=state;g.flightTime=.2;r.frame(.01);const before=r.actor.quaternion.clone();assert.equal(obstacle.pivot.rotation.z,.22);g.tumble.x=0;g.tumble.z=0;r.frame(.01);assert(before.angleTo(r.actor.quaternion)<1e-8);}
 g.fail('edge fall');r.frame(.01);assert.equal(obstacle.pivot.rotation.z,.52);
}
// No added X/Y target hand spread during flight: the old source grip pose stays until capture.
for(const edge of COURSE.filter(n=>n.kind==='edge')){
 g.reset(2);g.enter(edge.id-1);g.state='fly';g.flightTime=.2;g.p={x:edge.x-30,y:edge.y,z:edge.z,vx:200,vy:0,vz:0};r.frame(.01);
 const source=g.node,span=source.kind==='edge'?(source.shape==='X'?.36:.07):.17;
 assert.deepEqual(r.currentPose.hands.map(v=>v[0]),[-span,span]);
}
console.log('PASS restored swing-edge live motion and original flight hand pose; recoil is fall-only');

// Canvas layout changes can occur without window.resize (mobile browser chrome / rotation).
{let size={width:844,height:390},writes=0;const game=new Game(),view=new Renderer({getBoundingClientRect:()=>size},game,{headless:true});view.renderer={setSize(w,h){writes++;assert.equal(w,size.width);assert.equal(h,size.height);},render(){}};
 for(const [width,height]of[[390,844],[844,370],[844,390],[1200,600],[844,390]]){size={width,height};view.frame(.01);assert.equal(view.camera.aspect,width/height);const expected=view.camera.projectionMatrix.elements[5]/view.camera.projectionMatrix.elements[0];assert(Math.abs(expected-width/height)<1e-9);const count=writes;view.frame(.01);assert.equal(writes,count,'unchanged layout must not recreate drawing buffer');}
 const count=writes,aspect=view.camera.aspect;size={width:0,height:0};view.frame(.01);assert.equal(view.camera.aspect,aspect);assert.equal(writes,count);
}
console.log('PASS canvas aspect follows silent rotation, toolbar and fullscreen size changes; hidden layout preserves valid projection');
