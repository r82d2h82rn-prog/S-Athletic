import assert from 'node:assert/strict';
import {Game,COURSE,STAGES,FINISH} from './src/engine.mjs';
import {solveImpulse,obstacleShapes,sweepBox,applyContact,findContact} from './src/collision.mjs';
const dt=1/120;
// Collision changes normal momentum, keeps tangential motion, and cannot add energy at a static wall.
{const v=[400,170,80],r=solveImpulse(v,[-1,0,0]);assert(r.velocity[0]<0);assert(r.velocity[1]>0);assert(Math.hypot(...r.velocity)<Math.hypot(...v));assert.equal(solveImpulse([-100,0,0],[-1,0,0]),null);const moving=solveImpulse([0,0,0],[1,0,0],[100,0,0]);assert(moving.velocity[0]>100);}
// Thin rotated acrylic and an entire fast crossing are continuous contacts, not end-point tests.
{const g=new Game();g.reset();const n=COURSE.find(n=>n.kind==='edge'&&n.acrylic);g.edgeRotation[n.id]=.3;const shape=obstacleShapes(g,n).find(s=>s.part==='acrylic'),normal=shape.basis[0],a=shape.center.map((v,i)=>v-normal[i]*150),b=shape.center.map((v,i)=>v+normal[i]*150),hit=sweepBox(a,b,shape,2);assert(hit&&hit.t>0&&hit.t<1);const miss=a.map((v,i)=>v+shape.basis[2][i]*200);assert.equal(sweepBox(miss,miss.map((v,i)=>v+normal[i]*300),shape,2),null);}
// Each area has physical shapes. A missed physical contact retires with recoil and object response.
for(let stage=0;stage<6;stage++){
 const g=new Game();g.reset();const n=STAGES[stage].anchors.find(n=>n.rotating)||STAGES[stage].anchors[0],shape=obstacleShapes(g,n)[0];assert(shape);
 const point=[n.x,n.y,n.z],normal=[-1,0,0],prev={x:n.x-80,y:n.y,z:n.z,vx:400,vy:90,vz:50},next={...prev,x:n.x+10};g.p={...next};
 assert(applyContact(g,{node:n,shape,t:.5,point,normal,part:'torso'},prev,next));assert.equal(g.status,'falling');assert(g.p.vx<400&&g.p.vy!==0);assert(Object.values(g.tumble).some(v=>Math.abs(v)>0));
 if(n.kind==='pole'||n.kind==='edge'){const m=g.impactMotion[n.id];assert(Math.abs(m.vx)+Math.abs(m.omega)>0);const before=JSON.stringify(m);g.step(dt);assert.notEqual(JSON.stringify(m),before);}
}
// A genuine gap does not collide; reaching an object with a bad catch can collide.
{const g=new Game();g.reset();g.state='fly';g.flightTime=1;const a={x:350,y:200,z:600,vx:300,vy:30,vz:0},b={...a,x:380};g.p={...b};assert.equal(findContact(g,a,b),null);g.fail('momentum check');g.p.vy=-120;g.step(dt);assert(g.p.vy<0,'falling must not discard upward momentum');}
// Successful capture envelopes are unchanged for both modes, for every kind of grip.
for(const mode of ['expert','assist'])for(const target of COURSE.filter(n=>!['deck'].includes(n.kind))){
 if(target.id===0)continue;const g=new Game();g.mode=mode;g.reset();g.enter(target.id-1);g.state='fly';g.flightTime=1;g.rotated=true;const b=g.target(),r=target.kind==='pole'?target.radius+(mode==='assist'?50:38):mode==='assist'?16:10;
 g.p={x:b.x-r+.05,y:b.y,z:b.z,vx:0,vy:0,vz:0};g.step(dt,{brace:true});assert.equal(g.nodeIndex,target.id,`${mode} ${target.kind} grip changed`);
}
// Only the sidewinder/edge landing decks gain margins, matching their enlarged visible pads.
for(const deck of COURSE.filter(n=>n.kind==='deck')){
 assert.equal(deck.landingMargin||0,[1,2].includes(deck.stage)?40:0);if(!deck.landingMargin)continue;
 const g=new Game();g.reset();g.enter(deck.id-1);g.state='fly';g.flightTime=1;g.p={x:deck.x-30,y:deck.y-204,z:deck.z+125,vx:0,vy:200,vz:0};g.step(dt);assert.equal(g.nodeIndex,deck.id);assert.equal(g.state,'stand');assert(g.p.x<deck.x);
}
// Second cliff jump gains independently increasing penalties from reach and vertical drop.
function cliffLoss(distance,drop){const g=new Game();g.reset(3);g.enter(STAGES[3].anchors[1].id);g.takeoff={node:g.nodeIndex,x:0,y:100,z:0,peakY:100};g.p.x=distance;g.p.z=0;g.p.y=100+drop;const before=g.stamina;g.enter(STAGES[3].anchors[2].id,{air:true,speed:400});return before-g.stamina;}
assert(cliffLoss(270,30)>cliffLoss(180,30));assert(cliffLoss(180,110)>cliffLoss(180,30));assert(cliffLoss(270,110)>cliffLoss(270,30));
// Entire pipe holding drain is exactly 1.5 times its former same-input rate, in both modes.
for(const mode of['expert','assist']){const a=new Game(),b=new Game();a.mode=b.mode=mode;a.reset(5);b.reset(5);a.fatigue(1,{right:true});b.fatigue(1,{right:true,brace:true});assert(Math.abs((100-b.stamina)/(100-a.stamina)-1.5)<1e-8);}
console.log('PASS swept contacts, momentum/restitution, moving walls, object recoil, tumble, misses, unchanged grabs, expanded landings, second-cliff loads and +50% pipe holding drain');

