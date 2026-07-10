-- 手机号注册正式流程已由前端在验证码通过后调用 psyhealth_ensure_organization。
-- 停用旧的 auth.users 自动创建机构触发器，避免认证事务被机构初始化逻辑干扰。
drop trigger if exists psyhealth_auth_user_created on auth.users;
