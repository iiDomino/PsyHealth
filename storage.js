(function () {
  "use strict";
  const HISTORY_KEY = "psyhealth-participant-history-v1";
  const INTAKE_KEY = "psyhealth-session-intake";
  const RESULTS_KEY = "psyhealth-session-results";
  const PENDING_KEY = "psyhealth-pending-results-v1";
  const config = window.PSYHEALTH_CLOUD_CONFIG;

  function read(key, fallback, storage) {
    try { return JSON.parse(storage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
  }
  function localHistory() { return read(HISTORY_KEY, [], localStorage); }
  function writeHistory(records) { localStorage.setItem(HISTORY_KEY, JSON.stringify(records)); }
  async function rpc(name, body) {
    if (!config?.url || !config?.publishableKey) throw new Error("云数据库尚未配置。");
    const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {method:"POST",headers:{apikey:config.publishableKey,"Content-Type":"application/json"},body:JSON.stringify(body)});
    const text = await response.text();
    if (!response.ok) throw new Error(response.status === 403 ? "推荐码无权执行此操作。" : "云端连接失败，请稍后重试。");
    return text ? JSON.parse(text) : null;
  }

  async function begin(intake, accessCode) {
    const completedAt = new Date().toISOString();
    const cloud = await rpc("psyhealth_begin_participant", {p_intake:{...intake, completedAt},p_code:accessCode});
    const saved = {...intake,recordId:cloud.id,editToken:cloud.editToken,accessCode,completedAt:cloud.createdAt || completedAt};
    sessionStorage.setItem(INTAKE_KEY, JSON.stringify(saved));
    sessionStorage.setItem(RESULTS_KEY, "[]");
    sessionStorage.setItem("psyhealth-access-code", accessCode);
    const records = localHistory(); records.push({id:saved.recordId,intake:saved,results:[],createdAt:saved.completedAt,updatedAt:saved.completedAt}); writeHistory(records);
    return saved;
  }

  function saveLocalResult(record) {
    let results = read(RESULTS_KEY, [], sessionStorage).filter(item => item.id !== record.id);
    results.push(record); sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    const intake = read(INTAKE_KEY, null, sessionStorage);
    const records = localHistory(), index = records.findIndex(item => item.id === intake?.recordId);
    if (index >= 0) { records[index] = {...records[index],intake,results,updatedAt:new Date().toISOString()}; writeHistory(records); }
    return intake;
  }
  async function pushResult(intake, record) {
    const saved = await rpc("psyhealth_save_result", {p_id:intake.recordId,p_edit_token:intake.editToken,p_result:record});
    if (!saved) throw new Error("云端记录凭证已失效。");
  }
  async function saveResult(record) {
    const intake = saveLocalResult(record);
    if (!intake?.recordId || !intake?.editToken) return;
    try { await pushResult(intake, record); }
    catch (error) {
      const pending = read(PENDING_KEY, [], localStorage).filter(item => !(item.recordId === intake.recordId && item.result.id === record.id));
      pending.push({recordId:intake.recordId,editToken:intake.editToken,result:record}); localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      window.dispatchEvent(new CustomEvent("psyhealth-cloud-sync-error", {detail:error.message}));
    }
  }
  async function syncPending() {
    const pending = read(PENDING_KEY, [], localStorage), remaining = [];
    for (const item of pending) { try { await pushResult({recordId:item.recordId,editToken:item.editToken}, item.result); } catch (_) { remaining.push(item); } }
    localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  }
  async function adminLogin(code) { return rpc("psyhealth_admin_login", {p_code:code}); }
  async function history(code) { return rpc("psyhealth_admin_list", {p_code:code}); }
  async function getRecord(code, id) { return rpc("psyhealth_admin_get", {p_code:code,p_id:id}); }
  async function deleteRecords(code, ids) { await rpc("psyhealth_admin_delete", {p_code:code,p_ids:ids}); writeHistory(localHistory().filter(item => !new Set(ids).has(item.id))); }

  window.addEventListener("online", syncPending);
  syncPending().catch(() => {});
  window.PsyHealthStorage = {history,begin,saveResult,deleteRecords,adminLogin,getRecord,readSessionIntake:() => read(INTAKE_KEY,null,sessionStorage)};
})();
