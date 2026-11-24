import test from 'node:test';
import assert from 'node:assert/strict';
import {NightRenderer} from '../src/night/render.mjs';
import {NightGame} from '../src/night/engine.mjs';
import {FLOOR} from '../src/night/geometry.mjs';
class UnbatchedRenderer extends NightRenderer { bakeStatic(){} }
for(const stage of ['second','final'])test(stage+' deck cap stays at the landing height without overlapping the base',()=>{
 const r=new UnbatchedRenderer(null,new NightGame(stage),{headless:true});
 const old=new Set(r.world.children);r.deck(-30,3,FLOOR);
 const [base,cap,...edges]=r.world.children.filter(o=>!old.has(o));
 const baseTop=base.position.y+base.geometry.parameters.height/2;
 const capBottom=cap.position.y-cap.geometry.parameters.height/2;
 assert(baseTop<=capBottom+1e-9,'base must finish below the rubber, not share its upper face');
 assert(Math.abs(cap.position.y+cap.geometry.parameters.height/2-FLOOR)<1e-9);
 assert(edges.every(e=>e.material.color.getHexString()===(stage==='second'?'f2cf21':'d64954')));
 const count=r.world.children.length;r.deck(-30,3,FLOOR);assert.equal(r.world.children.length,count);
});
