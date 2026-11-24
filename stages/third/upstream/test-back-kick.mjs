import assert from 'node:assert/strict';
import {Game,COURSE} from './src/engine.mjs';
import {athleteDirection,POLE_KICK_SECONDS} from './src/motion.mjs';
const poles=COURSE.filter(n=>n.kind==='pole'),dt=1/120;
function setup(n,error=0){const g=new Game();g.reset(1);g.enter(n.id);g.cooldown=0;g.climb=65;const center=g.anchorNode(n),b=g.target(),a=Math.atan2(b.z-center.z,b.x-center.x)+Math.PI+error;g.poleTravel=a/Math.PI;Object.assign(g.p,g.support());return g;}
for(const n of poles)for(const degrees of[-180,-90,-20.001,-20,-19.999,0,19.999,20,20.001,90,180]){
 const g=setup(n,degrees*Math.PI/180),facing=athleteDirection(g),v=g.launchVelocity(),speed=Math.hypot(v.vx,v.vz);
 assert(Math.abs(speed-330)<1e-8);assert(Math.abs(v.vx/speed+facing.x)<1e-8&&Math.abs(v.vz/speed+facing.z)<1e-8,'kick follows the back, never the target');
 g.aim=.5;assert.deepEqual(g.launchVelocity(),v,'air aiming cannot replace backward launch direction');g.kickOff();assert.equal(g.takeoff.poleAligned,Math.abs(degrees)<=20);
 assert(Math.abs(g.takeoff.poleAngleError-degrees*Math.PI/180)<1e-8||Math.abs(degrees)===180);
 assert.equal(g.state,'fly','outside-window kicks must still leave the cylinder');
 g.p.y=-400;g.step(dt,{swing:true,forward:true,right:true});assert.equal(g.p.vx,v.vx);assert.equal(g.p.vz,v.vz,'no mid-air target steering');
}
for(const n of poles.filter(n=>n.spin)){
 const g=setup(n,(n.spinRate||0)*POLE_KICK_SECONDS);g.launch();for(let i=0;i<39;i++)g.step(dt,{brace:true});assert.equal(g.state,'fly');assert(g.takeoff.poleAligned);assert(Math.abs(g.takeoff.poleAngleError)<.01,'angle is evaluated when the kick releases');
}
for(const aligned of[true,false]){
 const g=setup(poles[0]);g.kickOff();g.takeoff.poleAligned=aligned;g.flightTime=.2;const b=g.target();g.p={x:b.x-5,y:b.y-35,z:b.z,vx:30,vy:0,vz:0};g.step(dt,{brace:true});assert.equal(g.nodeIndex===b.id,aligned,'forgiving grab volume cannot bypass the angle window');
}
{const g=setup(poles[0]);g.kickOff();let previous=athleteDirection(g);for(let i=0;i<45;i++){g.flightTime+=dt;const next=athleteDirection(g);assert(Math.abs(Math.hypot(next.x,next.z)-1)<1e-9);assert(Math.hypot(next.x-previous.x,next.z-previous.z)<.15);previous=next;}}
console.log('PASS backward kick vectors, inclusive ±20° release boundary, outside-window misses, no target steering, motor timing and continuous in-air turn');
