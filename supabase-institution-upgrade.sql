-- PsyHealth 机构账户与系统管理升级（可重复执行）
create extension if not exists pgcrypto;

create table if not exists public.psyhealth_organizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '未命名机构',
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.psyhealth_invites add column if not exists organization_id uuid references public.psyhealth_organizations(user_id) on delete cascade;
alter table public.psyhealth_participants add column if not exists organization_id uuid references public.psyhealth_organizations(user_id) on delete set null;
alter table public.psyhealth_participants add column if not exists invite_id uuid references public.psyhealth_invites(id) on delete set null;

-- 已获授权：清空升级前的来访者资料与测试结果。
truncate table public.psyhealth_participants;

alter table public.psyhealth_organizations enable row level security;
revoke all on public.psyhealth_organizations from anon, authenticated;
revoke all on public.psyhealth_invites from anon, authenticated;
revoke all on public.psyhealth_participants from anon, authenticated;

create or replace function public.psyhealth_on_auth_user() returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if new.email_confirmed_at is not null and not exists(select 1 from public.psyhealth_admins where user_id=new.id) then
    insert into public.psyhealth_organizations(user_id,email,name,status,expires_at)
    values(new.id,new.email,coalesce(new.raw_user_meta_data->>'organization_name','未命名机构'),'active',now()+interval '3 days') on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists psyhealth_auth_user_created on auth.users;
create trigger psyhealth_auth_user_created after insert or update of email_confirmed_at on auth.users for each row execute function public.psyhealth_on_auth_user();

create or replace function public.psyhealth_is_system_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.psyhealth_admins where user_id=auth.uid())
$$;
create or replace function public.psyhealth_my_role() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select case when public.psyhealth_is_system_admin() then jsonb_build_object('role','system_admin','email',auth.jwt()->>'email')
 else coalesce((select jsonb_build_object('role','organization','email',email,'name',name,'status',status,'expiresAt',expires_at,'usable',status='active' and expires_at>now()) from public.psyhealth_organizations where user_id=auth.uid()),jsonb_build_object('role','none')) end
$$;

create or replace function public.psyhealth_org_codes() returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'label',label,'allowedScales',allowed_scales,'active',active) order by created_at desc),'[]'::jsonb)
 from public.psyhealth_invites where organization_id=auth.uid()
$$;
create or replace function public.psyhealth_org_save_code(p_id uuid,p_label text,p_allowed_scales integer[],p_active boolean) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org public.psyhealth_organizations; v_id uuid; v_code text;
begin
 select * into v_org from public.psyhealth_organizations where user_id=auth.uid();
 if v_org.status<>'active' or v_org.expires_at<=now() then raise exception 'organization_inactive'; end if;
 if p_id is null then
   if (select count(*) from public.psyhealth_invites where organization_id=auth.uid())>=3 then raise exception 'organization_code_limit'; end if;
   loop v_code:=lpad((floor(random()*1000000))::int::text,6,'0'); exit when not exists(select 1 from public.psyhealth_invites where code=v_code); end loop;
   insert into public.psyhealth_invites(code,label,allowed_scales,active,organization_id) values(v_code,p_label,p_allowed_scales,p_active,auth.uid()) returning id into v_id;
 else
   update public.psyhealth_invites set label=p_label,allowed_scales=p_allowed_scales,active=p_active,updated_at=now() where id=p_id and organization_id=auth.uid() returning id,code into v_id,v_code;
 end if;
 return jsonb_build_object('id',v_id,'code',coalesce(v_code,(select code from public.psyhealth_invites where id=v_id)));
end $$;
create or replace function public.psyhealth_org_delete_code(p_id uuid) returns boolean language sql security definer set search_path=public,pg_temp as $$
 with d as(delete from public.psyhealth_invites where id=p_id and organization_id=auth.uid() returning 1) select exists(select 1 from d)
$$;

