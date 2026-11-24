import {rememberCupStats} from './cup-stats.mjs';
import {rememberCupRecord} from './cup-records.mjs';
export const CUP_ORDER=['first','second','third','final'];
export const CUP_KEY='nathletic-cup-v1';
export class CupRun{
 constructor(storage,recordStorage=storage){this.storage=storage;this.recordStorage=recordStorage;}
 read(){try{const r=JSON.parse(this.storage.getItem(CUP_KEY));return r&&r.version===1&&CUP_ORDER.includes(r.stage)&&['ready','active','between','failed','complete'].includes(r.status)?r:null;}catch{return null;}}
 save(r){this.storage.setItem(CUP_KEY,JSON.stringify(r));return r;}
 remember(r=this.read(),details={}){rememberCupStats(this.recordStorage,r,details);return rememberCupRecord(this.recordStorage,r,details);}
 begin(id){this.remember();return this.save({version:1,id,stage:'first',status:'ready',results:[],reason:''});}
 enter(stage,id){const r=this.read();if(!r||r.id!==id||r.stage!==stage||r.status!=='ready')return false;r.status='active';this.save(r);return true;}
 finish(stage,id,success,time,reason='',details={}){const r=this.read();if(!r||r.id!==id||r.stage!==stage||r.status!=='active')return null;
 r.results.push({stage,success,time:Number(time)||0});r.checkpoint={...(r.checkpoint||{}),...details};r.reason=reason;r.status=success?(stage==='final'?'complete':'between'):'failed';if(['complete','failed'].includes(r.status))r.finishedAt=Date.now();this.save(r);this.remember(r,details);return r;}
 next(id){const r=this.read();if(!r||r.id!==id||r.status!=='between')return null;const next=CUP_ORDER[CUP_ORDER.indexOf(r.stage)+1];if(!next)return null;r.stage=next;r.checkpoint=null;r.status='ready';this.save(r);return this.url(r);}
 restart(id,newId){const r=this.read();if(!r||r.id!==id||r.status!=='failed')return null;return this.url(this.begin(newId));}
 url(r=this.read()){return r?`/${r.stage}/?cup=${encodeURIComponent(r.id)}`:null;}
 checkpoint(stage,id,info){const r=this.read();if(!r||r.id!==id||r.stage!==stage||r.status!=='active')return null;r.checkpoint={...info};return this.save(r);}
 abandon(id,reason='挑戦中にステージを離れました',details={}){const r=this.read();if(r?.id===id&&r.status==='active')return this.finish(r.stage,id,false,details.time??r.checkpoint?.time??0,reason,{...(r.checkpoint||{}),...details});return r;}
}
export function cupContext(stage){const id=new URLSearchParams(location.search).get('cup');if(!id)return null;let cup;try{let records;try{records=localStorage;}catch{records=null;}cup=new CupRun(sessionStorage,records);if(!cup.enter(stage,id)){const r=cup.read();if(r?.id===id&&r.stage===stage&&r.status==='active')cup.abandon(id,'挑戦中にページが再読み込みされました');return{invalid:true};}}catch{return{invalid:true};}
 let latest={},lastCheckpoint='';
 const checkpoint=info=>{latest={...info};const key=info.area+':'+Math.floor(info.time||0);if(key!==lastCheckpoint){lastCheckpoint=key;cup.checkpoint(stage,id,info);}};
 const leave=()=>cup.abandon(id,undefined,latest);window.addEventListener('pagehide',leave);
 return {cup,id,checkpoint,finish:(ok,t,why,details={})=>cup.finish(stage,id,ok,t,why,{...latest,...details}),next:()=>{const url=cup.next(id);if(url)location.assign(url);},restart:()=>{const url=cup.restart(id,crypto.randomUUID());if(url)location.assign(url);},leave};}
export const clearLabel=stage=>stage==='final'?'完全制覇':`${({first:'1st',second:'2nd',third:'3rd'})[stage]}STAGEクリア`;
