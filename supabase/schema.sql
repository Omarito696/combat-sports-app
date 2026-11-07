-- Real records only. Simulation data is stored exclusively in browser localStorage.

create table public.data_source (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "name" text not null,
  "source_type" text not null default 'api',
  "base_url" text,
  "api_key_secret_name" text,
  "disciplines" jsonb,
  "organizations" jsonb,
  "data_types" jsonb,
  "is_active" boolean default true,
  "last_synced" text,
  "notes" text
);

alter table public.data_source enable row level security;

revoke all on public.data_source from anon, authenticated;

create policy admin_insert on public.data_source for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.data_source for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.data_source for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.data_source for select to anon, authenticated using (true);

grant select on public.data_source to anon, authenticated;

grant insert, update, delete on public.data_source to authenticated;

create table public.event (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "name" text not null,
  "discipline" text not null,
  "date" text not null,
  "venue" text,
  "location" text,
  "status" text not null default 'upcoming',
  "image_url" text,
  "organization" text,
  "date_source_url" text,
  "date_source_type" text,
  "card_source_url" text,
  "card_source_type" text,
  "event_confidence" text default 'low'
);

alter table public.event enable row level security;

revoke all on public.event from anon, authenticated;

create policy admin_insert on public.event for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.event for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.event for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.event for select to anon, authenticated using (true);

grant select on public.event to anon, authenticated;

grant insert, update, delete on public.event to authenticated;

create table public.fantasy_lineup (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "user_id" text not null,
  "week_id" text not null,
  "week_number" numeric,
  "year" numeric,
  "striker_fighter_id" text,
  "striker_fighter_name" text,
  "striker_fight_id" text,
  "wrestler_fighter_id" text,
  "wrestler_fighter_name" text,
  "wrestler_fight_id" text,
  "grappler_fighter_id" text,
  "grappler_fighter_name" text,
  "grappler_fight_id" text,
  "tokens_spent" numeric,
  "total_points" numeric default 0,
  "striker_points" numeric default 0,
  "wrestler_points" numeric default 0,
  "grappler_points" numeric default 0,
  "is_scored" boolean default false
);

alter table public.fantasy_lineup enable row level security;

revoke all on public.fantasy_lineup from anon, authenticated;

create policy owner_read on public.fantasy_lineup for select to authenticated using ((select auth.uid())::text = user_id);

create policy owner_insert on public.fantasy_lineup for insert to authenticated with check ((select auth.uid())::text = user_id);

create policy owner_update on public.fantasy_lineup for update to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);

grant select on public.fantasy_lineup to authenticated;

grant insert ("user_id", "week_id", "week_number", "year", "striker_fighter_id", "striker_fighter_name", "striker_fight_id", "wrestler_fighter_id", "wrestler_fighter_name", "wrestler_fight_id", "grappler_fighter_id", "grappler_fighter_name", "grappler_fight_id", "tokens_spent"), update ("user_id", "week_id", "week_number", "year", "striker_fighter_id", "striker_fighter_name", "striker_fight_id", "wrestler_fighter_id", "wrestler_fighter_name", "wrestler_fight_id", "grappler_fighter_id", "grappler_fighter_name", "grappler_fight_id", "tokens_spent") on public.fantasy_lineup to authenticated;

create index fantasy_lineup_owner on public.fantasy_lineup(user_id);

create table public.fantasy_week (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "week_number" numeric not null,
  "year" numeric not null,
  "start_date" text not null,
  "end_date" text not null,
  "status" text default 'open',
  "eligible_fight_ids" jsonb,
  "token_budget" numeric default 100
);

alter table public.fantasy_week enable row level security;

revoke all on public.fantasy_week from anon, authenticated;

create policy admin_insert on public.fantasy_week for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.fantasy_week for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.fantasy_week for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.fantasy_week for select to anon, authenticated using (true);

grant select on public.fantasy_week to anon, authenticated;

grant insert, update, delete on public.fantasy_week to authenticated;

create table public.fight (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "event_id" text not null,
  "fighter_a_id" text,
  "fighter_b_id" text,
  "fighter_a_name" text not null,
  "fighter_b_name" text not null,
  "discipline" text not null,
  "weight_class" text,
  "is_main_event" boolean default false,
  "is_title_fight" boolean default false,
  "rounds" numeric default 3,
  "status" text default 'scheduled',
  "winner_id" text,
  "winner_name" text,
  "method" text,
  "finish_round" numeric,
  "finish_time" text,
  "fighter_a_score" text,
  "fighter_b_score" text,
  "result_source_url" text,
  "result_source_type" text,
  "result_confidence" text default 'low',
  "card_source_url" text,
  "card_source_type" text,
  "order" numeric
);

alter table public.fight enable row level security;

revoke all on public.fight from anon, authenticated;

create policy admin_insert on public.fight for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.fight for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.fight for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.fight for select to anon, authenticated using (true);

