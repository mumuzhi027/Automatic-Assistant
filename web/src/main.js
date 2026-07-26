import { createApp, reactive } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import Login from "./pages/Login.vue";
import Dashboard from "./pages/Dashboard.vue";
import Tasks from "./pages/Tasks.vue";
import Reports from "./pages/Reports.vue";
import ReportDetail from "./pages/ReportDetail.vue";
import Memories from "./pages/Memories.vue";
import Profile from "./pages/Profile.vue";
import AdminUsers from "./pages/AdminUsers.vue";
import AdminModel from "./pages/AdminModel.vue";
import AdminEmail from "./pages/AdminEmail.vue";
import AdminRuns from "./pages/AdminRuns.vue";
import { session } from "./api";
import "./styles.css";

export const ui = reactive({ toast: "", tone: "success" });
export function notify(message, tone = "success") {
  ui.toast = message; ui.tone = tone;
  setTimeout(() => { if (ui.toast === message) ui.toast = ""; }, 3200);
}

const routes = [
  { path: "/login", component: Login, meta: { public: true } },
  { path: "/", component: Dashboard },
  { path: "/tasks", component: Tasks },
  { path: "/reports", component: Reports },
  { path: "/reports/:id", component: ReportDetail },
  { path: "/memories", component: Memories },
  { path: "/profile", component: Profile },
  { path: "/admin/users", component: AdminUsers, meta: { admin: true } },
  { path: "/admin/model", component: AdminModel, meta: { admin: true } },
  { path: "/admin/email", component: AdminEmail, meta: { admin: true } },
  { path: "/admin/runs", component: AdminRuns, meta: { admin: true } }
];
const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  const current = session();
  if (!to.meta.public && !current) return "/login";
  if (to.path === "/login" && current) return "/";
  if (to.meta.admin && current?.user?.role !== "ADMIN") return "/";
});

createApp(App).use(router).mount("#app");
