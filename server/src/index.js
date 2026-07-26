import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { store } from "./store.js";
import { auth, admin, owns, sign } from "./auth.js";
import { nextRun } from "./schedule.js";
import { collect, manualRunQuota, runTask, startScheduler, testModel } from "./report-service.js";
import { createReportDocx } from "./report-export.js";
import { publicEmailConfig, sendReportEmail, testEmailConnection, validEmail } from "./email-service.js";

const app = express();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const webDist = path.resolve(root, "../web/dist");
const isProduction = process.env.NODE_ENV === "production";

if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));
app.disable("x-powered-by");
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      // The IP-only deployment currently serves plain HTTP on port 8088.
      // Enabling this directive would upgrade asset requests to HTTPS and
      // leave the Vue application blank until TLS is configured.
      upgradeInsecureRequests: null
    }
  }
}));
app.use(cors({
  origin: isProduction
    ? false
    : (process.env.WEB_ORIGIN?.split(",").map((x) => x.trim()) || ["http://localhost:5173"])
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "登录尝试过多，请 15 分钟后再试" }
});
const sourcePreviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.session.sub,
  message: { message: "采集测试过于频繁，请稍后再试" }
});
const reportEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.session.sub,
  message: { message: "报告邮件发送过于频繁，请稍后再试" }
});

