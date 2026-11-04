/* =========================================================
   ADMIN : catalogue et site
   Modèles (fiche, finitions, anatomie, 3D, aperçu) · Options communes · Textes du site · Réglages
   ========================================================= */
(function(){
'use strict';
const Ad=window.Admin,{db,S,$,$$,esc,euro,isoDay,fmtDate,plural,slug,icon,toast,fail,busy,download,readForm,field,inp,area,sel,sw,empty,isOwner}=Ad;
const clone=o=>JSON.parse(JSON.stringify(o==null?null:o));
const DEFAULT_A={head:[0,.93,.3],nut:[0,.85,.6],neck:[0,.62,.6],body:[0,.3,.9],bridge:[0,.15,.95],center:[0,.5,0]};
const ANCHOR_NAMES={head:'Tête',nut:'Sillet',neck:'Manche',body:'Corps',bridge:'Chevalet',knobs:'Boutons',center:'Centre'};
const TYPE_NAMES={hardware:'Accastillage',varnish:'Vernis',case:'Étuis'};
/* Barre « enregistrer » : signale les changements en attente */
const setDirty=d=>{S.dirty=d;const st=$('#save-state');if(st){st.textContent=d?'Modifications non enregistrées':'Tout est enregistré';st.classList.toggle('dirty',d);}};
const saveBar=label=>`<div class="save-bar"><span class="state" id="save-state">Tout est enregistré</span><button class="btn primary" id="save-btn" type="button">${label||'Enregistrer'}</button></div>`;
const swStyle=s=>s&&!String(s).startsWith('wood:')?`background:${esc(s)}`:'background:linear-gradient(135deg,#e2b77a,#9a6331)';
const usedIn=async(field,val)=>(await db.list('orders')).some(o=>o.config&&o.config[field]===val&&o.stage!=='annulee');

/* =========================================================
   MODÈLES : liste
   ========================================================= */
Ad.register('modeles',{title:'Modèles',render(el,id,q){return id?modelEditor(el,id,q):modelList(el);}});

async function modelList(el){
  await Ad.loadCatalogue();
  const orders=await db.list('orders');
  const models=S.models.slice().sort((a,b)=>a.position-b.position);
  const fins=m=>S.options.filter(o=>o.type==='finish'&&o.model_id===m.id);
  const sold=m=>orders.filter(o=>o.model_id===m.id&&o.stage!=='annulee');
  el.innerHTML=`
  <div class="page-head"><div><h1>Modèles</h1><p class="sub">Ce que voient les visiteurs dans l'accueil, l'anatomie et le configurateur. L'ordre est celui du site.</p></div>
    <div class="actions"><a class="btn" href="#/options">${icon('sliders')}Options communes</a><button class="btn primary" data-act="new">${icon('plus')}Ajouter un modèle</button></div></div>
  <div class="grid g3">${models.map((m,i)=>`
    <section class="card model-card">
      <div class="spread"><h3>${esc(m.name)}</h3><div class="row" style="gap:2px"><button class="btn sm icon ghost" data-act="up" data-id="${m.id}" aria-label="Monter" ${i===0?'disabled':''}>${icon('up')}</button><button class="btn sm icon ghost" data-act="down" data-id="${m.id}" aria-label="Descendre" ${i===models.length-1?'disabled':''}>${icon('dn')}</button></div></div>
      <p class="muted">${esc(m.kind||'Type à préciser')}</p>
      <div class="chips">${m.visible!==false?'<span class="badge good">Visible</span>':'<span class="badge">Masqué</span>'}${m.sold_out?'<span class="badge warn">Complet</span>':''}${!m.file&&!m.glb_url?'<span class="badge bad">Fichier 3D manquant</span>':''}</div>
      <dl class="dl"><dt>Prix de base</dt><dd class="num">${euro(m.base_price)}</dd><dt>Fabrication</dt><dd>${m.weeks} semaines</dd>
        <dt>Finitions</dt><dd><span class="row" style="gap:4px">${fins(m).filter(f=>f.active!==false).map(f=>`<span class="swatch" style="${swStyle(f.props&&f.props.swatch)}" title="${esc(f.name)}"></span>`).join('')||'Aucune'}</span></dd>
        <dt>Étapes d'anatomie</dt><dd>${(m.story||[]).length}</dd><dt>Commandes</dt><dd>${sold(m).length} · ${euro(sold(m).reduce((s,o)=>s+o.total,0))}</dd></dl>
      <div class="row"><a class="btn sm primary" href="#/modeles/${m.id}">Modifier</a><a class="btn sm" href="#/modeles/${m.id}?onglet=apercu">${icon('eye')}Aperçu</a></div>
    </section>`).join('')}</div>`;
  el.onclick=async e=>{const b=e.target.closest('[data-act]');if(!b)return;
    if(b.dataset.act==='new'){
      const name=(prompt('Nom du nouveau modèle (vous pourrez tout modifier ensuite) :')||'').trim();if(!name)return;
      let id=slug(name);while(S.models.some(m=>m.id===id))id+='-2';
      await busy(b,async()=>{
        await db.insert('models',{id,name,kind:'',base_price:3000,weeks:12,position:Math.max(0,...S.models.map(m=>m.position))+1,visible:false,sold_out:false,glb_url:null,file:null,anchors:DEFAULT_A,
          defaults:{},story:[{a:'center',d:'fit',az:24,el:6,part:"Vue d'ensemble",t:name,x:'',p:'',s:''}],updated_at:new Date().toISOString()});
        await db.insert('options',{id:id+'-finish-naturel',model_id:id,type:'finish',code:'naturel',name:'Naturel',price:0,active:true,position:1,props:{swatch:'#c9a26b'}});
      });
      toast('Modèle créé, masqué tant que le fichier 3D n’est pas ajouté.');Ad.go('modeles/'+id+'?onglet=3d');return;}
    const i=models.findIndex(m=>m.id===b.dataset.id),j=b.dataset.act==='up'?i-1:i+1;if(j<0||j>=models.length)return;
    await busy(b,async()=>{const a=models[i],c=models[j];await db.update('models',a.id,{position:c.position});await db.update('models',c.id,{position:a.position===c.position?c.position+1:a.position});});
    Ad.reload();};
}

/* =========================================================
   MODÈLE : éditeur
   ========================================================= */
async function modelEditor(el,id,q){
  await Ad.loadCatalogue();
  const base=S.models.find(m=>m.id===id);if(!base){el.innerHTML=empty('Modèle introuvable. <a href="#/modeles">Retour aux modèles</a>');return;}
  const orders=await db.list('orders');
  const M=clone(base);M.story=M.story||[];M.anchors=M.anchors&&Object.keys(M.anchors).length?M.anchors:clone(DEFAULT_A);M.defaults=M.defaults||{};
  let F=clone(S.options.filter(o=>o.type==='finish'&&o.model_id===id).sort((a,b)=>a.position-b.position));
  const removed=[];
  const shared=t=>S.options.filter(o=>o.type===t&&!o.model_id);
  const TABS=[['general','Fiche'],['finitions','Finitions'],['anatomie','Anatomie'],['3d','Fichier 3D et caméra'],['apercu','Aperçu']];
  let tab=TABS.some(t=>t[0]===q.get('onglet'))?q.get('onglet'):'general';
  const mine=orders.filter(o=>o.model_id===id&&o.stage!=='annulee');

  el.innerHTML=`
  <div class="page-head"><div><div class="crumb"><a href="#/modeles">Modèles</a> /</div><h1 id="m-title">${esc(M.name)}</h1><p class="sub">${plural(mine.length,'commande')} · ${euro(mine.reduce((s,o)=>s+o.total,0))}</p></div>
    <div class="actions"><button class="btn danger ghost" data-act="delete">Supprimer le modèle</button></div></div>
  <div class="tabs" role="tablist">${TABS.map(([k,l])=>`<button role="tab" data-tab="${k}" aria-selected="${k===tab}">${l}</button>`).join('')}</div>
  <div id="tab-body"></div>
  ${saveBar('Enregistrer le modèle')}`;

  /* ----- Onglets ----- */
  const T={
    general:()=>`<div class="grid g-main"><section class="card"><div class="card-h"><h2>Fiche du modèle</h2></div><div class="card-b form cols">
      ${field('Nom',inp('name',M.name,'text','data-m'))}${field('Type d’instrument',inp('kind',M.kind,'text','data-m placeholder="Guitare folk, format parlor"'))}
      ${field('Prix de base (€)',inp('base_price',M.base_price,'number','data-m min="0" step="10"'),'Avant finition, accastillage et étui.')}${field('Fabrication (semaines)',inp('weeks',M.weeks,'number','data-m min="1" step="1"'),'+ '+(S.settings.lacquer_weeks!=null?S.settings.lacquer_weeks:2)+' semaines pour une laque (réglable dans Réglages).')}
      <div class="full stack" style="gap:12px">${sw('visible',M.visible!==false,'Visible sur le site').replace('<input','<input data-m')}${sw('sold_out',M.sold_out,'Complet pour cette année : le site propose la liste d’attente').replace('<input','<input data-m')}</div>
      </div></section>
      <section class="card"><div class="card-h"><h2>Configuration par défaut</h2></div><div class="card-b form">
      <p class="small muted">Ce que voit un visiteur qui ouvre le configurateur sur ce modèle, et ce qu'affichent l'accueil et l'anatomie.</p>
      ${field('Finition',sel('finish',M.defaults.finish,F.filter(f=>f.active!==false).map(f=>[f.code,f.name]),'data-d'))}
      ${['hardware','varnish','case'].map(t=>field(TYPE_NAMES[t]==='Étuis'?'Étui':TYPE_NAMES[t],sel(t,M.defaults[t],shared(t).filter(o=>o.active!==false).map(o=>[o.code,o.name]),'data-d'))).join('')}
      <p class="small faint">Accastillage, vernis et étuis sont communs à tous les modèles : <a href="#/options">options communes</a>.</p></div></section></div>`,
    finitions:()=>`<section class="card"><div class="card-h"><h2>Finitions de la ${esc(M.name)}</h2><button class="btn sm" data-act="add-fin">${icon('plus')}Ajouter une finition</button></div>
      <div class="table-wrap"><table class="t edit"><thead><tr><th>Pastille</th><th>Nom</th><th>Rendu sur le bois</th><th>Couleur</th><th>Intensité</th><th class="hide-sm">Bois</th><th>Supplément (€)</th><th>Active</th><th></th></tr></thead><tbody>
      ${F.map((f,i)=>{const p=f.props||{},r=p.lac?'laque':p.tint?'teinte':'naturel',wood=String(p.swatch||'').startsWith('wood:');
        return`<tr data-fi="${i}"><td>${wood?`<span class="swatch" style="${swStyle(p.swatch)}" title="Texture de bois"></span>`:`<input type="color" data-k="swatch" value="${esc(p.swatch||'#888888')}" aria-label="Pastille">`}</td>
        <td><input data-k="name" value="${esc(f.name)}" aria-label="Nom" style="min-width:150px"></td>
        <td>${sel('',r,[['naturel','Bois naturel'],['teinte','Teinte (le veinage reste visible)'],['laque','Laque (couvrante)']],'data-k="rendu" aria-label="Rendu"')}</td>
        <td>${r==='naturel'?'<span class="faint">—</span>':`<input type="color" data-k="color" value="${esc(r==='laque'?p.lac:p.tint)}" aria-label="Couleur">`}</td>
        <td>${r==='teinte'?`<input type="range" data-k="amt" min="0.1" max="1" step="0.05" value="${p.amt||.8}" aria-label="Intensité" style="min-width:90px">`:'<span class="faint">—</span>'}</td>
        <td class="hide-sm">${sel('',p.wood||'',[['','Bois du modèle'],['flamme','Érable flammé']],'data-k="wood" aria-label="Bois"')}${p.wood?`<label class="check small" style="margin-top:4px"><input type="checkbox" data-k="burst"${p.burst?' checked':''}> Dégradé</label>`:''}</td>
        <td><input type="number" data-k="price" value="${f.price||0}" min="0" step="10" aria-label="Supplément" style="width:90px"></td>
        <td><input type="checkbox" data-k="active"${f.active!==false?' checked':''} aria-label="Active"></td>
        <td class="nowrap"><button class="btn sm icon ghost" data-act="fin-up" aria-label="Monter">${icon('up')}</button><button class="btn sm icon ghost danger" data-act="fin-del" aria-label="Supprimer">${icon('x')}</button></td></tr>`;}).join('')}
      </tbody></table></div>
      <div class="card-b"><p class="small faint">La pastille est la petite pastille ronde du configurateur. « Teinte » colore le bois en gardant son veinage, « Laque » le couvre entièrement. Une finition désactivée n'est plus proposée, sans toucher aux commandes passées.</p></div></section>`,
    anatomie:()=>`<div class="note" style="margin-bottom:14px">Chaque étape correspond à un écran de la section « Anatomie » : un texte à gauche, et la caméra qui se déplace vers une partie de l'instrument. La dernière étape propose de composer le modèle.</div>
      ${M.story.map((s,i)=>`<section class="step-card" data-si="${i}"><div class="spread"><b>Étape ${i+1} · ${esc(s.part||'')}</b><span class="row" style="gap:2px">
        <button class="btn sm icon ghost" data-act="st-up" aria-label="Monter" ${i===0?'disabled':''}>${icon('up')}</button><button class="btn sm icon ghost" data-act="st-down" aria-label="Descendre" ${i===M.story.length-1?'disabled':''}>${icon('dn')}</button><button class="btn sm icon ghost danger" data-act="st-del" aria-label="Supprimer" ${M.story.length<2?'disabled':''}>${icon('x')}</button></span></div>
        <div class="form cols">
          ${field('Partie (petit titre)',`<input data-k="part" value="${esc(s.part)}">`)}${i===0?field('Accroche',`<input data-k="x" value="${esc(s.x)}">`,'Grande phrase de la première étape.'):field('Titre',`<input data-k="t" value="${esc(s.t)}">`)}
          ${field('Texte',`<textarea data-k="p" rows="3">${esc(s.p)}</textarea>`,'',"full")}
          ${field('Signature',`<input data-k="s" value="${esc(s.s)}">`,'Ligne courte sous le texte.','full')}
          <details class="adv full"><summary>Caméra</summary><div class="form cols3">
            ${field('Point visé',sel('',s.a,Object.keys(M.anchors).map(k=>[k,ANCHOR_NAMES[k]||k]),'data-k="a"'))}
            ${field('Distance',`<input data-k="d" value="${esc(s.d)}">`,'« fit » = instrument entier, sinon 0,2 (près) à 0,6 (loin).')}
            ${field('Rotation (°)',`<input type="number" data-k="az" value="${esc(s.az)}" step="1">`,'0 = de face, 90 = profil, 180 = dos.')}
            ${field('Hauteur (°)',`<input type="number" data-k="el" value="${esc(s.el)}" step="1">`,'Angle de vue, de 0 à 40.')}</div></details>
        </div></section>`).join('')}
      <button class="btn" data-act="st-add" style="margin-top:12px">${icon('plus')}Ajouter une étape</button>`,
    '3d':()=>`<div class="grid g2"><section class="card"><div class="card-h"><h2>Fichier 3D</h2></div><div class="card-b stack" style="gap:12px">
      <dl class="dl"><dt>Utilisé</dt><dd>${M.glb_url?'Fichier envoyé depuis l’admin':M.file?'Fichier du site : <span class="mono">'+esc(M.file.replace(/\.js$/,'.glb'))+'</span>':'<span style="color:var(--bad)">Aucun : le modèle ne peut pas s’afficher</span>'}</dd></dl>
      ${field('Remplacer par un fichier .glb',`<input type="file" id="glb" accept=".glb,model/gltf-binary">`,'Modèle exporté depuis Blender (glTF binaire). L’instrument doit être debout, la face avant vers l’avant. Viser moins de 8 Mo.')}
      <div class="row"><button class="btn primary sm" data-act="glb-up">Envoyer le fichier</button>${M.glb_url&&M.file?'<button class="btn sm ghost" data-act="glb-reset">Revenir au fichier d’origine</button>':''}</div>
      <p class="small faint">Les teintes s'appliquent aux matériaux nommés WOOD… et l'accastillage aux matériaux métalliques du fichier.</p></div></section>
      <section class="card"><div class="card-h"><h2>Points visés par la caméra</h2><button class="btn sm" data-act="an-add">${icon('plus')}Ajouter</button></div>
      <div class="table-wrap"><table class="t edit"><thead><tr><th>Point</th><th>Gauche-droite</th><th>Bas-haut</th><th>Profondeur</th><th></th></tr></thead><tbody>
      ${Object.entries(M.anchors).map(([k,v])=>`<tr data-an="${esc(k)}"><td><b>${esc(ANCHOR_NAMES[k]||k)}</b></td>${[0,1,2].map(j=>`<td><input type="number" data-j="${j}" value="${v[j]}" step="0.01" style="width:80px"></td>`).join('')}<td>${k==='center'?'':`<button class="btn sm icon ghost danger" data-act="an-del" aria-label="Supprimer">${icon('x')}</button>`}</td></tr>`).join('')}
      </tbody></table></div><div class="card-b"><p class="small faint">En proportion de l'instrument : gauche-droite de −1 à 1, bas-haut de 0 (pied) à 1 (tête), profondeur de 0 (centre) à 1 (face avant).</p></div></section></div>`,
    apercu:()=>`<div class="note" style="margin-bottom:12px">Aperçu du site avec vos modifications, <b>même non enregistrées</b>. Rien n'est visible des visiteurs tant que vous n'enregistrez pas.</div>
      <div class="row" style="margin-bottom:12px"><div class="seg"><button data-pv="configurateur" aria-pressed="true">Configurateur</button><button data-pv="anatomie" aria-pressed="false">Anatomie</button><button data-pv="collection" aria-pressed="false">Accueil</button></div>
        <button class="btn sm" data-act="pv-open">${icon('out')}Ouvrir dans un onglet</button></div>
      <iframe class="preview-frame" id="pv" title="Aperçu du site"></iframe>`
  };

  /* Catalogue complet avec le brouillon de ce modèle, lu par le site en mode ?apercu */
  const previewCat=()=>{const m=Object.assign(clone(M),{visible:true});
    return{settings:S.settings,content:S.content,sold:null,
      models:S.models.filter(x=>x.id!==id&&x.visible!==false).concat([m]).sort((a,b)=>a.position-b.position),
      options:S.options.filter(o=>!(o.type==='finish'&&o.model_id===id)).concat(F.map((f,i)=>Object.assign({},f,{position:i+1})))};};
  const preview=hash=>{try{localStorage.setItem('aubier-apercu',JSON.stringify(previewCat()));
      const k='sillet-config-v3',s=JSON.parse(localStorage.getItem(k)||'null')||{per:{}};s.model=id;s.per=s.per||{};localStorage.setItem(k,JSON.stringify(s));}
    catch(e){toast('Aperçu impossible : fichier 3D trop lourd pour la mémoire du navigateur.',true);return null;}
    return Ad.siteUrl('index.html?apercu=1#'+(hash||'configurateur'));};

  const draw=()=>{$$('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab));$('#tab-body').innerHTML=T[tab]();
    if(tab==='apercu'){const u=preview('configurateur');if(u)$('#pv').src=u;}
    history.replaceState(null,'','#/modeles/'+id+(tab==='general'?'':'?onglet='+tab));};
  draw();setDirty(false);

  const touch=()=>setDirty(true);
  el.oninput=el.onchange=e=>{
    const t=e.target;
    if(t.hasAttribute('data-m')){M[t.name]=t.type==='checkbox'?t.checked:t.type==='number'?(t.value===''?0:+t.value):t.value;if(t.name==='name')$('#m-title').textContent=t.value||'Sans nom';touch();return;}
    if(t.hasAttribute('data-d')){M.defaults[t.name]=t.value;touch();return;}
    const fr=t.closest('[data-fi]');
    if(fr&&t.dataset.k){const f=F[+fr.dataset.fi],p=f.props=f.props||{},k=t.dataset.k;
      if(k==='name')f.name=t.value;
      else if(k==='price')f.price=+t.value||0;
      else if(k==='active')f.active=t.checked;
      else if(k==='swatch')p.swatch=t.value;
      else if(k==='amt')p.amt=+t.value;
      else if(k==='burst'){p.burst=t.checked||undefined;}
      else if(k==='wood'){if(t.value)p.wood=t.value;else{delete p.wood;delete p.burst;}if(e.type==='change')draw();}
      else if(k==='color'){if(p.lac)p.lac=t.value;else p.tint=t.value;if(!String(p.swatch||'').startsWith('wood:')){p.swatch=t.value;const c=fr.querySelector('[data-k="swatch"]');if(c)c.value=t.value;}}
      else if(k==='rendu'&&e.type==='change'){const col=p.lac||p.tint||(String(p.swatch||'').startsWith('#')?p.swatch:'#7a4a22');delete p.lac;delete p.tint;delete p.amt;
        if(t.value==='teinte'){p.tint=col;p.amt=.8;}if(t.value==='laque'){p.lac=col;if(String(p.swatch||'').startsWith('wood:'))p.swatch=col;}draw();}
      touch();return;}
    const sr=t.closest('[data-si]');
    if(sr&&t.dataset.k){const s=M.story[+sr.dataset.si],k=t.dataset.k;s[k]=['az','el'].includes(k)?+t.value:k==='d'?(t.value.trim()==='fit'?'fit':(+String(t.value).replace(',','.')||t.value)):t.value;touch();return;}
    const ar=t.closest('[data-an]');
    if(ar&&t.dataset.j!=null){M.anchors[ar.dataset.an][+t.dataset.j]=+t.value||0;touch();return;}
  };
  el.onclick=async e=>{
    const tb=e.target.closest('[data-tab]');if(tb){tab=tb.dataset.tab;draw();return;}
    const pv=e.target.closest('[data-pv]');if(pv){$$('[data-pv]').forEach(x=>x.setAttribute('aria-pressed',x===pv));const u=preview(pv.dataset.pv);if(u){$('#pv').src='about:blank';setTimeout(()=>{$('#pv').src=u;},30);}return;}
    const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;
    const row=b.closest('[data-fi]'),fi=row?+row.dataset.fi:-1,srow=b.closest('[data-si]'),si=srow?+srow.dataset.si:-1;
    if(act==='add-fin'){F.push({id:null,model_id:id,type:'finish',code:null,name:'Nouvelle finition',price:0,active:true,position:F.length+1,props:{swatch:'#8a5a2b',tint:'#8a5a2b',amt:.8}});touch();draw();}
    else if(act==='fin-up'&&fi>0){[F[fi-1],F[fi]]=[F[fi],F[fi-1]];touch();draw();}
    else if(act==='fin-del'){const f=F[fi];if(f.code&&await usedIn('finish',f.code)&&!confirm('Des commandes utilisent « '+f.name+' ». Elles restent intactes. Supprimer quand même ? (Vous pouvez aussi simplement la désactiver.)'))return;
      if(f.id)removed.push(f.id);F.splice(fi,1);touch();draw();}
    else if(act==='st-add'){M.story.push({a:'body',d:.4,az:20,el:15,part:'Nouvelle étape',t:'Titre',p:'',s:''});touch();draw();}
    else if(act==='st-up'&&si>0){[M.story[si-1],M.story[si]]=[M.story[si],M.story[si-1]];touch();draw();}
    else if(act==='st-down'&&si<M.story.length-1){[M.story[si+1],M.story[si]]=[M.story[si],M.story[si+1]];touch();draw();}
    else if(act==='st-del'&&M.story.length>1&&confirm('Supprimer cette étape ?')){M.story.splice(si,1);touch();draw();}
    else if(act==='an-add'){const k=slug(prompt('Nom du point (ex. : rosace, micro) :')||'');if(!k)return;M.anchors[k]=[0,.5,.9];touch();draw();}
    else if(act==='an-del'){delete M.anchors[b.closest('[data-an]').dataset.an];touch();draw();}
    else if(act==='glb-up'){const file=$('#glb').files[0];if(!file){toast('Choisissez d’abord un fichier .glb.',true);return;}
      if(!/\.glb$/i.test(file.name)){toast('Le fichier doit être au format .glb.',true);return;}
      const url=await busy(b,()=>db.upload(file,'modeles'));M.glb_url=url;touch();draw();toast('Fichier envoyé. Enregistrez le modèle pour l’utiliser sur le site.');}
    else if(act==='glb-reset'){M.glb_url=null;touch();draw();}
    else if(act==='pv-open'){const u=preview(($('[data-pv][aria-pressed="true"]')||{}).dataset.pv);if(u)window.open(u,'_blank');}
    else if(act==='delete'){if(mine.length){toast('Ce modèle a des commandes : masquez-le plutôt (onglet Fiche).',true);return;}
      if(!confirm('Supprimer définitivement le modèle '+M.name+' et ses finitions ?'))return;
      await busy(b,async()=>{for(const f of S.options.filter(o=>o.type==='finish'&&o.model_id===id))await db.remove('options',f.id);await db.remove('models',id);});
      S.dirty=false;toast('Modèle supprimé.');Ad.go('modeles');}
  };
  $('#save-btn').onclick=async e=>{
    if(!M.name.trim()){toast('Le modèle doit avoir un nom.',true);tab='general';draw();return;}
    if(!F.some(f=>f.active!==false&&f.name.trim())){toast('Gardez au moins une finition active.',true);tab='finitions';draw();return;}
    if(M.visible!==false&&!M.file&&!M.glb_url){toast('Ajoutez un fichier 3D avant de rendre ce modèle visible.',true);tab='3d';draw();return;}
    const codes=new Set();
    const rows=F.map((f,i)=>{let code=f.code;if(!code){code=slug(f.name);while(codes.has(code)||F.some(x=>x!==f&&x.code===code))code+='-2';}codes.add(code);
      const props=Object.fromEntries(Object.entries(f.props||{}).filter(([,v])=>v!==undefined&&v!==null));
      return{id:f.id||id+'-finish-'+code,model_id:id,type:'finish',code,name:f.name.trim()||'Finition',price:+f.price||0,active:f.active!==false,position:i+1,props};});
    if(!rows.some(r=>r.active&&r.code===M.defaults.finish))M.defaults.finish=(rows.find(r=>r.active)||{}).code;
    await busy(e.currentTarget,async()=>{
      await db.update('models',id,{name:M.name.trim(),kind:M.kind,base_price:+M.base_price||0,weeks:+M.weeks||1,visible:M.visible!==false,sold_out:!!M.sold_out,glb_url:M.glb_url||null,
        anchors:M.anchors,defaults:M.defaults,story:M.story,updated_at:new Date().toISOString()});
      await db.upsert('options',rows);
      for(const r of removed)await db.remove('options',r);
      removed.length=0;F=rows;await Ad.loadCatalogue();
    });
    setDirty(false);toast('Modèle enregistré. Le site est à jour.');draw();
  };
}

/* =========================================================
   OPTIONS COMMUNES (accastillage, vernis, étuis)
   ========================================================= */
Ad.register('options',{title:'Options communes',async render(el){
  await Ad.loadCatalogue();
  const D={};['hardware','varnish','case'].forEach(t=>{D[t]=clone(S.options.filter(o=>o.type===t&&!o.model_id).sort((a,b)=>a.position-b.position));});
  const removed=[];
  const cols={
    hardware:[['Couleur',(o,p)=>p.orig?'<span class="faint small">Texture d’origine</span>':`<input type="color" data-k="color" value="${esc(p.color||'#cccccc')}">`],
      ['Brillance',(o,p)=>`<input type="range" data-k="rough" min="0.05" max="0.8" step="0.05" value="${p.rough==null?.3:p.rough}" title="À gauche : miroir, à droite : mat" style="min-width:90px">`],
      ['Texture d’origine',(o,p)=>`<input type="checkbox" data-k="orig"${p.orig?' checked':''} title="Garder la texture du fichier 3D">`]],
    varnish:[['Reflets',(o,p)=>`<input type="range" data-k="cc" min="0" max="1" step="0.05" value="${p.cc==null?1:p.cc}" title="Intensité du vernis" style="min-width:90px">`],
      ['Aspect',(o,p)=>`<input type="range" data-k="rough" min="0.1" max="0.8" step="0.05" value="${p.rough==null?.4:p.rough}" title="À gauche : brillant, à droite : satiné" style="min-width:90px">`]],
    case:[]
  };
  const table=t=>`<section class="card" style="margin-bottom:16px"><div class="card-h"><h2>${TYPE_NAMES[t]}</h2><button class="btn sm" data-add="${t}">${icon('plus')}Ajouter</button></div>
    <div class="table-wrap"><table class="t edit"><thead><tr><th>Nom</th>${cols[t].map(c=>`<th>${c[0]}</th>`).join('')}<th>Supplément (€)</th><th>Active</th><th></th></tr></thead><tbody>
    ${D[t].map((o,i)=>{const p=o.props=o.props||{};return`<tr data-t="${t}" data-i="${i}"><td><input data-k="name" value="${esc(o.name)}" style="min-width:160px" aria-label="Nom"></td>${cols[t].map(c=>`<td>${c[1](o,p)}</td>`).join('')}
      <td><input type="number" data-k="price" value="${o.price||0}" min="0" step="10" style="width:90px" aria-label="Supplément"></td><td><input type="checkbox" data-k="active"${o.active!==false?' checked':''} aria-label="Active"></td>
      <td><button class="btn sm icon ghost danger" data-del aria-label="Supprimer">${icon('x')}</button></td></tr>`;}).join('')}</tbody></table></div></section>`;
  const draw=()=>{$('#opts').innerHTML=['hardware','varnish','case'].map(table).join('');};
  el.innerHTML=`<div class="page-head"><div><h1>Options communes</h1><p class="sub">Proposées pour tous les modèles. Les finitions, elles, sont propres à chaque modèle.</p></div></div>
    <div id="opts"></div>${saveBar('Enregistrer les options')}`;
  draw();setDirty(false);
  el.oninput=el.onchange=e=>{const t=e.target,r=t.closest('[data-t]');if(!r||!t.dataset.k)return;const o=D[r.dataset.t][+r.dataset.i],p=o.props,k=t.dataset.k;
    if(k==='name')o.name=t.value;else if(k==='price')o.price=+t.value||0;else if(k==='active')o.active=t.checked;
    else if(k==='orig'){if(t.checked)p.orig=true;else delete p.orig;if(e.type==='change')draw();}
    else p[k]=t.type==='range'?+t.value:t.value;
    setDirty(true);};
  el.onclick=async e=>{
    const a=e.target.closest('[data-add]');if(a){const t=a.dataset.add;D[t].push({id:null,model_id:null,type:t,code:null,name:'Nouvelle option',price:0,active:true,props:t==='hardware'?{color:'#bbbbbb',rough:.3}:t==='varnish'?{cc:.6,ccr:.2,rough:.45}:{}});setDirty(true);draw();return;}
    const d=e.target.closest('[data-del]');if(d){const r=d.closest('[data-t]'),t=r.dataset.t,o=D[t][+r.dataset.i];
      if(D[t].filter(x=>x.active!==false).length<=1&&o.active!==false){toast('Gardez au moins une option active de chaque sorte.',true);return;}
      if(o.code&&await usedIn(t,o.code)&&!confirm('Des commandes utilisent « '+o.name+' ». Elles restent intactes. Supprimer quand même ?'))return;
      if(o.id)removed.push(o.id);D[t].splice(+r.dataset.i,1);setDirty(true);draw();}};
  $('#save-btn').onclick=async e=>{
    for(const t in D)if(!D[t].some(o=>o.active!==false)){toast('Gardez au moins une option active pour : '+TYPE_NAMES[t]+'.',true);return;}
    const rows=[];for(const t in D)D[t].forEach((o,i)=>{let code=o.code;if(!code){code=slug(o.name);while(D[t].some(x=>x!==o&&x.code===code))code+='-2';o.code=code;}
      rows.push({id:o.id||t+'-'+code,model_id:null,type:t,code,name:o.name.trim()||'Option',price:+o.price||0,active:o.active!==false,position:i+1,props:o.props||{}});o.id=o.id||t+'-'+code;});
    await busy(e.currentTarget,async()=>{await db.upsert('options',rows);for(const r of removed)await db.remove('options',r);removed.length=0;await Ad.loadCatalogue();});
    setDirty(false);toast('Options enregistrées.');};
}});

/* =========================================================
   TEXTES DU SITE
   ========================================================= */
Ad.register('contenu',{title:'Textes du site',async render(el){
  await Ad.loadCatalogue();
  const C=clone(S.content),groups=[...new Set(C.map(c=>c.section))];
  el.innerHTML=`<div class="page-head"><div><h1>Textes du site</h1><p class="sub">Les phrases principales de la page d'accueil. Les coordonnées et horaires sont dans <a href="#/reglages">Réglages</a>.</p></div>
    <div class="actions"><a class="btn" href="../index.html" target="_blank" rel="noopener">${icon('out')}Voir le site</a></div></div>
    <div class="stack">${groups.map(g=>`<section class="card"><div class="card-h"><h2>${esc(g)}</h2></div><div class="card-b form cols">
      ${C.filter(c=>c.section===g).map(c=>field(esc(c.label),c.long?`<textarea data-id="${esc(c.id)}" rows="3">${esc(c.value)}</textarea>`:`<input data-id="${esc(c.id)}" value="${esc(c.value)}">`,'',c.long?'full':'')).join('')}</div></section>`).join('')}</div>
    ${saveBar('Enregistrer les textes')}`;
  setDirty(false);
  el.oninput=e=>{const id=e.target.dataset.id;if(!id)return;C.find(c=>c.id===id).value=e.target.value;setDirty(true);};
  $('#save-btn').onclick=async e=>{const changed=C.filter(c=>{const o=S.content.find(x=>x.id===c.id);return!o||o.value!==c.value;});
    if(!changed.length){toast('Aucun changement.');return;}
    await busy(e.currentTarget,async()=>{await db.upsert('content',changed);await Ad.loadCatalogue();});setDirty(false);toast('Textes enregistrés. Le site est à jour.');};
}});

/* =========================================================
   RÉGLAGES
   ========================================================= */
Ad.register('reglages',{title:'Réglages',async render(el){
  await Ad.loadCatalogue();
  const s=S.settings,own=isOwner();
  let admins=[];if(Ad.A.LIVE&&own){try{admins=await db.list('admins');}catch(e){}}
  const pct=Math.round((s.deposit_rate!=null?+s.deposit_rate:.3)*100);
  el.innerHTML=`<div class="page-head"><div><h1>Réglages</h1><p class="sub">Fonctionnement de l'atelier et du site.</p></div></div>
  ${own?'':'<div class="note warn" style="margin-bottom:16px">Seul le compte propriétaire peut modifier les réglages.</div>'}
  <form id="set-form" class="stack">
    <fieldset ${own?'':'disabled'} style="border:0;padding:0;margin:0;min-width:0" class="stack">
    <section class="card"><div class="card-h"><h2>Commandes</h2></div><div class="card-b form cols">
      <div class="full stack" style="gap:12px">${sw('orders_open',s.orders_open!==false,'Commandes ouvertes sur le site (sinon, le bouton propose la liste d’attente)')}${sw('show_remaining',s.show_remaining!==false,'Afficher les places restantes dans le configurateur')}</div>
      ${field('Instruments par an',inp('capacity',s.capacity||8,'number','min="1" step="1"'),'Au-delà, le site affiche « complet » et propose la liste d’attente.')}
      ${field('Acompte (%)',inp('deposit_pct',pct,'number','min="0" max="100" step="1"'),'Pensez à reporter le taux dans les CGV.')}
      ${field('Semaines en plus pour une laque',inp('lacquer_weeks',s.lacquer_weeks!=null?s.lacquer_weeks:2,'number','min="0" step="1"'))}
    </div></section>
    <section class="card"><div class="card-h"><h2>Mode congés</h2></div><div class="card-b form cols">
      <div class="full">${sw('vacation',s.vacation,'Afficher un bandeau « atelier fermé » sur tout le site')}</div>
      ${field('Retour le',inp('vacation_until',s.vacation_until,'date'))}
      ${field('Message',area('vacation_message',s.vacation_message,'rows="2"'),'La date de retour est ajoutée automatiquement.','full')}
    </div></section>
    <section class="card"><div class="card-h"><h2>Coordonnées affichées</h2></div><div class="card-b form cols">
      ${field('E-mail',inp('email',s.email,'email'))}${field('Téléphone',inp('phone',s.phone,'tel'))}
      ${field('Horaires',inp('hours',s.hours),'',"full")}${field('Adresse de l’atelier',inp('address',s.address),'Utilisée aussi sur les factures et les rendez-vous.','full')}
    </div></section>
    <section class="card"><div class="card-h"><h2>Facturation</h2></div><div class="card-b form cols3">
      ${field('Raison sociale',inp('company',s.company))}${field('SIRET',inp('siret',s.siret))}${field('TVA (%)',inp('vat_rate',s.vat_rate!=null?s.vat_rate:20,'number','min="0" step="0.1"'),'0 = TVA non applicable (micro-entreprise).')}
      ${field('Titulaire du compte',inp('bank_holder',s.bank_holder))}${field('IBAN',inp('iban',s.iban))}${field('BIC',inp('bic',s.bic))}
    </div></section>
    <section class="card"><div class="card-h"><h2>Suivi des clients</h2></div><div class="card-b form cols">
      ${field('Entretien conseillé tous les (mois)',inp('maintenance_months',s.maintenance_months||12,'number','min="1" step="1"'))}
      ${field('Garantie (ans)',inp('warranty_years',s.warranty_years||2,'number','min="0" step="1"'))}
    </div></section>
    </fieldset>
  </form>
  ${own?saveBar('Enregistrer les réglages'):''}
  <div class="grid g2" style="margin-top:16px">
    <section class="card"><div class="card-h"><h2>Comptes de l'administration</h2></div><div class="card-b stack" style="gap:12px">
      ${Ad.A.LIVE?(own?`<div class="list" style="margin:0 -16px">${admins.map(a=>`<div><div class="grow"><div class="t1">${esc(a.name||a.email)}</div><div class="t2">${esc(a.email)} · ${a.role==='proprietaire'?'propriétaire':'atelier'}</div></div>${a.email.toLowerCase()===S.me.email.toLowerCase()?'<span class="faint small">vous</span>':`<button class="btn sm ghost danger" data-del-admin="${a.id}">Retirer</button>`}</div>`).join('')}</div>
        <form id="adm-form" class="form cols3">${field('E-mail',inp('email','','email'))}${field('Nom',inp('name',''))}${field('Rôle',sel('role','atelier',[['atelier','Atelier (sans réglages)'],['proprietaire','Propriétaire']]))}<div class="full row" style="justify-content:flex-end"><button class="btn" type="submit">Autoriser ce compte</button></div></form>
        <p class="small faint">Puis invitez la personne dans Supabase › Authentication › Users › Invite user : elle reçoit un lien pour choisir son mot de passe.</p>`
        :'<p class="muted">Réservé au compte propriétaire.</p>')
      :'<p class="muted">En démonstration, l’accès n’est pas protégé. Une fois Supabase relié, chaque personne a son propre compte et son rôle (propriétaire ou atelier).</p>'}
    </div></section>
    <section class="card"><div class="card-h"><h2>Données</h2></div><div class="card-b stack" style="gap:12px">
      <p class="small muted">${Ad.A.LIVE?'Base de données reliée : <span class="mono">'+esc((window.AUBIER_SUPABASE||{}).url||'')+'</span>':'Mode démonstration : les données vivent dans ce navigateur.'}</p>
      <div class="row"><button class="btn" data-act="backup">${icon('down')}Télécharger une sauvegarde</button>${Ad.A.LIVE?'':`<button class="btn danger" data-act="reset">Réinitialiser la démonstration</button>`}</div>
      <label class="check small"><input type="checkbox" id="notrack"${localStorage.getItem('aubier-notrack')==='1'?' checked':''}> Ne pas compter mes visites sur cet appareil</label>
    </div></section>
  </div>`;
  setDirty(false);
  const f=$('#set-form');f.oninput=f.onchange=()=>setDirty(true);
  if(own)$('#save-btn').onclick=async e=>{const v=readForm(f);
    const data=Object.assign({},s,v,{deposit_rate:Math.min(100,Math.max(0,v.deposit_pct||0))/100});delete data.deposit_pct;
    ['capacity','lacquer_weeks','maintenance_months','warranty_years','vat_rate'].forEach(k=>{data[k]=data[k]==null?s[k]:+data[k];});
    await busy(e.currentTarget,async()=>{await db.update('settings',1,{data,updated_at:new Date().toISOString()});await Ad.loadCatalogue();});setDirty(false);toast('Réglages enregistrés.');};
  const af=$('#adm-form');if(af)af.onsubmit=async e=>{e.preventDefault();const v=readForm(af);if(!v.email){toast('Indiquez un e-mail.',true);return;}
    await busy(e.submitter,()=>db.insert('admins',{email:v.email.toLowerCase(),name:v.name||null,role:v.role}));toast('Compte autorisé. Invitez-le maintenant depuis Supabase.');Ad.reload();};
  $('#notrack').onchange=e=>{try{localStorage.setItem('aubier-notrack',e.target.checked?'1':'0');}catch(x){}toast(e.target.checked?'Vos visites ne sont plus comptées sur cet appareil.':'Vos visites sont à nouveau comptées.');};
  el.onclick=async e=>{
    const da=e.target.closest('[data-del-admin]');if(da){if(confirm('Retirer l’accès à ce compte ?')){await busy(da,()=>db.remove('admins',da.dataset.delAdmin));Ad.reload();}return;}
    const b=e.target.closest('[data-act]');if(!b)return;
    if(b.dataset.act==='backup'){const out={exporte_le:new Date().toISOString()};
      await busy(b,async()=>{for(const t of['settings','content','models','options','clients','orders','order_updates','requests','waitlist','wood'])out[t]=await db.list(t);});
      download('sauvegarde-aubier-'+isoDay()+'.json',JSON.stringify(out,null,1),'application/json');}
    if(b.dataset.act==='reset'&&confirm('Effacer toutes les données de démonstration de ce navigateur et repartir du jeu de départ ?')){window.AdminDemo.reset();await Ad.loadCatalogue();toast('Démonstration réinitialisée.');Ad.go('tableau');}
  };
}});
})();
