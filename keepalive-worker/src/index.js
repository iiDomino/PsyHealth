const KEEPALIVE_CODE = "__psyhealth_keepalive__";

async function pingSupabase(env) {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/psyhealth_validate_invite`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_code: KEEPALIVE_CODE }),
    },
  );

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `Supabase keepalive failed with HTTP ${response.status}: ${responseBody.slice(0, 300)}`,
    );
  }

  console.log(
    JSON.stringify({
      event: "supabase_keepalive_ok",
      scheduledAt: new Date().toISOString(),
      status: response.status,
    }),
  );
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(pingSupabase(env));
  },
};