const publicUser = ({ passwordHash, ...user }) => user;
const getTask = (id) => store.data.tasks.find((x) => x.id === id);
function taskValidationError(input, partial = false) {
  if (!partial && (!String(input.name || "").trim() || !String(input.industry || "").trim())) return "请填写任务名称和行业主题";
  if (input.sources !== undefined) {
    if (!Array.isArray(input.sources)) return "信息源格式不正确";
    if (input.sources.length > 20) return "补充信息源最多填写 20 个";
    if (input.sources.some((url) => {
      try {
        const parsed = new URL(String(url));
        const host = parsed.hostname.toLowerCase();
        return !["http:", "https:"].includes(parsed.protocol)
          || ["localhost", "0.0.0.0", "::1", "[::1]"].includes(host)
          || /^127\./.test(host)
          || /^10\./.test(host)
          || /^192\.168\./.test(host)
          || /^169\.254\./.test(host)
          || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
      } catch {
        return true;
      }
    })) return "信息源必须是可公开访问的完整 http 或 https 地址";
  }
  if (input.lookbackHours !== undefined && (!Number.isFinite(Number(input.lookbackHours)) || Number(input.lookbackHours) < 1 || Number(input.lookbackHours) > 168)) return "信息范围必须在 1–168 小时之间";
  if (input.schedule?.mode && !["interval_days", "weekly"].includes(input.schedule.mode)) return "执行方式不正确";
  if (input.schedule?.mode === "weekly" && (!Array.isArray(input.schedule.weekdays) || !input.schedule.weekdays.length)) return "每周计划至少选择一个执行日";
  if (input.schedule?.weekdays?.some((day) => !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6)) return "每周执行日格式不正确";
  if (input.schedule?.mode === "interval_days" && (!Number.isInteger(Number(input.schedule.interval)) || Number(input.schedule.interval) < 1 || Number(input.schedule.interval) > 30)) return "执行间隔必须在 1–30 天之间";
  if (input.schedule?.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.schedule.time)) return "执行时间格式不正确";
  return "";
}

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const user = store.data.users.find((x) => x.username.toLowerCase() === String(req.body.username || "").toLowerCase());
  if (!user || !user.active || !bcrypt.compareSync(String(req.body.password || ""), user.passwordHash)) {
    return res.status(401).json({ message: "账号或密码错误" });
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get("/api/me", auth, (req, res) => {
  const user = store.data.users.find((x) => x.id === req.session.sub);
  res.json({ user: publicUser(user), profile: store.data.profiles.find((x) => x.userId === user.id) || null });
});
app.get("/api/me/manual-run-quota", auth, (req, res) => {
  res.json(manualRunQuota(req.session.sub));
});

app.put("/api/me/profile", auth, (req, res) => {
  let profile = store.data.profiles.find((x) => x.userId === req.session.sub);
  const allowed = ["role", "organization", "bio", "reportStyle", "focus"];
  const values = Object.fromEntries(allowed.map((key) => [key, String(req.body[key] || "").slice(0, 2000)]));
  if (profile) Object.assign(profile, values);
  else { profile = { userId: req.session.sub, ...values }; store.data.profiles.push(profile); }
  store.save();
  res.json(profile);
});

app.put("/api/me/password", auth, (req, res) => {
  const user = store.data.users.find((x) => x.id === req.session.sub);
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(400).json({ message: "当前密码不正确" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "新密码至少需要 8 位" });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  store.save();
  res.json({ message: "密码修改成功" });
});

app.get("/api/dashboard", auth, (req, res) => {
  const scope = (x) => req.session.role === "ADMIN" || x.userId === req.session.sub;
  const tasks = store.data.tasks.filter(scope).filter((x) => x.status !== "ARCHIVED");
  const reports = store.data.reports.filter(scope);
  const runs = store.data.runs.filter(scope);
  if (req.session.role === "ADMIN") {
    return res.json({
      role: "ADMIN",
      stats: {
        users: store.data.users.filter((x) => x.role === "USER" && !x.deletedAt).length,
        activeUsers: store.data.users.filter((x) => x.role === "USER" && x.active && !x.deletedAt).length,
        activeTasks: tasks.filter((x) => x.status === "ACTIVE").length,
        reports: reports.length,
        failedRuns: runs.filter((x) => x.status === "FAILED").length
      },
      recentRuns: runs.slice(0, 6)
    });
  }
  res.json({
    role: "USER",
    stats: {
      activeTasks: tasks.filter((x) => x.status === "ACTIVE").length,
      reports: reports.length,
      memories: store.data.memories.filter(scope).length,
      successfulRuns: runs.filter((x) => x.status === "SUCCESS").length
    },
    tasks: tasks.slice(0, 4), recentReports: reports.slice(0, 3)
  });
});

app.get("/api/tasks", auth, (req, res) => {
  res.json(store.data.tasks.filter((x) => x.status !== "ARCHIVED" && owns(req, x.userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});
app.post("/api/tasks/preview-sources", auth, sourcePreviewLimiter, async (req, res) => {
  const error = taskValidationError(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const items = await collect({
      name: String(req.body.name).slice(0, 100),
      industry: String(req.body.industry).slice(0, 100),
      keywords: Array.isArray(req.body.keywords) ? req.body.keywords.slice(0, 30) : [],
      excludedKeywords: Array.isArray(req.body.excludedKeywords) ? req.body.excludedKeywords.slice(0, 30) : [],
      sources: Array.isArray(req.body.sources) ? req.body.sources.slice(0, 10) : [],
      lookbackHours: Math.min(168, Math.max(1, Number(req.body.lookbackHours || 48)))
    });
    res.json({
      count: items.length,
      items: items.slice(0, 8).map((item) => ({
        title: item.title,
        link: item.url,
        publishedAt: item.publishedAt,
        sourceType: item.sourceType,
        summary: String(item.summary || "").slice(0, 260)
      })),
      message: items.length ? `找到 ${items.length} 条符合条件的资料` : "没有找到符合条件的资料，请调整关键词、时间范围或信息源"
    });
  } catch (error) {
    res.status(502).json({ message: `采集测试失败：${error.message}` });
  }
});

app.post("/api/tasks", auth, (req, res) => {
  const validationError = taskValidationError(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const schedule = req.body.schedule || { mode: "interval_days", interval: 2, time: "09:00", timezone: "Asia/Shanghai" };
  const task = {
    id: store.nextId("tsk"), userId: req.session.sub,
    name: String(req.body.name || "").trim().slice(0, 100),
    industry: String(req.body.industry || "").trim().slice(0, 100),
    description: String(req.body.description || "").slice(0, 1000),
    keywords: Array.isArray(req.body.keywords) ? req.body.keywords.slice(0, 30) : [],
    excludedKeywords: Array.isArray(req.body.excludedKeywords) ? req.body.excludedKeywords.slice(0, 30) : [],
    sources: Array.isArray(req.body.sources) ? req.body.sources.slice(0, 20) : [],
    focusQuestions: String(req.body.focusQuestions || "").slice(0, 2000),
    lookbackHours: Math.min(168, Math.max(1, Number(req.body.lookbackHours || 48))),
    emailReport: Boolean(req.body.emailReport),
    schedule, status: "ACTIVE", nextRunAt: nextRun(schedule), lastRunAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  store.data.tasks.push(task); store.save(); res.status(201).json(task);
});

app.put("/api/tasks/:id", auth, (req, res) => {
  const task = getTask(req.params.id);
  if (!task || !owns(req, task.userId)) return res.status(404).json({ message: "任务不存在" });
  const validationError = taskValidationError(req.body, true);
  if (validationError) return res.status(400).json({ message: validationError });
  const allowed = ["name", "industry", "description", "keywords", "excludedKeywords", "sources", "focusQuestions", "lookbackHours", "emailReport", "schedule", "status"];
  for (const key of allowed) if (req.body[key] !== undefined) task[key] = req.body[key];
  task.updatedAt = new Date().toISOString();
  if (req.body.schedule || req.body.status === "ACTIVE") task.nextRunAt = nextRun(task.schedule);
  store.save(); res.json(task);
});

app.delete("/api/tasks/:id", auth, (req, res) => {
  const task = store.data.tasks.find((x) => x.id === req.params.id && owns(req, x.userId));
  if (!task) return res.status(404).json({ message: "任务不存在" });
  task.status = "ARCHIVED";
  task.archivedAt = new Date().toISOString();
  task.nextRunAt = null;
  store.save();
  res.status(204).end();
});

app.post("/api/tasks/:id/run", auth, async (req, res) => {
  const task = getTask(req.params.id);
  if (!task || !owns(req, task.userId)) return res.status(404).json({ message: "任务不存在" });
  try { res.status(201).json(await runTask(task.id)); }
  catch (error) { res.status(error.status || 500).json({ message: error.message }); }
});

app.get("/api/reports", auth, (req, res) => {
  res.json(store.data.reports.filter((x) => owns(req, x.userId)).map(({ sections, sources, ...summary }) => summary));
});
app.get("/api/reports/:id", auth, (req, res) => {
  const report = store.data.reports.find((x) => x.id === req.params.id);
  if (!report || !owns(req, report.userId)) return res.status(404).json({ message: "报告不存在" });
  const feedback = store.data.feedback.find((x) => x.reportId === report.id && x.userId === req.session.sub) || null;
  res.json({ ...report, feedback });
});
app.post("/api/reports/:id/feedback", auth, (req, res) => {
  const report = store.data.reports.find((x) => x.id === req.params.id);
  if (!report || !owns(req, report.userId)) return res.status(404).json({ message: "报告不存在" });
  let feedback = store.data.feedback.find((x) => x.reportId === report.id && x.userId === req.session.sub);
  if (feedback) {
    feedback.rating = req.body.rating;
    feedback.note = String(req.body.note || "").slice(0, 500);
    feedback.updatedAt = new Date().toISOString();
  } else {
    feedback = { id: store.nextId("fb"), reportId: report.id, userId: req.session.sub, rating: req.body.rating, note: String(req.body.note || "").slice(0, 500), createdAt: new Date().toISOString() };
    store.data.feedback.push(feedback);
  }
  store.save(); res.status(201).json(feedback);
});
app.delete("/api/reports/:id", auth, (req, res) => {
  const index = store.data.reports.findIndex((x) => x.id === req.params.id && owns(req, x.userId));
  if (index < 0) return res.status(404).json({ message: "报告不存在" });
  store.data.reports.splice(index, 1);
  store.data.feedback = store.data.feedback.filter((x) => x.reportId !== req.params.id);
  store.save();
  res.status(204).end();
});
app.get("/api/reports/:id/export.docx", auth, async (req, res) => {
  const report = store.data.reports.find((x) => x.id === req.params.id);
  if (!report || !owns(req, report.userId)) return res.status(404).json({ message: "报告不存在" });
  try {
    const buffer = await createReportDocx(report);
    const filename = `${report.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "行业报告"}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Word 报告生成失败" });
  }
});
app.post("/api/reports/:id/email", auth, reportEmailLimiter, async (req, res) => {
  const report = store.data.reports.find((x) => x.id === req.params.id);
  if (!report || !owns(req, report.userId)) return res.status(404).json({ message: "报告不存在" });
  const user = store.data.users.find((item) => item.id === req.session.sub);
  try {
    const delivery = await sendReportEmail(report, user?.email);
    report.emailDelivery = { status: "SENT", to: user.email, sentAt: new Date().toISOString(), messageId: delivery.messageId };
    store.save();
    res.json(report.emailDelivery);
  } catch (error) {
    report.emailDelivery = { status: "FAILED", to: user?.email || "", failedAt: new Date().toISOString(), error: error.message };
    store.save();
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/memories", auth, (req, res) => res.json(store.data.memories.filter((x) => owns(req, x.userId))));
app.post("/api/memories", auth, (req, res) => {
  const item = { id: store.nextId("mem"), userId: req.session.sub, taskId: req.body.taskId || null, type: req.body.type || "PROFILE", content: String(req.body.content || "").trim().slice(0, 1000), status: "ACTIVE", createdAt: new Date().toISOString() };
  if (!item.content) return res.status(400).json({ message: "记忆内容不能为空" });
  store.data.memories.unshift(item); store.save(); res.status(201).json(item);
});
app.put("/api/memories/:id", auth, (req, res) => {
  const item = store.data.memories.find((x) => x.id === req.params.id);
  if (!item || !owns(req, item.userId)) return res.status(404).json({ message: "记忆不存在" });
  if (req.body.content !== undefined) item.content = String(req.body.content).slice(0, 1000);
  if (req.body.status !== undefined) item.status = req.body.status;
  store.save(); res.json(item);
});
app.delete("/api/memories/:id", auth, (req, res) => {
  const index = store.data.memories.findIndex((x) => x.id === req.params.id && owns(req, x.userId));
  if (index < 0) return res.status(404).json({ message: "记忆不存在" });
  store.data.memories.splice(index, 1); store.save(); res.status(204).end();
});

app.get("/api/admin/users", auth, admin, (_req, res) => res.json(store.data.users.map((user) => ({
  ...publicUser(user),
  allowManualRun: user.allowManualRun !== false,
  dailyManualRunLimit: Number(user.dailyManualRunLimit || 5),
  manualRunCooldownMinutes: Number(user.manualRunCooldownMinutes ?? 10),
  taskCount: store.data.tasks.filter((x) => x.userId === user.id && x.status !== "ARCHIVED").length,
  reportCount: store.data.reports.filter((x) => x.userId === user.id).length,
  lastRunAt: store.data.runs.find((x) => x.userId === user.id)?.startedAt || null
}))));
app.post("/api/admin/users", auth, admin, (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return res.status(400).json({ message: "账号需为 3–32 位字母、数字或 . _ -" });
  if (store.data.users.some((x) => x.username.toLowerCase() === username.toLowerCase())) return res.status(400).json({ message: "该登录账号已存在" });
  if (password.length < 8) return res.status(400).json({ message: "初始密码至少需要 8 位" });
  if (req.body.email && !validEmail(req.body.email)) return res.status(400).json({ message: "收件邮箱格式不正确" });
  const user = {
    id: store.nextId("usr"), username, name: String(req.body.name || username).trim().slice(0, 100),
    passwordHash: bcrypt.hashSync(password, 12), role: "USER", active: true,
    email: String(req.body.email || "").trim().toLowerCase().slice(0, 254),
    allowManualRun: req.body.allowManualRun !== false,
    dailyManualRunLimit: Math.min(50, Math.max(1, Number(req.body.dailyManualRunLimit || 5))),
    manualRunCooldownMinutes: Math.min(1440, Math.max(0, Number(req.body.manualRunCooldownMinutes ?? 10))),
    createdAt: new Date().toISOString()
  };
  store.data.users.push(user); store.save(); res.status(201).json(publicUser(user));
});
app.put("/api/admin/users/:id", auth, admin, (req, res) => {
  const user = store.data.users.find((x) => x.id === req.params.id);
  if (!user) return res.status(404).json({ message: "用户不存在" });
  if (req.body.name !== undefined) user.name = String(req.body.name).slice(0, 100);
  if (req.body.email !== undefined) {
    if (req.body.email && !validEmail(req.body.email)) return res.status(400).json({ message: "收件邮箱格式不正确" });
    user.email = String(req.body.email || "").trim().toLowerCase().slice(0, 254);
  }
  if (req.body.active !== undefined) user.active = Boolean(req.body.active);
  if (req.body.allowManualRun !== undefined) user.allowManualRun = Boolean(req.body.allowManualRun);
  if (req.body.dailyManualRunLimit !== undefined) user.dailyManualRunLimit = Math.min(50, Math.max(1, Number(req.body.dailyManualRunLimit)));
  if (req.body.manualRunCooldownMinutes !== undefined) user.manualRunCooldownMinutes = Math.min(1440, Math.max(0, Number(req.body.manualRunCooldownMinutes)));
  if (req.body.restore) {
    user.deletedAt = null;
    user.active = true;
    for (const task of store.data.tasks.filter((x) => x.userId === user.id && x.pausedByAdmin)) {
      task.status = "ACTIVE";
      task.pausedByAdmin = false;
      task.nextRunAt = nextRun(task.schedule);
    }
  }
  if (req.body.password) {
    if (String(req.body.password).length < 8) return res.status(400).json({ message: "新密码至少需要 8 位" });
    user.passwordHash = bcrypt.hashSync(String(req.body.password), 12);
  }
  store.save(); res.json(publicUser(user));
});
app.delete("/api/admin/users/:id", auth, admin, (req, res) => {
  const user = store.data.users.find((x) => x.id === req.params.id);
  if (!user || user.role === "ADMIN") return res.status(400).json({ message: "该账号不能被移除" });
  user.active = false;
  user.deletedAt = new Date().toISOString();
  for (const task of store.data.tasks.filter((x) => x.userId === user.id && x.status === "ACTIVE")) {
    task.status = "PAUSED";
    task.pausedByAdmin = true;
  }
  store.save();
  res.status(204).end();
});
app.get("/api/admin/model", auth, admin, (_req, res) => {
  const { apiKey, ...config } = store.data.modelConfig;
  res.json({ ...config, hasApiKey: Boolean(apiKey), maskedKey: apiKey ? `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}` : "" });
});
app.put("/api/admin/model", auth, admin, (req, res) => {
  const allowed = ["provider", "model", "baseUrl", "enabled", "temperature"];
  for (const key of allowed) if (req.body[key] !== undefined) store.data.modelConfig[key] = req.body[key];
  if (req.body.apiKey) store.data.modelConfig.apiKey = String(req.body.apiKey);
  if (req.body.clearApiKey) store.data.modelConfig.apiKey = "";
  store.data.modelConfig.updatedAt = new Date().toISOString();
  store.save();
  const { apiKey, ...config } = store.data.modelConfig;
  res.json({ ...config, hasApiKey: Boolean(apiKey) });
});
app.post("/api/admin/model/test", auth, admin, async (_req, res) => {
  try { res.json(await testModel(store.data.modelConfig)); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
app.get("/api/admin/email", auth, admin, (_req, res) => res.json(publicEmailConfig()));
app.put("/api/admin/email", auth, admin, (req, res) => {
  const config = store.data.emailConfig;
  const allowed = ["host", "port", "secure", "username", "fromAddress", "fromName", "enabled"];
  for (const key of allowed) if (req.body[key] !== undefined) config[key] = req.body[key];
  config.host = String(config.host || "").trim().slice(0, 255);
  config.port = Math.min(65535, Math.max(1, Number(config.port || 465)));
  config.username = String(config.username || "").trim().slice(0, 255);
  config.fromAddress = String(config.fromAddress || "").trim().toLowerCase().slice(0, 254);
  config.fromName = String(config.fromName || "Automatic Assistant").trim().slice(0, 100);
  config.secure = Boolean(config.secure);
  config.enabled = Boolean(config.enabled);
  if (req.body.password) config.password = String(req.body.password).slice(0, 500);
  if (req.body.clearPassword) config.password = "";
  if (config.fromAddress && !validEmail(config.fromAddress)) return res.status(400).json({ message: "发件邮箱格式不正确" });
  config.updatedAt = new Date().toISOString();
  store.save();
  res.json(publicEmailConfig());
});
app.post("/api/admin/email/test", auth, admin, async (req, res) => {
  try { res.json(await testEmailConnection(String(req.body.recipient || "").trim())); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
app.get("/api/admin/runs", auth, admin, (_req, res) => res.json(store.data.runs));

app.use("/api", (_req, res) => res.status(404).json({ message: "接口不存在" }));

if (isProduction) {
  app.use(express.static(webDist, {
    maxAge: "7d",
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
    }
  }));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "服务器内部错误" });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (isProduction ? "127.0.0.1" : "0.0.0.0");
const server = app.listen(port, host, () => {
  console.log(`Automatic Assistant: http://${host}:${port} (${isProduction ? "production" : "development"})`);
  startScheduler();
});

function shutdown(signal) {
  console.log(`${signal}: closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
