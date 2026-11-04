-- =========================================================
-- ATELIER AUBIER — BASE DE DONNÉES (Supabase / PostgreSQL)
--
-- À exécuter UNE fois : Supabase > SQL Editor > New query > coller tout ce fichier > Run.
-- Le script peut être relancé sans risque : il ne remplace pas les données déjà saisies.
--
-- AVANT DE LANCER : remplacez l'adresse e-mail tout en bas du fichier
-- (« VOTRE-EMAIL@exemple.fr ») par celle du compte qui administrera le site.
-- =========================================================


-- ---------------------------------------------------------
-- COMPTES DE L'ADMINISTRATION
-- Seules les adresses listées ici peuvent ouvrir /admin.
-- « proprietaire » : tout ; « atelier » : tout sauf réglages et comptes.
-- ---------------------------------------------------------
create table if not exists admins(
  id uuid not null default gen_random_uuid() unique,
  email text primary key,
  role text not null default 'atelier' check (role in ('proprietaire','atelier')),
  name text,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from admins where lower(email) = lower(coalesce(auth.jwt()->>'email','')));
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from admins where lower(email) = lower(coalesce(auth.jwt()->>'email','')) and role = 'proprietaire');
$$;

-- ---------------------------------------------------------
-- RÉGLAGES ET TEXTES DU SITE
-- ---------------------------------------------------------
create table if not exists settings(
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists content(
  id text primary key,
  section text,
  label text,
  value text,
  long boolean not null default false,
  position int not null default 0
);

-- ---------------------------------------------------------
-- CATALOGUE
-- ---------------------------------------------------------
create table if not exists models(
  id text primary key,
  name text not null,
  kind text,
  base_price int not null default 0,
  weeks int not null default 12,
  position int not null default 0,
  visible boolean not null default true,
  sold_out boolean not null default false,
  glb_url text,
  file text,
  anchors jsonb not null default '{}',
  defaults jsonb not null default '{}',
  story jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- type : finish (propre à un modèle), hardware, varnish, case (communs à tous les modèles)
create table if not exists options(
  id text primary key,
  model_id text references models(id) on delete cascade,
  type text not null check (type in ('finish','hardware','varnish','case')),
  code text not null,
  name text not null,
  price int not null default 0,
  active boolean not null default true,
  position int not null default 0,
  props jsonb not null default '{}'
);

-- ---------------------------------------------------------
-- CLIENTS, COMMANDES, SUIVI
-- ---------------------------------------------------------
create table if not exists clients(
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text unique,
  phone text,
  street text,
  zip text,
  city text,
  notes text,
  created_at timestamptz not null default now()
);

-- stage : attente_acompte → bois → caisse → manche → vernis → reglages → prete → livree (ou annulee)
create table if not exists orders(
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  client_id uuid references clients(id) on delete set null,
  model_id text,
  config jsonb not null default '{}',
  lines jsonb not null default '[]',
  total int not null default 0,
  deposit int not null default 0,
  deposit_rate numeric not null default 0.3,
  weeks int,
  pay_method text,
  delivery text,
  address jsonb,
  client_notes text,
  stage text not null default 'attente_acompte',
  deposit_paid_at timestamptz,
  balance_paid_at timestamptz,
  due_date date,
  delivered_at date,
  serial text,
  last_service_at date,
  last_reminder_at timestamptz,
  notes text,
  source text not null default 'site',
  created_at timestamptz not null default now()
);

create table if not exists order_updates(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  stage text,
  note text,
  photo_url text,
  public boolean not null default true,
  created_at timestamptz not null default now()
);

-- Demandes du formulaire « Rendez-vous » ; status : nouvelle, repondue, rdv, close
create table if not exists requests(
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  subject text,
  message text,
  status text not null default 'nouvelle',
  appointment_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- status : attente, contacte, converti, retire
create table if not exists waitlist(
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  model_id text,
  note text,
  status text not null default 'attente',
  created_at timestamptz not null default now()
);

create table if not exists wood(
  id uuid primary key default gen_random_uuid(),
  species text not null,
  part text,
  origin text,
  quantity numeric not null default 0,
  unit text not null default 'pièces',
  cut_year int,
  location text,
  min_qty numeric not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- STATISTIQUES DE VISITE (sans cookie, sans donnée personnelle)
-- sid : identifiant de visite tiré au hasard, effacé à la fermeture de l'onglet
-- ---------------------------------------------------------
create table if not exists events(
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  sid text,
  type text not null,
  path text,
  source text,
  device text,
  model text,
  data jsonb
);
create index if not exists events_at on events(at);

-- ---------------------------------------------------------
-- SÉCURITÉ (Row Level Security)
-- Le public lit le catalogue et peut seulement déposer : demandes, liste d'attente, statistiques.
-- Les commandes passent par la fonction place_order, qui recalcule le prix.
-- Tout le reste n'est visible et modifiable que par les comptes de l'administration.
-- ---------------------------------------------------------
alter table admins enable row level security;
alter table settings enable row level security;
alter table content enable row level security;
alter table models enable row level security;
alter table options enable row level security;
alter table clients enable row level security;
alter table orders enable row level security;
alter table order_updates enable row level security;
alter table requests enable row level security;
alter table waitlist enable row level security;
alter table wood enable row level security;
alter table events enable row level security;

do $$
declare t text;
begin
  -- on repart de règles propres à chaque exécution
  for t in select unnest(array['admins','settings','content','models','options','clients','orders','order_updates','requests','waitlist','wood','events']) loop
    execute format('drop policy if exists "admin" on %I', t);
    execute format('drop policy if exists "public_read" on %I', t);
    execute format('drop policy if exists "public_insert" on %I', t);
    execute format('drop policy if exists "owner_insert" on %I', t);
    execute format('drop policy if exists "owner_delete" on %I', t);
  end loop;
end $$;

create policy "admin" on admins for select using (is_admin());
create policy "owner_insert" on admins for insert with check (is_owner());
create policy "owner_delete" on admins for delete using (is_owner());

create policy "public_read" on settings for select using (true);
create policy "admin" on settings for all using (is_owner()) with check (is_owner());

create policy "public_read" on content for select using (true);
create policy "admin" on content for all using (is_admin()) with check (is_admin());

create policy "public_read" on models for select using (visible or is_admin());
create policy "admin" on models for all using (is_admin()) with check (is_admin());

create policy "public_read" on options for select using (active or is_admin());
create policy "admin" on options for all using (is_admin()) with check (is_admin());

create policy "admin" on clients for all using (is_admin()) with check (is_admin());
create policy "admin" on orders for all using (is_admin()) with check (is_admin());
create policy "admin" on order_updates for all using (is_admin()) with check (is_admin());
create policy "admin" on wood for all using (is_admin()) with check (is_admin());

create policy "admin" on requests for all using (is_admin()) with check (is_admin());
create policy "public_insert" on requests for insert with check (
  status = 'nouvelle' and appointment_at is null and notes is null
  and length(coalesce(message,'')) < 5000 and length(coalesce(name,'')) < 200 and length(coalesce(email,'')) < 200);

create policy "admin" on waitlist for all using (is_admin()) with check (is_admin());
create policy "public_insert" on waitlist for insert with check (
  status = 'attente' and length(coalesce(note,'')) < 3000 and length(coalesce(email,'')) < 200);

create policy "admin" on events for all using (is_admin()) with check (is_admin());
create policy "public_insert" on events for insert with check (
  length(type) < 40 and length(coalesce(path,'')) < 200 and coalesce(pg_column_size(data),0) < 2000);

-- ---------------------------------------------------------
-- FONCTIONS PUBLIQUES
-- ---------------------------------------------------------

-- Tout ce dont le site a besoin, en une seule requête
create or replace function public_catalogue() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'settings', coalesce((select data from settings where id = 1), '{}'),
    'models', coalesce((select jsonb_agg(to_jsonb(m) order by m.position) from models m where m.visible), '[]'),
    'options', coalesce((select jsonb_agg(to_jsonb(o) order by o.type, o.position) from options o where o.active), '[]'),
    'content', coalesce((select jsonb_agg(to_jsonb(c) order by c.position) from content c), '[]'),
    'sold', (select count(*) from orders where stage <> 'annulee' and created_at >= date_trunc('year', now()))
  );
$$;

-- Passage de commande : le prix est TOUJOURS recalculé ici, jamais repris du navigateur
create or replace function place_order(p_config jsonb, p_client jsonb, p_pay text, p_delivery text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s jsonb := coalesce((select data from settings where id = 1), '{}');
  m models; f options; h options; v options; c options;
  v_total int; v_rate numeric; v_deposit int; v_weeks int; v_client uuid; v_ref text; v_lines jsonb; v_year text; v_n int;
  v_email text := lower(trim(p_client->>'email'));
begin
  if coalesce((s->>'orders_open')::boolean, true) = false then raise exception 'Les commandes sont fermées pour le moment.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Adresse e-mail invalide.'; end if;
  if length(coalesce(p_client->>'first','')) not between 1 and 100 or length(coalesce(p_client->>'last','')) not between 1 and 100 then raise exception 'Nom invalide.'; end if;
  if length(coalesce(p_notes,'')) > 3000 then raise exception 'Remarques trop longues.'; end if;
  if p_pay not in ('carte','virement') or p_delivery not in ('atelier','livraison') then raise exception 'Choix invalide.'; end if;

  select * into m from models where id = p_config->>'model' and visible and not sold_out;
  if m.id is null then raise exception 'Ce modèle n''est pas disponible.'; end if;
  select * into f from options where type = 'finish' and model_id = m.id and code = p_config->>'finish' and active;
  select * into h from options where type = 'hardware' and model_id is null and code = p_config->>'hardware' and active;
  select * into v from options where type = 'varnish' and model_id is null and code = p_config->>'varnish' and active;
  select * into c from options where type = 'case' and model_id is null and code = p_config->>'case' and active;
  if f.id is null or h.id is null or v.id is null or c.id is null then raise exception 'Configuration incomplète.'; end if;

  v_total := m.base_price + f.price + h.price + v.price + c.price;
  v_rate := coalesce((s->>'deposit_rate')::numeric, 0.3);
  v_deposit := round(v_total * v_rate);
  v_weeks := m.weeks + case when f.props ? 'lac' then coalesce((s->>'lacquer_weeks')::int, 2) else 0 end;
  v_lines := jsonb_build_array(
    jsonb_build_array(m.name || ' — ' || coalesce(m.kind,''), m.base_price),
    jsonb_build_array('Finition : ' || f.name, f.price),
    jsonb_build_array('Accastillage : ' || h.name, h.price),
    jsonb_build_array('Vernis : ' || v.name, v.price),
    jsonb_build_array(c.name, c.price));

  insert into clients(first_name, last_name, email, phone, street, zip, city)
  values (trim(p_client->>'first'), trim(p_client->>'last'), v_email, left(p_client->>'tel', 40),
          left(p_client->>'street', 200), left(p_client->>'zip', 10), left(p_client->>'city', 100))
  on conflict (email) do update set
    phone = coalesce(clients.phone, excluded.phone),
    street = coalesce(clients.street, excluded.street),
    zip = coalesce(clients.zip, excluded.zip),
    city = coalesce(clients.city, excluded.city)
  returning id into v_client;

  v_year := to_char(now(), 'YYYY');
  select coalesce(max(substring(ref from 10)::int), 0) + 1 into v_n from orders where ref like 'AUB-' || v_year || '-%';
  v_ref := 'AUB-' || v_year || '-' || lpad(v_n::text, 4, '0');

  insert into orders(ref, client_id, model_id, config, lines, total, deposit, deposit_rate, weeks, pay_method, delivery, address, client_notes)
  values (v_ref, v_client, m.id,
          jsonb_build_object('model', m.id, 'finish', f.code, 'hardware', h.code, 'varnish', v.code, 'case', c.code),
          v_lines, v_total, v_deposit, v_rate, v_weeks, p_pay, p_delivery,
          case when p_delivery = 'livraison' then jsonb_build_object('street', p_client->>'street', 'zip', p_client->>'zip', 'city', p_client->>'city') end,
          nullif(trim(coalesce(p_notes,'')), ''));

  return jsonb_build_object('ref', v_ref, 'total', v_total, 'deposit', v_deposit, 'rate', v_rate, 'weeks', v_weeks, 'lines', v_lines);
end $$;

-- Page « Suivre ma commande » : il faut la référence ET l'e-mail du client
create or replace function order_tracking(p_ref text, p_email text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ref', o.ref, 'stage', o.stage, 'created_at', o.created_at, 'due_date', o.due_date, 'delivered_at', o.delivered_at,
    'model', coalesce(m.name, o.model_id), 'kind', m.kind, 'lines', o.lines, 'total', o.total, 'deposit', o.deposit,
    'deposit_paid', o.deposit_paid_at is not null, 'balance_paid', o.balance_paid_at is not null, 'first_name', cl.first_name,
    'updates', coalesce((select jsonb_agg(jsonb_build_object('stage', u.stage, 'note', u.note, 'photo_url', u.photo_url, 'created_at', u.created_at) order by u.created_at desc)
                         from order_updates u where u.order_id = o.id and u.public), '[]'))
  from orders o
  join clients cl on cl.id = o.client_id
  left join models m on m.id = o.model_id
  where upper(o.ref) = upper(trim(p_ref)) and lower(cl.email) = lower(trim(p_email))
  limit 1;
$$;

-- Statistiques pour l'onglet « Performances » (réservé à l'administration)
create or replace function site_stats(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_since timestamptz := date_trunc('day', now()) - make_interval(days => p_days - 1);
  v_prev timestamptz := v_since - make_interval(days => p_days);
begin
  if not is_admin() then raise exception 'Accès refusé'; end if;
  return (
    with e as (select * from events where at >= v_since),
         ep as (select * from events where at >= v_prev and at < v_since),
         fun as (select type, count(distinct sid) n from e group by type),
         funp as (select type, count(distinct sid) n from ep group by type)
    select jsonb_build_object(
      'days', p_days,
      'visitors', (select count(distinct sid) from e where type = 'view'),
      'views', (select count(*) from e where type = 'view'),
      'prev_visitors', (select count(distinct sid) from ep where type = 'view'),
      'prev_views', (select count(*) from ep where type = 'view'),
      'series', (select coalesce(jsonb_agg(jsonb_build_object('d', to_char(g.d, 'YYYY-MM-DD'), 'v', coalesce(x.v, 0), 'p', coalesce(x.p, 0)) order by g.d), '[]')
                 from generate_series(v_since, date_trunc('day', now()), interval '1 day') g(d)
                 left join (select date_trunc('day', at) dd, count(distinct sid) v, count(*) p from e where type = 'view' group by 1) x on x.dd = g.d),
      'sources', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]')
                  from (select coalesce(nullif(source, ''), 'Direct') k, count(distinct sid) n from e where type = 'view' group by 1 order by 2 desc limit 8) q),
      'devices', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]')
                  from (select coalesce(device, 'Inconnu') k, count(distinct sid) n from e where type = 'view' group by 1) q),
      'pages', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]')
                from (select coalesce(path, '?') k, count(*) n from e where type = 'view' group by 1 order by 2 desc limit 10) q),
      'funnel', (select coalesce(jsonb_object_agg(type, n), '{}') from fun),
      'prev_funnel', (select coalesce(jsonb_object_agg(type, n), '{}') from funp),
      'choices', (select coalesce(jsonb_agg(jsonb_build_object('m', model, 'k', k, 'v', v, 'n', n)), '[]')
                  from (select model, data->>'k' k, data->>'v' v, count(*) n from e where type = 'choice' group by 1, 2, 3) q),
      'vitals', (select coalesce(jsonb_object_agg(k, jsonb_build_object('p75', p75, 'n', n)), '{}')
                 from (select data->>'name' k, percentile_cont(0.75) within group (order by (data->>'value')::float) p75, count(*) n
                       from e where type = 'vital' and data->>'value' ~ '^-?[0-9]+(\.[0-9]+)?$' group by 1) q),
      'load3d', (select coalesce(jsonb_object_agg(model, jsonb_build_object('p75', p75, 'n', n)), '{}')
                 from (select model, percentile_cont(0.75) within group (order by (data->>'ms')::float) p75, count(*) n
                       from e where type = 'load3d' and data->>'ms' ~ '^[0-9]+(\.[0-9]+)?$' group by 1) q)
    )
  );
