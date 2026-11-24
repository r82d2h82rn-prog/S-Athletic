// One non-looping revolution. Timing is a game estimate, not an official TBS specification.
export const SCREW={stage:7,x:143.3,y:4.8,z:0,radius:3.45,tilt:Math.PI/6,startAngle:Math.PI-1.1,seconds:7.5,startDelay:1,barLength:1.6,barRadius:.25};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function screwPose(elapsed=0){
 const progress=clamp(elapsed/SCREW.seconds,0,1),angle=SCREW.startAngle+progress*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),ct=Math.cos(SCREW.tilt),st=Math.sin(SCREW.tilt),omega=elapsed<=0||elapsed>=SCREW.seconds?0:Math.PI*2/SCREW.seconds;
 return {progress,angle,center:{x:SCREW.x+SCREW.radius*ct*c,y:SCREW.y-SCREW.radius*st*c,z:SCREW.z+SCREW.radius*s},axis:{x:-ct*s,y:st*s,z:c},velocity:{x:-SCREW.radius*ct*s*omega,y:SCREW.radius*st*s*omega,z:SCREW.radius*c*omega}};
}
export function screwPoint(elapsed,gripOffset=0){const p=screwPose(elapsed),d=clamp(gripOffset,-.8,.8);return {x:p.center.x+p.axis.x*d,y:p.center.y+p.axis.y*d,z:p.center.z+p.axis.z*d};}
export function screwGripOffset(hand,pose){return clamp((hand.x-pose.center.x)*pose.axis.x+(hand.y-pose.center.y)*pose.axis.y+(hand.z-pose.center.z)*pose.axis.z,-.8,.8);}
export function screwVelocity(elapsed,gripOffset=0){const p=screwPose(elapsed),omega=elapsed<=0||elapsed>=SCREW.seconds?0:Math.PI*2/SCREW.seconds,d=clamp(gripOffset,-.8,.8);return{x:p.velocity.x-Math.cos(SCREW.tilt)*Math.cos(p.angle)*omega*d,y:p.velocity.y+Math.sin(SCREW.tilt)*Math.cos(p.angle)*omega*d,z:p.velocity.z-Math.sin(p.angle)*omega*d};}
