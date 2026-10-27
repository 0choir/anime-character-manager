-- Existing character/playlist data is retained. This migration only changes rating-app objects.
create schema if not exists rating_private;
revoke all on schema rating_private from public, anon, authenticated;
grant usage on schema rating_private to authenticated;

create table rating_private.admin_emails (
  email text primary key check (email = lower(btrim(email)))
);
alter table rating_private.admin_emails enable row level security;
revoke all on rating_private.admin_emails from public, anon, authenticated;
insert into rating_private.admin_emails(email) values ('souta@0choi.com');

-- Private definer is needed solely to read confirmed Auth identities and the private allowlist.
create function rating_private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.users u join rating_private.admin_emails a on a.email = lower(u.email)
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false)
  );
$$;
revoke all on function rating_private.is_admin() from public, anon;
grant execute on function rating_private.is_admin() to authenticated;
create function public.rating_is_admin() returns boolean language sql stable security invoker
set search_path = '' as $$ select rating_private.is_admin(); $$;
revoke all on function public.rating_is_admin() from public, anon;
grant execute on function public.rating_is_admin() to authenticated;

alter table public.characters_v2 add column deleted_at timestamptz;
alter table public.characters_v2 add column revision bigint not null default 0;
alter table public.characters_v2 add constraint rating_character_name_valid check (length(btrim(character_name)) between 1 and 200);
alter table public.characters_v2 add constraint rating_registered_year_valid check (registered_year is null or registered_year between 1900 and 2200) not valid;
create unique index rating_character_identity on public.characters_v2(title_id, lower(btrim(character_name))) where deleted_at is null;
create index rating_characters_voice_actor on public.characters_v2(voice_actor_id);
create index rating_characters_deleted on public.characters_v2(deleted_at) where deleted_at is not null;
alter table public.scores add column looks_breakdown jsonb;
alter table public.scores add column other_breakdown jsonb;
alter table public.scores add constraint rating_scores_range check (
  score_looks between 0 and 100 and score_personality between 0 and 100 and score_voice between 0 and 100
  and score_cuteness between 0 and 100 and score_other between 0 and 100
);
create function public.rating_valid_breakdown(value jsonb, field_names text[], maxima integer[], total integer)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare i integer; accumulated integer := 0; v numeric;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' or (select count(*) from jsonb_object_keys(value)) <> array_length(field_names,1) then return false; end if;
  for i in 1..array_length(field_names,1) loop
    if not value ? field_names[i] or jsonb_typeof(value->field_names[i]) <> 'number' then return false; end if;
    v := (value->>field_names[i])::numeric;
    if v <> trunc(v) or v < 0 or v > maxima[i] then return false; end if;
    accumulated := accumulated + v::integer;
  end loop;
  return accumulated = total;
exception when others then return false;
end; $$;
revoke all on function public.rating_valid_breakdown(jsonb,text[],integer[],integer) from public, anon;
grant execute on function public.rating_valid_breakdown(jsonb,text[],integer[],integer) to authenticated;
alter table public.scores add constraint rating_looks_detail_valid check (public.rating_valid_breakdown(looks_breakdown,array['face','hair','body','bust','expression'],array[50,15,10,15,10],score_looks));
alter table public.scores add constraint rating_other_detail_valid check (public.rating_valid_breakdown(other_breakdown,array['sense','ability','cleanliness','age'],array[50,25,15,10],score_other));

alter table public.score_snapshots_v2 add column registered_year integer;
alter table public.score_snapshots_v2 add column looks_breakdown jsonb;
alter table public.score_snapshots_v2 add column other_breakdown jsonb;
alter table public.score_snapshots_v2 add column saved_rank bigint;
alter table public.score_snapshots_v2 add column saved_honor text;
alter table public.score_snapshots_v2 add column saved_tier text;
alter table public.score_snapshots_v2 add column saved_t_score numeric;
create index rating_snapshot_lookup on public.score_snapshots_v2(snapshot_name,character_id,id);

