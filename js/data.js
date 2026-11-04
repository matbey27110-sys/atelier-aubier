/* =========================================================
   DONNÉES : lien entre le site, l'admin et la base Supabase
   - Avec Supabase (js/config.js rempli) : tout passe par la base, sécurisée côté serveur.
   - Sans Supabase : mode démonstration, les données vivent dans ce navigateur (localStorage).
   Le site et l'admin utilisent exactement les mêmes fonctions dans les deux cas.
   ========================================================= */
(function(){
'use strict';
const CONF=window.AUBIER_SUPABASE||{};
const BASE=(CONF.url||'').replace(/\/+$/,''),KEY=CONF.anonKey||'';
const LIVE=!!(BASE&&KEY);
const BUILTIN=window.AUBIER_CATALOGUE||null;
const PREVIEW=/[?&]apercu\b/.test(location.search);
const nowIso=()=>new Date().toISOString();
const uid=()=>(crypto.randomUUID?crypto.randomUUID():'id-'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const clone=o=>JSON.parse(JSON.stringify(o));
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}},del(k){try{localStorage.removeItem(k);}catch(e){}}};

/* ---------- Mode démonstration : une « table » = une clé du navigateur ---------- */
const CAT_TABLES=['models','options','content','settings'];
const local={
  key:t=>'aubier-db-'+t,
  has(t){return store.get(this.key(t))!==null;},
  read(t){
    let v=null;try{v=JSON.parse(store.get(this.key(t))||'null');}catch(e){}
    if(v)return v;
    if(CAT_TABLES.includes(t)&&BUILTIN)return t==='settings'?[{id:1,data:clone(BUILTIN.settings)}]:clone(BUILTIN[t]);
    return [];
  },
  write(t,rows){if(!store.set(this.key(t),JSON.stringify(rows)))throw new Error("La mémoire du navigateur est pleine : l'enregistrement a échoué.");}
};

/* ---------- Session de l'administration (Supabase Auth) ---------- */
const SESSION_KEY='aubier-admin-session';
let session=null;try{session=JSON.parse(store.get(SESSION_KEY)||'null');}catch(e){}
const jwtEmail=t=>{try{return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).email||'';}catch(e){return '';}};
function setSession(j){
  session=j?{access_token:j.access_token,refresh_token:j.refresh_token,
    expires_at:j.expires_at?+j.expires_at:Math.floor(Date.now()/1000)+(+j.expires_in||3600),
    email:(j.user&&j.user.email)||jwtEmail(j.access_token)}:null;
  if(session)store.set(SESSION_KEY,JSON.stringify(session));else store.del(SESSION_KEY);
}
const errMsg=j=>(j&&typeof j==='object'&&(j.message||j.msg||j.error_description||j.error))||(typeof j==='string'?j:'');
let refreshing=null;
async function token(anon){
  if(anon||!session)return KEY;
  if(session.expires_at-60<Date.now()/1000){
    refreshing=refreshing||fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})})
      .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(errMsg(j));setSession(j);})
      .catch(()=>{setSession(null);}).finally(()=>{refreshing=null;});
    await refreshing;
  }
  return session?session.access_token:KEY;
}
async function rest(path,o={}){
  const h={apikey:KEY,Authorization:'Bearer '+await token(o.anon)};
  if(o.body!==undefined)h['Content-Type']='application/json';
  if(o.prefer)h.Prefer=o.prefer;
  const r=await fetch(BASE+path,{method:o.method||'GET',headers:h,body:o.body!==undefined?JSON.stringify(o.body):undefined,keepalive:!!o.keepalive});
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){j=txt;}
  if(!r.ok){if(r.status===401&&session&&!o.anon)setSession(null);throw new Error(errMsg(j)||('Erreur '+r.status));}
  return j;
}
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Délai dépassé')),ms))]);

