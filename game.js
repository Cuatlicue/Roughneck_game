'use strict';
function SS_RUN(ROOT){
let alive=true;
const W_=()=>ROOT?ROOT.clientWidth:innerWidth,H_=()=>ROOT?ROOT.clientHeight:innerHeight,RR=()=>ROOT?ROOT.getBoundingClientRect():{left:0,top:0};
// ===== Core =====
// Rendering: the game draws into a small low-res buffer (LO) so the pixel art stays chunky,
// then present() scales it up in two steps ("sharp bilinear"): an exact integer nearest-neighbour
// upscale (every art pixel becomes the same size block), then one smooth resize to the screen's
// real device pixels. Glows/lasers/particles go to a separate FX buffer that is blended soft on top.
const C=document.getElementById('game'),D=C.getContext('2d');
const LO=document.createElement('canvas'),MID=document.createElement('canvas'),FXC=document.createElement('canvas');
let X=LO.getContext('2d');const MX=MID.getContext('2d'),FX=FXC.getContext('2d');let dpr=1,kInt=1,maxDpr=3,slowN=0;
const VH=216;let VW=384,cssScale=1,offX=0,offY=0;
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a);
function resize(){
  const w=W_(),h=H_();
  VW=Math.max(320,Math.min(480,Math.round(VH*w/Math.max(1,h))));
  LO.width=FXC.width=VW;LO.height=FXC.height=VH;
  let s=h/VH;if(VW*s>w)s=w/VW;cssScale=s;
  const cw=VW*s,ch=VH*s;offX=(w-cw)/2;offY=(h-ch)/2;
  dpr=Math.min(maxDpr,Math.max(1,window.devicePixelRatio||1));
  C.width=Math.max(1,Math.round(cw*dpr));C.height=Math.max(1,Math.round(ch*dpr));
  kInt=Math.max(1,Math.floor(C.height/VH));MID.width=VW*kInt;MID.height=VH*kInt;
  Object.assign(C.style,{width:cw+'px',height:ch+'px',left:offX+'px',top:offY+'px'});
  X.imageSmoothingEnabled=false;if(typeof sizeActors==='function')try{sizeActors();}catch(e){}
  $('rotate').style.display=(!ROOT&&isTouch&&h>w)?'flex':'none';
}
addEventListener('resize',resize);if(ROOT&&window.ResizeObserver)new ResizeObserver(resize).observe(ROOT);addEventListener('orientationchange',()=>setTimeout(resize,200));
resize();
// v0.6 brighter palette: every flat colour is lifted (more saturation + lightness) through a cached converter
const BRC=new Map();
function BR(c){if(typeof c!=='string'||c[0]!=='#')return c;let v=BRC.get(c);if(v)return v;let h=c.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  let r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let H=0,S=0,Lg=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;S=Lg>0.5?d/(2-mx-mn):d/(mx+mn);H=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;H/=6;}
  S=Math.min(1,S*1.12+0.04);Lg=Lg<0.5?Lg+(0.5-Lg)*0.2+0.03:Lg+(1-Lg)*0.14;
  const q=Lg<0.5?Lg*(1+S):Lg+S-Lg*S,p=2*Lg-q,f=t=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};
  const o=x=>('0'+Math.round(x*255).toString(16)).slice(-2);v=S===0?'#'+o(Lg)+o(Lg)+o(Lg):'#'+o(f(H+1/3))+o(f(H))+o(f(H-1/3));BRC.set(c,v);return v;}
function R(x,y,w,h,c){X.fillStyle=BR(c);X.fillRect(Math.round(x),Math.round(y),w,h);}
// v0.6 character definition: heroes/enemies/bosses are drawn into an actor layer, then get automatic rim light + shading,
// a crisp 1px plum-navy outline, a faint light halo and a soft drop shadow before landing on the frame. Integer offsets only, so pixels stay crisp.
const ACT=document.createElement('canvas'),SIL=document.createElement('canvas'),AX=ACT.getContext('2d'),SX=SIL.getContext('2d'),OUTLINE='#1c0b3a';
function sizeActors(){ACT.width=SIL.width=VW;ACT.height=SIL.height=VH;AX.imageSmoothingEnabled=false;SX.imageSmoothingEnabled=false;}
sizeActors();
function silh(col,src,dx,dy){SX.globalCompositeOperation='source-over';SX.clearRect(0,0,VW,VH);SX.drawImage(ACT,0,0);if(src){SX.globalCompositeOperation='destination-out';SX.drawImage(ACT,dx,dy);}SX.globalCompositeOperation='source-in';SX.fillStyle=col;SX.fillRect(0,0,VW,VH);SX.globalCompositeOperation='source-over';}
function actors(fn,k){k=k||1;const T=X.getTransform();AX.setTransform(1,0,0,1,0,0);AX.clearRect(0,0,VW,VH);AX.setTransform(T);const old=X;X=AX;try{fn();}finally{X=old;}AX.setTransform(1,0,0,1,0,0);
  // inner shading: light from top-left, shade bottom-right
  const edge=(dx,dy,c,a)=>{silh(c,true,dx,dy);AX.globalAlpha=a;AX.drawImage(SIL,0,0);AX.globalAlpha=1;};
  edge(0,k,'#ffffff',0.38);edge(k,0,'#ffffff',0.16);edge(0,-k,'#3a0a5a',0.34);edge(-k,0,'#3a0a5a',0.2);
  X.save();X.setTransform(1,0,0,1,0,0);
  silh('#fff4ff');X.globalAlpha=0.22;for(const d of [[-2,0],[2,0],[0,-2],[0,2]])X.drawImage(SIL,d[0]*k,d[1]*k);
  silh(OUTLINE);X.globalAlpha=0.3;X.drawImage(SIL,k,k*2);X.globalAlpha=1;for(const d of [[-1,0],[1,0],[0,-1],[0,1]])X.drawImage(SIL,d[0]*k,d[1]*k);
  X.drawImage(ACT,0,0);X.restore();}
const ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3),easeBack=t=>{t=t<0?0:t>1?1:t;const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

// ===== Pixel font (3x5) =====
const FD='A010101111101101B110101110101110C011100100100011D110101101101110E111100110100111F111100110100100G011100101101011H101101111101101I111010010010111J001001001101010K101101110101101L100100100100111M101111111101101N110101101101101O010101101101010P110101110100100Q010101101110011R110101110101101S011100010001110T111010010010010U101101101101111V101101101101010W101101111111101X101101010101101Y101101010010010Z1110010101001110111101101101111101011001001011121100010101001113110001010001110410110111100100151111001100011106011100111101111711100101001001081111011111011119111101111001110!010010010000010?110001010000010.000000000000010,000000000010100:000010000010000-000000111000000\'010010000000000/001001010100100>100010001010100<001010100010001+000010111010000(010100100100010)010001001001010=000111000111000%101001010100101$011110010011110';
const FONT={};for(let i=0;i<FD.length;i+=16)FONT[FD[i]]=FD.substr(i+1,15);
function drawT(s,x,y,c,sc){X.fillStyle=BR(c);for(let i=0;i<s.length;i++){const g=FONT[s[i]];if(!g)continue;for(let j=0;j<15;j++)if(g[j]==='1')X.fillRect(x+i*4*sc+(j%3)*sc,y+((j/3)|0)*sc,sc,sc);}}
// v0.5 bubbly font: big text gets a fat rounded outline, a drop shadow, an optional rainbow fill and a glossy top highlight
const RB=['#ff4fb0','#ffd030','#5af078','#30d0ff','#b070ff'];
const HUE=(h,l)=>'hsl('+((((h%360)+360)%360)|0)+',100%,'+(l||67)+'%)';
function txt(s,x,y,c='#fff',sc=1,al=0,sh='#000'){s=String(s).toUpperCase();const w=s.length*4*sc-sc;x=Math.round(al===1?x-w/2:al===2?x-w:x);y=Math.round(y);
  if(sh){if(sc>=2){const o=Math.ceil(sc/2);drawT(s,x+o,y+sc+o,sh,sc);for(const d of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]])drawT(s,x+d[0]*o,y+d[1]*o,sh,sc);}else drawT(s,x+sc,y+sc,sh,sc);}
  let fc=c;if(c==='rainbow'){const g=X.createLinearGradient(0,y,0,y+5*sc);RB.forEach((k,i)=>g.addColorStop(i/4,k));fc=g;}
  drawT(s,x,y,fc,sc);
  if(sc>=2){X.globalAlpha=0.6;X.fillStyle='#fff';for(let i=0;i<s.length;i++){const g=FONT[s[i]];if(!g)continue;for(let j=0;j<3;j++)if(g[j]==='1')X.fillRect(x+i*4*sc+j*sc,y,sc,Math.max(1,sc>>1));}X.globalAlpha=1;}
  return w;}
function sparkle(x,y,s,c){R(x-s,y,s*2+1,1,c);R(x,y-s,1,s*2+1,c);R(x,y,1,1,'#fff');}
function heartC(x,y,c){R(x,y,2,1,c);R(x+3,y,2,1,c);R(x-1,y+1,7,2,c);R(x,y+3,5,1,c);R(x+1,y+4,3,1,c);R(x+2,y+5,1,1,c);R(x,y+1,1,1,'#fff');}
function heart(x,y,full){if(typeof drawTaco==='function'&&!heart.raw){drawTaco(x-2,y,'T1',st,true,full);return;}const c=full?'#ff3a9a':'#5a2a7a';R(x,y,2,1,c);R(x+3,y,2,1,c);R(x-1,y+1,7,2,c);R(x,y+3,5,1,c);R(x+1,y+4,3,1,c);R(x+2,y+5,1,1,c);if(full)R(x,y+1,1,1,'#ffe0f0');}

// ===== Audio =====
const A={ctx:null,master:null,muted:false,nb:null,cur:null,mus:null};
function audioInit(){
  if(A.ctx){if(A.ctx.state==='suspended')A.ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{A.ctx=new AC();}catch(e){return;}
  A.master=A.ctx.createGain();A.master.gain.value=A.muted?0:0.55;A.master.connect(A.ctx.destination);
  const n=A.ctx.sampleRate*0.5|0;A.nb=A.ctx.createBuffer(1,n,A.ctx.sampleRate);const d=A.nb.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  // iOS unlock blip
  const o=A.ctx.createOscillator(),g=A.ctx.createGain();g.gain.value=0.0001;o.connect(g);g.connect(A.master);o.start();o.stop(A.ctx.currentTime+0.01);
  if(A.cur)music(A.cur,true);
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function osc(f,d,type,v,t,f2){const c=A.ctx;if(!c)return;v*=V9V;t=t||c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0008,t+d);o.connect(g);g.connect(A.master);o.start(t);o.stop(t+d+0.02);}
function noise(d,v,t,hp){const c=A.ctx;if(!c)return;v*=V9V;t=t||c.currentTime;const s=c.createBufferSource();s.buffer=A.nb;const g=c.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0008,t+d);let nd=s;if(hp){const fl=c.createBiquadFilter();fl.type='highpass';fl.frequency.value=hp;s.connect(fl);nd=fl;}nd.connect(g);g.connect(A.master);s.start(t);s.stop(t+d+0.02);}
let lastShot=0;
function sfx(n){if(!A.ctx)return;const t=A.ctx.currentTime;switch(n){
  case'shot':if(t-lastShot<0.05)return;lastShot=t;osc(1180,0.07,'triangle',0.06,t,1760);osc(1760,0.05,'sine',0.025,t+0.02,2400);break;
  case'laser':osc(1400,0.12,'triangle',0.05,t,2100);osc(700,0.1,'sine',0.03,t,1400);break;
  case'heavy':osc(330,0.14,'triangle',0.08,t,660);osc(165,0.12,'sine',0.06,t,90);noise(0.05,0.03,t,5000);break;
  case'jump':osc(260,0.14,'square',0.06,t,640);break;
  case'hit':osc(180,0.06,'square',0.07,t,90);break;
  case'pop':noise(0.18,0.16,t,400);osc(500,0.12,'triangle',0.08,t,120);break;
  case'boom':noise(0.6,0.3,t);osc(120,0.5,'sawtooth',0.12,t,30);break;
  case'hurt':osc(520,0.35,'sawtooth',0.1,t,70);break;
  case'ping':osc(1800,0.05,'triangle',0.05,t);break;
  case'pickup':[72,76,79,84].forEach((m,i)=>osc(mtof(m),0.09,'square',0.06,t+i*0.06));break;
  case'fall':osc(900,0.9,'square',0.06,t,90);break;
  case'throw':osc(400,0.1,'triangle',0.06,t,700);break;
  case'blob':osc(160,0.12,'sine',0.1,t,60);break;
  case'select':osc(660,0.06,'square',0.06,t);osc(990,0.08,'square',0.06,t+0.06);break;
  case'win':[60,64,67,72,67,72,76,79].forEach((m,i)=>osc(mtof(m),0.16,'square',0.07,t+i*0.12));break;
  case'coin':osc(1320,0.05,'square',0.04,t);osc(1760,0.08,'square',0.04,t+0.04);break;
  case'gem':osc(1568,0.05,'triangle',0.06,t);osc(2093,0.07,'triangle',0.05,t+0.04);osc(2637,0.1,'sine',0.04,t+0.08);break;
  case'gem2':[84,88,91,96].forEach((m,i)=>osc(mtof(m),0.08,'triangle',0.06,t+i*0.045));noise(0.05,0.03,t,6000);break;
  case'gem3':[79,84,88,91,96,100].forEach((m,i)=>osc(mtof(m),0.1,'triangle',0.07,t+i*0.05));noise(0.12,0.05,t,5000);break;
  case'nom':noise(0.05,0.14,t,2500);noise(0.05,0.12,t+0.07,3000);osc(330,0.06,'square',0.05,t+0.02,220);osc(392,0.08,'square',0.05,t+0.11,262);break;
  case'star':[72,76,79,84,88,91,96].forEach((m,i)=>osc(mtof(m),0.07,'square',0.06,t+i*0.035));noise(0.2,0.06,t,4000);break;
  case'land':noise(0.04,0.05,t,1200);break;
  case'power':[60,64,67,72,76,79,84].forEach((m,i)=>osc(mtof(m),0.08,'square',0.07,t+i*0.04));noise(0.3,0.1,t,2000);break;
  case'buy':osc(880,0.06,'square',0.06,t);osc(1320,0.1,'square',0.06,t+0.06);osc(1760,0.12,'triangle',0.06,t+0.12);break;
  case'no':osc(150,0.2,'square',0.07,t,100);break;
  case'howl':osc(420,1.0,'sine',0.06,t,640);osc(640,0.8,'triangle',0.035,t+0.35,500);osc(210,0.9,'sine',0.03,t,320);break;
  case'bark':osc(320,0.07,'square',0.08,t,170);noise(0.05,0.05,t,900);osc(340,0.07,'square',0.07,t+0.13,180);break;
  case'godup':[60,67,72,76,79,84,88].forEach((m,i)=>osc(mtof(m),0.12,'triangle',0.06,t+i*0.035));noise(0.5,0.06,t,3000);osc(110,0.5,'sawtooth',0.05,t,55);break;
  case'zap':noise(0.12,0.1,t,3000);osc(1400,0.12,'sawtooth',0.04,t,180);break;
  case'tss':noise(0.45,0.08,t,4000);break;
  case'flood':noise(0.3,0.06,t,150);osc(70,0.3,'sine',0.06,t,50);break;
  case'gate':osc(80,0.7,'sawtooth',0.08,t,40);noise(0.5,0.08,t,200);break;
  case'whoosh':noise(0.5,0.12,t,900);osc(200,0.45,'sine',0.05,t,700);break;
  case'chime':[84,88,91,96].forEach((m,i)=>osc(mtof(m),0.4,'sine',0.05,t+i*0.05));break;
  case'rumble':noise(0.7,0.2,t,180);osc(55,0.6,'sine',0.12,t,35);break;
  case'over':[67,63,60,55].forEach((m,i)=>osc(mtof(m),0.3,'triangle',0.1,t+i*0.25));break;
}}
const SONGS={
  title:{bpm:120,bass:[45,0,57,0,45,0,55,57,43,0,55,0,43,0,53,55,41,0,53,0,41,0,52,53,40,0,52,0,44,0,47,0],lead:[69,0,0,72,0,76,0,74,72,0,71,0,67,0,0,0,65,0,69,0,72,0,71,69,68,0,0,0,71,0,0,0]},
  map:{bpm:136,bass:[48,0,55,0,48,0,55,0,46,0,53,0,46,0,53,0,44,0,51,0,44,0,51,0,43,0,50,0,43,47,50,53],lead:[72,0,75,0,77,0,75,72,70,0,0,67,70,0,72,0,68,0,72,0,75,0,72,68,67,0,0,0,71,0,74,0]},
  level:{bpm:152,bass:[40,40,52,40,40,52,40,50,40,40,52,40,43,45,47,48,36,36,48,36,36,48,36,46,38,38,50,38,40,42,43,47],lead:[64,0,67,69,0,71,0,69,67,0,64,0,62,64,0,0,60,0,64,67,0,69,0,67,66,0,62,0,64,0,0,0]},
  boss:{bpm:172,bass:[33,45,33,45,34,46,34,46,33,45,33,45,36,48,35,47],lead:[57,0,60,0,63,0,62,60,57,0,60,0,66,0,65,63]},
  star:{bpm:200,bass:[45,57,45,57,48,60,48,60,43,55,43,55,47,59,50,62],lead:[81,0,84,81,88,0,86,84,79,0,83,79,86,0,84,83,76,0,79,81,84,86,88,0,91,0,88,86,84,0,83,0]},
  cave:{bpm:112,bass:[45,0,45,52,0,45,48,0,43,0,43,50,0,43,47,0],lead:[69,0,72,0,76,0,74,72,0,0,67,0,71,74,0,0]},
  win:{bpm:130,bass:[48,0,55,0,53,0,55,0,48,0,55,0,57,0,55,0],lead:[72,74,76,79,0,76,79,84,0,0,81,79,76,0,72,0]}
};
function music(name,force){if(A.cur===name&&!force&&A.mus)return;A.cur=name;if(!A.ctx){A.mus=null;return;}A.mus=name?{s:SONGS[name],step:0,next:A.ctx.currentTime+0.06}:null;}
const musIv=setInterval(()=>{const m=A.mus;if(!A.ctx||!m||paused)return;V9V=v9vol('m');const sp=60/m.s.bpm/2;if(m.next<A.ctx.currentTime-0.5)m.next=A.ctx.currentTime+0.05;while(m.next<A.ctx.currentTime+0.15){const i=m.step,b=m.s.bass[i%m.s.bass.length],l=m.s.lead[i%m.s.lead.length];if(b)osc(mtof(b),sp*0.9,'triangle',0.16,m.next);if(l)osc(mtof(l),sp*0.85,'square',0.035,m.next);if(i%2===0)noise(0.03,0.025,m.next,6000);if(i%4===2&&A.cur!=='title')noise(0.08,0.05,m.next,900);m.step++;m.next+=sp;}V9V=v9vol('s');},30);
function toggleMute(){audioInit();A.muted=!A.muted;if(A.master)A.master.gain.value=A.muted?0:0.55;$('muteBtn').textContent=A.muted?'\u00D7':'\u266A';}

// ===== Input =====
const K={},T={l:0,r:0,u:0,d:0,a:0,b:0};
const inp={l:0,r:0,u:0,d:0,a:0,b:0,st:0},prv={l:0,r:0,u:0,d:0,a:0,b:0,st:0};
const pressed=k=>inp[k]&&!prv[k];let aTap=0;
function pollInput(){for(const k in inp)prv[k]=inp[k];
  inp.l=K.ArrowLeft||K.KeyA||T.l?1:0;inp.r=K.ArrowRight||K.KeyD||T.r?1:0;inp.u=K.ArrowUp||K.KeyW||T.u?1:0;inp.d=K.ArrowDown||K.KeyS||T.d?1:0;
  inp.a=K.KeyZ||K.Space||K.KeyK||T.a?1:0;if(aTap&&!prv.a){inp.a=1;}aTap=0;inp.b=K.KeyX||K.KeyJ||T.b?1:0;inp.st=K.Enter?1:0;}
addEventListener('keydown',e=>{audioInit();if(!e.repeat&&(e.code==='KeyZ'||e.code==='Space'||e.code==='KeyK'))aTap=1;if(!e.repeat&&e.code==='KeyC')godTap=1;if(!e.repeat&&e.code==='KeyV')swapTap=1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
  if(!e.repeat){if(e.code==='KeyM')toggleMute();if(e.code==='KeyP'||e.code==='Escape')togglePause();}K[e.code]=1;});
addEventListener('keyup',e=>{K[e.code]=0;});
addEventListener('blur',()=>{for(const k in K)K[k]=0;if(playing())paused=true;});
const pad=$('pad'),knob=$('knob'),bA=$('btnA'),bB=$('btnB'),touches=new Map();
function rc(el){const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,r:r.width/2};}
function hitEl(el,t){const r=el.getBoundingClientRect();return t.clientX>=r.left-6&&t.clientX<=r.right+6&&t.clientY>=r.top-6&&t.clientY<=r.bottom+6;}
const toGame=t=>{const r=RR();return{x:(t.clientX-r.left-offX)/cssScale,y:(t.clientY-r.top-offY)/cssScale};};
function onTouch(e){
  e.preventDefault();audioInit();
  for(const t of e.changedTouches){
    if(e.type==='touchstart'){
      if(hitEl($('pauseBtn'),t)){togglePause();continue;}
      if(hitEl($('muteBtn'),t)){toggleMute();continue;}
      if(paused){togglePause();continue;}
      if(!playing()){menuTap(toGame(t));continue;}
      {const bG=$('btnG'),bS=$('btnS');if(bG&&hitEl(bG,t)){godTap=1;bG.classList.add('on');setTimeout(()=>bG.classList.remove('on'),140);continue;}if(bS&&hitEl(bS,t)){swapTap=1;bS.classList.add('on');setTimeout(()=>bS.classList.remove('on'),140);continue;}}
      touches.set(t.identifier,t.clientX-RR().left<W_()*0.45?'pad':'btn');
    }else if(e.type!=='touchmove')touches.delete(t.identifier);
  }
  T.l=T.r=T.u=T.d=T.a=T.b=0;let kx=0,ky=0;
  for(const t of e.touches){const role=touches.get(t.identifier);if(!role)continue;
    if(role==='pad'){const c=v10Pad(t,rc(pad)),dx=t.clientX-c.x,dy=t.clientY-c.y,d=Math.hypot(dx,dy);
      if(d>c.r*0.22){if(dx/d>0.38)T.r=1;if(dx/d<-0.38)T.l=1;if(dy/d>0.45)T.d=1;if(dy/d<-0.45)T.u=1;}
      const m=Math.min(d,c.r*0.7);kx=d?dx/d*m:0;ky=d?dy/d*m:0;}
    else{const a=rc(bA),b=rc(bB),da=Math.hypot(t.clientX-a.x,t.clientY-a.y),db=Math.hypot(t.clientX-b.x,t.clientY-b.y);
      if(Math.abs(da-db)<a.r*0.3&&Math.max(da,db)<a.r*1.7){T.a=T.b=1;}else if(da<db*1.15)T.a=1;else T.b=1;}}
  v10PadEnd(e);if(T.a&&e.type==='touchstart')aTap=1;knob.style.transform=`translate(${kx}px,${ky}px)`;bA.classList.toggle('on',!!T.a);bB.classList.toggle('on',!!T.b);
}
['touchstart','touchmove','touchend','touchcancel'].forEach(n=>(ROOT||window).addEventListener(n,onTouch,{passive:false}));
C.addEventListener('mousedown',e=>{audioInit();if(paused){togglePause();return;}if(!playing())menuTap(toGame(e));});
$('pauseBtn').addEventListener('click',()=>{if(!isTouch)togglePause();});
$('muteBtn').addEventListener('click',()=>{if(!isTouch)toggleMute();});
document.addEventListener('gesturestart',e=>e.preventDefault());

// ===== Heroes =====
const HEROES=[
 {id:'ratchet',name:'RATCHET STRAP',animal:'THE COATIMUNDI',weapon:'RAPID SPIRIT SPARKS',perk:'FAST + CASTS 50% FASTER',hp:4,spd:1.8,jump:4.4,stats:[5,3,3],
  col:{body:'#e8743a',dark:'#8a3a1a',light:'#fff0dc',mask:'#4a2410',accent:'#30f0e0',leg:'#8a3a1a',leg2:'#6a2a10',foot:'#ff4fb0',eye:'#2a1040'}},
 {id:'gasket',name:'GASKET',animal:'THE QUETZAL',weapon:'SEEKING FEATHERS',perk:'GLIDE + FEATHERS SEEK FOES',hp:4,spd:1.5,jump:4.9,glide:true,stats:[4,5,3],
  col:{body:'#9a20f0',dark:'#6a1aa0',light:'#ff9ae8',beak:'#ffd020',accent:'#80f000',leg:'#6a2a90',leg2:'#4a1a70',foot:'#ffd020',eye:'#1a1040'}},
 {id:'pumpjack',name:'PUMP JACK',animal:'THE BISON',weapon:'HEAVY SUN STONES',perk:'TOUGH + BIG KNOCKBACK',hp:6,spd:1.2,jump:4.15,stats:[2,2,5],
  col:{body:'#a0603a',dark:'#5a3018',light:'#e8c8a0',horn:'#fff0b0',plate:'#c080ff',accent:'#40f0a0',leg:'#a0603a',leg2:'#5a3018',foot:'#8a3ad0',eye:'#2a1040'}}
];
function drawHero(ox,oy,hi,o){if(SPROK)return heroS(ox,oy,o,HEROES[hi].id);
  const H=HEROES[hi],c=H.col,f=o.f||1,fl=o.flash||o.sil,tt=o.t||0;
  const P_=(dx,dy,w,h,col)=>{X.fillStyle=fl?(o.sil||'#fff'):col;X.fillRect(Math.round(ox+(f>0?dx:-dx-w)),Math.round(oy+dy),w,h);};
  const coati=H.id==='ratchet',qtz=H.id==='gasket',big=H.id==='pumpjack';
  let Lh=8,Th=big?10:9;if(o.pose==='crouch'){Lh=3;Th=7;}else if(o.pose==='jump')Lh=5;else if(o.pose==='fall')Lh=7;
  // v0.6 squash & stretch (integer, so pixels stay crisp), idle breathing and a 6-frame run with body bob
  if(o.sq){Lh=Math.max(2,Lh+o.sq);}
  let bob=0;if(o.pose==='run'){bob=[0,-1,-1,0,-1,-1][Math.floor(tt/4)%6];oy+=bob;}
  const breath=o.pose==='stand'?((tt>>5)%2):0;const wide=o.sq<0?1:0;
  const tT=-(Lh+Th),hT=tT-7+breath+(o.hurt?1:0),bw=(big?10:8)+wide*2,bx=-bw/2;
  // back items: striped pink tail, glitter wings, armor plate
  if(coati){const w=Math.sin(tt*0.2)>0?1:0;for(let i=0;i<4;i++)P_(-6-i*2,tT+5-w-i,2,3,i%2?c.mask:c.light);}
  if(qtz){const fw=(o.pose==='jump'||o.pose==='fall')&&o.glide?1:0;if(fw){P_(-13,tT-2,10,3,c.dark);P_(-15,tT,4,2,c.accent);P_(-12,tT+1,7,1,c.light);P_(-10,tT-1,1,1,'#fff');}else{P_(-7,tT,3,Th-1,c.dark);P_(-8,tT+2,2,Th-2,c.accent);P_(-9,tT+Th-3,2,3,c.dark);}}
  if(big){P_(-7,tT+1,3,Th-2,c.plate);}
  // legs
  if(o.pose==='crouch'){P_(-5,-3,10,3,c.leg2);P_(-6,-1,4,1,c.foot);P_(3,-1,4,1,c.foot);}
  else{let xf=1,xb=-3;if(o.pose==='run'){const ph=Math.floor(tt/4)%6;xf=[3,2,0,-3,-2,0][ph];xb=[-4,-2,0,3,2,0][ph];}else if(o.pose==='jump'){xf=2;xb=-2;}else if(o.pose==='fall'){xf=3;xb=-4;}const lw=big?4:3;
    P_(xb,-Lh,lw,Lh-1,c.leg2);P_(xb,-1,lw+1,1,c.foot);P_(xf,-Lh,lw,Lh-1,c.leg);P_(xf,-1,lw+1,1,c.foot);}
  // torso with glossy stripe and a little star badge
  P_(bx,tT,bw,Th,c.body);P_(0,tT+2,3,Th-3,c.light);P_(bx,tT+Th-1,bw,1,c.accent);P_(-2,tT+2,1,1,'#fff6a0');
  if(big){P_(bx,tT+3,bw,1,c.plate);P_(bx,tT+6,bw,1,c.plate);}
  // heads: big shiny eyes, blush, cute features
  const blink=o.pose==='stand'&&tt%180<6;const eye=(ex,ey)=>{if(o.hurt){P_(ex,ey+1,3,1,c.eye);P_(ex+2,ey,1,1,c.eye);P_(ex+2,ey+2,1,1,c.eye);return;}if(blink){P_(ex,ey+2,3,1,c.eye);return;}P_(ex,ey,3,3,'#fff');P_(ex+1,ey+1,2,2,c.eye);P_(ex+1,ey+1,1,1,'#fff');};
  if(coati){P_(-4,hT-1,9,8,c.body);P_(-4,hT-3,3,2,c.body);P_(2,hT-3,3,2,c.body);P_(-3,hT-2,1,1,c.mask);P_(3,hT-2,1,1,c.mask);
    P_(-2,hT+1,8,3,c.mask);P_(3,hT+4,3,2,c.light);P_(6,hT+4,1,1,'#ff4fb0');eye(1,hT+1);P_(0,hT+5,2,1,'#ffb0e0');P_(-4,hT-1,9,1,c.accent);P_(-3,hT,2,1,c.light);}
  if(qtz){P_(-4,hT-1,9,8,c.body);P_(5,hT+2,4,2,c.beak);P_(5,hT+4,3,1,'#f0a020');eye(1,hT);P_(1,hT-1,1,1,c.dark);P_(3,hT-1,1,1,c.dark);P_(1,hT+4,2,1,'#ff9ad0');
    P_(-6,hT-1,2,2,c.accent);P_(-7,hT-3,2,2,c.accent);P_(-5,hT-2,2,1,'#ffd030');P_(-3,hT,2,1,c.light);}
  if(big){P_(-4,hT-1,10,8,c.body);P_(5,hT+2,3,5,c.body);P_(7,hT-1,2,4,c.horn);P_(8,hT-3,1,3,c.horn);P_(5,hT,1,2,c.horn);P_(-4,hT-3,2,2,c.body);P_(-3,hT-2,1,1,'#ff4fb0');
    eye(1,hT+1);P_(1,hT+5,2,1,'#ff5ab0');P_(-4,hT,10,1,c.accent);P_(6,hT+5,1,1,c.dark);P_(-3,hT+1,2,1,c.light);}
  // arm + candy blaster
  let ax=o.ax,ay=o.ay;if(ax===undefined||(!ax&&!ay)){ax=f;ay=0;}
  const n=Math.hypot(ax,ay),ux=ax/n,uy=ay/n,sy=oy+tT+3;if(!ax)ox+=f*5;ox-=ux*(o.rc||0);const gl=big?11:9,gw=big?4:3;
  for(let i=0;i<=gl;i++){X.fillStyle=fl?(o.sil||'#fff'):(i<4?c.body:i<gl?(i%3?'#ff4fb0':'#30e0ff'):'#fff6a0');X.fillRect(Math.round(ox+ux*i)-1,Math.round(sy+uy*i)-1,i<4?2:gw,i<4?2:(big?3:2));}
}
function drawWorker(ox,oy,f,tt,kind,fl,raise,helm){if(SPROK)return workerS(ox,oy,f,tt,kind,fl,raise,helm);
  const P_=(dx,dy,w,h,col)=>{X.fillStyle=fl?'#fff':col;X.fillRect(Math.round(ox+(f>0?dx:-dx-w)),Math.round(oy+dy),w,h);};
  const Lh=8,Th=9,tT=-17,hT=-24;
  let xf=1,xb=-3;if(kind==='run'){const ph=Math.floor(tt/5)%4;xf=[3,1,-3,-1][ph];xb=[-4,-2,2,0][ph];}
  P_(xb,-Lh,3,Lh-1,'#7a5ad8');P_(xb,-1,4,1,'#ff4fb0');P_(xf,-Lh,3,Lh-1,'#9a7af0');P_(xf,-1,4,1,'#ff4fb0');
  P_(-4,tT,8,Th,'#30e0c0');P_(-4,tT+4,8,1,'#fff060');P_(-2,tT,1,Th,'#ff6ad0');P_(1,tT,1,Th,'#ff6ad0');
  if(raise){P_(-1,hT-3,2,8,'#ffc8a8');P_(-2,hT-8,4,2,'#c0c8ff');P_(-1,hT-10,2,3,'#c0c8ff');P_(-2,hT-11,1,2,'#c0c8ff');P_(1,hT-11,1,2,'#c0c8ff');}
  else P_(2,tT+2,4,2,'#ffc8a8');
  P_(-3,hT+1,6,7,'#ffc8a8');if(helm===-1){P_(-3,hT,6,2,'#ff8a40');}else{const hc=helm===2?'#ffe040':'#ffb0e0';P_(-4,hT,8,3,hc);P_(-5,hT+2,10,1,'#ff9ad6');P_(-2,hT-1,4,1,hc);P_(-1,hT,1,1,'#fff');if(helm===2)P_(-1,hT-2,2,1,'#fff');}
  // goofy big eye, bushy mustache, little grin
  P_(0,hT+2,3,3,'#fff');P_(1,hT+3,2,2,'#2a1050');P_(1,hT+3,1,1,'#fff');P_(0,hT+5,4,1,'#c06030');P_(1,hT+6,3,1,'#ff5a9a');P_(-2,hT+5,1,1,'#ff9ab0');
}
function drawBarrel(x,y,ph,fl){if(S8OK)return barrel8(x,y,ph,fl);const c=fl?'#fff':'#ff6ad0',d=fl?'#fff':'#b02a8a';R(x-7,y-12,14,12,c);R(x-7,y-12,14,1,d);R(x-7,y-1,14,1,d);const s=Math.floor(ph)%4;R(x-6+s*3,y-12,2,12,fl?'#fff':'#ffd8f4');R(x-4,y-9,8,5,fl?'#fff':'#fff060');R(x-3,y-8,2,2,'#5a1080');R(x+1,y-8,2,2,'#5a1080');R(x-2,y-5,4,1,'#5a1080');}
function drawPump(x,y,tt,fl){if(S8OK)return pump8(x,y,tt,fl);
  const s=Math.sin(tt*0.05),c=k=>fl?'#fff':k;
  R(x-18,y-4,36,4,c('#7a5ad8'));R(x-16,y-6,32,2,c('#b49cff'));
  R(x-1,y-26,3,22,c('#ff9ad6'));R(x-5,y-12,11,2,c('#ff9ad6'));
  for(let i=0;i<=30;i++){const bx=x-15+i,by=y-27+(i-15)*-s*0.35;R(bx,by,2,3,c(i%6<3?'#30d0ff':'#ff4fb0'));}
  const hx=x-17,hy=y-27+15*s*0.35;R(hx-2,hy-3,5,10,c('#ff4fb0'));R(hx-1,hy-1,2,2,'#fff');R(hx,hy+7,1,y-5-(hy+7),c('#e0f0ff'));
  const cx=x+13,cy=y-27-15*s*0.35;R(cx-3,cy+2,7,6,c('#8a5ae0'));R(x+10,y-10,6,6,c('#c07aff'));R(x+11,y-9,2,2,'#fff6a0');
  R(hx-3,y-7,7,3,c('#b49cff'));
}
function drawDrone(x,y,tt,kind,fl){if(S8OK)return drone8(x,y,tt,kind,fl);const c=k=>fl?'#fff':k;const p=Math.floor(tt/3)%2;R(x-9,y-8,p?8:4,1,c('#fff'));R(x+1+(p?0:4),y-8,p?8:4,1,c('#fff'));R(x-1,y-7,2,3,c('#e0c0ff'));R(x-6,y-4,12,9,c('#c79bff'));R(x-6,y-4,12,1,c('#ff6ad0'));R(x-6,y+4,12,1,c('#ff6ad0'));
  if(kind==='P')txt('P',x-1,y-2,tcol(6,tt),1,0,null);else heart(x-2,y-2,true);}
// v0.6 tacos (all plant-based): T1 Elote +1, T2 Nopal +2, T3 Golden Maize (Centeotl) full heal, T4 Citlalli Star Taco = 10s star power
const TACO={T1:{n:'ELOTE TACO',sh:'#ffd060',sd:'#d89a20',f1:'#fff060',f2:'#ffb020',top:'#7af070'},T2:{n:'NOPAL TACO',sh:'#ffd060',sd:'#d89a20',f1:'#40c050',f2:'#a0f060',top:'#30e080'},T3:{n:'GOLDEN MAIZE TACO',sh:'#ffe040',sd:'#ffb000',f1:'#fff8a0',f2:'#ffd030',top:'#fff'},T4:{n:'CITLALLI STAR TACO'}};
function tacoShape(x,y,sh,sd,f1,f2,top){R(x+2,y,6,1,top);R(x+1,y+1,2,1,f1);R(x+3,y+1,2,1,f2);R(x+5,y+1,2,1,f1);R(x+7,y+1,2,1,f2);
  R(x,y+2,10,1,sh);R(x+1,y+2,1,1,'#fff');R(x,y+3,10,1,sh);R(x+1,y+4,8,1,sd);R(x+2,y+5,6,1,sd);R(x+3,y+3,1,1,sd);R(x+6,y+3,1,1,sd);}
function drawTaco(x,y,k,tt,hud,full){if(S8OK&&!hud&&k!=='T4')return taco8(x,y,k,tt);x=Math.round(x);y=Math.round(y);
  if(hud&&!full){tacoShape(x,y,'#5a2a7a','#3a1a5a','#4a2070','#4a2070','#5a2a7a');return;}
  if(k==='T4'){// five-point rainbow star with a little taco heart
    const c=i=>HUE(tt*12+i*40),cx=x+5,cy=y+3;R(cx-1,cy-6,2,3,c(0));R(cx-6,cy-3,12,2,c(1));R(cx-4,cy-1,8,3,c(2));R(cx-5,cy+2,3,2,c(3));R(cx+2,cy+2,3,2,c(4));R(cx-6,cy+4,2,1,c(5));R(cx+4,cy+4,2,1,c(6));
    R(cx-3,cy-1,6,2,'#ffd060');R(cx-2,cy-2,4,1,'#7af070');R(cx-2,cy-1,1,1,'#fff');R(cx-1,cy-5,1,1,'#fff');
    if(!hud&&tt%5<2)sparkle(cx+(tt%3)*3-3,cy-7,2,'#fff');return;}
  const T=TACO[k]||TACO.T1;if(k==='T3'){tacoShape(x,y,HUE(tt*6,72),T.sd,T.f1,HUE(tt*6+120,70),T.top);}else tacoShape(x,y,T.sh,T.sd,T.f1,T.f2,T.top);
  if(!hud){// steam + sparkle
    const s1=(tt>>3)%3;R(x+3+(s1===1?1:0),y-3-s1,1,2,'#fff8ff');R(x+6-(s1===2?1:0),y-4-((s1+1)%3),1,2,'#f0e8ff');if(tt%14<3)sparkle(x+9,y-2,1,'#fff6a0');}}
function drawPickup(x,y,kind,tt){if(S8OK&&pick8(x,y,kind,tt))return;if(kind==='D'){const b=Math.round(Math.sin(tt*0.15)*1.5);R(x-6,y-12+b,12,12,'#1a2a70');R(x-5,y-11+b,10,10,'#2a4ae0');drawPaw(x,y-3+b,1,'#c0ffff');if(tt%8<4)sparkle(x+5,y-12+b,1,'#fff');return;}if(kind[0]==='T'){const b=kind==='T4'?0:Math.round(Math.sin(tt*0.1)*1);drawTaco(x-5,y-8+b,kind,tt);return;}R(x-6,y-11,12,11,HUE(tt*6));R(x-5,y-10,10,9,'#2a0f50');R(x-4,y-10,3,1,'#fff');if(kind==='P'){txt('P',x-1,y-8,tcol(6,tt),1,0,null);}else heart(x-2,y-8,true);}
function boomFx(x,y,n,big){for(let i=0;i<n;i++)parts.push({x,y,vx:rnd(-1.6,1.6)*(big?1.6:1),vy:rnd(-2,0.6)*(big?1.6:1),l:rnd(18,34),t:'b',s:rnd(2,big?7:4)});}
function starFx(x,y){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;parts.push({x,y,vx:Math.cos(a)*1.8,vy:Math.sin(a)*1.8,l:18,t:'s',s:2});}parts.push({x,y,vx:0,vy:-0.4,l:22,t:'pow',s:0,c:['POW!','BOOP!','ZAP!','YAY!'][(Math.random()*4)|0]});}

// ===== Game state =====
let state='title',st=0,hero=0,sel=0,score=0,lives=3,paused=false,hp=4,hiScore=0,contUsed=0;
try{hiScore=+(localStorage.getItem('ss_hi')||0);}catch(e){}
let SAVE={gems:0,gun:1,armor:0,helmet:0,shield:0,gods:[],gsel:0,mictlan:0,xolo:0};
try{Object.assign(SAVE,JSON.parse(localStorage.getItem('ss_save')||'{}'));}catch(e){}
// v0.6: coins became gems; migrate any saved coin balance 1:1
if(SAVE['coins']!==undefined){SAVE.gems=(SAVE.gems||0)+(+SAVE['coins']||0);delete SAVE['coins'];try{localStorage.setItem('ss_save',JSON.stringify(SAVE));}catch(e){}}
if(!(SAVE.gems>=0))SAVE.gems=0;
function save(){try{localStorage.setItem('ss_save',JSON.stringify(SAVE));}catch(e){}}
let stage=1,runGems=0,winRew='';
const maxHp=()=>Math.max(2,HEROES[hero].hp+SAVE.armor+v9Hp());
const TC=['#e8e0d0','#e8e0d0','#b070ff','#30e070','#30e8e8','#ff8a20','#ffd030'],TN=['','SPIRIT SPARK','OBSIDIAN FEATHER','JADE RAY','TURQUOISE WISP','SUN FLARE','XIUHCOATL'],MAXT=6;
const tcol=(t,x)=>t>=6?((Math.floor((st+(x||0))/3)%2)?'#ffd030':'#fff0a0'):TC[t];
let parts=[],bullets=[],ebul=[],enemies=[],pickups=[],P=null,cam={x:0,y:0},L=null,boss=null,banner=null,shake=0;
let hitStop=0,gemBump=0,tacoBump=0,fadeT=0,press=null,dispScore=0;
const playing=()=>state==='map'||state==='level';
// v0.5 letter guns: swappable timed powerups that sit on top of the Flint..Quinto Sol tier (tier boosts their power)
const PW={R:{n:'SPIRIT FLURRY',d:'RAPID SPIRIT DARTS',cd:5},S:{n:'FLOWER FAN',d:'5-WAY BLOSSOM SPREAD',cd:13},L:{n:'RAINBOW RAY',d:'LONG SPIRIT BEAM - PIERCES',cd:18},F:{n:'SPIRIT FLAME',d:'SHORT-RANGE FLAME BREATH',cd:3},
  B:{n:'BOUNCE ORBS',d:'SPIRIT ORBS BOUNCE OFF EVERYTHING',cd:12},H:{n:'HEART SPIRITS',d:'HEART SPIRITS SEEK FOES',cd:14},X:{n:'STAR BURST',d:'RADIAL STAR BLAST',cd:22}};
const PWK='RSLFBHX',PWC={R:'#ff4fb0',S:'#ff9af0',L:'#30d0ff',F:'#ff8a20',B:'#a0ff60',H:'#ff3a8a',X:'#fff060'},PW_T=1500,NOHURT=['drone','pod','crate','sensor'];
const RBOW_K=['flint','shard','ric','rapid','spr','bnc','star','hom','beam'];
function nextPW(){let g;do{g=PWK[(Math.random()*PWK.length)|0];}while(P&&P.pw&&g===P.pw.k&&Math.random()<0.75);return g;}
function givePW(g){const p=P;p.pw={k:g,t:PW_T};const d=PW[g];shake=8;sfx('power');
  banner={t:d.n+'!',s:d.d+(p.tier>1?' + '+TN[p.tier]+' BOOST':''),l:110,pw:g};
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;parts.push({x:p.x,y:p.y-12,vx:Math.cos(a)*2.4,vy:Math.sin(a)*2.4,l:24,t:'tr',s:3,c:HUE(i*15)});}}
function spawnPod(dx,by){enemies.push({t:'pod',x:cam.x+(dx===undefined?-14:dx),y:0,by:by||rnd(52,100),w:16,h:12,hp:1,g:nextPW(),fl:0,sc:300,tt:rnd(0,60),vx:1.3});}
function gunBadge(x,y,g,s,tt){s=s||1;R(x,y,9*s,8*s,HUE((tt||st)*6));R(x+s,y+s,7*s,6*s,'#2a0f50');R(x+s,y+s,2*s,1*s,'#fff');txt(g,x+3*s,y+1.5*s,PWC[g],s,0,null);}
function drawPod(x,y,g,tt,fl){if(S8OK)return pod8(x,y,g,tt,fl);const cy=Math.round(y-6),w=(tt>>2)%2;
  R(x-12,cy-3-w*2,6,2,fl?'#fff':'#fff');R(x+7,cy-3-w*2,6,2,'#fff');R(x-11,cy-1-w,4,1,'#a0f8ff');R(x+8,cy-1-w,4,1,'#a0f8ff');
  for(let i=0;i<16;i++){const h=i===0||i===15?4:i===1||i===14?6:8;R(x-8+i,cy-h/2,1,h,fl?'#fff':HUE(tt*6+i*22));}
  R(x-3,cy-3,7,7,'#fff');txt(g,x-1,cy-2,PWC[g],1,0,null);R(x-6,cy-3,2,1,'#fff');if(tt%8<2)sparkle(x+9,cy-6,2,'#fff6a0');}
function drawCrate(x,y,fl){if(S8OK)return crate8(x,y,fl);const c=k=>fl?'#fff':k;R(x-7,y-14,14,14,c('#ff6ad0'));R(x-7,y-14,14,1,c('#ffb0e8'));R(x-1,y-14,2,14,c('#fff060'));R(x-7,y-8,14,2,c('#fff060'));R(x-5,y-17,3,3,c('#fff060'));R(x+2,y-17,3,3,c('#fff060'));R(x-5,y-12,2,2,'#fff');}
function drawSensor(x,y,tt,g,fl){if(S8OK)return sensor8(x,y,tt,g,fl);const c=k=>fl?'#fff':k,open=(tt>>5)%2;R(x-8,y-6,16,6,c('#7a4ad0'));R(x-8,y-6,16,1,c('#c79bff'));R(x-5,y-22,10,16,c(HUE(tt*4)));R(x-4,y-21,2,8,'#fff');
  if(open){R(x-3,y-18,6,6,'#fff');R(x-1,y-16,3,3,PWC[g]);}else R(x-3,y-15,6,1,'#5a1090');}

function togglePause(){if(!playing()&&!paused)return;paused=!paused;$('pauseBtn').textContent=paused?'\u25B6':'II';}
function setState(s){state=s;st=0;fadeT=14;hitStop=0;{const g=$('btnG'),w=$('btnS');if(g)g.style.display=s==='level'?'':'none';if(w)w.style.display=s==='level'?'':'none';}$('ctl').classList.toggle('hide',!(isTouch&&(s==='map'||s==='level')));
  const mz={story:'title',title:'title',select:'title',map:'map',sewer:null,level:'level',over:null,win:'win'}[s];if(mz!==undefined)music(mz);}
function addScore(n){score+=n;if(score>hiScore){hiScore=score;try{localStorage.setItem('ss_hi',hiScore);}catch(e){}}}
function newGame(){godM=0;score=0;lives=v9Lives();contUsed=0;stage=V9S||(SAVE.prog||0)+1;runGems=0;hp=maxHp();v9Start();}

// ===== Menus =====
function menuTap(g){if(v10Tap(g)||v9Tap(g))return;
  if(state==='title'){sfx('select');setState('story');return;}
  if(state==='story'){sfx('select');setState('select');return;}
  if(state==='select'){
    const cw=Math.min(118,Math.floor((VW-16)/3)-4),x0=Math.round(VW/2-(cw+4)*1.5+2);
    for(let i=0;i<3;i++){const cx=x0+i*(cw+4);if(g.x>=cx&&g.x<=cx+cw&&g.y>=26&&g.y<=176){if(sel===i){sfx('select');hero=i;newGame();}else{sel=i;sfx('ping');}return;}}
    if(g.y>188&&g.x>=VW/2-30&&g.x<=VW/2+30){sfx('select');press={id:'start',t:7,act:()=>{hero=sel;newGame();}};}return;
  }
  if(state==='over'&&st>40){if(g.y>=120&&g.y<=140&&g.x<VW/2){press={id:'cont',t:7,act:continueGame};}else if(g.y>=120&&g.y<=140){press={id:'title',t:7,act:()=>setState('title')};}return;}
  if(state==='win'&&st>90){winNext();}
}
// v0.7.3: no shop, no currency. Clearing a stage (or Mictlan) unlocks the next reward on a fixed track, plus a Spirit Shield.
const REWARDS=[['OBSIDIAN FEATHER POWER',()=>{SAVE.gun=Math.max(SAVE.gun,2);}],['EXTRA TACO +1 HEALTH',()=>{SAVE.armor=Math.min(3,SAVE.armor+1);}],['JADE RAY POWER',()=>{SAVE.gun=Math.max(SAVE.gun,3);}],['IRON HELMET',()=>{SAVE.helmet=1;}],['EXTRA TACO +1 HEALTH',()=>{SAVE.armor=Math.min(3,SAVE.armor+1);}],['TURQUOISE WISP POWER',()=>{SAVE.gun=Math.max(SAVE.gun,4);}],['EXTRA TACO +1 HEALTH',()=>{SAVE.armor=Math.min(3,SAVE.armor+1);}]];
function grantReward(){v9Clear();const n=SAVE.clears||0;SAVE.clears=n+1;const r=REWARDS[n];if(r)r[1]();SAVE.shield=Math.min(3,(SAVE.shield||0)+1);save();return (r?r[0]+' + ':'')+'SPIRIT SHIELD';}
function winNext(){if(v10Fin())return;const m=winKind==='mictlan';winKind='';winRew='';hp=maxHp();if(!m)stage++;startMap();}
function continueGame(){contUsed++;score=0;lives=v9Lives();hp=maxHp();startLevel();}
function updMenus(){if(v10Menus()||v9Menus())return;
  if(state==='title'){if(pressed('st')||pressed('b')||pressed('a')){sfx('select');setState('story');}}
  else if(state==='story'){if(pressed('st')||pressed('b')||pressed('a')||st>900){sfx('select');setState('select');}}
  else if(state==='select'){if(pressed('l')){sel=(sel+2)%3;sfx('ping');}if(pressed('r')){sel=(sel+1)%3;sfx('ping');}if(pressed('st')||pressed('b')||pressed('a')){sfx('select');hero=sel;newGame();}}
  else if(state==='over'){if(st>40){if(pressed('st')||pressed('b'))continueGame();if(pressed('a'))setState('title');}}
  else if(state==='win'){if(st>90&&(pressed('st')||pressed('b')||pressed('a')))winNext();}
}
function rainbowArc(cx,cy,r,a){const cols=['#ff3a6a','#ff9a30','#ffe040','#50f070','#30c0ff','#9a6aff'];X.globalAlpha=a;
  for(let i=0;i<cols.length;i++){const rr=r-i*3;for(let x=-rr;x<=rr;x++){const y=Math.sqrt(rr*rr-x*x);R(cx+x,cy-y,1,3,cols[i]);}}X.globalAlpha=1;}
function twinkles(t,n,maxY,par){for(let k=0;k<n;k++){const sx=(((k*137+11)-(par||0)*((k%3)+1)*0.2)%VW+VW)%VW,sy=(k*53+7)%maxY,tw=((t>>3)+k)%7;if(tw<4){const c=k%3===0?'#fff6a0':k%3===1?'#fff':'#a0f8ff';if(tw===1)sparkle(sx,sy,2,c);else R(sx,sy,1,1,c);}}}
function skyline(t,dark){
  const bands=dark?['#1e0848','#2e0c66','#461488','#6a1ca0','#9028b0','#c038b8','#e858c8']:['#ff5ac8','#ff7ad6','#e090ff','#a8a0ff','#7ac8ff','#7af0f0','#b8ffd8'];
  const bh=Math.ceil(140/bands.length);bands.forEach((c,i)=>R(0,i*bh,VW,bh,c));
  twinkles(t,30,110,0);
  rainbowArc(Math.round(VW*0.72),140,60,dark?0.5:0.9);
  heartC(Math.round(VW*0.72)-3,64+Math.round(Math.sin(t*0.05)*2),'#fff6a0');
  X.fillStyle=dark?'#5a1a8a':'#c08aff';for(let x=0;x<VW;x+=2){const h=14+Math.sin(x*0.03)*8+Math.sin(x*0.011+1)*10;X.fillRect(x,140-h,2,h+2);}
  R(0,140,VW,76,dark?'#3a0c6a':'#ff9ad6');for(let y=146;y<VH;y+=8)R(0,y,VW,1,dark?'#4a1480':'#ffb8e6');
  // pastel candy city
  const off=-(t*0.2)%220;
  for(let k=-1;k<4;k++){const bx=off+k*220,bc=dark?'#4a1480':'#b07af0',wc=(i)=>((Math.floor(t/20)+i+k)%4?'#7af8ff':'#fff6a0');
    X.fillStyle=bc;X.fillRect(bx+10,96,10,44);X.fillRect(bx+30,110,30,30);X.fillRect(bx+34,102,22,8);X.fillRect(bx+70,78,8,62);X.fillRect(bx+90,114,40,26);X.fillRect(bx+140,100,14,40);X.fillRect(bx+160,118,50,22);
    for(let i=0;i<4;i++){R(bx+13,100+i*9,3,3,wc(i));R(bx+36,114+i*6,3,2,wc(i+1));R(bx+142,104+i*8,3,3,wc(i+2));}
    heartC(bx+71,70+(Math.floor(t/8)%2),'#ff4fb0');}
}
function drawTitle(){
  skyline(st,false);
  for(let k=0;k<6;k++){const hx=(k*83+st*0.3)%VW,hy=150-((st*0.4+k*37)%140);heartC(hx,hy,['#ff4fb0','#ff9af0','#fff','#30e0ff','#ffd030','#b070ff'][k]);}
  const y=26+Math.sin(st*0.05)*2-Math.round((1-easeBack(st/40))*70);
  txt('ROUGHNECK',VW/2,y-4,'rainbow',5,1,'#5a1090');
  sparkle(Math.round(VW/2-96),Math.round(y-6),(st>>3)%2?3:2,'#fff6a0');sparkle(Math.round(VW/2+94),Math.round(y+18),(st>>3)%2?2:3,'#fff');
  txt('ANIMAL SPIRITS VS BARON CRUDE',VW/2,y+30,'#fff',1,1,'#7a1aa0');
  actors(()=>{for(let i=0;i<3;i++){X.setTransform(2,0,0,2,VW/2+(i-1)*64,184+Math.round((1-easeBack((st-10-i*8)/30))*60));drawHero(0,0,i,{f:i===2?-1:1,pose:'stand',t:st+i*40});X.setTransform(1,0,0,1,0,0);}},2);v74Title();
  if(Math.floor(st/30)%2===0)txt(isTouch?'TAP TO START':'PRESS ENTER TO START',VW/2,196,'#fff',1,1,'#c0208a');
  txt('HI '+hiScore,6,6,'#fff',1,0,'#7a1aa0');txt('CITLALLI STUDIOS - V1.0.2',VW-6,206,'#fff',1,2,'#7a1aa0');
}
const STORY=['FOR FIVE HUNDRED YEARS THE ANIMAL SPIRITS','SLEPT BENEATH THE OLD CITY,','GUARDING THE HEART OF THE FIFTH SUN.','','THEN BARON CRUDE CAME WITH HIS DRILLS.','HIS PUMPJACKS DUG TOO DEEP, TAR LEAKED','INTO THE SEWERS, AND THE SUN BEGAN TO DIM.','','RISE, NAHUAL WARRIORS!'];
function drawStory(){skyline(st,true);X.globalAlpha=0.6;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;
  R(VW/2-12,14,24,24,'#ffd030');R(VW/2-8,18,16,16,'#fff0a0');for(let k=0;k<8;k++){const a=k/8*Math.PI*2+st*0.02;R(VW/2+Math.cos(a)*18-2,26+Math.sin(a)*18-2,4,4,'#ffd030');}
  STORY.forEach((l,i)=>{if(st>i*28)txt(l,VW/2,54+i*13,i===8?'#f8e040':'#fff',1,1);});
  if(st>60&&Math.floor(st/30)%2===0)txt(isTouch?'TAP TO CONTINUE':'PRESS ENTER',VW/2,202,'#9a8aa8',1,1);}

function drawSelect(){
  skyline(st,true);
  txt('CHOOSE YOUR SPIRIT',VW/2,8,'rainbow',2,1,'#5a1090');
  const cw=Math.min(118,Math.floor((VW-16)/3)-4),x0=Math.round(VW/2-(cw+4)*1.5+2);
  const heroes=[];for(let i=0;i<3;i++){const cx=x0+i*(cw+4),lock=false,on=sel===i,dy=Math.round((1-easeBack((st-i*6)/26))*150)+(on?-((st>>4)%2):0);X.setTransform(1,0,0,1,0,dy);heroes.push([cx,dy]);
    R(cx,26,cw,150,on?'#f8e040':'#8a5ad8');R(cx+2,28,cw-4,146,on?'#5a1080':lock?'#2a0f50':'#2a0f50');

    const H=HEROES[i];txt(H.name,cx+cw/2,110,on?'#f8e040':'#fff',1,1);txt(H.animal,cx+cw/2,118,'#f0d0ff',1,1);
    txt(H.weapon,cx+cw/2,130,'#40e0d0',1,1);txt(H.perk,cx+cw/2,138,'#ffb0e0',1,1);
    ['SPD','JMP','ARM'].forEach((s,j)=>{txt(s,cx+8,150+j*7,'#aaa',1,0,null);for(let k=0;k<5;k++)R(cx+24+k*7,150+j*7,6,5,k<H.stats[j]?'#ff4fb0':'#5a2a9a');});
  }X.setTransform(1,0,0,1,0,0);
  actors(()=>{heroes.forEach(([cx,dy],i)=>{const on=sel===i;X.setTransform(3,0,0,3,Math.round(cx+cw/2),104+dy);drawHero(0,0,i,{f:1,pose:on?'run':'stand',t:on?st:st+i*50});});X.setTransform(1,0,0,1,0,0);},3);
  if(Math.floor(st/25)%2===0)txt(isTouch?'TAP A HERO TWICE, OR TAP START':'LEFT/RIGHT TO CHOOSE - ENTER TO START',VW/2,182,'#fff',1,1);
  btn(VW/2-30,192,60,14,'#ff3a9a','START','start');
}
function btn(x,y,w,h,c,l,id){const p=press&&press.id===id?1:0;if(!p)R(x,y+2,w,2,'#2a0a4a');R(x,y+p*2,w,h,p?'#ffffff':c);if(p)R(x+1,y+3,w-2,h-2,c);R(x+1,y+p*2,w-2,1,'rgba(255,255,255,0.5)');txt(l,x+w/2,y+4+p*2,'#fff',1,1);}
function drawOver(){skyline(st,true);X.globalAlpha=0.5;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;txt('GAME OVER',VW/2,60,'rainbow',4,1,'#5a1090');txt('SCORE '+score,VW/2,96,'#fff',1,1);
  if(st>40){btn(VW/4-40,120,80,20,'#ff3a9a','CONTINUE','cont');btn(VW*3/4-40,120,80,20,'#5a2a9a','TITLE','title');
    if(!isTouch)txt('B/X = CONTINUE   A/Z = TITLE',VW/2,160,'#999',1,1);}}
function drawWin(){skyline(st,false);
  if(winKind==='mictlan'){R(0,0,VW,VH,'#1a0c48');for(let i=0;i<14;i++){const x=(i*37)%VW,h=10+hsh(i)%20;R(x,170-h,4,h,HUE(i*50,62));R(x+4,174-h/2,3,h/2,HUE(i*50+40,70));}R(0,172,VW,44,'#40d8ff');for(let i=0;i<VW;i+=8)R(i,172+Math.round(Math.sin((i+st)*0.15)),6,1,'#c0ffff');
    txt('THE TAR LAKE RUNS CLEAR!',VW/2,16,'#7af8ff',2,1,'#2a0f60');txt('XOLOTL JOINS YOU AS A SPIRIT HELPER!',VW/2,36,'#fff',1,1,'#2a0f60');txt('3 FIRE OPALS FOUND - REPLAY FROM THE BLUE MANHOLE',VW/2,46,'#ffb030',1,1,'#2a0f60');
    actors(()=>{X.setTransform(2,0,0,2,VW/2+60,168);drawXolo(0,0,-1,st,Math.floor(st/50)%2?'howl':'sit');X.setTransform(1,0,0,1,0,0);},1);}
  else{txt('MISSION COMPLETE!',VW/2,14,'#f8e040',3,1,'#ff3a9a');txt(v9Out(),VW/2,34,'#fff',1,1,'#5a1090');}
  actors(()=>{X.setTransform(3,0,0,3,VW/2,150-Math.round(Math.abs(Math.sin(st*0.08))*6));drawHero(0,0,hero,{f:1,pose:Math.sin(st*0.08)>0?'jump':'stand',t:st,ax:1,ay:-1});X.setTransform(1,0,0,1,0,0);},3);
  txt('SCORE '+score,VW/2,160,'#fff',1,1);txt('HI '+hiScore,VW/2,170,'#f0d0ff',1,1);
  if(winRew)txt('UNLOCKED: '+winRew,VW/2,180,'#f8d020',1,1);if(st>90&&Math.floor(st/30)%2===0)txt(isTouch?'TAP TO CONTINUE':'PRESS ENTER TO CONTINUE',VW/2,200,'#fff',1,1);
  if(st%20===0)boomFx(rnd(20,VW-20),rnd(20,90),8,false);
}

// ===== Overhead city map =====
const TS=16,MW=40,MH=24;let MAP=null,mapCanvas=null,M=null;
const RH=[3,11,19],RV=[3,15,27,36];
function mget(x,y){return x<0||y<0||x>=MW||y>=MH?'B':MAP[y*MW+x];}
function buildMap(){
  MAP=new Array(MW*MH).fill('B');const set=(x,y,c)=>{if(x>=0&&y>=0&&x<MW&&y<MH)MAP[y*MW+x]=c;};
  for(const r of RH)for(let x=RV[0];x<=RV[RV.length-1]+1;x++){set(x,r,'R');set(x,r+1,'R');}
  for(const v of RV)for(let y=RH[0];y<=RH[RH.length-1]+1;y++){set(v,y,'R');set(v+1,y,'R');}
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(mget(x,y)==='B'){let near=false;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if(mget(x+i,y+j)==='R')near=true;if(near)set(x,y,'S');}
  for(let y=14;y<=17;y++)for(let x=6;x<=13;x++)set(x,y,(x+y)%5===0&&x!==9?'T':'G');
  for(let y=6;y<=9;y++)for(let x=30;x<=34;x++)set(x,y,(x%2===0&&y%2===0)?'O':'D');
  for(let y=14;y<=17;y++)for(let x=18;x<=25;x++)set(x,y,(x===18||x===25||y===14||y===17)?'S':'D');
  set(21,15,'O');set(22,16,'O');
  set(32,20,'M');[[9,4],[20,12],[4,16],[28,7]].forEach(p=>set(p[0],p[1],'m'));
  [[12,3],[16,8],[24,11],[28,15],[7,20]].forEach(p=>set(p[0],p[1],'P'));
  // pre-render
  mapCanvas=document.createElement('canvas');mapCanvas.width=MW*TS;mapCanvas.height=MH*TS;const g=mapCanvas.getContext('2d');
  const r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
  const roofs=['#ff9ad6','#b78cff','#8ad0ff','#a0f0c0','#ffd08a','#f0a0ff'];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const t=mget(x,y),px=x*TS,py=y*TS;
    if(t==='R'||t==='P'||t==='M'||t==='m'){r(px,py,TS,TS,'#8a6ad8');if((x*7+y*13)%5===0)r(px+5,py+9,2,1,'#9a7ae8');
      if(RH.includes(y)&&mget(x,y+1)==='R'&&!(RV.includes(x)||RV.includes(x-1))&&x%2===0)r(px+3,py+15,10,2,'#fff0a0');
      if(RV.includes(x)&&!(RH.includes(y)||RH.includes(y-1))&&y%2===0)r(px+15,py+3,2,10,'#fff0a0');
      if(t==='P'){r(px+3,py+5,10,7,'#5a1a8a');r(px+2,py+7,12,3,'#5a1a8a');r(px+5,py+6,3,1,'#ff9af0');r(px+9,py+9,2,1,'#7af8ff');}
      if(t==='m'){r(px+4,py+4,8,8,'#c0b0f0');r(px+3,py+6,10,4,'#c0b0f0');r(px+6,py+3,4,10,'#c0b0f0');r(px+5,py+7,6,1,'#9a7ae8');r(px+5,py+9,6,1,'#9a7ae8');}
    }else if(t==='S'){r(px,py,TS,TS,'#ffc8ec');r(px,py,TS,1,'#ffe0f6');r(px,py,1,TS,'#ffe0f6');r(px+8,py,1,TS,'#f0a8dc');}
    else if(t==='G'||t==='T'){r(px,py,TS,TS,'#6ae8a0');r(px+(x*5%11),py+(y*3%9),1,2,'#a0ffc8');r(px+(x*3%13),py+(y*7%11),1,2,'#40c080');
      if(t==='T'){r(px+1,py+2,14,12,'#30b070');r(px+3,py+1,10,14,'#30b070');r(px+4,py+3,6,5,'#60e090');r(px+5,py+4,2,2,'#c0ffe0');}}
    else if(t==='D'||t==='O'){r(px,py,TS,TS,'#ffb0d0');r(px+(x*5%13),py+(y*7%13),2,1,'#f090c0');
      if(t==='O'){r(px+1,py+1,14,14,'#e0d0ff');r(px+2,py+2,12,12,'#c0a8ff');r(px+4,py+4,8,8,'#e0d0ff');r(px+3,py+7,10,2,'#ff4fb0');}}
    else{const bid=((x/6)|0)*7+((y/5)|0)*3,rc_=roofs[bid%roofs.length];r(px,py,TS,TS,rc_);
      if(mget(x,y+1)!=='B'){r(px,py+11,TS,5,'#5a2a8a');for(let i=0;i<4;i++)r(px+1+i*4,py+12,2,3,(x+i+y)%3?'#7af8ff':'#8a5ad8');}
      if(mget(x+1,y)!=='B')r(px+14,py,2,TS,'rgba(0,0,0,.35)');if(mget(x,y-1)!=='B')r(px,py,TS,1,'rgba(255,255,255,.2)');
      if((x*11+y*7)%9===0){r(px+4,py+3,7,5,'#f0a8dc');r(px+5,py+4,5,1,'#d890ff');}}
  }
}
const SOLID=c=>c==='B'||c==='T'||c==='O';
function startMap(){
  if(!MAP)buildMap();
  M={x:4*TS,y:4*TS,dir:1,anim:0,inv:0,kb:{x:0,y:0},heart:true,hint:240,
    w:[{x:8*TS,y:3.5*TS,ax:'x',a:6*TS,b:14*TS,v:0.7},{x:16*TS,y:7*TS,ax:'y',a:4*TS,b:10*TS,v:0.6},{x:24*TS,y:19.5*TS,ax:'x',a:18*TS,b:30*TS,v:0.8},
       {x:28*TS,y:14*TS,ax:'y',a:12*TS,b:20*TS,v:0.7},{x:33*TS,y:11.5*TS,ax:'x',a:29*TS,b:36*TS,v:0.9},{x:36.5*TS,y:16*TS,ax:'y',a:13*TS,b:19*TS,v:0.6}],
    truck:{x:4*TS,y:11.5*TS,v:1.4}};
  M.w.forEach(w=>{if(w.ax==='x')w.y=Math.round(w.y);});
  setState('map');banner={t:'BARON CRUDE CITY',s:'FIND THE OPEN MANHOLE!',l:180};
}
function mapSolidAt(px,py){return SOLID(mget(Math.floor(px/TS),Math.floor(py/TS)));}
function mapMove(dx,dy){const r=5;
  const nx=M.x+dx;if(!mapSolidAt(nx-r,M.y-r)&&!mapSolidAt(nx+r,M.y-r)&&!mapSolidAt(nx-r,M.y+r)&&!mapSolidAt(nx+r,M.y+r))M.x=nx;
  const ny=M.y+dy;if(!mapSolidAt(M.x-r,ny-r)&&!mapSolidAt(M.x+r,ny-r)&&!mapSolidAt(M.x-r,ny+r)&&!mapSolidAt(M.x+r,ny+r))M.y=ny;
  M.x=clamp(M.x,8,MW*TS-8);M.y=clamp(M.y,8,MH*TS-8);}
function mapHurt(sx,sy){if(M.inv>0)return;hp--;M.inv=90;sfx('hurt');shake=8;const d=Math.hypot(M.x-sx,M.y-sy)||1;M.kb={x:(M.x-sx)/d*3,y:(M.y-sy)/d*3};
  if(hp<=0){lives--;if(lives<0){setState('over');sfx('over');return;}hp=maxHp();M.x=4*TS;M.y=4*TS;M.inv=120;banner={t:'OUCH!',s:'LIVES LEFT '+lives,l:90};}}
function updMap(){
  const H=HEROES[hero],sp=H.spd*0.85;let dx=(inp.r?1:0)-(inp.l?1:0),dy=(inp.d?1:0)-(inp.u?1:0);
  if(dx&&dy){dx*=0.71;dy*=0.71;}
  const onP=mget(Math.floor(M.x/TS),Math.floor(M.y/TS))==='P'?0.5:1;
  mapMove(dx*sp*onP+M.kb.x,dy*sp*onP+M.kb.y);M.kb.x*=0.8;M.kb.y*=0.8;
  if(dx||dy){M.anim++;if(Math.abs(dx)>=Math.abs(dy))M.dir=dx>0?1:3;else M.dir=dy>0?2:0;}
  if(M.inv>0)M.inv--;if(M.hint>0)M.hint--;
  for(const w of M.w){const k=w.ax;w[k]+=w.v;if(w[k]<w.a||w[k]>w.b)w.v*=-1;w.t=(w.t||0)+1;if(Math.abs(w.x-M.x)<10&&Math.abs(w.y-M.y)<10)mapHurt(w.x,w.y);}
  const tr=M.truck;tr.x+=tr.v;if(tr.x>37*TS)tr.x=3*TS;if(Math.abs(tr.x-M.x)<20&&Math.abs(tr.y-M.y)<12)mapHurt(tr.x,tr.y);
  if(M.heart&&Math.abs(M.x-9.5*TS)<10&&Math.abs(M.y-15.5*TS)<10){M.heart=false;hp=Math.min(maxHp(),hp+2);sfx('nom');addScore(500);tacoBump=12;}
  if(SAVE.mictlan&&Math.abs(M.x-20.5*TS)<7&&Math.abs(M.y-12.5*TS)<7){sfx('howl');setState('cave');return;}
  if(Math.abs(M.x-32.5*TS)<7&&Math.abs(M.y-20.5*TS)<7){sfx('fall');setState('sewer');}
  cam.x=clamp(M.x-VW/2,0,MW*TS-VW);cam.y=clamp(M.y-VH/2,0,MH*TS-VH);
}
function drawHeroTop(x,y,hi,dir,an,fl){if(S8OK)return heroTop8(x,y,hi,dir,an,fl);const c=HEROES[hi].col,b=fl?'#fff':c.body;const step=Math.floor(an/8)%2;
  const dv=[[0,-1],[1,0],[0,1],[-1,0]][dir];
  if(hi===2){R(x-6,y-6,12,12,b);R(x-4,y-4,8,8,c.plate);R(x-1,y-5,2,10,c.dark);}
  else if(hi===1){R(x-7,y-3,14,6,fl?'#fff':c.dark);R(x-5,y-5,10,10,b);}
  else{R(x-5,y-5,10,10,b);R(x-dv[0]*7-1,y-dv[1]*7-1,3,3,c.mask);R(x-dv[0]*9-1,y-dv[1]*9-1,3,3,c.body);}
  const fx=dv[1]?(step?3:-4):0,fy=dv[0]?(step?3:-4):0;R(x-5+(dv[0]?0:fx+4),y-5+(dv[1]?0:fy+4),2,2,b);
  const hx=x+dv[0]*6-3,hy=y+dv[1]*6-3;R(hx,hy,6,6,b);
  if(hi===0){R(hx,hy+2,6,2,c.mask);R(hx,hy-1,2,2,b);R(hx+4,hy-1,2,2,b);}
  if(hi===1){R(hx+2+dv[0]*3,hy+2+dv[1]*3,2,2,c.beak);}
  if(hi===2){R(hx+2+dv[0]*4,hy+2+dv[1]*4,2,2,c.horn);}
}
function drawWorkerTop(x,y,t,fl){if(S8OK)return workerTop8(x,y,t,fl);R(x-5,y-3,10,7,fl?'#fff':'#30e0c0');R(x-5,y,10,1,'#fff060');R(x-4,y-5,8,8,'#ffb0e0');R(x-3,y-4,6,6,'#ffe040');R(x-1,y-6+(Math.floor(t/10)%2),2,1,'#fff');}
function drawMap(){
  const ox=-Math.round(cam.x),oy=-Math.round(cam.y);
  X.drawImage(mapCanvas,ox,oy);
  const mx=32*TS+ox,my=20*TS+oy,bl=Math.floor(st/10)%2;
  R(mx+2,my+2,12,12,bl?'#f8e040':'#f08020');R(mx+3,my+3,10,10,'#000');R(mx+5,my+5,6,1,'#b07af0');R(mx+5,my+8,6,1,'#b07af0');R(mx+5,my+11,6,1,'#b07af0');
  if(bl)txt('!',mx+7,my-10,'#f8e040',1,0);
  if(SAVE.mictlan)blueHole(ox,oy);
  if(M.heart)drawTaco(9*TS+3+ox,15*TS+4+oy+(Math.floor(st/12)%2),'T2',st);
  const tr=M.truck,tx=tr.x+ox,ty=tr.y+oy;R(tx-16,ty-6,26,12,'#5a30b0');R(tx-15,ty-5,24,10,'#c07aff');R(tx-15,ty-1,24,2,'#ff4fb0');R(tx+10,ty-6,8,12,'#ff6ad0');R(tx+15,ty-4,2,8,'#8ac0e0');
  actors(()=>{for(const w of M.w)drawWorkerTop(w.x+ox,w.y+oy,w.t||0,false);
  if(!(M.inv>0&&Math.floor(M.inv/4)%2))drawHeroTop(Math.round(M.x+ox),Math.round(M.y+oy),hero,M.dir,M.anim,false);},1);
  // hint arrow
  const tx2=32.5*TS+ox,ty2=20.5*TS+oy;if(tx2<0||tx2>VW||ty2<0||ty2>VH){const a=Math.atan2(ty2-VH/2,tx2-VW/2),ax=VW/2+Math.cos(a)*(VW/2-18),ay=VH/2+Math.sin(a)*(VH/2-18);
    if(bl){for(let i=0;i<6;i++)R(ax+Math.cos(a)*i-1,ay+Math.sin(a)*i-1,3,3,'#f8e040');}}
  hud();
}

// ===== Side-scrolling level =====
const GY=184;
function startLevel(){
  const len=3300;
  L={len,sewerEnd:1100,ground:[[0,408],[442,766],[794,1508],[1542,2056],[2084,len]],
    plats:[[300,380,140],[520,600,136],[640,720,112],[880,960,140],[1180,1300,140],[1360,1440,110],[1600,1720,140],[1760,1880,116],[1950,2040,140],[2150,2260,140],[2300,2400,112],[2560,2660,136]],
    spawns:[{x:250,t:'sludge'},{x:330,t:'sludge'},{x:340,t:'wrench',y:140},{x:620,t:'sludge'},{x:700,t:'sludge'},{x:900,t:'sludge'},{x:1040,t:'sludge'},{x:500,t:'drone',k:'S'},{x:560,t:'wrench',y:GY},{x:680,t:'wrench',y:112},{x:850,t:'barrels'},{x:920,t:'wrench',y:140},{x:1010,t:'wrench',y:GY},
      {x:1250,t:'pump'},{x:1400,t:'wrench',y:110},{x:1480,t:'drone',k:'H'},{x:1650,t:'pump'},{x:1700,t:'barrels'},{x:1820,t:'wrench',y:116},{x:2000,t:'pump'},
      {x:2200,t:'wrench',y:140},{x:2350,t:'pump'},{x:2360,t:'wrench',y:112},{x:2420,t:'drone',k:'S'},{x:2520,t:'barrels'},{x:2610,t:'wrench',y:136},{x:2700,t:'pump'},{x:2760,t:'drone',k:'H'},{x:460,t:'crate'},{x:980,t:'sensor'},{x:1180,t:'crate'},{x:1700,t:'crate'},{x:2250,t:'sensor'},{x:2450,t:'crate'}],
    si:0,gt:60,arena:false,cps:[{x:640},{x:1300},{x:1960},{x:len-VW-70,boss:true}],cp:-1,podT:200,evDone:0};
  L.spawns.sort((a,b)=>a.x-b.x);
  L.plats=L.plats.map(q=>[q[0]-8,q[1]+8,q[2]]);
  L.spawns.forEach(s=>{if(s.k==='S')s.k='P';});
  const a=len-VW;L.plats.push([a+30,a+100,136]);L.arenaX=a;
  bullets=[];ebul=[];enemies=[];pickups=[];parts=[];boss=null;cam.x=0;cam.y=0;
  P={x:120,y:GY,vx:0,vy:0,f:1,onG:true,onPlat:false,drop:0,cool:0,inv:60,ax:1,ay:0,crouch:false,t:0,safeX:120,tier:SAVE.gun,helm:SAVE.helmet>0,shieldHits:0,dead:false,deadT:0,kb:0};
  if(SAVE.shield>0){SAVE.shield--;P.shieldHits=3;save();}
  for(const pl of L.plats)for(let i=0;i<3;i++)pickups.push({k:'C',v:1,x:(pl[0]+pl[1])/2+(i-1)*14,y:pl[2]-8,float:true,tt:i*3,onG:true});
  for(let i=0;i<L.ground.length-1;i++){const a=L.ground[i][1],b=L.ground[i+1][0];for(let j=0;j<5;j++){const t=j/4;pickups.push({k:'C',v:j===2?5:1,x:a+(b-a)*t,y:GY-24-Math.sin(t*Math.PI)*34,float:true,tt:j*3,onG:true});}}
  pickups.push({k:'T4',x:2350,y:96,vy:0,vx:0.6,star:1,onG:false,tt:0});
  for(let x=200;x<L.len-500;x+=260)pickups.push({k:'C',v:1,x,y:GY-6,float:true,tt:0,onG:true});
  hp=Math.max(hp,1);setState('level');banner={t:'STAGE '+stage,s:stage>1?'CRUDE CANAL - TOUGHER WORKERS':'CRUDE CANAL',l:150};v7Level();v9Stage();
}
function isGround(x){for(const g of L.ground)if(x>=g[0]&&x<=g[1])return true;return false;}
function land(o,prevB){
  if(o.vy<0)return false;
  const pad=o===P?6:2;for(const g of L.ground)if(o.x>=g[0]-pad&&o.x<=g[1]+pad&&prevB<=GY+0.01&&o.y>=GY){o.y=GY;o.onPlat=false;return true;}
  if(!o.drop)for(const p of L.plats)if(o.x>=p[0]-pad&&o.x<=p[1]+pad&&prevB<=p[2]+4&&o.y>=p[2]){o.y=p[2];o.onPlat=true;return true;}
  return false;
}
function safeGroundX(x){for(const g of L.ground){if(x>=g[0]+12&&x<=g[1]-12)return x;if(g[0]+12>=x)return g[0]+16;}return x;}
function eatTaco(k){const p=P,T=TACO[k.k]||TACO.T1;sfx('nom');tacoBump=12;
  if(k.k==='T1')hp=Math.min(maxHp(),hp+1);else if(k.k==='T2')hp=Math.min(maxHp(),hp+2);else if(k.k==='T3'){hp=maxHp();shake=6;}
  else if(k.k==='T4'){p.star=600;sfx('star');music('star');shake=8;}
  parts.push({x:k.x,y:k.y-10,vx:0,vy:-0.7,l:50,t:'pop',s:0,c:T.n+(k.k==='T1'?' +1':k.k==='T2'?' +2':k.k==='T3'?' FULL HEAL':' STAR POWER!'),col:k.k==='T3'||k.k==='T4'?'rainbow':'#fff6a0'});
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;parts.push({x:k.x,y:k.y-6,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,l:18,t:'tr',s:2,c:k.k==='T2'?'#60f080':k.k==='T1'?'#fff060':HUE(i*26)});}}
function hurtPlayer(){const p=P;if(p.god)return;if(p.star>0||p.giant>0||p.dashT>0||p.inv>0||p.dead||(boss&&boss.dying))return;if(v71Shield())return;hitStop=5;p.hurtT=30;
  if(p.shieldHits>0||p.helm){if(p.shieldHits>0)p.shieldHits--;else p.helm=false;p.inv=60;sfx('ping');shake=4;for(let i=0;i<8;i++){const a=i/8*Math.PI*2;parts.push({x:p.x+Math.cos(a)*12,y:p.y-12+Math.sin(a)*12,vx:Math.cos(a),vy:Math.sin(a),l:14,t:'tr',s:2,c:'#40e0ff'});}return;}hp--;sfx('hurt');shake=6;p.inv=90;p.kb=-p.f*2.2;p.vy=Math.min(p.vy,-1.5);if(hp<=0)killPlayer();}
function killPlayer(){const p=P;p.dead=true;p.deadT=0;p.vy=-3.5;p.vx=-p.f*1.2;starFx(p.x,p.y-12);sfx('boom');}
function respawn(){const p=P;v10Die();lives--;v7Respawn();if(lives<0){setState('over');sfx('over');return;}
  hp=maxHp();p.dead=false;p.tier=Math.max(SAVE.gun,p.tier-1);p.pw=null;p.helm=SAVE.helmet>0;if(L.cp>=0){const c=L.cps[L.cp];p.x=safeGroundX(c.x+8);if(!L.arena){cam.x=clamp(p.x-VW*0.3,0,L.len-VW);}else p.x=Math.max(p.x,cam.x+30);p.safeX=p.x;ebul=[];enemies=enemies.filter(e=>Math.abs(e.x-p.x)>90);}else p.x=safeGroundX(Math.max(cam.x+100,p.safeX));p.y=-10;p.vy=0;p.vx=0;p.mvx=0;if(p.star>0)music(v9Mus());p.star=0;p.inv=150;p.onG=false;p.kb=0;}
function playerBox(){if(P.giant>0)return{x:P.x-10,y:P.y-42,w:20,h:42};const p=P,h=p.crouch?12:p.onG?22:18;return{x:p.x-5,y:p.y-h,w:10,h};}
const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function eBox(e){return{x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h};}
// ===== Spirit powers: each tier changes how the cast BEHAVES =====
// 1 Flint: fast single shot  2 Obsidian: 3-way shard spread  3 Jade: piercing laser
// 4 Turquoise: ricochet rounds (3 bounces)  5 Sun Stone: homing fireballs w/ splash
// 6 Quinto Sol: 5-way golden piercing spread + homing sun orbs, sun-glyph flash + shake
// Hero mods: Coatimundi fires faster, Quetzal's shots curve toward foes, Bison: bigger/harder + knockback
const GUN_CD=[0,11,13,12,13,16,14],HERO_CD=[0.6,1,1.4];
function gunCooldown(){if(P.pw)return Math.max(2,Math.round(PW[P.pw.k].cd*HERO_CD[hero]));return Math.round(GUN_CD[P.tier]*HERO_CD[hero]);}
let shotN=0;
function mkB(k,x,y,a,spd,o){const b=Object.assign({k,x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,spd,r:2,dmg:1,pierce:false,home:0,bounce:0,splash:0,len:0,life:80,hits:[],kb:0},o||{});
  if(hero===2){b.r=Math.round(b.r*1.6+1);b.dmg*=1.8;b.kb=3.2;b.len*=1.3;}
  if(hero===1&&!b.home)b.home=0.035;
  bullets.push(b);return b;}
function fire(){
  const p=P,t=p.tier;shotN++;
  const sy=p.y-(p.crouch?9:p.onG?14:12)+p.ay*6,sx=p.x+p.ax*9+(p.ax?0:p.f*5),a=Math.atan2(p.ay,p.ax);
  if(bullets.length>90)return;
  if(p.pw){firePW(p,sx,sy,a);return;}
  if(t<=1)mkB('flint',sx,sy,a,6.5,{r:2,dmg:1});
  else if(t===2)for(const d of [-0.22,0,0.22])mkB('shard',sx,sy,a+d,5.2,{r:2,dmg:1});
  else if(t===3)mkB('laser',sx,sy,a,8.5,{r:2,dmg:1.3,pierce:true,len:18,life:70});
  else if(t===4)for(const d of [-0.12,0.12])mkB('ric',sx,sy,a+d,5.4,{r:3,dmg:1.5,bounce:3,life:150});
  else if(t===5)for(const d of [-0.18,0.18])mkB('fire',sx,sy,a+d,4.2,{r:4,dmg:2,home:0.12,splash:22,life:120});
  else{for(const d of [-0.34,-0.17,0,0.17,0.34])mkB('gold',sx,sy,a+d,6.5,{r:3,dmg:1.6,pierce:true,len:8,life:80});
    if(shotN%3===0)mkB('orb',sx,sy,a+(Math.random()-0.5)*1.2,3.6,{r:5,dmg:3,home:0.16,splash:28,life:160});}
  const big=hero===2?4:0;
  parts.push({x:sx,y:sy,vx:0,vy:0,l:t>=6?8:4,t:t>=6?'sun':'mf',s:4+t*1.5+big,c:tcol(t,sx)});
  if(t>=6)shake=Math.max(shake,3);else if(hero===2)shake=Math.max(shake,t>=3?2:1);
  sfx(t===3?'laser':t>=5||hero===2?'heavy':'shot');
}
function firePW(p,sx,sy,a){const k=p.pw.k,t=p.tier,m=1+0.15*(t-1),hi=t>=4;
  if(k==='R'){mkB('rapid',sx,sy,a+rnd(-0.04,0.04),7.2,{r:2,dmg:0.8*m});if(hi)mkB('rapid',sx,sy-3,a+rnd(-0.04,0.04),7.2,{r:2,dmg:0.8*m});}
  else if(k==='S'){for(const d of hi?[-0.45,-0.3,-0.15,0,0.15,0.3,0.45]:[-0.3,-0.15,0,0.15,0.3])mkB('spr',sx,sy,a+d,5.6,{r:2,dmg:m});}
  else if(k==='L')mkB('beam',sx,sy,a,10,{r:2,dmg:1.8*m,pierce:true,len:hi?40:30,life:60});
  else if(k==='F'){for(let i=0;i<2;i++)mkB('flame',sx,sy,a+rnd(-0.16,0.16),rnd(3.2,4),{r:3,dmg:0.55*m,pierce:true,life:20+t*2,hue:rnd(0,360)});}
  else if(k==='B'){for(const d of [-0.2,0,0.2])mkB('bnc',sx,sy,a+d,5,{r:3,dmg:1.3*m,bounce:hi?6:4,life:180});}
  else if(k==='H'){for(const d of hi?[-0.5,0,0.5]:[-0.35,0.35])mkB('hom',sx,sy,a+d,4,{r:3,dmg:1.6*m,home:0.15,life:150});}
  else if(k==='X'){const n=hi?12:8;for(let i=0;i<n;i++)mkB('star',p.x,p.y-12,i/n*Math.PI*2+shotN*0.2,4.5,{r:3,dmg:1.2*m,life:50});}
  parts.push({x:sx,y:sy,vx:0,vy:0,l:4,t:'mf',s:5+t,c:PWC[k]});
  if(k!=='F'||shotN%4===0)sfx(k==='L'?'laser':k==='X'||hero===2?'heavy':'shot');
  if(t>=6&&k!=='F'&&k!=='R')shake=Math.max(shake,2);}
function bulletCol(b){if(b.k==='rapid')return '#ff4fb0';if(b.k==='spr')return '#ff9af0';if(b.k==='beam')return HUE(st*10);if(b.k==='flame')return HUE((b.hue||0)+st*8);if(b.k==='bnc')return '#a0ff60';if(b.k==='hom')return '#ff3a8a';if(b.k==='star')return '#fff060';return b.k==='flint'?'#fff0c0':b.k==='shard'?'#b070ff':b.k==='laser'?'#30f080':b.k==='ric'?'#30e8e8':b.k==='fire'?'#ff8a20':b.k==='orb'?'#ffd030':tcol(6,b.x);}
const TDESC=['','FAST SPIRIT SPARK','3-WAY OBSIDIAN FEATHER FAN','PIERCING JADE RAY - HITS A WHOLE LINE','TURQUOISE WISPS - BOUNCE OFF WALLS','SEEKING SUN FLARES THAT BURST','5 GOLDEN RAYS + XIUHCOATL FIRE SERPENTS'];
function tierIcon(x,y,t,s){s=s||1;const r=(a,b,w,h,c)=>R(x+a*s,y+b*s,w*s,h*s,c);
  if(t<=1){r(0,2,5,2,'#d8d0c0');r(4,1,2,4,'#fff0c0');}
  else if(t===2){r(0,0,2,2,'#b070ff');r(2,2,3,2,'#2a1438');r(0,4,2,2,'#b070ff');r(5,2,2,2,'#b070ff');}
  else if(t===3){r(0,2,7,2,'#30f080');r(1,2,5,1,'#e0ffe8');}
  else if(t===4){r(0,4,2,2,'#30e8e8');r(2,2,2,2,'#30e8e8');r(4,4,2,2,'#30e8e8');r(6,1,1,2,'#fff');}
  else if(t===5){r(1,1,5,5,'#ff8a20');r(2,2,3,3,'#ffd030');r(3,3,1,1,'#fff');}
  else{r(2,0,3,7,'#ffd030');r(0,2,7,3,'#ffd030');r(2,2,3,3,'#fff6c0');}}
function tierUp(){const p=P;if(p.tier>=MAXT){addScore(1000);banner={t:'MAX POWER!',s:'+1000',l:60,icon:MAXT};return;}p.tier++;shake=12;sfx('power');
  banner={t:TN[p.tier]+'!',s:'POWER LV'+p.tier+' - '+TDESC[p.tier],l:110,icon:p.tier};
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;parts.push({x:p.x,y:p.y-12,vx:Math.cos(a)*2.6,vy:Math.sin(a)*2.6,l:26,t:'tr',s:3,c:tcol(p.tier,i*5)});}}
function homeIn(b){const range=b.home>=0.1?190:110;let best=null,bd=range;for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-b.x,e.y-e.h/2-b.y);if(d<bd){bd=d;best={x:e.x,y:e.y-e.h/2};}}
  if(boss&&boss.open&&!boss.dying){const c=bossCore(),d=Math.hypot(c.x+12-b.x,c.y+12-b.y);if(d<260){best={x:c.x+12,y:c.y+12};}}
  if(!best)return;const a=Math.atan2(b.vy,b.vx),t=Math.atan2(best.y-b.y,best.x-b.x);let d=t-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;const na=a+clamp(d,-b.home,b.home);b.vx=Math.cos(na)*b.spd;b.vy=Math.sin(na)*b.spd;}
function hitBoss(dmg){dmg*=PWRX*v9Dmg();boss.hp-=dmg;boss.fl=4;sfx('hit');
  if(boss.hp<=0&&!boss.dying){addScore(15000);dropCoins(boss.x,120,40,true);if(boss.kind==='col'){for(let i=0;i<3;i++)pickups.push({k:'C',v:100,x:boss.x+rnd(-36,20),y:110,vx:rnd(-1,1),vy:-2.6,onG:false,tt:0,bounce:1});}pickups.push({k:'T3',x:boss.x,y:110,vy:-2,onG:false,tt:0});hitStop=10;boomFx(boss.x,118,30,true);sfx('boom');shake=14;boss.dying=1;boss.open=true;ebul=[];enemies.forEach(e=>{if(e.t!=='drone')e.dead=true;});}}
function hitEnemy(e,b,dmg){dmg*=v9Dmg();e.hp-=dmg;e.fl=5;sfx('hit');if(b)for(let i=0;i<3;i++)parts.push({x:b.x,y:b.y,vx:-Math.sign(b.vx||1)*rnd(0.5,2),vy:rnd(-1.5,1),l:10,t:'s',s:2});if(b&&b.kb&&e.t!=='pump'){e.x+=Math.sign(b.vx||1)*b.kb;if(e.vx!==undefined&&e.t==='grunt')e.vx*=0.5;}if(e.hp<=0)killEnemy(e);}
function explode(b){parts.push({x:b.x,y:b.y,vx:0,vy:0,l:16,t:'ex',s:b.splash});boomFx(b.x,b.y,6,false);sfx('pop');
  for(const e of enemies){if(e.dead||b.hits.includes(e))continue;if(Math.hypot(e.x-b.x,e.y-e.h/2-b.y)<b.splash+e.w/2)hitEnemy(e,null,b.dmg*0.6);}
  if(boss&&boss.open&&!boss.dying){const c=bossCore();if(Math.hypot(c.x+12-b.x,c.y+12-b.y)<b.splash+12)hitBoss(b.dmg*0.6);}}
function surfaceBelow(x,y0,y1){if(isGround(x)&&y0<GY&&y1>=GY)return GY;for(const q of L.plats)if(x>=q[0]&&x<=q[1]&&y0<q[2]&&y1>=q[2])return q[2];return null;}
function dropCoins(x,y,n,boss){const vs=[];if(boss){vs.push(100,25,25,5,5);n=12;}if(n>=4){vs.push(5);n-=4;}for(;n>0;n--)vs.push(Math.random()<0.06?5:1);for(const v of vs)pickups.push({k:'C',v,x,y,vx:rnd(-1.2,1.2),vy:rnd(-3,-1.5),onG:false,tt:0,bounce:1});}
// v0.6 gems: four real stones. Rose Quartz 1, Turquoise 5, Jade 25, Fire Opal 100 (rare, rainbow)
const GEMS={1:{n:'ROSE QUARTZ',c:'#ff8ac8',d:'#c0408a',l:'#ffe0f2'},5:{n:'TURQUOISE',c:'#30e0d0',d:'#0a8a98',l:'#c8fff8'},25:{n:'JADE',c:'#30d070',d:'#0a7a40',l:'#b8ffd0'},100:{n:'FIRE OPAL',c:'#ff8a40',d:'#c03a60',l:'#fff6c0',rb:1}};
function drawCoin(x,y,t,v){drawGem(x,y,t,v||1);}
function drawGem(x,y,t,v){if(S8OK)return gem8(x,y,t,v);const G=GEMS[v]||GEMS[1],f=Math.floor(t/7)%6,w=[7,6,4,2,4,6][f],big=v>=25?1:0;x=Math.round(x);y=Math.round(y);
  const col=i=>G.rb?HUE(t*8+i*50):G.c,hw=w/2;
  // faceted shape: flat top, two shoulders, pointed pavilion
  R(x-hw+1,y-7-big,Math.max(1,w-2),1,G.l);R(x-hw,y-6-big,w,2+big,col(0));R(x-hw,y-4,w,2,col(1));R(x-hw+1,y-2,Math.max(1,w-2),1,G.rb?col(2):G.d);R(x-hw+2,y-1,Math.max(1,w-4),1,G.rb?col(3):G.d);R(x-0.5,y,1,1,G.d);
  if(w>2){R(x-hw,y-6-big,1,2,'#fff');R(x+hw-1,y-4,1,2,G.d);R(x-1,y-5,1,1,'#fff');}
  if(((t>>2)+x)%9===0||(G.rb&&t%6<2))sparkle(x+2,y-7,2,'#fff6a0');}
function oldCoin(x,y,t){const f=Math.floor(t/6)%4,w=[7,5,2,5][f];
  R(x-w/2,y-5,w,6,'#ff4fb0');R(x-w/2+1,y-7,Math.max(1,w-2),2,'#ff9ad6');R(x-w/2+1,y+1,Math.max(1,w-2),1,'#c02a8a');R(x-0.5,y+2,1,1,'#c02a8a');R(x-w/2,y-5,w,1,'#ffd030');
  if(w>2){R(x,y-6,1,7,'#ffd8f4');R(x-w/2+1,y-4,1,2,'#fff');}if(((t>>2)+Math.round(x))%10===0)sparkle(x+2,y-6,2,'#fff6a0');}
function spawnEnemy(s){const n0=enemies.length;spawnEnemy0(s);for(let i=n0;i<enemies.length;i++)enemies[i].hp=Math.ceil(enemies[i].hp*(1+0.25*(Math.min(stage,9)-1)));}
function spawnSludge(x,y,big,vx){enemies.push({t:'sludge',big,x,y,w:big?18:10,h:big?12:8,hp:big?3:1,vx:vx||0,vy:0,f:-1,fl:0,sc:big?150:50,onG:false,tt:rnd(0,60)});}
function drawSludge(x,y,big,tt,fl){if(S8OK)return sludge8(x,y,big,tt,fl);const w=big?18:10,h=(big?12:8)+Math.round(Math.sin(tt*0.15)*1.5),c=fl?'#fff':'#4a1a7a';R(x-w/2,y-h,w,h,c);R(x-w/2+1,y-h-1,w-2,1,c);R(x-w/2-1,y-3,w+2,3,c);
  if(!fl){for(let i=0;i<w-2;i+=2)R(x-w/2+1+i,y-h+1+((i>>1)%2),2,1,HUE(tt*6+i*18));R(x-w/2+1,y-h,2,1,'#fff');
    R(x-4,y-h+3,3,3,'#fff');R(x+1,y-h+3,3,3,'#fff');R(x-3,y-h+4,2,2,'#2a0a50');R(x+2,y-h+4,2,2,'#2a0a50');R(x-3,y-h+4,1,1,'#fff');R(x+2,y-h+4,1,1,'#fff');R(x-1,y-h+7,2,1,'#ff6ad0');
    for(let i=0;i<w;i+=4)R(x-w/2+i,y,2,1+((i+tt>>3)%2),'#4a1a7a');}}
function spawnEnemy0(s){
  if(s.t==='sludge'){spawnSludge(s.x,GY,true,0);return;}
  if(s.t==='wrench')enemies.push({t:'wrench',x:s.x,y:s.y,w:12,h:24,hp:3,f:-1,tm:40+rnd(0,40),fl:0,sc:300});
  else if(s.t==='pump')enemies.push({t:'pump',x:s.x,y:GY,w:30,h:28,hp:7,f:-1,tm:60,fl:0,sc:600,ph:rnd(0,100)});
  else if(s.t==='barrels'){for(let i=0;i<3;i++)enemies.push({t:'barrel',x:cam.x+VW+20+i*40,y:GY,w:14,h:12,hp:2,vx:-1.6,vy:0,fl:0,sc:100,ph:0,onG:true});}
  else if(s.t==='crate')enemies.push({t:'crate',x:s.x,y:GY,w:14,h:15,hp:3,fl:0,sc:150,g:nextPW(),tt:0});
  else if(s.t==='sensor')enemies.push({t:'sensor',x:s.x,y:GY,w:12,h:22,hp:5,fl:0,sc:400,g:nextPW(),tt:0});
  else if(s.t==='drone')enemies.push({t:'drone',x:cam.x-12,y:50,by:50+rnd(-10,20),w:14,h:12,hp:1,k:s.k,fl:0,sc:200,tt:0});
}
function spawnGrunt(fromLeft,x){const sx=x!==undefined?x:fromLeft?cam.x-10:cam.x+VW+10;if(!isGround(sx))return;
  enemies.push({t:'grunt',helm:Math.random()<0.5?2:1,x:sx,y:GY,w:10,h:22,hp:1,vx:(fromLeft?1:-1)*rnd(1.0,1.35),vy:0,f:fromLeft?1:-1,fl:0,sc:100,onG:true,tt:0});}
function killEnemy(e){v10Kill(e);e.dead=true;godGain(['pump','sensor','crate','wrench'].includes(e.t)||e.big?9:5);parts.push({x:e.x,y:e.y-e.h/2,vx:0,vy:0,l:16,t:'ring',s:0,c:HUE(st*9)});for(let i=0;i<8;i++){const a=i/8*Math.PI*2+rnd(0,0.5);parts.push({x:e.x,y:e.y-e.h/2,vx:Math.cos(a)*rnd(1,2.4),vy:Math.sin(a)*rnd(1,2.4)-0.6,l:rnd(18,28),t:'b',s:rnd(2,4)});}
  if(e.sc>=100&&e.t!=='pod')parts.push({x:e.x,y:e.y-e.h-4,vx:0,vy:-0.6,l:34,t:'pop',s:0,c:String(e.sc),col:'#fff'});
  if(['pump','wrench','crate','sensor'].includes(e.t)||(e.t==='sludge'&&e.big)){hitStop=Math.max(hitStop,3);shake=Math.max(shake,4);}else shake=Math.max(shake,1);if(e.t==='sludge'&&e.big){spawnSludge(e.x-6,e.y-2,false,-1);spawnSludge(e.x+6,e.y-2,false,1);enemies[enemies.length-1].vy=enemies[enemies.length-2].vy=-2.4;}addScore(e.sc);starFx(e.x,e.y-e.h/2);sfx('pop');dropCoins(e.x,e.y-e.h/2,{grunt:1,wrench:2,pump:4,barrel:1,drone:0,sludge:1,crate:2,sensor:3,pod:2}[e.t]||0);if(P.tier>=3)shake=Math.max(shake,3);
  const g=e.g||((e.t==='wrench'&&Math.random()<0.25)||(e.t==='pump'&&Math.random()<0.5)?nextPW():null);if(g){pickups.push({k:'G',g,x:e.x,y:e.y-e.h/2,vy:-2.2,onG:false,tt:0});for(let i=0;i<10;i++)parts.push({x:e.x,y:e.y-e.h/2,vx:rnd(-2,2),vy:rnd(-2,1),l:20,t:'s',s:2});}
  if(e.t==='pump')boomFx(e.x,e.y-14,16,true);if(e.t==='drone')pickups.push({k:e.k==='H'?(Math.random()<0.35?'T2':'T1'):e.k,x:e.x,y:e.y,vy:-1.5,onG:false,tt:0});
  if(e.t==='crate'&&Math.random()<0.3)pickups.push({k:Math.random()<0.25?'T2':'T1',x:e.x+6,y:e.y-8,vy:-2,onG:false,tt:0});
  if(e.t==='wrench'&&Math.random()<0.1)pickups.push({k:'T1',x:e.x,y:e.y-12,vy:-2,onG:false,tt:0});
  if(e.t==='sensor'&&Math.random()<0.12)pickups.push({k:'T4',x:e.x,y:e.y-14,vy:-3,vx:0.7,onG:false,tt:0,star:1});}
function startBoss(){if(L.mictlan){startCol();return;}
  L.arena=true;const mx=bossMx102();
  boss={x:L.len-80,t:0,dying:0,ph:'intro',pt:120,dir:-1,hp:mx,mx,open:false,beam:0,walk:0,fl:0};
  music('boss');banner={t:'WARNING!',s:'BIG DERRICK - SHOOT ITS CRYSTAL WHEN IT GLOWS!',l:150};
}
const bossCore=()=>boss.kind==='col'?{x:boss.x-12,y:120+boss.bob,w:24,h:24}:({x:boss.x-12,y:106,w:24,h:24}),bossBody=()=>boss.kind==='col'?{x:boss.x-40,y:90+boss.bob,w:80,h:58}:({x:boss.x-36,y:96,w:72,h:50}),bossLegs=()=>boss.kind==='col'?{x:boss.x-46,y:150,w:92,h:34}:({x:boss.x-34,y:146,w:68,h:38});
const bossHead=()=>{if(boss.kind==='col')return{x:boss.x-14,y:72+boss.bob+boss.rise*1.3,w:28,h:20,ly:-999};const ly=70+boss.beam*30;return{x:boss.x-58,y:ly-4,w:14,h:22,ly};};
function aimBlob(x,y,spd,off){const a=Math.atan2(P.y-14-y,P.x-x)+(off||0);ebul.push({t:'blob',x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:3,g:0,l:300});}
function updBoss(){
  const b=boss;if(b.kind==='col'){if(!(slowT>0&&(st&1)&&!b.dying))updCol();return;}if(slowT>0&&(st&1)&&!b.dying)return;b.t++;
  if(b.dying){b.dying++;if(b.dying%6===0){boomFx(rnd(b.x-50,b.x+50),rnd(40,180),10,true);sfx('boom');shake=6;}if(b.dying>170){setState('win');winRew=grantReward();sfx('win');}return;}
  if(--b.pt>0){
    if(b.ph==='walk'){b.walk+=0.08;b.x+=b.dir*0.45;const lo=L.len-VW*0.45,hi=L.len-70;if(b.x<lo){b.x=lo;b.dir=1;}if(b.x>hi){b.x=hi;b.dir=-1;}b.beam+=(Math.sin(b.t*0.05)*0.25-b.beam)*0.1;
      if(b.t%60===0){const h=bossHead();aimBlob(h.x+7,h.ly+18,1.9);sfx('blob');}
      if(b.t%230===0)spawnGrunt(true);}
    else if(b.ph==='raise')b.beam+=(-1-b.beam)*0.12;
    else if(b.ph==='slam')b.beam=Math.min(1,b.beam+0.35);
    else if(b.ph==='open'){if(b.pt<100)b.beam+=(0-b.beam)*0.05;}
    return;}
  if(b.ph==='intro'||b.ph==='open'){b.open=false;b.ph='walk';b.pt=150+rnd(0,60);}
  else if(b.ph==='walk'){b.ph='raise';b.pt=45;sfx('throw');}
  else if(b.ph==='raise'){b.ph='slam';b.pt=8;}
  else if(b.ph==='slam'){b.ph='open';b.pt=170;b.open=true;b.beam=1;shake=14;sfx('boom');const h=bossHead();boomFx(h.x+7,GY-4,14,false);
    ebul.push({t:'wave',x:h.x,y:GY-5,vx:-bossWave102(),vy:0,r:5,g:0,l:300});banner={t:'CRYSTAL OPEN!',s:'',l:50,mini:1};}
}
function updLevel(){
  const H=HEROES[hero],p=P;p.t++;v7Upd();if(state!=='level')return;
  if(p.dead){p.deadT++;p.vy+=0.2;p.y+=p.vy;p.x+=p.vx;if(p.deadT>75)respawn();}
  else{
    const l=inp.l,r=inp.r,u=inp.u,d=inp.d;
    p.crouch=p.onG&&d&&!l&&!r;
    if(l&&!r)p.f=-1;if(r&&!l)p.f=1;
    const mv=(p.crouch||(u&&!l&&!r&&p.onG))?0:(r?1:0)-(l?1:0);
    // v0.6 acceleration/deceleration curves with a snappy turnaround (air keeps the old +12% speed)
    const tgt=mv*H.spd*(p.star>0?1.25:1)*(p.onG?1:1.12),cur=p.mvx||0;
    const rate=p.onG?(mv===0?0.42:(cur&&Math.sign(tgt)!==Math.sign(cur)?0.75:0.36)):0.24;
    p.mvx=cur+clamp(tgt-cur,-rate,rate);if(Math.abs(p.mvx)<0.02)p.mvx=0;p.vx=p.mvx;if(p.kb){p.vx+=p.kb;p.kb*=0.85;if(Math.abs(p.kb)<0.2)p.kb=0;}
    let ax,ay;if(p.crouch){ax=p.f;ay=0;}else{ax=(l||r)?p.f:0;ay=u?-1:d?1:0;if(d&&p.onG&&!ax){ay=0;ax=p.f;}if(!ax&&!ay)ax=p.f;}
    p.ax=ax;p.ay=ay;
    // Forgiving jumps: buffer (press up to ~120ms before landing), coyote time (~100ms after leaving a ledge),
    // variable height (hold A to go higher, release to cut it short), a little more height and air speed.
    if(pressed('a'))p.jb=7;else if(p.jb>0)p.jb--;
    if(p.onG)p.coy=6;else if(p.coy>0)p.coy--;
    if(p.onG)p.djU=0;if(p.jb>0&&!p.onG&&p.coy<=0&&!p.dashT&&pressed('a')&&!p.dead){if(p.dash>0){p.dash--;p.jb=0;startDash(false);}else if((p.djU||0)<(p.dj>0?2:1)){p.djU=(p.djU||0)+1;p.jb=0;p.vy=-H.jump*1.18;p.flip=FLIPT;sfx('jump');rainbowBurst(p.x,p.y-6,12);}}
    if(p.jb>0&&(p.onG||p.coy>0)){p.jb=0;if(d&&p.onPlat&&p.onG){p.drop=14;p.onG=false;p.y+=1;}else{p.vy=-H.jump*1.1;p.onG=false;p.coy=0;sfx('jump');p.sqT=6;p.sqV=2;dust(p.x,p.y,4);}}
    if(!inp.a&&p.vy<-1.8)p.vy*=0.8;
    p.vy+=(inp.a&&p.vy<0)?0.19:0.24;p.glide=false;if(H.glide&&inp.a&&p.vy>0.6){p.vy=0.6;p.glide=true;}if(p.vy>5)p.vy=5;if(p.dashT>0)dashStep(p);
    const prevB=p.y,wasG=p.onG,vy0=p.vy;p.x+=p.vx;p.y+=p.vy;if(p.drop>0)p.drop--;
    const maxX=boss&&!boss.dying?boss.x-40:L.len-8;p.x=clamp(p.x,cam.x+6,maxX);tarBlock(p);
    p.onG=land(p,prevB);if(p.onG&&!wasG&&vy0>1.2){p.sqT=7;p.sqV=-2;dust(p.x,p.y,vy0>3.5?8:5);sfx('land');if(vy0>4)shake=Math.max(shake,2);}
    if(p.onG&&Math.abs(p.vx)>1&&p.t%10===0)dust(p.x-p.f*4,p.y,1);if(p.sqT>0)p.sqT--;if(p.rc>0)p.rc=Math.max(0,p.rc-0.5);if(p.hurtT>0)p.hurtT--;
    if(p.star>0){p.star--;if(p.t%2===0)parts.push({x:p.x+rnd(-6,6),y:p.y-rnd(2,22),vx:-p.f*0.4,vy:-0.3,l:16,t:'tr',s:3,c:HUE(p.t*15)});if(p.star===120)sfx('ping');if(p.star===0)music(v9Mus());}
    if(p.onG){p.vy=0;if(!p.onPlat&&isGround(p.x-6)&&isGround(p.x+6))p.safeX=p.x;}
    if(p.y>VH+24){hp--;sfx('hurt');if(hp<=0){p.y=VH;killPlayer();}else{p.x=safeGroundX(Math.max(p.safeX,cam.x+20));p.y=-6;p.vy=0;p.inv=120;}}
    for(let i=L.cp+1;i<L.cps.length;i++){const c=L.cps[i];if(p.x>=c.x){L.cp=i;sfx('pickup');if(c.boss)pickups.push({k:'T3',x:c.x+30,y:GY-40,vy:-2,onG:false,tt:0});banner={t:'CHECKPOINT',s:c.boss?'BOSS AHEAD - RESPAWN HERE':'TOTEM LIT - RESPAWN HERE',l:70,mini:1};for(let k=0;k<16;k++){const a=k/16*Math.PI*2;parts.push({x:c.x,y:GY-30,vx:Math.cos(a)*1.8,vy:Math.sin(a)*1.8,l:22,t:'tr',s:3,c:'#30e8e8'});}}}
    // Hold B to autofire
    if(p.cool>0)p.cool--;if(inp.b&&p.cool<=0){fire();p.cool=gunCooldown();
      // recoil + sparkle casings
      p.rc=hero===2?3:2;if(hero===2&&p.onG&&!mv)p.x-=p.f*0.4;
      if(shotN%2===0)parts.push({x:p.x+p.f*4,y:p.y-14,vx:-p.f*rnd(0.2,0.6),vy:-rnd(0.3,0.8),l:34,t:'cas',s:0,c:HUE(rnd(0,360))});}
    if(p.inv>0)p.inv--;
  }
  // camera: forward as before, and it now follows the player back too (deadzone 30%-42% of the screen), clamped to the level start
  if(!L.arena){const want=(p.f>0&&Math.abs(p.vx)>0.3)?26:6;cam.lead=(cam.lead||0)+(want-(cam.lead||0))*0.035;
    const tg=Math.min(p.x-VW*0.42+cam.lead,L.len-VW),df=tg-cam.x;if(df>0)cam.x+=Math.max(Math.min(df,0.6),df*0.14);else if(cam.x<L.len-VW-0.5){const tb=Math.max(L.camMin||0,p.x-VW*0.3),db=tb-cam.x;if(db<0)cam.x=Math.max(L.camMin||0,cam.x+Math.min(Math.max(db,-0.6),db*0.14));}
    if(cam.x>=L.len-VW-0.5){cam.x=L.len-VW;startBoss();}}
  // spawns
  while(L.si<L.spawns.length&&L.spawns[L.si].x<cam.x+VW+16){spawnEnemy(L.spawns[L.si]);L.si++;}
  // flying weapon pods: several per level, plus the mid-level POD PARADE event
  if(cam.x>60&&--L.podT<=0){L.podT=L.arena?rnd(700,900):rnd(330,450);spawnPod();}
  if(!L.evDone&&cam.x>1420){L.evDone=1;banner={t:'POD PARADE!',s:'BURST THE RAINBOW PODS FOR POWERS',l:120};for(let i=0;i<3;i++)spawnPod(-14-i*36,52+i*22);sfx('power');}
  if(p.pw&&!p.dead&&--p.pw.t<=0){p.pw=null;banner={t:'POWER FADED',s:'BACK TO '+TN[p.tier],l:60};}
  if(!L.arena&&cam.x>120&&--L.gt<=0){L.gt=rnd(80,140);if(enemies.filter(e=>e.t==='grunt').length<4)spawnGrunt(Math.random()<0.22);}
  if(boss){updBoss();if(boss&&!boss.dying&&!p.dead){const pb=playerBox(),h=bossHead();if(ov(pb,bossLegs())||ov(pb,bossBody())||ov(pb,{x:h.x,y:h.y,w:h.w,h:h.h})||(boss.beam>0.7&&ov(pb,{x:h.x+5,y:h.ly+18,w:4,h:GY-h.ly-18})))hurtPlayer();}}
  // enemies
  for(const e of enemies){if(e.fl>0)e.fl--;
    if(slowT>0&&(st&1)){}else if(e.t==='sludge'){e.tt++;if(e.onG){e.vx=(P.x<e.x?-1:1)*(e.big?0.45:0.8);if(e.tt%70===0){e.vy=-2.6;e.onG=false;}}const pb=e.y;e.x+=e.vx;e.vy+=0.2;e.y+=e.vy;e.onG=land(e,pb);if(e.onG)e.vy=0;if(e.y>VH+30||e.x<cam.x-40)e.dead=true;}
    else if(e.t==='grunt'||e.t==='barrel'){e.tt=(e.tt||0)+1;if(e.t==='barrel')e.ph+=Math.abs(e.vx)*0.4;
      if(e.t==='grunt'&&e.onG&&!isGround(e.x+e.vx*10)&&Math.random()<0.6){e.vy=-3.6;e.onG=false;}
      const pb=e.y;e.x+=e.vx;e.vy+=0.2;e.y+=e.vy;e.onG=land(e,pb);if(e.onG)e.vy=0;
      if(e.y>VH+30)e.dead=true;if(e.x<cam.x-40||e.x>cam.x+VW+60)e.dead=true;}
    else if(e.t==='wrench'){e.f=P.x<e.x?-1:1;if(e.x<cam.x+VW-4&&--e.tm<=0){e.tm=105;e.raise=14;const vx=clamp((P.x-e.x)/58,-2.6,2.6);ebul.push({t:'wrench',x:e.x,y:e.y-26,vx,vy:-3.2,r:4,g:0.11,l:200});sfx('throw');}if(e.raise>0)e.raise--;if(e.x<cam.x-30)e.dead=true;}
    else if(e.t==='pump'){e.ph++;if(e.x<cam.x+VW-10&&--e.tm<=0){e.tm=115;const s=Math.sin(e.ph*0.05);aimBlob(e.x-17,e.y-25+15*s*0.35,1.7);sfx('blob');}if(e.x<cam.x-40)e.dead=true;}
    else if(e.t==='drone'){e.tt++;e.x+=1.05;e.y=e.by+Math.sin(e.tt*0.06)*16;if(e.x>cam.x+VW+30)e.dead=true;}
    else if(e.t==='pod'){e.tt++;e.x+=e.vx;e.y=e.by+Math.sin(e.tt*0.05)*22;if(e.tt%4===0)parts.push({x:e.x-8,y:e.y-6,vx:-0.4,vy:0,l:14,t:'tr',s:2,c:HUE(e.tt*8)});if(e.x>cam.x+VW+30)e.dead=true;}
    else if(e.t==='crate'||e.t==='sensor'){e.tt=(e.tt||0)+1;if(e.x<cam.x-40)e.dead=true;}
    if(!e.dead&&!p.dead&&ov(eBox(e),playerBox())){if(p.star>0||p.giant>0){killEnemy(e);sfx('hit');}else if(!NOHURT.includes(e.t))hurtPlayer();}
  }
  // player bullets
  for(const b of bullets){if(b.k==='moon'){b.vx-=b.dir*0.1;b.vy*=0.97;if(Math.sign(b.vx)!==b.dir&&!b.back){b.back=1;b.hits=[];}}if(b.home)homeIn(b);const py=b.y;b.x+=b.vx;b.y+=b.vy;b.life--;if(b.k==='flame'){b.vx*=0.96;b.vy=b.vy*0.96-0.03;b.r+=0.12;}
    if(b.bounce>0){let bo=false;const sf=b.vy>0?surfaceBelow(b.x,py,b.y):null;
      if(sf!==null){b.y=sf-1;b.vy=-Math.abs(b.vy);bo=true;}else if(b.y<8&&b.vy<0){b.vy=Math.abs(b.vy);bo=true;}
      if(b.x<cam.x+3&&b.vx<0||b.x>cam.x+VW-3&&b.vx>0){b.vx=-b.vx;bo=true;}
      if(bo){b.bounce--;b.hits=[];sfx('ping');parts.push({x:b.x,y:b.y,vx:0,vy:-0.5,l:8,t:'s',s:2});}}
    if(b.k!=='flame'&&b.life%2===0)parts.push({x:b.x,y:b.y,vx:-b.vx*0.1,vy:-b.vy*0.1,l:b.k==='fire'||b.k==='orb'?12:8,t:'tr',s:Math.max(2,b.r-1),c:RBOW_K.includes(b.k)?HUE(st*14+b.x*2):bulletCol(b)});if(b.life%6===0)parts.push({x:b.x+rnd(-3,3),y:b.y+rnd(-3,3),vx:0,vy:-0.3,l:10,t:'s',s:2});
    const bb={x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2};
    if(b.len>0){const n=Math.hypot(b.vx,b.vy)||1;bb.x=Math.min(b.x,b.x-b.vx/n*b.len)-b.r;bb.w=Math.abs(b.vx/n*b.len)+b.r*2;bb.y=Math.min(b.y,b.y-b.vy/n*b.len)-b.r;bb.h=Math.abs(b.vy/n*b.len)+b.r*2;}
    if(b.x<cam.x-10||b.x>cam.x+VW+10||b.y<-10||b.y>VH+10)b.life=0;
    if(b.life>0&&v7Bul(b,bb))continue;
    for(const e of enemies){if(e.dead||b.life<=0||b.hits.includes(e))continue;if(ov(bb,eBox(e))){
      if(e.helm>0&&b.y<e.y-15&&!b.pierce){e.helm--;e.fl=3;sfx('ping');parts.push({x:e.x,y:e.y-24,vx:-b.vx*0.2,vy:-1,l:10,t:'s',s:2});if(e.helm===0)parts.push({x:e.x,y:e.y-24,vx:b.vx>0?1.5:-1.5,vy:-2.5,l:40,t:'hat',s:0});if(b.bounce>0){b.vx=-b.vx;b.bounce--;b.hits.push(e);}else b.life=0;break;}
      b.hits.push(e);hitEnemy(e,b,b.dmg);if(b.splash){explode(b);b.life=0;}else if(!b.pierce){if(b.bounce>0){b.vx=-b.vx;b.bounce--;}else b.life=0;}}}
    if(boss&&!boss.dying&&b.life>0){const cb=bossHitBox();
      if(boss.open&&ov(bb,cb)){if(!b.hits.includes(boss)){b.hits.push(boss);hitBoss(b.dmg);if(b.splash){explode(b);b.life=0;}else if(!b.pierce)b.life=0;}}
      else{const h=bossHead();if(ov(bb,bossBody())||ov(bb,bossLegs())||ov(bb,{x:h.x,y:h.y,w:h.w,h:h.h})){
        if(b.bounce>0){b.vx=-Math.abs(b.vx);b.bounce--;sfx('ping');}else{if(b.splash)explode(b);b.life=0;sfx('ping');parts.push({x:b.x,y:b.y,vx:-b.vx*0.2,vy:-1,l:8,t:'s',s:2});}}}}
  }
  bullets=bullets.filter(b=>b.life>0);
  // enemy bullets
  const pbx=playerBox();
  for(const b of ebul){if(slowT>0&&(st&1))continue;b.vy+=b.g;b.x+=b.vx;b.y+=b.vy;b.l--;
    if(b.t==='lob'&&b.vy>0&&b.y>=GY-6&&isGround(b.x)){b.l=0;enemies.push({t:'barrel',x:b.x,y:GY,w:14,h:12,hp:2,vx:-1.7,vy:0,fl:0,sc:100,ph:0,onG:true});continue;}
    if(b.y>VH+10||b.x<cam.x-20||b.x>cam.x+VW+20)b.l=0;
    if(b.l>0&&!p.dead&&ov({x:b.x-b.r+1,y:b.y-b.r+1,w:b.r*2-2,h:b.r*2-2},pbx)){b.l=0;hurtPlayer();}}
  ebul=ebul.filter(b=>b.l>0);enemies=enemies.filter(e=>!e.dead);
  // pickups
  for(const k of pickups){k.tt++;
    if(k.k==='C'&&!p.dead&&Math.hypot(k.x-p.x,k.y-(p.y-10))<34&&!k.float){k.x+=(p.x-k.x)*0.15;k.y+=(p.y-10-k.y)*0.15;}
    else if(!k.onG&&!k.float){const pb=k.y;k.vy=Math.min(k.vy+0.12,2.5);k.y+=k.vy;if(k.vx){k.x+=k.vx;k.vx*=0.98;}const was=k.vy;k.onG=land(k,pb);if(k.onG&&k.bounce&&was>1){k.bounce=0;k.onG=false;k.vy=-1.6;}if(k.y>VH+20)k.gone=true;}
    const kb=k.k==='C'?{x:k.x-5,y:k.y-8,w:10,h:10}:{x:k.x-6,y:k.y-11,w:12,h:11};
    if(!p.dead&&ov(kb,pbx)){k.gone=true;
      if(k.k==='C'){godGain(k.v>=100?20:k.v>=25?8:k.v>=5?3:1);runGems+=k.v;addScore(k.v*10);gemBump=10;sfx(k.v>=25?'gem3':k.v>=5?'gem2':'gem');save();parts.push({x:k.x,y:k.y-6,vx:0,vy:-0.8,l:k.v>1?40:26,t:'pop',s:0,c:'+'+k.v+' '+(GEMS[k.v]||GEMS[1]).n,col:k.v>=100?'rainbow':(GEMS[k.v]||GEMS[1]).l});if(k.v>=25)for(let i=0;i<10;i++){const a=i/10*Math.PI*2;parts.push({x:k.x,y:k.y-4,vx:Math.cos(a)*1.6,vy:Math.sin(a)*1.6,l:18,t:'tr',s:2,c:HUE(i*36)});}}
      else if(k.k==='G'){addScore(300);givePW(k.g);}
      else if(k.k[0]==='T'){addScore(200);eatTaco(k);}
      else if(k.k==='D'){P.dash=Math.min(3,(P.dash||0)+1);sfx('zap');pop(k.x,k.y-20,'+1 LIGHTNING DASH','#7af8ff');}
      else{sfx('pickup');addScore(500);if(k.k==='P')tierUp();else{hp=Math.min(maxHp(),hp+2);banner={t:'HEALTH +2',s:'',l:60};}}}
    if(k.star&&k.x>cam.x&&k.x<cam.x+VW){k.x+=k.vx||0;if((k.x<cam.x+10&&k.vx<0)||(k.x>cam.x+VW-10&&k.vx>0))k.vx=-k.vx;if(k.onG){k.onG=false;k.vy=-3.2;}}
    if(k.x<cam.x-20||(!k.float&&!k.star&&k.tt>900))k.gone=true;}
  pickups=pickups.filter(k=>!k.gone);
}

// ===== Level rendering =====
const hsh=n=>{n=(n^61)^(n>>>16);n=Math.imul(n,9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return n>>>0;};
function cloud(x,y,w){x=Math.round(x);y=Math.round(y);R(x+4,y,w-8,3,'#ffffff');R(x,y+3,w,4,'#ffffff');R(x+2,y+7,w-4,2,'#f4e8ff');R(x+6,y-2,w*0.35,2,'#ffffff');}
function haze(a,c){X.globalAlpha=a;X.fillStyle=c;X.fillRect(-4,-4,VW+8,VH+8);X.globalAlpha=1;}
// foreground props drawn in front of everything at 1.25x parallax along the bottom edge, never over the walking line
function foreground(ox){const cx=cam.x*1.25;for(let k=Math.floor(cx/70)-1;k<Math.floor(cx/70)+9;k++){const h=hsh(k*31+7),x=k*70-cx+(h%40),wx=(x+cx)/1.25;if(!isGround(wx))continue;const sewer=wx<L.sewerEnd;
  if(sewer){if(h%3===0){R(x,VH-9,18,9,'#3a1a78');R(x+1,VH-8,16,1,'#c090ff');for(let i=0;i<4;i++)R(x+2+i*4,VH-6,2,6,'#24104a');}else if(h%3===1){R(x,VH-14,6,14,'#30d0c0');R(x,VH-14,6,2,'#c0fff0');R(x-1,VH-16,8,2,'#ff6ad0');}}
  else if(S8OK){if(h%3<2)fg8(x,h);}else{if(h%3===0){R(x,VH-7,3,7,'#40c070');R(x+3,VH-10,3,10,'#50e080');R(x+6,VH-6,3,6,'#40c070');R(x+3,VH-12,3,3,h%2?'#ff6ad0':'#fff060');R(x+4,VH-11,1,1,'#fff');}
    else if(h%3===1){R(x,VH-8,12,8,'#ff9ad6');R(x+2,VH-10,8,2,'#ffb8e6');R(x+3,VH-7,2,2,'#fff');R(x+7,VH-6,2,2,'#fff060');}}}}
function zone(sewer){
  const cx=cam.x;
  if(sewer){
    R(0,0,VW,VH,'#2a0f5a');
    const pf=cx*0.3;for(let k=Math.floor(pf/120)-1;k<Math.floor(pf/120)+5;k++){const ax=k*120-pf;R(ax,40,80,GY-40,'#341470');R(ax+8,32,64,8,'#341470');R(ax+20,26,40,6,'#341470');R(ax+30,GY-60,20,60,'#2a0f5a');}
    const po=cx*0.6;
    for(let y=0;y<GY;y+=8){R(0,y,VW,1,'#3a1a78');const o=((y/8)%2)*8;for(let x=-((po+o)%16);x<VW;x+=16)R(x,y,1,8,'#3a1a78');}
    if(S8OK)arches8(cx);else for(let k=Math.floor(po/170)-1;k<Math.floor(po/170)+4;k++){const ax=k*170-po+40;R(ax,70,64,GY-70,'#14052e');R(ax+6,64,52,6,'#14052e');R(ax+14,60,36,4,'#14052e');R(ax-4,70,4,GY-70,'#c050e0');R(ax+64,70,4,GY-70,'#c050e0');R(ax-4,70,4,2,'#ffb0f0');R(ax+64,70,4,2,'#ffb0f0');
      R(ax+20,GY-30,24,30,'#1a3a6a');R(ax+22,GY-28,2,2,'#7af8ff');}
    haze(0.12,'#b090f0');
    const p2=cx*0.8;for(let k=Math.floor(p2/240)-1;k<Math.floor(p2/240)+3;k++){const px=k*240-p2;R(px,34,200,4,'#6a3ab0');R(px,34,200,1,'#c79bff');R(px+60,40,4,(st*2+k*30)%60,HUE(st*4+k*60));
      for(let d=0;d<3;d++){const dx=px+30+((hsh(k*7+d)%160)),dy=38+((st*1.6+d*47+k*29)%(GY-38));R(dx,38,3,2,'#8a5ad8');if(dy<GY-3){R(dx+1,dy,1,2,'#9af8ff');R(dx+1,dy-2,1,1,'#c8fcff');}else{R(dx-1,GY-2,1,1,'#9af8ff');R(dx+3,GY-2,1,1,'#9af8ff');}}}
    twinkles(st,46,GY-10,cx);
  }else{
    const bands=['#ff5ac8','#ff7ad6','#e090ff','#a8a0ff','#7ac8ff','#7af0f0','#b8ffd8'];bands.forEach((c,i)=>R(0,i*18,VW,18,c));R(0,126,VW,60,'#b8ffd8');
    for(let k=0;k<6;k++){const w=26+(k*11)%24,x=((k*97-cx*0.06-st*0.12)%(VW+80)+VW+80)%(VW+80)-50;cloud(x,14+(k*17)%46,w);}
    twinkles(st,26,100,cx*0.05);
    rainbowArc(Math.round(VW*0.62-cx*0.02),150,70,0.85);
    X.fillStyle='#c08aff';for(let x=0;x<VW;x+=2){const wx=x+cx*0.15,h=26+Math.sin(wx*0.02)*10+Math.sin(wx*0.007)*14;X.fillRect(x,140-h,2,h+50);}
    const pt=cx*0.25;if(S8OK)city8(cx);else for(let k=Math.floor(pt/60)-1;k<Math.floor(pt/60)+10;k++){const h=hsh(k+99),x=k*60-pt,th=30+h%40;R(x,140-th,14+h%10,th,'#d8b0ff');R(x+3,140-th-6,4,6,'#d8b0ff');if((st>>5)%3===h%3)R(x+5,140-th+6,2,2,'#fff6a0');}
    haze(0.16,'#fff4fc');
    const p3=cx*0.35;
    if(S8OK)towers8(cx);else for(let k=Math.floor(p3/200)-1;k<Math.floor(p3/200)+4;k++){const bx=k*200-p3;X.fillStyle=k%2?'#9a6ae8':'#e070d0';X.fillRect(bx+10,104,10,60);X.fillRect(bx+40,124,40,50);X.fillRect(bx+46,116,28,8);X.fillRect(bx+100,90,6,80);X.fillRect(bx+120,130,60,40);X.fillRect(bx+130,122,14,8);X.fillRect(bx+160,122,14,8);
      for(let i=0;i<3;i++){const tw=((st>>4)+i*3+k*5)%7;R(bx+13,108+i*10,3,3,tw===0?'#ffffff':'#7af8ff');R(bx+46,128+i*8,3,2,tw===3?'#ff9ad6':'#fff6a0');R(bx+124,136+i*10,3,3,tw===5?'#fff':'#a0f8ff');}heartC(bx+100,82-(Math.floor(st/5+k)%2)*2,'#ff4fb0');}
    const p4=cx*0.7;for(let k=Math.floor(p4/90)-1;k<Math.floor(p4/90)+7;k++){const fx=k*90-p4;R(fx,150,2,34,'#ffb0e0');}R(0,152,VW,1,'#ffb0e0');R(0,162,VW,1,'#ffb0e0');
  }
  // pits: gooey rainbow-sheen tar
  const gl=L.ground;for(let i=0;i<gl.length-1;i++){const a=gl[i][1]-cx,b=gl[i+1][0]-cx;if(b<0||a>VW)continue;
    R(a,GY+10,b-a,VH,'#3a0f6a');for(let x=a;x<b;x+=4)R(x,GY+9+Math.round(Math.sin((x+cx)*0.3+st*0.1)),4,2,HUE((x+cx)*4+st*3));
    for(let x=a+3;x<b-3;x+=9)R(x,GY+16+((x+st)>>3)%4,2,1,'#fff');}
  // ground
  for(const g of gl){const a=g[0]-cx,b=g[1]-cx;if(b<0||a>VW)continue;
    if(sewer){R(a,GY,b-a,VH-GY,'#4a2a90');R(a,GY,b-a,3,'#c090ff');R(a,GY+3,b-a,1,'#3a1a78');for(let y=GY+8;y<VH;y+=8){R(a,y,b-a,1,'#3a1a78');}for(let x=a-((cx)%16);x<b;x+=16)if(x>=a)R(x,GY+4,1,VH,'#3a1a78');
      for(let ti=Math.floor((a+cx)/16);ti<Math.ceil((b+cx)/16);ti++){const h=hsh(ti),x=ti*16-cx;if(x<a||x>b-16)continue;const v=h%9;if(v===0){R(x+3,GY+3,5,1,'#50e090');R(x+4,GY+4,2,1,'#30a060');}else if(v===1){R(x+5,GY+10,1,4,'#2a1060');R(x+6,GY+13,2,1,'#2a1060');}else if(v===2){R(x+6,GY+6,2,2,'#ffd8ff');}else if(v===3){const g=0.45+0.25*Math.sin(st*0.08+ti);X.globalAlpha=g;R(x+1,GY+1,14,2,HUE(ti*40+st*2));R(x+3,GY,10,1,HUE(ti*40+st*2+40));X.globalAlpha=1;}}}
    else{R(a,GY,b-a,VH-GY,'#d060c0');R(a,GY,b-a,3,'#7af0c0');R(a,GY+3,b-a,1,'#a040a0');
      for(let ti=Math.floor((a+cx)/16);ti<Math.ceil((b+cx)/16);ti++){const h=hsh(ti+5000),x=ti*16-cx;if(x<a||x>b-16)continue;const v=h%8,y=GY+7+(h>>4)%14;
        if(v===0){R(x+5,y,3,3,'#fff060');R(x+6,y+1,1,1,'#ff6ad0');}else if(v===1){R(x+3,y,4,2,'#e8a0e0');R(x+4,y,2,1,'#ffd8f4');}else if(v===2){heartC(x+5,y,'#ff9ad6');}else if(v===3){R(x+2,y+2,7,1,'#b04ab0');R(x+8,y+3,3,1,'#b04ab0');}else if(v===4){R(x+4,GY,1,2,'#50e090');R(x+6,GY-1,1,3,'#50e090');R(x+8,GY,1,2,'#50e090');}else if(v===5){R(x+3,y,2,2,'#ffd8f4');R(x+9,y+4,2,2,'#ffd8f4');}}}
    R(a,GY,2,VH-GY,'#5a1a8a');R(b-2,GY,2,VH-GY,'#5a1a8a');}
  // platforms: candy-striped
  for(const p of L.plats){const a=p[0]-cx,w=p[1]-p[0];if(a+w<0||a>VW)continue;
    if(sewer){R(a,p[2],w,6,'#30d0c0');R(a,p[2],w,1,'#c0fff0');R(a,p[2]+5,w,1,'#108a8a');for(let x=a;x<a+w;x+=24)R(x,p[2]-1,3,8,'#ff6ad0');}
    else{R(a,p[2],w,6,'#ff6ad0');for(let x=a;x<a+w;x+=6)R(x,p[2]+1,3,4,'#ffe0f6');R(a,p[2],w,1,'#fff');R(a,p[2]+5,w,1,'#b02a8a');for(let x=a+6;x<a+w;x+=28){R(x+1,p[2]+6,2,GY-p[2]-6,'#c79bff');}}}
}
function drawLevel(){
  const se=L.sewerEnd-cam.x;
  if(L.mictlan)caveZone();else{if(se>0){X.save();X.beginPath();X.rect(0,0,Math.min(VW,se),VH);X.clip();zone(true);X.restore();}
  if(se<VW){X.save();X.beginPath();X.rect(Math.max(0,se),0,VW,VH);X.clip();zone(false);X.restore();}
  if(se>-20&&se<VW+20){R(se-8,0,16,GY,'#5a30b0');R(se-8,0,2,GY,'#c07aff');for(let y=8;y<GY;y+=16)R(se-2,y,4,4,HUE(y*4+st*4));R(se-8,90,16,94,'#14052e');R(se-10,86,20,4,'#ff6ad0');}
  }
  const ox=-cam.x;v7Back(ox);
  for(let i=0;i<L.cps.length;i++)drawTotem(L.cps[i].x+ox,i<=L.cp,L.cps[i].boss);
  for(const k of pickups){if(k.k==='C')drawGem(k.x+ox,k.y+(k.float?Math.round(Math.sin((k.tt+k.x)*0.08)*1.5):0),k.tt,k.v);else if(k.k==='G'){gunBadge(Math.round(k.x+ox-5),Math.round(k.y-11),k.g,1,k.tt);if(k.tt%10<3)sparkle(Math.round(k.x+ox+5),Math.round(k.y-12),2,'#fff');}else drawPickup(k.x+ox,k.y,k.k,k.tt);}
  actors(()=>{if(boss&&!(L.mictlan&&boss.kind==='col'))drawBoss(ox);v7Actors(ox);
  for(const e of enemies){const sx=e.x+ox,fl=e.fl>0;
    if(e.t==='grunt')drawWorker(sx,e.y,e.f,e.tt,'run',fl,false,e.helm>0?e.helm:-1);else if(e.t==='sludge')drawSludge(sx,e.y,e.big,e.tt,fl);else if(e.t==='wrench')drawWorker(sx,e.y,e.f,0,'stand',fl,e.raise>0);
    else if(e.t==='pump')drawPump(sx,e.y,e.ph,fl);else if(e.t==='barrel')drawBarrel(sx,e.y,e.ph,fl);else if(e.t==='drone')drawDrone(sx,e.y,e.tt,e.k,fl);else if(e.t==='pod')drawPod(sx,e.y,e.g,e.tt,fl);else if(e.t==='crate')drawCrate(sx,e.y,fl);else if(e.t==='sensor')drawSensor(sx,e.y,e.tt,e.g,fl);}
  const p=P;
  if(!(p.inv>0&&Math.floor(p.inv/3)%2&&!p.dead)){const pose=p.dead?'jump':!p.onG?(p.vy<0?'jump':'fall'):p.crouch?'crouch':Math.abs(p.vx)>0.25?'run':'stand';
    const hx=Math.round(p.x+ox),hy=Math.round(p.y);if(p.tier>=5&&!p.dead&&p.t%3===0)parts.push({x:p.x+rnd(-8,8),y:p.y-rnd(0,24),vx:0,vy:-0.5,l:14,t:'tr',s:2,c:tcol(p.tier,p.t)});
    const strobe=p.star>0&&(p.star>120?(p.t>>1)%2:(p.t>>3)%2);
    if(p.giant>0){X.save();X.translate(hx,hy);X.scale(2,2);X.translate(-hx,-hy);}
    drawHero(hx,hy,hero,{flip:p.flip||0,f:p.f,pose,t:p.t,ax:p.ax,ay:p.ay,glide:p.glide,sq:p.sqT>0?p.sqV:0,rc:Math.round(p.rc||0),hurt:p.hurtT>0,sil:strobe?HUE(p.t*18,70):p.giant>0&&(p.t>>3)%3===0?HUE(300+Math.sin(p.t*0.1)*40,82):p.dashT>0?((p.t&1)?'#7af8ff':'#ffffff'):null});if(p.giant>0){X.restore();if(p.giant<90&&(p.t>>2)%2){}}
    if(p.helm&&!p.dead){const top=hy-(pose==='crouch'?17:(pose==='jump'||pose==='fall')?21:24);R(hx-5,top-1,10,3,'#f8c020');R(hx-1,top-3,2,2,'#40e0d0');R(hx-5,top+1,10,1,'#a07010');}
    if(p.shieldHits>0&&!p.dead){X.globalAlpha=0.35+0.15*Math.sin(st*0.2);const c='#40e0ff';for(let a=0;a<24;a++){const t=a/24*Math.PI*2;R(hx+Math.cos(t)*14-1,hy-12+Math.sin(t)*15-1,2,2,c);}X.globalAlpha=1;}}},1);
  drawMagicL(ox);
  for(const b of ebul){const x=b.x+ox;if(b.t==='blob'){R(x-3,b.y-3,6,6,'#101018');R(x-2,b.y-4,4,1,'#101018');R(x-1,b.y-2,2,1,'#8a6ae8');}
    else if(b.t==='wrench'){const f=Math.floor(st/4)%4;if(f%2===0){R(x-4,b.y-1,8,2,'#b0b8c8');R(x+(f?-5:3),b.y-3,2,6,'#b0b8c8');}else{R(x-1,b.y-4,2,8,'#b0b8c8');R(x-3,b.y+(f>1?-5:3),6,2,'#b0b8c8');}}
    else if(b.t==='wave'){const k=Math.floor(st/3)%2;R(x-6,GY-10+k,12,10-k,'#1a1220');R(x-4,GY-13+k,8,3,'#1a1220');R(x-3,GY-12+k,2,1,'#7a5ac8');}
    else drawBarrel(x,b.y+6,st*0.3,false);}
  v7Front(ox);drawParts(ox);if(L.mictlan){caveDark(ox);if(boss&&boss.kind==='col')actors(()=>drawBoss(ox),1);}else foreground(ox);v7Top(ox);
}
function drawTotem(x,on,bossCp){if(S8OK)return totem8(x,on,bossCp);if(x<-20||x>VW+20)return;const y=GY;
  R(x-6,y-34,12,34,on?'#30e0c0':'#8a7aa0');R(x-6,y-34,12,2,on?'#c0fff0':'#b0a0c8');
  for(let k=0;k<3;k++){const yy=y-31+k*11;R(x-5,yy+2,3,3,on?'#fff':'#5a4a70');R(x+2,yy+2,3,3,on?'#fff':'#5a4a70');if(on){R(x-4,yy+3,1,1,'#5a1090');R(x+3,yy+3,1,1,'#5a1090');}R(x-3,yy+7,6,1,on?'#ff4fb0':'#5a4a70');}
  R(x-1,y-48,2,14,'#ffd8f4');const w=Math.sin(st*0.15)*1.5;
  if(on){R(x+1,y-48,9,6,bossCp?'#ff3a6a':'#ff6ad0');R(x+8+w,y-46,3,3,bossCp?'#ff3a6a':'#ff6ad0');heartC(x+3,y-48,'#fff');if(st%5===0)parts.push({x:x-ox0(),y:y-50,vx:rnd(-0.2,0.2),vy:-0.6,l:14,t:'tr',s:2,c:HUE(st*8)});}
  else R(x+1,y-48,8,5,'#b0a0c8');}
function ox0(){return -cam.x;}
function drawBoss(ox){
if(S8OK&&boss.kind!=='col')return rig8(ox);
  if(boss.kind==='col'){drawCol(ox);return;}const b=boss,x=Math.round(b.x+ox),fl=b.fl>0&&Math.floor(st/2)%2,c=k=>fl?'#fff':k;if(b.fl>0)b.fl--;
  [[-24,0],[20,Math.PI]].forEach(([lx,o])=>{const s=b.ph==='walk'?Math.sin(b.walk+o)*5:0,lift=b.ph==='walk'?Math.max(0,Math.cos(b.walk+o))*3:0;
    R(x+lx-5,144,10,16,c('#7a4ad0'));R(x+lx-6+s,158-lift,12,20,c('#5a30b0'));R(x+lx-11+s,178-lift,22,6,c('#3a1a80'));R(x+lx-2+s*0.5,156-lift,5,5,'#f8d020');});
  R(x-36,96,72,50,c('#c07aff'));R(x-36,96,72,3,c('#f0c0ff'));for(let i=0;i<72;i+=8)R(x-36+i,140,4,6,'#f8d020');R(x-36,96,3,50,c('#5a30b0'));R(x+33,96,3,50,c('#5a30b0'));
  txt('CRUDE CO',x,134,'#f8e040',1,1,null);
  const cb=bossCore();const cx=cb.x+ox;R(cx-2,cb.y-2,28,28,c('#3a1a80'));
  if(b.open&&!b.dying||b.dying){const g=Math.floor(st/5)%2?'#ff3a9a':'#30e0ff';R(cx,cb.y,24,24,fl?'#fff':'#fff6a0');R(cx+3,cb.y+3,18,18,g);R(cx+5,cb.y+7,5,4,'#5a1090');R(cx+14,cb.y+7,5,4,'#5a1090');R(cx+6,cb.y+15,12,3,'#5a1090');
    if(!b.dying&&st%4===0)parts.push({x:b.x+rnd(-10,10),y:cb.y,vx:rnd(-0.4,0.4),vy:-0.8,l:14,t:'tr',s:3,c:'#30e0ff'});}
  else{for(let y=0;y<24;y+=5)R(cx,cb.y+y,24,4,c('#d8c0ff'));}
  R(x+24,40,8,56,c('#8a5ae0'));R(x+23,38,10,4,c('#c07aff'));if(st%6===0)parts.push({x:b.x+28,y:36,vx:rnd(-0.3,0.3),vy:-0.6,l:40,t:'smoke',s:3});
  R(x-3,64,6,32,c('#ff6ad0'));R(x-12,90,24,6,c('#ff6ad0'));
  for(let i=-52;i<=42;i+=2)R(x+i,70+(-i/50)*b.beam*30-1,2,4,c('#30e0ff'));
  R(x-2,68,4,4,'#5a30b0');
  const h=bossHead(),hx=h.x+ox;R(hx,h.y,h.w,h.h,c('#ff4fb0'));R(hx-2,h.y+2,3,h.h-6,c('#ff4fb0'));R(hx+3,h.y+4,3,3,'#f8e040');R(hx+2,h.y+h.h-3,10,3,c('#b02a80'));
  if(b.beam>0.3)R(hx+5,h.ly+18,4,GY-h.ly-18,c('#e0f0ff'));
  const cwy=70-b.beam*24;R(x+36,cwy-4,12,12,c('#5a30b0'));R(x+38,cwy-2,8,8,c('#7a4ad0'));
  if(!b.dying){const w=110;R(VW/2-w/2-1,14,w+2,5,'#000');R(VW/2-w/2,15,w*Math.max(0,b.hp)/b.mx,3,'#ff3a9a');txt(v9BN(),VW/2,21,'#fff',1,1);}
}
function dust(x,y,n){for(let i=0;i<n;i++)parts.push({x:x+rnd(-4,4),y:y-1,vx:rnd(-0.8,0.8),vy:-rnd(0.1,0.5),l:rnd(12,20),t:'dust',s:rnd(2,3)});}
function updParts(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.l--;if(p.t==='dust'){p.vx*=0.9;p.s+=0.08;}if(p.t==='cas'){p.vy-=0.01;p.vx*=0.96;}if(p.t==='pop'){p.vy*=0.93;}if(p.t==='txt2'){p.vy*=0.95;}if(p.t==='flw'||p.t==='spore'){p.vx*=0.97;p.vy*=0.97;}if(p.t==='leaf'){p.vy+=0.05;p.vx*=0.96;}if(p.t==='b'){p.vx*=0.92;p.vy*=0.92;p.s+=0.15;}if(p.t==='smoke')p.s+=0.05;if(p.t==='tr')p.s*=0.93;if(p.t==='hat')p.vy+=0.15;}parts=parts.filter(p=>p.l>0);if(parts.length>300)parts.splice(0,parts.length-300);}
function drawParts(ox){for(const p of parts){const x=p.x+ox;
  if(p.t==='b'){const c=p.l>26?'#fff':HUE(p.x*3+p.l*12);const s=Math.round(p.s);R(x-s/2,p.y-s/2,s,s,c);}
  else if(p.t==='s'){if(p.l%4<2)sparkle(x,p.y,1,HUE(p.x*5+st*6));else R(x-1,p.y-1,2,2,'#fff');}
  else if(p.t==='smoke'){const s=Math.round(p.s);R(x-s/2,p.y-s/2,s,s,'rgba(255,190,240,0.6)');R(x-s/2,p.y-s/2,1,1,'#fff');}
  else if(p.t==='pow')txt(p.c||'POW!',x,p.y-14,p.l%6<3?'#fff6a0':'#ff4fb0',1,1,'#5a1090');
  else if(p.t==='mf'){const s=p.s*(p.l/4);X.globalAlpha=0.5;R(x-s/2-2,p.y-s/2-2,s+4,s+4,p.c);X.globalAlpha=1;R(x-s/2,p.y-s/2,s,s,'#fff');R(x-s,p.y-0.5,s*2,1,p.c);R(x-0.5,p.y-s,1,s*2,p.c);}
  else if(p.t==='hat'){R(x-4,p.y,8,3,'#ffe040');R(x-5,p.y+2,10,1,'#ff9ad6');}
  else if(p.t==='sun'){const s=p.s*(0.6+p.l/14);X.globalAlpha=0.55;R(x-s/2,p.y-s/2,s,s,'#ffd030');X.globalAlpha=1;R(x-s/4,p.y-s/4,s/2,s/2,'#fff6c0');for(let k=0;k<8;k++){const a=k/8*Math.PI*2+st*0.1;R(x+Math.cos(a)*s*0.75-1,p.y+Math.sin(a)*s*0.75-1,2,2,HUE(k*45+st*6));}}
  else if(p.t==='tr'){X.globalAlpha=Math.min(1,p.l/8);R(x-p.s/2,p.y-p.s/2,p.s,p.s,p.c);X.globalAlpha=1;}
  else if(p.t==='ex'){const s=p.s*(1.2-p.l/20);X.globalAlpha=Math.min(1,p.l/10);R(x-s/2,p.y-s/2,s,s,p.l>10?'#fff6c0':HUE(st*10));X.globalAlpha=1;}
  else if(p.t==='flw'){const xx=Math.round(x),yy=Math.round(p.y);X.globalAlpha=Math.min(1,p.l/20);R(xx-1,yy-2,2,1,p.c);R(xx-1,yy+1,2,1,p.c);R(xx-2,yy-1,1,2,p.c);R(xx+1,yy-1,1,2,p.c);R(xx-1,yy-1,2,2,'#fff060');X.globalAlpha=1;}
  else if(p.t==='spore'){X.globalAlpha=Math.min(1,p.l/20)*(0.6+0.4*Math.sin(p.l*0.3));R(x-1,p.y-1,2,2,p.c);R(x,p.y,1,1,'#fff');X.globalAlpha=1;}
  else if(v71PD(p,x)){}
  else if(p.t==='txt2')txt(p.c,x,p.y,p.col,1,1,'#1a0838');
  else if(p.t==='txt')txt(p.c,x,p.y,'#fff6a0',1,1,'#c0208a');
  else if(p.t==='pop'){if(p.l>4||st%2)txt(p.c,Math.round(x),Math.round(p.y),p.col||'#fff6a0',1,1,'#5a1090');}
  else if(p.t==='dust'){X.globalAlpha=Math.min(0.75,p.l/16);const s=Math.round(p.s);R(x-s/2,p.y-s/2,s,s,'#fff0fa');R(x-s/2,p.y+s/2-1,s,1,'#e0b0e8');X.globalAlpha=1;}
  else if(p.t==='cas'){X.globalAlpha=Math.min(1,p.l/14);R(x,p.y,1,1,p.c);if((p.l>>2)%2)R(x-1,p.y,3,1,p.c);R(x,p.y-1,1,3,(p.l>>2)%2?'#fff':p.c);X.globalAlpha=1;}
  else if(p.t==='ring'){const r=(16-p.l)*1.6+3;for(let k=0;k<14;k++){const a=k/14*Math.PI*2;R(x+Math.cos(a)*r,p.y+Math.sin(a)*r,1,1,p.l>8?'#fff':p.c);}}}}
function hud(){
  const H=HEROES[hero];txt(H.name,6,5,'#fff',1,0,'#7a1aa0');
  for(let i=0;i<maxHp();i++){const bump=(i===hp-1&&tacoBump>0)?-1:0;heart(8+i*11,12+bump,i<hp);}
  txt('LIVES '+Math.max(0,lives),6,21,'#fff',1,0,'#7a1aa0');
  let yy=29;
  if(state==='level'){tierIcon(46,21,P.tier,1);txt(TN[P.tier],56,21,tcol(P.tier),1,0,'#5a1090');
    if(P.pw){const k=P.pw.k;gunBadge(6,28,k,1);txt(PW[k].n,18,30,PWC[k],1,0,'#5a1090');R(18,36,44,2,'#3a1a6a');R(18,36,44*P.pw.t/PW_T,2,HUE(st*6));yy=40;}
    if(P.shieldHits>0)txt('SHIELD '+P.shieldHits,6,yy,'#7af8ff',1,0,'#5a1090');}
  dispScore+=score>dispScore?Math.max(1,Math.ceil((score-dispScore)*0.18)):score-dispScore;
  const gb=gemBump>5?-1:0;drawGem(VW/2-18,15+gb,st,1);txt(String(runGems),VW/2-10,14+gb,gemBump>0?'#ffffff':'#fff6a0',1,0,'#c0208a');
  txt(String(dispScore).padStart(7,'0'),VW/2,5,'#fff',1,1,'#7a1aa0');
  if(banner&&banner.mini)v71Mini();
  else if(banner){const by=Math.round(70-(1-easeBack((banner.age||0)/14))*24);X.save();X.translate(0,by-70);const bw=txt(banner.t,VW/2,70,'rainbow',3,1,'#5a1090');const ix=Math.round(VW/2-bw/2-30),pulse=(st>>3)%2;
    if(banner.icon){R(ix-3,67,27,21,pulse?'#fff6a0':'#ff4fb0');R(ix-1,69,23,17,'#2a0f50');tierIcon(ix+1,70,banner.icon,3);}
    else if(banner.pw)gunBadge(ix-2,66,banner.pw,3);
    if(banner.s)txt(banner.s,VW/2,94,'#fff',1,1,'#7a1aa0');X.restore();}
  if(state==='level'&&P&&P.star>0){const w=Math.round(60*P.star/600);R(VW-70,30,62,5,'#2a0f50');R(VW-69,31,w,3,HUE(st*8));txt('STAR POWER',VW-70,37,'rainbow',1,0,'#5a1090');}
  if(state==='level')godHud();
}
function drawSewer(){
  R(0,0,VW,VH,'#2a0f5a');const o=(st*5)%16;
  for(let y=-16;y<VH;y+=8){const yy=y-o%8;R(VW/2-70,yy,140,1,'#3a1a78');}
  R(VW/2-70,0,6,VH,'#c050e0');R(VW/2+64,0,6,VH,'#c050e0');
  for(let y=-16+(-(st*5)%16);y<VH;y+=16)R(VW/2+38,y,14,2,'#ff9ad6');R(VW/2+38,0,2,VH,'#ff9ad6');R(VW/2+50,0,2,VH,'#ff9ad6');
  twinkles(st*3,24,VH,0);
  actors(()=>drawHero(VW/2-10,Math.round(Math.min(150,40+st*st*0.012)),hero,{f:1,pose:'fall',t:st,ax:0,ay:1,glide:true}),1);
  txt('INTO THE SEWER...',VW/2,30,'rainbow',2,1,'#5a1090');if(st>70)txt('STAGE '+stage+' - '+v9Name(),VW/2,170,'#fff',1,1,'#7a1aa0');
}
// ===== v0.7: Aztec god powers + Road to Mictlan =====
let godM=0,GP=[],decoy=null,bolts=[],slowT=0,sunT=0,godTap=0,swapTap=0,litT=0,winKind='',spirit=null,dashId=0;
const GODS={tlaloc:{n:'TLALOC',p:'STORM CALL',c:'#30c8ff'},quetz:{n:'QUETZALCOATL',p:'FEATHERED WIND',c:'#50f0a0'},tezca:{n:'TEZCATLIPOCA',p:'SMOKING MIRROR',c:'#b070ff'},xochi:{n:'XOCHIPILLI',p:'FLOWER SPIRIT',c:'#ff7ad0'},huitz:{n:'HUITZILOPOCHTLI',p:'XIUHCOATL SERPENT',c:'#ff8a20'},tona:{n:'TONATIUH',p:'SOLAR FLARE',c:'#ffd030'},coyol:{n:'COYOLXAUHQUI',p:'MOON SHARDS',c:'#d8e4ff'},chalchi:{n:'CHALCHIUHTLICUE',p:'JADE TIDE',c:'#30e0a0'},xolotl:{n:'XOLOTL',p:'LIGHTNING DASH',c:'#7af8ff',cost:34},tlazol:{n:'TLAZOLTEOTL',p:'PURIFY',c:'#a0ff60'}};
const GODK=Object.keys(GODS);
function gods(){if(!Array.isArray(SAVE.gods))SAVE.gods=[];return SAVE.gods;}
function curGod(){const g=gods();return g.length?g[(SAVE.gsel||0)%g.length]:null;}
function giveGod(k){const g=gods();if(!g.includes(k))g.push(k);SAVE.gsel=g.indexOf(k);save();}
function pop(x,y,s,col){parts.push({x,y,vx:0,vy:-0.5,l:46,t:'txt2',c:s,col:col||'#fff'});}
function rainbowBurst(x,y,n){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;parts.push({x,y,vx:Math.cos(a)*rnd(1.2,2.6),vy:Math.sin(a)*rnd(1.2,2.6),l:rnd(18,30),t:'tr',s:2,c:HUE(i*360/n+st*8)});if(i%3===0)parts.push({x:x+rnd(-14,14),y:y+rnd(-16,8),vx:0,vy:-0.4,l:24,t:'s',s:2});}}
function godGain(n){if(state!=='level')return;const was=godM;godM=Math.min(100,godM+n);const k=curGod(),c=k&&GODS[k].cost||100;if(was<c&&godM>=c&&k){sfx('ping');pop(P.x,P.y-34,'GOD READY!','#fff6a0');}}
function isLit(b){return b.k==='laser'||b.k==='beam';}
function useGod(){const k=curGod(),p=P;if(!p||p.dead)return;if(!k){banner={t:'NO GOD POWER YET',s:'FIND A HIDDEN SHRINE',l:80};sfx('no');return;}
  const G=GODS[k],cost=G.cost||100;if(godM<cost){sfx('no');pop(p.x,p.y-34,'METER '+Math.floor(godM)+'/'+cost,'#ffd0f0');return;}
  godM-=cost;sfx('godup');rainbowBurst(p.x,p.y-12,26);hitStop=Math.max(hitStop,3);if(k!=='xolotl')banner={t:G.n+'!',s:G.p,l:80,mini:1};GACT[k]();}
function swapGod(){const g=gods();if(g.length<2){if(g.length)pop(P.x,P.y-34,GODS[g[0]].n,'#fff');return;}SAVE.gsel=((SAVE.gsel||0)+1)%g.length;save();sfx('ping');const G=GODS[curGod()];pop(P.x,P.y-34,G.n,G.c);}
const GACT={
  tlaloc(){GP.push({k:'rain',t:300});litT=30;chain(P.x,P.y-16,6,4);fireOut(true);},
  quetz(){GP.push({k:'torn',x:P.x+P.f*12,f:P.f,t:230});P.dj=900;pop(P.x,P.y-44,'TRIPLE JUMP!','#50f0a0');},
  tezca(){GP.push({k:'knife',t:24});decoy={x:P.x-P.f*16,y:P.y,f:P.f,l:420};},
  xochi(){P.giant=480;for(let i=0;i<40;i++)parts.push({x:P.x+rnd(-30,30),y:P.y-rnd(0,50),vx:rnd(-0.6,0.6),vy:-rnd(0.2,1),l:rnd(30,60),t:'spore',s:2,c:HUE(rnd(280,400))});},
  huitz(){GP.push({k:'serp',t:150});},
  tona(){sunT=56;shake=Math.max(shake,8);for(const e of enemies){if(!e.dead&&e.x>cam.x-10&&e.x<cam.x+VW+10){e.hp=0;killEnemy(e);addScore(e.sc||100);}}ebul=[];if(boss&&!boss.dying)hitBoss(8);fireOut(true);},
  coyol(){for(const o of [-0.28,0,0.28]){const b=mkB('moon',P.x+P.f*8,P.y-14,(P.f>0?0:Math.PI)+o,4.8,{r:3,dmg:1.6,pierce:true,life:140});b.dir=P.f;}slowT=300;sfx('throw');},
  chalchi(){GP.push({k:'wave',x:P.x,f:P.f,t:150,hit:[]});hp=Math.min(maxHp(),hp+2);tacoBump=10;pop(P.x,P.y-44,'+2 JADE HEAL','#30e0a0');},
  xolotl(){startDash(true);},
  tlazol(){purify();}
};
function chain(x,y,n,dmg){let cx=x,cy=y;const hit=[];sfx('zap');litT=Math.max(litT,30);
  for(let i=0;i<n;i++){let best=null,bd=160;for(const e of enemies){if(e.dead||hit.includes(e))continue;const d=Math.hypot(e.x-cx,e.y-e.h/2-cy);if(d<bd){bd=d;best=e;}}
    if(!best)break;hit.push(best);bolts.push({x1:cx,y1:cy,x2:best.x,y2:best.y-best.h/2,l:12});cx=best.x;cy=best.y-best.h/2;hitEnemy(best,null,dmg);}
  if(L.crack&&!L.crack.broken&&Math.abs(L.crack.x-x)<170){bolts.push({x1:x,y1:y,x2:L.crack.x,y2:GY-28,l:14});crackHit('L');crackHit('L');}
  for(const w of (L.tarw||[]))if(!w.broken&&Math.abs(w.x-x)<170){bolts.push({x1:x,y1:y,x2:w.x+6,y2:w.top+14,l:12});w.hp-=2;if(w.hp<=0)breakTar(w);}
  if(boss&&!boss.dying&&boss.open){const c=bossCore();bolts.push({x1:x,y1:y,x2:c.x+12,y2:c.y+12,l:12});hitBoss(dmg);}}
function fireOut(all){for(const f of (L.fires||[]))if(f.on&&(all?f.x>cam.x-20&&f.x<cam.x+VW+20:true)){f.on=0;sfx('tss');for(let i=0;i<10;i++)parts.push({x:f.x+rnd(-6,6),y:GY-rnd(2,14),vx:rnd(-0.3,0.3),vy:-rnd(0.4,1),l:30,t:'smoke',s:rnd(3,6)});pickups.push({k:'C',v:5,x:f.x,y:GY-20,vx:0,vy:-2,onG:false,tt:0,bounce:1});addScore(250);}}
function purify(){sfx('godup');for(let i=0;i<70;i++)parts.push({x:cam.x+rnd(0,VW),y:rnd(20,GY),vx:rnd(-0.4,0.4),vy:-rnd(0.2,0.9),l:rnd(40,80),t:'flw',s:0,c:HUE(rnd(0,360))});
  for(const e of enemies){if(e.dead||e.x<cam.x-10||e.x>cam.x+VW+10)continue;
    if(e.t==='sludge'){e.dead=true;addScore(e.sc||50);flowerAt(e.x,e.y-4,6);pickups.push({k:'C',v:e.big?5:1,x:e.x,y:e.y-8,vx:rnd(-0.5,0.5),vy:-2.4,onG:false,tt:0,bounce:1});}
    else hitEnemy(e,null,4);}
  for(const b of ebul){flowerAt(b.x,b.y,3);if(Math.random()<0.35)pickups.push({k:'C',v:1,x:b.x,y:Math.min(b.y,GY-10),vx:0,vy:-1.5,onG:false,tt:0,bounce:1});}ebul=[];
  for(const q of (L.pools||[]))if(q.x1>cam.x-20&&q.x0<cam.x+VW+20&&!q.clean){q.clean=1;flowerAt((q.x0+q.x1)/2,GY-4,8);}
  for(const w of (L.tarw||[]))if(!w.broken&&w.x>cam.x-20&&w.x<cam.x+VW+20){breakTar(w);flowerAt(w.x+6,w.top+16,8);}
  fireOut(true);if(L.flood){L.flood.x-=160;flowerAt(L.flood.x+cam.x*0,100,10);}
  if(boss&&!boss.dying)hitBoss(boss.kind==='col'?10:6);}
function flowerAt(x,y,n){for(let i=0;i<n;i++)parts.push({x:x+rnd(-8,8),y:y+rnd(-8,4),vx:rnd(-0.8,0.8),vy:-rnd(0.3,1.3),l:rnd(36,60),t:'flw',s:0,c:HUE(rnd(0,360))});}
function startDash(god){const p=P;if(p.dead)return;dashId++;p.dashT=12;p.vy=0;p.dashGod=god;sfx('zap');litT=Math.max(litT,24);shake=Math.max(shake,3);rainbowBurst(p.x,p.y-12,10);}
function dashStep(p){p.dashT--;p.vx=p.f*5.6;p.vy=0;p.x+=p.f*1.4;if(p.t%1===0)parts.push({x:p.x-p.f*4,y:p.y-12+rnd(-6,6),vx:-p.f*0.5,vy:0,l:14,t:'tr',s:3,c:(p.t&1)?'#7af8ff':'#ffffff'});
  const bx={x:p.x-14,y:p.y-26,w:28,h:28};
  for(const e of enemies){if(e.dead||e.dz===dashId)continue;if(ov(bx,eBox(e))){e.dz=dashId;bolts.push({x1:p.x,y1:p.y-14,x2:e.x,y2:e.y-e.h/2,l:8});hitEnemy(e,null,4);}}
  if(L.crack&&!L.crack.broken&&Math.abs(L.crack.x-p.x)<22){crackHit('L');crackHit('L');}
  for(const w of (L.tarw||[]))if(!w.broken&&Math.abs(w.x+6-p.x)<18&&p.y>w.top&&p.y-20<w.fy)breakTar(w);
  if(boss&&!boss.dying&&boss.open&&p.dz!==dashId){const c=bossCore();if(Math.abs(c.x+12-p.x)<30){p.dz=dashId;hitBoss(4);}}}
function tarBlock(p){for(const w of (L.tarw||[])){if(w.broken)continue;if(p.y>w.top+2&&p.y-20<w.fy&&p.x+5>w.x&&p.x-5<w.x+12){if(p.dashT>0){breakTar(w);continue;}p.x=p.x<w.x+6?w.x-5:w.x+17;p.vx=0;}}
  const g=L.gate;if(g&&g.open<1&&p.x>g.x-8)p.x=g.x-8;}
function breakTar(w){if(w.broken)return;w.broken=1;sfx('boom');shake=Math.max(shake,5);addScore(300);
  for(let i=0;i<18;i++)parts.push({x:w.x+6+rnd(-6,6),y:w.top+rnd(0,w.fy-w.top),vx:rnd(-2,2),vy:rnd(-2.5,0.5),l:rnd(20,36),t:'b',s:rnd(2,5)});
  if(w.room){banner={t:'SECRET GEM ROOM!',s:'XOLOTL SNIFFED IT OUT',l:110};const y=w.fy-10;[25,5,5,5,1,1,1,1].forEach((v,i)=>pickups.push({k:'C',v,x:w.x+22+i*9,y:y-(i%2)*8,vx:0,vy:0,onG:true,tt:i*5,float:true}));pickups.push({k:'T3',x:w.x+100,y:y-6,vx:0,vy:0,onG:true,tt:0,float:true});for(const s of L.shrines)if(s.room)s.room=0;}}
function crackHit(kind){const c=L.crack;if(!c||c.broken)return;if(kind==='L'){c.hp--;litT=Math.max(litT,20);}else c.heavy--;c.fl=6;sfx('ping');
  for(let i=0;i<4;i++)parts.push({x:c.x+rnd(-10,10),y:GY-rnd(10,40),vx:rnd(-1,1),vy:-rnd(0.5,1.5),l:16,t:'s',s:2});
  if(c.hp<=0||c.heavy<=0){c.broken=1;sfx('boom');shake=8;boomFx(c.x,GY-24,16,true);banner={t:'A HIDDEN PASSAGE!',s:'SOMETHING IS SLEEPING INSIDE...',l:130};addScore(1000);}}
function v7Bul(b,bb){const c=L.crack;
  if(c&&!c.broken&&ov(bb,{x:c.x-14,y:GY-46,w:28,h:46})){const lt=isLit(b);if(lt||b.dmg>=3||b.splash){b.life=0;crackHit(lt?'L':'H');return true;}return false;}
  for(const w of (L.tarw||[])){if(w.broken)continue;if(ov(bb,{x:w.x,y:w.top,w:12,h:w.fy-w.top})){b.life=0;w.hp-=isLit(b)?1.5:(b.dmg>=1.8||b.splash)?0.6:0.15;w.fl=4;sfx('ping');if(w.hp<=0)breakTar(w);return true;}}
  const g=L.gate;if(g&&g.open<1&&b.x>g.x-4&&b.x<g.x+10){b.life=0;sfx('ping');return true;}
  return false;}
function v7Level(){GP=[];decoy=null;bolts=[];slowT=0;sunT=0;godTap=0;swapTap=0;litT=0;winKind='';
  P.dj=0;P.giant=0;P.dashT=0;P.dash=0;
  L.fires=[{x:1600,on:1},{x:2130,on:1},{x:2470,on:1}];
  L.shrines=[{x:680,y:112,k:'tlaloc'},{x:1400,y:110,k:'quetz'},{x:1820,y:116,k:'tezca'},{x:2205,y:140,k:'tona'},{x:2640,y:136,k:'chalchi'},{x:340,y:140,k:'xipe'},{x:560,y:136,k:'itzpa'},{x:1240,y:140,k:'tlalte'},{x:1660,y:140,k:'centeo'},{x:1995,y:140,k:'mayahuel'},{x:2365,y:112,k:'mixcoatl'}];
  L.crack={x:1044,hp:2,heavy:14,broken:0,dog:0,wk:0,fl:0};
  spirit=SAVE.xolo?{x:P.x-20,y:P.y-34,t:0}:null;}
function startMictlan(){startLevel();const len=2900;
  L={len,sewerEnd:-99999,mictlan:true,noGrunts:1,ground:[[0,420],[530,900],[920,1600],[1700,2000],[2036,len]],
    plats:[[600,680,140],[700,780,120],[800,880,132],[990,1110,124],[1350,1430,140],[1800,1880,140],[2200,2290,130],[2400,2480,140]].map(q=>[q[0]-8,q[1]+8,q[2]]),
    spawns:[{x:300,t:'sludge'},{x:690,t:'sludge'},{x:760,t:'drone',k:'H'},{x:1000,t:'sludge'},{x:1130,t:'crate'},{x:1190,t:'sludge'},{x:1250,t:'pump'},{x:1460,t:'sludge'},{x:1520,t:'drone',k:'H'},{x:1780,t:'sludge'},{x:1860,t:'sensor'},{x:2150,t:'pump'},{x:2260,t:'sludge'},{x:2340,t:'drone',k:'P'},{x:2430,t:'crate'}].map(s=>Object.assign({y:GY},s)),
    si:0,gt:1e9,arena:false,cps:[{x:620},{x:1260},{x:2060},{x:len-VW-70,boss:true}],cp:-1,podT:420,evDone:1,clean:0};
  L.arenaX=len-VW;L.plats.push([L.arenaX+60,L.arenaX+120,140]);
  L.paws=[{x:362,y:GY},{x:398,y:GY},{x:872,y:132},{x:1536,y:GY},{x:1572,y:GY}].map(q=>Object.assign(q,{u:0}));
  L.tarw=[{x:948,top:GY-46,fy:GY,hp:6},{x:1000,top:124-34,fy:124,hp:6,room:1}];
  L.pools=[{x0:600,x1:690},{x0:720,x1:870}];
  L.shrines=[{x:740,y:120,k:'coyol'},{x:1100,y:124,k:'xochi',room:1},{x:1390,y:140,k:'huitz'},{x:2245,y:130,k:'tlazol'},{x:1840,y:140,k:'mictlante'},{x:2440,y:140,k:'xiuh'}];
  L.fires=[];L.crack=null;L.flood=null;L.floodDone=0;L.gate=null;
  L.holds=[{x:405,m:'DASH OVER!'},{x:592,m:'UP THIS WAY!'},{x:935,m:'DASH THROUGH!'},{x:985,m:'*SNIFF* GEMS!'},{x:1585,m:'DASH!'}];
  L.dog={x:110,y:GY,f:1,pose:'run',bt:0,msg:'',msgT:0,vx:0};
  for(const q of L.plats){if(q[2]<130&&q[0]>580&&q[0]<800)for(let i=0;i<3;i++)pickups.push({k:'C',v:1,x:q[0]+20+i*14,y:q[2]-8,vx:0,vy:0,onG:true,tt:i*7,float:true});}
  for(const g of [[420,530],[1600,1700]])for(let j=0;j<5;j++)pickups.push({k:'C',v:j===2?5:1,x:g[0]+(g[1]-g[0])*(j+0.5)/5,y:GY-40-Math.sin((j+0.5)/5*Math.PI)*30,vx:0,vy:0,onG:true,tt:j*6,float:true});
  pickups.push({k:'T1',x:1300,y:GY-8,vx:0,vy:0,onG:true,tt:0,float:true});
  P.x=70;cam.x=0;GP=[];decoy=null;bolts=[];slowT=0;sunT=0;litT=0;spirit=null;P.dash=0;godTap=0;swapTap=0;winKind='';
  banner={t:'ROAD TO MICTLAN',s:'FOLLOW XOLOTL THROUGH THE DARK',l:170};music('cave');}
function startCol(){L.arena=true;L.gate={x:L.arenaX+176,t:0,open:0};banner={t:'THE TAR LAKE',s:'XOLOTL WILL HOWL THE GATE OPEN',l:120};}
function spawnCol(){const mx=Math.ceil(90*bossNG102());boss={kind:'col',x:L.len-82,t:0,dying:0,hp:mx,mx,open:false,beam:0,fl:0,bob:0,rise:80,legs:0};banner={t:'WARNING',s:'CHAPOPOTE COLOSSUS RISES FROM THE TAR',l:130};music('boss');sfx('gate');shake=10;}
function updCol(){const b=boss;b.t++;if(b.fl>0)b.fl--;
  if(b.dying){b.dying++;L.clean=Math.min(1,b.dying/160);if(b.dying%6===0)for(let i=0;i<4;i++)parts.push({x:L.arenaX+rnd(100,VW),y:rnd(150,GY),vx:0,vy:-rnd(0.3,1),l:30,t:'s',s:2});
    if(b.dying===90){banner={t:'THE TAR TURNS TO CRYSTAL WATER!',s:'XOLOTL JOINS YOU AS A SPIRIT HELPER',l:140};}
    if(b.dying>230){winKind='mictlan';SAVE.xolo=1;save();setState('win');winRew=grantReward();sfx('win');}return;}
  if(b.rise>0){b.rise--;return;}
  b.bob=Math.round(Math.sin(b.t*0.05)*3);b.x=L.len-86+Math.sin(b.t*0.012)*20;
  const c=b.t%300,mad=b.hp<b.mx/2;b.open=c>=140&&c<290;
  if(c===140){dogBark('NOW! SHOOT THE GLOWING CRYSTAL!');sfx('bark');}
  if(!b.open){if(b.t%(mad?80:110)===0){ebul.push({t:'wave',x:b.x-50,y:GY-5,vx:-2.3,vy:0,r:5,g:0,l:300});sfx('flood');}
    if(b.t%75===30){const sx=b.x-30,sy=96+b.bob;ebul.push({t:'blob',x:sx,y:sy,vx:(tgtX()-sx)/66,vy:-3.2,r:3,g:0.095,l:200});}}
  if(b.t%300===60){const d=L.dog;pickups.push({k:'D',x:clamp(P.x+rnd(-24,24),cam.x+20,b.x-60),y:90,vx:0,vy:0,onG:false,tt:0});if(d){d.msg='DASH CHARGE!';d.msgT=60;}sfx('bark');}}
function tgtX(){return decoy?decoy.x:P.x;}
function dogBark(m){const d=L.dog;if(!d)return;d.msg=m;d.msgT=70;d.bt=10;sfx('bark');}
function dogTarget(p){const d=L.dog;if(L.gate&&!boss)return L.gate.x-16;if(boss)return Math.max(cam.x+26,Math.min(p.x-30,cam.x+70));
  if(L.flood)return p.x+70;
  for(const h of L.holds){if(h.done)continue;if(p.x>=h.x-40){h.done=1;dogBark(h.m);continue;}return Math.min(p.x+70,h.x);}
  return p.x+70;}
function updDog(p){const d=L.dog;if(!d)return;const tx=dogTarget(p),dx=tx-d.x;
  if(d.x<p.x-60||Math.abs(d.x-p.x)>VW){d.x=p.x+30;d.y=p.y;}
  d.vx=clamp(dx*0.12,-2.2,3.4);if(Math.abs(dx)<2)d.vx=0;d.x+=d.vx;if(Math.abs(d.vx)>0.2)d.f=Math.sign(d.vx);else d.f=p.x<d.x-6?-1:1;
  let ty=GY;let onP=false;for(const q of L.plats)if(d.x>=q[0]&&d.x<=q[1]&&q[2]<GY&&d.x>580&&d.x<900){ty=q[2];onP=true;break;}
  if(!onP&&!isGround(d.x)){let g0=0,g1=0;for(let i=0;i<L.ground.length-1;i++){if(d.x>L.ground[i][1]&&d.x<L.ground[i+1][0]){g0=L.ground[i][1];g1=L.ground[i+1][0];}}const t=g1>g0?(d.x-g0)/(g1-g0):0.5;ty=GY-Math.sin(t*Math.PI)*46;if(st%2===0)bolts.push({x1:d.x-4,y1:d.y-8,x2:d.x+4,y2:d.y-10,l:4});}
  d.y+=(ty-d.y)*0.35;d.pose=Math.abs(d.vx)>0.3?'run':'sit';
  if(L.gate&&!boss&&L.gate.t>40&&L.gate.t<150)d.pose='howl';
  if(d.msgT>0)d.msgT--;if(d.bt>0)d.bt--;
  if(!L.gate&&d.x-p.x>120&&st%90===0){dogBark('ARF! ARF!');}
  if(d.pose==='run'&&st%2===0)parts.push({x:d.x-d.f*6,y:d.y-8+rnd(-3,3),vx:-d.f*0.3,vy:0,l:16,t:'tr',s:2,c:(st&2)?'#7af8ff':'#fff6a0'});}
function v7Upd(){const p=P;
  if(godTap){godTap=0;if(!p.dead)useGod();}if(swapTap){swapTap=0;swapGod();}
  powerOpen(v71Upd);powerOpen(v72Upd);powerOpen(v74Upd);v9Upd();if(slowT>0)slowT--;if(sunT>0)sunT--;if(litT>0)litT--;if(p.dj>0)p.dj--;
  if(p.giant>0){p.giant--;if(p.t%3===0)parts.push({x:p.x+rnd(-14,14),y:p.y-rnd(0,44),vx:0,vy:-0.5,l:30,t:'spore',s:2,c:HUE(p.t*7+rnd(0,80))});if(p.giant===1)pop(p.x,p.y-44,'SPIRIT FADES','#ff9ad6');}
  if(bullets.some(isLit))litT=Math.max(litT,6);
  for(const b of bolts)b.l--;bolts=bolts.filter(b=>b.l>0);
  if(decoy){decoy.l--;if(decoy.l<=0){decoy=null;}}
  for(const g of GP){g.t--;
    if(g.k==='rain'){if(g.t%24===0)chain(p.x+p.f*6,p.y-16,6,4);fireOut(true);litT=Math.max(litT,4);if(g.t%60===0)shake=Math.max(shake,2);}
    else if(g.k==='torn'){g.x+=g.f*2.4;for(const e of enemies){if(e.dead||Math.abs(e.x-g.x)>20)continue;e.x+=g.f*0.8;if(g.t%8===0)hitEnemy(e,null,1.6);}
      for(const b of ebul)if(Math.abs(b.x-g.x)<18)b.l=0;
      if(boss&&!boss.dying&&g.t%8===0){const c=bossCore();if(boss.open&&Math.abs(c.x+12-g.x)<26)hitBoss(1.6);}
      if(g.t%2===0)parts.push({x:g.x+rnd(-10,10),y:GY-rnd(0,60),vx:g.f*rnd(0.5,1.5),vy:-rnd(0.3,1.2),l:20,t:'tr',s:2,c:HUE(st*12+rnd(0,120))});
      if(g.x<cam.x-30||g.x>cam.x+VW+30)g.t=0;}
    else if(g.k==='knife'){if(g.t===23||g.t===15||g.t===7){const base=p.f>0?0:Math.PI;for(let i=-3;i<=3;i++)mkB('obs',p.x+p.f*8,p.y-14,base+i*0.17,5.4,{r:2,dmg:2.2,pierce:true,life:70,axe:i%2===0});sfx('throw');}}
    else if(g.k==='serp'){if(g.t%6===0){const x0=p.x+p.f*8,x1=p.f>0?cam.x+VW:cam.x,yb=p.y-14,r={x:Math.min(x0,x1),y:yb-8,w:Math.abs(x1-x0),h:16};
        for(const e of enemies)if(!e.dead&&ov(r,eBox(e)))hitEnemy(e,null,1.4);
        for(const w of (L.tarw||[]))if(!w.broken&&ov(r,{x:w.x,y:w.top,w:12,h:w.fy-w.top})){w.hp-=1;if(w.hp<=0)breakTar(w);}
        if(boss&&!boss.dying){const c=bossCore();if(boss.open&&ov(r,{x:c.x,y:c.y,w:c.w,h:c.h}))hitBoss(1.4);}
        if(g.t%12===0)sfx('laser');}}
    else if(g.k==='wave'){g.x+=g.f*3.2;const wx=g.x;
      for(const e of enemies){if(e.dead||g.hit.includes(e)||Math.abs(e.x-wx)>14||e.y<GY-50)continue;g.hit.push(e);if(e.t==='sludge'){killEnemy(e);flowerAt(e.x,e.y,3);}else hitEnemy(e,null,3);}
      for(const b of ebul)if(Math.abs(b.x-wx)<16){b.l=0;flowerAt(b.x,b.y,1);}
      for(const q of (L.pools||[]))if(!q.clean&&wx>q.x0&&wx<q.x1){q.clean=1;flowerAt(wx,GY-4,6);}
      for(const w of (L.tarw||[]))if(!w.broken&&!w.room&&Math.abs(w.x+6-wx)<10)breakTar(w);
      for(const f of (L.fires||[]))if(f.on&&Math.abs(f.x-wx)<12){f.on=0;sfx('tss');}
      if(boss&&!boss.dying&&boss.open&&Math.abs(bossCore().x+12-wx)<16&&!g.hb){g.hb=1;hitBoss(3);}
      if(g.t%2===0)parts.push({x:wx+rnd(-8,8),y:GY-rnd(4,26),vx:0,vy:-rnd(0.5,1.5),l:16,t:'tr',s:2,c:(st&2)?'#30e0a0':'#a0fff0'});
      if(wx<cam.x-30||wx>cam.x+VW+30)g.t=0;}}
  GP=GP.filter(g=>g.t>0);
  for(const s of (L.shrines||[])){if(s.got||s.room)continue;if(Math.abs(p.x-s.x)<12&&Math.abs(p.y-s.y)<26&&!p.dead){s.got=1;const own=gods().includes(s.k);giveGod(s.k);const G=GODS[s.k];
      if(own){godM=Math.min(100,godM+50);banner={t:'SHRINE OF '+G.n,s:'GOD METER +50',l:90};}else{godM=100;banner={t:'SHRINE OF '+G.n,s:G.p+(isTouch?' - TAP GOD!':' - PRESS C!'),l:150};}sfx('godup');rainbowBurst(s.x,s.y-14,30);addScore(1000);}}
  for(const f of (L.fires||[])){if(!f.on)continue;if(st%3===0&&Math.abs(f.x-cam.x-VW/2)<VW)parts.push({x:f.x+rnd(-5,5),y:GY-rnd(4,14),vx:rnd(-0.2,0.2),vy:-rnd(0.5,1.2),l:16,t:'tr',s:2,c:HUE(rnd(0,40))});
    if(!p.dead&&ov(playerBox(),{x:f.x-7,y:GY-14,w:14,h:14}))hurtPlayer();}
  const c=L.crack;if(c){if(c.fl>0)c.fl--;
    if(!c.broken){if(Math.abs(p.x-c.x)<230&&st%220===40){sfx('howl');pop(c.x,GY-56,'awooo...','#9ad8ff');}}
    else if(c.dog===0){const nr=Math.abs(p.x-c.x)<30&&!p.dead;c.nt=nr?(c.nt||0)+1:0;if(nr&&(inp.u||c.nt>70)){c.dog=1;c.wk=0;sfx('bark');giveGod('xolotl');SAVE.mictlan=1;save();godM=Math.max(godM,34);banner={t:'XOLOTL AWAKENS!',s:'THE LIGHTNING DOG WILL GUIDE YOU',l:150};rainbowBurst(c.x,GY-14,24);}}
    else if(c.dog===1){c.wk++;if(c.wk===40)sfx('howl');if(c.wk===70)sfx('bark');if(c.wk>=130){c.dog=2;setState('cave');}}}
  if(spirit&&!p.dead){spirit.t++;const tx=p.x-p.f*20,ty=p.y-36+Math.sin(spirit.t*0.08)*4;spirit.x+=(tx-spirit.x)*0.1;spirit.y+=(ty-spirit.y)*0.1;
    if(spirit.t%110===0){let best=null,bd=120;for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-spirit.x,e.y-e.h/2-spirit.y);if(d<bd){bd=d;best=e;}}if(best){bolts.push({x1:spirit.x,y1:spirit.y,x2:best.x,y2:best.y-best.h/2,l:10});hitEnemy(best,null,2);sfx('zap');}}}
  if(!L.mictlan)return;
  updDog(p);
  for(const q of L.paws){if(q.u>0){q.u--;continue;}if(Math.abs(p.x-q.x)<10&&Math.abs(p.y-q.y)<22&&!p.dead){q.u=420;p.dash=Math.min(3,(p.dash||0)+1);sfx('zap');pop(q.x,q.y-24,'+1 LIGHTNING DASH','#7af8ff');litT=Math.max(litT,10);if(!L.pawTip){L.pawTip=1;banner={t:"XOLOTL'S PAW PRINT",s:'IN THE AIR, PRESS JUMP AGAIN TO DASH (USES A CHARGE)',l:150};}}}
  for(const q of L.pools){if(q.clean)continue;if(st%9===0)parts.push({x:rnd(q.x0,q.x1),y:GY-1,vx:0,vy:-0.3,l:14,t:'dust',s:2});if(p.onG&&p.y>=GY-1&&p.x>q.x0+3&&p.x<q.x1-3&&!p.dead)hurtPlayer();}
  if(!L.floodDone&&!L.flood&&p.x>1320&&p.x<1900&&!p.dead){L.flood={x:cam.x-30};banner={t:'TAR FLOOD!',s:'FOLLOW XOLOTL - RUN!',l:110};sfx('gate');dogBark('THIS WAY! RUN!');}
  const f=L.flood;if(f){f.x+=slowT>0?0.5:1.05;if(cam.x<f.x-60)cam.x=Math.min(L.len-VW,f.x-60);if(st%40===0)sfx('flood');
    if(!p.dead&&p.x<f.x+8){hurtPlayer();p.x=Math.max(p.x,f.x+16);}
    if(p.x>2010){L.floodDone=1;L.flood=null;banner={t:'YOU OUTRAN THE TAR!',s:'GOOD DOG, XOLOTL!',l:120};sfx('ping');addScore(3000);}}
  const g=L.gate;if(g&&!boss){g.t++;if(g.t===40)sfx('howl');if(g.t>=60&&g.t<=150){g.open=(g.t-60)/90;if(g.t%10===0){shake=Math.max(shake,2);sfx('gate');}}if(g.t===160){g.open=1;spawnCol();}}}
function v7Respawn(){if(L&&L.flood)L.flood=null;if(P){P.dashT=0;P.giant=0;}if(L&&L.dog&&P)L.dog.x=P.x+40;}
// ---- drawing ----
function drawXolo(x,y,f,t,pose,al){if(S8OK)return xolo8(x,y,f,t,pose,al);x=Math.round(x);y=Math.round(y);const c=(dx,dy,w,h,col)=>R(x+(f>0?dx:-dx-w),y+dy,w,h,col);
  const B=XPAL?XPAL[0]:'#5a68e0',Lt=XPAL?XPAL[1]:'#a8b8ff',D=XPAL?XPAL[2]:'#2c2a90',Z=XPAL?XPAL[3]:'#7af8ff',E=XPAL?XPAL[4]:'#fff6a0';if(al!==undefined)X.globalAlpha=al;
  if(pose==='sleep'){c(-9,-6,18,6,B);c(-7,-7,14,1,Lt);c(-9,-1,18,1,D);c(5,-8,6,5,B);c(10,-6,3,2,B);c(7,-7,2,1,'#1a1040');c(5,-10,2,2,B);c(-11,-4,3,2,Z);c(-4,-5,2,1,Z);c(0,-6,2,1,Z);X.globalAlpha=1;return;}
  const run=pose==='run',ph=Math.floor(t/4)%2,sit=pose==='sit',howl=pose==='howl';
  const lg=run?[ph?-2:0,ph?0:-2,ph?0:-2,ph?-2:0]:[0,0,0,0];
  if(!sit&&!howl){c(-7,-6+lg[0],2,6-lg[0]*0,D);c(-4,-6+lg[1],2,6,B);c(3,-6+lg[2],2,6,D);c(6,-6+lg[3],2,6,B);}
  else{c(-7,-4,5,4,D);c(4,-6,2,6,B);c(7,-6,2,6,B);}
  const by=sit||howl?-10:-12;c(-8,by,16,6,B);c(-7,by,13,1,Lt);c(-8,by+5,16,1,D);
  c(-5,by+2,2,1,Z);c(-3,by+1,2,1,Z);c(-1,by+2,2,1,Z);c(1,by+1,2,1,Z);c(3,by+2,2,1,'#fff');
  if(howl){c(5,by-7,6,7,B);c(8,by-11,4,5,B);c(10,by-12,2,2,'#1a1040');c(6,by-10,2,4,B);c(7,by-6,2,1,E);c(6,by-13,1,3,'#fff');}
  else{c(6,by-5,6,6,B);c(11,by-3,4,3,B);c(14,by-3,1,1,'#1a1040');c(6,by-9,2,4,B);c(9,by-10,2,5,B);c(9,by-9,1,3,'#ff9ad6');c(9,by-4,2,2,E);c(7,by-10,2,1,'#fff');if(L&&L.dog&&L.dog.bt>0)c(12,by,3,1,'#ff6aa0');}
  c(-10,by-1,2,2,Z);c(-12,by-3,2,2,Z);c(-11,by-5,2,2,'#fff');X.globalAlpha=1;}
function drawShrine(s,ox){const x=Math.round(s.x+ox),y=s.y,G=GODS[s.k],near=Math.abs(P.x-s.x)<110;
  if(s.room)return;X.globalAlpha=s.got?0.45:near?1:0.22+0.08*Math.sin(st*0.08);
  R(x-8,y-6,16,6,'#5a3a8a');R(x-7,y-6,14,1,'#8a6ac0');R(x-6,y-18,12,12,'#6a4aa0');R(x-6,y-18,12,1,'#a88ae0');
  R(x-4,y-16,8,8,s.got?'#4a3a6a':G.c);R(x-2,y-14,4,4,'#fff');R(x-5,y-20,10,2,'#c0a0f0');
  if(!s.got){const b=Math.round(Math.sin(st*0.1)*2);sparkle(x,y-28+b,2,HUE(st*8));R(x-2,y-30+b,4,4,G.c);R(x-1,y-29+b,2,2,'#fff');if(near&&st%6===0)parts.push({x:s.x+rnd(-8,8),y:y-rnd(4,30),vx:0,vy:-0.5,l:20,t:'s',s:2});if(near)txt(G.n,x,y-42,'rainbow',1,1,'#3a1060');}
  X.globalAlpha=1;}
function drawPaw(x,y,a,col){X.globalAlpha=a;R(x-2,y-3,5,3,col);R(x-3,y-6,2,2,col);R(x-1,y-7,2,2,col);R(x+1,y-7,2,2,col);R(x+3,y-6,2,2,col);X.globalAlpha=1;}
function caveZone(){const ox=-cam.x;R(0,0,VW,VH,'#140a34');R(0,0,VW,40,'#0e0626');
  if(S8OK)cave8();else for(let k=Math.floor(cam.x*0.2/40)-1;k<Math.floor((cam.x*0.2+VW)/40)+2;k++){const x=k*40-cam.x*0.2,h=20+hsh(k)%40;R(x,0,14,h,'#22104a');R(x+3,h,8,8,'#22104a');R(x+5,h+8,4,6,'#22104a');if(hsh(k)%3===0){const cy=60+hsh(k*7)%60;R(x+18,cy,3,6,HUE(k*67,60));R(x+21,cy+2,2,4,HUE(k*67+40,70));}}
  if(!S8OK)for(let k=Math.floor(cam.x*0.5/70)-1;k<Math.floor((cam.x*0.5+VW)/70)+2;k++){const x=k*70-cam.x*0.5,h=hsh(k*3)%2?50+hsh(k)%30:0;if(h){R(x,0,20,h,'#2e1660');R(x+4,h,12,10,'#2e1660');R(x+8,h+10,4,8,'#2e1660');}
    const cy=120+hsh(k*5)%40,col=HUE(k*53+st*0.5,62);R(x+30,cy,4,12,col);R(x+34,cy+4,3,8,HUE(k*53+60,70));R(x+27,cy+6,3,6,HUE(k*53+120,66));R(x+31,cy+1,1,6,'#fff');}
  for(const g of L.ground){const a=Math.max(g[0],cam.x-4),b=Math.min(g[1],cam.x+VW+4);if(b<=a)continue;R(a+ox,GY,b-a,VH-GY,'#3a2070');R(a+ox,GY,b-a,2,'#8a6ae8');R(a+ox,GY+2,b-a,1,'#5a3aa0');
    for(let x=Math.ceil(a/24)*24;x<b;x+=24){const h=hsh(x)%5;if(h<2){R(x+ox,GY-4,2,4,HUE(x*3,62));R(x+ox+2,GY-2,2,2,HUE(x*3+50,70));}else R(x+ox,GY+6+h,3,2,'#4a2a88');}}
  for(const q of L.plats){if(q[1]<cam.x||q[0]>cam.x+VW)continue;R(q[0]+ox,q[2],q[1]-q[0],5,'#5a3aa0');R(q[0]+ox,q[2],q[1]-q[0],1,'#7af8ff');R(q[0]+ox+4,q[2]+5,q[1]-q[0]-8,2,'#3a2070');}
  if(L.arena){const ax=L.arenaX+110+ox,cl=L.clean||0,w=L.len-L.arenaX-110;R(ax,GY-10,w,10,cl>0.5?'#40d8ff':'#141020');for(let i=0;i<w;i+=6){const yy=GY-10+Math.round(Math.sin((i+st)*0.2));R(ax+i,yy,6,1,cl>0.5?'#c0ffff':HUE(i*4+st*3,50));}
    if(cl>0&&cl<=0.5){X.globalAlpha=cl*2;R(ax,GY-10,w,10,'#40d8ff');X.globalAlpha=1;}
    const g=L.gate;if(g){const gx=g.x+ox,gy=Math.round(-g.open*70);R(gx-4,GY-74,16,4,'#6a4aa0');R(gx-6,GY-78,20,4,'#8a6ac0');if(g.open<1){R(gx,GY-70+gy*0,8,70+gy,'#2a1a50');for(let k=0;k<70+gy;k+=8)R(gx,GY-70+k,8,1,'#5a3aa0');drawPaw(gx+4,GY-34,0.5+0.5*Math.sin(st*0.15),'#7af8ff');}}}}
function v7Back(ox){v9Back(ox);v74Back(ox);v72Back(ox);const c=L.crack;
  if(c&&c.x>cam.x-40&&c.x<cam.x+VW+40){const x=Math.round(c.x+ox),gl=litT>0?1:0.35+0.15*Math.sin(st*0.07);
    if(!c.broken){R(x-14,GY-46,28,46,c.fl>0?'#7a5ac8':'#4a2a90');for(let r=0;r<46;r+=6)R(x-14,GY-46+r,28,1,'#36186e');for(let r=0;r<8;r++)R(x-14+((r*7)%28),GY-46+r*6,1,6,'#36186e');
      R(x-6,GY-40,1,12,'#140630');R(x-5,GY-28,4,1,'#140630');R(x-1,GY-28,1,14,'#140630');R(x+3,GY-38,1,8,'#140630');if(c.hp<2||c.heavy<6){R(x+4,GY-30,6,1,'#140630');R(x-10,GY-18,8,1,'#140630');}
      drawPaw(x,GY-22,gl,'#7af8ff');if(litT>0){X.globalAlpha=0.3;R(x-10,GY-34,20,18,'#7af8ff');X.globalAlpha=1;}
      drawPaw(x-36,GY-1,gl*0.6,'#7af8ff');drawPaw(x-58,GY-1,gl*0.45,'#7af8ff');drawPaw(x-80,GY-1,gl*0.3,'#7af8ff');}
    else{R(x-13,GY-42,26,42,'#0a0420');R(x-14,GY-44,28,3,'#4a2a90');R(x-15,GY-42,2,42,'#4a2a90');R(x+13,GY-42,2,42,'#4a2a90');for(let i=0;i<4;i++)R(x-10+i*7,GY-40+(i%2)*5,2,3,HUE(i*90+st*2,60));}}
  for(const s of (L.shrines||[]))if(s.x>cam.x-30&&s.x<cam.x+VW+30)drawShrine(s,ox);
  if(!L.mictlan)return;
  for(const q of L.paws){if(q.x<cam.x-20||q.x>cam.x+VW+20)continue;const a=q.u>0?0.15:0.6+0.4*Math.sin(st*0.12+q.x);drawPaw(Math.round(q.x+ox),q.y-1,a,'#7af8ff');if(q.u===0){X.globalAlpha=0.25*a;R(Math.round(q.x+ox)-6,q.y-12,12,12,'#7af8ff');X.globalAlpha=1;}}
  for(const q of L.pools){if(q.x1<cam.x||q.x0>cam.x+VW)continue;const a=Math.round(q.x0+ox),w=q.x1-q.x0;if(q.clean){R(a,GY-2,w,3,'#40d8ff');R(a+4,GY-2,w-8,1,'#c0ffff');}else{R(a,GY-3,w,4,'#120c1c');R(a+2,GY-4,w-4,1,'#120c1c');for(let i=6;i<w;i+=14)R(a+i,GY-3,4,1,HUE(i*9+st*4,48));}}
  for(const w of L.tarw){if(w.broken||w.x<cam.x-20||w.x>cam.x+VW+20)continue;const x=Math.round(w.x+ox),h=w.fy-w.top;R(x,w.top,12,h,w.fl>0?'#3a2a5a':'#140c22');R(x+2,w.top,2,h,'#2a1c40');R(x-1,w.top,14,3,'#140c22');for(let i=0;i<h;i+=9)R(x+5+(i%2)*3,w.top+i+Math.floor(st/6)%9,1,3,HUE(i*20+st*3,50));if(w.fl>0)w.fl--;}}
function v7Actors(ox){v71Actors(ox);const c=L.crack;
  if(c&&c.broken&&c.dog<2){const x=c.x+ox;if(c.dog===0)drawXolo(x,GY,-1,st,'sleep');else{const wk=c.wk,pose=wk<30?'sit':wk<70?'howl':'run',dx=wk<70?0:-(wk-70)*0.6;drawXolo(x+dx,GY,wk<70?-1:-1,st,pose,wk>100?Math.max(0,(130-wk)/30):1);}}
  if(L.dog){const d=L.dog;drawXolo(d.x+ox,d.y,d.f,st,d.pose);}
  if(spirit&&state==='level'&&!L.mictlan){drawXolo(spirit.x+ox,spirit.y+10,P.f,st,'run',0.55+0.2*Math.sin(st*0.1));}
  if(decoy){X.globalAlpha=0.55+0.25*Math.sin(st*0.3);drawHero(Math.round(decoy.x+ox),Math.round(decoy.y),hero,{f:decoy.f,pose:'stand',t:st,ax:decoy.f,ay:0,sil:(st>>2)%2?'#c8a8ff':'#8af0ff'});X.globalAlpha=1;}
  if(boss&&boss.kind==='col')drawCol(ox);}
function drawCol(ox){if(S8OK)return col8(ox);const b=boss,x=Math.round(b.x+ox),dy=b.rise*1.3+(b.dying?Math.min(80,b.dying*0.5):0)+b.bob,cl=L.clean||0;
  const T=b.fl>0?'#5a4a7a':cl>0.3?'#2a5a8a':'#1a1028',S='#4a2a7a';
  R(x-46,148+dy,92,40,T);R(x-40,120+dy,80,30,T);R(x-32,98+dy,64,24,T);R(x-20,80+dy,40,20,T);R(x-14,72+dy,28,10,T);
  const sw=Math.round(Math.sin(b.t*0.07)*5);R(x-62,112+dy+sw,18,10,T);R(x-70,118+dy+sw,12,26,T);R(x-74,140+dy+sw,14,10,T);R(x+44,112+dy-sw,18,10,T);R(x+56,118+dy-sw,12,26,T);
  R(x-30,100+dy,10,2,S);R(x-18,82+dy,8,2,S);R(x-38,124+dy,8,2,S);for(let i=0;i<5;i++)R(x-24+i*12,96+dy+(i%2)*30,8,1,HUE(i*70+st*4,55));
  for(let i=0;i<4;i++){const dx=-34+i*22,dd=(b.t*0.6+i*13)%22;R(x+dx,150+dy+dd,2,4,T);}
  const ey=82+dy;R(x-10,ey,6,4,'#ffb030');R(x+4,ey,6,4,'#ffb030');R(x-9,ey+1,2,2,'#fff6a0');R(x+5,ey+1,2,2,'#fff6a0');R(x-8,ey+9,16,3,'#0a0612');
  const cy=122+dy;if(b.open){const p=Math.sin(st*0.3);R(x-11,cy-1,22,24,'#0a0612');R(x-9,cy+1,18,20,HUE(st*10));R(x-6,cy+4,12,14,HUE(st*10+60));R(x-3,cy+7,6,8,'#fff');sparkle(x+8,cy+2,2+Math.round(p),'#fff');}
  else{R(x-10,cy,20,22,'#0a0612');R(x-7,cy+4,14,14,'#2a1a3a');R(x-2,cy+9,4,4,'#5a3a6a');}
  if(!b.dying&&b.rise<=0){const w=120,hw=Math.round(w*b.hp/b.mx);R(VW/2-w/2-1,VH-25,w+2,6,'#1a0838');R(VW/2-w/2,VH-24,hw,4,HUE(st*4,55));txt('CHAPOPOTE COLOSSUS',VW/2,VH-33,'#c8a8ff',1,1,'#1a0838');}}
function drawBolt(b,ox){const n=6;let px=b.x1+ox,py=b.y1;X.globalAlpha=Math.min(1,b.l/6);for(let i=1;i<=n;i++){const t=i/n,nx=b.x1+(b.x2-b.x1)*t+ox+(i<n?rnd(-5,5):0),ny=b.y1+(b.y2-b.y1)*t+(i<n?rnd(-5,5):0);const s=Math.max(Math.abs(nx-px),Math.abs(ny-py));for(let k=0;k<s;k+=1){const xx=px+(nx-px)*k/s,yy=py+(ny-py)*k/s;R(xx-1,yy-1,3,3,'#7af8ff');R(xx,yy,1,1,'#fff');}px=nx;py=ny;}X.globalAlpha=1;}
function v7Front(ox){const p=P;
  for(const g of GP){
    if(g.k==='torn'){const x=Math.round(g.x+ox);for(let i=0;i<14;i++){const w=6+i*1.6+Math.sin(st*0.4+i)*3,yy=GY-4-i*5,xo=Math.sin(st*0.3+i*0.6)*4;X.globalAlpha=0.75;R(x+xo-w/2,yy,w,3,HUE(i*25+st*10));X.globalAlpha=1;R(x+xo-w/2,yy,1,1,'#fff');}for(let i=0;i<3;i++){const a=st*0.3+i*2.1;R(x+Math.cos(a)*14,GY-30+Math.sin(a)*20,3,1,'#50f0a0');}}
    else if(g.k==='serp'){const x0=p.x+p.f*8+ox,y0=p.y-14,len=VW;for(let i=0;i<len;i+=3){const xx=x0+p.f*i,yy=y0+Math.sin((i+st*4)*0.06)*5;if(xx<-4||xx>VW+4)break;R(xx-2,yy-3,4,6,(i/3)%2<1?'#30e0d0':'#ff8a20');R(xx-1,yy-1,2,2,'#fff6a0');}
      const hx=x0+p.f*Math.min(len,40+Math.min(200,(150-g.t)*10)),hy=y0;R(hx-5,hy-5,10,10,'#30e0d0');R(hx+p.f*3-1,hy-4,2,2,'#fff');R(hx+p.f*5,hy+2,3,2,'#ff8a20');}
    else if(g.k==='wave'){const x=Math.round(g.x+ox);for(let i=0;i<5;i++){const h=24-i*4;R(x-g.f*i*5-4,GY-h,8,h,i===0?'#a0fff0':i%2?'#30e0a0':'#20b0c0');}R(x-3,GY-26,6,2,'#fff');}}
  v71Front(ox);v72Front(ox);v74Front(ox);for(const b of bolts)drawBolt(b,ox);
  if(L.dog&&L.dog.msgT>0){const d=L.dog,x=Math.round(d.x+ox);txt(d.msg,x,Math.round(d.y)-30,'#7af8ff',1,1,'#1a1060');}
  const c=L.crack;if(c&&c.broken&&c.dog===0){if(Math.abs(P.x-c.x)<60)txt(isTouch?'PUSH THE PAD UP TO WAKE HIM':'PRESS UP TO WAKE HIM',c.x+ox,GY-58,'#7af8ff',1,1,'#1a1060');const z=Math.floor(st/20)%3;for(let i=0;i<=z;i++)txt('z',c.x+ox+6+i*5,GY-18-i*6,'#c8e8ff',1,0,'#1a1060');}
  const f=L.flood;if(f){const fx=Math.round(f.x+ox);if(fx>-30){R(0,0,Math.max(0,fx),VH,'#1c0c30');for(let y=0;y<VH;y+=6){const w=Math.round(6+Math.sin(y*0.2+st*0.25)*5);R(fx,y,w,6,'#1c0c30');R(fx+w-2,y,3,3,HUE(y*5+st*6,60));}for(let i=0;i<8;i++){const yy=(st*2+i*47)%VH;R(fx-8-i*9,yy,3,3,'#6a4aa0');R(fx-8-i*9,yy,1,1,'#c8a8ff');}if(st%30<15)txt('TAR FLOOD!',Math.max(fx+30,40),40,'#ff8ad0',1,1,'#1a0838');}}}
function drawFires(ox){for(const f of (L.fires||[])){if(f.x<cam.x-20||f.x>cam.x+VW+20)continue;const x=Math.round(f.x+ox);R(x-10,GY-2,20,3,'#2a1830');R(x-6,GY-12,12,10,'#5a3a7a');R(x-6,GY-12,12,1,'#8a6ac0');R(x-6,GY-8,12,1,'#3a2050');
    if(f.on){const k=Math.floor(st/4)%3;R(x-8,GY-20-k,16,9+k,'#ff4a20');R(x-6,GY-26+k,12,8,'#ff8a20');R(x-4,GY-31-k,8,7,'#ffc030');R(x-2,GY-35+k,4,5,'#fff060');R(x-1,GY-22,2,6,'#fff');R(x-9,GY-15,2,3,'#ff4a20');R(x+7,GY-16+k,2,3,'#ff8a20');}else{R(x-5,GY-14,10,2,'#5a4a6a');}}}
function v7Top(ox){drawFires(ox);
  if(GP.some(g=>g.k==='rain')){X.globalAlpha=0.24;R(0,0,VW,VH,'#2040a0');X.globalAlpha=0.9;for(let i=0;i<90;i++){const x=(i*53+st*3)%VW,y=(i*37+st*9)%VH;R(x,y,1,6,i%3?'#3a70e0':'#e0f4ff');}X.globalAlpha=1;if(st%60<3){X.globalAlpha=0.25;R(0,0,VW,VH,'#e0f4ff');X.globalAlpha=1;}}
  if(slowT>0){X.globalAlpha=0.12;R(0,0,VW,VH,'#8090ff');X.globalAlpha=1;X.fillStyle='#e8eeff';X.beginPath();X.arc(VW-22,56,8,0,Math.PI*2);X.fill();X.fillStyle='#3a2a70';X.beginPath();X.arc(VW-18,53,7,0,Math.PI*2);X.fill();txt('SLOW',VW-22,68,'#d8e4ff',1,1,'#1a0838');}
  if(sunT>0){X.globalAlpha=Math.min(1,sunT/30);R(0,0,VW,VH,'#fff6c0');X.globalAlpha=1;if(sunT>20){const cx=VW/2,cy=60;for(let i=0;i<16;i++){const a=i/16*Math.PI*2+st*0.05;for(let r=20;r<160;r+=6)R(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3,3,'#ffd030');}R(cx-14,cy-14,28,28,'#ffb020');R(cx-9,cy-9,18,18,'#fff6a0');}}}
const DK=document.createElement('canvas'),DX=DK.getContext('2d');let CRYL=[];
function caveDark(ox){if(DK.width!==VW||DK.height!==VH){DK.width=VW;DK.height=VH;}const cl=L.clean||0;
  const base=L.arena?(boss?0.55:0.7)*(1-cl*0.75):0.86;DX.globalCompositeOperation='source-over';DX.clearRect(0,0,VW,VH);DX.fillStyle='rgba(8,2,26,'+base+')';DX.fillRect(0,0,VW,VH);
  DX.globalCompositeOperation='destination-out';const lt=(x,y,r)=>{if(x<-r||x>VW+r)return;const g=DX.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(0.55,'rgba(0,0,0,0.7)');g.addColorStop(1,'rgba(0,0,0,0)');DX.fillStyle=g;DX.fillRect(x-r,y-r,r*2,r*2);};
  const p=P;lt(p.x+ox,p.y-14,p.giant>0?110:76);if(L.dog)lt(L.dog.x+ox,L.dog.y-10,66);
  for(let k=Math.floor(cam.x*0.5/70)-1;k<Math.floor((cam.x*0.5+VW)/70)+2;k++){const x=k*70-cam.x*0.5+32,cy=126+hsh(k*5)%40;lt(x,cy,26);}
  for(let x=Math.ceil(cam.x/24)*24;x<cam.x+VW;x+=24)if(hsh(x)%5<2)lt(x+ox,GY-3,14);
  for(const q of L.paws)if(q.u===0)lt(q.x+ox,q.y-4,18);
  for(const s of L.shrines)if(!s.room&&!s.got)lt(s.x+ox,s.y-20,26);
  let n=0;for(const b of bullets){if(n++>24)break;lt(b.x+ox,b.y,18);}
  for(const b of bolts)lt((b.x1+b.x2)/2+ox,(b.y1+b.y2)/2,60);
  if(litT>0)lt(p.x+ox,p.y-14,110);
  for(const g of GP){if(g.k==='torn'||g.k==='wave')lt(g.x+ox,GY-24,50);if(g.k==='serp')for(let i=0;i<VW;i+=40)lt(p.x+ox+p.f*i,p.y-14,34);}
  if(boss&&boss.open){const c=bossCore();lt(c.x+12+ox,c.y+12,46);}if(L.gate)lt(L.gate.x+ox,GY-34,40);
  if(L.flood)for(let y=20;y<VH;y+=50)lt(L.flood.x+ox,y,40);
  DX.globalCompositeOperation='source-over';X.drawImage(DK,0,0);}
function godHud(){const k=curGod(),G=k&&GODS[k],cost=G&&G.cost||100,w=84,x0=Math.round(VW/2-w/2),y=VH-10,full=G&&godM>=cost;
  R(x0-2,y-2,w+4,8,'#2a0f50');R(x0-1,y-1,w+2,6,'#5a2a90');const fw=Math.round(w*godM/100);
  for(let i=0;i<fw;i++)R(x0+i,y,1,4,full?HUE(i*5+st*8):(G?G.c:'#8a6aa0'));R(x0,y,fw,1,'rgba(255,255,255,0.6)');
  if(cost<100){const m=x0+Math.round(w*cost/100);R(m,y-1,1,6,'#fff');R(x0+Math.round(w*2*cost/100),y-1,1,6,'#fff');}
  txt(G?G.n+(full?' READY!':''):'GOD POWER: FIND A SHRINE',VW/2,y-9,full?'rainbow':'#fff',1,1,'#3a1060');
  if(gods().length>1&&!isTouch)txt('C:GOD V:SWAP',x0+w+6,y-1,'#c8a8ff',1,0,'#1a0838');else if(!isTouch&&G)txt('C:GOD',x0+w+6,y-1,'#c8a8ff',1,0,'#1a0838');
  if(P&&P.dash>0){for(let i=0;i<P.dash;i++)drawPaw(x0-12-i*9,y+4,1,'#7af8ff');}
  if(P&&P.dj>0)txt('3X JUMP',x0-16,y-9,'#50f0a0',1,2,'#1a0838');
  const bG=$('btnG');if(bG&&st%10===0){bG.classList.toggle('full',!!full);}}
function blueHole(ox,oy){const x=20*TS+ox,y=12*TS+oy,pul=0.5+0.5*Math.sin(st*0.12);X.globalAlpha=0.35*pul;R(x-4,y-4,TS+8,TS+8,'#7af8ff');X.globalAlpha=1;R(x+1,y+2,TS-2,TS-4,'#2a3aa0');R(x+2,y+3,TS-4,TS-6,'#4a6ae0');drawPaw(x+TS/2,y+TS/2+3,0.6+0.4*pul,'#c0ffff');if(st%8===0)parts.push({x:x+rnd(0,TS)-ox,y:y+rnd(0,TS)-oy,vx:0,vy:-0.4,l:20,t:'s',s:2});
  if(Math.abs(M.x-20.5*TS)<40&&Math.abs(M.y-12.5*TS)<40)txt('ROAD TO MICTLAN',x+TS/2,y-10,'#7af8ff',1,1,'#1a1060');}
function drawCaveIntro(){R(0,0,VW,VH,'#0a0420');for(let i=0;i<40;i++){const x=(i*61)%VW,y=(i*43+st*6)%VH;R(x,y,2,8,HUE(i*40,55));}
  const fy=Math.min(150,30+st*1.2);actors(()=>{drawHero(VW/2-20,Math.round(fy),hero,{f:1,pose:'fall',t:st,ax:1,ay:0});drawXolo(VW/2+24,Math.round(fy)-4,-1,st,'run');},1);
  for(let i=0;i<3;i++)bolts.length<3&&0;txt('ROAD TO MICTLAN',VW/2,40,'rainbow',3,1,'#2a0f60');txt('XOLOTL LEADS YOU INTO THE UNDERWORLD CAVES',VW/2,70,'#7af8ff',1,1,'#1a1060');}

// ===== v0.7.1: the remaining 8 god powers =====
let XPAL=null;
Object.assign(GODS,{tlalte:{n:'TLALTECUHTLI',p:'EARTHSHAKER',c:'#c08a50'},xiuh:{n:'XIUHTECUHTLI',p:'TURQUOISE FIRE RING',c:'#40e8d8'},centeo:{n:'CENTEOTL',p:'CORN KERNEL STORM',c:'#ffe040'},mayahuel:{n:'MAYAHUEL',p:'AGAVE THORNS + SAP',c:'#7ad870'},mixcoatl:{n:'MIXCOATL',p:'STAR ARROWS',c:'#f0f0ff'},itzpa:{n:'ITZPAPALOTL',p:'OBSIDIAN BUTTERFLIES',c:'#9a70e0'},mictlante:{n:'MICTLANTECUHTLI',p:'SPIRIT-DOG CHARGE',c:'#e8e0ff'},xipe:{n:'XIPE TOTEC',p:'REGROWING VINE ARMOR',c:'#50d060'}});
function covers(){return L.covers||(L.covers=[]);}
function addCover(x,k){x=Math.round(x);if(!isGround(x)&&!L.mictlan)return;const c={x:x,k:k,h:0,mh:k==='rock'?32:38,hp:k==='rock'?14:10,t:720,fl:0};covers().push(c);for(let i=0;i<10;i++)parts.push({x:x+rnd(-8,8),y:GY-2,vx:rnd(-0.8,0.8),vy:-rnd(0.5,1.6),l:22,t:'dust',s:rnd(2,4)});return c;}
function bossTry(x,y,rad,dmg){if(!boss||boss.dying||!boss.open)return false;const c=bossCore();if(Math.hypot(c.x+12-x,c.y+12-y)<rad){hitBoss(dmg);return true;}return false;}
function inView(e){return !e.dead&&e.x>cam.x-12&&e.x<cam.x+VW+12;}
Object.assign(GACT,{
  tlalte(){const p=P;shake=Math.max(shake,14);sfx('boom');GP.push({k:'quake',x:p.x,r:0,t:46,hit:[]});addCover(p.x+p.f*30,'rock');addCover(p.x-p.f*26,'rock');
    for(let i=0;i<24;i++)parts.push({x:p.x+rnd(-40,40),y:GY-2,vx:rnd(-1.5,1.5),vy:-rnd(1,3),l:rnd(20,34),t:'b',s:rnd(2,4)});if(!p.onG)p.vy=7;},
  xiuh(){P.ring=480;P.ringA=0;sfx('power');pop(P.x,P.y-44,'FIRE RING SHIELD','#40e8d8');},
  centeo(){GP.push({k:'corn',t:160});addCover(P.x+P.f*24,'stalk');pop(P.x,P.y-44,'CORN STALK COVER','#ffe040');},
  mayahuel(){GP.push({k:'thorn',t:40});GP.push({k:'sap',t:330});hp=Math.min(maxHp(),hp+1);tacoBump=10;pop(P.x,P.y-44,'+1 SAP HEAL','#7ad870');},
  mixcoatl(){GP.push({k:'stars',t:62});},
  itzpa(){const fl=[];for(let i=0;i<12;i++)fl.push({x:P.x+rnd(-10,10),y:P.y-16+rnd(-10,10),vx:rnd(-1,1),vy:rnd(-1,1),cd:0,a:i/12*Math.PI*2,c:HUE(i*30)});GP.push({k:'fly',t:420,fl:fl});sfx('throw');},
  mictlante(){const p=P,f=p.f,sx=f>0?cam.x-24:cam.x+VW+24;GP.push({k:'dogs',t:170,f:f,d:[0,1,2].map(i=>({x:sx-f*i*26,y:GY-(i===1?10:0),hit:[],hb:0}))});sfx('howl');setTimeout(()=>sfx('bark'),250);litT=Math.max(litT,10);},
  xipe(){P.vine=900;P.vhp=3;P.vgrow=0;sfx('power');for(let i=0;i<16;i++)parts.push({x:P.x+rnd(-8,8),y:P.y-rnd(0,24),vx:rnd(-0.6,0.6),vy:-rnd(0.2,1),l:30,t:'leaf',s:2,c:i%3?'#50d060':'#ffe060'});pop(P.x,P.y-44,'VINE ARMOR X3','#50d060');}
});
function v71Shield(){const p=P;
  if(p.vine>0&&p.vhp>0){p.vhp--;p.vgrow=0;p.inv=50;sfx('ping');shake=Math.max(shake,3);for(let i=0;i<10;i++)parts.push({x:p.x+rnd(-8,8),y:p.y-rnd(2,24),vx:rnd(-1.4,1.4),vy:-rnd(0.4,1.6),l:28,t:'leaf',s:2,c:i%2?'#50d060':'#a0ff80'});pop(p.x,p.y-40,'VINES '+p.vhp+'/3','#a0ff80');return true;}
  if(p.ring>0){p.ring=Math.max(1,p.ring-90);p.inv=40;sfx('tss');rainbowBurst(p.x,p.y-12,10);return true;}
  return false;}
function v71Upd(){const p=P;if(!p)return;
  if(p.ring>0){p.ring--;p.ringA=(p.ringA||0)+0.12;
    for(const b of ebul)if(Math.hypot(b.x-p.x,b.y-(p.y-12))<26){b.l=0;sfx('tss');for(let i=0;i<4;i++)parts.push({x:b.x,y:b.y,vx:rnd(-1,1),vy:-rnd(0.3,1.2),l:14,t:'tr',s:2,c:i%2?'#40e8d8':'#fff6a0'});}
    if(p.t%6===0)for(const e of enemies)if(!e.dead&&Math.hypot(e.x-p.x,e.y-e.h/2-(p.y-12))<30)hitEnemy(e,null,0.8);
    if(p.t%6===0)bossTry(p.x,p.y-12,44,0.6);
    for(const f of (L.fires||[]))if(f.on&&Math.abs(f.x-p.x)<26){}}
  if(p.vine>0){p.vine--;if(p.vhp<3&&++p.vgrow>=150){p.vgrow=0;p.vhp++;sfx('pickup');pop(p.x,p.y-40,'VINES REGROW '+p.vhp+'/3','#a0ff80');for(let i=0;i<6;i++)parts.push({x:p.x+rnd(-6,6),y:p.y-rnd(4,22),vx:0,vy:-0.4,l:24,t:'leaf',s:2,c:'#ffe060'});}if(p.vine===1)pop(p.x,p.y-40,'VINES WITHER','#a0ff80');}
  const cv=covers();for(const c of cv){c.t--;if(c.fl>0)c.fl--;if(c.h<c.mh)c.h=Math.min(c.mh,c.h+4);
    if(c.h<c.mh&&c.h>8&&!c.up){c.up=1;for(const e of enemies)if(!e.dead&&Math.abs(e.x-c.x)<12)hitEnemy(e,null,3);}
    for(const b of ebul)if(b.l>0&&Math.abs(b.x-c.x)<8&&b.y>GY-c.h-2){b.l=0;c.hp--;c.fl=4;sfx('hit');for(let i=0;i<3;i++)parts.push({x:b.x,y:b.y,vx:-Math.sign(b.vx||1)*rnd(0.4,1.4),vy:-rnd(0.3,1.2),l:14,t:c.k==='stalk'?'leaf':'dust',s:2,c:'#ffe040'});}
    if(c.hp<=0||c.t<=0){c.gone=1;for(let i=0;i<10;i++)parts.push({x:c.x+rnd(-6,6),y:GY-rnd(0,c.h),vx:rnd(-1,1),vy:-rnd(0.2,1.4),l:24,t:c.k==='stalk'?'leaf':'dust',s:rnd(2,4),c:'#ffe040'});}}
  L.covers=cv.filter(c=>!c.gone);
  for(const g of GP){
    if(g.k==='quake'){g.r+=5;if(g.t%6===0)shake=Math.max(shake,4);
      for(const e of enemies){if(e.dead||g.hit.includes(e))continue;const d=Math.abs(e.x-g.x);if(d<g.r&&d>g.r-14&&e.y>GY-30){g.hit.push(e);hitEnemy(e,null,4.5);for(let i=0;i<5;i++)parts.push({x:e.x+rnd(-5,5),y:GY-2,vx:rnd(-1,1),vy:-rnd(1,2.4),l:20,t:'b',s:3});}}
      for(const s of [-1,1]){const x=g.x+s*g.r;if(g.t%2===0){parts.push({x:x,y:GY-2,vx:s*0.4,vy:-rnd(1,2.6),l:18,t:'b',s:rnd(2,4)});parts.push({x:x,y:GY-rnd(2,8),vx:0,vy:-0.6,l:14,t:'tr',s:2,c:HUE(g.r*3+st*8)});}}
      for(const w of (L.tarw||[]))if(!w.broken&&!w.room&&Math.abs(w.x+6-g.x)<g.r&&Math.abs(w.x+6-g.x)>g.r-8){w.hp-=3;w.fl=6;if(w.hp<=0)breakTar(w);}
      if(!g.hb&&boss&&boss.open&&!boss.dying&&Math.abs(bossCore().x+12-g.x)<g.r){g.hb=1;hitBoss(5);}
      if(L.crack&&!L.crack.broken&&Math.abs(L.crack.x-g.x)<g.r&&!g.hc){g.hc=1;crackHit('H');crackHit('H');crackHit('H');}}
    else if(g.k==='corn'){if(g.t%3===0){const a=(p.f>0?0:Math.PI)+rnd(-0.07,0.07)+(p.ay<0?-0.3*p.f:0);mkB('corn',p.x+p.f*10,p.y-13+rnd(-2,2),a,6.2,{r:2,dmg:0.9,life:70});if(g.t%6===0)sfx('shot');parts.push({x:p.x-p.f*2,y:p.y-14,vx:-p.f*rnd(0.4,1),vy:-rnd(0.8,1.6),l:22,t:'cas',s:1,c:'#7ad870'});}
      if(g.t%9===0)parts.push({x:p.x+p.f*14,y:p.y-14,vx:p.f*0.3,vy:-0.3,l:10,t:'tr',s:2,c:HUE(st*12)});}
    else if(g.k==='thorn'){if(g.t===39||g.t===27||g.t===15){const base=p.f>0?0:Math.PI;for(let i=-4;i<=4;i++)mkB('thorn',p.x+p.f*8,p.y-14,base+i*0.13+rnd(-0.03,0.03),5.6,{r:2,dmg:1.6,pierce:true,life:56});for(let i=-1;i<=1;i++)mkB('thorn',p.x-p.f*6,p.y-14,base+Math.PI+i*0.2,4.6,{r:2,dmg:1.2,pierce:true,life:36});sfx('throw');}}
    else if(g.k==='sap'){if(g.t%8===0)parts.push({x:p.x+rnd(-8,8),y:p.y-rnd(14,26),vx:0,vy:0.6,l:22,t:'sap',s:2,c:(g.t>>3)%2?'#ffd040':'#a0ff80'});if(g.t===220||g.t===110||g.t===1){if(hp<maxHp()){hp=Math.min(maxHp(),hp+1);tacoBump=10;sfx('pickup');pop(p.x,p.y-40,'+1 SAP','#a0ff80');}}}
    else if(g.k==='stars'){if(g.t===61||g.t===41||g.t===21){const base=p.f>0?0:Math.PI;for(let i=-2;i<=2;i++){const b=mkB('sarrow',p.x+p.f*8,p.y-14,base+i*0.38-(i===0?0:0.25*Math.sign(i))*0,4.4,{r:2,dmg:2.6,life:170});b.home=0.16;}sfx('laser');}}
    else if(g.k==='fly'){for(const b of g.fl){let tg=null,bd=200;for(const e of enemies){if(!inView(e))continue;const d=Math.hypot(e.x-b.x,e.y-e.h/2-b.y);if(d<bd){bd=d;tg=e;}}
        let tx,ty;if(tg){tx=tg.x;ty=tg.y-tg.h/2;}else if(boss&&boss.open&&!boss.dying){const c=bossCore();tx=c.x+12;ty=c.y+12;}else{b.a+=0.07;tx=p.x+Math.cos(b.a)*22;ty=p.y-18+Math.sin(b.a*1.3)*12;}
        b.vx+=(tx-b.x)*0.012+rnd(-0.25,0.25);b.vy+=(ty-b.y)*0.012+rnd(-0.25,0.25);b.vx*=0.92;b.vy*=0.92;const sp=Math.hypot(b.vx,b.vy);if(sp>3.4){b.vx*=3.4/sp;b.vy*=3.4/sp;}b.x+=b.vx;b.y+=b.vy;if(b.cd>0)b.cd--;
        if(tg&&b.cd===0&&Math.hypot(tg.x-b.x,tg.y-tg.h/2-b.y)<9){hitEnemy(tg,null,1.3);b.cd=18;parts.push({x:b.x,y:b.y,vx:0,vy:-0.4,l:12,t:'tr',s:2,c:b.c});}
        if(b.cd===0&&bossTry(b.x,b.y,16,1)){b.cd=20;}
        for(const q of ebul)if(q.l>0&&Math.hypot(q.x-b.x,q.y-b.y)<6){q.l=0;b.cd=8;}
        if(st%5===0)parts.push({x:b.x,y:b.y,vx:0,vy:0.2,l:12,t:'s',s:1});}
      if(g.t===1)for(const b of g.fl)rainbowBurst(b.x,b.y,4);}
    else if(g.k==='dogs'){for(const d of g.d){d.x+=g.f*4.6;if(st%2===0)parts.push({x:d.x-g.f*8,y:d.y-6+rnd(-4,4),vx:-g.f*0.4,vy:-0.3,l:18,t:'tr',s:2,c:(st&2)?'#e8e0ff':'#ffa030'});
        for(const e of enemies){if(e.dead||d.hit.includes(e))continue;if(Math.abs(e.x-d.x)<12&&e.y>GY-60){d.hit.push(e);hitEnemy(e,null,5);bolts.push({x1:d.x,y1:d.y-8,x2:e.x,y2:e.y-e.h/2,l:6});}}
        for(const b of ebul)if(Math.abs(b.x-d.x)<10&&b.y>GY-40)b.l=0;
        if(!d.hb&&boss&&boss.open&&!boss.dying&&Math.abs(bossCore().x+12-d.x)<20){d.hb=1;hitBoss(4);}
        for(const w of (L.tarw||[]))if(!w.broken&&!w.room&&Math.abs(w.x+6-d.x)<8)breakTar(w);}
      if(g.d.every(d=>g.f>0?d.x>cam.x+VW+30:d.x<cam.x-30))g.t=0;}}}
function drawCover(c,ox){const x=Math.round(c.x+ox),h=Math.round(c.h),y=GY-h,fl=c.fl>0;
  if(c.k==='rock'){R(x-8,y,16,h,fl?'#c8a8ff':'#8a6a5a');R(x-8,y,16,2,'#c8a090');R(x-8,y,2,h,'#a8887a');R(x+5,y,3,h,'#6a4a4a');R(x-9,y+4,1,h-4,'#6a4a4a');
    for(let i=4;i<h;i+=7)R(x-6+((i*3)%9),y+i,5,1,'#5a3a3a');for(let i=0;i<3;i++)R(x-3+i*3,y+6+i*8,2,2,HUE(i*90+st*5,60));R(x-3,y+2,6,3,'#40e0a0');R(x-2,y+3,4,1,'#c0fff0');
    if(c.h>=c.mh&&st%14===0)parts.push({x:c.x+rnd(-6,6),y:y+rnd(0,h),vx:0,vy:-0.3,l:14,t:'s',s:1});}
  else{const sw=Math.round(Math.sin(st*0.05+c.x)*1.5);R(x-2,y,4,h,fl?'#ffffa0':'#3aa040');R(x-2,y,1,h,'#7ae070');for(let i=6;i<h;i+=9){const s=(i/9)%2?1:-1;R(x+(s>0?2:-9),y+i,7,2,'#50c050');R(x+(s>0?6:-9),y+i-2,3,2,'#7ae070');}
    R(x-4+sw,y-8,8,10,'#e8c030');R(x-3+sw,y-7,2,2,'#fff080');R(x+1+sw,y-5,2,2,'#fff080');R(x-1+sw,y-3,2,2,'#fff080');R(x-5+sw,y-4,2,7,'#7ae070');R(x+3+sw,y-4,2,7,'#7ae070');R(x-1+sw,y-11,2,4,'#ffb0e0');
    if(st%18===0)sparkle(x+sw+4,y-8,1,HUE(st*9));}}
function v71Actors(ox){for(const c of (L.covers||[]))if(c.x>cam.x-20&&c.x<cam.x+VW+20)drawCover(c,ox);
  for(const g of GP)if(g.k==='dogs'){XPAL=['#e8e0ff','#ffffff','#8a7ac0','#ffa030','#40e0ff'];for(const d of g.d)drawXolo(d.x+ox,d.y,g.f,st,'run',0.85);XPAL=null;}}
function bfly(x,y,c,t){const fl=Math.floor(t/3)%2;x=Math.round(x);y=Math.round(y);R(x-1,y-3,2,7,'#1a1028');R(x,y-4,1,1,c);
  if(fl){R(x-7,y-4,6,5,'#1a1028');R(x+1,y-4,6,5,'#1a1028');R(x-7,y-4,6,1,c);R(x+1,y-4,6,1,c);R(x-7,y-4,1,4,c);R(x+6,y-4,1,4,c);R(x-5,y-2,2,2,'#5a3a9a');R(x+3,y-2,2,2,'#5a3a9a');R(x-5,y+1,4,3,'#2a1a40');R(x+1,y+1,4,3,'#2a1a40');R(x-5,y+3,1,1,c);R(x+4,y+3,1,1,c);}
  else{R(x-3,y-7,2,8,'#1a1028');R(x+1,y-7,2,8,'#1a1028');R(x-3,y-7,2,1,c);R(x+1,y-7,2,1,c);}R(x,y-2,1,1,'#fff');}
function v71Front(ox){const p=P;
  for(const g of GP){
    if(g.k==='quake'){for(const s of [-1,1]){const x=Math.round(g.x+s*g.r+ox);X.globalAlpha=Math.min(1,g.t/20);for(let i=0;i<4;i++)R(x-s*i*5-2,GY-10+i*2,4,10-i*2,HUE(g.r*4+i*40+st*6));R(x-1,GY-12,2,3,'#fff');X.globalAlpha=1;}
      const cx=Math.round(g.x+ox);X.globalAlpha=Math.min(0.8,g.t/30);for(let i=-3;i<=3;i++)R(cx+i*10-1,GY,2,4+Math.abs(i),'#2a1830');X.globalAlpha=1;}
    else if(g.k==='fly'){for(const b of g.fl)bfly(b.x+ox,b.y,b.c,st+b.a*10);}
    else if(g.k==='corn'){const x=Math.round(p.x+p.f*12+ox),y=Math.round(p.y-16);R(x-(p.f>0?0:10),y,10,5,'#e8c030');for(let i=0;i<5;i++)R(x-(p.f>0?0:10)+i*2,y+1+(i%2),1,1,'#fff080');R(x+(p.f>0?-3:9),y-1,3,7,'#7ae070');if(st%3===0){R(x+p.f*12-2,y,4,5,'#fff6a0');}}}
  if(p.ring>0&&!p.dead){const n=10,r=23+Math.sin(st*0.2)*1.5,blink=p.ring<90&&(st>>2)%2;if(!blink){X.globalAlpha=0.18;X.fillStyle='#40e8d8';X.beginPath();X.arc(p.x+ox,p.y-12,r+4,0,Math.PI*2);X.fill();X.globalAlpha=1;
    for(let i=0;i<n;i++){const a=p.ringA+i/n*Math.PI*2,fx=Math.round(p.x+ox+Math.cos(a)*r),fy=Math.round(p.y-12+Math.sin(a)*r),k=(st>>2)%2;R(fx-3,fy-3-k,6,7+k,'#20a8c8');R(fx-2,fy-6,4,6,'#40e8d8');R(fx-1,fy-8+k,2,3,'#c0fff8');R(fx-1,fy-1,2,3,'#fff6a0');if(i%2===0)R(fx,fy-6+k,1,2,HUE(st*10+i*45));}}}
  if(p.vine>0&&!p.dead){const x=Math.round(p.x+ox),y=Math.round(p.y),s=p.giant>0?2:1;for(let i=0;i<p.vhp;i++){const yy=y-4-i*7*s,ph=Math.sin(st*0.15+i);R(x-6,yy,12,2,'#2a8a3a');R(x-6+((i%2)?8:0),yy-1,4,1,'#3aa040');R(x+(i%2?6:-8),yy-3+Math.round(ph),3,3,'#50d060');R(x+(i%2?7:-7),yy-2+Math.round(ph),1,1,'#a0ff80');R(x+(i%2?-8:6),yy-1,2,2,HUE(i*120+60,70));}
    if(p.vhp<3){const g=(p.vgrow||0)/150;R(x-5,y-28,10,2,'#1a2a1a');R(x-5,y-28,Math.round(10*g),2,'#a0ff80');}}}
function v71BD(b,x){
  if(b.k==='corn'){R(x-2,b.y-1,4,3,'#e8c030');R(x-1,b.y-1,2,1,'#fff6a0');return true;}
  if(b.k==='thorn'){const u=Math.sign(b.vx||1);R(x-3,b.y,6,1,'#3aa040');R(x+u*3,b.y,1,1,'#fff');R(x-u*3,b.y-1,1,3,'#7ae070');return true;}
  if(b.k==='sarrow'){const yy=Math.round(b.y),u=Math.sign(b.vx||1);R(x-u*8,yy,8,1,'#e0e8ff');R(x-u*9,yy-1,2,3,HUE(st*14+b.x));sparkle(x,yy,3,HUE(st*14+b.x));R(x-1,yy-1,3,3,'#fff');if(st%2===0)parts.push({x:b.x,y:b.y,vx:0,vy:0,l:10,t:'tr',s:2,c:HUE(st*10+b.x*2)});return true;}
  return false;}
function v71PD(p,x){
  if(p.t==='leaf'){X.globalAlpha=Math.min(1,p.l/14);R(x-1,p.y-1,3,2,p.c);R(x,p.y-1,1,1,'#fff');X.globalAlpha=1;return true;}
  if(p.t==='sap'){X.globalAlpha=Math.min(1,p.l/12);R(x-1,p.y-1,2,3,p.c);R(x,p.y-1,1,1,'#fff');X.globalAlpha=1;return true;}
  return false;}
function v71Mini(){const a=banner.age||0,dy=a<8?Math.round((8-a)*-2):0;X.save();X.translate(0,dy);const bw=banner.t.length*8;R(Math.round(VW/2-bw/2-6),23,bw+12,banner.s?22:13,'#2a0f50');X.globalAlpha=0.5;R(Math.round(VW/2-bw/2-6),23,bw+12,1,HUE(st*6));X.globalAlpha=1;txt(banner.t,VW/2,25,'rainbow',2,1,'#5a1090');if(banner.s)txt(banner.s,VW/2,37,'#fff',1,1,'#7a1aa0');X.restore();}

// ===== v0.7.2: flashy god powers - auras, bursts, eruptions, summons (no guns) =====
let CASTS=[],FLASH=0,FLASHC='#fff';
Object.assign(GODS.coyol,{p:'MOONFALL'});Object.assign(GODS.centeo,{p:'GOLDEN HARVEST'});Object.assign(GODS.mayahuel,{p:'AGAVE BLOOM + SAP'});Object.assign(GODS.mixcoatl,{p:'STARFALL'});Object.assign(GODS.huitz,{p:'FIRE SERPENT SPIRAL'});Object.assign(GODS.chalchi,{p:'JADE GEYSERS'});Object.assign(GODS.xochi,{p:'BLOOMING SPIRIT'});Object.assign(GODS.itzpa,{p:'BUTTERFLY VORTEX'});
function vis(){const a=[];for(const e of enemies)if(inView(e))a.push(e);return a.sort((m,n)=>Math.abs(m.x-P.x)-Math.abs(n.x-P.x));}
function flash(n,c){if(n>=FLASH){FLASH=n;FLASHC=c||'#fff';}}
function castFx(c){const p=P;CASTS.push({x:p.x,y:p.y,t:32,c:c});flash(5,c);hitStop=Math.max(hitStop,6);shake=Math.max(shake,5);
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;parts.push({x:p.x+Math.cos(a)*34,y:p.y-14+Math.sin(a)*26,vx:-Math.cos(a)*1.5,vy:-Math.sin(a)*1.2,l:20,t:'tr',s:2,c:i%2?c:'#fff'});}}
function burstAt(x,y,c,n){parts.push({x:x,y:y,vx:0,vy:0,l:18,t:'ring',s:0,c:c});for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rnd(0,0.4),s=rnd(1,2.8);parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rnd(14,26),t:'tr',s:2,c:i%3?c:HUE(i*40+st*8)});}if(n>6)parts.push({x:x,y:y-4,vx:0,vy:-0.4,l:20,t:'s',s:3});}
function hitR(x,y,r,dmg,hit){let n=0;for(const e of enemies){if(e.dead||(hit&&hit.includes(e)))continue;if(Math.hypot(e.x-x,e.y-e.h/2-y)<r+e.h/3){if(hit)hit.push(e);hitEnemy(e,null,dmg);n++;}}return n;}
function wallsR(x,r,dmg){for(const w of (L.tarw||[]))if(!w.broken&&!w.room&&Math.abs(w.x+6-x)<r){w.hp-=dmg;w.fl=6;if(w.hp<=0)breakTar(w);}}
function bulR(x,y,r){for(const b of ebul)if(b.l>0&&Math.hypot(b.x-x,b.y-y)<r){b.l=0;parts.push({x:b.x,y:b.y,vx:0,vy:-0.4,l:12,t:'s',s:2});}}
function strike(x,y){bolts.push({x1:x+rnd(-26,26),y1:-4,x2:x,y2:y,l:14});bolts.push({x1:x+rnd(-34,34),y1:-4,x2:x+rnd(-5,5),y2:y,l:9});burstAt(x,y,'#c0f4ff',14);flash(3,'#e8f8ff');shake=Math.max(shake,5);litT=Math.max(litT,16);sfx('zap');
  for(let i=0;i<6;i++)parts.push({x:x+rnd(-6,6),y:GY-2,vx:rnd(-1,1),vy:-rnd(1,2.4),l:18,t:'b',s:rnd(2,3)});}
function stormRound(){const v=vis().slice(0,3);for(const e of v){strike(e.x,e.y-e.h/2);hitEnemy(e,null,3.5);}
  const c=L.crack;if(c&&!c.broken&&c.x>cam.x-10&&c.x<cam.x+VW+10){strike(c.x,GY-28);crackHit('L');crackHit('L');}
  for(const w of (L.tarw||[]))if(!w.broken&&w.x>cam.x-10&&w.x<cam.x+VW+10){strike(w.x+6,w.top+14);w.hp-=2;if(w.hp<=0)breakTar(w);}
  if(boss&&!boss.dying&&boss.open){const k=bossCore();strike(k.x+12,k.y+12);hitBoss(3.5);}
  else if(!v.length)strike(P.x+P.f*rnd(40,140),GY-4);}
Object.assign(GACT,{
  tlaloc(){GP.push({k:'storm',t:250});litT=30;stormRound();fireOut(true);},
  tezca(){GP.push({k:'mirror',t:64,x:P.x,y:P.y-50,r:0,hit:[],hb:0});decoy={x:P.x-P.f*16,y:P.y,f:P.f,l:420};sfx('whoosh');},
  xochi(){P.giant=480;for(let i=0;i<40;i++)parts.push({x:P.x+rnd(-30,30),y:P.y-rnd(0,50),vx:rnd(-0.6,0.6),vy:-rnd(0.2,1),l:rnd(30,60),t:'spore',s:2,c:HUE(rnd(280,400))});GP.push({k:'bloom',t:130,hit:[],er:[],hb:0,a:0});sfx('chime');},
  huitz(){GP.push({k:'fspiral',t:150,r:8,a:0});sfx('whoosh');},
  coyol(){slowT=300;GP.push({k:'mfall',t:170,pl:[],i:0,n:0});sfx('chime');},
  chalchi(){GP.push({k:'geyser',t:100,x:P.x,r:0,hit:[],cols:[],hb:0});hp=Math.min(maxHp(),hp+2);tacoBump=10;pop(P.x,P.y-44,'+2 JADE HEAL','#30e0a0');sfx('whoosh');},
  centeo(){GP.push({k:'harvest',t:100,x:P.x,n:0,er:[],hit:[]});addCover(P.x+P.f*24,'stalk');pop(P.x,P.y-44,'CORN STALK COVER','#ffe040');sfx('rumble');},
  mayahuel(){GP.push({k:'agave',t:56,x:P.x,w:0,sp:[],hb:0});GP.push({k:'sap',t:330});hp=Math.min(maxHp(),hp+1);tacoBump=10;pop(P.x,P.y-44,'+1 SAP HEAL','#7ad870');},
  mixcoatl(){GP.push({k:'sfall',t:124,s:[],i:0});sfx('chime');},
  tlazol(){purify();GP.push({k:'pring',t:40,x:P.x,y:P.y-14});}
});
for(const k of Object.keys(GACT)){if(k==='xolotl')continue;const f=GACT[k];GACT[k]=function(){castFx(GODS[k].c);f();};}
function v72Upd(){const p=P;if(!p)return;if(FLASH>0)FLASH--;for(const c of CASTS)c.t--;CASTS=CASTS.filter(c=>c.t>0);
  for(const g of GP){
    if(g.k==='storm'){if(g.t%22===0)stormRound();if(g.t%40===0)fireOut(true);}
    else if(g.k==='mirror'){
      if(g.t>40){if(g.t%4===0)parts.push({x:g.x+rnd(-14,14),y:g.y+rnd(-16,16),vx:0,vy:-0.3,l:20,t:'smoke',s:rnd(3,5)});}
      else if(g.t===40){sfx('boom');flash(7,'#d0a0ff');shake=Math.max(shake,10);burstAt(g.x,g.y,'#b070ff',24);wallsR(g.x,170,3);
        for(let i=0;i<30;i++){const a=i/30*Math.PI*2;parts.push({x:g.x,y:g.y,vx:Math.cos(a)*rnd(2,4),vy:Math.sin(a)*rnd(2,4),l:rnd(16,28),t:'tr',s:3,c:i%3===0?'#fff':i%3===1?'#2a1840':'#b070ff'});}}
      else{g.r+=7;for(const e of enemies){if(e.dead||g.hit.includes(e))continue;const d=Math.hypot(e.x-g.x,e.y-e.h/2-g.y);if(d<g.r+8){g.hit.push(e);hitEnemy(e,null,4.5);burstAt(e.x,e.y-e.h/2,'#b070ff',8);}}
        bulR(g.x,g.y,g.r);if(!g.hb&&boss&&boss.open&&!boss.dying){const k=bossCore();if(Math.hypot(k.x+12-g.x,k.y+12-g.y)<g.r){g.hb=1;hitBoss(5);}}}}
    else if(g.k==='bloom'){g.a+=0.12;for(let i=0;i<2;i++){const a=g.a*2+i*Math.PI+rnd(-0.3,0.3),r=rnd(18,46);parts.push({x:p.x+Math.cos(a)*r,y:p.y-24+Math.sin(a)*r*0.7,vx:-Math.sin(a)*1.6,vy:Math.cos(a)*1.1,l:rnd(20,34),t:'flw',s:0,c:HUE(rnd(290,420))});}
      if(g.t%8===0&&g.t<126){const e=vis().find(q=>!g.hit.includes(q));if(e){g.hit.push(e);g.er.push({x:e.x,t:32});hitEnemy(e,null,4);}else if(g.t%16===0)g.er.push({x:p.x+(g.er.length%2?1:-1)*rnd(30,130),t:32});}
      if(!g.hb&&g.t===110&&boss&&boss.open&&!boss.dying){g.hb=1;g.er.push({x:bossCore().x+12,t:32});hitBoss(5);}
      for(const r of g.er){r.t--;if(r.t===28){sfx('pop');flowerAt(r.x,GY-30,8);hitR(r.x,GY-20,10,1.5);bulR(r.x,GY-30,22);}}g.er=g.er.filter(r=>r.t>0);}
    else if(g.k==='fspiral'){g.a+=0.2;g.r=g.t>40?Math.min(150,g.r+1.9):g.r;const cx=p.x,cy=p.y-14;
      if(g.t%6===0)for(const e of enemies)if(!e.dead&&Math.hypot(e.x-cx,e.y-e.h/2-cy)<g.r){hitEnemy(e,null,1.4);if(g.t%12===0)burstAt(e.x,e.y-e.h/2,'#ff8a20',5);}
      bulR(cx,cy,g.r);if(g.t%10===0)bossTry(cx,cy,g.r,1.3);if(g.t%12===0)wallsR(cx,g.r,1);if(g.t%10===0)sfx('tss');
      for(let i=0;i<2;i++){const u=Math.random(),a=g.a+u*Math.PI*4,rr=g.r*u;parts.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr*0.8,vx:0,vy:-rnd(0.4,1),l:16,t:'tr',s:2,c:i?'#ff8a20':'#40e8d8'});}}
    else if(g.k==='mfall'){if(g.t%14===0&&g.t<160){const v=vis();let x;g.n++;
        if(boss&&boss.open&&!boss.dying&&g.n%3===0){const k=bossCore();x=k.x+12;hitBoss(3);}
        else if(v.length){const e=v[g.i++%v.length];x=e.x;hitEnemy(e,null,3.2);}else x=p.x+rnd(-140,140);
        g.pl.push({x:x,t:24});burstAt(x,GY-6,'#d8e4ff',12);flash(2,'#d8e4ff');sfx('chime');for(const b of ebul)if(Math.abs(b.x-x)<12)b.l=0;}
      for(const q of g.pl)q.t--;g.pl=g.pl.filter(q=>q.t>0);}
    else if(g.k==='geyser'){g.r+=3.4;if(g.t%3===0)for(const s of [-1,1])g.cols.push({x:g.x+s*g.r,t:26});if(g.t%9===0)sfx('tss');
      for(const s of [-1,1]){const wx=g.x+s*g.r;
        for(const e of enemies){if(e.dead||g.hit.includes(e)||Math.abs(e.x-wx)>14||e.y<GY-60)continue;g.hit.push(e);if(e.t==='sludge'){killEnemy(e);flowerAt(e.x,e.y,3);}else hitEnemy(e,null,3.2);burstAt(e.x,e.y-e.h/2,'#a0fff0',8);}
        for(const b of ebul)if(Math.abs(b.x-wx)<16&&b.y>GY-70){b.l=0;flowerAt(b.x,b.y,1);}
        for(const q of (L.pools||[]))if(!q.clean&&wx>q.x0&&wx<q.x1){q.clean=1;flowerAt(wx,GY-4,6);}
        for(const w of (L.tarw||[]))if(!w.broken&&!w.room&&Math.abs(w.x+6-wx)<10)breakTar(w);
        for(const f of (L.fires||[]))if(f.on&&Math.abs(f.x-wx)<12){f.on=0;sfx('tss');}
        if(boss&&!boss.dying&&boss.open&&Math.abs(bossCore().x+12-wx)<16&&!g.hb){g.hb=1;hitBoss(3);}}
      for(const c of g.cols){c.t--;if(c.t===13)for(let i=0;i<3;i++)parts.push({x:c.x+rnd(-4,4),y:GY-50,vx:rnd(-1,1),vy:-rnd(0.5,1.5),l:20,t:'tr',s:2,c:i%2?'#a0fff0':'#30e0a0'});}g.cols=g.cols.filter(c=>c.t>0);}
    else if(g.k==='harvest'){if(g.t%6===0&&g.n<9){g.n++;for(const s of [-1,1])g.er.push({x:g.x+s*(26+g.n*24),t:30});const e=vis().find(q=>!g.hit.includes(q));if(e){g.hit.push(e);g.er.push({x:e.x,t:30});}}
      for(const r of g.er){r.t--;if(r.t===26){for(const e of enemies)if(!e.dead&&Math.abs(e.x-r.x)<14&&e.y>GY-60)hitEnemy(e,null,3);wallsR(r.x,12,2);if(boss&&boss.open&&!boss.dying&&Math.abs(bossCore().x+12-r.x)<24)hitBoss(2.5);bulR(r.x,GY-24,16);for(let i=0;i<5;i++)parts.push({x:r.x+rnd(-5,5),y:GY-2,vx:rnd(-1,1),vy:-rnd(1,2),l:16,t:'dust',s:rnd(2,3)});}
        if(r.t===18){sfx('pop');for(let i=0;i<12;i++){const a=-Math.PI/2+(i/11-0.5)*2.6;parts.push({x:r.x,y:GY-46,vx:Math.cos(a)*rnd(1.2,2.4),vy:Math.sin(a)*rnd(1.2,2.4),l:rnd(16,26),t:'tr',s:2,c:i%3?'#ffe040':'#fff6a0'});}parts.push({x:r.x,y:GY-46,vx:0,vy:0,l:16,t:'ring',s:0,c:'#ffe040'});}}
      g.er=g.er.filter(r=>r.t>0);}
    else if(g.k==='agave'){if(g.t===52||g.t===42||g.t===32){const R0=[0,44,90][g.w],R1=[44,90,140][g.w];g.w++;sfx('rumble');shake=Math.max(shake,6);flash(2,'#a0ff80');
        for(const e of enemies){if(e.dead)continue;const d=Math.abs(e.x-g.x);if(d<R1+6&&d>=R0-6&&e.y>GY-80){hitEnemy(e,null,2.8);burstAt(e.x,e.y-e.h/2,'#7ad870',6);}}
        for(let x=R0+6;x<=R1;x+=12)for(const s of [-1,1])g.sp.push({x:g.x+s*x+rnd(-3,3),t:26,h:rnd(30,48)-x*0.08});
        bulR(g.x,GY-30,R1);wallsR(g.x,R1,2);if(boss&&boss.open&&!boss.dying&&Math.abs(bossCore().x+12-g.x)<R1)hitBoss(2.5);}
      for(const q of g.sp){q.t--;if(q.t===20)parts.push({x:q.x,y:GY-q.h,vx:0,vy:-0.5,l:14,t:'s',s:2});}g.sp=g.sp.filter(q=>q.t>0);}
    else if(g.k==='sfall'){if(g.t%8===0&&g.t>8){const v=vis();let tx,ty;
        if(v.length){const e=v[g.i++%v.length];tx=e.x;ty=e.y-e.h/2;}else if(boss&&boss.open&&!boss.dying){const k=bossCore();tx=k.x+12;ty=k.y+12;}else{tx=p.x+rnd(-150,150);ty=GY-6;}
        const d=g.i%2?1:-1;g.s.push({sx:tx-d*rnd(50,80),sy:-10,tx:tx,ty:ty,u:0});}
      for(const s of g.s){s.u+=1/15;const x=s.sx+(s.tx-s.sx)*s.u,y=s.sy+(s.ty-s.sy)*s.u;parts.push({x:x,y:y,vx:0,vy:0,l:10,t:'tr',s:2,c:HUE(st*14+s.tx)});
        if(s.u>=1){s.done=1;hitR(s.tx,s.ty,18,3);bossTry(s.tx,s.ty,30,2.5);burstAt(s.tx,s.ty,'#f0f0ff',16);flash(2,'#f0f0ff');sfx('chime');shake=Math.max(shake,3);}}
      g.s=g.s.filter(s=>!s.done);}
  }}
function v72Back(ox){for(const c of CASTS){const u=1-c.t/32,x=Math.round(c.x+ox),y=Math.round(c.y),rx=18+u*22;X.globalAlpha=Math.min(1,c.t/10);
    for(let i=0;i<20;i++){const a=i/20*Math.PI*2+st*0.12;R(Math.round(x+Math.cos(a)*rx)-1,Math.round(y+Math.sin(a)*rx*0.25)-1,2,2,i%2?c.c:HUE(i*18+st*8));}
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2-st*0.08;R(Math.round(x+Math.cos(a)*rx*0.6),Math.round(y+Math.sin(a)*rx*0.15),1,1,'#fff');}X.globalAlpha=1;}
  for(const g of GP){
    if(g.k==='storm'){X.globalAlpha=0.22;R(0,0,VW,GY,'#0a1838');X.globalAlpha=1;}
    else if(g.k==='mfall'){const a=Math.min(1,Math.min(170-g.t,g.t)/16),mx=Math.round(VW*0.72),my=58;X.globalAlpha=a*0.25;X.fillStyle='#d8e4ff';X.beginPath();X.arc(mx,my,30,0,Math.PI*2);X.fill();X.globalAlpha=a;X.beginPath();X.arc(mx,my,19,0,Math.PI*2);X.fill();
      R(mx-8,my-6,5,4,'#b8c4e8');R(mx+3,my+2,6,5,'#b8c4e8');R(mx-4,my+7,3,3,'#b8c4e8');R(mx+5,my-9,3,2,'#b8c4e8');X.globalAlpha=1;}
    else if(g.k==='sfall'){const pts=[[-70,64],[-40,52],[-12,68],[16,50],[44,62],[72,48],[26,80]];const cx=VW/2;X.globalAlpha=0.45;X.strokeStyle='#c8d0ff';X.lineWidth=1;X.beginPath();
      for(let i=0;i<pts.length;i++){const q=pts[i];if(i===0)X.moveTo(cx+q[0],q[1]);else X.lineTo(cx+q[0],q[1]);}X.stroke();X.globalAlpha=1;for(let i=0;i<pts.length;i++)sparkle(cx+pts[i][0],pts[i][1],2+((st>>3)+i)%2,HUE(i*50+st*6));}}}
function v72Front(ox){const p=P;
  for(const g of GP){
    if(g.k==='storm'){for(let i=0;i<46;i++){const x=(i*53+st*5+(i%3)*17)%(VW+20)-10,y=(i*37+st*9)%(GY+10)-10;X.globalAlpha=0.6;R(x,y,1,7,'#a8dcff');}X.globalAlpha=1;
      for(let i=0;i<Math.ceil(VW/22)+1;i++){const x=i*22-((st>>1)%22),y=Math.round(Math.sin(i*1.7)*3);R(x-14,y-6,30,16,FLASH>0?'#8090c0':'#3a4060');R(x-10,y+8,22,4,FLASH>0?'#a0b0e0':'#4a5278');}}
    else if(g.k==='mirror'){
      if(g.t>40){const s=Math.min(1,(64-g.t)/16),x=Math.round(g.x+ox),y=Math.round(g.y),rx=Math.round(16*s),ry=Math.round(20*s);if(rx<2)continue;
        X.fillStyle='#120a20';X.beginPath();X.ellipse(x,y,rx,ry,0,0,Math.PI*2);X.fill();X.strokeStyle=HUE(st*12);X.lineWidth=2;X.stroke();X.strokeStyle='#b070ff';X.lineWidth=1;X.beginPath();X.ellipse(x,y,rx+3,ry+3,0,0,Math.PI*2);X.stroke();
        for(let i=0;i<3;i++){const a=st*0.15+i*2.1;R(Math.round(x+Math.cos(a)*rx*0.5)-2,Math.round(y+Math.sin(a)*ry*0.5)-1,5,2,'#6a4a9a');}R(x-rx/2,y-ry/2,2,ry/2,'#fff');if(g.t<48&&st%2)sparkle(x,y,6,'#fff');}
      else{const a=Math.min(1,g.t/24);X.globalAlpha=a*0.55;X.strokeStyle='#2a1840';X.lineWidth=8;X.beginPath();X.arc(g.x+ox,g.y,g.r,0,Math.PI*2);X.stroke();X.globalAlpha=a;X.strokeStyle=HUE(st*10+g.r);X.lineWidth=2;X.beginPath();X.arc(g.x+ox,g.y,g.r,0,Math.PI*2);X.stroke();
        for(let i=0;i<18;i++){const b=i/18*Math.PI*2+g.r*0.01;R(Math.round(g.x+ox+Math.cos(b)*g.r)-2,Math.round(g.y+Math.sin(b)*g.r)-2,5,5,i%2?'#b070ff':'#4a2a70');}X.globalAlpha=1;}}
    else if(g.k==='bloom'){for(const r of g.er){const u=Math.min(1,(32-r.t)/6),h=Math.round(44*u),x=Math.round(r.x+ox),y=GY-h;X.globalAlpha=Math.min(1,r.t/8);
        R(x-1,y,3,h,'#3aa040');R(x-1,y,1,h,'#7ae070');R(x+2,y+h*0.5,6,2,'#50c050');R(x-7,y+h*0.7,6,2,'#50c050');
        const pr=Math.round(4+u*6);for(let i=0;i<8;i++){const a=i/8*Math.PI*2+st*0.05;R(Math.round(x+Math.cos(a)*pr)-3,Math.round(y+Math.sin(a)*pr)-3,6,6,HUE(300+i*14+r.x,i%2?60:0));}R(x-3,y-3,6,6,'#ffe040');R(x-1,y-2,2,2,'#fff');
        for(let i=-2;i<=2;i++)R(x+i*7-1,GY-3,3,3,HUE(320+i*30));X.globalAlpha=1;}}
    else if(g.k==='fspiral'){const cx=p.x+ox,cy=p.y-14,N=170,fa=Math.min(1,g.t/20);X.globalAlpha=0.14*fa;X.fillStyle='#ff8a20';X.beginPath();X.arc(cx,cy,g.r,0,Math.PI*2);X.fill();X.globalAlpha=fa;
      for(let i=0;i<=N;i++){const u=i/N,a=g.a+u*Math.PI*4,rr=g.r*u,x=Math.round(cx+Math.cos(a)*rr),y=Math.round(cy+Math.sin(a)*rr*0.8),s=Math.round(1+u*4);R(x-s,y-s,s*2,s*2,(i>>2)%2?'#ff8a20':'#20c8d8');if(i%4===0)R(x-1,y-s,2,1,'#fff6a0');}
      const a=g.a+Math.PI*4,hx=Math.round(cx+Math.cos(a)*g.r),hy=Math.round(cy+Math.sin(a)*g.r*0.8);R(hx-6,hy-5,12,10,'#40e8d8');R(hx-6,hy-5,12,2,'#c0fff8');R(hx-2,hy-3,3,3,'#fff6a0');R(hx-1,hy-2,1,1,'#1a1028');R(hx-5,hy+3,10,2,'#ff4020');
      for(let i=0;i<3;i++)R(hx-4+i*4,hy-9-((st>>1)+i)%3,2,4,i%2?'#ffd030':'#ff8a20');X.globalAlpha=1;}
    else if(g.k==='mfall'){for(const q of g.pl){const w=Math.round(4+q.t*0.7),x=Math.round(q.x+ox);X.globalAlpha=Math.min(1,q.t/10)*0.5;R(x-w-3,0,w*2+6,GY,'#a8c0ff');X.globalAlpha=Math.min(1,q.t/10);R(x-w,0,w*2,GY,'#e8eeff');R(x-Math.max(1,w>>2),0,Math.max(2,w>>1),GY,'#fff');
        X.globalAlpha=Math.min(1,q.t/12)*0.8;X.strokeStyle='#d8e4ff';X.lineWidth=2;X.beginPath();X.ellipse(x,GY,10+(24-q.t)*2,3+(24-q.t)*0.4,0,0,Math.PI*2);X.stroke();X.globalAlpha=1;if(st%2)sparkle(x+rnd(-w,w),rnd(20,GY),2,'#fff');}}
    else if(g.k==='geyser'){for(const c of g.cols){const h=Math.round(Math.sin((26-c.t)/26*Math.PI)*58),x=Math.round(c.x+ox);if(h<2)continue;R(x-5,GY-h,10,h,'#30e0a0');R(x-3,GY-h,3,h,'#a0fff0');R(x+3,GY-h,2,h,'#20b0c0');R(x-7,GY-h-4,14,6,'#e8fff8');R(x-4,GY-h-7,4,4,'#fff');R(x+2,GY-h-6,3,3,'#a0fff0');}
      if(g.t>70&&!p.dead){X.globalAlpha=(g.t-70)/30*0.5;X.strokeStyle='#30e0a0';X.lineWidth=2;X.beginPath();X.arc(p.x+ox,p.y-14,20+(100-g.t)*0.5,0,Math.PI*2);X.stroke();X.globalAlpha=1;}}
    else if(g.k==='harvest'){for(const r of g.er){const h=Math.round(Math.min(44,(30-r.t)*8)),x=Math.round(r.x+ox),y=GY-h;X.globalAlpha=Math.min(1,r.t/8);R(x-2,y,4,h,'#3aa040');R(x-2,y,1,h,'#7ae070');
        for(let i=8;i<h;i+=10){const s=(i/10)%2?1:-1;R(x+(s>0?2:-9),y+i,7,2,'#50c050');}if(r.t>18){R(x-4,y-10,8,12,'#e8c030');R(x-3,y-9,2,2,'#fff080');R(x+1,y-6,2,2,'#fff080');R(x-1,y-3,2,2,'#fff080');R(x-6,y-6,2,8,'#7ae070');R(x+4,y-6,2,8,'#7ae070');}
        R(x-6,GY-2,12,2,'#5a3a2a');X.globalAlpha=1;}}
    else if(g.k==='agave'){for(const q of g.sp){const u=Math.sin(Math.min(1,(26-q.t)/6)*Math.PI/2)*Math.min(1,q.t/8),h=Math.round(q.h*u),x=Math.round(q.x+ox);
        for(let j=0;j<h;j+=2){const w=Math.max(1,Math.round(7*(1-j/h)));R(x-(w>>1),GY-j-2,w,2,j%6<2?'#5ab890':'#3a9070');R(x-(w>>1)-1,GY-j-2,1,2,'#e8d040');}if(h>4){R(x-1,GY-h-3,2,3,'#ff4060');R(x,GY-h-4,1,1,'#fff');}}}
    else if(g.k==='sfall'){for(const s of g.s){const x=s.sx+(s.tx-s.sx)*s.u+ox,y=s.sy+(s.ty-s.sy)*s.u,dx=(s.tx-s.sx)/15,dy=(s.ty-s.sy)/15;
        for(let i=1;i<=10;i++){const z=Math.max(2,7-(i>>1));X.globalAlpha=1-i/11;R(Math.round(x-dx*i*0.6)-(z>>1),Math.round(y-dy*i*0.6)-(z>>1),z,z,HUE(st*14+i*30));}X.globalAlpha=0.35;X.fillStyle='#fff6a0';X.beginPath();X.arc(x,y,9,0,Math.PI*2);X.fill();X.globalAlpha=1;sparkle(Math.round(x),Math.round(y),8,'#fff');R(Math.round(x)-3,Math.round(y)-3,7,7,'#fff6a0');R(Math.round(x)-1,Math.round(y)-1,3,3,'#fff');}}
    else if(g.k==='pring'){const r=(40-g.t)*9;X.globalAlpha=Math.min(1,g.t/14);X.strokeStyle='#a0ff60';X.lineWidth=3;X.beginPath();X.arc(g.x+ox,g.y,r,0,Math.PI*2);X.stroke();X.strokeStyle='#fff';X.lineWidth=1;X.beginPath();X.arc(g.x+ox,g.y,Math.max(1,r-5),0,Math.PI*2);X.stroke();
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2;R(Math.round(g.x+ox+Math.cos(a)*r)-2,Math.round(g.y+Math.sin(a)*r)-2,4,4,HUE(i*22+st*6));}X.globalAlpha=1;}}
  for(const c of CASTS){const u=1-c.t/32,x=c.x+ox,y=c.y-14;X.globalAlpha=Math.min(1,c.t/12)*0.8;X.strokeStyle=c.c;X.lineWidth=2;
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2+st*0.05,r0=10+u*20,r1=r0+14+u*40;X.strokeStyle=i%2?c.c:HUE(i*30+st*8);X.beginPath();X.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0);X.lineTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1);X.stroke();}
    X.strokeStyle='#fff';X.beginPath();X.arc(x,y,6+u*46,0,Math.PI*2);X.stroke();X.globalAlpha=1;}
  if(FLASH>0){X.globalAlpha=Math.min(0.55,FLASH*0.08);R(0,0,VW,216,FLASHC);X.globalAlpha=1;}}

const ATLAS64='iVBORw0KGgoAAAANSUhEUgAAAigAAAEOCAMAAACUzhwBAAAAvVBMVEViHhQkGBUbCmAJpFyXKxkRqKTdZCxfHliiYlygUSUsE5pTGq6ek6Dhk11qMtACXDRgqati0MmlW9vsBi5SzaPTn5cmxnSVEG'+'kyxKfZa1CfZaXgqtPklzBtVmILZF7Wzc/nWc2lnWNemWvhzleZLNnWHZma2cwMaIzoUbT4JUmgG5SN1rNmUNGZocasjiJqVKBjTihwpsU8yMjZyqojvsCnxXIAgz7dxTtKgzE5S8TAKuwAAAAbBTZN'+'GAsJAwd6Y36XAAAAP3RSTlP//////////////////////////////////////////////////////////////////////////////wD///99IZVrAAAdh0lEQVR42u2dD3/iOM7HEwiQQCi0A6UwQE'+'v/T9tpuze7d889CN7/yzrJTqCzJbYMCYGudLO7N5/8LDvWN7biJMabi4kxzJMuEBNQxAQUMQFF7EuBAqt/5WKQWF66Q6/36EHBruB1XJtUY0YHs/xBvd8ej+vtPuSjO/R62Tqn63aPoGCHAK/jLqnj'+'+owO5vkL2vX6eNxu56U79HqZOjYn/WTAK2rM+wRK0HfquKFVx/BH5xfX6/V2214vV3fI9TrouJzQgNfuozvfh32AAvUZq0NgiOeJjbNdESx/UK/DbIi67/16/9LokK075HoddPxMqz2st+N2O4q8fY'+'ACQag7ZGjukJWu3v/O0hn9QRBBFKEunrTbE+MVwdQddr183fqmwcJdEOEAP4zj0PP2A4qfdMjQ0iF+FCQd927RMfzB0l8EATocjdqRtzT3MEt32PXydaubhrp5CvVU8/pxX3FSyL3Z30HRHTLph5YO'+'oaaFoziMArOO4w+91T102I9jz3JFAE932PXydcy7LTwRL/hWH1H7RkBQQ9GgRMGqQxamE0WdF4zsHcfzB0Ed/XmNyQT/ZbnAWLrS6iWemP3H0eHgEOEchTmv+aZB14sX7miEoHh7AIUCrzvEdoGRro'+'E6YOhs/vCKWJCwUqk0bHcLPkdXXr2+79B/dl2kbhqsSS+xgX/Q4WSAKfrCKxwUnLVVhzQsHZLqKpbrkOcPll4EYb0ehXXb9AoRR7dNvWaH63otAPhO/Yc6sz+sFZMP290WgvJNsYeIoD4oPkeJ6nib'+'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'+'XoFBxgYAAAAASUVORK5CYII=';
// ===== v0.7.4: spectacle god powers (sky / ground / surroundings / bursting from the figure) + 3D-rendered character sprites =====
const SPRI=new Image();let SPROK=false;SPRI.onload=()=>{SPROK=true;};SPRI.src='data:image/png;base64,'+ATLAS64;
const GQI=new Image();GQI.src='data:image/png;base64,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';
const SPRM={rat:[0,40,38],qz:[0,46,38,GQI],bis:[76,42,40],wk:[116,32,36],wkg:[152,32,36],wkn:[188,32,36],bar:[224,44,46]};
const SPC=document.createElement('canvas');SPC.width=48;SPC.height=48;const SPG=SPC.getContext('2d');
function spr(k,i,x,y,f,tint){const m=SPRM[k],w=m[1],h=m[2];let src=m[3]||SPRI,sx=i*w,sy=m[0];
  if(tint){SPG.globalCompositeOperation='source-over';SPG.clearRect(0,0,48,48);SPG.drawImage(src,sx,sy,w,h,0,0,w,h);SPG.globalCompositeOperation='source-in';SPG.fillStyle=tint;SPG.fillRect(0,0,w,h);src=SPC;sx=0;sy=0;}
  X.save();X.translate(Math.round(x),Math.round(y));if(f<0)X.scale(-1,1);X.drawImage(src,sx,sy,w,h,-(w>>1),1-h,w,h);X.restore();}
function heroS(ox,oy,o,id){const f=o.f||1,tt=o.t||0,tint=o.flash?'#fff':(o.sil||null);let i;
  const q=id==='gasket',b=id==='pumpjack',k=q?'qz':b?'bis':'rat',gc=q?['#b84aff','#80f000','#ff5ad8']:b?['#c080ff','#40f0a0','#fff0b0']:['#e8743a','#ff4fb0','#30e0ff'];
  if(o.hurt)i=11;else if(o.pose==='crouch')i=10;else if(o.pose==='jump')i=8;else if(o.pose==='fall')i=q&&!o.glide?8:9;else if(o.pose==='run')i=2+Math.floor(tt/4)%6;else i=(tt>>5)%2;
  spr(k,i,ox,oy+1,f,tint);
  let ax=o.ax,ay=o.ay;if(ax===undefined||(!ax&&!ay)){ax=f;ay=0;}const n=Math.hypot(ax,ay),ux=ax/n,uy=ay/n,sx=ox+f*2-ux*(o.rc||0),sy=oy+(o.pose==='crouch'?-12:b?-17:-16);
  for(let j=0;j<=9;j++){X.fillStyle=tint||(j<3?gc[0]:j<9?(j%3?gc[1]:gc[2]):'#fff6a0');X.fillRect(Math.round(sx+ux*j)-1,Math.round(sy+uy*j)-1,j<3?2:3,2);}}
function workerS(ox,oy,f,tt,kind,fl,raise,helm){const k=helm===-1?'wkn':helm===2?'wkg':'wk';let i=0;
  if(raise&&k==='wk')i=5;else if(kind==='run')i=(k==='wk'?1:0)+Math.floor(tt/5)%4;
  spr(k,i,ox,oy+1,f,fl?'#fff':null);}
function baronAt(x,y,f,taunt){spr('bar',(taunt?2:0)+((st>>(taunt?3:5))%2),x,y,f);}
function v74Title(){if(!SPROK)return;actors(()=>{X.setTransform(2,0,0,2,Math.round(VW-34),186+Math.round((1-easeBack((st-30)/30))*70));baronAt(0,0,-1,(st>>6)%2);X.setTransform(1,0,0,1,0,0);},2);}
// ---- spectacle layer ----
let TK=[],TF=null,SLOMO=0,PWRX=1,TKL=null;
const fr=i=>{const s=Math.sin(i*12.9898+78.233)*43758.5453;return s-Math.floor(s);};
Object.assign(GODS.huitz,{p:'XIUHCOATL ERUPTION'});Object.assign(GODS.quetz,{p:'FEATHERED GALE'});Object.assign(GODS.tezca,{p:'SHATTERED SKY MIRROR'});Object.assign(GODS.tlazol,{p:'PILLARS OF PURE LIGHT'});Object.assign(GODS.itzpa,{p:'BUTTERFLY STORM'});Object.assign(GODS.tona,{p:'SUNRISE OVERDRIVE'});Object.assign(GODS.xiuh,{p:'TURQUOISE FLAME HALO'});Object.assign(GODS.xipe,{p:'VINE ERUPTION ARMOR'});Object.assign(GODS.xolotl,{p:'THUNDER-DOG DASH'});Object.assign(GODS.tlalte,{p:'EARTHSHAKER SPIRES'});Object.assign(GODS.chalchi,{p:'JADE GEYSER TIDE'});Object.assign(GODS.mictlante,{p:'SPIRIT-DOG STAMPEDE'});
const TKD={tlaloc:['storm',250],quetz:['gale',150],tezca:['mirror',110],xochi:['petal',220],huitz:['ember',190],tona:['sun',120],coyol:['night',180],chalchi:['tide',120],xolotl:['speed',70],tlazol:['purify',150],tlalte:['quake',80],xiuh:['flame',130],centeo:['gold',120],mayahuel:['agave',130],mixcoatl:['stars',140],itzpa:['swarm',220],mictlante:['under',180],xipe:['vine',100]};
function powerOpen(f){const b=boss;if(b&&!b.dying&&!b.open&&!(b.rise>0)&&state==='level'){b.open=true;PWRX=0.6;try{f();}finally{b.open=false;PWRX=1;}}else f();}
function spectacle(k){const G=GODS[k],d=TKD[k];TF={n:G.n,p:G.p,c:G.c,t:72};if(banner&&banner.mini)banner=null;SLOMO=40;shake=Math.max(shake,12);
  if(d){TK=TK.filter(q=>q.k!==d[0]);TK.push({k:d[0],t:d[1],T:d[1],c:G.c,x:P.x,y:P.y,f:P.f,hit:[],bh:boss&&!boss.dying&&k!=='xiuh'&&k!=='xipe'?boss.hp:null});if(TK.length>4)TK.shift();}
  const fl=k==='xochi';for(let i=0;i<44;i++){const e=i%4,x=cam.x+(e===0?-4:e===1?VW+4:rnd(0,VW)),y=e===2?-4:e===3?VH+4:rnd(0,VH),a=Math.atan2(P.y-16-y,P.x-x),s=rnd(3,6);
    parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rnd(18,30),t:fl?'flw':'tr',s:fl?0:2,c:fl?HUE(rnd(290,420)):(i%3?G.c:HUE(i*30))});}
  sfx('rumble');}
function v74Tick(){if(TF&&--TF.t<=0)TF=null;}
function flw(x,y,r,c){x=Math.round(x);y=Math.round(y);R(x-r,y-(r>>1),r,r,c);R(x+1,y-(r>>1),r,r,c);R(x-(r>>1),y-r,r,r,c);R(x-(r>>1),y+1,r,r,c);R(x-1,y-1,3,3,'#ffe040');R(x,y-1,1,1,'#fff');}
function zap(x0,y0,x1,y1,sd,w,c){X.strokeStyle=c;X.lineWidth=w;X.beginPath();X.moveTo(x0,y0);for(let i=1;i<=9;i++){const u=i/9;X.lineTo(x0+(x1-x0)*u+(i<9?(fr(sd+i)-0.5)*30:0),y0+(y1-y0)*u);}X.stroke();}
Object.assign(GACT,{
  quetz(){castFx(GODS.quetz.c);const f=P.f;GP.push({k:'gale',t:160,f:f,x:f>0?cam.x-70:cam.x+VW+70,hit:[],hb:0});P.dj=900;pop(P.x,P.y-44,'TRIPLE JUMP!','#50f0a0');sfx('whoosh');},
  huitz(){castFx(GODS.huitz.c);GP.push({k:'xserp',t:190,x:P.x,y:P.y-14,vx:0,vy:-7,tr:[],hit:[],hb:0,tg:null});sfx('whoosh');},
  itzpa(){castFx(GODS.itzpa.c);const fl=[];for(let i=0;i<14;i++){const s=i%2?-1:1;fl.push({x:s<0?cam.x-12:cam.x+VW+12,y:rnd(20,150),vx:-s*2,vy:rnd(-1,1),cd:0,a:i/14*Math.PI*2,c:HUE(i*26)});}GP.push({k:'fly',t:420,fl:fl});sfx('whoosh');},
  tlazol(){castFx(GODS.tlazol.c);purify();}
});
for(const k of Object.keys(GACT)){const f=GACT[k];GACT[k]=function(){powerOpen(f);spectacle(k);};}
function v74Upd(){const p=P;if(!p)return;if(TKL!==L){TKL=L;TK=[];}
  for(const q of TK){q.t--;const a=q.T-q.t;
    if(q.k==='purify'&&(a===18||a===44))for(let i=0;i<8;i++){const x=cam.x+(i+0.5)*VW/8;for(const e of enemies)if(!e.dead&&Math.abs(e.x-x)<16)hitEnemy(e,null,2.5);for(const b of ebul)if(Math.abs(b.x-x)<14)b.l=0;if(boss&&!boss.dying&&Math.abs(bossCore().x+12-x)<20)hitBoss(3);burstAt(x,GY-6,'#c0ff80',6);}
    if(q.k==='storm'&&a%22===11)flash(4,'#ffffff');
    if(a===34&&q.bh!=null&&boss&&!boss.dying&&boss.hp>=q.bh-0.01){const c=bossCore();hitBoss(4);burstAt(c.x+12,c.y+12,q.c,24);flash(4,q.c);shake=Math.max(shake,10);sfx('boom');q.bh=null;}}
  TK=TK.filter(q=>q.t>0);
  for(const g of GP){
    if(g.k==='xserp'){const a=190-g.t;
      if(a<18){g.vx=Math.sin(a*0.55)*7;g.vy=-6.5;}
      else{if(!g.tg||g.tg.dead||g.hit.includes(g.tg))g.tg=vis().find(e=>!g.hit.includes(e))||null;let tx,ty;
        if(g.tg){tx=g.tg.x;ty=g.tg.y-g.tg.h/2;}else if(boss&&!boss.dying&&!g.hb){const c=bossCore();tx=c.x+12;ty=c.y+12;}else{tx=cam.x+VW/2+Math.cos(a*0.05)*VW*0.42;ty=70+Math.sin(a*0.11)*44;}
        const dx=tx-g.x,dy=ty-g.y,d=Math.hypot(dx,dy)||1;g.vx+=(dx/d*7.5-g.vx)*0.22;g.vy+=(dy/d*7.5-g.vy)*0.22;}
      g.x+=g.vx;g.y+=g.vy;g.tr.unshift([g.x,g.y]);if(g.tr.length>72)g.tr.pop();
      for(const e of enemies){if(e.dead||g.hit.includes(e))continue;if(Math.hypot(e.x-g.x,e.y-e.h/2-g.y)<18){g.hit.push(e);hitEnemy(e,null,4);burstAt(e.x,e.y-e.h/2,'#ff8a20',12);shake=Math.max(shake,6);sfx('boom');}}
      if(!g.hb&&boss&&!boss.dying){const c=bossCore();if(Math.hypot(c.x+12-g.x,c.y+12-g.y)<28){g.hb=1;hitBoss(6);burstAt(g.x,g.y,'#40e8d8',20);flash(4,'#ff8a20');shake=Math.max(shake,10);}}
      bulR(g.x,g.y,20);wallsR(g.x,14,1);if(g.t%3===0)parts.push({x:g.x+rnd(-4,4),y:g.y+rnd(-4,4),vx:rnd(-0.5,0.5),vy:-rnd(0.3,1),l:16,t:'tr',s:2,c:(g.t&4)?'#ff8a20':'#40e8d8'});}
    else if(g.k==='gale'){g.x+=g.f*6;if(g.t%8===0)sfx('whoosh');
      for(const e of enemies){if(e.dead||g.hit.includes(e)||Math.abs(e.x-g.x)>20)continue;g.hit.push(e);hitEnemy(e,null,3.5);if(!e.dead&&e.t!=='pump')e.x+=g.f*10;burstAt(e.x,e.y-e.h/2,'#50f0a0',8);}
      for(const b of ebul)if(Math.abs(b.x-g.x)<22)b.l=0;wallsR(g.x,20,2);
      if(!g.hb&&boss&&!boss.dying&&Math.abs(bossCore().x+12-g.x)<30){g.hb=1;hitBoss(5);burstAt(bossCore().x+12,bossCore().y+12,'#50f0a0',16);}
      if(g.t%2===0)parts.push({x:g.x,y:rnd(40,GY),vx:g.f*rnd(2,4),vy:rnd(-0.6,0.6),l:18,t:'tr',s:2,c:HUE(st*9+g.t*7)});}}}
function v74Back(ox){const p=P;if(!p)return;
  for(const q of TK){const a=q.T-q.t,k=Math.min(1,a/12,q.t/20);X.globalAlpha=k;
    if(q.k==='storm'){X.globalAlpha=0.55*k;R(0,0,VW,GY,'#060c24');}
    else if(q.k==='mirror'){X.globalAlpha=0.45*k;R(0,0,VW,VH,'#2a0a4a');}
    else if(q.k==='petal'){X.globalAlpha=0.16*k;R(0,0,VW,VH,'#ff7ad0');X.globalAlpha=k;
      if(a<190){const u=Math.min(1,a/24),sc=p.giant>0?1.5:1,cx=p.x+ox-p.f*4,cy=p.y-22*sc;
        for(const s of [-1,1])for(let j=0;j<7;j++){const an=-0.25-j*0.34+Math.sin(st*0.12+j)*0.06,r=(14+j*7)*u*sc;flw(cx+s*Math.cos(an)*r,cy+Math.sin(an)*r*0.9,Math.round((3+j*0.6)*sc),HUE(300+j*16+s*20,j%2?60:72));}}}
    else if(q.k==='ember'){X.globalAlpha=0.3*k;R(0,0,VW,GY,'#801800');}
    else if(q.k==='sun'){const u=ease(Math.min(1,a/30)),cx=VW/2,cy=Math.round(GY+40-u*120);X.globalAlpha=0.35*k;R(0,0,VW,GY,'#ff9a20');X.globalAlpha=k;
      for(let i=0;i<18;i++){const b=i/18*Math.PI*2+st*0.02;X.fillStyle=i%2?'#ffe040':'#ff8a20';X.beginPath();X.moveTo(cx,cy);X.lineTo(cx+Math.cos(b)*420,cy+Math.sin(b)*420);X.lineTo(cx+Math.cos(b+0.12)*420,cy+Math.sin(b+0.12)*420);X.fill();}
      X.fillStyle='#fff6a0';X.beginPath();X.arc(cx,cy,58,0,Math.PI*2);X.fill();X.fillStyle='#ffd030';X.beginPath();X.arc(cx,cy,48,0,Math.PI*2);X.fill();R(cx-14,cy-8,6,6,'#2a0a4a');R(cx+8,cy-8,6,6,'#2a0a4a');R(cx-12,cy+14,24,3,'#c04000');}
    else if(q.k==='night'||q.k==='stars'){X.globalAlpha=0.62*k;R(0,0,VW,GY,'#0a0830');X.globalAlpha=k;const n=q.k==='stars'?90:46;
      for(let i=0;i<n;i++){const x=Math.round(fr(i)*VW),y=Math.round(fr(i+99)*(GY-30));if(((st>>3)+i)%5)R(x,y,1,1,'#fff');else sparkle(x,y,2,HUE(i*40));}
      if(q.k==='stars'){X.globalAlpha=0.25*k;for(let i=0;i<60;i++){const u=i/60;R(Math.round(u*VW),Math.round(150-u*120+Math.sin(i)*10),6,3,'#c8b0ff');}}
      else{const mx=Math.round(VW*0.72),my=58;X.globalAlpha=0.5*k;X.strokeStyle='#d8e4ff';X.lineWidth=1;for(let r=40;r<=70;r+=15){X.beginPath();X.arc(mx,my,r+Math.sin(st*0.1+r)*3,0,Math.PI*2);X.stroke();}}}
    else if(q.k==='purify'){X.globalAlpha=0.5*k;const cx=VW/2,cy=GY+30,cs=['#ff3a6a','#ff9a20','#ffe040','#50f070','#30c0ff','#7a5aff','#d070ff'];X.lineWidth=4;
      for(let i=0;i<7;i++){X.strokeStyle=cs[i];X.beginPath();X.arc(cx,cy,170-i*4,Math.PI,Math.PI*2);X.stroke();}}
    else if(q.k==='gold'){X.globalAlpha=0.25*k;R(0,0,VW,GY,'#ffc020');}
    else if(q.k==='agave'){const u=Math.min(1,a/30),x=Math.round(q.x+ox+q.f*70),top=Math.round(GY-u*150);X.globalAlpha=k;R(x-2,top,5,GY-top,'#3a9070');R(x-1,top,1,GY-top,'#7ad870');
      if(u>0.5)for(let j=0;j<6;j++){const y=top+8+j*16,w=14+j*4;for(const s of [-1,1]){R(x+(s>0?3:-w-2),y,w,2,'#5ab890');for(let m=0;m<4;m++)R(x+s*(w-m*3)-2,y-3-(m%2),4,4,m%2?'#ffd030':'#ffe880');}}
      for(let i=0;i<9;i++){const b=i/9*Math.PI*2;R(Math.round(x+Math.cos(b)*22)-1,GY-2-Math.round(Math.abs(Math.sin(b))*8),3,10,'#5ab890');}}
    else if(q.k==='swarm'){X.globalAlpha=0.3*k;R(0,0,VW,GY,'#3a1060');}
    else if(q.k==='under'){X.globalAlpha=0.5*k;R(0,0,VW,VH,'#0a2a3a');X.globalAlpha=0.35*k;for(let i=0;i<4;i++){const x=((a*4+i*130)%(VW+80))-40;drawXolo(q.f>0?x:VW-x,40+i*22,q.f,st+i*9,'run',0.7);}}
    else if(q.k==='quake'){X.globalAlpha=0.18*k;R(0,0,VW,VH,'#c08a50');}
    else if(q.k==='flame'){X.globalAlpha=0.15*k;R(0,0,VW,VH,'#40e8d8');}
    X.globalAlpha=1;}}
function v74Front(ox){const p=P;if(!p)return;
  for(const g of GP){
    if(g.k==='xserp'){const tr=g.tr,n=tr.length;for(let j=n-1;j>=0;j--){const q=tr[j],q2=tr[Math.max(0,j-1)],dx=q[0]-tr[Math.min(n-1,j+1)][0],dy=q[1]-tr[Math.min(n-1,j+1)][1],dl=Math.hypot(dx,dy)||1,w=Math.sin(j*0.32-st*0.3)*4,
        x=q[0]+ox-dy/dl*w,y=q[1]+dx/dl*w,r=Math.max(2.5,11-j*0.12);X.fillStyle=(j>>2)%2?'#40e8d8':'#1aa8c8';X.beginPath();X.arc(x,y,r,0,Math.PI*2);X.fill();
        X.fillStyle='#ffd030';X.beginPath();X.arc(x+dy/dl*r*0.45,y-dx/dl*r*0.45+r*0.3,r*0.45,0,Math.PI*2);X.fill();if(j%3===0){X.fillStyle='#c0fff8';X.fillRect(Math.round(x-r*0.4),Math.round(y-r*0.7),2,2);}
        if(j%5===2&&j>3){X.fillStyle=(j>>1)%2?'#ff8a20':'#ffe040';X.beginPath();X.moveTo(x-dy/dl*r,y+dx/dl*r*0-r*0.6);X.lineTo(x-dy/dl*(r+8)+dx/dl*3,y-r-6+Math.sin(st*0.5+j)*2);X.lineTo(x+dx/dl*4,y-r*0.4);X.fill();}}
      if(n){const x=g.x+ox,y=g.y,an=Math.atan2(g.vy,g.vx);X.save();X.translate(x,y);X.rotate(an);
        X.globalAlpha=0.35;X.fillStyle='#ff8a20';X.beginPath();X.arc(0,0,22,0,Math.PI*2);X.fill();X.globalAlpha=1;
        X.fillStyle='#40e8d8';X.beginPath();X.ellipse(0,0,13,10,0,0,Math.PI*2);X.fill();X.beginPath();X.ellipse(11,-3,10,5,0,0,Math.PI*2);X.fill();
        X.fillStyle='#20a8c0';X.beginPath();X.ellipse(10,6,9,3,0.25,0,Math.PI*2);X.fill();X.fillStyle='#ff3a20';X.fillRect(8,1,11,3);X.fillStyle='#fff';X.fillRect(10,0,2,2);X.fillRect(15,0,2,2);
        X.fillStyle='#fff6a0';X.beginPath();X.arc(3,-5,4,0,Math.PI*2);X.fill();X.fillStyle='#1a1028';X.fillRect(3,-7,2,4);
        for(let i=0;i<5;i++){X.fillStyle=i%2?'#ffd030':'#ff8a20';X.beginPath();X.moveTo(-10+i*4,-7);X.lineTo(-16+i*4,-19-((st>>1)+i)%4);X.lineTo(-6+i*4,-8);X.fill();}X.restore();}}
    else if(g.k==='gale'){const N=46;for(let j=N;j>=0;j--){const x=Math.round(g.x+ox-g.f*j*8),y=Math.round(100+Math.sin(j*0.33-st*0.25)*42*(1-j/(N*1.6))),s=Math.max(3,Math.round(10-j*0.14));
        R(x-s,y-s,s*2,s*2,HUE(j*14+st*6));R(x-1,y-s-3,2,s+3,'#fff');if(j%3===0){R(x-s-4,y+s,4,2,HUE(j*14+120));R(x+s,y-s-2,4,2,HUE(j*14+200));}}
      const x=Math.round(g.x+ox),y=Math.round(100+Math.sin(-st*0.25)*42);for(let i=0;i<9;i++){const b=-Math.PI/2+(i-4)*0.3-g.f*0.6;X.strokeStyle=HUE(i*40+st*8);X.lineWidth=3;X.beginPath();X.moveTo(x,y);X.lineTo(x+Math.cos(b)*24,y+Math.sin(b)*24);X.stroke();}
      R(x-11,y-9,22,18,'#50f0a0');R(x-11,y-9,22,3,'#c0ffe0');R(x+(g.f>0?9:-19),y-3,10,6,'#ffd030');R(x+(g.f>0?9:-19),y+3,10,2,'#ff3a20');R(x+(g.f>0?2:-6),y-5,4,4,'#fff');R(x+(g.f>0?3:-5),y-4,2,3,'#1a1028');}}
  for(const q of TK){const a=q.T-q.t,k=Math.min(1,a/12,q.t/20);X.globalAlpha=k;
    if(q.k==='storm'){const c=a%22;if(c<7){const x=Math.round(fr(a>>4)*VW);X.globalAlpha=0.45*k;zap(x,-4,x+(fr(a)-0.5)*80,GY,a>>4,7,'#80c8ff');X.globalAlpha=k;zap(x,-4,x+(fr(a)-0.5)*80,GY,a>>4,2,'#ffffff');
        if(c<3){X.globalAlpha=0.3*k;R(0,0,VW,VH,'#e8f4ff');}}}
    else if(q.k==='gale'){for(let i=0;i<40;i++){const x=Math.round(((i*67+a*(9+i%4)*q.f)%(VW+60)+VW+60)%(VW+60))-30,y=Math.round(fr(i)*(GY-10));X.globalAlpha=0.5*k;R(x,y,16+(i%3)*10,1,i%4?'#e8fff8':'#50f0a0');}}
    else if(q.k==='mirror'&&a>=24){const cx=Math.round(q.x+ox),cy=Math.round(q.y-50),u=Math.min(1,(a-24)/6);
      for(let i=0;i<12;i++){const b=i/12*Math.PI*2+0.2,L2=420*u;X.globalAlpha=0.7*k;zap(cx,cy,cx+Math.cos(b)*L2,cy+Math.sin(b)*L2,i*7,3,'#b070ff');X.globalAlpha=k;zap(cx,cy,cx+Math.cos(b)*L2,cy+Math.sin(b)*L2,i*7,1,'#ffffff');}
      for(let i=0;i<26;i++){const x=Math.round(fr(i)*VW),y=Math.round(((a-24)*(2+fr(i+5)*3)+fr(i+9)*80)%(VH+20))-10;X.fillStyle=i%3?'#1a1028':'#b070ff';X.beginPath();X.moveTo(x,y);X.lineTo(x+5,y+3);X.lineTo(x+1,y+10);X.fill();R(x+1,y+1,1,3,'#e0c0ff');}}
    else if(q.k==='petal'){for(let i=0;i<54;i++){const x=Math.round(((fr(i)*VW+Math.sin(a*0.05+i)*20+a*0.6)%(VW+20)+VW+20)%(VW+20))-10,y=Math.round((fr(i+33)*VH+a*(1+fr(i+7)))%(VH+20))-10;flw(x,y,2+(i%3),HUE(290+i*9,i%2?62:74));}}
    else if(q.k==='ember'){for(let i=0;i<40;i++){const x=Math.round(fr(i)*VW+Math.sin(a*0.1+i)*8),y=Math.round(VH-((a*(1.5+fr(i+3)*2)+fr(i+8)*VH)%(VH+10)));R(x,y,2,2,i%3?'#ff8a20':'#ffe040');}}
    else if(q.k==='tide'){const h=Math.round(Math.sin(Math.min(1,a/q.T)*Math.PI)*48),top=VH-h;if(h>2){X.globalAlpha=0.5*k;R(0,top,VW,h,'#30e0a0');X.globalAlpha=0.8*k;
        for(let x=0;x<VW;x+=4){const y=top+Math.round(Math.sin(x*0.08+st*0.2)*3);R(x,y-1,4,2,'#e8fff8');}for(let i=0;i<24;i++){const x=Math.round(fr(i)*VW),y=Math.round(VH-((a*2+fr(i+4)*h)%h));R(x,y,2,2,'#c0fff0');}}}
    else if(q.k==='speed'){for(let i=0;i<34;i++){const x=Math.round(((i*91-a*14*q.f)%(VW+40)+VW+40)%(VW+40))-20,y=Math.round(fr(i)*VH);X.globalAlpha=0.55*k;R(x,y,22+(i%4)*8,1,i%3?'#7af8ff':'#fff');}
      X.globalAlpha=k;const hx=p.x+ox,hy=p.y-14;for(let i=0;i<5;i++){const b=i/5*Math.PI*2+a*0.3;zap(hx,hy,hx+Math.cos(b)*30,hy+Math.sin(b)*24,a+i*3,1,i%2?'#7af8ff':'#fff');}
      if(a<10){zap(hx-40,-4,hx,hy,7,2,'#fff');zap(hx+50,-4,hx,hy,11,2,'#7af8ff');}}
    else if(q.k==='purify'){for(let i=0;i<8;i++){const x=Math.round((i+0.5)*VW/8),u=Math.min(1,Math.max(0,(a-i*2)/16)),h=Math.round(u*GY);if(h<2)continue;X.globalAlpha=0.35*k;R(x-9,GY-h,18,h,'#c0ff80');X.globalAlpha=0.8*k;R(x-3,GY-h,6,h,'#ffffc0');R(x-1,GY-h,2,h,'#fff');if(st%3===i%3)sparkle(x+Math.round(rnd(-8,8)),GY-Math.round(rnd(0,h)),2,'#fff');}}
    else if(q.k==='quake'){const g=GP.find(z=>z.k==='quake');if(g)for(const s of [-1,1])for(let j=0;j<6;j++){const x=Math.round(g.x+ox+s*(g.r-j*16)),h=Math.round((34-j*5)*Math.min(1,g.t/20+0.3));if(h<3)continue;
        X.fillStyle=j%2?'#8a5a30':'#a87040';X.beginPath();X.moveTo(x-7,GY);X.lineTo(x-2,GY-h);X.lineTo(x+1,GY-h+4);X.lineTo(x+7,GY);X.fill();R(x-2,GY-h,2,h,HUE(j*50+st*6));}}
    else if(q.k==='flame'&&a<110){const u=Math.min(1,a/14),hx=p.x+ox;for(let i=0;i<8;i++){const x=Math.round(hx+Math.cos(i/8*Math.PI*2+a*0.04)*(30+u*30)),h=Math.round((40+fr(i)*50)*u*Math.min(1,q.t/40)+Math.sin(st*0.5+i)*4);if(h<3)continue;
        R(x-4,GY-h,8,h,'#20b0c0');R(x-2,GY-h,4,h,'#40e8d8');R(x-1,GY-h+2,2,h-2,'#e8fff8');for(let m=0;m<3;m++)R(x-3+m*2,GY-h-3-((st+i+m)%4),2,4,m%2?'#ffd030':'#40e8d8');}}
    else if(q.k==='gold'){for(let i=0;i<56;i++){const x=Math.round(fr(i)*VW+Math.sin(a*0.08+i)*6),y=Math.round((a*(2+fr(i+2)*2)+fr(i+6)*VH)%(VH+10))-6;R(x,y,2,3,i%4?'#ffe040':'#fff6a0');}}
    else if(q.k==='agave'){for(let i=0;i<20;i++){const x=Math.round(fr(i)*VW),y=Math.round((a*3+fr(i+3)*VH)%VH);R(x,y,2,4,i%2?'#ffd040':'#a0ff80');}}
    else if(q.k==='swarm'){const cx=VW/2;for(let i=0;i<64;i++){const s=i%2?-1:1,u=Math.min(1,Math.max(0,(a-i*0.6)/40)),b=a*0.04+i*0.7,ex=cx+Math.cos(b)*(60+fr(i)*110),ey=90+Math.sin(b*1.3)*(30+fr(i+1)*50),sx=s<0?-20:VW+20,sy=fr(i+2)*GY;
        bfly(sx+(ex-sx)*ease(u),sy+(ey-sy)*ease(u),HUE(i*23+st*3),st+i);}}
    else if(q.k==='vine'&&a<90){const u=Math.min(1,a/26),hx=p.x+ox,hy=p.y-12;for(let i=0;i<6;i++){const x0=(i+0.5)*VW/6,n=14;X.globalAlpha=k;X.lineWidth=3;X.strokeStyle='#2a8040';X.beginPath();X.moveTo(x0,GY);
        for(let m=1;m<=n*u;m++){const v=m/n,x=x0+(hx-x0)*v+Math.sin(v*9+i)*14*(1-v),y=GY+(hy-GY)*v-Math.sin(v*Math.PI)*60;X.lineTo(x,y);}X.stroke();X.lineWidth=1;X.strokeStyle='#a0ff80';X.stroke();
        for(let m=2;m<=n*u;m+=3){const v=m/n,x=x0+(hx-x0)*v+Math.sin(v*9+i)*14*(1-v),y=GY+(hy-GY)*v-Math.sin(v*Math.PI)*60;R(Math.round(x),Math.round(y)-3,4,3,m%2?'#50d060':'#ffe060');}}
      if(u>=1){for(let i=0;i<10;i++){const b=i*0.9+a*0.1;R(Math.round(hx+Math.cos(b)*10)-1,Math.round(hy-8+i*2.4),3,2,'#50d060');}}}
    X.globalAlpha=1;}
  if(boss&&boss.kind!=='col'&&SPROK){const b=boss;if(!b.dying)baronAt(b.x+ox+6,97,-1,b.ph!=='walk');else if(b.dying<50){X.globalAlpha=1-b.dying/50;baronAt(b.x+ox+6+b.dying*2,97-b.dying*2,1,false);X.globalAlpha=1;}}}
function v74Top(){const g=TF;if(!g||state!=='level')return;const a=72-g.t,k=Math.min(1,a/7,g.t/12),bh=Math.round(10*k),sl=Math.round((1-Math.min(1,a/7))*VW),y=40;
  R(0,0,VW,bh,'#000');R(0,VH-bh,VW,bh,'#000');
  X.globalAlpha=0.78*k;X.fillStyle=g.c;X.beginPath();X.moveTo(-20+sl,y-14);X.lineTo(VW+20+sl,y-20);X.lineTo(VW+20+sl,y+16);X.lineTo(-20+sl,y+22);X.fill();
  X.globalAlpha=0.9*k;X.fillStyle='#2a0a4a';X.fillRect(-20+sl,y+17,VW+40,2);for(let i=0;i<12;i++){const yy=y-16+((i*13+a*3)%36),xx=((i*71+a*16)%(VW+60))-30;R(xx+sl,yy,24+(i%3)*10,1,'#fff');}X.globalAlpha=1;
  txt(g.n+'!',VW/2-sl,y-11,'rainbow',g.n.length>16?2:3,1,'#2a0a4a');txt(g.p,VW/2+sl,y+7,'#fff',1,1,'#2a0a4a');}

const S8D={e8:'iVBORw0KGgoAAAANSUhEUgAAAQAAAADiCAMAAACWV+lpAAAAvVBMVEUbEFmZYaTdl87tV8puLtScY9NlVJ5SLJ0MBh3VXrWrj91XI2ehKprTLa4vIpLb2dzaymITn15aytpNyrBcJBmhlq2b2eEToajUqZ+GPdpUoqthU2saY2EuXJHcpFvVYiRep9OlWSje1J6PHXJuYNaaZWSomV2v2VxYnWMYMdWe2S/nlTWXLyeYoi5sTypymykRXDef0ZjWaFkzVNssw3RUy3b1K2w6xLo3s889xMXdO8B2xwrbwT0AAAAZBTVh61oTAAAAP3RSTlP/////////////////////////////////////////////////////////////////////////////////AP8wAG7oAAAZe0lEQVR42u1dCXvaOrO2TJExNksAE4qBkBBIuiRpupx7vu/ezP//WXdGiy3ZMpiclgQOetogvxbC82pGGi2WvBcVwIOXQgBwgCJpFESuG/SVFlB4OZrg6SefeSWZwC0LeBjcBCjx8eP4CEChoKwACDoVw3OphrwhglMJqhTjTRXGq1T3XBiHYrgIgJZnhFwJQId+P4taN3L87QgoPwHksoDDMMqPa8ufMwA9X4TeBIOv4nQP2j0RJkmSqCi8EQGZ7uZSwZwHGLyowICs5UTKlkUBtGbzQHylxIAO6dqtATn+RhpAAukn18/WWna7AU9Yz2MJy2kxzFyQAIbGLAVlmA+PZDVZVBHWdtecFfjBCECRukbZQW4AvaTHuZ/4WgWElnfNYm7l1MyRMrzHEu63vShJWFRUARTUKukq/MAEwGxOUiU9fOReL4qEtJKApJWmPPWYp1XWE6piMpAJ05p3iZ0ELVlk1OvFWps6IsQrFq5ijDQaDdiGH5gAgEtZ2mkPKyPux/TcWNSk7KyFypy2UlnQQn5R/pwLAqLIsBlFSC9B4T3eS9Oe4k3JmYeGlLQKPzgBJKso7VbESViyXaGPURgFHlUPTFQCWMZzYgCrBixexiMs7AQrSUmObgLaXitKPI65pYkyEIiaInBky2NNbASirfjBNUDUbBGPUs/jVIEJDRAgVfUtUKYO3kCXcpv5+B81psfjWGuHzCeJWi0m6MTMwBSUzfm4l3okKN+KvwkBEcPnJWGp0CGrn0jNhWxWM++nkGAp+y0PrT2W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',b8:'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',s8:'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'};
// v0.8 full 3D render layer: rendered-sprite versions of enemies, bosses, pickups, map figures, scenery.
const S8M={"e8":{"sl":[0,0,20,18,2],"slb":[40,0,28,24,2],"dr":[96,0,24,22,2],"pm":[0,24,44,40,5],"br":[0,64,18,18,4],"cr":[72,64,18,20,1],"sn":[90,64,20,26,2],"pd":[130,64,32,18,2],"g1":[194,64,12,14,4],"g5":[0,90,12,14,4],"g25":[48,90,12,14,4],"g100":[96,90,12,14,4],"tc":[144,90,16,14,3],"hb":[192,90,14,14,3],"tm":[0,104,18,50,2],"xo":[36,104,24,24,5],"tpc":[0,154,18,18,8],"tpq":[0,172,20,20,8],"tpb":[0,192,20,20,8],"tpw":[160,192,16,16,2],"fl":[192,192,12,14,4],"cy":[0,212,18,14,3]},"b8":{"rb":[0,0,80,56,1],"rs":[80,0,14,62,1],"rm":[94,0,28,36,1],"rl":[122,0,26,42,1],"rh":[148,0,22,26,1],"rc":[170,0,28,28,3],"rw":[0,62,16,16,1],"cb":[16,62,100,134,1],"ca":[116,62,22,46,1]},"s8":{"tw":[0,0,48,84,3],"dk":[144,0,34,80,1],"ar":[178,0,68,118,1],"pp":[0,118,18,42,1],"st":[18,118,24,62,2],"sk":[66,118,26,68,1]}};
const S8I={},S8N=['e8','b8','s8'];let S8C=0,S8OK=false;
for(const k of S8N){const im=new Image();im.onload=()=>{S8C++;if(S8C===S8N.length)S8OK=true;};im.src='data:image/png;base64,'+S8D[k];S8I[k]=im;}
const S8T=document.createElement('canvas');S8T.width=104;S8T.height=136;const S8G=S8T.getContext('2d');
const S8K={};for(const sh of S8N)for(const k in S8M[sh])S8K[k]=sh;
// draw frame i of group k, anchored bottom-center at (x,y) (or centered when cen). tint: solid color; ta: tint alpha (overlay)
function s8(k,i,x,y,f,tint,ta,cen){const sh=S8K[k],m=S8M[sh][k],w=m[2],h=m[3];i=Math.max(0,Math.min(m[4]-1,i|0));let src=S8I[sh],sx=m[0]+i*w,sy=m[1];
  if(tint){S8G.globalCompositeOperation='source-over';S8G.globalAlpha=1;S8G.clearRect(0,0,w,h);S8G.drawImage(src,sx,sy,w,h,0,0,w,h);S8G.globalCompositeOperation='source-atop';S8G.globalAlpha=ta||1;S8G.fillStyle=tint;S8G.fillRect(0,0,w,h);S8G.globalAlpha=1;S8G.globalCompositeOperation='source-over';src=S8T;sx=0;sy=0;}
  X.save();X.translate(Math.round(x),Math.round(y));if(f<0)X.scale(-1,1);X.drawImage(src,sx,sy,w,h,-(w>>1),cen?-(h>>1):1-h,w,h);X.restore();}
// ---- enemies ----
function sludge8(x,y,big,tt,fl){s8(big?'slb':'sl',(tt>>3)%2,x,y+1,1,fl?'#fff':null);}
function drone8(x,y,tt,kind,fl){s8('dr',(tt>>1)%2,x,y+8,-1,fl?'#fff':null);}
function pump8(x,y,tt,fl){const s=Math.sin(tt*0.05);s8('pm',Math.round((s+1)*2),x,y+1,1,fl?'#fff':null);}
function barrel8(x,y,ph,fl){s8('br',Math.floor(ph)%4,x,y+1,1,fl?'#fff':null);}
function crate8(x,y,fl){s8('cr',0,x,y+1,1,fl?'#fff':null);}
function sensor8(x,y,tt,g,fl){const open=(tt>>5)%2;s8('sn',open,x,y+1,1,fl?'#fff':null);if(open&&tt%6<3)sparkle(Math.round(x),Math.round(y-20),2,'#fff');}
function pod8(x,y,g,tt,fl){const cy=Math.round(y-6);s8('pd',(tt>>2)%2,x,y+3,1,fl?'#fff':null);R(x-3,cy-3,7,7,'#fff');txt(g,x-1,cy-2,PWC[g],1,0,null);if(tt%8<2)sparkle(x+9,cy-6,2,'#fff6a0');}
// ---- pickups ----
const S8GK={1:'g1',5:'g5',25:'g25',100:'g100'};
function gem8(x,y,t,v){const k=S8GK[v]||'g1';s8(k,Math.floor(t/7)%4,Math.round(x),Math.round(y)+1,1);if(v>=25&&t%12<3)sparkle(Math.round(x)+4,Math.round(y)-12,1,'#fff');}
function taco8(x,y,k,tt){s8('tc',k==='T2'?1:k==='T3'?2:0,x+5,y+9,1,k==='T3'?HUE(tt*6,72):null,0.35);const s1=(tt>>3)%3;R(x+3+(s1===1?1:0),y-5-s1,1,2,'#fff8ff');if(tt%14<3)sparkle(x+10,y-3,1,'#fff6a0');}
function pick8(x,y,kind,tt){const b=Math.round(Math.sin(tt*0.15)*1.5);
  if(kind==='D'){s8('hb',2,x,y+b,1);if(tt%8<4)sparkle(x+5,y-12+b,1,'#fff');return true;}
  if(kind==='P'||kind==='H'){s8('hb',kind==='P'?1:0,x,y,1);if(kind==='P')txt('P',x-1,y-8,HUE(tt*6),1,0,null);return true;}return false;}
function totem8(x,on,bossCp){if(x<-20||x>VW+20)return;s8('tm',on?1:0,x,GY+1,1);const w=Math.sin(st*0.15)*1.5;
  if(on){R(x+1,GY-48,9,6,bossCp?'#ff3a6a':'#ff6ad0');R(x+8+w,GY-46,3,3,bossCp?'#ff3a6a':'#ff6ad0');heartC(x+3,GY-48,'#fff');if(st%5===0)parts.push({x:x+cam.x,y:GY-50,vx:rnd(-0.2,0.2),vy:-0.6,l:14,t:'tr',s:2,c:HUE(st*8)});}else R(x+1,GY-48,8,5,'#b0a0c8');}
function xolo8(x,y,f,t,pose,al){const i=pose==='sleep'?4:pose==='howl'?3:pose==='run'?1+((t>>3)%2):0;if(al!==undefined)X.globalAlpha=al;s8('xo',i,x,y+1,f||1,al!==undefined&&al<1?'#7af8ff':null,0.35);X.globalAlpha=1;if(pose==='sleep'&&t%40<20){}}
// ---- top-down map ----
function heroTop8(x,y,hi,dir,an,fl){s8(['tpc','tpq','tpb'][hi],dir*2+(Math.floor(an/8)%2),x,y,1,fl?'#fff':null,1,true);}
function workerTop8(x,y,t,fl){s8('tpw',Math.floor(t/10)%2,x,y,1,fl?'#fff':null,1,true);}
// ---- BOSS: CRUDE CO BIG DERRICK ----
function rig8(ox){const b=boss,x=Math.round(b.x+ox),fl=b.fl>0&&Math.floor(st/2)%2,T=fl?'#fff':null;if(b.fl>0)b.fl--;
  [[-24,0],[20,Math.PI]].forEach(([lx,o])=>{const s=b.ph==='walk'?Math.sin(b.walk+o)*5:0,lift=b.ph==='walk'?Math.max(0,Math.cos(b.walk+o))*3:0;s8('rl',0,x+lx+s,GY-lift+1,1,T);});
  s8('rs',0,x+28,97,1,T);if(st%6===0)parts.push({x:b.x+28,y:36,vx:rnd(-0.3,0.3),vy:-0.6,l:40,t:'smoke',s:3});
  s8('rm',0,x,97,1,T);
  s8('rb',0,x,147,1,T);txt('CRUDE CO',x,134,'#f8e040',1,1,null);
  const cb=bossCore(),cx=cb.x+ox+12;
  if(b.open&&!b.dying||b.dying){s8('rc',1+(Math.floor(st/5)%2),cx,cb.y+25,1,fl?'#fff':null);if(!b.dying&&st%4===0)parts.push({x:b.x+rnd(-10,10),y:cb.y,vx:rnd(-0.4,0.4),vy:-0.8,l:14,t:'tr',s:3,c:'#30e0ff'});}
  else s8('rc',0,cx,cb.y+25,1,T);
  for(let i=-52;i<=42;i+=2){const yy=70+(-i/50)*b.beam*30-1;R(x+i,yy,2,4,fl?'#fff':((i>>2)%2?'#30e0ff':'#ff5ac8'));R(x+i,yy,2,1,'#fff');}
  R(x-2,68,4,4,'#5a30b0');
  const h=bossHead(),hx=h.x+ox;s8('rh',0,hx+h.w/2,h.y+h.h+2,1,T);
  if(b.beam>0.3){R(hx+5,h.ly+18,4,GY-h.ly-18,fl?'#fff':'#e0f0ff');R(hx+6,h.ly+18,2,GY-h.ly-18,'#fff');}
  const cwy=70-b.beam*24;s8('rw',0,x+42,cwy+9,1,T);
  if(!b.dying){const w=110;R(VW/2-w/2-1,14,w+2,5,'#000');R(VW/2-w/2,15,w*Math.max(0,b.hp)/b.mx,3,'#ff3a9a');txt(v9BN(),VW/2,21,'#fff',1,1);}}
// ---- BOSS: MICTLAN (CHAPOPOTE) COLOSSUS ----
function col8(ox){const b=boss,x=Math.round(b.x+ox),dy=b.rise*1.3+(b.dying?Math.min(80,b.dying*0.5):0)+b.bob,cl=L.clean||0;
  const sw=Math.round(Math.sin(b.t*0.07)*5),fl=b.fl>0,T=fl?'#c8b8ff':cl>0.3?'#40a8ff':null,ta=fl?0.7:Math.min(0.55,cl);
  s8('ca',0,x-66,150+dy+sw,1,T,ta);s8('ca',0,x+66,150-0+dy-sw,-1,T,ta);
  s8('cb',0,x,189+dy,1,T,ta);
  for(let i=0;i<4;i++){const dx=-34+i*22,dd=(b.t*0.6+i*13)%22;R(x+dx,150+dy+dd,2,4,'#3a2266');R(x+dx,150+dy+dd,1,1,'#b090ff');}
  const ey=82+dy;R(x-10,ey,6,4,'#ffb030');R(x+4,ey,6,4,'#ffb030');R(x-9,ey+1,2,2,'#fff6a0');R(x+5,ey+1,2,2,'#fff6a0');
  const cy=122+dy;if(b.open){const p=Math.sin(st*0.3);R(x-11,cy-1,22,24,'#0a0612');R(x-9,cy+1,18,20,HUE(st*10));R(x-6,cy+4,12,14,HUE(st*10+60));R(x-3,cy+7,6,8,'#fff');sparkle(x+8,cy+2,2+Math.round(p),'#fff');}
  else{R(x-10,cy,20,22,'#0a0612');R(x-7,cy+4,14,14,'#2a1a3a');R(x-2,cy+9,4,4,'#5a3a6a');}
  if(!b.dying&&b.rise<=0){const w=120,hw=Math.round(w*b.hp/b.mx);R(VW/2-w/2-1,VH-25,w+2,6,'#1a0838');R(VW/2-w/2,VH-24,hw,4,HUE(st*4,55));txt('CHAPOPOTE COLOSSUS',VW/2,VH-33,'#c8a8ff',1,1,'#1a0838');}}
// ---- scenery layers ----
function city8(cx){// replaces far spires: CRUDE CO derricks on the horizon
  const pt=cx*0.25;for(let k=Math.floor(pt/90)-1;k<Math.floor(pt/90)+7;k++){const h=hsh(k+99),x=k*90-pt+(h%30);X.globalAlpha=0.75;s8('dk',0,x,141,1,'#d8b0ff',0.55);X.globalAlpha=1;}}
function towers8(cx){const p3=cx*0.35;for(let k=Math.floor(p3/110)-1;k<Math.floor(p3/110)+6;k++){const bx=k*110-p3,h=hsh(k*13+5);s8('tw',h%3,bx+30,167+(h>>3)%8,1);if((h>>5)%2)s8('tw',(h+1)%3,bx+82,172,-1);heartC(bx+56,96-(Math.floor(st/5+k)%2)*2,'#ff4fb0');}}
function arches8(cx){const po=cx*0.6;for(let k=Math.floor(po/170)-1;k<Math.floor(po/170)+4;k++){const ax=k*170-po+72;s8('ar',0,ax,GY+1,1);s8('pp',0,ax+58,GY+1,(k%2)?1:-1);}}
function cave8(){const a=cam.x*0.2;for(let k=Math.floor(a/48)-1;k<Math.floor((a+VW)/48)+2;k++){const x=k*48-a,h=hsh(k);s8('st',h%2,x,62-(h%24)-(h%2?0:14),1,'#140a34',0.3);}
  const b=cam.x*0.5;for(let k=Math.floor(b/70)-1;k<Math.floor((b+VW)/70)+2;k++){const x=k*70-b,h=hsh(k*3);if(k%3===0)s8('sk',0,x+12,GY+1,1,'#140a34',0.35);s8('cy',hsh(k)%3,x+32,126+hsh(k*5)%40+14,1);}}
function fg8(x,h){s8('fl',h%4,x+6,VH+1,1);}

// ===== v0.9: campaign, menus, settings, unlocks, story, music =====
var V9V=1,V9D=0,V9S=0,V9I=0,V9J=0,V9R=0;
const V9N=['CRUDE CANAL','PUMPJACK PARK','NIGHT REFINERY'],V9B=['BIG DERRICK','BIG DERRICK MK II','BARON MEGA RIG'],V9M=['level','park','night'];
function v9o(){if(!SAVE.opt)SAVE.opt={m:3,s:3,d:1,sh:1};if(!SAVE.best)SAVE.best=[0,0,0,0];return SAVE.opt;}
function v9ci(){return (stage-1)%3;}
function v9vol(k){return [0,0.35,0.7,1,1.35][v9o()[k]];}
function v9Lives(){return [5,3,2][v9o().d];}
function v9Hp(){return [2,0,-1][v9o().d];}
function v9Dmg(){return [1.4,1,0.8][v9o().d];}
function v9Tick(){V9V=v9vol('s');if(!v9o().sh)shake=0;}
function v9Mus(){return boss?'boss':L&&L.mictlan?'cave':V9M[v9ci()];}
function v9dec(s){const a=[];for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a.push(c===32?0:c-10);}return a;}
SONGS.park={bpm:144,bass:v9dec('5 < 5<9<: A :A>A7 > 7>:>< C <@CH'),lead:v9dec('Q TY XVTV Y ^ ]YR V [YVRT X[ YXT')};
SONGS.night={bpm:128,bass:v9dec('00 <0 : ,, 8, 7 )) 5) 35++ 7+257'),lead:v9dec('H K O MKP O K H M PT RPMO  S V  ')};
SONGS.menu={bpm:96,bass:v9dec('3 : ? : 8 ? D ? 5 < A < : A > : '),lead:v9dec('W  VR O P T W   T  RP M R   V Y ')};
function v9sfx(n){if(!A.ctx)return;if(n==='gush'){noise(0.5,0.12,0,300);osc(90,0.4,'sawtooth',0.07,0,40);}
  else if(n==='unlock'){const t=A.ctx.currentTime;[72,76,79,84].forEach((m,i)=>osc(mtof(m),0.18,'square',0.05,t+i*0.09));}
  else if(n==='page')osc(660,0.06,'triangle',0.08,0,990);}
function v9Start(){if(V9D){const d=V9D;V9D=0;V9S=0;setState(d);}else startMap();}
function v9Clear(){const m=winKind==='mictlan',ci=m?3:v9ci();v9o();if(m)SAVE.mdone=1;else SAVE.prog=Math.max(SAVE.prog||0,stage);SAVE.best[ci]=Math.max(SAVE.best[ci]||0,score);v9sfx('unlock');}
function v9Out(){return ['BIG DERRICK IS SCRAP. THE CANAL RUNS CLEAN!','THE GUSHERS ARE CAPPED. THE PARK BLOOMS AGAIN!','THE MEGA RIG FALLS! BARON CRUDE IS ON THE RUN!'][v9ci()];}
function v9Name(){return V9N[v9ci()];}
function v9BN(){return V9B[v9ci()];}
// ---- level generator: stages 2 and 3 ----
function v9Stage(){const ci=v9ci();music(V9M[ci]);if(ci>0)v9Gen(ci);banner={t:'STAGE '+stage,s:V9N[ci]+(stage>3?' +':''),l:150};}
function v9Gen(ci){let sd=ci*7919+stage*131+7;const rr=()=>(sd=(sd*16807)%2147483647)/2147483647,ri=(a,b)=>a+Math.floor(rr()*(b-a+1));
  const len=3400,g=[[0,520]];let x=520;
  while(x<len-VW-260){const a=x+ri(26,36),b=a+ri(260,520);g.push([a,b]);x=b;}
  g.push([x+ri(26,34),len]);
  const onG=q=>g.some(s=>q>=s[0]+16&&q<=s[1]-16),gx=q=>{for(const s of g){if(q>=s[0]+24&&q<=s[1]-24)return q;if(s[0]>q)return s[0]+30;}return q;};
  const pl=[];for(const s of g){const w=s[1]-s[0];if(w<200)continue;const n=w>420?2:1;for(let i=0;i<n;i++){const c=s[0]+w*(i+0.5)/n,pw=ri(70,110),y=[140,136,112,124][ri(0,3)];if(c<len-VW-40)pl.push([c-pw/2,c+pw/2,y]);}}
  const platAt=q=>pl.find(o=>q>=o[0]+8&&q<=o[1]-8);
  const W=ci===1?['pump','pump','pump','barrels','barrels','wrench','wrench','sludge','crate','sensor','drone']:['drone','drone','drone','wrench','wrench','pump','pump','sensor','sensor','barrels','crate','sludge'];
  const sp=[],inten=[1,2,0,2,3,0,3],sec=(len-VW)/7;
  for(let q=300;q<len-VW-60;q+=ri(80,130)){const k=inten[Math.min(6,Math.floor(q/sec))];if(k===0||rr()>0.3+k*0.2+(v9o().d-1)*0.12)continue;
    for(let j=0;j<(k>=3?2:1);j++){let t=W[ri(0,W.length-1)];const qx=q+j*34;
      if(t==='wrench'){const o=platAt(qx);sp.push({x:qx,t:t,y:o?o[2]:GY});}
      else if(t==='drone'||!onG(qx))sp.push({x:qx,t:'drone',k:rr()<0.5?'H':'P'});
      else sp.push({x:qx,t:t});}}
  sp.sort((a,b)=>a.x-b.x);
  L.len=len;L.sewerEnd=ci===1?-99999:640;L.ground=g;L.plats=pl.map(q=>[q[0]-8,q[1]+8,q[2]]);L.spawns=sp;L.si=0;L.cp=-1;L.evDone=0;
  L.cps=[{x:gx(sec*2.1)},{x:gx(sec*3.6)},{x:gx(sec*5.3)},{x:len-VW-70,boss:true}];
  const a=len-VW;L.plats.push([a+30,a+100,136]);L.arenaX=a;
  const SK=['tlaloc','quetz','tezca','tona','chalchi','xipe','itzpa','tlalte','centeo','mayahuel','mixcoatl'];L.shrines=[];
  for(let i=0;i<4;i++){const o=pl[Math.floor(pl.length*(i+0.5)/4)];if(o)L.shrines.push({x:Math.round((o[0]+o[1])/2),y:o[2],k:SK[(i*3+ci*4)%11]});}
  L.fires=[1.5,3.2,4.8].map(f=>({x:gx(sec*f+40),on:1}));L.crack=null;L.night=ci===2;L.swarm=ci===2?0:1;
  L.gush=[];const ng=ci===1?6:4;for(let i=0;i<ng;i++){const q=gx(sec*(0.9+i*(5.4/ng))+60);L.gush.push({x:q,t:ri(0,199)});}
  pickups.length=0;
  for(const o of pl)for(let i=0;i<3;i++)pickups.push({k:'C',v:1,x:(o[0]+o[1])/2+(i-1)*14,y:o[2]-8,float:true,tt:i*3,onG:true});
  for(let i=0;i<g.length-1;i++){const e=g[i][1],f=g[i+1][0];for(let j=0;j<5;j++){const t=j/4;pickups.push({k:'C',v:j===2?5:1,x:e+(f-e)*t,y:GY-24-Math.sin(t*Math.PI)*34,float:true,tt:j*3,onG:true});}}
  for(let q=200;q<len-500;q+=260)if(onG(q))pickups.push({k:'C',v:1,x:q,y:GY-6,float:true,tt:0,onG:true});
  for(const c of L.cps)if(!c.boss)pickups.push({k:'T1',x:c.x+46,y:GY-8,vx:0,vy:0,onG:true,tt:0,float:true});
  pickups.push({k:'T2',x:a-40,y:GY-8,vx:0,vy:0,onG:true,tt:0,float:true});
  const mo=pl[Math.floor(pl.length*0.6)];if(mo)pickups.push({k:'T4',x:(mo[0]+mo[1])/2,y:mo[2]-30,vy:0,vx:0.6,star:1,onG:false,tt:0});
  P.x=120;cam.x=0;}
function v9Upd(){if(state!=='level'||!L||L.mictlan)return;const p=P;
  for(const q of (L.gush||[])){q.t=(q.t+1)%200;const ph=q.t,near=Math.abs(q.x-cam.x-VW/2)<VW*0.7;
    if(ph===120&&near)v9sfx('gush');
    if(ph>=120&&ph<170){if(!p.dead&&Math.abs(p.x-q.x)<9&&p.y>GY-88)hurtPlayer();if(ph%3===0&&near)parts.push({x:q.x+rnd(-6,6),y:GY-rnd(40,88),vx:rnd(-1,1),vy:rnd(-1,0.5),l:20,t:'dust',s:2});}}
  if(L.night&&!L.swarm&&cam.x>1700){L.swarm=1;banner={t:'DRONE SWARM!',s:'THEY HATE RAINBOWS - SHOW THEM ONE',l:120};for(let i=0;i<[3,5,6][v9o().d];i++)spawnEnemy({t:'drone',x:cam.x,k:i%2?'H':'P'});sfx('power');}
  if(boss&&!boss.dying&&boss.kind!=='col'&&v9ci()===2&&boss.ph!=='intro'&&st%[600,420,320][v9o().d]===0)spawnEnemy({t:'barrels',x:cam.x});}
function v9Back(ox){if(!L||L.mictlan)return;
  if(L.night){const se=Math.max(0,L.sewerEnd-cam.x);X.globalAlpha=0.5;R(se,0,VW,VH,'#0a0630');X.globalAlpha=1;
    const mx=VW-70;for(let i=-9;i<=9;i++){const w=Math.round(Math.sqrt(81-i*i));R(mx-w,30+i,w*2,1,'#fff6d8');}R(mx+2,26,3,3,'#e8dcb8');R(mx-4,33,2,2,'#e8dcb8');
    for(let k=0;k<4;k++){const sx=((k*173+st*0.7)%(VW+120))-60;X.globalAlpha=0.12;for(let y=0;y<GY;y+=4)R(sx+y*0.35,y,10+y*0.1,4,'#c8f0ff');X.globalAlpha=1;}}
  for(const q of (L.gush||[])){const x=Math.round(q.x+ox);if(x<-20||x>VW+20)continue;const ph=q.t;
    R(x-7,GY-4,14,4,'#5a30b0');R(x-5,GY-6,10,2,'#ff6ad0');R(x-7,GY-4,14,1,'#c07aff');
    if(ph>=80&&ph<120){for(let i=0;i<3;i++){const b=(ph*2+i*7)%14;R(x-4+i*3,GY-8-b,2,2,'#3a2266');}}
    if(ph>=120&&ph<170){const h=ph<160?Math.min(88,(ph-120)*10):88-(ph-160)*9;R(x-5,GY-6-h,10,h,'#22123a');R(x-3,GY-6-h,2,h,HUE(st*8,60));R(x+2,GY-6-h,1,h,'#5a3a8a');R(x-8,GY-10-h,16,6,'#22123a');R(x-6,GY-10-h,6,2,HUE(st*8+90,70));}}}
// ---- menus ----
const V9T=['PLAY','LEVELS','UNLOCKS','SETTINGS'];
function v9TB(){const w=74,x0=Math.round(VW/2-(w+6)*2+3);return V9T.map((l,i)=>[x0+i*(w+6),76,w,16,l]);}
function v9Box(x,y,w,h,on){R(x-1,y-1,w+2,h+2,on?'#f8e040':'#8a5ad8');R(x,y,w,h,on?'#5a1080':'#2a0f50');}
function v9Go(i){sfx('select');V9J=0;V9R=0;if(i===0){if(v9o()&&!SAVE.intro){SAVE.intro=1;save();setState('story');}else setState('select');}else{setState(['','lsel','unl','opts'][i]);music('menu');}}
function v9Back9(){sfx('ping');setState('title');}
function v9Lock(i){return i===0?false:i<3?i>(SAVE.prog||0):!SAVE.mictlan;}
function v9Pick(i){if(i===4){v9Back9();return;}if(v9Lock(i)){sfx('hurt');shake=4;return;}sfx('select');if(i<3){V9S=i+1;V9D='sewer';}else V9D='cave';setState('select');}
const V9O=['MUSIC','SOUND','DIFFICULTY','SCREEN SHAKE','RESET PROGRESS','BACK'];
function v9Opt(i,dir){const o=v9o();if(i===0)o.m=Math.max(0,Math.min(4,o.m+dir));else if(i===1){o.s=Math.max(0,Math.min(4,o.s+dir));V9V=v9vol('s');}else if(i===2)o.d=(o.d+dir+3)%3;else if(i===3)o.sh=o.sh?0:1;
  else if(i===4){if(!V9R){V9R=1;sfx('hurt');return;}const k=SAVE.opt;SAVE={gems:0,gun:1,armor:0,helmet:0,shield:0,gods:[],gsel:0,mictlan:0,xolo:0,opt:k,best:[0,0,0,0]};V9R=0;save();sfx('boom');shake=6;banner={t:'PROGRESS ERASED',s:'',l:90};return;}
  else if(i===5){v9Back9();return;}V9R=0;save();sfx('ping');}
function v9Menus(){const go=pressed('st')||pressed('b')||pressed('a'),lf=pressed('l'),rt=pressed('r'),up=pressed('u'),dn=pressed('d');
  if(state==='title'){if(lf){V9I=(V9I+3)%4;sfx('ping');}if(rt){V9I=(V9I+1)%4;sfx('ping');}if(go)v9Go(V9I);return true;}
  if(state==='story'){const pn=Math.floor(st/360);if(go||st>=1080){v9sfx('page');if(pn>=2||st>=1080){sfx('select');setState('select');}else st=(pn+1)*360;}return true;}
  if(state==='lsel'){if(lf||up){V9J=(V9J+4)%5;sfx('ping');}if(rt||dn){V9J=(V9J+1)%5;sfx('ping');}if(go)v9Pick(V9J);return true;}
  if(state==='opts'){if(up){V9J=(V9J+5)%6;V9R=0;sfx('ping');}if(dn){V9J=(V9J+1)%6;V9R=0;sfx('ping');}if(lf&&V9J<4)v9Opt(V9J,-1);if(rt&&V9J<4)v9Opt(V9J,1);if(go)v9Opt(V9J,1);return true;}
  if(state==='unl'){if(go||up)v9Back9();return true;}
  return false;}
function v9Tap(g){
  if(state==='title'){const b=v9TB();for(let i=0;i<4;i++){const q=b[i];if(g.x>=q[0]&&g.x<=q[0]+q[2]&&g.y>=q[1]-4&&g.y<=q[1]+q[3]+4){V9I=i;press={id:'t9'+i,t:7,act:()=>v9Go(i)};return true;}}v9Go(0);return true;}
  if(state==='story'){const pn=Math.floor(st/360);v9sfx('page');if(pn>=2){sfx('select');setState('select');}else st=(pn+1)*360;return true;}
  if(state==='lsel'){if(g.y>=190&&g.x<80){v9Pick(4);return true;}const cw=Math.floor((VW-40)/4)-6;for(let i=0;i<4;i++){const cx=20+i*(cw+8);if(g.x>=cx&&g.x<=cx+cw&&g.y>=34&&g.y<=176){V9J=i;v9Pick(i);return true;}}return true;}
  if(state==='opts'){for(let i=0;i<6;i++){const y=34+i*24;if(g.y>=y-2&&g.y<=y+20){V9J=i;if(i<3&&g.x<VW/2+40)v9Opt(i,-1);else v9Opt(i,1);return true;}}return true;}
  if(state==='unl'){v9Back9();return true;}
  return false;}
function v9Draw(){if(state==='title'){drawTitle();v9TitleTop();return true;}if(state==='story'){v9Story();return true;}
  if(state==='lsel'){v9Lsel();return true;}if(state==='opts'){v9Opts();return true;}if(state==='unl'){v9Unl();return true;}return false;}
function v9TitleTop(){const b=v9TB();if(st<30)return;for(let i=0;i<4;i++){const q=b[i];if(V9I===i)R(q[0]-2,q[1]-2,q[2]+4,q[3]+6,'#f8e040');btn(q[0],q[1],q[2],q[3],['#ff3a9a','#9a4ae8','#30a8d8','#5a2a9a'][i],q[4],'t9'+i);}
  if((SAVE.prog||0)>0)txt('PROGRESS: STAGE '+Math.min(3,SAVE.prog)+'/3 CLEARED'+(SAVE.mdone?' + MICTLAN':''),VW/2,100,'#fff6a0',1,1,'#5a1090');}
const V9ST=[['FIVE HUNDRED YEARS AGO, THE ANIMAL SPIRITS','CARRIED THE LIGHT OF THE FIFTH SUN','DOWN INTO THE STONES BENEATH THE OLD CITY.'],
  ['NOW BARON CRUDE AND HIS CRUDE CO RIGS','DRILL STRAIGHT THROUGH THE SACRED STONES.','TAR FILLS THE CANALS. THE SUN GROWS DIM.'],
  ['THREE NAHUAL WARRIORS WAKE UP HUNGRY,','GRUMPY, AND READY TO CLEAN UP THIS TOWN.','RISE, ROUGHNECKS!']];
function v9Story(){const pn=Math.min(2,Math.floor(st/360)),t=st-pn*360;skyline(st,pn<2);X.globalAlpha=0.45;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;
  R(20,8,VW-40,128,'#f8e040');R(22,10,VW-44,124,pn===1?'#2a0a1a':'#140a3a');const cx=VW/2;
  if(pn===0){for(let i=-22;i<=22;i++){const w=Math.round(Math.sqrt(484-i*i));R(cx-w,62+i,w*2,1,i<-8?'#fff0a0':'#ffd030');}for(let k=0;k<12;k++){const a=k/12*Math.PI*2+st*0.01;R(cx+Math.cos(a)*32-2,62+Math.sin(a)*32-2,4,4,'#ffb030');}
    R(24,112,VW-48,22,'#3a1a6a');for(let i=0;i<3;i++)actors(()=>{X.setTransform(2,0,0,2,cx+(i-1)*70,128);drawHero(0,0,i,{f:i===2?-1:1,pose:'crouch',t:0,sil:'#5a3a9a'});X.setTransform(1,0,0,1,0,0);},2);}
  else if(pn===1){R(24,112,VW-48,22,'#14060e');for(let k=0;k<5;k++){R(40+k*86,112,30,2,'#22123a');}actors(()=>{for(let k=0;k<3;k++)drawPump(70+k*150,112,st+k*30,false);X.setTransform(2,0,0,2,cx+10,112);baronAt(0,0,-1,(st>>5)%2);X.setTransform(1,0,0,1,0,0);},2);
    for(let k=0;k<6;k++){const y=(st*0.6+k*23)%40;R(48+k*70,112+y*0.5,2,3,'#22123a');}}
  else{for(let k=0;k<16;k++){const a=k/16*Math.PI*2;R(cx+Math.cos(a)*(60+t%30)-1,70+Math.sin(a)*(40+t%20)-1,2,2,HUE(k*22+st*4));}
    for(let i=0;i<3;i++)actors(()=>{X.setTransform(2,0,0,2,cx+(i-1)*70,128-Math.round(Math.abs(Math.sin(st*0.08+i))*10));drawHero(0,0,i,{f:1,pose:'run',t:st+i*20});X.setTransform(1,0,0,1,0,0);},2);}
  V9ST[pn].forEach((l,i)=>{if(t>i*30)txt(l,cx,146+i*13,pn===2&&i===2?'#f8e040':'#fff',1,1,'#2a0a4a');});
  for(let i=0;i<3;i++)R(cx-14+i*12,188,6,3,i===pn?'#f8e040':'#6a4a9a');
  if(t>60&&Math.floor(st/30)%2===0)txt(isTouch?'TAP TO CONTINUE':'PRESS ENTER',cx,200,'#c8b8e8',1,1);}
function v9Lsel(){skyline(st,true);txt('SELECT A LEVEL',VW/2,10,'rainbow',2,1,'#5a1090');const cw=Math.floor((VW-40)/4)-6,o=v9o();
  const N=V9N.concat(['ROAD TO MICTLAN']),TH=[['#ff9ad6','#b07af0'],['#a0f0c0','#ff7ad6'],['#1a1050','#5a30b0'],['#140a34','#30e0c0']];
  for(let i=0;i<4;i++){const cx=20+i*(cw+8),on=V9J===i,lk=v9Lock(i),dy=Math.round((1-easeBack((st-i*5)/24))*140);X.setTransform(1,0,0,1,0,dy);
    v9Box(cx,34,cw,142,on);R(cx+4,38,cw-8,60,TH[i][0]);R(cx+4,78,cw-8,20,TH[i][1]);txt(i<3?String(i+1):'M',cx+cw/2,52,lk?'#6a5a8a':'#fff',4,1,'#2a0a4a');
    txt(N[i],cx+cw/2,106,on?'#f8e040':'#fff',1,1);
    if(lk){R(cx+cw/2-6,130,12,10,'#8a7aa0');R(cx+cw/2-4,124,8,2,'#8a7aa0');R(cx+cw/2-4,124,2,6,'#8a7aa0');R(cx+cw/2+2,124,2,6,'#8a7aa0');txt('LOCKED',cx+cw/2,146,'#8a7aa0',1,1);}
    else{const cl=i<3?(SAVE.prog||0)>i:SAVE.mdone;txt(cl?'CLEARED':'NEW!',cx+cw/2,124,cl?'#40e0d0':'#ff9af0',1,1);txt('BEST '+(SAVE.best[i]||0),cx+cw/2,138,'#f0d0ff',1,1);if(cl)sparkle(cx+cw-10,42,(st>>3)%2?2:3,'#fff6a0');}}
  X.setTransform(1,0,0,1,0,0);btn(8,192,64,14,V9J===4?'#f8a020':'#5a2a9a','BACK','b9');
  txt(isTouch?'TAP A LEVEL':'LEFT/RIGHT TO CHOOSE - ENTER TO PLAY',VW/2,196,'#fff',1,1);}
function v9Opts(){skyline(st,true);X.globalAlpha=0.4;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;txt('SETTINGS',VW/2,10,'rainbow',2,1,'#5a1090');const o=v9o(),cx=VW/2;
  for(let i=0;i<6;i++){const y=34+i*24,on=V9J===i;v9Box(cx-150,y,300,20,on);txt(V9O[i],cx-140,y+7,on?'#f8e040':'#fff',1,0,null);
    if(i<2){const v=i?o.s:o.m;for(let k=0;k<4;k++)R(cx+30+k*14,y+6,11,8,k<v?'#ff4fb0':'#5a2a9a');txt('-',cx+16,y+7,'#fff',1,1,null);txt('+',cx+96,y+7,'#fff',1,1,null);}
    else if(i===2)txt(['< EASY >','< NORMAL >','< HARD >'][o.d],cx+80,y+7,['#60f080','#fff060','#ff5a7a'][o.d],1,1,null);
    else if(i===3)txt(o.sh?'ON':'OFF',cx+80,y+7,o.sh?'#60f080':'#ff5a7a',1,1,null);
    else if(i===4)txt(V9R?'PRESS AGAIN TO ERASE':'KEEPS SETTINGS',cx+80,y+7,V9R?'#ff5a7a':'#9a8ab8',1,1,null);}
  txt(['EASY: 5 LIVES, +2 HEALTH, STRONGER POWERS','NORMAL: 3 LIVES - THE WAY IT IS MEANT TO BE','HARD: 2 LIVES, -1 HEALTH, TOUGHER CRUDE CO'][o.d],cx,184,'#f0d0ff',1,1);
  txt(isTouch?'TAP THE LEFT OR RIGHT HALF OF A ROW TO CHANGE IT':'UP/DOWN TO PICK - LEFT/RIGHT TO CHANGE',cx,198,'#9a8ab8',1,1);}
function v9Unl(){skyline(st,true);X.globalAlpha=0.5;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;txt('UNLOCKS',VW/2,8,'rainbow',2,1,'#5a1090');const cx=VW/2,cl=SAVE.clears||0,gd=gods(),gk=Object.keys(GODS);
  v9Box(16,28,cx-24,150,false);txt('REWARD TRACK',16+(cx-24)/2,33,'#f8e040',1,1,null);
  REWARDS.forEach((r,i)=>{const y=46+i*13,got=i<cl;R(24,y,7,7,got?'#40e0d0':'#5a2a9a');if(got)R(26,y+2,3,3,'#fff');txt(r[0],36,y+1,got?'#fff':'#7a6a9a',1,0,null);});
  txt('+ A SPIRIT SHIELD EVERY CLEAR',16+(cx-24)/2,46+REWARDS.length*13+2,'#9a8ab8',1,1,null);
  v9Box(cx+8,28,cx-24,150,false);const rx=cx+16;txt('SPIRITS',cx+8+(cx-24)/2,33,'#f8e040',1,1,null);
  txt('GOD POWERS '+gd.length+'/'+gk.length,rx,46,'#fff',1,0,null);gk.forEach((k,i)=>{const on=gd.includes(k);R(rx+(i%8)*(Math.floor((cx-40)/8)),58+Math.floor(i/8)*10,6,6,on?GODS[k].c:'#3a2a5a');});
  txt('XOLOTL SPIRIT DOG: '+(SAVE.xolo?'YES':'NOT YET'),rx,84,SAVE.xolo?'#7af8ff':'#7a6a9a',1,0,null);
  txt('STAGES CLEARED: '+Math.min(3,SAVE.prog||0)+'/3',rx,98,'#fff',1,0,null);txt('MICTLAN: '+(SAVE.mdone?'CLEARED':SAVE.mictlan?'OPEN':'LOCKED'),rx,110,'#fff',1,0,null);
  ['CANAL','PARK','REFINERY','MICTLAN'].forEach((n,i)=>txt('BEST '+n+' '+(v9o()&&SAVE.best[i]||0),rx,124+i*10,'#f0d0ff',1,0,null));txt('HI SCORE '+hiScore,rx,166,'#fff6a0',1,0,null);
  btn(8,192,64,14,'#f8a020','BACK','b9');}
// ---- between-level beats on the city map ----
const V9BT=[['HA! THE SEWERS ARE MINE NOW, LITTLE PETS.','JUMP IN THE OPEN MANHOLE IF YOU DARE!'],
  ['YOU SCRAPPED MY DERRICK? CUTE. MY PUMPJACK PARK','HAS GUSHERS THAT WILL GLUE YOUR PAWS TOGETHER!'],
  ['WELCOME TO MY NIGHT REFINERY. LIGHTS OFF,','DRONES ON, AND MY MEGA RIG IS HUNGRY.']];
function v9MapTop(){if(st>480||st<20)return;const ci=v9ci(),a=Math.min(1,(480-st)/30,(st-20)/20),y=VH-50,x0=Math.round(VW/2-128);X.globalAlpha=a;
  R(x0,y,244,42,'#f8e040');R(x0+2,y+2,240,38,'#1a0838');txt('BARON CRUDE',x0+44,y+5,'#ff9a30',1,0,null);
  const l=stage>3?['BACK FOR MORE? MY RIGS GOT MEANER!','NEW GAME+: EVERYTHING HITS HARDER.']:V9BT[ci];
  txt(l[0],x0+44,y+16,'#fff',1,0,null);txt(l[1],x0+44,y+26,'#fff',1,0,null);X.globalAlpha=1;
  if(a>0.5)actors(()=>{X.setTransform(1,0,0,1,x0+22,y+38);baronAt(0,0,1,(st>>4)%2);X.setTransform(1,0,0,1,0,0);},1);
  if(SAVE.mictlan&&!SAVE.mdone&&ci>0&&st>200)txt('XOLOTL WAITS AT THE BLUE MANHOLE...',VW/2,y-10,'#7af8ff',1,1,'#1a1060');}

// ===== v1.0: ending, credits, studio splash, juice and touch polish =====
var V10L=0,V10R=-1,V10X=0,V10C=0,V10KN=0,V10KT=0,V10DC=0,V10DK='',V10MP=0,V10BF=0,V10HB=0,V10P={id:-1,ox:0,oy:0};
SONGS.end={bpm:116,bass:[48,0,55,0,48,0,55,0,53,0,60,0,53,0,60,0,55,0,62,0,55,0,62,0,48,0,55,0,52,0,55,0],lead:[72,0,76,79,0,84,0,83,81,0,77,0,81,84,0,0,79,0,83,86,0,83,79,0,84,0,0,79,76,0,72,0]};
SONGS.credits={bpm:100,bass:[45,0,52,0,45,0,52,0,41,0,48,0,41,0,48,0,48,0,55,0,48,0,55,0,43,0,50,0,43,0,47,0],lead:[76,0,0,79,0,81,0,0,77,0,0,76,0,72,0,0,79,0,0,76,0,79,0,84,83,0,0,79,0,74,0,0]};
const V10S=[0,420,840,1260,2700,3000],V10G=['tlaloc','quetz','tezca','xochi','huitz','tona','coyol','chalchi','tlazol','xolotl'];
function v10Tick(){V10L++;if(V10R<0&&SPROK&&S8OK)V10R=V10L;if(state!=='title')V10X=1;
  if(state==='level'&&P){if(V10KT>0&&--V10KT===0)V10KN=0;
    if(V10MP&&!P.dead){V10MP=0;if(V10DC>=2&&v9o().d<2){P.inv=Math.max(P.inv||0,150);pickups.push({k:'T1',x:P.x+36,y:GY-8,vx:0,vy:0,onG:true,tt:0,float:true});banner={t:'SPIRIT TACO!',s:'THE GODS LEFT YOU A SNACK',l:110};}}
    if(boss&&boss.dying>0){if(!V10BF){V10BF=1;SLOMO=Math.max(SLOMO,36);shake=Math.max(shake,8);}}else V10BF=0;
    if(hp===1&&!P.dead&&maxHp()>2){V10HB++;if(V10HB%54===1){osc(70,0.1,'sine',0.14);osc(60,0.12,'sine',0.12,A.ctx?A.ctx.currentTime+0.16:0);}}else V10HB=0;}
  else{V10KN=0;V10KT=0;}}
function v10Die(){const k=stage+'/'+(L?L.cp:0);if(k===V10DK)V10DC++;else{V10DK=k;V10DC=1;}V10MP=1;}
function v10Kill(e){if(e.dead||state!=='level')return;V10KN=V10KT>0?V10KN+1:1;V10KT=80;
  if(V10KN>=3){const b=Math.min(1000,V10KN*50);addScore(b);parts.push({x:e.x,y:e.y-e.h-14,vx:0,vy:-0.5,l:44,t:'pop',s:0,c:'COMBO X'+V10KN+' +'+b,col:'#f8e040'});osc(mtof(76+Math.min(V10KN,14)),0.09,'square',0.045);}}
function v10Top(){if(!P)return;
  if(hp===1&&!P.dead&&maxHp()>2){const a=0.3+0.14*Math.sin(st*0.12);X.globalAlpha=a;R(0,0,VW,5,'#ff2050');R(0,VH-5,VW,5,'#ff2050');R(0,5,5,VH-10,'#ff2050');R(VW-5,5,5,VH-10,'#ff2050');
    X.globalAlpha=a*0.45;R(5,5,VW-10,4,'#ff2050');R(5,VH-9,VW-10,4,'#ff2050');R(5,9,4,VH-18,'#ff2050');R(VW-9,9,4,VH-18,'#ff2050');X.globalAlpha=1;}
  if(V10KN>=3&&V10KT>0){txt('COMBO X'+V10KN,VW-8,40,V10KT>66?'#fff':'#f8e040',1,2,'#5a1090');R(VW-8-Math.round(40*V10KT/80),47,Math.round(40*V10KT/80),2,'#f8e040');}
  if(boss&&boss.dying>0&&boss.dying<16){X.globalAlpha=(16-boss.dying)/16*0.6;R(0,0,VW,VH,'#ffffff');X.globalAlpha=1;}}
function v10Pad(t,c){const bx=c.x-V10P.ox,by=c.y-V10P.oy,r=c.r;
  if(V10P.id!==t.identifier){V10P.id=t.identifier;const dx=t.clientX-bx,dy=t.clientY-by;
    if(Math.hypot(dx,dy)>r*1.05){V10P.ox=Math.max(-r*0.9,Math.min(r*2.4,dx));V10P.oy=Math.max(-r*2.2,Math.min(r*0.1,dy));}else{V10P.ox=0;V10P.oy=0;}}
  else{const dx=t.clientX-(bx+V10P.ox),dy=t.clientY-(by+V10P.oy),d=Math.hypot(dx,dy),lim=r*1.35;
    if(d>lim){V10P.ox=Math.max(-r*0.9,Math.min(r*2.4,V10P.ox+dx/d*(d-lim)));V10P.oy=Math.max(-r*2.2,Math.min(r*0.1,V10P.oy+dy/d*(d-lim)));}}
  pad.style.transform='translate('+Math.round(V10P.ox)+'px,'+Math.round(V10P.oy)+'px)';return{x:bx+V10P.ox,y:by+V10P.oy,r:r};}
function v10PadEnd(e){for(const t of e.touches)if(touches.get(t.identifier)==='pad')return;if(V10P.id!==-1||V10P.ox||V10P.oy){V10P.id=-1;V10P.ox=0;V10P.oy=0;pad.style.transform='';}}
function v10Fin(){if(winKind==='mictlan'||v9ci()!==2)return false;winKind='';winRew='';hp=maxHp();stage++;SAVE.ended=(SAVE.ended||0)+1;save();V10C=0;parts.length=0;setState('ending');music('end');return true;}
function v10Credits(){V10C=1;parts.length=0;setState('ending');st=V10S[3];music('credits');}
function v10Skip(){sfx('select');for(let i=1;i<V10S.length;i++)if(st<V10S[i]){st=V10S[i];if(i===3)music('credits');return;}}
function v10Exit(){const c=V10C;V10C=0;parts.length=0;if(c){setState('unl');music('menu');}else setState('title');}
function v10Menus(){const go=pressed('st')||pressed('b')||pressed('a');
  if(state==='ending'){if(go&&st>20)v10Skip();v10Run();return true;}
  if(state==='unl'&&pressed('r')){v10Credits();return true;}return false;}
function v10Tap(g){if(state==='ending'){if(st>20)v10Skip();return true;}
  if(state==='unl'&&g.y>=186&&g.x>=VW-84){press={id:'c10',t:7,act:v10Credits};return true;}return false;}
function v10BX(t){return t<120?Math.round(VW*0.56)+74:Math.round(VW*0.56)+74+(t-120)*1.8;}
function v10Run(){const t=st;if(t>=V10S[5]){v10Exit();return;}if(t===V10S[3])music('credits');
  if(t<V10S[1]){const cx=Math.round(VW*0.56);if(t>40&&t<280&&t%7===0)boomFx(cx+rnd(-40,40),rnd(70,GY-6),8,t%14===0);if(t===50||t===140)sfx('boom');if(t>40&&t<280&&t%20===0){shake=4;sfx('rumble');}
    if(t>=120&&t%4===0){const bx=v10BX(t);if(bx<VW+20)parts.push({x:bx-6,y:GY-2,vx:-rnd(0.2,0.8),vy:-0.3,l:24,t:'smoke',s:2});}if(t===120)sfx('whoosh');}
  else if(t<V10S[2]){const k=t-V10S[1];if(k===10)sfx('flood');if(k>70&&k%5===0)flowerAt(rnd(10,VW-10),GY-rnd(0,8),1);if(k===200)sfx('chime');}
  else if(t<V10S[3]){const k=t-V10S[2];if(k%18===0){rainbowBurst(rnd(40,VW-40),rnd(24,84),16);sfx('pop');}if(k%30===15)flowerAt(rnd(40,VW-40),rnd(110,170),4);if(k===20)sfx('godup');}
  else if(t>=V10S[4]){const k=t-V10S[4];if(k===10)sfx('win');if(k%40===0)rainbowBurst(rnd(60,VW-60),rnd(30,70),14);}}
function v10Star(cx,cy,s,c1,c2){R(cx-1,cy-s,3,s*2+1,c1);R(cx-s,cy-1,s*2+1,3,c1);const q=Math.round(s*0.6);for(let i=-q;i<=q;i++){R(cx+i,cy+i,1,1,c2);R(cx+i,cy-i,1,1,c2);}R(cx-3,cy-3,7,7,c2);R(cx-2,cy-2,5,5,'#fff');}
function v10Splash(){const ready=V10R>=0,k=ready?V10L-V10R:0;if(V10X||V10L>300||(ready&&k>=56))return;
  const a=ready&&k>40?(56-k)/16:1;X.globalAlpha=a;R(0,0,VW,VH,'#12052e');twinkles(V10L,30,VH,0);const cx=Math.round(VW/2),cy=74;
  v10Star(cx,cy,18+((V10L>>4)%2),'#f8e040','#ff4fb0');for(let i=0;i<8;i++){const an=i/8*Math.PI*2+V10L*0.03;sparkle(Math.round(cx+Math.cos(an)*30),Math.round(cy+Math.sin(an)*30),(V10L>>3)%2?2:1,i%2?'#7af8ff':'#fff6a0');}
  txt('CITLALLI STUDIOS',cx,112,'rainbow',2,1,'#5a1090');txt('PRESENTS',cx,130,'#f0d0ff',1,1,null);
  const pr=ready?1:((SPROK?1:0)+S8C)/4;R(cx-60,156,120,6,'#3a1a6a');R(cx-59,157,Math.round(118*pr),4,'#40e0d0');txt(ready?'READY!':'LOADING...',cx,168,'#9a8ab8',1,1,null);X.globalAlpha=1;}
function v10Draw(){if(state==='ending'){v10End();return true;}
  if(state==='title'){v9Draw();if(SAVE.ended)txt('GAME COMPLETE - NEW GAME+ IS READY',VW/2,110,'#7af8ff',1,1,'#5a1090');v10Splash();return true;}
  if(state==='unl'){v9Unl();btn(VW-72,192,64,14,'#ff3a9a','CREDITS','c10');return true;}return false;}
function v10Ground(top,col,line){R(0,top,VW,VH-top,col);for(let i=0;i<VW;i+=10)R(i,top,6,1,line);}
function v10Sc0(t){skyline(st,true);X.globalAlpha=0.5;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;
  const cx=Math.round(VW*0.56),sk=Math.max(0,t-50),dy=Math.min(110,sk*0.32),an=Math.min(0.45,sk*0.0026);
  actors(()=>{X.setTransform(Math.cos(an),Math.sin(an),-Math.sin(an),Math.cos(an),cx,GY+dy);s8('rl',0,-24,1,1);s8('rl',0,20,1,1);s8('rb',0,0,-37,1);s8('rm',0,0,-87,1);s8('rs',0,28,-87,1);X.setTransform(1,0,0,1,0,0);},1);
  v10Ground(GY,'#241048','#5a3a9a');
  const bx=v10BX(t),by=GY-(t<120?0:Math.round(Math.abs(Math.sin(t*0.35))*4));
  if(bx<VW+30)actors(()=>{X.setTransform(2,0,0,2,Math.round(bx),by);baronAt(0,0,t<120?-1:1,t<120?0:1);X.setTransform(1,0,0,1,0,0);},2);
  if(t>=120&&t<170){const hx=Math.round(bx-8+(t-120)*-0.6),hy=Math.round(GY-60-(t-120)*1.2+(t-120)*(t-120)*0.05);R(hx-5,hy,10,7,'#1a1020');R(hx-8,hy+7,16,2,'#1a1020');R(hx-5,hy+5,10,1,'#ff3a9a');}
  if(t>=124&&t<250&&bx<VW-40){const w=96,x0=Math.min(VW-w-4,Math.round(bx-w/2)),y0=GY-92;R(x0,y0,w,16,'#fff');R(x0+1,y0+1,w-2,14,'#1a0838');R(Math.round(bx),y0+16,3,4,'#fff');txt('THIS ISN\'T OVER!',x0+w/2,y0+5,'#ff9a30',1,1,null);}
  for(let i=0;i<3;i++){const jp=t>200?Math.round(Math.abs(Math.sin(t*0.1+i))*8):0;actors(()=>{X.setTransform(2,0,0,2,40+i*36,GY-jp);drawHero(0,0,i,{f:1,pose:jp>2?'jump':'stand',t:t+i*30});X.setTransform(1,0,0,1,0,0);},2);}
  if(t>16)txt('THE MEGA RIG CRUMBLES!',VW/2,20,'#f8e040',2,1,'#5a1090');if(t>150)txt('BARON CRUDE RUNS FOR THE HILLS...',VW/2,38,'#fff',1,1,'#2a0a4a');}
function v10Sc1(t){skyline(st,false);const dk=Math.max(0,1-t/200);if(dk>0){X.globalAlpha=dk*0.65;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;}
  const sy=Math.round(150-Math.min(58,t*0.4)),sx=Math.round(VW*0.5);for(let i=0;i<12;i++){const an=i/12*Math.PI*2+t*0.01;R(Math.round(sx+Math.cos(an)*30)-2,Math.round(sy+Math.sin(an)*30)-2,5,5,'#ffb030');}
  for(let i=-22;i<=22;i++){const w=Math.round(Math.sqrt(484-i*i));R(sx-w,sy+i,w*2,1,i<-8?'#fff0a0':'#ffd030');}R(sx-9,sy-5,4,4,'#5a2a10');R(sx+5,sy-5,4,4,'#5a2a10');R(sx-7,sy+7,14,2,'#5a2a10');R(sx-9,sy+5,2,2,'#5a2a10');R(sx+7,sy+5,2,2,'#5a2a10');
  const sink=Math.min(70,Math.max(0,t-30)*0.35);actors(()=>{for(let k=0;k<3;k++)drawPump(Math.round(VW*(0.18+k*0.32)),Math.round(GY+sink),st+k*20,false);},1);
  const tar=Math.max(0,1-Math.max(0,t-20)/170);v10Ground(GY,'#40b060','#80f0a0');R(0,GY+10,VW,VH-GY-10,'#40d8ff');for(let i=0;i<VW;i+=8)R(i,GY+12+Math.round(Math.sin((i+st)*0.15)),5,1,'#c0ffff');
  if(tar>0){X.globalAlpha=tar;R(0,GY-2,VW,VH-GY+2,'#1a0820');for(let i=0;i<VW;i+=14)R(i+(st>>2)%14,GY,6,1,'#5a3a9a');X.globalAlpha=1;}
  for(let i=0;i<32;i++){const fx=(i*61+17)%VW,gt=t-60-i*7;if(gt>0){const r=gt<12?1:2;R(fx,GY-Math.min(6,gt>>1),1,Math.min(6,gt>>1),'#30a050');flw(fx,GY-Math.min(7,gt>>1)-1,r,HUE(i*47,70));}}
  if(t>180){const xx=Math.round(-20+(t-180)*2.2);if(xx<VW+30)actors(()=>{X.setTransform(1,0,0,1,0,0);drawXolo(xx,GY,1,st,'run');},1);}
  if(t>16)txt('THE TAR DRAINS AWAY',VW/2,20,'#7af8ff',2,1,'#2a0f60');if(t>110)txt('THE CANALS RUN CLEAN AND THE FLOWERS COME BACK.',VW/2,38,'#fff',1,1,'#2a0a4a');if(t>170)txt('THE FIFTH SUN RISES OVER THE OLD CITY!',VW/2,48,'#fff6a0',1,1,'#2a0a4a');}
function v10God(x,y,k,a){const G=GODS[k];if(!G)return;X.globalAlpha=a*0.35;R(x-12,y-12,24,24,G.c);X.globalAlpha=a;
  for(let j=-2;j<=2;j++){const fh=8-Math.abs(j)*2;R(x+j*4-1,y-8-fh,3,fh,j%2?'#fff6a0':G.c);}R(x-8,y-8,16,2,'#f8e040');
  R(x-7,y-6,14,13,G.c);R(x-7,y-6,14,1,'#ffffff');R(x-5,y-3,4,3,'#fff');R(x+1,y-3,4,3,'#fff');R(x-4,y-2,2,2,'#1a0838');R(x+2,y-2,2,2,'#1a0838');
  R(x-3,y+3,6,1,'#1a0838');R(x-9,y-1,2,5,'#f8e040');R(x+7,y-1,2,5,'#f8e040');X.globalAlpha=1;}
function v10Sc2(t){skyline(st,true);X.globalAlpha=0.3;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;v10Ground(GY,'#5a2a9a','#c07aff');
  const ks=V10G.filter(k=>GODS[k]),n=ks.length,row=Math.ceil(n/2);
  ks.forEach((k,i)=>{const r=i<row?0:1,j=r?i-row:i,m=r?n-row:row,gx=Math.round(VW/2+(j-(m-1)/2)*(VW/(m+0.6))),rise=Math.max(0,40-(t-20-i*12)),gy=Math.round(58+r*33+rise+Math.sin(st*0.05+i)*2),a=Math.max(0,Math.min(1,(t-20-i*12)/20));
    if(a>0){v10God(gx,gy,k,a);X.globalAlpha=a;txt(GODS[k].n,gx,gy+12,'#fff',1,1,'#2a0a4a');X.globalAlpha=1;}});
  for(let i=0;i<3;i++){const jp=Math.round(Math.max(0,Math.sin(st*0.12+i*2.1))*14);actors(()=>{X.setTransform(2,0,0,2,Math.round(VW/2+(i-1)*58),GY-jp);drawHero(0,0,i,{f:i===2?-1:1,pose:jp>3?'jump':'stand',t:st+i*30});X.setTransform(1,0,0,1,0,0);},2);}
  actors(()=>{X.setTransform(1,0,0,1,0,0);drawXolo(Math.round(VW/2+120),GY,-1,st,Math.floor(st/40)%2?'howl':'sit');},1);
  if(t>10)txt('FIESTA FOR THE FIFTH SUN!',VW/2,20,'rainbow',2,1,'#5a1090');if(t>60)txt('THE GODS CELEBRATE WITH THEIR CHAMPIONS',VW/2,38,'#fff',1,1,'#2a0a4a');}
function v10Lines(){const L2=[['ROUGHNECK','rainbow',3],['ANIMAL SPIRITS VS BARON CRUDE','#f0d0ff',1],['',0,1],['A CITLALLI STUDIOS GAME','#f8e040',2],['',0,1],['CREATED BY','#9a8ab8',1],['ALAN ESCALANTE','#fff',2],['',0,1],
  ['GAME DESIGN AND STORY','#9a8ab8',1],['ALAN ESCALANTE','#fff',1],['',0,1],['ART, ANIMATION, MUSIC AND CODE','#9a8ab8',1],['CITLALLI STUDIOS','#fff',1],['',0,1],
  ['STARRING','#9a8ab8',1],['RATCHET STRAP - THE COATIMUNDI','#ffb070',1],['GASKET - THE QUETZAL','#d090ff',1],['PUMP JACK - THE BISON','#e8c8a0',1],['XOLOTL - THE SPIRIT DOG','#7af8ff',1],['AND BARON CRUDE AS HIMSELF','#ff9a30',1],['',0,1],['THE GODS','#9a8ab8',1]];
  const ks=Object.keys(GODS);for(let i=0;i<ks.length;i+=3)L2.push([ks.slice(i,i+3).map(k=>GODS[k].n).join('   '),'#fff6a0',1]);
  return L2.concat([['',0,1],['CRUDE CO IS MADE UP. ANY LIKENESS TO A REAL','#7a6a9a',1],['OIL COMPANY IS A COINCIDENCE.','#7a6a9a',1],['',0,1],['SPECIAL THANKS','#9a8ab8',1],['THE SPIRIT CREW','#fff',1],['AND YOU, FOR PLAYING!','#ff9af0',1],['',0,1],['(C) 2026 CITLALLI STUDIOS','#9a8ab8',1]]);}
function v10Cred(k){R(0,0,VW,VH,'#12052e');twinkles(st,46,VH-20,0);const ls=v10Lines(),lh=14,H=ls.length*lh,sp=(VH-20+H)/(V10S[4]-V10S[3]-80);let y=Math.round(VH-40-k*sp);
  for(const l of ls){const s=l[2];if(l[0]&&y>-20&&y<VH-40)txt(l[0],VW/2,y,l[1],s,1,'#2a0a4a');y+=s>=2?lh+s*4:lh;}
  R(0,VH-42,VW,42,'#12052e');X.globalAlpha=0.6;R(0,VH-42,VW,1,'#8a5ad8');X.globalAlpha=1;R(0,VH-14,VW,14,'#2a1050');R(0,VH-14,VW,1,'#8a5ad8');
  for(let i=0;i<4;i++){const px=Math.round(((k*0.7+i*42)%(VW+120))-60);actors(()=>{X.setTransform(1,0,0,1,0,0);if(i===3)drawXolo(px,VH-14,1,st,'run');else{X.setTransform(1,0,0,1,px,VH-14);drawHero(0,0,i,{f:1,pose:'run',t:st+i*9});}X.setTransform(1,0,0,1,0,0);},1);}}
function v10Card(k){skyline(st,false);X.globalAlpha=0.25;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;
  txt('THE END',VW/2,42,'rainbow',4,1,'#5a1090');if(k>20)txt('THANK YOU FOR PLAYING!',VW/2,80,'#fff',2,1,'#7a1aa0');
  if(k>40)txt(V10C?'HI SCORE '+hiScore:'FINAL SCORE '+score,VW/2,100,'#fff6a0',1,1,'#5a1090');if(k>60)txt('NEW GAME+ UNLOCKED - THE RIGS COME BACK MEANER',VW/2,112,'#7af8ff',1,1,'#5a1090');
  for(let i=0;i<3;i++)actors(()=>{X.setTransform(2,0,0,2,Math.round(VW/2+(i-1)*50),GY);drawHero(0,0,i,{f:1,pose:'stand',t:st+i*40});X.setTransform(1,0,0,1,0,0);},2);
  if(k>110){const bx=Math.round(VW+14-Math.min(40,(k-110)*1.2));actors(()=>{X.setTransform(2,0,0,2,bx,GY+2);baronAt(0,0,-1,1);X.setTransform(1,0,0,1,0,0);},2);if(k>160)txt('...I WILL BE BACK!',VW-8,GY-62,'#ff9a30',1,2,'#1a0838');}
  if(k>60&&Math.floor(st/30)%2===0)txt(isTouch?'TAP TO CONTINUE':'PRESS ENTER',VW/2,204,'#fff',1,1,'#5a1090');}
function v10End(){const t=st;if(t<V10S[1])v10Sc0(t);else if(t<V10S[2])v10Sc1(t-V10S[1]);else if(t<V10S[3])v10Sc2(t-V10S[2]);else if(t<V10S[4])v10Cred(t-V10S[3]);else v10Card(t-V10S[4]);
  drawParts(0);if(t<V10S[3]){R(0,0,VW,11,'#000');R(0,VH-11,VW,11,'#000');}
  for(let i=1;i<V10S.length-1;i++){const k=t-V10S[i];if(k>=0&&k<16){X.globalAlpha=1-k/16;R(0,0,VW,VH,'#000');X.globalAlpha=1;}}if(t<16){X.globalAlpha=1-t/16;R(0,0,VW,VH,'#fff');X.globalAlpha=1;}
  if(t>40&&t<V10S[4]&&Math.floor(t/40)%2===0)txt(isTouch?'TAP TO SKIP':'ENTER TO SKIP',VW-6,VH-8,'#9a8ab8',1,2,null);}
window.SS10={info:function(){return{kn:V10KN,kt:V10KT,dc:V10DC,l:V10L,r:V10R,x:V10X,ox:V10P.ox,oy:V10P.oy,c:V10C};},hp1:function(){hp=1;}};

// ===== v1.0.1: hi-res 3D sprites (GitHub build), double-tap flip jump, spirit powers, Xiuhcoatl serpent, boss tacos, boss game over, backtracking camera, message bar =====
// Characters are drawn from full-colour PNG atlases (5x art resolution) straight onto the screen-resolution canvas, smoothed,
// with a soft drop shadow and no outline pass. The world stays on the 216-line retro buffer. The old atlases stay as the fallback while the PNGs load.
const HRM={"K":5,"hero":{"coati":[40,38,[[0,0],[200,0],[400,0],[600,0],[800,0],[1000,0],[1200,0],[1400,0],[1600,0],[1800,0],[0,190],[200,190]]],"quetzalB":[46,38,[[400,190],[630,190],[860,190],[1090,190],[1320,190],[1550,190],[1780,190],[0,380],[230,380],[460,380],[690,380],[920,380]]],"bison":[42,40,[[1150,380],[1360,380],[1570,380],[1780,380],[0,580],[210,580],[420,580],[630,580],[840,580],[1050,580],[1260,580],[1470,580]]],"worker":[32,36,[[1680,580],[1840,580],[0,780],[160,780],[320,780],[480,780]]],"workerG":[32,36,[[640,780],[800,780],[960,780],[1120,780]]],"workerN":[32,36,[[1280,780],[1440,780],[1600,780],[1760,780]]],"baron":[44,46,[[0,960],[220,960],[440,960],[660,960]]]},"foe":{"sl":[20,18,[[0,0],[100,0]]],"slb":[28,24,[[200,0],[340,0]]],"dr":[24,22,[[480,0],[600,0]]],"pm":[44,40,[[720,0],[940,0],[1160,0],[1380,0],[1600,0]]],"br":[18,18,[[1820,0],[1910,0],[0,200],[90,200]]],"cr":[18,20,[[180,200]]],"sn":[20,26,[[270,200],[370,200]]],"pd":[32,18,[[470,200],[630,200]]],"g1":[12,14,[[790,200],[850,200],[910,200],[970,200]]],"g5":[12,14,[[1030,200],[1090,200],[1150,200],[1210,200]]],"g25":[12,14,[[1270,200],[1330,200],[1390,200],[1450,200]]],"g100":[12,14,[[1510,200],[1570,200],[1630,200],[1690,200]]],"tc":[16,14,[[1750,200],[1830,200],[1910,200]]],"hb":[14,14,[[0,330],[70,330],[140,330]]],"xo":[24,24,[[210,330],[330,330],[450,330],[570,330],[690,330]]],"cy":[18,14,[[810,330],[900,330],[990,330]]],"fl":[12,14,[[1080,330],[1140,330],[1200,330],[1260,330]]]},"boss":{"rb":[80,56,[[0,0]]],"rs":[14,62,[[400,0]]],"rm":[28,36,[[470,0]]],"rl":[26,42,[[610,0]]],"rh":[22,26,[[740,0]]],"rc":[28,28,[[850,0],[990,0],[1130,0]]],"rw":[16,16,[[1270,0]]],"cb":[100,134,[[1350,0]]],"ca":[22,46,[[1850,0]]]}};
const HR={ok:0,n:0,img:{},sh:{}},HRK={rat:'coati',qz:'quetzalB',bis:'bison',wk:'worker',wkg:'workerG',wkn:'workerN',bar:'baron'};
function hrShadow(im){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.shadowColor='rgba(26,8,48,1)';g.shadowBlur=7;g.shadowOffsetX=im.width+40;g.drawImage(im,-im.width-40,0);return c;}
for(const [k,f] of [['hero','rn-heroes.png'],['foe','rn-foes.png'],['boss','rn-bosses.png']]){const im=new Image();im.onload=()=>{try{HR.sh[k]=hrShadow(im);}catch(e){HR.sh[k]=null;}if(++HR.n===3)HR.ok=1;};im.onerror=()=>{};im.src=f+'?v=101';HR.img[k]=im;}
function hrF(set,key,i){const g=HRM[set]&&HRM[set][key];if(!g)return null;const fr=g[2];i=Math.max(0,Math.min(fr.length-1,i|0));return{set,im:HR.img[set],sx:fr[i][0],sy:fr[i][1],w:g[0],h:g[1],fw:g[0]*HRM.K,fh:g[1]*HRM.K};}
const HTC=document.createElement('canvas'),HTG=HTC.getContext('2d');
function hrDraw(F,x,y,f,tint,ta,cen,mode){const w=F.w,h=F.h,dx=-(w>>1),dy=cen?-(h>>1):1-h;X.save();X.translate(Math.round(x),Math.round(y));if(f<0)X.scale(-1,1);
  const sh=HR.sh[F.set];if(sh&&!tint){const a=X.globalAlpha;X.globalAlpha=a*0.42;X.drawImage(sh,F.sx,F.sy,F.fw,F.fh,dx+0.7*(f<0?-1:1),dy+1.1,w,h);X.globalAlpha=a;}
  if(tint){if(HTC.width<F.fw||HTC.height<F.fh){HTC.width=Math.max(HTC.width,F.fw);HTC.height=Math.max(HTC.height,F.fh);}
    HTG.globalCompositeOperation='source-over';HTG.globalAlpha=1;HTG.clearRect(0,0,F.fw,F.fh);HTG.drawImage(F.im,F.sx,F.sy,F.fw,F.fh,0,0,F.fw,F.fh);
    HTG.globalCompositeOperation=mode||'source-in';HTG.globalAlpha=ta||1;HTG.fillStyle=tint;HTG.fillRect(0,0,F.fw,F.fh);HTG.globalAlpha=1;HTG.globalCompositeOperation='source-over';X.drawImage(HTC,0,0,F.fw,F.fh,dx,dy,w,h);}
  else X.drawImage(F.im,F.sx,F.sy,F.fw,F.fh,dx,dy,w,h);X.restore();}
// --- screen-resolution actor layer: LO (retro world) and HXC (smooth characters) are interleaved onto the display canvas in draw order
const HXC=document.createElement('canvas'),HX=HXC.getContext('2d'),LOX=LO.getContext('2d');let HB=0,HPEND=0,LODIRTY=1,HS=1,HFIRST=1;
{const st_=HX.setTransform.bind(HX),gt_=HX.getTransform.bind(HX);HX._st=st_;
  HX.setTransform=function(a,b,c,d,e,f){if(typeof a==='object'){const m=a;a=m.a;b=m.b;c=m.c;d=m.d;e=m.e;f=m.f;}st_(a*HS,b*HS,c*HS,d*HS,e*HS,f*HS);};
  HX.getTransform=function(){const m=gt_();return new DOMMatrix([m.a/HS,m.b/HS,m.c/HS,m.d/HS,m.e/HS,m.f/HS]);};HX.resetTransform=function(){st_(HS,0,0,HS,0,0);};}
const LOclr=LOX.clearRect.bind(LOX);
for(const m of ['fillRect','drawImage','fill','stroke','fillText','strokeText','putImageData','clearRect']){const o=LOX[m];LOX[m]=function(){LODIRTY=1;return o.apply(this,arguments);};}
function hrOn(){return HR.ok&&X===LOX;}
function flushLO(){if(!LODIRTY)return;MX.setTransform(1,0,0,1,0,0);MX.imageSmoothingEnabled=false;MX.globalCompositeOperation='copy';MX.drawImage(LO,0,0,MID.width,MID.height);MX.globalCompositeOperation='source-over';
  D.setTransform(1,0,0,1,0,0);D.globalAlpha=1;D.globalCompositeOperation=HFIRST?'copy':'source-over';D.imageSmoothingEnabled=true;D.imageSmoothingQuality='high';D.drawImage(MID,0,0,C.width,C.height);D.globalCompositeOperation='source-over';HFIRST=0;
  const T=LOX.getTransform();LOX.setTransform(1,0,0,1,0,0);LOclr(0,0,VW,VH);LOX.setTransform(T);LODIRTY=0;}
function commitHX(){if(!HPEND)return;D.setTransform(1,0,0,1,0,0);D.globalAlpha=1;D.globalCompositeOperation='source-over';D.drawImage(HXC,0,0);HPEND=0;}
const _actors=actors;
actors=function(fn,k){if(!hrOn())return _actors(fn,k);
  if(HPEND&&LODIRTY)commitHX();
  if(!HPEND){flushLO();if(HXC.width!==C.width||HXC.height!==C.height){HXC.width=C.width;HXC.height=C.height;}HS=C.height/VH;HX._st(1,0,0,1,0,0);HX.clearRect(0,0,HXC.width,HXC.height);}
  HX.imageSmoothingEnabled=true;HX.imageSmoothingQuality='high';HX.setTransform(LOX.getTransform());HX.globalAlpha=LOX.globalAlpha;
  const old=X;X=HX;HB=1;try{fn();}finally{X=old;HB=0;HX.setTransform(1,0,0,1,0,0);HX.globalAlpha=1;HX.globalCompositeOperation='source-over';}HPEND=1;};
const _render=render,_present=present;
render=function(){HFIRST=1;LODIRTY=1;HPEND=0;_render();v101Over();};
present=function(){if(!HR.ok){HFIRST=1;return _present();}
  commitHX();if(LODIRTY||HFIRST)flushLO();
  if(fxOn){D.setTransform(1,0,0,1,0,0);D.globalCompositeOperation='lighter';D.drawImage(FXC,0,0,C.width,C.height);D.globalCompositeOperation='source-over';}};
const _spr=spr;
spr=function(k,i,x,y,f,tint){if(HB&&HR.ok){const F=hrF('hero',HRK[k],i);if(F)return hrDraw(F,x,y,f,tint,1,false,'source-in');}return _spr(k,i,x,y,f,tint);};
const _s8=s8;
s8=function(k,i,x,y,f,tint,ta,cen){if(HB&&HR.ok){const F=hrF('foe',k,i)||hrF('boss',k,i);if(F)return hrDraw(F,x,y,f,tint,ta,cen,'source-atop');}return _s8(k,i,x,y,f,tint,ta,cen);};
// --- heroes: hi-res body, spirit focus in the casting hand (no weapon), backflip on the double-tap jump
const FLIPT=26;
function spiritFocus(x,y,c1,c2,big,id){const t=st*0.18,r=big?2.6:1.8;X.save();
  if(HB){X.globalAlpha=0.35;X.fillStyle=c1;X.beginPath();X.arc(x,y,r*2.1,0,Math.PI*2);X.fill();X.globalAlpha=0.9;X.fillStyle=c2;X.beginPath();X.arc(x,y,r,0,Math.PI*2);X.fill();X.fillStyle='#fff';X.beginPath();X.arc(x,y,r*0.45,0,Math.PI*2);X.fill();
    for(let i=0;i<3;i++){const a=t+i*2.094,px=x+Math.cos(a)*(r*2.4),py=y+Math.sin(a)*(r*1.7);X.globalAlpha=0.85;X.fillStyle=i%2?c1:'#fff6c0';
      if(id==='gasket'){X.save();X.translate(px,py);X.rotate(a+1.2);X.beginPath();X.ellipse(0,0,1.6,0.55,0,0,Math.PI*2);X.fill();X.restore();}else{X.beginPath();X.arc(px,py,0.6,0,Math.PI*2);X.fill();}}}
  else{X.globalAlpha=0.5;R(x-2,y-2,4,4,c1);X.globalAlpha=1;R(x-1,y-1,2,2,'#fff');if((st>>2)%2)R(x+2,y-2,1,1,c2);}
  X.restore();}
heroS=function(ox,oy,o,id){const f=o.f||1,tt=o.t||0,tint=o.flash?'#fff':(o.sil||null);let i;
  const q=id==='gasket',b=id==='pumpjack',k=q?'qz':b?'bis':'rat',gc=q?['#b84aff','#80f000']:b?['#ffb030','#fff0b0']:['#30e0ff','#ff4fb0'];
  if(o.flip>0)i=10;else if(o.hurt)i=11;else if(o.pose==='crouch')i=10;else if(o.pose==='jump')i=8;else if(o.pose==='fall')i=q&&!o.glide?8:9;else if(o.pose==='run')i=2+Math.floor(tt/4)%6;else i=(tt>>5)%2;
  if(o.flip>0){const a=-f*Math.PI*2*(1-o.flip/FLIPT);X.save();X.translate(Math.round(ox),Math.round(oy)-15);X.rotate(a);spr(k,i,0,16,f,tint);X.restore();
    if(o.flip%3===0)parts.push({x:P.x+rnd(-6,6),y:P.y-rnd(6,24),vx:0,vy:-0.2,l:16,t:'tr',s:2,c:HUE(st*12)});return;}
  spr(k,i,ox,oy+1,f,tint);if(tint)return;
  let ax=o.ax,ay=o.ay;if(ax===undefined||(!ax&&!ay)){ax=f;ay=0;}const n=Math.hypot(ax,ay),ux=ax/n,uy=ay/n,sx=ox+f*3+ux*5-ux*(o.rc||0),sy=oy+(o.pose==='crouch'?-11:b?-16:-15)+uy*5;
  let c1=gc[0],c2=gc[1];if(state==='level'&&P){c1=P.pw?PWC[P.pw.k]:tcol(P.tier,P.x);}spiritFocus(sx,sy,c1,c2,(o.rc||0)>0,id);};
// --- spirit power visuals (same bullets, same hitboxes - only the look changes)
function feather(x,y,a,len,c,c2){X.save();X.translate(x,y);X.rotate(a);X.fillStyle=c;X.beginPath();X.ellipse(-len*0.45,0,len*0.55,len*0.2,0,0,Math.PI*2);X.fill();X.strokeStyle=c2;X.lineWidth=0.35;X.beginPath();X.moveTo(-len,0);X.lineTo(0.2,0);X.stroke();X.restore();}
function blossom(x,y,r,a,c){X.save();X.translate(x,y);X.rotate(a);X.fillStyle=c;for(let i=0;i<5;i++){const t=i/5*Math.PI*2;X.beginPath();X.ellipse(Math.cos(t)*r*0.55,Math.sin(t)*r*0.55,r*0.5,r*0.3,t,0,Math.PI*2);X.fill();}X.fillStyle='#fff6a0';X.beginPath();X.arc(0,0,r*0.3,0,Math.PI*2);X.fill();X.restore();}
function orbG(x,y,r,c,a){X.globalAlpha=(a||1)*0.3;X.fillStyle=c;X.beginPath();X.arc(x,y,r*1.9,0,Math.PI*2);X.fill();X.globalAlpha=(a||1);X.beginPath();X.arc(x,y,r,0,Math.PI*2);X.fill();X.fillStyle='#fff';X.beginPath();X.arc(x,y,r*0.45,0,Math.PI*2);X.fill();X.globalAlpha=1;}
function ray(x,y,ux,uy,len,w,c){X.lineCap='round';X.globalAlpha=0.45;X.strokeStyle=c;X.lineWidth=w*2.2;X.beginPath();X.moveTo(x-ux*len,y-uy*len);X.lineTo(x,y);X.stroke();X.globalAlpha=1;X.lineWidth=w;X.beginPath();X.moveTo(x-ux*len,y-uy*len);X.lineTo(x,y);X.stroke();X.strokeStyle='#fff';X.lineWidth=w*0.4;X.beginPath();X.moveTo(x-ux*len*0.7,y-uy*len*0.7);X.lineTo(x,y);X.stroke();}
function serpent(b,ox){const tr=b.tr||[],n=tr.length,r=Math.max(2.2,b.r*0.75);
  for(let j=n-1;j>=1;j--){const q=tr[j],p=tr[j-1],dx=p[0]-q[0],dy=p[1]-q[1],dl=Math.hypot(dx,dy)||1,w=Math.sin(j*0.7-st*0.4)*1.6,x=q[0]+ox-dy/dl*w,y=q[1]+dx/dl*w,rr=Math.max(0.9,r*(1-j/(n+3)));
    X.fillStyle=(j>>1)%2?'#40e8d8':'#1aa8c8';X.beginPath();X.arc(x,y,rr,0,Math.PI*2);X.fill();X.fillStyle='#ffd030';X.beginPath();X.arc(x+dy/dl*rr*0.4,y-dx/dl*rr*0.4+rr*0.25,rr*0.42,0,Math.PI*2);X.fill();
    if(j%3===1){X.fillStyle=(j>>1)%2?'#ff8a20':'#ffe040';X.beginPath();X.moveTo(x-dy/dl*rr,y+dx/dl*rr-rr*0.4);X.lineTo(x-dy/dl*(rr+3)+dx/dl,y-rr-2.4);X.lineTo(x+dx/dl*1.5,y-rr*0.3);X.fill();}}
  const x=b.x+ox,y=b.y,an=Math.atan2(b.vy,b.vx);X.save();X.translate(x,y);X.rotate(an);X.globalAlpha=0.35;X.fillStyle='#ff8a20';X.beginPath();X.arc(0,0,r*2.4,0,Math.PI*2);X.fill();X.globalAlpha=1;
  X.fillStyle='#40e8d8';X.beginPath();X.ellipse(0,0,r*1.3,r,0,0,Math.PI*2);X.fill();X.beginPath();X.ellipse(r*1.1,-r*0.3,r,r*0.5,0,0,Math.PI*2);X.fill();X.fillStyle='#ff3a20';X.fillRect(r*0.8,r*0.1,r*1.1,r*0.3);
  X.fillStyle='#fff6a0';X.beginPath();X.arc(r*0.3,-r*0.5,r*0.4,0,Math.PI*2);X.fill();X.fillStyle='#1a1028';X.fillRect(r*0.3,-r*0.7,r*0.2,r*0.4);
  X.fillStyle='#ffb030';X.beginPath();X.moveTo(-r*0.6,-r*0.8);X.lineTo(-r*1.8,-r*2.2+Math.sin(st*0.5));X.lineTo(-r*0.1,-r*0.9);X.fill();X.restore();}
function drawMagic(ox){for(const b of bullets){const x=b.x+ox,r=b.r,c=bulletCol(b),n=Math.hypot(b.vx,b.vy)||1,ux=b.vx/n,uy=b.vy/n,an=Math.atan2(b.vy,b.vx);
    if(b.k==='flint'){X.globalAlpha=0.5;X.strokeStyle='#fff0c0';X.lineWidth=r*0.9;X.lineCap='round';X.beginPath();X.moveTo(x-ux*6,b.y-uy*6);X.lineTo(x,b.y);X.stroke();X.globalAlpha=1;X.fillStyle='#ffe8a0';orbG(x,b.y,r*0.8,'#ffe8a0');}
    else if(b.k==='shard')feather(x,b.y,an,r*3.2,'#b070ff','#f0d8ff');
    else if(b.k==='laser'||b.k==='gold')ray(x,b.y,ux,uy,b.len,Math.max(1.2,r*0.8),c);
    else if(b.k==='ric'){X.fillStyle=c;orbG(x,b.y,r*0.8,c);X.strokeStyle='#c0fff8';X.lineWidth=0.5;X.beginPath();X.arc(x,b.y,r*1.3,st*0.3,st*0.3+3.5);X.stroke();}
    else if(b.k==='fire'){X.fillStyle='#ff6a20';X.globalAlpha=0.6;for(let i=0;i<5;i++){const a=i/5*Math.PI*2+st*0.2;X.beginPath();X.arc(x+Math.cos(a)*r*0.7,b.y+Math.sin(a)*r*0.7,r*0.55,0,Math.PI*2);X.fill();}X.globalAlpha=1;X.fillStyle='#ffb030';orbG(x,b.y,r*0.75,'#ffb030');}
    else if(b.k==='rapid'){X.fillStyle=c;orbG(x,b.y,r*0.7,c);X.globalAlpha=0.5;X.beginPath();X.arc(x-ux*3,b.y-uy*3,r*0.45,0,Math.PI*2);X.fill();X.globalAlpha=1;}
    else if(b.k==='spr')blossom(x,b.y,r*1.6,st*0.25,c);
    else if(b.k==='star'){X.save();X.translate(x,b.y);X.rotate(st*0.2);X.fillStyle=c;X.beginPath();for(let i=0;i<10;i++){const rr=i%2?r*0.5:r*1.4,a=i/10*Math.PI*2;X.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}X.fill();X.restore();}
    else if(b.k==='beam')ray(x,b.y,ux,uy,b.len,Math.max(1.4,r),HUE(st*12));
    else if(b.k==='flame'){const s=b.r;X.globalAlpha=Math.min(1,b.life/8)*0.75;X.fillStyle=c;X.beginPath();X.arc(x,b.y,s,0,Math.PI*2);X.fill();X.fillStyle='#fff6e0';X.beginPath();X.arc(x,b.y,s*0.45,0,Math.PI*2);X.fill();X.globalAlpha=1;}
    else if(b.k==='bnc'){X.fillStyle=c;orbG(x,b.y,r*0.9,c);}
    else if(b.k==='obs'){if(b.axe){R(x-1,b.y-3,2,7,'#5a3a20');R(x-3,b.y-3,5,3,'#1a1028');R(x-3,b.y-3,5,1,'#c8a8ff');}else{R(x-3,b.y-1,6,2,'#1a1028');R(x-3,b.y-1,6,1,'#b070ff');R(x+ux*2,b.y,1,1,'#fff');}}
    else if(v71BD(b,x)){}
    else if(b.k==='moon'){const a=st*0.4;for(let i=0;i<7;i++){const t=a+i*0.45;R(x+Math.cos(t)*4-1,b.y+Math.sin(t)*4-1,2,2,i===3?'#fff':'#d8e4ff');}}
    else if(b.k==='hom'){X.save();X.translate(x,b.y);X.fillStyle=c;X.globalAlpha=0.35;X.beginPath();X.arc(0,0,r*1.8,0,Math.PI*2);X.fill();X.globalAlpha=1;X.beginPath();X.arc(-r*0.45,-r*0.2,r*0.55,0,Math.PI*2);X.arc(r*0.45,-r*0.2,r*0.55,0,Math.PI*2);X.fill();X.beginPath();X.moveTo(-r,0);X.lineTo(0,r);X.lineTo(r,0);X.fill();X.restore();}
    else if(b.k==='orb')serpent(b,ox);}}
function drawMagicL(ox){if(HR.ok&&X===LOX)actors(()=>drawMagic(ox));else drawMagic(ox);}
tierIcon=function(x,y,t,s){s=s||1;const r=(a,b,w,h,c)=>R(x+a*s,y+b*s,w*s,h*s,c);
  if(t<=1){r(2,1,3,5,'#fff0c0');r(1,2,5,3,'#fff0c0');r(3,3,1,1,'#fff');}
  else if(t===2){r(0,5,2,2,'#f0d8ff');r(1,3,3,2,'#b070ff');r(3,1,3,2,'#b070ff');r(5,0,2,1,'#e0c8ff');}
  else if(t===3){r(0,3,7,1,'#30f080');r(1,2,5,3,'#30f080');r(2,3,4,1,'#e0ffe8');}
  else if(t===4){r(1,1,5,5,'#30e8e8');r(2,2,3,3,'#c0fff8');r(5,0,2,1,'#fff');}
  else if(t===5){r(1,1,5,5,'#ff8a20');r(2,2,3,3,'#ffd030');r(0,3,1,1,'#ffd030');r(6,3,1,1,'#ffd030');r(3,0,1,1,'#ffd030');r(3,6,1,1,'#ffd030');}
  else{r(0,4,2,2,'#40e8d8');r(2,3,2,2,'#1aa8c8');r(4,2,2,2,'#40e8d8');r(5,0,2,2,'#40e8d8');r(6,1,1,1,'#ff3a20');r(3,5,1,1,'#ffd030');}};
// --- message bar: banners and pop-up text live in one compact strip under the score instead of over the action
let MSG=[];
function msgPush(t,c){if(!t)return;t=String(t);MSG=MSG.filter(m=>m.t!==t);MSG.push({t,c:c&&c!=='rainbow'?c:'#fff6a0',l:120});if(MSG.length>3)MSG.shift();}
pop=function(x,y,s,col){msgPush(s,col);};
function msgBar(){let y=23;const mid=VW/2;
  if(banner){const a=banner.age||0,dy=a<8?Math.round((8-a)*-2):0,big=banner.t.length*8<VW-150,tw=banner.t.length*(big?8:4),sw=banner.s?banner.s.length*4:0,ic=banner.icon||banner.pw?14:0,bw=Math.max(tw+ic,sw)+12,h=(big?13:9)+(banner.s?9:0);
    X.save();X.translate(0,dy);R(Math.round(mid-bw/2),y,bw,h,'#2a0f50');X.globalAlpha=0.6;R(Math.round(mid-bw/2),y,bw,1,HUE(st*6));R(Math.round(mid-bw/2),y+h-1,bw,1,HUE(st*6+180));X.globalAlpha=1;
    const tx=mid+ic/2;txt(banner.t,tx,y+2,'rainbow',big?2:1,1,'#5a1090');
    if(banner.icon)tierIcon(Math.round(tx-tw/2-12),y+2,banner.icon,1);else if(banner.pw)gunBadge(Math.round(tx-tw/2-13),y+1,banner.pw,1);
    if(banner.s)txt(banner.s,mid,y+(big?13:9),'#fff',1,1,'#7a1aa0');X.restore();y+=h+2;}
  const m=MSG[MSG.length-1];if(m){const w=m.t.length*4+10,a=Math.min(1,m.l/16);X.globalAlpha=a*0.85;R(Math.round(mid-w/2),y,w,9,'#2a0f50');X.globalAlpha=a;txt(m.t,mid,y+2,m.c,1,1,'#5a1090');X.globalAlpha=1;}}
const _hud=hud;hud=function(){const b=banner;banner=null;try{_hud();}finally{banner=b;}if(state==='level')msgBar();};
// --- tacos at bosses: one extra Nopal Taco in every arena, a drop at half boss health, and a fair random drop roll during the fight
const BT={boss:null,half:0,t:0,n:0};
function tacoCount(){return pickups.filter(k=>!k.gone&&/^T[1-4]$/.test(k.k)).length;}
function bossTaco(k,x,y){const gx=safeGroundX(clamp(x,cam.x+24,(boss&&!boss.dying&&boss.kind!=='col'?boss.x-56:cam.x+VW-40)));pickups.push({k,x:gx,y:y===undefined?-8:y,vy:0.5,onG:false,tt:0,bt:1});BT.n++;
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;parts.push({x:gx,y:Math.max(8,y||8),vx:Math.cos(a)*1.4,vy:Math.sin(a)*1.4,l:16,t:'tr',s:2,c:k==='T2'?'#60f080':'#fff060'});}}
function bossTacoRoll(){const lo=hp<=Math.max(1,Math.floor(maxHp()/2)),ch=hp<=1?0.9:lo?0.7:0.45;BT.t=Math.round(rnd(720,1200));
  if(tacoCount()>0||Math.random()>=ch)return false;bossTaco(Math.random()<(lo?0.3:0.15)?'T2':'T1',P.x+rnd(-70,70));msgPush('A TACO FALLS FROM THE SKY!','#fff6a0');return true;}
function bossTacoTick(){if(!boss||boss.dying||!P||P.dead){return;}
  if(BT.boss!==boss){BT.boss=boss;BT.half=0;BT.t=Math.round(rnd(720,1200));BT.n=0;bossTaco('T2',cam.x+80,GY-60);}
  if(!BT.half&&boss.hp<=boss.mx/2){BT.half=1;bossTaco('T2',P.x+(P.f>0?40:-40));msgPush('HALFWAY! A NOPAL TACO DROPS','#80ff80');}
  if(--BT.t<=0)bossTacoRoll();}
// --- boss game over: retry from the boss checkpoint (score kept) or quit to title
let OVB=null;
const _respawn=respawn;
respawn=function(){if(lives-1<0&&boss&&!boss.dying&&state==='level'){v10Die();lives--;v7Respawn();OVB={stage,score};setState('over');sfx('over');return;}_respawn();};
function retryBoss(){const kind=boss&&boss.kind;OVB=null;lives=v9Lives()+1;setState('level');_respawn();
  if(kind==='col'){boss.hp=boss.mx;boss.open=false;boss.dying=0;}else startBoss();
  BT.boss=null;ebul=[];enemies=enemies.filter(e=>e.t==='drone');music('boss');banner={t:'RETRY!',s:'BOSS CHECKPOINT - SCORE KEPT',l:90,mini:1};}
const _cont=continueGame;continueGame=function(){if(OVB)return retryBoss();_cont();};
const _setState=setState;setState=function(s){if(s==='title')OVB=null;_setState(s);};
const _drawOver=drawOver;
drawOver=function(){if(!OVB)return _drawOver();skyline(st,true);X.globalAlpha=0.55;R(0,0,VW,VH,'#1a0640');X.globalAlpha=1;
  txt('GAME OVER',VW/2,40,'rainbow',4,1,'#5a1090');txt('THE BOSS GOT YOU THIS TIME',VW/2,76,'#ffd0f0',1,1,'#5a1090');txt('SCORE '+score,VW/2,92,'#fff',1,1);
  if(st>40){btn(VW/4-50,120,100,20,'#ff3a9a','RETRY BOSS','cont');btn(VW*3/4-50,120,100,20,'#5a2a9a','QUIT TO TITLE','title');
    txt('RETRY STARTS AT THE BOSS CHECKPOINT - SCORE KEPT',VW/2,150,'#c8b8ff',1,1);if(!isTouch)txt('B/X = RETRY   A/Z = TITLE',VW/2,166,'#999',1,1);}};
// --- pause screen doubles as the controls help
function v101Over(){if(!paused)return;const y=128,c='#e8dcff';X.globalAlpha=0.85;R(VW/2-150,y-4,300,58,'#2a0f50');X.globalAlpha=1;txt('CONTROLS',VW/2,y,'#fff6a0',1,1);
  if(isTouch){txt('PAD MOVE + AIM    A JUMP    B CAST POWER',VW/2,y+12,c,1,1);txt('TAP A AGAIN IN THE AIR = HIGH BACKFLIP JUMP',VW/2,y+22,c,1,1);txt('GOD = GOD POWER    SWAP = NEXT GOD',VW/2,y+32,c,1,1);}
  else{txt('ARROWS/WASD MOVE + AIM   Z/SPACE/K JUMP   X/J CAST',VW/2,y+12,c,1,1);txt('PRESS JUMP AGAIN IN THE AIR = HIGH BACKFLIP JUMP',VW/2,y+22,c,1,1);txt('C GOD POWER   V SWAP GOD   P PAUSE   M MUTE',VW/2,y+32,c,1,1);}
  txt('WALK BACK ANY TIME - THE CAMERA FOLLOWS',VW/2,y+42,'#a0f0ff',1,1);}
// --- per-frame level hook
const _updLevel=updLevel;
updLevel=function(){const L0=L;_updLevel();const p=P;if(!p||state!=='level')return;
  if(L!==L0||L.camMin===undefined)L.camMin=L.camMin===undefined?Math.max(0,cam.x):L.camMin;
  if(p.flip>0){p.flip--;if(p.onG||p.dead)p.flip=0;}
  for(const b of bullets)if(b.k==='orb'){(b.tr||(b.tr=[])).unshift([b.x,b.y]);if(b.tr.length>12)b.tr.pop();}
  for(const q of parts)if(q.t==='txt2'||(q.t==='pop'&&typeof q.c==='string'&&/[A-Z]{2}/.test(q.c))){msgPush(q.c,q.col);q.l=0;}
  for(const m of MSG)m.l--;MSG=MSG.filter(m=>m.l>0);
  bossGuideTick();bossTacoTick();};
// --- font: these characters were missing from the 3x5 pixel font and showed up as blank gaps (e.g. "FAST   CASTS 50  FASTER")
Object.assign(FONT,{'+':'000010111010000','/':'001001010100100','(':'010100100100010',')':'010001001001010',"'":'010010000000000','%':'101001010100101','<':'001010100010001','>':'100010001010100','*':'101010101000000','=':'000111000111000','&':'010101010101011','#':'101111101111101'});
// --- boss weak point fix: the crystal core was boxed inside the body hitbox, so every non-splash shot died on the body
// (and level shots hit the legs). While the core is open its hit area now grows and reaches the ground in front of the boss,
// so standing, crouching and jumping shots all connect. A telegraph flash comes first, the crystal glows while open,
// and the message bar tells the player what to do.
function bossHitBox(){if(!boss.open)return bossCore();if(boss.kind==='col')return{x:boss.x-52,y:110+boss.bob,w:66,h:GY-110-boss.bob};return{x:boss.x-44,y:100,w:58,h:GY-100};}
function bossTele(){const b=boss;if(!b||b.dying||b.open)return 0;if(b.kind==='col'){if(b.rise>0)return 0;const c=b.t%300;return c>=110&&c<140?(140-c)/30:0;}return b.ph==='raise'||b.ph==='slam'?1:0;}
let BOPEN=0;
function bossGuideTick(){const o=!!(boss&&!boss.dying&&boss.open&&(boss.kind==='col'||boss.ph==='open'));if(o&&!BOPEN)msgPush('NOW! SHOOT THE GLOWING CRYSTAL!','#a0fff0');BOPEN=o;}
function crystalFx(ox){if(!boss||boss.dying)return;const c=bossCore(),cx=c.x+12+ox,cy=c.y+12,tl=bossTele();
  if(boss.open&&(boss.kind==='col'||boss.ph==='open')){const hb=bossHitBox(),pu=0.5+0.5*Math.sin(st*0.3);
    X.globalAlpha=0.16+0.1*pu;X.fillStyle='#80fff0';X.fillRect(hb.x+ox,cy,hb.w,GY-cy);X.globalAlpha=1;
    for(let i=0;i<3;i++){const r=10+i*7+pu*4;X.globalAlpha=(0.55-i*0.15)*(0.6+0.4*pu);X.strokeStyle=i%2?'#ffffff':HUE(st*6+i*60);X.lineWidth=1.4;X.beginPath();X.arc(cx,cy,r,0,Math.PI*2);X.stroke();}
    X.globalAlpha=0.5+0.4*pu;X.fillStyle='#c0fff8';X.beginPath();X.moveTo(cx,cy-9);X.lineTo(cx+7,cy);X.lineTo(cx,cy+9);X.lineTo(cx-7,cy);X.fill();X.fillStyle='#fff';X.beginPath();X.moveTo(cx,cy-4);X.lineTo(cx+3,cy);X.lineTo(cx,cy+4);X.lineTo(cx-3,cy);X.fill();
    for(let i=0;i<4;i++){const a=st*0.12+i*Math.PI/2;X.fillStyle='#fff6a0';X.fillRect(cx+Math.cos(a)*20-1,cy+Math.sin(a)*14-1,2,2);}X.globalAlpha=1;}
  else if(tl>0&&(st>>2)%2){X.globalAlpha=0.85;X.fillStyle='#ffffff';X.beginPath();X.arc(cx,cy,7+4*(1-tl),0,Math.PI*2);X.fill();X.globalAlpha=1;txt('!',cx,cy-26,'#fff6a0',2,1,'#5a1090');}}
const _drawBoss=drawBoss;drawBoss=function(ox){if(HR.ok&&X===LOX)actors(()=>_drawBoss(ox));else _drawBoss(ox);if(!boss)return;if(HR.ok&&X===LOX)actors(()=>crystalFx(ox));else crystalFx(ox);};

// ===== Loop =====
function update(){
  pollInput();if(paused)return;if(fadeT>0)fadeT--;if(gemBump>0)gemBump--;if(tacoBump>0)tacoBump--;
  if(press&&--press.t<=0){const f=press.act;press=null;f();return;}
  if(hitStop>0){hitStop--;if(pressed('a')&&P)P.jb=7;return;}
  v74Tick();v9Tick();v10Tick();if(SLOMO>0&&state==='level'&&(--SLOMO&1)){if(pressed('a')&&P)P.jb=7;return;}
  st++;if(shake>0)shake--;if(banner){banner.age=(banner.age||0)+1;if(--banner.l<=0)banner=null;}
  if(state==='map')updMap();
  else if(state==='level'){updLevel();updParts();}
  else if(state==='sewer'){if(st>150)startLevel();}
  else if(state==='cave'){if(st>150)startMictlan();}
  else{updMenus();updParts();}
}
function render(){
  fxOn=false;X.setTransform(1,0,0,1,0,0);X.imageSmoothingEnabled=false;
  if(v10Draw()||v9Draw());else if(state==='select')drawSelect();else if(state==='over')drawOver();else if(state==='story')drawStory();else if(state==='win'){drawWin();drawParts(0);}
  else if(state==='sewer')drawSewer();
  else if(state==='cave')drawCaveIntro();
  else{const amp=Math.min(3,Math.ceil(shake/4)),sx=shake?Math.round(rnd(-amp,amp)):0,sy=shake?Math.round(rnd(-amp,amp)):0;X.setTransform(1,0,0,1,sx,sy);
    if(state==='map'){drawMap();v9MapTop();}else{drawLevel();X.setTransform(1,0,0,1,0,0);hud();v74Top();v10Top();drawGlow(-cam.x,sx,sy);fxOn=true;}}
  X.setTransform(1,0,0,1,0,0);
  if(fadeT>0){X.globalAlpha=ease(fadeT/14);X.fillStyle='#2a0a4a';X.fillRect(0,0,VW,VH);X.globalAlpha=1;}
  if(paused){X.fillStyle='rgba(0,0,0,.6)';X.fillRect(0,0,VW,VH);txt('PAUSED',VW/2,80,'#fff',3,1);txt(isTouch?'TAP TO RESUME':'P TO RESUME',VW/2,110,'#ccc',1,1);}
}
function present(){
  MX.imageSmoothingEnabled=false;MX.drawImage(LO,0,0,MID.width,MID.height);
  D.setTransform(1,0,0,1,0,0);D.globalCompositeOperation='source-over';D.imageSmoothingEnabled=true;D.imageSmoothingQuality='high';
  D.drawImage(MID,0,0,C.width,C.height);
  if(fxOn){D.globalCompositeOperation='lighter';D.drawImage(FXC,0,0,C.width,C.height);D.globalCompositeOperation='source-over';}
}
let fxOn=false;
function glowDot(x,y,r,c,a){if(r<=0)return;const g=FX.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');FX.globalAlpha=a;FX.fillStyle=g;FX.fillRect(x-r,y-r,r*2,r*2);FX.globalAlpha=1;}
function drawGlow(ox,sx,sy){FX.setTransform(1,0,0,1,0,0);FX.clearRect(0,0,VW,VH);FX.setTransform(1,0,0,1,sx,sy);
  for(const b of bullets){const x=b.x+ox,c=bulletCol(b);
    if(b.k==='laser'||b.k==='beam'){const n=Math.hypot(b.vx,b.vy)||1,ux=b.vx/n,uy=b.vy/n;FX.globalAlpha=0.55;FX.strokeStyle=c;FX.lineCap='round';FX.lineWidth=5;FX.beginPath();FX.moveTo(x-ux*b.len,b.y-uy*b.len);FX.lineTo(x,b.y);FX.stroke();FX.globalAlpha=1;}
    else glowDot(x,b.y,b.r*3+3,c,b.k==='flint'?0.35:0.6);}
  for(const p of parts){const x=p.x+ox;if(p.t==='mf')glowDot(x,p.y,p.s*1.6,p.c,0.7);else if(p.t==='sun')glowDot(x,p.y,p.s*1.8,'#ffd030',0.8);else if(p.t==='tr')glowDot(x,p.y,p.s*1.8,p.c,Math.min(0.5,p.l/16));else if(p.t==='b'&&p.l>14)glowDot(x,p.y,p.s*2,'#ff7ae0',0.35);else if(p.t==='ex')glowDot(x,p.y,p.s*(1.2-p.l/40),HUE(st*10),0.8);}
  if(boss&&boss.open&&!boss.dying){const c=bossCore();glowDot(c.x+12+ox,c.y+12,30,HUE(st*6),0.5+0.2*Math.sin(st*0.3));}
  FX.setTransform(1,0,0,1,0,0);}
let last=performance.now(),acc=0;const STEP=1000/60;
function frame(t){if(!alive)return;requestAnimationFrame(frame);let dt=t-last;last=t;if(dt>250)dt=250;acc+=dt;// safety valve: if a device can't keep ~50fps at full DPR, drop the backing store one step (still smooth-scaled)
  if(dpr>1.5&&dt>21&&dt<120){if(++slowN>90){slowN=0;maxDpr=Math.max(1.5,dpr-1);resize();}}else if(slowN>0&&dt<18)slowN--;
  let n=0;while(acc>=STEP&&n<5){update();acc-=STEP;n++;}if(n>=5)acc=0;render();present();}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing())paused=true;if(A.ctx){if(document.hidden)A.ctx.suspend();else A.ctx.resume();}});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});

// ===== Test / debug hooks =====
window.SS={get state(){return state},get P(){return P},get boss(){return boss},get M(){return M},get hp(){return hp},get lives(){return lives},get score(){return score},
  pickHero(i){hero=sel=i;newGame();},toManhole(){M.x=32.5*TS-14;M.y=20.5*TS;},warpBoss(){P.x=L.len-VW*0.58-6;cam.x=L.len-VW-8;P.y=GY;L.si=L.spawns.length;enemies=[];},
  hurtBoss(n){if(boss)boss.hp=Math.max(1,boss.hp-n);},finishBoss(){if(boss)boss.dying=1;},tierUp(){tierUp();},setTier(t){P.tier=t;},givePW(g){givePW(g);},spawnPod(dx,by){spawnPod(dx,by);},get pickups(){return pickups},get enemies(){return enemies},get L(){return L},get cam(){return cam},get bullets(){return bullets},get SAVE(){return SAVE},openShop(f){winNext();},giveCoins(n){SAVE.gems+=n;save();},god(){P.god=1;},giveGod(k){giveGod(k);},godFill(){godM=100;},useGod(){useGod();},swapGod(){swapGod();},startMap(){startMap();},setState(s){setState(s);},startMictlan(){startMictlan();},breakCrack(){crackHit('L');crackHit('L');},get ebul(){return ebul},get v7(){return{godM,GP,decoy,slowT,sunT,litT,winKind,L,P,boss,spirit};},kill(){hp=1;P.inv=0;hurtPlayer();},
  frames(n){for(let i=0;i<n;i++)update();render();present();},
  icon(size){const c=document.createElement('canvas');c.width=c.height=32;const old=X;X=c.getContext('2d');const bands=['#2a1848','#6a2058','#b03c4a','#e0603a','#f8a040'];bands.forEach((b,i)=>R(0,i*7,32,7,b));R(0,28,32,4,'#3a2414');
    drawHero(15,30,0,{f:1,pose:'stand',t:0});X=old;const o=document.createElement('canvas');o.width=o.height=size;const g=o.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(c,0,0,size,size);return o.toDataURL('image/png');}};
// ===== v1.0.2: painted hi-res tacos (pickups + HUD), full colour, no outline, drawn at screen resolution =====
// rn-tacos.png holds 5 frames (80x70 each = 5x the 16x14 art cell): T1 elote, T2 nopal, T3 golden, T4 star, and the empty HUD shell.
const TACOK={T1:0,T2:1,T3:2,T4:3,E:4},TCI={ok:0,im:new Image(),sh:null};
TCI.im.onload=()=>{try{TCI.sh=hrShadow(TCI.im);}catch(e){TCI.sh=null;}TCI.ok=1;};TCI.im.onerror=()=>{};TCI.im.src='rn-tacos.png?v=102';
function tacoHR(k,dx,dy,w,h,sh){const i=TACOK[k]||0;if(sh&&TCI.sh){const a=X.globalAlpha;X.globalAlpha=a*0.4;X.drawImage(TCI.sh,i*80,0,80,70,dx+0.5,dy+0.9,w,h);X.globalAlpha=a;}X.drawImage(TCI.im,i*80,0,80,70,dx,dy,w,h);}
const _drawTaco102=drawTaco;
drawTaco=function(x,y,k,tt,hud,full){if(!(TCI.ok&&HR.ok&&(X===LOX||HB)))return _drawTaco102(x,y,k,tt,hud,full);
  const go=()=>{if(hud){tacoHR(full?(k||'T1'):'E',x-0.5,y-1.4,11,9.6,full);return;}
    if(k==='T3'){const p=0.5+0.5*Math.sin(tt*0.12),a=X.globalAlpha;X.globalAlpha=a*(0.25+0.3*p);X.fillStyle='#ffe070';X.beginPath();X.ellipse(x+5,y+3,9,7,0,0,7);X.fill();X.globalAlpha=a;}
    if(k==='T4'){const a=X.globalAlpha;X.globalAlpha=a*0.35;X.fillStyle=HUE(tt*8);X.beginPath();X.ellipse(x+5,y+3,9.5,7.5,0,0,7);X.fill();X.globalAlpha=a;}
    tacoHR(k,x-3,y-4,16,14,true);
    const s1=(tt>>3)%3;R(x+3+(s1===1?1:0),y-6-s1,1,2,'#fff8ff');R(x+7-(s1===2?1:0),y-7-((s1+1)%3),1,2,'#f0e8ff');
    if(tt%14<3)sparkle(x+11,y-3,1,'#fff6a0');if(k==='T4'&&tt%5<2)sparkle(x+5+(tt%3)*3-3,y-6,2,'#fff');};
  if(HB)go();else actors(go);};
// --- v1.0.2 boss difficulty curve. Each run of three stages climbs 0.2x HP per boss (Big Derrick 70, MK II 84, Baron Mega Rig 98),
// NG+ multiplies the whole run by 1.25x per loop (max two loops), and later rigs throw faster shockwaves. Hard mode still stacks on top via the
// existing 0.8x player damage (easy 1.4x). Open windows: Big Derrick 170 frames (was 140), Colossus 150 (was 120).
function bossLoop102(){return Math.min(2,Math.floor((Math.max(1,stage)-1)/3));}
function bossNG102(){return 1+0.25*bossLoop102();}
function bossMx102(){return Math.ceil(70*(1+0.2*v9ci())*bossNG102());}
function bossWave102(){return [2.4,2.6,2.85][v9ci()]+0.15*bossLoop102();}

return ()=>{alive=false;clearInterval(musIv);if(A.ctx)A.ctx.close();};
}
SS_RUN(null);
