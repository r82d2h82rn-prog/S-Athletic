// User-specified 120° triads, staggered 60° at the midpoint. Units: cm/radians.
export const BURST=Object.freeze({radius:26,coreRadius:10,blade:3,turn:Math.PI/3,gripAngle:-Math.PI/3,rotationSign:-1,reachSeconds:.45});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smoothBurst=t=>{t=clamp(t);return t*t*(3-2*t);};
export function burstFins(n){
 if(!n.rotating)return [0,Math.PI].map((angle,i)=>({start:0,end:n.len,angle,grip:i===0,half:0}));
 return [0,1].flatMap(half=>[0,1,2].map(i=>({start:half*n.len/2,end:(half+1)*n.len/2,angle:i*Math.PI*2/3+half*BURST.turn,grip:true,half})));
}
export function burstGrip(g,n,offset){
 if(!n.rotating)return {y:0,z:0};
 const r=g.rotation[g.burstKey(n)],a=g.burstAngle(n),front={y:BURST.radius*Math.cos(a),z:-BURST.radius*Math.sin(a)},rear={y:BURST.radius*Math.cos(BURST.gripAngle-a),z:BURST.radius*Math.sin(BURST.gripAngle-a)};
 const blend=offset<n.len/2-.01?0:r?.phase==='regrip'?r.regripAlpha||0:['rotating','settled'].includes(r?.phase)?1:0;
 return {y:-BURST.radius+front.y+(rear.y-front.y)*blend,z:front.z+(rear.z-front.z)*blend};
}
// Two hands reach in sequence while the torso follows a continuous path.
export function burstReachDelta(progress,side,delta){
 const center=smoothBurst(progress),hand=smoothBurst((progress-(side<0?0:.3))/.7),d=hand-center;
 return [-delta.x*d/100,-delta.y*d/100,-delta.z*d/100]; // BURST faces -Z.
}
