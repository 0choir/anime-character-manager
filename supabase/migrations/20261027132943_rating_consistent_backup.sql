-- A single stable database snapshot avoids mixing different revisions across backup pages.
create function public.rating_export_backup() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not rating_private.is_admin() then raise exception '管理者ログインが必要です' using errcode='42501'; end if;
  select jsonb_build_object(
    'format','anime-rating-backup','version',1,'exported_at',now(),
    'characters',coalesce((select jsonb_agg(public.rating_character_document(c.id) order by c.id) from public.characters_v2 c),'[]'::jsonb),
    'titles',coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.titles t),'[]'::jsonb),
    'voiceActors',coalesce((select jsonb_agg(to_jsonb(v) order by v.id) from public.voice_actors v),'[]'::jsonb),
    'snapshots',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.score_snapshots_v2 s),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.id) from public.rating_change_history h),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.rating_export_backup() from public,anon;
grant execute on function public.rating_export_backup() to authenticated;
notify pgrst,'reload schema';

