// A second forward press within 280 ms starts a dash while that press is held.
export class ForwardDash {
 constructor(){this.reset();}
 reset(){this.active=new Set();this.lastDown=-Infinity;this.lastUp=-Infinity;this.running=false;}
 down(source,now){if(this.active.has(source))return;
 if(this.active.size===0){this.running=now-this.lastDown<=280&&this.lastUp>=this.lastDown;this.lastDown=now;}
 this.active.add(source);
 }
 up(source,now){if(!this.active.delete(source))return;if(this.active.size===0){this.running=false;this.lastUp=now;if(now-this.lastDown>280)this.lastDown=-Infinity;}}
 cancel(source){if(!this.active.delete(source))return;this.reset();}
}