create or replace function public.psyhealth_validate_invite(p_code text) returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('allowedScales',i.allowed_scales) from public.psyhealth_invites i left join public.psyhealth_organizations o on o.user_id=i.organization_id
 where i.code=p_code and i.active and (i.organization_id is null or (o.status='active' and o.expires_at>now())) limit 1
$$;
create or replace function public.psyhealth_begin_participant(p_intake jsonb,p_code text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare i public.psyhealth_invites; rid uuid; token uuid:=gen_random_uuid();
begin
 select x.* into i from public.psyhealth_invites x left join public.psyhealth_organizations o on o.user_id=x.organization_id where x.code=p_code and x.active and (x.organization_id is null or(o.status='active' and o.expires_at>now())) limit 1;
 if i.id is null then raise exception 'invalid_invite'; end if;
 insert into public.psyhealth_participants(edit_token,intake,access_group,results,allowed_scales,organization_id,invite_id) values(token,p_intake,p_code,'[]'::jsonb,i.allowed_scales,i.organization_id,i.id) returning id into rid;
 return jsonb_build_object('id',rid,'editToken',token,'allowedScales',i.allowed_scales,'createdAt',now());
end $$;

create or replace function public.psyhealth_admin_list() returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'intake',p.intake,'results',p.results,'createdAt',p.created_at,'updatedAt',p.updated_at,'organizationId',p.organization_id,'institutionCode',p.access_group,'organizationName',o.name) order by p.created_at desc),'[]'::jsonb)
 from public.psyhealth_participants p left join public.psyhealth_organizations o on o.user_id=p.organization_id
 where public.psyhealth_is_system_admin() or p.organization_id=auth.uid()
$$;
create or replace function public.psyhealth_admin_get(p_id uuid) returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'intake',p.intake,'results',p.results,'createdAt',p.created_at,'organizationId',p.organization_id,'institutionCode',p.access_group,'organizationName',o.name)
 from public.psyhealth_participants p left join public.psyhealth_organizations o on o.user_id=p.organization_id where p.id=p_id and (public.psyhealth_is_system_admin() or p.organization_id=auth.uid())
$$;
create or replace function public.psyhealth_admin_delete(p_ids uuid[]) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n int; begin delete from public.psyhealth_participants where id=any(p_ids) and (public.psyhealth_is_system_admin() or organization_id=auth.uid()); get diagnostics n=row_count; return n; end $$;

create or replace function public.psyhealth_system_organizations() returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select case when public.psyhealth_is_system_admin() then coalesce(jsonb_agg(jsonb_build_object('userId',o.user_id,'email',o.email,'name',o.name,'status',o.status,'expiresAt',o.expires_at,'createdAt',o.created_at) order by o.created_at desc),'[]'::jsonb) else '[]'::jsonb end from public.psyhealth_organizations o
$$;
create or replace function public.psyhealth_system_update_organization(p_user_id uuid,p_status text,p_add_months integer) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin if not public.psyhealth_is_system_admin() then raise exception 'forbidden'; end if;
 update public.psyhealth_organizations set status=p_status,expires_at=case when p_add_months>0 then greatest(coalesce(expires_at,now()),now())+make_interval(months=>p_add_months) else expires_at end,updated_at=now() where user_id=p_user_id; return found; end $$;

grant execute on function public.psyhealth_my_role() to authenticated;
grant execute on function public.psyhealth_org_codes(),public.psyhealth_org_save_code(uuid,text,integer[],boolean),public.psyhealth_org_delete_code(uuid),public.psyhealth_admin_list(),public.psyhealth_admin_get(uuid),public.psyhealth_admin_delete(uuid[]),public.psyhealth_system_organizations(),public.psyhealth_system_update_organization(uuid,text,integer) to authenticated;
grant execute on function public.psyhealth_validate_invite(text),public.psyhealth_begin_participant(jsonb,text) to anon,authenticated;