{const g=new Game();g.reset();const n=COURSE.find(n=>n.kind==='edge');g.enter(n.id-1);g.state='fly';g.flightTime=1;g.p={x:n.x-20,y:n.y,z:n.z+30,vx:800,vy:0,vz:0};for(let i=0;i<5;i++)g.step(dt);assert.equal(g.status,'falling');assert.equal(g.lastCollision.kind,'edge');assert.equal(g.lastCollision.bodyPart,'hand');assert(g.p.vx>0&&g.p.vx<800,'moving frame transfers momentum without forcing a vertical fall');assert(g.impactMotion[n.id].omega>0);}
console.log('PASS failed edge catch flows through actual hand contact and transfers angular momentum to the frame');
{const g=new Game();g.reset();g.state='fly';g.flightTime=1;g.time=-1.125;g.lastStepDt=dt;const n=COURSE.find(n=>n.motion==='depth'),a=g.anchorNode(n);g.p={x:a.x+n.len/2+18,y:35,z:a.z-62-10+.1,vx:0,vy:0,vz:0};const hit=findContact(g,{...g.p},g.p);assert.equal(hit?.node.id,n.id);assert(applyContact(g,hit,{...g.p},g.p));assert(g.p.vz<0,'moving wall imparts its own velocity');}
console.log('PASS moving-wall sweep detects contact even when the athlete was stationary');
// Ground catches the athlete before any limb collision and locks a stable upright pose.
for(const deck of [...COURSE.filter(n=>n.kind==='deck'),{...FINISH,kind:'finish',id:COURSE.length}]){
 const g=new Game();g.reset();g.enter(deck.id-1);g.state='fly';g.flightTime=1;g.p={x:deck.x+25,y:deck.y-210,z:deck.z+30,vx:80,vy:300,vz:20};
 for(let i=0;i<30&&g.state==='fly';i++)g.step(dt);
 assert.equal(g.state,'stand');assert.equal(g.lastCollision,null);assert(Math.abs(g.p.y-(deck.y-203))<1e-8);assert.equal(g.p.z,deck.z);assert.equal(g.p.vx+g.p.vy+g.p.vz,0);assert.equal(g.angle+g.omega,0);
 const landed={...g.p};for(let i=0;i<120;i++)g.step(dt);assert.deepEqual(g.p,landed,'landing stays fixed without holding');
}
// A prior obstacle retirement must not bounce off the ground or revive the run.
{const deck=COURSE.find(n=>n.kind==='deck'),g=new Game();g.reset();g.enter(deck.id-1);g.fail('obstacle collision');g.p={x:deck.x+30,y:deck.y-210,z:deck.z,vx:100,vy:300,vz:0};for(let i=0;i<30&&g.status==='falling';i++)g.step(dt);assert.equal(g.state,'stand');assert.equal(g.status,'failed');assert.equal(g.reason,'obstacle collision');assert.equal(g.p.vx+g.p.vy+g.p.vz,0);}
console.log('PASS all rest/finish platforms snap to stable standing, without bounce, slide, holding or retirement revival');
