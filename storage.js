(function () {
  "use strict";
  const HISTORY_KEY="psyhealth-participant-history-v1", INTAKE_KEY="psyhealth-session-intake", RESULTS_KEY="psyhealth-session-results", PENDING_KEY="psyhealth-pending-results-v1", ADMIN_KEY="psyhealth-admin-session-v1";
  const config=window.PSYHEALTH_CLOUD_CONFIG;
  function read(key,fallback,storage){try{return JSON.parse(storage.getItem(key)||JSON.stringify(fallback));}catch(_){return fallback;}}
  function localHistory(){return read(HISTORY_KEY,[],localStorage);}
  function writeHistory(records){localStorage.setItem(HISTORY_KEY,JSON.stringify(records));}
  function friendlyError(response,payload){if(response.status===401||response.status===403)return new Error("登录已失效或没有管理权限。");if(payload?.message?.includes("invalid_invite"))return new Error("邀请码无效或已停用，请核对后重试。");if(payload?.code==="23505")return new Error("该邀请码已存在。");return new Error(payload?.msg||payload?.message||"云端连接失败，请稍后重试。");}
  async function request(url,options={}){if(!config?.url||!config?.publishableKey)throw new Error("云数据库尚未配置。");const response=await fetch(url,options);const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null;}catch(_){payload=text;}if(!response.ok)throw friendlyError(response,payload);return payload;}
  async function authRequest(path,body,token,method="POST"){return request(`${config.url}/auth/v1/${path}`,{method,headers:{apikey:config.publishableKey,"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});}
  function saveAdminSession(payload){const session={accessToken:payload.access_token,refreshToken:payload.refresh_token,expiresAt:Date.now()+(payload.expires_in||3600)*1000,email:payload.user?.email||""};sessionStorage.setItem(ADMIN_KEY,JSON.stringify(session));return session;}
  async function adminSession(){let session=read(ADMIN_KEY,null,sessionStorage);if(!session)return null;if(session.expiresAt>Date.now()+60000)return session;try{return saveAdminSession(await authRequest("token?grant_type=refresh_token",{refresh_token:session.refreshToken}));}catch(_){sessionStorage.removeItem(ADMIN_KEY);return null;}}
  async function adminSignIn(email,password){return saveAdminSession(await authRequest("token?grant_type=password",{email,password}));}
  async function adminSignOut(){const session=await adminSession();try{if(session)await authRequest("logout",null,session.accessToken);}finally{sessionStorage.removeItem(ADMIN_KEY);}}
  async function adminChangePassword(password){const session=await adminSession();if(!session)throw new Error("请重新登录。");await authRequest("user",{password},session.accessToken,"PUT");}
  async function rpc(name,body={},needsAdmin=false){const session=needsAdmin?await adminSession():null;if(needsAdmin&&!session)throw new Error("请先登录管理员账户。");return request(`${config.url}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:config.publishableKey,"Content-Type":"application/json",...(session?{Authorization:`Bearer ${session.accessToken}`}:{})},body:JSON.stringify(body)});}

  async function validateInvite(code){return rpc("psyhealth_validate_invite",{p_code:code});}
  async function begin(intake,code){const completedAt=new Date().toISOString(),cloud=await rpc("psyhealth_begin_participant",{p_intake:{...intake,completedAt},p_code:code});const saved={...intake,recordId:cloud.id,editToken:cloud.editToken,allowedScales:cloud.allowedScales,completedAt:cloud.createdAt||completedAt};sessionStorage.setItem(INTAKE_KEY,JSON.stringify(saved));sessionStorage.setItem(RESULTS_KEY,"[]");const records=localHistory();records.push({id:saved.recordId,intake:saved,results:[],createdAt:saved.completedAt,updatedAt:saved.completedAt});writeHistory(records);return saved;}
  function saveLocalResult(record){let results=read(RESULTS_KEY,[],sessionStorage).filter(item=>item.id!==record.id);results.push(record);sessionStorage.setItem(RESULTS_KEY,JSON.stringify(results));const intake=read(INTAKE_KEY,null,sessionStorage),records=localHistory(),index=records.findIndex(item=>item.id===intake?.recordId);if(index>=0){records[index]={...records[index],intake,results,updatedAt:new Date().toISOString()};writeHistory(records);}return intake;}
  async function pushResult(intake,record){const saved=await rpc("psyhealth_save_result",{p_id:intake.recordId,p_edit_token:intake.editToken,p_result:record});if(!saved)throw new Error("云端记录凭证已失效。");}
  async function saveResult(record){const intake=saveLocalResult(record);if(!intake?.recordId||!intake?.editToken)return;try{await pushResult(intake,record);}catch(error){const pending=read(PENDING_KEY,[],localStorage).filter(item=>!(item.recordId===intake.recordId&&item.result.id===record.id));pending.push({recordId:intake.recordId,editToken:intake.editToken,result:record});localStorage.setItem(PENDING_KEY,JSON.stringify(pending));window.dispatchEvent(new CustomEvent("psyhealth-cloud-sync-error",{detail:error.message}));}}
  async function syncPending(){const pending=read(PENDING_KEY,[],localStorage),remaining=[];for(const item of pending){try{await pushResult({recordId:item.recordId,editToken:item.editToken},item.result);}catch(_){remaining.push(item);}}localStorage.setItem(PENDING_KEY,JSON.stringify(remaining));}
  async function history(){return rpc("psyhealth_admin_list",{},true);}
  async function getRecord(id){return rpc("psyhealth_admin_get",{p_id:id},true);}
  async function deleteRecords(ids){await rpc("psyhealth_admin_delete",{p_ids:ids},true);const selected=new Set(ids);writeHistory(localHistory().filter(item=>!selected.has(item.id)));}
  async function adminInvites(){return rpc("psyhealth_admin_invites",{},true);}
  async function saveInvite(invite){return rpc("psyhealth_admin_save_invite",{p_id:invite.id||null,p_code:invite.code,p_label:invite.label,p_allowed_scales:invite.allowedScales,p_active:invite.active},true);}
  async function deleteInvite(id){return rpc("psyhealth_admin_delete_invite",{p_id:id},true);}
  window.addEventListener("online",syncPending);syncPending().catch(()=>{});
  window.PsyHealthStorage={validateInvite,begin,saveResult,history,getRecord,deleteRecords,adminInvites,saveInvite,deleteInvite,adminSignIn,adminSignOut,adminChangePassword,adminSession,readSessionIntake:()=>read(INTAKE_KEY,null,sessionStorage)};
})();
