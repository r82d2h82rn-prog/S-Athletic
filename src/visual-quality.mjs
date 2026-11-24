import * as THREE from '../vendor/three/three.module.min.js';
const profiles={performance:{label:'軽量',ratio:1.25,shadow:0},high:{label:'高画質',ratio:1.75,shadow:1024},ultra:{label:'最高画質',ratio:2.5,shadow:2048}};
export function qualityName(){try{return profiles[localStorage.getItem('s-athletic-quality')]?localStorage.getItem('s-athletic-quality'):'high';}catch{return 'high';}}
export function pixelRatio(){return Math.min(globalThis.devicePixelRatio||1,profiles[qualityName()].ratio);}
function grain(){const data=new Uint8Array(128*128*4);let seed=71;for(let i=0;i<data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=150+(seed%90);data.set([v,v,v,255],i);}const t=new THREE.DataTexture(data,128,128);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
export function enhanceScene({renderer,scene,key,night=false}){
 if(!renderer||typeof document==='undefined')return;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=night?1.1:1;
 const profile=profiles[qualityName()];renderer.setPixelRatio(pixelRatio());renderer.shadowMap.enabled=!!profile.shadow;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 if(key){key.castShadow=!!profile.shadow;key.shadow.mapSize.set(profile.shadow||512,profile.shadow||512);key.shadow.normalBias=.035;key.shadow.bias=-.00015;key.shadow.camera.near=.2;key.shadow.camera.far=100;key.shadow.camera.updateProjectionMatrix();}
 // A locally generated reflection environment keeps metal and water readable offline.
 const studio=new THREE.Scene();studio.background=new THREE.Color(night?'#283449':'#b9d9ec');
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:night?'#101622':'#576452'}));floor.rotation.x=-Math.PI/2;floor.position.y=-8;studio.add(floor);
 for(const [x,y,z]of [[0,12,0],[10,6,6],[-12,5,-8]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshBasicMaterial({color:new THREE.Color(night?3:2,night?3.2:2,night?4:2)}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);}
 const generator=new THREE.PMREMGenerator(renderer);const env=generator.fromScene(studio,.08,.1,100);scene.environment=env.texture;scene.environmentIntensity=night?.6:.8;generator.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const micro=grain(),seen=new Set();scene.traverse(o=>{if(!o.isMesh)return;for(const mat of Array.isArray(o.material)?o.material:[o.material]){if(!mat?.isMeshStandardMaterial||seen.has(mat))continue;seen.add(mat);mat.envMapIntensity=mat.transparent?1.2:.7;if(!mat.bumpMap&&o.geometry.getAttribute('uv')&&!mat.transparent){mat.bumpMap=micro;mat.bumpScale=mat.metalness>.5?.012:.025;mat.needsUpdate=true;}}});
 const label=document.createElement('label');label.style.cssText='position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:35;background:#0a1529d9;border:1px solid #76859a88;border-radius:7px;padding:4px 7px;color:#edf5ff;font:11px system-ui;display:flex;gap:5px;align-items:center';label.append('画質');
 const select=document.createElement('select');select.setAttribute('aria-label','描画品質');select.style.cssText='font:inherit;background:#142338;color:white;border:0;border-radius:4px;padding:3px';for(const [value,p]of Object.entries(profiles)){const option=new Option(p.label,value);select.add(option);}select.value=qualityName();select.onchange=()=>{try{localStorage.setItem('s-athletic-quality',select.value);}catch{}location.reload();};label.append(select);document.body.append(label);
}
export function animatedWater(mesh){
 const material=new THREE.MeshPhysicalMaterial({color:'#338caa',roughness:.17,metalness:.22,transparent:true,opacity:.86,depthWrite:false,clearcoat:1,clearcoatRoughness:.12});
 const clock={value:0};material.onBeforeCompile=shader=>{shader.uniforms.waterTime=clock;shader.vertexShader='uniform float waterTime;\nvarying vec3 waterPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPosition=position;');shader.fragmentShader='uniform float waterTime;\nvarying vec3 waterPosition;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(waterPosition.x*5.0+waterTime)*.075,cos(waterPosition.y*7.0-waterTime*1.3)*.065,0.0));');};mesh.material=material;mesh.receiveShadow=true;return time=>clock.value=time;
}
