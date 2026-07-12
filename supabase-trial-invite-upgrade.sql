-- 试用邀请码升级：系统管理员生成 4 位邀请码；机构注册时可选填写。
-- 规则：不填邀请码也能注册机构账号，但不会自动获得 3 天试用；每个手机号只能凭邀请码领取一次 3 天试用。
-- 运行位置：Supabase SQL Editor。可重复运行。

alter table public.psyhealth_organizations add column if not exists phone text;
alter table public.psyhealth_organizations alter column email drop not null;

create table if not exists public.psyhealth_trial_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^\d{4}$'),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.psyhealth_trial_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.psyhealth_trial_invites(id) on delete set null,
  phone text not null unique,
  user_id uuid unique,
  redeemed_at timestamptz not null default now()
);

create index if not exists psyhealth_trial_invites_active_idx on public.psyhealth_trial_invites(active, created_at desc);

revoke all on public.psyhealth_trial_invites from anon, authenticated;
revoke all on public.psyhealth_trial_invite_redemptions from anon, authenticated;

create or replace function public.psyhealth_normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_phone,''), '\D', '', 'g') ~ '^86\d{11}$' then '+' || regexp_replace(coalesce(p_phone,''), '\D', '', 'g')
    when regexp_replace(coalesce(p_phone,''), '\D', '', 'g') ~ '^1\d{10}$' then '+86' || regexp_replace(coalesce(p_phone,''), '\D', '', 'g')
    else regexp_replace(coalesce(p_phone,''), '\D', '', 'g')
  end
$$;

