-- 调整来访者档案识别规则。
-- 运行位置：Supabase SQL Editor。可重复运行。
-- 新规则：同一机构下，来访者档案按“姓名 + 手机号后四位”识别。

alter table public.psyhealth_clients drop constraint if exists psyhealth_clients_organization_id_name_key_key;

create unique index if not exists psyhealth_clients_org_name_phone_unique
  on public.psyhealth_clients(organization_id, name_key, (coalesce(intake->>'phoneLast4','')));

drop function if exists public.psyhealth_client_suggest_name(uuid,text);

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

    select o.name into org_name
    from public.psyhealth_organizations o
    where o.user_id=inv.organization_id;

    if client.id is not null then
      return jsonb_build_object(
        'found',true,
        'ambiguous',false,
        'clientId',client.id,
        'intake',client.intake,
        'accessGroup',client.access_group,
        'allowedScales',client.allowed_scales,
        'organizationName',coalesce(org_name,'系统直属')
      );
    end if;

    return jsonb_build_object(
      'found',false,
      'ambiguous',false,
      'duplicateName',false,
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

    select o.name into org_name
    from public.psyhealth_organizations o
    where o.user_id=client.organization_id;

    return jsonb_build_object(
      'found',true,
      'ambiguous',false,
      'clientId',client.id,
      'intake',client.intake,
      'accessGroup',client.access_group,
      'allowedScales',client.allowed_scales,
      'organizationName',coalesce(org_name,'系统直属')
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
    'duplicateName',false
  );
end $$;

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

  select * into org
  from public.psyhealth_organizations
  where user_id=inv.organization_id;

  select * into client
  from public.psyhealth_clients
  where organization_id=inv.organization_id
    and name_key=key
    and coalesce(intake->>'phoneLast4','')=phone_last4
  limit 1;

  if client.id is null then
    insert into public.psyhealth_clients(organization_id, invite_id, access_group, name, name_key, intake, allowed_scales)
    values(inv.organization_id, inv.id, inv.code, clean_name, key, p_intake, inv.allowed_scales)
    returning * into client;
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

grant execute on function public.psyhealth_client_lookup(text,text,text), public.psyhealth_client_begin(jsonb,text) to anon, authenticated;
