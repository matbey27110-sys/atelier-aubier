/* =========================================================
   CONNEXION À LA BASE DE DONNÉES (Supabase)
   Laisser vide = mode démonstration : le site tourne avec le catalogue de js/catalogue.js
   et l'admin enregistre ses données dans le navigateur.

   Pour passer en réel : Supabase > Project Settings > API, puis copier ici
   « Project URL » et la clé « anon public ». Cette clé est faite pour être publique :
   la sécurité est assurée par les règles du fichier supabase/schema.sql.
   ========================================================= */
window.AUBIER_SUPABASE = {
  url: '',
  anonKey: ''
};
