// Effects use ambient Web Audio. Safari with Audio Session support plays the
// uploaded video directly, explicitly using ambient rather than playback mode.
export class GameAudio{
 constructor({host=globalThis.window,nav=globalThis.navigator}={}){this.host=host;this.nav=nav;this.context=null;this.voices=new Set();this.ambient();for(const name of ['pointerdown','touchend','click','keydown'])host?.addEventListener?.(name,()=>this.unlock(),{capture:true});}
 ambient(){try{if(this.nav?.audioSession)this.nav.audioSession.type='ambient';}catch{}}
 getContext(){if(this.context)return this.context;const C=this.host?.AudioContext||this.host?.webkitAudioContext;if(!C)return null;this.ambient();try{this.context=new C();}catch{}return this.context;}
 unlock(){const c=this.getContext();this.ambient();try{c?.resume()?.catch?.(()=>{});if(c&&!this.primed&&c.createBuffer){const primer=c.createBufferSource();primer.buffer=c.createBuffer(1,1,22050);primer.connect(c.destination);primer.onended=()=>primer.disconnect();primer.start(0);this.primed=true;}}catch{}return c;}
 tone(f=440,d=.18,type='sine'){const c=this.getContext();if(!c||c.state!=='running')return;try{const o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(f,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(42,f*.65),c.currentTime+d);v.gain.setValueAtTime(.035,c.currentTime);v.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(v);v.connect(c.destination);o.onended=()=>{o.disconnect();v.disconnect();this.voices.delete(o);};this.voices.add(o);o.start();o.stop(c.currentTime+d+.02);}catch{}}
 effect(kind){const f=({jump:420,catch:680,land:150,area:920,machineStart:730,clear:1250,splash:110,fail:110,spring:850,impact:90,slip:100,pull:520,count:660,go:1050})[kind];if(f)this.tone(f,kind==='clear'?.4:.18,['splash','fail'].includes(kind)?'sawtooth':'sine');}
 stopEffects(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
}
export class FinalIntroMedia{
 constructor(audio,video,{fetcher=globalThis.fetch,url='/src/assets/final-intro.mp4',audioUrl='/src/assets/final-intro-bgm.mp3'}={}){this.audio=audio;this.video=video;this.fetcher=fetcher;this.url=url;this.audioUrl=audioUrl;this.buffer=null;this.ready=false;this.source=null;this.active=false;this.failed=false;this.generation=0;this.native=!!(audio.nav?.audioSession&&video?.canPlayType?.('video/mp4'));this.pending=false;this.lastError='';
 if(video){video.muted=!this.native;video.defaultMuted=!this.native;video.playsInline=true;video.src=url;video.preload='auto';video.addEventListener?.('error',()=>{this.failed=true;this.lastError='MediaError '+(video.error?.code||'');});}}
 get needsRetry(){return this.failed||(this.active&&(this.native?!this.pending&&this.video.paused:this.audio.context?.state!=='running'));}
 get label(){if(this.failed)return this.lastError==='NotAllowedError'?'BGM：再生ボタンをタップしてください':'BGM：再生できませんでした';if(this.pending)return 'BGM：読み込み中';if(this.native&&this.active&&!this.video.paused)return 'BGM：再生中 '+Math.floor(this.video.currentTime||0)+'秒';if(this.source)return 'BGM：再生中';return 'BGM：再生待ち';}
 startFromGesture(time=0){if(!this.native)return null;this.audio.ambient();this.active=true;this.pending=true;this.failed=false;this.lastError='';const generation=++this.generation;try{if(Math.abs((this.video.currentTime||0)-time)>.1)this.video.currentTime=time;}catch{}try{this.video.muted=false;const promise=this.video.play();return Promise.resolve(promise).then(()=>{if(generation!==this.generation)return false;this.pending=false;return true;},error=>{if(generation!==this.generation)return false;this.pending=false;this.failed=true;this.lastError=error?.name||'MediaError';return false;});}catch(error){this.pending=false;this.failed=true;this.lastError=error?.name||'MediaError';return Promise.resolve(false);}}

 prepare(retry=false){if(retry){this.preparing=null;this.failed=false;this.ready=false;}if(this.native){this.ready=true;return Promise.resolve();}if(this.preparing)return this.preparing;const c=this.audio.getContext();if(!c){this.ready=true;return Promise.resolve();}this.preparing=(async()=>{try{const response=await this.fetcher(this.audioUrl,{cache:retry?'reload':'default'});if(!response.ok)throw Error('BGM load failed');this.buffer=await c.decodeAudioData(await response.arrayBuffer());}catch{this.failed=true;}finally{this.ready=true;}})();return this.preparing;}
 stopVoice(){if(this.source){try{this.source.stop();this.source.disconnect();}catch{}this.source=null;}}
 stop(){this.generation++;this.pending=false;this.active=false;this.stopVoice();this.video?.pause?.();}
 sync(time,{paused=false}={}){const video=this.video,c=this.audio.context;if(time>=54){this.stop();if(video&&Number.isFinite(video.duration)){const end=Math.min(54,video.duration);try{if(Math.abs(video.currentTime-end)>.1)video.currentTime=end;}catch{}}return;}
 if(paused){if(this.active)this.generation++;this.pending=false;this.stopVoice();video?.pause?.();this.active=false;return;}
 if(this.native)return;
 if(!this.active){this.active=true;const generation=++this.generation;
 if(video){try{video.currentTime=time;video.play()?.then?.(()=>{if(generation!==this.generation||!this.active)video.pause();}).catch?.(()=>{});}catch{}}}
 if(!this.source&&c?.state==='running'&&this.buffer&&time<this.buffer.duration){try{const source=c.createBufferSource();source.buffer=this.buffer;source.connect(c.destination);source.start(0,time);this.source=source;this.failed=false;}catch{this.failed=true;}}
 }
}
export const gameAudio=new GameAudio();
