function splitTerms(value) {
  return String(value || "")
    .split(/[，,、；;|/\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const englishAliases = [
  [/嵌入式/, "embedded"],
  [/微控制器|单片机/, "microcontroller MCU"],
  [/模拟电路/, "analog circuit"],
  [/数字电路/, "digital circuit"],
  [/电路设计/, "circuit design"],
  [/传感器/, "sensor"],
  [/物联网/, "IoT"],
  [/边缘人工智能|边缘AI/i, "edge AI"],
  [/边缘计算/, "edge computing"],
  [/电源/, "power management"],
  [/信号处理/, "signal processing"],
  [/通信/, "connectivity"],
  [/电机控制/, "motor control"],
  [/智能控制/, "intelligent control"],
  [/机器视觉/, "machine vision"],
  [/智能车|智能汽车/, "automotive"],
  [/芯片/, "semiconductor"]
];

function englishTerm(value) {
  return englishAliases.find(([pattern]) => pattern.test(value))?.[1] || "";
}

export function buildSearchQueries(task) {
  const keywords = (Array.isArray(task.keywords) ? task.keywords : splitTerms(task.keywords))
    .map((item) => String(item).trim())
    .filter(Boolean);
  const queries = [];
  const add = (...terms) => {
    const query = [...new Set(terms.filter(Boolean))].slice(0, 4).join(" ");
    if (query && !queries.includes(query)) queries.push(query);
  };

  add(task.name);
  for (let index = 0; index < keywords.length; index += 2) {
    add(keywords[index], keywords[index + 1]);
  }
  if (!keywords.length) splitTerms(task.industry).forEach((term) => add(term));
  return queries.filter(Boolean).slice(0, 12);
}

export function buildSiteSearchQuery(task) {
  const industries = splitTerms(task.industry);
  const keywords = (Array.isArray(task.keywords) ? task.keywords : splitTerms(task.keywords))
    .map((item) => String(item).trim())
    .filter(Boolean);
  const originalTerms = [
    industries.find((term) => /嵌入式/.test(term))
      || industries.find((term) => /电子信息|智能硬件/.test(term))
      || industries[0],
    keywords.find((term) => /微控制器|单片机|芯片|传感器/.test(term))
      || keywords.find((term) => /嵌入式/.test(term))
      || keywords[0]
  ].filter(Boolean);
  const translatedTerms = originalTerms.map(englishTerm).filter(Boolean);
  return [...new Set([...originalTerms, ...translatedTerms])].join(" ");
}
