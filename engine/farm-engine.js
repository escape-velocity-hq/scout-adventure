// Aiken Basserie and Farm 3D engine (terrain, ponds, fish, sky, sound, camera). Loaded before the game files.

'use strict';
const FT=0.3048, $=id=>document.getElementById(id);
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const KEY='abf3d.scene.v1';
// ---------- languages
let LANG=(()=>{const sv=store.get('abf3d.lang');if(sv&&I18N[sv])return sv;for(const l of (navigator.languages||[navigator.language||'en'])){const c=String(l).toLowerCase().split('-')[0];if(I18N[c])return c}return 'en'})();
function tr(k,v){let t=I18N[LANG]&&I18N[LANG][k];if(t===undefined)t=I18N.en[k];if(t===undefined)return k;return v?t.replace(/\{(\w+)\}/g,(m,x)=>v[x]!==undefined?v[x]:m):t}
function trn(g,k){const a=I18N[LANG]&&I18N[LANG][g],b=I18N.en[g];return (a&&a[k]!==undefined)?a[k]:(b&&b[k]!==undefined)?b[k]:k}
function pondName(n){const m=/^Pond (\d+)$/.exec(n);return m?tr('pond',{n:m[1]}):n}
function applyStatic(){document.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=tr(e.dataset.i18n)});document.documentElement.lang=LANG==='zh'?'zh-CN':LANG}
applyStatic();
const MOBILE=matchMedia('(max-width:760px)').matches||/Mobi|Android/i.test(navigator.userAgent);
const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;

// ---------- camera control: orbit, pan, zoom (mouse and touch)
let setBand=null;
class Orbit{
 constructor(cam,dom,onClick){this.cam=cam;this.dom=dom;this.target=new THREE.Vector3();this.sph=new THREE.Spherical(60,1,0.6);this.pts=new Map();this.moved=0;this.onClick=onClick;this.walk=null;
  dom.addEventListener('pointerdown',e=>{if(typeof stopDrive==='function')stopDrive();fly=null;dom.focus({preventScroll:true});this.pts.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button,sh:e.shiftKey});this.moved=0;this.t0=performance.now();this.d0=null;try{dom.setPointerCapture(e.pointerId)}catch(_){}});
  dom.addEventListener('pointermove',e=>{const p=this.pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;this.moved+=Math.abs(dx)+Math.abs(dy);
   if(this.walk&&this.pts.size<2){const k=0.0042*this.cam.fov/60;this.walk.yaw+=dx*k;this.walk.pitch=Math.min(1.25,Math.max(-1.25,this.walk.pitch+dy*k));p.x=e.clientX;p.y=e.clientY;this.update();return}
   if(this.pts.size>=2){const a=[...this.pts.values()];const o=a[0]===p?a[1]:a[0];const d1=Math.hypot(e.clientX-o.x,e.clientY-o.y);if(this.d0){this.zoom(this.d0/d1)}this.d0=d1;this.pan(dx*0.5,dy*0.5)}
   else if(p.b===2||p.b===1||p.sh||e.shiftKey){this.pan(dx,dy)}
   else{this.sph.theta-=dx*0.005;this.sph.phi=Math.min(Math.PI/2-0.01,Math.max(0.03,this.sph.phi-dy*0.005))}
   p.x=e.clientX;p.y=e.clientY;this.update()});
  const up=e=>{const p=this.pts.get(e.pointerId);if(!p)return;const single=this.pts.size===1;this.pts.delete(e.pointerId);this.d0=null;if(single&&p.b===0&&this.moved<7&&performance.now()-this.t0<600)this.onClick(e)};
  dom.addEventListener('pointerup',up);dom.addEventListener('pointercancel',e=>{this.pts.delete(e.pointerId);this.d0=null});
  dom.addEventListener('contextmenu',e=>e.preventDefault());
  dom.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(e.deltaY*0.0011));this.update()},{passive:false});}
 zoom(k){if(this.walk){this.cam.fov=Math.max(28,Math.min(84,this.cam.fov*k));this.cam.updateProjectionMatrix();return}this.sph.radius=Math.max(1,Math.min(1600,this.sph.radius*k))}
 pan(dx,dy){if(this.walk)return;const k=this.sph.radius*0.0013,r=new THREE.Vector3(),u=new THREE.Vector3();this.cam.matrix.extractBasis(r,u,new THREE.Vector3());this.target.addScaledVector(r,-dx*k).addScaledVector(u,dy*k)}
 set(p,t){if(this.walk&&typeof walkExit==='function'){this.walk=null;walkExit(true)}this.target.set(t[0],t[1],t[2]);this.sph.setFromVector3(new THREE.Vector3(p[0]-t[0],p[1]-t[1],p[2]-t[2]));this.sph.phi=Math.min(Math.PI/2-0.01,Math.max(0.03,this.sph.phi));this.update()}
 update(){if(this.walk){const w=this.walk,c=Math.cos(w.pitch);this.cam.position.copy(w.pos);this.cam.lookAt(w.pos.x+Math.sin(w.yaw)*c,w.pos.y+Math.sin(w.pitch),w.pos.z+Math.cos(w.yaw)*c);return}this.cam.position.setFromSpherical(this.sph).add(this.target);this.cam.lookAt(this.target);if(setBand)setBand(this.sph.radius)}
}

// ---------- renderer, lights, sky
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,MOBILE?1.5:2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(46,2,0.25,9000);
scene.fog=new THREE.Fog(0xcfe1ee,500,3600);
const hemi=new THREE.HemisphereLight(0xffffff,0x6b7a55,1);scene.add(hemi);
const SMAP=MOBILE?2048:4096;
const sun=new THREE.DirectionalLight(0xffffff,3);sun.castShadow=true;sun.shadow.mapSize.set(SMAP,SMAP);scene.add(sun);scene.add(sun.target);
const moon=new THREE.DirectionalLight(0x9db4ff,0);scene.add(moon);scene.add(moon.target);
const sunDir=new THREE.Vector3(0.3,0.8,0.5).normalize();
const skyU={uTop:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uSun:{value:sunDir},uSunCol:{value:new THREE.Color()},uNight:{value:0},uTime:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(7000,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
 vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w*0.99995;}',
 fragmentShader:`uniform vec3 uTop,uHor,uSun,uSunCol;uniform float uNight,uTime;varying vec3 vD;
  float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.0,1.0);vec3 c=mix(uHor,uTop,pow(h,0.45));
   float s=max(dot(d,normalize(uSun)),0.0);c+=uSunCol*(pow(s,1400.0)*8.0+pow(s,40.0)*0.30+pow(s,5.0)*0.10);
   if(uNight>0.01&&d.y>0.0){float st=hash(floor(d*520.0));float tw=0.65+0.35*sin(uTime*2.2+st*60.0);c+=vec3(1.0,0.96,0.9)*step(0.9982,st)*tw*uNight*1.6*smoothstep(0.02,0.3,d.y);}
   if(d.y<0.0)c=mix(c,uHor*0.55,clamp(-d.y*8.0,0.0,1.0));
   gl_FragColor=vec4(c,1.0);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`}));
sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);

// ---------- state
const picks=[];let ctrl,S,ED,EAST,NORTH,fly=null;
let groundMesh=null,treeMeshes=[],suiteMeshes=[],leafMeshes=[],boundaryObjs=[],fenceObjs=[],fountainObjs=[];
let bandMat=null,pinMat=null,chainMat=null,glowMats=[],nightMats=[],lampMats=[];
const AL=[];          // existing area lights (the utility's dusk-to-dawn light)
const ENT=[],fenceSwap={};let entSel='0',entGlow=[],signMats=[];   // proposed entrance gateway: the options, which one is shown
let TOD=15,NIGHT=0,DAY=1,shadowDirty=true,shF=null,lastShadow=0;
const Fn=[];           // live fountains
let FC={},selPond=null,PONDZ={};

// ---------- water (all ponds share one set of uniforms)
const WU={uTime:{value:0},uSun:{value:sunDir},uSunCol:{value:new THREE.Color()},uTop:skyU.uTop,uHor:skyU.uHor,uNight:{value:0},uDay:{value:1},
 uF:{value:Array.from({length:12},()=>new THREE.Vector4(0,0,1,0))},uFC:{value:Array.from({length:12},()=>new THREE.Color(0,0,0))},
 uS:{value:[0,1,2,3,4,5].map(()=>new THREE.Vector4(0,0,-100,0))},uAL:{value:[0,1].map(()=>new THREE.Vector4(0,0,0,0))},uALC:{value:[0,1].map(()=>new THREE.Color(0,0,0))},uFogC:{value:new THREE.Color()},uFogN:{value:500},uFogF:{value:3600}};
const WVERT='varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const WFRAG=`uniform float uTime,uNight,uDay,uFogN,uFogF;uniform vec3 uSun,uSunCol,uTop,uHor,uFogC,uBody;uniform vec4 uF[12];uniform vec3 uFC[12];uniform vec4 uS[6];uniform vec4 uAL[2];uniform vec3 uALC[2];varying vec3 vW;
 vec2 wave(vec2 p,vec2 d,float k,float w,float a){return d*(a*k*cos(dot(p,d)*k+uTime*w));}
 void main(){vec2 p=vW.xz;vec2 g=vec2(0.0);
  g+=wave(p,vec2(0.80,0.60),1.7,1.3,0.012);g+=wave(p,vec2(-0.55,0.83),2.9,1.9,0.007);g+=wave(p,vec2(0.20,-0.98),5.3,2.6,0.004);g+=wave(p,vec2(-0.93,-0.36),9.1,3.4,0.0022);
  vec3 gcol=vec3(0.0);float foam=0.0;
  for(int i=0;i<12;i++){vec4 f=uF[i];if(f.w<0.5)continue;vec2 dv=p-f.xy;float r=length(dv)+1e-4;float R=f.z;
   float env=exp(-r/(R*2.4+2.0))*smoothstep(0.0,R*0.3+0.2,r);float k=6.2832/0.85;g+=(dv/r)*(0.055*env*cos(k*r-uTime*5.5));
   foam+=smoothstep(R*1.08,R*0.6,r)*smoothstep(R*0.12,R*0.5,r);gcol+=uFC[i]*exp(-r*r/(R*R*1.8+1.0));}
  for(int i=0;i<6;i++){vec4 s=uS[i];float age=uTime-s.z;if(age<0.0||age>7.0)continue;vec2 dv=p-s.xy;float r=length(dv)+1e-4;float front=1.0*age;
   float env=s.w*exp(-age*0.7)*exp(-pow((r-front)/0.8,2.0));g+=(dv/r)*(0.14*env*cos(12.566*(r-front)));}
  vec3 n=normalize(vec3(-g.x,1.0,-g.y));vec3 v=normalize(cameraPosition-vW);
  float F=0.03+0.97*pow(1.0-max(dot(n,v),0.0),5.0);
  vec3 rd=reflect(-v,n);rd.y=abs(rd.y);
  vec3 skyc=mix(uHor,uTop,pow(clamp(rd.y,0.0,1.0),0.5));
  float sp=pow(max(dot(rd,normalize(uSun)),0.0),300.0);
  vec3 body=uBody*(0.22+0.9*uDay)+vec3(0.0,0.003,0.008);
  vec3 col=mix(body,skyc,F)+uSunCol*sp*3.0;
  for(int i=0;i<2;i++){vec4 al=uAL[i];if(al.w<0.001)continue;vec3 Lv=al.xyz-vW;float dl=length(Lv);Lv/=dl;col+=uALC[i]*(pow(max(dot(rd,Lv),0.0),110.0)*al.w*12.0/(1.0+dl*dl*0.0015));}
  float nz=fract(sin(dot(floor(p*9.0)+floor(uTime*9.0),vec2(12.9898,78.233)))*43758.5453);
  foam=clamp(foam,0.0,1.0);
  col=mix(col,vec3(0.86,0.9,0.92)*(0.2+0.8*uDay),foam*0.30*(0.55+0.45*nz));
  col+=gcol*uNight*(0.5+0.6*nz*foam);
  float a=mix(0.82,0.985,F);
  col=mix(col,uFogC,smoothstep(uFogN,uFogF,length(cameraPosition-vW)));
  gl_FragColor=vec4(col,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
function waterMat(body){return new THREE.ShaderMaterial({uniforms:Object.assign({},WU,{uBody:{value:new THREE.Color(body[0],body[1],body[2])}}),vertexShader:WVERT,fragmentShader:WFRAG,transparent:true,depthWrite:false,side:THREE.DoubleSide})}

fetch('scene.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(init).catch(e=>{$('load').textContent=tr('loaderr',{e:e.message})});

function init(data){S=data;if(/^#?suites(-night)?$/i.test(location.hash||''))delete S.guests;ED=S.edit;EAST=new THREE.Vector2(ED.frame.east[0],ED.frame.east[1]);NORTH=new THREE.Vector2(ED.frame.north[0],ED.frame.north[1]);
 buildStatic();buildGround();buildBoundary();buildTrees();buildPonds();buildFences();buildLights();buildEntrance();buildAsphalt();buildRoute();
 ctrl=new Orbit(cam,canvas,pick);
 const sv=store.get(KEY)||{};
 if(S.fountains){for(const P of S.fountains.ponds){const d=P.plan,o=(!VIS&&((sv.fr||{})[P.name]||1)===(P.rev||1))?((sv.f||{})[P.name]||{}):{};   // a pond whose plan changed since the choice was saved starts from the new plan
  FC[P.name]={count:o.count!==undefined?o.count:d.count,hp:o.hp||d.hp,pattern:o.pattern||d.pattern,light:o.light||d.light};fixChoice(P.name)}selPond=sv.pond&&FC[sv.pond]?sv.pond:'Pond 3';buildFountains()}
 if(S.entrance)entSel=(sv.ent!==undefined&&(sv.er||1)===(S.entrance.rev||1)&&(sv.ent==='0'||S.entrance.options.some(o=>o.id===sv.ent)))?sv.ent:S.entrance.default;
 buildFish();buildTubs();buildGuests();buildEntFountains();buildWalk();buildDeckLed();buildCabLite();buildSpots('lnglite');buildSpots('hselite');buildConstellations();sndUI();if(!VIS&&!FUT){const tp=store.get('abf3d.trace');if(Array.isArray(tp))TR.pts=tp.filter(p=>Array.isArray(p)&&p.length===2&&isFinite(p[0])&&isFinite(p[1]));traceDraw()}
 wireUI();buildUI();setTime(hashNight()?22:typeof sv.tod==='number'&&!VIS?sv.tod:15);if(S.entrance)setEntrance(entSel);if(VIS)visitorMode();if(FUT)document.body.classList.add('fut-mode');if(SCOUT&&typeof scInit==='function')scInit();
 resize();const hv0=hashView(),v0=fitView((VIS&&ED.views.find(v=>v.name==='Driveway From The Road'))||hv0||ED.views[0]);ctrl.set(v0.p,v0.t);if(hv0&&hv0.orbit)startOrbit(hv0);walkHash();
 window.addEventListener('hashchange',()=>{const h=(location.hash||'').slice(1);if(h===lastHash)return;lastHash=h;if(hashNight())setTime(22);const v=hashView();if(v)flyTo(v);else walkHash()});
 $('load').hidden=true;window.__ready=true;loop();
 try{sndToggle()}catch(e){}   // V-12: sound on from the start; if the browser holds it back, a small note asks for one tap
 setTimeout(sndHint,1500);
}

// ---------- buildings and everything else from the model, merged by colour so the page stays quick
const NAMES=[],propMeshes=[];let feedPt=null;
function buildStatic(){const groups=new Map();
 for(const m of S.meshes){const suite=!/^(Existing|Proposed)/.test(m.name),prop=/^Proposed/.test(m.name),leaf=/live oak \(owner\) - canopy/.test(m.name),win=m.type==='IfcWindow',door=/Entrance double door/.test(m.name),cab=/[Cc]able infill/.test(m.name),canvas_=suite&&/canvas/i.test(m.name),lamp=/^Existing area light.* - lens$/.test(m.name);
  const kind=lamp?'lamp':leaf?'leaf':win?'win':door?'door':cab?'cab':canvas_?'canvas':'std',key=(suite?'S':prop?'P':'E')+kind+m.color;
  if(/koi food dispenser/.test(m.name)&&!feedPt){let sx=0,sy=0;for(let i=0;i<m.v.length;i+=3){sx+=m.v[i];sy+=m.v[i+1]}feedPt=[sx/(m.v.length/3),sy/(m.v.length/3)]}
  if(/Hot tub - water surface/.test(m.name)){let sx=0,sy=0,zt=-1e9;const nn=m.v.length/3;for(let i=0;i<m.v.length;i+=3){sx+=m.v[i];sy+=m.v[i+1];zt=Math.max(zt,m.v[i+2])}const cx=sx/nn,cy=sy/nn;let r=0;for(let i=0;i<m.v.length;i+=3)r=Math.max(r,Math.hypot(m.v[i]-cx,m.v[i+1]-cy));TUBS.push({x:cx,y:zt,z:cy,r,u:(/^Unit (\w)/.exec(m.name)||[0,'A'])[1]})}
  if(/Hot tub - 7 ft round spa shell/.test(m.name)){let sx=0,sy=0,zt=-1e9;const nn=m.v.length/3;for(let i=0;i<m.v.length;i+=3){sx+=m.v[i];sy+=m.v[i+1];zt=Math.max(zt,m.v[i+2])}SHELLS.push({x:sx/nn,z:sy/nn,y:zt})}
  let g=groups.get(key);if(!g){g={suite,prop,kind,color:m.color,parts:[],nv:0,nf:0};groups.set(key,g)}g.parts.push(m);g.nv+=m.v.length;g.nf+=m.f.length}
 for(const g of groups.values()){const pos=new Float32Array(g.nv),idx=new Uint32Array(g.nf),rng=[];let vo=0,fo=0;
  for(const m of g.parts){const b=vo/3,v=m.v;for(let i=0;i<v.length;i+=3){pos[vo+i]=v[i];pos[vo+i+1]=v[i+2];pos[vo+i+2]=v[i+1]}
   const f=m.f;for(let i=0;i<f.length;i++)idx[fo+i]=f[i]+b;rng.push(fo/3,NAMES.length);NAMES.push(m.name);vo+=v.length;fo+=f.length}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeVertexNormals();
  const k=g.kind,tr=k==='leaf'||k==='win'||k==='door'||k==='cab';
  const mat=new THREE.MeshStandardMaterial({color:g.color,roughness:k==='win'?0.2:0.86,metalness:0.04,side:THREE.DoubleSide,transparent:tr,depthWrite:k!=='leaf',opacity:k==='leaf'?0.5:k==='win'?0.4:k==='door'?0.45:k==='cab'?0.25:1});
  if(k==='canvas'||k==='win'){mat.emissive=new THREE.Color(k==='canvas'?0xffb060:0xffd9a0);mat.emissiveIntensity=0;mat.userData.glow=k==='canvas'?0.4:1.3;nightMats.push(mat)}
  if(k==='lamp'){mat.emissive=new THREE.Color(0xfff0d8);mat.emissiveIntensity=0;lampMats.push(mat)}
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=k!=='cab'&&k!=='win';mesh.receiveShadow=k!=='leaf';mesh.userData={rng};
  scene.add(mesh);picks.push(mesh);if(k==='leaf')leafMeshes.push(mesh);if(g.suite)suiteMeshes.push(mesh);if(g.prop)propMeshes.push(mesh)}
 S.meshes=null}
function nameAt(mesh,face){const r=mesh.userData.rng;let lo=0,hi=r.length/2-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(r[mid*2]<=face)lo=mid;else hi=mid-1}return NAMES[r[lo*2+1]]}

// ---------- ground from the lidar grid, draped with the aerial photo. Every drawn cell has survey data behind it.
let GP=null,GNX=0,GNY=0,GX0=0,GY0=0,GDX=1;
function groundAt(x,z){const fx=(x-GX0)/GDX,fy=(z-GY0)/GDX;if(!(fx>=0&&fy>=0&&fx<GNX-1&&fy<GNY-1))return 1e9;const i=fx|0,j=fy|0,a=fx-i,b=fy-j,k=(j*GNX+i)*3+1,r=GNX*3;return GP[k]*(1-a)*(1-b)+GP[k+3]*a*(1-b)+GP[k+r]*(1-a)*b+GP[k+r+3]*a*b}
function buildGround(){const Gd=S.ground,nx=Gd.nx,ny=Gd.ny,NN=nx*ny,gp=new Float32Array(NN*3),gu=new Float32Array(NN*2),A=Gd.uvA;GP=gp;GNX=nx;GNY=ny;GX0=Gd.x0;GY0=Gd.y0;GDX=Gd.dx;
 const unrle=r=>{const m=new Uint8Array(NN);let k=0,v=0;for(const n of r){if(v)m.fill(1,k,k+n);k+=n;v^=1}return m};
 const drawM=unrle(Gd.draw),photoM=unrle(Gd.photo);
 for(let j=0;j<ny;j++){const row=Gd.zq[j];let acc=0;const y=Gd.y0+j*Gd.dx;for(let i=0;i<nx;i++){acc+=row[i];const k=j*nx+i,x=Gd.x0+i*Gd.dx;gp[k*3]=x;gp[k*3+1]=acc/100;gp[k*3+2]=y;gu[k*2]=A[0]+A[1]*x+A[2]*y;gu[k*2+1]=A[3]+A[4]*x+A[5]*y}}
 const idx=new Uint32Array((nx-1)*(ny-1)*6),plainQ=[];let nt=0;
 for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b2=a+1,c=a+nx,d=c+1;if(!(drawM[a]&&drawM[b2]&&drawM[c]&&drawM[d]))continue;
  if(photoM[a]&&photoM[b2]&&photoM[c]&&photoM[d]){idx[nt++]=a;idx[nt++]=c;idx[nt++]=b2;idx[nt++]=b2;idx[nt++]=c;idx[nt++]=d}else plainQ.push(a,c,b2,b2,c,d)}
 idx.set(plainQ,nt);
 const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(gp,3));gg.setAttribute('uv',new THREE.BufferAttribute(gu,2));gg.setIndex(new THREE.BufferAttribute(idx.subarray(0,nt+plainQ.length),1));gg.addGroup(0,nt,0);gg.addGroup(nt,plainQ.length,1);
 const plain=new THREE.MeshStandardMaterial({color:0x9a8f6c,roughness:1,side:THREE.DoubleSide});let gmat=plain;
 if(Gd.tex){const tex=new THREE.TextureLoader().load(Gd.tex,()=>{window.__texReady=true},undefined,()=>{window.__texReady=true});tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;gmat=new THREE.MeshStandardMaterial({map:tex,roughness:1,side:THREE.DoubleSide})}else window.__texReady=true;
 gg.computeVertexNormals();groundMesh=new THREE.Mesh(gg,[gmat,plain]);groundMesh.receiveShadow=true;groundMesh.userData={tip:'Ground, from the 2019 lidar survey with the aerial photo laid over it'};scene.add(groundMesh);picks.push(groundMesh)}

// ---------- property line: a yellow band laid on the ground (it widens as you pull back so it stays visible) and a pin at every corner
function buildBoundary(){if(!S.boundary)return;const B=S.boundary.pts,n=B.length,pos=new Float32Array(n*6),ix=[];for(let i=0;i<n-1;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}
 const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(pos,3));bg.setIndex(ix);
 bandMat=new THREE.MeshBasicMaterial({color:0xf2c230,side:THREE.DoubleSide});const band=new THREE.Mesh(bg,bandMat);band.frustumCulled=false;scene.add(band);
 const pg=new THREE.CylinderGeometry(0.14,0.14,2.2,8);pg.translate(0,1.1,0);pinMat=new THREE.MeshBasicMaterial({color:0xf2c230});const pins=new THREE.InstancedMesh(pg,pinMat,S.boundary.corners.length),m4=new THREE.Matrix4();
 S.boundary.corners.forEach((c,i)=>{m4.makeTranslation(c[0],c[2],c[1]);pins.setMatrixAt(i,m4)});pins.instanceMatrix.needsUpdate=true;pins.frustumCulled=false;scene.add(pins);
 let w0=-1;setBand=r=>{const w=Math.min(3.2,Math.max(0.28,r*0.0021));if(Math.abs(w-w0)<w0*0.12)return;w0=w;const lift=0.25+w*0.12;
  for(let i=0;i<n;i++){const p=B[i],q=B[Math.min(i+1,n-1)],r0=B[Math.max(i-1,0)];let dx=q[0]-r0[0],dy=q[1]-r0[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
   pos[i*6]=p[0]-dy*w;pos[i*6+1]=p[2]+lift;pos[i*6+2]=p[1]+dx*w;pos[i*6+3]=p[0]+dy*w;pos[i*6+4]=p[2]+lift;pos[i*6+5]=p[1]-dx*w}
  bg.attributes.position.needsUpdate=true};boundaryObjs=[band,pins]}

// ---------- trees found in the lidar
function buildTrees(){if(!S.trees||!S.trees.length)return;const n=S.trees.length,tg=new THREE.CylinderGeometry(0.18,0.28,1,7);tg.translate(0,0.5,0);
 const cg=new THREE.IcosahedronGeometry(1,MOBILE?1:2),P=cg.attributes.position,Nn=cg.attributes.normal,cc=new Float32Array(P.count*3),v=new THREE.Vector3();
 for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).normalize();const d=1+0.16*Math.sin(3.1*v.x+1.7*v.y+0.4)*Math.cos(2.7*v.z+0.9*v.x)+0.09*Math.sin(6.3*v.y+3.1*v.z)*Math.cos(5.2*v.x)+0.05*Math.sin(11*v.x+7*v.z);
  const yy=v.y<-0.25?-0.25+(v.y+0.25)*0.45:v.y;P.setXYZ(i,v.x*d,yy*d+1,v.z*d);Nn.setXYZ(i,v.x,v.y*0.8+0.2,v.z);const sh=0.5+0.5*Math.min(1,Math.max(0,(v.y+0.9)/1.5));cc[i*3]=sh;cc[i*3+1]=sh;cc[i*3+2]=sh}
 cg.setAttribute('color',new THREE.BufferAttribute(cc,3));
 const trunk=new THREE.InstancedMesh(tg,new THREE.MeshStandardMaterial({color:0x4a3a2c,roughness:1}),n),crown=new THREE.InstancedMesh(cg,new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.95,vertexColors:true}),n);
 const mx=new THREE.Matrix4(),q=new THREE.Quaternion(),q0=new THREE.Quaternion(),p=new THREE.Vector3(),sc=new THREE.Vector3(),col=new THREE.Color(),eu=new THREE.Euler();
 S.trees.forEach((t,i)=>{const x=t[0],y=t[1],zg=t[2],h=t[3],cr=t[4],tall=h>18;p.set(x,zg,y);sc.set(0.04*h+0.2,0.45*h,0.04*h+0.2);mx.compose(p,q0,sc);trunk.setMatrixAt(i,mx);
  eu.set(0.12*Math.sin(i*3.3),i*2.399,0.12*Math.cos(i*1.9));q.setFromEuler(eu);p.set(x,zg+0.38*h,y);sc.set(tall?cr*0.7:cr,0.31*h,tall?cr*0.7:cr);mx.compose(p,q,sc);crown.setMatrixAt(i,mx);
  col.setHSL(0.265+0.04*Math.sin(i*1.7),0.52+0.1*Math.cos(i*2.3),0.125+0.04*Math.sin(i*0.7));crown.setColorAt(i,col)});
 trunk.instanceMatrix.needsUpdate=true;crown.instanceMatrix.needsUpdate=true;if(crown.instanceColor)crown.instanceColor.needsUpdate=true;trunk.castShadow=crown.castShadow=true;crown.receiveShadow=true;scene.add(trunk);scene.add(crown);treeMeshes=[trunk,crown]}

// ---------- ponds
function buildPonds(){for(const P of S.ponds){const sh=new THREE.Shape((P.xy_show||P.xy).map(p=>new THREE.Vector2(p[0],p[1])));for(const h of (P.holes||[]))sh.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],p[1]))));
  const pg=new THREE.ShapeGeometry(sh);pg.rotateX(Math.PI/2);const mesh=new THREE.Mesh(pg,waterMat(P.unfinished?[0.11,0.12,0.075]:[0.035,0.105,0.11]));mesh.renderOrder=2;
  mesh.position.y=P.z;mesh.userData={water:true,tipf:()=>P.unfinished?tr('tWaterU'):tr('tWater',{p:pondName(P.name)})};picks.push(mesh);scene.add(mesh);PONDZ[P.name]=P.z}}

// ---------- fences and gates (existing): posts and rails as boxes, barbed wire as lines, chain link as see-through mesh panels
function buildFences(){if(!S.fences||!S.fences.runs)return;const F=S.fences,all=F.runs.concat(F.gates||[]);
 const COL={tpost:0x3f4a3c,wood:0x76583c,galv:0x9ea5a8,board:0x8b6b4a,tube:0x8d9498},bars=[];let nw=0,npn=0;const tipf=()=>tr('tFence');
 const TR=(S.entrance&&S.entrance.fence_trim)||{},barHide=[];
 for(const r of all){const tr=r.wp&&TR[r.id];for(const b of r.bars){bars.push(b);barHide.push(!!tr&&tr.some(i=>Math.hypot((b[0]+b[3])/2-r.wp[i*3],(b[1]+b[4])/2-r.wp[i*3+1])<0.4))}if(r.wp)nw+=(r.wp.length/3-1)*r.st.length;npn+=r.panels.length}
 if(bars.length){const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:0.8,metalness:0.15}),bars.length);
  const X=new THREE.Vector3(),Y=new THREE.Vector3(),Z=new THREE.Vector3(),M=new THREE.Matrix4(),UP=new THREE.Vector3(0,1,0),c=new THREE.Color();
  bars.forEach((b,i)=>{Y.set(b[3]-b[0],b[5]-b[2],b[4]-b[1]);const L=Y.length();Y.divideScalar(L||1);X.crossVectors(Y,UP);if(X.lengthSq()<1e-8)X.set(1,0,0);X.normalize();Z.crossVectors(X,Y);
   M.makeBasis(X.clone().multiplyScalar(b[6]),Y.clone().multiplyScalar(L),Z.clone().multiplyScalar(b[7]));M.setPosition((b[0]+b[3])/2,(b[2]+b[5])/2,(b[1]+b[4])/2);im.setMatrixAt(i,M);im.setColorAt(i,c.setHex(COL[b[8]]||0x888888))});
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;fenceSwap.full=im.instanceMatrix.array.slice();fenceSwap.trim=fenceSwap.full.slice();barHide.forEach((h,i)=>{if(h)fenceSwap.trim.fill(0,i*16,i*16+15)});fenceSwap.im=im;im.userData={tipf};im.frustumCulled=false;im.castShadow=true;scene.add(im);fenceObjs.push(im);picks.push(im)}
 if(nw>0){const p=new Float32Array(nw*6),p2=new Float32Array(nw*6);let k=0,k2=0;for(const r of all){if(!r.wp)continue;const n=r.wp.length/3,tr=TR[r.id];
   for(let i=0;i<n-1;i++){if(r.sk[i])continue;const hide=!!tr&&(tr.includes(i)||tr.includes(i+1));for(const h of r.st){const q=[r.wp[i*3],r.wp[i*3+2]+h,r.wp[i*3+1],r.wp[i*3+3],r.wp[i*3+5]+h,r.wp[i*3+4]];p.set(q,k);k+=6;if(!hide){p2.set(q,k2);k2+=6}}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p.subarray(0,k),3));fenceSwap.gFull=g;fenceSwap.gTrim=new THREE.BufferGeometry();fenceSwap.gTrim.setAttribute('position',new THREE.BufferAttribute(p2.subarray(0,k2),3));const ln=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x3a3d3f,transparent:true,opacity:0.85}));ln.frustumCulled=false;scene.add(ln);fenceObjs.push(ln);fenceSwap.ln=ln}
 if(npn>0){const p=new Float32Array(npn*12),uv=new Float32Array(npn*8),ix=new Uint32Array(npn*6);let k=0;
  for(const r of all)for(const q of r.panels){const o=k*4,L=Math.hypot(q[6]-q[0],q[7]-q[1]),h=q[5]-q[2],u=L/0.33,v=h/0.33;
   [[0,1,2,0,0],[3,4,5,0,v],[6,7,8,u,0],[9,10,11,u,v]].forEach((a,j)=>{p[(o+j)*3]=q[a[0]];p[(o+j)*3+1]=q[a[2]];p[(o+j)*3+2]=q[a[1]];uv[(o+j)*2]=a[3];uv[(o+j)*2+1]=a[4]});ix.set([o,o+1,o+2,o+2,o+1,o+3],k*6);k++}
  const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.clearRect(0,0,64,64);x.strokeStyle='rgba(205,212,216,1)';x.lineWidth=5;x.lineCap='square';
  for(const d of [-64,0,64]){x.beginPath();x.moveTo(d,0);x.lineTo(d+64,64);x.stroke();x.beginPath();x.moveTo(d+64,0);x.lineTo(d,64);x.stroke()}
  const tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.anisotropy=4;tx.colorSpace=THREE.SRGBColorSpace;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(new THREE.BufferAttribute(ix,1));
  chainMat=new THREE.MeshBasicMaterial({map:tx,transparent:true,side:THREE.DoubleSide,depthWrite:false});const pm=new THREE.Mesh(g,chainMat);pm.frustumCulled=false;pm.renderOrder=3;pm.userData={tipf};scene.add(pm);fenceObjs.push(pm);picks.push(pm)}}

