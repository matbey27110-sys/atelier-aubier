(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const euro=n=>new Intl.NumberFormat('fr-FR').format(n)+' €';
const DEG=Math.PI/180, lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);};

/* =========================================================
   DONNÉES
   Le catalogue (modèles, finitions, options, textes de l'anatomie, réglages) vient de
   l'admin via js/data.js, ou de js/catalogue.js en mode démonstration.
   ========================================================= */
let SPECS={},FINISH={},HARDWARE={},VARNISH={},CASES={},DEFAULTS={},STORY={},SET={},SOLD=null,ORDER=[];
const DEFAULT_A={head:[0,.93,.3],nut:[0,.85,.6],neck:[0,.62,.6],body:[0,.3,.9],bridge:[0,.15,.95],knobs:[.45,.16,.95],center:[0,.5,0]};
function applyCatalogue(cat){
  SET=cat.settings||{};SOLD=cat.sold==null?null:+cat.sold;
  SPECS={};FINISH={};STORY={};DEFAULTS={};HARDWARE={};VARNISH={};CASES={};
  const opts=(cat.options||[]).filter(o=>o.active!==false).sort((a,b)=>a.position-b.position);
  const shared=(type,into)=>opts.filter(o=>o.type===type&&!o.model_id).forEach(o=>{into[o.code]=Object.assign({},o.props,{name:o.name,price:o.price||0});});
  shared('hardware',HARDWARE);shared('varnish',VARNISH);shared('case',CASES);
  const first=o=>Object.keys(o)[0];
  ORDER=[];
  (cat.models||[]).filter(m=>m.visible!==false).sort((a,b)=>a.position-b.position).forEach(m=>{
    const fins=opts.filter(o=>o.type==='finish'&&o.model_id===m.id).map(o=>Object.assign({},o.props,{id:o.code,name:o.name,price:o.price||0}));
    if(!fins.length||(!m.file&&!m.glb_url))return;
    FINISH[m.id]=fins;ORDER.push(m.id);
    SPECS[m.id]={name:m.name,kind:m.kind||'',base:m.base_price||0,weeks:m.weeks||12,file:m.file,glb:m.glb_url,soldOut:!!m.sold_out,
      A:m.anchors&&Object.keys(m.anchors).length?m.anchors:DEFAULT_A};
    STORY[m.id]=m.story&&m.story.length?m.story:[{a:'center',d:'fit',az:24,el:6,part:"Vue d'ensemble",t:m.name,x:m.kind||m.name,p:'',s:''}];
    const d=m.defaults||{};
    DEFAULTS[m.id]={finish:fins.some(f=>f.id===d.finish)?d.finish:fins[0].id,hardware:HARDWARE[d.hardware]?d.hardware:first(HARDWARE),
      varnish:VARNISH[d.varnish]?d.varnish:first(VARNISH),case:CASES[d.case]?d.case:first(CASES)};
  });
  if(!ORDER.length)throw new Error('catalogue vide');
}
const track=(t,o)=>{if(window.Aubier)Aubier.track(t,o);};

/* =========================================================
   TEXTURES PROCÉDURALES (bois de remplacement, pastilles)
   ========================================================= */
