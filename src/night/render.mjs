import {enhanceScene,animatedWater} from '../visual-quality.mjs';
import {buildFinalScenery,updateFinalLights} from './final-scenery.mjs';
import {LOG,METAL,BOARDS,FLOOR,BODY,SALMON,SPIDER,BACKSTREAM,WATER,swingGrip} from './geometry.mjs';
import * as THREE from '../../vendor/three/three.module.min.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
export class NightRenderer{
 constructor(canvas,game,{headless=false}={}){this.canvas=canvas;this.g=game;this.headless=headless;this.accent=game.vertical?'#d64954':'#f2cf21';this.mode=0;this.yaw=.38;this.pitch=.18;this.zoom=1;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#040a18');this.scene.fog=new THREE.FogExp2('#17253b',.005);this.camera=new THREE.PerspectiveCamera(46,1,.07,350);this.focus=V(0,3,0);this.materials={};this.dynamic=[];this.lastArea=-1;
 if(!headless){this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
 this.scene.add(new THREE.HemisphereLight('#9eb4df','#121d28',1.6));this.key=new THREE.DirectionalLight('#d6e6ff',3);this.key.position.set(5,20,9);this.key.castShadow=false;this.key.shadow.mapSize.set(1024,1024);Object.assign(this.key.shadow.camera,{left:-12,right:12,top:14,bottom:-12,far:65});this.key.shadow.bias=-.001;this.scene.add(this.key,this.key.target);
 // Calm, stable illumination close to the original 3rd stage. No moving shadow map.
 this.scene.add(new THREE.AmbientLight('#b8c6db',.25));
 const fill=new THREE.DirectionalLight('#bdcce0',.6);fill.position.set(-4,8,-6);this.scene.add(fill);
 this.world=new THREE.Group();this.scene.add(this.world);this.actor=new THREE.Group();this.scene.add(this.actor);this.build();this.bakeStatic();this.makeAthlete();if(!headless){enhanceScene({renderer:this.renderer,scene:this.scene,key:this.key,night:true});this.waterUpdates=this.waters.map(animatedWater);}
 }
 texture(kind){if(this.headless)return null;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');let seed=841;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 x.fillStyle=({metal:'#88919d',pad:'#dedbd1',rubber:'#242c34',wood:'#b89768',rope:'#bbae89',wall:'#d0d3d1',water:'#16445a',stone:'#a8a9a0'})[kind]||'#788290';x.fillRect(0,0,128,128);
 for(let n=0;n<950;n++){x.fillStyle=`rgba(${rand()>.5?'255,255,255':'0,0,0'},${rand()*.055})`;const y=rand()*128;x.fillRect(rand()*128,y,kind==='wood'?rand()*65:kind==='metal'?rand()*25:1,1);}
 if(kind==='hazard'||kind==='tread'){
 x.fillStyle='#20262d';x.fillRect(0,0,128,128);x.fillStyle='#f2cf21';
 if(kind==='hazard'){for(let k=-128;k<256;k+=48){x.beginPath();x.moveTo(k,0);x.lineTo(k+20,0);x.lineTo(k+148,128);x.lineTo(k+128,128);x.fill();}}
 else{for(let y=24;y<128;y+=48){x.beginPath();x.moveTo(18,y-12);x.lineTo(64,y+10);x.lineTo(110,y-12);x.lineTo(110,y);x.lineTo(64,y+22);x.lineTo(18,y);x.fill();}}
 }
 if(kind==='stone'){x.strokeStyle='#70736e';x.lineWidth=2;for(let row=0;row<4;row++){const y=row*32;x.beginPath();x.moveTo(0,y);x.lineTo(128,y);for(let col=-1;col<5;col++){const xx=col*48+(row%2)*24;x.moveTo(xx,y);x.lineTo(xx,y+32);}x.stroke();}}
 if(kind==='pad'){x.strokeStyle='#e57682';x.lineWidth=1;x.setLineDash([3,3]);x.strokeRect(7,7,114,114);x.strokeRect(10,10,108,108);}
 if(kind==='rope'){x.strokeStyle='#706a53';x.lineWidth=3;for(let i=-128;i<256;i+=13){x.beginPath();x.moveTo(i,0);x.lineTo(i+128,128);x.stroke();}}
 if(kind==='rubber'){x.fillStyle='#48515b';for(let i=0;i<128;i+=12)for(let j=0;j<128;j+=12)x.fillRect(i,j,3,3);}
 if(kind==='wall'){x.strokeStyle='#9d9f9e';x.strokeRect(0,0,128,128);for(let i=16;i<128;i+=32)for(let j=16;j<128;j+=32){x.fillStyle='#697074';x.beginPath();x.arc(i,j,1.1,0,7);x.fill();}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
 }
 mat(kind,color){const k=kind+color;if(this.materials[k])return this.materials[k];return this.materials[k]=new THREE.MeshStandardMaterial({color:color||'#ffffff',map:this.texture(kind),roughness:kind==='metal'?.32:.85,metalness:kind==='metal'?.72:0});}
 box(x,y,z,w,h,d,kind='metal',color,parent=this.world){const geometry=parent===this.actor&&h>.3?new THREE.CapsuleGeometry(Math.min(w,d)/2,Math.max(.01,h-Math.min(w,d)),6,16):new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(geometry,this.mat(kind,color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 ball(x,y,z,r,color,parent=this.world){const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),new THREE.MeshStandardMaterial({color,roughness:.6}));m.position.set(x,y,z);parent.add(m);m.castShadow=true;return m;}
 rod(a,b,r=.04,kind='metal',color,parent=this.world){const av=V(...a),bv=V(...b),d=bv.clone().sub(av);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),16),this.mat(kind,color));m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());parent.add(m);m.castShadow=true;return m;}
 label(text,x,y,z,w=4,parent=this.world){if(this.headless)return;const c=document.createElement('canvas');c.width=1024;c.height=128;const x2=c.getContext('2d');x2.fillStyle='#0b1527';x2.fillRect(0,0,1024,128);x2.fillStyle=this.g.vertical?'#eaf3ff':this.accent;x2.font='bold 57px sans-serif';x2.textAlign='center';x2.fillText(text,512,83);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/8),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);}
 truss(x,y,z,h){for(const dx of[-.22,.22])for(const dz of[-.22,.22])this.rod([x+dx,y,z+dz],[x+dx,y+h,z+dz],.045);for(let k=0;k<h;k+=1){this.rod([x-.22,y+k,z+.22],[x+.22,y+Math.min(h,k+1),z+.22],.024);this.rod([x+.22,y+k,z-.22],[x-.22,y+Math.min(h,k+1),z-.22],.024);}}
 build(){const g=this.g,len=g.vertical?22:g.course.at(-1).end+5;
 if(g.vertical){this.box(0,-.45,10,65,.6,80,'rubber','#101c29');this.waters=[];this.pool(-8,16,10);this.water=this.waters[0];const old=new Set(this.world.children);this.buildTower();for(const child of this.world.children)if(!old.has(child))child.position.y+=FLOOR;return;}
 if(g.vertical)this.box(len/2-4,-.45,0,len+45,.6,65,'rubber','#354b40');
 else{for(const z of[-17.95,17.95])this.box(len/2-4,-.45,z,len+45,.6,29.1,'rubber','#354b40');}

 this.waters=[];
 if(g.vertical)this.pool(-9.5,37,16);else for(const a of g.course)this.pool(a.start,a.length,a.id==='swim'?2.5:6.8,a.id);
 this.water=this.waters[0];
 for(let x=-8;x<len+8;x+=8){for(const z of[-10,10]){this.truss(x,0,z,11);const lamp=this.box(x,10.5,z,2,.25,.3,'metal','#fbf5df');lamp.material.emissive.set('#fff2d5');lamp.material.emissiveIntensity=.12;}this.rod([x,11,-10],[x,11,10],.1);}
 // Instanced spectators keep crowd draw calls bounded on phones.
 const count=Math.ceil(len/2.5)*12,crowd=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17,.32,3,5),new THREE.MeshStandardMaterial({color:'#a6bed0',roughness:1}),count);const dummy=new THREE.Object3D();let n=0;
 for(let x=-5;x<len;x+=2.5)for(const z of[-1,1])for(let row=0;row<6;row++){dummy.position.set(x,1+row*.4,z*(14+row*.6));dummy.updateMatrix();crowd.setMatrixAt(n,dummy.matrix);crowd.setColorAt(n,new THREE.Color(['#d64e60','#354b70','#b5b3a2','#386e79'][n%4]));n++;}crowd.count=n;this.world.add(crowd);
 for(const z of[-15,15]){this.box(len/2-2,.35,z,len+20,.7,2,'metal','#26394b');this.box(len/2-2,1.3,z-Math.sign(z)*2,len+20,1,.2,'pad',g.vertical?'#792b42':this.accent);}
 this.label('S-ATHLETIC  /  NIGHT SESSION',g.vertical?0:len/2,8,-11,13);
 if(!g.vertical)this.arenaDecor(len);
 if(g.vertical){const old=new Set(this.world.children);this.buildTower();for(const child of this.world.children)if(!old.has(child))child.position.y+=1.8;}else for(const a of g.course)this.buildArea(a);
 }
 pool(left,length,width,id='final'){
 const water=new THREE.Mesh(new THREE.PlaneGeometry(length,width,Math.max(4,Math.ceil(length*3)),6),new THREE.MeshStandardMaterial({color:id==='swim'?'#1babc9':'#166185',roughness:.38,metalness:.15,transparent:true,opacity:.88,depthWrite:false}));
 water.rotation.x=-Math.PI/2;water.position.set(left+length/2,id==='swim'?BACKSTREAM.waterY:WATER,0);water.userData={pool:id};this.world.add(water);this.waters.push(water);if(this.g.vertical)return;this.box(left+length/2,-.94,0,length,.12,width,'wall',id==='swim'?'#d8edf0':'#203f4a');
 for(const z of[-width/2-.12,width/2+.12]){this.box(left+length/2,-.4,z,length,1,.22,'metal','#26323d');this.box(left+length/2,.09,z,length,.06,.23,'pad',this.accent);}
 for(const x of[left-.1,left+length+.1])this.box(x,-.4,0,.18,1,width,'metal','#26323d');
 }
 arenaDecor(len){
 // Yellow perimeter pads, tall trusses, equipment tents and a broadcast-style timing gantry.
 for(let x=4;x<len;x+=20){this.box(x,1.4,-8,8,2,.4,'hazard','#ffffff');this.label('2nd STAGE',x,2,-7.76,5);
 for(const z of[-11,11]){this.box(x,1.2,z,3,2.4,2.4,'pad','#1a2636');const roof=this.box(x,2.5,z,3.7,.18,3,'pad',this.accent);roof.rotation.z=.07;}
 }
 for(const x of[-4,len-3]){for(const z of[-4.8,4.8])this.truss(x,0,z,8);this.box(x,7.3,0,.3,1.4,9.8,'pad','#151b22');}
 this.label('2nd STAGE   /   60.00',len-3,7.4,4.94,7);
 }

 deck(x,w=3,y=1.8){this.deckKeys??=new Set();const key=[x,w,y].join(':');if(this.deckKeys.has(key))return;this.deckKeys.add(key);/* The cap alone ends at the collision height y; keep the base below it. */this.box(x,y-.29,0,w,.42,3.8,'pad','#cbd0d1');this.box(x,y-.04,0,w,.08,3.7,'rubber','#304257');for(const z of[-1.8,1.8])this.box(x,y+.03,z,w,.06,.12,'pad',this.accent);}
 buildArea(a){const x=a.start;if(a.id!=='salmonDown')this.deck(x-1.5);this.label(`${String(a.index+1).padStart(2,'0')}  ${a.en}`,x+a.length/2,6,-3.3,Math.min(6,a.length));
 if(a.id==='log'){const group=new THREE.Group();this.world.add(group);this.rod([0,0,-1.1],[0,0,1.1],LOG.radius,'pad','#f2cf21',group);for(const z of[-.8,0,.8]){this.rod([-.4,.55,z],[.4,.55,z],.055,'metal','#d9dee2',group);}this.dynamic.push({kind:'log',a,group});for(const z of[-1.45,1.45])this.rod([x,LOG.centerY,z],[x+a.length,LOG.centerY-a.length*LOG.slope,z],.07);}
 if(a.id==='salmonUp')this.deck(x+(a.length/2-.6)/2,(a.length/2-.6));
 if(a.id.startsWith('salmon')){for(const z of[-.9,.9]){this.box(x+a.length/2+.12,3.8,z,.16,5.8,.22,'metal','#dce0df');for(let k=0;k<=a.rungs;k++){const y=a.id==='salmonDown'?SALMON.top-k*a.spacing:SALMON.base+k*a.spacing;const tooth=this.box(x+a.length/2-.10,y-.13,z,.48,.10,.20,'metal','#f2cf21');tooth.rotation.z=-.14;this.box(x+a.length/2-.34,y+.025,z,.07,.16,.22,'metal','#dcb921');}}
 const bar=this.rod([x+a.length/2+SALMON.offset,SALMON.base,-1.2],[x+a.length/2+SALMON.offset,SALMON.base,1.2],.05,'metal','#eee9dc');this.dynamic.push({kind:'bar',a,mesh:bar});}
 if(a.id==='spider'){
 for(const [j,p]of SPIDER.entries())for(const z of[-.64,.64]){
 const w=p.right-p.left,h=3,bottom=p.feet-.45,center=x+(p.left+p.right)/2;
 const pane=this.box(center,bottom+h/2,z,w,h,.035,'metal','#a9e9f1');
 pane.material=new THREE.MeshStandardMaterial({color:'#a9e9f1',transparent:true,opacity:z>0?.16:.24,depthWrite:false,roughness:.18,metalness:.05});pane.userData={spiderPanel:j};
 // The separate lower drop pair has a red perimeter; the run remains yellow.
 const frameColor=j===SPIDER.length-1?'#ed3d4d':'#f2cf21';
 for(const xx of[x+p.left,x+p.right])this.box(xx,bottom+h/2,z,.075,h+.075,.09,'metal',frameColor);
 for(const yy of[bottom,bottom+h])this.box(center,yy,z,w+.075,.075,.09,'metal',frameColor);
 if(z<0)this.label(String(j+1).padStart(2,'0'),center,bottom+h-.3,z+.06,.45);
 }
 }

 if(a.id==='swim'){
 for(const z of[-1.4,1.4]){this.box(x+a.length/2,.35,z,a.length,1.2,.18,'wall','#e7f0ef');this.box(x+a.length/2,1,z,a.length,.12,.26,'pad','#f2cf21');for(let k=0;k<a.length;k+=1)this.box(x+k,.36,z-Math.sign(z)*.1,.03,1.0,.025,'metal','#38a7c9');}
 for(const xx of[x,a.end])this.box(xx,.32,0,.15,1.2,2.65,'wall','#e7f0ef');
 for(let k=0;k<5;k++){this.box(a.end-.05,.15+k*.32,0,.3,.07,1.2,'metal','#e6eaf0');this.box(x+.5+k*.5,BACKSTREAM.waterY+.08,0,.12,.05,1.7,'pad','#e9faf8');}
 this.label('BACKSTREAM   ← ← ←',x+a.length/2,1.8,-1.55,6);
 }

 if(a.id==='belt'){this.box(x+a.length/2,1.42,0,a.length,.6,2.8,'metal','#798086');this.belt=this.box(x+a.length/2,1.75,0,a.length,.08,2.5,'tread','#ffffff');for(let k=0;k<a.length;k+=.35){const slat=this.box(x+k,1.795,0,.06,.01,2.5,'pad','#f2cf21');this.dynamic.push({kind:'slat',a,mesh:slat,offset:k});}this.deck(a.end+1.5);}
 if(a.id==='walls'){this.deck(x+a.length/2,a.length);for(let k=0;k<3;k++){const at=x+1.2+k*2.4;for(const z of[-1.5,1.5])this.box(at,3,z,.22,3,.2);const m=new THREE.Group();m.position.set(at,2.65,0);this.world.add(m);this.box(0,0,0,.25,1.65,2.8,'hazard','#ffffff',m);this.label(`${a.masses[k]} kg`,0,.2,1.42,1.5,m);this.dynamic.push({kind:'wall',a,mesh:m,k});}}
 if(a.id==='unstable'){for(let k=0;k<2;k++){const b=BOARDS[k],group=new THREE.Group();group.position.set(x+b.x,b.y,0);this.world.add(group);this.box(0,0,0,b.w,.12,b.d,'wood','#e2d2b4',group);for(const dx of k===0?[-1.5,1.5]:[0])for(const z of[-.7,.7]){const chain=this.rod([x+b.x+dx,6,z],[x+b.x+dx,4,z],.022);this.dynamic.push({kind:'boardChain',a,mesh:chain,k,dx,z});}this.dynamic.push({kind:'board',a,group,k});}}
 if(a.id==='swing'){
 const group=new THREE.Group();group.position.set(x,5.6,0);this.world.add(group);
 for(const z of[-.65,.65]){this.rod([.4,-1.5,z],[a.length-.4,-1.5,z],.055,'metal','#f2cf21',group);for(const at of[.6,a.length-.6])this.rod([at,0,z],[at,-1.5,z],.025,'metal','#c9d3db',group);}
 for(let at=.6;at<a.length-.3;at+=.68)this.rod([at,-1.5,-.65],[at,-1.5,.65],.045,'metal','#dde5e8',group);
 this.dynamic.push({kind:'swing',a,group});
 }

 if(a.id==='metal'){this.deck(x+METAL.runway/2,METAL.runway);this.truss(x+METAL.pivot,0,-2.4,7);this.rod([x+METAL.pivot,6,-2.4],[x+METAL.pivot,6,0],.09);const group=new THREE.Group();group.position.set(x+METAL.pivot,METAL.chainY+1.7,0);this.world.add(group);this.rod([0,-.1,0],[0,.1,0],2.4,'metal','#bdc5cf',group);for(let k=0;k<8;k++){const angle=k*Math.PI/4,px=Math.sin(angle)*2.4,pz=Math.cos(angle)*2.4;this.rod([px,0,pz],[px,-1.7,pz],.027,'metal','#d7e0e4',group);for(let j=0;j<9;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.013,4,6),this.mat('metal','#abb9c6'));ring.position.set(px,-j*.18,pz);ring.rotation.y=j%2*Math.PI/2;group.add(ring);}}this.dynamic.push({kind:'metal',a,group});}
 if(a.index===this.g.course.length-1){this.deck(a.end+1.5,3);this.box(a.end,2.3,0,.5,.7,.5,'metal','#d4dce6');this.ball(a.end,2.72,0,.18,'#ff2844');}
 }
 buildTower(){const g=this.g;for(const x of[-2.1,2.1])for(const z of[-2.1,2.1])this.truss(x,0,z,27);for(let y=0;y<27;y+=2){this.rod([-2.1,y,-2.1],[-2.1,y,2.1],.07);this.rod([2.1,y,-2.1],[2.1,y,2.1],.07);}
 this.deck(0,4,0);this.box(0,4.25,-.65,2.8,8.5,.18,'wall','#e3e5df');for(let k=0;k<17;k++){const x=k%2?-.44:.44,y=.55+k*.48;const hold=this.ball(x,y,-.42,.17,'#ed3d4d');hold.scale.set(1.4,.7,.8);this.ball(-x*.8,y-.3,-.43,.11,'#ec3a48');}
 const a=g.course[1];for(const x of[-.8,.8]){this.box(x,12,0,.18,7.5,.13);for(let k=0;k<=15;k++)this.box(x,8.5+k*7/15,-.1,.19,.07,.36,'metal','#c3cad1');}
 const bar=this.rod([-1.1,8.5,0],[1.1,8.5,0],.045,'metal','#f2f0e7');bar.visible=false;this.dynamic.push({kind:'barFinal',a,mesh:bar});this.rod([0,15.5,-.2],[0,25.5,-.2],.055,'rope','#f0e3c4');
 for(const y of[8.5,15.5,25.5])this.box(-1.5,y-.15,0,.7,.3,2,'pad','#a52945');this.label('FINAL STAGE',0,26.5,2.13,4);this.box(0,25.55,0,.6,.2,.7,'metal','#c8d6df');this.ball(0,25.8,.25,.18,'#f52b42');
 buildFinalScenery(this);
 }
 bakeStatic(){
 // Merge fixed trusses, platforms and furnishings by material and spatial chunk.
 // Animated collision objects, water and instanced crowds retain their own transforms.
 this.scene.updateMatrixWorld(true);const animated=new Set(this.dynamic.flatMap(o=>[o.mesh,o.group]).filter(Boolean));for(const water of this.waters)animated.add(water);if(this.finalEffects)animated.add(this.finalEffects);const groups=new Map(),remove=[];
 this.world.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent)return;for(let p=o;p;p=p.parent)if(animated.has(p))return;
 const key=o.material.id+':'+Math.floor(new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).x/20),geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);
 if(!groups.has(key))groups.set(key,{material:o.material,p:[],n:[],uv:[]});const group=groups.get(key);for(const [name,target]of[['position','p'],['normal','n'],['uv','uv']]){const data=geo.getAttribute(name);if(data)group[target].push(data.array);}remove.push(o);geo.dispose();});
 for(const o of remove){o.removeFromParent();o.geometry.dispose();}
 this.staticBatches=[];for(const group of groups.values()){const geo=new THREE.BufferGeometry();for(const [name,key,size]of[['position','p',3],['normal','n',3],['uv','uv',2]]){const arrays=group[key];if(!arrays.length)continue;const data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){data.set(a,offset);offset+=a.length;}geo.setAttribute(name,new THREE.BufferAttribute(data,size));}geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,group.material);mesh.castShadow=mesh.receiveShadow=true;this.world.add(mesh);this.staticBatches.push(mesh);}
 }
 makeAthlete(){this.parts={};this.box(0,.96,0,.43,.54,.24,'rubber','#eef2e9',this.actor);this.box(0,.62,0,.35,.24,.23,'rubber','#244058',this.actor);this.ball(0,1.47,0,.18,'#c6977b',this.actor);this.ball(0,1.55,-.02,.165,'#151c29',this.actor);this.box(0,1.54,.12,.31,.05,.1,'pad','#ef3e56',this.actor);
 for(const k of['armL','armR','foreL','foreR','thighL','thighR','shinL','shinR']){this.parts[k]=this.rod([0,0,0],[0,.3,0],k.includes('thigh')?.075:.055,'rubber',k.startsWith('arm')||k.startsWith('fore')?'#d8ae91':k.startsWith('shin')?'#c0a48b':'#223f55',this.actor);}
 this.hands=[this.ball(0,0,0,.065,'#d6ad90',this.actor),this.ball(0,0,0,.065,'#d6ad90',this.actor)];this.feet=[this.box(0,0,0,.14,.10,.28,'rubber','#e54d56',this.actor),this.box(0,0,0,.14,.10,.28,'rubber','#e54d56',this.actor)];
 }
 segment(mesh,a,b){const d=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,d.length()/.3,1);mesh.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());}
 limb(prefix,side,root,end,bend){const mid=root.clone().add(end).multiplyScalar(.5).add(bend);this.segment(this.parts[prefix==='arm'?'arm'+side:'thigh'+side],root,mid);this.segment(this.parts[prefix==='arm'?'fore'+side:'shin'+side],mid,end);}
 athlete(){const g=this.g,id=g.a.id,t=this.presentation?.time??g.worldTime,p=g.p;this.actor.position.set(p.x,p.y,p.z);this.actor.rotation.set(0,g.vertical?0:Math.PI/2,0);
 this.actor.scale.set(1,id==='walls'&&g.wallHeights.some((h,k)=>g.q>=.65+k*2.4&&g.q<1.7+k*2.4)? .72:1,1);
 const moving=this.presentation?.walking||g.state==='run'||(g.state==='transfer'||g.state==='entry')&&Math.abs(g.v)>.1||g.state==='ready'&&g.a.id==='metal'&&g.v>.1,hang=g.grabbed,swim=g.state==='swim',phase=t*(moving?14:5),bend=Math.sin(phase)*.20;
 if(g.state==='log')this.bodyRoll=g.angle;else if(g.state!=='air'&&g.state!=='entryFlight'&&g.state!=='boardFlight')this.bodyRoll=0;else this.bodyRoll=(this.bodyRoll||0)+Math.atan2(Math.sin(-(this.bodyRoll||0)),Math.cos(-(this.bodyRoll||0)))*.12;
 this.actor.rotation.z=swim?-Math.PI/2:this.bodyRoll;
 if(id==='metal'&&g.state==='spin')this.actor.rotation.y=Math.PI/2+g.angle;
 if(id==='metal'&&g.state==='air')this.actor.rotation.y=Math.atan2(g.v,g.vz);
 for(let j=0;j<2;j++){const side=j?'R':'L',s=j?1:-1;let hand=V(s*.27,hang?BODY:1.0+bend*s,.10),foot=V(s*.15,.05,moving?Math.sin(phase+j*Math.PI)*.42:0);
 const flight=['approach','air','entryFlight','boardFlight','barTransfer'].includes(g.state);
 if(flight){const u=g.approach&&g.state==='approach'?g.approach.time/g.approach.duration:1,reach=Math.min(1,u*2);hand=V(s*.36,1.0+.9*reach,.18);foot=V(s*.16,.06+Math.sin(u*Math.PI)*.20,.08);}
 if(id==='spider'&&hang){hand=V(s*.62,1.5,.14);foot=V(s*.62,.12,.05);}
 if(id==='swing'&&hang){hand=V(s*.50,1.9,Math.sin(phase+j*Math.PI)*.14);foot=V(s*.14,.2,.1);}
 if(id==='unstable'&&hang)hand=V(s*.75*Math.cos(g.tilt),1.9+s*.75*Math.sin(g.tilt),0);
 if(id==='walls'){hand=g.q>=g.a.length-.75?V(s*.12,.92,.35):V(s*.27,1.6,.26);foot=V(s*.2,.05,.1);}
 if(id==='climb'&&hang){hand=V(s*.35,1.45+Math.sin(phase+j*Math.PI)*.14,-.42);foot=V(s*.30,.25+(j===(g.hand||0)%2?.25:0),-.18);}
 if(id==='rope'&&hang){hand=V(s*.08,1.8+Math.sin(phase+j*Math.PI)*.12,-.2);foot=V(s*.10,g.footlock>0?.48:.08,-.2);}
 if(id.startsWith('salmon')&&hang){const crouch=g.state==='ladder'?(g.salmonCharge||0)*.28:Math.max(0,.2-g.barV*.025);hand=V(s*.55,1.9,0);foot=V(s*.16,.05+crouch,.08+crouch);}
 if(id==='log'&&hang){hand=V(s*.55,1.15,-.48);foot=V(s*.52,.25,-.28);}
 if(swim){const stroke=g.stroke+j*Math.PI;hand=V(s*(.30+.12*Math.max(0,Math.sin(stroke))),1.12+.72*Math.cos(stroke),.15+.45*Math.sin(stroke));foot=V(s*.14,.05,.06+.13*Math.sin(g.stroke*2+j*Math.PI));}
 this.limb('arm',side,V(s*.25,1.18,0),hand,V(s*.13,swim?.05:-.08,swim?.22:.12));this.limb('leg',side,V(s*.13,.62,0),foot,V(0,0,swim?.03:.17));this.hands[j].position.copy(hand);this.feet[j].position.copy(foot);
 }
 if(id==='log'&&hang){const basis=new THREE.Matrix4().makeBasis(V(0,1,0),V(0,0,1),V(1,0,0)),baseQ=new THREE.Quaternion().setFromRotationMatrix(basis),roll=new THREE.Quaternion().setFromAxisAngle(V(0,0,1),g.angle);this.actor.quaternion.copy(roll).multiply(baseQ);const offset=V(LOG.bodyRadius,0,-.8).applyQuaternion(roll);this.actor.position.set(p.x+offset.x,LOG.centerY-g.q*LOG.slope+offset.y,offset.z);}
 if(swim){
 // Local Y (feet-to-head) points along the course, local X spans the lane, local Z points up.
 const basis=new THREE.Matrix4().makeBasis(V(0,0,1),V(1,0,0),V(0,1,0));this.actor.quaternion.setFromRotationMatrix(basis);this.actor.position.set(p.x-.85,p.y,p.z);
 }
 if(g.status==='failed'){this.actor.rotation.z=Math.min(1.4,(this.failT||0));this.actor.position.y=Math.max(.02,this.actor.position.y-Math.min(12,(this.failT||0)**2*1.8));}
 }
 frame(dt){const g=this.g;this.failT=g.status==='failed'?(this.failT||0)+dt:0;this.athlete();
 for(const o of this.dynamic){const active=o.a.index===g.area,at=active?g.q:0;
 if(o.kind==='log'){o.group.position.set(o.a.start+at,LOG.centerY-at*LOG.slope,0);o.group.rotation.z=active?g.angle:0;}
 if(o.kind==='swing'){const angle=Math.sin(g.worldTime*2)*.075;o.group.position.x=o.a.start+Math.sin(angle)*1.5;o.group.position.y=5.6+(1-Math.cos(angle))*1.5;o.group.position.z=Math.sin(g.worldTime*1.5)*.09;}
 if(o.kind==='bar'){o.mesh.visible=active;if(active&&g.state==='barTransfer'){o.mesh.position.x=g.p.x;o.mesh.position.y=g.p.y+1.9;}else{o.mesh.position.x=o.a.start+o.a.length/2+SALMON.offset;o.mesh.position.y=active?(o.a.id==='salmonDown'?SALMON.top:SALMON.base)+g.bar:o.a.id==='salmonDown'?SALMON.top:SALMON.base;}o.mesh.rotation.x=Math.PI/2+(active?g.tilt:0);}
 if(o.kind==='barFinal'){o.mesh.visible=g.area>=o.a.index;o.mesh.position.y=1.8+(g.area>1?15.5:g.area===1?8.5+g.bar:8.5);o.mesh.rotation.set(0,0,Math.PI/2+(active?g.tilt:0));}
 if(o.kind==='wall')o.mesh.position.y=2.65+(active?g.wallHeights[o.k]:0);
 if(o.kind==='boardChain'){const b=BOARDS[o.k],u=active&&g.board===o.k?g.tilt:0,top=V(o.a.start+b.x+o.dx,6,o.z),end=V(o.a.start+b.x+o.dx,b.y-o.z*Math.sin(u),o.z*Math.cos(u)),d=end.clone().sub(top);o.mesh.position.copy(top).add(end).multiplyScalar(.5);o.mesh.scale.y=d.length()/2;o.mesh.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());}
 if(o.kind==='board'){o.group.rotation.x=active&&g.board===o.k?g.tilt:0;}
 if(o.kind==='metal')o.group.rotation.y=active?g.angle:METAL.startAngle;
 if(o.kind==='slat')o.mesh.position.x=o.a.start+((o.offset-g.worldTime*3.2)%o.a.length+o.a.length)%o.a.length;
 }
 for(const water of this.waters){const b=water.geometry.attributes.position;for(let k=0;k<b.count;k++)b.setZ(k,Math.sin(b.getX(k)*1.8+g.worldTime*1.8)*.018+Math.cos(b.getY(k)*3+g.worldTime)*.012);b.needsUpdate=true;}
 if(!this.headless){const rect=this.canvas.getBoundingClientRect();if(rect.width>0&&rect.height>0&&(rect.width!==this.w||rect.height!==this.h)){this.w=rect.width;this.h=rect.height;this.renderer.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix();}}
 const p=this.actor.position,target=this.mode===2?(g.vertical?V(0,15.5,0):V(g.course.at(-1).end/2,3,0)):p.clone().add(V(g.vertical?0:1.8,1.3,0));this.focus.lerp(target,Math.min(1,dt*7));
 const dist=(this.mode===2?(g.vertical?Math.max(48,21/this.camera.aspect):g.course.at(-1).end*.85):Math.max(7,5.5/this.camera.aspect))*this.zoom,yaw=(this.mode===1?0:this.yaw);this.camera.position.copy(this.focus).add(V(Math.sin(yaw)*dist,dist*this.pitch+2,Math.cos(yaw)*dist));this.camera.lookAt(this.focus);this.key.position.copy(p).add(V(5,14,9));this.key.target.position.copy(p);
 if(g.vertical){updateFinalLights(this,this.presentation);if(this.presentation){const shot=this.presentation;this.actor.position.set(...shot.actor);this.actor.rotation.y=shot.actorYaw;const position=V(...shot.position);if(this.camera.aspect<1&&shot.shot==='reveal')position.z*=Math.min(2.5,1/this.camera.aspect);this.camera.position.copy(position);this.focus.set(...shot.target);this.camera.lookAt(this.focus);if(this.camera.fov!==shot.fov){this.camera.fov=shot.fov;this.camera.updateProjectionMatrix();}}else if(this.camera.fov!==46){this.camera.fov=46;this.camera.updateProjectionMatrix();}}
 if(this.renderer){for(const update of this.waterUpdates||[])update(g.worldTime);this.renderer.render(this.scene,this.camera);}
 }
}

