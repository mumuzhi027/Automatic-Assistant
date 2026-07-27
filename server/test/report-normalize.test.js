import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReportSections, normalizeTextList } from "../src/report-normalize.js";

test("keeps a plain paragraph as one list item instead of splitting characters", () => {
  assert.deepEqual(
    normalizeTextList("基于此资料，嵌入式开发者可持续关注相关技术动态。"),
    ["基于此资料，嵌入式开发者可持续关注相关技术动态。"]
  );
});

test("normalizes line-delimited and JSON-encoded list values", () => {
  assert.deepEqual(normalizeTextList("• 第一项\n• 第二项"), ["第一项", "第二项"]);
  assert.deepEqual(normalizeTextList('["第一项","第二项"]'), ["第一项", "第二项"]);
});

test("normalizes malformed report section strings into arrays", () => {
  const sections = normalizeReportSections({
    updates: { title: "动态", summary: "摘要", importance: "high", source: "来源" },
    trends: "趋势判断",
    opportunities: "潜在机会",
    risks: "风险说明",
    actions: "下一步行动"
  });

  assert.equal(sections.updates.length, 1);
  assert.deepEqual(sections.opportunities, ["潜在机会"]);
  assert.deepEqual(sections.risks, ["风险说明"]);
  assert.deepEqual(sections.actions, ["下一步行动"]);
});
