-- 系统管理中心只显示已完成手机号/邮箱验证的机构账号。
create or replace function public.psyhealth_system_organizations() returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select case
   when public.psyhealth_is_system_admin() then coalesce(
     jsonb_agg(
       jsonb_build_object(
         'userId',o.user_id,
         'email',o.email,
         'phone',o.phone,
         'name',o.name,
         'status',o.status,
         'expiresAt',o.expires_at,
         'createdAt',o.created_at
       ) order by o.created_at desc
     ),
     '[]'::jsonb
   )
   else '[]'::jsonb
 end
 from public.psyhealth_organizations o
 join auth.users u on u.id=o.user_id
 where u.email_confirmed_at is not null or u.phone_confirmed_at is not null
$$;

grant execute on function public.psyhealth_system_organizations() to authenticated;
