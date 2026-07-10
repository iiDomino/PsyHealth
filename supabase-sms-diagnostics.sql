create table if not exists public.psyhealth_sms_diagnostics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stage text,
  status text,
  phone_suffix text,
  code text,
  message text
);

alter table public.psyhealth_sms_diagnostics enable row level security;
revoke all on public.psyhealth_sms_diagnostics from anon, authenticated;
