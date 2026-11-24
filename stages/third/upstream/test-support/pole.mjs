import {POLE_KICK_SECONDS} from '../src/motion.mjs';
// Input-only pilot: choose rotation or manual orbit, accounting for motor motion during push-off.
export function poleAimInput(g){
 const predicted=g.poleKickInfo(POLE_KICK_SECONDS),ready=Math.abs(predicted.error)<.012&&g.climb>=65&&g.cooldown<=0;
 return {swing:!ready&&(!(g.node.spinRate>0)||predicted.error<0),brace:true,climb:true,jump:ready};
}
export function aimPole(g,step){for(let i=0;i<2400&&g.status==='playing';i++){const input=poleAimInput(g);if(input.jump)return;step(input);}throw Error('No aligned Sidewinder takeoff');}
