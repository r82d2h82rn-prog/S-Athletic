import assert from 'node:assert/strict';
import {Game,COURSE,STAGES} from './src/engine.mjs';
import {pilot,DT} from './test-support/pilot.mjs';
const tick=(g,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)g.step(DT,input);};
// All area classes must resist the original jump-button-only exploit.
for(let stage=0;stage<6;stage++){
 const g=new Game();g.reset(stage);const start=g.nodeIndex;for(let i=0;i<600;i++)g.step(DT,{jump:i%12===0});assert.equal(g.nodeIndex,start);assert.notEqual(g.status,'complete');
}
let g=new Game();g.reset();tick(g,.3);assert.equal(g.launchVelocity().vx,0);g.launch();assert.equal(g.p.vx,0);tick(g,2);assert.equal(g.status,'failed');
console.log('PASS jump spam and stationary release cannot advance any of the six areas');
// Supports are stationary in the fore/aft directions; only specific documented motors move.
for(const n of COURSE.filter(n=>['bar','pole'].includes(n.kind))){g=new Game();g.time=0;const a=g.anchorNode(n);g.time=17;const b=g.anchorNode(n);assert.equal(a.x,b.x);assert.equal(a.z,b.z);assert.equal(a.y,b.y);}
g=new Game();g.reset(1);const startY=g.p.y;tick(g,1,{climb:true});assert(g.climb>40);assert(g.p.y<startY-40);const target=COURSE.find(n=>n.kind==='pole'&&n.drop);g.loads[target.id]=g.time;const y=g.anchorNode(target).y;g.time+=1;assert.equal(g.anchorNode(target).y-y,60);
console.log('PASS fixed flying-bar and sidewinder supports, load-triggered cylinder drop, climbing');
// Distinct support loads, impact loss, exact one-time rewards and exhaustion.
const normal=new Game(),standing=new Game();normal.reset();standing.reset();standing.state='stand';tick(normal,2);tick(standing,2);assert(normal.stamina<standing.stamina-1.5);
const cliff=new Game();cliff.reset(3);const burst=new Game();burst.reset(4);tick(cliff,2,{brace:true});tick(burst,2,{brace:true});assert(cliff.stamina<normal.stamina);assert(burst.stamina<cliff.stamina);
g=new Game();g.reset();g.stamina=50;g.clearArea(0);assert.equal(g.stamina,70);g.clearArea(0);assert.equal(g.stamina,70);g.shock(500);assert(g.stamina<70);g.stamina=.001;g.step(DT);assert.equal(g.status,'falling');
console.log('PASS load-based endurance, greater cliff/BURST drain, impact loss, +20 / cliff +30 once, zero means fall');
for(const mode of ['expert','assist']){
 const result=pilot({mode});assert.equal(result.g.status,'complete');assert.equal(result.g.cleared.size,6);assert(result.g.stamina>0);assert(result.g.total>45);
 // Replay the exact public inputs, with no teleports, loads, resets or state mutations.
 const replay=new Game();replay.mode=mode;replay.reset();let previous=0;for(const input of result.trace){replay.step(DT,input);assert(replay.nodeIndex>=previous&&replay.nodeIndex-previous<=1);previous=replay.nodeIndex;}
 assert.equal(replay.status,'complete');assert.equal(replay.cleared.size,6);assert(Math.abs(replay.total-result.g.total)<1e-6);assert(Math.abs(replay.stamina-result.g.stamina)<1e-6);
 console.log(`PASS ${mode} input-only full course + exact replay: ${result.g.total.toFixed(1)}s, endurance ${result.g.stamina.toFixed(1)}%, ${result.trace.length} frames`);
}
for(let stage=0;stage<6;stage++){const {g}=pilot({stage,practice:true});assert.equal(g.status,'complete');assert(g.cleared.has(stage));console.log(`PASS practice area ${stage+1}`);}
assert.deepEqual(STAGES[2].anchors.map(n=>n.shape),['X','Y','X']);assert(STAGES[2].anchors[2].acrylic);assert.equal(new Set(STAGES[4].anchors.map(n=>n.zone)).size,4);assert.equal(STAGES[5].anchors[0].len,530);
console.log('PASS X-Y-X/acrylic, four BURST zones, 5.3m pipe');

// Rest decks cannot start the next obstacle from movement/climb/release alone.
for(const deck of COURSE.filter(n=>n.kind==='deck')){
 const g=new Game();g.reset();g.enter(deck.id);tick(g,2,{right:true,climb:true,jump:true});assert.equal(g.nodeIndex,deck.id);assert.equal(g.state,'stand');
 g.step(DT,{challenge:true});tick(g,2);assert.equal(g.nodeIndex,deck.id+1);
}
// Traversing a fixed cliff consumes less than the previous 2.5%/s; jumping adds a discrete cost.
{const g=new Game();g.reset(3);g.stamina=80;tick(g,1,{brace:true,right:true});assert(80-g.stamina<1.6);g.offset=g.node.len;g.cooldown=0;const before=g.stamina;g.launch();assert(before-g.stamina>=3.5);}
// Yellow units require a swing to start; each unit receives its rotation load only once.
{const g=new Game();g.reset(4);g.stamina=100;tick(g,.5);assert.equal(g.rotation[g.burstKey()].phase,'idle');g.offset=g.node.rotationAt;g.step(DT,{swing:true});tick(g,3,{brace:true});const r=g.rotation[g.burstKey()];assert.equal(r.phase,'settled');assert.equal(r.impacts,4);assert.equal(g.shocks.reduce((s,x)=>s+x.loss,0),12);const count=g.shocks.length;tick(g,.5,{swing:true});assert.equal(g.shocks.length,count);}
console.log('PASS challenge-only departure from all rest decks, lower traverse drain, discrete jump/rotation load and triggered BURST rotation');
// A cylinder grab accepts a generous body-width offset, but still rejects a distant miss.
for(const [z,expected] of [[52,true],[90,false]]){
 const g=new Game();g.reset();g.enter(2);g.state='fly';g.flightTime=.12;const b=g.target();g.p={x:b.x-5,y:b.y-35,z,vx:30,vy:0,vz:0};g.step(DT,{brace:true});assert.equal(g.nodeIndex===3,expected);if(expected)assert(g.climb>34&&g.climb<36,'catch height must be preserved');
}
{const g=new Game();g.reset();g.enter(2);g.state='fly';g.flightTime=.12;const b=g.target();g.p={x:b.x-180,y:b.y-35,z:0,vx:40000,vy:0,vz:0};g.step(DT,{brace:true});assert.equal(g.nodeIndex,3,'sweep must catch a crossed cylinder');}
console.log('PASS forgiving bounded cylinder catches, high-grip preservation and swept fast-flight collision');
{const deck=COURSE.find(n=>n.kind==='deck'&&n.stage===1);assert(deck);assert.equal(COURSE[deck.id-1].kind,'pole');assert.equal(COURSE[deck.id+1].kind,'edge');assert(deck.x+deck.len<COURSE[deck.id+1].x);}
console.log('PASS a landing deck separates the final sidewinder cylinder and first swing edge');

for(let stage=0;stage<6;stage++){const g=new Game();g.reset();g.stamina=40;g.clearArea(stage);assert.equal(g.stamina,stage===3?70:60);g.clearArea(stage);assert.equal(g.stamina,stage===3?70:60);const cap=new Game();cap.reset();cap.stamina=95;cap.clearArea(stage);assert.equal(cap.stamina,100);}
console.log('PASS all areas recover 20, cliff alone recovers 30, once per area and capped at 100');
