/* =========================================================
   ADMIN : écrans de l'atelier
   Tableau de bord · Commandes · Planning · Demandes · Clients · Liste d'attente · Stock de bois
   ========================================================= */
(function(){
'use strict';
const Ad=window.Admin,{db,S,$,$$,esc,euro,isoDay,parse,addDays,fmtDate,fmtTime,daysFrom,rel,cname,plural,STAGES,STAGE,WORK,stageBadge,REQ_STATUS,WAIT_STATUS,icon,
  toast,fail,busy,download,csv,mailto,printDoc,siteUrl,readForm,field,inp,area,sel,sw,empty,modelName,optName}=Ad;
const load=(...t)=>Promise.all(t.map(x=>db.list(x)));
const byId=rows=>Object.fromEntries(rows.map(r=>[r.id,r]));
const inYear=(d,y)=>!!d&&new Date(d).getFullYear()===y;
const YEAR=()=>new Date().getFullYear();

/* Entretien : une révision tous les N mois après la remise (ou après la dernière révision) */
const months=()=>+S.settings.maintenance_months||12;
const nextService=o=>{const base=parse(o.last_service_at||o.delivered_at);if(!base)return null;const d=new Date(base);d.setMonth(d.getMonth()+months());return isoDay(d);};
const warrantyEnd=o=>{const b=parse(o.delivered_at);if(!b)return null;const d=new Date(b);d.setFullYear(d.getFullYear()+(+S.settings.warranty_years||2));return isoDay(d);};
const reminded=o=>o.last_reminder_at&&daysFrom(o.last_reminder_at)>-60;
Ad.nextService=nextService;

/* Couleur de pastille d'une finition */
const swatchOf=o=>{const f=S.options.find(x=>x.type==='finish'&&x.model_id===o.model_id&&x.code===(o.config||{}).finish);const s=f&&f.props&&f.props.swatch;
  return s&&!String(s).startsWith('wood:')?`background:${esc(s)}`:'background:linear-gradient(135deg,#d9a35d,#8a5524)';};
const stageIndex=id=>STAGES.findIndex(s=>s.id===id);
const progress=o=>Math.round(Math.max(0,stageIndex(o.stage))/7*100);

/* =========================================================
   TABLEAU DE BORD
   ========================================================= */
Ad.register('tableau',{title:'Tableau de bord',async render(el){
  const[orders,clients,requests,wood,waitlist]=await load('orders','clients','requests','wood','waitlist');
  let st=null;try{st=await db.rpc('site_stats',{p_days:30});}catch(e){}
  const Y=YEAR(),set=S.settings,cap=+set.capacity||8,C=byId(clients);
  const live=orders.filter(o=>o.stage!=='annulee');
  const sold=live.filter(o=>inYear(o.created_at,Y)).length;
  const ca=live.filter(o=>inYear(o.created_at,Y)).reduce((s,o)=>s+o.total,0);
  const cashed=live.reduce((s,o)=>s+(inYear(o.deposit_paid_at,Y)?o.deposit:0)+(inYear(o.balance_paid_at,Y)?o.total-o.deposit:0),0);
  const toCash=live.reduce((s,o)=>s+(o.deposit_paid_at?0:o.deposit)+(o.balance_paid_at?0:o.total-o.deposit),0);
  const todo=[];
  live.filter(o=>o.stage==='attente_acompte').forEach(o=>todo.push(['warn',`Acompte à valider · ${o.ref}`,`${cname(C[o.client_id])} · ${euro(o.deposit)} par ${o.pay_method==='virement'?'virement':'carte'} · ${rel(o.created_at)}`,'commandes/'+o.id]));
  requests.filter(r=>r.status==='nouvelle').forEach(r=>todo.push(['bad',`Nouvelle demande · ${r.subject||'Message'}`,`${r.name||r.email} · ${rel(r.created_at)}`,'demandes']));
  live.filter(o=>!['livree','attente_acompte'].includes(o.stage)&&o.due_date&&daysFrom(o.due_date)<=14).forEach(o=>{const n=daysFrom(o.due_date);
    todo.push([n<0?'bad':'info',(n<0?'En retard · ':'Remise proche · ')+o.ref,`${modelName(o.model_id)} pour ${cname(C[o.client_id])} · prévue ${rel(o.due_date)}`,'commandes/'+o.id]);});
  live.filter(o=>o.stage==='livree'&&o.delivered_at&&!reminded(o)).forEach(o=>{const nx=nextService(o),n=daysFrom(nx);
    if(n<=30)todo.push(['info','Entretien à proposer · '+cname(C[o.client_id]),`${modelName(o.model_id)}${o.serial?' '+o.serial:''} · révision ${n<0?'due depuis '+(-n)+' j':rel(nx)}`,'clients/'+o.client_id]);});
  wood.filter(w=>+w.quantity<=+w.min_qty).forEach(w=>todo.push(['warn','Stock bas · '+w.species,`${w.part||''} · reste ${w.quantity} ${w.unit}`,'bois']));
  const working=live.filter(o=>WORK.includes(o.stage)||o.stage==='prete').sort((a,b)=>(a.due_date||'9').localeCompare(b.due_date||'9'));
  const rdv=requests.filter(r=>r.status==='rdv'&&r.appointment_at&&daysFrom(r.appointment_at)>=0).sort((a,b)=>a.appointment_at.localeCompare(b.appointment_at)).slice(0,5);
  const v=st?st.visitors:null,pv=st?st.prev_visitors:null,delta=v!=null&&pv?Math.round((v-pv)/pv*100):null;
  const conv=st&&st.visitors?((st.funnel.order||0)/st.visitors*100):null;
  const left=Math.max(cap-sold,0);
  el.innerHTML=`
  <div class="page-head"><div><h1>Tableau de bord</h1><p class="sub">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
    <div class="actions"><a class="btn" href="#/commandes/nouvelle">${icon('plus')}Nouvelle commande</a><a class="btn" href="../index.html" target="_blank" rel="noopener">${icon('out')}Voir le site</a></div></div>
  ${set.vacation?`<div class="note warn" style="margin-bottom:16px"><b>Mode congés actif.</b> Le bandeau est affiché sur le site${set.vacation_until?' jusqu’au '+fmtDate(set.vacation_until):''}. <a href="#/reglages">Modifier</a></div>`:''}
  ${set.orders_open===false?`<div class="note warn" style="margin-bottom:16px"><b>Commandes fermées.</b> Le site propose la liste d'attente à la place. <a href="#/reglages">Rouvrir</a></div>`:''}
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="k">Places vendues en ${Y}</div><div class="v num">${sold} <small>/ ${cap}</small></div>
      <div class="slots">${Array.from({length:cap},(_,i)=>`<i class="${i<sold?'on':''}"></i>`).join('')}</div><div class="d">${left?plural(left,'place restante','places restantes'):'Complet'}</div></div>
    <div class="card kpi"><div class="k">Chiffre d'affaires ${Y}</div><div class="v num">${euro(ca)}</div><div class="d">Commandes de l'année, hors annulées</div></div>
    <div class="card kpi"><div class="k">Encaissé en ${Y}</div><div class="v num">${euro(cashed)}</div><div class="d">Acomptes et soldes reçus</div></div>
    <div class="card kpi"><div class="k">Reste à encaisser</div><div class="v num">${euro(toCash)}</div><div class="d">Acomptes en attente et soldes à la remise</div></div>
  </div>
  <div class="grid g4" style="margin-bottom:16px">
    <a class="card kpi" href="#/stats" style="color:inherit;text-decoration:none"><div class="k">Visiteurs (30 jours)</div><div class="v num">${v==null?'—':v}</div><div class="d ${delta>0?'up':delta<0?'down':''}">${delta==null?'Statistiques indisponibles':(delta>0?'+':'')+delta+' % sur 30 jours'}</div></a>
    <a class="card kpi" href="#/stats" style="color:inherit;text-decoration:none"><div class="k">Taux de commande</div><div class="v num">${conv==null?'—':conv.toLocaleString('fr-FR',{maximumFractionDigits:1})+' %'}</div><div class="d">Visiteurs qui passent commande</div></a>
    <a class="card kpi" href="#/demandes" style="color:inherit;text-decoration:none"><div class="k">Demandes à traiter</div><div class="v num">${requests.filter(r=>r.status==='nouvelle').length}</div><div class="d">${plural(rdv.length,'rendez-vous à venir','rendez-vous à venir')}</div></a>
    <a class="card kpi" href="#/attente" style="color:inherit;text-decoration:none"><div class="k">Liste d'attente</div><div class="v num">${waitlist.filter(w=>w.status==='attente'||w.status==='contacte').length}</div><div class="d">Personnes à prévenir</div></a>
  </div>
  <div class="grid g-main">
    <div class="stack">
      <section class="card"><div class="card-h"><h2>À faire</h2><span class="muted">${plural(todo.length,'point')}</span></div>
        <div class="list">${todo.length?todo.map(([tone,t,s,h])=>`<a class="item" href="#/${h}"><span class="dot ${tone}"></span><div class="grow"><div class="t1">${esc(t)}</div><div class="t2">${esc(s)}</div></div></a>`).join(''):empty('Rien d’urgent. Bon travail à l’établi.')}</div></section>
      <section class="card"><div class="card-h"><h2>À l'établi</h2><a class="small" href="#/planning">Planning</a></div>
        <div class="table-wrap">${working.length?`<table class="t"><thead><tr><th>Commande</th><th>Étape</th><th class="hide-sm">Avancement</th><th>Remise</th></tr></thead><tbody>${working.map(o=>`
          <tr class="link" data-href="commandes/${o.id}"><td><b>${esc(modelName(o.model_id))}</b><span class="sub">${esc(o.ref)} · ${esc(cname(C[o.client_id]))}</span></td><td>${stageBadge(o.stage)}</td>
          <td class="hide-sm" style="min-width:120px"><div class="bar"><i style="width:${progress(o)}%"></i></div></td>
          <td class="nowrap ${o.due_date&&daysFrom(o.due_date)<0?'':'muted'}" style="${o.due_date&&daysFrom(o.due_date)<0?'color:var(--bad)':''}">${o.due_date?fmtDate(o.due_date,{day:'numeric',month:'short'}):'—'}</td></tr>`).join('')}</tbody></table>`:empty('Aucun instrument en fabrication.')}</div></section>
    </div>
    <div class="stack">
      <section class="card"><div class="card-h"><h2>Prochains rendez-vous</h2><a class="small" href="#/demandes">Demandes</a></div>
        <div class="list">${rdv.length?rdv.map(r=>`<a class="item" href="#/demandes"><span class="dot good"></span><div class="grow"><div class="t1">${esc(r.name||r.email)}</div><div class="t2">${esc(fmtTime(r.appointment_at))} · ${esc(r.subject||'')}</div></div></a>`).join(''):empty('Aucun rendez-vous prévu.')}</div></section>
      <section class="card"><div class="card-h"><h2>Visiteurs, 30 derniers jours</h2><a class="small" href="#/stats">Détails</a></div>
        <div class="card-b">${st?Ad.charts.bars(st.series,{h:150,label:'visiteurs'}):empty('Statistiques indisponibles.')}</div></section>
    </div>
  </div>`;
  el.onclick=e=>{const r=e.target.closest('tr[data-href]');if(r)Ad.go(r.dataset.href);};
  if(st)Ad.charts.bindTips(el);
}});

/* =========================================================
   COMMANDES
   ========================================================= */
Ad.register('commandes',{title:'Commandes',render(el,id,q){
  if(id==='nouvelle')return newOrder(el,q);
  if(id)return orderDetail(el,id);
  return orderList(el,q);
}});

async function orderList(el,q){
  const[orders,clients]=await load('orders','clients');const C=byId(clients);
  orders.sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const F={toutes:['Toutes',()=>true],acompte:["Attente d'acompte",o=>o.stage==='attente_acompte'],fabrication:['En fabrication',o=>WORK.includes(o.stage)],
    pretes:['Prêtes',o=>o.stage==='prete'],livrees:['Livrées',o=>o.stage==='livree'],annulees:['Annulées',o=>o.stage==='annulee']};
  let f=F[q.get('f')]?q.get('f'):'toutes',term='';
  el.innerHTML=`
  <div class="page-head"><div><h1>Commandes</h1><p class="sub">${plural(orders.length,'commande')} au total</p></div>
    <div class="actions"><button class="btn" data-act="csv">${icon('down')}Exporter (CSV)</button><a class="btn primary" href="#/commandes/nouvelle">${icon('plus')}Nouvelle commande</a></div></div>
  <div class="toolbar"><div class="seg" id="filters">${Object.entries(F).map(([k,[l,fn]])=>`<button data-f="${k}" aria-pressed="${k===f}">${l} <span class="c">${orders.filter(fn).length}</span></button>`).join('')}</div>
    <input type="search" id="q" placeholder="Rechercher : référence, client, modèle…" aria-label="Rechercher"></div>
  <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Commande</th><th>Client</th><th class="num">Total</th><th class="hide-sm">Acompte</th><th>Étape</th><th class="hide-sm">Remise prévue</th><th class="hide-sm">Créée</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  const draw=()=>{
    const t=term.toLowerCase();
    const rows=orders.filter(F[f][1]).filter(o=>!t||[o.ref,cname(C[o.client_id]),(C[o.client_id]||{}).email,modelName(o.model_id)].join(' ').toLowerCase().includes(t));
    $('#rows').innerHTML=rows.length?rows.map(o=>`<tr class="link" data-href="commandes/${o.id}">
      <td><b>${esc(modelName(o.model_id))}</b><span class="sub mono">${esc(o.ref)}</span></td>
      <td>${esc(cname(C[o.client_id]))}<span class="sub">${esc((C[o.client_id]||{}).city||'')}</span></td>
      <td class="num">${euro(o.total)}</td>
      <td class="hide-sm">${o.deposit_paid_at?`<span class="badge good">Reçu</span>`:o.stage==='annulee'?'<span class="faint">—</span>':`<span class="badge warn">${o.pay_method==='virement'?'Virement attendu':'En attente'}</span>`}</td>
      <td>${stageBadge(o.stage)}</td>
      <td class="hide-sm nowrap">${o.stage==='livree'?'<span class="faint">Livrée le '+fmtDate(o.delivered_at,{day:'numeric',month:'short'})+'</span>':o.due_date?fmtDate(o.due_date):'—'}</td>
      <td class="hide-sm nowrap muted">${fmtDate(o.created_at)}</td></tr>`).join(''):`<tr><td colspan="7">${empty('Aucune commande ici.')}</td></tr>`;
  };
  draw();
  $('#q').oninput=e=>{term=e.target.value;draw();};
  el.onclick=e=>{
    const b=e.target.closest('[data-f]');if(b){f=b.dataset.f;$$('#filters button').forEach(x=>x.setAttribute('aria-pressed',x===b));history.replaceState(null,'','#/commandes?f='+f);draw();return;}
    const r=e.target.closest('tr[data-href]');if(r){Ad.go(r.dataset.href);return;}
    if(e.target.closest('[data-act="csv"]'))download('commandes-aubier-'+isoDay()+'.csv',csv(orders,[['Référence',o=>o.ref],['Date',o=>isoDay(new Date(o.created_at))],['Client',o=>cname(C[o.client_id])],['E-mail',o=>(C[o.client_id]||{}).email],
      ['Modèle',o=>modelName(o.model_id)],['Finition',o=>optName('finish',o.config.finish,o.model_id)],['Accastillage',o=>optName('hardware',o.config.hardware)],['Vernis',o=>optName('varnish',o.config.varnish)],['Étui',o=>optName('case',o.config.case)],
      ['Total',o=>o.total],['Acompte',o=>o.deposit],['Acompte reçu le',o=>o.deposit_paid_at?isoDay(new Date(o.deposit_paid_at)):''],['Solde reçu le',o=>o.balance_paid_at?isoDay(new Date(o.balance_paid_at)):''],
      ['Étape',o=>(STAGE[o.stage]||{}).name],['Remise prévue',o=>o.due_date||''],['Livrée le',o=>o.delivered_at||''],['N° instrument',o=>o.serial||'']]),'text/csv;charset=utf-8');
  };
}

async function orderDetail(el,id){
  const[orders,clients,ups]=await load('orders','clients','order_updates');
  const o=orders.find(x=>x.id===id);if(!o){el.innerHTML=empty('Commande introuvable. <a href="#/commandes">Retour aux commandes</a>');return;}
  const c=clients.find(x=>x.id===o.client_id)||null;
  const updates=ups.filter(u=>u.order_id===o.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const cur=stageIndex(o.stage),cancelled=o.stage==='annulee',balance=o.total-o.deposit;
  const track=siteUrl('suivi.html?ref='+encodeURIComponent(o.ref));
  el.innerHTML=`
  <div class="page-head"><div><div class="crumb"><a href="#/commandes">Commandes</a> /</div><h1 class="row">${esc(o.ref)} ${stageBadge(o.stage)}</h1>
    <p class="sub">${esc(modelName(o.model_id))} pour ${c?`<a href="#/clients/${c.id}">${esc(cname(c))}</a>`:'client inconnu'} · commandée le ${fmtDate(o.created_at)} ${o.source==='atelier'?'à l’atelier':'sur le site'}</p></div>
    <div class="actions"><button class="btn" data-act="mail">${icon('mail')}Écrire au client</button><button class="btn" data-act="inv-a">${icon('print')}Facture d'acompte</button><button class="btn" data-act="inv-s">${icon('print')}Facture de solde</button></div></div>
  <div class="grid g-main">
    <div class="stack">
      <section class="card"><div class="card-h"><h2>Configuration</h2><span class="row"><span class="swatch" style="${swatchOf(o)}"></span><span class="muted">${esc(optName('finish',o.config.finish,o.model_id))}</span></span></div>
        <div class="card-b"><div class="lines">${(o.lines||[]).map(([l,p],i)=>`<div><span>${esc(l)}</span><span class="num">${i===0?euro(p):p?'+ '+euro(p):'Inclus'}</span></div>`).join('')}
          <div class="tot"><span>Total</span><span class="num">${euro(o.total)}</span></div>
          <div><span class="muted">Acompte (${Math.round((+o.deposit_rate||.3)*100)} %)</span><span class="num">${euro(o.deposit)}</span></div>
          <div><span class="muted">Solde à la remise</span><span class="num">${euro(balance)}</span></div></div>
          <p class="small faint" style="margin-top:10px">Fabrication estimée : ${o.weeks||'—'} semaines.</p></div></section>
      <section class="card"><div class="card-h"><h2>Journal d'avancement</h2><span class="muted">Visible par le client sur la page de suivi</span></div>
        <form class="card-b form cols" id="up-form">
          ${field('Étape',sel('stage',o.stage==='annulee'?'':o.stage,[['','Nouvelle générale']].concat(STAGES.filter(s=>s.id!=='annulee').map(s=>[s.id,s.name]))))}
          ${field('Photo (facultatif)','<input type="file" name="photo" accept="image/*">')}
          ${field('Message',area('note','','placeholder="Ce qui a été fait, ce qui vient ensuite…" rows="3"'),'',"full")}
          <div class="full spread"><label class="check"><input type="checkbox" name="public" checked> Visible par le client</label><button class="btn primary" type="submit">Publier</button></div>
        </form>
        <div class="log">${updates.length?updates.map(u=>`<article><span class="dot ${u.public?'good':''}" style="margin-top:6px" title="${u.public?'Visible par le client':'Interne'}"></span>
          <div><div><b>${esc((STAGE[u.stage]||{}).name||'Nouvelle')}</b> <span class="faint small">· ${fmtDate(u.created_at)}${u.public?'':' · interne'}</span></div>${u.note?`<p class="muted" style="margin-top:4px;white-space:pre-wrap">${esc(u.note)}</p>`:''}${u.photo_url?`<img src="${esc(u.photo_url)}" alt="">`:''}</div>
          <button class="btn icon ghost sm" data-act="del-up" data-id="${u.id}" aria-label="Supprimer cette entrée">${icon('x')}</button></article>`).join(''):empty('Aucune entrée. Publiez la première étape pour que le client suive son instrument.')}</div></section>
      <section class="card"><div class="card-h"><h2>Notes internes</h2><span class="muted">Jamais visibles par le client</span></div>
        <form class="card-b form" id="notes-form">${area('notes',o.notes,'rows="4" placeholder="Mesures, essences retenues, remarques…"')}<div class="row" style="justify-content:flex-end"><button class="btn" type="submit">Enregistrer la note</button></div></form></section>
    </div>
    <div class="stack">
      <section class="card"><div class="card-h"><h2>Étape</h2>${cancelled?'':'<button class="btn sm danger" data-act="cancel">Annuler la commande</button>'}</div>
        <div class="card-b">${cancelled?`<p class="muted">Commande annulée.</p><button class="btn sm" data-stage="attente_acompte" style="margin-top:10px">Réactiver</button>`:
        `<div class="stepper">${STAGES.filter(s=>s.id!=='annulee').map((s,i)=>`<button type="button" data-stage="${s.id}" class="${i<cur?'past':i===cur?'on':''}"><i>${i<cur?'✓':''}</i>${s.name}</button>`).join('')}</div>`}</div></section>
      <section class="card"><div class="card-h"><h2>Paiements</h2></div>
        <div class="list">
          <div><div class="grow"><div class="t1">Acompte · ${euro(o.deposit)}</div><div class="t2">${o.deposit_paid_at?'Reçu le '+fmtDate(o.deposit_paid_at):o.pay_method==='virement'?'Virement attendu, référence '+esc(o.ref):'Paiement par carte en attente'}</div></div>
            ${o.deposit_paid_at?`<button class="btn sm ghost" data-act="dep-undo">Annuler</button>`:`<button class="btn sm primary" data-act="dep">Marquer reçu</button>`}</div>
          <div><div class="grow"><div class="t1">Solde · ${euro(balance)}</div><div class="t2">${o.balance_paid_at?'Reçu le '+fmtDate(o.balance_paid_at):'À régler à la remise'}</div></div>
            ${o.balance_paid_at?`<button class="btn sm ghost" data-act="bal-undo">Annuler</button>`:`<button class="btn sm" data-act="bal">Marquer reçu</button>`}</div>
        </div></section>
      <section class="card"><div class="card-h"><h2>Client</h2>${c?`<a class="small" href="#/clients/${c.id}">Fiche</a>`:''}</div>
        <div class="card-b"><dl class="dl">${c?`<dt>Nom</dt><dd>${esc(cname(c))}</dd><dt>E-mail</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email||'—')}</a></dd><dt>Téléphone</dt><dd>${c.phone?`<a href="tel:${esc(c.phone.replace(/\s/g,''))}">${esc(c.phone)}</a>`:'—'}</dd>`:'<dt>Client</dt><dd>Fiche supprimée</dd>'}
          <dt>Remise</dt><dd>${o.delivery==='livraison'?'Livraison'+(o.address?` : ${esc([o.address.street,o.address.zip,o.address.city].filter(Boolean).join(', '))}`:''):'Retrait à l’atelier'}</dd>
          ${o.client_notes?`<dt>Remarques</dt><dd style="white-space:pre-wrap">${esc(o.client_notes)}</dd>`:''}</dl></div></section>
      <section class="card"><div class="card-h"><h2>Dates et instrument</h2></div>
        <form class="card-b form" id="info-form">
          ${field('Remise prévue',inp('due_date',o.due_date,'date'))}
          ${field('Livrée le',inp('delivered_at',o.delivered_at,'date'))}
          ${field('Numéro de l’instrument',inp('serial',o.serial,'text','placeholder="AUB-029"'),'Inscrit sur l’étiquette, utile pour la garantie.')}
          ${field('Paiement de l’acompte',sel('pay_method',o.pay_method,[['carte','Carte bancaire'],['virement','Virement'],['especes','Espèces ou chèque']]))}
          ${field('Remise',sel('delivery',o.delivery,[['atelier','Retrait à l’atelier'],['livraison','Livraison']]))}
          <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">Enregistrer</button></div></form></section>
      <section class="card"><div class="card-h"><h2>Suivi client</h2></div>
        <div class="card-b stack" style="gap:10px"><p class="small muted">Le client suit sa commande avec son numéro et son e-mail sur cette page :</p>
          <div class="row"><input readonly value="${esc(track)}" style="flex:1" aria-label="Lien de suivi"><button class="btn sm" data-act="copy">Copier</button></div></div></section>
      <button class="btn danger" data-act="delete" style="justify-self:start">Supprimer la commande</button>
    </div>
  </div>`;

  const save=async(patch,msg)=>{await db.update('orders',o.id,patch);toast(msg||'Enregistré.');Ad.reload();};
  const log=(stage,note)=>db.insert('order_updates',{order_id:o.id,stage,note:note||null,photo_url:null,public:true});
  el.onclick=async e=>{
    const sb=e.target.closest('[data-stage]');
    if(sb){const s=sb.dataset.stage;if(s===o.stage)return;
      if(WORK.includes(s)&&!o.deposit_paid_at&&!confirm("L'acompte n'est pas marqué comme reçu. Passer quand même à « "+STAGE[s].name+" » ?"))return;
      const patch={stage:s};if(s==='livree'&&!o.delivered_at)patch.delivered_at=isoDay();
      await busy(sb,async()=>{await db.update('orders',o.id,patch);if(s!=='attente_acompte')await log(s);});toast('Étape : '+STAGE[s].name+'.');Ad.reload();return;}
    const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;
    if(act==='dep'){await busy(b,async()=>{const moved=o.stage==='attente_acompte';
      await db.update('orders',o.id,{deposit_paid_at:new Date().toISOString(),stage:moved?'bois':o.stage,due_date:o.due_date||isoDay(addDays(null,(o.weeks||12)*7))});
      if(moved)await log('bois','Acompte reçu : votre place est réservée et la fabrication commence par le choix des bois.');});toast('Acompte reçu.');Ad.reload();}
    else if(act==='dep-undo'){if(confirm('Annuler la réception de l’acompte ?'))await save({deposit_paid_at:null});}
    else if(act==='bal')await save({balance_paid_at:new Date().toISOString()},'Solde reçu.');
    else if(act==='bal-undo'){if(confirm('Annuler la réception du solde ?'))await save({balance_paid_at:null});}
    else if(act==='cancel'){if(confirm('Annuler la commande '+o.ref+' ? Elle reste dans l’historique.'))await save({stage:'annulee'},'Commande annulée.');}
    else if(act==='delete'){if(confirm('Supprimer définitivement la commande '+o.ref+' et son journal ?')){await busy(b,async()=>{for(const u of updates)await db.remove('order_updates',u.id);await db.remove('orders',o.id);});toast('Commande supprimée.');Ad.go('commandes');}}
    else if(act==='del-up'){if(confirm('Supprimer cette entrée du journal ?')){await busy(b,()=>db.remove('order_updates',b.dataset.id));Ad.reload();}}
    else if(act==='copy'){try{await navigator.clipboard.writeText(track);toast('Lien copié.');}catch(x){toast('Copie impossible : sélectionnez le lien.',true);}}
    else if(act==='mail'){if(!c)return;mailto(c.email,'Votre '+modelName(o.model_id)+' · commande '+o.ref,
      `Bonjour ${c.first_name||''},\n\n\n\nVous pouvez suivre l'avancement de votre instrument ici :\n${track}\n(numéro de commande ${o.ref}, avec votre adresse e-mail)\n\nÀ bientôt,\n${S.settings.company||'Atelier Aubier'}\n${S.settings.phone||''}`);}
    else if(act==='inv-a'||act==='inv-s')printDoc(invoice(o,c,act==='inv-a'?'acompte':'solde'));
  };
  $('#notes-form').onsubmit=async e=>{e.preventDefault();await busy(e.submitter,()=>db.update('orders',o.id,{notes:readForm(e.target).notes||null}));toast('Note enregistrée.');};
  $('#info-form').onsubmit=async e=>{e.preventDefault();const v=readForm(e.target);await busy(e.submitter,()=>db.update('orders',o.id,{due_date:v.due_date,delivered_at:v.delivered_at,serial:v.serial||null,pay_method:v.pay_method,delivery:v.delivery}));toast('Enregistré.');Ad.reload();};
  $('#up-form').onsubmit=async e=>{e.preventDefault();const f=e.target,v=readForm(f),file=f.photo.files[0];
    if(!v.note&&!file){toast('Écrivez un message ou ajoutez une photo.',true);return;}
    await busy(e.submitter,async()=>{const photo_url=file?await db.upload(file,'commandes/'+o.ref):null;
      await db.insert('order_updates',{order_id:o.id,stage:v.stage||null,note:v.note||null,photo_url,public:v.public});});
    toast('Publié dans le journal.');Ad.reload();};
}

/* Facture d'acompte ou de solde, prête à imprimer ou enregistrer en PDF */
function invoice(o,c,kind){
  const s=S.settings,vat=+s.vat_rate||0,acompte=kind==='acompte';
  const amount=acompte?o.deposit:o.total-o.deposit,no=o.ref+(acompte?'-A':'-S');
  const paid=acompte?o.deposit_paid_at:o.balance_paid_at;
  const ht=vat?amount/(1+vat/100):amount;
  const e2=n=>new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' €';
  const rows=acompte?`<tr><td>Acompte de ${Math.round((+o.deposit_rate||.3)*100)} % sur la commande ${esc(o.ref)} — ${esc(modelName(o.model_id))}</td><td class="n">${e2(amount)}</td></tr>`
    :(o.lines||[]).map(([l,p])=>`<tr><td>${esc(l)}</td><td class="n">${p?e2(p):'Inclus'}</td></tr>`).join('')+`<tr><td>Total de la commande</td><td class="n">${e2(o.total)}</td></tr><tr><td>Acompte déjà réglé (facture ${esc(o.ref)}-A)</td><td class="n">− ${e2(o.deposit)}</td></tr>`;
  return`<div class="inv-head"><div><h1>${esc(s.company||'Atelier Aubier')}</h1><div>${esc(s.address||'')}</div><div>SIRET ${esc(s.siret||'')}</div><div>${esc(s.email||'')} · ${esc(s.phone||'')}</div></div>
    <div style="text-align:right"><h1>Facture ${acompte?'d’acompte':'de solde'}</h1><div>N° ${esc(no)}</div><div>Date : ${fmtDate(paid||new Date(),{day:'numeric',month:'long',year:'numeric'})}</div></div></div>
    <div><b>Client</b><br>${esc(cname(c))}<br>${c?esc([c.street,[c.zip,c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')):''}<br>${c?esc(c.email||''):''}</div>
    <table><thead><tr><th>Désignation</th><th class="n">Montant TTC</th></tr></thead><tbody>${rows}</tbody>
    <tfoot>${vat?`<tr><td class="n">Total HT</td><td class="n">${e2(ht)}</td></tr><tr><td class="n">TVA ${vat} %</td><td class="n">${e2(amount-ht)}</td></tr>`:''}<tr class="tot"><td class="n">${acompte?'Acompte':'Net à payer'} TTC</td><td class="n">${e2(amount)}</td></tr></tfoot></table>
    <p>${paid?'Réglé le '+fmtDate(paid,{day:'numeric',month:'long',year:'numeric'})+'.':`À régler par virement : ${esc(s.bank_holder||'')} · IBAN ${esc(s.iban||'')} · BIC ${esc(s.bic||'')} · référence ${esc(o.ref)}.`}</p>
    <p class="legal">${vat?'':'TVA non applicable, article 293 B du Code général des impôts. '}Instrument fabriqué sur mesure : pas de droit de rétractation (article L221-28 du Code de la consommation). Garantie légale de conformité de ${+s.warranty_years||2} ans.</p>`;
}

async function newOrder(el,q){
  const[clients,orders,requests]=await load('clients','orders','requests');
  clients.sort((a,b)=>cname(a).localeCompare(cname(b)));
  const req=q.get('demande')?requests.find(r=>r.id===q.get('demande')):null;
  const preClient=q.get('client')||(req&&(clients.find(c=>(c.email||'').toLowerCase()===(req.email||'').toLowerCase())||{}).id)||'';
  const models=S.models.filter(m=>m.visible!==false);
  const act=t=>S.options.filter(o=>o.type===t&&!o.model_id&&o.active!==false);
  const cfg={model:(models[0]||{}).id};
  const defaults=m=>{const md=S.models.find(x=>x.id===m)||{},d=md.defaults||{},fins=S.options.filter(o=>o.type==='finish'&&o.model_id===m&&o.active!==false);
    return{finish:fins.some(f=>f.code===d.finish)?d.finish:(fins[0]||{}).code,hardware:d.hardware||(act('hardware')[0]||{}).code,varnish:d.varnish||(act('varnish')[0]||{}).code,case:d.case||(act('case')[0]||{}).code};};
  Object.assign(cfg,defaults(cfg.model));
  const reqName=req?(req.name||'').split(' '):[];
  el.innerHTML=`
  <div class="page-head"><div><div class="crumb"><a href="#/commandes">Commandes</a> /</div><h1>Nouvelle commande</h1><p class="sub">Pour une commande prise à l'atelier, par téléphone ou par e-mail.</p></div></div>
  <form id="no-form" class="grid g-main">
    <div class="stack">
      <section class="card"><div class="card-h"><h2>Client</h2></div><div class="card-b form cols">
        ${field('Client',sel('client_id',preClient,[['','Nouveau client']].concat(clients.map(c=>[c.id,cname(c)+(c.email?' · '+c.email:'')]))),'',"full")}
        <div class="full form cols" id="new-client"${preClient?' hidden':''}>
          ${field('Prénom',inp('first_name',reqName[0]||''))}${field('Nom',inp('last_name',reqName.slice(1).join(' ')))}
          ${field('E-mail',inp('email',req?req.email:'','email'))}${field('Téléphone',inp('phone',req?req.phone:'','tel'))}
          ${field('Adresse',inp('street',''),'',"full")}${field('Code postal',inp('zip',''))}${field('Ville',inp('city',''))}
        </div></div></section>
      <section class="card"><div class="card-h"><h2>Instrument</h2></div><div class="card-b form cols" id="cfg"></div></section>
      <section class="card"><div class="card-h"><h2>Suivi</h2></div><div class="card-b form cols">
        ${field('Paiement de l’acompte',sel('pay_method','virement',[['carte','Carte bancaire'],['virement','Virement'],['especes','Espèces ou chèque']]))}
        ${field('Remise',sel('delivery','atelier',[['atelier','Retrait à l’atelier'],['livraison','Livraison']]))}
        ${field('Remise prévue',inp('due_date','','date'),'Calculée automatiquement à la réception de l’acompte si vide.')}
        <div class="field"><span>Acompte</span><label class="check" style="height:34px"><input type="checkbox" name="paid"> Déjà reçu</label></div>
        ${field('Remarques',area('notes',req?req.message:'','rows="3"'),'',"full")}</div></section>
    </div>
    <div class="stack"><section class="card" style="position:sticky;top:16px"><div class="card-h"><h2>Récapitulatif</h2></div><div class="card-b" id="sum"></div>
      <div class="card-b" style="border-top:1px solid var(--line-2)"><button class="btn primary" type="submit" style="width:100%">Créer la commande</button></div></section></div>
  </form>`;
  const f=$('#no-form');
  const drawCfg=()=>{
    const fins=S.options.filter(o=>o.type==='finish'&&o.model_id===cfg.model&&o.active!==false);
    const o=t=>act(t).map(x=>[x.code,x.name+(x.price?' (+ '+euro(x.price)+')':'')]);
    $('#cfg').innerHTML=field('Modèle',sel('model',cfg.model,models.map(m=>[m.id,m.name+' · dès '+euro(m.base_price)])))+field('Finition',sel('finish',cfg.finish,fins.map(x=>[x.code,x.name+(x.price?' (+ '+euro(x.price)+')':'')])))
      +field('Accastillage',sel('hardware',cfg.hardware,o('hardware')))+field('Vernis',sel('varnish',cfg.varnish,o('varnish')))+field('Étui',sel('case',cfg.case,o('case')));
    drawSum();
  };
  const drawSum=()=>{try{const r=Ad.A.quote(S.cat,cfg);
    $('#sum').innerHTML=`<div class="lines">${r.lines.map(([l,p],i)=>`<div><span>${esc(l)}</span><span class="num">${i===0?euro(p):p?'+ '+euro(p):'Inclus'}</span></div>`).join('')}<div class="tot"><span>Total</span><span class="num">${euro(r.total)}</span></div>
      <div><span class="muted">Acompte (${Math.round(r.rate*100)} %)</span><span class="num">${euro(r.deposit)}</span></div></div><p class="small faint" style="margin-top:10px">${r.weeks} semaines de fabrication environ.</p>`;}
    catch(x){$('#sum').innerHTML=`<p class="muted">${esc(x.message)}</p>`;}};
  drawCfg();
  f.onchange=e=>{const n=e.target.name;
    if(n==='client_id'){$('#new-client').hidden=!!e.target.value;return;}
    if(n==='model'){cfg.model=e.target.value;Object.assign(cfg,defaults(cfg.model));drawCfg();return;}
    if(['finish','hardware','varnish','case'].includes(n)){cfg[n]=e.target.value;drawSum();}};
  f.onsubmit=async e=>{e.preventDefault();const v=readForm(f);
    let r;try{r=Ad.A.quote(S.cat,cfg);}catch(x){toast(x.message,true);return;}
    if(!v.client_id&&!v.last_name&&!v.email){toast('Indiquez au moins le nom ou l’e-mail du client.',true);return;}
    await busy(e.submitter,async()=>{
      let cid=v.client_id;
      if(!cid){const ex=v.email&&clients.find(c=>(c.email||'').toLowerCase()===v.email.toLowerCase());
        cid=ex?ex.id:(await db.insert('clients',{first_name:v.first_name||null,last_name:v.last_name||null,email:v.email?v.email.toLowerCase():null,phone:v.phone||null,street:v.street||null,zip:v.zip||null,city:v.city||null})).id;}
      const y=String(YEAR()),n=orders.filter(x=>x.ref.startsWith('AUB-'+y+'-')).reduce((m,x)=>Math.max(m,+x.ref.slice(9)||0),0)+1;
      const paid=v.paid,now=new Date().toISOString();
      const row=await db.insert('orders',{ref:'AUB-'+y+'-'+String(n).padStart(4,'0'),client_id:cid,model_id:cfg.model,config:Object.assign({},cfg),lines:r.lines,total:r.total,deposit:r.deposit,deposit_rate:r.rate,weeks:r.weeks,
        pay_method:v.pay_method,delivery:v.delivery,address:null,client_notes:v.notes||null,stage:paid?'bois':'attente_acompte',deposit_paid_at:paid?now:null,
        due_date:v.due_date||(paid?isoDay(addDays(null,r.weeks*7)):null),source:'atelier'});
      if(req&&req.status==='nouvelle')await db.update('requests',req.id,{status:'repondue'});
      toast('Commande '+row.ref+' créée.');Ad.go('commandes/'+row.id);
    });};
}

/* =========================================================
   PLANNING
   ========================================================= */
Ad.register('planning',{title:'Planning',async render(el,_,q){
  const[orders,clients]=await load('orders','clients');const C=byId(clients);
  const Y=+q.get('annee')||YEAR(),cap=+S.settings.capacity||8;
  const y0=new Date(Y,0,1).getTime(),y1=new Date(Y+1,0,1).getTime(),span=y1-y0;
  const rows=orders.filter(o=>o.stage!=='annulee').map(o=>{
    const start=parse(o.deposit_paid_at||o.created_at).getTime();
    const end=parse(o.delivered_at||o.due_date||isoDay(addDays(o.deposit_paid_at||o.created_at,(o.weeks||12)*7))).getTime();
    return{o,start,end:Math.max(end,start+864e5*3)};}).filter(r=>r.end>=y0&&r.start<y1).sort((a,b)=>a.start-b.start);
  const pct=t=>Math.min(100,Math.max(0,(t-y0)/span*100));
  const sold=orders.filter(o=>o.stage!=='annulee'&&inYear(o.created_at,Y)).length;
  const load12=Array.from({length:12},(_,m)=>{const a=new Date(Y,m,1).getTime(),b=new Date(Y,m+1,1).getTime();
    return rows.filter(r=>r.o.stage!=='attente_acompte'&&r.start<b&&r.end>=a).length;});
  const upcoming=orders.filter(o=>!['livree','annulee'].includes(o.stage)&&o.due_date).sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,8);
  const tone=o=>o.stage==='livree'?'done':o.stage==='prete'?'good':o.stage==='attente_acompte'?'warn':'';
  const MONTHS=['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'];
  const now=Date.now();
  el.innerHTML=`
  <div class="page-head"><div><h1>Planning ${Y}</h1><p class="sub">${plural(sold,'instrument commandé','instruments commandés')} sur ${cap} prévus cette année</p></div>
    <div class="actions"><div class="seg">${[Y-1,Y,Y+1].map(y=>`<a href="#/planning?annee=${y}"${y===Y?' aria-current="page"':''}>${y}</a>`).join('')}</div></div></div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="k">Capacité ${Y}</div><div class="v num">${sold} <small>/ ${cap}</small></div><div class="slots">${Array.from({length:cap},(_,i)=>`<i class="${i<sold?'on':''}"></i>`).join('')}</div></div>
    <div class="card kpi"><div class="k">À l'établi aujourd'hui</div><div class="v num">${orders.filter(o=>WORK.includes(o.stage)).length}</div><div class="d">Instruments en fabrication</div></div>
    <div class="card kpi"><div class="k">Prêts à remettre</div><div class="v num">${orders.filter(o=>o.stage==='prete').length}</div><div class="d">En attente du client</div></div>
    <div class="card kpi"><div class="k">En retard</div><div class="v num" style="${orders.some(o=>!['livree','annulee'].includes(o.stage)&&o.due_date&&daysFrom(o.due_date)<0)?'color:var(--bad)':''}">${orders.filter(o=>!['livree','annulee'].includes(o.stage)&&o.due_date&&daysFrom(o.due_date)<0).length}</div><div class="d">Date de remise dépassée</div></div>
  </div>
  <section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Fabrication</h2><span class="row small muted"><span class="badge info plain">En cours</span><span class="badge warn plain">Acompte attendu</span><span class="badge good plain">Prête</span><span class="badge plain">Livrée</span></span></div>
    <div class="gantt"><div class="gantt-in" style="position:relative">
      <div class="gantt-head"><span style="padding:8px 12px">Instrument</span><div class="months">${MONTHS.map(m=>`<span>${m}</span>`).join('')}</div></div>
      ${rows.length?rows.map(({o,start,end})=>{const late=!['livree'].includes(o.stage)&&o.due_date&&daysFrom(o.due_date)<0;
        return`<div class="gantt-row"><div class="who"><b>${esc(modelName(o.model_id))} · ${esc(cname(C[o.client_id]))}</b><small class="mono">${esc(o.ref)}</small></div>
        <div class="track"><a href="#/commandes/${o.id}" class="${tone(o)}${late?' late':''}" style="left:${pct(start)}%;width:${Math.max(pct(end)-pct(start),.8)}%" title="${esc(o.ref+' · '+(STAGE[o.stage]||{}).name+' · '+fmtDate(start)+' → '+fmtDate(end))}">${esc((STAGE[o.stage]||{}).name)}</a></div></div>`;}).join('')
      :empty('Aucun instrument sur cette année.')}
      ${now>=y0&&now<y1&&rows.length?`<div class="today" style="left:calc(200px + (100% - 200px) * ${pct(now)/100})" title="Aujourd'hui"></div>`:''}
    </div></div></section>
  <div class="grid g2">
    <section class="card"><div class="card-h"><h2>Charge de l'atelier par mois</h2><span class="muted">Instruments en cours</span></div>
      <div class="card-b">${Ad.charts.bars(load12.map((v,i)=>({d:MONTHS[i],v})),{h:150,label:'instruments',labels:'all'})}</div></section>
    <section class="card"><div class="card-h"><h2>Remises à venir</h2></div>
      <div class="list">${upcoming.length?upcoming.map(o=>`<a class="item" href="#/commandes/${o.id}"><span class="dot ${daysFrom(o.due_date)<0?'bad':o.stage==='prete'?'good':'info'}"></span><div class="grow"><div class="t1">${esc(modelName(o.model_id))} · ${esc(cname(C[o.client_id]))}</div><div class="t2">${esc((STAGE[o.stage]||{}).name)} · ${o.delivery==='livraison'?'livraison':'retrait'}</div></div><span class="small nowrap ${daysFrom(o.due_date)<0?'':'muted'}" style="${daysFrom(o.due_date)<0?'color:var(--bad)':''}">${fmtDate(o.due_date,{day:'numeric',month:'short'})} · ${rel(o.due_date)}</span></a>`).join(''):empty('Aucune remise programmée.')}</div></section>
  </div>`;
  Ad.charts.bindTips(el);
}});

/* =========================================================
   DEMANDES (formulaire « Rendez-vous » du site)
   ========================================================= */
const ics=r=>{const d=new Date(r.appointment_at),e=new Date(d.getTime()+60*60e3),f=x=>x.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const t=s=>String(s||'').replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n');
  return['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Atelier Aubier//Admin//FR','BEGIN:VEVENT','UID:'+r.id+'@atelier-aubier','DTSTAMP:'+f(new Date()),'DTSTART:'+f(d),'DTEND:'+f(e),
    'SUMMARY:'+t('Rendez-vous atelier : '+(r.name||r.email)),'DESCRIPTION:'+t((r.subject||'')+'\n'+(r.email||'')+'\n\n'+(r.message||'')),'LOCATION:'+t(S.settings.address||''),'END:VEVENT','END:VCALENDAR'].join('\r\n');};

Ad.register('demandes',{title:'Demandes',async render(el,_,q){
  const[requests,clients]=await load('requests','clients');
  requests.sort((a,b)=>b.created_at.localeCompare(a.created_at));
  let f=REQ_STATUS[q.get('f')]?q.get('f'):(requests.some(r=>r.status==='nouvelle')?'nouvelle':'toutes');
  const agenda=requests.filter(r=>r.status==='rdv'&&r.appointment_at&&daysFrom(r.appointment_at)>=0).sort((a,b)=>a.appointment_at.localeCompare(b.appointment_at));
  const known=email=>clients.find(c=>(c.email||'').toLowerCase()===(email||'').toLowerCase());
  const local=d=>{if(!d)return'';const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,16);};
  const draw=()=>{
    const rows=requests.filter(r=>f==='toutes'||r.status===f);
    $('#req-list').innerHTML=rows.length?rows.map(r=>{const[l,t]=REQ_STATUS[r.status]||[r.status,''];const c=known(r.email);
      return`<details class="card" ${r.status==='nouvelle'||rows.length<=3?'open':''} style="margin-bottom:10px" data-id="${r.id}">
        <summary class="card-h" style="cursor:pointer;list-style:none"><div class="row" style="min-width:0"><span class="dot ${t}"></span><b>${esc(r.name||r.email)}</b><span class="muted small">${esc(r.subject||'')}</span></div>
          <span class="row small muted nowrap">${r.status==='rdv'&&r.appointment_at?`<span class="badge good">${esc(fmtTime(r.appointment_at))}</span>`:`<span class="badge ${t}">${l}</span>`}${fmtDate(r.created_at,{day:'numeric',month:'short'})}</span></summary>
        <div class="card-b stack" style="gap:14px">
          <div class="row small muted"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a>${r.phone?' · '+esc(r.phone):''}${c?` · <a href="#/clients/${c.id}">fiche client</a>`:''}</div>
          <p style="white-space:pre-wrap">${esc(r.message||'')}</p>
          <div class="form cols"><label class="field"><span>Rendez-vous</span><div class="row"><input type="datetime-local" data-rdv value="${local(r.appointment_at)}" style="flex:1"><button class="btn sm" data-act="rdv">Fixer</button>${r.appointment_at?`<button class="btn sm ghost" data-act="ics" title="Ajouter à l'agenda">${icon('calendar')}.ics</button>`:''}</div></label>
            <label class="field"><span>Note interne</span><div class="row"><input data-note value="${esc(r.notes||'')}" placeholder="Rappeler jeudi…" style="flex:1"><button class="btn sm" data-act="note">OK</button></div></label></div>
          <div class="row"><button class="btn sm primary" data-act="reply">${icon('mail')}Répondre</button>
            ${c?'':`<button class="btn sm" data-act="client">Créer la fiche client</button>`}<a class="btn sm" href="#/commandes/nouvelle?demande=${r.id}">Créer une commande</a>
            ${r.status!=='close'?`<button class="btn sm ghost" data-act="close">Classer</button>`:`<button class="btn sm ghost" data-act="reopen">Rouvrir</button>`}<button class="btn sm ghost danger" data-act="del">Supprimer</button></div>
        </div></details>`;}).join(''):`<div class="card">${empty('Aucune demande ici.')}</div>`;
  };
  el.innerHTML=`
  <div class="page-head"><div><h1>Demandes</h1><p class="sub">Messages envoyés depuis le formulaire « Rendez-vous » du site</p></div></div>
  ${agenda.length?`<section class="card" style="margin-bottom:16px"><div class="card-h"><h2>Agenda</h2><span class="muted">${plural(agenda.length,'rendez-vous à venir','rendez-vous à venir')}</span></div>
    <div class="list">${agenda.map(r=>`<div><span class="dot good"></span><div class="grow"><div class="t1">${esc(fmtTime(r.appointment_at))} · ${esc(r.name||r.email)}</div><div class="t2">${esc(r.subject||'')} · ${rel(r.appointment_at)}</div></div><button class="btn sm ghost" data-ics="${r.id}">${icon('calendar')}Agenda</button></div>`).join('')}</div></section>`:''}
  <div class="toolbar"><div class="seg" id="filters">${[['toutes','Toutes']].concat(Object.entries(REQ_STATUS).map(([k,v])=>[k,v[0]])).map(([k,l])=>`<button data-f="${k}" aria-pressed="${k===f}">${l} <span class="c">${k==='toutes'?requests.length:requests.filter(r=>r.status===k).length}</span></button>`).join('')}</div></div>
  <div id="req-list"></div>`;
  draw();
  el.onclick=async e=>{
    const fb=e.target.closest('[data-f]');if(fb){f=fb.dataset.f;$$('#filters button').forEach(x=>x.setAttribute('aria-pressed',x===fb));history.replaceState(null,'','#/demandes?f='+f);draw();return;}
    const ib=e.target.closest('[data-ics]');if(ib){const r=requests.find(x=>x.id===ib.dataset.ics);download('rendez-vous-'+Ad.slug(r.name||'atelier')+'.ics',ics(r),'text/calendar');return;}
    const b=e.target.closest('[data-act]');if(!b)return;const box=b.closest('[data-id]'),r=requests.find(x=>x.id===box.dataset.id),act=b.dataset.act;
    const upd=async(p,msg)=>{await busy(b,()=>db.update('requests',r.id,p));Object.assign(r,p);if(msg)toast(msg);Ad.reload();};
    if(act==='reply'){mailto(r.email,'Re : '+(r.subject||'Votre demande'),`Bonjour ${(r.name||'').split(' ')[0]},\n\nMerci pour votre message.\n\n\n\nÀ bientôt à l'atelier,\n${S.settings.company||'Atelier Aubier'}\n${S.settings.address||''}\n${S.settings.phone||''}\n\n> ${(r.message||'').replace(/\n/g,'\n> ')}`);
      if(r.status==='nouvelle')await upd({status:'repondue'});}
    else if(act==='rdv'){const v=box.querySelector('[data-rdv]').value;if(!v){toast('Choisissez une date et une heure.',true);return;}await upd({status:'rdv',appointment_at:new Date(v).toISOString()},'Rendez-vous fixé.');}
    else if(act==='ics')download('rendez-vous-'+Ad.slug(r.name||'atelier')+'.ics',ics(r),'text/calendar');
    else if(act==='note')await upd({notes:box.querySelector('[data-note]').value.trim()||null},'Note enregistrée.');
    else if(act==='close')await upd({status:'close'},'Demande classée.');
    else if(act==='reopen')await upd({status:'repondue'});
    else if(act==='del'){if(confirm('Supprimer cette demande ?')){await busy(b,()=>db.remove('requests',r.id));Ad.reload();}}
    else if(act==='client'){const p=(r.name||'').trim().split(/\s+/);const c=await busy(b,()=>db.insert('clients',{first_name:p[0]||null,last_name:p.slice(1).join(' ')||null,email:(r.email||'').toLowerCase()||null,phone:r.phone||null}));toast('Fiche client créée.');Ad.go('clients/'+c.id);}
  };
}});

/* =========================================================
   CLIENTS
   ========================================================= */
Ad.register('clients',{title:'Clients',render(el,id){return id?clientDetail(el,id):clientList(el);}});

async function clientList(el){
  const[clients,orders]=await load('clients','orders');
  const of=c=>orders.filter(o=>o.client_id===c.id&&o.stage!=='annulee');
  const next=c=>of(c).filter(o=>o.stage==='livree').map(nextService).filter(Boolean).sort()[0]||null;
  clients.sort((a,b)=>(a.last_name||a.email||'').localeCompare(b.last_name||b.email||''));
  let term='';
  el.innerHTML=`
  <div class="page-head"><div><h1>Clients</h1><p class="sub">${plural(clients.length,'fiche')}</p></div>
    <div class="actions"><button class="btn" data-act="csv">${icon('down')}Exporter (CSV)</button><button class="btn primary" data-act="add">${icon('plus')}Ajouter un client</button></div></div>
  <section class="card" id="add-card" hidden style="margin-bottom:16px"><div class="card-h"><h2>Nouveau client</h2></div>
    <form class="card-b form cols3" id="add-form">${field('Prénom',inp('first_name',''))}${field('Nom',inp('last_name',''))}${field('E-mail',inp('email','','email'))}${field('Téléphone',inp('phone','','tel'))}${field('Ville',inp('city',''))}
      <div class="field" style="align-self:end"><button class="btn primary" type="submit">Créer la fiche</button></div></form></section>
  <div class="toolbar"><input type="search" id="q" placeholder="Rechercher : nom, e-mail, ville…" aria-label="Rechercher"></div>
  <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Client</th><th class="hide-sm">Téléphone</th><th class="hide-sm">Ville</th><th class="num">Instruments</th><th class="num hide-sm">Total</th><th>Prochain entretien</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  const draw=()=>{const t=term.toLowerCase();
    const rows=clients.filter(c=>!t||[cname(c),c.email,c.city,c.phone].join(' ').toLowerCase().includes(t));
    $('#rows').innerHTML=rows.length?rows.map(c=>{const n=next(c),d=n?daysFrom(n):null;return`<tr class="link" data-href="clients/${c.id}"><td><b>${esc(cname(c))}</b><span class="sub">${esc(c.email||'')}</span></td>
      <td class="hide-sm nowrap">${esc(c.phone||'—')}</td><td class="hide-sm">${esc(c.city||'—')}</td><td class="num">${of(c).length}</td><td class="num hide-sm">${euro(of(c).reduce((s,o)=>s+o.total,0))}</td>
      <td class="nowrap">${n?`<span class="badge ${d<0?'warn':d<=30?'info':'plain'}">${fmtDate(n,{month:'short',year:'numeric'})}</span>`:'<span class="faint">—</span>'}</td></tr>`;}).join(''):`<tr><td colspan="6">${empty('Aucun client trouvé.')}</td></tr>`;};
  draw();
  $('#q').oninput=e=>{term=e.target.value;draw();};
  $('#add-form').onsubmit=async e=>{e.preventDefault();const v=readForm(e.target);
    if(!v.last_name&&!v.email){toast('Indiquez au moins un nom ou un e-mail.',true);return;}
    if(v.email&&clients.some(c=>(c.email||'').toLowerCase()===v.email.toLowerCase())){toast('Un client utilise déjà cet e-mail.',true);return;}
    const c=await busy(e.submitter,()=>db.insert('clients',{first_name:v.first_name||null,last_name:v.last_name||null,email:v.email?v.email.toLowerCase():null,phone:v.phone||null,city:v.city||null}));toast('Fiche créée.');Ad.go('clients/'+c.id);};
  el.onclick=e=>{const r=e.target.closest('tr[data-href]');if(r){Ad.go(r.dataset.href);return;}
    const b=e.target.closest('[data-act]');if(!b)return;
    if(b.dataset.act==='add'){$('#add-card').hidden=!$('#add-card').hidden;if(!$('#add-card').hidden)$('#add-form input').focus();}
    if(b.dataset.act==='csv')download('clients-aubier-'+isoDay()+'.csv',csv(clients,[['Prénom',c=>c.first_name],['Nom',c=>c.last_name],['E-mail',c=>c.email],['Téléphone',c=>c.phone],['Adresse',c=>c.street],['Code postal',c=>c.zip],['Ville',c=>c.city],
      ['Instruments',c=>of(c).length],['Total',c=>of(c).reduce((s,o)=>s+o.total,0)],['Prochain entretien',c=>next(c)||''],['Notes',c=>c.notes]]),'text/csv;charset=utf-8');};
}

async function clientDetail(el,id){
  const[clients,orders,requests,waitlist]=await load('clients','orders','requests','waitlist');
  const c=clients.find(x=>x.id===id);if(!c){el.innerHTML=empty('Client introuvable. <a href="#/clients">Retour aux clients</a>');return;}
  const mine=orders.filter(o=>o.client_id===c.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const em=(c.email||'').toLowerCase(),reqs=requests.filter(r=>(r.email||'').toLowerCase()===em&&em),waits=waitlist.filter(w=>(w.email||'').toLowerCase()===em&&em);
  const delivered=mine.filter(o=>o.stage==='livree');
  el.innerHTML=`
  <div class="page-head"><div><div class="crumb"><a href="#/clients">Clients</a> /</div><h1>${esc(cname(c))}</h1><p class="sub">Client depuis ${fmtDate(c.created_at,{month:'long',year:'numeric'})} · ${plural(mine.filter(o=>o.stage!=='annulee').length,'instrument')}</p></div>
    <div class="actions">${c.email?`<a class="btn" href="mailto:${esc(c.email)}">${icon('mail')}Écrire</a>`:''}<a class="btn primary" href="#/commandes/nouvelle?client=${c.id}">${icon('plus')}Nouvelle commande</a></div></div>
  <div class="grid g-main">
    <div class="stack">
      <section class="card"><div class="card-h"><h2>Instruments et entretien</h2><span class="muted">Révision conseillée tous les ${months()} mois</span></div>
        <div class="table-wrap">${mine.length?`<table class="t"><thead><tr><th>Instrument</th><th>Étape</th><th class="hide-sm">Garantie</th><th>Prochain entretien</th><th></th></tr></thead><tbody>${mine.map(o=>{const nx=o.stage==='livree'?nextService(o):null,d=nx?daysFrom(nx):null,w=warrantyEnd(o);
          return`<tr><td><a href="#/commandes/${o.id}"><b>${esc(modelName(o.model_id))}</b></a><span class="sub">${esc(o.ref)}${o.serial?' · n° '+esc(o.serial):''}</span></td><td>${stageBadge(o.stage)}</td>
          <td class="hide-sm nowrap">${w?(daysFrom(w)<0?'<span class="faint">Terminée</span>':'Jusqu’au '+fmtDate(w)):'—'}</td>
          <td class="nowrap">${nx?`<span class="badge ${d<0?'warn':d<=30?'info':'plain'}">${fmtDate(nx,{month:'short',year:'numeric'})}</span>${o.last_reminder_at?`<span class="sub">Rappel envoyé ${rel(o.last_reminder_at)}</span>`:''}`:'<span class="faint">—</span>'}</td>
          <td class="nowrap right">${nx?`<button class="btn sm" data-act="remind" data-id="${o.id}">Rappel</button> <button class="btn sm ghost" data-act="serviced" data-id="${o.id}">Entretien fait</button>`:''}</td></tr>`;}).join('')}</tbody></table>`:empty('Aucune commande pour ce client.')}</div></section>
      <section class="card"><div class="card-h"><h2>Coordonnées</h2></div>
        <form class="card-b form cols" id="c-form">${field('Prénom',inp('first_name',c.first_name))}${field('Nom',inp('last_name',c.last_name))}${field('E-mail',inp('email',c.email,'email'))}${field('Téléphone',inp('phone',c.phone,'tel'))}
          ${field('Adresse',inp('street',c.street),'',"full")}${field('Code postal',inp('zip',c.zip))}${field('Ville',inp('city',c.city))}
          ${field('Notes',area('notes',c.notes,'rows="3" placeholder="Gaucher, préférences de jeu, tirant de cordes…"'),'',"full")}
          <div class="full row" style="justify-content:space-between"><button class="btn ghost danger" type="button" data-act="del">Supprimer la fiche</button><button class="btn primary" type="submit">Enregistrer</button></div></form></section>
    </div>
    <div class="stack">
      <section class="card"><div class="card-h"><h2>En bref</h2></div><div class="card-b"><dl class="dl">
        <dt>Total</dt><dd class="num">${euro(mine.filter(o=>o.stage!=='annulee').reduce((s,o)=>s+o.total,0))}</dd>
        <dt>Instruments remis</dt><dd>${delivered.length}</dd>
        <dt>E-mail</dt><dd>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'—'}</dd>
        <dt>Téléphone</dt><dd>${c.phone?`<a href="tel:${esc(c.phone.replace(/\s/g,''))}">${esc(c.phone)}</a>`:'—'}</dd></dl></div></section>
      <section class="card"><div class="card-h"><h2>Demandes</h2></div><div class="list">${reqs.length?reqs.map(r=>`<a class="item" href="#/demandes"><span class="dot ${(REQ_STATUS[r.status]||[])[1]||''}"></span><div class="grow"><div class="t1">${esc(r.subject||'Message')}</div><div class="t2">${fmtDate(r.created_at)} · ${(REQ_STATUS[r.status]||[r.status])[0]}</div></div></a>`).join(''):empty('Aucune demande.')}</div></section>
      ${waits.length?`<section class="card"><div class="card-h"><h2>Liste d'attente</h2></div><div class="list">${waits.map(w=>`<a class="item" href="#/attente"><span class="dot warn"></span><div class="grow"><div class="t1">${esc(modelName(w.model_id))}</div><div class="t2">${(WAIT_STATUS[w.status]||[w.status])[0]} · depuis ${fmtDate(w.created_at)}</div></div></a>`).join('')}</div></section>`:''}
    </div>
  </div>`;
  $('#c-form').onsubmit=async e=>{e.preventDefault();const v=readForm(e.target);
    if(v.email&&clients.some(x=>x.id!==c.id&&(x.email||'').toLowerCase()===v.email.toLowerCase())){toast('Un autre client utilise déjà cet e-mail.',true);return;}
    const p={};['first_name','last_name','email','phone','street','zip','city','notes'].forEach(k=>{p[k]=v[k]||null;});if(p.email)p.email=p.email.toLowerCase();
    await busy(e.submitter,()=>db.update('clients',c.id,p));toast('Fiche enregistrée.');Ad.reload();};
  el.onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;const o=mine.find(x=>x.id===b.dataset.id);
    if(b.dataset.act==='remind'){mailto(c.email,'L’entretien de votre '+modelName(o.model_id),
      `Bonjour ${c.first_name||''},\n\nVotre ${modelName(o.model_id)} a maintenant ${Math.max(1,Math.round(-daysFrom(o.last_service_at||o.delivered_at)/30))} mois de vie depuis ${o.last_service_at?'sa dernière révision':'sa remise'}. Le bois a traversé les saisons : c'est le bon moment pour une révision (réglage du manche, de l'action, des frettes et de l'électronique).\n\nComme prévu, cet entretien est offert. Répondez simplement à ce message pour convenir d'un rendez-vous.\n\nÀ bientôt à l'atelier,\n${S.settings.company||'Atelier Aubier'}\n${S.settings.phone||''}`);
      await db.update('orders',o.id,{last_reminder_at:new Date().toISOString()});setTimeout(Ad.reload,400);}
    else if(b.dataset.act==='serviced'){await busy(b,()=>db.update('orders',o.id,{last_service_at:isoDay()}));toast('Entretien noté à la date du jour.');Ad.reload();}
    else if(b.dataset.act==='del'){if(confirm('Supprimer la fiche de '+cname(c)+' ? Ses commandes restent dans l’historique.')){await busy(b,()=>db.remove('clients',c.id));toast('Fiche supprimée.');Ad.go('clients');}}
  };
}

