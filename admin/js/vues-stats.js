/* =========================================================
   ADMIN : performances du site et petits graphiques
   Les statistiques sont anonymes : pas de cookie, pas d'adresse IP, pas de nom.
   ========================================================= */
(function(){
'use strict';
const Ad=window.Admin,{db,S,$,$$,esc,euro,fmtDate,plural,icon,toast,empty,optName,modelName}=Ad;
const nf=(n,d)=>Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:d==null?0:d});
const pctOf=(a,b)=>b?a/b*100:0;

/* ---------- Graphiques ---------- */
const niceMax=v=>{if(v<=4)return 4;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;};
const dayLabel=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)?fmtDate(d,{day:'numeric',month:'short'}):d;
/* Histogramme vertical : series = [{d, v, p?}] */
function bars(series,o){
  o=o||{};const max=niceMax(Math.max(1,...series.map(s=>s.v))),n=series.length;
  const showX=o.labels==='all'?series.map((_,i)=>i):[0,Math.floor((n-1)/2),n-1];
  return`<div class="cb" style="--h:${o.h||180}px">
    <div class="cb-y"><span style="bottom:100%">${nf(max)}</span><span style="bottom:50%">${nf(max/2,1)}</span><span style="bottom:0">0</span></div>
    <div class="cb-plot"><div class="cb-grid"></div><div class="cb-bars" style="gap:${n>60?1:2}px">${series.map(s=>`<div class="cb-col" data-tip="<b>${esc(dayLabel(s.d))}</b><br>${nf(s.v)} ${esc(o.label||'')}${s.p!=null?' · '+nf(s.p)+' pages':''}"><i style="height:${s.v?Math.max(1.5,s.v/max*100):0}%"></i></div>`).join('')}</div></div>
    <div></div><div class="cb-x">${showX.map(i=>`<span style="left:${(i+.5)/n*100}%">${esc(dayLabel(series[i].d))}</span>`).join('')}</div>
  </div>`;
}
/* Barres horizontales : items = [{k, n}] */
function hbars(items,o){
  o=o||{};const total=o.total||items.reduce((s,i)=>s+i.n,0),max=Math.max(1,...items.map(i=>i.n));
  return items.length?`<div class="hbars">${items.map(i=>`<div class="r" data-tip="<b>${esc(o.name?o.name(i.k):i.k)}</b><br>${nf(i.n)} ${esc(o.unit||'')}${total?' · '+nf(pctOf(i.n,total),1)+' %':''}">
    <span class="l" title="${esc(o.name?o.name(i.k):i.k)}">${esc(o.name?o.name(i.k):i.k)}</span><span class="track"><i style="width:${i.n/max*100}%"></i></span>
    <span class="v">${o.fmt?o.fmt(i.n):nf(i.n)}${o.pct!==false&&total?` <small>${nf(pctOf(i.n,total))} %</small>`:''}</span></div>`).join('')}</div>`:empty('Pas encore de données.');
}
/* Infobulle commune à tous les graphiques d'un écran */
function bindTips(root){
  let tip=null;
  root.addEventListener('pointermove',e=>{const t=e.target.closest('[data-tip]');const host=t&&t.closest('.card,.cb')||null;
    if(!t){if(tip){tip.remove();tip=null;}return;}
    if(!tip){tip=document.createElement('div');tip.className='tip';document.body.appendChild(tip);}
    tip.innerHTML=t.dataset.tip;const r=t.getBoundingClientRect();
    tip.style.left=Math.min(innerWidth-80,Math.max(80,e.clientX))+'px';tip.style.top=(r.top+scrollY)+'px';tip.style.position='absolute';});
  root.addEventListener('pointerleave',()=>{if(tip){tip.remove();tip=null;}});
}
Ad.charts={bars,hbars,bindTips};

