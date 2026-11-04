/* Pages secondaires (mentions légales) : même header et même menu que l'accueil, sans la 3D */
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const menu=$('#menu'),ob=$('#menu-open');let menuT=0;
/* Ouverture : le rideau descend puis les liens montent un à un ; fermeture : le rideau remonte */
const setMenu=o=>{clearTimeout(menuT);ob.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':'';
  if(o){menu.hidden=false;void menu.offsetWidth;menu.classList.add('open');}
  else{menu.classList.remove('open');menuT=setTimeout(()=>{menu.hidden=true;},reduce?0:600);}};
ob.addEventListener('click',()=>setMenu(true));$('#menu-close').addEventListener('click',()=>setMenu(false));
$$('#menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)setMenu(false);});
/* Header : toujours visible, un filet apparaît dessous dès qu'on descend */
addEventListener('scroll',()=>{$('#top').classList.toggle('scrolled',scrollY>10);},{passive:true});
/* Retour : revient à la page précédente si elle fait partie du site, sinon à l'accueil */
$$('[data-back]').forEach(a=>a.addEventListener('click',e=>{
  let fromSite=false;
  try{fromSite=!!document.referrer&&new URL(document.referrer).origin===location.origin&&document.referrer!==location.href;}catch(_){}
  if(fromSite&&history.length>1){e.preventDefault();history.back();}
}));
/* Textes et coordonnées venant de l'admin, bandeau « congés », statistiques de visite */
if(window.Aubier){
  if(document.body.dataset.page)Aubier.setPage(document.body.dataset.page);
  Aubier.catalogue().then(c=>Aubier.applySite(c),()=>{});
  Aubier.track('view');Aubier.vitals();
}
})();
