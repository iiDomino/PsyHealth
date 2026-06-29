(async function () {
  "use strict";
  const code=sessionStorage.getItem("psyhealth-history-access");
  if (!code) { location.replace("intake.html"); return; }
  const app=document.getElementById("historyDetailApp"), id=new URLSearchParams(location.search).get("id");
  const esc=value=>String(value??"").replace(/[&<>"']/gu,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  app.innerHTML='<section class="panel"><p class="loading-state">正在读取云端详细结果…</p></section>';
  let record; try { record=await window.PsyHealthStorage.getRecord(code,id); } catch(error) { app.innerHTML=`<section class="panel"><p class="error-text">${esc(error.message)}</p></section>`; return; }
  const names={"legacy-psy90":"PsyHealth90自测量表","legacy-personality85":"人格85自测量表","legacy-love40":"爱情关系合适度测评","common-psq":"父母问卷（PSQ）","common-interpersonal":"人际关系综合诊断量表","common-sds":"抑郁自评量表（SDS）","common-enrich":"婚姻质量问卷","common-wellbeing":"幸福感指数量表","common-sas":"焦虑自评量表（SAS）","common-ucla":"孤独感自评量表（UCLA）"};
  if(!record){app.innerHTML='<section class="panel"><h1>记录不存在</h1><a href="history.html">返回历史列表</a></section>';return;}
  const i=record.intake||{}, results=record.results||[];
  const facts=`<dl class="report-facts"><div><dt>姓名</dt><dd>${esc(i.name)}</dd></div><div><dt>性别</dt><dd>${esc(i.gender)}</dd></div><div><dt>年龄</dt><dd>${esc(i.age)} 岁</dd></div><div><dt>最高学历</dt><dd>${esc(i.education)}</dd></div><div><dt>职业</dt><dd>${esc(i.occupation)}</dd></div><div><dt>婚姻状况</dt><dd>${esc(i.marital)}</dd></div><div><dt>出生城市</dt><dd>${esc(i.birthCity)}</dd></div><div class="wide"><dt>求助问题</dt><dd>${esc((i.topics||[]).join("、"))}</dd></div></dl>`;
  const items=results.length?results.map((r,n)=>`<article class="report-result"><div><span class="report-scale">${n+1}. ${esc(names[r.id]||r.shortTitle)}</span><h3>${esc(r.resultTitle)}</h3></div><div class="mini-score"><strong>${esc(r.score)}</strong><span>${esc(r.scoreLabel)}</span></div><ul class="report-detail-list">${(r.details||String(r.summary||"").split("；").filter(Boolean)).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><time class="result-time">完成时间：${new Date(r.completedAt).toLocaleString("zh-CN",{hour12:false})}</time></article>`).join(""):'<p class="muted-copy">尚未完成测评。</p>';
  app.innerHTML=`<section class="panel report-panel"><header class="report-header"><p class="eyebrow">受测详情</p><h1>${esc(i.name)}的测试结果</h1><p>初筛时间：${new Date(record.createdAt).toLocaleString("zh-CN",{hour12:false})}</p></header><section class="report-block"><h2>初筛信息</h2>${facts}</section><section class="report-block"><h2>详细结果</h2><p class="report-count">已完成 ${results.length} 项测评</p><div class="report-results">${items}</div></section></section>`;
})();
