-- 来访者档案化升级：机构来访者档案、测评批次、来访者留言、机构工作日志、系统管理员机构备注。
-- 运行位置：Supabase SQL Editor。可重复运行。

create table if not exists public.psyhealth_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.psyhealth_organizations(user_id) on delete cascade,
  invite_id uuid references public.psyhealth_invites(id) on delete set null,
  access_group text not null,
  name text not null,
  name_key text not null,
  intake jsonb not null default '{}'::jsonb,
  allowed_scales integer[] not null default '{}'::integer[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name_key)
);

create table if not exists public.psyhealth_client_sessions (
  id uuid primary key default gen_random_uuid(),
  legacy_participant_id uuid unique,
  client_id uuid not null references public.psyhealth_clients(id) on delete cascade,
  edit_token uuid not null default gen_random_uuid(),
  intake_snapshot jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  client_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.psyhealth_client_work_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.psyhealth_clients(id) on delete cascade,
  organization_id uuid references public.psyhealth_organizations(user_id) on delete set null,
  content text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.psyhealth_organizations add column if not exists admin_note text;

alter table public.psyhealth_client_sessions add column if not exists legacy_participant_id uuid;

create index if not exists psyhealth_clients_org_name_idx on public.psyhealth_clients(organization_id, name_key);
create index if not exists psyhealth_client_sessions_client_idx on public.psyhealth_client_sessions(client_id, created_at desc);
create index if not exists psyhealth_client_work_logs_client_idx on public.psyhealth_client_work_logs(client_id, created_at desc);
create unique index if not exists psyhealth_client_sessions_legacy_unique on public.psyhealth_client_sessions(legacy_participant_id) where legacy_participant_id is not null;

revoke all on public.psyhealth_clients from anon, authenticated;
revoke all on public.psyhealth_client_sessions from anon, authenticated;
revoke all on public.psyhealth_client_work_logs from anon, authenticated;

create or replace function public.psyhealth_name_key(p_name text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(p_name,'')), '\s+', ' ', 'g'))
$$;

create or replace function public.psyhealth_client_suggest_name(p_organization_id uuid, p_name text)
returns text
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  base_name text := trim(coalesce(p_name,''));
  candidate text;
  suffix int := 2;
begin
  if base_name = '' then
    return '';
  end if;
  candidate := base_name || '-' || suffix;
  while exists (
    select 1
    from public.psyhealth_clients
    where organization_id is not distinct from p_organization_id
      and name_key = public.psyhealth_name_key(candidate)
  ) loop
    suffix := suffix + 1;
    candidate := base_name || '-' || suffix;
  end loop;
  return candidate;
end $$;

