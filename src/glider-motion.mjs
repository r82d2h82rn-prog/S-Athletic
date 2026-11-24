// Shared by the collider, renderer and downhill dynamics. Offsets are horizontal metres.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function gliderHeight(n,offset){const u=clamp(offset/n.length,0,1);return n.y-n.drop*(1-(1-u)**3)+n.lift*u**4;}
export function gliderSlope(n,offset){const u=clamp(offset/n.length,0,1);return (-3*n.drop*(1-u)**2+4*n.lift*u**3)/n.length;}
export function gliderCurvature(n,offset){const u=clamp(offset/n.length,0,1);return (6*n.drop*(1-u)+12*n.lift*u*u)/(n.length*n.length);}
export function advanceGlider(n,offset,speed,dt,scale=1){
 const slope=gliderSlope(n,offset),curvature=gliderCurvature(n,offset);
 const acceleration=(-19.62*slope*scale*scale-slope*curvature*speed*speed)/(1+slope*slope)-speed*.045*scale;
 speed=clamp(speed+acceleration*dt,.15*scale,11*scale);
 return {offset:Math.min(n.length,offset+speed*dt),speed};
}
export function legacyGlideSeconds(n,incoming){let offset=0,speed=incoming,steps=0;while(offset<n.legacy.length&&steps<2400){speed=Math.min(11,speed+(-19.62*n.legacy.slope/(1+n.legacy.slope**2)-speed*.045)/120);offset+=speed/120;steps++;}return steps/120;}
const timingCache=new Map();
export function glideTimeScale(n,incoming){
 const key=[n.id,n.length,n.drop,n.lift,incoming.toFixed(4)].join(':');if(timingCache.has(key))return timingCache.get(key);
 let offset=0,speed=incoming,steps=0;while(offset<n.length&&steps<2400){const next=advanceGlider(n,offset,speed,1/120);offset=next.offset;speed=next.speed;steps++;}
 const scale=(steps/120)/(2*legacyGlideSeconds(n,incoming));timingCache.set(key,scale);return scale;
}
