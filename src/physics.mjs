import {SCREW,screwPose,screwPoint,screwGripOffset,screwVelocity} from './screw-motion.mjs';
import {gliderSlope,advanceGlider,glideTimeScale} from './glider-motion.mjs';
import {AREAS,platforms,grips,position,orbitVertices,surfaceAt,rotors,rotorArms,presses,gliders,gliderPoint,netRoute,WALL,TIME_LIMIT,safeLinkAt,areaAt,spawnFor,FINISH} from './course.mjs';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CONFIG={gravity:19.62,jump:8.6,walk:4.15,run:6.7,accel:18,airAccel:3.2,airSideAccel:18,body:1.65,step:1/120};
export class Game{
 constructor(){this.reset();this.status='menu';}
 reset({practice=false,stage=0}={}){
 Object.assign(this,{practice,startStage:stage,p:{...spawnFor(stage),vx:0,vy:0,vz:0},status:'playing',state:'ground',time:0,worldTime:0,stamina:100,cleared:new Set(),ground:null,hang:null,cooldown:0,coyote:.1,jumpBuffer:0,reason:'',events:[],stage,wasJump:false,splash:null,loads:{},pressed:{},pressStarted:{},panels:new Set(),hazardCooldown:0,wallSpeed:0,wallS:0,wallQualified:false,wallCaught:false,wallCleared:false,netCaught:false,netCleared:false,gliderOffsets:{},gliderScales:{},gliderSpeeds:{},gliderImpactSpeeds:{},gliderActive:new Set(),gliderCaught:new Set(),gliderTransferFrom:null,gliderLanded:false,orbitTouched:new Set(),springLaunch:false,screwStartedAt:null,screwCaught:false,screwLanded:false,wallAttempts:0,wallRetrying:false});this.maxX=this.p.x;
 }
 fail(reason){if(this.status!=='playing')return;this.status='failed';this.reason=reason;this.events.push('splash');this.splash={x:this.p.x,z:this.p.z,time:this.worldTime};}
 jump(){this.jumpBuffer=.16;}
 detach(jump=false){const h=this.hang;if(!h)return;const p=this.p,n=h.n;
 if(n.kind==='swing'){const tangent=n.length*h.omega;p.vx=tangent*Math.cos(h.angle);p.vy=tangent*Math.sin(h.angle)+(jump?(n.id==='giant'?2.5:.35):0);}
 else if(n.kind==='screw'){const v=screwVelocity(this.screwElapsed,h.screwOffset);p.vx=v.x+(jump?3.6:0);p.vy=v.y+(jump?5.8:0);p.vz=v.z;}
 else if(n.kind==='net'){p.vx=jump?5.5:0;p.vy=jump?3.2:0;}
 else if(n.kind==='glider'){const impact=this.gliderImpactSpeeds[n.id]||0,speed=(this.gliderSpeeds[n.id]||0)||impact*Math.exp(-10*(h.endTime||0));p.vx=Math.max(0,speed+.9*h.omega*Math.cos(h.angle));p.vy=jump?(n.order===0?2.2:.2)+Math.max(0,gliderSlope(n,this.gliderOffsets[n.id]||0)*speed)+Math.max(0,.9*h.omega*Math.sin(h.angle)):gliderSlope(n,this.gliderOffsets[n.id]||0)*speed;this.gliderTransferFrom=n.id;}
 else {p.vx=h.speed||3.4;p.vy=jump?5.4:0;}
 this.state='air';this.hang=null;this.cooldown=n.kind==='glider'?.08:.32;this.events.push('jump');
 }
 attach(n,point){this.hang={n,angle:0,omega:clamp(this.p.vx/n.length,-2,2),offset:clamp(point.x-n.x,0,n.length),speed:0,mantle:0,netT:0,endTime:0,screwOffset:0};this.p.vy=0;this.state='hang';this.stamina=Math.max(0,this.stamina-2);if(n.kind==='screw'){this.screwCaught=true;this.hang.screwOffset=screwGripOffset(point,screwPose(this.screwElapsed));}if(n.kind==='net')this.netCaught=true;if(n.kind==='glider'){this.gliderCaught.add(n.id);this.gliderActive.add(n.id);const incoming=Math.max(2,Math.min(8,this.p.vx));this.gliderScales[n.id]=glideTimeScale(n,incoming);this.gliderSpeeds[n.id]=incoming*this.gliderScales[n.id];}if(n.kind==='ledge')this.wallCaught=true;this.events.push('catch');}
 gripPoint(n){if(n.kind==='screw')return screwPoint(this.screwElapsed);if(n.kind==='glider')return gliderPoint(n,this.gliderOffsets[n.id]||0);if(n.kind==='swing')return{x:n.x,y:n.y-n.length,z:n.z};return{x:n.x,y:n.y,z:n.z};}
 get screwElapsed(){return this.screwStartedAt===null?0:Math.max(0,this.worldTime-this.screwStartedAt-SCREW.startDelay);}
 get canStartScrew(){return this.status==='playing'&&this.screwStartedAt===null&&this.state==='ground'&&this.p.x>=135.4&&this.p.x<=138.6;}
 startScrew(){if(!this.canStartScrew)return false;this.screwStartedAt=this.worldTime;this.events.push('machineStart');return true;}
 step(dt,input={}){if(this.status!=='playing')return;let left=Math.min(dt,.05);while(left>1e-8){const h=Math.min(CONFIG.step,left);this.integrate(h,input);left-=h;if(this.status!=='playing')break;}}
 wallStep(dt,i,forward){
 const p=this.p,param=this.wallS/WALL.radius,theta=Math.atan2(WALL.height*Math.sin(param),WALL.radius*Math.cos(param));
 this.wallSpeed+=((i.run&&forward>0?16:3)*Math.cos(theta)-CONFIG.gravity*Math.sin(theta)-this.wallSpeed*.10)*dt;
 this.wallS=Math.max(0,this.wallS+this.wallSpeed*dt*WALL.radius/Math.hypot(WALL.radius*Math.cos(param),WALL.height*Math.sin(param)));const q=this.wallS/WALL.radius;
 p.x=WALL.start+WALL.radius*Math.sin(q);p.y=WALL.base+WALL.height*(1-Math.cos(q));const tangent=Math.atan2(WALL.height*Math.sin(q),WALL.radius*Math.cos(q));p.vx=this.wallSpeed*Math.cos(tangent);p.vy=this.wallSpeed*Math.sin(tangent);p.vz=0;
 const hand={x:p.x,y:p.y+CONFIG.body,z:p.z};
 if(i.grip&&this.wallQualified&&Math.abs(hand.y-WALL.lipY)<.5&&Math.abs(p.x-WALL.lipX)<.65){const n=grips.find(n=>n.kind==='ledge');this.attach(n,n);p.x=n.x;p.y=n.y-CONFIG.body;this.jumpBuffer=0;return;}
 if(forward<0||this.wallSpeed<=0||q>=1.45||this.jumpBuffer>0){this.jumpBuffer=0;this.state='air';this.ground=null;this.cooldown=.15;this.wallAttempts++;this.wallRetrying=true;p.vx=-Math.max(1.8,Math.min(3.2,Math.abs(this.wallSpeed)*.35));p.vy=this.wallSpeed<=0?-1:-2;this.events.push('slip');}
 }
 updateGliders(dt){for(const n of gliders){if(!this.gliderActive.has(n.id))continue;let offset=this.gliderOffsets[n.id]||0,speed=this.gliderSpeeds[n.id]||0;
 if(offset<n.length){const next=advanceGlider(n,offset,speed,dt,this.gliderScales[n.id]||1);speed=next.speed;offset=next.offset;if(offset>=n.length){this.gliderImpactSpeeds[n.id]=speed;offset=n.length;speed=0;}}
 this.gliderOffsets[n.id]=offset;this.gliderSpeeds[n.id]=speed;
 }}
 integrate(dt,i){this.worldTime+=dt;this.time+=dt;this.updateGliders(dt);this.cooldown=Math.max(0,this.cooldown-dt);this.hazardCooldown=Math.max(0,this.hazardCooldown-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);const p=this.p;
 if(i.jump&&!this.wasJump)this.jump();this.wasJump=!!i.jump;
 if(!this.practice&&this.time>=TIME_LIMIT){this.fail('制限時間を使い切った');return;}
 const forward=clamp(i.forward||0,-1,1),side=clamp(i.side||0,-1,1);
 if(this.state==='wallrun')this.wallStep(dt,i,forward);
 else if(this.state==='hang'){
 const h=this.hang,n=h.n;this.stamina=Math.max(0,this.stamina-dt*(n.kind==='screw'?2.7:2.1));
 // HOLD is only required at catch time. Releasing it never detaches an existing grip.
 if(this.stamina<=0||this.jumpBuffer>0){const launch=this.jumpBuffer>0;this.jumpBuffer=0;this.detach(launch);return;}
 if(n.kind==='screw'){const q=screwPoint(this.screwElapsed,h.screwOffset);p.x=q.x;p.y=q.y-CONFIG.body;p.z=q.z;}
 else if(n.kind==='swing'){
 h.omega+=(-CONFIG.gravity/n.length*Math.sin(h.angle)+forward*4.3-h.omega*.17)*dt;h.angle+=h.omega*dt;
 if(Math.abs(h.angle)>1.23){h.angle=clamp(h.angle,-1.23,1.23);h.omega*=-.12;}
 p.x=n.x+n.length*Math.sin(h.angle);p.y=n.y-n.length*Math.cos(h.angle)-CONFIG.body;p.z=n.z;
 }else if(n.kind==='net'){
 if(h.netT===0&&p.y<n.top-CONFIG.body-.005){p.x=n.x;p.z=clamp(p.z+side*1.5*dt,-1.25,1.25);p.y=clamp(p.y+forward*1.9*dt,n.bottom-CONFIG.body,n.top-CONFIG.body);}
 else {h.netT=clamp(h.netT+forward*2.2*dt/(n.routeEnd-n.x),0,1);const q=netRoute(n,h.netT);p.x=q.x;p.y=q.y-CONFIG.body;p.z=0;
 if(h.netT>=1){this.netCleared=true;this.state='ground';this.hang=null;this.ground=platforms.find(n=>n.id==='rest6');p.y=this.ground.y;p.vx=1.5;p.vy=0;this.events.push('land');}}
 }else if(n.kind==='glider'){
 const offset=this.gliderOffsets[n.id]||0,q=gliderPoint(n,offset);if(offset>=n.length)h.endTime+=dt;
 h.omega+=(-CONFIG.gravity/.9*Math.sin(h.angle)+forward*4-h.omega*1.0)*dt;h.angle=clamp(h.angle+h.omega*dt,-.55,.55);
 p.x=q.x+.9*Math.sin(h.angle);p.y=q.y-CONFIG.body+.9*(1-Math.cos(h.angle));p.z=q.z;

 }else if(n.kind==='ledge'){
 if(forward>0)h.mantle=Math.min(1,h.mantle+dt/.65);p.x=n.x+.8*h.mantle;p.y=n.y-CONFIG.body*(1-h.mantle);
 if(h.mantle>=1){this.wallCleared=true;this.state='ground';this.hang=null;this.ground=platforms.find(n=>n.id==='summit');p.vx=0;p.vy=0;this.events.push('land');}
 }else{
 h.speed=forward*2.3;h.offset=clamp(h.offset+h.speed*dt,0,n.length);p.x=n.x+h.offset;p.z=n.z;p.y=n.y-CONFIG.body;
 }
 }else{
 const old={...p},wasGround=this.state==='ground',base=this.ground;
 if(wasGround&&base){
 if(base.motion==='orbit'){const da=base.rate*dt,x=p.x-base.x,y=p.y-base.y;p.x=base.x+x*Math.cos(da)-y*Math.sin(da);p.y=base.y+x*Math.sin(da)+y*Math.cos(da);}
 else {const a=position(base,this.worldTime-dt,this.loads),b=position(base,this.worldTime,this.loads);p.x+=b.x-a.x;p.z+=b.z-a.z;p.y+=b.y-a.y;}
 }
 const magnitude=Math.hypot(forward,side)||1,speed=i.run?CONFIG.run:CONFIG.walk,rate=(wasGround?CONFIG.accel:CONFIG.airAccel)*dt;
 p.vx+=clamp(forward/Math.max(1,magnitude)*speed-p.vx,-rate,rate);const sideRate=(wasGround?CONFIG.accel:CONFIG.airSideAccel)*dt;p.vz+=clamp(side/Math.max(1,magnitude)*speed-p.vz,-sideRate,sideRate);
 if(wasGround&&!forward)p.vx*=Math.exp(-12*dt);if(wasGround&&!side)p.vz*=Math.exp(-12*dt);
 this.coyote=wasGround?.10:Math.max(0,this.coyote-dt);
 if(this.jumpBuffer>0&&this.coyote>0){
 const spring=base?.spring&&i.run&&p.vx>5.6;p.vy=spring?(base.jumpBoost||13.2):CONFIG.jump;this.springLaunch=!!spring;this.state='air';this.ground=null;this.coyote=0;this.jumpBuffer=0;this.events.push(spring?'spring':'jump');
 }
 if(this.state==='air')p.vy-=CONFIG.gravity*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
 const apron=platforms.find(n=>n.wallSafety);if(apron&&p.x>=apron.x-apron.w/2&&p.x<=apron.x+apron.w/2+1&&p.y>=apron.y-.06){p.x=Math.min(p.x,apron.x+apron.w/2-.2);const edge=apron.d/2-.25;p.z=clamp(p.z,-edge,edge);if(Math.abs(p.z)>=edge-.001)p.vz=0;}
 const link=safeLinkAt(p.x);if(link&&p.y>=link.y-.06){const edge=Math.min(link.d/2-.18,1.35);p.z=clamp(p.z,link.z-edge,link.z+edge);if(Math.abs(p.z-link.z)>=edge-.001)p.vz=0;}
 let landed=null;
 if(p.vy<=0){for(const candidate of platforms){const s=surfaceAt(candidate,p.x,p.z,this.worldTime,this.loads);if(!s)continue;
 const stepping=wasGround&&s.y<=old.y+.20&&s.y>=old.y-.34;
 if((old.y>=s.y-.03&&p.y<=s.y+.03)||stepping){if(!landed||s.y>landed.s.y)landed={base:candidate,s};}
 }}
 if(landed){if(this.state==='air'){this.stamina=Math.max(0,this.stamina-Math.max(0,-p.vy-7)*.65);this.events.push('land');}p.y=landed.s.y;p.vy=0;this.ground=landed.base;this.state='ground';if(landed.base.rest)this.stamina=Math.min(100,this.stamina+dt*8);
 if(landed.base.wallSafety&&this.wallAttempts>0){this.wallQualified=false;this.wallSpeed=0;this.wallS=0;}
 if((landed.base.id==='rest8'||landed.base.transitionFrom===7)&&this.screwCaught){this.screwLanded=true;this.cleared.add(7);}
 if(landed.base.id==='rest6'||landed.base.transitionFrom===5){this.netCleared=true;this.cleared.add(5);}
 if((landed.base.id==='rest10'||landed.base.transitionFrom===9)&&this.gliderCaught.size===2)this.gliderLanded=true;
 if(landed.base.motion==='orbit')this.orbitTouched.add(landed.base.id);
 if(landed.base.motion==='collapse'){this.panels.add(landed.base.id);this.loads[landed.base.id]??=this.worldTime;}
 }else if(this.state==='ground'){this.state='air';this.ground=null;}
 if(this.state==='air')for(const shape of platforms.filter(n=>n.motion==='orbit')){
 const vertices=orbitVertices(shape,this.worldTime),surface=surfaceAt(shape,p.x,p.z,this.worldTime,this.loads);if(!surface)continue;const bottom=Math.min(...vertices.map(q=>q.y));
 if(p.y<surface.y-.08&&p.y+CONFIG.body>bottom+.04){const left=Math.min(...vertices.map(q=>q.x)),right=Math.max(...vertices.map(q=>q.x));
 if(old.x<shape.x){p.x=left-.12;p.vx=-Math.abs(p.vx)*.15;}else{p.x=right+.12;p.vx=Math.abs(p.vx)*.15;}p.vy=Math.min(p.vy,0);this.events.push('impact');}
 }
 if(this.wallRetrying&&this.state==='ground'&&p.x<=WALL.start-1.2)this.wallRetrying=false;
 if(!this.wallRetrying&&forward>0&&p.vx>0&&old.x<=WALL.start&&p.x>=WALL.start&&old.y<WALL.base+.2&&wasGround&&Math.abs(p.z)<WALL.width/2-.15&&this.jumpBuffer===0){
 this.wallQualified=!!i.run&&p.vx>=5.8;this.wallSpeed=Math.max(0,p.vx);this.wallS=0;this.state='wallrun';this.ground=null;this.wallStep(dt,i,forward);
 }else if(p.x>WALL.start&&p.x<WALL.lipX&&p.y<WALL.lipY&&!this.wallCaught){
 const h=clamp((p.y-WALL.base)/WALL.height,0,1),limit=WALL.start+WALL.radius*Math.sqrt(Math.max(0,1-(1-h)**2));
 if(p.x>limit&&p.y>=WALL.base){p.x=limit-.06;p.vx=Math.min(p.vx,0);}
 }
 if(i.grip&&this.cooldown===0&&this.state==='air'){
 const hand={x:p.x,y:p.y+CONFIG.body,z:p.z},prev={x:old.x,y:old.y+CONFIG.body,z:old.z};
 for(const n of grips){if(n.kind==='ledge'||n.stage!==areaAt(p.x)&&Math.abs(n.x-p.x)>3)continue;
 if(n.kind==='screw'&&(this.screwStartedAt===null||this.screwElapsed<=0||this.screwElapsed>=SCREW.seconds))continue;
 if(n.kind==='glider'&&(n.order===0?(!this.springLaunch||this.gliderCaught.has(n.id)):this.gliderTransferFrom!=='glider0'))continue;
 let q=this.gripPoint(n);
 if(n.kind==='screw'){const pose=screwPose(this.screwElapsed);q=screwPoint(this.screwElapsed,screwGripOffset(hand,pose));}
 else if(n.kind==='net'){if(!this.springLaunch)continue;q={x:n.x,y:clamp(hand.y,n.bottom,n.top),z:clamp(hand.z,-1.25,1.25)};}
 else if(n.kind!=='swing'&&n.kind!=='glider'&&n.kind!=='screw')q.x=clamp(hand.x,n.x,n.x+n.length);
 if(pointSegmentDistance(q,prev,hand)<(n.kind==='screw'?.48:.64)){this.attach(n,q);p.x=q.x;p.z=q.z;p.y=q.y-CONFIG.body;break;}
 }
 }
 this.stamina=Math.max(0,this.stamina-dt*(i.run&&wasGround?.25:0));
 }
 this.obstacles(dt,i,forward);
 if(this.screwStartedAt!==null&&this.screwElapsed>=SCREW.seconds&&!this.screwCaught&&!this.screwLanded&&this.stage===7){this.fail('バーは一周で停止。二周目は来ない');return;}
 this.maxX=Math.max(this.maxX,p.x);const stage=areaAt(p.x);
 if(stage>this.stage){
 if(this.stage<=4&&stage>4&&this.startStage<=4&&this.orbitTouched.size<2){this.fail('二つの図形の上面を渡る必要がある');return;}
 if(this.stage<=7&&stage>7&&this.startStage<=7&&!this.screwLanded){this.fail('回転バーをつかみ、対岸に着地する必要がある');return;}
 if(this.stage<=10&&stage>10&&this.startStage<=10&&presses.some(n=>(this.pressed[n.id]||0)<n.travel)){this.fail('二枚の重量ゲートを押し切る必要がある');return;}
 if(this.stage<=8&&stage>8&&this.startStage<=8&&this.panels.size<3){this.fail('ブレイクパネルは全3枚に着地が必要');return;}
 if(this.stage<=9&&stage>9&&this.startStage<=9&&(this.gliderCaught.size<2||!this.gliderLanded)){this.fail('二本のバーを滑降して対岸に着地する必要がある');return;}
 for(let k=this.stage;k<stage;k++)if(k!==5||this.netCleared)this.cleared.add(k);this.stage=stage;this.events.push('area');}
 if(p.y<.05){this.fail('水面に触れてリタイア');return;}
 if(p.x>FINISH-1&&p.y>=WALL.lipY-.05&&this.state==='ground'&&this.wallCaught&&this.wallCleared){this.status='complete';this.events.push('clear');}
 }
 obstacles(dt,i,forward){const p=this.p;
 if(this.hazardCooldown===0&&this.state!=='hang')for(const n of rotors){if(Math.abs(p.x-n.x)>.30)continue;for(const arm of rotorArms(n,this.worldTime)){
 const hit=[.35,.85,1.35].some(y=>pointSegmentDistance({x:p.x,y:p.y+y,z:p.z},arm.a,arm.b)<.30);
 if(hit){p.vz=n.rate>0?5.4:-5.4;p.vx*=.25;p.vy=1.6;this.state='air';this.ground=null;this.hazardCooldown=.65;this.stamina=Math.max(0,this.stamina-8);this.events.push('impact');break;}
 }}
 for(const n of presses){const progress=this.pressed[n.id]||0;if(progress>=n.travel)continue;const face=n.x+progress-.48;
 if(p.x>face&&p.x<n.x+progress+1&&Math.abs(p.z)<2.15&&p.y<5.45){
 if(i.run&&forward>0&&(p.vx>=4.8||this.pressStarted[n.id])){this.pressStarted[n.id]=true;this.pressed[n.id]=Math.min(n.travel,progress+dt*1.55/n.mass);this.stamina=Math.max(0,this.stamina-dt*1.2);}
 p.x=n.x+(this.pressed[n.id]||0)-.49;p.vx=0;
 }
 }
 }
 get progress(){return clamp(this.maxX/FINISH,0,1);}
}
export function pointSegmentDistance(q,a,b){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=dx*dx+dy*dy+dz*dz;const t=l?clamp(((q.x-a.x)*dx+(q.y-a.y)*dy+(q.z-a.z)*dz)/l,0,1):0;return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy,q.z-a.z-t*dz);}
