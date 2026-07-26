<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api, setSession } from "../api";

const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
async function login() {
  error.value = ""; loading.value = true;
  try {
    const data = await api("/auth/login", { method: "POST", body: { username: username.value, password: password.value } });
    setSession(data); router.replace("/");
  } catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}
const isDev = import.meta.env.DEV;
function fill(type) {
  username.value = type === "admin" ? "admin" : "member";
  password.value = type === "admin" ? "admin123" : "member123";
}
</script>

<template>
  <div class="login-page">
    <section class="login-story">
      <div class="login-brand"><div class="brand-mark light">A</div><b>Automatic Assistant</b></div>
      <div class="story-copy">
        <h1>少一点信息噪声，<br />多一点清晰判断。</h1>
        <p>按照你的关注方向持续整理行业动态，把值得看的内容、来源和下一步建议放在一起。</p>
        <div class="story-points"><span>按时整理</span><span>保留来源</span><span>逐渐懂你</span></div>
      </div>
      <small>仅供受邀核心成员使用</small>
    </section>
    <section class="login-panel">
      <form @submit.prevent="login">
        <h2>登录工作空间</h2>
        <p>没有开放注册，请使用管理员分配的账号。</p>
        <label>账号<input v-model="username" autocomplete="username" placeholder="输入账号" /></label>
        <label>密码<input v-model="password" type="password" autocomplete="current-password" placeholder="输入密码" /></label>
        <div v-if="error" class="form-error">{{ error }}</div>
        <button class="btn primary wide" :disabled="loading">{{ loading ? "正在登录…" : "进入工作空间 →" }}</button>
        <div v-if="isDev" class="demo-links">本地演示：<button type="button" @click="fill('member')">成员账号</button><button type="button" @click="fill('admin')">管理员账号</button></div>
      </form>
    </section>
  </div>
</template>