// ---------- existing area light on the power pole by Pond 1: a real light on the ground and trees, a glow at the lamp, a glint on the water. On from dusk.
function buildLights(){(S.lights||[]).slice(0,2).forEach((L,i)=>{const c=new THREE.Color(L.color||'#fff0d8');
  const sl=new THREE.SpotLight(c,0,75,1.2,0.6,1.7);sl.position.set(L.x,L.z,L.y);sl.target.position.set(L.x,L.zg,L.y);sl.visible=false;scene.add(sl);scene.add(sl.target);
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlow(),color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));gl.position.set(L.x,L.z,L.y);gl.scale.set(3.4,3.4,1);gl.renderOrder=6;scene.add(gl);
  WU.uAL.value[i].set(L.x,L.z,L.y,0);WU.uALC.value[i].copy(c);AL.push({L,sl,gl})})}
function lampsAt(){const on=sm(0.03,0.16,NIGHT);AL.forEach((a,i)=>{a.sl.intensity=on*60;a.sl.visible=on>0.002;a.gl.material.opacity=on*0.95;WU.uAL.value[i].w=on});for(const m of lampMats)m.emissiveIntensity=on*3.2;for(const m of entGlow)m.emissiveIntensity=on*2.6;for(const m of signMats)m.emissiveIntensity=on*0.5;for(const e of ENT)e.glows.forEach(g=>g.material.opacity=on*0.85)}

// ---------- proposed entrance gateway: three options to choose from. Stone by stone and log by log from the model; the lettering is drawn here.
const DISPF='"Cinzel","Trajan Pro","Palatino Linotype",Georgia,"Times New Roman",serif';
function drawSign(m){const sg=m.userData.sg,tex=m.userData.tex,W=Math.round((MOBILE?0.5:1)*sg.px),H=Math.max(48,Math.round(W*sg.h/sg.w)),cv=tex.image;cv.width=W;cv.height=H;const x=cv.getContext('2d');x.clearRect(0,0,W,H);
 if(sg.bg){x.fillStyle=sg.bg;x.fillRect(0,0,W,H)}x.lineJoin='round';
 for(const p of sg.polys){x.fillStyle=p.col;x.strokeStyle=p.col;x.lineWidth=Math.max(1,H*0.005);x.beginPath();p.pts.forEach((q,i)=>i?x.lineTo(q[0]*W,q[1]*H):x.moveTo(q[0]*W,q[1]*H));x.closePath();x.fill();x.stroke()}
 for(const L of sg.lines){let cap=L.s*H,px=cap/0.7;x.textAlign='center';x.textBaseline='alphabetic';const chars=[...L.t];let ws,tot;
  for(let pass=0;pass<2;pass++){x.font='700 '+px.toFixed(1)+'px '+DISPF;ws=chars.map(ch=>x.measureText(ch).width);tot=ws.reduce((a,b)=>a+b,0)+px*0.07*(chars.length-1);const fit=W*(L.fit||0.955)/tot;if(fit<1&&!pass){px*=fit;cap*=fit}else break}
  let cx=W/2-tot/2;chars.forEach((ch,i)=>{const w=ws[i],xc=cx+w/2;let yb,rot=0;
   if(L.curve){const u=xc/W-0.5;yb=H*(L.curve[0]+L.curve[1]*u*u);rot=Math.atan(H*L.curve[1]*2*u/W)}else yb=H*L.y+cap/2;
   x.save();x.translate(xc,yb);x.rotate(rot);
   if(!L.plain){x.fillStyle='rgba(16,8,3,0.85)';x.fillText(ch,px*0.035,px*0.05);x.fillStyle='rgba(255,246,220,0.28)';x.fillText(ch,-px*0.018,-px*0.022)}
   x.fillStyle=L.col;x.fillText(ch,0,0);x.restore();cx+=w+px*0.07})}
 tex.needsUpdate=true}
function buildEntrance(){const E=S.entrance;if(!E)return;const tipf=()=>tr('tEnt');
 for(const o of E.options){const objs=[];
  const mk=(sol,glow)=>{let nv=0,nf=0;for(const q of sol){nv+=q[2].length;nf+=q[3].length}if(!nv)return;
   const pos=new Float32Array(nv),col=new Float32Array(nv),idx=new Uint32Array(nf),rng=[],c=new THREE.Color();let vo=0,fo=0;
   for(const q of sol){const b=vo/3,v=q[2];c.set(q[1]);for(let i=0;i<v.length;i+=3){pos[vo+i]=v[i];pos[vo+i+1]=v[i+1];pos[vo+i+2]=v[i+2];col[vo+i]=c.r;col[vo+i+1]=c.g;col[vo+i+2]=c.b}
    const f=q[3];for(let i=0;i<f.length;i++)idx[fo+i]=f[i]+b;rng.push(fo/3,NAMES.length);NAMES.push(o.names[q[0]]);vo+=v.length;fo+=f.length}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(new THREE.BufferAttribute(idx,1));
   const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.93,metalness:0.02,flatShading:true,side:THREE.DoubleSide});
   if(glow){mat.emissive=new THREE.Color(0xffb650);mat.emissiveIntensity=0;entGlow.push(mat)}
   const mesh=new THREE.Mesh(g,mat);mesh.castShadow=!glow;mesh.receiveShadow=!glow;mesh.userData={rng};mesh.visible=false;scene.add(mesh);picks.push(mesh);objs.push(mesh)};
  mk(o.solids.filter(q=>!q[4]),false);mk(o.solids.filter(q=>q[4]),true);o.solids=null;
  for(const sg of o.signs){const tex=new THREE.CanvasTexture(document.createElement('canvas'));tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
   const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:0.28,roughness:0.85,metalness:sg.kind==='steel'?0.25:0,side:THREE.FrontSide});
   if(sg.lit){mat.emissive=new THREE.Color(0xffffff);mat.emissiveMap=tex;mat.emissiveIntensity=0;signMats.push(mat)}
   const m=new THREE.Mesh(new THREE.PlaneGeometry(sg.w,sg.h),mat),R=new THREE.Vector3(sg.r[0],sg.r[1],sg.r[2]),U=new THREE.Vector3(0,1,0),N=new THREE.Vector3().crossVectors(R,U);
   m.matrixAutoUpdate=false;m.matrix.makeBasis(R,U,N).setPosition(sg.c[0],sg.c[1],sg.c[2]);m.renderOrder=4;m.userData={sg,tex,tipf};m.visible=false;scene.add(m);picks.push(m);objs.push(m);drawSign(m)}
  const glows=o.lamps.map(p=>{const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlow(),color:0xffb650,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));gl.position.set(p[0],p[1],p[2]);gl.scale.set(2.6,2.6,1);gl.renderOrder=6;gl.visible=false;scene.add(gl);objs.push(gl);return gl});
  ENT.push({o,objs,glows})}
 if(document.fonts&&document.fonts.load)document.fonts.load('700 48px "Cinzel"').then(()=>{for(const e of ENT)for(const m of e.objs)if(m.userData.sg)drawSign(m)},()=>{})}
function setEntrance(id){entSel=id;for(const e of ENT){const on=e.o.id===id;e.objs.forEach(m=>m.visible=on)}
 const t=id!=='0';if(fenceSwap.im){fenceSwap.im.instanceMatrix.array.set(t?fenceSwap.trim:fenceSwap.full);fenceSwap.im.instanceMatrix.needsUpdate=true}if(fenceSwap.ln)fenceSwap.ln.geometry=t?fenceSwap.gTrim:fenceSwap.gFull;   // the first stretch of the two driveway fences gives way to the gateway
lampsAt();efShow();shadowDirty=true;if($('entopt'))entUI()}
function entUI(){const E=S.entrance,el=$('entopt');el.textContent='';
 E.options.forEach(o=>chip(el,o.id+' · '+tr('o'+o.id)+(E.chosen===o.id?' ✓':''),entSel===o.id,()=>{setEntrance(o.id);save()}));chip(el,tr('none'),entSel==='0',()=>{setEntrance('0');save()});
 chip(el,tr('go'),false,()=>{const v=ED.views.find(q=>q.name==='Entrance Gateway');if(v)flyTo(v)});
 const o=E.options.find(q=>q.id===entSel);if(!o){$('entinfo').textContent=tr('entNone');return}const n=o.nums,F=[];
 F.push(tr('e1',{w:n.w})+(n.e?tr('e1b',{e:n.e}):''));F.push(n.kind==='pylon'?tr('e2b',{h:n.h,s:n.s}):tr('e2',{h:n.h,s:n.s}));F.push(tr('e3',{o:n.o,l:n.l}));F.push(n.kind==='pylon'?tr('e4b',{f:n.f,s:n.sf}):tr('e4',{d:n.d,e:n.dp}));F.push(tr('c'+o.id));
 $('entinfo').innerHTML='<strong>'+tr('opt',{n:o.id})+' — '+tr('o'+o.id)+(E.chosen===o.id?' ('+tr('chosen')+')':E.chosen?' ('+tr('notchosen')+')':'')+'.</strong> '+tr('b'+o.id)+'<br>'+F.map(f=>'• '+f).join('<br>')+'<br><span class="note">'+tr('entNote',{n:E.chosen||''})+'</span>'}

// ---------- fountains: droplets fly on true arcs sized to the maker's published pattern height and width
const G_=9.81;
const PAT={   // each row: share of the droplets, height range (x pattern height), reach range (x half the pattern width), number of separate jets (0 = a full ring)
 V:[[1,0.80,1.0,0.70,1.0,0]],
 Willow:[[1,0.78,1.0,0.72,1.0,0]],
 Cypress:[[0.72,0.9,1.0,0.9,1.0,14],[0.28,0.45,0.6,0.25,0.45,0]],
 Linden:[[0.55,0.48,0.6,0.85,1.0,0],[0.45,0.9,1.0,0.22,0.42,0]],
 Birch:[[1,0.7,1.0,0.25,1.0,0]],
 Sequoia:[[0.6,0.88,1.0,0.15,0.5,0],[0.4,0.4,0.5,0.75,1.0,10]],
 Balsam:[[0.34,0.93,1.0,0.1,0.22,0],[0.33,0.6,0.7,0.5,0.62,0],[0.33,0.3,0.4,0.9,1.0,0]],
 Spruce:[[0.7,0.88,1.0,0.12,0.55,0],[0.3,0.42,0.55,0.75,1.0,8]],
 Redwood:[[1,0.8,1.0,0.08,1.0,0]]};
const LIGHTS={off:{n:'Off',c:null},warm:{n:'Warm White',c:0xffc27a},cool:{n:'Cool White',c:0xd6e6ff},blue:{n:'Blue',c:0x2f7bff},green:{n:'Green',c:0x34e07c},amber:{n:'Amber',c:0xff9326},red:{n:'Red',c:0xff3a30},change:{n:'Color Change',c:0xffffff}};
const FVERT=`attribute vec3 aV;attribute vec3 aQ;uniform float uTime,uPx;uniform vec3 uO;varying float vA;
 void main(){float T=aV.z;float t=fract(uTime/T+aQ.y)*T;float rho=aV.x*t;float y=aV.y*t-4.905*t*t;vec3 p=uO+vec3(cos(aQ.x)*rho,y,sin(aQ.x)*rho);
  vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uPx*aQ.z/max(0.5,-mv.z),1.0,26.0);vA=1.0-0.5*(t/T);}`;
