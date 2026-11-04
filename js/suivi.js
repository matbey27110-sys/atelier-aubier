/* =========================================================
   SUIVRE MA COMMANDE
   Le client saisit son numéro et son e-mail ; la base ne répond que si les deux correspondent.
   Les étapes et les photos sont celles publiées depuis l'admin (case « visible par le client »).
   ========================================================= */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const euro=n=>new Intl.NumberFormat('fr-FR').format(n)+' €';
const day=d=>d?new Date(d.length===10?d+'T12:00':d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'';
const STEPS=[['attente_acompte','Acompte'],['bois','Choix des bois'],['caisse','Caisse'],['manche','Manche'],['vernis','Vernis'],['reglages','Réglages'],['prete','Prête'],['livree','Remise']];
const NAME=Object.fromEntries(STEPS);
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safeUrl=u=>/^(https?:|data:image\/)/i.test(u||'')?u:'';

const f=$('#track-form'),st=$('#t-status');
const q=new URLSearchParams(location.search);if(q.get('ref'))f.ref.value=q.get('ref');

f.addEventListener('submit',e=>{
  e.preventDefault();st.textContent='';
  const ref=f.ref.value.trim(),email=f.email.value.trim();
  if(!ref){st.textContent='Indiquez votre numéro de commande.';f.ref.focus();return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){st.textContent='Indiquez l’adresse e-mail utilisée pour la commande.';f.email.focus();return;}
  if(!window.Aubier){st.textContent='Le suivi est momentanément indisponible.';return;}
  st.textContent='Recherche…';
  Aubier.tracking(ref,email).then(o=>{
    if(!o){st.textContent='Aucune commande ne correspond à ce numéro et à cet e-mail.';$('#track-result').hidden=true;return;}
    st.textContent='';show(o);
  }).catch(()=>{st.textContent='Le suivi est momentanément indisponible. Réessayez dans un instant.';});
});

function show(o){
  $('#tr-ref').textContent='Commande '+o.ref;
  $('#tr-title').textContent=(o.first_name?o.first_name+', votre ':'Votre ')+o.model;
  const cancelled=o.stage==='annulee';
  $('#tr-meta').textContent=cancelled?'Cette commande a été annulée.':
    o.stage==='livree'?'Remise le '+day(o.delivered_at)+'.':
    o.due_date?'Remise prévue vers le '+day(o.due_date)+'.':'Commandée le '+day(o.created_at)+'.';
  $('#tr-pay').innerHTML=`<span>Total <b>${euro(o.total)}</b></span><span>Acompte ${esc(euro(o.deposit))} · <b>${o.deposit_paid?'reçu':'en attente'}</b></span><span>Solde ${esc(euro(o.total-o.deposit))} · <b>${o.balance_paid?'réglé':'à la remise'}</b></span>`;
  const cur=STEPS.findIndex(s=>s[0]===o.stage);
  $('#tr-steps').innerHTML=cancelled?'':STEPS.map((s,i)=>`<li class="${i<cur?'past':i===cur?'on':''}"${i===cur?' aria-current="step"':''}>${s[1]}</li>`).join('');
  const ups=o.updates||[];
  $('#tr-log').innerHTML=ups.length?ups.map(u=>`<article><time>${day(u.created_at)}</time><div><h3>${esc(NAME[u.stage]||'Nouvelles de l’atelier')}</h3>${u.note?`<p>${esc(u.note)}</p>`:''}${safeUrl(u.photo_url)?`<img src="${esc(safeUrl(u.photo_url))}" alt="Photo de l'atelier" loading="lazy">`:''}</div></article>`).join(''):
    '<p class="track-empty">Les nouvelles de l’atelier et les photos des grandes étapes apparaîtront ici.</p>';
  $('#track-result').hidden=false;
  $('#track-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
})();