create or replace function public.psyhealth_trial_invite_status(p_code text, p_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  clean_code text := regexp_replace(coalesce(p_code,''), '\D', '', 'g');
  clean_phone text := public.psyhealth_normalize_phone(p_phone);
  inv public.psyhealth_trial_invites;
begin
  if clean_code = '' then
    return jsonb_build_object('status','empty','valid',false);
  end if;
  if clean_code !~ '^\d{4}$' then
    return jsonb_build_object('status','format_error','valid',false);
  end if;
  select * into inv
  from public.psyhealth_trial_invites
  where code=clean_code and active
  limit 1;
  if inv.id is null then
    return jsonb_build_object('status','invalid','valid',false);
  end if;
  if clean_phone <> '' and exists(select 1 from public.psyhealth_trial_invite_redemptions where phone=clean_phone) then
    return jsonb_build_object('status','already_used','valid',false);
  end if;
  return jsonb_build_object('status','valid','valid',true,'code',inv.code);
end $$;

create or replace function public.psyhealth_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
begin
  if (new.phone_confirmed_at is not null or new.email_confirmed_at is not null)
     and not exists(select 1 from public.psyhealth_admins where user_id=new.id) then
    insert into public.psyhealth_organizations(user_id,email,phone,name,status,expires_at)
    values(
      new.id,
      new.email,
      new.phone,
      coalesce(new.raw_user_meta_data->>'organization_name','未命名机构'),
      'pending',
      null
    )
    on conflict(user_id) do update
      set email=excluded.email,
          phone=excluded.phone,
          name=coalesce(nullif(trim(public.psyhealth_organizations.name),''), excluded.name),
          updated_at=now();
  end if;
  return new;
end $$;

drop trigger if exists psyhealth_auth_user_created on auth.users;
create trigger psyhealth_auth_user_created
after insert or update of email_confirmed_at,phone_confirmed_at on auth.users
for each row execute function public.psyhealth_on_auth_user();

drop function if exists public.psyhealth_ensure_organization(text);

create or replace function public.psyhealth_ensure_organization(p_name text, p_trial_code text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  u auth.users;
  org public.psyhealth_organizations;
  clean_name text := trim(coalesce(p_name,''));
  clean_code text := regexp_replace(coalesce(p_trial_code,''), '\D', '', 'g');
  inv public.psyhealth_trial_invites;
  trial_granted boolean := false;
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

  if clean_code <> '' then
    if clean_code !~ '^\d{4}$' then
      raise exception 'trial_invite_invalid';
    end if;
    select * into inv
    from public.psyhealth_trial_invites
    where code=clean_code and active
    limit 1;
    if inv.id is null then
      raise exception 'trial_invite_invalid';
    end if;
    if exists(select 1 from public.psyhealth_trial_invite_redemptions where phone=public.psyhealth_normalize_phone(u.phone)) then
      raise exception 'trial_invite_used';
    end if;

    insert into public.psyhealth_trial_invite_redemptions(invite_id, phone, user_id)
    values(inv.id, public.psyhealth_normalize_phone(u.phone), u.id);
    trial_granted := true;
  end if;

  insert into public.psyhealth_organizations(user_id,email,phone,name,status,expires_at)
  values(
    u.id,
    u.email,
    u.phone,
    clean_name,
    case when trial_granted then 'active' else 'pending' end,
    case when trial_granted then now()+interval '3 days' else null end
  )
  on conflict(user_id) do update
    set name=excluded.name,
        email=excluded.email,
        phone=excluded.phone,
        status=case
          when public.psyhealth_organizations.status='suspended' then public.psyhealth_organizations.status
          when trial_granted then 'active'
          else coalesce(public.psyhealth_organizations.status,'pending')
        end,
        expires_at=case
          when trial_granted then greatest(coalesce(public.psyhealth_organizations.expires_at, now()), now()) + interval '3 days'
          else public.psyhealth_organizations.expires_at
        end,
        updated_at=now()
  returning * into org;

  return jsonb_build_object(
    'role','organization',
    'name',org.name,
    'phone',org.phone,
    'status',org.status,
    'expiresAt',org.expires_at,
    'usable',org.status='active' and org.expires_at>now(),
    'trialGranted',trial_granted
  );
end $$;

create or replace function public.psyhealth_system_trial_invites()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'code', i.code,
      'active', i.active,
      'createdAt', i.created_at,
      'useCount', coalesce(r.use_count,0)
    ) order by i.created_at desc), '[]'::jsonb)
    from public.psyhealth_trial_invites i
    left join (
      select invite_id, count(*)::int as use_count
      from public.psyhealth_trial_invite_redemptions
      group by invite_id
    ) r on r.invite_id=i.id
  );
end $$;

create or replace function public.psyhealth_system_create_trial_invite()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  new_code text;
  saved public.psyhealth_trial_invites;
  i int := 0;
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  loop
    new_code := lpad(floor(random()*10000)::int::text, 4, '0');
    begin
      insert into public.psyhealth_trial_invites(code, active, created_by)
      values(new_code, true, auth.uid())
      returning * into saved;
      exit;
    exception when unique_violation then
      i := i + 1;
      if i > 50 then
        raise exception 'trial_invite_generate_failed';
      end if;
    end;
  end loop;
  return jsonb_build_object('id',saved.id,'code',saved.code,'active',saved.active,'createdAt',saved.created_at,'useCount',0);
end $$;

create or replace function public.psyhealth_system_set_trial_invite_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  update public.psyhealth_trial_invites
     set active=coalesce(p_active,false),
         updated_at=now()
   where id=p_id;
  return found;
end $$;

create or replace function public.psyhealth_system_delete_trial_invite(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  delete from public.psyhealth_trial_invites where id=p_id;
  return found;
end $$;

grant execute on function public.psyhealth_trial_invite_status(text,text) to anon, authenticated;
grant execute on function public.psyhealth_ensure_organization(text,text) to authenticated;
grant execute on function public.psyhealth_system_trial_invites(), public.psyhealth_system_create_trial_invite(), public.psyhealth_system_set_trial_invite_active(uuid,boolean), public.psyhealth_system_delete_trial_invite(uuid) to authenticated;
