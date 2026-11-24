import {aimPole} from './pole.mjs';
import {Game,COURSE} from '../src/engine.mjs';
export const DT=1/120;
const clone=g=>Object.assign(Object.create(Game.prototype),structuredClone({...g}));
function flight(g){const q=clone(g),from=q.nodeIndex,steps=[];const push=input=>{q.step(DT,input);steps.push(input);};push({jump:true,brace:true});if(q.state!=='fly')return null;push({turn:q.node.kind==='cliff',brace:true});for(let j=0;j<210;j++){push({brace:true});if(q.nodeIndex!==from||q.status!=='playing')break;}return q.nodeIndex>from||q.status==='complete'?{g:q,steps}:null;}
function release(g){const q=clone(g),steps=[];for(let i=0;i<2400;i++){const dir=Math.sign(q.omega)||1,input={right:dir>0,left:dir<0,climb:q.node.kind==='pole',slide:q.node.kind==='pipe'?1:undefined};q.step(DT,input);steps.push(input);if(q.omega>0&&q.cooldown===0){const result=flight(q);if(result)return {g:result.g,steps:[...steps,...result.steps]};}if(q.status!=='playing')break;}return null;}
export function pilot({mode='expert',stage=0,practice=false}={}){
 let g=new Game();g.mode=mode;g.practice=practice;g.reset(stage);const trace=[],milestones=[];
 const step=input=>{g.step(DT,input);trace.push(input);};
 for(let iter=0;iter<COURSE.length+10&&g.status==='playing';iter++){
 const n=g.node;const from=n.id;
 if(n.kind==='pole'){aimPole(g,step);step({jump:true});for(let i=0;i<260&&g.nodeIndex===from&&g.status==='playing';i++)step({brace:true});if(g.nodeIndex===from)throw Error(`Pole kick failed ${from}: ${g.status} ${g.reason}`);continue;}
 if(n.kind==='burst'){if(n.rotating)step({swing:true});let j=0;while(g.nodeIndex===from&&g.status==='playing'&&j++<2500){const r=g.rotation[g.burstKey()];step({move:true,swing:n.rotating&&r?.phase==='idle'&&g.offset>=(n.rotationAt||0),brace:n.rotating&&r?.phase!=='idle'&&r?.phase!=='settled'});}if(g.nodeIndex===from)throw Error(`BURST pilot stalled ${from}, now ${g.nodeIndex}, ${g.status}, offset ${g.offset}, ${JSON.stringify(g.rotation)}, ${g.reason}`);continue;}
 if(['cliff','burst'].includes(n.kind)){
  let j=0;while(g.nodeIndex===from&&g.offset<n.len-.01&&g.status==='playing'&&j++<3000)step({right:true,brace:true});
  if(g.nodeIndex!==from)continue;
  if(n.kind==='burst'||g.node.kind==='cliff'&&g.target().kind==='burst'){
   let j=0;while(g.nodeIndex===from&&g.status==='playing'&&j++<1500)step({right:true,brace:true});
   if(g.nodeIndex!==from||g.status==='complete'){milestones.push({from,to:g.nodeIndex,time:g.total,stamina:g.stamina});continue;}
  }
 }
 if(n.kind==='deck'){let j=0;while(g.nodeIndex===from&&g.status==='playing'&&j++<500)step({challenge:true});continue;}
 if(n.kind==='pipe'){let j=0;while(g.offset<n.len-.2&&g.status==='playing'&&j++<1500)step({right:true});}
 const result=release(g);if(!result)throw new Error(`No input-only path found at node ${g.nodeIndex}, ${n.kind}, endurance ${g.stamina.toFixed(1)}`);
 g=result.g;trace.push(...result.steps);milestones.push({from,to:g.nodeIndex,time:g.total,stamina:g.stamina});
 }
 if(g.status!=='complete')throw new Error(`Course incomplete: ${g.status} at ${g.nodeIndex}`);return{g,trace,milestones};
}
