import {SCREW} from './screw-motion.mjs';
import {gliderHeight} from './glider-motion.mjs';
export const WATER=-.05, FINISH=226.9, TIME_LIMIT=100;
export const WALL={start:218.9,radius:4.4,height:5.2,base:1.8,lipX:223.3,lipY:7.0,width:3.4};
export const AREAS=[
 {name:'クインタプルステップ',en:'QUINTUPLE STEPS',start:0,end:27,hint:'助走をつけて、足場の中央へジャンプ。',type:'steps'},
 {name:'スピンゲート',en:'SPIN GATES',start:27,end:47,hint:'回転アームの隙間を読んで進む。接触すると横へ弾かれる。',type:'rotors'},
 {name:'ムービングアイランド',en:'MOVING ISLANDS',start:47,end:67,hint:'左右に動く足場。着地点の動きを読もう。',type:'moving'},
 {name:'ジャイアントスイング',en:'GIANT SWING',start:67,end:83,hint:'跳んでHOLDでつかむ。つかんだ後は離してOK。前後で振り、JUMPで離手。',type:'rope'},
 {name:'ダブルオービット',en:'DOUBLE ORBIT',start:83,end:99,hint:'助走坂の上から図形の上面へ。回転に合わせて足を動かし、頂点から次へジャンプ。',type:'orbit'},
 {name:'スプリングネット',en:'SPRING NET',start:99,end:119,hint:'踏切台でJUMP→HOLD。前進で登って下る。ゴールの地面に着地すればクリア。',type:'net'},
 {name:'フライングリング',en:'FLYING RINGS',start:119,end:136,hint:'HOLDでつかむ。保持は自動継続。振り子の勢いで次へJUMP。',type:'rings'},
 {name:'スクリューハンマー',en:'SCREW HAMMER',start:136,end:153,hint:'中央の挑戦ボタンで起動。斜面を走ってJUMP＋HOLD。回転バーから対岸へJUMP。一周限り。',type:'screw'},
 {name:'ブレイクパネル',en:'BREAK PANELS',start:153,end:172,hint:'直線上の全3枚に着地。踏むと沈むので、助走とジャンプの間隔を調整。',type:'collapse'},
 {name:'スカイリレー',en:'SKY RELAY',start:172,end:199.9,hint:'前方のバーへ踏切→HOLD。長いカーブを滑降し、上向きの出口でJUMP＋HOLD、2本目へ。',type:'glider'},
 {name:'インパクトウォール',en:'IMPACT WALL',start:199.9,end:216.9,hint:'前進2度押しのダッシュで体当たり。前進を続け、二枚の重量ゲートを押し切る。',type:'press'},
 {name:'そり立つ壁',en:'WARPED WALL',start:216.9,end:230.9,hint:'十分な助走＋DASHで曲面を駆け上がる。頂上でHOLD→前進でよじ登って完走。失敗したら後退で助走位置へ戻り、再挑戦。',type:'warped'}
];
export const platforms=[],grips=[];
const deck=(id,x,w=5,y=1.8,z=0,d=3.4,extra={})=>{const p={id,x,y,z,w,d,...extra};platforms.push(p);return p;};
deck('start',3,8,1.8,0,4.8,{rest:true});
for(let i=0;i<5;i++)deck('step'+i,9+i*2.65,2.15,1.8+(i%2)*.18,(i%2?1:-1)*.5,2.25,{stage:0});
deck('rest1',24.5,5,1.8,0,4,{rest:true});
deck('gateBeam',35,13.8,1.8,0,1.25,{stage:1});
export const rotors=[{id:'rotor0',x:30.1,rate:1.1,phase:0},{id:'rotorBetween0',x:32.3,rate:-1.35,phase:3.6},{id:'rotor1',x:34.5,rate:-1.35,phase:.85},{id:'rotorBetween1',x:36.7,rate:1.1,phase:2.15},{id:'rotor2',x:38.9,rate:1.1,phase:1.7}].map(n=>({y:4.2,z:0,radius:1.9,...n}));
deck('rest2',44.5,5,1.8,0,4,{rest:true});
for(let i=0;i<4;i++)deck('moving'+i,49.3+i*3.65,2.25,1.9,0,2.6,{motion:'island',phase:i*1.8,stage:2});
deck('rest3',64.5,5,1.8,0,4,{rest:true});
grips.push({id:'giant',kind:'swing',x:71.8,y:7.1,z:0,length:3.6,stage:3});
deck('rest4',80.3,5.6,1.8,0,4,{rest:true});
deck('orbitApproach',81.35,4.9,1.8,0,3.0,{stage:4,ramp:true,rise:2.25});
for(let i=0;i<2;i++)deck('orbit'+i,86.3+i*4.8,4.0,2.05,0,2.1,{stage:4,motion:'orbit',radius:2.0,rate:.68,phase:i*.4});
deck('rest5',97,4,1.8,0,4,{rest:true});
deck('springApproach',101.2,4.5,1.8,0,3.0,{stage:5});
deck('spring',103.65,1.2,1.8,0,2.5,{stage:5,spring:true});
grips.push({id:'cargoNet',kind:'net',x:108.6,y:8.2,z:0,bottom:6.0,top:8.2,length:2.2,routeEnd:114.15,exitHandY:3.45,stage:5});
deck('rest6',116.5,5,1.8,0,4,{rest:true});
for(let i=0;i<4;i++)grips.push({id:'ring'+i,kind:'swing',x:121.1+i*3.05,y:6.3,z:0,length:2.3,stage:6});
deck('rest7',133.7,5,1.8,0,4,{rest:true});
deck('screwRamp',137.9,3.4,1.8,0,2.6,{stage:7,ramp:true,rise:3.4*Math.tan(Math.PI/6)});
grips.push({id:'screwBar',kind:'screw',x:SCREW.x,y:SCREW.y,z:0,length:SCREW.barLength,stage:7});
export const presses=[{id:'press0',x:202.9,travel:1.7,mass:1.2},{id:'press1',x:208.0,travel:1.7,mass:1.65}];
deck('rest8',150.5,5,1.8,0,4,{rest:true});
for(let i=0;i<3;i++)deck('break'+i,155.5+i*4.8,2.0,1.95,0,1.5,{stage:8,motion:'collapse',order:i});
deck('rest9',169.5,5,1.8,0,4,{rest:true});
deck('gliderApproach',172.7,2.0,1.8,0,3.0,{stage:9});
deck('gliderSpring',173.7,1.0,1.8,0,2.5,{stage:9,spring:true,jumpBoost:11.9});
export const gliders=[{id:'glider0',kind:'glider',x:177.6,y:7.0,z:0,length:8.4,drop:2.4,lift:.552,legacy:{length:4.2,slope:-.44},stage:9,order:0},{id:'glider1',kind:'glider',x:188.05,y:5.4,z:0,length:6.2,drop:1.8,lift:.56,legacy:{length:3.1,slope:-.40},stage:9,order:1}];
grips.push(...gliders);
deck('rest10',197.4,5,1.8,0,4,{rest:true});
deck('pressTrack',205.8,12,1.8,0,3.2,{stage:10});
deck('rest11',214.2,5.4,1.8,0,4,{rest:true});
deck('wallRunway',217.9,2.4,1.8,0,3.4,{rest:true});
deck('wallApron',(216.5+AREAS[11].end+1)/2,AREAS[11].end+1-216.5,WALL.base,0,6,{rest:true,wallSafety:true,stage:11});
grips.push({id:'wallLip',kind:'ledge',x:WALL.lipX,y:WALL.lipY,z:0,length:.7,stage:11});
deck('summit',226.9,7.2,WALL.lipY,0,4.2,{rest:true,stage:11});
// Solid, guarded links cover the complete rest platform and both sides of each area boundary.
export const transitions=AREAS.slice(1).map((area,index)=>{
 const rest=platforms.find(p=>p.id==='rest'+(index+1)),left=rest.x-rest.w/2,right=Math.max(rest.x+rest.w/2,area.start+.7);
 return deck('transition'+(index+1),(left+right)/2,right-left,rest.y,rest.z,3.4,{rest:true,transition:true,transitionFrom:index,stage:index});
});
export function safeLinkAt(x){return transitions.find(p=>x>=p.x-p.w/2&&x<=p.x+p.w/2);}
export function orbitVertices(p,t){const a=t*p.rate+p.phase;return Array.from({length:4},(_,i)=>{const q=a+Math.PI/4+i*Math.PI/2;return{x:p.x+p.radius*Math.cos(q),y:p.y+p.radius*Math.sin(q)};});}
export function position(p,t,loads={}){
 if(p.motion==='island')return {...p,z:p.z+Math.sin(t*1.1+p.phase)*1.33};
 if(p.motion==='collapse'){const elapsed=loads[p.id]===undefined?0:Math.max(0,t-loads[p.id]-.22);return {...p,y:p.y-Math.min(5,elapsed*elapsed*4),tilt:Math.min(1.3,elapsed*1.8)};}
 if(p.motion==='orbit'){const v=orbitVertices(p,t);return {...p,w:Math.max(...v.map(q=>q.x))-Math.min(...v.map(q=>q.x)),y:Math.max(...v.map(q=>q.y))};}
 return p;
}
export function surfaceAt(p,x,z,t,loads={}){
 const s=position(p,t,loads);if(Math.abs(z-s.z)>s.d/2-.09)return null;
 if(p.motion!=='orbit'){if(Math.abs(x-s.x)>s.w/2-(p.ramp?0:p.rest?-.04:.1)+1e-8)return null;if(p.ramp)return {...s,y:p.y+p.rise*Math.max(0,Math.min(1,(x-(p.x-p.w/2))/p.w))};return p.motion==='collapse'?{...s,y:s.y+Math.sin(s.tilt)*(x-s.x)}:s;}
 const v=orbitVertices(p,t),hits=[];for(let k=0;k<4;k++){const a=v[k],b=v[(k+1)%4];if(x>=Math.min(a.x,b.x)&&x<=Math.max(a.x,b.x)&&Math.abs(b.x-a.x)>1e-8)hits.push(a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x));}
 return hits.length?{...s,y:Math.max(...hits)}:null;
}
export function rotorArms(n,t){const a=n.phase+t*n.rate;return Array.from({length:3},(_,i)=>{const q=a+i*Math.PI*2/3;return {a:{x:n.x,y:n.y,z:0},b:{x:n.x,y:n.y+Math.cos(q)*n.radius,z:Math.sin(q)*n.radius}};});}
export function areaAt(x){const index=AREAS.findIndex(a=>x<a.end);return index<0?AREAS.length-1:Math.max(0,index);}
export const spawnFor=stage=>({x:stage===0?2:stage===4?78.1:AREAS[stage].start-1.6,y:1.8,z:0});
export function netRoute(n,t){const a=Math.max(0,Math.min(1,t));return {x:n.x+(n.routeEnd-n.x)*a,y:n.top+(n.exitHandY-n.top)*(a*a*(3-2*a)),z:0};}
export function gliderPoint(n,offset=0){return {x:n.x+offset,y:gliderHeight(n,offset),z:n.z};}