create or replace function public.psyhealth_client_lookup(p_name text, p_phone_last4 text, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  clean_name text := trim(coalesce(p_name,''));
  clean_phone_last4 text := regexp_replace(coalesce(p_phone_last4,''), '\D', '', 'g');
  clean_code text := trim(coalesce(p_code,''));
  key text;
  matches_count int := 0;
  client public.psyhealth_clients;
  inv public.psyhealth_invites;
  org_name text;
  suggested text;
begin
  if clean_name = '' then
    raise exception 'client_name_required';
  end if;
  if clean_phone_last4 !~ '^\d{4}$' then
    raise exception 'phone_last4_required';
  end if;
  key := public.psyhealth_name_key(clean_name);

  if clean_code <> '' then
    select i.* into inv
    from public.psyhealth_invites i
    left join public.psyhealth_organizations o on o.user_id=i.organization_id
    where i.code=clean_code
      and i.active
      and (i.organization_id is null or (o.status='active' and o.expires_at>now()))
    limit 1;
    if inv.id is null then
      raise exception 'invalid_invite';
    end if;

    select c.* into client
    from public.psyhealth_clients c
    where c.organization_id is not distinct from inv.organization_id
      and c.name_key=key
      and coalesce(c.intake->>'phoneLast4','')=clean_phone_last4
    limit 1;

    select o.name into org_name from public.psyhealth_organizations o where o.user_id=inv.organization_id;
    suggested := public.psyhealth_client_suggest_name(inv.organization_id, clean_name);

    if client.id is not null then
      return jsonb_build_object(
        'found',true,
        'ambiguous',false,
        'clientId',client.id,
        'intake',client.intake,
        'accessGroup',client.access_group,
        'allowedScales',client.allowed_scales,
        'organizationName',coalesce(org_name,'系统直属'),
        'suggestedName',suggested
      );
    end if;

    if exists (
      select 1
      from public.psyhealth_clients c
      where c.organization_id is not distinct from inv.organization_id
        and c.name_key=key
    ) then
      return jsonb_build_object(
        'found',false,
        'ambiguous',false,
        'duplicateName',true,
        'message','该姓名已存在，但手机号后四位不一致。如不是本人，请使用推荐姓名。',
        'suggestedName',suggested,
        'accessGroup',inv.code,
        'allowedScales',inv.allowed_scales,
        'organizationName',coalesce(org_name,'系统直属')
      );
    end if;

    return jsonb_build_object(
      'found',false,
      'ambiguous',false,
      'duplicateName',false,
      'suggestedName',clean_name,
      'accessGroup',inv.code,
      'allowedScales',inv.allowed_scales,
      'organizationName',coalesce(org_name,'系统直属')
    );
  end if;

  select count(*) into matches_count
  from public.psyhealth_clients c
  left join public.psyhealth_organizations o on o.user_id=c.organization_id
  where c.name_key=key
    and coalesce(c.intake->>'phoneLast4','')=clean_phone_last4
    and (c.organization_id is null or (o.status='active' and o.expires_at>now()));

  if matches_count = 1 then
    select c.* into client
    from public.psyhealth_clients c
    left join public.psyhealth_organizations o on o.user_id=c.organization_id
    where c.name_key=key
      and coalesce(c.intake->>'phoneLast4','')=clean_phone_last4
      and (c.organization_id is null or (o.status='active' and o.expires_at>now()))
    limit 1;
    select o.name into org_name from public.psyhealth_organizations o where o.user_id=client.organization_id;
    return jsonb_build_object(
      'found',true,
      'ambiguous',false,
      'clientId',client.id,
      'intake',client.intake,
      'accessGroup',client.access_group,
      'allowedScales',client.allowed_scales,
      'organizationName',coalesce(org_name,'系统直属'),
      'suggestedName',public.psyhealth_client_suggest_name(client.organization_id, clean_name)
    );
  elsif matches_count > 1 then
    return jsonb_build_object(
      'found',false,
      'ambiguous',true,
      'message','找到多个匹配档案，请补充机构代码后再继续。'
    );
  end if;

  return jsonb_build_object(
    'found',false,
    'ambiguous',false,
    'duplicateName',false,
    'suggestedName',clean_name
  );
end $$;

-- 将旧的单次记录合并进新档案层；同机构同姓名会自动归入同一档案。
insert into public.psyhealth_clients(organization_id, invite_id, access_group, name, name_key, intake, allowed_scales, created_at, updated_at)
select distinct on (p.organization_id, public.psyhealth_name_key(p.intake->>'name'))
  p.organization_id,
  p.invite_id,
  p.access_group,
  coalesce(nullif(trim(p.intake->>'name'),''),'未命名'),
  public.psyhealth_name_key(coalesce(nullif(p.intake->>'name',''),'未命名')),
  p.intake,
  coalesce(p.allowed_scales,'{}'::integer[]),
  min(p.created_at) over(partition by p.organization_id, public.psyhealth_name_key(p.intake->>'name')),
  max(p.updated_at) over(partition by p.organization_id, public.psyhealth_name_key(p.intake->>'name'))
from public.psyhealth_participants p
where p.organization_id is not null
  and trim(coalesce(p.intake->>'name','')) <> ''
on conflict(organization_id, name_key) do nothing;

insert into public.psyhealth_client_sessions(legacy_participant_id, client_id, edit_token, intake_snapshot, results, client_message, created_at, updated_at)
select p.id, c.id, p.edit_token, p.intake, coalesce(p.results,'[]'::jsonb), null, p.created_at, p.updated_at
from public.psyhealth_participants p
join public.psyhealth_clients c
  on c.organization_id=p.organization_id
 and c.name_key=public.psyhealth_name_key(p.intake->>'name')
where p.organization_id is not null
  and trim(coalesce(p.intake->>'name','')) <> ''
  and not exists(select 1 from public.psyhealth_client_sessions s where s.legacy_participant_id=p.id);

create or replace function public.psyhealth_client_begin(p_intake jsonb, p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  inv public.psyhealth_invites;
  org public.psyhealth_organizations;
  clean_name text := trim(coalesce(p_intake->>'name',''));
  phone_last4 text := regexp_replace(coalesce(p_intake->>'phoneLast4',''), '\D', '', 'g');
  key text;
  client public.psyhealth_clients;
  session_id uuid;
  token uuid := gen_random_uuid();
  existed boolean := false;
  suggested text;
begin
  if clean_name = '' then
    raise exception 'client_name_required';
  end if;
  if phone_last4 !~ '^\d{4}$' then
    raise exception 'phone_last4_required';
  end if;
  key := public.psyhealth_name_key(clean_name);

  select i.* into inv
  from public.psyhealth_invites i
  left join public.psyhealth_organizations o on o.user_id=i.organization_id
  where i.code=trim(coalesce(p_code,''))
    and i.active
    and (i.organization_id is null or (o.status='active' and o.expires_at>now()))
  limit 1;
  if inv.id is null then
    raise exception 'invalid_invite';
  end if;
  select * into org from public.psyhealth_organizations where user_id=inv.organization_id;

  select * into client
  from public.psyhealth_clients
  where organization_id=inv.organization_id and name_key=key
  limit 1;

  if client.id is null then
    insert into public.psyhealth_clients(organization_id, invite_id, access_group, name, name_key, intake, allowed_scales)
    values(inv.organization_id, inv.id, inv.code, clean_name, key, p_intake, inv.allowed_scales)
    returning * into client;
  elsif coalesce(client.intake->>'phoneLast4','') <> '' and coalesce(client.intake->>'phoneLast4','') <> phone_last4 then
    suggested := public.psyhealth_client_suggest_name(inv.organization_id, clean_name);
    raise exception 'client_name_exists:%', suggested;
  else
    existed := true;
    update public.psyhealth_clients
       set updated_at=now(),
           invite_id=inv.id,
           access_group=inv.code,
           allowed_scales=inv.allowed_scales
     where id=client.id
     returning * into client;
  end if;

  insert into public.psyhealth_client_sessions(client_id, edit_token, intake_snapshot, results)
  values(client.id, token, client.intake, '[]'::jsonb)
  returning id into session_id;

  return jsonb_build_object(
    'id', session_id,
    'clientId', client.id,
    'editToken', token,
    'intake', client.intake,
    'allowedScales', client.allowed_scales,
    'organizationName', coalesce(org.name,'系统直属'),
    'createdAt', now(),
    'isExisting', existed
  );
end $$;

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
  if found then
    return true;
  end if;

  update public.psyhealth_participants
     set results=(
       select coalesce(jsonb_agg(x),'[]'::jsonb)
       from (
         select value as x
         from jsonb_array_elements(coalesce(results,'[]'::jsonb))
         where value->>'id' <> p_result->>'id'
         union all select p_result
       ) q
     ),
     updated_at=now()
   where id=p_id and edit_token=p_edit_token;
  return found;
end $$;

create or replace function public.psyhealth_client_save_message(p_id uuid, p_edit_token uuid, p_message text)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.psyhealth_client_sessions
     set client_message=nullif(trim(coalesce(p_message,'')), ''),
         updated_at=now()
   where id=p_id and edit_token=p_edit_token;
  return found;
end $$;

create or replace function public.psyhealth_client_profiles()
returns jsonb
language sql
security definer
set search_path=public,pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'intake', c.intake,
    'organizationId', c.organization_id,
    'organizationName', o.name,
    'institutionCode', c.access_group,
    'createdAt', c.created_at,
    'updatedAt', c.updated_at,
    'sessionCount', coalesce(s.session_count,0),
    'latestAt', s.latest_at,
    'messageCount', coalesce(s.message_count,0),
    'workLogCount', coalesce(w.work_log_count,0)
  ) order by coalesce(s.latest_at,c.updated_at) desc),'[]'::jsonb)
  from public.psyhealth_clients c
  left join public.psyhealth_organizations o on o.user_id=c.organization_id
  left join lateral (
    select count(*) session_count,
           max(updated_at) latest_at,
           count(*) filter(where nullif(trim(coalesce(client_message,'')), '') is not null) message_count
    from public.psyhealth_client_sessions
    where client_id=c.id
  ) s on true
  left join lateral (
    select count(*) work_log_count
    from public.psyhealth_client_work_logs
    where client_id=c.id
  ) w on true
  where public.psyhealth_is_system_admin()
     or (c.organization_id=auth.uid() and public.psyhealth_current_org_usable())
