import { Webhook } from "npm:standardwebhooks@^1";

const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const hmac = async (key: ArrayBuffer | Uint8Array, value: string) => {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
};

async function sendTencentSms(phone: string, otp: string) {
  const secretId = Deno.env.get("TENCENT_SECRET_ID")!;
  const secretKey = Deno.env.get("TENCENT_SECRET_KEY")!;
  const appId = Deno.env.get("TENCENT_SMS_SDK_APP_ID")!;
  const signName = "南京市建邺区银焰谷电子";
  const templateId = Deno.env.get("TENCENT_SMS_TEMPLATE_ID")!;
  if (![secretId, secretKey, appId, signName, templateId].every(Boolean)) throw new Error("腾讯云短信配置不完整");

  const host = "sms.tencentcloudapi.com";
  const service = "sms";
  const action = "SendSms";
  const version = "2021-01-11";
  const region = "ap-guangzhou";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const payload = JSON.stringify({
    PhoneNumberSet: [phone],
    SmsSdkAppId: appId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [otp]
  });
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${await sha256(payload)}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  const secretDate = await hmac(encoder.encode(`TC3${secretKey}`), date);
  const secretService = await hmac(secretDate, service);
  const secretSigning = await hmac(secretService, "tc3_request");
  const signature = hex(await hmac(secretSigning, stringToSign));
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json; charset=utf-8",
      "Host": host,
      "X-TC-Action": action,
      "X-TC-Version": version,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": region
    },
    body: payload
  });
  const result = await response.json();
  const status = result?.Response?.SendStatusSet?.[0];
  if (!response.ok || result?.Response?.Error || status?.Code !== "Ok") {
    const code = result?.Response?.Error?.Code || status?.Code || "UNKNOWN";
    const message = result?.Response?.Error?.Message || status?.Message || "腾讯云短信发送失败";
    console.error(JSON.stringify({
      provider: "tencent-sms",
      code,
      message,
      signName,
      templateId,
      paramCount: 1
    }));
    throw new Error(`${code}: ${message}`);
  }
}

Deno.serve(async request => {
  try {
    const raw = await request.text();
    const secret = Deno.env.get("SEND_SMS_HOOK_SECRET")!;
    if (!secret) throw new Error("短信钩子密钥缺失");
    const payload = await new Webhook(secret.replace("v1,whsec_", "")).verify(raw, Object.fromEntries(request.headers));
    const rawPhone = payload?.user?.phone;
    const phone = typeof rawPhone === "string" && !rawPhone.startsWith("+") ? `+${rawPhone}` : rawPhone;
    const otp = payload?.sms?.otp;
    if (!/^\+861\d{10}$/.test(phone || "") || !/^\d{6}$/.test(otp || "")) throw new Error("手机号或验证码格式无效");
    await sendTencentSms(phone, otp);
    console.log(JSON.stringify({
      provider: "tencent-sms",
      status: "sent",
      phoneSuffix: phone.slice(-4)
    }));
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: { http_code: 500, message: "短信发送失败，请稍后重试。" } }, { status: 500 });
  }
});