/* =========================================================
   LISTE D'ATTENTE
   ========================================================= */
Ad.register('attente',{title:"Liste d'attente",async render(el){
  const[list,orders]=await load('waitlist','orders');
  list.sort((a,b)=>a.created_at.localeCompare(b.created_at));
  const Y=YEAR(),cap=+S.settings.capacity||8,sold=orders.filter(o=>o.stage!=='annulee'&&inYear(o.created_at,Y)).length,left=Math.max(cap-sold,0);
  const models=[['','Indifférent']].concat(S.models.map(m=>[m.id,m.name]));
  el.innerHTML=`
  <div class="page-head"><div><h1>Liste d'attente</h1><p class="sub">${left?`<b>${plural(left,'place libre','places libres')}</b> en ${Y} : prévenez les premiers inscrits.`:`L'atelier est complet pour ${Y}.`}</p></div>
    <div class="actions"><button class="btn primary" data-act="add">${icon('plus')}Inscrire quelqu'un</button></div></div>
  <section class="card" id="add-card" hidden style="margin-bottom:16px"><div class="card-h"><h2>Nouvelle inscription</h2></div>
    <form class="card-b form cols3" id="add-form">${field('Nom',inp('name',''))}${field('E-mail',inp('email','','email'))}${field('Modèle',sel('model_id','',models))}${field('Note',inp('note',''),'',"full")}
      <div class="full row" style="justify-content:flex-end"><button class="btn primary" type="submit">Inscrire</button></div></form></section>
  <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>#</th><th>Personne</th><th>Modèle</th><th class="hide-sm">Note</th><th>Inscrit</th><th>Statut</th><th></th></tr></thead><tbody>
  ${list.length?list.map((w,i)=>`<tr data-id="${w.id}"><td class="faint num">${i+1}</td><td><b>${esc(w.name||'—')}</b><span class="sub">${esc(w.email||'')}</span></td><td>${esc(w.model_id?modelName(w.model_id):'Indifférent')}</td>
    <td class="hide-sm muted" style="max-width:320px">${esc(w.note||'')}</td><td class="nowrap muted">${fmtDate(w.created_at)}</td>
    <td>${sel('status',w.status,Object.entries(WAIT_STATUS).map(([k,v])=>[k,v[0]]),'data-status aria-label="Statut"')}</td>
    <td class="nowrap right"><button class="btn sm" data-act="mail">${icon('mail')}Prévenir</button> <button class="btn sm ghost danger icon" data-act="del" aria-label="Supprimer">${icon('x')}</button></td></tr>`).join(''):`<tr><td colspan="7">${empty('Personne sur la liste pour le moment.')}</td></tr>`}
  </tbody></table></div></div>`;
  $('#add-form').onsubmit=async e=>{e.preventDefault();const v=readForm(e.target);if(!v.email){toast('Indiquez un e-mail.',true);return;}
    await busy(e.submitter,()=>db.insert('waitlist',{name:v.name||null,email:v.email,model_id:v.model_id||null,note:v.note||null,status:'attente'}));toast('Inscription ajoutée.');Ad.reload();};
  el.onchange=async e=>{if(!e.target.hasAttribute('data-status'))return;const id=e.target.closest('tr').dataset.id;try{await db.update('waitlist',id,{status:e.target.value});toast('Statut mis à jour.');}catch(x){fail(x);}};
  el.onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;
    if(b.dataset.act==='add'){$('#add-card').hidden=!$('#add-card').hidden;return;}
    const w=list.find(x=>x.id===b.closest('tr').dataset.id);
    if(b.dataset.act==='mail'){mailto(w.email,'Une place se libère à l’atelier',`Bonjour ${(w.name||'').split(' ')[0]},\n\nVous nous aviez demandé de vous prévenir : une place se libère pour ${w.model_id?'une '+modelName(w.model_id):'un instrument'} en ${Y}.\n\nSi vous êtes toujours intéressé, répondez à ce message ou composez votre instrument ici :\n${siteUrl('index.html#configurateur')}\n\nÀ bientôt,\n${S.settings.company||'Atelier Aubier'}`);
      if(w.status==='attente'){await db.update('waitlist',w.id,{status:'contacte'});setTimeout(Ad.reload,400);}}
    if(b.dataset.act==='del'&&confirm('Retirer '+(w.name||w.email)+' de la liste ?')){await busy(b,()=>db.remove('waitlist',w.id));Ad.reload();}
  };
}});

/* =========================================================
   STOCK DE BOIS
   ========================================================= */
Ad.register('bois',{title:'Stock de bois',async render(el){
  const wood=await db.list('wood');wood.sort((a,b)=>(a.part||'').localeCompare(b.part||'')||a.species.localeCompare(b.species));
  const parts=[...new Set(wood.map(w=>w.part).filter(Boolean))];
  const Y=YEAR(),low=w=>+w.quantity<=+w.min_qty;
  let f='',term='',editing=null;
  const form=w=>`<form class="card-b form cols3" id="w-form">
    ${field('Essence',inp('species',w.species,'text','required placeholder="Épicéa d’Europe"'))}${field('Usage',inp('part',w.part,'text','list="parts" placeholder="Table, Manche, Touche…"'))}${field('Origine',inp('origin',w.origin))}
    ${field('Quantité',inp('quantity',w.quantity==null?0:w.quantity,'number','min="0" step="1"'))}${field('Unité',inp('unit',w.unit||'pièces'))}${field('Seuil d’alerte',inp('min_qty',w.min_qty==null?0:w.min_qty,'number','min="0" step="1"'),'Alerte quand le stock descend à ce niveau.')}
    ${field('Année de coupe ou d’arrivée',inp('cut_year',w.cut_year,'number','min="1950" max="'+Y+'"'),'Sert à calculer le temps de séchage.')}${field('Emplacement',inp('location',w.location,'text','placeholder="Étagère A1"'))}${field('Notes',inp('notes',w.notes))}
    <datalist id="parts">${['Table','Fond et éclisses','Manche','Touche','Chevalet','Sillet'].concat(parts).filter((v,i,a)=>a.indexOf(v)===i).map(p=>`<option value="${esc(p)}">`).join('')}</datalist>
    <div class="full row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="cancel">Annuler</button><button class="btn primary" type="submit">${w.id?'Enregistrer':'Ajouter au stock'}</button></div></form>`;
  el.innerHTML=`
  <div class="page-head"><div><h1>Stock de bois</h1><p class="sub">${plural(wood.length,'référence')} · ${wood.filter(low).length?`<span style="color:var(--warn)">${plural(wood.filter(low).length,'stock bas','stocks bas')}</span>`:'aucun stock bas'}</p></div>
    <div class="actions"><button class="btn" data-act="csv">${icon('down')}Exporter (CSV)</button><button class="btn primary" data-act="add">${icon('plus')}Ajouter</button></div></div>
  <section class="card" id="w-card" hidden style="margin-bottom:16px"><div class="card-h"><h2 id="w-title">Nouvelle référence</h2></div><div id="w-body"></div></section>
  <div class="toolbar"><div class="seg" id="filters"><button data-f="" aria-pressed="true">Tout</button>${parts.map(p=>`<button data-f="${esc(p)}" aria-pressed="false">${esc(p)}</button>`).join('')}</div>
    <input type="search" id="q" placeholder="Rechercher une essence…" aria-label="Rechercher"></div>
  <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Essence</th><th>Usage</th><th class="hide-sm">Origine</th><th>Stock</th><th>Séchage</th><th class="hide-sm">Emplacement</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  const draw=()=>{const t=term.toLowerCase();const rows=wood.filter(w=>(!f||w.part===f)&&(!t||[w.species,w.origin,w.notes,w.location].join(' ').toLowerCase().includes(t)));
    $('#rows').innerHTML=rows.length?rows.map(w=>`<tr data-id="${w.id}"><td><b>${esc(w.species)}</b>${w.notes?`<span class="sub">${esc(w.notes)}</span>`:''}</td><td>${esc(w.part||'—')}</td><td class="hide-sm muted">${esc(w.origin||'—')}</td>
      <td class="nowrap"><div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm icon" data-act="minus" aria-label="Retirer une unité">−</button><span class="num" style="min-width:64px;text-align:center"><b>${esc(w.quantity)}</b> ${esc(w.unit||'')}</span><button class="btn sm icon" data-act="plus" aria-label="Ajouter une unité">+</button>${low(w)?'<span class="badge warn">Bas</span>':''}</div></td>
      <td class="nowrap">${w.cut_year?`${Y-w.cut_year} ans <span class="faint small">(${w.cut_year})</span>`:'<span class="faint">—</span>'}</td><td class="hide-sm">${esc(w.location||'—')}</td>
      <td class="nowrap right"><button class="btn sm ghost" data-act="edit">Modifier</button><button class="btn sm ghost danger icon" data-act="del" aria-label="Supprimer">${icon('x')}</button></td></tr>`).join(''):`<tr><td colspan="7">${empty('Aucune référence.')}</td></tr>`;};
  draw();
  const open=w=>{editing=w;$('#w-title').textContent=w.id?'Modifier · '+w.species:'Nouvelle référence';$('#w-body').innerHTML=form(w);$('#w-card').hidden=false;$('#w-card').scrollIntoView({block:'nearest'});
    $('#w-form').onsubmit=async e=>{e.preventDefault();const v=readForm(e.target);if(!v.species){toast('Indiquez l’essence.',true);return;}
      const row={species:v.species,part:v.part||null,origin:v.origin||null,quantity:v.quantity||0,unit:v.unit||'pièces',min_qty:v.min_qty||0,cut_year:v.cut_year||null,location:v.location||null,notes:v.notes||null,updated_at:new Date().toISOString()};
      await busy(e.submitter,()=>editing.id?db.update('wood',editing.id,row):db.insert('wood',row));toast('Stock enregistré.');Ad.reload();};};
  $('#q').oninput=e=>{term=e.target.value;draw();};
  el.onclick=async e=>{
    const fb=e.target.closest('[data-f]');if(fb){f=fb.dataset.f;$$('#filters button').forEach(x=>x.setAttribute('aria-pressed',x===fb));draw();return;}
    const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,tr=b.closest('tr'),w=tr&&wood.find(x=>x.id===tr.dataset.id);
    if(act==='add')open({});
    else if(act==='cancel')$('#w-card').hidden=true;
    else if(act==='edit')open(w);
    else if(act==='minus'||act==='plus'){const q=Math.max(0,(+w.quantity||0)+(act==='plus'?1:-1));try{await db.update('wood',w.id,{quantity:q,updated_at:new Date().toISOString()});w.quantity=q;draw();}catch(x){fail(x);}}
    else if(act==='del'){if(confirm('Supprimer '+w.species+' du stock ?')){await busy(b,()=>db.remove('wood',w.id));Ad.reload();}}
    else if(act==='csv')download('stock-bois-'+isoDay()+'.csv',csv(wood,[['Essence',w=>w.species],['Usage',w=>w.part],['Origine',w=>w.origin],['Quantité',w=>w.quantity],['Unité',w=>w.unit],['Seuil',w=>w.min_qty],['Année',w=>w.cut_year],['Emplacement',w=>w.location],['Notes',w=>w.notes]]),'text/csv;charset=utf-8');
  };
}});
})();
