import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import { normalizeReportSections } from "./report-normalize.js";

const font = "Microsoft YaHei";
const line = { color: "D9E1DC", space: 1, style: BorderStyle.SINGLE, size: 4 };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 280, after: 140 }
  });
}

function body(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text: String(text || ""), font, size: 22 })],
    spacing: { after: 130, line: 360 },
    ...options
  });
}

function list(items = []) {
  return items.flatMap((item) => [
    new Paragraph({
      text: String(item),
      bullet: { level: 0 },
      spacing: { after: 90, line: 320 }
    })
  ]);
}

export async function createReportDocx(report) {
  const sections = normalizeReportSections(report.sections);
  const children = [
    new Paragraph({
      children: [new TextRun({ text: report.title, bold: true, font, size: 38, color: "214E3F" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 }
    }),
    new Paragraph({
      children: [new TextRun({
        text: `${new Date(report.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · ${report.period} · ${(report.sources || []).length} 条来源`,
        font, size: 18, color: "6F7B75"
      })],
      alignment: AlignmentType.CENTER,
      border: { bottom: line },
      spacing: { after: 320 }
    }),
    heading("本期摘要"),
    body(report.summary),
    heading("重要动态")
  ];

  for (const update of sections.updates || []) {
    children.push(
      heading(`${update.title}（重要度 ${update.importance ?? "—"}）`, HeadingLevel.HEADING_2),
      body(update.summary),
      body(`来源：${update.source || "未标注"}`, { style: "IntenseQuote" })
    );
  }

  children.push(
    heading("趋势判断"), ...list(sections.trends),
    heading("潜在机会"), ...list(sections.opportunities),
    heading("风险与不确定性"), ...list(sections.risks),
    heading("建议下一步"), ...list(sections.actions),
    heading("信息来源")
  );

  for (const [index, source] of (report.sources || []).entries()) {
    children.push(
      heading(`${index + 1}. ${source.title}`, HeadingLevel.HEADING_3),
      body(source.url),
      body(`发布时间：${new Date(source.publishedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`)
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "由 Automatic Assistant 生成", font, size: 17, color: "8A938E" })],
      alignment: AlignmentType.CENTER,
      border: { top: line },
      spacing: { before: 420 }
    })
  );

  const document = new Document({
    styles: {
      default: {
        document: { run: { font, size: 22 }, paragraph: { spacing: { line: 320 } } },
        heading1: { run: { font, bold: true, color: "214E3F", size: 30 } },
        heading2: { run: { font, bold: true, color: "29332F", size: 25 } },
        heading3: { run: { font, bold: true, color: "44514B", size: 22 } }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 }
        }
      },
      children
    }]
  });
  return Packer.toBuffer(document);
}
