// Procedural movement model, not motion capture. Distances are metres.
import {COURSE} from './course.mjs';
import {BURST,burstReachDelta} from './burst.mjs';
// Shared by the visual skeleton, the first-person camera and landing/water checks.
export const POLE_KICK_SECONDS=.32;
export const BODY=Object.freeze({reach:2.03,eye:[0,-.48,-.08],head:[0,-.48,-.18],shoulderY:-.67,hipY:-1.19,upperArm:.38,foreArm:.37,thigh:.44,shin:.44});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
// The athlete wraps around a pole; its axis is not a pendulum pivot.
export function athleteDirection(g){
 if(g.state==='fall'&&g.edgeFall)return g.edgeFall.direction;
 if(g.state==='fall'&&(g.cliffFall||g.poleFall))return (g.cliffFall||g.poleFall).direction;
 const d=g.direction();if(g.node.kind!=='pole'||!['hang','fly'].includes(g.state))return d;
 const a=g.poleBodyAngle(),t=g.state==='fly'?smooth((g.flightTime-.10)/.28):0;
 // Leave backwards, then turn in the air without an opposing-vector snap or target auto-aim.
 const flight=g.takeoff?.poleAngleError!==undefined?Math.atan2(g.p.vz,g.p.vx):a;const delta=Math.atan2(Math.sin(flight-a),Math.cos(flight-a)),heading=a+delta*t;return {x:Math.cos(heading),z:Math.sin(heading)};
}
// Keep the complete orientation, including a backside jump, when support is lost.
export function athleteYaw(g,pose,d){
 const f=g.state==='fall'&&(g.cliffFall||g.poleFall);if(f)return f.yaw;
 return pose.pole>.01?Math.atan2(d.x,d.z):['cliff','burst'].includes(g.node.kind)?(g.node.kind==='cliff'&&g.node.local===1?0:Math.PI):Math.atan2(d.x,d.z);
}
export function athleteTurn(g){const f=g.state==='fall'&&(g.cliffFall||g.poleFall);return f?f.turn:g.state==='fly'&&g.rotated?Math.PI:0;}
export function swingAngle(g){if(g.state==='fall'&&(g.cliffFall||g.poleFall))return (g.cliffFall||g.poleFall).pose.angle;if(g.state==='fall'&&g.edgeFall)return g.edgeFall.pose.angle;return g.state==='fly'?g.angle*Math.exp(-g.flightTime*6):g.state==='stand'?0:g.angle;}
export function poleApproach(g){if(g.state!=='fly'||g.target().kind!=='pole')return 0;const b=g.target(),d=Math.hypot(g.p.x-b.x,g.p.z-b.z);return 1-smooth((d-45)/115);}
export function poleBlend(g){if(g.state==='hang'&&g.node.kind==='pole')return .65+.35*smooth(g.sinceCatch/.18);const departure=g.node.kind==='pole'&&g.state==='fly'?1-smooth(g.flightTime/.3):0;return Math.max(departure,poleApproach(g)*.65);}
function flightTuck(g){if(g.state!=='fly')return 0;const next=g.target();let approach=0;if(next.kind==='pole'){const d=Math.hypot(g.p.x-next.x,g.p.z-next.z);approach=.65*(1-smooth((d-40)/130));}return Math.max(approach,clamp(-g.p.vy/500,0,.32));}
export function feetReach(g){const pose=athletePose(g);return Math.max(...pose.feet.map(foot=>(-foot[1]*Math.cos(pose.angle)-foot[2]*Math.sin(pose.angle))*100));}
// Analytic two-bone IK, choosing a bend direction perpendicular to the limb axis.
export function joint2(start,end,l1,l2,bend=[0,0,1]){
 const delta=end.map((v,i)=>v-start[i]),raw=Math.hypot(...delta),d=clamp(raw,.0001,l1+l2-.0001),axis=delta.map(v=>v/(raw||1));
 const dot=bend.reduce((s,v,i)=>s+v*axis[i],0);let normal=bend.map((v,i)=>v-axis[i]*dot);let n=Math.hypot(...normal);if(n<1e-5){normal=[axis[1],-axis[0],0];n=Math.hypot(...normal)||1;}normal=normal.map(v=>v/n);
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));return start.map((v,i)=>v+axis[i]*along+normal[i]*height);
}
// Guided release poses are scoped to cliff/pole failures, never successful movement.
export function beginGuidedFall(g){
 const hit=g.lastCollision,kind=hit?.kind==='cliff'||g.node.kind==='cliff'?'cliff':hit?.kind==='pole'||g.node.kind==='pole'||g.state==='fly'&&g.target().kind==='pole'?'pole':null;
 if(!kind)return;
 const pose=athletePose(g),direction=athleteDirection(g),yaw=athleteYaw(g,pose,direction),turn=athleteTurn(g);
 let near=false;if(kind==='pole'){
 const n=hit?.kind==='pole'?g.anchorNode(COURSE[hit.node]):g.node.kind==='pole'&&g.state==='hang'?g.anchorNode(g.node):g.target();
 near=n.kind==='pole'&&Math.hypot(g.p.x-n.x,g.p.z-n.z)<85&&Math.abs(g.p.y-n.y)<180;
 }
 const f={time:0,pose:structuredClone(pose),direction:{...direction},yaw,turn,near,reachSide:g.pose.armCycle% (Math.PI*2)>Math.PI?-1:1};
 g[kind==='cliff'?'cliffFall':'poleFall']=f;
 // Preserve existing airborne momentum; a hanging cliff release also retains its swing.
 if(kind==='cliff'&&g.state==='hang'&&Math.hypot(g.p.vx,g.p.vy,g.p.vz)<1){const speed=100*g.omega;g.p.vx=speed*Math.cos(g.angle)*direction.x;g.p.vz=speed*Math.cos(g.angle)*direction.z;g.p.vy=-speed*Math.sin(g.angle);}
 const limit=kind==='cliff'?[1.25,.65,1.1]:[.9,.55,.8];for(const [i,k]of['x','y','z'].entries())g.tumble['w'+k]=clamp(g.tumble['w'+k],-limit[i],limit[i]);
}
function guidedFallPose(g,f,pole){
 const p=structuredClone(f.pose),t=f.time,release=smooth((t-.06)/(pole?.55:.4));
 p.wrist=(f.pose.reverse?Math.PI:f.pose.pinch?Math.PI/2:0)*(1-release);p.reverse=false;p.pinch=false;p.pole=f.pose.pole*(1-release);
 for(const [i,side]of[-1,1].entries()){
 const arm=smooth((t-.08-(side===f.reachSide?.09:0))/(pole?.5:.38));
 // Fingers slip off the lip before the arms lower. The knees remain soft and asymmetric.
 p.hands[i]=mix(f.pose.hands[i],[side*(pole?.23:.28),pole?-.20:-.10,pole?.27:.12],arm);
 p.elbows[i]=joint2(p.shoulders[i],p.hands[i],BODY.upperArm,BODY.foreArm,[side*.9,0,-.6]);
 const leg=smooth((t-.03)/.42),end=[side*.17,-BODY.reach+(side<0?.18:.31),pole?.18:.26];
 p.feet[i]=mix(f.pose.feet[i],end,leg);p.knees[i]=joint2(p.hips[i],p.feet[i],BODY.thigh,BODY.shin,[side*.15,0,1]);
 }
 return p;
}
// Only retirement motion uses this profile; live edge poses are unchanged.
export function beginEdgeFall(g){
 if(g.cliffFall||g.poleFall)return;
 if(!(g.node.kind==='edge'||g.state==='fly'&&g.target().kind==='edge'||g.lastCollision?.kind==='edge'))return;
 const pose=athletePose(g),direction=athleteDirection(g),hit=g.lastCollision?.kind==='edge'?g.lastCollision:null;
 g.edgeFall={time:0,pose:structuredClone(pose),direction:{...direction},back:!!hit&&(hit.part==='acrylic'||['head','torso','hip'].includes(hit.bodyPart)),reachSide:g.p.vz<0?-1:1};
 // A lost grip carries the existing body swing into free flight.
 if(g.state==='hang'&&g.node.kind==='edge'&&Math.hypot(g.p.vx,g.p.vy,g.p.vz)<1){
 const speed=100*g.omega;g.p.vx=speed*Math.cos(g.angle)*direction.x;g.p.vz=speed*Math.cos(g.angle)*direction.z;g.p.vy=-speed*Math.sin(g.angle);
 }
 // Edge clips show a limited tilt, rather than repeated whole-body cartwheels.
 for(const [k,limit]of[['x',2.6],['y',.9],['z',2.2]])g.tumble['w'+k]=clamp(g.tumble['w'+k],-limit,limit);
}
function edgeFallPose(g){
 const f=g.edgeFall,p=structuredClone(f.pose),t=f.time,release=smooth(t/.28),brace=smooth((t-.04)/.36);
 p.wrist=(f.pose.reverse?Math.PI:0)*(1-release);p.reverse=false;p.pinch=false;p.pole=f.pose.pole*(1-release);
 for(const [i,side]of[-1,1].entries()){
 // One arm reaches a little longer, then both elbows bend as the grip is lost.
 const arm=smooth((t-(f.back?0:.10)-(side===f.reachSide?.07:0))/.3);
 p.hands[i]=mix(f.pose.hands[i],[side*(f.back?.32:.26),f.back?-.43:-.12,f.back?.26:.16],arm);
 p.elbows[i]=joint2(p.shoulders[i],p.hands[i],BODY.upperArm,BODY.foreArm,[side*(.9+.1*arm),.1*arm,-.6]);
 // Legs separate and knees soften; misses with torso contact prepare a seated/back entry.
 p.feet[i]=mix(f.pose.feet[i],[side*(.18+.045*(side>0)),-BODY.reach+(f.back?.5:.24)+(side>0?.10:0),f.back?.43:.21],brace);
 p.knees[i]=joint2(p.hips[i],p.feet[i],BODY.thigh,BODY.shin,[side*(.15+.05*brace),0,1]);
 }
 return p;
}
export function athletePose(g){
 if(g.state==='fall'&&(g.cliffFall||g.poleFall))return guidedFallPose(g,g.cliffFall||g.poleFall,!!g.poleFall);
 if(g.state==='fall'&&g.edgeFall)return edgeFallPose(g);
 const n=g.node,hang=g.state==='hang',walk=g.state==='stand',pole=poleBlend(g),rotation=n.kind==='burst'?g.rotation[g.burstKey(n)]:null,turning=hang&&rotation&&['rotating','regrip'].includes(rotation.phase),pullEffort=turning?Math.sin(Math.PI*Math.min(1,rotation.angle/BURST.turn)):0,angle=swingAngle(g)+pullEffort*.22;const absorb=hang?clamp(1-g.sinceCatch/.42,0,1)*Math.min(.13,g.lastShock*.014):0;const kickTime=g.poleKick&&n.kind==='pole'&&hang?clamp(g.poleKick.time/POLE_KICK_SECONDS,0,1):0,kick=smooth((kickTime-.35)/.65),compress=smooth(kickTime/.35)*(1-kick),rotorLift=.12*pullEffort;
 const pose={angle,pole,head:[BODY.head[0],BODY.head[1]+absorb,BODY.head[2]],torso:[0,-.9+absorb+rotorLift,-.08*pole],hip:[0,BODY.hipY+absorb+rotorLift,-.12*pole],eye:[...BODY.eye],hands:[],elbows:[],shoulders:[],hips:[],knees:[],feet:[],reverse:n.kind==='edge',pinch:n.kind==='cliff'||n.kind==='burst'};
 pose.eye[1]+=absorb;
 if(hang&&n.kind==='pole'){pose.angle+=.3*kick-.1*compress;pose.hip[1]+=.10*compress-.05*kick;pose.torso[1]+=.04*compress;}
 for(const side of[-1,1]){
  const shoulder=[side*.17,BODY.shoulderY+absorb+.05*pole+rotorLift,-.04*pole];let hand=[side*(n.kind==='edge'?(n.shape==='X'?.36:.07):.17),0,.24*pole];
  if(pole>.01){hand[1]=Math.sin(g.pose.climb+(side<0?Math.PI:0))*.07*pole;}
  if(hang&&pose.pinch&&n.kind!=='burst'&&!g.handover){
   // While one hand advances, the other remains stationary in world space.
   const stride=.24,phase=g.offset/100/stride+(side<0?.5:0),f=phase-Math.floor(phase),u=clamp((f-.72)/.28,0,1);
   const reverse=n.kind==='burst'||n.local!==1;hand[0]=(reverse?-hand[0]:hand[0])+stride*(smooth(u)-f);hand[1]-=Math.sin(u*Math.PI)*.04;
   // Keep fingertips on the physical lip, including its ends; local X reverses when facing the board.
   hand[0]=clamp(hand[0],-g.offset/100+.025,(n.len-g.offset)/100-.025);
   if(reverse)hand[0]*=-1;if(n.kind==='burst'&&g.rotation[g.burstKey(n)]?.phase==='regrip')hand[1]-=.065*Math.max(0,Math.sin(Math.PI*clamp((g.rotation[g.burstKey()].regripAlpha-(side<0?0:.35))/.65,0,1)));
  }
  if(hang&&(n.kind==='burst'||g.handover)){
   const cycle=g.pose.armCycle+(side<0?Math.PI:0);hand=[side*.17+.045*Math.sin(cycle),-.025*Math.max(0,Math.sin(cycle)),0];
   let delta=null;
   if(g.handover)delta=burstReachDelta(g.handover.progress,side,g.handover.delta);
   else if(rotation?.phase==='regrip')delta=burstReachDelta(rotation.reachProgress||0,side,{x:0,y:BURST.radius*(Math.cos(BURST.gripAngle)-1),z:BURST.radius*Math.sin(BURST.gripAngle)});
   if(delta)hand=hand.map((v,i)=>v+delta[i]);
  }
  if(g.state==='fly'){const reach=poleApproach(g);hand=mix(hand,[side*.21,-.12,.38],reach);if(n.kind==='pole')hand=mix([side*.24,-.22,.48],hand,reach);}
  if(walk){hand=[side*.22,-1.15,side*Math.sin(g.pose.armCycle)*.15];}
  const elbow=joint2(shoulder,hand,BODY.upperArm,BODY.foreArm,[side*.9,0,-.6]);
  const hip=[side*.105,BODY.hipY-.08+absorb+rotorLift,-.1*pole];let foot=[side*.13,-BODY.reach,.07];
  if(hang&&!pose.pinch&&pole<.01){const tuck=Math.abs(g.pose.pump||0)*(.5+.5*Math.cos(g.angle*3));foot[1]+=.18*tuck;foot[2]-=.12*tuck;}
  if(g.state==='fly'){foot[1]+=.34*flightTuck(g);}
  if(hang&&pose.pinch){const cycle=g.pose.armCycle+(side<0?Math.PI:0);foot[1]+=.08*Math.max(0,Math.sin(cycle));foot[2]+=.07*Math.sin(cycle);if(n.kind==='burst'&&n.rotating){const speed=Math.abs(g.rotation[g.burstKey(n)]?.omega||0);foot[1]+=Math.min(.34,speed*.22)*(side>0?1:.35);foot[2]+=.12*Math.min(1,speed);}}
  if(walk){const phase=g.pose.armCycle+(side<0?Math.PI:0);foot[1]+=.065*Math.max(0,Math.sin(phase));foot[2]+=.22*Math.cos(phase);}
  const climbing=pole>.5&&g.state==='hang',step=climbing?Math.max(0,Math.sin(g.pose.climb+(side<0?Math.PI:0))):0;foot=mix(foot,[side*(.24-.05*kick),-1.04+step*.15+.22*compress-.55*kick,.37-step*.06+.07*compress-.32*kick],pole);if(g.state==='fly'&&n.kind==='pole'){const kick=(1-smooth(g.flightTime/.18))*pole;foot[1]-=.32*kick;foot[2]-=.18*kick;}const knee=joint2(hip,foot,BODY.thigh,BODY.shin,[side*.15,0,1]);
  pose.shoulders.push(shoulder);pose.hands.push(hand);pose.elbows.push(elbow);pose.hips.push(hip);pose.feet.push(foot);pose.knees.push(knee);
 }
 // Carry the loaded push-off pose into flight, then unfold into a reaching jump.
 if(g.state==='fly'&&n.kind==='pole'&&g.poleLaunchPose){
  const from=g.poleLaunchPose,t=smooth(g.flightTime/.22);pose.angle=from.angle*(1-t)-.16*Math.sin(Math.PI*clamp(g.flightTime/.65,0,1))*t;
  for(const key of ['head','torso','hip','eye'])pose[key]=mix(from[key],pose[key],t);
  for(let i=0;i<2;i++){
   const side=i===0?-1:1;for(const key of ['hands','shoulders','hips','feet'])pose[key][i]=mix(from[key][i],pose[key][i],t);
   pose.elbows[i]=joint2(pose.shoulders[i],pose.hands[i],BODY.upperArm,BODY.foreArm,[side*.9,0,-.6]);
   pose.knees[i]=joint2(pose.hips[i],pose.feet[i],BODY.thigh,BODY.shin,[side*.15,0,1]);
  }
 }
 return pose;
}