/* ---------- Seuils de vitesse (recommandations Google « Core Web Vitals ») ---------- */
const VITALS=[
  ['LCP','Affichage principal','Temps avant que le plus gros élément soit visible.',2500,4000,'ms'],
  ['INP','Réactivité','Délai entre un clic et la réponse de la page.',200,500,'ms'],
  ['CLS','Stabilité','Éléments qui bougent pendant le chargement.',.1,.25,''],
  ['TTFB','Réponse du serveur','Temps avant le premier octet reçu.',800,1800,'ms'],
  ['LOAD','Chargement complet','Page entièrement chargée, 3D comprise.',3000,6000,'ms']
];
const fmtV=(v,u)=>v==null?'—':u==='ms'?(v>=1000?nf(v/1000,1)+' s':nf(v)+' ms'):nf(v,3);
const grade=(v,good,poor)=>v==null?['','Pas de mesure']:v<=good?['good','Bon']:v<=poor?['warn','À améliorer']:['bad','Lent'];
const PAGES={accueil:'Accueil',configurateur:'Configurateur',commande:'Commande',suivi:'Suivi de commande',cgv:'CGV','mentions-legales':'Mentions légales'};
const FUNNEL=[['view','Visite du site'],['anatomie','Anatomie consultée'],['config','Configurateur ouvert'],['commander','Clic sur « Commander »'],['checkout','Étape de l’acompte'],['order','Commande passée']];
const KNAME={finish:'Finition',hardware:'Accastillage',varnish:'Vernis',case:'Étui'};
const size=b=>b==null?'—':b>=1048576?nf(b/1048576,1)+' Mo':nf(Math.max(1,b/1024))+' Ko';