const WOODS={
  flamme:{base:'#cf9e5c',dark:'#93612c',light:'#f0cf94',lines:90,wave:3,lw:1,alpha:.3,bands:5,flame:1},
  acajou:{base:'#6a2f1a',dark:'#3e170a',light:'#8f4527',lines:140,wave:2,lw:1.4,alpha:.5,bands:16}
};
function rng(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=s*16807%2147483647)/2147483647;}
function hashStr(t){let h=7;for(const c of t)h=(h*31+c.charCodeAt(0))>>>0;return h||1;}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const CANV={};
function woodCanvas(kind){
  if(CANV[kind])return CANV[kind];
  const P=WOODS[kind],W=512,H=1024,c=mk(W,H),g=c.getContext('2d'),r=rng(hashStr(kind));
  g.fillStyle=P.base;g.fillRect(0,0,W,H);
  for(let i=0;i<P.bands;i++){const x=r()*W,w=20+r()*90,cl=r()<.5?P.dark:P.light,gr=g.createLinearGradient(x-w,0,x+w,0);gr.addColorStop(0,cl+'00');gr.addColorStop(.5,cl+'55');gr.addColorStop(1,cl+'00');g.fillStyle=gr;g.fillRect(x-w,0,2*w,H);}
  for(let i=0;i<P.lines*2;i++){
    const x0=r()*W,amp=P.wave*(.4+r()),f=(.5+r()*2)*Math.PI*2/H,ph=r()*6.28;
    g.strokeStyle=r()<.6?P.dark:P.light;g.globalAlpha=P.alpha*(.25+r()*.75);g.lineWidth=.35+r()*P.lw;g.beginPath();
    for(let y=0;y<=H;y+=16){const x=x0+Math.sin(y*f+ph)*amp+Math.sin(y*f*3.1+ph*2)*amp*.25;if(y===0)g.moveTo(x,y);else g.lineTo(x,y);}
    g.stroke();
  }
  g.globalAlpha=1;
  if(P.flame){
    for(let x=0;x<W;x+=4){const off=Math.sin(x*.0125)*70+Math.sin(x*.04)*14;
      for(let y=0;y<H;y+=3){const v=Math.sin((y+off)*.07);if(Math.abs(v)<.3)continue;
        g.fillStyle=v>0?'rgba(255,236,200,'+(v*.2*P.flame).toFixed(3)+')':'rgba(70,35,10,'+(-v*.26*P.flame).toFixed(3)+')';g.fillRect(x,y,4,3);}}
  }
  return CANV[kind]=c;
}
function burstCanvas(kind){
  const key=kind+'_b';if(CANV[key])return CANV[key];
  const src=woodCanvas(kind),W=src.width,H=src.height,c=mk(W,H),g=c.getContext('2d');
  g.drawImage(src,0,0);
  g.save();g.globalCompositeOperation='multiply';g.fillStyle='rgba(225,150,85,.6)';g.fillRect(0,0,W,H);g.restore();
  g.save();g.translate(W*.5,H*.5);g.scale(1,H/W);
  const gr=g.createRadialGradient(0,0,0,0,0,W*.62);
  gr.addColorStop(0,'rgba(40,14,4,0)');gr.addColorStop(.42,'rgba(60,22,6,.15)');gr.addColorStop(.72,'rgba(30,10,3,.8)');gr.addColorStop(1,'rgba(8,3,1,.97)');
  g.fillStyle=gr;g.fillRect(-W*2,-W*2,W*4,W*4);g.restore();
  return CANV[key]=c;
}
function swatchStyle(sw){
  if(sw.startsWith('wood:')){const k=sw.slice(5),b=k.endsWith('b'),src=b?burstCanvas(k.slice(0,-1)):woodCanvas(k);const c=mk(80,80);c.getContext('2d').drawImage(src,b?216:180,b?470:420,80,80,0,0,80,80);return`background-image:url(${c.toDataURL('image/jpeg',.85)})`;}
  return`background:${sw}`;
}
function shadowCanvas(){
  if(CANV.sh)return CANV.sh;const c=mk(256,128),g=c.getContext('2d');g.translate(128,64);g.scale(1,.5);
  const gr=g.createRadialGradient(0,0,0,0,0,128);gr.addColorStop(0,'rgba(0,0,0,.42)');gr.addColorStop(.5,'rgba(0,0,0,.14)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(-128,-128,256,256);return CANV.sh=c;
}

/* =========================================================
   MODÈLES 3D RÉELS
   ========================================================= */
const col=h=>new THREE.Color(h).convertSRGBToLinear();
const TEXC={};
function canvasTex(c,key){if(TEXC[key])return TEXC[key];const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.flipY=false;t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;return TEXC[key]=t;}
const LOAD={};
function loadModel(m){
  if(LOAD[m])return LOAD[m];
  const S=SPECS[m],t0=performance.now();
  return LOAD[m]=new Promise((res,rej)=>{
    if(!THREE.GLTFLoader){rej(new Error('loader'));return;}
    const build=buffer=>new THREE.GLTFLoader().parse(buffer,'',g=>{
      track('load3d',{model:m,data:{ms:Math.round(performance.now()-t0)}});
      const s=g.scene;s.updateMatrixWorld(true);
      const b=new THREE.Box3().setFromObject(s),c=b.getCenter(new THREE.Vector3());
      s.position.set(-c.x,-b.min.y,-c.z);
      const w=new THREE.Group();w.add(s);w.updateMatrixWorld(true);
      res(w);
    },rej);
    /* Version .js (texte base64) : seule lisible quand le site est ouvert en double-clic (file://) */
    const fromScript=()=>{
      const parse=()=>{
        const b64=(window.__SILLET_GLB||{})[m];if(!b64){rej(new Error('data'));return;}
        const bin=atob(b64),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
        delete window.__SILLET_GLB[m];build(buf.buffer);
      };
      if((window.__SILLET_GLB||{})[m]){parse();return;}
      const sc=document.createElement('script');sc.src=S.file;sc.async=true;sc.onload=parse;sc.onerror=()=>rej(new Error('script'));document.head.appendChild(sc);
    };
    /* En ligne : le .glb binaire, environ 25 % plus léger et sans décodage */
    if(S.glb||location.protocol.startsWith('http')){
      fetch(S.glb||S.file.replace(/\.js$/,'.glb')).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();}).then(build,S.file?fromScript:rej);
    }else fromScript();
  });
}
/* Instance prête à afficher : matériaux propres à l'instance, rôles identifiés */
function instance(m,proto){
  const root=proto.clone(true),mats=new Map();
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=false;
    const fret=/^Plane0*02/.test(o.name)||/^Plane0*02/.test(o.parent&&o.parent.name||'');
    const arr=Array.isArray(o.material)?o.material:[o.material];
    const out=arr.map(src=>{
      if(fret){const fm=src.clone();fm.userData.role='other';return fm;}
      if(mats.has(src))return mats.get(src);
      const n=src.name||'',role=n.startsWith('WOOD')?'wood':n==='STRING'?'string':(src.metalness>=.85&&!n.startsWith('botom')&&!n.startsWith('back-plate'))?'hw':'other';
      let mat=src;
      if(role==='wood'){
        mat=new THREE.MeshPhysicalMaterial({name:n,map:src.map,normalMap:src.normalMap,normalScale:src.normalScale,color:src.color.clone(),
          metalness:n==='WOOD_ATLAS'?1:0,metalnessMap:n==='WOOD_ATLAS'?src.metalnessMap:null,roughnessMap:n==='WOOD_ATLAS'?src.roughnessMap:null,
          roughness:.35,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:.9});
        mat.userData.orig={map:src.map};
        stainShader(mat,n==='WOOD_ATLAS');
      }else{
        mat=src.clone();
        if(mat.transmission)mat.transmission=0;
        if(role==='hw'){mat.userData.orig={map:mat.map,color:mat.color.clone(),rough:mat.roughness};mat.envMapIntensity=1.1;}
        if(role==='string'){mat.roughness=.3;}
      }
      mat.userData.role=role;mats.set(src,mat);return mat;
    });
    o.material=Array.isArray(o.material)?out:out[0];
  });
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  const A={};for(const k in SPECS[m].A){const[x,y,z]=SPECS[m].A[k];A[k]=new THREE.Vector3(x*size.x/2,y*size.y,box.max.z*z);}
  return{wrap:root,mats:[...mats.values()],A,size,m};
}
function stainShader(mat,mask){
  const u={uTint:{value:new THREE.Color(1,1,1)},uAmt:{value:0},uLac:{value:new THREE.Color(0,0,0)},uLacAmt:{value:0},uMask:{value:mask?1:0},uHw:{value:new THREE.Color(1,1,1)},uHwAmt:{value:0}};
  mat.userData.u=u;
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,u);
    sh.fragmentShader='uniform vec3 uTint;uniform float uAmt;uniform vec3 uLac;uniform float uLacAmt;uniform float uMask;uniform vec3 uHw;uniform float uHwAmt;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      {vec3 c=diffuseColor.rgb;float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b));float sat=(mx-mn)/max(mx,1e-4);
       float m=mix(1.0,smoothstep(.12,.5,sat)*smoothstep(.0,.04,mx),uMask);
       float l=dot(c,vec3(.2126,.7152,.0722));
       vec3 st=uTint*mix(.45,1.9,clamp(l*1.6,0.,1.));
       c=mix(c,st,uAmt*m);
       c=mix(c,uLac*(.85+.3*l),uLacAmt*m);
       #ifdef USE_METALNESSMAP
       float mtl=texture2D(metalnessMap,vUv).b;
       c=mix(c,uHw*(.45+1.1*l),uHwAmt*smoothstep(.35,.7,mtl));
       #endif
       diffuseColor.rgb=c;}`);
  };
  mat.customProgramCacheKey=()=>'stain';
}
function applyConfig(inst,c){
  const F=FINISH[inst.m].find(f=>f.id===c.finish)||FINISH[inst.m][0],H=HARDWARE[c.hardware],V=VARNISH[c.varnish];
  inst.mats.forEach(mat=>{
    const r=mat.userData.role;
    if(r==='wood'){
      const u=mat.userData.u,n=mat.name;
      if(F.wood&&!n.startsWith('WOOD_ATLAS')){
        const isNeck=n.startsWith('WOOD_NECK');
        const t=isNeck?canvasTex(woodCanvas('acajou'),'acajou'):F.burst?canvasTex(burstCanvas(F.wood),F.wood+'b'):canvasTex(woodCanvas(F.wood),F.wood);
        if(mat.map!==t){mat.map=t;mat.needsUpdate=true;}
        mat.metalness=0;
      }
      u.uTint.value.set(F.tint?col(F.tint):0xffffff);u.uAmt.value=F.tint?F.amt:0;
      u.uLac.value.copy(F.lac?col(F.lac):new THREE.Color(0,0,0));u.uLacAmt.value=F.lac?(mat.name.startsWith('WOOD_NECK')&&F.wood?0:1):0;
      mat.clearcoat=V.cc;mat.clearcoatRoughness=V.ccr;mat.roughness=V.rough;
      u.uHw.value.copy(col(H.color));u.uHwAmt.value=1;
    }else if(r==='hw'){
      mat.map=H.orig?mat.userData.orig.map:null;
      mat.color.copy(H.orig?mat.userData.orig.color:col(H.color));
      mat.roughness=H.orig?mat.userData.orig.rough:H.rough;mat.metalness=1;mat.needsUpdate=true;
    }
  });
}
function disposeInst(inst){inst.mats.forEach(m=>m.dispose());}

/* =========================================================
   SCÈNES
   ========================================================= */
const stages=[];
class Stage{
  constructor(el,opts={}){
    this.el=el;this.ok=false;
    const fail=t=>{el.classList.add('no-gl');el.querySelector('.wait').textContent=t;};
    if(!window.THREE){fail("La 3D n'a pas pu se charger.");return;}
    try{this.r=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
    catch(e){fail("Votre navigateur n'affiche pas la 3D.");return;}
    const r=this.r;r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=opts.exposure||1.05;
    r.physicallyCorrectLights=true;r.setClearColor(0x000000,0);el.appendChild(r.domElement);
    this.scene=new THREE.Scene();this.cam=new THREE.PerspectiveCamera(opts.fov||28,1,.01,30);
    if(THREE.RoomEnvironment){const pm=new THREE.PMREMGenerator(r);this.scene.environment=pm.fromScene(new THREE.RoomEnvironment(),.04).texture;pm.dispose();}
    this.scene.add(new THREE.HemisphereLight(0xfff1dd,0x0b0908,.6));
    const key=new THREE.DirectionalLight(0xffe2bd,3.2);key.position.set(-1.6,2.6,2.4);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0x9fb4d6,2);rim.position.set(2,1.5,-2.5);this.scene.add(rim);
    const fill=new THREE.DirectionalLight(0xffffff,.6);fill.position.set(2,.5,2);this.scene.add(fill);
    this.inView=true;
    new IntersectionObserver(es=>{this.inView=es[0].isIntersecting;},{rootMargin:'120px'}).observe(el);
    new ResizeObserver(()=>this.resize()).observe(el);this.resize();
    this.ok=true;stages.push(this);
  }
  resize(){const w=this.el.clientWidth||1,h=this.el.clientHeight||1;this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();this.w=w;this.h=h;if(this.onResize)this.onResize();}
  active(){return this.inView&&this.el.offsetParent!==null;}
  ready(){this.el.classList.add('ready');}
  fail(){this.el.classList.add('no-gl');this.el.querySelector('.wait').textContent="Les instruments n'ont pas pu se charger.";}
}
function loop(ts){requestAnimationFrame(loop);const t=ts/1000;for(const s of stages){if(!s.active())continue;if(s.update)s.update(t);s.r.render(s.scene,s.cam);}}
function fitDist(cam,w,h,d){const v=cam.fov*DEG/2;return Math.max((h/2)/Math.tan(v),(w/2)/(Math.tan(v)*cam.aspect))+(d||0)/2;}
function sph(t,d,az,el){az*=DEG;el*=DEG;return new THREE.Vector3(t.x+d*Math.sin(az)*Math.cos(el),t.y+d*Math.sin(el),t.z+d*Math.cos(az)*Math.cos(el));}
function addShadow(scene,x,w){const m=new THREE.Mesh(new THREE.PlaneGeometry(w||.5,(w||.5)*.32),new THREE.MeshBasicMaterial({map:canvasTex(shadowCanvas(),'sh'),transparent:true,depthWrite:false,opacity:.9}));m.material.map.flipY=true;m.rotation.x=-Math.PI/2;m.position.set(x,.001,0);scene.add(m);return m;}

/* ---------- Vitrine (accueil) ---------- */
function initHero(){
  const st=new Stage($('#stage-hero'),{fov:24});if(!st.ok)return;
  const order=[],gap=.56,n=Math.min(ORDER.length,5),labels=$('#hero-labels'),items=[];
  ORDER.slice(0,n).forEach((id,i)=>{if(i%2)order.unshift(id);else order.push(id);});
  let hover=-1,px=0;const tgt=new THREE.Vector3(0,.62,0),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),v=new THREE.Vector3();
  st.onResize=()=>{st.dist=fitDist(st.cam,gap*Math.max(n-1,1)+.5,1.35,.1)*1.02;};st.onResize();
  st.cam.position.copy(sph(tgt,st.dist,0,4));
  Promise.all(order.map(loadModel)).then(protos=>{
    protos.forEach((p,i)=>{const m=order[i],g=instance(m,p);applyConfig(g,DEFAULTS[m]);const x=(i-(n-1)/2)*gap;g.wrap.position.x=x;st.scene.add(g.wrap);addShadow(st.scene,x,.5);
      const lb=document.createElement('button');lb.className='hlabel';lb.innerHTML=`<b>${SPECS[m].name}</b><span>${SPECS[m].kind}</span>`;lb.addEventListener('click',()=>goModel(m));
      lb.addEventListener('mouseenter',()=>hover=i);lb.addEventListener('mouseleave',()=>hover=-1);labels.appendChild(lb);
      g.wrap.userData.model=m;items.push({m,g,rot:Math.sin(i*1.7)*.4,lift:0,lb});});
    st.ready();
  }).catch(()=>st.fail());
  const pick=e=>{if(!items.length)return -1;const r=st.el.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,st.cam);
    const hit=ray.intersectObjects(items.map(it=>it.g.wrap),true)[0];if(!hit)return -1;let o=hit.object;while(o&&!o.userData.model)o=o.parent;return o?order.indexOf(o.userData.model):-1;};
  st.el.addEventListener('pointermove',e=>{const r=st.el.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;if(e.pointerType==='mouse'){hover=pick(e);st.el.style.cursor=hover>=0?'pointer':'';}});
  st.el.addEventListener('pointerleave',()=>{hover=-1;px=0;});
  st.el.addEventListener('click',e=>{const i=pick(e);if(i>=0)goModel(order[i]);});
  st.update=t=>{
    items.forEach((it,i)=>{const goal=hover===i?0:(reduce?0:Math.sin(t*.32+i*1.9)*.45);it.rot+=(goal-it.rot)*.05;it.g.wrap.rotation.y=it.rot;
      it.lift+=((hover===i?.018:0)-it.lift)*.08;it.g.wrap.position.y=it.lift;it.lb.classList.toggle('on',hover===i);});
    st.cam.position.lerp(sph(tgt,st.dist,px*6,4),.06);st.cam.lookAt(tgt);
    items.forEach(it=>{v.set(it.g.wrap.position.x,0,0).project(st.cam);it.lb.style.left=((v.x+1)/2*st.w)+'px';});
  };
}

/* ---------- Anatomie au scroll ---------- */
let anat=null;
function initAnat(){
  const st=new Stage($('#stage-anat'),{fov:30});anat=st;
  $('#anat-tabs').innerHTML=ORDER.map((m,i)=>`<button data-m="${m}" aria-pressed="${i===0}">${SPECS[m].name}</button>`).join('');
  $$('#anat-tabs button').forEach(b=>b.addEventListener('click',()=>setAnat(b.dataset.m,false)));
  if(!st.ok){setAnat(ORDER[0],false);return;}
  st.cp=new THREE.Vector3(0,.6,3);st.ct=new THREE.Vector3(0,.6,0);addShadow(st.scene,0,.55);
  st.update=t=>{
    if(!st.g)return;const P=STORY[st.m],{i,s,act}=scrollState();
    const a=resolve(st,P[i]),z=resolve(st,P[Math.min(i+1,P.length-1)]);
    const T=a.t.clone().lerp(z.t,s),d=lerp(a.d,z.d,s),az=lerp(a.az,z.az,s)+(reduce?0:Math.sin(t*.25)*2.5),el=lerp(a.el,z.el,s);
    const k=reduce?1:.07;st.cp.lerp(sph(T,d,az,el),k);st.ct.lerp(T,k);st.cam.position.copy(st.cp);st.cam.lookAt(st.ct);
    if(act!==st.act){st.act=act;$$('#anat-steps .step').forEach((e,j)=>e.classList.toggle('on',j===act));
      $('#hud-n').textContent=String(act+1).padStart(2,'0');$('#hud-part').textContent=P[act].part;$('#hud-bar').style.setProperty('--p',(act+1)/P.length);}
  };
  setAnat(ORDER[0],false);
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();track('anatomie',{model:st.m});}},{threshold:.3});io.observe($('#anatomie'));}
}
function resolve(st,p){const t=(st.g.A[p.a]||st.g.A.center).clone();const d=p.d==='fit'?fitDist(st.cam,Math.max(st.g.size.x,st.g.size.z)*1.05,st.g.size.y*1.08,st.g.size.z):p.d;return{t,d,az:p.az,el:p.el};}
function scrollState(){
  const steps=$$('#anat-steps .step'),vh=innerHeight,ref=innerWidth<900?vh*.76:vh*.5;
  const c=steps.map(e=>{const r=e.getBoundingClientRect();return r.top+r.height/2-ref;});
  let i=0;for(let k=0;k<c.length;k++)if(c[k]<=0)i=k;
  let t=0;if(i<c.length-1&&c[i]<=0)t=clamp(-c[i]/(c[i+1]-c[i]),0,1);
  const s=smooth(.18,.82,t);return{i,s,act:s>.5?Math.min(i+1,c.length-1):i};
}
let anatReq=0;
function setAnat(m,scroll){
  const st=anat;$$('#anat-tabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));
  const P=STORY[m];
  const cta=`<a class="btn step-cta" href="#configurateur" data-compose="${m}"><span class="star"></span>Composer la ${SPECS[m].name}</a>`;
  $('#anat-steps').innerHTML=P.map((p,i)=>`<article class="step${i===0?' on':''}"><div class="step-in"><p class="label gold">${SPECS[m].name} · ${p.part}</p>${i===0?`<p class="script-name">${SPECS[m].name}</p>`:''}<h3>${i===0?p.x:p.t}</h3><p class="t">${p.p}</p><p class="sig"><span>Signature</span>${p.s}</p>${i===P.length-1?cta:''}</div></article>`).join('');
  const hc=$('#anat-cta');if(hc){hc.dataset.compose=m;hc.textContent='Composer la '+SPECS[m].name;}
  $('#hud-t').textContent=String(P.length).padStart(2,'0');
  if(scroll)$('#anatomie').scrollIntoView({behavior:reduce?'auto':'smooth'});
  if(!st||!st.ok)return;
  const req=++anatReq;st.el.classList.remove('ready');
  loadModel(m).then(p=>{
    if(req!==anatReq)return;
    if(st.g){st.scene.remove(st.g.wrap);disposeInst(st.g);}
    st.m=m;st.g=instance(m,p);applyConfig(st.g,DEFAULTS[m]);st.scene.add(st.g.wrap);st.act=-1;st.ready();
  }).catch(()=>st.fail());
}
function goModel(m){if(location.hash.slice(1)==='configurateur')return;setAnat(m,true);}
/* Depuis l'anatomie : ouvre le configurateur directement sur le modèle affiché, avec les choix déjà faits pour ce modèle */
function composeModel(m){
  if(CFG){if(CFG.model!==m)setOpt('model',m);}
  else{try{const s=JSON.parse(localStorage.getItem(CFG_KEY)||'null')||{};s.per=s.per||{};s.model=m;localStorage.setItem(CFG_KEY,JSON.stringify(s));}catch(e){}}
  if(location.hash.slice(1)==='configurateur')route();else location.hash='configurateur';
}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-compose]');if(!a)return;e.preventDefault();composeModel(a.dataset.compose);});

/* =========================================================
   CONFIGURATEUR
   ========================================================= */
let CFG=null,cfg=null,cfgReq=0;
/* Mémoire du configurateur : les choix de chaque modèle sont gardés séparément, avec le dernier modèle ouvert */
const CFG_KEY='sillet-config-v3';let PER={};
function validOpts(m,o){return o&&FINISH[m].some(f=>f.id===o.finish)&&HARDWARE[o.hardware]&&VARNISH[o.varnish]&&CASES[o.case];}
function optsOf(m){const o=PER[m];return validOpts(m,o)?{finish:o.finish,hardware:o.hardware,varnish:o.varnish,case:o.case}:Object.assign({},DEFAULTS[m]);}
function loadCfg(){
  let model=ORDER[0];
  try{
    const s=JSON.parse(localStorage.getItem(CFG_KEY)||'null');
    if(s&&s.per){PER=s.per;if(SPECS[s.model])model=s.model;}
    else{const o=JSON.parse(localStorage.getItem('sillet-config-v2')||'null');/* ancienne sauvegarde : un seul modèle */
      if(o&&SPECS[o.model]){model=o.model;if(validOpts(o.model,o))PER[o.model]=o;}}
  }catch(e){PER={};}
  return Object.assign({model},optsOf(model));
}
function saveCfg(){PER[CFG.model]={finish:CFG.finish,hardware:CFG.hardware,varnish:CFG.varnish,case:CFG.case};
  try{localStorage.setItem(CFG_KEY,JSON.stringify({model:CFG.model,per:PER}));}catch(e){}}
const finOf=c=>FINISH[c.model].find(f=>f.id===c.finish)||FINISH[c.model][0];
function price(c){return SPECS[c.model].base+finOf(c).price+HARDWARE[c.hardware].price+(VARNISH[c.varnish].price||0)+CASES[c.case].price;}
function weeks(c){return SPECS[c.model].weeks+(finOf(c).lac?(SET.lacquer_weeks!=null?+SET.lacquer_weeks:2):0);}
function summary(c){const S=SPECS[c.model];return[['Modèle',S.name+' — '+S.kind],['Finition',finOf(c).name],['Accastillage',HARDWARE[c.hardware].name],['Vernis',VARNISH[c.varnish].name],['Étui',CASES[c.case].name]];}
function initConfig(){
  if(cfg)return;CFG=loadCfg();
  const st=new Stage($('#stage-cfg'),{fov:30});cfg=st;
  renderPanel();
  if(!st.ok)return;
  addShadow(st.scene,0,.6);
  const ctl=new THREE.OrbitControls(st.cam,st.r.domElement);ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.enablePan=false;ctl.minDistance=.14;ctl.autoRotate=!reduce;ctl.autoRotateSpeed=.6;
  ctl.addEventListener('start',()=>{ctl.autoRotate=false;st.goal=null;});st.ctl=ctl;
  st.update=()=>{if(st.goal){st.cam.position.lerp(st.goal.p,.085);ctl.target.lerp(st.goal.t,.085);if(st.cam.position.distanceTo(st.goal.p)<.002)st.goal=null;}ctl.update();};
  $$('.views button').forEach(b=>b.addEventListener('click',()=>view(b.dataset.v)));
  rebuild(true);
}
function fitCfg(){return fitDist(cfg.cam,Math.max(cfg.g.size.x,cfg.g.size.z)*1.1,cfg.g.size.y*1.12,cfg.g.size.z);}
function view(v){
  if(!cfg||!cfg.ok||!cfg.g)return;const A=cfg.g.A,d=fitCfg();
  const V={face:[A.center,d,0,3],trois:[A.center,d,28,8],dos:[A.center,d,180,3],profil:[A.center,d,90,3],tete:[A.head,.32,-24,12],corps:[A.body,.46,16,18]}[v];
  cfg.goal={t:V[0].clone(),p:sph(V[0],V[1],V[2],V[3])};cfg.ctl.autoRotate=false;
}
function rebuild(reset){
  if(!cfg||!cfg.ok)return;
  if(cfg.g&&cfg.g.m===CFG.model){applyConfig(cfg.g,CFG);return;}
  const req=++cfgReq,m=CFG.model;cfg.el.classList.remove('ready');
  loadModel(m).then(p=>{
    if(req!==cfgReq)return;
    if(cfg.g){cfg.scene.remove(cfg.g.wrap);disposeInst(cfg.g);}
    cfg.g=instance(m,p);applyConfig(cfg.g,CFG);cfg.scene.add(cfg.g.wrap);
    const d=fitCfg();cfg.ctl.maxDistance=d*1.7;
    if(reset){cfg.ctl.target.copy(cfg.g.A.center);cfg.cam.position.copy(sph(cfg.g.A.center,d,28,8));}else view('trois');
    cfg.ready();
  }).catch(()=>cfg.fail());
}
function renderPanel(){
  const c=CFG,S=SPECS[c.model],F=finOf(c);
  $('#cfg-name').textContent=S.name;$('#cfg-kind').textContent=S.kind;
  const delta=p=>p?'+ '+euro(p):'Inclus';
  const sec=(title,cur,body,note)=>`<section class="opt"><div class="opt-h"><h3>${title}</h3><span>${cur}</span></div>${body}${note?`<span class="price-d">${note}</span>`:''}</section>`;
  let h='';
  h+=sec('Modèle',S.kind,`<div class="models-pick">${ORDER.map(m=>`<button class="mp" data-k="model" data-v="${m}" aria-pressed="${m===c.model}"><b>${SPECS[m].name}</b><span>${SPECS[m].soldOut?'Complet':'dès '+euro(SPECS[m].base)}</span></button>`).join('')}</div>`);
  h+=sec('Finition',F.name,`<div class="chips">${FINISH[c.model].map(f=>`<button class="chip" data-k="finish" data-v="${f.id}" aria-pressed="${f.id===c.finish}" title="${f.name}" aria-label="${f.name}"><i style="${swatchStyle(f.swatch)}"></i></button>`).join('')}</div>`,delta(F.price));
  h+=sec('Accastillage',HARDWARE[c.hardware].name,`<div class="chips">${Object.keys(HARDWARE).map(k=>{const x=HARDWARE[k];return`<button class="chip" data-k="hardware" data-v="${k}" aria-pressed="${k===c.hardware}" title="${x.name}" aria-label="${x.name}"><i style="background:radial-gradient(circle at 35% 30%,#fff 0%,${x.color} 35%,#111 120%)"></i></button>`;}).join('')}</div>`,delta(HARDWARE[c.hardware].price));
  h+=sec('Vernis',VARNISH[c.varnish].name,`<div class="pills">${Object.keys(VARNISH).map(k=>`<button class="pill" data-k="varnish" data-v="${k}" aria-pressed="${k===c.varnish}">${VARNISH[k].name}</button>`).join('')}</div>`);
  h+=sec('Étui',CASES[c.case].name,`<div class="pills">${Object.keys(CASES).map(k=>`<button class="pill" data-k="case" data-v="${k}" aria-pressed="${k===c.case}">${CASES[k].name}</button>`).join('')}</div>`,delta(CASES[c.case].price));
  h+=`<section class="opt"><p class="price-d" style="margin:0;line-height:1.7">Essences, profil de manche, repères de touche et gravure de la tête se choisissent ensemble lors de la consultation à l'atelier.</p></section>`;
  $('#cfg-options').innerHTML=h;
  $$('#cfg-options [data-k]').forEach(b=>b.addEventListener('click',()=>setOpt(b.dataset.k,b.dataset.v)));
  updateSum();
}
function setOpt(k,v){
  track('choice',{model:k==='model'?v:CFG.model,data:{k,v}});
  if(k==='model'){if(v===CFG.model)return;CFG=Object.assign({model:v},optsOf(v));saveCfg();renderPanel();rebuild(false);return;}
  CFG[k]=v;saveCfg();renderPanel();rebuild(false);
  if(cfg&&cfg.ok&&cfg.g&&k==='finish')view('trois');
  if(cfg&&cfg.ok&&cfg.g&&k==='hardware')view('tete');
}
/* Acompte demandé à la commande : taux réglé dans l'admin (30 % par défaut), arrondi à l'euro */
const rate=()=>SET.deposit_rate!=null?+SET.deposit_rate:.3;
const deposit=c=>Math.round(price(c)*rate());
/* Commande possible ? Sinon le bouton propose la liste d'attente */
function blocked(){
  if(SET.orders_open===false)return'Les commandes sont fermées pour le moment.';
  if(SPECS[CFG.model].soldOut)return'La '+SPECS[CFG.model].name+' est complète pour cette année.';
  if(SOLD!=null&&SET.capacity&&SOLD>=+SET.capacity)return"L'atelier est complet pour "+new Date().getFullYear()+'.';
  return'';
}
function updateSum(){
  $('#sum-price').textContent=euro(price(CFG));$('#sum-weeks').textContent=weeks(CFG)+' semaines environ';$('#sum-deposit').textContent=euro(deposit(CFG));
  $('#sum-rate').textContent=Math.round(rate()*100);
  const b=blocked(),left=SOLD!=null&&SET.capacity?Math.max(+SET.capacity-SOLD,0):null;
  $('#sum-order').innerHTML='<span class="star"></span>'+(b?"Rejoindre la liste d'attente":'Commander');
  const note=$('#sum-note');note.textContent=b||(SET.show_remaining!==false&&left!=null?(left===1?'Plus qu\u2019une place':'Plus que '+left+' places')+' en '+new Date().getFullYear()+'.':'');
  note.hidden=!note.textContent;
}
/* Commande : le configurateur transmet à commande.html un récapitulatif complet (noms, prix, délai).
   En production, le serveur de paiement recalcule le prix à partir de « config » : il ne fait jamais confiance au montant envoyé par le navigateur. */
