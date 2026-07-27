import { reactive } from "vue";

const base = import.meta.env.VITE_API_URL || "";

function readStoredSession() {
  try { return JSON.parse(localStorage.getItem("aa_session") || "null"); }
  catch { return null; }
}

export const authState = reactive({
  session: readStoredSession()
});

export function session() {
  return authState.session;
}

export function setSession(value) {
  authState.session = value;
  if (value) localStorage.setItem("aa_session", JSON.stringify(value));
  else localStorage.removeItem("aa_session");
}

window.addEventListener("storage", (event) => {
  if (event.key === "aa_session") authState.session = readStoredSession();
});

export async function api(path, options = {}) {
  const current = session();
  const method = String(options.method || "GET").toUpperCase();
  const response = await fetch(`${base}/api${path}`, {
    ...options,
    cache: options.cache || (method === "GET" ? "no-store" : "default"),
    headers: {
      "Content-Type": "application/json",
      ...(current?.token ? { Authorization: `Bearer ${current.token}` } : {}),
      ...options.headers
    },
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  if (response.status === 401) {
    setSession(null);
    if (location.pathname !== "/login") location.href = "/login";
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `请求失败 (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export async function apiDownload(path, filename) {
  const current = session();
  const response = await fetch(`${base}/api${path}`, {
    headers: current?.token ? { Authorization: `Bearer ${current.token}` } : {}
  });
  if (response.status === 401) {
    setSession(null);
    location.href = "/login";
    throw new Error("登录已过期");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `下载失败 (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