/* ---------- Prix : même calcul que la fonction place_order de la base ---------- */
function quote(cat,cfg){
  const S=cat.settings||{},m=cat.models.find(x=>x.id===cfg.model);
  if(!m)throw new Error("Ce modèle n'est pas disponible.");
  const opt=(type,code,own)=>cat.options.find(o=>o.type===type&&o.code===code&&o.active!==false&&(own?o.model_id===m.id:!o.model_id));
  const f=opt('finish',cfg.finish,1),h=opt('hardware',cfg.hardware),v=opt('varnish',cfg.varnish),c=opt('case',cfg.case);
  if(!f||!h||!v||!c)throw new Error('Configuration incomplète.');
  const total=m.base_price+f.price+h.price+v.price+c.price,rate=S.deposit_rate!=null?+S.deposit_rate:.3;
  return{m,f,h,v,c,total,rate,deposit:Math.round(total*rate),
    weeks:m.weeks+(f.props&&f.props.lac?(S.lacquer_weeks!=null?+S.lacquer_weeks:2):0),
    lines:[[m.name+' — '+(m.kind||''),m.base_price],['Finition : '+f.name,f.price],['Accastillage : '+h.name,h.price],['Vernis : '+v.name,v.price],[c.name,c.price]]};
}

/* ---------- Statistiques : même résultat que la fonction site_stats de la base ---------- */
function stats(events,days){
  const DAY=864e5,start=new Date();start.setHours(0,0,0,0);
  const since=start.getTime()-(days-1)*DAY,prev=since-days*DAY;
  const e=[],ep=[];
  for(const x of events){const t=Date.parse(x.at);if(t>=since)e.push(x);else if(t>=prev)ep.push(x);}
  const views=a=>a.filter(x=>x.type==='view');
  const uniq=a=>new Set(a.map(x=>x.sid)).size;
  const group=(a,key)=>{const m=new Map();for(const x of a){const k=key(x);if(!m.has(k))m.set(k,new Set());m.get(k).add(x.sid);}
    return[...m].map(([k,s])=>({k,n:s.size})).sort((a,b)=>b.n-a.n);};
  const funnel=a=>{const o={};for(const x of a){(o[x.type]=o[x.type]||new Set()).add(x.sid);}for(const k in o)o[k]=o[k].size;return o;};
  const p75=arr=>{if(!arr.length)return null;const s=arr.slice().sort((a,b)=>a-b),i=(s.length-1)*.75,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo);};
  const series=[],ve=views(e),buckets=Array.from({length:days},()=>[]);
  ve.forEach(x=>{const d=Math.floor((Date.parse(x.at)-since)/DAY);if(buckets[d])buckets[d].push(x);});
  for(let d=0;d<days;d++){const dd=new Date(since+d*DAY),day=buckets[d];
    series.push({d:dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'),v:uniq(day),p:day.length});}
  const byName=(type,field,key)=>{const m={};for(const x of e){if(x.type!==type||!x.data)continue;const k=key(x),val=+x.data[field];if(!isFinite(val))continue;(m[k]=m[k]||[]).push(val);}
    const o={};for(const k in m)o[k]={p75:p75(m[k]),n:m[k].length};return o;};
  const ch={};for(const x of e){if(x.type!=='choice'||!x.data)continue;const k=x.model+'|'+x.data.k+'|'+x.data.v;ch[k]=(ch[k]||0)+1;}
  return{days,
    visitors:uniq(views(e)),views:views(e).length,prev_visitors:uniq(views(ep)),prev_views:views(ep).length,series,
    sources:group(views(e),x=>x.source||'Direct').slice(0,8),
    devices:group(views(e),x=>x.device||'Inconnu'),
    pages:(()=>{const m={};views(e).forEach(x=>{m[x.path||'?']=(m[x.path||'?']||0)+1;});return Object.entries(m).map(([k,n])=>({k,n})).sort((a,b)=>b.n-a.n).slice(0,10);})(),
    funnel:funnel(e),prev_funnel:funnel(ep),
    choices:Object.entries(ch).map(([k,n])=>{const[m,kk,v]=k.split('|');return{m,k:kk,v,n};}),
    vitals:byName('vital','value',x=>x.data.name),
    load3d:byName('load3d','ms',x=>x.model)};
}

/* ---------- Mode démonstration : équivalents locaux des fonctions de la base ---------- */
function localCatalogue(){
  const s=(local.read('settings')[0]||{}).data||{},y=new Date().getFullYear();
  return{settings:s,
    models:local.read('models').filter(m=>m.visible!==false).sort((a,b)=>a.position-b.position),
    options:local.read('options').filter(o=>o.active!==false).sort((a,b)=>a.position-b.position),
    content:local.read('content').sort((a,b)=>a.position-b.position),
    sold:local.read('orders').filter(o=>o.stage!=='annulee'&&new Date(o.created_at).getFullYear()===y).length};
}
const LOCAL_RPC={
  is_admin:()=>true,
  public_catalogue:()=>localCatalogue(),
  place_order(a){
    const cat=localCatalogue();
    if(cat.settings.orders_open===false)throw new Error('Les commandes sont fermées pour le moment.');
    const m=cat.models.find(x=>x.id===a.p_config.model);if(!m||m.sold_out)throw new Error("Ce modèle n'est pas disponible.");
    const q=quote(cat,a.p_config),cl=a.p_client,email=String(cl.email||'').trim().toLowerCase();
    const clients=local.read('clients');let c=clients.find(x=>(x.email||'').toLowerCase()===email);
    if(!c){c={id:uid(),first_name:cl.first,last_name:cl.last,email,phone:cl.tel||null,street:cl.street||null,zip:cl.zip||null,city:cl.city||null,notes:null,created_at:nowIso()};clients.push(c);local.write('clients',clients);}
    const orders=local.read('orders'),y=String(new Date().getFullYear());
    const n=orders.filter(o=>o.ref.startsWith('AUB-'+y+'-')).reduce((mx,o)=>Math.max(mx,+o.ref.slice(9)||0),0)+1;
    const ref='AUB-'+y+'-'+String(n).padStart(4,'0');
    orders.push({id:uid(),ref,client_id:c.id,model_id:m.id,config:{model:m.id,finish:q.f.code,hardware:q.h.code,varnish:q.v.code,case:q.c.code},
      lines:q.lines,total:q.total,deposit:q.deposit,deposit_rate:q.rate,weeks:q.weeks,pay_method:a.p_pay,delivery:a.p_delivery,
      address:a.p_delivery==='livraison'?{street:cl.street,zip:cl.zip,city:cl.city}:null,client_notes:a.p_notes||null,
      /* démonstration : le paiement par carte simulé vaut acompte reçu (avec Supabase, c'est Stripe ou l'atelier qui le valide) */
      stage:a.p_pay==='carte'?'bois':'attente_acompte',deposit_paid_at:a.p_pay==='carte'?nowIso():null,balance_paid_at:null,due_date:null,delivered_at:null,serial:null,last_service_at:null,last_reminder_at:null,notes:null,source:'site',created_at:nowIso()});
    local.write('orders',orders);
    return{ref,total:q.total,deposit:q.deposit,rate:q.rate,weeks:q.weeks,lines:q.lines};
  },
  order_tracking(a){
    const o=local.read('orders').find(x=>x.ref.toUpperCase()===String(a.p_ref).trim().toUpperCase());if(!o)return null;
    const c=local.read('clients').find(x=>x.id===o.client_id);if(!c||(c.email||'').toLowerCase()!==String(a.p_email).trim().toLowerCase())return null;
    const m=local.read('models').find(x=>x.id===o.model_id)||{};
    return{ref:o.ref,stage:o.stage,created_at:o.created_at,due_date:o.due_date,delivered_at:o.delivered_at,model:m.name||o.model_id,kind:m.kind,lines:o.lines,total:o.total,deposit:o.deposit,
      deposit_paid:!!o.deposit_paid_at,balance_paid:!!o.balance_paid_at,first_name:c.first_name,
      updates:local.read('order_updates').filter(u=>u.order_id===o.id&&u.public).sort((a,b)=>b.created_at.localeCompare(a.created_at))};
  },
  site_stats(a){return stats(local.read('events').concat(local.read('events_demo')),a.p_days||30);}
};

/* ---------- Accès aux tables (utilisé par l'admin) ---------- */
const cmp=(k,desc)=>(a,b)=>{const x=a[k],y=b[k];const r=x==null?1:y==null?-1:x<y?-1:x>y?1:0;return desc?-r:r;};
const db={
  async list(t,o={}){
    if(!LIVE){let rows=local.read(t);if(o.eq)rows=rows.filter(r=>Object.keys(o.eq).every(k=>r[k]===o.eq[k]));if(o.order)rows.sort(cmp(o.order,o.desc));return rows;}
    let q='/rest/v1/'+t+'?select=*';
    if(o.eq)for(const k in o.eq)q+='&'+k+'=eq.'+encodeURIComponent(o.eq[k]);
    if(o.order)q+='&order='+o.order+(o.desc?'.desc':'.asc')+'.nullslast';
    return rest(q);
  },
  async insert(t,row){
    if(!LIVE){const rows=local.read(t),r=Object.assign({id:uid(),created_at:nowIso()},row);rows.push(r);local.write(t,rows);return r;}
    return(await rest('/rest/v1/'+t,{method:'POST',body:row,prefer:'return=representation'}))[0];
  },
  async update(t,id,patch){
    if(!LIVE){const rows=local.read(t),r=rows.find(x=>x.id===id);if(!r)throw new Error('Élément introuvable.');Object.assign(r,patch);local.write(t,rows);return r;}
    return(await rest('/rest/v1/'+t+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:patch,prefer:'return=representation'}))[0];
  },
  async upsert(t,rowsIn){
    const arr=Array.isArray(rowsIn)?rowsIn:[rowsIn];if(!arr.length)return[];
    if(!LIVE){const rows=local.read(t);arr.forEach(r=>{const i=rows.findIndex(x=>x.id===r.id);if(i>=0)rows[i]=Object.assign(rows[i],r);else rows.push(Object.assign({created_at:nowIso()},r));});local.write(t,rows);return arr;}
    return rest('/rest/v1/'+t,{method:'POST',body:arr,prefer:'resolution=merge-duplicates,return=representation'});
  },
  async remove(t,id){
    if(!LIVE){local.write(t,local.read(t).filter(x=>x.id!==id));return;}
    await rest('/rest/v1/'+t+'?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
  },
  async rpc(name,args){
    if(!LIVE){if(!LOCAL_RPC[name])throw new Error('Fonction inconnue : '+name);return LOCAL_RPC[name](args||{});}
    return rest('/rest/v1/rpc/'+name,{method:'POST',body:args||{}});
  },
  /* Fichier (photo, modèle 3D) → adresse publique */
  async upload(file,folder){
    if(!LIVE){
      if(file.size>1.5e6)throw new Error('En démonstration, les fichiers de plus de 1,5 Mo ne peuvent pas être gardés. Reliez Supabase pour les envoyer.');
      return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Lecture du fichier impossible.'));r.readAsDataURL(file);});
    }
    const safe=file.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9.]+/g,'-');
    const path=(folder||'divers')+'/'+Date.now()+'-'+safe;
    const r=await fetch(BASE+'/storage/v1/object/medias/'+path,{method:'POST',
      headers:{apikey:KEY,Authorization:'Bearer '+await token(),'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
    if(!r.ok){let j=null;try{j=await r.json();}catch(e){}throw new Error(errMsg(j)||'Envoi du fichier impossible.');}
    return BASE+'/storage/v1/object/public/medias/'+path;
  }
};

/* ---------- Connexion à l'administration ---------- */
const auth={
  email:()=>session&&session.email,
  signedIn:()=>LIVE?!!session:store.get('aubier-demo-admin')==='1',
  async signIn(email,password){
    if(!LIVE){store.set('aubier-demo-admin','1');return;}
    const r=await fetch(BASE+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json().catch(()=>null);
    if(!r.ok)throw new Error(/invalid/i.test(errMsg(j))?'E-mail ou mot de passe incorrect.':(errMsg(j)||'Connexion impossible.'));
    setSession(j);
  },
  async signOut(){
    if(!LIVE){store.del('aubier-demo-admin');return;}
    if(session){try{await fetch(BASE+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token}});}catch(e){}}
    setSession(null);
  },
  async recover(email,redirect){
    const r=await fetch(BASE+'/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email})});
    if(!r.ok){const j=await r.json().catch(()=>null);throw new Error(errMsg(j)||"Envoi de l'e-mail impossible.");}
  },
  /* Lien reçu par e-mail (invitation ou mot de passe oublié) : la session arrive dans l'adresse */
  fromLink(){
    const p=new URLSearchParams(location.hash.slice(1));
    if(!p.get('access_token'))return null;
    setSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:p.get('expires_in')});
    return p.get('type')||'magiclink';
  },
  async setPassword(password){
    const r=await fetch(BASE+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({password})});
    if(!r.ok){const j=await r.json().catch(()=>null);throw new Error(errMsg(j)||'Mot de passe refusé.');}
  }
};

