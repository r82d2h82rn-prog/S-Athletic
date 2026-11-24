import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {Game,COURSE,STAGES,clamp} from './src/engine.mjs';import {controlsFor} from './src/controls.mjs';
import {poleAimInput} from './test-support/pole.mjs';
import {controlAtPoint} from './src/hit-targets.mjs';
import {Renderer as Renderer3D} from './src/render.js';
class El{constructor(){this.style={};this.dataset={};this.value='assist';this.className='';this.classList={add(){},remove(){},toggle(){}};this.textContent='';this.events={};}addEventListener(n,f){this.events[n]=f;}set innerHTML(value){this.htmlWrites=(this.htmlWrites||0)+1;this.html=value;}get innerHTML(){return this.html||'';}setAttribute(){}matches(){return false;}querySelector(){return new El();}setPointerCapture(){}getBoundingClientRect(){return{width:1200,height:550};}}
const ids={};for(const s of ['arena','overlay','difficulty','course','jump','turn','help','pause','sound','fullscreen','camera','best','toast','timer','grip','gripFill','hint','hintHeading','areaName','areaEn','modeLabel','stageNum','momentum','momentumFill','momentumLabel','hold','swing','playControls'])ids['#'+s]=new El();
const courses=Array.from({length:6},(_,i)=>{const b=new El();b.dataset.area=i;return b;});
const doc={querySelector:s=>ids[s]||new El(),querySelectorAll:s=>s==='[data-area]'?courses:[],addEventListener(){},documentElement:{requestFullscreen:async()=>{}},hidden:false};
let portrait=false;const windowEvents={};const values={};const ctx={console,poleAimInput,controlAtPoint,Game,COURSE,STAGES,clamp,controlsFor,Renderer:class extends Renderer3D{constructor(c,g){super(c,g,{headless:true});}},document:doc,window:{addEventListener:(k,v)=>windowEvents[k]=v,matchMedia:()=>({matches:portrait})},localStorage:{getItem:k=>values[k],setItem:(k,v)=>values[k]=v},requestAnimationFrame:()=>{},structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/app.js','utf8'),ctx);
assert(ids['#overlay'].innerHTML.includes('通しで挑戦する'));
vm.runInContext('start(3,true);frame(10);input.swing=true;frame(25);help();frame(40);resumeHelp();frame(55);pause();frame(70);pause();frame(85);',ctx);assert(ids['#areaName'].textContent.includes('クリフ'));
ids['#camera'].onclick();assert(ids['#toast'].textContent.includes('カメラ'));
vm.runInContext('g.fail("test");for(let i=0;i<100;i++)frame(100+i*30);',ctx);assert(ids['#overlay'].innerHTML.includes('RETIRED'));
vm.runInContext('help();frame(3300);',ctx);assert(ids['#overlay'].innerHTML.includes('FIELD MANUAL'));
vm.runInContext('resumeHelp();practiceMenu();start(4,true);frame(3400);home();frame(3500);',ctx);assert(ids['#overlay'].innerHTML.includes('通しで挑戦する'));
console.log('PASS 3D app state transitions, pause, help, camera switch, failure, practice, title (headless; no GPU/browser)');

// Recovery must keep the running UI, current input and clock alive in either mode.
for(const practice of [false,true]){
 vm.runInContext(`{start(0,${practice});input.swing=true;g.stamina=50;g.clearArea(0);const before=g.total;frame(last+32);if(showing||paused||!input.swing||g.status!=='playing'||g.total<=before)throw Error('Area clear interrupted the run');}`,ctx);
 assert.equal(ids['#overlay'].className,'overlay hidden');assert(!ids['#toast'].textContent.includes('AREA CLEAR'));
}
console.log('PASS area recovery never opens a clear screen or stops held input, clock or practice continuation');
vm.runInContext("start();g.enter(COURSE.find(n=>n.kind==='deck'&&n.stage===2).id);sync();",ctx);assert(ids['#jump'].innerHTML.includes('挑戦する'));
const pointer={pointerId:7,preventDefault(){}};ids['#hold'].events.pointerdown(pointer);assert(vm.runInContext('input.brace',ctx));ids['#hold'].events.pointerup(pointer);assert(!vm.runInContext('input.brace',ctx));ids['#hold'].events.pointerdown(pointer);ids['#hold'].events.pointercancel(pointer);assert(!vm.runInContext('input.brace',ctx));
ids['#jump'].events.pointerdown({preventDefault(){}});assert(vm.runInContext('input.challenge',ctx));
vm.runInContext('for(let i=0;i<100;i++)frame(last+30);',ctx);assert.equal(vm.runInContext('g.nodeIndex',ctx),COURSE.find(n=>n.kind==='deck'&&n.stage===2).id+1);assert(!ids['#jump'].innerHTML.includes('挑戦する'));
console.log('PASS momentary touch hold and rest-deck challenge button through actual UI handlers');

vm.runInContext('start();',ctx);const pointer1={pointerId:11,preventDefault(){}},pointer2={pointerId:12,preventDefault(){}};
ids['#hold'].events.pointerdown(pointer1);ids['#hold'].events.pointerdown(pointer2);ids['#hold'].events.pointerup(pointer1);assert(vm.runInContext('input.brace',ctx));ids['#hold'].events.lostpointercapture(pointer2);assert(!vm.runInContext('input.brace',ctx));
windowEvents.keydown({code:'KeyC',target:new El(),preventDefault(){}});assert(vm.runInContext('input.brace',ctx));windowEvents.keyup({code:'KeyC'});assert(!vm.runInContext('input.brace',ctx));
portrait=true;const before=vm.runInContext('g.total',ctx);vm.runInContext('for(let i=0;i<100;i++)frame(last+30);',ctx);assert.equal(vm.runInContext('g.total',ctx),before);portrait=false;windowEvents.resize();vm.runInContext('frame(last+30);',ctx);assert(vm.runInContext('g.total',ctx)>before);
console.log('PASS momentary multi-pointer and keyboard hold; portrait freezes game and landscape resumes');

vm.runInContext('start(4,true);sync();',ctx);assert(ids['#jump'].innerHTML.includes('移動'));
ids['#jump'].events.pointerdown(pointer1);vm.runInContext('frame(last+30);',ctx);assert(vm.runInContext('g.offset>0&&input.move',ctx));ids['#jump'].events.pointerup(pointer1);assert(!vm.runInContext('input.move',ctx));
windowEvents.keydown({code:'Space',target:new El(),preventDefault(){}});assert(vm.runInContext('input.move&&!input.jump',ctx));windowEvents.keyup({code:'Space'});assert(!vm.runInContext('input.move',ctx));
console.log('PASS BURST move label and momentary movement from touch and Space without jumping');
vm.runInContext('start(1,true);sync();',ctx);assert(ids['#swing'].innerHTML.includes('横移動'));assert(ids['#jump'].innerHTML.includes('蹴る'));
ids['#hold'].events.pointerdown(pointer1);vm.runInContext('for(let i=0;i<40;i++)frame(last+30);',ctx);assert.equal(vm.runInContext('g.poleTravel',ctx),0);assert(vm.runInContext('g.climb>40',ctx));assert(ids['#hold'].innerHTML.includes('登る'));ids['#hold'].events.pointerup(pointer1);
ids['#swing'].events.pointerdown(pointer1);vm.runInContext('for(let i=0;i<90;i++)frame(last+30);',ctx);ids['#swing'].events.pointerup(pointer1);assert(vm.runInContext('g.poleTravel>=.55&&g.state==="hang"',ctx));
vm.runInContext('for(let i=0;i<1500&&!poleAimInput(g).jump;i++){const a=poleAimInput(g);input.swing=a.swing;input.brace=true;frame(last+8);}clearInput();',ctx);ids['#jump'].events.pointerdown(pointer2);vm.runInContext('frame(last+30);',ctx);assert(vm.runInContext('g.poleKick&&g.state==="hang"',ctx));ids['#hold'].events.pointerdown(pointer1);vm.runInContext('for(let i=0;i<80;i++)frame(last+30);',ctx);ids['#hold'].events.pointerup(pointer1);assert(vm.runInContext('g.nodeIndex===4&&g.status==="playing"',ctx));
vm.runInContext('for(let i=0;i<30;i++)frame(last+30);',ctx);assert.equal(vm.runInContext('g.status',ctx),'playing');
console.log('PASS sidewinder UI: lateral/kick labels, actual touch orbit/kick/catch, and safe Hold release');

// Keep the actual hit target alive while holding; repeated HUD updates cannot replace it.
vm.runInContext('start(1,true);sync();',ctx);
const labels=['#swing','#hold','#jump'],writes=labels.map(id=>ids[id].htmlWrites);
const held={pointerId:81,preventDefault(){}};ids['#hold'].events.pointerdown(held);
vm.runInContext('for(let i=0;i<120;i++)frame(last+8);',ctx);
labels.forEach((id,i)=>assert.equal(ids[id].htmlWrites,writes[i],'unchanged button labels must not replace touch targets'));
assert(vm.runInContext('input.brace',ctx));windowEvents.pointerup(held);assert(!vm.runInContext('input.brace',ctx));
const a={pointerId:82,preventDefault(){}},b={pointerId:83,preventDefault(){}};
ids['#hold'].events.pointerdown(a);ids['#swing'].events.pointerdown(b);windowEvents.pointercancel(a);assert(!vm.runInContext('input.brace',ctx));assert(vm.runInContext('input.swing',ctx));windowEvents.pointerup(b);assert(!vm.runInContext('input.swing',ctx));
vm.runInContext('start(4,true);sync();',ctx);assert(ids['#jump'].innerHTML.includes('移動'));
console.log('PASS stable touch targets across repeated frames, outside-button release and independent multi-touch cancellation');
// The real buttons can complete a pole transfer without ever pressing lateral movement.
vm.runInContext('start(1,true);sync();',ctx);ids['#hold'].events.pointerdown(pointer1);vm.runInContext('for(let i=0;i<40;i++)frame(last+30);',ctx);ids['#hold'].events.pointerup(pointer1);assert.equal(vm.runInContext('g.poleTravel',ctx),0);
vm.runInContext('for(let i=0;i<1500&&(Math.abs(g.poleKickInfo(.32).error)>.01||g.climb<65);i++){input.brace=true;frame(last+8);}clearInput();',ctx);ids['#jump'].events.pointerdown(pointer2);vm.runInContext('frame(last+30);',ctx);assert(vm.runInContext('g.poleKick&&g.state==="hang"',ctx));ids['#hold'].events.pointerdown(pointer1);vm.runInContext('for(let i=0;i<80;i++)frame(last+30);',ctx);ids['#hold'].events.pointerup(pointer1);assert(vm.runInContext('g.nodeIndex===4&&g.status==="playing"',ctx));
console.log('PASS touch-only Sidewinder transfer with climb/kick/catch and zero lateral input');
// Simulate a stale browser target after aspect distortion: current visible bounds win.
const originalRects=['#swing','#hold','#jump'].map(id=>ids[id].getBoundingClientRect);
for(const [sx,sy,ox,oy]of[[1,1,0,0],[.65,1.2,21,15],[1.4,.55,-10,30]]){
 vm.runInContext('start(1,true);sync();',ctx);
 const boxes=[[20,250],[580,250],[700,250]];
 ['#swing','#hold','#jump'].forEach((id,i)=>ids[id].getBoundingClientRect=()=>({left:boxes[i][0]*sx+ox,top:boxes[i][1]*sy+oy,width:92*sx,height:92*sy}));
 const event=(id,pointerId,target=ids['#arena'])=>{const r=ids[id].getBoundingClientRect();return{pointerId,button:0,clientX:r.left+r.width/2,clientY:r.top+r.height/2,target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};};
 const hold=event('#hold',91,ids['#jump']);windowEvents.pointerdown(hold);assert(hold.stopped&&hold.prevented);assert(vm.runInContext('input.brace&&!input.jump&&!input.swing',ctx));
 windowEvents.resize();assert(vm.runInContext('input.brace',ctx),'toolbar/landscape resizing must preserve captured hold');
 const swing=event('#swing',92);windowEvents.pointerdown(swing);assert(vm.runInContext('input.swing&&input.brace',ctx));windowEvents.pointercancel(swing);assert(vm.runInContext('!input.swing&&input.brace',ctx));windowEvents.pointerup(hold);assert(!vm.runInContext('input.brace',ctx));
 const jump=event('#jump',93);windowEvents.pointerdown(jump);assert(vm.runInContext('input.jump',ctx));windowEvents.pointerup(jump);
 vm.runInContext('clearInput();',ctx);const stale={pointerId:94,button:0,clientX:300*sx+ox,clientY:150*sy+oy,target:{closest:()=>true},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};windowEvents.pointerdown(stale);assert(stale.stopped);assert(vm.runInContext('!input.brace&&!input.swing&&!input.jump',ctx));
}
['#swing','#hold','#jump'].forEach((id,i)=>ids[id].getBoundingClientRect=originalRects[i]);
console.log('PASS capture handler corrects stale native targets with distorted live bounds, preserves held input during resize and blocks phantom button hits');
vm.runInContext('start(1,true);g.poleTravel=(Math.PI+g.node.spinRate*.32)/Math.PI;sync();',ctx);assert.equal(ids['#momentum'].textContent,'0°');assert.equal(ids['#momentumFill'].style.background,'#83e6e4');vm.runInContext('g.poleTravel+=.5/Math.PI;sync();',ctx);assert.equal(ids['#momentumFill'].style.background,'#ff627a');assert(ids['#hint'].textContent.includes('±20°'));
console.log('PASS release-angle prediction and matching allowed/blocked HUD feedback');
