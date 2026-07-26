function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function timezoneOffset(date, timezone) {
  const p = localParts(date, timezone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - date.getTime();
}

function zonedDate(year, month, day, hour, minute, timezone) {
  const rough = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return new Date(rough.getTime() - timezoneOffset(rough, timezone));
}

export function nextRun(schedule, from = new Date()) {
  const timezone = schedule.timezone || "Asia/Shanghai";
  const [hour, minute] = (schedule.time || "09:00").split(":").map(Number);
  const p = localParts(from, timezone);
  let cursor = zonedDate(+p.year, +p.month, +p.day, hour, minute, timezone);
  if (schedule.mode === "weekly") {
    const allowed = schedule.weekdays?.length ? schedule.weekdays : [1];
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" });
    for (let i = 0; i < 8; i += 1) {
      const candidate = new Date(cursor.getTime() + i * 86400000);
      const weekday = weekdayMap[weekdayFormatter.format(candidate)];
      if (allowed.includes(weekday) && candidate > from) return candidate.toISOString();
    }
  }
  const days = Math.max(1, Number(schedule.interval || 1));
  while (cursor <= from) cursor = new Date(cursor.getTime() + days * 86400000);
  return cursor.toISOString();
}