end $$;

grant execute on function public_catalogue() to anon, authenticated;
grant execute on function place_order(jsonb, jsonb, text, text, text) to anon, authenticated;
grant execute on function order_tracking(text, text) to anon, authenticated;
grant execute on function site_stats(int) to authenticated;
grant execute on function is_admin() to anon, authenticated;

-- ---------------------------------------------------------
-- FICHIERS (photos d'avancement, modèles 3D) : dossier public « medias »
-- ---------------------------------------------------------
insert into storage.buckets(id, name, public) values ('medias', 'medias', true) on conflict (id) do nothing;
drop policy if exists "medias_admin_insert" on storage.objects;
drop policy if exists "medias_admin_update" on storage.objects;
drop policy if exists "medias_admin_delete" on storage.objects;
create policy "medias_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'medias' and public.is_admin());
create policy "medias_admin_update" on storage.objects for update to authenticated using (bucket_id = 'medias' and public.is_admin());
create policy "medias_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'medias' and public.is_admin());

-- ---------------------------------------------------------
-- DONNÉES DE DÉPART (le catalogue actuel du site)
-- « on conflict do nothing » : relancer le script n'écrase jamais vos modifications.
-- ---------------------------------------------------------
insert into settings(id, data) values (1, $j${"orders_open":true,"capacity":8,"deposit_rate":0.3,"lacquer_weeks":2,"show_remaining":true,"vacation":false,"vacation_until":"","vacation_message":"L'atelier est fermé pour congés. Les demandes reçues seront traitées à notre retour.","email":"bonjour@atelier-aubier.fr","phone":"01 23 45 67 89","hours":"Du mardi au samedi, de 10 h à 18 h","address":"12 passage des Luthiers, 75011 Paris","company":"Atelier Aubier SARL","siret":"912 345 678 00017","vat_rate":20,"bank_holder":"Atelier Aubier SARL","iban":"FR76 0000 0000 0000 0000 0000 000","bic":"AUBRFRPPXXX","maintenance_months":12,"warranty_years":2}$j$::jsonb) on conflict (id) do nothing;

insert into content(id, section, label, value, long, position)
select id, section, label, value, long, position from jsonb_populate_recordset(null::content, $j$[{"id":"hero_l1","section":"Accueil","label":"Titre, première ligne","value":"Le temps,","long":false,"position":1},{"id":"hero_l2","section":"Accueil","label":"Titre, seconde ligne","value":"taillé dans le bois.","long":false,"position":2},{"id":"maison_l1","section":"La maison","label":"Phrase d'accroche","value":"Huit instruments par an.","long":false,"position":3},{"id":"maison_l2","section":"La maison","label":"Suite de la phrase","value":"Chacun pensé pour une seule main.","long":false,"position":4},{"id":"fig1","section":"La maison","label":"Chiffre 1","value":"10 ans","long":false,"position":5},{"id":"fig1_txt","section":"La maison","label":"Légende du chiffre 1","value":"de séchage pour chaque table","long":false,"position":6},{"id":"fig2","section":"La maison","label":"Chiffre 2","value":"180 h","long":false,"position":7},{"id":"fig2_txt","section":"La maison","label":"Légende du chiffre 2","value":"de travail à l'établi","long":false,"position":8},{"id":"fig3","section":"La maison","label":"Chiffre 3","value":"62","long":false,"position":9},{"id":"fig3_txt","section":"La maison","label":"Légende du chiffre 3","value":"pièces ajustées à la main","long":false,"position":10},{"id":"composer_txt","section":"Composer","label":"Texte de présentation","value":"Choisissez le modèle, la finition du bois, l'accastillage et le vernis. Voyez l'instrument changer sous vos yeux, puis venez l'essayer à l'atelier.","long":true,"position":11},{"id":"atelier_p1","section":"L'atelier","label":"Premier paragraphe","value":"Aubier est un atelier de lutherie indépendant. Chaque instrument y est fabriqué de bout en bout par la même personne, sans sous-traitance et sans série.","long":true,"position":12},{"id":"atelier_p2","section":"L'atelier","label":"Second paragraphe","value":"Les bois arrivent bruts et sèchent à l'atelier pendant des années. Chaque table est sondée et amincie à l'oreille, jusqu'à ce qu'elle réponde juste.","long":true,"position":13},{"id":"entretien_txt","section":"Entretien","label":"Texte de présentation","value":"Toutes marques, sur rendez-vous. Diagnostic offert et devis avant toute intervention.","long":true,"position":14}]$j$::jsonb)
on conflict (id) do nothing;

insert into models(id, name, kind, base_price, weeks, position, visible, sold_out, glb_url, file, anchors, defaults, story)
select id, name, kind, base_price, weeks, position, visible, sold_out, glb_url, file, anchors, defaults, story from jsonb_populate_recordset(null::models, $j$[{"id":"brume","name":"Brume","kind":"Guitare folk, format parlor","base_price":3400,"weeks":14,"position":1,"visible":true,"sold_out":false,"glb_url":null,"file":"assets/modeles/brume.js","anchors":{"head":[0,0.925,0.3],"nut":[0,0.84,0.6],"neck":[0,0.62,0.6],"body":[0,0.36,0.9],"bridge":[0,0.17,0.95],"center":[0,0.5,0]},"defaults":{"finish":"cerise","hardware":"or","varnish":"brillant","case":"rigide"},"story":[{"a":"center","d":"fit","az":24,"el":6,"part":"Vue d'ensemble","t":"Brume","x":"Guitare folk, format parlor.","p":"Une caisse compacte, une voix précise et chaude. Le format parlor se joue contre le corps, au salon comme sur scène, et répond à la moindre attaque des doigts.","s":"Diapason 630 mm · 19 cases · 12 hors caisse"},{"a":"head","d":0.34,"az":-26,"el":10,"part":"La tête","t":"La tête à fentes","p":"Tête ajourée à l'ancienne, mécaniques à bain d'huile et boutons tournés. La corde passe par le fût, sans contrainte sur le sillet.","s":"Un dessin de tête propre à l'atelier."},{"a":"nut","d":0.17,"az":30,"el":22,"part":"Le sillet","t":"Le sillet","p":"La pièce qui guide chaque corde. Taillé dans l'os, entaillé au dixième de millimètre pour une justesse parfaite en première position.","s":"Os massif, jamais de plastique."},{"a":"neck","d":0.44,"az":58,"el":8,"part":"Le manche","t":"Le manche et la touche","p":"Acajou d'une seule pièce, profil sculpté à la main d'après vos mesures. Touche en palissandre, frettes polies une à une.","s":"Profil en C ou en V, ajusté à votre main."},{"a":"body","d":0.36,"az":-6,"el":18,"part":"La table et la rosace","t":"La table","p":"Épicéa massif séché dix ans, teinté à la main en dégradé cerise. Barrage sculpté et accordé au tapotement, jusqu'à ce que la table sonne juste.","s":"Filets et rosace en nacre d'abalone, marquetés à la main."},{"a":"bridge","d":0.24,"az":-28,"el":30,"part":"Le chevalet","t":"Le chevalet","p":"Palissandre massif et sillet de chevalet compensé, pour une intonation juste sur toute la longueur de la touche.","s":"Chevilles en os, ajustées une à une."},{"a":"center","d":"fit","az":172,"el":6,"part":"Le fond","t":"Le fond et les éclisses","p":"Acajou appairé, vernis appliqué au tampon en quarante passes. Par la rosace, l'étiquette de l'atelier, signée et numérotée.","s":"Chaque instrument porte son numéro."}]},{"id":"nocturne","name":"Nocturne","kind":"Électrique demi-caisse","base_price":2900,"weeks":12,"position":2,"visible":true,"sold_out":false,"glb_url":null,"file":"assets/modeles/nocturne.js","anchors":{"head":[0,0.93,0.3],"nut":[0,0.86,0.6],"neck":[0,0.62,0.6],"body":[0,0.28,0.9],"bridge":[0,0.15,0.95],"knobs":[0.5,0.16,0.95],"center":[0,0.5,0]},"defaults":{"finish":"tabac","hardware":"nickel","varnish":"brillant","case":"rigide"},"story":[{"a":"center","d":"fit","az":24,"el":6,"part":"Vue d'ensemble","t":"Nocturne","x":"Électrique demi-caisse.","p":"Un corps creux à ouïes pour un son rond et aéré, du jazz au rock clair. Légère à l'épaule, généreuse à l'oreille.","s":"Diapason 628 mm · 22 cases · ouïes en f"},{"a":"head","d":0.32,"az":-26,"el":10,"part":"La tête","t":"La tête","p":"Placage teinté, mécaniques à démultiplication fine pour une tenue d'accord sans faille.","s":"Fût et boutons dans le métal choisi."},{"a":"neck","d":0.44,"az":58,"el":10,"part":"Le manche","t":"Le manche","p":"Manche collé, touche à radius compensé, frettes polies une à une. L'accès reste libre jusqu'aux dernières cases.","s":"Profil sculpté à la main."},{"a":"body","d":0.32,"az":-10,"el":22,"part":"Les micros","t":"Les micros","p":"Deux micros double bobinage bobinés à l'atelier, réglés pour garder la voix du bois sous l'amplification.","s":"Chaque bobinage est numéroté et mesuré."},{"a":"bridge","d":0.26,"az":-30,"el":30,"part":"Le vibrato","t":"Chevalet et vibrato","p":"Un vibrato à ressort, souple et précis, monté sur un chevalet réglable. Le métal est usiné, puis traité dans la finition que vous choisissez.","s":"Un vibrato qui revient juste."},{"a":"knobs","d":0.24,"az":26,"el":34,"part":"L'électronique","t":"L'électronique","p":"Volume et tonalité pour chaque micro, câblage tissé à l'ancienne, condensateurs papier huilé.","s":"Boutons tournés dans le métal choisi."},{"a":"center","d":"fit","az":190,"el":6,"part":"Le corps","t":"Le corps","p":"Érable flammé sur caisse creuse, filet clair sur tout le contour. La flamme est choisie planche par planche à l'atelier.","s":"Moins de 3,4 kg."}]},{"id":"fonderie","name":"Fonderie","kind":"Basse, cinq cordes","base_price":3100,"weeks":16,"position":3,"visible":true,"sold_out":false,"glb_url":null,"file":"assets/modeles/fonderie.js","anchors":{"head":[0,0.93,0.3],"nut":[0,0.86,0.6],"neck":[0,0.6,0.6],"body":[0,0.2,0.9],"bridge":[0,0.09,0.95],"knobs":[0.45,0.16,0.95],"center":[0,0.5,0]},"defaults":{"finish":"naturel","hardware":"nickel","varnish":"satine","case":"rigide"},"story":[{"a":"center","d":"fit","az":24,"el":6,"part":"Vue d'ensemble","t":"Fonderie","x":"Basse, cinq cordes.","p":"Une basse à cinq cordes taillée pour tenir un groupe entier. Le grave est ferme, l'aigu reste lisible jusqu'en haut du manche.","s":"Diapason 864 mm (34 pouces) · 24 cases"},{"a":"head","d":0.36,"az":-24,"el":12,"part":"La tête","t":"La tête","p":"Tête compacte, mécaniques allégées. La basse reste équilibrée à la sangle et ne pique jamais du nez.","s":"Un sillet à rouleaux pour une tenue d’accord parfaite."},{"a":"neck","d":0.52,"az":60,"el":10,"part":"Le manche","t":"Le manche","p":"Érable et bois sombre en plis contrecollés, renforcés de carbone. Un manche fin qui ne bouge pas, saison après saison.","s":"Profil plat, pensé pour le jeu en slap."},{"a":"body","d":0.36,"az":-12,"el":22,"part":"Les micros","t":"Les micros","p":"Deux micros double bobinage et un préampli actif ou passif, commutable selon la scène ou le studio.","s":"Bobinés à l'atelier."},{"a":"bridge","d":0.26,"az":-30,"el":30,"part":"Le chevalet","t":"Le chevalet","p":"Pontets individuels en laiton massif, réglables corde par corde en hauteur et en longueur.","s":"Un contact franc entre la corde et le bois."},{"a":"center","d":"fit","az":192,"el":6,"part":"Le corps","t":"Le corps","p":"Érable échauffé : un bois rare, marbré par le temps, choisi pour son dessin. Chaque table est unique et ne se reproduira jamais.","s":"Une table qui porte sa propre signature."}]}]$j$::jsonb)
on conflict (id) do nothing;

insert into options(id, model_id, type, code, name, price, active, position, props)
select id, model_id, type, code, name, price, active, position, props from jsonb_populate_recordset(null::options, $j$[{"id":"brume-finish-cerise","model_id":"brume","type":"finish","code":"cerise","name":"Cerise ombrée","price":0,"active":true,"position":1,"props":{"swatch":"#5a1a10"}},{"id":"brume-finish-tabac","model_id":"brume","type":"finish","code":"tabac","name":"Tabac ombré","price":250,"active":true,"position":2,"props":{"swatch":"#4a2a14","tint":"#6b3a1a","amt":0.85}},{"id":"brume-finish-ambre","model_id":"brume","type":"finish","code":"ambre","name":"Ambre","price":250,"active":true,"position":3,"props":{"swatch":"#a3642a","tint":"#c27a32","amt":0.8}},{"id":"brume-finish-nuit","model_id":"brume","type":"finish","code":"nuit","name":"Laque Nuit","price":350,"active":true,"position":4,"props":{"swatch":"#0d0c0e","lac":"#0d0c0e"}},{"id":"nocturne-finish-ambre","model_id":"nocturne","type":"finish","code":"ambre","name":"Érable flammé ambre","price":0,"active":true,"position":1,"props":{"wood":"flamme","swatch":"wood:flamme"}},{"id":"nocturne-finish-tabac","model_id":"nocturne","type":"finish","code":"tabac","name":"Érable flammé tabac","price":300,"active":true,"position":2,"props":{"wood":"flamme","burst":true,"swatch":"wood:flammeb"}},{"id":"nocturne-finish-nuit","model_id":"nocturne","type":"finish","code":"nuit","name":"Laque Nuit","price":300,"active":true,"position":3,"props":{"wood":"flamme","lac":"#0c0c0e","swatch":"#0c0c0e"}},{"id":"nocturne-finish-bordeaux","model_id":"nocturne","type":"finish","code":"bordeaux","name":"Laque Bordeaux","price":300,"active":true,"position":4,"props":{"wood":"flamme","lac":"#4a1320","swatch":"#4a1320"}},{"id":"nocturne-finish-sapin","model_id":"nocturne","type":"finish","code":"sapin","name":"Laque Vert sapin","price":300,"active":true,"position":5,"props":{"wood":"flamme","lac":"#14302a","swatch":"#14302a"}},{"id":"fonderie-finish-naturel","model_id":"fonderie","type":"finish","code":"naturel","name":"Érable échauffé naturel","price":0,"active":true,"position":1,"props":{"swatch":"#cdb48c"}},{"id":"fonderie-finish-miel","model_id":"fonderie","type":"finish","code":"miel","name":"Miel","price":200,"active":true,"position":2,"props":{"swatch":"#b07a35","tint":"#c4842e","amt":0.6}},{"id":"fonderie-finish-fume","model_id":"fonderie","type":"finish","code":"fume","name":"Fumé","price":200,"active":true,"position":3,"props":{"swatch":"#4a3a2e","tint":"#4a3528","amt":0.85}},{"id":"fonderie-finish-nuit","model_id":"fonderie","type":"finish","code":"nuit","name":"Laque Nuit","price":350,"active":true,"position":4,"props":{"swatch":"#0c0c0e","lac":"#0c0c0e"}},{"id":"hardware-nickel","model_id":null,"type":"hardware","code":"nickel","name":"Nickel","price":0,"active":true,"position":1,"props":{"color":"#d0d0cb","rough":0.22,"orig":true}},{"id":"hardware-or","model_id":null,"type":"hardware","code":"or","name":"Or mat","price":260,"active":true,"position":2,"props":{"color":"#c9a65e","rough":0.3}},{"id":"hardware-noir","model_id":null,"type":"hardware","code":"noir","name":"Noir satiné","price":120,"active":true,"position":3,"props":{"color":"#232325","rough":0.4}},{"id":"varnish-brillant","model_id":null,"type":"varnish","code":"brillant","name":"Vernis brillant","price":0,"active":true,"position":1,"props":{"cc":1,"ccr":0.04,"rough":0.32}},{"id":"varnish-satine","model_id":null,"type":"varnish","code":"satine","name":"Vernis satiné","price":0,"active":true,"position":2,"props":{"cc":0.35,"ccr":0.45,"rough":0.55}},{"id":"case-rigide","model_id":null,"type":"case","code":"rigide","name":"Étui rigide","price":0,"active":true,"position":1,"props":{}},{"id":"case-cuir","model_id":null,"type":"case","code":"cuir","name":"Étui cuir cognac","price":480,"active":true,"position":2,"props":{}}]$j$::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- PREMIER COMPTE ADMINISTRATEUR : remplacez l'adresse ci-dessous
-- puis créez le même utilisateur dans Authentication > Users > Add user.
-- ---------------------------------------------------------
insert into admins(email, role, name) values ('VOTRE-EMAIL@exemple.fr', 'proprietaire', 'Atelier') on conflict (email) do nothing;
