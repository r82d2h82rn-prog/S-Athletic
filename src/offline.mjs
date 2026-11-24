export function offlineLabel(data,online=true){if(data?.state==='ready')return online?'オフラインで遊べます':'オフラインでプレイ中';if(data?.state==='saving')return`オフライン用に保存中 ${data.saved} / ${data.total}`;if(data?.state==='error')return'保存できませんでした。接続・空き容量を確認して再試行';return online?'オフラインの準備中…':'未保存です。最初は通信に接続してください';}
if(typeof document!=='undefined'){
 const status=document.getElementById('offlineStatus'),retry=document.getElementById('offlineRetry');let latest=null,registration=null;
 const render=()=>{if(status)status.textContent=offlineLabel(latest,navigator.onLine);if(retry)retry.hidden=!['error','idle'].includes(latest?.state);};
 const prepare=()=>{const worker=registration?.active||registration?.installing;worker?.postMessage({type:'PREPARE_OFFLINE'});};
 if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type!=='OFFLINE_STATUS')return;latest=event.data;render();});navigator.serviceWorker.addEventListener('controllerchange',()=>navigator.serviceWorker.controller?.postMessage({type:'GET_OFFLINE_STATUS'}));
 navigator.serviceWorker.getRegistration('/').then(reg=>reg||navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'})).then(async reg=>{registration=reg;if(navigator.onLine)reg.update().catch(()=>{});await navigator.serviceWorker.ready;registration.active?.postMessage({type:'GET_OFFLINE_STATUS'});prepare();if(reg.waiting&&status)status.textContent='更新版を保存済み。ゲーム終了後に画面を閉じて開き直してください';}).catch(()=>{latest={state:'error'};render();});
 if(retry)retry.onclick=()=>{latest={state:'saving',saved:0,total:'…'};render();registration?.update().catch(()=>{});if(registration?.active)prepare();else navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>registration=reg).catch(()=>{latest={state:'error'};render();});};
 window.addEventListener('online',()=>{render();prepare();registration?.update().catch(()=>{});});window.addEventListener('offline',render);render();
 }else{if(status)status.textContent='このブラウザではオフライン保存を利用できません';if(retry)retry.hidden=true;}
}
