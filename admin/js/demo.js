/* =========================================================
   MODE DÉMONSTRATION : données fictives réalistes
   Créées une seule fois dans ce navigateur, au premier passage dans l'admin.
   Les commandes et demandes faites sur le site (dans ce même navigateur) s'y ajoutent.
   Inutile avec Supabase : ce fichier n'est alors jamais utilisé.
   ========================================================= */
(function(){
'use strict';
const A=window.Aubier,L=A.local;
const FLAG='aubier-db-seeded-v1';
/* Hasard reproductible : la démo est la même à chaque réinitialisation */
let seed=20260301;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;
const pick=a=>a[Math.floor(rnd()*a.length)];
const weighted=pairs=>{const t=pairs.reduce((s,p)=>s+p[1],0);let r=rnd()*t;for(const[v,w]of pairs){if((r-=w)<0)return v;}return pairs[0][0];};
const uid=()=>'d'+Math.floor(rnd()*1e12).toString(36)+Math.floor(rnd()*1e12).toString(36);
const day=n=>{const d=new Date();d.setHours(10+Math.floor(rnd()*8),Math.floor(rnd()*60),0,0);d.setDate(d.getDate()+n);return d;};
const iso=n=>day(n).toISOString();
const date=n=>{const d=day(n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

function seedAll(){
  seed=20260301;
  const cat=A.BUILTIN,Y=new Date().getFullYear();
  /* ----- Clients ----- */
  const people=[
    ['Louise','Marchal','louise.marchal@exemple.fr','06 12 48 73 20','14 rue des Tanneurs','69001','Lyon'],
    ['Antoine','Royer','antoine.royer@exemple.fr','06 77 21 09 45','3 allée des Platanes','33000','Bordeaux'],
    ['Inès','Belkacem','ines.belkacem@exemple.fr','07 54 33 18 62','28 boulevard Voltaire','75011','Paris'],
    ['Hugo','Lemaire','hugo.lemaire@exemple.fr','06 45 90 12 37','9 rue de la Forge','44000','Nantes'],
    ['Claire','Vasseur','claire.vasseur@exemple.fr','06 88 02 41 76','52 avenue Jean-Jaurès','31000','Toulouse'],
    ['Malik','Diallo','malik.diallo@exemple.fr','07 61 27 84 03','6 place du Marché','13001','Marseille'],
    ['Jeanne','Fournier','jeanne.fournier@exemple.fr','06 30 75 68 14','17 rue Saint-Michel','35000','Rennes'],
    ['Théo','Garnier','theo.garnier@exemple.fr','06 92 16 47 58','40 rue Nationale','59000','Lille'],
    ['Sarah','Weber','sarah.weber@exemple.fr','07 23 58 90 41','11 quai des Bateliers','67000','Strasbourg'],
    ['Paul','Moreau','paul.moreau@exemple.fr','06 14 67 32 89','23 rue Oberkampf','75011','Paris'],
    ['Camille','Roux','camille.roux@exemple.fr','06 51 84 26 70','8 rue du Port','06000','Nice'],
    ['Nathan','Petit','nathan.petit@exemple.fr','07 89 40 15 62','31 avenue de la Gare','21000','Dijon']
  ];
  const clients=people.map((p,i)=>({id:'c'+(i+1),first_name:p[0],last_name:p[1],email:p[2],phone:p[3],street:p[4],zip:p[5],city:p[6],notes:null,created_at:iso(-420+i*30)}));
  clients[0].notes='Gauchère. Profil de manche en C fin, cordes 12-53.';
  clients[3].notes='Joue surtout en slap, préfère une action basse.';
  clients[6].notes='Venue avec son professeur pour l’essai.';

  /* ----- Commandes ----- */
  const q=cfg=>A.quote(cat,cfg);
  const mk=(n,year,ci,cfg,stage,opts)=>{const r=q(cfg),o=opts||{};
    return Object.assign({id:'o'+n,ref:'AUB-'+year+'-'+String(n).padStart(4,'0'),client_id:'c'+ci,model_id:cfg.model,config:cfg,lines:r.lines,total:r.total,deposit:r.deposit,deposit_rate:r.rate,weeks:r.weeks,
      pay_method:'carte',delivery:'atelier',address:null,client_notes:null,stage,deposit_paid_at:null,balance_paid_at:null,due_date:null,delivered_at:null,serial:null,
      last_service_at:null,last_reminder_at:null,notes:null,source:'site'},o);};
  const ly=Y-1;
  const orders=[
    mk(5,ly,4,{model:'fonderie',finish:'fume',hardware:'noir',varnish:'satine',case:'rigide'},'livree',{created_at:iso(-560),deposit_paid_at:iso(-558),balance_paid_at:iso(-450),due_date:date(-452),delivered_at:date(-450),serial:'AUB-021',last_service_at:date(-95)}),
    mk(7,ly,1,{model:'brume',finish:'cerise',hardware:'or',varnish:'brillant',case:'cuir'},'livree',{created_at:iso(-470),deposit_paid_at:iso(-468),balance_paid_at:iso(-372),due_date:date(-374),delivered_at:date(-372),serial:'AUB-023',client_notes:'Instrument pour gaucher.'}),
    mk(1,Y,10,{model:'nocturne',finish:'bordeaux',hardware:'nickel',varnish:'brillant',case:'rigide'},'livree',{created_at:iso(-230),deposit_paid_at:iso(-229),balance_paid_at:iso(-92),due_date:date(-95),delivered_at:date(-92),serial:'AUB-027',delivery:'livraison',address:{street:'23 rue Oberkampf',zip:'75011',city:'Paris'}}),
    mk(2,Y,3,{model:'brume',finish:'ambre',hardware:'or',varnish:'brillant',case:'cuir'},'prete',{created_at:iso(-110),deposit_paid_at:iso(-109),due_date:date(5),serial:'AUB-028',notes:'Réglage final fait. Prévoir un jeu de cordes de rechange.'}),
    mk(3,Y,2,{model:'fonderie',finish:'miel',hardware:'nickel',varnish:'satine',case:'rigide'},'vernis',{created_at:iso(-80),deposit_paid_at:iso(-80),due_date:date(32),pay_method:'virement',delivery:'livraison',address:{street:'3 allée des Platanes',zip:'33000',city:'Bordeaux'}}),
    mk(4,Y,7,{model:'brume',finish:'tabac',hardware:'nickel',varnish:'satine',case:'rigide'},'manche',{created_at:iso(-52),deposit_paid_at:iso(-51),due_date:date(46),client_notes:'Manche un peu plus épais si possible.'}),
    mk(6,Y,9,{model:'nocturne',finish:'tabac',hardware:'or',varnish:'brillant',case:'cuir'},'bois',{created_at:iso(-8),deposit_paid_at:iso(-7),due_date:date(77)}),
    mk(8,Y,12,{model:'brume',finish:'nuit',hardware:'noir',varnish:'brillant',case:'rigide'},'attente_acompte',{created_at:iso(-2),pay_method:'virement',client_notes:'Je fais le virement en début de semaine.'}),
    mk(9,Y,5,{model:'nocturne',finish:'sapin',hardware:'nickel',varnish:'satine',case:'rigide'},'annulee',{created_at:iso(-150),notes:'Annulée à la demande du client avant acompte.'})
  ];
  const up=(o,stage,n,note)=>({id:uid(),order_id:o,stage,note,photo_url:null,public:true,created_at:iso(n)});
  const updates=[
    up('o2','bois',-105,'Table en épicéa de 2014 et fond en acajou choisis ensemble à l’atelier.'),
    up('o2','caisse',-84,'Barrage sculpté et accordé, la caisse est fermée.'),
    up('o2','manche',-60,'Manche profilé d’après vos mesures. Touche en palissandre posée.'),
    up('o2','vernis',-38,'Teinte ambre appliquée, vernis au tampon en cours (quarante passes).'),
    up('o2','reglages',-9,'Frettes polies, sillet et chevalet ajustés. Elle sonne très bien.'),
    up('o2','prete',-2,'Votre Brume est prête. Nous vous appelons pour fixer la remise.'),
    up('o3','bois',-76,'Érable échauffé sélectionné : un très beau marbrage.'),
    up('o3','caisse',-55,'Corps taillé et poncé, cavités des micros creusées.'),
    up('o3','manche',-30,'Manche multiplis contrecollé, renforts carbone posés.'),
    up('o3','vernis',-6,'Finition miel en cours de séchage.'),
    up('o4','bois',-48,'Bois choisis : épicéa et acajou.'),
    up('o4','caisse',-25,'Caisse fermée, filets posés.'),
    up('o4','manche',-3,'Le manche est en cours de sculpture, un peu plus épais comme demandé.'),
    up('o6','bois',-5,'Érable flammé tabac retenu : flamme serrée et régulière.')
  ];

  /* ----- Demandes ----- */
  const rq=(name,email,subject,message,status,n,extra)=>Object.assign({id:uid(),name,email,phone:null,subject,message,status,appointment_at:null,notes:null,created_at:iso(n)},extra||{});
  const rdv=(n,h)=>{const d=day(n);d.setHours(h,0,0,0);return d.toISOString();};
  const requests=[
    rq('Élodie Masson','elodie.masson@exemple.fr','Essayer un modèle à l’atelier','Bonjour, je joue en fingerpicking et j’hésite entre la Brume et une OM. Serait-il possible de venir essayer la Brume un samedi ?','nouvelle',-1),
    rq('Karim Haddad','karim.haddad@exemple.fr','Entretien ou réparation','Ma Telecaster frise sur les cases 12 à 15 depuis l’hiver. Un réglage suffit-il ou faut-il rectifier les frettes ?','nouvelle',0),
    rq('Martine Colin','martine.colin@exemple.fr','Commande sur mesure','Je souhaite offrir une Nocturne à mon fils pour ses 30 ans. Peut-on prévoir une gravure sur la tête ?','repondue',-6),
    rq('Yanis Bernard','yanis.bernard@exemple.fr','Essayer un modèle à l’atelier','Bonjour, je voudrais essayer la Fonderie, je joue dans un groupe de funk.','rdv',-9,{appointment_at:rdv(3,14)}),
    rq('Agathe Dupuis','agathe.dupuis@exemple.fr','Commande sur mesure','Bonjour,\n\nJe souhaite échanger autour de cette configuration :\n\nModèle : Brume — Guitare folk, format parlor\nFinition : Laque Nuit\nAccastillage : Or mat\nVernis : Vernis brillant\nÉtui : Étui cuir cognac','rdv',-4,{appointment_at:rdv(6,11)}),
    rq('Lucas Fontaine','lucas.fontaine@exemple.fr','Autre demande','Proposez-vous des stages d’initiation à la lutherie ?','close',-30)
  ];

  /* ----- Liste d'attente ----- */
  const waitlist=[
    {id:uid(),name:'Romain Picard',email:'romain.picard@exemple.fr',model_id:'brume',note:'Intéressé par une Brume laque Nuit pour l’an prochain.',status:'attente',created_at:iso(-20)},
    {id:uid(),name:'Léa Gauthier',email:'lea.gauthier@exemple.fr',model_id:'nocturne',note:'Souhaite être prévenue dès qu’une place se libère.',status:'contacte',created_at:iso(-41)},
    {id:uid(),name:'Victor Chevalier',email:'victor.chevalier@exemple.fr',model_id:'fonderie',note:'',status:'attente',created_at:iso(-12)}
  ];

  /* ----- Stock de bois ----- */
  const W=(species,part,origin,quantity,unit,cut_year,location,min_qty,notes)=>({id:uid(),species,part,origin,quantity,unit,cut_year,location,min_qty,notes:notes||null,updated_at:iso(-Math.floor(rnd()*60))});
  const wood=[
    W('Épicéa d’Europe','Table','Val di Fiemme (Italie)',14,'tables',2014,'Étagère A1',6,'Qualité maître, fil très serré.'),
    W('Épicéa d’Europe','Table','Jura (France)',4,'tables',2018,'Étagère A2',6),
    W('Acajou','Fond et éclisses','Certifié FSC',7,'jeux',2015,'Étagère B1',4),
    W('Acajou','Manche','Certifié FSC',9,'pièces',2016,'Râtelier C',4),
    W('Palissandre de Santos','Touche','Bolivie, certifié',11,'pièces',2017,'Tiroir D2',5),
    W('Érable flammé','Table','Bosnie',3,'tables',2016,'Étagère A3',4,'Flamme 4A, réservé à la Nocturne.'),
    W('Érable échauffé','Table','Vosges (France)',2,'tables',2013,'Étagère A4',2,'Pièces rares, très marbrées.'),
    W('Érable','Manche','Canada',8,'pièces',2017,'Râtelier C',4),
    W('Ébène','Touche','Cameroun, certifié',6,'pièces',2015,'Tiroir D1',3),
    W('Os de bœuf','Sillet','France',40,'pièces',null,'Tiroir E',15),
    W('Noyer','Fond et éclisses','Dordogne (France)',2,'jeux',2019,'Étagère B2',2)
  ];

  /* ----- Statistiques de visite (90 jours) ----- */
  const events=[],models=['brume','nocturne','fonderie'];
  for(let d=-89;d<=0;d++){
    const dt=new Date();dt.setDate(dt.getDate()+d);const wd=dt.getDay();
    const base=14+(d+89)*.07+(wd===0||wd===6?6:0)+(rnd()-.5)*8+(d===-40||d===-39?22:0);
    const n=Math.max(4,Math.round(base));
    for(let v=0;v<n;v++){
      const sid=Math.floor(rnd()*1e12).toString(36);
      const source=weighted([['Google',38],['Instagram',26],['Direct',22],['Facebook',5],['Pinterest',4],['Bing',3],['Qwant',2]]);
      const device=weighted([['Mobile',58],['Ordinateur',36],['Tablette',6]]);
      const t=new Date(dt);t.setHours(8+Math.floor(rnd()*15),Math.floor(rnd()*60),Math.floor(rnd()*60),0);
      let ms=t.getTime();const at=()=>new Date(ms+=20000+rnd()*90000).toISOString();
      const ev=(type,path,model,data)=>events.push({at:at(),sid,type,path,source,device,model:model||null,data:data||null});
      ev('view','accueil');if(rnd()<.35)ev('view','accueil');
      const m=weighted([['brume',46],['nocturne',32],['fonderie',22]]);
      if(rnd()<.46)ev('anatomie','accueil',m);
      if(rnd()<.29){
        ev('view','configurateur');ev('config','configurateur');
        const k=1+Math.floor(rnd()*5);
        for(let i=0;i<k;i++){
          const kk=weighted([['finish',50],['hardware',25],['varnish',15],['case',10]]);
          const vals={finish:{brume:[['cerise',3],['tabac',2],['ambre',3],['nuit',4]],nocturne:[['ambre',2],['tabac',4],['nuit',3],['bordeaux',2],['sapin',2]],fonderie:[['naturel',3],['miel',2],['fume',3],['nuit',2]]}[m],
            hardware:[['nickel',3],['or',4],['noir',3]],varnish:[['brillant',5],['satine',3]],case:[['rigide',3],['cuir',2]]}[kk];
          ev('choice','configurateur',m,{k:kk,v:weighted(vals)});
        }
        if(rnd()<.12){ev('commander','configurateur',m);ev('view','commande');if(rnd()<.55){ev('checkout','commande',m);if(rnd()<.4)ev('order','commande',m);}}
      }
      if(rnd()<.05)ev('view',weighted([['cgv',2],['mentions-legales',1],['suivi',2]]));
      if(rnd()<.3){
        const mob=device==='Mobile';
        ev('vital','accueil',null,{name:'LCP',value:Math.round((mob?2300:1500)*(.7+rnd()*.9))});
        ev('vital','accueil',null,{name:'CLS',value:Math.round(rnd()*rnd()*120)/1000});
        ev('vital','accueil',null,{name:'INP',value:Math.round((mob?170:90)*(.5+rnd()*1.1))});
        ev('vital','accueil',null,{name:'TTFB',value:Math.round(180+rnd()*260)});
        ev('vital','accueil',null,{name:'LOAD',value:Math.round((mob?3100:2000)*(.7+rnd()*.8))});
        ev('load3d','accueil',pick(models),{ms:Math.round((mob?1900:1100)*(.6+rnd()*.9))});
      }
    }
  }

  /* Commandes passées sur le site avant ce premier passage : on leur donne un numéro libre */
  const before=L.read('orders'),taken=new Set(orders.map(o=>o.ref));
  before.forEach(o=>{if(!taken.has(o.ref))return;const y=o.ref.slice(4,8);
    const n=orders.concat(before).filter(x=>x.ref.startsWith('AUB-'+y+'-')).reduce((m,x)=>Math.max(m,+x.ref.slice(9)||0),0)+1;
    o.ref='AUB-'+y+'-'+String(n).padStart(4,'0');});
  L.write('orders',before);
  const add=(t,rows)=>L.write(t,L.read(t).concat(rows));
  add('clients',clients);add('orders',orders);add('order_updates',updates);add('requests',requests);add('waitlist',waitlist);add('wood',wood);
  L.write('events_demo',events);
  try{localStorage.setItem(FLAG,'1');}catch(e){}
}

window.AdminDemo={
  seed(){let done=false;try{done=localStorage.getItem(FLAG)==='1';}catch(e){}if(!done)seedAll();},
  /* Efface toutes les données de démonstration (catalogue compris) et recrée le jeu de départ */
  reset(){
    ['models','options','content','settings','clients','orders','order_updates','requests','waitlist','wood','events','events_demo','admins'].forEach(t=>{try{localStorage.removeItem(L.key(t));}catch(e){}});
    try{localStorage.removeItem(FLAG);}catch(e){}
    seedAll();
  }
};
})();
