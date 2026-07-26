import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(root, "data");
const dataFile = path.join(dataDir, "store.json");

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

function seed() {
  const adminId = id("usr");
  if (process.env.NODE_ENV === "production") {
    const adminPassword = process.env.ADMIN_PASSWORD || "";
    if (adminPassword.length < 12) {
      throw new Error("首次生产启动必须设置至少 12 位的 ADMIN_PASSWORD");
    }
    return {
      users: [{
        id: adminId,
        username: process.env.ADMIN_USERNAME || "admin",
        name: process.env.ADMIN_NAME || "系统管理员",
        passwordHash: bcrypt.hashSync(adminPassword, 12),
        role: "ADMIN",
        active: true,
        createdAt: now()
      }],
      profiles: [],
      tasks: [],
      reports: [],
      memories: [],
      runs: [],
      feedback: [],
      modelConfig: {
        provider: "DeepSeek",
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        enabled: true,
        temperature: 0.3,
        updatedAt: now()
      }
    };
  }
  const memberId = id("usr");
  const taskId = id("tsk");
  const reportId = id("rpt");
  return {
    users: [
      { id: adminId, username: "admin", name: "系统管理员", passwordHash: bcrypt.hashSync("admin123", 10), role: "ADMIN", active: true, createdAt: now() },
      { id: memberId, username: "member", name: "林知远", passwordHash: bcrypt.hashSync("member123", 10), role: "USER", active: true, allowManualRun: true, dailyManualRunLimit: 5, manualRunCooldownMinutes: 10, createdAt: now() }
    ],
    profiles: [
      { userId: memberId, role: "产品与技术研究", organization: "核心研究组", bio: "关注 AI 音视频生产、自动化内容生成和个人开发机会。", reportStyle: "简洁、偏产品分析，结论要可执行", focus: "AI 视频、数字人、视频翻译、音频处理" }
    ],
    tasks: [
      {
        id: taskId, userId: memberId, name: "AI 音视频行业前沿", industry: "AI 音视频",
        description: "追踪 AI 视频生成、视频翻译、数字人和音频处理的新产品与商业机会。",
        keywords: ["AI 视频", "视频生成", "视频翻译", "数字人", "音频模型"],
        excludedKeywords: ["课程推广", "纯融资"],
        sources: ["https://openai.com/news/rss.xml", "https://www.producthunt.com/feed"],
        focusQuestions: "哪些变化值得个人开发者关注？有什么可在两周内验证的机会？",
        lookbackHours: 48, schedule: { mode: "interval_days", interval: 2, time: "09:00", timezone: "Asia/Shanghai" },
        status: "ACTIVE", nextRunAt: new Date(Date.now() + 86400000).toISOString(), lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: now(), updatedAt: now()
      }
    ],
    reports: [
      {
        id: reportId, userId: memberId, taskId, createdAt: new Date(Date.now() - 86400000).toISOString(),
        title: "AI 音视频行业前沿 · 第 12 期", period: "最近 48 小时", status: "COMPLETED",
        summary: "本期值得关注的信号集中在轻量视频工作流、实时数字人与多语种本地化。产品能力正在从单点生成转向可控的生产流程。",
        sections: {
          updates: [
            { title: "视频生成工具转向可编辑工作流", summary: "多款工具开始强化分镜、角色一致性和局部重绘，竞争重点从“能生成”转向“可交付”。", importance: 9, source: "产品官方动态" },
            { title: "实时数字人的端侧推理成本下降", summary: "更小的驱动模型让直播、客服等低延迟场景更容易落地。", importance: 8, source: "技术博客" }
          ],
          trends: ["可控性与一致性成为采购关键", "视频本地化正从字幕扩展到口型和音色", "垂直工作流比通用生成入口更有机会"],
          opportunities: ["为跨境短视频团队提供批量本地化质检", "围绕短剧角色建立一致性素材管理工具"],
          risks: ["训练素材版权边界仍不清晰", "演示效果与稳定生产之间仍有差距"],
          actions: ["访谈 3 家跨境内容团队，验证本地化质检痛点", "持续跟踪端侧数字人延迟和单路成本"]
        },
        sources: [
          { title: "产品官方更新", url: "https://example.com/product-update", publishedAt: new Date(Date.now() - 129600000).toISOString() },
          { title: "实时数字人技术进展", url: "https://example.com/avatar", publishedAt: new Date(Date.now() - 172800000).toISOString() }
        ],
        usage: { inputTokens: 5820, outputTokens: 1640, durationMs: 8320 }
      }
    ],
    memories: [
      { id: id("mem"), userId: memberId, taskId: null, type: "PROFILE", content: "更关注个人开发者能在两周内验证的产品机会。", status: "ACTIVE", createdAt: now() },
      { id: id("mem"), userId: memberId, taskId, type: "TASK", content: "持续观察视频翻译的口型同步和音色保留进展。", status: "ACTIVE", createdAt: now() },
      { id: id("mem"), userId: memberId, taskId, type: "CANDIDATE", content: "可能偏好带有具体成本估算的结论。", status: "PENDING", createdAt: now() }
    ],
    runs: [
      { id: id("run"), userId: memberId, taskId, taskName: "AI 音视频行业前沿", status: "SUCCESS", startedAt: new Date(Date.now() - 86409000).toISOString(), finishedAt: new Date(Date.now() - 86400000).toISOString(), message: "报告生成完成" }
    ],
    feedback: [],
    modelConfig: {
      provider: "DeepSeek", model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY || "", enabled: true, temperature: 0.3, updatedAt: now()
    }
  };
}

export class Store {
  constructor() {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seed(), null, 2));
    this.data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (!this.data.emailConfig) {
      this.data.emailConfig = {
        host: process.env.SMTP_HOST || "",
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== "false",
        username: process.env.SMTP_USERNAME || "",
        password: process.env.SMTP_PASSWORD || "",
        fromAddress: process.env.SMTP_FROM || "",
        fromName: process.env.SMTP_FROM_NAME || "Automatic Assistant",
        enabled: process.env.SMTP_ENABLED === "true",
        updatedAt: now()
      };
      this.save();
    }
  }

  save() {
    const temp = `${dataFile}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2));
    fs.renameSync(temp, dataFile);
  }

  nextId(prefix) { return id(prefix); }
}

export const store = new Store();
