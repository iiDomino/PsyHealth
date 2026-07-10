-- 机构管理增强：机构名登录、名称查重、停用立即生效、系统管理员删除机构。

create or replace function public.psyhealth_check_org_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  clean_name text := trim(coalesce(p_name,''));
begin
  if clean_name = '' then
    raise exception 'organization_name_required';
  end if;
  if exists (
    select 1
    from public.psyhealth_organizations
    where lower(trim(name)) = lower(clean_name)
  ) then
    raise exception 'organization_name_exists';
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.psyhealth_login_phone_by_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  clean_name text := trim(coalesce(p_name,''));
  found_phone text;
begin
  if clean_name = '' then
    raise exception 'organization_name_required';
  end if;
  select phone into found_phone
  from public.psyhealth_organizations
  where lower(trim(name)) = lower(clean_name)
  order by created_at desc
  limit 1;
  if found_phone is null then
    raise exception 'organization_not_found';
  end if;
  return jsonb_build_object('phone', found_phone);
end $$;

create or replace function public.psyhealth_current_org_usable()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists(
    select 1
    from public.psyhealth_organizations
    where user_id=auth.uid()
      and status='active'
      and expires_at>now()
  )
$$;

create or replace function public.psyhealth_ensure_organization(p_name text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  u auth.users;
  org public.psyhealth_organizations;
  clean_name text := trim(coalesce(p_name,''));
begin
  if clean_name = '' then
    raise exception 'organization_name_required';
  end if;
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
  if exists(
    select 1
    from public.psyhealth_organizations
    where lower(trim(name))=lower(clean_name)
      and user_id<>u.id
  ) then
    raise exception 'organization_name_exists';
  end if;

  insert into public.psyhealth_organizations(user_id,email,phone,name,status,expires_at)
  values(u.id,u.email,u.phone,clean_name,'active',now()+interval '3 days')
  on conflict(user_id) do update
    set name=excluded.name,
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

create or replace function public.psyhealth_org_codes()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_current_org_usable() then
    raise exception 'organization_inactive';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'label',label,'allowedScales',allowed_scales,'active',active) order by created_at desc),'[]'::jsonb)
    from public.psyhealth_invites
    where organization_id=auth.uid()
  );
end $$;

create or replace function public.psyhealth_org_delete_code(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_current_org_usable() then
    raise exception 'organization_inactive';
  end if;
  return (
    with d as(delete from public.psyhealth_invites where id=p_id and organization_id=auth.uid() returning 1)
    select exists(select 1 from d)
  );
end $$;

create or replace function public.psyhealth_admin_list()
returns jsonb
language sql
security definer
set search_path=public,pg_temp
as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'intake',p.intake,'results',p.results,'createdAt',p.created_at,'updatedAt',p.updated_at,'organizationId',p.organization_id,'institutionCode',p.access_group,'organizationName',o.name) order by p.created_at desc),'[]'::jsonb)
 from public.psyhealth_participants p
 left join public.psyhealth_organizations o on o.user_id=p.organization_id
 where public.psyhealth_is_system_admin()
    or (p.organization_id=auth.uid() and public.psyhealth_current_org_usable())
$$;

create or replace function public.psyhealth_admin_get(p_id uuid)
returns jsonb
language sql
security definer
set search_path=public,pg_temp
as $$
 select jsonb_build_object('id',p.id,'intake',p.intake,'results',p.results,'createdAt',p.created_at,'organizationId',p.organization_id,'institutionCode',p.access_group,'organizationName',o.name)
 from public.psyhealth_participants p
 left join public.psyhealth_organizations o on o.user_id=p.organization_id
 where p.id=p_id
   and (public.psyhealth_is_system_admin() or (p.organization_id=auth.uid() and public.psyhealth_current_org_usable()))
$$;

create or replace function public.psyhealth_admin_delete(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare n int;
begin
  if not public.psyhealth_is_system_admin() and not public.psyhealth_current_org_usable() then
    raise exception 'organization_inactive';
  end if;
  delete from public.psyhealth_participants
  where id=any(p_ids)
    and (public.psyhealth_is_system_admin() or organization_id=auth.uid());
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function public.psyhealth_system_delete_organization(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  if exists(select 1 from public.psyhealth_admins where user_id=p_user_id) then
    raise exception 'cannot_delete_system_admin';
  end if;
  delete from auth.users where id=p_user_id;
  return found;
end $$;

grant execute on function public.psyhealth_check_org_name(text), public.psyhealth_login_phone_by_name(text) to anon, authenticated;
grant execute on function public.psyhealth_current_org_usable() to authenticated;
grant execute on function public.psyhealth_ensure_organization(text), public.psyhealth_org_codes(), public.psyhealth_org_delete_code(uuid), public.psyhealth_admin_list(), public.psyhealth_admin_get(uuid), public.psyhealth_admin_delete(uuid[]), public.psyhealth_system_delete_organization(uuid) to authenticated;
