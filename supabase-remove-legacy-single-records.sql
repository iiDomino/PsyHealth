-- 清理旧版“单次测评记录”数据与回写逻辑。
-- 运行位置：Supabase SQL Editor。
-- 影响范围：只清空旧表 public.psyhealth_participants，并更新保存结果函数不再回写旧表。
-- 不会删除：public.psyhealth_clients、public.psyhealth_client_sessions、机构账号、机构代码、来访者档案。

truncate table public.psyhealth_participants;

drop function if exists public.psyhealth_begin_participant(jsonb,text);
drop function if exists public.psyhealth_admin_list();
drop function if exists public.psyhealth_admin_get(uuid);
drop function if exists public.psyhealth_admin_delete(uuid[]);

create or replace function public.psyhealth_save_result(p_id uuid, p_edit_token uuid, p_result jsonb)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.psyhealth_client_sessions
     set results=coalesce(results,'[]'::jsonb) || jsonb_build_array(p_result),
         updated_at=now()
   where id=p_id and edit_token=p_edit_token;

  return found;
end $$;

grant execute on function public.psyhealth_save_result(uuid,uuid,jsonb) to anon, authenticated;