create table public.rating_change_history (
  id bigint generated always as identity primary key,
  character_id bigint not null references public.characters_v2(id),
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid(),
  change_type text not null check (change_type in ('create','update','delete','restore','image')),
  reason text not null default '' check (length(reason) <= 2000),
  old_data jsonb,
  new_data jsonb
);
create index rating_history_character_time on public.rating_change_history(character_id,changed_at desc,id desc);

-- Keep the established rank, honor and Tier rules. Deleted characters are excluded before statistics.
create or replace view public.v2_character_rankings with (security_invoker = true) as
with base_scores as (
  select c.id character_id,c.character_name,c.registered_year,t.id title_id,t.name title_name,
    va.id voice_actor_id,va.name voice_actor_name,c.image_url,
    coalesce(s.score_looks,0) score_looks,coalesce(s.score_personality,0) score_personality,
    coalesce(s.score_voice,0) score_voice,coalesce(s.score_cuteness,0) score_cuteness,
    coalesce(s.score_other,0) score_other,coalesce(s.total_score,0) total_score
  from public.characters_v2 c join public.titles t on t.id=c.title_id
  left join public.voice_actors va on va.id=c.voice_actor_id left join public.scores s on s.character_id=c.id
  where c.deleted_at is null
), stats as (
  select avg(total_score) avg_score,coalesce(nullif(stddev_pop(total_score),0),1) stddev_score from base_scores
), calculated as (
  select b.*,row_number() over(order by total_score desc,score_looks desc,character_id) current_rank,
    round((total_score::numeric-st.avg_score)/st.stddev_score*10+50) t_score
  from base_scores b cross join stats st
)
select *,case when current_rank=1 then '海賊王' when current_rank<=5 then '四皇' when current_rank<=12 then '王下七武海'
  when current_rank<=30 then '大将' when current_rank<=50 then '中将' when current_rank<=100 then '少将' end title_honor,
case when t_score>=63 then 'Tier 1' when t_score>=60 then 'Tier 2' when t_score>=57 then 'Tier 3'
  when t_score>=54 then 'Tier 4' when t_score>=50 then 'Tier 5' else 'Tier 6' end tier_name
from calculated order by current_rank;

create view public.rating_characters with (security_invoker = true) as
select r.*,c.revision,s.updated_at,s.looks_breakdown,s.other_breakdown
from public.v2_character_rankings r join public.characters_v2 c on c.id=r.character_id
left join public.scores s on s.character_id=r.character_id;

create or replace view public.v2_snapshot_export with (security_invoker = true) as
with stats as (
  select snapshot_name,avg(total_score) avg_score,coalesce(nullif(stddev_pop(total_score),0),1) stddev_score
  from public.score_snapshots_v2 group by snapshot_name
), calculated as (
  select s.*,coalesce(saved_rank,row_number() over(partition by s.snapshot_name order by s.total_score desc,s.score_looks desc,s.character_id,s.id)) current_rank,
    coalesce(saved_t_score,round((s.total_score::numeric-st.avg_score)/st.stddev_score*10+50)) t_score
  from public.score_snapshots_v2 s join stats st on st.snapshot_name=s.snapshot_name
)
select snapshot_name,character_id,character_name,title_name,voice_actor_name,image_url,
  score_looks,score_personality,score_voice,score_cuteness,score_other,total_score,current_rank,t_score,
  case when saved_rank is not null then saved_honor else case when current_rank=1 then '海賊王' when current_rank<=5 then '四皇' when current_rank<=12 then '王下七武海'
    when current_rank<=30 then '大将' when current_rank<=50 then '中将' when current_rank<=100 then '少将' end end title_honor,
  coalesce(saved_tier,case when t_score>=63 then 'Tier 1' when t_score>=60 then 'Tier 2' when t_score>=57 then 'Tier 3'
    when t_score>=54 then 'Tier 4' when t_score>=50 then 'Tier 5' else 'Tier 6' end) tier_name,
  id snapshot_row_id,registered_year,looks_breakdown,other_breakdown,recorded_at
from calculated;

create view public.rating_snapshot_list with (security_invoker = true) as
select snapshot_name,max(recorded_at) recorded_at,count(*) character_count,
  count(*)-count(distinct character_id) duplicate_count
from public.score_snapshots_v2 group by snapshot_name;