const FFRAG=`uniform vec3 uCol;uniform float uAlpha;varying float vA;
 void main(){vec2 c=gl_PointCoord-0.5;float d=dot(c,c);if(d>0.25)discard;float a=smoothstep(0.25,0.03,d)*vA*uAlpha;gl_FragColor=vec4(uCol,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
let glowTex=null;
function getGlow(){if(glowTex)return glowTex;const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.35,'rgba(255,255,255,0.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);glowTex=new THREE.CanvasTexture(cv);return glowTex}
function spec(pond){const c=FC[pond],cat=S.fountains.catalog[c.hp];return Object.assign({hp:cat.label,volts:cat.volts,amps:cat.amps,depth:cat.min_depth_in},cat.patterns[c.pattern])}
function fixChoice(pond){const c=FC[pond],cat=S.fountains.catalog;if(!cat[c.hp])c.hp='1';if(!cat[c.hp].patterns[c.pattern])c.pattern=Object.keys(cat[c.hp].patterns)[0];if(!LIGHTS[c.light])c.light='warm';const P_=S.fountains.ponds.find(p=>p.name===pond);if(!(c.count>=0&&(c.count===0||(P_&&P_.slots[String(c.count)]))))c.count=P_?P_.plan.count:1}
function makeFountain(pond,slot,sp,light){const H=sp.h*FT,W=sp.w*FT,rows=PAT[sp.pat]||PAT.V,N=Math.round((MOBILE?700:1700)*Math.min(1.6,Math.max(0.7,(sp.h+sp.w)/30)));
 const aV=new Float32Array(N*3),aQ=new Float32Array(N*3),pos=new Float32Array(N*3);let rnd=(()=>{let s=1234567+Math.floor(slot[0]*13+slot[1]*7);return()=>{s=(s*16807)%2147483647;return s/2147483647}})();
 for(let i=0;i<N;i++){let u=rnd(),row=rows[rows.length-1];for(const r of rows){if(u<r[0]){row=r;break}u-=r[0]}
  const h=H*mix(row[1],row[2],rnd()),R=Math.max(0.05,(W/2)*mix(row[3],row[4],Math.sqrt(rnd()))),al=Math.atan(R/(4*h)),v=Math.sqrt(2*G_*h)/Math.cos(al),T=2*v*Math.cos(al)/G_;
  aV[i*3]=v*Math.sin(al);aV[i*3+1]=v*Math.cos(al);aV[i*3+2]=T;
  aQ[i*3]=row[5]?((Math.floor(rnd()*row[5])+0.5)/row[5])*6.2832+(rnd()-0.5)*0.05:rnd()*6.2832;aQ[i*3+1]=rnd();aQ[i*3+2]=0.7+0.8*rnd()}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aV',new THREE.BufferAttribute(aV,3));geo.setAttribute('aQ',new THREE.BufferAttribute(aQ,3));
 const O=new THREE.Vector3(slot[0],PONDZ[pond]+0.18,slot[1]);
 const mat=new THREE.ShaderMaterial({uniforms:{uTime:WU.uTime,uPx:{value:300},uO:{value:O},uCol:{value:new THREE.Color(1,1,1)},uAlpha:{value:0.5}},vertexShader:FVERT,fragmentShader:FFRAG,transparent:true,depthWrite:false});
 const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;pts.renderOrder=5;scene.add(pts);
 const fl=new THREE.Mesh(new THREE.CylinderGeometry(0.48,0.55,0.16,18),new THREE.MeshStandardMaterial({color:0x2c3136,roughness:0.6}));fl.position.set(O.x,PONDZ[pond]+0.05,O.z);fl.userData={tipf:()=>tr('tFountain',{p:pondName(pond),hp:sp.hp,pat:sp.pat,h:sp.h,w:sp.w})};scene.add(fl);picks.push(fl);
 const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlow(),color:0xffffff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));gl.position.set(O.x,O.y+H*0.42,O.z);gl.scale.set(Math.max(W*1.25,H*0.9),H*1.5+1,1);gl.renderOrder=6;scene.add(gl);
 let pl=null;if(!MOBILE&&Fn.length<6){pl=new THREE.PointLight(0xffffff,0,Math.max(30,W*2.2),1.6);pl.position.set(O.x,O.y+Math.min(H*0.5,2.5),O.z);scene.add(pl)}
 return {pond,O,H,W,light,pts,mat,fl,gl,pl,col:new THREE.Color()}}
function buildFountains(){for(const f of Fn){scene.remove(f.pts);scene.remove(f.fl);scene.remove(f.gl);if(f.pl)scene.remove(f.pl);f.pts.geometry.dispose();f.mat.dispose();const i=picks.indexOf(f.fl);if(i>=0)picks.splice(i,1)}Fn.length=0;
 if(!S.fountains||(VIS&&!VISF))return;   // #parking shows only what exists today; #fishing keeps the pond fountains
 for(const P of S.fountains.ponds){const c=FC[P.name];if(!c||!c.count||PONDZ[P.name]===undefined)continue;const sp=spec(P.name);sp.pat=c.pattern;
  for(const s of P.slots[String(c.count)]||[]){if(Fn.length>=12)break;Fn.push(makeFountain(P.name,s,sp,c.light))}}
 fountainObjs=[];for(const f of Fn){fountainObjs.push(f.pts,f.fl,f.gl)}
 const on=!$('tgFountains')||$('tgFountains').classList.contains('on');fountainObjs.forEach(o=>o.visible=on);
 for(let i=0;i<12;i++){const f=Fn[i];if(f&&on)WU.uF.value[i].set(f.O.x,f.O.z,f.W/2,1);else WU.uF.value[i].set(0,0,1,0)}
 lightFountains();resize()}
function lightFountains(t){const on=!$('tgFountains')||$('tgFountains').classList.contains('on');
 Fn.forEach((f,i)=>{const L=LIGHTS[f.light]||LIGHTS.off,lit=!!L.c&&on;if(lit){if(f.light==='change')f.col.setHSL(((t||0)*0.04+i*0.17)%1,0.9,0.55);else f.col.setHex(L.c)}else f.col.setRGB(0,0,0);
  const dayc=0.22+0.78*DAY;f.mat.uniforms.uCol.value.setRGB(mix(0.90*dayc,lit?f.col.r*2.4+0.15:0.10,NIGHT),mix(0.95*dayc,lit?f.col.g*2.4+0.15:0.12,NIGHT),mix(1.0*dayc,lit?f.col.b*2.4+0.15:0.16,NIGHT));
  f.mat.uniforms.uAlpha.value=mix(0.5,lit?0.85:0.3,NIGHT);f.gl.material.color.copy(f.col);f.gl.material.opacity=lit?NIGHT*0.55:0;
  if(f.pl){f.pl.color.copy(f.col);f.pl.intensity=lit?NIGHT*(60+f.W*f.H*4):0;f.pl.visible=lit&&NIGHT>0.01}
  WU.uFC.value[i].copy(f.col).multiplyScalar(lit?1.0:0)});
 for(let i=Fn.length;i<12;i++)WU.uFC.value[i].setRGB(0,0,0)}

// ---------- driving directions: the route from the road to the Fishing Lounge parking, laid on the ground like a map line; a P at the parking; a drive-along
let routeObjs=[],driveS=-1,driveK=-1,altLine=null;
function dist(ft){return LANG==='en'?Math.round(ft).toLocaleString('en-US')+' ft':(Math.round(ft*0.3048/5)*5)+' m'}
function buildRoute(){const R=S.route;if(!R)return;
 if(R.alt){const A=R.alt.pts,m=A.length,ap=new Float32Array(m*6),ai=[],aw=0.45;for(let i=0;i<m;i++){const a=A[Math.max(0,i-1)],b=A[Math.min(m-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const lx=A[i][0]-dy*aw,ly=A[i][1]+dx*aw,rx=A[i][0]+dy*aw,ry=A[i][1]-dx*aw;
   ap.set([lx,Math.max(groundAt(lx,ly),A[i][2])+0.15,ly,rx,Math.max(groundAt(rx,ry),A[i][2])+0.15,ry],i*6);if(i<m-1&&(i%4)<2){const k=i*2;ai.push(k,k+1,k+2,k+1,k+3,k+2)}}
  const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.BufferAttribute(ap,3));ag.setIndex(ai);const al=new THREE.Mesh(ag,new THREE.MeshBasicMaterial({color:0xffe680,transparent:true,opacity:0.75,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));al.renderOrder=1;al.frustumCulled=false;al.userData={tipf:()=>tr('tAlt')};scene.add(al);picks.push(al);altLine=al}
 const P=R.pts,n=P.length,pos=new Float32Array(n*6),ix=[],w=0.62;
 for(let i=0;i<n;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(n-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const lx=P[i][0]-dy*w,ly=P[i][1]+dx*w,rx=P[i][0]+dy*w,ry=P[i][1]-dx*w;
  pos.set([lx,Math.max(groundAt(lx,ly),P[i][2])+0.17,ly,rx,Math.max(groundAt(rx,ry),P[i][2])+0.17,ry],i*6);if(i<n-1){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(ix);
 const line=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xffd21f,transparent:true,opacity:0.9,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));line.renderOrder=1;line.frustumCulled=false;line.userData={tipf:()=>tr('tRoute')};scene.add(line);picks.push(line);
 const K=R.parking,pg=new THREE.BufferGeometry(),pp=new Float32Array(12);K.pts.forEach((q,i)=>pp.set([q[0],q[2]+0.12,q[1]],i*3));pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setIndex([0,1,2,0,2,3]);
 const pad=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({color:0x1a85f0,transparent:true,opacity:0.3,side:THREE.DoubleSide,depthWrite:false}));pad.renderOrder=1;pad.userData={tipf:()=>tr('tPark',{w:K.w_ft,dp:K.d_ft,n:K.spaces})};scene.add(pad);picks.push(pad);
 const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.fillStyle='#1a6fd6';x.beginPath();x.roundRect?x.roundRect(6,6,116,116,22):x.rect(6,6,116,116);x.fill();x.fillStyle='#fff';x.font='700 96px Arial,Helvetica,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('P',64,70);
 const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,depthWrite:false}));sp.position.set(K.c[0],K.c[2]+3.4,K.c[1]);sp.scale.set(2.4,2.4,1);sp.renderOrder=7;scene.add(sp);
 const post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,8),new THREE.MeshStandardMaterial({color:0x6b7076}));post.position.set(K.c[0],K.c[2]+1.2,K.c[1]);scene.add(post);routeObjs=[line,pad,sp,post].concat(altLine?[altLine]:[])}
let asphObjs=[];
function buildAsphalt(){const A=S.asphalt;if(!A)return;const P=A.pts,n=P.length,pos=new Float32Array(n*6),ix=[];
 for(let i=0;i<n;i++){const q=P[i];pos.set([q[0],Math.max(groundAt(q[0],q[1]),q[2])+0.11,q[1],q[3],Math.max(groundAt(q[3],q[4]),q[5])+0.11,q[4]],i*6);if(i<n-1){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x2c2e31,roughness:0.92,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));m.receiveShadow=true;m.frustumCulled=false;
 const q=A.q;m.userData={tipf:()=>tr('tAsphTip',{l:q.length_ft.toLocaleString('en-US'),w:q.width_ft,t:q.thickness_in,a:q.area_sf.toLocaleString('en-US'),tn:q.tons})};scene.add(m);picks.push(m);asphObjs=[m]}
function dirUI(){const R=S.route,ol=$('dirsteps');if(!R)return;ol.textContent='';$('dirto').textContent=tr('dirTo');$('dirsum').textContent=tr('dirSum',{d:dist(R.total_ft),mi:(R.total_ft/5280).toFixed(2),min:Math.max(1,Math.round(R.minutes))});
 R.steps.forEach((q,i)=>{const li=document.createElement('li');li.textContent=tr(VIS&&q.k==='d0'?'d0e':q.k,{d:dist(q.ft),n:R.parking.spaces});li.dataset.i=i;ol.appendChild(li)});
 const ao=$('diralt'),ah=$('diralth');if(ao){ao.textContent='';const A=R.alt;ao.hidden=ah.hidden=!A;if(A)A.steps.forEach(q=>{const li=document.createElement('li');li.textContent=tr(q.k,{d:dist(q.ft),n:R.parking.spaces});ao.appendChild(li)})}
 const el=$('dirbtn');el.textContent='';chip(el,driveS>=0?tr('stopd'):tr('drive'),true,()=>{if(driveS>=0)stopDrive();else{driveS=0;driveK=-1;fly=null}dirUI()});chip(el,tr('seeRoute'),true,()=>{stopDrive();const v=ED.views.find(q=>q.name==='Driveway From The Road');if(v)flyTo(v)})}
function stopDrive(){if(driveS>=0){driveS=-1;if($('dirbtn'))dirUI()}}
function stepDrive(dt){const R=S.route,P=R.pts,L=(P.length-1)*R.step_ft*0.3048;driveS+=dt*13;if(driveS>=L){driveS=L-0.01}
 const at=q=>{const f=Math.max(0,Math.min(P.length-1.001,q/(R.step_ft*0.3048))),i=f|0,t=f-i,a=P[i],b=P[i+1];return [a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t,a[1]+(b[1]-a[1])*t]};
 const p=at(driveS),q=at(Math.min(L,driveS+16));ctrl.set([p[0],p[1]+2.3,p[2]],[q[0],q[1]+1.4,q[2]]);
 const idx=driveS/(R.step_ft*0.3048);let k=0;R.steps.forEach((q,i)=>{if(idx>=q.i-0.5)k=i});if(k!==driveK){driveK=k;document.querySelectorAll('#dirsteps li').forEach(li=>li.classList.toggle('now',+li.dataset.i===k))}
 if(driveS>=L-0.02){driveS=-1;dirUI();const K=R.parking;flyTo({p:[K.c[0]-14,K.c[2]+16,K.c[1]+22],t:[K.c[0],K.c[2],K.c[1]]})}}

// ---------- fish: the kinds the owner named, swimming in every pond, with one jumping every so often. For illustration: not a stocking count.
const KOI=[['Kohaku','#f2efe6','#e2401a',0.50,'#151516',2],['Sanke','#f2efe6','#e2401a',0.52,'#151516',0.70],['Showa','#17171a','#e2401a',0.50,'#f2efe6',0.62],['Yamabuki Ogon','#f0b428','#f0b428',2,'#151516',2],['Platinum Ogon','#eceae4','#eceae4',2,'#151516',2],
 ['Shiro Utsuri','#f2efe6','#151516',0.50,'#151516',2],['Hi Utsuri','#ea5a1c','#151516',0.52,'#151516',2],['Hariwake','#f2efe6','#f0a022',0.48,'#151516',2],['Chagoi','#7b5a34','#7b5a34',2,'#151516',2],['Kohaku','#f2efe6','#d9361a',0.44,'#151516',2]];
const SPEC=[{sk:'koi',n:'Butterfly koi',k:'koi',w:0.20,L:[0.55,0.86],v:0.30,d:[0.22,0.48],tr:0.9,hy:1.0,hz:1.08,fin:1.9,jw:1.2},
 {sk:'gc',n:'Grass carp',k:'gc',w:0.04,L:[0.80,1.0],v:0.32,d:[0.45,0.8],tr:0.7,hy:0.82,hz:0.95,fin:1.0,jw:0.8,c:['#6e7355','#6e7355',2]},
 {sk:'lmb',n:'Largemouth bass',k:'bass',w:0.17,L:[0.36,0.58],v:0.38,d:[0.38,0.8],tr:1.3,hy:0.95,hz:0.9,fin:1.0,jw:6,c:['#55632f','#232a14',0.56]},
 {sk:'f1',n:'F1 tiger bass',k:'bass',w:0.06,L:[0.40,0.60],v:0.42,d:[0.38,0.8],tr:1.4,hy:0.95,hz:0.9,fin:1.0,jw:6,c:['#5d6a33','#1d2411',0.5]},
 {sk:'bream',n:'Bream (bluegill)',k:'sun',w:0.20,L:[0.14,0.22],v:0.24,d:[0.2,0.48],tr:2.4,hy:1.55,hz:0.75,fin:1.0,school:[4,8],jw:0.5,c:['#4c5d50','#27353a',0.55]},
 {sk:'redear',n:'Redear sunfish',k:'sun',w:0.07,L:[0.16,0.25],v:0.24,d:[0.25,0.55],tr:2.2,hy:1.5,hz:0.75,fin:1.0,school:[3,5],jw:0.4,c:['#5b6548','#2e3a30',0.58]},
 {sk:'warmouth',n:'Warmouth',k:'sun',w:0.04,L:[0.14,0.21],v:0.2,d:[0.3,0.6],tr:2.2,hy:1.4,hz:0.85,fin:1.0,jw:0.3,c:['#5a4a34','#2b2318',0.5]},
 {sk:'cat',n:'Channel catfish',k:'cat',w:0.08,L:[0.45,0.70],v:0.22,d:[0.8,1.2],tr:0.8,hy:0.8,hz:1.25,fin:1.0,jw:0.2,c:['#3c4248','#3c4248',2]},
 {sk:'til',n:'Tilapia',k:'til',w:0.14,L:[0.24,0.36],v:0.26,d:[0.3,0.6],tr:1.8,hy:1.3,hz:0.8,fin:1.0,school:[3,6],jw:0.8,c:['#7d8684','#56605f',0.6]}];
const FISH=[],FP=[],bursts=[];let fishMesh=null,fishOn=true,nextJump=5,nextSip=3,slotK=0,fD=null;
function inPoly(x,y,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function fishGeo(){const RX=[0.5,0.47,0.42,0.33,0.2,0.06,-0.08,-0.2,-0.28,-0.33],RY=[0,0.03,0.062,0.098,0.122,0.124,0.104,0.072,0.047,0.036],RZ=[0,0.026,0.05,0.071,0.084,0.08,0.062,0.04,0.022,0.012],NS=8,P=[],A=[],Fv=[],ix=[];
 const add=(x,y,z,ft,ang,fx,fy,fz)=>{P.push(x,y,z);A.push(Math.min(1,Math.max(0,(0.35-x)/0.85)),ft,0.5-x,ang);Fv.push(fx||0,fy||0,fz||0);return P.length/3-1};
 const nose=add(0.5,0,0,0,0);const ring=[];for(let i=1;i<RX.length;i++){const r=[];for(let k=0;k<NS;k++){const a=k/NS*6.2832;r.push(add(RX[i],RY[i]*Math.cos(a),RZ[i]*Math.sin(a),0,a))}ring.push(r)}
 for(let k=0;k<NS;k++)ix.push(nose,ring[0][k],ring[0][(k+1)%NS]);
 for(let i=0;i<ring.length-1;i++)for(let k=0;k<NS;k++){const a=ring[i][k],b=ring[i][(k+1)%NS],c=ring[i+1][k],d=ring[i+1][(k+1)%NS];ix.push(a,c,b,b,c,d)}
 const tail=add(-0.34,0,0,0,0);for(let k=0;k<NS;k++)ix.push(tail,ring[ring.length-1][(k+1)%NS],ring[ring.length-1][k]);
 const t0=add(-0.33,0.034,0,1,0),t1=add(-0.33,-0.034,0,1,3.14),t2=add(-0.52,0.125,0,1,0,-0.19,0.05,0),t3=add(-0.43,0,0,1,1.57,-0.12,0,0),t4=add(-0.52,-0.125,0,1,3.14,-0.19,-0.05,0);ix.push(t0,t2,t3,t0,t3,t1,t1,t3,t4);   // tail fin
 for(const sg of [1,-1]){const a=add(0.22,-0.045,sg*0.06,2,1.57),b=add(0.08,-0.07,sg*0.17,2,1.57,-0.06,-0.01,sg*0.12),c=add(0.01,-0.05,sg*0.085,2,1.57,-0.05,0,sg*0.05);ix.push(a,b,c)}   // side fins
 const d0=add(0.2,0.116,0,3,0),d1=add(-0.12,0.085,0,3,0),d2=add(0.02,0.19,0,3,0,-0.03,0.05,0),d3=add(-0.1,0.14,0,3,0,-0.02,0.03,0);ix.push(d0,d2,d3,d0,d3,d1);   // back fin
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aP',new THREE.Float32BufferAttribute(A,4));g.setAttribute('aF',new THREE.Float32BufferAttribute(Fv,3));g.setIndex(ix);g.computeVertexNormals();return g}
const FIV=`attribute vec4 aP;attribute vec3 aF;attribute vec4 iA,iD,iC1,iC2,iC3;varying vec3 vN,vW;varying vec4 vU,vC1,vC2,vC3;varying float vSurf,vAl;
 void main(){vec3 p=position+aF*(iA.x-1.0);float ft=aP.y;if(ft<0.5){p.y*=iA.y;p.z*=iA.z;}else if(ft>1.5&&ft<2.5){p.y*=iA.y;p.z*=iA.z;p.y+=0.012*sin(iD.x*0.6)*iA.x;}else{p.y*=mix(1.0,iA.y,0.6);}
  float w=aP.x;p.z+=(iD.y*sin(iD.x-aP.z*5.5)+iD.z)*w*w*(ft>0.5&&ft<1.5?1.4:1.0);
  mat4 M=modelMatrix*instanceMatrix;vec4 wp=M*vec4(p,1.0);vW=wp.xyz;vN=normalize(mat3(M)*normal);vU=vec4(aP.z,aP.w,ft,iC3.a);vC1=iC1;vC2=iC2;vC3=iC3;vSurf=iA.w;vAl=iD.w;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const FIF=`uniform vec3 uSun,uSunCol,uWater,uFogC;uniform float uDay,uNight,uFogN,uFogF;uniform vec4 uF[12];uniform vec3 uFC[12];varying vec3 vN,vW;varying vec4 vU,vC1,vC2,vC3;varying float vSurf,vAl;
 float h3(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 void main(){if(vAl<0.01)discard;float ft=vU.z,sd=vU.w;vec3 q=vec3(vU.x*4.4,cos(vU.y)*0.95,sin(vU.y)*0.95)+sd*vec3(17.3,9.1,23.7);
  float m1=smoothstep(vC1.a-0.045,vC1.a+0.045,vn(q*1.15)),m2=smoothstep(vC2.a-0.04,vC2.a+0.04,vn(q*2.6+11.0));
  vec3 col=mix(mix(vC1.rgb,vC2.rgb,m1),vC3.rgb,m2);
  if(ft<0.5)col=mix(col,mix(col,vec3(0.8,0.78,0.7),0.6),smoothstep(0.25,-0.75,cos(vU.y)));else col=mix(col,vec3(0.9,0.88,0.82),0.28);
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float d=vSurf-vW.y,under=smoothstep(-0.02,0.05,d),dd=max(d,0.0);
  vec3 la=vec3(0.26+0.8*uDay)*(0.6+0.4*n.y),lb=vec3(0.28+0.3*uDay)+uSunCol*max(dot(n,normalize(uSun)),0.0)*0.9;vec3 c=col*mix(lb,la,under);
  vec3 g=vec3(0.0);for(int i=0;i<12;i++){vec4 f=uF[i];if(f.w<0.5)continue;vec2 dv=vW.xz-f.xy;g+=uFC[i]*exp(-dot(dv,dv)/(f.z*f.z*1.8+1.0));}c+=col*g*uNight*0.9;
  c=mix(c,uWater*(0.22+0.9*uDay),under*(1.0-exp(-dd*1.5)));
  vec3 v=normalize(cameraPosition-vW);float F=0.03+0.97*pow(1.0-max(v.y,0.0),5.0);float a=mix(1.0,exp(-dd*0.85)*(1.0-0.85*F)*0.96,under)*vAl*(ft>0.5?0.82:1.0);
  c=mix(c,uFogC,smoothstep(uFogN,uFogF,length(cameraPosition-vW)));gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
const BVERT=`attribute vec3 aV;attribute vec2 aQ;uniform float uTime,uPx,uT0,uK;uniform vec3 uO;varying float vA;
 void main(){float t=uTime-uT0,T=aV.z*uK,on=step(0.0,t)*step(t,T);float rho=aV.x*uK*t,y=aV.y*uK*t-4.905*t*t;vec3 p=uO+vec3(cos(aQ.x)*rho,y,sin(aQ.x)*rho);
  vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=on*clamp(uPx*aQ.y/max(0.5,-mv.z),1.0,18.0);vA=on*(1.0-0.6*t/max(T,0.01));}`;
function buildFish(){if(!S.ponds||!GP)return;const rnd=(()=>{let q=20261115;return()=>{q=(q*16807)%2147483647;return q/2147483647}})(),ru=(a,b)=>a+(b-a)*rnd();
 let tot=0;for(const P of S.ponds){if(P.unfinished||PONDZ[P.name]===undefined)continue;const poly=P.xy_show||P.xy;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,ar=0;
   for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];ar+=a[0]*b[1]-b[0]*a[1];x0=Math.min(x0,a[0]);x1=Math.max(x1,a[0]);y0=Math.min(y0,a[1]);y1=Math.max(y1,a[1])}
   const pts=[];let cx=0,cz=0;for(let k=0;k<4000&&pts.length<80;k++){const x=ru(x0,x1),y=ru(y0,y1);if(!inPoly(x,y,poly))continue;const dp=P.z-groundAt(x,y);if(dp<0.75)continue;pts.push([x,y,dp]);cx+=x;cz+=y}
   if(pts.length<6)continue;const fp={name:P.name,z:P.z,pts,poly,cx:cx/pts.length,cz:cz/pts.length,area:Math.abs(ar)/2,feed:null};
   if(feedPt){const near=pts.filter(p=>Math.hypot(p[0]-feedPt[0],p[1]-feedPt[1])<17);if(near.length>=3)fp.feed=near}FP.push(fp);tot+=fp.area}
 if(!FP.length)return;const NF=MOBILE?70:130,col=new THREE.Color(),cv=(hex)=>{col.set(hex);return [col.r,col.g,col.b]};
 for(const fp of FP){let quota=Math.max(5,Math.round(NF*fp.area/tot));
  while(quota>0){let u=rnd(),sp=SPEC[0];const wk=SPEC.map(q=>q.w*(q.k==='koi'&&fp.feed?1.9:1)/(q.school?(q.school[0]+q.school[1])/2:1)),ws=wk.reduce((a,b)=>a+b,0);u*=ws;for(let i=0;i<SPEC.length;i++){if(u<wk[i]){sp=SPEC[i];break}u-=wk[i]}
   const n=sp.school?Math.min(quota,Math.round(ru(sp.school[0],sp.school[1]))):1;let leader=null;const w0=fp.pts[(rnd()*fp.pts.length)|0];
   for(let k=0;k<n;k++){const L=ru(sp.L[0],sp.L[1]),dep0=ru(sp.d[0],sp.d[1]),kv=sp.k==='koi'?KOI[(rnd()*KOI.length)|0]:null;
    const f={sp,pond:fp,L,x:w0[0]+(k?ru(-1.2,1.2):0),z:w0[1]+(k?ru(-1.2,1.2):0),th:ru(0,6.28),v:sp.v*0.6,vc:sp.v*ru(0.8,1.25),dep:dep0,dep0,need:Math.max(0.4,dep0+0.16+0.13*L),tx:w0[0],tz:w0[1],tt:0,ph:ru(0,6.28),amp:0.06,curv:0,pause:0,nextPause:ru(5,25),seed:rnd(),leader,off:[ru(-0.9,-0.2)-0.25*k,ru(-0.8,0.8)],jump:null,
     vr:kv?kv[0]:'',c1:kv?[...cv(kv[1]),2]:[...cv(sp.c[0]),2],c2:kv?[...cv(kv[2]),2]:[...cv(sp.c[1]),2],c3:kv?[...cv(kv[4]),0]:[0.02,0.02,0.02,0]};
    f.c1[3]=kv?kv[3]:sp.c[2];f.c2[3]=kv?kv[5]:2;f.c3[3]=f.seed;if(!k)leader=f;FISH.push(f)}quota-=n}}
 const g=fishGeo(),N=FISH.length,iA=new Float32Array(N*4),iC1=new Float32Array(N*4),iC2=new Float32Array(N*4),iC3=new Float32Array(N*4);fD=new Float32Array(N*4);
 FISH.forEach((f,i)=>{iA.set([f.sp.fin*(f.sp.k==='koi'?0.8+0.5*f.seed:1),f.sp.hy,f.sp.hz,f.pond.z],i*4);iC1.set(f.c1,i*4);iC2.set(f.c2,i*4);iC3.set(f.c3,i*4)});
 g.setAttribute('iA',new THREE.InstancedBufferAttribute(iA,4));g.setAttribute('iC1',new THREE.InstancedBufferAttribute(iC1,4));g.setAttribute('iC2',new THREE.InstancedBufferAttribute(iC2,4));g.setAttribute('iC3',new THREE.InstancedBufferAttribute(iC3,4));
 const dA=new THREE.InstancedBufferAttribute(fD,4);dA.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iD',dA);
 const mat=new THREE.ShaderMaterial({uniforms:{uSun:WU.uSun,uSunCol:WU.uSunCol,uDay:WU.uDay,uNight:WU.uNight,uF:WU.uF,uFC:WU.uFC,uFogC:WU.uFogC,uFogN:WU.uFogN,uFogF:WU.uFogF,uWater:{value:new THREE.Color(0.035,0.105,0.11)}},vertexShader:FIV,fragmentShader:FIF,transparent:true,side:THREE.DoubleSide});
 fishMesh=new THREE.InstancedMesh(g,mat,N);fishMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fishMesh.frustumCulled=false;fishMesh.renderOrder=3;scene.add(fishMesh);picks.push(fishMesh);
 for(let b=0;b<3;b++){const n=90,aV=new Float32Array(n*3),aQ=new Float32Array(n*2);for(let i=0;i<n;i++){const vv=ru(1.0,3.3);aV.set([ru(0.2,1.7),vv,2*vv/9.81],i*3);aQ.set([ru(0,6.28),ru(0.5,1.2)],i*2)}
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));bg.setAttribute('aV',new THREE.BufferAttribute(aV,3));bg.setAttribute('aQ',new THREE.BufferAttribute(aQ,2));
  const bm=new THREE.ShaderMaterial({uniforms:{uTime:WU.uTime,uPx:{value:300},uT0:{value:-100},uK:{value:1},uO:{value:new THREE.Vector3()},uCol:{value:new THREE.Color(1,1,1)},uAlpha:{value:0.75}},vertexShader:BVERT,fragmentShader:FFRAG,transparent:true,depthWrite:false});
  const pt=new THREE.Points(bg,bm);pt.frustumCulled=false;pt.renderOrder=5;scene.add(pt);bursts.push(pt)}
 updateFish(0.016,performance.now()/1000)}
function ring(x,z,t,amp){WU.uS.value[slotK].set(x,z,t,amp);slotK=(slotK+1)%6}
function burst(x,y,z,t,k){const b=bursts.shift();bursts.push(b);b.material.uniforms.uO.value.set(x,y,z);b.material.uniforms.uT0.value=t;b.material.uniforms.uK.value=k;sndSplash(x,y,z,k)}
function pickTarget(f){const W=(f.sp.k==='koi'&&f.pond.feed&&Math.random()<0.45)?f.pond.feed:f.pond.pts;let best=null,bs=1e9;
 for(let k=0;k<7;k++){const p=W[(Math.random()*W.length)|0],dx=p[0]-f.x,dz=p[1]-f.z,d=Math.hypot(dx,dz);if(d<1.5||p[2]<f.need)continue;let dt=Math.atan2(dz,dx)-f.th;dt=Math.atan2(Math.sin(dt),Math.cos(dt));
  let ok=true;const n=Math.ceil(d/1.5);for(let i=1;i<n&&ok;i++){const q=i/n;if(f.pond.z-groundAt(f.x+dx*q,f.z+dz*q)<f.need*0.85)ok=false}
  const sc=Math.abs(dt)*1.3+d*0.03+Math.random()*1.5+(ok?0:40);if(sc<bs){bs=sc;best=p}}
 if(!best)best=f.pond.pts[(Math.random()*f.pond.pts.length)|0];f.tx=best[0];f.tz=best[1];f.tt=12+Math.random()*26}
function startJump(f,t){const vh=0.8+Math.random()*0.9+f.L*0.8,vv=2.9+Math.random()*1.2+f.L*0.6,T=2*vv/9.81,lx=f.x+Math.cos(f.th)*vh*(T+0.5),lz=f.z+Math.sin(f.th)*vh*(T+0.5);
 if(f.pond.z-groundAt(lx,lz)<0.6||f.pond.z-groundAt(f.x,f.z)<0.5)return false;f.jump={t0:t,vh,vv,T,x0:f.x,z0:f.z,d0:f.dep,st:0};return true}
const _fm=new THREE.Matrix4(),_fq=new THREE.Quaternion(),_fe=new THREE.Euler(0,0,0,'YZX'),_fp=new THREE.Vector3(),_fs=new THREE.Vector3();
function updateFish(dt,t){if(!fishMesh)return;const near=ctrl?ctrl.sph.radius<520:true;fishMesh.visible=fishOn&&near;if(!fishMesh.visible)return;dt=Math.min(dt,0.05);
 if(ctrl&&t>nextJump){nextJump=t+7+Math.random()*9;let sum=0;const w=FISH.map(f=>{if(f.jump||f.leader)return 0;const d=Math.hypot(f.x-ctrl.target.x,f.z-ctrl.target.z);const q=f.sp.jw/(1+(d/55)*(d/55));sum+=q;return q});
  let u=Math.random()*sum;for(let i=0;i<FISH.length;i++){u-=w[i];if(u<=0){if(!startJump(FISH[i],t))nextJump=t+1.5;break}}}
 if(ctrl&&t>nextSip){nextSip=t+2.2+Math.random()*4;const c=FISH.filter(f=>!f.jump&&f.dep<0.5&&Math.hypot(f.x-ctrl.target.x,f.z-ctrl.target.z)<90);if(c.length){const f=c[(Math.random()*c.length)|0];ring(f.x,f.z,t,0.3)}}
 for(let i=0;i<FISH.length;i++){const f=FISH[i],L=f.L,pz=f.pond.z;let y,pitch=0;
  if(f.jump){const j=f.jump,a0=0.32,tt=j.hold!==undefined?a0+j.hold*j.T:t-j.t0,al=Math.atan2(j.vv,j.vh);
   if(tt<a0){const e=tt/a0,e2=e*e*(3-2*e);f.x=j.x0+Math.cos(f.th)*j.vh*tt;f.z=j.z0+Math.sin(f.th)*j.vh*tt;f.dep=j.d0*(1-e2)+0.02*e2;y=pz-f.dep;pitch=al*e2}
   else{const ta=tt-a0;if(!j.st){j.st=1;ring(f.x,f.z,t,0.9);burst(f.x,pz+0.03,f.z,t,0.55+L*0.5)}
    f.x=j.x0+Math.cos(f.th)*j.vh*tt;f.z=j.z0+Math.sin(f.th)*j.vh*tt;y=pz-0.02+j.vv*ta-4.905*ta*ta;pitch=Math.atan2(j.vv-9.81*ta,j.vh);
    if(ta>j.T){if(j.st<2){j.st=2;ring(f.x,f.z,t,1.5);burst(f.x,pz+0.03,f.z,t,0.8+L*0.7)}const tb=ta-j.T,e=Math.min(1,tb/0.6),dmax=pz-groundAt(f.x,f.z)-0.14-0.13*L;f.dep=Math.max(0.05,Math.min(0.5*e,dmax));y=pz-f.dep;pitch=-0.9*(1-e);if(e>=1){f.jump=null;f.v=j.vh*0.8;pickTarget(f)}}}
   f.ph+=dt*22;f.amp=0.11;f.curv=0}
  else{if(f.leader){const l=f.leader,c=Math.cos(l.th),s=Math.sin(l.th);f.tx=l.x+f.off[0]*c-f.off[1]*s;f.tz=l.z+f.off[0]*s+f.off[1]*c}else{f.tt-=dt;if(f.tt<0||Math.hypot(f.tx-f.x,f.tz-f.z)<1.2)pickTarget(f)}
   const la=0.6+L*1.2;let want=Math.atan2(f.tz-f.z,f.tx-f.x),rate=f.sp.tr;
   if(pz-groundAt(f.x+Math.cos(f.th)*la,f.z+Math.sin(f.th)*la)<f.need*0.8){want=Math.atan2(f.pond.cz-f.z,f.pond.cx-f.x);rate*=2.6;if(!f.leader)f.tt=Math.min(f.tt,0.6)}
   let dth=want-f.th;dth=Math.atan2(Math.sin(dth),Math.cos(dth));const st=Math.max(-rate*dt,Math.min(rate*dt,dth));f.th+=st;f.curv+=(Math.max(-0.13,Math.min(0.13,st/dt*0.085))-f.curv)*Math.min(1,dt*4);
   let vt=f.vc*(f.pause>0?0.12:1)*(Math.abs(dth)>1.2?0.6:1);if(f.leader){const dl=Math.hypot(f.tx-f.x,f.tz-f.z);vt=Math.max(0.05,f.leader.v)*(0.6+Math.min(1.4,dl*0.6))}else{f.pause-=dt;if(f.pause<-f.nextPause){f.pause=1.5+Math.random()*4;f.nextPause=8+Math.random()*22}}
   f.v+=(vt-f.v)*Math.min(1,dt*1.5);const nx=f.x+Math.cos(f.th)*f.v*dt,nz=f.z+Math.sin(f.th)*f.v*dt;
   if(pz-groundAt(nx,nz)>=Math.max(0.34,f.dep0+0.1*L)){f.x=nx;f.z=nz}else{let da=Math.atan2(f.pond.cz-f.z,f.pond.cx-f.x)-f.th;da=Math.atan2(Math.sin(da),Math.cos(da));f.th+=Math.sign(da||1)*Math.min(Math.abs(da),f.sp.tr*3*dt+0.02);f.v*=0.9;if(!f.leader)f.tt=0}f.ph+=dt*6.2832*(0.3+f.v/(0.62*L));f.amp+=((0.045+0.065*Math.min(1.5,f.v/f.vc))-f.amp)*Math.min(1,dt*3);
   const dmax=pz-groundAt(f.x,f.z)-0.14-0.13*L,dw=Math.max(0.1,Math.min(f.dep0+0.05*Math.sin(t*0.3+f.seed*9),dmax));f.dep+=(dw-f.dep)*Math.min(1,dt*1.2);if(f.dep>dmax)f.dep=Math.max(0.05,dmax);y=pz-f.dep}
  _fe.set(0,-f.th,pitch);_fq.setFromEuler(_fe);_fp.set(f.x,y,f.z);_fs.set(L,L,L);_fm.compose(_fp,_fq,_fs);fishMesh.setMatrixAt(i,_fm);fD[i*4]=f.ph;fD[i*4+1]=f.amp;fD[i*4+2]=f.curv;fD[i*4+3]=1}
 fishMesh.instanceMatrix.needsUpdate=true;fishMesh.geometry.attributes.iD.needsUpdate=true;
 const dc=0.9*(0.22+0.78*DAY);for(const b of bursts)b.material.uniforms.uCol.value.setRGB(dc,dc*1.04,dc*1.08)}

// ---------- time of day (a midsummer day at Aiken, 33.58 N; clock time)
function setTime(h){TOD=h;const lat=33.583*Math.PI/180,dec=23.44*Math.PI/180,Hh=(h-13.45)*15*Math.PI/180;
 const e=-Math.cos(dec)*Math.sin(Hh),n=Math.cos(lat)*Math.sin(dec)-Math.sin(lat)*Math.cos(dec)*Math.cos(Hh),u=Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(Hh);
 const el=Math.asin(Math.max(-1,Math.min(1,u)))*180/Math.PI;
 if(u>0.02)sunDir.set(e*EAST.x+n*NORTH.x,u,e*EAST.y+n*NORTH.y).normalize();else sunDir.set(e*EAST.x+n*NORTH.x,0.02,e*EAST.y+n*NORTH.y).normalize();
 DAY=sm(-5,9,el);NIGHT=1-sm(-10,0.5,el);const gold=(1-sm(3,26,el))*DAY;
 const sc=new THREE.Color(mix(1.0,1.0,gold),mix(0.96,0.56,gold),mix(0.90,0.28,gold));
 sun.color.copy(sc);sun.intensity=2.35*sm(-1,10,el)*(1-0.25*gold);sun.castShadow=el>2.5;
 moon.intensity=0.5*NIGHT;
 hemi.color.setRGB(mix(0.10,0.74,DAY)+0.18*gold,mix(0.14,0.85,DAY),mix(0.30,1.0,DAY)-0.2*gold);hemi.groundColor.setRGB(mix(0.03,0.42,DAY),mix(0.04,0.40,DAY),mix(0.07,0.30,DAY));hemi.intensity=mix(0.40,0.78,DAY);
 skyU.uTop.value.setRGB(mix(0.004,mix(0.20,0.14,gold),DAY),mix(0.008,mix(0.42,0.22,gold),DAY),mix(0.03,mix(0.80,0.48,gold),DAY));
 skyU.uHor.value.setRGB(mix(0.02,mix(0.72,0.98,gold),DAY),mix(0.03,mix(0.83,0.60,gold),DAY),mix(0.07,mix(0.93,0.34,gold),DAY));
 skyU.uSunCol.value.copy(sc).multiplyScalar(sm(-3,3,el));skyU.uNight.value=NIGHT;
 scene.fog.color.copy(skyU.uHor.value).multiplyScalar(0.92);WU.uFogC.value.copy(scene.fog.color);WU.uNight.value=NIGHT;WU.uDay.value=DAY;WU.uSunCol.value.copy(sc).multiplyScalar(sm(0,6,el));
 renderer.toneMappingExposure=mix(1.0,1.2,NIGHT);
 const k=0.2+0.8*DAY;if(bandMat){bandMat.color.setRGB(0.95*k,0.76*k,0.19*k);pinMat.color.copy(bandMat.color)}if(chainMat)chainMat.color.setScalar(k);
 for(const m of nightMats)m.emissiveIntensity=NIGHT*m.userData.glow;
 lightFountains();lampsAt();shadowDirty=true;
 const hh=Math.floor(h)%24,mm=Math.round((h-Math.floor(h))*60)%60,ph=el>9?(h<12?'pMorning':h<17?'pDay':'pLate'):el>0?(h<12?'pSunrise':'pGolden'):el>-9?(h<12?'pDawn':'pDusk'):'pNight';
 const clock=LANG==='en'?(((hh+11)%12)+1)+':'+String(mm).padStart(2,'0')+' '+(hh<12?'AM':'PM'):String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
 $('todinfo').innerHTML='<strong>'+clock+'</strong> — '+tr(ph)+'. '+(NIGHT>0.6?tr('todNight'):tr('todDay'));
 if($('tod').value!=String(h))$('tod').value=h;
 document.querySelectorAll('#todp .chip').forEach(b=>b.classList.toggle('on',Math.abs(+b.dataset.h-h)<0.01))}
function fitShadow(){lastShadow=performance.now();shadowDirty=false;if(!sun.castShadow){renderer.shadowMap.needsUpdate=true;return}
 const r=Math.min(600,Math.max(40,ctrl.sph.radius*1.3)),t=ctrl.target,texel=2*r/SMAP;sun.target.position.copy(t);sun.position.copy(t).addScaledVector(sunDir,700);
 moon.target.position.copy(t);moon.position.set(t.x+300,t.y+600,t.z-250);
 const c=sun.shadow.camera;c.left=-r;c.right=r;c.top=r;c.bottom=-r;c.near=60;c.far=1500;c.updateProjectionMatrix();sun.shadow.normalBias=texel*1.8;sun.shadow.bias=-texel*0.7/1440;
 shF={x:t.x,z:t.z,r};renderer.shadowMap.needsUpdate=true}

// ---------- panels
function chip(parent,label,on,fn,id){const b=document.createElement('button');b.className='chip'+(on?' on':'');b.textContent=label;if(id)b.id=id;b.onclick=()=>fn(b);parent.appendChild(b);return b}
const SHOWS=[['tLine',on=>boundaryObjs.forEach(m=>m.visible=on)],['tTrees',on=>treeMeshes.forEach(m=>m.visible=on)],['tLeaves',on=>leafMeshes.forEach(m=>m.visible=on)],['tFences',on=>fenceObjs.forEach(m=>m.visible=on)],['tFount',on=>{buildFountains()},'tgFountains'],['tFish',on=>{fishOn=on;if(fishMesh)fishMesh.visible=on}],['tRouteT',on=>routeObjs.forEach(m=>m.visible=on)],['tAsph',on=>asphObjs.forEach(m=>m.visible=on)],['tProp',on=>propMeshes.forEach(m=>m.visible=on)],['Carolina Safari Suites',on=>{suiteMeshes.forEach(m=>m.visible=on);tubObjs.forEach(m=>m.visible=on)}]],showOn={};
function wireUI(){const sel=$('lang');LANGS.forEach(([c,n])=>{if(!I18N[c])return;const o=document.createElement('option');o.value=c;o.textContent=n;sel.appendChild(o)});sel.value=LANG;sel.onchange=()=>setLang(sel.value);
 $('tod').oninput=e=>{setTime(+e.target.value);save()};
 {const sy=store.get('abf3d.say');if(typeof sy==='boolean')SND.say=sy;const ss=store.get('abf3d.snd');if(ss){if(typeof ss.vol==='number')SND.vol=Math.max(0,Math.min(1,ss.vol));if(ss.grp)for(const k in SND.grp)if(typeof ss.grp[k]==='boolean')SND.grp[k]=ss.grp[k]}$('sndvol').oninput=e=>{SND.vol=+e.target.value/100;store.set('abf3d.snd',{vol:SND.vol,grp:SND.grp,on:SND.on});sndSet()};
  const kick=e=>{if(e&&e.target&&e.target.closest&&e.target.closest('#sndc'))return;if(SND.want&&!SND.ctx){try{sndToggle()}catch(e){}}else if(SND.on&&SND.ctx&&SND.ctx.state!=='running'){const p=SND.ctx.resume();if(p&&p.catch)p.catch(()=>{})}};for(const ev of ['pointerdown','keydown','touchend'])document.addEventListener(ev,kick,{passive:true,capture:true})}$('copy').onclick=copyOut;
 document.querySelectorAll('.fold').forEach(b=>b.onclick=()=>{const p=$(b.dataset.fold),f=p.classList.toggle('is-folded');b.textContent=f?tr('show'):tr('hide');b.setAttribute('aria-expanded',!f)});
 if(MOBILE){document.querySelectorAll('.fold').forEach(b=>b.click())}
 canvas.addEventListener('keydown',e=>{if(e.key==='Escape')toast('')});
 if(!S.fountains){['fpond','fcount','fhp','fpat','flight','finfo'].forEach(i=>$(i).hidden=true)}
 if(!S.entrance){['enth','entopt','entinfo'].forEach(i=>$(i).hidden=true)}}
// a link can open on one view: the part after # is the view's name in lower case with hyphens (V-8)
const ABFM=String(window.ABF_MODE||'').toLowerCase(),FUT=ABFM==='future',SCOUT=ABFM==='scouts'||(!ABFM&&/^#?scouts(-night)?$/i.test(location.hash||'')),VIS=SCOUT||ABFM==='fishing'||ABFM==='parking'||/^#?(parking|fishing)$/i.test(location.hash||''),VISF=SCOUT||ABFM==='fishing'||(!ABFM&&/^#?fishing$/i.test(location.hash||'')),PROPV=/^(Entrance Gateway|Entrance Fountains|Container Party Deck|Carolina Safari Suites|Blue And Terry)/;   // customer links: #parking = what exists today; #fishing = the same plus the pond fountains
function visitorMode(){document.body.classList.add('dir-mode');const off=(VISF?[]:['tFount']).concat(['tAsph','tProp','Carolina Safari Suites']);for(const k of off)showOn[k]=false;$('bar').classList.add('is-folded');$('edit').classList.remove('is-folded');buildUI();
 for(const k of off){const e=SHOWS.find(q=>q[0]===k);if(e)e[1](false)}if(S.entrance)setEntrance('0');shadowDirty=true}
let lastHash='';const slug=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function hashNight(){return /(^|-)night$/i.test((location.hash||'').slice(1))}
function hashView(){let h='';try{h=decodeURIComponent((location.hash||'').slice(1)).toLowerCase()}catch(e){}if(!h)return null;lastHash=h;h=h.replace(/-?night$/,'');if(h==='suites')h='carolina-safari-suites';if(!h)return null;return ED.views.find(v=>v.hash===h||slug(v.name)===h)||null}
function buildUI(){applyStatic();ltUI();if(VIS){const h=$('edit').querySelector('h1');if(h)h.textContent=tr('dirTitle')}
 if(S.boundary)$('lede').textContent=VIS?tr('ledeVis'):FUT?tr('ledeFut'):tr('lede',{a:S.boundary.acres_plat_net});
 const vw=$('views');vw.textContent='';ED.views.filter(v=>!VIS||!PROPV.test(v.name)).forEach(v=>chip(vw,trn('v',v.name),false,()=>{flyTo(v);lastHash=v.hash||slug(v.name);try{if((location.hash||'').slice(1)!==lastHash)location.hash=lastHash}catch(e){}}));
 const tg=$('toggles');tg.textContent='';SHOWS.forEach(([k,fn,id])=>{const on=showOn[k]!==false,b=chip(tg,I18N.en[k]?tr(k):k,on,b=>{const q=!b.classList.contains('on');showOn[k]=q;b.classList.toggle('on',q);b.setAttribute('aria-pressed',q);fn(q);shadowDirty=true},id);b.setAttribute('aria-pressed',on)});
 const tp=$('todp');tp.textContent='';[['morning',8],['midday',13.5],['golden',19.75],['night',22]].forEach(([n,h])=>{const b=chip(tp,tr(n),Math.abs(h-TOD)<0.01,()=>{setTime(h);save()});b.dataset.h=h});
 if(S.fountains){const fp=$('fpond');fp.textContent='';S.fountains.ponds.map(p=>p.name).sort().forEach(n=>{const b=chip(fp,pondName(n),false,()=>{selPond=n;fountUI();save()});b.dataset.p=n});$('fsrc').textContent=tr('fsrc');fountUI()}
 if(S.entrance)entUI();sndUI();traceUI();
 if(S.route)dirUI();else{['dirh','dirto','dirsum','dirsteps','dirbtn'].forEach(i=>$(i).hidden=true)}
 document.querySelectorAll('.fold').forEach(b=>{b.textContent=$(b.dataset.fold).classList.contains('is-folded')?tr('show'):tr('hide')})}
function setLang(c){if(!I18N[c])return;LANG=c;store.set('abf3d.lang',c);buildUI();setTime(TOD);toast('')}
function fountUI(){const c=FC[selPond],cat=S.fountains.catalog,P=S.fountains.ponds.find(p=>p.name===selPond);
 document.querySelectorAll('#fpond .chip').forEach(b=>b.classList.toggle('on',b.dataset.p===selPond));
 const set=(id,items,cur,fn)=>{const el=$(id);el.textContent='';items.forEach(([k,label])=>chip(el,label,String(k)===String(cur),()=>{fn(k);fixChoice(selPond);buildFountains();fountUI();save()}))};
 set('fcount',[[0,tr('none')]].concat(Object.keys(P.slots).map(Number).sort((a,b)=>a-b).map(k=>[k,k===1?tr('one'):k===2?tr('two'):String(k)])),c.count,k=>c.count=k);
 set('fhp',Object.keys(cat).sort((a,b)=>a-b).map(k=>[k,cat[k].label]),c.hp,k=>c.hp=k);
 set('fpat',Object.keys(cat[c.hp].patterns).map(k=>[k,k+' '+cat[c.hp].patterns[k].h+' × '+cat[c.hp].patterns[k].w+' ft']),c.pattern,k=>c.pattern=k);
 set('flight',Object.keys(LIGHTS).map(k=>[k,trn('L',k)]),c.light,k=>c.light=k);
 const sp=spec(selPond);let t='<strong>'+pondName(selPond)+'</strong>';
 if(!c.count)t+=': '+tr('fNo');
 else{const sl=P.slots[String(c.count)],clear=Math.min(...sl.map(q=>q[2]-sp.w/2)),deck=Math.min(...sl.map(q=>q[3]-sp.w/2));
  t+=' ('+tr('fAcres',{a:P.area_ac.toFixed(2)})+'): <strong>'+tr('fLine',{n:c.count,hp:sp.hp,p:c.pattern,h:sp.h,w:sp.w,s:sp.series})+'</strong> ';
  t+=clear<3?'<span class="warn">'+tr('fWide')+'</span> ':tr('fClear',{n:Math.round(clear)})+' ';
  if(deck<40)t+=deck<10?'<span class="warn">'+tr('fDeckBad',{n:Math.max(0,Math.round(deck))})+'</span> ':tr('fDeck',{n:Math.round(deck)})+' ';
  t+=tr('fRuns',{v:sp.volts,d:sp.depth})}
 $('finfo').innerHTML=t}
function save(){if(VIS)return;const fr={};if(S.fountains)for(const P of S.fountains.ponds)fr[P.name]=P.rev||1;store.set(KEY,{tod:TOD,pond:selPond,f:FC,fr,ent:entSel,er:S.entrance?S.entrance.rev||1:1})}
function outText(){const L=['AIKEN BASSERIE AND FARM — MY CHOICES',''];
 if(S.entrance){const o=S.entrance.options.find(q=>q.id===entSel);L.push('Entrance gateway: '+(o?'Option '+o.id+' - '+o.name:'none'),'')}
 for(const P of S.fountains.ponds){const c=FC[P.name];if(!c.count){L.push(P.name+': none');continue}const sp=spec(P.name);
  L.push(P.name+': '+c.count+' x '+sp.hp+' '+sp.series+' ('+sp.model+'), '+c.pattern+' pattern '+sp.h+' ft high x '+sp.w+' ft wide, lights: '+LIGHTS[c.light].n+', '+sp.volts)}
 L.push('','DATA '+JSON.stringify({v:1,entrance:entSel,fountains:FC}));return L.join('\n')}
function copyOut(){const t=outText(),o=$('out');o.hidden=false;o.value=t;const done=ok=>{$('copied').textContent=ok?tr('copied'):tr('copyfail');if(!ok){o.focus();o.select()}};
 try{navigator.clipboard.writeText(t).then(()=>done(true),()=>done(false))}catch(e){done(false)}}
let toastT=0;
function toast(t){const el=$('toast');if(!t){el.hidden=true;return}el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true},6000)}

// ---------- V-14 trace a route on the ground (for the owner): click points along it, then copy the result into the chat with Claude
const TR={on:false,show:store.get('abf3d.traceShow')!==false,pts:[],objs:[]};
function groundHit(e){const r=canvas.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,cam);const o=ray.ray.origin,d=ray.ray.direction;let t0=0;
 for(let t=1;t<4000;t+=Math.max(0.5,t*0.01)){const g=groundAt(o.x+d.x*t,o.z+d.z*t);if(g>1e8){t0=t;continue}if(o.y+d.y*t-g<=0){let a=t0,b=t;for(let k=0;k<24;k++){const m=(a+b)/2,gm=groundAt(o.x+d.x*m,o.z+d.z*m);if(gm>1e8||o.y+d.y*m-gm>0)a=m;else b=m}return [o.x+d.x*b,o.z+d.z*b]}t0=t}return null}
function traceLine(){const P=TR.pts;if(P.length<2)return P.map(p=>[p[0],p[1]]);const out=[],cr=(a,b,c,d,t)=>0.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
 for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)],n=Math.max(1,Math.round(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])));for(let k=0;k<n;k++){const t=k/n;out.push([cr(p0[0],p1[0],p2[0],p3[0],t),cr(p0[1],p1[1],p2[1],p3[1],t)])}}
 out.push([P[P.length-1][0],P[P.length-1][1]]);return out}
function traceStats(){const L=traceLine();if(L.length<2)return null;const s=[0],z=L.map(p=>groundAt(p[0],p[1]));for(let i=1;i<L.length;i++)s.push(s[i-1]+Math.hypot(L[i][0]-L[i-1][0],L[i][1]-L[i-1][1]));let g=0,j=0;
 for(let i=0;i<L.length;i++){while(j<L.length-1&&s[j]-s[i]<9.144)j++;if(s[j]-s[i]>=9)g=Math.max(g,Math.abs(z[j]-z[i])/(s[j]-s[i]))}return {ft:s[s.length-1]/FT,rise:(z[z.length-1]-z[0])/FT,grade:g*100,L}}
function traceSP(p){const H=ED.groups&&ED.groups.house;if(!H)return [p[0],p[1]];const dx=p[0]-H.pivot[0],dy=p[1]-H.pivot[1];return [+(H.pivot_sp_ft[0]+(dx*EAST.x+dy*EAST.y)/FT).toFixed(1),+(H.pivot_sp_ft[1]+(dx*NORTH.x+dy*NORTH.y)/FT).toFixed(1)]}
function traceDraw(){for(const m of TR.objs){scene.remove(m);m.geometry.dispose()}TR.objs=[];const L=traceLine(),n=L.length,w=0.9,dm=new THREE.MeshBasicMaterial({color:0xff7a1a});
 for(const p of TR.pts){const d=new THREE.Mesh(new THREE.SphereGeometry(0.75,12,10),dm);d.position.set(p[0],groundAt(p[0],p[1])+0.5,p[1]);scene.add(d);TR.objs.push(d)}if(n<2){traceVis();return}
 const pos=new Float32Array(n*6),ix=[];for(let i=0;i<n;i++){const a=L[Math.max(0,i-1)],b=L[Math.min(n-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const q=Math.hypot(dx,dy)||1;dx/=q;dy/=q;const lx=L[i][0]-dy*w,ly=L[i][1]+dx*w,rx=L[i][0]+dy*w,ry=L[i][1]-dx*w;
  pos.set([lx,groundAt(lx,ly)+0.24,ly,rx,groundAt(rx,ry)+0.24,ry],i*6);if(i<n-1){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(ix);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.renderOrder=2;m.frustumCulled=false;scene.add(m);TR.objs.push(m);traceVis()}
function traceVis(){for(const m of TR.objs)m.visible=TR.show}
function traceShow(v){TR.show=!!v;store.set('abf3d.traceShow',TR.show);if(!TR.show)TR.on=false;traceVis();traceUI()}
function traceText(){const st=traceStats();if(!st)return '';return ['AIKEN BASSERIE AND FARM — MY TRACED ROUTE','',TR.pts.length+' points, '+Math.round(st.ft).toLocaleString('en-US')+' ft, '+(st.rise>=0?'rises ':'drops ')+Math.abs(st.rise).toFixed(0)+' ft, steepest 30 ft stretch '+st.grade.toFixed(1)+'%','Paste everything here into the chat with Claude.','','DATA '+JSON.stringify({v:1,route_sp_ft:TR.pts.map(traceSP)})].join('\n')}
function traceUI(){const el=$('trbtn');if(!el)return;el.textContent='';const st=traceStats(),n=TR.pts.length;$('trinfo').textContent=st?tr('trSum',{n,d:dist(st.ft),r:(st.rise>=0?'+':'−')+Math.abs(st.rise).toFixed(0)+' ft',g:st.grade.toFixed(1)}):tr(TR.on?'trOn':'trHelp');canvas.style.cursor=TR.on?'crosshair':'';
 const b=chip(el,tr(TR.on?'trStop':'trStart'),TR.on,()=>{TR.on=!TR.on;if(TR.on){stopDrive();toast(tr('trOn'));if(!TR.show){TR.show=true;store.set('abf3d.traceShow',true);traceVis()}}traceUI()});b.setAttribute('aria-pressed',TR.on);
 if(n){const sb=chip(el,tr('trShow'),TR.show,()=>traceShow(!TR.show));sb.setAttribute('aria-pressed',TR.show);chip(el,tr('trUndo'),false,()=>{TR.pts.pop();traceSave()});chip(el,tr('trClear'),false,()=>{TR.pts=[];traceSave()})}
 if(n>1)chip(el,tr('trCopy'),false,()=>{const t=traceText(),o=$('trout');o.hidden=false;o.value=t;const done=ok=>{$('trcopied').textContent=ok?tr('copied'):tr('copyfail');if(!ok){o.focus();o.select()}};try{navigator.clipboard.writeText(t).then(()=>done(true),()=>done(false))}catch(e){done(false)}})}
function traceSave(){store.set('abf3d.trace',TR.pts);traceDraw();traceUI()}
window.__trace=o=>{if(o==='show')traceShow(true);else if(o==='hide')traceShow(false);if(o==='on'){TR.on=true;traceUI()}else if(o==='off'){TR.on=false;traceUI()}else if(o==='clear'){TR.pts=[];traceSave()}return {on:TR.on,show:TR.show,vis:TR.objs.filter(m=>m.visible).length,n:TR.pts.length,st:(q=>q&&{ft:Math.round(q.ft),rise:+q.rise.toFixed(1),grade:+q.grade.toFixed(1)})(traceStats()),text:traceText()}};
// ---------- click to see what something is
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
function pick(e){if(SCOUT&&typeof scPick==='function'&&scPick(e))return;if(walkPick(e))return;if(TR.on){const h=groundHit(e);if(h){TR.pts.push([+h[0].toFixed(2),+h[1].toFixed(2)]);traceSave()}return}
 const r=canvas.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,cam);
 const hs=ray.intersectObjects(picks.filter(m=>m.visible),false),h=hs[0];if(!h){toast('');return}const u=h.object.userData;
 const fh=fishMesh?hs.find(q=>q.object===fishMesh):null;if(fh&&(h.object===fishMesh||(u.water&&fh.distance-h.distance<5))){const f=FISH[fh.instanceId];toast(tr('fishTip',{s:trn('sp',f.sp.sk),v:f.vr?' ('+f.vr+')':'',n:Math.round(f.L/0.0254)}));return}
 if(u.rng){const n=nameAt(h.object,h.faceIndex);toast((/^(Existing|Proposed)/.test(n)?'':'Carolina Safari Suites: ')+n);return}
 if(u.tipf){toast(u.tipf());return}toast('')}

// ---------- views
function fitView(v){   // a view marked fit is pulled back or in until every property corner is on screen, whatever the screen's shape
 if(!v.fit||!S.boundary)return v;const port=canvas.clientWidth<canvas.clientHeight*0.9,t=new THREE.Vector3(...v.t);let p=new THREE.Vector3(...(port&&v.pp?v.pp:v.p));
 const tf=Math.tan(cam.fov*Math.PI/360),W_=canvas.clientWidth,asp=W_/Math.max(1,canvas.clientHeight),up=new THREE.Vector3(0,1,0);
 const open_=i=>!$(i).classList.contains('is-folded')&&$(i).style.display!=='none',side=W_>760?(open_('bar')?375:0)+(open_('edit')?355:0):0;
 const xl=W_>760?Math.max(0.35,(1-side/W_)*0.94):0.9,yl=W_>760?0.86:0.72;
 for(let it=0;it<5;it++){const f=t.clone().sub(p).normalize(),r=new THREE.Vector3().crossVectors(f,up).normalize(),u=new THREE.Vector3().crossVectors(r,f);let m=0;
  for(const c of S.boundary.corners){const d=new THREE.Vector3(c[0],c[2],c[1]).sub(p),z=d.dot(f);if(z<=1){m=3;break}m=Math.max(m,Math.abs(d.dot(r)/(z*tf*asp))/xl,Math.abs(d.dot(u)/(z*tf))/yl)}
  p=t.clone().add(p.sub(t).multiplyScalar(Math.max(0.3,Math.min(3,m))))}
 return {p:[p.x,p.y,p.z],t:v.t}}
function flyTo(v0){const v=fitView(v0),p0=cam.position.clone(),t0=ctrl.target.clone(),p1=new THREE.Vector3(...v.p),t1=new THREE.Vector3(...v.t),s=performance.now();fly=()=>{const k=Math.min(1,(performance.now()-s)/900),e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  const p=p0.clone().lerp(p1,e),t=t0.clone().lerp(t1,e);ctrl.set([p.x,p.y,p.z],[t.x,t.y,t.z]);if(k>=1){fly=null;if(v0.orbit)startOrbit(v0)}}}
let ORB=null;
function orbitAt(q){const o=ORB;ctrl.sph.theta=o.th0+o.d*q;if(o.ph1!==undefined)ctrl.sph.phi=o.ph0+(o.ph1-o.ph0)*q;if(o.rk)ctrl.sph.radius=o.r0*(1+(o.rk-1)*q);ctrl.update()}
function startOrbit(v){const o=v.orbit;ORB={th0:ctrl.sph.theta,ph0:ctrl.sph.phi,r0:ctrl.sph.radius,d:o.d,ph1:o.ph1,rk:o.rk};let acc=0,last=performance.now();fly=()=>{const now=performance.now();acc+=Math.min(0.06,(now-last)/1000);last=now;const e=acc-o.hold;if(e<0)return;const k=Math.min(1,e/o.dur);orbitAt(k*k*(3-2*k));if(k>=1)fly=null}}
window.__orbit=k=>{if(!ORB)return null;fly=null;orbitAt(k);return k};
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight,pr=renderer.getPixelRatio();if(canvas.width!==Math.floor(w*pr)||canvas.height!==Math.floor(h*pr)){renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
 const px=0.15*h*pr/(2*Math.tan(cam.fov*Math.PI/360));for(const f of Fn)f.mat.uniforms.uPx.value=px;for(const b of bursts)b.material.uniforms.uPx.value=px*0.75;TPX.value=px/0.15}
const _b=new THREE.Vector3(),_f2=new THREE.Vector2();
let lastT=0;
function loop(){requestAnimationFrame(loop);resize();if(fly)fly();const now=performance.now(),t=now/1000,dt=lastT?t-lastT:0.016;lastT=t;
 skyU.uTime.value=t;WU.uTime.value=t;sky.position.copy(cam.position);
 if(Fn.some(f=>f.light==='change')&&NIGHT>0.02)lightFountains(t);
 if(ctrl&&now-lastShadow>260){const tg=ctrl.target,r=Math.min(600,Math.max(40,ctrl.sph.radius*1.3));
  if(shadowDirty||!shF||Math.hypot(tg.x-shF.x,tg.z-shF.z)>shF.r*0.3||r>shF.r*1.5||r<shF.r*0.6)fitShadow()}
 if(driveS>=0)stepDrive(Math.min(dt,0.05));
 updateFish(dt,t);tubTick(t);guestTick(t);efTick();ltTick(t);cstlTick();if(SCOUT&&typeof scTick==='function')scTick(t,dt);walkTick(dt);sndTick(t);
 renderer.render(scene,cam);
 cam.getWorldDirection(_b);_f2.set(_b.x,_b.z);if(_f2.length()>1e-3){const brg=Math.atan2(_f2.dot(EAST),_f2.dot(NORTH))*180/Math.PI;$('needle').setAttribute('transform','rotate('+(-brg).toFixed(1)+')')}}
// ---------- V-6 hot tubs at Units A to D: moving water, bubbles and steam
const TUBS=[],SHELLS=[],tubObjs=[],TPX={value:900},TU={uTime:WU.uTime,uPx:TPX,uLight:{value:1},uGlow:{value:0},uR:{value:0.95},uH:{value:1.45},uWind:{value:new THREE.Vector2(0.1,0.05)},uCol:{value:new THREE.Color(1,1,1)},uAlpha:{value:0.11}};
const TW_V=`uniform float uTime;varying vec2 vP;void main(){vP=position.xz;float r=length(vP);vec3 p=position;p.y+=0.010*sin(vP.x*9.0+uTime*5.1)*cos(vP.y*8.0-uTime*4.3)+0.008*sin(r*14.0-uTime*7.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
const TW_F=`uniform float uTime,uR,uLight,uGlow;varying vec2 vP;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}
void main(){float r=length(vP)/uR,t=uTime,jets=0.0;for(int k=0;k<6;k++){float a=float(k)*1.0472+0.3;vec2 j=vec2(cos(a),sin(a))*uR*0.6;float d=length(vP-j)/uR;jets+=exp(-d*d*20.0);}
 float f1=n(vP*9.0+vec2(t*0.9,-t*0.7)),f2=n(vP*21.0-vec2(t*1.7,t*1.3)),f3=n(vP*46.0+vec2(-t*2.6,t*2.2));
 float foam=smoothstep(0.50,0.84,f1*0.5+f2*0.32+f3*0.18+jets*0.40+0.08*sin(t*3.0+r*9.0));
 vec3 c=mix(vec3(0.06,0.40,0.50),vec3(0.34,0.76,0.83),0.3+0.7*f1*(0.6+0.4*jets));c=mix(c,vec3(0.96,0.99,1.0),foam*0.85);
 c*=uLight;c+=uGlow*(vec3(0.08,0.50,0.72)*(1.0-0.45*r)+foam*vec3(0.22,0.36,0.42));
 gl_FragColor=vec4(c,0.95*smoothstep(1.0,0.95,r));}`;
const TB_V=`attribute vec3 aQ;uniform float uTime,uPx;varying float vA;void main(){float ph=fract(uTime/aQ.y+aQ.x);vec3 p=position;p.y+=0.012+0.06*ph*ph;float s=aQ.z*(0.5+0.9*ph);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;float px=uPx*s/max(0.5,-mv.z);gl_PointSize=clamp(px,1.0,16.0);vA=sin(ph*3.1416)*smoothstep(0.8,1.6,px);}`;
const TB_F=`uniform float uLight,uGlow;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;float a=smoothstep(0.5,0.42,d)*(0.3+0.7*smoothstep(0.18,0.45,d));gl_FragColor=vec4(vec3(min(1.0,uLight+uGlow*0.6)),a*vA*0.85);}`;
const TS_V=`attribute vec3 aQ;attribute vec3 aD;uniform float uTime,uPx,uH;uniform vec2 uWind;varying float vA;void main(){float ph=fract(uTime/aQ.y+aQ.x);vec3 p=position;float e=1.0-(1.0-ph)*(1.0-ph);p.y+=0.06+uH*e;
 p.xz+=(uWind+aD.xy*0.3)*ph*ph*1.3+0.07*vec2(sin(uTime*0.7+aD.z*6.28),cos(uTime*0.6+aD.z*4.0))*ph;float s=aQ.z*(0.4+1.4*ph);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(uPx*s/max(0.5,-mv.z),0.0,200.0);vA=smoothstep(0.0,0.14,ph)*(1.0-smoothstep(0.4,1.0,ph));}`;
const TS_F=`uniform vec3 uCol;uniform float uAlpha;varying float vA;void main(){float d=length(gl_PointCoord-0.5)*2.0;float a=exp(-d*d*3.0)*(1.0-smoothstep(0.75,1.0,d));gl_FragColor=vec4(uCol,a*vA*uAlpha);}`;
function buildTubs(){if(!TUBS.length)return;const R=TUBS[0].r;
 for(const T of TUBS)for(const h of SHELLS)if(Math.hypot(h.x-T.x,h.z-T.z)<0.4)T.y=Math.max(T.y,h.y);   // the spa shell is drawn solid, so the moving water sits at its rimTU.uR.value=R;
 const RN=7,SN=40,pos=[],idx=[];pos.push(0,0,0);for(let i=1;i<=RN;i++)for(let j=0;j<SN;j++){const a=j/SN*6.2832,r=R*i/RN;pos.push(r*Math.cos(a),0,r*Math.sin(a))}
 for(let j=0;j<SN;j++)idx.push(0,1+(j+1)%SN,1+j);for(let i=1;i<RN;i++)for(let j=0;j<SN;j++){const a=1+(i-1)*SN+j,b=1+(i-1)*SN+(j+1)%SN,c=a+SN,d=b+SN;idx.push(a,b,c,b,d,c)}
 const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));wg.setIndex(idx);
 const wm=new THREE.ShaderMaterial({uniforms:TU,vertexShader:TW_V,fragmentShader:TW_F,transparent:true,side:THREE.DoubleSide});
 const bm=new THREE.ShaderMaterial({uniforms:TU,vertexShader:TB_V,fragmentShader:TB_F,transparent:true,depthWrite:false});
 const sm_=new THREE.ShaderMaterial({uniforms:TU,vertexShader:TS_V,fragmentShader:TS_F,transparent:true,depthWrite:false});
 let q=7919;const rnd=()=>{q=(q*16807)%2147483647;return q/2147483647};
 for(const T of TUBS){const w=new THREE.Mesh(wg,wm);w.position.set(T.x,T.y+0.032,T.z);w.renderOrder=4;scene.add(w);tubObjs.push(w);
  const NB=MOBILE?70:150,bp=new Float32Array(NB*3),bq=new Float32Array(NB*3);
  for(let i=0;i<NB;i++){let x,z;if(rnd()<0.7){const a=((rnd()*6)|0)*1.0472+0.3,rr=R*0.6,o=R*0.2*Math.sqrt(rnd()),b=rnd()*6.2832;x=Math.cos(a)*rr+Math.cos(b)*o;z=Math.sin(a)*rr+Math.sin(b)*o}else{const a=rnd()*6.2832,rr=R*0.92*Math.sqrt(rnd());x=Math.cos(a)*rr;z=Math.sin(a)*rr}
   bp[i*3]=x;bp[i*3+2]=z;bq[i*3]=rnd();bq[i*3+1]=0.35+rnd()*0.7;bq[i*3+2]=0.018+rnd()*0.03}
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(bp,3));bg.setAttribute('aQ',new THREE.BufferAttribute(bq,3));const b=new THREE.Points(bg,bm);b.position.copy(w.position);b.frustumCulled=false;b.renderOrder=5;scene.add(b);tubObjs.push(b);
  const NS=MOBILE?26:56,sp=new Float32Array(NS*3),sq=new Float32Array(NS*3),sd=new Float32Array(NS*3);
  for(let i=0;i<NS;i++){const a=rnd()*6.2832,rr=R*0.85*Math.sqrt(rnd());sp[i*3]=Math.cos(a)*rr;sp[i*3+2]=Math.sin(a)*rr;sq[i*3]=rnd();sq[i*3+1]=4+rnd()*3.5;sq[i*3+2]=0.3+rnd()*0.3;const d=rnd()*6.2832;sd[i*3]=Math.cos(d);sd[i*3+1]=Math.sin(d);sd[i*3+2]=rnd()}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));sg.setAttribute('aQ',new THREE.BufferAttribute(sq,3));sg.setAttribute('aD',new THREE.BufferAttribute(sd,3));const s=new THREE.Points(sg,sm_);s.position.copy(w.position);s.frustumCulled=false;s.renderOrder=7;scene.add(s);tubObjs.push(s)}}
