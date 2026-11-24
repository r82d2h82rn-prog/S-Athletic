import {AREAS} from './course.mjs';
import {secondCourse} from './night/course.mjs';
import {STAGE_NAMES,readCupRecords,cupRecordFromRun} from './cup-records.mjs';
export const CUP_STATS_KEY='nathletic-cup-area-stats-v1';
const stages=['first','second','third','final'];
// The archived 3rd course is fixed; its labels are checked against the archive in tests.
const thirdNames=['フライングバー','サイドワインダー','スイングエッジ 改','クリフディメンション','バーティカルリミット.BURST','パイプスライダー'];
export const CUP_AREAS=Object.freeze(stages.flatMap(stage=>(stage==='first'?AREAS.map(a=>a.name):stage==='second'?secondCourse().map(a=>a.name):stage==='third'?thirdNames:['FINAL STAGE']).map((name,area)=>Object.freeze({key:stage+':'+area,stage,area,name}))));
const count=stage=>CUP_AREAS.filter(a=>a.stage===stage).length;
function normalize(r,imported=false){if(!r||typeof r.id!=='string'||!r.id||!stages.includes(r.stage))return null;return{id:r.id.slice(0,160),stage:r.stage,complete:r.complete===true&&r.stage==='final',area:r.stage==='final'?0:Number.isInteger(r.area)&&r.area>=0&&r.area<count(r.stage)?r.area:null,imported:imported||r.imported===true};}
function unique(runs){const seen=new Set();return runs.filter(r=>r&&!seen.has(r.id)&&seen.add(r.id));}
export function readCupStats(storage){
 try{if(!storage)return{version:1,runs:[],available:false};const raw=storage.getItem(CUP_STATS_KEY);if(raw!==null){const data=JSON.parse(raw);if(data?.version!==1||!Array.isArray(data.runs))throw Error('Invalid stats');return{version:1,runs:unique(data.runs.map(r=>normalize(r))),available:true};}
 const runs=unique(readCupRecords(storage).map(r=>normalize(r,true))),data={version:1,runs};try{storage.setItem(CUP_STATS_KEY,JSON.stringify(data));return{...data,available:true,migrated:true};}catch{return{...data,available:false};}
 }catch{return{version:1,runs:[],available:false};}
}
export function rememberCupStats(storage,run,details={}){const data=readCupStats(storage),record=cupRecordFromRun(run,details);if(!data.available||!record)return false;const row=normalize(record,data.migrated===true);if(!row)return false;if(data.runs.some(r=>r.id===row.id))return true;try{storage.setItem(CUP_STATS_KEY,JSON.stringify({version:1,runs:[...data.runs,row]}));return true;}catch{return false;}}
export function summarizeCupStats(data){const runs=unique((data?.runs||[]).map(r=>normalize(r))),rows=CUP_AREAS.map(a=>({...a,reached:0,retired:0}));let complete=0,unknown=0;
 for(const r of runs){if(r.complete)complete++;else if(r.area===null)unknown++;const last=stages.indexOf(r.stage);
 for(const row of rows){const stage=stages.indexOf(row.stage);if(stage<last||stage===last&&row.area<=(r.area??0))row.reached++;if(!r.complete&&stage===last&&r.area!==null&&row.area===r.area)row.retired++;}}
 const total=runs.length;for(const row of rows){row.reachRate=total?row.reached/total:null;row.retireRate=row.reached?row.retired/row.reached:null;}
 return{total,complete,retired:total-complete,unknown,imported:runs.filter(r=>r.imported).length,available:data?.available!==false,rows};
}
const percent=value=>value===null?'—':(value*100).toFixed(1)+'%';
export function renderCupStats(doc,data){const root=doc.getElementById('cupAreaStats');if(!root)return;const stats=summarizeCupStats(data),summary=doc.getElementById('cupStatsSummary'),note=doc.getElementById('cupStatsHistoryNote');root.replaceChildren();
 if(summary)summary.textContent=`集計 ${stats.total} 挑戦 ／ 完全制覇 ${stats.complete} 回 ／ リタイア ${stats.retired} 回`;
 if(note)note.textContent=(!stats.available?'このブラウザでは集計データを読み取り・保存できません。保存設定を確認してください。':stats.imported?`導入前の記録は、保存されていた${stats.imported}件のみを取り込んでいます。以後はTOP10に入らない挑戦も集計します。`:'終了したガチSASUKEの挑戦を、TOP10への順位に関係なく集計します。')+(stats.unknown?` エリア不明の${stats.unknown}件は、確認できる到達分のみ反映し、エリア別リタイアには含めていません。`:'');
 for(const stage of stages){const section=doc.createElement('section'),heading=doc.createElement('h3'),wrap=doc.createElement('div'),table=doc.createElement('table'),head=doc.createElement('thead'),tr=doc.createElement('tr'),body=doc.createElement('tbody');section.className='cup-stats-stage';heading.textContent=STAGE_NAMES[stage];wrap.className='cup-stats-table';table.setAttribute('aria-label',STAGE_NAMES[stage]+'のエリア別データ');
 for(const title of ['エリア','到達率','リタイア回数','リタイア率']){const th=doc.createElement('th');th.setAttribute('scope','col');th.textContent=title;tr.append(th);}head.append(tr);
 for(const row of stats.rows.filter(a=>a.stage===stage)){const line=doc.createElement('tr'),name=doc.createElement('th'),reach=doc.createElement('td'),arrivals=doc.createElement('small'),failures=doc.createElement('td'),rate=doc.createElement('td');name.setAttribute('scope','row');name.textContent=stage==='final'?'FINAL（全区間）':String(row.area+1).padStart(2,'0')+' '+row.name;reach.textContent=percent(row.reachRate);arrivals.textContent=row.reached+'回到達';reach.append(arrivals);failures.textContent=row.retired+'回';rate.textContent=percent(row.retireRate);line.append(name,reach,failures,rate);body.append(line);}table.append(head,body);wrap.append(table);section.append(heading,wrap);root.append(section);}
}