function saveOrderDraft(){
  const S=SPECS[CFG.model],F=finOf(CFG),H=HARDWARE[CFG.hardware],C=CASES[CFG.case];
  const draft={config:Object.assign({},CFG),model:S.name,kind:S.kind,swatch:F.swatch&&!F.swatch.startsWith('wood:')?F.swatch:null,
    lines:[[S.name+' — '+S.kind,S.base],['Finition : '+F.name,F.price],['Accastillage : '+H.name,H.price],['Vernis : '+VARNISH[CFG.varnish].name,VARNISH[CFG.varnish].price||0],[C.name,C.price]],
    total:price(CFG),deposit:deposit(CFG),rate:rate(),weeks:weeks(CFG),at:Date.now()};
  try{localStorage.setItem('aubier-commande',JSON.stringify(draft));}catch(e){}
}
function sumText(){return summary(CFG).map(([a,b])=>a+' : '+b).join('\n')+'\nEstimation : '+euro(price(CFG))+'\nDélai : '+weeks(CFG)+' semaines environ';}

/* =========================================================
   NAVIGATION, FORMULAIRES
   ========================================================= */
function route(){
  const h=location.hash.slice(1),isCfg=h==='configurateur';
  $('#view-home').hidden=isCfg;$('#view-config').hidden=!isCfg;$('#rail').hidden=isCfg;
  if(isCfg)$('#nav-cfg').setAttribute('aria-current','page');else $('#nav-cfg').removeAttribute('aria-current');
  if(isCfg){window.scrollTo(0,0);initConfig();}
  if(isCfg!==route.cfg){route.cfg=isCfg;if(window.Aubier)Aubier.setPage(isCfg?'configurateur':'accueil');if(isCfg||!route.seen){track('view');if(isCfg)track('config');}route.seen=1;}
  else if(h){const el=document.getElementById(h);if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:'auto'}));}
}
function init(){
  const menu=$('#menu'),ob=$('#menu-open');
  let menuT=0;
  /* Ouverture : le rideau descend puis les liens montent un à un ; fermeture : le rideau remonte */
  const setMenu=o=>{clearTimeout(menuT);ob.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':'';
    if(o){menu.hidden=false;void menu.offsetWidth;menu.classList.add('open');}
    else{menu.classList.remove('open');menuT=setTimeout(()=>{menu.hidden=true;},reduce?0:600);}};
  ob.addEventListener('click',()=>setMenu(true));$('#menu-close').addEventListener('click',()=>setMenu(false));
  $$('#menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)setMenu(false);});

  $$('.copy').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById(b.dataset.copy),t=el.textContent;
    const done=()=>{b.textContent='Copié';setTimeout(()=>b.textContent='Copier',1600);};
    const sel=()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);};
    try{navigator.clipboard.writeText(t).then(done,sel);}catch(e){sel();}}));

  const okMail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  $('#contact-form').addEventListener('submit',e=>{e.preventDefault();const f=e.target,s=$('#c-status');
    if(!f.name.value.trim()){s.textContent='Indiquez votre nom.';f.name.focus();return;}
    if(!okMail(f.email.value)){s.textContent='Indiquez une adresse e-mail valide.';f.email.focus();return;}
    if(!f.message.value.trim()){s.textContent='Écrivez quelques mots sur votre projet.';f.message.focus();return;}
    if(!window.Aubier){s.textContent='Envoi impossible pour le moment. Écrivez-nous directement par e-mail.';return;}
    const btn=f.querySelector('button[type=submit]'),wait=f.subject.value==="Liste d'attente";btn.disabled=true;s.textContent='Envoi…';
    const data={name:f.name.value.trim(),email:f.email.value.trim()};
    (wait?Aubier.joinWaitlist(Object.assign(data,{model_id:waitModel,note:f.message.value.trim()})):Aubier.sendRequest(Object.assign(data,{subject:f.subject.value,message:f.message.value.trim()})))
      .then(()=>{f.reset();waitModel=null;s.textContent=(wait?'Vous êtes inscrit sur la liste d\u2019attente. Nous vous écrivons dès qu\u2019une place se libère.':'Merci, votre demande est bien arrivée. Réponse sous 48 heures.')+(Aubier.LIVE?'':' (Démonstration : enregistrée dans ce navigateur, visible dans l\u2019admin.)');})
      .catch(()=>{s.textContent='Envoi impossible pour le moment. Écrivez-nous directement par e-mail.';})
      .finally(()=>{btn.disabled=false;});});

  $('#sum-cta').addEventListener('click',()=>{$('#c-subject').value='Commande sur mesure';$('#c-msg').value='Bonjour,\n\nJe souhaite échanger autour de cette configuration :\n\n'+sumText();location.hash='rendez-vous';});
  $('#sum-order').addEventListener('click',()=>{
    if(blocked()){waitModel=CFG.model;$('#c-subject').value="Liste d'attente";$('#c-msg').value="Bonjour,\n\nJe souhaite être prévenu dès qu'une place se libère pour cette configuration :\n\n"+sumText();location.hash='rendez-vous';return;}
    track('commander',{model:CFG.model});saveOrderDraft();location.href='commande.html';});
  $('#sum-reset').addEventListener('click',()=>{CFG=Object.assign({model:CFG.model},DEFAULTS[CFG.model]);saveCfg();renderPanel();rebuild(false);});
  $('#sum-copy').addEventListener('click',e=>{const b=e.currentTarget,t=sumText();try{navigator.clipboard.writeText(t).then(()=>{b.textContent='Copié';setTimeout(()=>b.textContent='Copier le récapitulatif',1600);},()=>{});}catch(err){}});

  const stepGo=d=>{const st=$$('#anat-steps .step');if(!st.length)return;const cur=anat&&anat.act>=0?anat.act:0;const t=st[clamp(cur+d,0,st.length-1)];t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});};
  $('#step-prev').addEventListener('click',()=>stepGo(-1));$('#step-next').addEventListener('click',()=>stepGo(1));

  /* Ouverture : le A seul au centre, il prend sa place, puis le mot se compose */
  (function(){
    const el=$('#intro');let seen=true;
    try{seen=sessionStorage.getItem('aubier-intro')==='1';sessionStorage.setItem('aubier-intro','1');}catch(e){seen=true;}
    if(seen||reduce||location.hash.slice(1)==='configurateur'||!el.animate)return;
    el.hidden=false;
    const svg=el.querySelector('.iwm'),A=svg.querySelector('.iA'),L=[...svg.querySelectorAll('.iL')];
    let closed=false;const close=()=>{if(closed)return;closed=true;el.classList.add('done');setTimeout(()=>{el.hidden=true;},1150);};
    el.addEventListener('click',close);
    requestAnimationFrame(()=>{
      const sb=svg.getBoundingClientRect(),ab=A.getBoundingClientRect();
      const k=svg.viewBox.baseVal.width/Math.max(sb.width,1);const dx=((sb.left+sb.width/2)-(ab.left+ab.width/2))*k,dy=((innerHeight/2)-(ab.top+ab.height/2))*k;
      const big=Math.min(2.6,(innerHeight*.34)/Math.max(ab.height,1));
      const E='cubic-bezier(.22,1,.36,1)',M='cubic-bezier(.76,0,.24,1)';
      A.animate([{transform:`translate(${dx}px,${dy}px) scale(${big})`,opacity:0,filter:'blur(6px)'},{transform:`translate(${dx}px,${dy}px) scale(${big})`,opacity:1,filter:'blur(0)'}],{duration:900,easing:E,fill:'both'});
      A.animate([{transform:`translate(${dx}px,${dy}px) scale(${big})`},{transform:'none'}],{duration:1050,delay:1150,easing:M,fill:'both'});
      L.forEach((l,i)=>l.animate([{opacity:0,transform:'translateY(18%)'},{opacity:1,transform:'none'}],{duration:800,delay:1750+i*90,easing:E,fill:'both'}));
      setTimeout(()=>el.classList.add('lab'),2500);
      setTimeout(close,3700);
    });
  })();
  /* En-tête : toujours visible, un filet apparaît dessous dès qu'on descend */
  addEventListener('scroll',()=>{$('#top').classList.toggle('scrolled',scrollY>10);},{passive:true});
  /* Rail des chapitres */
  const railLinks=$$('#rail a');const secs=railLinks.map(a=>document.getElementById(a.dataset.s)).filter(Boolean);
  const spy=()=>{const mid=innerHeight*.45;let cur=secs[0];for(const s of secs){if(s.getBoundingClientRect().top<=mid)cur=s;}
    railLinks.forEach(a=>a.classList.toggle('on',a.dataset.s===cur.id));};
  addEventListener('scroll',spy,{passive:true});spy();
  /* Apparitions : seuls les éléments sous la ligne de flottaison attendent */
  if('IntersectionObserver' in window&&!reduce){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('pre');io.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px'});
    $$('.rv').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pre');io.observe(el);}});
    const sweep=()=>$$('.rv.pre').forEach(el=>{if(el.getBoundingClientRect().top<innerHeight*.95)el.classList.remove('pre');});
    addEventListener('scroll',sweep,{passive:true});setInterval(sweep,1200);
  }
  /* Bouton « remonter » : visible sur l'accueil après un écran de scroll, l'anneau se remplit avec la page */
  const tt=$('#totop'),ttP=tt.querySelector('.p');
  const ttUpd=()=>{const home=!$('#view-home').hidden,y=scrollY,max=document.documentElement.scrollHeight-innerHeight;
    const on=home&&y>innerHeight*.8&&$('#menu').hidden;tt.classList.toggle('on',on);tt.tabIndex=on?0:-1;
    ttP.style.strokeDashoffset=1-(max>0?clamp(y/max,0,1):0);};
  tt.addEventListener('click',()=>{window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});tt.blur();});
  addEventListener('scroll',ttUpd,{passive:true});addEventListener('resize',ttUpd);addEventListener('hashchange',()=>requestAnimationFrame(ttUpd));ttUpd();
  /* Chiffres de la maison : comptent depuis zéro quand ils arrivent à l'écran */
  if('IntersectionObserver' in window&&!reduce){
    const figs=$$('.figures b').map(b=>{const m=b.textContent.match(/^(\d+)(.*)$/s);if(!m)return null;
      b.innerHTML=`<span class="num">0</span>${m[2]}`;return{n:+m[1],el:b.firstChild};}).filter(Boolean);
    const count=()=>figs.forEach((f,i)=>{const t0=performance.now()+i*250,dur=3400;
      /* petits nombres (les années) : rythme régulier pour voir défiler chaque valeur ; grands nombres : ralentissent à la fin */
      const tick=now=>{const p=clamp((now-t0)/dur,0,1),e=f.n<=20?p:1-Math.pow(1-p,2);f.el.textContent=f.n<=20?Math.floor(f.n*e):Math.round(f.n*e);if(p<1)requestAnimationFrame(tick);};
      requestAnimationFrame(tick);});
    const box=$('.figures');
    if(box&&figs.length){const fio=new IntersectionObserver(es=>{if(es[0].isIntersecting){fio.disconnect();count();}},{threshold:.5});fio.observe(box);}
  }
  /* Clavier : flèches dans l'anatomie quand elle est à l'écran */
  addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,textarea,select'))return;
    const r=$('#anatomie').getBoundingClientRect();if(r.top>innerHeight*.5||r.bottom<innerHeight*.5)return;
    if(e.key==='ArrowRight'){e.preventDefault();stepGo(1);}else if(e.key==='ArrowLeft'){e.preventDefault();stepGo(-1);}});
  addEventListener('hashchange',route);
  initHero();initAnat();route();
  requestAnimationFrame(loop);
  if(window.Aubier){Aubier.vitals();
    /* Le catalogue a changé dans l'admin depuis la dernière visite : on met à jour le configurateur */
    Aubier.onCatalogue(c=>{try{applyCatalogue(c);Aubier.applySite(c);if(CFG){if(!SPECS[CFG.model])CFG=Object.assign({model:ORDER[0]},optsOf(ORDER[0]));else if(!validOpts(CFG.model,CFG))CFG=Object.assign({model:CFG.model},optsOf(CFG.model));renderPanel();rebuild(false);}}catch(e){}});}
}
let waitModel=null;
/* Démarrage : catalogue d'abord (instantané s'il est déjà en mémoire), puis le site */
const builtin=()=>Object.assign({},window.AUBIER_CATALOGUE,{sold:null});
const boot=c=>{try{applyCatalogue(c&&c.models&&c.models.length?c:builtin());}catch(e){c=builtin();applyCatalogue(c);}if(window.Aubier)Aubier.applySite(c);init();};
(window.Aubier?Aubier.catalogue():Promise.resolve(null)).then(boot,()=>boot(null));
})();
