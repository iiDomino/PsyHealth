-- 已部署项目补丁：每个机构最多设置 3 组机构代码。
create or replace function public.psyhealth_org_save_code(p_id uuid,p_label text,p_allowed_scales integer[],p_active boolean) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org public.psyhealth_organizations; v_id uuid; v_code text;
begin
 select * into v_org from public.psyhealth_organizations where user_id=auth.uid();
 if v_org.status<>'active' or v_org.expires_at<=now() then raise exception 'organization_inactive'; end if;
 if p_id is null then
   if (select count(*) from public.psyhealth_invites where organization_id=auth.uid())>=3 then raise exception 'organization_code_limit'; end if;
   loop
     v_code:=lpad((floor(random()*1000000))::int::text,6,'0');
     exit when not exists(select 1 from public.psyhealth_invites where code=v_code);
   end loop;
   insert into public.psyhealth_invites(code,label,allowed_scales,active,organization_id)
   values(v_code,p_label,p_allowed_scales,p_active,auth.uid()) returning id into v_id;
 else
   update public.psyhealth_invites set label=p_label,allowed_scales=p_allowed_scales,active=p_active,updated_at=now()
   where id=p_id and organization_id=auth.uid() returning id,code into v_id,v_code;
 end if;
 if v_id is null then raise exception 'organization_code_not_found'; end if;
 return jsonb_build_object('id',v_id,'code',v_code);
end $$;

grant execute on function public.psyhealth_org_save_code(uuid,text,integer[],boolean) to authenticated;
