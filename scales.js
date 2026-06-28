window.PSY_SCALES = {
  phq9: {
    title: "患者健康问卷抑郁筛查",
    shortTitle: "PHQ-9",
    icon: "🌧️",
    timeframe: "请回顾过去两周",
    duration: "约 3 分钟",
    intro: "过去两周内，你有多少时间受到以下问题困扰？请选择最符合实际频率的一项。",
    notice: "PHQ-9 是抑郁症状筛查工具，不会单独产生诊断。第 9 题用于安全风险提示，任何非零回答都需要咨询师进一步人工评估。",
    options: [
      { label: "完全没有", value: 0 },
      { label: "有几天", value: 1 },
      { label: "一半以上的天数", value: 2 },
      { label: "几乎每天", value: 3 }
    ],
    questions: [
      "做事时提不起劲或没有兴趣。",
      "感到心情低落、沮丧或绝望。",
      "入睡困难、睡不安稳，或睡眠过多。",
      "感觉疲倦或没有活力。",
      "食欲不振或吃得太多。",
      "觉得自己很糟，或觉得自己很失败，或让自己或家人失望。",
      "对事物专注有困难，例如阅读报纸或看电视。",
      "动作或说话速度缓慢到别人已经察觉；或者相反，烦躁、坐立不安，动来动去的情况比平常更多。",
      "有不如死掉，或用某种方式伤害自己的念头。",
      {
        text: "这些问题给你的工作、处理家务或与人相处带来了多大困难？",
        help: "该题用于了解功能影响，不计入 PHQ-9 总分。",
        options: [
          { label: "完全没有困难", value: 0 },
          { label: "有一些困难", value: 1 },
          { label: "非常困难", value: 2 },
          { label: "极度困难", value: 3 }
        ]
      }
    ],
    score(answers) {
      const total = answers.slice(0, 9).reduce((sum, value) => sum + value, 0);
      const selfHarm = answers[8] > 0;
      const impactLabels = ["完全没有困难", "有一些困难", "非常困难", "极度困难"];
      let level = "极轻微范围";
      let summary = "目前报告的抑郁相关症状较少。若主观痛苦或生活影响仍明显，仍建议在咨询中继续说明。";
      if (total >= 20) { level = "重度症状范围"; summary = "抑郁相关症状较为突出，并可能明显影响生活。建议尽快接受精神科或其他合格专业人员的完整评估。"; }
      else if (total >= 15) { level = "中重度症状范围"; summary = "抑郁相关症状较明显。建议优先安排专业访谈，并评估功能影响与安全风险。"; }
      else if (total >= 10) { level = "中度症状范围"; summary = "存在一定程度的抑郁相关症状。建议结合持续时间、生活影响和访谈进一步评估。"; }
      else if (total >= 5) { level = "轻度症状范围"; summary = "存在部分抑郁相关症状。可以在咨询中进一步探索诱因、持续时间和应对资源。"; }
      if (selfHarm) summary = "第 9 题出现了非零回答，需要优先由咨询师进一步询问想法的频率、当前意图、计划、可用手段、既往行为和保护因素。如当前无法保证安全，应立即联系当地急救、公安或精神卫生医疗机构。";
      return {
        score: String(total),
        scoreLabel: "症状总分（0–27）",
        title: selfHarm ? "需要优先人工风险评估" : `抑郁筛查结果：${level}`,
        summary,
        urgent: selfHarm,
        priority: selfHarm ? "urgent" : total >= 10 ? "priority" : "routine",
        details: [
          `功能影响：${impactLabels[answers[9]]}`,
          selfHarm ? "第 9 题：有非零回答，不能仅凭总分判断风险。" : "第 9 题：本次回答为“完全没有”。",
          "PHQ-9 是症状筛查工具，不能单独用于确诊抑郁障碍。"
        ]
      };
    }
  },

  gad7: {
    title: "广泛性焦虑量表",
    shortTitle: "GAD-7",
    icon: "🍃",
    timeframe: "请回顾过去两周",
    duration: "约 2 分钟",
    intro: "过去两周内，你有多少时间受到以下问题困扰？",
    notice: "GAD-7 用于焦虑症状筛查和变化追踪，不会单独产生焦虑障碍诊断。",
    options: [
      { label: "完全不会", value: 0 },
      { label: "有几天", value: 1 },
      { label: "一半以上的天数", value: 2 },
      { label: "几乎每天", value: 3 }
    ],
    questions: [
      "感觉紧张、焦虑或急切。",
      "不能停止或控制担忧。",
      "对各种各样的事情担忧过多。",
      "很难放松下来。",
      "由于不安而无法静坐。",
      "变得容易烦恼或急躁。",
      "感到似乎将有可怕的事情发生而害怕。"
    ],
    score(answers) {
      const total = answers.reduce((sum, value) => sum + value, 0);
      let level = "极轻微范围";
      let summary = "目前报告的焦虑相关症状较少。仍可结合主观痛苦和生活影响，在咨询中进一步说明。";
      if (total >= 15) { level = "重度症状范围"; summary = "焦虑相关症状较为突出。建议优先进行专业访谈，并排除躯体疾病、药物或物质使用等其他影响。"; }
      else if (total >= 10) { level = "中度症状范围"; summary = "存在中度焦虑相关症状。建议结合持续时间、功能影响和具体担忧内容进一步评估。"; }
      else if (total >= 5) { level = "轻度症状范围"; summary = "存在部分焦虑相关症状。可以留意诱发情境、身体反应和回避行为。"; }
      return {
        score: String(total),
        scoreLabel: "症状总分（0–21）",
        title: `焦虑筛查结果：${level}`,
        summary,
        priority: total >= 10 ? "priority" : "routine",
        details: ["分层采用 0–4、5–9、10–14、15–21。", "结果用于症状筛查和追踪，不等同于诊断。"]
      };
    }
  },

  audit: {
    title: "酒精使用障碍筛查",
    shortTitle: "AUDIT",
    icon: "🧩",
    timeframe: "除特别注明外，请回顾最近一年",
    duration: "约 4 分钟",
    intro: "以下问题用于了解饮酒频率、饮酒量及其造成的影响。请按实际情况作答。",
    notice: "AUDIT 是 WHO 开发的筛查工具，不用于自行诊断酒精依赖。若目前处于醉酒、急性戒断或身体不适状态，应优先寻求医疗帮助。",
    questions: [
      { text: "你喝含酒精饮料的频率是多少？", options: [
        { label: "从不", value: 0 }, { label: "每月 1 次或更少", value: 1 }, { label: "每月 2–4 次", value: 2 }, { label: "每周 2–3 次", value: 3 }, { label: "每周 4 次或更多", value: 4 }
      ] },
      { text: "在通常饮酒的一天里，你会喝多少标准杯？", help: "一标准杯约含 10 克纯酒精；不同酒类需要按容量和酒精度换算。", options: [
        { label: "1–2 杯", value: 0 }, { label: "3–4 杯", value: 1 }, { label: "5–6 杯", value: 2 }, { label: "7–9 杯", value: 3 }, { label: "10 杯或更多", value: 4 }
      ] },
      { text: "一次喝 6 标准杯或更多的频率是多少？", options: [
        { label: "从不", value: 0 }, { label: "每月少于 1 次", value: 1 }, { label: "每月 1 次", value: 2 }, { label: "每周 1 次", value: 3 }, { label: "每天或几乎每天", value: 4 }
      ] },
      { text: "最近一年，一旦开始喝酒后就无法停止的情况有多频繁？", options: [
        { label: "从不", value: 0 }, { label: "每月少于 1 次", value: 1 }, { label: "每月 1 次", value: 2 }, { label: "每周 1 次", value: 3 }, { label: "每天或几乎每天", value: 4 }
      ] },
      { text: "最近一年，因为喝酒而没能完成本应完成的事情有多频繁？", options: [
        { label: "从不", value: 0 }, { label: "每月少于 1 次", value: 1 }, { label: "每月 1 次", value: 2 }, { label: "每周 1 次", value: 3 }, { label: "每天或几乎每天", value: 4 }
      ] },
      { text: "最近一年，大量饮酒后的早晨需要再喝酒才能正常活动的情况有多频繁？", options: [
        { label: "从不", value: 0 }, { label: "每月少于 1 次", value: 1 }, { label: "每月 1 次", value: 2 }, { label: "每周 1 次", value: 3 }, { label: "每天或几乎每天", value: 4 }
      ] },
      { text: "最近一年，饮酒后感到内疚或后悔的情况有多频繁？", options: [
        { label: "从不", value: 0 }, { label: "每月少于 1 次", value: 1 }, { label: "每月 1 次", value: 2 }, { label: "每周 1 次", value: 3 }, { label: "每天或几乎每天", value: 4 }
      ] },
      { text: "最近一年，因为喝酒而回忆不起前一晚发生的事情有多频繁？", options: [
        { label: "从不", value: 0 }, { label: "每月少于 1 次", value: 1 }, { label: "每月 1 次", value: 2 }, { label: "每周 1 次", value: 3 }, { label: "每天或几乎每天", value: 4 }
      ] },
      { text: "你或他人是否曾因你的饮酒而受伤？", options: [
        { label: "没有", value: 0 }, { label: "有，但不是在过去一年", value: 2 }, { label: "有，发生在过去一年", value: 4 }
      ] },
      { text: "亲友、医生或其他卫生工作者是否曾关心你的饮酒并建议你减少饮酒？", options: [
        { label: "没有", value: 0 }, { label: "有，但不是在过去一年", value: 2 }, { label: "有，发生在过去一年", value: 4 }
      ] }
    ],
    score(answers) {
      const total = answers.reduce((sum, value) => sum + value, 0);
      const harmFlag = answers[8] > 0;
      const concernFlag = answers[9] > 0;
      let level = "低风险范围";
      let summary = "当前总分处于较低风险范围。低分不等于饮酒完全无风险，仍应结合身体状况、用药、驾驶、妊娠和其他具体情境判断。";
      if (total >= 20) { level = "可能存在依赖，需要专业评估"; summary = "结果提示可能存在较严重的酒精相关问题。建议由熟悉酒精相关障碍的医生或专业人员进一步评估，不应仅依赖在线结果。"; }
      else if (total >= 16) { level = "高风险/有害使用范围"; summary = "结果提示较高的酒精相关风险，建议尽快接受专业评估并讨论减少或停止饮酒。"; }
      else if (total >= 8) { level = "风险饮酒范围"; summary = "结果提示可能存在风险饮酒，建议在咨询或医疗访谈中进一步了解饮酒量、诱因和相关后果。"; }
      return {
        score: String(total),
        scoreLabel: "总分（0–40）",
        title: `酒精使用筛查：${level}`,
        summary,
        priority: total >= 8 ? "priority" : "routine",
        details: [
          harmFlag ? "报告了与饮酒有关的本人或他人受伤经历。" : "未报告与饮酒有关的受伤经历。",
          concernFlag ? "曾有人对饮酒问题表示关心并建议减少饮酒。" : "未报告他人曾对饮酒表示关心。",
          "AUDIT 只用于筛查；阳性结果需要更完整的专业评估。"
        ]
      };
    }
  },

  relationship_checkin: {
    title: "亲密关系咨询需求梳理表",
    shortTitle: "关系梳理",
    icon: "💞",
    timeframe: "请根据近一个月或当前关系作答",
    duration: "约 3 分钟",
    intro: "这不是标准心理量表，也不会判断一段关系是否应该继续。它用于整理关系中的安全、沟通、信任、边界和共同目标，帮助咨询师确定访谈重点。",
    notice: "如果关系中存在现实暴力、威胁、跟踪、强迫性行为或无法保证安全，应优先制定安全计划并寻求当地专业与公共安全支持。",
    options: [
      { label: "没有或完全不符合", value: 0 },
      { label: "偶尔或有一点", value: 1 },
      { label: "经常或比较符合", value: 2 },
      { label: "非常明显或几乎总是", value: 3 }
    ],
    questions: [
      { text: "表达不同意见时，我会担心对方报复、失控或让我付出代价。", theme: "关系安全", risk: true },
      { text: "关系中出现过侮辱、威胁、推搡殴打、强迫性行为或其他让我害怕的行为。", theme: "暴力与强迫", risk: true },
      { text: "冲突反复发生，却很难真正修复或达成新的相处方式。", theme: "冲突修复" },
      { text: "我们常回避重要话题，或一开口就容易指责、防御和中断沟通。", theme: "沟通模式" },
      { text: "我对关系中的诚实、忠诚或信息隐瞒感到不安。", theme: "信任" },
      { text: "我的隐私、社交、工作、金钱或身体边界经常不被尊重。", theme: "边界与控制", priorityRisk: true },
      { text: "重要决定和责任分配明显不平等，让一方长期委屈或无力。", theme: "权力与责任" },
      { text: "双方对亲密、陪伴、性或个人空间的需要差异较大。", theme: "亲密需要" },
      { text: "双方在婚育、金钱、家庭责任或未来生活方面存在重要分歧。", theme: "价值与未来" },
      { text: "分手、复合、关系不确定或是否继续这段关系让我持续痛苦。", theme: "关系决策" },
      { text: "过往背叛、创伤或前一段关系仍明显影响现在的相处。", theme: "过往经历" },
      { text: "除伴侣外，我缺少可信任的人或现实支持。", theme: "外部支持" }
    ],
    score(answers, scale) {
      const highlighted = scale.questions.filter((question, index) => answers[index] >= 2).map(question => question.theme);
      const riskItems = scale.questions.filter((question, index) => question.risk && answers[index] >= 1).map(question => question.theme);
      const priorityItems = scale.questions.filter((question, index) => question.priorityRisk && answers[index] >= 2).map(question => question.theme);
      const uniqueThemes = [...new Set(highlighted)];
      return {
        score: String(uniqueThemes.length),
        scoreLabel: "需重点讨论的主题",
        title: riskItems.length ? "关系安全需要优先人工评估" : "亲密关系咨询主题摘要",
        urgent: riskItems.length > 0,
        priority: riskItems.length ? "urgent" : priorityItems.length || uniqueThemes.length >= 4 ? "priority" : "routine",
        summary: riskItems.length ? "回答中出现关系安全、暴力、强迫或控制相关信号。应先了解现实危险、升级趋势、可用支持与安全计划，再讨论普通关系改善。" : "结果只用于整理咨询主题，不评价谁对谁错，也不决定关系是否应当继续。",
        details: uniqueThemes.length ? [`建议重点讨论：${uniqueThemes.join("、")}`, "这是非标准化需求梳理表，不提供常模或诊断分数。"] : ["目前没有达到“经常或比较符合”的主题。", "低频回答仍可在咨询中按主观重要性继续讨论。"]
      };
    }
  },

  family_checkin: {
    title: "家庭与亲子咨询需求梳理表",
    shortTitle: "家庭梳理",
    icon: "🏠",
    timeframe: "请根据近两个月的家庭情况作答",
    duration: "约 3 分钟",
    intro: "这不是标准家庭功能量表。它用于整理家庭安全、沟通、分工、边界、情感支持和养育分歧，帮助咨询师决定需要邀请哪些家庭成员参与访谈。",
    notice: "不同家庭成员可能有完全不同的体验。结果只代表填写人的视角，不应被当作整个家庭的客观结论。",
    options: [
      { label: "没有或完全不符合", value: 0 },
      { label: "偶尔或有一点", value: 1 },
      { label: "经常或比较符合", value: 2 },
      { label: "非常明显或几乎总是", value: 3 }
    ],
    questions: [
      { text: "家庭冲突中出现威胁、暴力、破坏物品，或有人因此感到害怕。", theme: "家庭安全", risk: true },
      { text: "我担心儿童、老人或其他家庭成员受到虐待、忽视或现实伤害。", theme: "弱势成员安全", risk: true },
      { text: "重要事情很难直接说清楚，经常靠猜测、沉默、讽刺或传话沟通。", theme: "家庭沟通" },
      { text: "家庭成员的感受和需要经常不被听见或被否定。", theme: "情感回应" },
      { text: "家务、照顾、经济或其他家庭责任分配不清楚或长期不公平。", theme: "角色与分工" },
      { text: "家庭成员之间过度干涉，或缺少必要的隐私和个人空间。", theme: "家庭边界" },
      { text: "家庭冲突经常把孩子、老人或其他成员卷入双方之间。", theme: "三角关系" },
      { text: "重要决定主要由一人控制，其他人很难表达不同意见。", theme: "权力与决策" },
      { text: "遇到疾病、失业、升学或其他危机时，家庭很难合作应对。", theme: "问题解决" },
      { text: "家庭成员很少表达关心、感谢、安慰或亲近。", theme: "情感联结" },
      { text: "照顾者在规则、教育方式和奖惩上分歧明显。", theme: "养育一致性" },
      { text: "经济、住房、照护或工作压力已经明显影响家庭关系。", theme: "现实压力" }
    ],
    score(answers, scale) {
      const highlighted = scale.questions.filter((question, index) => answers[index] >= 2).map(question => question.theme);
      const riskItems = scale.questions.filter((question, index) => question.risk && answers[index] >= 1).map(question => question.theme);
      const uniqueThemes = [...new Set(highlighted)];
      return {
        score: String(uniqueThemes.length),
        scoreLabel: "需重点讨论的主题",
        title: riskItems.length ? "家庭安全需要优先人工评估" : "家庭咨询主题摘要",
        urgent: riskItems.length > 0,
        priority: riskItems.length ? "urgent" : uniqueThemes.length >= 4 ? "priority" : "routine",
        summary: riskItems.length ? "回答中出现家庭暴力、虐待、忽视或现实安全相关信号。应先核对当事人的当前安全和保护资源，再安排常规家庭咨询。" : "结果用于整理填写者所见的家庭议题，建议在可能的情况下分别了解其他家庭成员的视角。",
        details: uniqueThemes.length ? [`建议重点讨论：${uniqueThemes.join("、")}`, "这是非标准化需求梳理表，不提供家庭功能诊断。"] : ["目前没有达到“经常或比较符合”的主题。", "仍可根据求助目标选择最希望改善的一项。"]
      };
    }
  },

  interpersonal_checkin: {
    title: "人际与社会适应需求梳理表",
    shortTitle: "人际梳理",
    icon: "🤝",
    timeframe: "请根据近一个月的情况作答",
    duration: "约 3 分钟",
    intro: "这不是标准心理量表。它用于整理社交焦虑、孤独、信任、表达、边界和社会支持等咨询主题。",
    notice: "人际困难可能与环境变化、关系经历、情绪状态、神经多样性或文化处境有关，不能由一份问卷简单归因。",
    options: [
      { label: "没有或完全不符合", value: 0 },
      { label: "偶尔或有一点", value: 1 },
      { label: "经常或比较符合", value: 2 },
      { label: "非常明显或几乎总是", value: 3 }
    ],
    questions: [
      { text: "我会因为害怕被评价、拒绝或出丑而回避社交场合。", theme: "社交焦虑与回避" },
      { text: "即使身边有人，我仍经常感到孤独或与人隔离。", theme: "孤独感" },
      { text: "我很难相信别人，常担心被利用、背叛或伤害。", theme: "人际信任" },
      { text: "遇到困难时，我很难向别人开口求助。", theme: "寻求支持" },
      { text: "我缺少可以坦诚交流、提供现实帮助或陪伴的人。", theme: "社会支持" },
      { text: "发生分歧时，我很难表达需要、拒绝别人或坚持边界。", theme: "表达与边界" },
      { text: "我经常委屈自己迎合别人，事后感到疲惫、愤怒或后悔。", theme: "讨好与自我忽视" },
      { text: "搬家、毕业、换工作、失恋或其他变化使原有社交网络明显减少。", theme: "适应与关系变化" },
      { text: "与人相处会让我非常疲惫，需要很长时间才能恢复。", theme: "社交负荷" },
      { text: "我想改善人际关系，但不知道从哪里开始。", theme: "改变目标" }
    ],
    score(answers, scale) {
      const themes = [...new Set(scale.questions.filter((question, index) => answers[index] >= 2).map(question => question.theme))];
      return {
        score: String(themes.length),
        scoreLabel: "需重点讨论的主题",
        title: "人际与社会适应主题摘要",
        priority: themes.length >= 4 ? "priority" : "routine",
        summary: "结果用于帮助咨询师选择访谈重点，不把内向、独处偏好或社交方式差异自动视为问题。",
        details: themes.length ? [`建议重点讨论：${themes.join("、")}`, "这是非标准化需求梳理表，不提供诊断或常模分数。"] : ["目前没有达到“经常或比较符合”的主题。", "仍可根据个人目标讨论希望增加或减少的社交体验。"]
      };
    }
  },

  youth_checkin: {
    title: "儿童青少年咨询需求梳理表",
    shortTitle: "青少年梳理",
    icon: "🎒",
    timeframe: "请根据近一个月的情况作答",
    duration: "约 4 分钟",
    intro: "这不是诊断量表。它用于整理儿童青少年的情绪、学习、行为、同伴、家庭和安全问题。填写前应说明是本人、监护人还是教师视角。",
    notice: "未成年人信息属于敏感个人信息。若出现自伤、伤人、虐待、欺凌或现实危险，应优先进行人工安全评估并按需要联系监护人和相关专业机构。",
    options: [
      { label: "没有", value: 0 },
      { label: "偶尔或轻微", value: 1 },
      { label: "经常或比较明显", value: 2 },
      { label: "持续存在或非常明显", value: 3 }
    ],
    questions: [
      { text: "持续情绪低落、易怒、缺少兴趣或经常哭泣。", theme: "情绪状态" },
      { text: "过度担心、紧张、害怕分离，或明显回避某些场景。", theme: "焦虑与恐惧" },
      { text: "不愿上学、成绩明显下降、经常缺课或无法完成学习任务。", theme: "学习与到校" },
      { text: "睡眠、食欲、精力或日常作息出现明显变化。", theme: "睡眠与生活节律" },
      { text: "遭遇同伴排斥、欺凌、网络攻击，或几乎没有朋友。", theme: "同伴与校园安全", priorityRisk: true },
      { text: "家庭冲突、照顾变化或重大生活事件明显影响了孩子。", theme: "家庭与生活事件" },
      { text: "冲动、攻击、破坏物品、离家或其他危险行为增加。", theme: "冲动与行为风险", priorityRisk: true },
      { text: "注意力、活动水平或执行任务的困难明显影响学习和生活。", theme: "注意与执行功能" },
      { text: "出现伤害自己、不想活、从高处跳下或其他自伤相关想法或行为。", theme: "自伤自杀风险", risk: true },
      { text: "出现伤害他人的想法、威胁、计划或实际行为。", theme: "伤人风险", risk: true },
      { text: "担心孩子遭受虐待、性侵、严重忽视，或目前所在环境不安全。", theme: "虐待与现实危险", risk: true },
      { text: "酒精、吸烟、网络、游戏、进食或其他行为已经难以控制。", theme: "物质与行为习惯" }
    ],
    score(answers, scale) {
      const themes = [...new Set(scale.questions.filter((question, index) => answers[index] >= 2).map(question => question.theme))];
      const riskItems = scale.questions.filter((question, index) => question.risk && answers[index] >= 1).map(question => question.theme);
      const priorityItems = scale.questions.filter((question, index) => question.priorityRisk && answers[index] >= 2).map(question => question.theme);
      return {
        score: String(themes.length),
        scoreLabel: "需重点讨论的主题",
        title: riskItems.length ? "儿童青少年安全需要优先评估" : "儿童青少年咨询主题摘要",
        urgent: riskItems.length > 0,
        priority: riskItems.length ? "urgent" : priorityItems.length || themes.length >= 4 ? "priority" : "routine",
        summary: riskItems.length ? "回答中出现欺凌、危险行为、自伤伤人或虐待相关信号。应尽快分别了解孩子与监护人的情况，核对现实危险并制定保护措施。" : "结果用于整理访谈方向，不能据此诊断儿童青少年的情绪、行为或发展障碍。",
        details: themes.length ? [`建议重点讨论：${themes.join("、")}`, `需要立即确认的安全主题：${riskItems.length ? riskItems.join("、") : "无"}`, `建议优先访谈的风险主题：${priorityItems.length ? priorityItems.join("、") : "无"}`] : ["目前没有达到“经常或比较明显”的主题。", "仍需结合儿童青少年本人、家庭和学校的多方信息。"]
      };
    }
  },

  wellbeing_checkin: {
    title: "睡眠与身心状态咨询需求梳理表",
    shortTitle: "身心梳理",
    icon: "🌙",
    timeframe: "请根据近一个月的情况作答",
    duration: "约 3 分钟",
    intro: "这不是标准化睡眠或医学诊断量表。它用于整理睡眠、精力、身体不适、健康担忧与生活影响，帮助咨询师选择后续访谈和转介方向。",
    notice: "身体症状需先排除医疗原因。若出现急性胸痛、呼吸困难、意识异常、突发剧烈头痛或其他急性危险表现，请立即就医或联系当地急救。",
    options: [
      { label: "没有或完全不符合", value: 0 },
      { label: "偶尔或有一点", value: 1 },
      { label: "经常或比较明显", value: 2 },
      { label: "持续存在或非常明显", value: 3 }
    ],
    questions: [
      { text: "入睡需要很长时间，或因担心睡不着而更加紧张。", theme: "入睡困难" },
      { text: "夜间经常醒来、早醒，或醒后很难再睡。", theme: "睡眠维持" },
      { text: "睡了一夜仍觉得没有恢复精力。", theme: "睡眠恢复感" },
      { text: "作息时间不规律，或平日与周末睡眠时间差异很大。", theme: "作息节律" },
      { text: "白天疲惫、嗜睡、难以集中注意，或做事效率明显下降。", theme: "日间功能" },
      { text: "疼痛、心悸、胃肠不适、头晕或其他身体感受反复困扰我。", theme: "身体不适" },
      { text: "身体不适在压力、冲突或情绪波动时容易加重。", theme: "压力与身体反应" },
      { text: "我经常担心自己患有严重疾病，反复检查身体或搜索健康信息。", theme: "健康担忧" },
      { text: "睡眠或身体不适已影响工作、学习、自我照顾或人际关系。", theme: "生活影响" },
      { text: "我会依赖酒精、大量咖啡因、吸烟或未按医嘱使用药物来调整睡眠和精力。", theme: "物质与用药" },
      { text: "我已尝试调整作息或休息，但困扰仍持续或反复出现。", theme: "持续与应对" },
      { text: "我不确定这些问题应先从医疗检查、生活调整还是心理咨询入手。", theme: "转介与目标" }
    ],
    score(answers, scale) {
      const themes = [...new Set(scale.questions.filter((question, index) => answers[index] >= 2).map(question => question.theme))];
      return {
        score: String(themes.length),
        scoreLabel: "需重点讨论的主题",
        title: "睡眠与身心状态主题摘要",
        priority: themes.length >= 4 ? "priority" : "routine",
        summary: "结果用于整理访谈和转介方向，不诊断失眠障碍、躯体疾病或其他医疗问题。",
        details: themes.length ? [`建议重点讨论：${themes.join("、")}`, "这是非标准化需求梳理表，身体症状持续、加重或影响功能时应考虑医疗评估。"] : ["目前没有达到“经常或比较明显”的主题。", "低频回答不能排除实际的主观困扰或医疗需要。"]
      };
    }
  },

  gses: {
    title: "一般自我效能感量表",
    shortTitle: "GSES",
    icon: "🌱",
    timeframe: "根据平时的实际感受作答",
    duration: "约 2 分钟",
    intro: "以下 10 个句子涉及你面对困难或新情境时的总体信心。答案没有对错，请选择最符合自己实际感受的一项。",
    notice: "本量表用于了解一般自我效能感，不用于诊断心理或精神疾病。",
    options: [
      { label: "完全不正确", value: 1 },
      { label: "有点正确", value: 2 },
      { label: "多数正确", value: 3 },
      { label: "完全正确", value: 4 }
    ],
    questions: [
      "如果我尽力去做的话，我总是能够解决问题。",
      "即使别人反对我，我仍有办法取得我所要的。",
      "对我来说，坚持理想和达成目标是轻而易举的。",
      "我自信能有效地应付任何突如其来的事情。",
      "以我的才智，我定能应付意料之外的情况。",
      "如果我付出必要的努力，我一定能解决大多数的难题。",
      "我能冷静地面对困难，因为我信赖自己处理问题的能力。",
      "面对一个难题时，我通常能找到几个解决方法。",
      "有麻烦的时候，我通常能想到一些应付的方法。",
      "无论什么事在我身上发生，我都能应付自如。"
    ],
    score(answers) {
      const total = answers.reduce((sum, value) => sum + value, 0);
      const average = total / answers.length;
      let summary = "你的得分反映了当前对自己处理困难能力的总体信心。";
      if (average < 2) summary = "你目前对自己处理困难的信心相对有限。可以从较小、可完成的目标开始，逐步积累成功经验。";
      else if (average < 3) summary = "你对处理困难有一定信心，但在部分情境中可能仍会犹豫。留意自己已经有效应对过的经验会有帮助。";
      else summary = "你通常相信自己能够寻找办法、应对变化并坚持完成目标。也可以继续保持现实评估，在需要时主动寻求支持。";
      return {
        score: average.toFixed(2),
        scoreLabel: "平均分（1–4）",
        title: "自我效能感结果",
        summary,
        priority: "routine",
        details: [`原始总分：${total} / 40`, "分数越高，表示一般自我效能感越强。"]
      };
    }
  },
};