function tubTick(t){if(!TUBS.length)return;if(hotMat)hotMat.emissiveIntensity=0.3+0.25*Math.sin(t*2.6);if(pourM){const w=1+0.12*Math.sin(t*23)+0.08*Math.sin(t*37.3);pourM.scale.x=w;pourM.scale.z=1+0.12*Math.sin(t*19+1)+0.08*Math.sin(t*31);pourF.scale.setScalar(1+0.18*Math.sin(t*11)+0.1*Math.sin(t*17.7));pourF.material.opacity=(0.55+0.2*Math.sin(t*13))*(0.35+0.65*DAY)}TU.uLight.value=0.16+0.84*DAY;TU.uGlow.value=NIGHT*0.85;TU.uAlpha.value=0.15+0.07*NIGHT;TU.uCol.value.setRGB(0.42+0.58*DAY,0.50+0.50*DAY,0.58+0.42*DAY);
 TU.uWind.value.set(0.16*Math.sin(t*0.11)+0.08,0.12*Math.cos(t*0.07))}

// ---------- V-7 Blue and Terry on a digital stay at Unit D: simple figures together in the hot tub, first names only.
// The joke: Terry rips up an invoice and throws the pieces over the rail into the pond, over and over.
let GA=null;
function limb(a,b,r,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r*0.9,r,1,10),mat);setLimb(m,a,b);return m}
const _up=new THREE.Vector3(0,1,0),_ld=new THREE.Vector3();
function setLimb(m,a,b){_ld.subVectors(b,a);const L=Math.max(1e-4,_ld.length());m.position.copy(a).addScaledVector(_ld,0.5);m.scale.set(1,L,1);m.quaternion.setFromUnitVectors(_up,_ld.multiplyScalar(1/L))}
function invoiceTex(I){const cv=document.createElement('canvas');cv.width=256;cv.height=330;const x=cv.getContext('2d');x.fillStyle=I.paper;x.fillRect(0,0,256,330);x.fillStyle=I.ink;x.fillRect(150,10,98,24);x.fillRect(6,88,244,14);
 x.fillStyle='#fff';x.font='700 15px Inter, Arial, sans-serif';x.textAlign='center';x.fillText('INVOICE',199,28);x.strokeStyle=I.ink;x.lineWidth=1.5;x.strokeRect(6,40,112,34);x.strokeRect(124,34,126,44);x.lineWidth=0.8;
 for(let y=116;y<280;y+=12){x.beginPath();x.moveTo(8,y);x.lineTo(248,y);x.stroke()}x.strokeStyle='#1d2430';x.lineWidth=1.6;x.beginPath();x.moveTo(20,126);x.bezierCurveTo(60,118,90,132,150,124);x.stroke();
 x.fillStyle='#1d2430';x.font='italic 700 22px Georgia, serif';x.textAlign='right';x.fillText(I.amount,236,150);x.font='italic 700 15px Georgia, serif';x.fillText(I.amount,200,312);x.strokeStyle=I.ink;x.lineWidth=0.8;x.beginPath();x.moveTo(8,316);x.lineTo(248,316);x.stroke();
 const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
function piece(tex,w,h,u0,u1,v0,v1,fade){const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,u0+(u1-u0)*uv.getX(i),v0+(v1-v0)*uv.getY(i));
 return new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:0.9,transparent:!!fade}))}
function speechBubble(text){const cv=document.createElement('canvas');cv.width=720;cv.height=230;const x=cv.getContext('2d'),r=34;x.fillStyle='#ffffff';x.strokeStyle='#1c2420';x.lineWidth=7;
 x.beginPath();x.moveTo(r+6,6);x.lineTo(714-r,6);x.quadraticCurveTo(714,6,714,6+r);x.lineTo(714,170-r);x.quadraticCurveTo(714,170,714-r,170);x.lineTo(210,170);x.lineTo(150,224);x.lineTo(160,170);x.lineTo(r+6,170);x.quadraticCurveTo(6,170,6,170-r);x.lineTo(6,6+r);x.quadraticCurveTo(6,6,r+6,6);x.closePath();x.fill();x.stroke();
 x.fillStyle='#1c2420';x.textAlign='center';x.font='700 44px Inter, Arial, sans-serif';const w=text.split(' '),L=[''];for(const q of w){const t=(L[L.length-1]+' '+q).trim();if(x.measureText(t).width>650&&L[L.length-1])L.push(q);else L[L.length-1]=t}L.slice(0,2).forEach((l,i)=>x.fillText(l,360,(L.length>1?72:104)+i*58));
 const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,depthTest:false,opacity:0}));sp.center.set(0.22,0);sp.scale.set(1.0,0.32,1);sp.renderOrder=20;return sp}
function sayLine(A){const G=S.guests,ln=G&&G.line;if(!ln||VIS||!SND.say||!A.g.visible||!SND.on||!SND.grp.farm||!SND.ctx||SND.ctx.state!=='running'||document.hidden)return;if(cam.position.distanceTo(A.g.position)>30)return;
 try{const sy=window.speechSynthesis;if(!sy||!window.SpeechSynthesisUtterance)return;const u=new SpeechSynthesisUtterance(ln.text),vs=sy.getVoices().filter(v=>/^en/i.test(v.lang)),v=vs.find(v=>/male|david|daniel|alex|fred|guy|mark|george|aaron/i.test(v.name)&&!/female/i.test(v.name))||vs.find(v=>/US|United States/i.test(v.name+v.lang))||vs[0];if(v)u.voice=v;u.lang='en-US';u.pitch=0.7;u.rate=0.95;u.volume=Math.min(1,SND.vol*1.3);sy.cancel();sy.speak(u)}catch(e){}}
function guestSign(G,T){const sg=G.sign;if(!sg)return;const cv=document.createElement('canvas');cv.width=512;cv.height=320;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const paint=()=>{const x=cv.getContext('2d');x.fillStyle='#f4ecd8';x.fillRect(0,0,512,320);x.strokeStyle='#2f4a34';x.lineWidth=14;x.strokeRect(14,14,484,292);x.fillStyle='#2f4a34';x.textAlign='center';x.font='700 58px Cinzel, Georgia, serif';x.fillText(sg.lines[0],256,118);
  x.fillStyle='#8a2a22';x.font='700 76px Cinzel, Georgia, serif';x.fillText(sg.lines[1],256,232,440);tex.needsUpdate=true};paint();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(paint);
 const g=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:0x5a4030,roughness:0.85}),PH=sg.post_m||1.3,BY=PH-0.2,post=new THREE.Mesh(new THREE.BoxGeometry(0.06,PH,0.06),wood);post.position.y=PH/2;post.castShadow=true;g.add(post);
 const back=new THREE.Mesh(new THREE.BoxGeometry(0.66,0.42,0.03),wood);back.position.set(0,BY,0.03);back.castShadow=true;g.add(back);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.3875),new THREE.MeshStandardMaterial({map:tex,roughness:0.7}));face.position.set(0,BY,0.047);g.add(face);if(sg.two_sided){const f2=new THREE.Mesh(face.geometry,face.material);f2.position.set(0,BY,0.013);f2.rotation.y=Math.PI;g.add(f2)}
 g.position.set(sg.plan_m[0],sg.deck_z_m,sg.plan_m[1]);g.rotation.y=Math.atan2(G.look_plan[0],G.look_plan[1]);scene.add(g);tubObjs.push(g)}
