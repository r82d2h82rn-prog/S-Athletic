import {findContact,applyContact,bodySamples} from './collision.mjs';
import {BURST,burstGrip,smoothBurst} from './burst.mjs';
import {BODY,feetReach,beginEdgeFall,beginGuidedFall,athletePose,POLE_KICK_SECONDS} from './motion.mjs';
import {COURSE,STAGES,FINISH,WORLD_WIDTH} from './course.mjs';
export {COURSE,STAGES,FINISH};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const DT_MAX=1/60,GRAVITY=981,LENGTH=102;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Game {
 constructor(){this.mode='expert';this.practice=false;this.reset();this.status='menu';}
 reset(stage=0){this.time=0;this.total=0;this.stamina=100;this.status='playing';this.reason='';this.events=[];this.cleared=new Set();this.shocks=[];this.loads={};this.rotation={};this.edgeRotation={};this.poleSpin={};this.impactMotion={};this.contactCooldown={};this.lastCollision=null;this.takeoff=null;this.nodeIndex=COURSE.findIndex(n=>n.stage===stage&&n.kind!=='deck');this.startStage=stage;this.initialize();}
 initialize(){this.handover=null;this.cliffFall=null;this.poleFall=null;this.edgeFall=null;this.tumble={x:0,y:0,z:0,wx:0,wy:0,wz:0};this.offset=0;this.angle=0;this.omega=0;this.climb=0;this.poleTravel=0;this.poleMountTime=this.time;this.poleReleaseAngle=null;this.poleLaunchPose=null;this.poleKick=null;this.sinceCatch=0;this.rotated=false;this.facing=1;this.burstTime=0;this.burstDone=false;this.slip=0;this.pipeSpeed=0;this.cooldown=.2;this.state='hang';this.aim=0;this.flightTime=0;this.transferTime=0;this.approach=false;const a=this.support();this.p={x:a.x,y:a.y,z:a.z,vx:0,vy:0,vz:0};this.pose={armCycle:0,climb:0,weight:1,pump:0};this.lastShock=0;this.events.push('area');}
 load(stage){this.nodeIndex=COURSE.findIndex(n=>n.stage===stage&&n.kind!=='deck');this.initialize();}
 get carryingBar(){return this.node.kind==='bar'&&(this.state==='hang'||this.state==='fly'&&this.target().kind==='bar');}
 get node(){return COURSE[this.nodeIndex];}
 get stage(){return this.node.stage;}
 get index(){return Math.max(0,STAGES[this.stage].anchors.findIndex(n=>n.id===this.nodeIndex));}
 get s(){return STAGES[this.stage];}
 get width(){return WORLD_WIDTH;}
 get progress(){return this.status==='complete'?1:clamp((this.nodeIndex+this.offset/Math.max(1,this.node.len))/(COURSE.length),0,1);}
 poleAngle(n){return this.time*(n.spinRate||0);}
 poleBodyAngle(){return this.state==='fly'&&this.poleReleaseAngle!==null?this.poleReleaseAngle:(this.poleTravel||0)*Math.PI-(this.time-(this.poleMountTime||0))*(this.node.spinRate||0);}
 // The back points away from the embraced cylinder. Evaluate the center-to-center line.
 poleKickInfo(afterSeconds=0){const a=this.poleBodyAngle()-(this.node.spinRate||0)*afterSeconds,back=a+Math.PI,n=this.anchorNode(this.node),b=this.target(),line=Math.atan2(b.z-n.z,b.x-n.x),error=Math.atan2(Math.sin(back-line),Math.cos(back-line));return {x:Math.cos(back),z:Math.sin(back),error,aligned:Math.abs(error)<=Math.PI/9+1e-10};}
 anchor(i,stage=this.stage){return this.anchorNode(STAGES[stage].anchors[i]);}
 anchorNode(n){if(!n)return null;let {x,y,z}=n;const m=this.impactMotion[n.id];if(n.kind==='pole'&&m){x+=m.x;z+=m.z;}const load=this.loads[n.id];if(n.kind==='pole'&&n.drop&&load!==undefined)y+=n.drop*clamp((this.time-load)/.32,0,1);if(n.kind==='edge'){const q=this.edgeAngle(n);x+=110*Math.sin(q);y-=110*(1-Math.cos(q));}if(n.motion==='vertical')y+=45*Math.sin(this.time*1.05);if(n.motion==='depth')z-=45+45*Math.sin(this.time*.8+.9);return {...n,x,y,z};}
 // Keep the pre-collision swing choreography throughout a live attempt.
 edgeAngle(n=this.node){return (this.edgeRotation[n.id]||0)+(this.state==='fall'?(this.impactMotion[n.id]?.angle||0):0);}
 burstAngle(n=this.node){return BURST.rotationSign*(this.rotation[this.burstKey(n)]?.angle||0)+(this.impactMotion[n.id]?.angle||0);}
 burstKey(n=this.node){return n.kind==='burst'?COURSE.find(a=>a.kind==='burst'&&a.zone===n.zone).id:n.id;}
 support(){if(this.handover){const h=this.handover,t=smoothBurst(h.progress);return {...this.anchorNode(this.node),x:h.from.x+(h.to.x-h.from.x)*t,y:h.from.y+(h.to.y-h.from.y)*t,z:h.from.z+(h.to.z-h.from.z)*t};}const n=this.anchorNode(this.node);if(n.kind==='pole'){n.y+=70-this.climb;const a=this.poleBodyAngle();n.x-=22*Math.cos(a);n.z-=22*Math.sin(a);}else if(['cliff','burst','pipe'].includes(n.kind))n.x+=this.offset;if(n.kind==='burst'){const grip=burstGrip(this,this.node,this.offset);n.y+=grip.y;n.z+=grip.z;}return n;}
 target(){const n=COURSE[this.nodeIndex+1];if(!n)return{...FINISH,kind:'finish',id:COURSE.length,stage:5};let a=this.anchorNode(n);if(n.kind==='pole')a.y+=70;return a;}
 direction(){const a=this.support(),b=this.target();const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;return {x:dx/len,z:dz/len};}
 fatigue(dt,input){const k=this.node.kind;let rate=.07;if(this.state==='hang'){rate+=({bar:1.0,pole:this.climb>15?.38:.8,edge:1.4,cliff:1.15,burst:.65,pipe:1.05})[k]||0;if(k==='burst'&&input.brace)rate+=3.2;if(input.climb&&k==='pole')rate+=.55;if(input.left||input.right||input.move)rate+=.12;if(['cliff','burst'].includes(k)&&input.brace&&input.right)rate+=.08;rate+=Math.min(.4,this.omega*this.omega*.025);}if(this.state==='hang'&&k==='burst'&&['regrip','rotating'].includes(this.rotation[this.burstKey()]?.phase))rate*=this.node.rotationLoadMultiplier||1;if(this.state==='hang'&&k==='pipe'&&input.brace)rate*=1.5;this.stamina=Math.max(0,this.stamina-rate*dt*(this.mode==='assist'?.84:1));if(this.stamina<=0)this.fail('筋持久力が尽き、保持できなくなった');}
 shock(speed,extra=0){const loss=clamp((speed-180)/85,0,8)+extra;this.stamina=Math.max(0,this.stamina-loss);this.lastShock=loss;if(loss>.5){this.shocks.push({time:this.time,loss});this.events.push('impact');}if(this.stamina<=0)this.fail('着手の衝撃で筋持久力を使い切った');}
 fail(reason){if(this.status!=='playing')return;this.reason=reason;beginGuidedFall(this);beginEdgeFall(this);this.status='falling';this.state='fall';this.events.push('fall');}
 clearArea(stage){if(this.cleared.has(stage))return;this.cleared.add(stage);this.stamina=Math.min(100,this.stamina+(stage===3?30:20));this.events.push('recover');}
 enter(id,{air=false,offset=0,speed=0}={}){const prevNode=this.node,prev=this.stage,n=COURSE[id],catchY=this.p.y;const cliffExtra=air&&prevNode.kind==='cliff'&&prevNode.local===1&&n.kind==='cliff'&&this.takeoff?this.cliffLandingLoad():0;if(n.stage>prev)this.clearArea(prev);if(this.status==='complete')return;this.handover=null;this.nodeIndex=id;this.offset=clamp(offset,0,n.len);this.sinceCatch=0;this.cooldown=.28;this.state=n.kind==='deck'?'stand':'hang';this.climb=0;this.poleTravel=0;this.poleMountTime=this.time;this.poleReleaseAngle=null;this.poleLaunchPose=null;this.poleKick=null;this.angle=0;this.omega=air?clamp(this.p.vx*.002,-.7,.7):0;this.aim=0;this.rotated=false;this.burstTime=0;this.burstDone=false;this.slip=0;this.pipeSpeed=0;this.approach=false;if(n.kind==='pole'&&this.loads[id]===undefined)this.loads[id]=this.time;if(air&&n.kind==='pole')this.climb=clamp(this.anchorNode(n).y+70-catchY,0,n.climbRange);if(n.kind==='pole')this.omega=0;const a=this.support();this.p.x=a.x;this.p.y=a.y;this.p.z=a.z;this.p.vx=0;this.p.vy=0;this.p.vz=0;if(n.kind==='deck'){this.clearArea(n.stage);this.p.y=n.y-BODY.reach*100;}else if(air)this.shock(speed,(n.kind==='pole'&&n.drop?2.2:0)+cliffExtra);this.events.push('catch');if(this.stage!==prev)this.events.push('area');}
 launchVelocity(){if(this.state==='stand')return {vx:175,vy:-245,vz:0};const d=this.direction(),k=this.node.kind;let tangent=LENGTH*this.omega,forward=tangent*Math.cos(this.angle)*1.52;const lift=Math.max(0,tangent*Math.sin(this.angle))+Math.abs(this.omega)*49;
 // Release conserves the build-up from the pendulum. No minimum horizontal jump.
 let vy=-lift,vx=forward*d.x,vz=forward*d.z;if(k==='pole'){const back=this.poleKickInfo();return {vx:back.x*330,vy:-300,vz:back.z*330};}
 if(k==='pipe')vx+=this.pipeSpeed;
 const ca=Math.cos(this.aim),sa=Math.sin(this.aim);return{vx:vx*ca-vz*sa,vy,vz:vx*sa+vz*ca};}
 launch(){if(this.handover)return;if(!['hang','stand'].includes(this.state)||this.cooldown>0||this.status!=='playing')return;
 if(this.node.kind==='burst'){this.events.push('hands');return;}
 if(this.node.kind==='pole'){if(!this.poleKick){this.poleKick={time:0};this.events.push('kick');}return;}
 if(this.state==='hang'&&['cliff'].includes(this.node.kind)&&this.offset<this.node.len-12){this.events.push('edgeNeeded');return;}
 if(this.state==='stand')return;this.shock(180,this.node.kind==='cliff'?3.5:1.2);if(this.status!=='playing')return;this.takeoff={node:this.nodeIndex,x:this.p.x,y:this.p.y,z:this.p.z,peakY:this.p.y};const v=this.launchVelocity();this.p.vx=v.vx;this.p.vy=v.vy;this.p.vz=v.vz;this.state='fly';this.flightTime=0;this.rotated=false;this.events.push('jump');}
 kickOff(){this.poleLaunchPose=athletePose(this);this.poleReleaseAngle=this.poleBodyAngle();const v=this.launchVelocity(),kick=this.poleKickInfo();this.takeoff={node:this.nodeIndex,x:this.p.x,y:this.p.y,z:this.p.z,peakY:this.p.y,poleAligned:kick.aligned,poleAngleError:kick.error};Object.assign(this.p,v);this.state='fly';this.flightTime=0;this.rotated=false;this.shock(180,1.8);this.events.push('jump');}
 updatePendulum(dt,dir){this.pose.pump=dir;this.omega+=(-GRAVITY/LENGTH*Math.sin(this.angle)+dir*6.3-this.omega*.16)*dt;this.angle+=this.omega*dt;if(Math.abs(this.angle)>1.18){this.angle=clamp(this.angle,-1.18,1.18);this.omega*=-.2;}this.pose.weight=1+Math.abs(this.omega)*.15;}
 updateBurst(dt,input){
 if(!this.node.rotating){this.burstDone=true;return;}
 const key=this.burstKey();let r=this.rotation[key];if(!r)r=this.rotation[key]={angle:0,omega:0,impacts:0,phase:'idle',reachTime:0,regripAlpha:0};
 if(r.phase==='idle'){
 if(!input.swing){this.burstDone=false;return;}
 if(Math.abs(this.offset-this.node.rotationAt)>1){this.events.push('rotationCenterNeeded');return;}
 this.offset=this.node.rotationAt;r.phase='regrip';r.reachTime=0;this.events.push('regrip');
 }
 if(r.phase==='settled'){this.burstDone=true;return;}
 if(r.phase==='regrip'){
 r.reachTime+=dt;r.reachProgress=Math.min(1,r.reachTime/BURST.reachSeconds);r.regripAlpha=smoothBurst(r.reachProgress);
 if(r.reachTime>.18&&!input.brace){this.fail('斜め上の突起の持ち替えで手が外れた。「保持」を長押しする');return;}
 if(r.reachTime<BURST.reachSeconds)return;r.phase='rotating';r.omega=0;this.events.push('rotationStart');
 }
 if(!input.brace){this.fail('60°引き下ろす途中で手が外れた。「保持」を長押しする');return;}
 const torque=(BURST.turn-r.angle)*12;r.omega+=(torque-r.omega*6.8)*dt;r.angle=Math.min(BURST.turn,r.angle+r.omega*dt);this.burstTime+=dt;
 const impacts=Math.floor(clamp(r.angle/(BURST.turn-.025),0,1)*4);
 if(impacts>r.impacts){this.shock(180,(impacts-r.impacts)*3*(this.node.rotationLoadMultiplier||1));r.impacts=impacts;this.events.push('rotationLoad');}
 this.burstDone=BURST.turn-r.angle<.015&&Math.abs(r.omega)<.1;
 if(this.burstDone){r.phase='settled';r.angle=BURST.turn;r.omega=0;r.regripAlpha=1;this.events.push('burst');}
 }
 startHandover(b){
 const from=this.support(),n=COURSE[b.id],toOffset=12,a=this.anchorNode(n),lip=burstGrip(this,n,toOffset),to={x:a.x+toOffset,y:a.y+lip.y,z:a.z+lip.z};
 const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
 this.handover={toId:n.id,toOffset,from:{x:from.x,y:from.y,z:from.z},to,delta:{x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},progress:0,elapsed:0,duration:Math.max(.65,distance/40)};
 this.events.push('handover');
 }
 updateHandover(dt,input){
 const h=this.handover,moving=this.node.kind==='burst'?input.move:input.right&&input.brace;
 if(moving){h.elapsed+=dt;h.progress=Math.min(1,h.elapsed/h.duration);this.pose.armCycle+=dt*4;}
 const p=this.support();this.p.x=p.x;this.p.y=p.y;this.p.z=p.z;
 if(h.progress>=1)this.enter(h.toId,{offset:h.toOffset});
 }
 transfer(dt,input){
 const b=this.target(),a=this.support(),gap=dist(a,b),height=Math.abs(a.y-b.y),moving=this.node.kind==='burst'?input.move:input.right;
 if(this.node.kind==='burst'&&b.kind==='burst'){
 if(!moving||this.offset<this.node.len-12||this.node.rotating&&!this.burstDone)return false;
 this.startHandover(b);this.updateHandover(dt,input);return true;
 }
 if(!moving||this.offset<this.node.len-1||gap>64||height>35||this.node.kind!=='burst'&&!input.brace)return false;
 if(b.kind==='burst'){this.startHandover(b);this.updateHandover(dt,input);return true;}
 this.transferTime+=dt;this.pose.armCycle+=dt*4;if(this.transferTime>.42){this.enter(b.id);this.transferTime=0;}return true;
 }
 cliffLandingLoad(){const t=this.takeoff,distance=Math.hypot(this.p.x-t.x,this.p.z-t.z),drop=Math.max(0,this.p.y-t.peakY);const extra=Math.min(14,2+Math.max(0,distance-180)*.035+Math.max(0,drop-30)*.045);this.lastCliffLoad={distance,drop,extra};this.events.push('cliffImpact');return extra;}
 updateImpactMotion(dt){
 for(const [id,m]of Object.entries(this.impactMotion)){const n=COURSE[id];if(!n)continue;if(n.kind==='pole'){m.vx+=(-m.x*8-m.vx*1.7)*dt;m.vz+=(-m.z*8-m.vz*1.7)*dt;m.x+=m.vx*dt;m.z+=m.vz*dt;}else if(n.kind==='pipe'){m.vx*=Math.exp(-.025*dt);m.x=clamp(m.x+m.vx*dt,0,n.len);}else{m.omega+=(-m.angle*8-m.omega*2)*dt;m.angle+=m.omega*dt;}}
 if(this.state==='fall')for(const f of[this.edgeFall,this.cliffFall,this.poleFall])if(f)f.time+=dt;
 if(this.state==='fall')for(const k of['x','y','z']){this.tumble[k]+=this.tumble['w'+k]*dt;this.tumble['w'+k]*=Math.exp(-(this.edgeFall?2.3:this.cliffFall||this.poleFall?3.0:.15)*dt);}
 }
 landPlatform(prev,prevFoot){
 if(this.p.vy<=0)return false;
 const foot=feetReach(this),target=this.target();
 const platforms=this.status==='falling'?[...COURSE.filter(n=>n.kind==='deck'),{...FINISH,kind:'finish',id:COURSE.length}]:[target];
 for(const b of platforms){if(!['deck','finish'].includes(b.kind))continue;const margin=b.landingMargin||0;
 if(this.p.x<b.x-margin||this.p.x>b.x+b.len+margin||Math.abs(this.p.z-b.z)>=100+margin||this.p.y+foot<b.y||prev.y+prevFoot>=b.y)continue;
 const retired=this.status==='falling',landedX=this.p.x;
 if(!retired&&b.kind==='deck'){this.enter(b.id);this.p.x=clamp(landedX,b.x-margin,b.x+b.len+margin);}
 else if(!retired){this.clearArea(5);this.status='complete';this.events.push('clear');}
 else this.status='failed'; // A retired athlete can land, without reviving the run.
 this.state='stand';this.angle=0;this.omega=0;this.aim=0;this.p.y=b.y-BODY.reach*100;this.p.z=b.z;
 this.p.vx=0;this.p.vy=0;this.p.vz=0;this.edgeFall=null;this.cliffFall=null;this.poleFall=null;this.tumble={x:0,y:0,z:0,wx:0,wy:0,wz:0};this.pose.pump=0;this.pose.armCycle=0;return true;
 }return false;
 }
 contact(prev){const hit=findContact(this,prev,this.p);if(hit&&applyContact(this,hit,prev,this.p)){this.contactCooldown[hit.node.id]=this.time+.045;return true;}return false;}
 step(dt,input={}){dt=Math.min(dt,DT_MAX);this.lastStepDt=dt;if(!['playing','falling'].includes(this.status))return;this.time+=dt;this.total+=dt;for(const n of COURSE)if(n.kind==='pole')this.poleSpin[n.id]=this.poleAngle(n);this.updateImpactMotion(dt);
 if(this.status==='falling'){const prevFoot=feetReach(this),prev={...this.p};this.p.vy+=GRAVITY*dt;if(this.poleFall?.near&&this.poleFall.time<.35)this.p.vy*=Math.exp(-3*dt);this.p.x+=this.p.vx*dt;this.p.y+=this.p.vy*dt;this.p.z+=this.p.vz*dt;if(this.landPlatform(prev,prevFoot))return;this.contact(prev);if(bodySamples(this).some(s=>s.p[1]+s.r>390)){this.status='failed';this.events.push('splash');}return;}
 for(const [id,value] of Object.entries(this.edgeRotation))this.edgeRotation[id]=value*Math.exp(-dt*1.5);if(this.node.kind==='edge'&&this.state==='hang')this.edgeRotation[this.nodeIndex]=(this.edgeRotation[this.nodeIndex]||0)+(this.angle*.35-(this.edgeRotation[this.nodeIndex]||0))*Math.min(1,dt*5);this.cooldown=Math.max(0,this.cooldown-dt);this.sinceCatch+=dt;this.fatigue(dt,input);if(this.status!=='playing')return;
 const n=this.node,dir=(input.right?1:0)-(input.left?1:0);if(input.turn&&this.state==='fly'){this.rotated=!this.rotated;this.facing*=-1;this.events.push('turn');}if(input.jump)this.launch();
 if(this.handover){this.updateHandover(dt,input);return;}
 if(this.state==='hang'){
 if(input.release){this.launch();return;}
 this.aim=clamp(this.aim+((input.backward?1:0)-(input.forward&&!input.climb?1:0))*dt*.75,-.5,.5);
 if(n.kind==='pole'){
 this.angle=0;this.omega=0;this.pose.pump=0;
 const moving=!!(input.swing||input.right||input.left),climbing=!!input.climb;
 if(this.poleKick){this.poleKick.time+=dt;if(this.poleKick.time>=POLE_KICK_SECONDS){this.kickOff();return;}}
 else{if(moving)this.poleTravel+=dt*.42;if(climbing)this.climb=clamp(this.climb+45*dt,0,n.climbRange);if(moving||climbing)this.pose.climb+=dt*(climbing?4:3);}
 const a=this.support();this.p.x=a.x;this.p.y=a.y;this.p.z=a.z;return;
 }
 if(n.kind==='burst'){
 this.updateBurst(dt,input);if(this.status!=='playing')return;const r=this.rotation[this.burstKey()],rotating=n.rotating&&r?.phase!=='idle'&&r?.phase!=='settled';
 this.angle*=Math.exp(-dt*4);this.omega*=Math.exp(-dt*5);this.pose.pump=input.swing?1:0;
 if(input.move&&!rotating){const end=n.rotating&&r?.phase==='idle'?n.rotationAt:n.len;this.offset=clamp(this.offset+28*dt,0,end);this.pose.armCycle+=dt*4;}
 if(this.target().kind==='deck'&&this.offset>=n.len-1&&this.burstDone&&input.move){this.state='fly';this.flightTime=0;this.p.vx=115;this.p.vy=n.rotating?-65:0;this.p.vz=0;this.events.push('jump');}
 if(this.transfer(dt,input))return;
 }else if(n.kind==='cliff'){
 if(input.brace&&!input.swing){this.pose.pump=0;this.omega*=Math.exp(-dt*5);this.angle*=Math.exp(-dt*3);}const moving=input.brace&&!input.swing&&Math.abs(this.omega)<.9;
 if(moving){this.offset=clamp(this.offset+dir*36*dt,0,n.len);this.pose.armCycle+=Math.abs(dir)*dt*4;}else this.updatePendulum(dt,input.pump??dir);
 if(this.transfer(dt,input))return;
 }else{this.updatePendulum(dt,input.pump??dir);if(n.kind==='pipe'){
 // Near-frictionless rail: weight behind the pipe and body reactions can reverse its velocity.
 const drive=(input.slide??dir)*65,backLoad=6+Math.sin(this.angle)*24+this.omega*14;
 this.pipeSpeed=clamp(this.pipeSpeed+(drive-backLoad-this.pipeSpeed*.025)*dt,-100,115);
 this.offset+=this.pipeSpeed*dt;if(this.offset>=n.len){this.offset=n.len;this.pipeSpeed=Math.min(0,this.pipeSpeed);}if(this.offset<=0){this.offset=0;this.pipeSpeed=Math.max(0,this.pipeSpeed);}
 }}
 const a=this.support();this.p.x=a.x;this.p.y=a.y;this.p.z=a.z;
 if(n.kind==='pole'&&n.drop&&this.time-this.loads[n.id]<.35)this.pose.weight=1.8;
 }else if(this.state==='stand'){
 if(input.challenge)this.approach=true;const walk=this.approach?1:dir;this.p.x=clamp(this.p.x+walk*115*dt,n.x-(n.landingMargin||0),n.x+n.len+(n.landingMargin||0));this.p.y=n.y-BODY.reach*100;this.p.z=n.z;this.pose.armCycle+=Math.abs(walk)*dt*5;
 // A low first ledge can be reached directly from the end of a rest deck.
 const target=this.target();if(this.approach&&this.p.x>n.x+n.len-35&&dist(this.p,target)<130)this.enter(target.id);
 }else if(this.state==='fly'){
 const prevFoot=feetReach(this);this.flightTime+=dt;this.missedGrip=null;const prev={...this.p};this.p.vy+=GRAVITY*dt;
 // Air steering is deliberately tiny; it cannot manufacture a successful jump.
 if(n.kind!=='pole'){this.p.vx+=dir*12*dt;this.p.vz+=((input.backward?1:0)-(input.forward?1:0))*12*dt;}this.p.x+=this.p.vx*dt;this.p.y+=this.p.vy*dt;this.p.z+=this.p.vz*dt;
 if(this.takeoff)this.takeoff.peakY=Math.min(this.takeoff.peakY,this.p.y);
 const b=this.target();const speed=Math.hypot(this.p.vx,this.p.vy,this.p.vz);let caught=false,off=0;
 if(this.landPlatform(prev,prevFoot))return;
 if(!['deck','finish'].includes(b.kind)&&this.flightTime>.08){const r=this.mode==='assist'?16:10;
 if(['cliff','burst'].includes(b.kind)){off=clamp(this.p.x-b.x,0,b.len);caught=this.p.x>=b.x-r&&this.p.x<=b.x+b.len+r&&Math.hypot(this.p.y-b.y,this.p.z-b.z)<r;}
 else if(b.kind==='pole'){
 // A forgiving whole-cylinder grab volume; sweep the flight segment to avoid tunnelling.
 const dx=this.p.x-prev.x,dz=this.p.z-prev.z,l2=dx*dx+dz*dz,t=l2?clamp(((b.x-prev.x)*dx+(b.z-prev.z)*dz)/l2,0,1):1;
 const x=prev.x+dx*t,z=prev.z+dz*t,y=prev.y+(this.p.y-prev.y)*t;
 caught=!(n.kind==='pole'&&this.takeoff?.poleAligned===false)&&Math.hypot(x-b.x,z-b.z)<b.radius+(this.mode==='assist'?50:38)&&y>=b.y-145&&y<=b.y+50;
 }
 else caught=Math.hypot(this.p.x-b.x,this.p.y-b.y,this.p.z-b.z)<r;
 if(caught){
 if(b.kind==='pole'&&!input.brace){this.missedGrip='円柱を掴む瞬間に「保持」が必要';this.contact(prev);this.fail(this.missedGrip);return;}
 if(b.kind==='edge'&&(!input.brace||this.p.y<b.y-8))this.missedGrip='逆手でエッジの下から捉えられなかった';
 else if(b.kind==='cliff'&&this.node.kind==='cliff'&&!this.rotated)this.missedGrip='背面ジャンプで反転できなかった';
 else if(b.kind==='bar'&&(!input.brace&&Math.abs(this.p.vy)>290))this.missedGrip='バーを皿に収められなかった';
 else if(b.acrylic&&this.p.y<b.y-4)this.missedGrip='アクリル板に阻まれた';
 if(!this.missedGrip){this.enter(b.id,{air:true,offset:off,speed});return;}}

 }
 if(this.contact(prev))return;
 if(this.p.y+feetReach(this)>390)this.fail('振りの勢い・離すタイミング・つかみ位置が合わなかった');
 }
 }
 // Compatibility with the UI: transitions are now physical, never load/reset calls.
 rest(){} next(){}
}
