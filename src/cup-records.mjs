export const CUP_RECORDS_KEY='nathletic-cup-top10-v1';
export const STAGE_NAMES=Object.freeze({first:'1st STAGE',second:'2nd STAGE',third:'3rd STAGE',final:'FINAL STAGE'});
const order=['first','second','third','final'];
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Math.max(0,Number(n)):fallback;
export function compareCupRecords(a,b){return Number(b.complete)-Number(a.complete)||(a.complete?b.remaining-a.remaining:order.indexOf(b.stage)-order.indexOf(a.stage)||(b.area??-1)-(a.area??-1)||b.progress-a.progress)||a.finishedAt-b.finishedAt||a.id.localeCompare(b.id);}
export function normalizeCupRecord(r){
 if(!r||typeof r.id!=='string'||!r.id||!order.includes(r.stage))return null;
 return {id:r.id.slice(0,160),complete:r.complete===true,stage:r.stage,area:Number.isInteger(r.area)&&r.area>=0?r.area:null,areaName:typeof r.areaName==='string'?r.areaName.slice(0,100):'エリア記録なし',progress:Math.min(1,finite(r.progress)),time:finite(r.time),remaining:Math.min(45,finite(r.remaining)),finishedAt:finite(r.finishedAt)};
}
export function readCupRecords(storage){try{const list=JSON.parse(storage?.getItem(CUP_RECORDS_KEY)||'[]');return Array.isArray(list)?list.map(normalizeCupRecord).filter(Boolean).sort(compareCupRecords).slice(0,10):[];}catch{return [];}}
export function cupRecordFromRun(run,details={}){
 if(!run||!['complete','failed'].includes(run.status))return false;
 const last=run.results?.at(-1),info={...(run.checkpoint||{}),...details},time=finite(last?.time??info.time),complete=run.status==='complete';
 const record=normalizeCupRecord({id:run.id,complete,stage:run.stage,area:info.area,areaName:info.areaName||'エリア記録なし',progress:info.progress,time,remaining:complete?(Number.isFinite(info.remaining)?info.remaining:45-time):0,finishedAt:run.finishedAt||Date.now()});
 return record;
}
export function rememberCupRecord(storage,run,details={}){
 const record=cupRecordFromRun(run,details);if(!record)return false;
 const records=readCupRecords(storage);if(records.some(r=>r.id===record.id))return true;
 try{storage?.setItem(CUP_RECORDS_KEY,JSON.stringify([...records,record].sort(compareCupRecords).slice(0,10)));return !!storage;}catch{return false;}
}
export function cupRecordText(r){return r.complete?`完全制覇 / 残り ${r.remaining.toFixed(2)} 秒`:`${STAGE_NAMES[r.stage]} / ${r.areaName||'エリア記録なし'}`;}
export function renderCupRecords(doc,records){
 const list=doc.getElementById('cupRecords');if(!list)return;list.replaceChildren();
 for(let k=0;k<10;k++){
 const row=doc.createElement('li'),rank=doc.createElement('b'),copy=doc.createElement('div'),title=doc.createElement('strong'),detail=doc.createElement('small'),r=records[k];
 rank.className='cup-rank';rank.textContent=String(k+1).padStart(2,'0');title.textContent=r?cupRecordText(r):'—';
 detail.textContent=r?new Date(r.finishedAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):k===0?'挑戦を終えると記録されます':'記録待ち';
 if(r?.complete)row.className='conquered';if(!r)row.className='record-empty';copy.append(title,detail);row.append(rank,copy);list.append(row);
 }
}
