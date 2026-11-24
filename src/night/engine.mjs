import {FLOOR,WATER,BODY,LOG,METAL,BOARDS,SALMON,SPIDER,FINAL_RULES,BACKSTREAM,SECOND_GOAL,swingGrip,sweptFloor} from './geometry.mjs';
import {secondCourse,finalCourse,SECOND_LIMIT} from './course.mjs';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const G=9.81;
export class NightGame{
 constructor(stage='second'){this.stageId=stage;this.reset();this.status='menu';}
 reset({area=0,practice=false}={}){this.course=this.stageId==='final'?finalCourse():secondCourse();this.vertical=this.stageId==='final';this.limit=this.stageId==='final'?45:SECOND_LIMIT;this.practice=practice;this.startArea=area;this.area=area;this.time=0;this.worldTime=0;this.status='playing';this.stamina=100;this.reason='';this.events=[];this.previous={};this.charge=0;this.completed=[];this.setup();}
 get a(){return this.course[this.area];}
 get progress(){return (this.area+clamp(this.q/this.a.length,0,1))/this.course.length;}
 setup(){this.goal=0;this.hand=0;this.q=0;this.t=0;this.v=0;this.z=0;this.vz=0;this.y=0;this.vy=0;this.state='ready';this.rung=0;this.bar=0;this.barV=0;this.tilt=0;this.tiltV=0;this.angle=0;this.omega=0;this.gripLoad=0;this.wallHeights=[0,0,0];this.wallV=[0,0,0];this.board=0;this.stroke=0;this.footlock=0;this.charge=0;this.salmonCharge=0;this.salmonClock=0;this.salmonSpent=false;this.ropeCharge=0;this.queuedSteps=0;this.fromBoard=-1;this.cooldown=0;this.grabbed=false;this.landingT=0;this.entryJump=false;this.entryLaunch=false;this.approach=null;this.spiderPanel=0;this.swingQ=.6;this.swingGoal=.6;this.p={x:this.vertical?0:this.a.start,y:this.vertical?this.a.start:1.8,z:0};this.pose();this.events.push('area');}
 fail(reason){if(this.status!=='playing')return;this.status='failed';this.reason=reason;this.events.push('fail');}
 clearArea(carry=false){const p={...this.p};this.completed.push(this.a.id);if(this.area===this.course.length-1){this.status='complete';this.events.push('clear');return;}this.area++;this.setup();if(carry&&!this.vertical){this.q=p.x-this.a.start;this.y=p.y-FLOOR;this.z=p.z;this.pose();}}
 step(dt,input={}){if(this.status!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;this.worldTime+=dt;this.t+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
 if(!this.practice&&this.limit!==null&&this.time>=this.limit){this.fail('TIME UP / 制限時間です');return;}
 const i={forward:clamp(input.forward||0,-1,1),side:clamp(input.side||0,-1,1),hold:!!input.hold,jump:!!input.jump,run:!!input.run,descend:!!input.descend};
 i.forwardSteps=input.forwardTaps===undefined?(i.forward>0&&!(this.previous.forward>0)?1:0):clamp(Math.floor(input.forwardTaps)||0,0,32);
 let press=i.jump&&!this.previous.jump;let release=!i.jump&&this.previous.jump;
 if(input.simple){i.hold=i.hold||this.grabbed||(press&&this.a.id!=='unstable')||this.state==='entryFlight';i.run=i.run||i.forward>0;
 if(this.a.id.startsWith('salmon')&&this.a.id!=='salmonFinal'){release=press;if(press)this.charge=.18;}
 if(this.a.id==='salmonDown'&&this.state!=='ready')i.forward=this.rung<this.a.rungs?-1:1;
 if(this.vertical&&press)i.forward=1;
  }i.rawHold=!!input.hold;i.simple=!!input.simple;this.previous=i;
 if(this.a.id==='salmonFinal'){
 // Sample the last displayed value on release; holding alone never launches the bar.
 release=release&&this.state==='ladder'&&this.cooldown<=0&&this.salmonCharge>=FINAL_RULES.ladderThreshold-1e-9;
 if(release)this.charge=.18;
 if(i.jump&&this.state==='ladder'&&this.cooldown<=0){this.salmonClock+=dt;const phase=this.salmonClock%1;this.salmonCharge=clamp(phase<=.5?phase*2:2-phase*2,0,1);}
 if(!i.jump){this.salmonClock=0;this.salmonCharge=0;}
 }
 if(this.a.id==='rope')i.ropeAction=press?'jump':null;

 if(this.a.id==='rope'||this.a.id==='climb')this.charge=0;else if(i.jump)this.charge=Math.min(.65,this.charge+dt);
 if(this.entryLaunch&&this.state==='ready'){press=true;this.entryLaunch=false;i.forward=1;}
 if(this.state==='approach'){this.approachStep(dt,i);this.pose();return;}
 if(this.state==='air'&&!['log','metal'].includes(this.a.id)){this.airStep(dt,i);this.pose();return;}
 if(this.state==='shoreClimb'){this.exitT+=dt;const u=clamp(this.exitT/.65,0,1);this.q=this.a.length+u*.6;this.y=(BACKSTREAM.waterY+BACKSTREAM.swimmerOffset-FLOOR)*(1-u*u*(3-2*u));if(u>=1)this.land();this.pose();return;}
 if(this.state==='entry'){
 this.landingT=Math.max(0,this.landingT-dt);this.y=0;this.vy=0;if(press)this.entryJump=true;
 if(this.landingT===0){const moving=i.forward>0||this.entryJump;this.v=moving?Math.min(5.8,this.v+dt*35):0;this.q=Math.min(0,this.q+this.v*dt);}
 if(this.q>=0){this.q=0;this.state='ready';this.v=0;this.entryLaunch=this.entryJump;this.entryJump=false;}
 this.pose();return;
 }
 if(this.state==='barTransfer'){
 this.transferT+=dt;this.drain(dt,1.5);if(!i.hold){this.fail('バーごとの飛び移りにHOLDが必要です');return;}
 const next=this.course[this.area+1],u=clamp(this.transferT/.58,0,1),x=this.a.start+this.a.length/2+(next.start+next.length/2-this.a.start-this.a.length/2)*u;
 this.p={x:x+SALMON.offset,y:SALMON.top-BODY+Math.sin(u*Math.PI)*.4,z:0};
 if(u>=1){this.clearArea();this.state='ladder';this.grabbed=true;this.pose();}return;
 }
 const id=this.a.id;
 if(id==='log')this.log(dt,i,press);
 else if(id.startsWith('salmon'))this.ladder(dt,i,press,release);
 else if(id==='spider'||id==='drop'||id==='spiderClimb')this.spider(dt,i,press);
 else if(id==='swim')this.swim(dt,i,press);
 else if(id==='belt')this.belt(dt,i,press);
 else if(id==='walls')this.walls(dt,i);
 else if(id==='unstable')this.unstable(dt,i,press);
 else if(id==='swing')this.swing(dt,i,press);
 else if(id==='metal')this.metal(dt,i,press);
 else if(id==='climb')this.climb(dt,i,press);
 else if(id==='rope')this.rope(dt,i,i.ropeAction);
 if(release)this.charge=0;
 this.stamina=clamp(this.stamina,0,100);if(this.stamina<=0)this.fail('筋持久力が尽きました');
 this.pose();
 }
 pose(){let y=FLOOR+this.y,x=this.a.start+this.q,z=this.z;
 if(this.vertical){x=this.z*.25;z=0;y=FLOOR+this.a.start+this.q-BODY;if(this.a.id==='climb')y=FLOOR+this.q*(this.a.length-BODY)/this.a.length;y=Math.max(FLOOR,y);}
 else if(this.grabbed&&this.a.id.startsWith('salmon')){x=this.a.start+this.a.length/2+SALMON.offset;y=(this.a.id==='salmonDown'?SALMON.top:SALMON.base)+this.bar-BODY;}
 this.p={x,y,z};}
 land(){
 this.grabbed=false;this.v=this.vz=this.vy=0;this.y=0;this.pose();
 // The completed area's landing bank is the next area's entry deck. Keep the exact world pose.
 if(!this.vertical&&this.area<this.course.length-1){this.clearArea(true);this.state='entry';}else this.state='transfer';
 this.landingT=.16;this.events.push('land');
 }
 beginApproach(kind,target,duration=.5){
 this.approach={kind,target,start:{q:this.q,y:this.y,z:this.z},time:0,duration};
 this.state='approach';this.grabbed=false;this.events.push('jump');
 }
 approachStep(dt,i){
 const f=this.approach;f.time=Math.min(f.duration,f.time+dt);const u=f.time/f.duration;
 this.q=f.start.q+(f.target.q-f.start.q)*u;this.z=f.start.z+(f.target.z-f.start.z)*u;
 this.y=f.start.y+(f.target.y-f.start.y)*u+G*f.duration*f.duration*.5*u*(1-u);
 if(u<1)return;
 const catchOK=f.kind==='swim'||i.hold||(this.previous.simple&&(f.kind==='ladder'||f.kind==='metalCatch'));
 // The UI challenge action latches the bar; bridge catches always use the raw HOLD input.
 if(!catchOK){this.state='air';this.v=(f.target.q-f.start.q)/f.duration;this.vy=(f.target.y-f.start.y)/f.duration-G*f.duration/2;this.vz=0;return;}
 this.state=f.kind==='ladder'?'ladder':f.kind==='metalCatch'?'spin':f.kind;if(f.kind==='metalCatch')this.angle=METAL.startAngle;this.grabbed=f.kind!=='swim';this.bar=0;this.v=0;this.vy=0;this.events.push('catch');
 }
 launchTo(q,z=0,vy=2.8){const t=(vy+Math.sqrt(vy*vy+2*G*Math.max(0,this.y)))/G;
 this.v=(q-this.q)/t;this.vz=(z-this.z)/t;this.vy=vy;this.grabbed=false;this.state='air';this.events.push('jump');
 }

 airStep(dt,i={},boards=false,entry=false){const old={q:this.q,z:this.z,y:this.y};this.vy-=G*dt;this.q+=this.v*dt;this.z+=this.vz*dt;this.y+=this.vy*dt;
 if(entry&&i.hold){const target={q:METAL.pivot-METAL.radius,y:METAL.chainY-BODY-FLOOR,z:0};const v={q:this.q-old.q,y:this.y-old.y,z:this.z-old.z},len=v.q*v.q+v.y*v.y+v.z*v.z;const t=clamp(((target.q-old.q)*v.q+(target.y-old.y)*v.y+(target.z-old.z)*v.z)/(len||1),0,1);if(Math.hypot(old.q+v.q*t-target.q,old.y+v.y*t-target.y,old.z+v.z*t)<.4){this.omega=clamp(this.v/METAL.radius,.7,3.4);this.beginApproach('metalCatch',target,.12);return;}}
 if(boards&&i.rawHold&&this.vy<0){for(const [j,b]of BOARDS.entries()){if(j===this.fromBoard)continue;const h=b.y-BODY-FLOOR;if(old.y>=h&&this.y<=h){const t=(old.y-h)/(old.y-this.y),q=old.q+(this.q-old.q)*t,z=old.z+(this.z-old.z)*t;if(q>=b.x-b.w/2&&q<=b.x+b.w/2&&Math.abs(z)<b.d/2){this.q=q;this.y=h;this.z=z;this.state='board';this.grabbed=true;this.board=j;this.vy=0;this.events.push('catch');return;}}}}
 const hit=sweptFloor(this.a,old,this);if(hit){this.q=hit.q;this.z=hit.z;this.y=hit.y;if(hit.entry){this.state='ready';this.vy=0;}else this.land();return;}
 if(this.y<=WATER-FLOOR)this.fail('支持面に届かず落水しました');
 }

 drain(dt,rate){this.stamina-=dt*rate;}
 log(dt,i,press){
 if(this.state==='ready'){if(i.hold&&i.forward>0){this.state='log';this.grabbed=true;}return;}
 if(this.state==='log'){const brake=i.forward<0;this.v+=dt*(1.8-(brake?1.3:0)-.08*this.v);this.q+=this.v*dt;this.angle+=this.v/.65*dt;this.y=1.2-this.q*.10;this.drain(dt,1.0+this.v*.16);this.gripLoad=Math.max(0,this.gripLoad+dt*(i.hold?-2:2.8));if(this.gripLoad>1.1){this.fail('回転中に抱え込みがほどけました');return;}
 if(press){if(this.q<this.a.length-1.9){this.fail('ログを離すのが早すぎました');return;}this.state='air';this.grabbed=false;this.vy=4.2;}
 if(this.q>this.a.length+.4)this.fail('ログ終端で跳び移れませんでした');
 }else if(this.state==='air')this.airStep(dt);
 }
 ladder(dt,i,press,release){const down=this.a.id==='salmonDown',n=this.a.rungs,spacing=this.a.spacing;
 if(this.state==='ready'){
 if(this.vertical){if(i.hold){this.state='ladder';this.grabbed=true;this.bar=0;}return;}
 if(press){this.beginApproach('ladder',{q:this.a.length/2+SALMON.offset,y:(down?SALMON.top:SALMON.base)-BODY-FLOOR,z:0},down?.8:.48);return;}
 // The approach deck ends before the bar; walking never attaches hands or crosses the void.
 this.q=Math.min(this.a.length/2-.6,Math.max(0,this.q+Math.max(0,i.forward)*dt*3));return;
 }
 const target=this.rung*spacing;this.tiltV+=(i.side*3-this.tilt*7-this.tiltV*3)*dt;this.tilt+=this.tiltV*dt;
 if(this.state==='ladder'){
 this.drain(dt,1.1);if(!i.hold){this.gripLoad+=dt;if(this.gripLoad>.38)this.fail('バーの保持が外れました');}else this.gripLoad=0;
 if(release&&this.cooldown<=0){if(this.rung>=n){if(!down){this.state='barTransfer';this.transferT=0;}else if(i.forward>0){this.q=this.a.length/2+SALMON.offset;this.y=SALMON.top+this.bar-BODY-FLOOR;this.launchTo(this.a.length+1.1);}return;}
 if(this.charge<.08){this.events.push('weak');return;}
 if(down&&i.forward>=0){this.events.push('down');return;}
 this.state='barFlight';this.barV=down?-.9:Math.sqrt(2*G*(spacing+.10+clamp(this.charge-.12,0,.26)*.7));this.cooldown=.18;this.events.push('jump');this.drain(1,.6);}
 }else if(this.state==='barFlight'){
 const before=this.bar;this.barV-=G*dt;this.bar+=this.barV*dt;const next=(this.rung+1)*spacing;
 const reached=down?-this.bar>=next:this.barV<0&&before>=next&&this.bar<=next;
 if(reached){if(!i.hold||Math.abs(this.tilt)>.23){this.fail(!i.hold?'着段の瞬間にHOLDが必要です':'バーの左右がずれて脱線しました');return;}this.rung++;this.bar=down?-next:next;this.barV=0;this.state='ladder';this.cooldown=this.vertical?.25:.10;this.events.push('catch');}
 else if(!down&&this.bar<target-.28)this.fail('次の段にバーが届きませんでした');
 }
 if(down)this.y=SALMON.top-BODY-FLOOR+this.bar;else if(this.vertical){this.q=clamp(this.bar,0,this.a.length);this.y=0;}else this.y=SALMON.base-BODY-FLOOR+this.bar;
 if(!this.vertical&&this.grabbed)this.q=this.a.length/2+SALMON.offset;
 if(this.rung>=n&&this.vertical){this.q=this.a.length;this.clearArea();}
 }
 spider(dt,i,press){
 if(this.state==='ready'){if(press){this.beginApproach('spider',{q:.45,y:SPIDER[0].feet-FLOOR,z:0},.56);}return;}
 if(this.state==='spiderDrop'){
 if(!i.rawHold){this.grabbed=false;this.state='air';this.v=1.2;this.vy=Math.min(0,this.vy);return;}
 const target=SPIDER[5];this.vy-=G*dt;this.y+=this.vy*dt;this.q=Math.min(target.left+.28,this.q+1.6*dt);
 if(FLOOR+this.y<=target.feet){this.y=target.feet-FLOOR;this.vy=0;this.spiderPanel=5;this.state='spider';this.events.push('catch');}return;
 }
 this.tiltV+=(i.side*2.3-this.tilt*3-this.tiltV*2)*dt;this.tilt+=this.tiltV*dt;
 if(Math.abs(this.tilt)>.7){this.grabbed=false;this.state='air';this.v=0;this.vy=0;return;}
 this.drain(dt,1.1);const panel=SPIDER[this.spiderPanel],next=SPIDER[this.spiderPanel+1];
 // Hold UP/DOWN to move vertically on each fixed wall pair. No snapping to the next height.
 const goal=next&&this.q>=panel.right-.45?next.feet:panel.feet;
 if(i.jump&&goal>FLOOR+this.y)this.y=Math.min(goal-FLOOR,this.y+dt*2.8);
 if(i.descend&&goal<FLOOR+this.y&&this.spiderPanel!==4)this.y=Math.max(goal-FLOOR,this.y-dt*2.8);
 this.v+=(Math.max(0,i.forward)*3.8-this.v)*Math.min(1,dt*8);
 if(next&&this.q+this.v*dt>=panel.right){
 if(this.spiderPanel===4){this.q=Math.min(panel.right,this.q+this.v*dt);if(i.descend){this.state='spiderDrop';this.vy=0;if(!i.rawHold){this.grabbed=false;this.state='air';this.v=1.2;}}return;}
 if(Math.abs(FLOOR+this.y-next.feet)>.08){this.q=Math.min(panel.right-.03,this.q+this.v*dt);this.v=0;return;}
 this.spiderPanel++;
 }
 this.q+=this.v*dt;
 if(this.q>=this.a.length-.2)this.launchTo(this.a.length+1.0,0,1.8);
 }

 swim(dt,i,press){if(this.state==='ready'){if(i.forward>0)this.beginApproach('swim',{q:.7,y:BACKSTREAM.waterY+BACKSTREAM.swimmerOffset-FLOOR,z:0},.5);return;}this.state='swim';this.y=BACKSTREAM.waterY+BACKSTREAM.swimmerOffset-FLOOR;this.stroke+=dt*3.5;if(press&&this.cooldown<=0){this.v+=.65;this.cooldown=.32;this.drain(1,.3);}
 const thrust=i.forward>0?2.25+Math.sin(this.stroke*2)*.35:0;this.v+=(thrust-this.a.current-this.v*.8)*dt;this.q=clamp(this.q+this.v*dt,0,this.a.length);this.z=clamp(this.z+i.side*dt*.7,-.9,.9);this.drain(dt,.5);if(this.q>=this.a.length){this.state='shoreClimb';this.exitT=0;}}
 belt(dt,i,press){this.state='run';const speed=i.forward*(i.run?6:2.6)-3.2;this.v+=(speed-this.v)*Math.min(1,dt*7);this.q=clamp(this.q+this.v*dt,0,this.a.length);this.drain(dt,i.run?.5:.1);if(this.q>=this.a.length-.05)this.land();}
 walls(dt,i){this.state='lift';let stopped=false;for(let k=0;k<3;k++){
 const x=1.2+k*2.4,close=this.q>=x-.55&&this.q<x+.5;
 const force=close&&i.hold?820:0,m=this.a.masses[k];this.wallV[k]+=(force/m-G-this.wallV[k]*4)*dt;this.wallHeights[k]=clamp(this.wallHeights[k]+this.wallV[k]*dt,0,1.6);if(this.wallHeights[k]===0||this.wallHeights[k]===1.6)this.wallV[k]=0;
 if(close&&this.wallHeights[k]<1.2){stopped=true;this.q=Math.min(this.q,x-.3);}if(close&&i.hold)this.drain(dt,.9+k*.3);
 }
 if(!stopped)this.q=clamp(this.q+Math.max(0,i.forward)*dt*3.1,0,this.a.length);
 if(this.q>=this.a.length-SECOND_GOAL.reach){this.v=0;this.clearArea();}
 }
 unstable(dt,i,press){
 if(this.state==='ready'){if(press){this.state='boardFlight';this.v=2.6;this.vy=4.8;this.fromBoard=-1;}return;}
 if(this.state==='boardFlight'){this.airStep(dt,i,true);return;}
 if(this.state==='board'){const b=BOARDS[this.board],unstable=this.board===1;this.tiltV+=(i.side*3.8+(unstable?.5:.08)*Math.sin(this.t*2)+Math.sin(this.q)*.18-this.tilt*(unstable?1.1:6)-this.tiltV*1.8)*dt;this.tilt+=this.tiltV*dt;this.drain(dt,1.5);this.gripLoad=i.hold?0:this.gripLoad+dt;
 if(this.gripLoad>.45||Math.abs(this.tilt)>.85){this.fail('板の支持を失いました');return;}
 this.q=clamp(this.q+Math.max(0,i.forward)*dt*1.4,b.x-b.w/2,b.x+b.w/2-.08);this.y=b.y-BODY-FLOOR;
 if(press){this.fromBoard=this.board;this.state='boardFlight';this.grabbed=false;this.v=this.board===0?3.2:3.4;this.vy=3.4;this.events.push('jump');}
 }}
 swing(dt,i,press){
 if(this.state==='ready'){if(press){const h=swingGrip(.6,this.worldTime+.5);this.beginApproach('swing',{q:h.q,y:h.y-BODY-FLOOR,z:h.z},.5);}return;}
 this.drain(dt,1.2);this.tiltV+=(i.side*2-this.tilt*4-this.tiltV*2)*dt;this.tilt+=this.tiltV*dt;
 if(Math.abs(this.tilt)>.8){this.grabbed=false;this.state='air';this.v=0;this.vy=0;return;}
 this.swingGoal=Math.min(this.a.length-.6,this.swingGoal+i.forwardSteps*.68);
 this.swingQ=Math.min(this.swingGoal,this.swingQ+dt*3.4);
 const h=swingGrip(this.swingQ,this.worldTime);this.q=h.q;this.y=h.y-BODY-FLOOR;this.z=h.z;
 if(press)this.launchTo(this.swingQ>=this.a.length-1.3?this.a.length+1.1:this.q+1.6,0,2.5);
 }

 metal(dt,i,press){
 if(this.state==='ready'){this.v+=(i.forward*5.8-this.v)*Math.min(1,dt*6);this.q=clamp(this.q+this.v*dt,0,METAL.runway);if(press&&this.q>0){this.state='entryFlight';this.vy=4.5;this.events.push('jump');}return;}
 if(this.state==='entryFlight'){this.airStep(dt,i,false,true);return;}
 if(this.state==='spin'){this.omega*=Math.exp(-.18*dt);this.angle+=this.omega*dt;this.q=METAL.pivot+METAL.radius*Math.sin(this.angle);this.z=METAL.radius*Math.cos(this.angle);this.y=METAL.chainY-BODY-FLOOR;this.drain(dt,1.4);this.gripLoad=i.hold?0:this.gripLoad+dt;if(this.gripLoad>.4){this.fail('チェーンから手が外れました');return;}
 if(press){this.state='air';this.grabbed=false;this.v=METAL.radius*this.omega*Math.cos(this.angle)+1.4;this.vz=-METAL.radius*this.omega*Math.sin(this.angle);this.vy=3.8;if(this.angle>=.15&&this.angle<=1.35)this.launchTo(this.a.length+1.1,0,3.2);else this.events.push('jump');}
 if(this.angle>Math.PI*1.1)this.fail('回転の勢いを失い、対岸に渡れませんでした');
 }else if(this.state==='air')this.airStep(dt);
 }
 climb(dt,i,press){
 if(this.state==='ready'){if(!i.rawHold)return;this.state='climb';this.grabbed=true;this.hand=0;}
 this.drain(dt,1.2);
 // Fresh jumps while physically holding, no charge and no queued extra steps.
 if(press&&i.rawHold&&this.cooldown<=1e-9){this.hand++;this.z=this.hand%2?-.44:.44;this.goal=Math.min(this.a.length,(this.goal||0)+.53);this.cooldown=FINAL_RULES.climbInterval;this.events.push('catch');this.drain(1,.22);}
 const goal=this.goal||0;this.q=Math.min(goal,this.q+4*dt);this.v=this.q<goal?4:0;
 if(this.q>=this.a.length-.01)this.clearArea();
 }

 rope(dt,i,action){
 if(this.state==='ready'){if(i.rawHold||action){this.state='rope';this.grabbed=true;}else return;}
 this.drain(dt,1.45);this.footlock=Math.max(0,this.footlock-dt);
 this.ropeCharge=i.rawHold?Math.min(1,this.ropeCharge+dt/FINAL_RULES.ropeChargeSeconds):0;
 if(action==='jump'&&this.ropeCharge>=FINAL_RULES.ropeThreshold-1e-9){
 this.q=Math.min(this.a.length,this.q+.275);this.goal=this.q;this.ropeCharge=0;this.footlock=.2;this.events.push('pull');this.drain(1,.1);
 }
 this.v=0;this.z=Math.sin(this.t*2)*.08;
 if(this.q>=this.a.length-.04){this.q=this.a.length;this.clearArea();}
 }
}
