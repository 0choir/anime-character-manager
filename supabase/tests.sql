-- Integration assertions run in one transaction. No accounts or test data are committed.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('eb6d1911-3e6e-4e56-aefe-631c7516da18','00000000-0000-0000-0000-000000000000','authenticated','authenticated','souta@0choi.com','',now(),'{}','{}',now(),now());
select set_config('request.jwt.claims','{"sub":"eb6d1911-3e6e-4e56-aefe-631c7516da18","role":"authenticated"}',true);
set local role authenticated;
do $$
declare cid bigint; tid bigint; payload jsonb; old_doc jsonb; snap_name text := '__rating_integration_snapshot__'; amount integer;
  baseline_active integer; baseline_characters integer; baseline_snapshots integer;
begin
  if not public.rating_is_admin() then raise exception 'ASSERT: verified allowlisted user must be admin'; end if;
  select count(*) into baseline_active from public.rating_characters;
  select count(*) into baseline_characters from public.characters_v2;
  select count(*) into baseline_snapshots from public.score_snapshots_v2;
  tid := public.rating_add_master('title','__rating_integration_title__');
  payload := jsonb_build_object('title_id',tid,'character_name','__rating_integration_character__','registered_year',2026,
    'score_looks',50,'score_personality',60,'score_voice',70,'score_cuteness',80,'score_other',90,
    'looks_breakdown',jsonb_build_object('face',25,'hair',7,'body',5,'bust',7,'expression',6));
  cid := public.rating_save_character(payload,null,'integration create');
  old_doc := public.rating_character_document(cid);
  if (old_doc->>'total_score')::integer<>350 or old_doc->'looks_breakdown'<>payload->'looks_breakdown' then raise exception 'ASSERT: atomic save and details'; end if;
  payload := payload || jsonb_build_object('character_id',cid);
  -- Constraint failure after character UPDATE must roll back the entire call.
  begin
    perform public.rating_save_character(payload||'{"character_name":"__should_rollback__","score_looks":51}'::jsonb,0,'invalid details');
    raise exception 'ASSERT: invalid details were accepted';
  exception when check_violation then null; end;
  if public.rating_character_document(cid)<>old_doc then raise exception 'ASSERT: partial update leaked'; end if;
  perform public.rating_save_character(payload,0,'integration update');
  begin
    perform public.rating_save_character(payload,0,'stale update');
    raise exception 'ASSERT: stale update accepted';
  exception when serialization_failure then null; end;
  amount := public.rating_take_snapshot(snap_name);
  if amount<>baseline_active+1 then raise exception 'ASSERT: snapshot does not include all active characters: %',amount; end if;
  begin
    perform public.rating_take_snapshot(snap_name);
    raise exception 'ASSERT: duplicate snapshot accepted';
  exception when raise_exception then if sqlerrm='ASSERT: duplicate snapshot accepted' then raise; end if; end;
  perform public.rating_save_character(payload||'{"character_name":"__renamed_after_snapshot__"}'::jsonb,1,'rename');
  if (select character_name from public.v2_snapshot_export where snapshot_name=snap_name and character_id=cid)<>'__rating_integration_character__' then raise exception 'ASSERT: historical name was overwritten'; end if;
  perform public.rating_set_image(cid,2,'https://wkkfwgyqzpjtjdsbncya.supabase.co/storage/v1/object/public/character-images/test.png');
  perform public.rating_set_deleted(cid,3,false,'delete');
  if exists(select 1 from public.rating_characters where character_id=cid) then raise exception 'ASSERT: deleted character remained in ranking'; end if;
  perform public.rating_set_deleted(cid,4,true,'restore');
  if not exists(select 1 from public.rating_characters where character_id=cid) then raise exception 'ASSERT: restore failed'; end if;
  if (select count(*) from public.rating_change_history where character_id=cid)<>6 then raise exception 'ASSERT: missing change history'; end if;
  begin
    perform public.rating_import_characters(jsonb_build_array(
      payload||jsonb_build_object('character_id',null,'title_name','__rating_import_rollback_title__','character_name','__import_should_rollback__'),
      payload||jsonb_build_object('character_id',null,'title_name','__rating_import_rollback_title__','character_name','__bad_import__','score_voice',101)
    ),'invalid import');
    raise exception 'ASSERT: invalid bulk import accepted';
  exception when raise_exception then if sqlerrm='ASSERT: invalid bulk import accepted' then raise; end if; end;
  if exists(select 1 from public.titles where name='__rating_import_rollback_title__') then raise exception 'ASSERT: bulk import did not roll back masters'; end if;
  amount := public.rating_import_characters(jsonb_build_array(payload||jsonb_build_object('character_id',null,'title_name','__rating_import_ok_title__','character_name','__import_ok__')),'valid import');
  if amount<>1 or not exists(select 1 from public.rating_characters where character_name='__import_ok__') then raise exception 'ASSERT: valid import failed'; end if;
  if jsonb_array_length(public.rating_export_backup()->'characters')<>baseline_characters+2 or jsonb_array_length(public.rating_export_backup()->'snapshots')<>baseline_snapshots+baseline_active+1 then raise exception 'ASSERT: incomplete backup'; end if;
  perform set_config('rating.test_active',(baseline_active+2)::text,true);
end $$;
reset role;
update auth.users set email_confirmed_at=null where id='eb6d1911-3e6e-4e56-aefe-631c7516da18';
set local role authenticated;
do $$ begin if public.rating_is_admin() then raise exception 'ASSERT: unconfirmed user became admin'; end if; end $$;
-- Signed-in users who are not on the allowlist cannot mutate data.
select set_config('request.jwt.claims','{"sub":"ea80d9b8-c22f-476e-a636-33b41f50ec8c","role":"authenticated"}',true);
do $$ begin
  if public.rating_is_admin() then raise exception 'ASSERT: non-admin obtained privileges'; end if;
  begin perform public.rating_save_character('{}',null,''); raise exception 'ASSERT: non-admin wrote data'; exception when insufficient_privilege then null; end;
  if exists(select 1 from public.rating_change_history) then raise exception 'ASSERT: non-admin read private notes'; end if;
  begin perform public.rating_export_backup(); raise exception 'ASSERT: non-admin exported private data'; exception when insufficient_privilege then null; end;
end $$;
-- Anonymous browsing works while writes and private history remain denied.
set local role anon;
do $$ begin
  if (select count(*) from public.rating_characters)<>current_setting('rating.test_active')::integer then raise exception 'ASSERT: public ranking missing'; end if;
  begin perform public.rating_take_snapshot('__forbidden__'); raise exception 'ASSERT: anon called mutation'; exception when insufficient_privilege then null; end;
  begin insert into public.characters_v2(character_name) values('__forbidden__'); raise exception 'ASSERT: anon wrote directly'; exception when insufficient_privilege then null; end;
  begin perform * from public.rating_change_history; raise exception 'ASSERT: anon read history'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: admin save/detail/rollback/concurrency/snapshot/history/image/delete/restore/import and anon/non-admin boundaries' as integration_result;

