// Separate physical contact geometry. Grip success volumes live in engine.mjs.
// Units: cm, seconds, kg. Athlete: 70 kg; obstacles use constrained effective mass.
import {athletePose,athleteDirection,athleteYaw,athleteTurn} from './motion.mjs';
import {COURSE,FINISH,AREA_INFO} from './course.mjs';
import {BURST,burstFins} from './burst.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a),unit=a=>mul(a,1/(length(a)||1));
const ID=[[1,0,0],[0,1,0],[0,0,1]];
function rotate(v,axis,a){const c=Math.cos(a),s=Math.sin(a);return add(add(mul(v,c),mul(cross(axis,v),s)),mul(axis,dot(axis,v)*(1-c)));}
const transform=(p,basis)=>basis.reduce((out,v,i)=>add(out,mul(v,p[i])),[0,0,0]);
export function bodySamples(g,p=g.p){
 const pose=athletePose(g),d=athleteDirection(g),yaw=athleteYaw(g,pose,d);
 const forward=Math.sin(yaw)*d.x+Math.cos(yaw)*d.z,angle=-pose.angle*(forward<-.1?-1:1),turn=athleteTurn(g);
 const root=[p.x-d.x*29*pose.pole,p.y,p.z-d.z*29*pose.pole];
 const points=[...pose.hands.map(v=>({v,r:2,part:'hand'})),...pose.elbows.map(v=>({v,r:4,part:'elbow'})),...pose.knees.map(v=>({v,r:5,part:'knee'})),{v:pose.head,r:10,part:'head'},{v:pose.torso,r:14,part:'torso'},{v:pose.hip,r:13,part:'hip'},...pose.feet.map(v=>({v,r:7,part:'foot'}))];
 return points.map(s=>{let v=rotate(s.v,[0,1,0],turn);v=rotate(v,[1,0,0],angle);v=rotate(v,[0,1,0],yaw);v=[v[0]*100,-v[1]*100,v[2]*100];if(g.state==='fall'&&g.tumble){v[1]-=100;v=rotate(v,[1,0,0],g.tumble.x);v=rotate(v,[0,1,0],g.tumble.y);v=rotate(v,[0,0,1],g.tumble.z);v[1]+=100;}return {...s,p:add(root,v)};});
}
function box(center,half,node,basis=ID,part='frame'){return {center,half,node,basis,part,bound:Math.hypot(...half)};}
export function obstacleShapes(g,n){
 const a=g.anchorNode(n),o=[a.x,a.y,a.z],out=[];
 const push=(c,h,b=ID,part='frame')=>out.push(box(add(o,c),h,n,b,part));
 if(n.kind==='pole'){out.push({node:n,center:o,radius:21,lo:-103,hi:106,part:'cylinder',bound:109});}
 else if(n.kind==='bar'){
  push([0,0,0],[2.8,2.8,68],ID,'bar');for(const z of[-52,52]){push([0,-2,z],[29,4,9],ID,'cradle');for(const x of[-24,24])push([x,-74,z],[2.2,72,2.2]);}
 }else if(n.kind==='edge'){
  const q=g.edgeAngle(n),basis=ID.map(v=>rotate(v,[0,0,1],-q)),pivot=[a.x-110*Math.sin(q),a.y-110*Math.cos(q),a.z];
  const localBox=(c,h,part='frame',b=basis)=>out.push(box(add(pivot,transform(c,basis)),h,n,b,part));
  const strut=(u,v)=>{const dir=unit(sub(v,u)),side=[1,0,0],axes=[side,dir,unit(cross(side,dir))];localBox(mul(add(u,v),.5),[2.25,length(sub(v,u))/2,2.75],'strut',axes.map(v=>transform(v,basis)));};
  if(n.shape==='X'){strut([0,0,-43],[0,105.5,43]);strut([0,0,43],[0,105.5,-43]);}else{strut([0,0,-43],[0,50,0]);strut([0,0,43],[0,50,0]);strut([0,50,0],[0,105.5,0]);}
  for(const z of n.shape==='X'?[-43,43]:[0])localBox([0,105.5,z],[8,4.5,14],'grip');
  if(n.acrylic)localBox([4.5,65,0],[.6,45,57],'acrylic');
 }else if(n.kind==='cliff'){
  const back=n.local===1?1:-1;push([n.len/2,-35,back*32],[(n.len+12)/2,35,30],ID,'wall');push([n.len/2,-1.5,n.local===1?-1.5:1.5],[n.len/2,3,1.5],ID,'lip');
 }else if(n.kind==='burst'){
  const pivot=[a.x,a.y-BURST.radius,a.z],angle=g.burstAngle(n);
  for(const fin of burstFins(n)){
   const basis=ID.map(v=>rotate(v,[1,0,0],fin.angle-angle)),mid=(fin.start+fin.end)/2,half=(fin.end-fin.start)/2;
   out.push(box(add(pivot,transform([mid,(BURST.radius+BURST.coreRadius)/2,0],basis)),[half,(BURST.radius-BURST.coreRadius)/2,1.5],n,basis,'fin'));
   out.push(box(add(pivot,transform([mid,BURST.radius,0],basis)),[half,3.5,1.75],n,basis,fin.grip?'lip':'decoration'));
  }
  out.push(box(add(pivot,[n.len/2,0,0]),[n.len/2,BURST.coreRadius,BURST.coreRadius],n,ID,'axle'));
 }else if(n.kind==='pipe'){
  for(const z of[-52,52])push([n.len/2,-4.5,z],[n.len/2,3,3],ID,'rail');const m=g.impactMotion[n.id];push([n.id===g.nodeIndex?g.offset:m?.x||0,0,0],[3,3,68],ID,'pipe');
 }else if(n.kind==='deck'||n.kind==='finish')push([n.len/2,18,0],[n.len/2+(n.landingMargin||0),18,100+(n.landingMargin||0)],ID,'platform');
 return out;
}
// Continuous slab intersection against oriented boxes, expanded by a body sphere.
export function sweepBox(from,to,shape,radius=0){
 const a=shape.basis.map(v=>dot(sub(from,shape.center),v)),b=shape.basis.map(v=>dot(sub(to,shape.center),v)),d=sub(b,a);let lo=0,hi=1,normal=null;
 for(let k=0;k<3;k++){const h=shape.half[k]+radius;if(Math.abs(d[k])<1e-9){if(Math.abs(a[k])>h)return null;continue;}let t1=(-h-a[k])/d[k],t2=(h-a[k])/d[k],sign=-1;if(t1>t2){[t1,t2]=[t2,t1];sign=1;}if(t1>=lo){lo=t1;normal=mul(shape.basis[k],sign);}hi=Math.min(hi,t2);if(lo>hi)return null;}
 if(lo<0||lo>1||!normal)return null;return {t:lo,normal,point:add(from,mul(sub(to,from),lo))};
}
function sweepCylinder(from,to,s,r){
 const a=sub(from,s.center),d=sub(to,from),R=s.radius+r,lo=s.lo-r,hi=s.hi+r,A=d[0]**2+d[2]**2,B=2*(a[0]*d[0]+a[2]*d[2]),C=a[0]**2+a[2]**2-R*R,hits=[];
 if(A>1e-10){const disc=B*B-4*A*C;if(disc>=0){const t=(-B-Math.sqrt(disc))/(2*A),y=a[1]+d[1]*t;if(t>=0&&t<=1&&y>=lo&&y<=hi)hits.push({t,normal:unit([a[0]+d[0]*t,0,a[2]+d[2]*t])});}}
 if(Math.abs(d[1])>1e-10)for(const [y,sign]of[[lo,-1],[hi,1]]){const t=(y-a[1])/d[1];if(t>=0&&t<=1&&(a[0]+d[0]*t)**2+(a[2]+d[2]*t)**2<=R*R)hits.push({t,normal:[0,sign,0]});}
 const h=hits.sort((a,b)=>a.t-b.t)[0];return h?{...h,point:add(from,mul(d,h.t))}:null;
}
export function findContact(g,prev,next){
 const from=bodySamples(g,prev),to=bodySamples(g,next);let best=null;
 for(const n of [...COURSE,{...FINISH,kind:'finish',id:COURSE.length}]){
  // Ground is a snap-to-standing surface, never an impulse collider.
  if(n.kind==='deck'||n.kind==='finish')continue;
  if(n.id===g.nodeIndex||g.contactCooldown[n.id]>g.time||Math.abs(n.x-next.x)>n.len+260+Math.abs(next.x-prev.x))continue;
  for(const shape of obstacleShapes(g,n))for(let i=0;i<from.length;i++){
   const motion=length(sub(to[i].p,from[i].p)),distance=sub(to[i].p,shape.center),bound=shape.bound+from[i].r+motion;if(dot(distance,distance)>bound*bound)continue;
   const surface=contactDynamics(g,{node:n,shape,point:from[i].p,normal:[0,0,0]}).velocity,delta=mul(surface,g.lastStepDt||1/120),relativeFrom=add(from[i].p,delta);
   const hit=shape.radius?sweepCylinder(relativeFrom,to[i].p,shape,from[i].r):sweepBox(relativeFrom,to[i].p,shape,from[i].r);if(hit)hit.point=sub(hit.point,mul(delta,1-hit.t));if(hit&&(!best||hit.t<best.t))best={...hit,node:n,shape,part:from[i].part};
  }
 }
 return best;
}
export function contactDynamics(g,hit){
 const n=hit.node,a=g.anchorNode(n),m=g.impactMotion[n.id]||{},pivot=n.kind==='edge'?[n.x,n.y-110,n.z]:n.kind==='burst'?[a.x,a.y-26,a.z]:[a.x,a.y,a.z],lever=sub(hit.point,pivot);
 let velocity=[m.vx||0,0,m.vz||0],inv=0;
 if(n.motion==='vertical')velocity[1]+=45*1.05*Math.cos(g.time*1.05);if(n.motion==='depth')velocity[2]-=45*.8*Math.cos(g.time*.8+.9);
 if(n.kind==='pole'){if(n.spin)velocity=add(velocity,cross([0,n.spinRate||0,0],lever));inv=(hit.normal[0]**2+hit.normal[2]**2)/35;const load=g.loads[n.id];if(n.drop&&load!==undefined&&g.time-load<.32)velocity[1]+=n.drop/.32;}
 if(n.kind==='edge'){velocity=add(velocity,cross([0,0,-(m.omega||0)],lever));const arm=cross(lever,hit.normal)[2];inv=arm*arm/605000;}
 if(n.kind==='burst'&&n.rotating&&hit.shape.part!=='fixed-panel'){velocity=add(velocity,cross([-BURST.rotationSign*(g.rotation[g.burstKey(n)]?.omega||0)-(m.omega||0),0,0],lever));const arm=cross(lever,hit.normal)[0];inv=arm*arm/24000;}
 if(n.kind==='pipe'&&hit.shape.part==='pipe')inv=hit.normal[0]**2/18;
 return {velocity,inv,lever};
}
// Impulse at contact: restitution in the normal, Coulomb-limited tangential friction.
export function solveImpulse(velocity,normal,surfaceVelocity=[0,0,0],objectInvMass=0,{restitution=.18,frictionCoefficient=.16}={}){
 const relative=sub(velocity,surfaceVelocity),vn=dot(relative,normal);if(vn>=0)return null;
 const denom=1/70+objectInvMass,j=-(1+restitution)*vn/denom,tangent=sub(relative,mul(normal,vn)),speed=length(tangent),friction=Math.min(frictionCoefficient*j,speed/denom),impulse=sub(mul(normal,j),mul(unit(tangent),friction));
 return {velocity:add(velocity,mul(impulse,1/70)),impulse,closingSpeed:-vn};
}
export function applyContact(g,hit,prev,next){
 const d=contactDynamics(g,hit),sliding=hit.node.kind==='pole',result=solveImpulse([next.vx,next.vy,next.vz],hit.normal,d.velocity,d.inv,sliding?{restitution:0,frictionCoefficient:.04}:{});if(!result)return false;
 const position=add([prev.x,prev.y,prev.z],mul(sub([next.x,next.y,next.z],[prev.x,prev.y,prev.z]),hit.t));
 [g.p.x,g.p.y,g.p.z]=add(position,mul(hit.normal,.7));[g.p.vx,g.p.vy,g.p.vz]=result.velocity;
 const opposite=mul(result.impulse,-1),m=g.impactMotion[hit.node.id]||={x:0,z:0,vx:0,vz:0,angle:0,omega:0},n=hit.node;
 if(n.kind==='pole'){m.vx+=opposite[0]/35;m.vz+=opposite[2]/35;}if(n.kind==='edge')m.omega-=cross(d.lever,opposite)[2]/605000;if(n.kind==='burst'&&n.rotating&&hit.shape.part!=='fixed-panel')m.omega-=cross(d.lever,opposite)[0]/24000;if(n.kind==='pipe'&&hit.shape.part==='pipe')m.vx+=opposite[0]/18;
 const limits=g.cliffFall?[1.25,.65,1.1]:g.poleFall?[.9,.55,.8]:g.edgeFall?[2.6,.9,2.2]:[8,8,8];
 const angular=mul(cross(sub(hit.point,[g.p.x,g.p.y+100,g.p.z]),result.impulse),1/233333);for(const [i,k]of['x','y','z'].entries())g.tumble['w'+k]=clamp(g.tumble['w'+k]+angular[i],-limits[i],limits[i]);
 g.lastCollision={node:n.id,kind:n.kind,label:AREA_INFO[n.stage]?.[0]||'足場',part:hit.shape.part,bodyPart:hit.part,normal:hit.normal,closingSpeed:result.closingSpeed,impulse:result.impulse};g.events.push('collision');
 g.fail(g.missedGrip||'装置への衝突で体勢を崩した');return true;
}