let hotMat=null,pourM=null,pourF=null;
function buildProps(G,T){const std=(c,r,m)=>new THREE.MeshStandardMaterial({color:c,roughness:r||0.6,metalness:m||0.1}),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 for(const P of (G.props||[])){if(P.kind!=='water_heater')continue;const g=new THREE.Group(),r=P.d_m/2,h=P.h_m,tip=()=>tr('tWH',{m:P.model,i:P.lowes_item}),add=(m,par)=>{m.castShadow=true;m.userData={tipf:tip};(par||g).add(m);picks.push(m);return m};
  add(new THREE.Mesh(new THREE.CylinderGeometry(r*1.25,r*1.25,0.03,28),std('#8d9296',0.5,0.5))).position.y=0.015;
  add(new THREE.Mesh(new THREE.CylinderGeometry(r,r,h*0.7,32),std('#dfe2e3',0.45))).position.y=0.03+h*0.35;
  add(new THREE.Mesh(new THREE.CylinderGeometry(r*1.03,r*1.03,0.025,32),std('#1d2023',0.5))).position.y=0.03+h*0.7;
  add(new THREE.Mesh(new THREE.CylinderGeometry(r*1.02,r*1.02,h*0.27,32),std('#3d4247',0.55))).position.y=0.03+h*0.835;
  for(let k=0;k<5;k++)add(new THREE.Mesh(new THREE.CylinderGeometry(r*1.035,r*1.035,0.012,32),std('#16181a',0.6))).position.y=0.03+h*(0.76+k*0.035);
  add(new THREE.Mesh(new THREE.CylinderGeometry(r*0.96,r*1.02,0.035,32),std('#2c3034',0.5))).position.y=0.03+h*0.97+0.017;
  const cp=add(new THREE.Mesh(new THREE.BoxGeometry(0.17,0.1,0.03),std('#15171a',0.4)));cp.position.set(0,0.03+h*0.62,r);const led=add(new THREE.Mesh(new THREE.BoxGeometry(0.05,0.02,0.005),new THREE.MeshStandardMaterial({color:'#52e08a',emissive:'#52e08a',emissiveIntensity:1.2})));led.position.set(0,0.03+h*0.62,r+0.017);
  const pl=add(new THREE.Mesh(new THREE.BoxGeometry(0.2,0.13,0.006),std('#f4f1e6',0.7)));pl.position.set(0,0.03+h*0.4,r+0.002);
  if(P.label){const cv=document.createElement('canvas');cv.width=640;cv.height=224;const x=cv.getContext('2d');x.fillStyle='#fbf7ea';x.fillRect(0,0,640,224);x.strokeStyle='#b3122e';x.lineWidth=12;x.strokeRect(12,12,616,200);x.fillStyle='#1c1c1c';x.textAlign='center';x.textBaseline='middle';let fs=120;do{x.font='700 '+fs+'px Georgia,"Times New Roman",serif';fs-=4}while(x.measureText(P.label).width>570&&fs>40);x.fillText(P.label,320,116);
   const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=8;const lm=new THREE.MeshStandardMaterial({map:tx,roughness:0.6,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:0.12}),ar=1.0,lh=ar*r*1.006*224/640;
   for(const t0 of [1.037-ar/2,3.131-ar/2,5.226-ar/2]){const lb=add(new THREE.Mesh(new THREE.CylinderGeometry(r*1.006,r*1.006,lh,24,1,true,t0,ar),lm));lb.position.y=0.03+h*0.51;lb.castShadow=false}}   // V-15: the owner's label, three times round the tank so it reads from any side
  g.position.set(P.plan_m[0],P.deck_z_m,P.plan_m[1]);g.rotation.y=Math.atan2(G.look_plan[0],G.look_plan[1]);scene.add(g);tubObjs.push(g);
  // plumbed to the tub (owner 10:47): hot (red) and cold (blue) lines run overhead to a two-handle galvanized mixing valve just above the water; the spout pours into the tub; a hanger from the Lounge roof carries the run
  const dx=P.plan_m[0]-T.x,dz=P.plan_m[1]-T.z,dl=Math.hypot(dx,dz),ux=dx/dl,uz=dz/dl,px=-uz,pz=ux,yT=P.deck_z_m+0.03+h+0.035,yU=yT+0.2,yV=T.y+((P.faucet&&P.faucet.above_water_m)||0.3);
  const galv=new THREE.MeshStandardMaterial({color:'#a3a9ae',roughness:0.55,metalness:0.65}),cold=std('#2b62b3',0.5);hotMat=new THREE.MeshStandardMaterial({color:'#b3261e',roughness:0.5,emissive:'#ff3b1f',emissiveIntensity:0.3});
  const put=(m)=>{m.castShadow=true;m.userData={tipf:tip};scene.add(m);picks.push(m);tubObjs.push(m);return m},rr=T.r*0.97,VC=V(T.x+ux*rr,yV,T.z+uz*rr);
  for(const [sd,mat] of [[1,hotMat],[-1,cold]]){const ox=px*0.09*sd,oz=pz*0.09*sd,A=V(P.plan_m[0]+ox,yT,P.plan_m[1]+oz),B=V(A.x,yU,A.z),C=V(VC.x+ox,yU,VC.z+oz),D=V(C.x,yV+0.02,C.z);
   for(const [a,b] of [[A,B],[B,C],[C,D]])put(limb(a,b,0.019,mat));for(const q of [B,C]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.022,10,8),mat);e.position.copy(q);put(e)}
   // handle: stem and a cross, with a hot or cold button on top
   const Hs=V(VC.x+ox*1.25,yV,VC.z+oz*1.25),Ht=V(Hs.x-ux*0.02,yV+0.075,Hs.z-uz*0.02);put(limb(Hs,Ht,0.012,galv));put(limb(V(Ht.x-px*0.045,Ht.y,Ht.z-pz*0.045),V(Ht.x+px*0.045,Ht.y,Ht.z+pz*0.045),0.008,galv));put(limb(V(Ht.x-ux*0.045,Ht.y,Ht.z-uz*0.045),V(Ht.x+ux*0.045,Ht.y,Ht.z+uz*0.045),0.008,galv));
   const bt=new THREE.Mesh(new THREE.SphereGeometry(0.014,10,8),mat);bt.position.set(Ht.x,Ht.y+0.012,Ht.z);put(bt)}
  put(limb(V(VC.x-px*0.135,yV,VC.z-pz*0.135),V(VC.x+px*0.135,yV,VC.z+pz*0.135),0.028,galv));   // valve body
  const S1=V(VC.x-ux*0.17,yV-0.015,VC.z-uz*0.17),S2=V(S1.x-ux*0.02,yV-0.075,S1.z-uz*0.02);put(limb(VC,S1,0.02,galv));put(limb(S1,S2,0.019,galv));const sj=new THREE.Mesh(new THREE.SphereGeometry(0.021,10,8),galv);sj.position.copy(S1);put(sj);
  // the water pouring out, and the foam where it lands
  pourM=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.02,1,12,1,true),new THREE.MeshStandardMaterial({color:'#cfeef6',roughness:0.15,transparent:true,opacity:0.8,emissive:'#3aa7c4',emissiveIntensity:0.15}));setLimb(pourM,V(S2.x,T.y+0.03,S2.z),S2);pourM.userData={tipf:tip,L:S2.y-T.y-0.03};scene.add(pourM);tubObjs.push(pourM);
  pourF=new THREE.Mesh(new THREE.CircleGeometry(0.085,20),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.8,depthWrite:false}));pourF.rotation.x=-Math.PI/2;pourF.position.set(S2.x,T.y+0.062,S2.z);pourF.renderOrder=6;scene.add(pourF);tubObjs.push(pourF);
  // hanger from the canopy at the middle of the overhead run: a ring round both lines on a rod up to the roof
  const Mx=(P.plan_m[0]+VC.x)/2,Mz=(P.plan_m[1]+VC.z)/2,ring_=new THREE.Mesh(new THREE.TorusGeometry(0.118,0.008,8,28),galv);ring_.position.set(Mx,yU,Mz);ring_.rotation.y=Math.atan2(ux,uz);put(ring_);
  const top=(P.roof_under_z_m||yU+0.9);put(limb(V(Mx,yU+0.118,Mz),V(Mx,top,Mz),0.006,galv));const plate=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.012,0.09),galv);plate.position.set(Mx,top-0.006,Mz);put(plate)}}
function buildGuests(){const G=S.guests;if(!G||!TUBS.length)return;const T=TUBS.find(t=>t.u===G.unit);if(!T)return;const lx=G.look_plan[0],lz=G.look_plan[1],SEAT=0.6,PHI=0.55,pzW=PONDZ['Pond 1'];
 let tx=lx,tz=lz,td=4,bd=1e9;for(let a=-1.6;a<=1.61;a+=0.2){const dx=lx*Math.cos(a)+lz*Math.sin(a),dz=lz*Math.cos(a)-lx*Math.sin(a);for(let d=2;d<10;d+=0.25){if(groundAt(T.x+dx*d,T.z+dz*d)<pzW-0.08){if(d+Math.abs(a)*0.8<bd){bd=d+Math.abs(a)*0.8;tx=dx;tz=dz;td=d}break}}}   // the nearest open water he can throw to
 const std=(c,r)=>new THREE.MeshStandardMaterial({color:c,roughness:r||0.8,metalness:0.02}),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 for(const P of G.people){const g=new THREE.Group(),k=P.build||1,skin=std(P.skin,0.62),tip=()=>tr('tGuest',{n:P.name}),add=m=>{m.castShadow=true;m.userData={tipf:tip};g.add(m);picks.push(m);return m};
  const sh=add(new THREE.Mesh(new THREE.SphereGeometry(1,18,12),skin));sh.scale.set(0.215*k,0.115,0.12*k);sh.position.set(0,0.1,0);
  const ch=add(new THREE.Mesh(new THREE.CylinderGeometry(0.165*k,0.15*k,0.3,16),P.top?std(P.top):skin));ch.position.set(0,-0.1,0);
  if(P.top){const tm=std(P.top);for(const s of [-1,1]){add(limb(V(s*0.085,0.04,0.105*k),V(s*0.1,0.212,0.0),0.012,tm));add(limb(V(s*0.1,0.212,0.0),V(s*0.085,0.04,-0.105*k),0.012,tm))}}
  add(limb(V(0,0.17,0),V(0,0.285,0.006),0.05*k,skin));
  const hd=add(new THREE.Mesh(new THREE.SphereGeometry(0.105,20,16),skin));hd.scale.set(0.95,1.14,1.02);hd.position.set(0,0.385,0.012);
  const eye=std('#1c1410',0.35);for(const s of [-1,1]){const e=add(new THREE.Mesh(new THREE.SphereGeometry(0.011,8,6),eye));e.position.set(s*0.038,0.398,0.108)}
  const hair=std(P.hair,0.92);
  if(P.hair_style==='long curls'){const cap=add(new THREE.Mesh(new THREE.SphereGeometry(0.116,18,12,0,6.2832,0,1.7),hair));cap.position.set(0,0.39,-0.012);cap.rotation.x=-0.3;
   let q=4441;const rnd=()=>{q=(q*16807)%2147483647;return q/2147483647};
   for(let row=0;row<5;row++)for(const th of [1.25,1.85,2.45,3.14,-2.45,-1.85,-1.25]){const rr=0.108+0.02*row+rnd()*0.012,cu=add(new THREE.Mesh(new THREE.SphereGeometry(0.052+rnd()*0.02,10,8),hair));cu.position.set(Math.sin(th)*rr,0.44-row*0.085+rnd()*0.02,Math.cos(th)*rr-0.01)}
   for(const [x,y,z,r] of [[-0.07,0.475,0.07,0.05],[0.02,0.492,0.06,0.048],[0.085,0.455,0.055,0.045],[-0.105,0.41,0.055,0.045]]){const cu=add(new THREE.Mesh(new THREE.SphereGeometry(r,10,8),hair));cu.position.set(x,y,z)}
   if(P.band){const b=add(new THREE.Mesh(new THREE.TorusGeometry(0.112,0.011,8,28),std(P.band)));b.position.set(0,0.4,0.0);b.rotation.x=Math.PI/2-0.5}}
  else{const cap=add(new THREE.Mesh(new THREE.SphereGeometry(0.1075,18,12,0,6.2832,0,1.2),hair));cap.scale.set(0.95,1.14,1.02);cap.position.set(0,0.385,0.008);cap.rotation.x=-0.28}
  if(P.beard){const bm=std(P.beard,0.95),go=add(new THREE.Mesh(new THREE.SphereGeometry(0.046,12,10),bm));go.scale.set(1.15,0.85,0.6);go.position.set(0,0.3,0.088);const mu=add(new THREE.Mesh(new THREE.BoxGeometry(0.075,0.014,0.02),bm));mu.position.set(0,0.343,0.106)}
  const a=Math.atan2(-lx,-lz)+P.side*PHI,sx=T.x+Math.sin(a)*SEAT,sz=T.z+Math.cos(a)*SEAT,ry=Math.atan2(T.x-sx,T.z-sz);g.position.set(sx,T.y+0.032,sz);g.rotation.y=ry;scene.add(g);tubObjs.push(g);
  if(!P.throws){   // resting: the outer arm lies along the rim
   const s=P.side,S0=V(s*0.2*k,0.1,-0.02),E=V(s*0.33,0.05,-0.33),Hn=V(s*0.6,0.045,-0.2);add(limb(S0,E,0.043*k,skin));add(limb(E,Hn,0.036*k,skin));const h=add(new THREE.Mesh(new THREE.SphereGeometry(0.042*k,10,8),skin));h.position.copy(Hn);const j=add(new THREE.Mesh(new THREE.SphereGeometry(0.043*k,10,8),skin));j.position.copy(E);continue}
  // the one who throws: both arms move, an invoice in the hands, a stack of them on the rim, torn pieces flying out over the pond
  const I=G.invoice,tex=invoiceTex(I),arm=s=>({s,up:add(limb(V(0,0,0),V(0,1,0),0.043*k,skin)),fo:add(limb(V(0,0,0),V(0,1,0),0.036*k,skin)),el:add(new THREE.Mesh(new THREE.SphereGeometry(0.043*k,10,8),skin)),hn:add(new THREE.Mesh(new THREE.SphereGeometry(0.042*k,10,8),skin)),S0:V(s*0.2*k,0.1,-0.02)});
  const halves=[piece(tex,0.1,0.26,0,0.5,0,1),piece(tex,0.1,0.26,0.5,1,0,1)];halves.forEach(h=>{h.castShadow=true;g.add(h)});
  const stack=add(new THREE.Mesh(new THREE.BoxGeometry(0.2,0.035,0.26),std(I.paper,0.9)));stack.position.set(0.52,0.03,-0.24);stack.rotation.y=0.5;const topS=piece(tex,0.2,0.26,0,1,0,1);topS.rotation.x=-Math.PI/2;topS.position.set(0,0.0185,0);stack.add(topS);
  const c=Math.cos(-ry),sn=Math.sin(-ry),ll=V(tx*c+tz*sn,0,-tx*sn+tz*c),scr=[];   // the way to the pond, in his own frame
  for(let i=0;i<12;i++){const col=i%3,row=(i/3)|0,m=piece(tex,0.085,0.07,col/3,(col+1)/3,row/4,(row+1)/4,true);m.visible=false;m.castShadow=true;scene.add(m);tubObjs.push(m);scr.push({m,t0:-99,T:2,p0:V(0,0,0),p1:V(0,0,0),ph:i*1.7,rung:true})}
  const bub=G.line?speechBubble(G.line.text):null;if(bub){bub.position.set(0.02,0.56,0);g.add(bub)}
  GA={g,k,T,lx:tx,lz:tz,td,ll,bub,nThrow:0,sayT:-99,arms:[arm(-1),arm(1)],halves,scr,cyc:I.cycle_s||5.2,last:9,pz:PONDZ['Pond 1'],
   K:[[0,[0.1,0.22,0.3],[-0.1,0.22,0.3]],[1.0,[0.1,0.22,0.3],[-0.1,0.22,0.3]],[1.4,[0.2,0.12,0.3],[-0.17,0.34,0.27]],[1.75,[0.13,0.31,0.3],[-0.14,0.14,0.28]],[2.05,[0.27,0.44,-0.06],[-0.1,0.15,0.25]],[2.25,[0.27,0.46,-0.1],[-0.1,0.15,0.25]],
      [2.5,[0.2+ll.x*0.5,0.4,-0.02+ll.z*0.5],[-0.15,0.08,0.22]],[3.0,[0.2+ll.x*0.4,0.22,ll.z*0.4],[-0.17,0.06,0.22]],[3.8,[0.22,0.05,0.25],[-0.2,0.05,0.25]],[4.5,[0.22,0.05,0.25],[-0.2,0.05,0.25]],[5.2,[0.1,0.22,0.3],[-0.1,0.22,0.3]]]}}
 guestSign(G,T);buildProps(G,T);
 const tall=innerHeight>innerWidth*1.15,base=Math.atan2(-lx,-lz),a0=base+PHI+0.55,R0=tall?4.2:3.1,tg=[T.x,T.y+0.1,T.z];
 // V-9 (owner's screenshot): the view opens behind Terry's shoulder looking out over the tub to the pond, then swings slowly round to face the two of them, at the same distance and height
 ED.views.splice(Math.min(2,ED.views.length),0,{name:G.view,hash:'blue-and-terry',p:[tg[0]+Math.sin(a0)*R0,T.y+(tall?1.9:1.45),tg[2]+Math.cos(a0)*R0],t:tg,orbit:{d:Math.PI-PHI-0.55-0.262,ph1:1.09,rk:1.0,dur:24,hold:2.5}})}
const _gR=new THREE.Vector3(),_gL=new THREE.Vector3(),_gE=new THREE.Vector3(),_gB=new THREE.Vector3();
function guestTick(t){const A=GA;if(!A||!A.g.visible)return;if(A.fz!==undefined)t=A.fz;const tc=(t%A.cyc)*5.2/A.cyc,K=A.K;let i=0;while(i<K.length-2&&tc>=K[i+1][0])i++;const k0=K[i],k1=K[i+1],u=sm(0,1,(tc-k0[0])/(k1[0]-k0[0]));
 _gR.set(k0[1][0]+(k1[1][0]-k0[1][0])*u,k0[1][1]+(k1[1][1]-k0[1][1])*u,k0[1][2]+(k1[1][2]-k0[1][2])*u);_gL.set(k0[2][0]+(k1[2][0]-k0[2][0])*u,k0[2][1]+(k1[2][1]-k0[2][1])*u,k0[2][2]+(k1[2][2]-k0[2][2])*u);
 for(const a of A.arms){const H=a.s>0?_gR:_gL,d=H.distanceTo(a.S0),bend=Math.sqrt(Math.max(0,0.0784-d*d/4));_gB.set(a.s*0.55,-0.75,-0.35).normalize();_gE.addVectors(a.S0,H).multiplyScalar(0.5).addScaledVector(_gB,bend);
  setLimb(a.up,a.S0,_gE);setLimb(a.fo,_gE,H);a.el.position.copy(_gE);a.hn.position.copy(H)}
 // the invoice: whole, then torn, then balled up in the throwing hand, then gone; a fresh one comes up for the next round
 const held=tc<2.42,fresh=tc>4.55,sc=held?(tc<2.05?1:1-0.6*sm(2.05,2.4,tc)):fresh?sm(4.55,5.15,tc):0,tw=sm(1.0,1.4,tc)*(1-sm(2.05,2.3,tc));
 A.halves.forEach((h,j)=>{h.visible=sc>0.01;const s=j?1:-1,H=j?_gR:_gL,crumple=held?sm(2.05,2.3,tc):0;h.position.set(H.x-s*0.05*(1-crumple)+(j?0:(_gR.x-_gL.x)*crumple),H.y+(j?0:(_gR.y-_gL.y)*crumple),H.z+0.01+(j?0:(_gR.z-_gL.z)*crumple));h.scale.setScalar(sc);h.rotation.set(0,0,s*-0.55*tw+crumple*j*1.2)});
 if(tc>=2.42&&A.last<2.42){A.g.updateMatrixWorld();const w=A.g.localToWorld(_gB.copy(_gR));for(const q of A.scr){const r1=Math.random(),r2=Math.random(),la=(r2-0.5)*2.8;let dd=A.td+0.5+r1*3.0;for(let n=0;n<16&&groundAt(A.T.x+A.lx*dd+A.lz*la,A.T.z+A.lz*dd-A.lx*la)>A.pz-0.06;n++)dd+=0.5;q.t0=t+Math.random()*0.08;q.T=1.9+Math.random()*1.5;q.p0.set(w.x+(Math.random()-0.5)*0.08,w.y+(Math.random()-0.5)*0.06,w.z+(Math.random()-0.5)*0.08);
   const X=A.T.x+A.lx*dd+A.lz*la,Z=A.T.z+A.lz*dd-A.lx*la;q.p1.set(X,Math.max(A.pz,groundAt(X,Z))+0.012,Z);q.rung=false;q.m.visible=true;q.m.material.opacity=1}
  if(SND.on&&SND.grp.farm)sndEvent('rip',w.x,w.y,w.z,5,'farm');
  A.nThrow++;if(A.bub&&SND.say&&!VIS&&(A.nThrow-1)%((S.guests.line.every_throws)||3)===0){A.sayT=t+0.5;setTimeout(()=>sayLine(A),500)}}
 if(A.bub){const e=t-A.sayT;A.bub.material.opacity=e>0&&e<4.2?sm(0,0.25,e)*(1-sm(3.5,4.2,e)):0;A.bub.visible=A.bub.material.opacity>0.01}
 A.last=tc;
 for(const q of A.scr){if(!q.m.visible)continue;const e=t-q.t0,s=e/q.T;if(s<0){q.m.visible=true;q.m.position.copy(q.p0);continue}
  if(s<1){const h=1-(1-s)*(1-s),sw=0.13*Math.sin(e*6.5+q.ph)*s;q.m.position.set(q.p0.x+(q.p1.x-q.p0.x)*h+A.lz*sw,q.p0.y+(q.p1.y-q.p0.y)*Math.pow(s,1.7)+0.75*Math.sin(Math.PI*Math.min(1,s*2.4))*(1-s),q.p0.z+(q.p1.z-q.p0.z)*h-A.lx*sw);q.m.rotation.set(e*5.5+q.ph,e*3.1,e*4.2+q.ph)}
  else{if(!q.rung){q.rung=true;if(q.p1.y<A.pz+0.05)ring(q.p1.x,q.p1.z,t,0.22)}const f=e-q.T;q.m.position.set(q.p1.x+0.02*f,q.p1.y+0.004*Math.sin(t*2+q.ph),q.p1.z+0.012*f);q.m.rotation.set(-Math.PI/2,0,q.ph+0.1*f);q.m.material.opacity=1-sm(4.5,7.5,f);if(f>7.5)q.m.visible=false}}}
window.__guestAt=(tc)=>{if(!GA)return null;if(tc===null){delete GA.fz;return 'running'}const c=GA.cyc,b=Math.ceil(performance.now()/1000/c+2)*c;GA.last=9;if(tc>2.42){GA.fz=b+2.4;guestTick(0);GA.fz=b+2.45;guestTick(0)}GA.fz=b+tc;guestTick(0);return tc};
// ---------- V-5 sound: every sound is generated here in the browser (nothing is downloaded); it follows the time of day and where you are looking
const SND={on:false,want:true,say:true,ctx:null,vol:0.7,grp:{water:true,birds:true,night:true,farm:true,music:true}},BUF={},BUS={},CS=[],SV={};let sndMaster=null,sndRev=null,sndNext=0,nextBird=0,nextFrog=0,nextDog=0,nextOwl=0,fnKey='',fnSrc=[];
const R_=Math.random,_L=new THREE.Vector3(),_Rt=new THREE.Vector3(),_d3=new THREE.Vector3();
function mkBufs(sr){const mk=(sec,fn)=>{const n=Math.round(sr*sec),b=SND.ctx.createBuffer(1,n,sr),d=b.getChannelData(0);fn(d,n);let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(d[i]));if(pk>0){const k=0.7/pk;for(let i=0;i<n;i++)d[i]*=k}return b};
 BUF.white=mk(2,(d,n)=>{for(let i=0;i<n;i++)d[i]=R_()*2-1});
 BUF.pink=mk(6,(d,n)=>{let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<n;i++){const w=R_()*2-1;b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.969*b2+w*0.153852;b3=0.8665*b3+w*0.3104856;b4=0.55*b4+w*0.5329522;b5=-0.7616*b5-w*0.016898;d[i]=b0+b1+b2+b3+b4+b5+b6+w*0.5362;b6=w*0.115926}
  const f=Math.round(sr*0.25);for(let i=0;i<f;i++){const a=i/f;d[i]=d[i]*a+d[n-f+i]*(1-a)}});
 BUF.bubble=mk(4,(d,n)=>{for(let k=0;k<520;k++){const s=(R_()*n)|0,f0=300+R_()*R_()*1500,len=Math.round(sr*(0.02+R_()*0.05)),am=0.15+R_()*0.5;let ph=0;for(let i=0;i<len;i++){const x=i/len;ph+=6.2832*f0*(1+0.6*x)/sr;d[(s+i)%n]+=Math.sin(ph)*Math.exp(-5*x)*am*Math.min(1,x/0.08)}}
  let br=0;for(let i=0;i<n;i++){br=0.985*br+(R_()*2-1)*0.02;d[i]+=br*1.3}});
 BUF.cricket=mk(4,(d,n)=>{for(const [f,rate,np,am,off] of [[4600,2.5,3,0.3,0],[4150,2.0,3,0.22,0.13],[5050,1.75,2,0.18,0.31],[4380,2.25,3,0.15,0.22]]){const per=sr/rate,pl=Math.round(sr*0.016),gap=Math.round(sr*0.028);
   for(let c=0;c<rate*4;c++)for(let p=0;p<np;p++){const s=Math.round(c*per+off*sr+p*gap);for(let i=0;i<pl;i++)d[(s+i)%n]+=Math.sin(6.2832*f*i/sr)*am*0.5*(1-Math.cos(6.2832*i/pl))}}});
 BUF.katy=mk(4,(d,n)=>{for(let g=0;g<4;g++)for(let p=0;p<3;p++){const s=Math.round(sr*(0.2+g+p*0.11)),pl=Math.round(sr*0.05);for(let i=0;i<pl;i++)d[(s+i)%n]+=(R_()*2-1)*Math.sin(3.1416*i/pl)}});
 BUF.gravel=mk(3,(d,n)=>{for(let k=0;k<600;k++){const s=(R_()*n)|0,len=Math.round(sr*(0.005+R_()*0.008)),am=R_()*R_();for(let i=0;i<len;i++)d[(s+i)%n]+=(R_()*2-1)*am*Math.exp(-4*i/len)}});
 const L=Math.round(sr*1.7),ir=SND.ctx.createBuffer(2,L,sr);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0;for(let i=0;i<L;i++){lp=0.55*lp+0.45*(R_()*2-1);d[i]=lp*Math.pow(1-i/L,2.6)*(i<sr*0.012?i/(sr*0.012):1)}}BUF.ir=ir}
// one-shot building blocks: c = audio context, o = where the sound goes, t = start time
function osc(c,o,t,dur,f0,f1,amp,type){const s=c.createOscillator(),g=c.createGain();s.type=type||'sine';s.frequency.setValueAtTime(f0,t);if(f1!==f0)s.frequency.exponentialRampToValueAtTime(f1,t+dur);const a=Math.min(0.014,dur*0.25);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+a);g.gain.setValueAtTime(amp,t+dur*0.6);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(g);g.connect(o);s.start(t);s.stop(t+dur+0.03);return t+dur}
function nz(c,o,t,dur,amp,ft,f,q,f1){const s=c.createBufferSource(),b=c.createBiquadFilter(),g=c.createGain();s.buffer=BUF.white;s.loop=true;b.type=ft;b.frequency.setValueAtTime(f,t);if(f1)b.frequency.exponentialRampToValueAtTime(f1,t+dur);b.Q.value=q||0.7;
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+Math.min(0.01,dur*0.3));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(b);b.connect(g);g.connect(o);s.start(t,R_()*1.5);s.stop(t+dur+0.03);return t+dur}
function rough(c,o,t,dur,f0,f1,amp,bp,q,rate,type){const s=c.createOscillator(),b=c.createBiquadFilter(),am=c.createGain(),g=c.createGain();s.type=type||'sawtooth';s.frequency.setValueAtTime(f0,t);s.frequency.exponentialRampToValueAtTime(f1,t+dur);b.type='bandpass';b.frequency.value=bp;b.Q.value=q;
 am.gain.value=rate?0.55:1;if(rate){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=rate;lg.gain.value=0.45;l.connect(lg);lg.connect(am.gain);l.start(t);l.stop(t+dur+0.03)}
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+Math.min(0.03,dur*0.2));g.gain.setValueAtTime(amp,t+dur*0.55);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(b);b.connect(am);am.connect(g);g.connect(o);s.start(t);s.stop(t+dur+0.03);return t+dur}
SV.cardinal=(c,o,t)=>{const n=3+(R_()*3|0);for(let i=0;i<n;i++){osc(c,o,t,0.27,4300,2100,0.22);t+=0.36}t+=0.05;const m=4+(R_()*4|0);for(let i=0;i<m;i++){osc(c,o,t,0.085,2300,3900,0.2);t+=0.125}return t};
SV.wren=(c,o,t)=>{const n=3+(R_()*2|0),k=0.92+R_()*0.2;for(let i=0;i<n;i++){osc(c,o,t,0.075,3900*k,3300*k,0.2);t+=0.095;osc(c,o,t,0.07,2600*k,2950*k,0.2);t+=0.09;osc(c,o,t,0.1,3300*k,4500*k,0.22);t+=0.15}return t};
SV.chickadee=(c,o,t)=>{for(const f of [4050,3250,3750,2950]){osc(c,o,t,0.3,f,f*0.985,0.17);t+=0.38}return t};
SV.titmouse=(c,o,t)=>{const n=3+(R_()*3|0);for(let i=0;i<n;i++){osc(c,o,t,0.24,3400,2450,0.2);t+=0.34}return t};
SV.dove=(c,o,t)=>{osc(c,o,t,0.32,430,455,0.22);t+=0.34;osc(c,o,t,0.62,520,470,0.32);t+=0.85;for(let i=0;i<3;i++){osc(c,o,t,0.42,450,440,0.26);t+=0.66}return t};
SV.woodpecker=(c,o,t)=>{const n=16+(R_()*10|0);for(let i=0;i<n;i++){const a=0.3*(1-0.55*i/n);nz(c,o,t,0.022,a,'bandpass',1500,3);osc(c,o,t,0.02,950,700,a*0.5);t+=0.047}return t};
SV.crow=(c,o,t)=>{const n=2+(R_()*3|0);for(let i=0;i<n;i++){rough(c,o,t,0.3,520,400,0.45,1350,1.1,64);nz(c,o,t,0.28,0.06,'bandpass',1800,0.8);t+=0.5}return t};
SV.hawk=(c,o,t)=>{rough(c,o,t,1.5,3300,2000,0.4,2700,1.4,46);nz(c,o,t,1.4,0.05,'bandpass',3000,1);return t+1.5};
SV.owl=(c,o,t)=>{const hoot=(d,f0,f1)=>{osc(c,o,t,d,f0,f1,0.3);osc(c,o,t,d,f0*2,f1*2,0.05,'triangle');t+=d+0.09};hoot(0.2,400,390);hoot(0.17,400,395);hoot(0.17,395,385);hoot(0.4,390,360);t+=0.3;hoot(0.2,400,390);hoot(0.17,400,395);hoot(0.17,395,385);hoot(0.2,390,380);hoot(0.75,400,240);return t};
SV.treefrog=(c,o,t)=>{const n=6+(R_()*10|0),k=0.9+R_()*0.25;for(let i=0;i<n;i++){rough(c,o,t,0.15,470*k,450*k,0.6,950*k,3,0,'square');t+=0.36+R_()*0.05}return t};
SV.bullfrog=(c,o,t)=>{const n=2+(R_()*3|0);for(let i=0;i<n;i++){rough(c,o,t,0.7,112,98,0.7,250,2.5,24);t+=1.0}return t};
SV.cricketfrog=(c,o,t)=>{const n=10+(R_()*8|0);for(let i=0;i<n;i++){nz(c,o,t,0.014,0.9,'bandpass',3400,5);t+=0.16-0.09*i/n}return t};
function bark1(c,o,t,p,len){const o1=c.createOscillator(),o2=c.createOscillator(),mx=c.createGain(),f1=c.createBiquadFilter(),f2=c.createBiquadFilter(),g=c.createGain(),g2=c.createGain();o1.type='sawtooth';o2.type='square';
 o1.frequency.setValueAtTime(330*p,t);o1.frequency.linearRampToValueAtTime(560*p,t+0.03);o1.frequency.exponentialRampToValueAtTime(290*p,t+len);o2.frequency.setValueAtTime(165*p,t);o2.frequency.linearRampToValueAtTime(280*p,t+0.03);o2.frequency.exponentialRampToValueAtTime(145*p,t+len);
 mx.gain.value=0.5;o1.connect(mx);o2.connect(mx);f1.type='bandpass';f1.frequency.value=780*p;f1.Q.value=2.2;f2.type='bandpass';f2.frequency.value=1750*p;f2.Q.value=3;mx.connect(f1);mx.connect(f2);g2.gain.value=0.6;f2.connect(g2);g2.connect(g);f1.connect(g);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.6,t+0.012);g.gain.setValueAtTime(0.6,t+len*0.35);g.gain.exponentialRampToValueAtTime(0.0001,t+len);g.connect(o);o1.start(t);o2.start(t);o1.stop(t+len+0.03);o2.stop(t+len+0.03);nz(c,o,t,len*0.8,0.22,'bandpass',1300*p,0.9)}
