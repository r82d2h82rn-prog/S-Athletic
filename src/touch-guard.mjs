// Limit touch cancellation to pointer-driven controls; click-only actions must keep their click.
const selector='[data-input], #playControls button, [data-action]';
export function installTouchGuard(doc){
 // These gameplay buttons use pointer input rather than synthetic click handlers.
 // Suppress Safari's compatibility double-tap gesture only on those controls.
 for(const button of doc.querySelectorAll(selector)){
  button.addEventListener('touchend',e=>{if(e.cancelable)e.preventDefault();},{passive:false});
  button.addEventListener('dblclick',e=>e.preventDefault());
 }
}
if(typeof document!=='undefined')installTouchGuard(document);
