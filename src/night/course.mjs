// Broadcast layouts and known dimensions: docs/sasuke-research-2026.md.
// Lengths, forces, friction and control timing without published measurements are game calibration.
const area=(id,name,en,length,hint,extra={})=>({id,name,en,length,hint,...extra});
export const BASE_SECOND=[
 area('log','ローリングログ','ROLLING LOG',8,'HOLDで抱え込み。前進で出発、後退で片脚ブレーキ。終端でJUMPして岸へ。'),
 area('salmonUp','サーモンラダー上り','SALMON LADDER UP',2.5,'挑戦ボタンでバーへジャンプ。つかんだら挑戦ボタンをタップして一段ずつ上る。',{rungs:4,spacing:.38}),
 area('salmonDown','サーモンラダー下り','SALMON LADDER DOWN',2.5,'挑戦ボタンで飛びつく。タップで一段ずつ下り、最後のタップで対岸へジャンプ。',{rungs:3,spacing:.38}),
 area('spider','スパイダーラン＆ドロップ','SPIDER RUN / DROP',13,'上昇で壁へジャンプ。前進し、3枚目へは上昇、5枚目以降は下降で高さを合わせる。最後のドロップはHOLDを押しながら下降。',{dropAt:10.3,drop:1.8}),
 area('swim','バックストリーム','BACKSTREAM',9,'ここは落水失格にならない。前進でクロール、JUMPの短い連打でストローク。逆流に負けず岸へ。',{depth:1.5,current:1.15}),
 area('belt','リバースコンベアー','REVERSE CONVEYOR',8,'前進矢印を2度押し長押しでダッシュ。後ろ向きに動くベルトに逆らって走り抜ける。'),
 area('walls','ウォールリフティング','WALL LIFTING',10,'各壁の前でHOLDして持ち上げ、前進してくぐる。最後の赤いボタンに到達すると即クリア。',{masses:[30,40,50]})
];
export const LEGACY=[
 area('unstable','アンステーブルブリッジ','UNSTABLE BRIDGE',9,'JUMP＋HOLDで板の縁へ。前進で手送り、切れ目でJUMP。2枚目は左右で傾きを修正。',{era:'第23〜27回',chains:[4,2]}),
 area('swing','スイングラダー','SWING LADDER',8,'JUMP＋HOLDで揺れるうんていへ。前進ボタン1タップで次の横棒へ。長押しでは進まない。終端でJUMPして対岸へ。',{era:'第20〜22回'}),
 area('metal','メタルスピン','METAL SPIN',13,'5mのレーンを走り、先端でJUMPしてチェーンへ。回転の対岸側でJUMPして岸へ。',{era:'第14〜27回'})
];
export const FINAL=[
 area('climb','スピードクライミング','SPEED CLIMBING',8.5,'HOLDを押しながらJUMPをタップして上昇。溜めなし、次の一手は0.2秒後から。',{height:8.5}),
 area('salmonFinal','サーモンラダー15段','SALMON LADDER / 15',7,'JUMP長押しでゲージが往復（0.5秒で100%）。90〜100%の間に指を離すと一段上がる。',{height:7,rungs:15,spacing:7/15}),
 area('rope','綱登り','ROPE CLIMB',10,'HOLDでチャージ（0.5秒で100%）。90%以上でJUMPをタップすると上昇。次の上昇にはもう一度溜める。',{height:10})
];
export function secondCourse(){const list=[...BASE_SECOND];list.splice(4,0,...LEGACY);return layout(list);}
export function layout(list,vertical=false){let at=0;return list.map((a,i)=>{const start=at;at+=a.length+(vertical||a.id==='salmonUp'?0:3);return{...a,index:i,start,end:start+a.length,vertical};});}
export const finalCourse=()=>layout(FINAL,true);
export const SECOND_LIMIT=50; // User-selected game limit; not the broadcast time.
