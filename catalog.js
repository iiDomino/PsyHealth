window.PSY_CATALOG = {
  categories: {
    emotion: {
      icon: "🌤️",
      title: "情绪、焦虑与压力",
      description: "用于了解近期的抑郁情绪、焦虑、恐惧、压力、强迫或创伤相关困扰。",
      directions: ["抑郁情绪", "焦虑与恐惧", "压力与应对", "强迫相关困扰", "创伤与应激反应"]
    },
    relationship: {
      icon: "💞",
      title: "婚恋与亲密关系",
      description: "用于梳理关系满意度、冲突、沟通、信任、亲密感与关系决策。",
      directions: ["关系满意度", "沟通与冲突", "依恋与信任", "失恋与分手适应", "亲密议题"]
    },
    family: {
      icon: "🏠",
      title: "家庭、亲子与养育",
      description: "用于了解家庭功能、家庭氛围、亲子互动和养育方式。",
      directions: ["家庭功能", "家庭环境", "亲子沟通", "父母养育方式", "家庭边界与控制"]
    },
    interpersonal: {
      icon: "🤝",
      title: "人际关系与社会适应",
      description: "用于了解社交焦虑、回避、孤独、人际信任和社会支持。",
      directions: ["社交焦虑与回避", "孤独感", "人际信任", "沟通表达", "社会支持"]
    },
    youth: {
      icon: "🎒",
      title: "儿童、青少年与学习",
      description: "根据年龄和填写人身份，了解情绪、行为、学习压力、同伴关系与校园适应。",
      directions: ["学习与考试压力", "青少年情绪", "同伴关系", "自我概念", "家长或教师观察"]
    },
    wellbeing: {
      icon: "🌙",
      title: "睡眠与身心状态",
      description: "用于了解睡眠质量、疲劳、疼痛、身体不适与生活质量。",
      directions: ["睡眠质量", "失眠困扰", "疲劳与疼痛", "躯体感受", "生活质量"]
    },
    growth: {
      icon: "🌱",
      title: "个性、自我与成长",
      description: "用于认识人格特点、自我效能、自尊、心理韧性与应对方式。",
      directions: ["人格特点", "自我效能", "自尊与自我概念", "心理韧性", "应对方式"]
    },
    habits: {
      icon: "🧩",
      title: "成瘾与行为习惯",
      description: "用于初步了解酒精、吸烟、网络、游戏、进食及其他难以控制的行为。",
      directions: ["酒精使用", "吸烟", "网络与游戏", "进食行为", "冲动与习惯"]
    }
  },
  scales: [
    {
      id: "relationship_checkin",
      category: "relationship",
      title: "亲密关系咨询需求梳理表",
      meta: "12 题 · 非标准量表 · 约 3 分钟",
      description: "整理关系安全、沟通、信任、边界、亲密需要和共同目标。"
    },
    {
      id: "family_checkin",
      category: "family",
      title: "家庭与亲子咨询需求梳理表",
      meta: "12 题 · 非标准量表 · 约 3 分钟",
      description: "整理家庭安全、沟通、分工、边界、情感支持和养育分歧。"
    },
    {
      id: "interpersonal_checkin",
      category: "interpersonal",
      title: "人际与社会适应需求梳理表",
      meta: "10 题 · 非标准量表 · 约 3 分钟",
      description: "整理社交焦虑、孤独、信任、表达、边界和社会支持。"
    },
    {
      id: "youth_checkin",
      category: "youth",
      title: "儿童青少年咨询需求梳理表",
      meta: "12 题 · 非标准量表 · 建议咨询师邀请",
      description: "从情绪、学习、行为、同伴、家庭和安全等方面整理访谈重点。"
    },
    {
      id: "wellbeing_checkin",
      category: "wellbeing",
      title: "睡眠与身心状态咨询需求梳理表",
      meta: "12 题 · 非标准量表 · 约 3 分钟",
      description: "整理睡眠、精力、身体不适、健康担忧与生活影响，帮助选择访谈和转介方向。"
    },
    {
      id: "phq9",
      category: "emotion",
      title: "PHQ-9 抑郁症状筛查",
      meta: "9 项症状 + 功能影响 · 约 3 分钟",
      description: "回顾过去两周的抑郁相关症状；自伤相关题会单独触发人工风险提示。"
    },
    {
      id: "gad7",
      category: "emotion",
      title: "GAD-7 焦虑症状筛查",
      meta: "7 题 · 约 2 分钟",
      description: "回顾过去两周焦虑和担忧相关症状出现的频率。"
    },
    {
      id: "gses",
      category: "growth",
      title: "一般自我效能感量表",
      meta: "10 题 · 约 2 分钟",
      description: "了解面对困难和新情境时的总体信心。"
    },
    {
      id: "audit",
      category: "habits",
      title: "AUDIT 酒精使用筛查",
      meta: "10 题 · 约 4 分钟 · 建议咨询师邀请",
      description: "了解饮酒频率、饮酒量以及最近一年与饮酒有关的影响。"
    }
  ]
};
