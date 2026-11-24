// PointerEvent.clientX/Y and DOMRect both use viewport CSS pixels.
// Read current transformed bounds on every press; never use canvas pixels or cached dimensions.
export function controlAtPoint(x,y,targets){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 let chosen=null,best=Infinity;
 for(const {id,rect:r}of targets){
  if(![r.left,r.top,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0)continue;
  const margin=Math.min(12,Math.min(r.width,r.height)*.14),rx=r.width/2+margin,ry=r.height/2+margin;
  const distance=((x-r.left-r.width/2)/rx)**2+((y-r.top-r.height/2)/ry)**2;
  if(distance<=1&&distance<best){chosen=id;best=distance;}
 }
 return chosen;
}