-- Remove only rating-table policies, leaving the shared project's other applications alone.
do $$ declare p record; t text; begin
  for p in select schemaname,tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('characters_v2','scores','titles','voice_actors','score_snapshots_v2','rating_change_history') loop
    execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
  foreach t in array array['characters_v2','scores','titles','voice_actors','score_snapshots_v2','rating_change_history'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to anon,authenticated',t);
    execute format('grant insert,update on public.%I to authenticated',t);
    execute format('create policy rating_admin_insert on public.%I for insert to authenticated with check ((select rating_private.is_admin()))',t);
    if t <> 'rating_change_history' then
      execute format('create policy rating_admin_update on public.%I for update to authenticated using ((select rating_private.is_admin())) with check ((select rating_private.is_admin()))',t);
    end if;
  end loop;
end $$;
create policy rating_public_read on public.characters_v2 for select to anon using(deleted_at is null);
create policy rating_authenticated_read on public.characters_v2 for select to authenticated using(deleted_at is null or (select rating_private.is_admin()));
create policy rating_public_read on public.scores for select to anon,authenticated using(exists(select 1 from public.characters_v2 c where c.id=character_id));
create policy rating_public_read on public.titles for select to anon,authenticated using(true);
create policy rating_public_read on public.voice_actors for select to anon,authenticated using(true);
create policy rating_public_read on public.score_snapshots_v2 for select to anon,authenticated using(true);
create policy rating_admin_read on public.rating_change_history for select to authenticated using((select rating_private.is_admin()));
revoke select,update on public.rating_change_history from anon;
revoke update on public.rating_change_history from authenticated;

do $$ declare s text; begin
  foreach s in array array['characters_v2','scores','titles','voice_actors','score_snapshots_v2','rating_change_history'] loop
    execute format('grant usage,select on sequence %s to authenticated',pg_get_serial_sequence('public.'||s,'id'));
  end loop;
end $$;
grant select on public.rating_characters,public.v2_character_rankings,public.v2_snapshot_export,public.rating_snapshot_list to anon,authenticated;

create function public.rating_character_document(character_id bigint) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(c) || jsonb_build_object('character_id',c.id,'title_name',t.name,'voice_actor_name',v.name) ||
    coalesce((to_jsonb(s)-'id'-'character_id'),'{}'::jsonb)
  from public.characters_v2 c join public.titles t on t.id=c.title_id
  left join public.voice_actors v on v.id=c.voice_actor_id left join public.scores s on s.character_id=c.id
  where c.id=$1;
$$;

create function public.rating_save_character(payload jsonb,expected_revision bigint default null,reason text default '')
returns bigint language plpgsql security invoker set search_path = '' as $$
declare cid bigint; old_doc jsonb; new_doc jsonb; k text; n numeric; is_new boolean;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(72710427);
  if jsonb_typeof(payload)<>'object' or length(btrim(coalesce(payload->>'character_name',''))) not between 1 and 200
    or nullif(payload->>'title_id','') is null then raise exception '作品とキャラクター名を指定してください'; end if;
  if length(coalesce(reason,''))>2000 then raise exception '理由は2000文字以内にしてください'; end if;
  foreach k in array array['score_looks','score_personality','score_voice','score_cuteness','score_other'] loop
    if jsonb_typeof(payload->k) <> 'number' or payload->k is null then raise exception '点数は0〜100の整数で指定してください'; end if;
    n := (payload->>k)::numeric;
    if n<>trunc(n) or n not between 0 and 100 then raise exception '点数は0〜100の整数で指定してください'; end if;
  end loop;
  cid := nullif(payload->>'character_id','')::bigint;
  is_new := cid is null;
  if not is_new then
    select public.rating_character_document(cid) into old_doc;
    if old_doc is null or old_doc->>'deleted_at' is not null then raise exception 'キャラクターが見つからないか、ごみ箱にあります'; end if;
    if expected_revision is null or (old_doc->>'revision')::bigint<>expected_revision then raise exception '別の画面で更新されています。一覧を再読み込みしてから編集してください' using errcode='40001'; end if;
    update public.characters_v2 set title_id=(payload->>'title_id')::bigint,
      voice_actor_id=nullif(payload->>'voice_actor_id','')::bigint,character_name=btrim(payload->>'character_name'),
      registered_year=nullif(payload->>'registered_year','')::integer,revision=revision+1 where id=cid;
  else
    insert into public.characters_v2(title_id,voice_actor_id,character_name,registered_year)
    values ((payload->>'title_id')::bigint,nullif(payload->>'voice_actor_id','')::bigint,btrim(payload->>'character_name'),nullif(payload->>'registered_year','')::integer) returning id into cid;
  end if;
  insert into public.scores(character_id,score_looks,score_personality,score_voice,score_cuteness,score_other,looks_breakdown,other_breakdown)
  values(cid,(payload->>'score_looks')::integer,(payload->>'score_personality')::integer,(payload->>'score_voice')::integer,
    (payload->>'score_cuteness')::integer,(payload->>'score_other')::integer,nullif(payload->'looks_breakdown','null'::jsonb),nullif(payload->'other_breakdown','null'::jsonb))
  on conflict(character_id) do update set score_looks=excluded.score_looks,score_personality=excluded.score_personality,
    score_voice=excluded.score_voice,score_cuteness=excluded.score_cuteness,score_other=excluded.score_other,
    looks_breakdown=excluded.looks_breakdown,other_breakdown=excluded.other_breakdown,updated_at=now();
  new_doc := public.rating_character_document(cid);
  insert into public.rating_change_history(character_id,change_type,reason,old_data,new_data)
    values(cid,case when is_new then 'create' else 'update' end,coalesce(reason,''),old_doc,new_doc);
  return cid;
end; $$;

create function public.rating_set_deleted(character_id bigint,expected_revision bigint,restore boolean default false,reason text default '')
returns void language plpgsql security invoker set search_path = '' as $$
declare old_doc jsonb;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(72710427);
  old_doc := public.rating_character_document(character_id);
  if old_doc is null or (old_doc->>'revision')::bigint<>expected_revision then raise exception 'データが更新されています。再読み込みしてください' using errcode='40001'; end if;
  if restore and old_doc->>'deleted_at' is null then raise exception 'すでに復元されています'; end if;
  if not restore and old_doc->>'deleted_at' is not null then raise exception 'すでにごみ箱にあります'; end if;
  update public.characters_v2 set deleted_at=case when restore then null else now() end,revision=revision+1 where id=character_id;
  insert into public.rating_change_history(character_id,change_type,reason,old_data,new_data)
    values(character_id,case when restore then 'restore' else 'delete' end,coalesce(reason,''),old_doc,public.rating_character_document(character_id));
end; $$;

create function public.rating_set_image(character_id bigint,expected_revision bigint,image_url text)
returns void language plpgsql security invoker set search_path = '' as $$
declare old_doc jsonb;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(72710427);
  old_doc := public.rating_character_document(character_id);
  if old_doc is null or old_doc->>'deleted_at' is not null or (old_doc->>'revision')::bigint<>expected_revision then raise exception 'データが更新されています。再読み込みしてください' using errcode='40001'; end if;
  if image_url not like 'https://wkkfwgyqzpjtjdsbncya.supabase.co/storage/v1/object/public/character-images/%' then raise exception '画像URLが不正です'; end if;
  update public.characters_v2 set image_url=rating_set_image.image_url,revision=revision+1 where id=character_id;
  insert into public.rating_change_history(character_id,change_type,reason,old_data,new_data)
    values(character_id,'image','画像を変更',old_doc,public.rating_character_document(character_id));
end; $$;

create function public.rating_add_master(kind text,master_name text) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare result bigint;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(72710427);
  if length(btrim(master_name)) not between 1 and 200 then raise exception '名前は1〜200文字にしてください'; end if;
  if kind='title' then
    select id into result from public.titles where lower(btrim(name))=lower(btrim(master_name)) order by id limit 1;
    if result is null then insert into public.titles(name) values(btrim(master_name)) returning id into result; end if;
  elsif kind='voice' then
    select id into result from public.voice_actors where lower(btrim(name))=lower(btrim(master_name)) order by id limit 1;
    if result is null then insert into public.voice_actors(name) values(btrim(master_name)) returning id into result; end if;
  else raise exception 'マスタの種類が不正です'; end if;
  return result;
end; $$;

create function public.rating_take_snapshot(snapshot_name text) returns integer
language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(72710427);
  if length(btrim(snapshot_name)) not between 1 and 100 then raise exception '点数表名は1〜100文字にしてください'; end if;
  if exists(select 1 from public.score_snapshots_v2 s where lower(btrim(s.snapshot_name))=lower(btrim(rating_take_snapshot.snapshot_name))) then raise exception '同じ名前の点数表があります'; end if;
  insert into public.score_snapshots_v2(snapshot_name,character_id,character_name,title_name,voice_actor_name,image_url,
    score_looks,score_personality,score_voice,score_cuteness,score_other,total_score,registered_year,looks_breakdown,other_breakdown,
    saved_rank,saved_honor,saved_tier,saved_t_score)
  select btrim(rating_take_snapshot.snapshot_name),r.character_id,r.character_name,r.title_name,r.voice_actor_name,r.image_url,
    r.score_looks,r.score_personality,r.score_voice,r.score_cuteness,r.score_other,r.total_score,r.registered_year,r.looks_breakdown,r.other_breakdown,
    r.current_rank,r.title_honor,r.tier_name,r.t_score from public.rating_characters r;
  get diagnostics affected = row_count;
  if affected=0 then raise exception '保存するキャラクターがありません'; end if;
  return affected;
end; $$;

-- Keep the legacy snapshot entry point safe as well.
create or replace function public.take_v2_snapshot(snap_name text) returns void
language plpgsql security invoker set search_path = '' as $$ begin perform public.rating_take_snapshot(snap_name); end; $$;

create function public.rating_import_characters(rows jsonb,reason text default '') returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; payload jsonb; tid bigint; vid bigint; count_rows integer := 0;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(72710427);
  if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows) not between 1 and 5000 then raise exception '取り込み件数は1〜5000件にしてください'; end if;
  for item in select value from jsonb_array_elements(rows) loop
    if nullif(btrim(item->>'title_name'),'') is null then raise exception '作品名を指定してください'; end if;
    tid := public.rating_add_master('title',item->>'title_name');
    vid := null;
    if nullif(btrim(item->>'voice_actor_name'),'') is not null then vid := public.rating_add_master('voice',item->>'voice_actor_name'); end if;
    payload := item || jsonb_build_object('title_id',tid,'voice_actor_id',vid);
    perform public.rating_save_character(payload,nullif(item->>'expected_revision','')::bigint,coalesce(nullif(reason,''),'ファイルから取り込み'));
    count_rows := count_rows+1;
  end loop;
  return count_rows;
