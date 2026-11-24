// Three physical inputs. This layer chooses the movement axis, never release timing.
export function controlsFor(g,raw={}){
 const k=g.node.kind,swing=!!raw.swing,brace=!!raw.brace,pump=swing?(Math.sign(g.omega)||1):0;
 const traverse=k==='cliff'&&brace&&!swing;
 return {brace,swing,pump:['burst','pole'].includes(k)?0:pump,move:k==='burst'&&!!raw.move,
 right:traverse||k==='pipe'&&brace&&!swing,left:false,
 climb:k==='pole'&&brace,slide:k==='pipe'&&brace&&!swing?1:0,
 jump:k!=='burst'&&!!raw.jump,challenge:!!raw.challenge,
 turn:g.state==='fly'&&k==='cliff'&&g.target().kind==='cliff'&&!g.rotated};
}
