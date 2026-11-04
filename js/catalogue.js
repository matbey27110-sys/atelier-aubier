/* =========================================================
   CATALOGUE DE RÉFÉRENCE
   Modèles, options, réglages et textes du site, tels qu'à la création.
   - Sans base de données (mode démonstration), le site utilise ces données.
   - Avec Supabase, la base prend le relais : on modifie alors tout depuis l'admin.
   Le fichier supabase/schema.sql contient les mêmes données pour remplir la base.
   ========================================================= */
window.AUBIER_CATALOGUE={
 "models": [
  {
   "id": "brume",
   "name": "Brume",
   "kind": "Guitare folk, format parlor",
   "base_price": 3400,
   "weeks": 14,
   "position": 1,
   "visible": true,
   "sold_out": false,
   "glb_url": null,
   "file": "assets/modeles/brume.js",
   "anchors": {
    "head": [
     0,
     0.925,
     0.3
    ],
    "nut": [
     0,
     0.84,
     0.6
    ],
    "neck": [
     0,
     0.62,
     0.6
    ],
    "body": [
     0,
     0.36,
     0.9
    ],
    "bridge": [
     0,
     0.17,
     0.95
    ],
    "center": [
     0,
     0.5,
     0
    ]
   },
   "defaults": {
    "finish": "cerise",
    "hardware": "or",
    "varnish": "brillant",
    "case": "rigide"
   },
   "story": [
    {
     "a": "center",
     "d": "fit",
     "az": 24,
     "el": 6,
     "part": "Vue d'ensemble",
     "t": "Brume",
     "x": "Guitare folk, format parlor.",
     "p": "Une caisse compacte, une voix précise et chaude. Le format parlor se joue contre le corps, au salon comme sur scène, et répond à la moindre attaque des doigts.",
     "s": "Diapason 630 mm · 19 cases · 12 hors caisse"
    },
    {
     "a": "head",
     "d": 0.34,
     "az": -26,
     "el": 10,
     "part": "La tête",
     "t": "La tête à fentes",
     "p": "Tête ajourée à l'ancienne, mécaniques à bain d'huile et boutons tournés. La corde passe par le fût, sans contrainte sur le sillet.",
     "s": "Un dessin de tête propre à l'atelier."
    },
    {
     "a": "nut",
     "d": 0.17,
     "az": 30,
     "el": 22,
     "part": "Le sillet",
     "t": "Le sillet",
     "p": "La pièce qui guide chaque corde. Taillé dans l'os, entaillé au dixième de millimètre pour une justesse parfaite en première position.",
     "s": "Os massif, jamais de plastique."
    },
    {
     "a": "neck",
     "d": 0.44,
     "az": 58,
     "el": 8,
     "part": "Le manche",
     "t": "Le manche et la touche",
     "p": "Acajou d'une seule pièce, profil sculpté à la main d'après vos mesures. Touche en palissandre, frettes polies une à une.",
     "s": "Profil en C ou en V, ajusté à votre main."
    },
    {
     "a": "body",
     "d": 0.36,
     "az": -6,
     "el": 18,
     "part": "La table et la rosace",
     "t": "La table",
     "p": "Épicéa massif séché dix ans, teinté à la main en dégradé cerise. Barrage sculpté et accordé au tapotement, jusqu'à ce que la table sonne juste.",
     "s": "Filets et rosace en nacre d'abalone, marquetés à la main."
    },
    {
     "a": "bridge",
     "d": 0.24,
     "az": -28,
     "el": 30,
     "part": "Le chevalet",
     "t": "Le chevalet",
     "p": "Palissandre massif et sillet de chevalet compensé, pour une intonation juste sur toute la longueur de la touche.",
     "s": "Chevilles en os, ajustées une à une."
    },
    {
     "a": "center",
     "d": "fit",
     "az": 172,
     "el": 6,
     "part": "Le fond",
     "t": "Le fond et les éclisses",
     "p": "Acajou appairé, vernis appliqué au tampon en quarante passes. Par la rosace, l'étiquette de l'atelier, signée et numérotée.",
     "s": "Chaque instrument porte son numéro."
    }
   ]
  },
  {
   "id": "nocturne",
   "name": "Nocturne",
   "kind": "Électrique demi-caisse",
   "base_price": 2900,
   "weeks": 12,
   "position": 2,
   "visible": true,
   "sold_out": false,
   "glb_url": null,
   "file": "assets/modeles/nocturne.js",
   "anchors": {
    "head": [
     0,
     0.93,
     0.3
    ],
    "nut": [
     0,
     0.86,
     0.6
    ],
    "neck": [
     0,
     0.62,
     0.6
    ],
    "body": [
     0,
     0.28,
     0.9
    ],
    "bridge": [
     0,
     0.15,
     0.95
    ],
    "knobs": [
     0.5,
     0.16,
     0.95
    ],
    "center": [
     0,
     0.5,
     0
    ]
   },
   "defaults": {
    "finish": "tabac",
    "hardware": "nickel",
    "varnish": "brillant",
    "case": "rigide"
   },
   "story": [
    {
     "a": "center",
     "d": "fit",
     "az": 24,
     "el": 6,
     "part": "Vue d'ensemble",
     "t": "Nocturne",
     "x": "Électrique demi-caisse.",
     "p": "Un corps creux à ouïes pour un son rond et aéré, du jazz au rock clair. Légère à l'épaule, généreuse à l'oreille.",
     "s": "Diapason 628 mm · 22 cases · ouïes en f"
    },
    {
     "a": "head",
     "d": 0.32,
     "az": -26,
     "el": 10,
     "part": "La tête",
     "t": "La tête",
     "p": "Placage teinté, mécaniques à démultiplication fine pour une tenue d'accord sans faille.",
     "s": "Fût et boutons dans le métal choisi."
    },
    {
     "a": "neck",
     "d": 0.44,
     "az": 58,
     "el": 10,
     "part": "Le manche",
     "t": "Le manche",
     "p": "Manche collé, touche à radius compensé, frettes polies une à une. L'accès reste libre jusqu'aux dernières cases.",
     "s": "Profil sculpté à la main."
    },
    {
     "a": "body",
     "d": 0.32,
     "az": -10,
     "el": 22,
     "part": "Les micros",
     "t": "Les micros",
     "p": "Deux micros double bobinage bobinés à l'atelier, réglés pour garder la voix du bois sous l'amplification.",
     "s": "Chaque bobinage est numéroté et mesuré."
    },
    {
     "a": "bridge",
     "d": 0.26,
     "az": -30,
     "el": 30,
     "part": "Le vibrato",
     "t": "Chevalet et vibrato",
     "p": "Un vibrato à ressort, souple et précis, monté sur un chevalet réglable. Le métal est usiné, puis traité dans la finition que vous choisissez.",
     "s": "Un vibrato qui revient juste."
    },
    {
     "a": "knobs",
     "d": 0.24,
     "az": 26,
     "el": 34,
     "part": "L'électronique",
     "t": "L'électronique",
     "p": "Volume et tonalité pour chaque micro, câblage tissé à l'ancienne, condensateurs papier huilé.",
     "s": "Boutons tournés dans le métal choisi."
    },
    {
     "a": "center",
     "d": "fit",
     "az": 190,
     "el": 6,
     "part": "Le corps",
     "t": "Le corps",
     "p": "Érable flammé sur caisse creuse, filet clair sur tout le contour. La flamme est choisie planche par planche à l'atelier.",
     "s": "Moins de 3,4 kg."
    }
   ]
  },
  {
   "id": "fonderie",
   "name": "Fonderie",
   "kind": "Basse, cinq cordes",
   "base_price": 3100,
   "weeks": 16,
   "position": 3,
   "visible": true,
   "sold_out": false,
   "glb_url": null,
   "file": "assets/modeles/fonderie.js",
   "anchors": {
    "head": [
     0,
     0.93,
     0.3
    ],
    "nut": [
     0,
     0.86,
     0.6
    ],
    "neck": [
     0,
     0.6,
     0.6
    ],
    "body": [
     0,
     0.2,
     0.9
    ],
    "bridge": [
     0,
     0.09,
     0.95
    ],
    "knobs": [
     0.45,
     0.16,
     0.95
    ],
    "center": [
     0,
     0.5,
     0
    ]
   },
   "defaults": {
    "finish": "naturel",
    "hardware": "nickel",
    "varnish": "satine",
    "case": "rigide"
   },
   "story": [
    {
     "a": "center",
     "d": "fit",
     "az": 24,
     "el": 6,
     "part": "Vue d'ensemble",
     "t": "Fonderie",
     "x": "Basse, cinq cordes.",
     "p": "Une basse à cinq cordes taillée pour tenir un groupe entier. Le grave est ferme, l'aigu reste lisible jusqu'en haut du manche.",
     "s": "Diapason 864 mm (34 pouces) · 24 cases"
    },
    {
     "a": "head",
     "d": 0.36,
     "az": -24,
     "el": 12,
     "part": "La tête",
     "t": "La tête",
     "p": "Tête compacte, mécaniques allégées. La basse reste équilibrée à la sangle et ne pique jamais du nez.",
     "s": "Un sillet à rouleaux pour une tenue d’accord parfaite."
    },
    {
     "a": "neck",
     "d": 0.52,
     "az": 60,
     "el": 10,
     "part": "Le manche",
     "t": "Le manche",
     "p": "Érable et bois sombre en plis contrecollés, renforcés de carbone. Un manche fin qui ne bouge pas, saison après saison.",
     "s": "Profil plat, pensé pour le jeu en slap."
    },
    {
     "a": "body",
     "d": 0.36,
     "az": -12,
     "el": 22,
     "part": "Les micros",
     "t": "Les micros",
     "p": "Deux micros double bobinage et un préampli actif ou passif, commutable selon la scène ou le studio.",
     "s": "Bobinés à l'atelier."
    },
    {
     "a": "bridge",
     "d": 0.26,
     "az": -30,
     "el": 30,
     "part": "Le chevalet",
     "t": "Le chevalet",
     "p": "Pontets individuels en laiton massif, réglables corde par corde en hauteur et en longueur.",
     "s": "Un contact franc entre la corde et le bois."
    },
    {
     "a": "center",
     "d": "fit",
     "az": 192,
     "el": 6,
     "part": "Le corps",
     "t": "Le corps",
     "p": "Érable échauffé : un bois rare, marbré par le temps, choisi pour son dessin. Chaque table est unique et ne se reproduira jamais.",
     "s": "Une table qui porte sa propre signature."
    }
   ]
  }
 ],
 "options": [
  {
   "id": "brume-finish-cerise",
   "model_id": "brume",
   "type": "finish",
   "code": "cerise",
   "name": "Cerise ombrée",
   "price": 0,
   "active": true,
   "position": 1,
   "props": {
    "swatch": "#5a1a10"
   }
  },
  {
   "id": "brume-finish-tabac",
   "model_id": "brume",
   "type": "finish",
   "code": "tabac",
   "name": "Tabac ombré",
   "price": 250,
   "active": true,
   "position": 2,
   "props": {
    "swatch": "#4a2a14",
    "tint": "#6b3a1a",
    "amt": 0.85
   }
  },
  {
   "id": "brume-finish-ambre",
   "model_id": "brume",
   "type": "finish",
   "code": "ambre",
   "name": "Ambre",
   "price": 250,
   "active": true,
   "position": 3,
   "props": {
    "swatch": "#a3642a",
    "tint": "#c27a32",
    "amt": 0.8
   }
  },
  {
   "id": "brume-finish-nuit",
   "model_id": "brume",
   "type": "finish",
   "code": "nuit",
   "name": "Laque Nuit",
   "price": 350,
   "active": true,
   "position": 4,
   "props": {
    "swatch": "#0d0c0e",
    "lac": "#0d0c0e"
   }
  },
  {
   "id": "nocturne-finish-ambre",
   "model_id": "nocturne",
   "type": "finish",
   "code": "ambre",
   "name": "Érable flammé ambre",
   "price": 0,
   "active": true,
   "position": 1,
   "props": {
    "wood": "flamme",
    "swatch": "wood:flamme"
   }
  },
  {
   "id": "nocturne-finish-tabac",
   "model_id": "nocturne",
   "type": "finish",
   "code": "tabac",
   "name": "Érable flammé tabac",
   "price": 300,
   "active": true,
   "position": 2,
   "props": {
    "wood": "flamme",
    "burst": true,
    "swatch": "wood:flammeb"
   }
  },
  {
   "id": "nocturne-finish-nuit",
   "model_id": "nocturne",
   "type": "finish",
   "code": "nuit",
   "name": "Laque Nuit",
   "price": 300,
   "active": true,
   "position": 3,
   "props": {
    "wood": "flamme",
    "lac": "#0c0c0e",
    "swatch": "#0c0c0e"
   }
  },
  {
   "id": "nocturne-finish-bordeaux",
   "model_id": "nocturne",
   "type": "finish",
   "code": "bordeaux",
   "name": "Laque Bordeaux",
   "price": 300,
   "active": true,
   "position": 4,
   "props": {
    "wood": "flamme",
    "lac": "#4a1320",
    "swatch": "#4a1320"
   }
  },
  {
   "id": "nocturne-finish-sapin",
   "model_id": "nocturne",
   "type": "finish",
   "code": "sapin",
   "name": "Laque Vert sapin",
   "price": 300,
   "active": true,
   "position": 5,
   "props": {
    "wood": "flamme",
    "lac": "#14302a",
    "swatch": "#14302a"
   }
  },
  {
   "id": "fonderie-finish-naturel",
   "model_id": "fonderie",
   "type": "finish",
   "code": "naturel",
   "name": "Érable échauffé naturel",
   "price": 0,
   "active": true,
   "position": 1,
   "props": {
    "swatch": "#cdb48c"
   }
  },
  {
   "id": "fonderie-finish-miel",
   "model_id": "fonderie",
   "type": "finish",
   "code": "miel",
   "name": "Miel",
   "price": 200,
   "active": true,
   "position": 2,
   "props": {
    "swatch": "#b07a35",
    "tint": "#c4842e",
    "amt": 0.6
   }
  },
  {
   "id": "fonderie-finish-fume",
   "model_id": "fonderie",
   "type": "finish",
   "code": "fume",
   "name": "Fumé",
   "price": 200,
   "active": true,
   "position": 3,
   "props": {
    "swatch": "#4a3a2e",
    "tint": "#4a3528",
    "amt": 0.85
   }
  },
  {
   "id": "fonderie-finish-nuit",
   "model_id": "fonderie",
   "type": "finish",
   "code": "nuit",
   "name": "Laque Nuit",
   "price": 350,
   "active": true,
   "position": 4,
   "props": {
    "swatch": "#0c0c0e",
    "lac": "#0c0c0e"
   }
  },
  {
   "id": "hardware-nickel",
   "model_id": null,
   "type": "hardware",
   "code": "nickel",
   "name": "Nickel",
   "price": 0,
   "active": true,
   "position": 1,
   "props": {
    "color": "#d0d0cb",
    "rough": 0.22,
    "orig": true
   }
  },
  {
   "id": "hardware-or",
   "model_id": null,
   "type": "hardware",
   "code": "or",
   "name": "Or mat",
   "price": 260,
   "active": true,
   "position": 2,
   "props": {
    "color": "#c9a65e",
    "rough": 0.3
   }
  },
  {
   "id": "hardware-noir",
   "model_id": null,
   "type": "hardware",
   "code": "noir",
   "name": "Noir satiné",
   "price": 120,
   "active": true,
   "position": 3,
   "props": {
    "color": "#232325",
    "rough": 0.4
   }
  },
  {
   "id": "varnish-brillant",
   "model_id": null,
   "type": "varnish",
   "code": "brillant",
   "name": "Vernis brillant",
   "price": 0,
   "active": true,
   "position": 1,
   "props": {
    "cc": 1,
    "ccr": 0.04,
    "rough": 0.32
   }
  },
  {
   "id": "varnish-satine",
   "model_id": null,
   "type": "varnish",
   "code": "satine",
   "name": "Vernis satiné",
   "price": 0,
   "active": true,
   "position": 2,
   "props": {
    "cc": 0.35,
    "ccr": 0.45,
    "rough": 0.55
   }
  },
  {
   "id": "case-rigide",
   "model_id": null,
   "type": "case",
   "code": "rigide",
   "name": "Étui rigide",
   "price": 0,
   "active": true,
   "position": 1,
   "props": {}
  },
  {
   "id": "case-cuir",
   "model_id": null,
   "type": "case",
   "code": "cuir",
   "name": "Étui cuir cognac",
   "price": 480,
   "active": true,
   "position": 2,
   "props": {}
  }
 ],
 "settings": {
  "orders_open": true,
  "capacity": 8,
  "deposit_rate": 0.3,
  "lacquer_weeks": 2,
  "show_remaining": true,
  "vacation": false,
  "vacation_until": "",
  "vacation_message": "L'atelier est fermé pour congés. Les demandes reçues seront traitées à notre retour.",
  "email": "bonjour@atelier-aubier.fr",
  "phone": "01 23 45 67 89",
  "hours": "Du mardi au samedi, de 10 h à 18 h",
  "address": "12 passage des Luthiers, 75011 Paris",
  "company": "Atelier Aubier SARL",
  "siret": "912 345 678 00017",
  "vat_rate": 20,
  "bank_holder": "Atelier Aubier SARL",
  "iban": "FR76 0000 0000 0000 0000 0000 000",
  "bic": "AUBRFRPPXXX",
  "maintenance_months": 12,
  "warranty_years": 2
 },
 "content": [
  {
   "id": "hero_l1",
   "section": "Accueil",
   "label": "Titre, première ligne",
   "value": "Le temps,",
   "long": false,
   "position": 1
  },
  {
   "id": "hero_l2",
   "section": "Accueil",
   "label": "Titre, seconde ligne",
   "value": "taillé dans le bois.",
   "long": false,
   "position": 2
  },
  {
   "id": "maison_l1",
   "section": "La maison",
   "label": "Phrase d'accroche",
   "value": "Huit instruments par an.",
   "long": false,
   "position": 3
  },
  {
   "id": "maison_l2",
   "section": "La maison",
   "label": "Suite de la phrase",
   "value": "Chacun pensé pour une seule main.",
   "long": false,
   "position": 4
  },
  {
   "id": "fig1",
   "section": "La maison",
   "label": "Chiffre 1",
   "value": "10 ans",
   "long": false,
   "position": 5
  },
  {
   "id": "fig1_txt",
   "section": "La maison",
   "label": "Légende du chiffre 1",
   "value": "de séchage pour chaque table",
   "long": false,
   "position": 6
  },
  {
   "id": "fig2",
   "section": "La maison",
   "label": "Chiffre 2",
   "value": "180 h",
   "long": false,
   "position": 7
  },
  {
   "id": "fig2_txt",
   "section": "La maison",
   "label": "Légende du chiffre 2",
   "value": "de travail à l'établi",
   "long": false,
   "position": 8
  },
  {
   "id": "fig3",
   "section": "La maison",
   "label": "Chiffre 3",
   "value": "62",
   "long": false,
   "position": 9
  },
  {
   "id": "fig3_txt",
   "section": "La maison",
   "label": "Légende du chiffre 3",
   "value": "pièces ajustées à la main",
   "long": false,
   "position": 10
  },
  {
   "id": "composer_txt",
   "section": "Composer",
   "label": "Texte de présentation",
   "value": "Choisissez le modèle, la finition du bois, l'accastillage et le vernis. Voyez l'instrument changer sous vos yeux, puis venez l'essayer à l'atelier.",
   "long": true,
   "position": 11
  },
  {
   "id": "atelier_p1",
   "section": "L'atelier",
   "label": "Premier paragraphe",
   "value": "Aubier est un atelier de lutherie indépendant. Chaque instrument y est fabriqué de bout en bout par la même personne, sans sous-traitance et sans série.",
   "long": true,
   "position": 12
  },
  {
   "id": "atelier_p2",
   "section": "L'atelier",
   "label": "Second paragraphe",
   "value": "Les bois arrivent bruts et sèchent à l'atelier pendant des années. Chaque table est sondée et amincie à l'oreille, jusqu'à ce qu'elle réponde juste.",
   "long": true,
   "position": 13
  },
  {
   "id": "entretien_txt",
   "section": "Entretien",
   "label": "Texte de présentation",
   "value": "Toutes marques, sur rendez-vous. Diagnostic offert et devis avant toute intervention.",
   "long": true,
   "position": 14
  }
 ]
};
