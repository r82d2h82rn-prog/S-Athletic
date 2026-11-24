import * as THREE from '../vendor/three/three.module.min.js';
import {enhanceScene,pixelRatio,animatedWater} from './visual-quality.mjs';
import {SCREW,screwPose,screwPoint} from './screw-motion.mjs';
import {platforms,grips,position,orbitVertices,rotors,rotorArms,presses,gliders,gliderPoint,netRoute,transitions,WALL,FINISH,AREAS} from './course.mjs';
const TAU=Math.PI*2;
const colors={navy:'#172d3b',steel:'#728b96',light:'#bbccd0',red:'#fa523e',cream:'#f5eee0',yellow:'#fac94c',blue:'#226d8b',water:'#3495af',skin:'#d9a482',dark:'#163b4a',green:'#87a486'};
const rgb=c=>{c=colors[c]||c;return c.startsWith('#')?[parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255]:c;};
export class Geometry{
 constructor(){this.v=[];}
 tri(a,b,c,color){const u=b.map((v,i)=>v-a[i]),w=c.map((v,i)=>v-a[i]);let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n)||1;n=n.map(x=>x/l);const co=rgb(color);for(const p of[a,b,c])this.v.push(...p,...n,...co);}
 quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 box(x,y,z,w,h,d,color,angle=0){const cs=Math.cos(angle),sn=Math.sin(angle);const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>[x+a*w/2*cs-b*h/2*sn,y+a*w/2*sn+b*h/2*cs,z+c*d/2]);for(const f of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])this.quad(...f.map(i=>pts[i]),color);}
 cylinder(a,b,r,color,segments=10,r2=r){const axis=b.map((x,i)=>x-a[i]),len=Math.hypot(...axis)||1,n=axis.map(x=>x/len),ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0];let u=[n[1]*ref[2]-n[2]*ref[1],n[2]*ref[0]-n[0]*ref[2],n[0]*ref[1]-n[1]*ref[0]],l=Math.hypot(...u);u=u.map(x=>x/l);const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];for(let i=0;i<segments;i++){const p=(o,t,rr)=>o.map((x,k)=>x+rr*(u[k]*Math.cos(t)+v[k]*Math.sin(t)));const t=i/segments*TAU,s=(i+1)/segments*TAU;this.quad(p(a,t,r),p(a,s,r),p(b,s,r2),p(b,t,r2),color);this.tri(a,p(a,s,r),p(a,t,r),color);this.tri(b,p(b,t,r2),p(b,s,r2),color);}}
 sphere(x,y,z,r,color){const co=rgb(color),point=(a,b)=>[x+r*Math.sin(a)*Math.cos(b),y+r*Math.cos(a),z+r*Math.sin(a)*Math.sin(b)];for(let j=0;j<10;j++)for(let k=0;k<16;k++){const a=point(j*Math.PI/10,k*TAU/16),b=point(j*Math.PI/10,(k+1)*TAU/16),c=point((j+1)*Math.PI/10,(k+1)*TAU/16),d=point((j+1)*Math.PI/10,k*TAU/16);for(const q of[a,b,c,a,c,d])this.v.push(...q,(q[0]-x)/r,(q[1]-y)/r,(q[2]-z)/r,...co);}}

}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function lookAt(eye,at){const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);const z=norm(eye.map((v,i)=>v-at[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function multiply(a,b){let out=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
export class Renderer{
 constructor(canvas,labels,game,{headless=false}={}){this.canvas=canvas;this.labels=labels;this.ctx=labels.getContext('2d');this.g=game;this.mode=0;this.yaw=0;this.pitch=0;this.zoom=1;this.eye=[-4,7,11];this.target=[5,2,0];this.ready=false;
 this.renderer=headless?null:new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b8d6e7');this.scene.fog=new THREE.Fog('#b8d6e7',65,260);this.camera=new THREE.PerspectiveCamera(44.7,1,.15,440);this.materials=new Map();
 this.scene.add(new THREE.HemisphereLight('#c4e2ff','#4c5138',2));this.key=new THREE.DirectionalLight('#fff3db',3.2);this.key.position.set(0,22,12);Object.assign(this.key.shadow.camera,{left:-19,right:19,top:19,bottom:-19});this.scene.add(this.key,this.key.target);const fill=new THREE.DirectionalLight('#a1c7ee',.6);fill.position.set(-15,8,-20);this.scene.add(fill);
 this.chunks=[];this.glass=[];this.staticWorld();this.dynamicMesh=new THREE.Group();this.scene.add(this.dynamicMesh);this.ready=true;
 const water=new THREE.Mesh(new THREE.PlaneGeometry(AREAS.at(-1).end+8,14.7,128,12));water.rotation.x=-Math.PI/2;water.position.set((AREAS.at(-1).end+8)/2-4,-.075,0);this.scene.add(water);this.updateWater=animatedWater(water);
 enhanceScene({renderer:this.renderer,scene:this.scene,key:this.key});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.g.status=this.g.status==='playing'?'paused':this.g.status;});canvas.addEventListener('webglcontextrestored',()=>location.reload());
 }
 material(r,g,b){const key=[r,g,b].join(',');if(!this.materials.has(key)){const color=new THREE.Color().setRGB(r,g,b,THREE.SRGBColorSpace),metal=Math.abs(r-g)<.16&&r>.35&&r<.85;const mat=new THREE.MeshStandardMaterial({color,roughness:metal?.32:.78,metalness:metal?.72:0,side:THREE.DoubleSide});
 mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 surfacePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsurfacePosition=position;');shader.fragmentShader='varying vec3 surfacePosition;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+sin(surfacePosition.x*180.0)*sin(surfacePosition.z*180.0)*.06,.1,1.0);');};this.materials.set(key,mat);}return this.materials.get(key);}
 upload(g,parent=this.scene){const dynamic=parent===this.dynamicMesh,group=dynamic?parent:new THREE.Group(),batches=new Map();for(let i=0;i<g.v.length;i+=27){const key=g.v.slice(i+6,i+9).join(',');if(!batches.has(key))batches.set(key,{v:[],n:[],c:g.v.slice(i+6,i+9)});const b=batches.get(key);for(let j=0;j<3;j++){const offset=i+j*9;b.v.push(...g.v.slice(offset,offset+3));b.n.push(...g.v.slice(offset+3,offset+6));}}this.dynamicBatches??=new Map();if(dynamic)for(const mesh of this.dynamicBatches.values())mesh.visible=false;for(const [key,b]of batches){let mesh=dynamic?this.dynamicBatches.get(key):null;if(!mesh){mesh=new THREE.Mesh(new THREE.BufferGeometry(),this.material(...b.c));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);if(dynamic)this.dynamicBatches.set(key,mesh);}const geo=mesh.geometry;for(const [name,data]of[['position',b.v],['normal',b.n]]){const old=geo.getAttribute(name);if(old&&old.array.length>=data.length){old.array.set(data);old.needsUpdate=true;}else geo.setAttribute(name,new THREE.Float32BufferAttribute(data,3));}geo.setDrawRange(0,b.v.length/3);geo.computeBoundingSphere();mesh.visible=true;}if(!dynamic)parent.add(group);return{mesh:group};}
 addChunk(g,x=110,global=false){this.chunks.push({...this.upload(g),x,global});}
 beam(g,a,b,r=.05,c='steel'){g.cylinder(a,b,r,c,12);}
 truss(g,x,y,z,w=0,h=6,depth=0){const b=(a,c)=>this.beam(g,a,c,.045,'steel');if(w){for(const dy of[-.16,.16])b([x,y+dy,z],[x+w,y+dy,z]);for(let a=0;a<w;a+=.5)b([x+a,y-.16,z],[x+Math.min(w,a+.5),y+.16,z]);}else if(depth){for(const dy of[-.16,.16])b([x,y+dy,z],[x,y+dy,z+depth]);for(let a=0;a<depth;a+=.5)b([x,y-.16,z+a],[x,y+.16,z+Math.min(depth,a+.5)]);}else{for(const dx of[-.16,.16])b([x+dx,0,z],[x+dx,h,z]);for(let a=0;a<h;a+=.5){b([x-.16,a,z],[x+.16,Math.min(h,a+.5),z]);b([x+.16,a,z],[x-.16,Math.min(h,a+.5),z]);}}}
 platform(g,p,support=true){const {x,y,z,w,d}=p;
 if(p.ramp){const a=x-w/2,b=x+w/2,top=y+p.rise;g.quad([a,y,-d/2],[b,top,-d/2],[b,top,d/2],[a,y,d/2],'blue');for(const zz of[-d/2,d/2])g.tri([a,y,zz],[b,y,zz],[b,top,zz],'red');for(let i=0;i<10;i++){const q=i/10,xx=a+w*q,yy=y+p.rise*q;g.box(xx,yy+.015,0,.035,.02,d*.85,'cream');}return;}

 if(p.motion==='orbit'){
 const v=orbitVertices(p,this.g.worldTime);for(let i=0;i<4;i++){const a=v[i],b=v[(i+1)%4];g.quad([a.x,a.y,z-d/2],[b.x,b.y,z-d/2],[b.x,b.y,z+d/2],[a.x,a.y,z+d/2],i%2?'red':'navy');}
 for(const zz of[-d/2,d/2]){g.quad(...v.map(q=>[q.x,q.y,zz]),'blue');for(let i=0;i<4;i++)this.beam(g,[v[i].x,v[i].y,zz],[v[(i+1)%4].x,v[(i+1)%4].y,zz],.055,'cream');}
 return;
 }
 g.box(x,y-.22,z,w,.40,d,p.spring?'yellow':'red',p.tilt||0);g.box(x,y-.01,z,w+.015,.055,d+.025,p.rest?'navy':'blue',p.tilt||0);
 if(p.spring){for(const zz of[-.8,.8]){for(let k=0;k<8;k++)this.beam(g,[x-.48+k*.12,y-.48,zz],[x-.42+k*.12,y-.2,zz],.035,'steel');}for(let i=0;i<3;i++)g.box(x-.3+i*.3,y+.03,z,.12,.025,1.4,'red');}
 if(p.motion==='collapse'){g.box(x,y+.025,z,.10,.025,d,'yellow',p.tilt||0);for(const zz of[-d*.45,d*.45])g.sphere(x,y-.2,z+zz,.06,'steel');}
 if(p.rest){g.box(x-w/2+.08,y+.025,z,.09,.02,d,'cream');g.box(x+w/2-.08,y+.025,z,.09,.02,d,'cream');for(let k=0;k<3;k++)g.box(x-.6+k*.3,y+.03,z,.13,.018,.75,'yellow',-.24);}
 if(support&&p.motion!=='collapse'){for(const xx of[-w*.35,w*.35])for(const zz of[-d*.35,d*.35])this.beam(g,[x+xx,0,z+zz],[x+xx,y-.4,z+zz],.075,'steel');}
 }
 staticWorld(){const g=new Geometry(),poolWidth=AREAS.at(-1).end+8,poolCenter=poolWidth/2-4;g.box(110,-.75,0,272,1,98,'green');g.box(poolCenter,-.22,0,poolWidth,.25,14.8,'water');for(const z of[-7.6,7.6]){g.box(poolCenter,-.04,z,poolWidth+1,.45,.4,'cream');g.box(poolCenter,-.05,z+Math.sign(z)*1.1,poolWidth+7,.2,1.7,'cream');}
 for(let i=0;i<80;i++){const x=i*3-6;g.box(x,-.07,Math.sin(i*7)*5,1.1+(i%4)*.2,.035,.045,'#62b3c2');}
 for(let i=0;i<30;i++){const x=i*9-10,z=i%2?-35:36,h=3+(i%7);g.cylinder([x,-.3,z],[x,h-1,z],.28,'#62533f',12);for(let k=0;k<5;k++)g.sphere(x+Math.cos(k*2.4)*1.7,h-1+(k%3)*.7,z+Math.sin(k*2.4)*1.7,1.8,['#547657','#6c895f','#81996c'][k%3]);}
 this.addChunk(g,110,true);
 for(const link of transitions){const deck=new Geometry();this.platform(deck,link);const left=link.x-link.w/2,right=link.x+link.w/2;for(const z of[-link.d/2,link.d/2]){for(let x=left;x<=right;x+=.9)this.beam(deck,[x,link.y,z],[x,link.y+.65,z],.035,'cream');this.beam(deck,[left,link.y+.65,z],[right,link.y+.65,z],.04,'cream');}this.addChunk(deck,link.x);}

 for(let k=0;k<AREAS.length;k++){
 const a=AREAS[k],part=new Geometry(),mid=(a.start+a.end)/2;
 for(const p of platforms)if(p.x>=a.start&&p.x<a.end&&!p.motion&&!p.transition&&!(p.rest&&p.id.startsWith('rest')))this.platform(part,p);
 // A separate structural portal for each obstacle, with striped end caps.
 for(const xx of[a.start+1,a.end-1]){for(const z of[-3.2,3.2])this.truss(part,xx,0,z,0,a.type==='net'||a.type==='glider'?10:a.type==='warped'?8.5:7.5);this.truss(part,xx,a.type==='net'||a.type==='glider'?10:a.type==='warped'?8.5:7.5,-3.2,0,0,6.4);}
 for(const z of[-3.2,3.2])this.truss(part,a.start+1,a.type==='net'||a.type==='glider'?10:a.type==='warped'?8.5:7.5,z,a.end-a.start-2);
 part.box(a.start+1,7.5,0,.32,.55,4,'navy');
 for(const z of[-3.45,3.45]){part.box(mid,.8,z,a.end-a.start-2,1.1,.16,'navy');for(let i=0;i<4;i++)part.box(mid-2+i*1.25,.8,z,.5,.8,.17,i%2?'cream':'red');}
 for(const n of grips.filter(n=>n.stage===k)){
 if(n.kind==='swing'){this.beam(part,[n.x,n.y,-3.2],[n.x,n.y,3.2],.11,'navy');part.cylinder([n.x,n.y-.12,0],[n.x,n.y+.12,0],.22,'yellow',10);}
 if(n.kind==='net'){
 // Parallel to travel (XY plane); the approach collider remains in physics.mjs.
 const strips=26,rows=10,height=n.top-n.bottom;
 for(let i=0;i<=strips;i++){const q=netRoute(n,i/strips);this.beam(part,[q.x,q.y,0],[q.x,q.y-height,0],.023,'cream');}
 for(let row=0;row<=rows;row++)for(let i=0;i<strips;i++){const a=netRoute(n,i/strips),b=netRoute(n,(i+1)/strips);this.beam(part,[a.x,a.y-height*row/rows,0],[b.x,b.y-height*row/rows,0],.023,row===0?'yellow':'cream');}
 for(const t of[0,1]){const q=netRoute(n,t);this.beam(part,[q.x,q.y,0],[q.x,10,0],.04,'steel');}
 }
 if(n.kind==='glider'){
 for(const z of[-.55,.55]){for(let i=0;i<64;i++){const a=gliderPoint(n,n.length*i/64),b=gliderPoint(n,n.length*(i+1)/64);this.beam(part,[a.x,a.y,z],[b.x,b.y,z],.06,'steel');}for(let d=0;d<=n.length;d+=1.2){const q=gliderPoint(n,d);this.beam(part,[q.x,q.y,z],[q.x,9.3,z],.028,'steel');}}
 for(const d of[0,n.length]){const q=gliderPoint(n,d);part.box(q.x,q.y+.04,0,.12,.22,1.35,'red');}
 }
 if(n.kind==='ledge'){
 // Broad concave running face, stone side cheeks and a red top cap.
 const half=WALL.width/2,floor=WALL.base-.7,back=WALL.lipX+.55;
 const curve=q=>[WALL.start+WALL.radius*Math.sin(q),WALL.base+WALL.height*(1-Math.cos(q))];
 for(let j=0;j<64;j++){const aa=curve(j/64*Math.PI/2),bb=curve((j+1)/64*Math.PI/2);part.quad([aa[0],aa[1],-half],[bb[0],bb[1],-half],[bb[0],bb[1],half],[aa[0],aa[1],half],'#22292e');
 for(const z of[-half,half]){part.quad([aa[0],floor,z],[bb[0],floor,z],[bb[0],bb[1],z],[aa[0],aa[1],z],'#727779');this.beam(part,[aa[0],aa[1]+.025,z],[bb[0],bb[1]+.025,z],.055,j>54?'red':'light');}}
 const surface=x=>x>=WALL.lipX?WALL.lipY:WALL.base+WALL.height*(1-Math.sqrt(Math.max(0,1-((x-WALL.start)/WALL.radius)**2)));
 for(const side of[-1,1]){const z=side*(half+.015);part.quad([WALL.lipX,floor,z],[back,floor,z],[back,WALL.lipY,z],[WALL.lipX,WALL.lipY,z],'#727779');
 for(let row=0,y=floor+.035;y<WALL.lipY-.05;row++,y+=.36)for(let col=0,x=WALL.start-(row%2)*.33;x<back;col++,x+=.66){const left=Math.max(WALL.start,x+.025),right=Math.min(back,x+.63),top=Math.min(y+.31,surface(left)-.035);if(right<=left||top<=y+.02)continue;const face=side*(half+.04),shade=['#a5a6a2','#929793','#b2b2aa','#8a908e'][(row*7+col*3)%4];part.quad([left,y,face],[right,y,face],[right,top,face],[left,top,face],shade);}}
 part.box(WALL.lipX+.19,WALL.lipY-.05,0,.4,.18,WALL.width+.22,'red');
 part.box(back,WALL.base+WALL.height/2,0,.15,WALL.height,WALL.width,'#687276');
 this.beam(part,[n.x,n.y,-1.75],[n.x,n.y,1.75],.09,'cream');part.box(FINISH,WALL.lipY+.25,0,.6,.5,.6,'navy');part.cylinder([FINISH,WALL.lipY+.5,0],[FINISH,WALL.lipY+.62,0],.25,'red',16);
 }
 }
 if(a.type==='rotors')for(const n of rotors){for(const z of[-2.25,2.25])this.beam(part,[n.x,0,z],[n.x,n.y,z],.11,'steel');}
 if(a.type==='orbit')for(const n of platforms.filter(p=>p.motion==='orbit'))for(const z of[-1.35,1.35])this.beam(part,[n.x,0,z],[n.x,n.y,z],.12,'steel');
 if(a.type==='press'){const track=platforms.find(p=>p.id==='pressTrack'),left=track.x-track.w/2,right=track.x+track.w/2;for(const z of[-1.45,1.45]){this.beam(part,[left,1.84,z],[right,1.84,z],.07,'steel');for(let x=left;x<right;x+=.3)part.box(x,1.88,z,.12,.025,.18,'yellow');}}
 if(a.type==='screw'){
 const c=SCREW,axis=[Math.sin(c.tilt),Math.cos(c.tilt),0],base=[c.x-axis[0]*4.5,c.y-axis[1]*4.5,0];
 part.box(base[0],.4,0,2.1,.8,2.3,'navy');for(let j=0;j<6;j++)part.box(base[0]-.85+j*.33,.83,0,.16,.05,2.1,j%2?'yellow':'navy');
 this.beam(part,base,[c.x+axis[0]*1.1,c.y+axis[1]*1.1,0],.24,'steel');
 part.cylinder([c.x-axis[0]*.45,c.y-axis[1]*.45,0],[c.x+axis[0]*.45,c.y+axis[1]*.45,0],.42,'red',18);
 part.box(135.8,2.2,-.7,.4,.8,.5,'navy');part.cylinder([135.8,2.6,-.7],[135.8,2.7,-.7],.16,'red',16);
 }
 if(a.type==='warped'){const apron=platforms.find(p=>p.wallSafety);for(const z of[-apron.d/2,apron.d/2]){this.beam(part,[apron.x-apron.w/2,apron.y+.7,z],[apron.x+apron.w/2,apron.y+.7,z],.04,'cream');for(let x=apron.x-apron.w/2;x<=apron.x+apron.w/2;x+=1)this.beam(part,[x,apron.y,z],[x,apron.y+.7,z],.04,'cream');}}


 this.addChunk(part,mid);
 }
 // Grandstands, hundreds of spectators, production compound, LED screens.
 for(let section=0;section<12;section++){
 const crowd=new Geometry(),x0=section*19;
 for(const sign of[-1,1]){
 for(let row=0;row<4;row++){
 const z=sign*(11+row*.9),y=.1+row*.65;crowd.box(x0+9,y,z,18,.50,1.15,row%2?'#b9c4bc':'#b0bdb6');
 for(let col=0;col<17;col++){if((col+row*7+section*5)%11===0)continue;const x=x0+col*1.04+.5,h=.50+((col*3+row)%4)*.05;const shirts=['#df795d','#e9d7ae','#366e80','#546473','#f5ede0','#aa8c68'];crowd.box(x,y+.38,z,.35,h,.28,shirts[(col+row*2+section)%shirts.length]);crowd.sphere(x,y+.78,z,.15,(col+section)%3?'skin':'#aa7859');crowd.box(x,y+.1,z-.1*sign,.31,.18,.46,'navy');}
 }
 for(const x of[x0,x0+18]){this.truss(crowd,x,0,sign*16,0,10);crowd.box(x,9.7,sign*16,1.5,.65,.4,'navy');for(let j=0;j<3;j++)crowd.box(x-.5+j*.5,9.7,sign*15.76,.32,.35,.05,'cream');}
 crowd.box(x0+9,4,sign*15.4,18,.3,3.3,'navy');
 }
 if(section%3===1){const z=-8.6,x=x0+10;crowd.box(x,6.1,z,8,4.25,.4,'navy');crowd.box(x,6.1,z+.23,7.55,3.8,.05,'#183d4c');for(let q=0;q<6;q++)crowd.box(x-2.6+q*1.1,6.1,z+.27,.55,2.4,.025,q%2?'red':'cream');for(const xx of[-2.5,2.5])this.beam(crowd,[x+xx,0,z],[x+xx,4,z],.13,'steel');}
 if(section===2||section===7){crowd.box(x0+4,.9,21,9,1.8,3.5,'cream');crowd.box(x0+4,2.1,21,9.8,.25,4.2,'red');for(let j=0;j<5;j++)crowd.box(x0+j*1.8+.3,1.1,19.22,1.1,.9,.03,'navy');}
 this.addChunk(crowd,x0+9);
 }
 }
 athlete(g){const p=this.g.p,hang=this.g.hang,t=this.g.worldTime,ground=this.g.state==='ground',moving=Math.hypot(p.vx,p.vz),phase=t*(moving>5?14:10),f=ground?Math.sin(phase)*Math.min(.55,moving*.15):hang?.n.kind==='net'?Math.sin(t*7)*.35:.3;let root=[p.x,p.y,p.z],dir=Math.atan2(p.vz,p.vx||.01);if(hang)dir=0;
 const world=([x,y,z])=>[root[0]+x*Math.cos(dir)-z*Math.sin(dir),root[1]+y,root[2]+x*Math.sin(dir)+z*Math.cos(dir)],bone=(a,b,r,c)=>g.cylinder(world(a),world(b),r,c,16);
 const lean=ground?Math.min(.18,moving*.023):hang?.n.kind==='glider'?Math.sin(hang.angle)*.30:hang?.n.kind==='net'&&hang.netT>0?.12:0;
 bone([lean,.78,0],[lean*2,1.31,0],.19,'cream');g.box(p.x+lean, p.y+1.1,p.z,.14,.13,.39,'red');g.sphere(...world([lean*2,1.54,0]),.17,'skin');g.sphere(...world([lean*2-.025,1.64,0]),.135,'navy');
 for(const s of[-1,1]){const hip=[lean,.82,s*.13],knee=[Math.sin(f*s)*.35,.43,s*.14],foot=[Math.sin(f*s)*.66,.10,s*.15];if(!ground){knee[0]=s*.13+(hang?.n.kind==='net'?f*s:.0);knee[1]=.53;foot[0]=s*.22+(hang?.n.kind==='net'?f*s:.0);foot[1]=.24;}
 bone(hip,knee,.10,'navy');bone(knee,foot,.072,'skin');const shoe=world([foot[0]+.06,foot[1]-.025,foot[2]]);g.box(...shoe,.30,.13,.16,'cream');
 const gripTarget=hang?.n.kind==='screw'?screwPoint(this.g.screwElapsed,hang.screwOffset):hang?.n.kind==='glider'?gliderPoint(hang.n,this.g.gliderOffsets[hang.n.id]||0):null;const shoulder=[lean*2,1.24,s*.22],elbow=hang?[.05,1.55,s*.3]:[-f*s*.45,1.03,s*.27],hand=gripTarget?[gripTarget.x-p.x+(hang.n.kind==='screw'?screwPose(this.g.screwElapsed).axis.x*s*.28:0),gripTarget.y-p.y+(hang.n.kind==='screw'?screwPose(this.g.screwElapsed).axis.y*s*.28:0),hang.n.kind==='screw'?gripTarget.z-p.z+screwPose(this.g.screwElapsed).axis.z*s*.28:s*.3]:hang?[.05,1.79,s*.2]:[-f*s*.7,.94,s*.2];bone(shoulder,elbow,.064,'cream');bone(elbow,hand,.055,'skin');g.sphere(...world(hand),.065,'skin');}
 // The athlete's projected shadow helps judge the landing position.
 const surface=platforms.map(n=>position(n,t,this.g.loads)).find(n=>Math.abs(p.x-n.x)<n.w/2&&Math.abs(p.z-n.z)<n.d/2&&n.y<=p.y+.1);if(surface)g.cylinder([p.x,surface.y+.04,p.z],[p.x,surface.y+.047,p.z],.30,'#224554',14);
 }
 dynamic(){const g=new Geometry(),game=this.g,t=game.worldTime;
 for(const base of platforms)if(base.motion&&Math.abs(base.x-game.p.x)<60||base.motion&&this.mode===2)this.platform(g,base.motion==='orbit'?base:position(base,t,game.loads));
 for(const n of grips.filter(n=>n.kind==='swing')){let angle=0;if(game.hang?.n.id===n.id)angle=game.hang.angle;const q=[n.x+n.length*Math.sin(angle),n.y-n.length*Math.cos(angle),0];this.beam(g,[n.x,n.y,0],q,.045,'cream');g.cylinder([q[0],q[1],-.34],[q[0],q[1],.34],.07,'red',9);for(const z of[-.29,.29])g.sphere(q[0],q[1],z,.10,'yellow');}
 const pose=screwPose(game.screwElapsed),center=pose.center,axis=pose.axis,c=SCREW;
 this.beam(g,[c.x,c.y,c.z],[center.x,center.y,center.z],.15,'red');
 const end=offset=>[center.x+axis.x*offset,center.y+axis.y*offset,center.z+axis.z*offset];
 g.cylinder(end(-.8),end(.8),.25,'#e3e5e0',20);
 for(const d of[-.78,.78])g.cylinder(end(d-.065),end(d+.065),.26,'red',20);
 for(const d of[-.42,0,.42])g.cylinder(end(d-.025),end(d+.025),.253,'#68777c',20);
 for(const n of gliders){const q=gliderPoint(n,game.gliderOffsets[n.id]||0);this.beam(g,[q.x,q.y,-.8],[q.x,q.y,.8],.065,'cream');for(const z of[-.55,.55]){g.box(q.x,q.y+.07,z,.27,.17,.20,'red');g.cylinder([q.x-.12,q.y+.18,z],[q.x+.12,q.y+.18,z],.085,'navy',10);}}
 for(const n of rotors){for(const arm of rotorArms(n,t)){this.beam(g,Object.values(arm.a),Object.values(arm.b),.13,'red');g.sphere(arm.b.x,arm.b.y,arm.b.z,.18,'yellow');}g.cylinder([n.x-.22,n.y,0],[n.x+.22,n.y,0],.23,'steel',12);}
 for(const n of presses){const progress=game.pressed[n.id]||0,drop=progress>=n.travel?3.7:0,x=n.x+progress;g.box(x,3.6-drop,0,.75,3.6,4.2,'red');g.box(x-.4,3.6-drop,0,.08,2.8,3.5,'navy');for(let j=0;j<6;j++)g.box(x-.45,2.4+j*.45-drop,0,.03,.13,3.4,'yellow');for(const z of[-1.7,1.7])g.cylinder([x-.4,1.95,z],[x+.4,1.95,z],.16,'steel',10);}

 this.athlete(g);
 if(game.splash){const life=t-game.splash.time;for(let i=0;i<14;i++){const a=i*TAU/14,r=.3+life*2;g.sphere(game.splash.x+Math.cos(a)*r,.2+Math.max(0,1.5-life*3)*Math.sin(i*3),game.splash.z+Math.sin(a)*r,.08,'cream');}}
 this.upload(g,this.dynamicMesh);
 }
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight,dpr=pixelRatio();if(this.width!==w||this.height!==h||this.dpr!==dpr){this.width=w;this.height=h;this.dpr=dpr;this.renderer?.setPixelRatio(dpr);this.renderer?.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix();this.labels.width=Math.round(w*dpr);this.labels.height=Math.round(h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}}
 project(p){const m=this.vp,[x,y,z]=p;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;return{x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w*this.width/2+this.width/2,y:-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*this.height/2+this.height/2};}
 render(dt=1/60){if(this.lost)return;this.resize();const game=this.g,p=game.p,menu=game.status==='menu',overview=this.mode===2;let target,eye;
 if(menu){target=[35,2,0];eye=[19,17,31];}
 else if(overview){target=[AREAS.at(-1).end/2,1,0];eye=[AREAS.at(-1).end/2-10,115,165];}
 else{const wallView=game.stage===11;target=[p.x+2.8,Math.max(wallView?3.2:2,p.y+1.1),p.z*.5];const yaw=this.yaw+(this.mode===1?0:-.38),radius=(this.mode===1?14:11)*this.zoom;eye=[target[0]+Math.sin(yaw)*radius,target[1]+(wallView?2.8:5.7)+this.pitch*5,target[2]+Math.cos(yaw)*radius];}
 const a=1-Math.exp(-dt*7);this.eye=this.eye.map((v,i)=>v+(eye[i]-v)*a);this.target=this.target.map((v,i)=>v+(target[i]-v)*a);if(menu||overview){this.eye=eye;this.target=target;}
 this.camera.position.set(...this.eye);this.camera.lookAt(...this.target);this.camera.updateMatrixWorld();this.vp=new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse).elements;
 for(const c of this.chunks)c.mesh.visible=c.global||overview||Math.abs(c.x-(menu?35:p.x))<68;this.dynamic();this.key.position.set(p.x-8,22,p.z+14);this.key.target.position.set(p.x,0,p.z);this.updateWater(game.worldTime);this.renderer?.render(this.scene,this.camera);
 const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);if(menu)return;
 for(let i=0;i<AREAS.length;i++){const a=AREAS[i];if(!overview&&i!==game.stage&&i!==game.stage+1)continue;const q=this.project([a.start+1,a.type==='warped'?8.8:8,0]);if(!q||q.x<-40||q.x>this.width+40||q.y<70)continue;ctx.font=`700 ${overview?10:12}px system-ui`;ctx.textAlign='center';const text=overview?String(i+1).padStart(2,'0'):`${String(i+1).padStart(2,'0')} / ${a.en}`,w=ctx.measureText(text).width+22;ctx.fillStyle='#172d3beb';ctx.fillRect(q.x-w/2,q.y-13,w,26);ctx.fillStyle='#fff4df';ctx.fillText(text,q.x,q.y+4);}
 }
}