SV.dog=(c,o,t)=>{const p=0.8+R_()*0.5,n=2+(R_()*4|0);for(let i=0;i<n;i++){bark1(c,o,t,p*(0.96+R_()*0.08),0.16+R_()*0.05);if(R_()<0.25)bark1(c,o,t+0.2,p,0.13);t+=0.42+R_()*0.3}return t};
SV.rip=(c,o,t)=>{nz(c,o,t,0.2,0.3,'highpass',2600,0.7);nz(c,o,t+0.24,0.16,0.26,'highpass',3000,0.7);return t+0.45};
SV.splash=(c,o,t,k)=>{k=k||1;nz(c,o,t,0.3+0.3*k,0.45*k,'bandpass',1500,0.6,380);osc(c,o,t,0.14,190,70,0.35*k);for(let i=0;i<5;i++){const f=1500+R_()*2500;osc(c,o,t+0.15+R_()*0.5,0.03,f,f*1.3,0.05)}return t+0.9};
// where the listener is: on the line from what you are looking at toward the camera, never more than 35 m out, so the place stays audible from high up
function listen(){_d3.copy(cam.position).sub(ctrl.target);const r=_d3.length();_L.copy(ctrl.target).addScaledVector(_d3,Math.min(1,35/Math.max(r,1e-3)));cam.getWorldDirection(_d3);_Rt.crossVectors(_d3,cam.up).normalize();return r}
function spat(x,y,z,ref){_d3.set(x-_L.x,y-_L.y,z-_L.z);const d=Math.max(0.5,_d3.length());return {g:Math.min(1,ref/d),pan:Math.max(-1,Math.min(1,_d3.dot(_Rt)/d))*0.85,lp:Math.max(1200,Math.min(16000,16000/(1+d/60))),wet:Math.max(0.05,Math.min(0.6,d/200)),d}}
function place(x,y,z,ref,grp){const c=SND.ctx,s=spat(x,y,z,ref),g=c.createGain(),lp=c.createBiquadFilter(),w=c.createGain();g.gain.value=s.g;lp.type='lowpass';lp.frequency.value=s.lp;g.connect(lp);
 if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=s.pan;lp.connect(p);p.connect(BUS[grp])}else lp.connect(BUS[grp]);w.gain.value=s.wet;lp.connect(w);w.connect(sndRev);return g}
function loopSrc(buf,grp,x,y,z,ref,level,chain){const c=SND.ctx,s=c.createBufferSource(),g=c.createGain();s.buffer=buf;s.loop=true;g.gain.value=0;let last=s;for(const f of (chain||[])){const b=c.createBiquadFilter();b.type=f[0];b.frequency.value=f[1];b.Q.value=f[2]||0.7;last.connect(b);last=b}last.connect(g);
 let pan=null;if(c.createStereoPanner){pan=c.createStereoPanner();g.connect(pan);pan.connect(BUS[grp])}else g.connect(BUS[grp]);s.start(0,R_()*buf.duration);const o={s,g,pan,x,y,z,ref,level,pos:x!==null};CS.push(o);return o}
function sndInit(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;let c;try{c=new AC()}catch(e){return false}SND.ctx=c;mkBufs(c.sampleRate);
 sndMaster=c.createGain();sndMaster.gain.value=0;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;sndMaster.connect(comp);comp.connect(c.destination);
 sndRev=c.createConvolver();sndRev.buffer=BUF.ir;const rg=c.createGain();rg.gain.value=0.55;sndRev.connect(rg);rg.connect(sndMaster);
 for(const k of ['water','birds','night','farm','music']){BUS[k]=c.createGain();BUS[k].gain.value=SND.grp[k]?1:0;BUS[k].connect(sndMaster)}
 // wind: always there, a little stronger from high up
 const wind=loopSrc(BUF.pink,'farm',null,0,0,1,()=>0.05+0.07*Math.min(1,(cam.position.y-ctrl.target.y)/120),[['lowpass',420,0.4]]);const wl=c.createOscillator(),wg=c.createGain();wl.frequency.value=0.09;wg.gain.value=0.035;wl.connect(wg);wg.connect(wind.g.gain);wl.start();
 // night bed
 loopSrc(BUF.cricket,'night',null,0,0,1,()=>0.15*sm(0.25,0.8,NIGHT));const c2=loopSrc(BUF.cricket,'night',null,0,0,1,()=>0.10*sm(0.25,0.8,NIGHT));c2.s.playbackRate.value=0.93;if(c2.pan)c2.pan.pan.value=0.6;
 const ka=loopSrc(BUF.katy,'night',null,0,0,1,()=>0.07*sm(0.6,0.95,NIGHT),[['bandpass',5500,1.5]]);if(ka.pan)ka.pan.pan.value=-0.5;
 // hot tubs, pond banks, the area light, gravel under the tyres
 for(const T of TUBS)loopSrc(BUF.bubble,'water',T.x,T.y,T.z,2.2,()=>(tubObjs[0]&&tubObjs[0].visible)?0.55:0);
 for(const P of (S.ponds||[])){if(PONDZ[P.name]===undefined)continue;const o=loopSrc(BUF.pink,'water',0,PONDZ[P.name],0,3,()=>0.2,[['bandpass',480,0.5]]);o.poly=P.xy_show||P.xy;const l=c.createOscillator(),lg=c.createGain();l.frequency.value=0.23+R_()*0.15;lg.gain.value=0.5;l.connect(lg);l.start();const m=c.createGain();m.gain.value=0.5;lg.connect(m.gain);o.g.disconnect();o.g.connect(m);m.connect(o.pan||BUS.water)}
 for(const L of (S.lights||[])){const o=loopSrc(BUF.white,'farm',L.x,L.z,L.y,1.5,()=>0.05*sm(0.03,0.16,NIGHT),[['bandpass',120,12]]);o.s.playbackRate.value=1}
 if(S.efount)for(const P of S.efount.pools)loopSrc(BUF.pink,'water',P.c[0],P.rim+1,P.c[1],5,()=>efOn()?0.5:0,[['highpass',420,0.5],['lowpass',5200,0.5]]);
 loopSrc(BUF.gravel,'farm',null,0,0,1,()=>driveS>=0?0.28:0,[['bandpass',2400,0.6]]);
 document.addEventListener('visibilitychange',()=>{if(!SND.ctx)return;if(document.hidden)SND.ctx.suspend();else if(SND.on)SND.ctx.resume()});return true}
// ---------- D-11 proposed entrance sculpture fountains: a tiger bass on a bent rod (right when entering), an elephant (left). Shown with the gateway; never in the customer link.
const EFO=[],EFM=[],EFP=[];
const EJ_V=`attribute vec3 aV;attribute vec2 aQ;uniform float uTime,uPx,uT;varying float vA;void main(){float ph=fract(uTime/uT+aQ.x),t=ph*uT;vec3 p=position+aV*t;p.y-=4.905*t*t;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uPx*aQ.y*(0.8+1.3*ph)/max(0.5,-mv.z),1.5,26.0);vA=smoothstep(0.0,0.04,ph)*(1.0-0.45*ph);}`;
const EJ_F=`uniform float uLight,uGlow;varying float vA;void main(){float d=length(gl_PointCoord-0.5)*2.0;if(d>1.0)discard;float a=1.0-d*d;gl_FragColor=vec4(vec3(0.80,0.92,0.98)*min(1.0,uLight+uGlow*0.5)+vec3(0.12)*uLight,a*vA*0.8);}`;
const EP_F=`uniform float uTime,uR,uLight,uGlow;uniform vec2 uHit,uHit2;varying vec2 vP;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}
void main(){float r=length(vP)/uR,t=uTime,d1=length(vP-uHit),d2=length(vP-uHit2);
 float hit=exp(-d1*d1*2.4)+exp(-d2*d2*2.4),rip=(0.5+0.5*sin(d1*11.0-t*7.0))*exp(-d1*0.7)+(0.5+0.5*sin(d2*11.0-t*7.0))*exp(-d2*0.7);
 float f1=n(vP*3.0+vec2(t*0.35,-t*0.3)),f2=n(vP*8.0-vec2(t*0.7,t*0.5)),foam=smoothstep(0.55,0.9,f1*0.3+f2*0.25+hit*0.75);
 vec3 c=mix(vec3(0.05,0.30,0.36),vec3(0.20,0.58,0.62),0.25+0.6*f1+0.14*rip);c=mix(c,vec3(0.95,0.98,1.0),foam*0.85);
 c*=uLight;c+=uGlow*(vec3(0.06,0.42,0.60)*(1.0-0.4*r)+foam*vec3(0.2,0.3,0.36));gl_FragColor=vec4(c,0.93);}`;
function efTube(pts,r0,r1,rad,seg,mat){const c=new THREE.CatmullRomCurve3(pts),F=c.computeFrenetFrames(seg,false),pos=[],idx=[];
 for(let i=0;i<=seg;i++){const p=c.getPointAt(i/seg),r=r0+(r1-r0)*i/seg,N=F.normals[i],B=F.binormals[i];for(let j=0;j<rad;j++){const a=j/rad*6.2832,cs=Math.cos(a)*r,sn=Math.sin(a)*r;pos.push(p.x+N.x*cs+B.x*sn,p.y+N.y*cs+B.y*sn,p.z+N.z*cs+B.z*sn)}}
 for(let i=0;i<seg;i++)for(let j=0;j<rad;j++){const a=i*rad+j,b=i*rad+(j+1)%rad,c2=a+rad,d=b+rad;idx.push(a,c2,b,b,c2,d)}
 const e=pos.length/3,pe=c.getPointAt(1);pos.push(pe.x,pe.y,pe.z);for(let j=0;j<rad;j++)idx.push(seg*rad+j,e,seg*rad+(j+1)%rad);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return new THREE.Mesh(g,mat)}
function efJet(G,O,V,n,spread,size){const T=(V.y+Math.sqrt(V.y*V.y+19.62*Math.max(0.01,O.y)))/9.81,sp=V.length(),p=new Float32Array(n*3),v=new Float32Array(n*3),q=new Float32Array(n*2);let s=977+n;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647};
 for(let i=0;i<n;i++){const k=1+(rnd()-0.5)*spread*0.5;p[i*3]=O.x+(rnd()-0.5)*0.03;p[i*3+1]=O.y;p[i*3+2]=O.z+(rnd()-0.5)*0.03;v[i*3]=V.x*k+(rnd()-0.5)*spread*sp*0.5;v[i*3+1]=V.y*k+(rnd()-0.5)*spread*sp*0.3;v[i*3+2]=V.z*k+(rnd()-0.5)*spread*sp*0.5;q[i*2]=rnd();q[i*2+1]=size*(0.6+rnd()*0.8)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aV',new THREE.BufferAttribute(v,3));g.setAttribute('aQ',new THREE.BufferAttribute(q,2));
 const m=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:{uTime:TU.uTime,uPx:TU.uPx,uLight:TU.uLight,uGlow:TU.uGlow,uT:{value:T}},vertexShader:EJ_V,fragmentShader:EJ_F,transparent:true,depthWrite:false}));m.frustumCulled=false;m.renderOrder=6;G.add(m);
 return new THREE.Vector2(O.x+V.x*T,O.z+V.z*T)}
function efBassTex(){const W=1024,H=512,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,H);
 for(const s of [[0,'#f0ead2'],[0.16,'#e8e2c4'],[0.24,'#c3c592'],[0.31,'#8f9c5a'],[0.40,'#55642f'],[0.5,'#36431f'],[0.60,'#55642f'],[0.69,'#8f9c5a'],[0.76,'#c3c592'],[0.84,'#e8e2c4'],[1,'#f0ead2']])g.addColorStop(s[0],s[1]);x.fillStyle=g;x.fillRect(0,0,W,H);
 let q=4271;const rnd=()=>{q=(q*16807)%2147483647;return q/2147483647};
 x.globalAlpha=0.10;for(let i=0;i<5200;i++){x.fillStyle=rnd()<0.5?'#1c2412':'#f4f0d8';x.beginPath();x.ellipse(rnd()*W*0.84,H*(0.14+rnd()*0.72),5,3.2,0,0,6.2832);x.fill()}
 x.fillStyle='#1b2413';x.globalAlpha=0.9;for(const vc of [0.285,0.715])for(let u=0.05;u<0.84;u+=0.034){x.beginPath();x.ellipse(u*W+rnd()*8,vc*H+(rnd()-0.5)*12,14+rnd()*16,10+rnd()*14+12*Math.sin(Math.min(1,u/0.5)*1.57),(rnd()-0.5)*0.5,0,6.2832);x.fill()}
 x.globalAlpha=0.32;for(const sg of [-1,1])for(let u=0.12;u<0.74;u+=0.05){x.beginPath();x.ellipse(u*W+rnd()*10,H*(0.5+sg*0.115),7+rnd()*5,28,sg*0.25,0,6.2832);x.fill()}
 x.globalAlpha=0.5;for(let i=0;i<170;i++){const sg=rnd()<0.5?-1:1;x.beginPath();x.arc(rnd()*W*0.8,H*(0.5+sg*(0.265+rnd()*0.07)),2+rnd()*3,0,6.2832);x.fill()}
 x.globalAlpha=0.6;x.strokeStyle='#1b2413';x.lineWidth=5;for(const sg of [-1,1]){x.beginPath();x.ellipse(0.79*W,H*(0.5+sg*0.25),30,62,0,-1.25,1.25);x.stroke()}
 x.globalAlpha=1;const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
function efBass(){const G=new THREE.Group(),Lb=3.0,N=44,M=28,cx=[0,0.15,0.35,0.55,0.72,0.85,0.95,1.0],ch=[0.13,0.17,0.36,0.46,0.44,0.36,0.27,0.19],cw=[0.045,0.07,0.17,0.24,0.25,0.22,0.17,0.12];
 const sh=new THREE.SplineCurve(cx.map((x,i)=>new THREE.Vector2(x,ch[i]))),sw=new THREE.SplineCurve(cx.map((x,i)=>new THREE.Vector2(x,cw[i]))),bend=u=>0.16*Math.sin((u-0.15)*2.6);
 const skin=new THREE.MeshStandardMaterial({map:efBassTex(),roughness:0.42,metalness:0.05,side:THREE.DoubleSide});skin.emissive=new THREE.Color(0xffffff);skin.emissiveMap=skin.map;skin.emissiveIntensity=0;EFM.push([skin,0.32]);
 const finM=new THREE.MeshStandardMaterial({color:0x4f5d2c,roughness:0.55,side:THREE.DoubleSide,emissive:0x4f5d2c,emissiveIntensity:0});EFM.push([finM,0.3]);
 const pos=[],uv=[],idx=[],ring=[];let eye=null;
 for(let i=0;i<=N;i++){const a=sh.getPoint(i/N),b=sw.getPoint(i/N),u=a.x,s=Math.max(0,(u-0.86)/0.14);if(!eye&&u>=0.865)eye={u,h:a.y,w:b.y};
  for(let j=0;j<=M;j++){const f=-Math.PI+j/M*6.2832,c=Math.cos(f),sn=Math.sin(f);let x=(u-0.5)*Lb,y=a.y*c*(c<0?1.12:0.92)-0.02,z=b.y*sn+bend(u);if(c<0){y-=0.22*s*s*(-c);x+=0.10*s*(-c)}else y+=0.05*s*s*c;pos.push(x,y,z);uv.push(u,j/M);if(i===N)ring.push(x,y,z)}}
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+1,c2=a+M+1,d=c2+1;idx.push(a,c2,b,b,c2,d)}
 const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();G.add(new THREE.Mesh(bg,skin));
 // inside of the open mouth
 const mp=ring.slice(),mi=[],ax=(0.80-0.5)*Lb;mp.push(ax,-0.05,bend(0.8));for(let j=0;j<M;j++)mi.push(j,j+1,M+1);const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.Float32BufferAttribute(mp,3));mg.setIndex(mi);mg.computeVertexNormals();
 G.add(new THREE.Mesh(mg,new THREE.MeshStandardMaterial({color:0x6b2a26,roughness:0.6,side:THREE.DoubleSide})));
 // eyes
 const gold=new THREE.MeshStandardMaterial({color:0xd8ae35,roughness:0.3,metalness:0.2}),blk=new THREE.MeshStandardMaterial({color:0x0c0c0c,roughness:0.2});
 for(const sg of [-1,1]){const f=sg*0.95,ex=(eye.u-0.5)*Lb,ey=eye.h*Math.cos(f)*0.92-0.02,ez=eye.w*Math.sin(f)+bend(eye.u),e=new THREE.Mesh(new THREE.SphereGeometry(0.078,16,12),gold);e.position.set(ex,ey,ez+sg*0.012);G.add(e);const p=new THREE.Mesh(new THREE.SphereGeometry(0.046,12,10),blk);p.position.set(ex+0.012,ey,ez+sg*0.052);G.add(p)}
 // fins
 const fin=(pts,fix)=>{const sp=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1]))),g=new THREE.ShapeGeometry(sp),P=g.attributes.position;if(fix)fix(P);else for(let i=0;i<P.count;i++)P.setZ(i,bend(P.getX(i)/Lb+0.5));g.computeVertexNormals();const m=new THREE.Mesh(g,finM);G.add(m);return m};
 fin([[-1.40,0.12],[-1.75,0.36],[-2.12,0.50],[-2.05,0.22],[-1.96,0],[-2.05,-0.22],[-2.12,-0.50],[-1.75,-0.36],[-1.40,-0.14]]);
 fin([[0.42,0.36],[0.30,0.60],[0.22,0.52],[0.14,0.64],[0.05,0.54],[-0.03,0.62],[-0.11,0.50],[-0.18,0.52],[-0.22,0.33]]);
 fin([[-0.20,0.31],[-0.28,0.62],[-0.50,0.68],[-0.75,0.56],[-0.95,0.30],[-0.86,0.15]]);
 fin([[-0.50,-0.34],[-0.62,-0.66],[-0.86,-0.62],[-1.02,-0.36],[-0.95,-0.20]]);
 for(const sg of [-1,1]){const pv=fin([[0.30,0],[0.12,-0.34],[-0.12,-0.28],[0,0.02]],P=>{});pv.position.set(0,-0.47,sg*0.07+bend(0.58));pv.rotation.x=-sg*0.5;
  const pc=fin([[0,0],[-0.20,0.14],[-0.50,0.08],[-0.55,-0.12],[-0.30,-0.20],[-0.05,-0.10]],P=>{});pc.position.set(0.62,-0.15,sg*0.235+bend(0.71));pc.rotation.y=sg*0.6}
 G.userData={mouth:new THREE.Vector3(1.56,-0.06,bend(1)),tail:new THREE.Vector3(-1.62,0,bend(-0.04)),nose:new THREE.Vector3(1,0,0)};return G}
function efElephant(G0,ox,yg,gy){const E=new THREE.Group(),sk=new THREE.MeshStandardMaterial({color:0x8f8980,roughness:0.95,emissive:0x8f8980,emissiveIntensity:0}),iv=new THREE.MeshStandardMaterial({color:0xefe6cf,roughness:0.45,emissive:0xefe6cf,emissiveIntensity:0}),dk=new THREE.MeshStandardMaterial({color:0x111111,roughness:0.3});EFM.push([sk,0.28],[iv,0.3]);
 const V=(x,y,z)=>new THREE.Vector3(x,y,z||0),ell=(x,y,z,rx,ry,rz,m)=>{const s=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),m||sk);s.position.set(x,y,z);s.scale.set(rx,ry,rz);E.add(s);return s};
 ell(0,2.35,0,1.85,0.95,0.86);ell(0.95,2.55,0,0.95,0.86,0.80);ell(-1.05,2.40,0,0.95,0.90,0.80);ell(1.55,2.80,0,0.72,0.70,0.62);ell(2.0,2.98,0,0.74,0.80,0.62);ell(2.25,3.25,0,0.46,0.42,0.50);
 for(const lx of [1.15,-1.15])for(const lz of [0.47,-0.47]){const yb=gy(ox+lx,lz)-yg,top=2.25,h=top-yb,l=new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.31,h,18),sk);l.position.set(lx,yb+h/2,lz);E.add(l);const ft=new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.35,0.16,18),sk);ft.position.set(lx,yb+0.08,lz);E.add(ft)}
 E.add(efTube([V(2.3,2.8),V(2.7,2.45),V(3.1,2.22),V(3.5,2.25),V(3.8,2.55),V(4.02,2.95),V(4.3,3.3)],0.34,0.12,16,48,sk));
 for(const sg of [-1,1]){E.add(efTube([V(2.42,2.48,sg*0.30),V(3.0,2.2,sg*0.47),V(3.5,2.47,sg*0.44)],0.08,0.02,10,20,iv));const ey=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),dk);ey.position.set(2.52,3.05,sg*0.5);E.add(ey);
  const sp=new THREE.Shape();sp.moveTo(0.05,0.5);sp.splineThru([[-0.3,0.78],[-0.72,0.72],[-1.0,0.35],[-1.06,-0.15],[-0.92,-0.62],[-0.62,-1.0],[-0.36,-0.92],[-0.16,-0.55],[0.05,-0.3]].map(p=>new THREE.Vector2(p[0],p[1])));sp.lineTo(0.05,0.5);const eg=new THREE.ExtrudeGeometry(sp,{depth:0.07,bevelEnabled:true,bevelThickness:0.02,bevelSize:0.02,bevelSegments:2,curveSegments:24}),ear=new THREE.Mesh(eg,sk);ear.position.set(2.05,3.0,sg*0.53-0.03);ear.rotation.y=sg*0.62;E.add(ear)}
 E.add(efTube([V(-1.78,2.65),V(-2.1,2.25),V(-2.16,1.5,0.05)],0.07,0.03,8,12,sk));const tf=ell(-2.16,1.42,0.05,0.07,0.16,0.07,dk);
 E.position.set(ox,yg,0);E.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});G0.add(E);return {tip:V(ox+4.3,yg+3.3,0),dir:V(0.3,0.35,0).normalize()}}
function buildEntFountains(){const F=S.efount;if(!F||EFO.length)return;const stone=new THREE.MeshStandardMaterial({color:0xb7ab95,roughness:0.92,side:THREE.DoubleSide,emissive:0xb7ab95,emissiveIntensity:0}),bronze=new THREE.MeshStandardMaterial({color:0x8a5a2b,roughness:0.36,metalness:0.85,emissive:0x8a5a2b,emissiveIntensity:0}),steel=new THREE.MeshStandardMaterial({color:0x30363a,roughness:0.4,metalness:0.6,side:THREE.DoubleSide,emissive:0x30363a,emissiveIntensity:0}),white=new THREE.MeshStandardMaterial({color:0xe6f3f5,roughness:0.3,transparent:true,opacity:0.95,side:THREE.DoubleSide,emissive:0x9ad6e4,emissiveIntensity:0.08});
 EFM.push([stone,0.22],[bronze,0.35],[steel,0.25]);const V=(x,y,z)=>new THREE.Vector3(x,y,z||0),CA=Math.cos(0.436),SA=Math.sin(0.436);
 for(const P of F.pools){const yw=P.rim-0.15,R=P.R,Ri=R-0.36,X=V(P.inn[0]*CA-P.fw[0]*SA,0,P.inn[1]*CA-P.fw[1]*SA).normalize(),Y=V(0,1,0),Z=new THREE.Vector3().crossVectors(X,Y),G=new THREE.Group();
  G.matrixAutoUpdate=false;G.matrix.makeBasis(X,Y,Z).setPosition(P.c[0],yw,P.c[1]);const gy=(x,z)=>{const g=groundAt(P.c[0]+X.x*x+Z.x*z,P.c[1]+X.z*x+Z.z*z);return (g>1e8?P.ground:g)-yw};
  let gmin=1e9;for(let a=0;a<16;a++)gmin=Math.min(gmin,gy(R*Math.cos(a*0.3927),R*Math.sin(a*0.3927)));
  const wall=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(R,gmin-0.5),new THREE.Vector2(R,0.11),new THREE.Vector2(R-0.04,0.15),new THREE.Vector2(Ri+0.04,0.15),new THREE.Vector2(Ri,0.11),new THREE.Vector2(Ri,-0.7),new THREE.Vector2(0,-0.7)],56),stone);G.add(wall);
  const RN=8,SN=56,pos=[0,0,0],idx=[];for(let i=1;i<=RN;i++)for(let j=0;j<SN;j++){const a=j/SN*6.2832,r=Ri*i/RN;pos.push(r*Math.cos(a),0,r*Math.sin(a))}for(let j=0;j<SN;j++)idx.push(0,1+(j+1)%SN,1+j);for(let i=1;i<RN;i++)for(let j=0;j<SN;j++){const a=1+(i-1)*SN+j,b=1+(i-1)*SN+(j+1)%SN,c=a+SN,d=b+SN;idx.push(a,b,c,b,d,c)}
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));wg.setIndex(idx);const U={uTime:TU.uTime,uR:{value:Ri},uLight:TU.uLight,uGlow:TU.uGlow,uHit:{value:new THREE.Vector2(9,9)},uHit2:{value:new THREE.Vector2(9,9)}};
  const water=new THREE.Mesh(wg,new THREE.ShaderMaterial({uniforms:U,vertexShader:TW_V,fragmentShader:EP_F,transparent:true,side:THREE.DoubleSide}));water.renderOrder=4;G.add(water);let key;
  if(P.kind==='tiger_bass'){key='tEFbass';const B=efBass();B.quaternion.setFromAxisAngle(Y,-0.75).multiply(new THREE.Quaternion().setFromAxisAngle(V(0,0,1),0.96)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),-0.5));B.position.set(-0.25,2.75,0.1);B.updateMatrix();G.add(B);
   const Mh=B.userData.mouth.clone().applyMatrix4(B.matrix),Tl=B.userData.tail.clone().applyMatrix4(B.matrix),nd=B.userData.nose.clone().applyQuaternion(B.quaternion);
   // the sculpted splash that hides the fish's post (the post is the structure)
   const hs=Math.max(0.9,Tl.y+0.15),lp=[];for(const q of [[1.0,-0.1],[0.84,0.05],[0.56,0.3],[0.40,0.62],[0.38,0.8],[0.50,0.93],[0.68,1.0]])lp.push(new THREE.Vector2(q[0],q[1]*hs));const sg=new THREE.LatheGeometry(lp,28),sp=sg.attributes.position;
   for(let i=0;i<sp.count;i++){const y=sp.getY(i);if(y>hs*0.9){const a=Math.atan2(sp.getZ(i),sp.getX(i));sp.setY(i,y+0.16*Math.sin(a*9)+0.10*Math.sin(a*4+1))}}sg.computeVertexNormals();const spl=new THREE.Mesh(sg,white);spl.position.set(Tl.x,0,Tl.z);G.add(spl);
   const post=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,Tl.y+0.9,14),white);post.position.set(Tl.x,(Tl.y+0.9)/2-0.7,Tl.z);G.add(post);
   // the rod: a hollow steel tube in a holder on the far rim, bent right over; it is also the water pipe
   const Bx=-(R-0.18),e=V(Mh.x-Bx,0,Mh.z).normalize(),D=Math.hypot(Mh.x-Bx,Mh.z),sx=(D+0.42)/4.49,sy=(Mh.y+1.75-0.45)/5.45,rp=[[0,0.45],[0.34,3.4],[1.24,5.9],[2.64,7.2],[3.94,6.9],[4.49,5.9]].map(q=>V(Bx+e.x*q[0]*sx,0.45+(q[1]-0.45)*sy,e.z*q[0]*sx));
   G.add(efTube(rp,0.075,0.02,10,64,steel));const tip=rp[rp.length-1];G.add(efTube([tip,V((tip.x+Mh.x)/2+0.05,(tip.y+Mh.y)/2,(tip.z+Mh.z)/2),Mh],0.016,0.016,6,10,steel));
   const grip=limb(V(Bx,0.15,0),rp[0].clone().lerp(rp[1],0.32),0.105,new THREE.MeshStandardMaterial({color:0xb08a5a,roughness:0.9}));G.add(grip);const rl=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.13,20),steel),rq=rp[0].clone().lerp(rp[1],0.42);rl.position.set(rq.x-0.15*e.z,rq.y,rq.z+0.15*e.x);rl.quaternion.setFromUnitVectors(Y,V(-e.z,0,e.x));G.add(rl);
   const hold=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.55,0.7),stone);hold.position.set(Bx,0.15+0.27,0);G.add(hold);
   U.uHit.value.copy(efJet(G,Mh,V(nd.x*1.45,0.55,nd.z*1.45),MOBILE?110:240,0.10,0.07));U.uHit2.value.set(Tl.x,Tl.z);efJet(G,V(U.uHit.value.x,0.02,U.uHit.value.y),V(0,1.5,0),MOBILE?30:60,0.9,0.045);efJet(G,V(Tl.x,0.05,Tl.z),V(0,2.2,0),MOBILE?40:90,1.0,0.05);
   EFP.push([P.c[0],yw+1,P.c[1]])}
  else{key='tEFele';const ox=-5.35,yg=gy(ox,0),q=efElephant(G,ox,yg,gy),d=2.75-q.tip.x,th=Math.atan2(q.dir.y,q.dir.x),v=Math.sqrt(9.81*d*d/(2*Math.cos(th)**2*(q.tip.y+d*Math.tan(th))));
   U.uHit.value.copy(efJet(G,q.tip,V(Math.cos(th)*v,Math.sin(th)*v,0),MOBILE?140:300,0.07,0.08));efJet(G,V(U.uHit.value.x,0.02,U.uHit.value.y),V(0,1.7,0),MOBILE?35:70,0.9,0.05);
   const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.22,1.0,16),bronze);ped.position.set(0,-0.2,0);G.add(ped);const sph=new THREE.Mesh(new THREE.SphereGeometry(0.55,36,24),bronze);sph.position.set(0,0.78,0);G.add(sph);
   const rg=new THREE.Mesh(new THREE.TorusGeometry(2.2,0.045,10,120),bronze);rg.rotation.x=Math.PI/2;rg.position.y=0.07;G.add(rg);for(let a=0;a<6;a++){const st=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.8,6),bronze);st.position.set(2.2*Math.cos(a*1.0472),-0.33,2.2*Math.sin(a*1.0472));G.add(st)}
   EFP.push([P.c[0],yw+1,P.c[1]])}
  const tipf=()=>tr(key);G.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.tipf=tipf;picks.push(o)}if(o!==G&&(o.isMesh||o.isPoints))EFO.push(o)});water.castShadow=false;scene.add(G);G.updateMatrixWorld(true)}
 efShow()}
