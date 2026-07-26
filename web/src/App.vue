<script setup>
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { authState, setSession } from "./api";
import { ui } from "./main";
import {
  LayoutDashboard, ListChecks, FileText, Brain, Settings, Users,
  SlidersHorizontal, Activity, LogOut, ChevronRight, Sparkles, Mail
} from "@lucide/vue";

const route = useRoute();
const router = useRouter();
const current = computed(() => authState.session);
const isLogin = computed(() => route.path === "/login");
const isAdmin = computed(() => current.value?.user?.role === "ADMIN");
const userMenu = [
  { to: "/", icon: LayoutDashboard, label: "工作台" },
  { to: "/tasks", icon: ListChecks, label: "我的任务" },
  { to: "/reports", icon: FileText, label: "行业报告" },
  { to: "/memories", icon: Brain, label: "长期记忆" },
  { to: "/profile", icon: Settings, label: "个人设置" }
];
const adminMenu = [
  { to: "/", icon: LayoutDashboard, label: "系统概览" },
  { to: "/admin/users", icon: Users, label: "成员管理" },
  { to: "/admin/model", icon: SlidersHorizontal, label: "模型设置" },
  { to: "/admin/email", icon: Mail, label: "邮件投递" },
  { to: "/admin/runs", icon: Activity, label: "运行记录" },
  { to: "/profile", icon: Settings, label: "账号设置" }
];
function logout() { setSession(null); router.replace("/login"); }
</script>

<template>
  <RouterView v-if="isLogin" />
  <div v-else class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><Sparkles :size="18" /></div>
        <div><strong>Automatic</strong><span>行业情报助手</span></div>
      </div>
      <div class="workspace">
        <small>{{ isAdmin ? "管理空间" : "我的工作空间" }}</small>
        <b>{{ isAdmin ? "Automatic 后台" : "前沿情报研究组" }}</b>
      </div>
      <nav>
        <RouterLink v-for="item in (isAdmin ? adminMenu : userMenu)" :key="item.to" :to="item.to">
          <component :is="item.icon" :size="18" /><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-foot">
        <div class="user-card">
          <div class="avatar">{{ current?.user?.name?.slice(0, 1) }}</div>
          <div><b>{{ current?.user?.name }}</b><small>{{ isAdmin ? "管理员" : "核心成员" }}</small></div>
          <button title="退出登录" @click="logout"><LogOut :size="17" /></button>
        </div>
      </div>
    </aside>
    <main class="main">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="viewRoute.path" />
        </Transition>
      </RouterView>
    </main>
    <transition name="toast"><div v-if="ui.toast" class="toast" :class="ui.tone">{{ ui.toast }}</div></transition>
  </div>
</template>
