import nodemailer from "nodemailer";
import { store } from "./store.js";
import { createReportDocx } from "./report-export.js";

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function publicEmailConfig() {
  const config = store.data.emailConfig || {};
  return {
    host: config.host || "",
    port: Number(config.port || 465),
    secure: config.secure !== false,
    username: config.username || "",
    fromAddress: config.fromAddress || "",
    fromName: config.fromName || "Automatic Assistant",
    enabled: config.enabled === true,
    hasPassword: Boolean(config.password),
    maskedPassword: config.password ? `••••${config.password.slice(-4)}` : ""
  };
}

function smtpConfig() {
  const config = store.data.emailConfig || {};
  if (!config.enabled) throw new Error("管理员尚未启用邮件发送");
  if (!config.host || !config.port || !config.username || !config.password || !validEmail(config.fromAddress)) {
    throw new Error("SMTP 配置不完整，请联系管理员");
  }
  return config;
}

function transporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: Boolean(config.secure),
    auth: { user: config.username, pass: config.password },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  });
}

export async function testEmailConnection(recipient = "") {
  const config = smtpConfig();
  const mailer = transporter(config);
  const startedAt = Date.now();
  await mailer.verify();
  if (recipient) {
    if (!validEmail(recipient)) throw new Error("测试收件邮箱格式不正确");
    await mailer.sendMail({
      from: { name: config.fromName || "Automatic Assistant", address: config.fromAddress },
      to: recipient,
      subject: "Automatic Assistant 邮件连接测试",
      text: "这是一封 SMTP 配置测试邮件。收到此邮件说明报告投递功能已经可以正常工作。"
    });
  }
  return { ok: true, latencyMs: Date.now() - startedAt, sent: Boolean(recipient) };
}

export async function sendReportEmail(report, recipient) {
  if (!validEmail(recipient)) throw new Error("请先配置有效的报告接收邮箱");
  const config = smtpConfig();
  const attachment = await createReportDocx(report);
  const safeTitle = report.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "行业报告";
  const result = await transporter(config).sendMail({
    from: { name: config.fromName || "Automatic Assistant", address: config.fromAddress },
    to: recipient,
    subject: `【Automatic Assistant】${report.title}`,
    text: [
      `您好，最新行业情报报告“${report.title}”已经生成。`,
      "",
      report.summary,
      "",
      `报告时间：${new Date(report.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      `资料范围：${report.period}`,
      "",
      "完整报告请查看本邮件附带的 Word 文件。"
    ].join("\n"),
    attachments: [{
      filename: `${safeTitle}.docx`,
      content: attachment,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }]
  });
  return { messageId: result.messageId, accepted: result.accepted || [] };
}

