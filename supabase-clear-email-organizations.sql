-- 清空旧的邮箱注册机构账户；保留系统管理员账户。
delete from auth.users u
where u.email is not null
  and coalesce(u.phone, '') = ''
  and exists (
    select 1
    from public.psyhealth_organizations o
    where o.user_id = u.id
  )
  and not exists (
    select 1
    from public.psyhealth_admins a
    where a.user_id = u.id
  );
