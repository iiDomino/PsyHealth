-- 系统管理员手动设置机构账号到期日。
create or replace function public.psyhealth_system_set_organization_expiry(
  p_user_id uuid,
  p_expires_on date
)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.psyhealth_is_system_admin() then
    raise exception 'forbidden';
  end if;
  if p_expires_on is null then
    raise exception 'expires_on_required';
  end if;
  update public.psyhealth_organizations
  set status='active',
      expires_at=(p_expires_on::timestamp + interval '1 day' - interval '1 second') at time zone 'Asia/Shanghai',
      updated_at=now()
  where user_id=p_user_id;
  return found;
end $$;

grant execute on function public.psyhealth_system_set_organization_expiry(uuid,date) to authenticated;
