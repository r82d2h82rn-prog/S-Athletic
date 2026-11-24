import {Vector3} from '../vendor/three/three.module.min.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FinalPresentation,finalPresentationFrame} from '../src/night/final-presentation.mjs';
import {NightGame} from '../src/night/engine.mjs';
import {NightRenderer} from '../src/night/render.mjs';
test('FINAL follows the reference shot sequence with 54 seconds of intro and three seconds of countdown',()=>{
 const expected=[[0,'aisle'],[8,'entrance'],[10,'walk'],[16,'athlete'],[20,'approach'],[24,'reveal'],[30,'climb'],[34,'ladder'],[38,'rope'],[40,'goal'],[44,'descent'],[54,'countdown'],[57,'go']];
 for(const [time,shot]of expected)assert.equal(finalPresentationFrame(time).shot,shot);
 for(const [time,count]of [[54,3],[54.99,3],[55,2],[56,1],[57,null]])assert.equal(finalPresentationFrame(time).count,count);
 const p=new FinalPresentation();p.start();p.advance(20);p.skip();assert.equal(p.elapsed,54);p.advance(1);p.skip();assert.equal(p.elapsed,55);p.paused=true;p.advance(99);assert.equal(p.elapsed,55);p.paused=false;assert(p.advance(2));assert(!p.active);
});
test('FINAL cinematic lights and camera stay finite at every shot, including portrait and gameplay handoff',()=>{
 const g=new NightGame('final'),r=new NightRenderer(null,g,{headless:true});g.status='intro';
 for(const aspect of [1112/512,390/844]){r.camera.aspect=aspect;r.camera.updateProjectionMatrix();for(let t=0;t<57;t+=.5){r.presentation=finalPresentationFrame(t);r.frame(1/60);r.scene.updateMatrixWorld(true);assert(r.camera.matrixWorld.elements.every(Number.isFinite));assert(r.actor.matrixWorld.elements.every(Number.isFinite));assert.deepEqual(r.actor.position.toArray(),r.presentation.actor);for(const light of r.finalBeams)assert(light.material.opacity>=0&&light.material.opacity<.1);}}
 r.camera.aspect=1112/512;r.presentation=finalPresentationFrame(56.99);r.frame(1/60);const before=r.camera.position.clone();r.presentation=null;g.status='playing';r.frame(1/60);assert(r.camera.position.distanceTo(before)<.01);assert.equal(r.camera.fov,46);assert.equal(g.time,0);assert(r.staticBatches.length<100);
 const lightCount=r.finalBulbs.items.length;assert.equal(lightCount,92);assert(r.finalEffects.parent===r.world);assert.equal(r.finalEffects.position.y,1.8);
});

test('opening stays low behind the athlete in landscape and portrait; area introductions fill most of the image',()=>{
 const g=new NightGame('final'),r=new NightRenderer(null,g,{headless:true});
 for(const aspect of [1112/512,390/844]){r.camera.aspect=aspect;r.camera.updateProjectionMatrix();for(const time of [0,4,7.9]){const shot=finalPresentationFrame(time);r.presentation=shot;r.frame(1/60);r.camera.updateMatrixWorld(true);assert(r.camera.position.z>shot.actor[2]);assert(r.camera.position.z<31);assert(r.camera.position.y<3.2);for(const y of [1.8,3.5,30.8]){const p=new Vector3(0,y,y<4?22:0).project(r.camera);assert(Math.abs(p.y)<1,'opening point stays framed at '+time);}}
 for(const [time,bottom,top,z]of [[31,1.8,10.3,-.35],[35,10.3,17.3,0],[39,17.3,27.3,-.2]]){r.presentation=finalPresentationFrame(time);r.frame(1/60);r.camera.updateMatrixWorld(true);const low=new Vector3(0,bottom,z).project(r.camera),high=new Vector3(0,top,z).project(r.camera);assert(high.y-low.y>1.05,'obstacle occupies over half the image height');assert(Math.abs(low.y)<1&&Math.abs(high.y)<1,'whole obstacle remains visible');}}
});
