// Shared dimensions for rendering, hand contacts and solid landing surfaces (metres).
export const FLOOR=1.8,WATER=.05,BODY=1.9;
export const LOG={radius:.65,bodyRadius:.91,centerY:3,slope:.1};
export const METAL={runway:5,pivot:8,radius:2.4,chainY:4.3,startAngle:-Math.PI/2};
export const SALMON={base:4.1,top:5.62,offset:-.26};
// Six stationary opposing wall pairs. The last pair is separate and 1.8m lower.
export const SPIDER=[
 {left:0,right:2.0,feet:3.0},{left:2.1,right:4.1,feet:3.0},
 {left:4.2,right:6.2,feet:4.8},{left:6.3,right:8.3,feet:4.8},
 {left:8.4,right:10.3,feet:4.4},{left:10.6,right:13,feet:2.6}
];
export function swingGrip(q,time){const angle=Math.sin(time*2)*.075;return {q:q+Math.sin(angle)*1.5,y:4.1+(1-Math.cos(angle))*1.5,z:Math.sin(time*1.5)*.09};}
export const BOARDS=[{x:2,w:3.3,y:4,d:1.5},{x:6.4,w:3.3,y:4,d:1.5}];
export function shore(a){return {left:a.length,right:a.length+3,y:FLOOR,halfDepth:1.9};}
export function floorSupports(a){const bank=shore(a),entry={left:-3,right:0,y:FLOOR,halfDepth:1.9};
 return [entry,bank,...(a.id==='salmonUp'?[{left:0,right:a.length/2-.6,y:FLOOR,halfDepth:1.9}]:a.id==='metal'?[{left:0,right:METAL.runway,y:FLOOR,halfDepth:1.35}]:a.id==='walls'||a.id==='belt'?[{left:0,right:a.length,y:FLOOR,halfDepth:a.id==='belt'?1.25:1.9}]:[])];}
export function sweptFloor(a,old,next){for(const f of floorSupports(a)){const h=f.y-FLOOR;if(old.y<h||next.y>h||next.y>=old.y)continue;const t=(old.y-h)/(old.y-next.y),q=old.q+(next.q-old.q)*t,z=old.z+(next.z-old.z)*t;if(q>=f.left&&q<=f.right&&Math.abs(z)<=f.halfDepth-.22)return {q,z,y:h,entry:q<a.length};}return null;}

export const FINAL_RULES=Object.freeze({climbInterval:.2,ladderThreshold:.9,ropeThreshold:.9,ropeChargeSeconds:.5});

export const BACKSTREAM=Object.freeze({waterY:.45,swimmerOffset:-.10});
export const SECOND_GOAL=Object.freeze({reach:.55});