Ad.register('stats',{title:'Performances',async render(el,_,q){
  const days=[7,30,90].includes(+q.get('p'))?+q.get('p'):30;
  let st;try{st=await db.rpc('site_stats',{p_days:days});}catch(e){el.innerHTML=empty('Statistiques indisponibles : '+esc(e.message));return;}
  const F=st.funnel||{},PF=st.prev_funnel||{},V=st.visitors||0;
  const delta=(a,b)=>b?Math.round((a-b)/b*100):null;
  const dTxt=d=>d==null?'Pas de comparaison':(d>0?'+':'')+d+' % vs '+days+' j précédents';
  const conv=pctOf(F.order||0,V),pconv=pctOf(PF.order||0,st.prev_visitors||0);
  const mobile=(st.devices||[]).find(d=>d.k==='Mobile'),mobShare=pctOf(mobile?mobile.n:0,V);
  /* Choix du configurateur, regroupés par modèle */
  const byModel={};(st.choices||[]).filter(c=>c.k!=='model').forEach(c=>{const m=byModel[c.m]=byModel[c.m]||{};(m[c.k]=m[c.k]||[]).push({k:c.v,n:+c.n});});
  const modelPicks=(st.choices||[]).filter(c=>c.k==='model').map(c=>({k:c.v,n:+c.n})).sort((a,b)=>b.n-a.n);
  const vit=st.vitals||{},l3=st.load3d||{};

  /* Recommandations simples, déduites des chiffres */
  const reco=[];
  const lcp=vit.LCP&&vit.LCP.p75;if(lcp>2500)reco.push(['bad',`L'affichage principal met ${fmtV(lcp,'ms')} à apparaître pour un visiteur sur quatre. Alléger les modèles 3D (compression Draco ou Meshopt, textures en 2048 px) ou afficher une photo fixe en attendant la 3D.`]);
  Object.entries(l3).forEach(([m,v])=>{if(v.p75>2500)reco.push(['warn',`La 3D de la ${modelName(m)} met ${fmtV(v.p75,'ms')} à charger : réduire le poids de son fichier .glb.`]);});
  if(vit.CLS&&vit.CLS.p75>.1)reco.push(['warn','Des éléments bougent pendant le chargement : réserver la place des images et de la 3D.']);
  if(vit.INP&&vit.INP.p75>200)reco.push(['warn','La page réagit lentement aux clics sur certains appareils : la 3D est sans doute trop lourde pour les téléphones anciens.']);
  if(V>30&&pctOf(F.config||0,V)<15)reco.push(['info',`Seuls ${nf(pctOf(F.config||0,V))} % des visiteurs ouvrent le configurateur : rendre le bouton « Composer » plus visible dès l'accueil.`]);
  if((F.checkout||0)>=5&&pctOf(F.order||0,F.checkout)<35)reco.push(['info',`Beaucoup de visiteurs s'arrêtent à l'étape de l'acompte (${nf(pctOf(F.order||0,F.checkout))} % la terminent) : rassurer sur le paiement sécurisé et le remboursement de l'acompte si besoin.`]);
  if(mobShare>50)reco.push(['info',`${nf(mobShare)} % des visiteurs sont sur téléphone : vérifiez chaque changement sur mobile en priorité.`]);
  if(!reco.length)reco.push(['good','Rien à signaler : le site est rapide et le parcours de commande fonctionne.']);

  el.innerHTML=`
  <div class="page-head"><div><h1>Performances du site</h1><p class="sub">Statistiques anonymes, sans cookie. ${Ad.A.LIVE?'':'En démonstration : données fictives, plus vos propres visites dans ce navigateur.'}</p></div>
    <div class="actions"><div class="seg">${[7,30,90].map(d=>`<a href="#/stats?p=${d}"${d===days?' aria-current="page"':''}>${d} jours</a>`).join('')}</div></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="k">Visiteurs</div><div class="v num">${nf(V)}</div><div class="d ${delta(V,st.prev_visitors)>0?'up':delta(V,st.prev_visitors)<0?'down':''}">${dTxt(delta(V,st.prev_visitors))}</div></div>
    <div class="card kpi"><div class="k">Pages vues</div><div class="v num">${nf(st.views)}</div><div class="d">${V?nf(st.views/V,1)+' pages par visite':'—'}</div></div>
    <div class="card kpi"><div class="k">Taux de commande</div><div class="v num">${nf(conv,2)} %</div><div class="d ${conv>pconv?'up':conv<pconv?'down':''}">${plural(F.order||0,'commande')} · ${nf(pconv,2)} % avant</div></div>
    <div class="card kpi"><div class="k">Configurateur ouvert</div><div class="v num">${nf(pctOf(F.config||0,V))} %</div><div class="d">${plural(F.config||0,'visiteur')}</div></div>
  </div>
  <section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Visiteurs par jour</h2><span class="muted">${fmtDate((st.series[0]||{}).d)} → ${fmtDate((st.series[st.series.length-1]||{}).d)}</span></div>
    <div class="card-b">${bars(st.series,{h:200,label:'visiteurs'})}</div></section>
  <div class="grid g2" style="margin-bottom:16px">
    <section class="card"><div class="card-h"><h2>Parcours d'achat</h2><span class="muted">Part des visiteurs à chaque étape</span></div><div class="card-b">
      <div class="hbars funnel">${FUNNEL.map(([k,l],i)=>{const n=F[k]||0,prev=i?F[FUNNEL[i-1][0]]||0:0,drop=i&&prev?Math.round((1-n/prev)*100):null;
        return`<div class="r" data-tip="<b>${esc(l)}</b><br>${nf(n)} visiteurs · ${nf(pctOf(n,V),1)} % des visites${drop!=null?'<br>'+drop+' % perdus depuis l’étape précédente':''}"><span class="l">${l}</span><span class="track"><i style="width:${pctOf(n,V)}%"></i></span>
          <span class="v">${nf(n)} <small>${nf(pctOf(n,V),pctOf(n,V)<1?1:0)} %</small>${drop!=null&&drop>0?`<span class="drop"> −${drop} %</span>`:''}</span></div>`;}).join('')}</div>
      <p class="small faint" style="margin-top:12px">« −x % » : visiteurs perdus depuis l'étape précédente.</p></div></section>
    <section class="card"><div class="card-h"><h2>Recommandations</h2></div><div class="list">${reco.map(([t,x])=>`<div><span class="dot ${t}"></span><div class="grow" style="white-space:normal">${esc(x)}</div></div>`).join('')}</div></section>
  </div>
  <div class="grid g3" style="margin-bottom:16px">
    <section class="card"><div class="card-h"><h2>D'où viennent-ils ?</h2></div><div class="card-b">${hbars(st.sources||[],{total:V,unit:'visiteurs'})}</div></section>
    <section class="card"><div class="card-h"><h2>Appareils</h2></div><div class="card-b">${hbars(st.devices||[],{total:V,unit:'visiteurs'})}</div></section>
    <section class="card"><div class="card-h"><h2>Pages vues</h2></div><div class="card-b">${hbars(st.pages||[],{name:k=>PAGES[k]||k,unit:'vues'})}</div></section>
  </div>
  <section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Ce que les visiteurs composent</h2><span class="muted">Choix faits dans le configurateur</span></div>
    <div class="card-b">${modelPicks.length||Object.keys(byModel).length?`<div class="grid g3">${S.models.filter(m=>byModel[m.id]).map(m=>`<div class="stack" style="gap:14px"><h3 style="font-size:14.5px">${esc(m.name)}</h3>
      ${['finish','hardware','varnish','case'].filter(k=>byModel[m.id][k]).map(k=>`<div><div class="small muted" style="margin-bottom:6px">${KNAME[k]}</div>${hbars(byModel[m.id][k].sort((a,b)=>b.n-a.n).slice(0,5),{name:v=>optName(k,v,m.id),unit:'choix'})}</div>`).join('')}</div>`).join('')}</div>`:empty('Pas encore de choix enregistrés.')}</div></section>
  <section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Vitesse ressentie</h2><span class="muted">Valeur atteinte par 75 % des visites</span></div>
    <div class="vitals">${VITALS.map(([k,l,h,g,p,u])=>{const v=vit[k],[t,txt]=grade(v&&v.p75,g,p);return`<div class="vital"><span class="k">${l}</span><span class="v">${fmtV(v&&v.p75,u)}</span><span>${t?`<span class="badge ${t}">${txt}</span>`:`<span class="faint small">${txt}</span>`}</span><span class="h">${h}${v?' · '+plural(v.n,'mesure'):''}</span></div>`;}).join('')}</div></section>
  <div class="grid g2">
    <section class="card"><div class="card-h"><h2>Chargement de la 3D</h2><span class="muted">Par modèle</span></div><div class="card-b">${Object.keys(l3).length?hbars(Object.entries(l3).map(([k,v])=>({k,n:Math.round(v.p75)})),{name:modelName,fmt:v=>fmtV(v,'ms'),pct:false,unit:'ms'}):empty('Pas encore de mesure.')}</div></section>
    <section class="card"><div class="card-h"><h2>Poids des fichiers</h2><span class="muted">Ce que télécharge un visiteur</span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Fichier</th><th class="num">Poids</th><th></th></tr></thead><tbody id="weights"><tr><td colspan="3" class="faint">Mesure en cours…</td></tr></tbody></table></div></section>
  </div>
  <div class="note" style="margin-top:16px"><label class="check"><input type="checkbox" id="notrack"${localStorage.getItem('aubier-notrack')==='1'?' checked':''}> Ne pas compter mes visites sur cet appareil</label>
    <p class="small" style="margin-top:6px">Aucune donnée personnelle n'est collectée : un numéro de visite tiré au hasard, effacé à la fermeture de l'onglet, le type d'appareil et le site d'où vient le visiteur. Ce type de mesure n'exige pas de bandeau cookies.</p></div>`;
  bindTips(el);
  $('#notrack').onchange=e=>{try{localStorage.setItem('aubier-notrack',e.target.checked?'1':'0');}catch(x){}toast(e.target.checked?'Vos visites ne sont plus comptées sur cet appareil.':'Vos visites sont à nouveau comptées.');};

  /* Poids réels des fichiers, mesurés en ligne */
  const files=S.models.filter(m=>m.visible!==false).map(m=>[`Modèle 3D · ${m.name}`,m.glb_url||(m.file?Ad.siteUrl(m.file.replace(/\.js$/,'.glb')):null),8*1048576])
    .concat([['Script du site',Ad.siteUrl('js/main.js'),300*1024],['Catalogue',Ad.siteUrl('js/catalogue.js'),100*1024],['Feuille de style',Ad.siteUrl('css/style.css'),150*1024],['Police Blasse',Ad.siteUrl('assets/fonts/Blasse.woff2'),200*1024]]);
  const measure=async url=>{if(!url)return null;if(url.startsWith('data:'))return Math.round((url.length-url.indexOf(',')-1)*.75);
    try{const h=await fetch(url,{method:'HEAD',cache:'no-store'});const n=+h.headers.get('content-length');if(n)return n;}catch(e){}
    try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;return(await r.blob()).size;}catch(e){return null;}};
  const sizes=await Promise.all(files.map(f=>measure(f[1])));
  const w=$('#weights');if(!w)return;
  w.innerHTML=files.map((f,i)=>`<tr><td>${esc(f[0])}</td><td class="num">${size(sizes[i])}</td><td>${sizes[i]==null?'<span class="faint small">Mesurable une fois en ligne</span>':sizes[i]>f[2]?'<span class="badge warn">Lourd</span>':'<span class="badge good">OK</span>'}</td></tr>`).join('');
}});
})();
