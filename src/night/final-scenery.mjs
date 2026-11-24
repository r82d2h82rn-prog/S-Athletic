import * as THREE from '../../vendor/three/three.module.min.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function sign(r,text,x,y,z,w,h,{background='#a32036',ink='#ffffff',flat=false}={}){
 let map=null;if(!r.headless){const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,1024,512);ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+(text==='GOAL'?260:145)+'px sans-serif';ctx.fillText(text,512,256,940);map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;}
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,color:map?'#ffffff':background,side:THREE.DoubleSide}));mesh.position.set(x,y,z);if(flat)mesh.rotation.x=-Math.PI/2;r.world.add(mesh);return mesh;
}
function roof(r,x,y,radius){
 for(const z of[-2.2,2.2]){const arc=new THREE.Mesh(new THREE.TorusGeometry(radius,.065,6,36,Math.PI),r.mat('metal','#e63e59'));arc.position.set(x,y,z);r.world.add(arc);}
 for(let k=0;k<=8;k++){const a=k*Math.PI/8;r.rod([x+Math.cos(a)*radius,y+Math.sin(a)*radius,-2.2],[x+Math.cos(a)*radius,y+Math.sin(a)*radius,2.2],.035,'metal','#a9bed8');}
}
function spire(r,x,y,width){
 const half=width/2;for(const dx of[-half,half])for(const z of[-2,2])r.rod([x+dx,0,z],[x+dx,y,z],.075,'metal','#a8bed9');
 for(let h=0;h<y;h+=1.8){const top=Math.min(y,h+1.8);for(const z of[-2,2]){r.rod([x-half,h,z],[x+half,h,z],.045,'metal','#a8bed9');r.rod([x-half,h,z],[x+half,top,z],.035,'metal','#a8bed9');r.rod([x+half,h,z],[x-half,top,z],.035,'metal','#a8bed9');}for(const dx of[-half,half]){r.rod([x+dx,h,-2],[x+dx,top,2],.035,'metal','#a8bed9');r.rod([x+dx,h,2],[x+dx,top,-2],.035,'metal','#a8bed9');}}
 roof(r,x,y,half+.12);
}
export function buildFinalScenery(r){
 r.finalEffects=new THREE.Group();r.world.add(r.finalEffects);
 r.finalBlue=new THREE.DirectionalLight('#3278ff',.9);r.finalBlue.position.set(-9,10,7);r.finalViolet=new THREE.DirectionalLight('#8745ff',0);r.finalViolet.position.set(8,24,-6);r.scene.add(r.finalBlue,r.finalViolet);
 for(const x of[-3.5,3.5])spire(r,x,24,2.4);for(const x of[-5.8,5.8])spire(r,x,17.8,2.2);roof(r,0,27,2.2);
 for(const x of[-2.05,2.05])sign(r,'FINAL',x,22.2,2.32,1.9,2.7,{background:'#e9eef2',ink:'#234979'});
 // Raised red entrance aisle. It meets the existing base without coplanar overlapping surfaces.
 r.box(0,-.18,13,3.5,.30,22,'metal','#17202e');r.box(0,-.015,13,2.9,.03,22,'pad','#c51e42');
 for(const x of[-1.7,1.7])r.box(x,-.01,13,.14,.04,22,'metal','#e3a56f');
 for(const side of[-1,1]){
 const x=side*9;for(const z of[8,16])for(const dx of[-3,3])r.rod([x+dx,0,z],[x+dx,3,z],.065,'metal','#8facc8');
 for(const z of[8,16]){const arc=new THREE.Mesh(new THREE.TorusGeometry(3,.055,5,24,Math.PI),r.mat('metal','#b2c4d6'));arc.position.set(x,3,z);r.world.add(arc);r.rod([x-3,1,z],[x+3,1,z],.065,'metal','#d22e4c');}
 for(const dx of[-3,-1.5,0,1.5,3])r.rod([x+dx,3+Math.sqrt(Math.max(0,9-dx*dx)),8],[x+dx,3+Math.sqrt(Math.max(0,9-dx*dx)),16],.04,'metal','#819eb9');
 for(let row=0;row<3;row++)r.box(x,.15+row*.35,10+row*1.4,5.8,.3,1.1,'metal','#17273e');
 }
 const crowd=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.16,.34,3,5),new THREE.MeshStandardMaterial({color:'#9caeca',roughness:1}),72),dummy=new THREE.Object3D();let n=0;
 for(const side of[-1,1])for(let row=0;row<3;row++)for(let k=0;k<12;k++){dummy.position.set(side*(6.6+k*.43),.9+row*.35,10+row*1.4);dummy.updateMatrix();crowd.setMatrixAt(n,dummy.matrix);crowd.setColorAt(n,new THREE.Color(['#d34660','#6573b1','#dce5ee','#376bba'][n%4]));n++;}r.world.add(crowd);
 // The top is a red goal deck with an open center for the rope.
 const deck=new THREE.Mesh(new THREE.RingGeometry(.72,2.2,40),r.mat('pad','#c11f3c'));deck.rotation.x=-Math.PI/2;deck.position.set(0,25.5,-.2);r.world.add(deck);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.72,.07,6,40),r.mat('metal','#e4e9ee'));rim.rotation.x=Math.PI/2;rim.position.copy(deck.position);r.world.add(rim);
 sign(r,'GOAL',0,25.52,1.15,3.3,.85,{flat:true});sign(r,'FINAL STAGE',0,27.2,2.25,3.5,.65);
 const bulbs=[];for(const x of[-1.82,1.82])for(let k=0;k<27;k++)bulbs.push({position:[x,.7+k*.94,.25],kind:'tower',index:k/26});
 for(const x of[-1.6,1.6])for(let k=0;k<19;k++)bulbs.push({position:[x,.15,23-k*1.15],kind:'aisle',index:k/18});
 const material=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),lights=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,5),material,bulbs.length);lights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);r.finalEffects.add(lights);r.finalBulbs={mesh:lights,items:bulbs,last:''};
 // Soft additive light halos are one draw call; no flickering shadow maps.
 const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const at=(y*32+x)*4,alpha=Math.pow(Math.max(0,1-Math.hypot(x-15.5,y-15.5)/16),3);pixels.set([255,255,255,Math.round(alpha*255)],at);}
 const glowMap=new THREE.DataTexture(pixels,32,32);glowMap.needsUpdate=true;
 const glowGeometry=new THREE.BufferGeometry();glowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bulbs.flatMap(b=>b.position),3));glowGeometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(bulbs.length*3),3));
 r.finalGlow=new THREE.Points(glowGeometry,new THREE.PointsMaterial({map:glowMap,size:1.15,transparent:true,opacity:.85,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));r.finalEffects.add(r.finalGlow);
 r.finalBeams=[];for(const side of[-1,1])for(let k=0;k<6;k++){
 const source=V(side*(4+k*.35),.25,1.5),end=V(side*(1+k*2),13+k*2,3-k),d=end.clone().sub(source),mesh=new THREE.Mesh(new THREE.ConeGeometry(1.1,d.length(),12,1,true),new THREE.MeshBasicMaterial({color:k%2?'#a9d8ff':'#ffffff',transparent:true,opacity:.025,blending:THREE.AdditiveBlending,toneMapped:false,depthWrite:false,side:THREE.DoubleSide}));mesh.position.copy(source).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,-1,0),d.normalize());r.finalEffects.add(mesh);r.finalBeams.push(mesh);
 }
 updateFinalLights(r,null);
}
export function updateFinalLights(r,presentation){
 if(!r.finalBulbs)return;const aisle=presentation?.aisle??1,tower=presentation?.tower??1,warm=presentation?.warm??.6,intro=presentation?.phase==='intro',key=[Math.round(aisle*40),Math.round(tower*40),Math.round(warm*20)].join(':');
 for(const light of r.scene.children){if(light.isHemisphereLight)light.intensity=.12+tower*1.48;else if(light.isAmbientLight)light.intensity=.03+tower*.22;else if(light.isDirectionalLight&&light!==r.key&&light!==r.finalBlue&&light!==r.finalViolet)light.intensity=.04+tower*.56;}
 r.finalBlue.color.set(intro?'#293cff':'#3278ff');r.finalBlue.intensity=intro ? .3+tower*3.5 : 1.1;r.finalViolet.intensity=intro?tower*1.1:0;r.key.intensity=intro ? .15+tower*2+warm*3 : 3;
 r.key.color.set('#d6e6ff').lerp(new THREE.Color('#ffe7ba'),intro?warm:0);r.finalGlow.material.size=intro?1.3:.65;
 for(const beam of r.finalBeams)beam.material.opacity=(intro ? .004+tower*.05 : .028)*(presentation?.shot==='reveal'?1.65:1);
 if(key===r.finalBulbs.last)return;r.finalBulbs.last=key;const o=new THREE.Object3D();
 r.finalBulbs.items.forEach((b,k)=>{const lit=(b.kind==='aisle'?aisle:tower)>=b.index;o.position.set(...b.position);o.scale.setScalar(lit?1:.04);o.updateMatrix();r.finalBulbs.mesh.setMatrixAt(k,o.matrix);const color=new THREE.Color(b.kind==='aisle'?'#f1f7ff':warm>.5?'#ffe6af':'#c7d9ff');r.finalBulbs.mesh.setColorAt(k,color);r.finalGlow.geometry.attributes.color.setXYZ(k,lit?color.r:0,lit?color.g:0,lit?color.b:0);});r.finalGlow.geometry.attributes.color.needsUpdate=true;r.finalBulbs.mesh.instanceMatrix.needsUpdate=true;if(r.finalBulbs.mesh.instanceColor)r.finalBulbs.mesh.instanceColor.needsUpdate=true;
}