end; $$;

-- Explicit execution grants: public functions never inherit a blanket PUBLIC EXECUTE grant.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like 'rating_%' or p.proname='take_v2_snapshot') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;

-- Preserve policies for other buckets; remove their ability to bypass rating image restrictions.
do $$ declare p record; begin
  for p in select * from pg_policies where schemaname='storage' and tablename='objects' loop
    if p.qual is not null then execute format('alter policy %I on storage.objects using ((%s) and bucket_id <> %L)',p.policyname,p.qual,'character-images'); end if;
    if p.with_check is not null then execute format('alter policy %I on storage.objects with check ((%s) and bucket_id <> %L)',p.policyname,p.with_check,'character-images'); end if;
  end loop;
end $$;
create policy rating_images_read on storage.objects for select to anon,authenticated using(bucket_id='character-images');
create policy rating_images_insert on storage.objects for insert to authenticated with check(bucket_id='character-images' and (select rating_private.is_admin()));
create policy rating_images_update on storage.objects for update to authenticated using(bucket_id='character-images' and (select rating_private.is_admin())) with check(bucket_id='character-images' and (select rating_private.is_admin()));
create policy rating_images_delete on storage.objects for delete to authenticated using(bucket_id='character-images' and (select rating_private.is_admin()));
notify pgrst,'reload schema';