grant select on public.fight to anon, authenticated;

grant insert, update, delete on public.fight to authenticated;

create table public.fight_event (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "fight_id" text not null,
  "round" numeric,
  "time" text,
  "type" text default 'other',
  "description" text not null,
  "fighter_name" text
);

alter table public.fight_event enable row level security;

revoke all on public.fight_event from anon, authenticated;

create policy admin_insert on public.fight_event for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.fight_event for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.fight_event for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.fight_event for select to anon, authenticated using (true);

grant select on public.fight_event to anon, authenticated;

grant insert, update, delete on public.fight_event to authenticated;

create table public.fighter (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "name" text not null,
  "nickname" text,
  "discipline" text not null,
  "nationality" text,
  "country_code" text,
  "weight_class" text,
  "wins" numeric default 0,
  "losses" numeric default 0,
  "draws" numeric default 0,
  "no_contests" numeric default 0,
  "preferred_profile_image_url" text,
  "image_url" text,
  "image_source" text,
  "image_source_type" text,
  "image_confidence" text default 'unverified',
  "image_last_verified_at" text,
  "image_pending_review" boolean default false,
  "record_source_url" text,
  "record_source_type" text,
  "record_confidence" text default 'low',
  "record_last_verified_at" text,
  "weight_source_url" text,
  "weight_source_type" text,
  "ranking" numeric,
  "biography" text,
  "date_of_birth" text,
  "height_cm" numeric,
  "reach_cm" numeric,
  "stance" text,
  "organization" text,
  "status" text default 'Active',
  "wikidata_id" text,
  "wikipedia_url" text,
  "thesportsdb_id" text,
  "ufc_url" text,
  "one_url" text,
  "tapology_url" text,
  "sherdog_url" text,
  "boxrec_url" text,
  "ibjjf_url" text,
  "adcc_url" text,
  "official_website_url" text,
  "data_quality" text default 'stub',
  "data_confidence" text default 'low',
  "data_warnings" jsonb,
  "needs_admin_review" boolean default false,
  "last_data_refresh" text
);

alter table public.fighter enable row level security;

revoke all on public.fighter from anon, authenticated;

create policy admin_insert on public.fighter for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.fighter for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.fighter for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.fighter for select to anon, authenticated using (true);

grant select on public.fighter to anon, authenticated;

grant insert, update, delete on public.fighter to authenticated;

create table public.fighter_rating (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "fighter_id" text not null,
  "fighter_name" text not null,
  "discipline" text,
  "striking_rating" numeric,
  "wrestling_rating" numeric,
  "grappling_rating" numeric,
  "striking_token_cost" numeric,
  "wrestling_token_cost" numeric,
  "grappling_token_cost" numeric,
  "ko_rate" numeric,
  "sub_rate" numeric,
  "td_accuracy" numeric,
  "sig_strikes_per_min" numeric,
  "last_updated" text,
  "data_source_notes" text
);

alter table public.fighter_rating enable row level security;

revoke all on public.fighter_rating from anon, authenticated;

create policy admin_insert on public.fighter_rating for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.fighter_rating for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.fighter_rating for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.fighter_rating for select to anon, authenticated using (true);

grant select on public.fighter_rating to anon, authenticated;

grant insert, update, delete on public.fighter_rating to authenticated;

create table public.league (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "name" text not null,
  "type" text not null,
  "division_tier" text,
  "invite_code" text,
  "creator_id" text,
  "member_ids" jsonb,
  "max_members" numeric default 20,
  "season" text,
  "status" text default 'active',
  "description" text,
  "cup_rounds" numeric,
  "current_round" numeric default 1
);

alter table public.league enable row level security;

revoke all on public.league from anon, authenticated;

create policy owner_read on public.league for select to authenticated using ((select auth.uid())::text = creator_id);

create policy owner_insert on public.league for insert to authenticated with check ((select auth.uid())::text = creator_id);

create policy owner_update on public.league for update to authenticated using ((select auth.uid())::text = creator_id) with check ((select auth.uid())::text = creator_id);

grant select on public.league to authenticated;

grant insert ("name", "type", "invite_code", "creator_id", "member_ids", "max_members", "season", "status", "description", "cup_rounds", "current_round"), update ("name", "type", "invite_code", "creator_id", "member_ids", "max_members", "season", "status", "description", "cup_rounds", "current_round") on public.league to authenticated;

create index league_owner on public.league(creator_id);

create table public.league_member (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "league_id" text not null,
  "user_id" text not null,
  "user_name" text,
  "total_points" numeric default 0,
  "rank" numeric,
  "division_tier" text default 'Bronze',
  "weekly_points" jsonb
);

alter table public.league_member enable row level security;

revoke all on public.league_member from anon, authenticated;

create policy owner_read on public.league_member for select to authenticated using ((select auth.uid())::text = user_id);

create policy owner_insert on public.league_member for insert to authenticated with check ((select auth.uid())::text = user_id);

