import * as THREE from 'three';
import {BODY,athletePose,athleteDirection,athleteYaw,athleteTurn} from './motion.mjs';
import {clamp} from './engine.mjs';
import {BURST,burstFins} from './burst.mjs';
import {COURSE,STAGES,FINISH,WORLD_WIDTH} from './course.mjs';
export class Renderer{
 constructor(canvas,game,{renderer=null,headless=false}={}){
 this.c=canvas;this.g=game;this.time=0;this.cameraMode=4;this.orbit={yaw:0,pitch:0,zoom:1};this.headless=headless;this.drag=null;this.courseBuilds=0;
 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#070d19');this.scene.fog=new THREE.FogExp2('#070d19',.012);
 this.camera=new THREE.PerspectiveCamera(48,1,.04,180);this.camera.position.set(4,4,9);this.focus=new THREE.Vector3(2.8,2.2,0);
 this.renderer=renderer;if(!renderer&&!headless){this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;}
 this.geo={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,12),sphere:new THREE.SphereGeometry(1,12,10),torso:new THREE.CylinderGeometry(1,.8,1,10)};
 const material=(color,metalness=.2,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 this.mat={steel:material('#9aa8bc',.8,.3),dark:material('#263249',.6),red:material('#b91c3c',.3),white:material('#d0d5df',.4),skin:material('#dbac87',0,.8),shirt:material('#df3b4b',0,.7),shorts:material('#101c2e',0,.7),cyan:material('#63c4d8',.4),yellow:material('#f5ce2e',.2),glass:new THREE.MeshPhysicalMaterial({color:'#d5f3ff',transparent:true,opacity:.14,roughness:.07,depthWrite:false,side:THREE.DoubleSide}),lamp:new THREE.MeshBasicMaterial({color:'#8eafff'}),target:new THREE.MeshBasicMaterial({color:'#f4d583',transparent:true,opacity:.55,depthWrite:false}),guide:new THREE.MeshBasicMaterial({color:'#b5dcf6',transparent:true,opacity:.4})};
 // Deterministic brushed aluminium grain, made locally; no footage/TV images are copied.
 const grain=new Uint8Array(128*16*4);for(let y=0;y<16;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=185+((x*17+y*53)%37);grain.set([v,v,v,255],i);}const metalMap=new THREE.DataTexture(grain,128,16,THREE.RGBAFormat);metalMap.wrapS=metalMap.wrapT=THREE.RepeatWrapping;metalMap.repeat.set(3,1);metalMap.needsUpdate=true;
 this.mat.brushed=material('#d8dce4',.87,.28);this.mat.brushed.map=metalMap;this.mat.blade=material('#11171b',.62,.31);this.mat.gold=material('#c4ab4e',.85,.26);this.mat.rotorYellow=new THREE.MeshStandardMaterial({color:'#e4ed37',emissive:'#bacb16',emissiveIntensity:.85,metalness:.35,roughness:.32});this.mat.rotorRed=new THREE.MeshStandardMaterial({color:'#da2532',emissive:'#d90c14',emissiveIntensity:.8,metalness:.35,roughness:.32});
 this.scene.add(new THREE.HemisphereLight('#9eb4df','#121d28',1.45));this.key=new THREE.DirectionalLight('#d6e6ff',3);this.key.position.set(4,9,5);this.key.castShadow=true;this.key.shadow.mapSize.set(1024,1024);Object.assign(this.key.shadow.camera,{left:-10,right:10,top:9,bottom:-9});this.key.shadow.bias=-.001;this.scene.add(this.key,this.key.target);this.fill=new THREE.PointLight('#d62e52',30,20,2);this.fill.position.set(3,4,-3);this.scene.add(this.fill);
 this.course=new THREE.Group();this.scene.add(this.course);this.actor=new THREE.Group();this.scene.add(this.actor);this.disposable=[];this.makeAthlete();this.build();this.stage=game.stage;
 this.ripple=new THREE.Mesh(new THREE.RingGeometry(.15,.2,40),new THREE.MeshBasicMaterial({color:'#92d6e8',transparent:true,opacity:0,side:THREE.DoubleSide}));this.ripple.rotation.x=-Math.PI/2;this.ripple.position.y=.02;this.scene.add(this.ripple);this.splashLife=0;
 this.targetRing=new THREE.Mesh(new THREE.TorusGeometry(.19,.008,5,36),this.mat.target);this.scene.add(this.targetRing);this.guide=Array.from({length:18},()=>this.mesh(this.geo.sphere,this.mat.guide,[0,0,0],[.018,.018,.018],this.scene));this.resize();if(!headless)this.bindCamera();
 }
 mesh(geometry,material,p,s,parent=this.course){const m=new THREE.Mesh(geometry,material);m.position.set(...p);m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 box(p,s,mat,parent){return this.mesh(this.geo.box,mat,p,s,parent);}
 beam(a,b,r=.025,mat=this.mat.steel,parent=this.course){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),m=this.mesh(this.geo.cyl,mat,aa.clone().add(bb).multiplyScalar(.5).toArray(),[r,aa.distanceTo(bb),r],parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bb.sub(aa).normalize());return m;}
 pos(x,y,z=0){return[x/100,(390-y)/100,z/100];}
 resize(){const b=this.c.getBoundingClientRect();if(!(b.width>0&&b.height>0))return;const ratio=Math.min(globalThis.devicePixelRatio||1,1.6);if(this.w===b.width&&this.h===b.height&&this.pixelRatio===ratio)return;this.w=b.width;this.h=b.height;this.pixelRatio=ratio;this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix();this.renderer?.setPixelRatio?.(ratio);this.renderer?.setSize(this.w,this.h,false);}
 bindCamera(){this.c.style.touchAction='none';this.c.addEventListener('pointerdown',e=>{this.c.setPointerCapture(e.pointerId);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};});this.c.addEventListener('pointermove',e=>{if(this.drag?.id!==e.pointerId)return;const limit=this.cameraMode===3?Math.PI:1.3;this.orbit.yaw=clamp(this.orbit.yaw+(e.clientX-this.drag.x)*.006,-limit,limit);this.orbit.pitch=clamp(this.orbit.pitch+(e.clientY-this.drag.y)*.005,this.cameraMode===3?-1.3:-.55,this.cameraMode===3?1:.6);this.drag.x=e.clientX;this.drag.y=e.clientY;});const end=()=>this.drag=null;this.c.addEventListener('pointerup',end);this.c.addEventListener('pointercancel',end);this.c.addEventListener('wheel',e=>{e.preventDefault();this.orbit.zoom=clamp(this.orbit.zoom+e.deltaY*.001,.6,1.6);},{passive:false});this.c.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});this.c.addEventListener('webglcontextrestored',()=>this.contextLost=false);}
 cycleCamera(){const order=[0,4,1,2,3];this.cameraMode=order[(order.indexOf(this.cameraMode)+1)%order.length];this.orbit={yaw:0,pitch:0,zoom:1};return['追従カメラ','側面カメラ','セット全景','選手視点（ドラッグで見回す）','近接追従カメラ'][this.cameraMode];}
 rig(){const width=WORLD_WIDTH/100,points=[],seg=(a,b)=>points.push(...a,...b);for(const z of[-2.6,2.6]){for(const y of[4.2,4.65])seg([-.6,y,z],[width,y,z]);for(let x=-.6;x<width;x+=.5){seg([x,4.2,z],[x+.5,4.65,z]);seg([x,4.65,z],[x+.5,4.2,z]);}for(let x=-.6;x<width;x+=3){seg([x,0,z],[x,4.65,z]);seg([x+.25,0,z],[x+.25,4.65,z]);for(let y=0;y<4.6;y+=.45){seg([x,y,z],[x+.25,y+.45,z]);seg([x+.25,y,z],[x,y+.45,z]);}seg([x,4.65,-2.6],[x,4.65,2.6]);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.course.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#6d7d97'})));this.disposable.push(geo);for(let x=0;x<width;x+=3){for(const z of[-2.6,2.6])this.box([x,4.2,z],[.25,.13,.17],this.mat.lamp);}
 }
 build(){this.courseBuilds++;this.obstacles=[];this.rig();const width=WORLD_WIDTH/100;
 const water=new THREE.Mesh(new THREE.PlaneGeometry(width+4,8,100,20),new THREE.MeshPhongMaterial({color:'#0a3447',specular:'#7d9fb3',shininess:75,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;water.position.set(width/2,-.03,0);water.receiveShadow=true;this.course.add(water);this.water=water;
 for(const z of[-3.8,3.8])this.box([width/2,-.1,z],[width+2,.25,.3],this.mat.dark);
 this.platform(-50,160,335,0,'START');for(const n of COURSE){if(n.kind==='deck')this.platform(n.x-(n.landingMargin||0),n.len+2*(n.landingMargin||0),n.y,n.z,'REST',2+2*(n.landingMargin||0)/100);else this.buildObstacle(n);}this.platform(FINISH.x,FINISH.len,FINISH.y,FINISH.z,'FINISH');
 for(const [i,s]of STAGES.entries()){const n=s.anchors[0];this.label(`0${i+1} ${s.en}`,[n.x/100,4.95,-1.3],3,.25);}
 // Instanced distant forest and bank: a single set, never recreated on area changes.
 const trees=new THREE.InstancedMesh(new THREE.ConeGeometry(.6,2.3,5),new THREE.MeshStandardMaterial({color:'#112536'}),100),dummy=new THREE.Object3D();for(let i=0;i<100;i++){dummy.position.set((i%50)*1.1-3,.9,i<50?-6.5:6.5);dummy.scale.set(1,1+Math.sin(i*4)*.25,1);dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);}this.course.add(trees);
 }
 platform(x,len,y,z,label,depth=2){const h=(390-y)/100,w=len/100;this.box([(x+len/2)/100,h-.17,z/100],[w,.32,depth],this.mat.red);this.box([(x+len/2)/100,h,z/100],[w,.035,depth+.05],this.mat.dark);for(const zz of[-.8,.8])this.beam([x/100,h-.35,z/100+zz],[x/100,0,z/100+zz],.05,this.mat.steel);this.label(label,[(x+len/2)/100,h-.17,z/100+1.01],Math.min(w*.9,1.3),.16);}
 label(text,p,w,h,parent=this.course){if(this.headless)return;const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#172437';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e0ebf6';ctx.font='bold 64px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));plane.position.set(...p);parent.add(plane);}
 buildObstacle(n){const root=new THREE.Group();this.course.add(root);const o={root,n};this.obstacles.push(o);const m=this.mat;
 if(n.kind==='bar'){
 for(const z of[-.52,.52]){for(const dx of[-.24,.24])this.beam([dx,1.45,z],[dx,.035,z],.022,m.steel,root);this.box([0,.02,z],[.58,.08,.18],m.red,root);this.box([-.25,.065,z],[.07,.06,.18],m.red,root);this.box([.25,.065,z],[.07,.06,.18],m.red,root);}o.bar=this.beam([0,0,-.68],[0,0,.68],.028,m.white,root);
 }else if(n.kind==='pole'){
 o.suspension=this.beam([0,1.8,0],[0,.8,0],.025,m.steel,root);o.cylinder=new THREE.Group();root.add(o.cylinder);this.mesh(this.geo.cyl,m.white,[0,.05,0],[.21,1.95,.21],o.cylinder);this.mesh(this.geo.sphere,m.white,[0,-.9,0],[.21,.16,.21],o.cylinder);this.mesh(this.geo.cyl,m.red,[0,-1.035,0],[.10,.025,.10],o.cylinder);this.mesh(this.geo.cyl,m.dark,[0,1.06,0],[.11,.1,.11],o.cylinder);for(const z of[-.211,.211])this.box([0,.18,z],[.04,1.5,.012],m.red,o.cylinder);if(n.drop){this.box([0,1.05,0],[.4,.09,.4],m.red,root);this.beam([-.15,1.05,0],[-.15,1.65,0],.018,m.steel,root);}
 }else if(n.kind==='edge'){
 // The X/Y frame faces across the lane (YZ), hinged along Z to swing along X.
 o.pivot=new THREE.Group();o.pivot.position.y=1.1;root.add(o.pivot);
 const arms=n.shape==='X'?[[[0,0,-.43],[0,-1.055,.43]],[[0,0,.43],[0,-1.055,-.43]]]:[[[0,0,-.43],[0,-.5,0]],[[0,0,.43],[0,-.5,0]],[[0,-.5,0],[0,-1.055,0]]];
 o.struts=[];for(const[a,b]of arms){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),strut=this.box(aa.clone().add(bb).multiplyScalar(.5).toArray(),[.045,aa.distanceTo(bb),.055],m.white,o.pivot);strut.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bb.sub(aa).normalize());o.struts.push(strut);}
 o.grips=[];for(const z of n.shape==='X'?[-.43,.43]:[0])o.grips.push(this.box([0,-1.055,z],[.16,.09,.28],m.red,o.pivot));
 this.beam([0,1.1,-.65],[0,1.1,.65],.04,m.steel,root);for(const z of[-.43,.43]){const bearing=this.mesh(this.geo.cyl,m.dark,[0,1.1,z],[.072,.08,.072],root);bearing.rotation.x=Math.PI/2;}
 if(n.acrylic){o.acrylic=this.box([.045,-.65,0],[.012,.9,1.14],m.glass,o.pivot);for(const z of[-.57,.57])this.box([.045,-.65,z],[.025,.91,.018],m.white,o.pivot);this.box([.045,-1.1,0],[.025,.018,1.14],m.white,o.pivot);}
 }else if(n.kind==='cliff'){
 const len=n.len/100;const back=n.local===1?1:-1;this.box([len/2,.35,back*.32],[len+.12,.7,.6],m.steel,root);this.box([len/2,.72,back*.32],[len+.16,.055,.66],m.white,root);for(const x of[.04,len-.04]){this.box([x,.35,back*.015],[.018,.67,.018],m.dark,root);for(const y of[.1,.6])this.mesh(this.geo.sphere,m.dark,[x,y,0],[.022,.022,.016],root);}this.box([len/2,.015,n.local===1?-.015:.015],[len,.06,.03],m.red,root);this.beam([len/2,1.1,0],[len/2,1.55,0],.035,m.steel,root);if(n.motion)this.box([len/2,1.4,0],[.38,.16,.28],m.dark,root);
 }else if(n.kind==='burst'){
 const len=n.len/100;o.board=new THREE.Group();o.board.position.set(0,BURST.radius/100,0);root.add(o.board);o.blades=[];o.bolts=[];o.gripStrips=[];
 // The two axial halves each have three radial fins, staggered by 60 degrees.
 for(const spec of burstFins(n)){
 const fin=new THREE.Group();fin.rotation.x=-spec.angle;fin.userData={...spec};o.board.add(fin);o.blades.push(fin);
 const span=(spec.end-spec.start)/100,mid=(spec.start+spec.end)/200,tip=BURST.radius/100,inner=BURST.coreRadius/100;
 this.box([mid,-(tip+inner)/2,0],[span,tip-inner,.03],m.blade,fin);
 const strip=this.box([mid,-tip,0],[span,.07,.035],m.brushed,fin);strip.userData={...spec};o.gripStrips.push(strip);
 if(spec.half===0&&spec.angle===0)o.gripLip=strip;
 if(n.rotating&&spec.half===1&&Math.abs(Math.atan2(Math.sin(spec.angle-BURST.gripAngle),Math.cos(spec.angle-BURST.gripAngle)))<.001||!n.rotating&&spec.angle===Math.PI)o.oppositeLip=strip;
 for(let xx=spec.start/100+.055;xx<spec.end/100;xx+=.14){const bolt=this.mesh(this.geo.sphere,m.steel,[xx,-tip+.045,.02],[.011,.011,.007],fin);o.bolts.push(bolt);}
 }
 o.rotatingFace=this.beam([0,0,0],[len,0,0],BURST.coreRadius/100,n.rotating?m.yellow:m.red,o.board);
 o.axle=this.beam([-.04,0,0],[len+.04,0,0],.035,m.gold,o.board);
 for(const z of[-.101,.101])this.box([len/2,0,z],[Math.max(.03,len-.05),.018,.014],n.rotating?m.rotorYellow:m.rotorRed,o.board);
 for(const xx of[.015,len/2,len-.015]){const disc=this.mesh(this.geo.cyl,m.dark,[xx,0,0],[.115,.025,.115],o.board);disc.rotation.z=Math.PI/2;}
 for(const xx of[.015,len-.015]){this.beam([xx,1.5,0],[xx,.26,0],.025,m.steel,root);const bearing=this.mesh(this.geo.cyl,m.steel,[xx,.26,0],[.13,.06,.13],root);bearing.rotation.z=Math.PI/2;}
 }else if(n.kind==='pipe'){
 for(const z of[-.52,.52]){this.beam([0,.045,z],[n.len/100,.045,z],.03,m.steel,root);for(let x=0;x<=n.len/100;x+=1.3)this.beam([x,1.5,z],[x,.045,z],.02,m.steel,root);this.box([n.len/100,.05,z],[.04,.14,.12],m.red,root);}o.carriage=new THREE.Group();root.add(o.carriage);this.beam([0,0,-.68],[0,0,.68],.03,m.white,o.carriage);for(const z of[-.52,.52]){const collar=this.mesh(this.geo.cyl,m.dark,[0,0,z],[.065,.09,.065],o.carriage);collar.rotation.x=Math.PI/2;this.box([0,.025,z],[.06,.07,.13],m.red,o.carriage);}
 }
 }
 makeAthlete(){this.parts={};const p=this.parts,m=this.mat,root=this.actor;
 p.head=this.mesh(this.geo.sphere,m.skin,BODY.head,[.105,.125,.1],root);p.hair=this.mesh(this.geo.sphere,m.shorts,[0,-.43,-.195],[.106,.08,.1],root);p.band=this.box([0,-.43,-.095],[.205,.024,.04],m.white,root);
 p.torso=this.mesh(this.geo.torso,m.shirt,[0,-.9,0],[.195,.48,.125],root);p.hip=this.mesh(this.geo.sphere,m.shorts,[0,BODY.hipY,0],[.16,.13,.115],root);
 for(const side of[-1,1]){for(const part of['upperArm','foreArm','thigh','shin'])p[part+side]=this.mesh(this.geo.cyl,m.skin,[0,0,0],[.04,.2,.04],root);
 const hand=new THREE.Group();root.add(hand);this.mesh(this.geo.sphere,m.skin,[0,0,0],[.041,.035,.026],hand);for(let i=0;i<4;i++)this.box([-.026+i*.017,.022,.012],[.012,.047,.014],m.skin,hand);this.box([side*.035,0,.02],[.022,.029,.024],m.skin,hand);p['hand'+side]=hand;
 p['shoe'+side]=this.box([side*.13,-BODY.reach,.06],[.115,.07,.2],m.white,root);
 p['elbow'+side]=this.mesh(this.geo.sphere,m.skin,[0,0,0],[.043,.043,.043],root);p['knee'+side]=this.mesh(this.geo.sphere,m.skin,[0,0,0],[.061,.061,.061],root);
 }
 this.heldBar=new THREE.Group();this.scene.add(this.heldBar);this.beam([-.68,0,0],[.68,0,0],.028,m.white,this.heldBar);
 }
 limb(mesh,a,b,r){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b);mesh.position.copy(aa).add(bb).multiplyScalar(.5);mesh.scale.set(r,aa.distanceTo(bb),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bb.sub(aa).normalize());}
 athlete(){const g=this.g,n=g.node,p=this.parts,dir=athleteDirection(g),yaw=Math.atan2(dir.x,dir.z),pose=athletePose(g);this.currentPose=pose;this.actor.position.set(...this.pos(g.p.x,g.p.y,g.p.z));this.actor.rotation.set(0,0,0);
 const walk=g.state==='stand',traverse=['cliff','burst'].includes(n.kind);this.bodyYaw=athleteYaw(g,pose,dir);
 this.actor.rotation.y=this.bodyYaw;if(!walk){const forwardDot=Math.sin(this.bodyYaw)*dir.x+Math.cos(this.bodyYaw)*dir.z;this.actor.rotateX(-pose.angle*(forwardDot<-.1?-1:1));}if(athleteTurn(g))this.actor.rotateY(athleteTurn(g));
 if(pose.pole>0){this.actor.position.x-=dir.x*.29*pose.pole;this.actor.position.z-=dir.z*.29*pose.pole;}
 if(g.state==='fall'){const t=g.tumble,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-t.x,t.y,-t.z,'ZYX')),center=this.actor.position.clone().add(new THREE.Vector3(0,-1,0)),offset=this.actor.position.clone().sub(center).applyQuaternion(q);this.actor.position.copy(center).add(offset);this.actor.quaternion.premultiply(q);}
 p.torso.position.set(...pose.torso);p.hip.position.set(...pose.hip);p.head.position.set(...pose.head);p.hair.position.set(pose.head[0],pose.head[1]+.05,pose.head[2]-.015);p.band.position.set(pose.head[0],pose.head[1]+.05,pose.head[2]+.085);
 for(const [i,side]of[-1,1].entries()){
 this.limb(p['upperArm'+side],pose.shoulders[i],pose.elbows[i],.043);this.limb(p['foreArm'+side],pose.elbows[i],pose.hands[i],.035);this.limb(p['thigh'+side],pose.hips[i],pose.knees[i],.065);this.limb(p['shin'+side],pose.knees[i],pose.feet[i],.045);
 p['hand'+side].position.set(...pose.hands[i]);p['hand'+side].rotation.set(pose.wrist??(pose.reverse?Math.PI:pose.pinch?Math.PI/2:0),0,0);p['shoe'+side].position.set(...pose.feet[i]);p['elbow'+side].position.set(...pose.elbows[i]);p['knee'+side].position.set(...pose.knees[i]);
 }
 this.heldBar.visible=g.carryingBar;this.heldBar.position.copy(this.actor.position);this.heldBar.rotation.y=yaw;
 const first=this.cameraMode===3;for(const part of['head','hair','band','torso'])p[part].visible=!first;
 }
 splash(){this.splashLife=1.2;this.ripple.position.set(this.g.p.x/100,.02,this.g.p.z/100);}
 trajectory(){const g=this.g,v=g.launchVelocity();for(let i=0;i<this.guide.length;i++){const t=(i+1)*.045,dot=this.guide[i];dot.visible=g.mode==='assist'&&g.state==='hang'&&g.status==='playing';dot.position.set(...this.pos(g.p.x+v.vx*t,g.p.y+v.vy*t+490.5*t*t,g.p.z+v.vz*t));}}
 frame(dt){this.resize();this.time+=dt;const g=this.g;this.stage=g.stage;for(const o of this.obstacles){const n=o.n;let a=g.anchorNode(n);if(n.kind==='edge')a=n;o.root.position.set(...this.pos(a.x,a.y,a.z));if(o.bar)o.bar.visible=n.id===2&&(g.nodeIndex>2||g.nodeIndex===2&&!g.carryingBar);if(o.pivot)o.pivot.rotation.z=g.edgeAngle(n);if(o.board)o.board.rotation.x=g.burstAngle(n);if(o.suspension){const drop=(a.y-n.y)/100;this.limb(o.suspension,[-(a.x-n.x)/100,1.8+drop,-(a.z-n.z)/100],[0,.8,0],.025);}if(o.cylinder)o.cylinder.rotation.y=g.poleAngle(n);if(o.carriage)o.carriage.position.x=(n.id===g.nodeIndex?g.offset/100:0)+(g.impactMotion[n.id]?.x||0)/100;}
 this.athlete();this.trajectory();const b=g.target();this.targetRing.visible=g.status==='playing'&&g.mode==='assist';this.targetRing.position.set(...this.pos(b.x,b.y,b.z));this.targetRing.quaternion.copy(this.camera.quaternion);
 const p=this.water.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*2.5+this.time)*Math.cos(p.getY(i)*2+this.time*.6)*.012);p.needsUpdate=true;
 this.ripple.visible=this.splashLife>0;if(this.splashLife>0){this.splashLife-=dt;const sc=1+(1.2-this.splashLife)*10;this.ripple.scale.set(sc,sc,1);this.ripple.material.opacity=Math.max(0,this.splashLife*.5);}
 this.camera.up.set(0,1,0);if(this.cameraMode===3){this.actor.updateMatrixWorld(true);const eye=new THREE.Vector3(...this.currentPose.eye).applyMatrix4(this.actor.matrixWorld);this.camera.position.copy(eye);if(g.state==='fall'){const look=new THREE.Vector3(Math.sin(this.orbit.yaw)*Math.cos(this.orbit.pitch),Math.sin(-this.orbit.pitch),Math.cos(this.orbit.yaw)*Math.cos(this.orbit.pitch)).applyQuaternion(this.actor.quaternion);this.camera.up.applyQuaternion(this.actor.quaternion);this.camera.lookAt(eye.clone().add(look));}else{const yaw=this.bodyYaw+this.orbit.yaw+(g.state==='fly'&&g.rotated?Math.PI:0),pitch=clamp(this.orbit.pitch,-1.3,1);this.camera.lookAt(eye.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(-pitch),Math.cos(yaw)*Math.cos(pitch))));}}
 else{const close=this.cameraMode===4;const point=new THREE.Vector3(...this.pos(g.p.x+(close?25:65),g.p.y+(close?95:30),g.p.z));if(g.status==='menu')point.set(3,2.2,0);if(this.cameraMode===2)point.set(WORLD_WIDTH/200,2,0);this.focus.lerp(point,Math.min(1,dt*5));const dist=(this.cameraMode===2?Math.max(WORLD_WIDTH/100*.85,WORLD_WIDTH/100/(2*Math.tan(this.camera.fov*Math.PI/360)*this.camera.aspect))*1.05:close?Math.max(3.2,2.6/this.camera.aspect):Math.max(7,4.5/this.camera.aspect))*this.orbit.zoom;const yaw=(this.cameraMode===1?0:g.node.kind==='burst'&&this.cameraMode!==2?.68:.28)+this.orbit.yaw,pitch=(g.node.kind==='burst'&&this.cameraMode!==2?.28:.15)+this.orbit.pitch;this.camera.position.lerp(this.focus.clone().add(new THREE.Vector3(Math.sin(yaw)*dist,Math.sin(pitch)*dist+(close?.3:1),Math.cos(yaw)*dist)),Math.min(1,dt*5));this.camera.lookAt(this.focus);}
 this.camera.updateMatrixWorld();this.key.position.set(g.p.x/100+3,9,5);this.key.target.position.set(g.p.x/100,1.5,0);this.fill.position.x=g.p.x/100;
 if(this.renderer&&!this.contextLost)this.renderer.render(this.scene,this.camera);
 }
}