/* ---------- Côté site : catalogue, avec mémoire pour un affichage immédiat ---------- */
const CACHE_KEY='aubier-cat-v1',listeners=[];
function builtinCatalogue(){return BUILTIN?Object.assign(clone(BUILTIN),{sold:null}):null;}
function catalogue(){
  if(PREVIEW){try{const d=JSON.parse(store.get('aubier-apercu')||'null');if(d)return Promise.resolve(d);}catch(e){}}
  if(!LIVE)return Promise.resolve(localCatalogue());
  let cached=null;try{cached=JSON.parse(store.get(CACHE_KEY)||'null');}catch(e){}
  const fresh=withTimeout(rest('/rest/v1/rpc/public_catalogue',{method:'POST',body:{},anon:true}),cached?10000:3000)
    .then(c=>{if(!c||!c.models||!c.models.length)throw new Error('Catalogue vide');store.set(CACHE_KEY,JSON.stringify(c));return c;});
  if(cached){fresh.then(c=>{if(JSON.stringify(c)!==JSON.stringify(cached))listeners.forEach(f=>f(c));},()=>{});return Promise.resolve(cached);}
  return fresh.catch(()=>builtinCatalogue());
}

/* Textes, coordonnées et bandeau « congés » communs à toutes les pages */
function applySite(cat){
  if(!cat)return;
  const S=cat.settings||{},C={};(cat.content||[]).forEach(c=>{C[c.id]=c.value;});
  document.querySelectorAll('[data-c]').forEach(el=>{const v=C[el.dataset.c];if(v!=null&&v!=='')el.textContent=v;});
  document.querySelectorAll('[data-s]').forEach(el=>{const v=S[el.dataset.s];if(v!=null&&v!=='')el.textContent=v;});
  let n=document.getElementById('notice');
  if(S.vacation&&!PREVIEW_HIDE()){
    if(!n){n=document.createElement('div');n.id='notice';n.className='notice';n.setAttribute('role','status');document.body.appendChild(n);}
    const until=S.vacation_until?' Retour le '+new Date(S.vacation_until+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+'.':'';
    n.innerHTML='<span class="star" aria-hidden="true"></span><p></p><button type="button" aria-label="Fermer">×</button>';
    n.querySelector('p').textContent=(S.vacation_message||"L'atelier est fermé pour congés.")+until;
    n.querySelector('button').onclick=()=>{n.hidden=true;try{sessionStorage.setItem('aubier-notice-off','1');}catch(e){}};
  }else if(n)n.remove();
}
function PREVIEW_HIDE(){try{return sessionStorage.getItem('aubier-notice-off')==='1';}catch(e){return false;}}

/* ---------- Côté site : envois du public ---------- */
async function publicInsert(t,row){
  if(!LIVE){await db.insert(t,row);return;}
  await rest('/rest/v1/'+t,{method:'POST',body:row,prefer:'return=minimal',anon:true});
}
const sendRequest=r=>publicInsert('requests',{name:r.name,email:r.email,phone:r.phone||null,subject:r.subject,message:r.message,status:'nouvelle'});
const joinWaitlist=r=>publicInsert('waitlist',{name:r.name,email:r.email,model_id:r.model_id||null,note:r.note||null,status:'attente'});
function placeOrder(a){
  const args={p_config:a.config,p_client:a.client,p_pay:a.pay,p_delivery:a.delivery,p_notes:a.notes||null};
  if(!LIVE)return Promise.resolve().then(()=>LOCAL_RPC.place_order(args));
  return rest('/rest/v1/rpc/place_order',{method:'POST',body:args,anon:true});
}
function tracking(ref,email){
  if(!LIVE)return Promise.resolve().then(()=>LOCAL_RPC.order_tracking({p_ref:ref,p_email:email}));
  return rest('/rest/v1/rpc/order_tracking',{method:'POST',body:{p_ref:ref,p_email:email},anon:true});
}

/* ---------- Statistiques de visite : anonymes, sans cookie ----------
   Un identifiant tiré au hasard par onglet (effacé à sa fermeture) permet de compter les visiteurs.
   Rien n'est compté en aperçu, ni pour un appareil exclu depuis l'admin (« Ne pas compter mes visites »). */
const NOTRACK=PREVIEW||store.get('aubier-notrack')==='1'||navigator.webdriver===true;
let page='accueil';
const ss={get(k){try{return sessionStorage.getItem(k);}catch(e){return null;}},set(k,v){try{sessionStorage.setItem(k,v);}catch(e){}}};
function sid(){let s=ss.get('aubier-sid');if(!s){s=uid().replace(/-/g,'').slice(0,16);ss.set('aubier-sid',s);}return s;}
function source(){
  let s=ss.get('aubier-src');if(s)return s;
  const q=new URLSearchParams(location.search).get('utm_source');let host='';
  try{host=document.referrer?new URL(document.referrer).hostname.replace(/^www\./,''):'';}catch(e){}
  if(host===location.hostname)host='';
  const known=[[/google\./,'Google'],[/bing\./,'Bing'],[/duckduckgo/,'DuckDuckGo'],[/qwant/,'Qwant'],[/instagram/,'Instagram'],[/facebook|fb\.com/,'Facebook'],[/pinterest/,'Pinterest'],[/youtube/,'YouTube'],[/linkedin/,'LinkedIn'],[/t\.co$|twitter|x\.com/,'X'],[/github/,'GitHub']];
  s=q?q.charAt(0).toUpperCase()+q.slice(1):host?((known.find(([r])=>r.test(host))||[0,host])[1]):'Direct';
  ss.set('aubier-src',s);return s;
}
const device=()=>innerWidth<700?'Mobile':innerWidth<1100?'Tablette':'Ordinateur';
function track(type,o){
  if(NOTRACK)return;o=o||{};
  const ev={sid:sid(),type,path:o.path||page,source:source(),device:device(),model:o.model||null,data:o.data||null};
  if(!LIVE){try{const rows=local.read('events');ev.at=nowIso();rows.push(ev);if(rows.length>3000)rows.splice(0,rows.length-3000);local.write('events',rows);}catch(e){}return;}
  rest('/rest/v1/events',{method:'POST',body:ev,prefer:'return=minimal',anon:true,keepalive:true}).catch(()=>{});
}
/* Vitesse ressentie (Core Web Vitals), envoyée quand on quitte la page */
function vitals(){
  if(NOTRACK||!('PerformanceObserver' in window))return;
  const v={};const obs=(type,fn,extra)=>{try{new PerformanceObserver(l=>fn(l.getEntries())).observe(Object.assign({type,buffered:true},extra));}catch(e){}};
  obs('largest-contentful-paint',es=>{const e=es[es.length-1];if(e)v.LCP=e.renderTime||e.startTime;});
  let cls=0;obs('layout-shift',es=>{es.forEach(e=>{if(!e.hadRecentInput)cls+=e.value;});v.CLS=cls;});
  obs('event',es=>{es.forEach(e=>{if(e.interactionId)v.INP=Math.max(v.INP||0,e.duration);});},{durationThreshold:40});
  let sent=false;
  const send=()=>{if(sent)return;sent=true;
    const nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
    if(nav){v.TTFB=nav.responseStart;if(nav.loadEventEnd>0)v.LOAD=nav.loadEventEnd;}
    if(v.CLS==null)v.CLS=0;
    Object.keys(v).forEach(k=>{const val=k==='CLS'?Math.round(v[k]*1000)/1000:Math.round(v[k]);if(isFinite(val))track('vital',{data:{name:k,value:val}});});};
  addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')send();});
  addEventListener('pagehide',send);
}

window.Aubier={
  LIVE,PREVIEW,BUILTIN,local,db,auth,quote,stats,
  catalogue,onCatalogue:f=>listeners.push(f),applySite,
  sendRequest,joinWaitlist,placeOrder,tracking,
  setPage:p=>{page=p;},track,vitals,
  euro:n=>new Intl.NumberFormat('fr-FR').format(Math.round(n||0))+' €'
};
})();