$$;

create or replace function public.psyhealth_client_profile(p_client_id uuid)
returns jsonb
language sql
security definer
set search_path=public,pg_temp
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'intake', c.intake,
    'organizationId', c.organization_id,
    'organizationName', o.name,
    'institutionCode', c.access_group,
    'createdAt', c.created_at,
    'updatedAt', c.updated_at,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'results', s.results,
        'message', s.client_message,
        'createdAt', s.created_at,
        'updatedAt', s.updated_at
      ) order by s.created_at desc)
      from public.psyhealth_client_sessions s
      where s.client_id=c.id
    ),'[]'::jsonb),
    'workLogs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'content', l.content,
        'createdAt', l.created_at,
        'updatedAt', l.updated_at
      ) order by l.created_at desc)
      from public.psyhealth_client_work_logs l
      where l.client_id=c.id
    ),'[]'::jsonb)
  )
  from public.psyhealth_clients c
  left join public.psyhealth_organizations o on o.user_id=c.organization_id
  where c.id=p_client_id
    and (public.psyhealth_is_system_admin() or (c.organization_id=auth.uid() and public.psyhealth_current_org_usable()))
$$;

create or replace function public.psyhealth_client_save_work_log(p_client_id uuid, p_log_id uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  logrow public.psyhealth_client_work_logs;
  org_id uuid;
begin
  select organization_id into org_id
  from public.psyhealth_clients
  where id=p_client_id
    and (public.psyhealth_is_system_admin() or (organization_id=auth.uid() and public.psyhealth_current_org_usable()));
  if org_id is null and not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  if trim(coalesce(p_content,'')) = '' then
    raise exception 'work_log_required';
  end if;

  if p_log_id is null then
    insert into public.psyhealth_client_work_logs(client_id, organization_id, content, created_by)
    values(p_client_id, org_id, trim(p_content), auth.uid())
    returning * into logrow;
  else
    update public.psyhealth_client_work_logs
       set content=trim(p_content), updated_at=now()
     where id=p_log_id and client_id=p_client_id
       and (public.psyhealth_is_system_admin() or organization_id=auth.uid())
     returning * into logrow;
  end if;
  return jsonb_build_object('id',logrow.id,'content',logrow.content,'createdAt',logrow.created_at,'updatedAt',logrow.updated_at);
end $$;

create or replace function public.psyhealth_client_delete_work_log(p_log_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  delete from public.psyhealth_client_work_logs
  where id=p_log_id
    and (public.psyhealth_is_system_admin() or organization_id=auth.uid());
  return found;
end $$;

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
    'createdAt',o.created_at
  ) order by o.created_at desc),'[]'::jsonb) else '[]'::jsonb end
  from public.psyhealth_organizations o
  join auth.users u on u.id=o.user_id
  where u.phone_confirmed_at is not null or u.email_confirmed_at is not null
$$;

create or replace function public.psyhealth_system_set_org_note(p_user_id uuid, p_note text)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  update public.psyhealth_organizations
     set admin_note=nullif(trim(coalesce(p_note,'')), ''),
         updated_at=now()
   where user_id=p_user_id;
  return found;
end $$;

grant execute on function public.psyhealth_client_suggest_name(uuid,text), public.psyhealth_client_lookup(text,text,text), public.psyhealth_client_begin(jsonb,text), public.psyhealth_client_save_message(uuid,uuid,text) to anon, authenticated;
grant execute on function public.psyhealth_client_profiles(), public.psyhealth_client_profile(uuid), public.psyhealth_client_save_work_log(uuid,uuid,text), public.psyhealth_client_delete_work_log(uuid), public.psyhealth_system_set_org_note(uuid,text) to authenticated;
