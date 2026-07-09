-- PsyHealth：机构账号切换为手机号短信验证（可重复执行）
alter table public.psyhealth_organizations add column if not exists phone text;
alter table public.psyhealth_organizations alter column email drop not null;

create or replace function public.psyhealth_on_auth_user() returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if (new.phone_confirmed_at is not null or new.email_confirmed_at is not null)
     and not exists(select 1 from public.psyhealth_admins where user_id=new.id) then
    insert into public.psyhealth_organizations(user_id,email,phone,name,status,expires_at)
    values(
      new.id,
      new.email,
      new.phone,
      coalesce(new.raw_user_meta_data->>'organization_name','未命名机构'),
      'active',
      now()+interval '3 days'
    )
    on conflict(user_id) do update
      set email=excluded.email,
          phone=excluded.phone,
          updated_at=now();
  end if;
  return new;
end $$;

drop trigger if exists psyhealth_auth_user_created on auth.users;
create trigger psyhealth_auth_user_created
after insert or update of email_confirmed_at,phone_confirmed_at on auth.users
for each row execute function public.psyhealth_on_auth_user();

create or replace function public.psyhealth_my_role() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select case
   when public.psyhealth_is_system_admin() then jsonb_build_object('role','system_admin','email',auth.jwt()->>'email','phone',auth.jwt()->>'phone')
   else coalesce(
     (
       select jsonb_build_object(
         'role','organization',
         'email',email,
         'phone',phone,
         'name',name,
         'status',status,
         'expiresAt',expires_at,
         'usable',status='active' and expires_at>now()
       )
       from public.psyhealth_organizations
       where user_id=auth.uid()
     ),
     jsonb_build_object('role','none')
   )
 end
$$;

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

grant execute on function public.psyhealth_my_role() to authenticated;
grant execute on function public.psyhealth_system_organizations() to authenticated;