create policy owner_update on public.league_member for update to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);

grant select on public.league_member to authenticated;

grant insert ("league_id", "user_id", "user_name"), update ("league_id", "user_id", "user_name") on public.league_member to authenticated;

create index league_member_owner on public.league_member(user_id);

create table public.news_article (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "title" text not null,
  "summary" text,
  "url" text not null,
  "image_url" text,
  "source_name" text,
  "published_at" text,
  "discipline" text,
  "organization" text,
  "fighter_names" jsonb,
  "data_source" text
);

alter table public.news_article enable row level security;

revoke all on public.news_article from anon, authenticated;

create policy admin_insert on public.news_article for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.news_article for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.news_article for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.news_article for select to anon, authenticated using (true);

grant select on public.news_article to anon, authenticated;

grant insert, update, delete on public.news_article to authenticated;

create table public.organization (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "name" text not null,
  "short_name" text,
  "discipline" text not null,
  "country" text,
  "website" text,
  "logo_url" text,
  "description" text,
  "is_tracked" boolean default true,
  "tier" text default 'Major',
  "official_events_url" text,
  "official_rankings_url" text,
  "api_available" boolean default false,
  "api_notes" text,
  "thesportsdb_id" text,
  "data_source_id" text
);

alter table public.organization enable row level security;

revoke all on public.organization from anon, authenticated;

create policy admin_insert on public.organization for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.organization for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.organization for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.organization for select to anon, authenticated using (true);

grant select on public.organization to anon, authenticated;

grant insert, update, delete on public.organization to authenticated;

create table public.prediction (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "user_id" text not null,
  "fight_id" text not null,
  "event_id" text,
  "predicted_winner_name" text not null,
  "predicted_method" text,
  "predicted_round" numeric,
  "is_correct_winner" boolean,
  "is_correct_method" boolean,
  "is_correct_round" boolean,
  "points_earned" numeric default 0,
  "is_resolved" boolean default false
);

alter table public.prediction enable row level security;

revoke all on public.prediction from anon, authenticated;

create policy owner_read on public.prediction for select to authenticated using ((select auth.uid())::text = user_id);

create policy owner_insert on public.prediction for insert to authenticated with check ((select auth.uid())::text = user_id);

create policy owner_update on public.prediction for update to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);

grant select on public.prediction to authenticated;

grant insert ("user_id", "fight_id", "event_id", "predicted_winner_name", "predicted_method", "predicted_round"), update ("user_id", "fight_id", "event_id", "predicted_winner_name", "predicted_method", "predicted_round") on public.prediction to authenticated;

create index prediction_owner on public.prediction(user_id);

create table public.user_profile (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "user_id" text not null,
  "username" text,
  "avatar_url" text,
  "favorite_discipline" text,
  "favorite_fighter_id" text,
  "favorite_fighter_name" text,
  "followed_fighter_ids" jsonb,
  "followed_org_ids" jsonb,
  "total_fantasy_points" numeric default 0,
  "total_prediction_points" numeric default 0,
  "division_tier" text default 'Bronze',
  "lineups_submitted" numeric default 0,
  "predictions_made" numeric default 0,
  "correct_predictions" numeric default 0,
  "bio" text
);

alter table public.user_profile enable row level security;

revoke all on public.user_profile from anon, authenticated;

create policy owner_read on public.user_profile for select to authenticated using ((select auth.uid())::text = user_id);

create policy owner_insert on public.user_profile for insert to authenticated with check ((select auth.uid())::text = user_id);

create policy owner_update on public.user_profile for update to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);

grant select on public.user_profile to authenticated;

grant insert ("user_id", "username", "avatar_url", "favorite_discipline", "favorite_fighter_id", "favorite_fighter_name", "followed_fighter_ids", "followed_org_ids", "bio"), update ("user_id", "username", "avatar_url", "favorite_discipline", "favorite_fighter_id", "favorite_fighter_name", "followed_fighter_ids", "followed_org_ids", "bio") on public.user_profile to authenticated;

create unique index user_profile_user_id on public.user_profile(user_id);

create index user_profile_owner on public.user_profile(user_id);

create table public.video (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  data_origin text not null default 'real' check (data_origin = 'real'),
  "title" text not null,
  "url" text not null,
  "thumbnail_url" text,
  "channel_name" text,
  "published_at" text,
  "duration_seconds" numeric,
  "view_count" numeric,
  "video_type" text,
  "discipline" text,
  "organization" text,
  "fighter_names" jsonb,
  "youtube_id" text,
  "data_source" text
);

alter table public.video enable row level security;

revoke all on public.video from anon, authenticated;

create policy admin_insert on public.video for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_update on public.video for update to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin') with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy admin_delete on public.video for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy public_read on public.video for select to anon, authenticated using (true);

grant select on public.video to anon, authenticated;

grant insert, update, delete on public.video to authenticated;
