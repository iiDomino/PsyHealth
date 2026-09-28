# PsyHealth Supabase keepalive

Cloudflare Worker Cron Trigger that makes a read-only call to the existing
`psyhealth_validate_invite` RPC three times per day. The synthetic invite code
never matches a real record, so the task does not read or modify client data.

Deploy from this directory:

```powershell
npx wrangler deploy
```

The schedules run at 00:17, 08:17, and 16:17 UTC. Successful and failed runs
are visible in the Worker's observability logs and Cron Trigger event history.
