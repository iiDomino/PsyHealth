-- 验证手机号后，前端可兜底确保当前用户拥有机构账号。
create or replace function public.psyhealth_ensure_organization(p_name text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  u auth.users;
  org public.psyhealth_organizations;
begin
  select * into u from auth.users where id=auth.uid();
  if u.id is null then
    raise exception 'not_authenticated';
  end if;
  if u.phone_confirmed_at is null and u.email_confirmed_at is null then
    raise exception 'not_verified';
  end if;
  if exists(select 1 from public.psyhealth_admins where user_id=u.id) then
    raise exception 'system_admin_not_organization';
  end if;

  insert into public.psyhealth_organizations(user_id,email,phone,name,status,expires_at)
  values(
    u.id,
    u.email,
    u.phone,
    coalesce(nullif(trim(p_name),''), u.raw_user_meta_data->>'organization_name', '未命名机构'),
    'active',
    now()+interval '3 days'
  )
  on conflict(user_id) do update
    set name=coalesce(nullif(trim(p_name),''), public.psyhealth_organizations.name),
        email=excluded.email,
        phone=excluded.phone,
        status=case when public.psyhealth_organizations.status='suspended' then public.psyhealth_organizations.status else 'active' end,
        expires_at=greatest(coalesce(public.psyhealth_organizations.expires_at, now()), now()+interval '3 days'),
        updated_at=now()
  returning * into org;

  return jsonb_build_object(
    'role','organization',
    'name',org.name,
    'phone',org.phone,
    'status',org.status,
    'expiresAt',org.expires_at,
    'usable',org.status='active' and org.expires_at>now()
  );
end $$;

grant execute on function public.psyhealth_ensure_organization(text) to authenticated;
