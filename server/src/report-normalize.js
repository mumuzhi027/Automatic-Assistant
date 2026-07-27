function stripListMarker(value) {
  return String(value || "").replace(/^\s*(?:[-*•·]|\d+[.)、])\s*/, "").trim();
}

export function normalizeTextList(value, fallback = []) {
  if (value === undefined || value === null) return normalizeTextList(fallback, []);
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === "string" || typeof item === "number" ? stripListMarker(item) : "")
      .filter(Boolean);
  }
  if (typeof value !== "string" && typeof value !== "number") return normalizeTextList(fallback, []);

  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return normalizeTextList(parsed);
    } catch {
      // Continue with plain-text normalization.
    }
  }

  const lines = text.split(/\r?\n/).map(stripListMarker).filter(Boolean);
  return lines.length > 1 ? lines : [stripListMarker(text)];
}

function normalizeUpdates(value, fallback = []) {
  const candidate = value === undefined || value === null ? fallback : value;
  const updates = Array.isArray(candidate) ? candidate : candidate && typeof candidate === "object" ? [candidate] : [];
  return updates
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      title: String(item.title || "未命名动态"),
      summary: String(item.summary || ""),
      importance: item.importance ?? "medium",
      source: String(item.source || "未标注")
    }));
}

export function normalizeReportSections(sections, fallback = {}) {
  const value = sections && typeof sections === "object" && !Array.isArray(sections) ? sections : {};
  return {
    updates: normalizeUpdates(value.updates, fallback.updates),
    trends: normalizeTextList(value.trends, fallback.trends),
    opportunities: normalizeTextList(value.opportunities, fallback.opportunities),
    risks: normalizeTextList(value.risks, fallback.risks),
    actions: normalizeTextList(value.actions, fallback.actions)
  };
}
