<script setup>
import { onMounted, reactive, ref } from "vue";
import { api, session } from "../api";
import { notify } from "../main";
import { UserRound, LockKeyhole, Save } from "@lucide/vue";

const tab = ref("profile");
const form = reactive({ role: "", organization: "", bio: "", reportStyle: "", focus: "" });
const password = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
onMounted(async () => { const data = await api("/me"); Object.assign(form, data.profile || {}); });
async function save() {
  await api("/me/profile", { method: "PUT", body: form });
  notify("个人画像已保存");
}
async function changePassword() {
  if (password.newPassword !== password.confirmPassword) return notify("两次输入的新密码不一致", "error");
  try {
    await api("/me/password", { method: "PUT", body: password });
    Object.assign(password, { currentPassword: "", newPassword: "", confirmPassword: "" });
    notify("密码已更新，下次登录请使用新密码");
  } catch (error) { notify(error.message, "error"); }
}
</script>
<template>
  <div class="page settings-page">
    <header class="page-head"><div><h1>个人设置</h1><p>维护你的工作画像和账号安全。</p></div></header>
    <div class="settings-layout">
      <aside class="settings-nav card">
        <div class="settings-person"><div class="avatar large">{{ session()?.user?.name?.slice(0,1) }}</div><div><b>{{ session()?.user?.name }}</b><small>@{{ session()?.user?.username }}</small></div></div>
        <button :class="{active:tab==='profile'}" @click="tab='profile'"><UserRound :size="18"/>个人画像</button>
        <button :class="{active:tab==='security'}" @click="tab='security'"><LockKeyhole :size="18"/>账号安全</button>
      </aside>
      <Transition name="panel-slide" mode="out-in">
        <form v-if="tab==='profile'" key="profile" class="card profile-form" @submit.prevent="save">
          <div class="form-title"><div><h2>工作画像</h2><p>这些信息会作为报告生成时的个人背景。</p></div></div>
          <div class="form-grid"><label>我的角色<input v-model="form.role" placeholder="例如：产品研究、技术开发" /></label><label>所在部门<input v-model="form.organization" placeholder="例如：技术部" /></label></div>
          <label>关于我<textarea v-model="form.bio" rows="4" placeholder="简单介绍你的职责、经验和当前项目"></textarea></label>
          <label>长期关注方向<textarea v-model="form.focus" rows="3" placeholder="例如：AI 视频、数字人、内容自动化"></textarea></label>
          <label>喜欢的报告风格<textarea v-model="form.reportStyle" rows="3" placeholder="例如：结论先行、减少套话、给出可执行建议"></textarea></label>
          <div class="form-footer"><button class="btn primary"><Save :size="16"/>保存更改</button></div>
        </form>
        <form v-else key="security" class="card profile-form security-form" @submit.prevent="changePassword">
          <div class="form-title"><div><h2>修改登录密码</h2><p>建议使用不少于 12 位且不与其他网站重复的密码。</p></div></div>
          <label>当前密码<input v-model="password.currentPassword" type="password" autocomplete="current-password" required /></label>
          <label>新密码<input v-model="password.newPassword" type="password" minlength="8" autocomplete="new-password" required /></label>
          <label>再次输入新密码<input v-model="password.confirmPassword" type="password" minlength="8" autocomplete="new-password" required /></label>
          <div class="form-footer"><button class="btn primary"><LockKeyhole :size="16"/>更新密码</button></div>
        </form>
      </Transition>
    </div>
  </div>
</template>
