import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchQueries, buildSiteSearchQuery } from "../src/source-query.js";

test("builds several focused searches instead of one oversized query", () => {
  const queries = buildSearchQueries({
    name: "电子信息工程前沿技术动态",
    industry: "电子信息、嵌入式系统、智能硬件",
    keywords: ["微控制器", "单片机", "传感器", "通信技术", "信号处理", "电源设计", "边缘 AI", "智能控制"]
  });

  assert.deepEqual(queries.slice(0, 5), [
    "电子信息工程前沿技术动态",
    "微控制器 单片机",
    "传感器 通信技术",
    "信号处理 电源设计",
    "边缘 AI 智能控制"
  ]);
  assert.ok(queries.length >= 5);
});

test("builds a bilingual query for English-language vendor websites", () => {
  const query = buildSiteSearchQuery({
    industry: "电子信息、嵌入式系统、智能硬件",
    keywords: ["微控制器", "单片机", "传感器"]
  });

  assert.match(query, /嵌入式系统/);
  assert.match(query, /微控制器/);
  assert.match(query, /embedded/);
  assert.match(query, /microcontroller/);
});
