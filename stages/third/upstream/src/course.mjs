// One persistent world. Coordinates are centimetres; +y points down, +z toward camera.
// Grip widths and rail length are documented; other dimensions are visual estimates.
export const AREA_INFO=[
 ['フライングバー','FLYING BAR','bar','「振る」を長押しして加速。「保持」を押しながらタイミングよくジャンプ。バーを皿へ。'],
 ['サイドワインダー','SIDEWINDER','pole','「蹴る」で背面へ。蹴り出し時に次のポールとの直線から±20°で移れる。横移動なしでも飛べる。「横移動」は任意で端なく回り込む。「保持」長押しで登る。掴む瞬間も保持が必要で、掴んだ後は離してOK。'],
 ['スイングエッジ 改','SWING EDGE KAI','edge','X→Y→X。「振る」で加速し、「保持」長押しで逆手着手。最後はアクリル板に注意。'],
 ['クリフディメンション','CLIFF DIMENSION','cliff','「保持」長押しで横移動。端で「振る」→ジャンプ。背面の反転は自動。'],
 ['バーティカルリミット.BURST','VERTICAL LIMIT .BURST','burst','「移動」で手送り。黄色の中央で「振る」→「保持」で斜め上の突起へ持ち替え、60°引き下ろす。最後の回転負荷は10%増。'],
 ['パイプスライダー','PIPE SLIDER','pipe','「保持」長押しでレールを進む。終端で「振る」で加速し、ジャンプして着地。']
];
export const COURSE=[];
const add=(stage,kind,x,y,z=0,more={})=>{const n={id:COURSE.length,stage,kind,x,y,z,len:0,...more};COURSE.push(n);return n;};
// Fixed cradle supports. Only the athlete and carried bar move.
for(const x of [180,360,540])add(0,'bar',x,130,0,{radius:13});
// Four suspended cylinders: continuous axial rotation on 1/3, a load-triggered drop on 2.
for(const [i,x] of [730,925,1120,1315].entries())add(1,'pole',x,125,0,{radius:22,local:i,drop:i===1?60:0,spin:i===0||i===2,spinRate:i===0||i===2?.72:0,climbRange:95});
// Landing deck between sidewinder and swing edge; departure requires Challenge.
add(1,'deck',1435,335,0,{len:160,landingMargin:40});
for(const [i,x] of [1675,1860,2045].entries())add(2,'edge',x,130,0,{radius:12,local:i,shape:i===1?'Y':'X',acrylic:i===2});
add(2,'deck',2195,335,0,{len:160,landingMargin:40});
add(3,'cliff',2425,130,0,{len:140,lip:3,local:0});
add(3,'cliff',2565,130,180,{len:130,lip:3,local:1,motion:'vertical',amplitude:45});
add(3,'cliff',2695,130,0,{len:145,lip:3,local:2,motion:'depth',amplitude:45});
// Four physical units: rotating yellow, fixed red, fixed red, rotating yellow.
let x=2850;
for(const [zone,len] of [120,90,90,120].entries()){
 add(4,'burst',x,130,[0,0,-30,-90][zone],{len,lip:1,local:zone,zone,rotating:zone===0||zone===3,rotationAt:zone===0||zone===3?len/2:null,rotationLoadMultiplier:zone===3?1.1:1});x+=len;
}
add(4,'deck',x+15,335,-90,{len:150});
add(5,'pipe',x+235,130,-90,{len:530,radius:14});
export const FINISH={x:x+235+530+150,y:335,z:-90,len:190};
export const STAGES=AREA_INFO.map(([name,en,kind,hint],stage)=>({name,en,kind,hint,detail:hint,anchors:COURSE.filter(n=>n.stage===stage&&n.kind!=='deck'),end:stage===5?FINISH.x:COURSE.find(n=>n.stage===stage+1)?.x||FINISH.x}));
export const WORLD_WIDTH=FINISH.x+FINISH.len+150;