function efOn(){return !!S.efount&&EFO.length>0&&entSel!=='0'&&!VIS}
function efShow(){const on=efOn();for(const o of EFO)o.visible=on;shadowDirty=true}
function efTick(){if(!EFO.length||!EFO[0].visible)return;const k=sm(0.03,0.3,NIGHT);for(const m of EFM)m[0].emissiveIntensity=k*m[1]}
window.__ef=()=>({on:efOn(),objs:EFO.length,pools:EFP});
// ---------- V-16 walk-through: stand at a marked spot, drag to look round, tap a circle to walk there
const WK={on:false,u:null,i:0,rings:[],anim:null,saved:null,seen:false};
function buildWalk(){const W=S.walk;if(!W||WK.rings.length)return;if(VIS){const q=$('wkc');if(q){q.hidden=true;if(q.previousElementSibling)q.previousElementSibling.hidden=true}return}const rg=new THREE.RingGeometry(0.2,0.3,40),dg=new THREE.CircleGeometry(0.3,28);rg.rotateX(-Math.PI/2);dg.rotateX(-Math.PI/2);
 for(const u of W.order)W.units[u].forEach((p,i)=>{const g=new THREE.Group(),a=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,depthWrite:false})),b=new THREE.Mesh(dg,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.22,depthWrite:false}));
  g.add(a);g.add(b);g.position.set(p.p[0],p.p[1]+0.03,p.p[2]);g.visible=false;a.renderOrder=8;b.renderOrder=8;b.userData={wk:[u,i]};a.userData={wk:[u,i]};scene.add(g);WK.rings.push({g,u,i,hit:[a,b]})});
 const el=$('wkc');if(el){el.textContent='';for(const u of W.order)chip(el,u==='P'?tr('wkDeck'):tr('wkUnit',{u}),false,()=>walkEnter(u,0))}
 $('wkback').onclick=()=>walkStep(-1);$('wknext').onclick=()=>walkStep(1);$('wkexit').onclick=()=>walkExit();
 $('wkmap').addEventListener('click',e=>{const m=WK.map;if(!m)return;const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let bi=-1,bd=18;S.walk.units[WK.u].forEach((p,i)=>{const q=m(p.d),d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;bi=i}});if(bi>=0)walkGo(bi,true)});
 window.addEventListener('keydown',e=>{if(!WK.on)return;if(e.key==='Escape')walkExit();else if(e.key==='ArrowRight'||e.key==='ArrowUp')walkStep(1);else if(e.key==='ArrowLeft'||e.key==='ArrowDown')walkStep(-1)})}
function walkHash(){let h='';try{h=decodeURIComponent((location.hash||'').slice(1)).toLowerCase()}catch(e){}h=h.replace(/-night$/,'');if(h==='walk-party-deck'&&S.walk&&!VIS&&S.walk.units.P){lastHash=h;walkEnter('P',0);return true}const m=/^walk-unit-([a-d])$/.exec(h);if(m&&S.walk&&!VIS&&S.walk.units[m[1].toUpperCase()]){lastHash=h;walkEnter(m[1].toUpperCase(),0);return true}return false}
function walkYaw(l){return Math.atan2(l[0],l[1])}
function walkEnter(u,i){const W=S.walk;if(!W||!W.units[u])return;if(typeof stopDrive==='function')stopDrive();fly=null;ORB=null;if(!WK.on)WK.saved={p:cam.position.toArray(),t:ctrl.target.toArray(),fov:cam.fov,near:cam.near};
 if(showOn['Carolina Safari Suites']===false){showOn['Carolina Safari Suites']=true;const s=SHOWS.find(q=>q[0]==='Carolina Safari Suites');if(s)s[1](true);buildUI()}
 WK.on=true;WK.u=u;WK.i=i;WK.anim=null;const p=W.units[u][i];ctrl.walk={pos:new THREE.Vector3(p.p[0],p.p[1]+W.eye,p.p[2]),yaw:walkYaw(p.l),pitch:-0.06};cam.near=0.06;cam.fov=MOBILE?74:66;cam.updateProjectionMatrix();ctrl.update();
 document.body.classList.add('walk-mode');$('walkbar').hidden=false;walkUI();shadowDirty=true;lastHash=u==='P'?'walk-party-deck':'walk-unit-'+u.toLowerCase();try{if((location.hash||'').slice(1)!==lastHash)location.hash=lastHash}catch(e){}
 if(!WK.seen){WK.seen=true;toast(tr('wkHint'))}}
function walkExit(quiet){if(!WK.on)return;WK.on=false;WK.anim=null;ctrl.walk=null;if(WK.lamp){WK.lamp.visible=false;WK.lamp.intensity=0}for(const r of WK.rings)r.g.visible=false;document.body.classList.remove('walk-mode');$('walkbar').hidden=true;const s=WK.saved;cam.near=s?s.near:0.25;cam.fov=s?s.fov:46;cam.updateProjectionMatrix();
 if(quiet!==true){const v=ED.views.find(q=>q.name==='Carolina Safari Suites');if(v)flyTo(v);else if(s)ctrl.set(s.p,s.t)}toast('')}
function walkStep(d){if(!WK.on)return;const n=S.walk.units[WK.u].length;walkGo((WK.i+d+n)%n,true)}
function walkGo(i,turn){const W=S.walk,p=W.units[WK.u][i],w=ctrl.walk;if(!w)return;let y1=turn?walkYaw(p.l):w.yaw;while(y1-w.yaw>Math.PI)y1-=6.2832;while(y1-w.yaw<-Math.PI)y1+=6.2832;
 WK.anim={k:0,p0:w.pos.clone(),p1:new THREE.Vector3(p.p[0],p.p[1]+W.eye,p.p[2]),y0:w.yaw,y1,t0:w.pitch,t1:turn?-0.06:w.pitch,dur:Math.min(1.6,0.55+w.pos.distanceTo(new THREE.Vector3(p.p[0],p.p[1]+W.eye,p.p[2]))*0.09)};WK.i=i;walkUI()}
function walkTick(dt){if(!WK.on)return;if(!WK.lamp){WK.lamp=new THREE.PointLight(0xfff0dc,0,0,2);scene.add(WK.lamp)}const P0=S.walk.units[WK.u][WK.i],tg=(P0.i?13:3)*(0.55+0.45*DAY)+NIGHT*5;WK.lamp.position.copy(cam.position);WK.lamp.intensity+=(tg-WK.lamp.intensity)*Math.min(1,dt*3);WK.lamp.visible=true;
 if(ctrl.walk&&Math.abs(ctrl.walk.yaw-wkMapYaw)>0.03)walkMap();
 if(!WK.anim)return;const a=WK.anim,w=ctrl.walk;a.k=Math.min(1,a.k+dt/a.dur);const e=a.k<0.5?2*a.k*a.k:1-Math.pow(-2*a.k+2,2)/2;w.pos.lerpVectors(a.p0,a.p1,e);w.yaw=a.y0+(a.y1-a.y0)*e;w.pitch=a.t0+(a.t1-a.t0)*e;ctrl.update();if(a.k>=1){WK.anim=null;walkUI()}}
let wkMapYaw=9;
function walkUI(){const W=S.walk;if(!WK.on)return;const P=W.units[WK.u];for(const r of WK.rings)r.g.visible=r.u===WK.u&&(r.i!==WK.i||!!WK.anim);$('wkname').textContent=tr(WK.u==='P'?'wkAtDeck':'wkAt',{u:WK.u,i:WK.i+1,n:P.length,s:trn('wk',P[WK.i].n)});walkMap()}
function walkMap(){const cv=$('wkmap'),W=S.walk;if(!cv||!WK.on)return;const pl=(W.plans&&W.plans[WK.u])||W.plan,pr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth||170,h=cv.clientHeight||96;if(cv.width!==w*pr){cv.width=w*pr;cv.height=h*pr}const x=cv.getContext('2d');x.setTransform(pr,0,0,pr,0,0);x.clearRect(0,0,w,h);
 const x0=pl.lounge[0]-1,x1=pl.deck[2]+1,y0=pl.lounge[1]-1,y1=pl.deck[3]+1,k=Math.min(w/(x1-x0),h/(y1-y0)),ox=(w-(x1-x0)*k)/2,oy=(h-(y1-y0)*k)/2,m=d=>[ox+(x1-d[0])*k,oy+(d[1]-y0)*k];WK.map=m;
 const poly=(pts,fill,st)=>{x.beginPath();pts.forEach((p,i)=>{const q=m(p);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])});x.closePath();if(fill){x.fillStyle=fill;x.fill()}if(st){x.strokeStyle=st;x.lineWidth=1.2;x.stroke()}},bx=(b)=>[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]];
 poly(bx(pl.deck),'rgba(190,160,120,0.55)','rgba(90,70,45,0.9)');poly(bx(pl.lounge),'rgba(190,160,120,0.55)','rgba(90,70,45,0.9)');poly(pl.verandah,'rgba(235,225,200,0.6)',null);poly(pl.room,'rgba(250,246,232,0.95)','rgba(60,50,40,0.95)');
 const ys=pl.room.map(p=>p[1]),a=m([pl.bath_x,Math.min(...ys)]),b=m([pl.bath_x,Math.max(...ys)]);x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.strokeStyle='rgba(60,50,40,0.8)';x.lineWidth=1;x.stroke();
 const P=W.units[WK.u],cu=P[WK.i],w0=ctrl.walk;if(w0&&P.length>3){const A=P[0],B=P[2],C=P[3],a1=[B.p[0]-A.p[0],B.p[2]-A.p[2]],a2=[C.p[0]-A.p[0],C.p[2]-A.p[2]],b1=[B.d[0]-A.d[0],B.d[1]-A.d[1]],b2=[C.d[0]-A.d[0],C.d[1]-A.d[1]],det=a1[0]*a2[1]-a2[0]*a1[1],sx=Math.sin(w0.yaw),sz=Math.cos(w0.yaw),c1=(sx*a2[1]-a2[0]*sz)/det,c2=(a1[0]*sz-sx*a1[1])/det,hd=[c1*b1[0]+c2*b2[0],c1*b1[1]+c2*b2[1]],q0=m(cu.d),q1=m([cu.d[0]+hd[0],cu.d[1]+hd[1]]),an=Math.atan2(q1[1]-q0[1],q1[0]-q0[0]);
  x.beginPath();x.moveTo(q0[0],q0[1]);x.arc(q0[0],q0[1],20,an-0.5,an+0.5);x.closePath();x.fillStyle='rgba(26,115,232,0.38)';x.fill();wkMapYaw=w0.yaw}
 P.forEach((p,i)=>{const q=m(p.d);x.beginPath();x.arc(q[0],q[1],i===WK.i?5:3.2,0,6.2832);x.fillStyle=i===WK.i?'#1a73e8':'#ffffff';x.fill();x.strokeStyle='#1a3a6e';x.lineWidth=1.2;x.stroke()})}
function walkPick(e){if(!WK.on)return false;const r=canvas.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,cam);const hs=[];for(const q of WK.rings)if(q.g.visible)hs.push(...ray.intersectObjects(q.hit,false));
 if(!hs.length)return false;hs.sort((a,b)=>a.distance-b.distance);for(const n of ray.intersectObjects(picks.filter(m=>m.visible&&!m.userData.wk),false)){if(n.distance>=hs[0].distance-0.15)break;const nm=n.object.userData.rng?nameAt(n.object,n.faceIndex):'';if(!/door|window|glass|rail/i.test(nm))return false}   // a circle seen through glass can be tapped; one behind a wall or furniture cannot
 walkGo(hs[0].object.userData.wk[1],false);return true}
window.__walk=(u,i)=>{if(u===null){walkExit();return 'out'}if(u!==undefined){if(!WK.on||WK.u!==u)walkEnter(u,i||0);else walkGo(i||0,true);if(WK.anim){WK.anim.k=0.999;walkTick(0.1)}}return {on:WK.on,u:WK.u,i:WK.i,n:WK.on?S.walk.units[WK.u].length:0,name:WK.on?S.walk.units[WK.u][WK.i].n:null,rings:WK.rings.filter(r=>r.g.visible).length}};
window.__rings=()=>{const R=canvas.getBoundingClientRect();return WK.rings.filter(r=>r.g.visible).map(r=>{const v=r.g.position.clone().project(cam);const q={i:r.i,x:Math.round((v.x+1)/2*R.width),y:Math.round((1-v.y)/2*R.height),z:+v.z.toFixed(4)};if(q.z<1){mouse.x=v.x;mouse.y=v.y;ray.setFromCamera(mouse,cam);const h=ray.intersectObjects(r.hit,false)[0],n=ray.intersectObjects(picks.filter(m=>m.visible&&!m.userData.wk),false)[0];q.free=!!h&&!(n&&n.distance<h.distance-0.15)}return q}).filter(q=>q.z<1&&q.x>20&&q.y>20&&q.x<R.width-20&&q.y<R.height-20)};window.__tap=(x,y)=>pick({clientX:x,clientY:y});window.__dbgRing=i=>{const r=WK.rings.find(q=>q.u===WK.u&&q.i===i),v=r.g.position.clone().project(cam);mouse.x=v.x;mouse.y=v.y;ray.setFromCamera(mouse,cam);const h=ray.intersectObjects(r.hit,false)[0],ns=ray.intersectObjects(picks.filter(m=>m.visible&&!m.userData.wk),false).slice(0,3);return {h:h&&+h.distance.toFixed(2),n:ns.map(n=>[+n.distance.toFixed(2),n.object.userData.rng?nameAt(n.object,n.faceIndex):(n.object.type+(n.object.userData.water?' water':''))])}};
window.__look=(yaw,pitch)=>{if(ctrl.walk){if(yaw!==undefined)ctrl.walk.yaw+=yaw;if(pitch!==undefined)ctrl.walk.pitch=pitch;ctrl.update()}return ctrl.walk&&{yaw:ctrl.walk.yaw,pitch:ctrl.walk.pitch}};
// ---- D-13 / D-14: party deck colour LEDs, cabin uplights, pendants in the live oak; D-16: quiet music on the party deck ----
const LT={sp:{},mode:'fade',cab:true,grp:null,pcs:[],im:null,pts:null,stp:null,wash:[],cabG:null,cw:[],cgl:[],cpl:[],lens:null,globe:null,dark:true};
const _lc=new THREE.Color(),_lw=new THREE.Color(0xffd9a0);
function ltOk(){return !VIS&&showOn.tProp!==false}
function ltCol(c,t){if(LT.mode==='white')return _lc.copy(_lw);if(LT.mode==='party'){const b=Math.floor(t*2.2);return _lc.setHSL((((c.s*0.035-t*0.45)%1)+1)%1,1,0.5).multiplyScalar(0.45+0.55*(((Math.floor(c.s/1.4)+b)%3)===0?1:0.35))}return _lc.setHSL((((t*0.035+c.s*0.0035)%1)+1)%1,0.95,0.52)}
function buildDeckLed(){const D=S.deckled;if(!D||VIS||LT.grp)return;const sv=store.get('abf3d.lt')||{};LT.mode=sv.mode||D.mode||'fade';const g=new THREE.Group();LT.grp=g;scene.add(g);let s0=0;
 for(const r of D.runs){const a=new THREE.Vector3(r.a[0],r.a[1],r.a[2]),b=new THREE.Vector3(r.b[0],r.b[1],r.b[2]),L=a.distanceTo(b),n=Math.max(1,Math.round(L/0.42));for(let i=0;i<n;i++)LT.pcs.push({p:a.clone().lerp(b,(i+0.5)/n),d:b.clone().sub(a).normalize(),l:L/n,s:s0+L*(i+0.5)/n,k:r.k});s0+=L}
 const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.03,0.03),new THREE.MeshBasicMaterial({toneMapped:false}),LT.pcs.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),X=new THREE.Vector3(1,0,0),sc=new THREE.Vector3();
 LT.pcs.forEach((c,i)=>{q.setFromUnitVectors(X,c.d);sc.set(c.l,1,1);m4.compose(c.p,q,sc);im.setMatrixAt(i,m4);im.setColorAt(i,_lc.set(0x6a6a66))});im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.frustumCulled=false;g.add(im);LT.im=im;
 const mkPts=(arr,size)=>{const geo=new THREE.BufferGeometry(),pos=new Float32Array(arr.length*3),col=new Float32Array(arr.length*3);arr.forEach((p,i)=>{pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z});geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const P=new THREE.Points(geo,new THREE.PointsMaterial({map:getGlow(),size,sizeAttenuation:true,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));P.renderOrder=6;P.frustumCulled=false;P.visible=false;g.add(P);return P};
 LT.pts=mkPts(LT.pcs.map(c=>new THREE.Vector3(c.p.x,c.p.y-0.04,c.p.z)),1.05);
 LT.stp=mkPts(D.steps.map(p=>new THREE.Vector3(p[0],p[1]+0.03,p[2])),0.75);const sc2=LT.stp.geometry.attributes.color;for(let i=0;i<sc2.count;i++)sc2.setXYZ(i,1,0.82,0.55);sc2.needsUpdate=true;
 D.wash.forEach(p=>{const pl=new THREE.PointLight(0xffffff,0,9,1.7);pl.position.set(p[0],p[1],p[2]);pl.visible=false;g.add(pl);LT.wash.push(pl)})}
function buildCabLite(){const C=S.cablite;if(!C||VIS||LT.cabG)return;const sv=store.get('abf3d.lt')||{};LT.cab=sv.cab===false?'off':(typeof sv.cab==='string'?sv.cab:'white');LT.cgb=[];const g=new THREE.Group();LT.cabG=g;scene.add(g);
 const body=new THREE.MeshStandardMaterial({color:0x2b2723,roughness:0.55,metalness:0.6});LT.lens=new THREE.MeshBasicMaterial({color:0x77705f,toneMapped:false});LT.globe=new THREE.MeshBasicMaterial({color:0xcfc6b2,toneMapped:false});
 const cv=document.createElement('canvas');cv.width=64;cv.height=128;const x=cv.getContext('2d'),im=x.createImageData(64,128);for(let j=0;j<128;j++)for(let i=0;i<64;i++){const v=1-j/127,u=(i-31.5)/31.5,w=0.16+0.84*v,a=Math.max(0,1-(u*u)/(w*w))*Math.pow(1-v,1.5)*(v<0.03?v/0.03:1),k=(j*64+i)*4;im.data[k]=255;im.data[k+1]=255;im.data[k+2]=255;im.data[k+3]=Math.round(255*a)}x.putImageData(im,0,0);const wt=new THREE.CanvasTexture(cv);
 const cyl=new THREE.CylinderGeometry(0.06,0.07,0.14,10),disc=new THREE.CylinderGeometry(0.075,0.075,0.02,14),ln=new THREE.CylinderGeometry(0.05,0.05,0.012,12);
 for(const u of C.up){const p=u.p,deck=u.k==='deck',f=new THREE.Mesh(deck?disc:cyl,body);f.position.set(p[0],p[1]+(deck?0.01:0.07),p[2]);g.add(f);const l=new THREE.Mesh(ln,LT.lens);l.position.set(p[0],p[1]+(deck?0.024:0.146),p[2]);g.add(l);
  const off=(deck?0.3048:0.61)-0.04,base=deck?p[1]:Math.max(p[1],u.base||p[1]),H=Math.max(0.6,u.top-base),w=new THREE.Mesh(new THREE.PlaneGeometry(1.9,H),new THREE.MeshBasicMaterial({map:wt,color:0xffc27a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  w.position.set(p[0]-u.n[0]*off,base+H/2,p[2]-u.n[1]*off);w.lookAt(w.position.x+u.n[0],w.position.y,w.position.z+u.n[1]);w.renderOrder=5;w.visible=false;g.add(w);LT.cw.push(w)}
 const cord=new THREE.MeshStandardMaterial({color:0x1b1a18,roughness:0.8}),gl=new THREE.SphereGeometry(0.11,14,10),cap=new THREE.CylinderGeometry(0.03,0.075,0.09,10);
 for(const q of C.pend){const p=q.p,L=q.top-p[1],c=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,L,5),cord);c.position.set(p[0],p[1]+L/2+0.1,p[2]);g.add(c);const k=new THREE.Mesh(cap,body);k.position.set(p[0],p[1]+0.13,p[2]);g.add(k);const gm=LT.globe.clone();LT.cgb.push(gm);const b=new THREE.Mesh(gl,gm);b.position.set(p[0],p[1],p[2]);g.add(b);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlow(),color:0xffc27a,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));s.position.set(p[0],p[1],p[2]);s.scale.set(1.5,1.5,1);s.renderOrder=6;s.visible=false;g.add(s);LT.cgl.push(s)}
 if(C.pend.length){const P=C.pend.map(q=>q.p).sort((a,b)=>a[0]-b[0]),n=Math.min(3,P.length);for(let i=0;i<n;i++){const part=P.slice(Math.floor(i*P.length/n),Math.floor((i+1)*P.length/n)),m=[0,0,0];part.forEach(p=>{m[0]+=p[0]/part.length;m[1]+=p[1]/part.length;m[2]+=p[2]/part.length});const pl=new THREE.PointLight(0xffc27a,0,12,1.6);pl.position.set(m[0],m[1]-0.25,m[2]);pl.visible=false;g.add(pl);LT.cpl.push(pl)}}}
function buildSpots(id){const C=S[id];if(!C||VIS||LT.sp[id])return;const sv=store.get('abf3d.lt')||{},o={on:(sv.sp||{})[id]!==false&&!(id==='lnglite'&&sv.lng===false),gl:[],pl:[],pool:[]};LT.sp[id]=o;const g=new THREE.Group();o.G=g;scene.add(g);
 const body=new THREE.MeshStandardMaterial({color:0xd8d4c8,roughness:0.6}),dark=new THREE.MeshStandardMaterial({color:0x2b2723,roughness:0.6});o.lens=new THREE.MeshBasicMaterial({color:0x8a8473,toneMapped:false});
 const fx=new THREE.CylinderGeometry(0.13,0.13,0.035,16),ln=new THREE.CylinderGeometry(0.105,0.105,0.012,16),rl=new THREE.BoxGeometry(0.06,0.05,0.06),pool=new THREE.CircleGeometry(1,24);pool.rotateX(-Math.PI/2);
 for(const q of C.l){const p=q.p,ce=q.k==='ceil';if(ce){const f=new THREE.Mesh(fx,body);f.position.set(p[0],p[1],p[2]);g.add(f);const l=new THREE.Mesh(ln,o.lens);l.position.set(p[0],p[1]-0.022,p[2]);g.add(l)}else{const f=new THREE.Mesh(rl,dark);f.position.set(p[0],p[1],p[2]);g.add(f)}
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlow(),color:0xffcf94,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));s.position.set(p[0],p[1]-(ce?0.2:0.04),p[2]);const k=ce?0.5:0.4;s.scale.set(k,k,1);s.renderOrder=6;s.visible=false;g.add(s);o.gl.push(s);
  const pm=new THREE.Mesh(pool,new THREE.MeshBasicMaterial({map:getGlow(),color:0xffc27a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));const r=ce?1.7:0.6;pm.scale.set(r,1,r);pm.position.set(p[0],q.f+0.03,p[2]);pm.renderOrder=5;pm.visible=false;g.add(pm);o.pool.push([pm,0.3])}
 const cl=C.l.filter(q=>q.k==='ceil').map(q=>q.p).sort((a,b)=>a[0]-b[0]),n=Math.min(4,cl.length);for(let i=0;i<n;i++){const part=cl.slice(Math.floor(i*cl.length/n),Math.floor((i+1)*cl.length/n)),m=[0,0,0];part.forEach(p=>{m[0]+=p[0]/part.length;m[1]+=p[1]/part.length;m[2]+=p[2]/part.length});const pl=new THREE.PointLight(0xffcf94,0,8,1.6);pl.position.set(m[0],m[1]-0.3,m[2]);pl.visible=false;g.add(pl);o.pl.push(pl)}}
function ltTick(t){const ok=ltOk(),on=sm(0.03,0.16,NIGHT);
 if(LT.grp){LT.grp.visible=ok;const lit=ok&&LT.mode!=='off'?on:0,show=lit>0.004;if(show||!LT.dark){const col=LT.pts.geometry.attributes.color;LT.pcs.forEach((c,i)=>{const k=ltCol(c,t);col.setXYZ(i,k.r*lit,k.g*lit,k.b*lit);if(show)LT.im.setColorAt(i,k.multiplyScalar(0.3+0.7*lit));else LT.im.setColorAt(i,_lc.set(0x6a6a66))});col.needsUpdate=true;LT.im.instanceColor.needsUpdate=true;LT.dark=!show}
  LT.pts.visible=show;LT.pts.material.opacity=Math.min(1,lit)*0.8;const so=ok?on:0;LT.stp.visible=so>0.004;LT.stp.material.opacity=so*0.9;
  LT.wash.forEach((pl,i)=>{pl.visible=show;if(show){const k=ltCol({s:20+i*28},t);pl.color.copy(k);pl.intensity=lit*(i===3?13:9)}})}
 if(LT.cabG){LT.cabG.visible=ok;const k=ok&&LT.cab!=='off'?on:0,sh=k>0.004;LT.cw.forEach((w,i)=>{w.visible=sh;w.material.opacity=k*0.5;if(sh)w.material.color.copy(cabCol(i,t))});LT.cgl.forEach((s,i)=>{s.visible=sh;s.material.opacity=k*0.95;if(sh){s.material.color.copy(cabCol(i+40,t));LT.cgb[i].color.copy(_cc).lerp(_cw,0.35)}else LT.cgb[i].color.setRGB(0.81,0.78,0.7)});LT.cpl.forEach((pl,i)=>{pl.visible=sh;pl.intensity=k*22;if(sh)pl.color.copy(cabCol(44+i*7,t))})
  if(sh)LT.lens.color.copy(cabCol(0,t)).lerp(_cw,0.4);else LT.lens.color.setRGB(0.47,0.44,0.37)}
 for(const id in LT.sp){const o=LT.sp[id];o.G.visible=ok;const k=ok&&o.on?on:0,sh=k>0.004;for(const q of o.gl){q.visible=sh;q.material.opacity=k*0.95}for(const q of o.pool){q[0].visible=sh;q[0].material.opacity=k*q[1]}for(const pl of o.pl){pl.visible=sh;pl.intensity=k*6.5}o.lens.color.setRGB(0.54+0.46*k,0.52+0.38*k,0.45+0.25*k)}}
const _cc=new THREE.Color(),_cw=new THREE.Color(0xffffff),_c2=new THREE.Color(),CABP={sunset:[0xff8a2a,0xff4d2e,0xffb347,0xe0325a],pond:[0x19c2d1,0x2a7bff,0x1fd68a,0x7fe3ff]};
function cabCol(i,t){const m=LT.cab;if(m==='fade')return _cc.setHSL((((t*0.03+i*0.045)%1)+1)%1,0.95,0.55);const P=CABP[m];if(!P)return _cc.set(0xffc27a);const x=t/7+i*0.37,a=Math.floor(x),f=x-a,e=f*f*(3-2*f);return _cc.set(P[((a%P.length)+P.length)%P.length]).lerp(_c2.set(P[(((a+1)%P.length)+P.length)%P.length]),e)}
function ltSave(){const sp={};for(const id in LT.sp)sp[id]=LT.sp[id].on;store.set('abf3d.lt',{mode:LT.mode,cab:LT.cab,sp})}
function ltUI(){const el=$('ltc');if(!el)return;const has=(S.deckled||S.cablite||S.lnglite||S.hselite)&&!VIS;el.textContent='';{const q=chip(el,tr('ltStars'),CSTL.on,()=>{CSTL.on=!CSTL.on;store.set('abf3d.cs',CSTL.on);ltUI()});q.setAttribute('aria-pressed',CSTL.on)}if(!has)return;
 if(S.deckled)for(const [m,k] of [['fade','ltFade'],['party','ltParty'],['white','ltWhite'],['off','ltOff']])chip(el,tr(k),LT.mode===m,()=>{LT.mode=m;LT.dark=false;ltSave();ltUI()});
 if(S.cablite)for(const [m,k] of [['white','ltCabW'],['fade','ltCabF'],['sunset','ltCabS'],['pond','ltCabP'],['off','ltCabO']])chip(el,tr(k),LT.cab===m,()=>{LT.cab=m;ltSave();ltUI()});
 for(const [id,k] of [['lnglite','ltLng'],['hselite','ltHse']]){const o=LT.sp[id];if(!o)continue;const q=chip(el,tr(k),o.on,()=>{o.on=!o.on;ltSave();ltUI()});q.setAttribute('aria-pressed',o.on)}}
window.__lt=(m,c)=>{if(m)LT.mode=m;if(c!==undefined)LT.cab=c===true?'white':c===false?'off':c;LT.dark=false;ltUI();return {mode:LT.mode,cab:LT.cab,pcs:LT.pcs.length,up:LT.cw.length,pend:LT.cgl.length}};
// music: a soft piano prelude (J. S. Bach, 1722, public domain) alternating with a slow improvised jazz trio; made in the browser, nothing downloaded
const MUS=[];let muBuilt=false;
const MU_B=[[60,64,67,72,76],[60,62,69,74,77],[59,62,67,74,77],[60,64,67,72,76],[60,64,69,76,81],[60,62,66,69,74],[59,62,67,74,79],[59,60,64,67,72],[57,60,64,67,72],[50,57,62,66,72],[55,59,62,67,71],[55,58,64,67,73],[53,57,62,69,74],[53,56,62,65,71],[52,55,60,67,72],[52,53,57,60,65],[50,53,57,60,65],[43,50,55,59,65],[48,52,55,60,64],[48,55,58,60,64],[41,53,57,60,64],[42,48,57,60,63],[44,53,59,60,62],[43,53,55,59,62],[43,52,55,60,64],[43,50,55,60,65],[43,50,55,59,65],[43,51,57,60,66],[43,52,55,60,67],[43,50,55,60,65],[43,50,55,59,65],[36,48,55,58,64]];
const MU_J=[{r:38,v:[53,57,60,64],sc:[62,64,65,67,69,72,74]},{r:43,v:[53,57,59,64],sc:[62,65,67,69,71,74,77]},{r:36,v:[52,55,59,62],sc:[60,62,64,67,69,71,72]},{r:45,v:[49,55,58,61],sc:[61,64,67,69,70,73,76]}];
const MU_T={'6':[0,4,7,9],'7':[0,4,7,10],'m7':[0,3,7,10],'m6':[0,3,7,9]};
function muHz(m){return 440*Math.pow(2,(m-69)/12)}
function muNote(m,t,dur,vel,kind,dst){const c=SND.ctx,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter(),reed=kind==='reed';o.type=kind==='bass'?'sine':reed?'sawtooth':'triangle';o.frequency.value=muHz(m);f.type='lowpass';f.frequency.value=kind==='bass'?700:reed?Math.min(2400,muHz(m)*3):Math.min(5200,muHz(m)*5);
 g.gain.setValueAtTime(0,t);if(reed){g.gain.linearRampToValueAtTime(vel*0.6,t+0.04);g.gain.setValueAtTime(vel*0.5,t+Math.max(0.05,dur-0.07));g.gain.linearRampToValueAtTime(0,t+dur)}else{g.gain.linearRampToValueAtTime(vel,t+(kind==='bass'?0.02:0.006));g.gain.exponentialRampToValueAtTime(vel*0.32,t+Math.min(0.25,dur*0.5));g.gain.exponentialRampToValueAtTime(0.0008,t+dur)}o.connect(f);f.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+0.05);
 if(kind==='piano'){const o2=c.createOscillator(),g2=c.createGain();o2.type='sine';o2.frequency.value=muHz(m)*2.003;g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(vel*0.22,t+0.005);g2.gain.exponentialRampToValueAtTime(0.0008,t+dur*0.5);o2.connect(g2);g2.connect(dst);o2.start(t);o2.stop(t+dur*0.5+0.05)}}
