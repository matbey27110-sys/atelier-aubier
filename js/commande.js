/* =========================================================
   COMMANDE : coordonnées → acompte → confirmation
   Le configurateur dépose un récapitulatif dans le navigateur (clé « aubier-commande »).

   MODE DÉMONSTRATION : le paiement est simulé.
   Mise en production avec Stripe :
   1. Créer un petit service (par ex. fonction Netlify ou Vercel) « /api/checkout » qui reçoit
      { config, client }, RECALCULE le prix à partir de config (ne jamais utiliser le montant
      envoyé par le navigateur), crée une session Stripe Checkout et renvoie son url.
   2. Passer DEMO à false : le bouton « Payer » redirige alors vers la page sécurisée de Stripe,
      qui revient sur commande.html?ok=1 après paiement.
   ========================================================= */
(()=>{
'use strict';
const DEMO=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const euro=n=>new Intl.NumberFormat('fr-FR').format(n)+' €';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

let D=null;
try{D=JSON.parse(localStorage.getItem('aubier-commande')||'null');}catch(e){}
if(!D||!D.total){$('#order-empty').hidden=false;return;}
$('#order-flow').hidden=false;

/* ---------- Récapitulatif ---------- */
const balance=D.total-D.deposit;
$('#r-model').textContent=D.model;$('#r-kind').textContent=D.kind;
const sw=$('#r-swatch');if(D.swatch)sw.style.background=D.swatch;else sw.classList.add('wood');
$('#r-lines').innerHTML=D.lines.map(([l,p],i)=>`<li><span>${l}</span><span>${i===0?euro(p):p?'+ '+euro(p):'Inclus'}</span></li>`).join('');
$('#r-total').textContent=euro(D.total);$('#r-deposit').textContent=euro(D.deposit);
$('#r-rate').textContent=Math.round(D.rate*100);$('#r-balance').textContent=euro(balance);
$('#r-weeks').textContent='Fabrication : '+D.weeks+' semaines environ';
$('#pay-label').textContent="Payer l'acompte de "+euro(D.deposit);

/* Téléphone : récapitulatif replié dans un bandeau, ouvert au toucher */
const tg=$('#sum-toggle');
$('#t-model').textContent=D.model+' · '+euro(D.total);$('#t-deposit').textContent=euro(D.deposit);
tg.addEventListener('click',()=>{const o=tg.getAttribute('aria-expanded')!=='true';tg.setAttribute('aria-expanded',o);
  tg.querySelector('small').textContent=o?'Masquer le récapitulatif':'Voir le récapitulatif';$('.order-sum').classList.toggle('open',o);});

/* Numéro de commande, gardé si on recharge la page */
let num=sessionStorage.getItem('aubier-num');
if(!num){num='AUB-'+new Date().getFullYear()+'-'+String(Math.floor(1000+Math.random()*9000));try{sessionStorage.setItem('aubier-num',num);}catch(e){}}
$('#wire-ref').textContent=num;

/* ---------- Étapes ---------- */
const go=n=>{
  [1,2,3].forEach(i=>{$('#step-'+i).hidden=i!==n;});
  $$('.steps-bar li').forEach(li=>{const s=+li.dataset.step;li.classList.toggle('on',s===n);li.classList.toggle('past',s<n);});
  const top=$('.order-head').getBoundingClientRect().top+scrollY-100;
  if(scrollY>top)scrollTo({top,behavior:reduce?'auto':'smooth'});
  const first=$('#step-'+n+' input:not([type=radio]),#step-'+n+' h2');if(first&&n!==3)first.focus({preventScroll:true});
};

/* Étape 1 : coordonnées */
const f1=$('#step-1'),addr=$('#o-addr');
const isLiv=()=>f1.delivery.value==='livraison';
f1.addEventListener('change',e=>{if(e.target.name==='delivery'){addr.hidden=!isLiv();}});
const okMail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const need=(el,msg,st)=>{if(!el.value.trim()){st.textContent=msg;el.focus();return false;}return true;};
f1.addEventListener('submit',e=>{
  e.preventDefault();const s=$('#s1-status');s.textContent='';
  if(!need(f1.first,'Indiquez votre prénom.',s)||!need(f1.last,'Indiquez votre nom.',s))return;
  if(!okMail(f1.email.value)){s.textContent='Indiquez une adresse e-mail valide.';f1.email.focus();return;}
  if(f1.tel.value.replace(/\D/g,'').length<9){s.textContent='Indiquez un numéro de téléphone valide.';f1.tel.focus();return;}
  if(isLiv()){
    if(!need(f1.street,"Indiquez l'adresse de livraison.",s))return;
    if(!/^\d{5}$/.test(f1.zip.value.trim())){s.textContent='Indiquez un code postal à 5 chiffres.';f1.zip.focus();return;}
    if(!need(f1.city,'Indiquez la ville.',s))return;
  }
  go(2);
});

/* Étape 2 : acompte */
const f2=$('#step-2');
$('#back-1').addEventListener('click',()=>go(1));
f2.addEventListener('change',e=>{if(e.target.name==='pay'){const card=f2.pay.value==='carte';$('#pay-card').hidden=!card;$('#pay-wire').hidden=card;
  $('#pay-label').textContent=card?"Payer l'acompte de "+euro(D.deposit):'Confirmer la commande';}});
/* Mise en forme des champs carte */
f2.cc.addEventListener('input',()=>{f2.cc.value=f2.cc.value.replace(/\D/g,'').slice(0,16).replace(/(\d{4})(?=\d)/g,'$1 ');});
f2.exp.addEventListener('input',()=>{const d=f2.exp.value.replace(/\D/g,'').slice(0,4);f2.exp.value=d.length>2?d.slice(0,2)+' / '+d.slice(2):d;});
f2.cvc.addEventListener('input',()=>{f2.cvc.value=f2.cvc.value.replace(/\D/g,'').slice(0,4);});

f2.addEventListener('submit',e=>{
  e.preventDefault();const s=$('#s2-status');s.textContent='';
  const card=f2.pay.value==='carte';
  if(card){
    if(f2.cc.value.replace(/\D/g,'').length!==16){s.textContent='Le numéro de carte doit comporter 16 chiffres.';f2.cc.focus();return;}
    const m=f2.exp.value.match(/^(\d{2}) \/ (\d{2})$/),now=new Date();
    const valid=m&&+m[1]>=1&&+m[1]<=12&&new Date(2000+ +m[2],+m[1])>now;
    if(!valid){s.textContent="Indiquez une date d'expiration valide (MM / AA).";f2.exp.focus();return;}
    if(f2.cvc.value.length<3){s.textContent='Le cryptogramme comporte 3 chiffres.';f2.cvc.focus();return;}
  }
  if(!f2.cgv.checked){s.textContent='Acceptez les conditions générales de vente pour continuer.';f2.cgv.focus();return;}

  if(!DEMO){/* Production : redirection vers Stripe Checkout (voir en haut du fichier) */
    fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({config:D.config,order:num,client:Object.fromEntries(new FormData(f1))})})
      .then(r=>r.json()).then(r=>{location.href=r.url;}).catch(()=>{s.textContent='Le paiement est momentanément indisponible. Réessayez dans un instant.';});
    return;
  }
  /* Démonstration : simule le temps de traitement du paiement */
  const btn=$('#pay-btn');btn.disabled=true;btn.classList.add('busy');$('#pay-label').textContent=card?'Paiement en cours…':'Enregistrement…';
  setTimeout(()=>confirmOrder(card),reduce?0:1400);
});

function confirmOrder(card){
  $('#d-num').textContent=num;
  $('#d-title').textContent='Merci, '+f1.first.value.trim()+'.';
  $('#d-lead').textContent=card
    ?'Votre acompte de '+euro(D.deposit)+' est bien reçu. Votre '+D.model+' entre dans le carnet de commandes de l\'atelier. Un récapitulatif vous est envoyé à '+f1.email.value.trim()+'.'
    :'Votre commande est enregistrée. Elle sera confirmée à réception du virement de '+euro(D.deposit)+', avec la référence '+num+'. Un récapitulatif vous est envoyé à '+f1.email.value.trim()+'.';
  $('#d-weeks').textContent='Environ '+D.weeks+' semaines';
  $('#d-delivery').textContent=isLiv()?'Livraison en main propre à '+f1.city.value.trim()+'.':"Retrait à l'atelier, avec un essai et les derniers réglages.";
  $('#d-balance').textContent=euro(balance);
  try{localStorage.removeItem('aubier-commande');sessionStorage.removeItem('aubier-num');}catch(e){}
  go(3);
}
})();
