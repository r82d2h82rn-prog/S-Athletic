import assert from 'node:assert/strict';
import {controlAtPoint} from './src/hit-targets.mjs';
const originals=[{id:'swing',rect:{left:20,top:250,width:92,height:92}},{id:'hold',rect:{left:580,top:250,width:92,height:92}},{id:'jump',rect:{left:700,top:250,width:92,height:92}}];
// Aspect changes, CSS transforms and viewport offsets all alter DOMRects; DPR does not enter the mapping.
for(const [sx,sy,ox,oy]of[[1,1,0,0],[.5,1,0,0],[1,.5,0,0],[1.3,.65,35,21],[.75,1.5,-15,40],[2,2,0,0]]){
 const targets=originals.map(({id,rect:r})=>({id,rect:{left:r.left*sx+ox,top:r.top*sy+oy,width:r.width*sx,height:r.height*sy}}));
 for(const {id,rect:r}of targets){assert.equal(controlAtPoint(r.left+r.width/2,r.top+r.height/2,targets),id);assert.equal(controlAtPoint(r.left+r.width*.05,r.top+r.height*.5,targets),id);}
 assert.equal(controlAtPoint(ox+300*sx,oy+150*sy,targets),null);
}
assert.equal(controlAtPoint(NaN,0,originals),null);assert.equal(controlAtPoint(0,0,[{id:'hidden',rect:{left:0,top:0,width:0,height:0}}]),null);
assert.equal(controlAtPoint(635,296,[...originals,{id:'nearest',rect:{left:605,top:260,width:60,height:72}}]),'nearest');
console.log('PASS control hits use live CSS bounds across independent X/Y scaling, offsets, hidden controls and overlapping tolerance');