function muBrush(t,vel,dst){const c=SND.ctx,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=BUF.white;f.type='highpass';f.frequency.value=5200;g.gain.setValueAtTime(vel,t);g.gain.exponentialRampToValueAtTime(0.0008,t+0.16);s.connect(f);f.connect(g);g.connect(dst);s.start(t,R_()*1.5,0.2)}
function muNear(st,arr){let k=0;arr.forEach((m,i)=>{if(Math.abs(m-st.last)<Math.abs(arr[k]-st.last))k=i});k=Math.max(0,Math.min(arr.length-1,k+[-2,-1,-1,1,1,2][(R_()*6)|0]));st.last=arr[k];return st.last}
function muTones(ch,oct){const T=MU_T[ch[1]],o=[];for(let k=0;k<2;k++)for(const x of T)o.push(ch[0]+oct+x+12*k);return o}
// party deck: a soft piano prelude (J. S. Bach, 1722, public domain) alternating with a slow improvised jazz trio
function muDeck(st,t){const d=st.g;
 if(st.sec===0){const six=0.2,ch=MU_B[st.bar],i=st.step%8,n=ch[[0,1,2,3,4,2,3,4][i]];muNote(n,t,i<2?six*7.5:six*2.2,i===0?0.2:i===1?0.16:0.13,'piano',d);st.next+=six*(st.bar===MU_B.length-1&&st.step>11?1.25:1);
  if(++st.step>=16){st.step=0;if(++st.bar>=MU_B.length){[36,48,52,55,60,64].forEach((m,k)=>muNote(m,st.next+k*0.07,5,0.15,'piano',d));st.next+=7;st.bar=0;st.sec=1}}}
 else{const beat=0.62,sw=beat*0.64,ch=MU_J[st.bar%4],b=st.step%4,nx=MU_J[(st.bar+1)%4];
  const bn=b===0?ch.r:b===1?ch.r+(R_()<0.5?4:3):b===2?ch.r+7:nx.r+(R_()<0.5?1:-1);muNote(bn,t,beat*0.95,0.3,'bass',d);muBrush(t,b%2?0.05:0.03,d);if(b%2)muBrush(t+sw,0.025,d);
  if((b===0&&R_()<0.55)||(b===2&&R_()<0.35)||R_()<0.12){const at=t+(R_()<0.6?sw:0);ch.v.forEach((m,k)=>muNote(m+12,at+k*0.008,beat*(1+R_()),0.055,'piano',d))}
  for(const off of [0,sw])if(R_()<0.42)muNote(muNear(st,ch.sc)+12,t+off,beat*(0.5+R_()*1.2),0.1+R_()*0.05,'piano',d);
  st.next+=beat;if(++st.step>=4){st.step=0;if(++st.bar>=32){ch.v.concat([72]).forEach((m,k)=>muNote(m,st.next+k*0.05,4,0.08,'piano',d));st.next+=5.5;st.bar=0;st.sec=0}}}}
// the four tents: original pieces in the styles of the 1920s to the 1940s (not the hit songs themselves - those are still under copyright)
function mu20(st,t){const beat=0.29,P=[[36,'6'],[36,'6'],[41,'6'],[41,'m6'],[36,'6'],[45,'7'],[38,'7'],[43,'7']],ch=P[st.bar%8],b=st.step,d=st.g,T=muTones(ch,12);   // 1920s stride piano with the Charleston beat
 if(b%2===0)muNote(ch[0]+(b===2?(ch[0]>40?-5:7):0),t,beat*1.1,0.26,'bass',d);else [T[1],T[2],T[3]].forEach((m,k)=>muNote(m+(m<52?12:0),t+k*0.004,beat*0.55,0.07,'piano',d));
 const M=muTones(ch,36);if(b===0||R_()<0.3)muNote(muNear(st,M),t,beat*1.3,0.13,'piano',d);if(b===1)muNote(muNear(st,M),t+beat*0.5,beat*1.6,0.14,'piano',d);else if(b===3&&R_()<0.5)muNote(muNear(st,M),t+beat*0.5,beat*0.5,0.1,'piano',d);
 st.next+=beat;if(++st.step>=4){st.step=0;st.bar++}}
function mu30(st,t){const beat=0.43,sw=beat*0.64,P=[[46,'6'],[43,'7'],[48,'m7'],[41,'7']],ch=P[st.bar%4],nx=P[(st.bar+1)%4],b=st.step,d=st.g;   // 1930s swing: walking bass, brushes, a riff the band keeps coming back to
 if(b===0&&st.bar%8===0){st.riff=[];let e=0;while(e<8){if(R_()<0.62)st.riff.push([e,(R_()*5)|0,R_()<0.3?2:1]);e+=R_()<0.5?1:2}}
 const bn=(b===0?ch[0]:b===1?ch[0]+MU_T[ch[1]][1]:b===2?ch[0]+7:nx[0]+(R_()<0.5?1:-1))-12;muNote(bn<31?bn+12:bn,t,beat*0.95,0.3,'bass',d);muBrush(t,b%2?0.05:0.03,d);if(b%2)muBrush(t+sw,0.025,d);
 if(b===1||b===3)muTones(ch,12).slice(1,4).forEach((m,k)=>muNote(m+12,t+k*0.004,beat*0.3,0.045,'piano',d));
 const T=muTones(ch,24),rest=st.bar%8>=6;if(st.riff&&!rest)for(const r of st.riff)if((r[0]>>1)===b)muNote(T[r[1]]+(st.bar%4===2?0:0),t+(r[0]%2?sw:0),beat*0.5*r[2],0.11,'reed',d);
 if(rest&&R_()<0.5)muNote(muNear(st,muTones(ch,36)),t+(R_()<0.5?sw:0),beat*0.6,0.1,'piano',d);
 st.next+=beat;if(++st.step>=4){st.step=0;st.bar++}}
function mu40(st,t){const beat=0.36,sw=beat*0.64,R12=[41,41,41,41,46,46,41,41,48,46,41,48],r=R12[st.bar%12],b=st.step,d=st.g,L=[0,0,4,4,7,7,9,7];   // 1940s boogie-woogie: twelve-bar blues, rolling left hand
 muNote(r+L[b*2]-(r>45?12:0),t,beat*0.6,0.24,'bass',d);muNote(r+L[b*2+1]-(r>45?12:0),t+sw,beat*0.4,0.2,'bass',d);if(b%2)muBrush(t,0.035,d);
 const B=[0,3,4,7,9,10,12,15,16].map(x=>r+24+x+(r>45?-12:0)),u=R_();
 if(u<0.3){for(let k=0;k<3;k++)muNote(muNear(st,B),t+k*beat/3,beat*0.3,0.11,'piano',d)}else if(u<0.55){[4,10].forEach(x=>{muNote(r+24+x+(r>45?-12:0),t,beat*0.25,0.09,'piano',d);muNote(r+24+x+(r>45?-12:0),t+sw,beat*0.25,0.08,'piano',d)})}else if(u<0.75)muNote(muNear(st,B),t+sw,beat*0.7,0.12,'piano',d);
 st.next+=beat;if(++st.step>=4){st.step=0;st.bar++}}
function muBallad(st,t){const beat=0.8,P=[[39,'6'],[36,'m7'],[41,'m7'],[46,'7']],ch=P[st.bar%4],b=st.step,d=st.g,T=muTones(ch,24);   // 1940s slow dance-band ballad
 if(b%2===0)muNote(ch[0]+(b===2?7:0)-(ch[0]>43?12:0),t,beat*1.9,0.24,'bass',d);muBrush(t,0.02,d);
 [0,1].forEach(e=>muNote(T[(b*2+e)%4]+(R_()<0.2?12:0),t+e*beat/2,beat*1.4,0.05,'piano',d));
 if(b===0)muNote(muNear(st,muTones(ch,36)),t,beat*(R_()<0.5?1.9:2.8),0.1,'reed',d);else if(b===3&&R_()<0.6)muNote(muNear(st,muTones(ch,36)),t+beat*0.5,beat*0.5,0.08,'reed',d);
 st.next+=beat;if(++st.step>=4){st.step=0;st.bar++}}
function muMk(pos,ref,lvl,gen,radio){const c=SND.ctx,st={pos,ref,lvl,gen,next:0,sec:0,bar:0,step:0,last:72,riff:null};st.g=c.createGain();st.g.gain.value=0;let last=st.g;
 if(radio){const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=240;const l2=c.createBiquadFilter();l2.type='lowpass';l2.frequency.value=3600;last.connect(hp);hp.connect(l2);last=l2}
 st.lp=c.createBiquadFilter();st.lp.type='lowpass';st.lp.frequency.value=6000;last.connect(st.lp);if(c.createStereoPanner){st.pan=c.createStereoPanner();st.lp.connect(st.pan);st.pan.connect(BUS.music)}else st.lp.connect(BUS.music);
 st.wet=c.createGain();st.wet.gain.value=0.2;st.lp.connect(st.wet);st.wet.connect(sndRev);MUS.push(st);return st}
function muInit(){if(muBuilt||!SND.ctx||!BUS.music)return;muBuilt=true;if(S.deckled){const p=S.deckled.wash[1];muMk([p[0],p[1],p[2]],9,0.4,muDeck,false)}
 if(S.walk&&!VIS){const G=[mu20,mu30,mu40,muBallad];['A','B','C','D'].forEach((u,i)=>{const U=S.walk.units[u];if(!U)return;const b=U.find(q=>q.k==='bed')||U[U.length-1];muMk([b.p[0],b.p[1]+1.2,b.p[2]],5,0.34,G[i],true)})}}
function muTick(){const c=SND.ctx;if(!c||c.state!=='running')return;muInit();const now=c.currentTime,ok=SND.on&&SND.grp.music!==false&&ltOk();
 for(const st of MUS){const s=spat(st.pos[0],st.pos[1],st.pos[2],st.ref),th=st.gen===muDeck?0.12:0.25,on=ok&&s.g>th&&(st.gen===muDeck||showOn['Carolina Safari Suites']!==false);st.g.gain.setTargetAtTime(on?st.lvl*(s.g-th)/(1-th):0,now,0.3);st.lp.frequency.setTargetAtTime(Math.min(6000,s.lp),now,0.3);if(st.pan)st.pan.pan.setTargetAtTime(s.pan,now,0.25);
  if(!on){st.next=0;continue}if(st.next<now)st.next=now+0.15;let n=0;while(st.next<now+0.7&&n++<40)st.gen(st,st.next)}}
window.__mu=()=>MUS.map(st=>({gen:st.gen.name,bar:st.bar,g:+st.g.gain.value.toFixed(3)}));
// ---- V-20: fish and safari constellations in the night sky (decoration: these are not real constellations) ----
const CSTL={g:null,on:true,mats:[]};
const CSTL_F=[
 {n:'The Bass',az:205,el:13.5,sz:9.5,loop:[[-1,0],[-0.6,0.28],[-0.2,0.38],[0.1,0.55],[0.45,0.3],[0.7,0.1],[1,0.4],[0.88,0],[1,-0.4],[0.7,-0.1],[0.2,-0.35],[-0.3,-0.33],[-0.75,-0.18]],lines:[[[-0.2,0.38],[0.1,0.2],[0.45,0.3]],[[-0.45,-0.05],[-0.2,-0.12]]],stars:[[-0.68,0.08]]},
 {n:'The Bream',az:258,el:10,sz:5.5,loop:[[-1,0],[-0.5,0.45],[0.05,0.62],[0.5,0.38],[0.72,0.08],[1,0.4],[0.9,0],[1,-0.4],[0.72,-0.08],[0.45,-0.42],[-0.1,-0.6],[-0.6,-0.4]],lines:[],stars:[[-0.62,0.1]]},
 {n:'The Elephant',az:130,el:14,sz:10,loop:[[-1,-0.55],[-0.92,-0.1],[-0.8,0.35],[-0.55,0.55],[0,0.5],[0.7,0.42],[0.85,0.2],[0.75,-0.05],[0.75,-0.8],[0.5,-0.8],[0.48,-0.2],[-0.15,-0.2],[-0.18,-0.8],[-0.43,-0.8],[-0.45,-0.1],[-0.62,-0.05],[-0.75,-0.1],[-0.85,-0.5]],lines:[[[0.85,0.2],[0.95,-0.2]],[[-0.55,0.55],[-0.38,0.38],[-0.3,0.12],[-0.45,-0.1]],[[-0.62,-0.05],[-0.9,-0.3]]],stars:[[-0.7,0.25]]},
 {n:'The Giraffe',az:50,el:11.5,sz:7.5,loop:[[-0.55,0.85],[-0.38,1],[-0.05,0.25],[0.55,0.05],[0.6,-1],[0.48,-1],[0.45,-0.25],[0,-0.2],[-0.02,-1],[-0.14,-1],[-0.18,-0.1],[-0.42,0.72]],lines:[[[0.55,0.05],[0.72,-0.35]],[[-0.38,1],[-0.34,1.1]]],stars:[[-0.45,0.88],[0.2,0],[-0.12,0.3],[0.35,-0.05]]},
 {n:'The Lion',az:335,el:13,sz:9.5,loop:[[-0.9,0.2],[-0.6,0.6],[-0.3,0.45],[0.5,0.35],[0.8,0.25],[0.8,-0.6],[0.66,-0.6],[0.6,-0.1],[-0.25,-0.1],[-0.3,-0.6],[-0.44,-0.6],[-0.55,-0.05],[-0.8,0]],lines:[[[0.8,0.25],[1,0.5],[1.1,0.78]],[[-0.6,0.6],[-0.45,0.2],[-0.55,-0.05]]],stars:[[-0.72,0.25]]}];
function buildConstellations(){if(CSTL.g)return;const sv=store.get('abf3d.cs');CSTL.on=sv!==false;const g=new THREE.Group(),R=3000,up=new THREE.Vector3(0,1,0),sp=[],lp=[];CSTL.g=g;
 const lab=(txt)=>{const cv=document.createElement('canvas');cv.width=256;cv.height=48;const x=cv.getContext('2d');x.font='600 22px "Space Grotesk",system-ui,sans-serif';x.textAlign='center';x.fillStyle='rgba(205,220,255,0.9)';x.fillText(txt,128,32);const m=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,opacity:0,depthWrite:false,fog:false});CSTL.mats.push([m,0.75]);const s=new THREE.Sprite(m);s.scale.set(330,62,1);return s};
 for(const F of CSTL_F){const ta=(F.taz||0)*Math.PI/180,a=F.taz!==undefined?Math.atan2(NORTH.x*Math.cos(ta)+EAST.x*Math.sin(ta),NORTH.y*Math.cos(ta)+EAST.y*Math.sin(ta)):F.az*Math.PI/180,e=F.el*Math.PI/180,c=new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)),rt=new THREE.Vector3().crossVectors(c,up).normalize(),u2=new THREE.Vector3().crossVectors(rt,c).normalize(),k=Math.tan(F.sz*Math.PI/180);
  const P=q=>new THREE.Vector3().copy(c).addScaledVector(rt,q[0]*k).addScaledVector(u2,q[1]*k).normalize().multiplyScalar(R);
  const L=F.loop.map(P);L.forEach((p,i)=>{sp.push(p);const n=L[(i+1)%L.length];lp.push(p.x,p.y,p.z,n.x,n.y,n.z)});
  for(const ln of F.lines){const Q=ln.map(P);Q.forEach((p,i)=>{if(i>0&&i<Q.length-1)sp.push(p);if(i){const o=Q[i-1];lp.push(o.x,o.y,o.z,p.x,p.y,p.z)}})}
  for(const s of F.stars)sp.push(P(s));const t=lab(F.n);t.position.copy(P([0,F.n==='The Giraffe'?-1.22:-1.0]));g.add(t);F.c=c.clone();F.lab=t}
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));const lm=new THREE.LineBasicMaterial({color:0x9db8ff,transparent:true,opacity:0,depthWrite:false,fog:false});CSTL.mats.push([lm,0.62]);const ls=new THREE.LineSegments(lg,lm);ls.frustumCulled=false;g.add(ls);
 const pg=new THREE.BufferGeometry(),pa=new Float32Array(sp.length*3);sp.forEach((p,i)=>{pa[i*3]=p.x;pa[i*3+1]=p.y;pa[i*3+2]=p.z});pg.setAttribute('position',new THREE.BufferAttribute(pa,3));
 const pm=new THREE.PointsMaterial({map:getGlow(),color:0xeaf1ff,size:11,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});CSTL.mats.push([pm,1]);const ps=new THREE.Points(pg,pm);ps.frustumCulled=false;g.add(ps);g.renderOrder=-5;g.visible=false;scene.add(g)}
function cstlTick(){if(!CSTL.g)return;const k=CSTL.on?sm(0.55,0.95,NIGHT):0;CSTL.g.visible=k>0.01;if(!CSTL.g.visible)return;CSTL.g.position.copy(cam.position);for(const m of CSTL.mats)m[0].opacity=k*m[1]}
window.__cstl=v=>{if(v!==undefined){CSTL.on=!!v;store.set('abf3d.cs',CSTL.on)}return CSTL.on};
function sndFountains(){const key=Fn.length+':'+Fn.map(f=>f.O.x.toFixed(1)+f.H.toFixed(1)).join(',');if(key===fnKey)return;fnKey=key;for(const o of fnSrc){try{o.s.stop()}catch(e){}o.g.disconnect();const i=CS.indexOf(o);if(i>=0)CS.splice(i,1)}fnSrc=[];
 Fn.slice(0,12).forEach((f,i)=>{const lvl=0.5*Math.max(0.5,Math.min(1.5,(f.H+f.W)/7));fnSrc.push(loopSrc(BUF.pink,'water',f.O.x,f.O.y+f.H*0.3,f.O.z,5,()=>lvl,[['highpass',380,0.5],['lowpass',4200+((i*977)%2600),0.5]]))})}
function sndSet(){if(!SND.ctx)return;const c=SND.ctx,now=c.currentTime;sndMaster.gain.setTargetAtTime(SND.on?SND.vol*0.9:0,now,0.25);for(const k in BUS)BUS[k].gain.setTargetAtTime(SND.grp[k]?1:0,now,0.2)}
function sndToggle(){if(!SND.ctx&&!sndInit()){toast(tr('sndNo'));return}SND.on=!SND.on;store.set('abf3d.snd',{vol:SND.vol,grp:SND.grp,on:SND.on});if(SND.on){const p=SND.ctx.resume();if(p&&p.catch)p.catch(()=>{})}sndSet();if(!SND.on)setTimeout(()=>{if(!SND.on&&SND.ctx)SND.ctx.suspend()},900);sndUI()}
function sndHint(){const el=$('sndhint');if(!el)return;const need=SND.on&&SND.ctx&&SND.ctx.state!=='running';el.textContent=tr('sndTap');el.hidden=!need;if(SND.ctx&&!SND.ctx.onstatechange)SND.ctx.onstatechange=sndHint}
function sndUI(){sndHint();const el=$('sndc');if(!el)return;el.textContent='';const b=chip(el,tr(SND.on?'sndOn':'sndOff'),SND.on,sndToggle,'sndbtn');b.setAttribute('aria-pressed',SND.on);
 for(const [k,key] of [['water','gWater'],['birds','gBirds'],['night','gNight'],['farm','gFarm']].concat(S&&S.deckled&&!VIS?[['music','gMusic']]:[])){const q=chip(el,tr(key),SND.grp[k],()=>{SND.grp[k]=!SND.grp[k];store.set('abf3d.snd',{vol:SND.vol,grp:SND.grp,on:SND.on});sndSet();sndUI()});q.setAttribute('aria-pressed',SND.grp[k])}
 if(S&&S.guests&&S.guests.line&&!VIS){const q=chip(el,tr('sayT'),SND.say,()=>saySet(!SND.say));q.setAttribute('aria-pressed',SND.say)}
 $('sndvol').value=Math.round(SND.vol*100)}
function saySet(v){SND.say=!!v;store.set('abf3d.say',SND.say);if(!SND.say){try{if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}if(GA){GA.sayT=-99}}else if(GA)GA.nThrow=0;sndUI()}   // switched back on: he says it on his very next throw
window.__say=v=>{if(v!==undefined)saySet(v);return {say:SND.say,bubble:!!(GA&&GA.bub&&GA.bub.visible)}};
function sndEvent(name,x,y,z,ref,grp,arg){const c=SND.ctx;if(!c||c.state!=='running')return;try{SV[name](c,place(x,y,z,ref,grp),c.currentTime+0.05,arg)}catch(e){}}
function sndSplash(x,y,z,k){if(!SND.on||!SND.grp.water||!fishOn)return;sndEvent('splash',x,y,z,6,'water',Math.min(1.3,k))}
function nearTree(){const T=S.trees;if(T&&T.length)for(let i=0;i<14;i++){const q=T[(R_()*T.length)|0],d=Math.hypot(q[0]-ctrl.target.x,q[1]-ctrl.target.z);if(d<150&&d>8)return [q[0],q[2]+q[3]*0.8,q[1]]}const a=R_()*6.2832,r=30+R_()*70;return [ctrl.target.x+Math.cos(a)*r,ctrl.target.y+8,ctrl.target.z+Math.sin(a)*r]}
function bump(x,m,w){const d=(x-m)/w;return Math.exp(-d*d)}
function sndTick(t){if(!SND.on||!SND.ctx||SND.ctx.state!=='running'||t<sndNext)return;sndNext=t+0.12;listen();sndFountains();muTick();const now=SND.ctx.currentTime;
 for(const o of CS){let g=o.level();if(o.pos){let x=o.x,z=o.z;if(o.poly){let bd=1e9;for(let i=0;i<o.poly.length;i+=3){const p=o.poly[i],d=(p[0]-_L.x)*(p[0]-_L.x)+(p[1]-_L.z)*(p[1]-_L.z);if(d<bd){bd=d;x=p[0];z=p[1]}}}const s=spat(x,o.y,z,o.ref);g*=s.g;if(o.pan)o.pan.pan.setTargetAtTime(s.pan,now,0.2)}o.g.gain.setTargetAtTime(g,now,0.18)}
 const act=DAY*(0.4+0.9*bump(TOD,7.3,1.8)+0.45*bump(TOD,18.8,1.4));
 if(t>nextBird){nextBird=t+(1.0+R_()*4.5)/Math.max(0.2,act);if(act>0.05&&SND.grp.birds){const mid=bump(TOD,13,2.5),u=R_(),W=[['cardinal',0.24],['wren',0.22],['titmouse',0.15],['chickadee',0.14],['dove',0.08+0.1*(1-mid)],['woodpecker',0.08],['crow',0.06],['hawk',0.05*mid]];let tot=0;for(const w of W)tot+=w[1];let a=u*tot,nm='cardinal';for(const w of W){if(a<w[1]){nm=w[0];break}a-=w[1]}
   const p=nearTree(),far=nm==='crow'||nm==='hawk';sndEvent(nm,p[0],p[1]+(far?40:0),p[2],far?40:nm==='woodpecker'?16:11,'birds')}}
 if(t>nextFrog){nextFrog=t+2.5+R_()*7;if(NIGHT>0.35&&SND.grp.night){const P=(S.ponds||[]).filter(p=>PONDZ[p.name]!==undefined);if(P.length){const pd=P[(R_()*P.length)|0],poly=pd.xy_show||pd.xy,q=poly[(R_()*poly.length)|0],u=R_();sndEvent(u<0.5?'treefrog':u<0.72?'bullfrog':'cricketfrog',q[0],PONDZ[pd.name],q[1],u<0.72&&u>=0.5?14:9,'night')}}}
 if(t>nextOwl){nextOwl=t+45+R_()*90;if(NIGHT>0.7&&SND.grp.night){const p=nearTree();sndEvent('owl',p[0],p[1],p[2],30,'night')}}
 if(t>nextDog){const first=nextDog===0;nextDog=t+(NIGHT>0.5?60+R_()*100:22+R_()*55);if(!first&&SND.grp.farm){const H=ED.groups&&ED.groups.house;if(H&&R_()<0.7)sndEvent('dog',H.pivot[0],groundAt(H.pivot[0],H.pivot[1])+0.5,H.pivot[1],30,'farm');else{const a=R_()*6.2832;sndEvent('dog',_L.x+Math.cos(a)*420,_L.y,_L.z+Math.sin(a)*420,34,'farm')}}}}
window.__snd=()=>({on:SND.on,state:SND.ctx&&SND.ctx.state,loops:CS.length,fountains:fnSrc.length,tubs:TUBS.length,grp:SND.grp,levels:CS.map(o=>+o.g.gain.value.toFixed(3))});window.__sndToggle=sndToggle;window.__vis=()=>({vis:VIS,suites:suiteMeshes.filter(m=>m.visible).length,prop:propMeshes.filter(m=>m.visible).length,propN:propMeshes.length,tub:tubObjs.filter(m=>m.visible).length,fountains:Fn.length,ent:entSel,asph:asphObjs.filter(m=>m.visible).length,route:routeObjs.filter(m=>m.visible).length,steps:[...document.querySelectorAll('#dirsteps li')].map(l=>l.textContent).slice(0,2),title:$('edit').querySelector('h1').textContent});window.__tubs=()=>TUBS;
window.__sndTest=async()=>{if(!SND.ctx&&!sndInit())return 'no audio';const out={};for(const k of ['white','pink','bubble','cricket','katy','gravel']){const d=BUF[k].getChannelData(0);let pk=0,sq=0,bad=0;for(let i=0;i<d.length;i++){const v=d[i];if(!(v===v))bad++;pk=Math.max(pk,Math.abs(v));sq+=v*v}out['buf_'+k]=[+pk.toFixed(2),+Math.sqrt(sq/d.length).toFixed(3),bad]}
 for(const k of Object.keys(SV)){const c=new OfflineAudioContext(1,44100*12,44100);let end=0,err='';try{end=SV[k](c,c.destination,0.05,1)}catch(e){err=String(e)}const b=await c.startRendering(),d=b.getChannelData(0);let pk=0,sq=0,zc=0,nn=0,last=0;for(let i=0;i<d.length;i++){const v=d[i];pk=Math.max(pk,Math.abs(v));if(Math.abs(v)>0.002){sq+=v*v;nn++;last=i}if(i&&((d[i-1]<0)!==(v<0)))zc++}
  out[k]=err||[+end.toFixed(2),+(last/44100).toFixed(2),+pk.toFixed(2),+Math.sqrt(sq/Math.max(1,nn)).toFixed(3),Math.round(zc/2/Math.max(0.05,nn/44100))]}return out};
// hooks for checking the page
window.__setView=(px,py,pz,tx,ty,tz)=>ctrl.set([px,py,pz],[tx,ty,tz]);window.__view=n=>{const v0=ED.views.find(v=>v.name===n);if(v0){const v=fitView(v0);ctrl.set(v.p,v.t)}};
window.__cornersNDC=()=>{cam.updateMatrixWorld();const o=S.boundary.corners.map(c=>{const v=new THREE.Vector3(c[0],c[2],c[1]).project(cam);return [v.x,v.y]});return [Math.min(...o.map(q=>q[0])),Math.max(...o.map(q=>q[0])),Math.min(...o.map(q=>q[1])),Math.max(...o.map(q=>q[1]))]};
window.__hidePanels=on=>{['bar','edit','north'].forEach(i=>$(i).style.display=on?'none':'')};
window.__time=h=>setTime(h);window.__drive=s=>{driveS=s;stepDrive(0);driveS=-1};window.__lang=c=>{setLang(c);$('lang').value=c};window.__fish=()=>({n:FISH.length,ponds:FP.map(p=>[p.name,p.pts.length,FISH.filter(f=>f.pond===p).length,!!p.feed]),kinds:SPEC.map(q=>[q.n,FISH.filter(f=>f.sp===q).length])});
window.__jumpPose=(frac,kind)=>{let best=null,bd=1e9;for(const f of FISH){if(f.leader||f.sp.k!==(kind||'bass'))continue;const d=Math.hypot(f.x-ctrl.target.x,f.z-ctrl.target.z);if(d<bd){bd=d;best=f}}if(!best)return null;const t=performance.now()/1000;for(let k=0;k<40&&!startJump(best,t);k++){best.th+=0.4}if(!best.jump)return null;best.jump.hold=frac;updateFish(0.016,t);const f=best,c=Math.cos(f.th),s=Math.sin(f.th);ctrl.set([f.x-s*4.2+c*0.6,f.pond.z+1.5,f.z+c*4.2+s*0.6],[f.x+c*0.5,f.pond.z+0.55,f.z+s*0.5]);return [f.x,f.z,f.sp.n]};
window.__fishCheck=(secs)=>{const t0=performance.now()/1000;let out=0,shallow=0,jumps=0,minm=9,moved=0;const p0=FISH.map(f=>[f.x,f.z]);const n=Math.round(secs/0.05);for(let i=0;i<n;i++){updateFish(0.05,t0+i*0.05);if(i%10===0)for(const f of FISH){if(f.jump){jumps++;continue}if(!inPoly(f.x,f.z,f.pond.poly))out++;const m=f.pond.z-groundAt(f.x,f.z)-f.dep-0.1*f.L;if(m<0)shallow++;minm=Math.min(minm,m)}}FISH.forEach((f,i)=>{moved+=Math.hypot(f.x-p0[i][0],f.z-p0[i][1])});return {n:FISH.length,out,shallow,minm:+minm.toFixed(2),jumpSamples:jumps,avgMoved:+(moved/FISH.length).toFixed(1),stats:window.__fish()}};
window.__fishAt=(kind)=>{const c=FISH.filter(f=>f.sp.k===(kind||'koi')&&!f.leader);let f=c[0],bd=1e9;for(const q of c){const d=Math.hypot(q.x-ctrl.target.x,q.z-ctrl.target.z);if(d<bd){bd=d;f=q}}ctrl.set([f.x+3.5,f.pond.z+6.5,f.z+2.5],[f.x,f.pond.z,f.z]);return [f.sp.n,f.vr,f.L]};window.__entrance=id=>setEntrance(String(id));window.__fountain=(pond,o)=>{Object.assign(FC[pond],o);fixChoice(pond);buildFountains();selPond=pond;fountUI()};window.__out=()=>outText();window.__stats=()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,fountains:Fn.length});
window.__pondXY=n=>{const P=S.fountains.ponds.find(p=>p.name===n);return P?P.slots['1'][0]:null};
