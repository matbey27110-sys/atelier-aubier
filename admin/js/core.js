/* =========================================================
   ADMIN : socle (connexion, navigation, outils communs)
   Les écrans sont dans vues-atelier.js, vues-catalogue.js et vues-stats.js.
   ========================================================= */
(function(){
'use strict';
const A=window.Aubier,db=A.db;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ---------- Outils ---------- */
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=A.euro;
const pad=n=>String(n).padStart(2,'0');
const isoDay=d=>{d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const parse=d=>d?new Date(String(d).length===10?d+'T12:00':d):null;
const addDays=(d,n)=>{const x=parse(d)||new Date();x.setDate(x.getDate()+n);return x;};
const fmtDate=(d,o)=>{const x=parse(d);return x?x.toLocaleDateString('fr-FR',o||{day:'numeric',month:'short',year:'numeric'}):'—';};
const fmtTime=d=>{const x=parse(d);return x?x.toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';};
const daysFrom=d=>{const x=parse(d);if(!x)return null;const a=new Date();a.setHours(12,0,0,0);const b=new Date(x);b.setHours(12,0,0,0);return Math.round((b-a)/864e5);};
const rel=d=>{const n=daysFrom(d);if(n==null)return'—';if(n===0)return"aujourd'hui";if(n===-1)return'hier';if(n===1)return'demain';return n<0?'il y a '+(-n)+' j':'dans '+n+' j';};
const cname=c=>c?((c.first_name||'')+' '+(c.last_name||'')).trim()||c.email||'Client':'Client inconnu';
const slug=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'element';
const plural=(n,a,b)=>n+' '+(n>1?(b||a+'s'):a);

const STAGES=[
  {id:'attente_acompte',name:"Attente d'acompte",tone:'warn'},
  {id:'bois',name:'Choix des bois',tone:'info'},
  {id:'caisse',name:'Caisse',tone:'info'},
  {id:'manche',name:'Manche',tone:'info'},
  {id:'vernis',name:'Vernis',tone:'info'},
  {id:'reglages',name:'Réglages',tone:'info'},
  {id:'prete',name:'Prête à remettre',tone:'good'},
  {id:'livree',name:'Livrée',tone:''},
  {id:'annulee',name:'Annulée',tone:'bad'}
];
const STAGE=Object.fromEntries(STAGES.map((s,i)=>[s.id,Object.assign({i},s)]));
const WORK=['bois','caisse','manche','vernis','reglages'];
const stageBadge=id=>{const s=STAGE[id]||{name:id,tone:''};return`<span class="badge ${s.tone}">${esc(s.name)}</span>`;};
const REQ_STATUS={nouvelle:['Nouvelle','bad'],repondue:['Répondue','info'],rdv:['Rendez-vous fixé','good'],close:['Classée','']};
const WAIT_STATUS={attente:['En attente','warn'],contacte:['Contacté','info'],converti:['Commande passée','good'],retire:['Retiré','']};

/* ---------- Icônes (traits simples) ---------- */
const ICONS={
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  inbox:'<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .8 3.2 2.5 3.6 5.2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wood:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M9 6.2c0 .7 1.3 1.1 3 1.1s3-.4 3-1.1"/>',
  guitar:'<path d="M20 4 13.5 10.5"/><path d="M18 3l3 3"/><path d="M13.5 10.5a4 4 0 0 0-5.3-.3 3 3 0 0 1-2.4 1A3.5 3.5 0 0 0 3 15c0 3.3 2.7 6 6 6a3.5 3.5 0 0 0 3.8-2.8 3 3 0 0 1 1-2.4 4 4 0 0 0-.3-5.3z"/><circle cx="9.5" cy="14.5" r="1.5"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  text:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  out:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  print:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  down:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  up:'<path d="m6 15 6-6 6 6"/>',
  dn:'<path d="m6 9 6 6 6-6"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
const MONO='<svg viewBox="-123 -160 1726 1820" fill="currentColor" aria-hidden="true"><path d="M400.9 1013.9V1009.9H1033.2V1013.9ZM771.4 -30 1300.4 1496H1442.4V1500H856.8V1496H1073.6L670.7 247.6 233.9 1496H476.8V1500H36.8V1496H229.8L762.1 -30Z"/><path d="M697.4 975C711.6 1159.5 737.9 1185.8 922.4 1200 737.9 1214.2 711.6 1240.5 697.4 1425 683.3 1240.5 656.9 1214.2 472.4 1200 656.9 1185.8 683.3 1159.5 697.4 975Z"/></svg>';

/* ---------- Retours visuels ---------- */
function toast(msg,bad){const t=document.createElement('div');if(bad)t.className='bad';t.textContent=msg;$('#toast').appendChild(t);setTimeout(()=>t.remove(),bad?6000:2600);}
const fail=e=>{console.error(e);toast((e&&e.message)||'Une erreur est survenue.',true);};
/* Désactive le bouton pendant l'enregistrement */
async function busy(btn,fn){if(btn)btn.disabled=true;try{return await fn();}catch(e){fail(e);throw e;}finally{if(btn)btn.disabled=false;}}

/* ---------- Fichiers, e-mails, impression ---------- */
function download(name,text,type){const b=new Blob([text],{type:type||'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
function csv(rows,cols){const q=v=>{v=v==null?'':String(v);return/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  return'﻿'+[cols.map(c=>q(c[0])).join(';')].concat(rows.map(r=>cols.map(c=>q(c[1](r))).join(';'))).join('\r\n');}
function mailto(to,subject,body){location.href='mailto:'+encodeURIComponent(to||'')+'?subject='+encodeURIComponent(subject||'')+'&body='+encodeURIComponent(body||'');}
function printDoc(html){const p=$('#print');p.innerHTML=html;document.body.classList.add('printing');
  const done=()=>{document.body.classList.remove('printing');p.innerHTML='';removeEventListener('afterprint',done);};addEventListener('afterprint',done);setTimeout(()=>window.print(),50);}
const siteUrl=p=>new URL('../'+(p||''),location.href).href;

/* ---------- Formulaires ---------- */
function readForm(f){
  const o={};
  $$('[name]',f).forEach(el=>{
    if(el.type==='radio'){if(el.checked)o[el.name]=el.value;return;}
    if(el.type==='checkbox'){o[el.name]=el.checked;return;}
    if(el.type==='file')return;
    let v=el.value;
    if(el.type==='number'||el.dataset.num!==undefined){v=v===''?null:Number(String(v).replace(',','.'));}
    else if(el.type==='date'||el.type==='datetime-local'){v=v||null;}
    else v=v.trim();
    o[el.name]=v;
  });
  return o;
}
const field=(label,input,help,cls)=>`<label class="field${cls?' '+cls:''}"><span>${label}</span>${input}${help?`<small class="help">${help}</small>`:''}</label>`;
const inp=(name,val,type,attrs)=>`<input name="${name}" type="${type||'text'}" value="${esc(val==null?'':val)}" ${attrs||''}>`;
const area=(name,val,attrs)=>`<textarea name="${name}" ${attrs||''}>${esc(val||'')}</textarea>`;
const sel=(name,val,opts,attrs)=>`<select name="${name}" ${attrs||''}>${opts.map(o=>{const[v,l]=Array.isArray(o)?o:[o,o];return`<option value="${esc(v)}"${String(v)===String(val==null?'':val)?' selected':''}>${esc(l)}</option>`;}).join('')}</select>`;
const sw=(name,val,label)=>`<label class="switch"><input type="checkbox" name="${name}"${val?' checked':''}><span>${label}</span></label>`;
const empty=t=>`<div class="empty">${t}</div>`;

/* ---------- État partagé ---------- */
const S={settings:{},models:[],options:[],content:[],me:{email:'',role:'proprietaire'},dirty:false};
async function loadCatalogue(){
  const[st,models,options,content]=await Promise.all([db.list('settings'),db.list('models',{order:'position'}),db.list('options',{order:'position'}),db.list('content',{order:'position'})]);
  S.settings=(st[0]&&st[0].data)||{};S.models=models;S.options=options;S.content=content;
  /* Aperçu du site et calculs de prix : même format que le catalogue public */
  S.cat={settings:S.settings,models:S.models,options:S.options,content:S.content};
}
const modelName=id=>{const m=S.models.find(x=>x.id===id);return m?m.name:(id||'—');};
const optName=(type,code,model)=>{const o=S.options.find(x=>x.type===type&&x.code===code&&(type!=='finish'||x.model_id===model));return o?o.name:code;};
const isOwner=()=>S.me.role==='proprietaire';

/* ---------- Navigation ---------- */
const NAV=[
  ['Pilotage',[['tableau','Tableau de bord','home'],['stats','Performances','chart']]],
  ['Atelier',[['commandes','Commandes','box'],['planning','Planning','calendar'],['demandes','Demandes','inbox'],['clients','Clients','users'],['attente',"Liste d'attente",'clock'],['bois','Stock de bois','wood']]],
  ['Catalogue',[['modeles','Modèles','guitar'],['options','Options communes','sliders']]],
  ['Site',[['contenu','Textes du site','text'],['reglages','Réglages','gear']]]
];
const views={};
function register(name,v){views[name]=v;}
let lastHash='';
function route(){
  const h=location.hash.replace(/^#\/?/,'');
  if(S.dirty&&h!==lastHash&&!confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')){history.replaceState(null,'','#/'+lastHash);return;}
  S.dirty=false;lastHash=h;
  const[path,qs]=h.split('?'),segs=path.split('/').filter(Boolean),name=segs[0]||'tableau';
  const v=views[name]||views.tableau;
  $$('.side nav a').forEach(a=>{if(a.dataset.v===name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('.app').classList.remove('nav-open');$('.scrim')&&$('.scrim').remove();
  const el=$('#view');el.innerHTML='<div class="loading">Chargement…</div>';window.scrollTo(0,0);
  el.onclick=el.onchange=el.oninput=el.onsubmit=null;
  document.title=(v.title||'Admin')+' · Admin Aubier';
  Promise.resolve(v.render(el,segs[1]?decodeURIComponent(segs[1]):null,new URLSearchParams(qs||''))).catch(e=>{fail(e);el.innerHTML=empty('Impossible de charger cette page : '+esc(e.message||e));});
  refreshCounts();
}
const go=h=>{location.hash='#/'+h;};
const reload=()=>route();

/* Pastilles de la barre latérale : demandes nouvelles, acomptes en attente */
async function refreshCounts(){
  try{
    const[req,ord]=await Promise.all([db.list('requests'),db.list('orders')]);
    const set=(v,n)=>{const a=$(`.side nav a[data-v="${v}"]`);if(!a)return;let c=a.querySelector('.count');if(!n){c&&c.remove();return;}if(!c){c=document.createElement('span');c.className='count';a.appendChild(c);}c.textContent=n;};
    set('demandes',req.filter(r=>r.status==='nouvelle').length);
    set('commandes',ord.filter(o=>o.stage==='attente_acompte').length);
  }catch(e){}
}

function shell(){
  const nav=NAV.map(([g,items])=>`<h6>${g}</h6>`+items.map(([v,l,i])=>`<a href="#/${v}" data-v="${v}">${icon(i)}<span>${l}</span></a>`).join('')).join('');
  $('#root').innerHTML=`
  <div class="app">
    <aside class="side" aria-label="Navigation de l'admin">
      <div class="brand">${MONO}<div><b>Atelier Aubier</b><small>Administration</small></div></div>
      <nav>${nav}</nav>
      <div class="foot">
        <div class="who" title="${esc(S.me.email)}">${A.LIVE?esc(S.me.email):'Démonstration'}${A.LIVE?` · ${S.me.role==='proprietaire'?'propriétaire':'atelier'}`:''}</div>
        <div class="links"><a href="../index.html" target="_blank" rel="noopener">Voir le site ↗</a><button type="button" id="logout">Déconnexion</button></div>
      </div>
    </aside>
    <div>
      <div class="topbar"><button class="btn icon ghost" id="nav-btn" aria-label="Ouvrir le menu">${icon('menu')}</button><b>Atelier Aubier</b></div>
      <main class="main"><div class="main-in">
        ${A.LIVE?'':`<div class="demo-bar"><b>Mode démonstration.</b><span>Données fictives enregistrées dans ce navigateur. Reliez Supabase pour passer en réel (voir LISEZ-MOI).</span></div>`}
        <div id="view"></div>
      </div></main>
    </div>
  </div>`;
  $('#logout').onclick=async()=>{await A.auth.signOut();location.hash='';location.reload();};
  $('#nav-btn').onclick=()=>{$('.app').classList.add('nav-open');const s=document.createElement('div');s.className='scrim';s.onclick=()=>{$('.app').classList.remove('nav-open');s.remove();};$('.app').appendChild(s);};
  addEventListener('hashchange',route);
  addEventListener('beforeunload',e=>{if(S.dirty){e.preventDefault();e.returnValue='';}});
  route();
}

/* ---------- Connexion ---------- */
function loginScreen(msg){
  const live=A.LIVE;
  $('#root').innerHTML=`<div class="login"><div class="login-box">
    <div class="brand">${MONO}<div><b>Atelier Aubier</b><small>Administration</small></div></div>
    ${live?`<h1>Connexion</h1><p>Espace réservé à l'atelier.</p>
    <form id="login-form" novalidate>
      ${field('E-mail','<input name="email" type="email" autocomplete="username" required>')}
      ${field('Mot de passe','<input name="password" type="password" autocomplete="current-password" required>')}
      <p class="err" id="login-err" role="alert">${esc(msg||'')}</p>
      <button class="btn primary" type="submit">Se connecter</button>
    </form>
    <p class="alt"><button class="linkbtn" id="forgot" type="button">Mot de passe oublié ?</button></p>`
    :`<h1>Mode démonstration</h1><p>La base de données n'est pas encore reliée. Vous pouvez explorer l'admin avec des données fictives : elles restent dans ce navigateur.</p>
    <button class="btn primary" id="demo-in" type="button">Entrer dans la démonstration</button>
    <p class="alt">Pour passer en réel, suivez l'étape « Supabase » du fichier LISEZ-MOI.</p>`}
  </div></div>`;
  if(!live){$('#demo-in').onclick=()=>{A.auth.signIn();enter();};return;}
  const f=$('#login-form'),err=$('#login-err');
  f.onsubmit=async e=>{e.preventDefault();err.textContent='';const o=readForm(f);
    if(!o.email||!o.password){err.textContent='Indiquez votre e-mail et votre mot de passe.';return;}
    const b=f.querySelector('button');b.disabled=true;
    try{await A.auth.signIn(o.email,o.password);await enter();}catch(x){err.textContent=x.message;}finally{b.disabled=false;}};
  $('#forgot').onclick=async()=>{const email=f.email.value.trim();if(!email){err.textContent="Indiquez d'abord votre e-mail.";f.email.focus();return;}
    try{await A.auth.recover(email,location.href.split('#')[0]);err.textContent='';toast('Si ce compte existe, un e-mail de réinitialisation vient de partir.');}catch(x){err.textContent=x.message;}};
}
function passwordScreen(kind){
  $('#root').innerHTML=`<div class="login"><div class="login-box">
    <div class="brand">${MONO}<div><b>Atelier Aubier</b><small>Administration</small></div></div>
    <h1>${kind==='invite'?'Bienvenue':'Nouveau mot de passe'}</h1><p>Choisissez votre mot de passe (8 caractères minimum).</p>
    <form id="pw-form" novalidate>
      ${field('Mot de passe','<input name="p1" type="password" autocomplete="new-password" minlength="8" required>')}
      ${field('Confirmation','<input name="p2" type="password" autocomplete="new-password" required>')}
      <p class="err" id="pw-err" role="alert"></p>
      <button class="btn primary" type="submit">Enregistrer</button>
    </form></div></div>`;
  const f=$('#pw-form');f.onsubmit=async e=>{e.preventDefault();const o=readForm(f),err=$('#pw-err');
    if(o.p1.length<8){err.textContent='8 caractères minimum.';return;}if(o.p1!==o.p2){err.textContent='Les deux mots de passe sont différents.';return;}
    try{await A.auth.setPassword(o.p1);history.replaceState(null,'',location.pathname);toast('Mot de passe enregistré.');enter();}catch(x){err.textContent=x.message;}};
}

async function enter(){
  $('#root').innerHTML='<div class="loading">Chargement…</div>';
  try{
    if(A.LIVE){
      const ok=await db.rpc('is_admin');
      if(!ok){const em=A.auth.email();await A.auth.signOut();loginScreen('Le compte '+em+" n'a pas accès à l'administration. Ajoutez-le à la table « admins » dans Supabase.");return;}
      S.me.email=A.auth.email();
      try{const me=(await db.list('admins')).find(a=>a.email.toLowerCase()===S.me.email.toLowerCase());if(me)S.me.role=me.role;}catch(e){}
    }else{window.AdminDemo.seed();S.me={email:'demo',role:'proprietaire'};}
    /* L'appareil de l'atelier ne fausse pas les statistiques (réglable dans Performances) */
    try{if(localStorage.getItem('aubier-notrack')===null)localStorage.setItem('aubier-notrack','1');}catch(e){}
    await loadCatalogue();
    shell();
  }catch(e){
    if(A.LIVE&&!A.auth.signedIn()){loginScreen('Votre session a expiré. Reconnectez-vous.');return;}
    $('#root').innerHTML=`<div class="login"><div class="login-box"><h1>Connexion impossible</h1><p>${esc(e.message||e)}</p><p class="faint small">Vérifiez l'adresse et la clé dans js/config.js, et que le fichier supabase/schema.sql a bien été exécuté.</p><button class="btn" onclick="location.reload()">Réessayer</button></div></div>`;
  }
}

function start(){
  if(A.LIVE){const k=A.auth.fromLink();if(k==='recovery'||k==='invite'||k==='signup'){passwordScreen(k);return;}if(k)history.replaceState(null,'',location.pathname);}
  if(!A.auth.signedIn()){loginScreen();return;}
  enter();
}

window.Admin={start,register,go,reload,S,loadCatalogue,refreshCounts,
  $,$$,esc,euro,pad,isoDay,parse,addDays,fmtDate,fmtTime,daysFrom,rel,cname,slug,plural,
  STAGES,STAGE,WORK,stageBadge,REQ_STATUS,WAIT_STATUS,icon,
  toast,fail,busy,download,csv,mailto,printDoc,siteUrl,readForm,field,inp,area,sel,sw,empty,
  modelName,optName,isOwner,db,A};
})();
