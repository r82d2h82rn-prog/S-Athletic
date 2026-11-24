export function pilot(g){
 const dt=1/120;let jump=false,lastArea=-1,cycle=0,releaseFrames=0;
 const trace=[];
 for(let k=0;k<120*180&&g.status==='playing';k++){
 if(g.area!==lastArea){lastArea=g.area;cycle=0;jump=false;releaseFrames=0;trace.push({area:g.a.id,time:g.time});}
 const a=g.a,id=a.id;let i={hold:true,forward:1,side:0,jump:false,run:true};
 if(id==='log')i.jump=g.state==='log'&&g.q>a.length-1.85;
 if(id.startsWith('salmon')){i.forward=id==='salmonDown'&&g.rung<a.rungs&&g.state!=='ready'?-1:1;i.side=-g.tilt*2-g.tiltV;
 if(g.state==='ready')i.jump=!g.previous.jump;
 if(g.state==='ladder'&&g.cooldown<=0){if(g.rung>=a.rungs)i.jump=!g.previous.jump;else i.jump=g.charge<.17;}else if(g.state!=='ready')i.jump=false;}
 if(id==='unstable'){i.side=-g.tilt*2-g.tiltV;i.jump=g.state==='ready'||g.state==='board'&&(g.board===0?g.q>3.45:g.q>7.8);}
 if(id==='swing'){i.jump=g.state==='ready'||g.state==='swing'&&g.swingQ>a.length-1.25;if(g.state==='swing')i.forward=g.previous.forward>0?0:1;}
 if(id==='spider'){i.jump=g.state==='ready'||g.state==='spider'&&g.spiderPanel===1&&g.q>3.5;i.descend=g.state==='spider'&&g.spiderPanel>=3&&g.q>8.0;}
 if(id==='metal')i.jump=g.state==='ready'&&g.q>4.75||g.state==='spin'&&g.angle>.48;
 if(id==='swim')i.jump=k%60<20;
 if(id==='climb'){const desired=(g.hand||0)+1;i.side=desired%2?-1:1;i.jump=g.cooldown<=0&&!g.previous.jump&&Math.abs(g.z-(desired%2?-.44:.44))<.25;}
 if(id==='rope'){i.hold=true;i.jump=g.ropeCharge>=.9&&!g.previous.jump;}
 if(id==='salmonFinal')i.jump=g.state==='ladder'&&g.salmonCharge<.9&&g.cooldown<=0;
 if(id==='climb'){i.simple=true;i.hold=true;i.jump=!g.previous.jump&&g.cooldown<=1e-9;}

 g.step(dt,i);
 }
 return trace;
}
