(function (root) {
  "use strict";
  const sum = list => list.reduce((total, value) => total + value, 0);
  const picked = (values, list) => list.map(number => values[number - 1]);
  const avg = (values, digits = 2) => (sum(values) / values.length).toFixed(digits);

  function psq(values) {
    const factors = {"品行问题":[2,8,14,19,20,21,22,23,27,33,34,39],"学习问题":[10,25,31,37],"心身问题":[32,41,43,44,48],"冲动-多动":[4,5,11,13],"焦虑":[12,16,24,47],"多动指数":[4,7,11,13,14,25,31,33,37,38]};
    const factorScores = Object.entries(factors).map(([name, items]) => ({name, score:Number(avg(picked(values, items)))}));
    const totalAvg = Number(avg(values));
    const level = totalAvg < 0.5 ? "整体报告问题较少" : totalAvg < 1.5 ? "存在一定需关注表现" : "整体需重点关注";
    const highFactors = factorScores.filter(item => item.score >= 2).map(item => item.name);
    const topFactors = factorScores.slice().sort((a,b) => b.score - a.score).slice(0,3).map(item => `${item.name}${item.score.toFixed(2)}`);
    const details = [
      `总体评价：${level}。全量表平均分为${totalAvg.toFixed(2)}，均分范围0—3分，分数越高表示家长报告该方面行为出现程度越多。`,
      `重点维度：${topFactors.join("、")}。${highFactors.length ? `其中${highFactors.join("、")}均分达到2.00或以上，建议结合访谈重点了解。` : "未见均分达到2.00或以上的突出维度。"}`
    ];
    factorScores.forEach(item => details.push(`${item.name}均分：${item.score.toFixed(2)}`));
    return {score:totalAvg.toFixed(2), scoreLabel:level, details};
  }

  function interpersonal(values) {
    const groups = [[1,5,9,13,17,21,25],[2,6,10,14,18,22,26],[3,7,11,15,19,23,27],[4,8,12,16,20,24,28]].map(items => sum(picked(values, items)));
    const groupLevel = score => score <= 2 ? "困扰较少" : score <= 5 ? "存在一定困扰" : "困扰较明显";
    const total = sum(values);
    const level = total <= 8 ? "困扰较少" : total <= 14 ? "存在一定困扰" : total <= 20 ? "困扰较严重" : "困扰程度很严重";
    const top = [["交谈方面",groups[0]],["交际方面",groups[1]],["待人接物",groups[2]],["异性交往",groups[3]]].sort((a,b)=>b[1]-a[1])[0];
    return {score:total, scoreLabel:level, details:[`总体评价：${level}。总分${total}分，分数越高表示人际困扰越明显。`,`重点维度：当前得分最高的是${top[0]}（${top[1]}分，${groupLevel(top[1])}），可作为咨询中优先讨论的人际主题。`,`交谈方面：${groups[0]}分（${groupLevel(groups[0])}）`,`交际方面：${groups[1]}分（${groupLevel(groups[1])}）`,`待人接物：${groups[2]}分（${groupLevel(groups[2])}）`,`异性交往：${groups[3]}分（${groupLevel(groups[3])}）`,`总分0—8分表示困扰较少，9—14分表示存在一定困扰，15—20分表示困扰较严重，21—28分表示困扰程度很严重。`]};
  }

  function mood(values, kind) {
    const reverse = kind === "sds" ? [2,5,6,11,12,14,16,17,18,20] : [5,9,13,17,19];
    const raw = sum(values.map((value, i) => reverse.includes(i + 1) ? 5 - value : value));
    const standard = Math.floor(raw * 1.25);
    const symptom = kind === "sds" ? "抑郁" : "焦虑";
    const level = standard < 50 ? `未达到${symptom}分界值` : standard < 60 ? `轻度${symptom}` : standard < 70 ? `中度${symptom}` : `重度${symptom}`;
    const focus = standard < 50 ? "当前分数未达到该量表分界值，但仍可结合近期压力、睡眠、食欲和功能状态理解。" : `当前达到${level}区间，建议结合访谈进一步了解持续时间、诱因、功能影响和安全风险。`;
    return {score:standard, scoreLabel:level, details:[`总体评价：${level}。${focus}`,`原始分：${raw}分`,`标准分：${standard}分`,`结果解释：50分以下为未达到分界值，50—59分为轻度${symptom}，60—69分为中度${symptom}，70分及以上为重度${symptom}。`,`本结果按原文件的计分和分界说明显示，仅用于自评筛查和咨询辅助，不等同于医学诊断。`]};
  }

  function enrich(values) {
    const negative = new Set([3,4,5,6,7,8,10,12,13,14,16,17,18,24,25,26,28,29,30,32,37,40,43,44,47,48,49,52,53,54,55,56,57,59,61,63,64,66,69,70,71,72,73,74,75,81,84,85,86,87,88,90,92,93,94,95,96,97,98,99,100,101,105,106,111,115,117,118,123]);
    const scored = values.map((value,i) => negative.has(i + 1) ? value : 6 - value);
    const factors = [
      ["过分理想化",[34,42,64,70,101,116,117,118,119,120,121,122,123,124],"高分表示评价感情色彩较浓；低分表示评价较现实"],
      ["婚姻满意度",[14,19,32,36,52,53,82,88,99,113],"高分表示多数方面较和谐满意；低分表示婚姻满意度较低"],
      ["性格相容性",[8,13,24,30,37,44,63,78,95,115],"高分表示较满意配偶的行为方式；低分表示较难相容"],
      ["夫妻交流",[2,6,40,54,66,73,81,91,98,109],"高分表示较满意交流方式与交流量；低分表示交流存在缺陷"],
      ["解决冲突",[4,10,39,58,71,74,79,83,96,112],"高分表示较满意冲突解决方式；低分表示冲突较难解决"],
      ["经济安排",[16,20,26,38,45,51,77,85,93,110],"高分表示较满意经济安排；低分表示经济安排存在矛盾"],
      ["业余活动",[1,17,18,28,31,33,60,72,84,114],"高分表示业余活动较和谐灵活；低分表示业余生活存在矛盾"],
      ["性生活",[9,15,25,41,47,62,69,106,107,111],"高分表示较满意情感表达与性角色状况；低分表示满意度较低"],
      ["子女与婚姻",[5,21,35,49,50,59,67,87,94,102],"高分表示父母角色及管教意见较统一满意；低分表示存在不一致或矛盾"],
      ["亲友关系",[7,27,48,57,58,86,90,103,108],"高分表示与双方亲友关系较和谐；低分表示可能存在潜在冲突"],
      ["角色平等性",[12,23,29,43,55,61,75,80,97,105],"高分表示更主张角色公平分配；低分表示更倾向传统角色分配"],
      ["信仰一致性",[3,11,22,46,56,65,76,89,104],"分数反映婚姻信念取向；双方分数越接近，信仰观念越一致"]
    ];
    const factorScores = factors.map(([name,items,meaning]) => ({name, score:sum(items.map(number => scored[number - 1])), max:items.length * 5, meaning}));
    const total = sum(scored);
    const ratio = total / 620;
    const level = ratio >= 0.75 ? "婚姻质量整体较好" : ratio >= 0.55 ? "婚姻质量中等，部分领域需沟通" : "婚姻质量需重点关注";
    const high = factorScores.slice().sort((a,b)=>b.score/b.max-a.score/a.max).slice(0,3).map(item=>`${item.name}${item.score}/${item.max}`);
    const low = factorScores.slice().sort((a,b)=>a.score/a.max-b.score/b.max).slice(0,3).map(item=>`${item.name}${item.score}/${item.max}`);
    const details = [
      `总体评价：${level}。总分${total}/620，分数越高表示整体婚姻质量越好。`,
      `相对优势维度：${high.join("、")}。`,
      `优先沟通维度：${low.join("、")}。建议结合伴侣双方作答、访谈材料和实际冲突情境共同理解。`
    ];
    factorScores.forEach(item => details.push(`${item.name}：${item.score}/${item.max}分。${item.meaning}。`));
    return {score:`${total} / 620`, scoreLabel:level, details};
  }

  function wellbeing(values) {
    const reversed = values.map(value => 8 - value);
    const affect = sum(reversed.slice(0,8)) / 8;
    const satisfaction = reversed[8] * 1.1;
    const total = affect + satisfaction;
    const evaluation = total >= 13
      ? "较高幸福感水平（原文件样本中31%的来访者得分达到13分或以上）"
      : total >= 9.6
        ? "处于原文件样本平均值上下1个标准差的范围内"
        : "低于原文件样本平均值1个标准差以上";
    const level = total >= 13 ? "幸福感水平较高" : total >= 9.6 ? "幸福感处于常见范围" : "幸福感偏低，建议关注";
    return {score:total.toFixed(2), scoreLabel:level, details:[`总体评价：${level}。${evaluation}。`,`幸福感指数：${total.toFixed(2)}`,`理论范围：2.10（最低）—14.70（最高）`,`原文件样本：平均分11.8，标准差2.2。`]};
  }

  function ucla(values) {
    const reverse = new Set([1,5,6,9,10,15,16,19,20]);
    const total = sum(values.map((value,i) => reverse.has(i + 1) ? 5 - value : value));
    const level = total >= 45 ? "高度孤独" : total >= 39 ? "一般偏上孤独" : total >= 33 ? "中间水平" : total >= 28 ? "一般偏下孤独" : "低度孤独";
    const focus = total >= 39 ? "建议进一步了解社会支持、亲密关系质量、归属感和近期压力事件。" : total >= 33 ? "可结合近期人际互动质量和主观连接感继续观察。" : "当前孤独感体验相对较低或处于较低区间。";
    return {score:total, scoreLabel:level, details:[`总体评价：${level}。${focus}`,`总分：${total}分`,`结果区间：${level}`,"44分以上为高度孤独，39—44分为一般偏上，33—38分为中间水平，28—32分为一般偏下，28分以下为低度孤独。","分数越高，表示主观体验到的孤独感越强。"]};
  }

  root.PSY_COMMON_SCORING = {score(kind, values) {
    if (kind === "psq") return psq(values);
    if (kind === "interpersonal") return interpersonal(values);
    if (kind === "sds" || kind === "sas") return mood(values, kind);
    if (kind === "enrich") return enrich(values);
    if (kind === "wellbeing") return wellbeing(values);
    if (kind === "ucla") return ucla(values);
    throw new Error(`未知计分类型：${kind}`);
  }};
})(typeof window === "undefined" ? globalThis : window);
