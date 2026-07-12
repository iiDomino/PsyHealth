-- 让“机构账号与使用期限”按最近活跃度排序。
-- 最近活跃度取：机构账号更新时间、机构代码更新时间、来访者档案更新时间、旧版测评记录更新时间中的最新值。
create or replace function public.psyhealth_system_organizations()
returns jsonb
language sql
security definer
set search_path=public,pg_temp
as $$
  select case when public.psyhealth_is_system_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'userId',o.user_id,
    'email',o.email,
    'phone',o.phone,
    'name',o.name,
    'status',o.status,
    'expiresAt',o.expires_at,
    'adminNote',o.admin_note,
    'createdAt',o.created_at,
    'updatedAt',o.updated_at,
    'latestActivityAt',greatest(
      coalesce(o.updated_at,o.created_at),
      coalesce((select max(i.updated_at) from public.psyhealth_invites i where i.organization_id=o.user_id), o.created_at),
      coalesce((select max(c.updated_at) from public.psyhealth_clients c where c.organization_id=o.user_id), o.created_at),
      coalesce((select max(p.updated_at) from public.psyhealth_participants p where p.organization_id=o.user_id), o.created_at)
    )
  ) order by greatest(
      coalesce(o.updated_at,o.created_at),
      coalesce((select max(i.updated_at) from public.psyhealth_invites i where i.organization_id=o.user_id), o.created_at),
      coalesce((select max(c.updated_at) from public.psyhealth_clients c where c.organization_id=o.user_id), o.created_at),
      coalesce((select max(p.updated_at) from public.psyhealth_participants p where p.organization_id=o.user_id), o.created_at)
    ) desc),'[]'::jsonb) else '[]'::jsonb end
  from public.psyhealth_organizations o
  join auth.users u on u.id=o.user_id
  where u.phone_confirmed_at is not null or u.email_confirmed_at is not null
$$;

grant execute on function public.psyhealth_system_organizations() to authenticated;
