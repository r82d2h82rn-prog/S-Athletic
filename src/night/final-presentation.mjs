export const FINAL_INTRO_SECONDS=54;
export const FINAL_COUNTDOWN_SECONDS=3;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*ease(t));
export function finalPresentationFrame(elapsed){
 const t=Math.max(0,elapsed),countdown=t>=FINAL_INTRO_SECONDS,done=t>=FINAL_INTRO_SECONDS+FINAL_COUNTDOWN_SECONDS;
 const actorZ=t<8?22:t<16?22-(t-8)*1.1:t<20?13.2:Math.max(0,13.2*(1-ease((t-20)/4)));
 let position,target,fov=46,shot,caption='FINAL STAGE';
 if(t<8){shot='aisle';position=mix([0,3,30],[0,3.1,28.5],t/8);target=[0,12.5,0];fov=64;caption='光の道。その先に、最後の頂。';}
 else if(t<10){shot='entrance';position=[1.2,3.6,actorZ+3.4];target=[0,2.7,actorZ-1];fov=50;caption='THE FINAL CHALLENGE';}
 else if(t<16){shot='walk';position=[8,3.1,actorZ+1.8];target=[0,2.8,actorZ];fov=39;caption='全てを、この一度に。';}
 else if(t<20){shot='athlete';position=[1.5,3.5,actorZ-3.6];target=[0,2.85,actorZ];fov=38;caption='FINAL STAGE';}
 else if(t<24){shot='approach';position=mix([13,10,25],[10,9,20],(t-20)/4);target=[0,4,8];caption='25.5mの頂へ';}
 else if(t<30){shot='reveal';position=mix([0,14,49],[0,14,43],(t-24)/6);target=[0,15,0];caption='FINAL STAGE / 45 SECONDS';}
 else if(t<34){shot='climb';position=mix([8,10,15],[7.4,9.5,14],(t-30)/4);target=[0,6.1,-.35];fov=40;caption='① スピードクライミング  8.5m';}
 else if(t<38){shot='ladder';position=mix([7.2,16.5,12.5],[6.6,16,11.8],(t-34)/4);target=[0,13.8,0];fov=40;caption='② サーモンラダー  15段・7m';}
 else if(t<40){shot='rope';position=mix([8.5,25,16],[8,24.5,15],(t-38)/2);target=[0,22.3,-.2];fov=40;caption='③ 綱登り  10m';}
 else if(t<44){shot='goal';position=mix([2.9,30.5,3.6],[2.2,29.8,2.9],(t-40)/4);target=[0,27.3,.2];fov=52;caption='GOAL / 完全制覇';}
 else if(t<54){shot='descent';const u=(t-44)/10;position=mix([8,34,12],[2.596,6.36,6.502],u);target=mix([0,19,0],[0,3.1,0],u);caption='その手で、頂をつかめ。';}
 else{shot=done?'go':'countdown';position=[2.596,6.36,6.502];target=[0,3.1,0];caption='';}
 return {time:Math.min(t,57),phase:done?'done':countdown?'countdown':'intro',shot,caption,position,target,fov,actor:[0,1.8,actorZ],walking:(t>=8&&t<16)||(t>=20&&t<24),actorYaw:t<24?Math.PI:0,aisle:clamp((t-.4)/3.2),tower:clamp((t-1.8)/4.2),warm:clamp((t-24)/2),count:countdown&&!done?Math.ceil(57-t):null};
}
export class FinalPresentation{
 constructor(){this.active=false;this.elapsed=0;this.paused=false;}
 start(){this.active=true;this.elapsed=0;this.paused=false;return this.frame;}
 get frame(){return finalPresentationFrame(this.elapsed);}
 advance(dt){if(!this.active||this.paused)return false;this.elapsed=Math.min(57,Math.round((this.elapsed+Math.max(0,dt))*1e9)/1e9);if(this.elapsed>=57){this.active=false;return true;}return false;}
 skip(){if(this.active&&this.elapsed<FINAL_INTRO_SECONDS)this.elapsed=FINAL_INTRO_SECONDS;}
 stop(){this.active=false;this.elapsed=0;this.paused=false;}
}
