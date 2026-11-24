import {aimPole} from './test-support/pole.mjs';
import assert from 'node:assert/strict';
import {Game,COURSE} from './src/engine.mjs';
import {controlsFor} from './src/controls.mjs';
const DT=1/120,clone=g=>Object.assign(Object.create(Game.prototype),structuredClone({...g}));
function seekRelease(g){
 const q=clone(g),trace=[];for(let i=0;i<2600&&q.status==='playing';i++){
  const raw={swing:true,brace:true};q.step(DT,controlsFor(q,raw));trace.push(raw);
  if(q.omega<=0||q.cooldown>0)continue;
  const f=clone(q),flight=[{swing:true,brace:true,jump:true}];f.step(DT,controlsFor(f,flight[0]));if(f.state!=='fly')continue;
  for(let j=0;j<240;j++){const input={brace:true};flight.push(input);f.step(DT,controlsFor(f,input));if(f.nodeIndex!==g.nodeIndex||f.status!=='playing')break;}
  if(f.nodeIndex>g.nodeIndex||f.status==='complete')return{g:f,trace:[...trace,...flight]};
 }throw Error(`Three-button release failed at ${g.nodeIndex}`);
}
for(const mode of['expert','assist']){
 let g=new Game();g.mode=mode;g.reset();const trace=[];
 const step=raw=>{g.step(DT,controlsFor(g,raw));trace.push(raw);};
 for(let k=0;k<COURSE.length+10&&g.status==='playing';k++){
  const n=g.node,id=n.id;
  if(n.kind==='deck'){step({challenge:true});for(let i=0;i<1000&&g.nodeIndex===id;i++)step({});continue;}
  if(n.kind==='pole'){aimPole(g,step);step({jump:true});for(let i=0;i<260&&g.nodeIndex===id&&g.status==='playing';i++)step({brace:true});assert(g.nodeIndex>id);continue;}
  if(n.kind==='cliff')for(let i=0;i<2000&&g.nodeIndex===id&&g.offset<n.len-.01;i++)step({brace:true});
  if(g.nodeIndex!==id)continue;
  if(n.kind==='burst'){
   if(n.rotating)step({swing:true});for(let i=0;i<2500&&g.nodeIndex===id&&g.status==='playing';i++){const r=g.rotation[g.burstKey()];step({move:true,swing:n.rotating&&r?.phase==='idle'&&g.offset>=(n.rotationAt||0),brace:n.rotating&&r?.phase!=='idle'&&r?.phase!=='settled'});}assert(g.nodeIndex>id);continue;
  }
  if(n.kind==='cliff'&&g.target().kind==='burst'){
   for(let i=0;i<2500&&g.nodeIndex===id&&g.status==='playing';i++)step({brace:true});assert(g.nodeIndex>id);continue;
  }
  if(n.kind==='pipe')for(let i=0;i<2500&&g.offset<n.len-.2;i++)step({brace:true});
  const result=seekRelease(g);g=result.g;trace.push(...result.trace);
 }
 assert.equal(g.status,'complete');const replay=new Game();replay.mode=mode;replay.reset();for(const raw of trace)replay.step(DT,controlsFor(replay,raw));assert.equal(replay.status,'complete');assert.equal(replay.stamina,g.stamina);
 console.log(`PASS only swing/hold/jump + rest challenge: ${mode}, ${g.total.toFixed(1)}s, stamina ${g.stamina.toFixed(1)}%, exact replay`);
}
// Holding/releasing are momentary; no input must create force or auto-release by itself.
{const g=new Game();g.reset();const raw={brace:true};assert(controlsFor(g,raw).brace);raw.brace=false;assert(!controlsFor(g,raw).brace);for(let i=0;i<600;i++)g.step(DT,controlsFor(g,{jump:i%10===0}));assert.equal(g.nodeIndex,0);}
console.log('PASS no hold latch and jump-only input cannot generate swing momentum');
