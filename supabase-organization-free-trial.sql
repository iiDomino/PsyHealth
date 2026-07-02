-- 新机构邮箱验证成功后，自动获得 3 天免费使用时长。
create or replace function public.psyhealth_on_auth_user() returns trigger language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if new.email_confirmed_at is not null and not exists(select 1 from public.psyhealth_admins where user_id=new.id) then
    insert into public.psyhealth_organizations(user_id,email,name,status,expires_at)
    values(
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'organization_name','未命名机构'),
      'active',
      now()+interval '3 days'
    ) on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists psyhealth_auth_user_created on auth.users;
create trigger psyhealth_auth_user_created
after insert or update of email_confirmed_at on auth.users
for each row execute function public.psyhealth_on_auth_user();
