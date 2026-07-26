<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "../api";
import { notify } from "../main";
import { UserPlus, KeyRound, PauseCircle, PlayCircle, X, UsersRound, Pencil, Trash2, RotateCcw, Search } from "@lucide/vue";

const users = ref([]);
const modal = ref("");
const target = ref(null);
const showArchived = ref(false);
const search = ref("");
const form = reactive({ username: "", name: "", email: "", password: "", allowManualRun: true, dailyManualRunLimit: 5, manualRunCooldownMinutes: 10 });
const load = async () => { users.value = await api("/admin/users"); };
const visibleUsers = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return users.value.filter((user) => (showArchived.value ? user.deletedAt : !user.deletedAt)
    && (!keyword || [user.name, user.username].some(value => String(value || "").toLowerCase().includes(keyword))));
});
onMounted(load);
function openCreate() { Object.assign(form, { username: "", name: "", email: "", password: "", allowManualRun: true, dailyManualRunLimit: 5, manualRunCooldownMinutes: 10 }); modal.value = "create"; }
function openReset(user) { target.value = user; form.password = ""; modal.value = "reset"; }
function openEdit(user) { target.value = user; Object.assign(form, { name: user.name, email: user.email || "", allowManualRun: user.allowManualRun, dailyManualRunLimit: user.dailyManualRunLimit, manualRunCooldownMinutes: user.manualRunCooldownMinutes }); modal.value = "edit"; }
async function create() {
  try {
    await api("/admin/users", { method: "POST", body: form });
    modal.value = ""; await load(); notify("成员账号已创建，可以立即登录");
  } catch (error) { notify(error.message, "error"); }
}
async function toggle(user) {
  await api(`/admin/users/${user.id}`, { method: "PUT", body: { active: !user.active } });
  await load(); notify(user.active ? "账号已停用" : "账号已恢复");
}
async function reset() {
  try {
    await api(`/admin/users/${target.value.id}`, { method: "PUT", body: { password: form.password } });
    modal.value = ""; notify("新密码已设置");
  } catch (error) { notify(error.message, "error"); }
}
async function edit() {
  try {
    await api(`/admin/users/${target.value.id}`, { method: "PUT", body: { name: form.name, email: form.email, allowManualRun: form.allowManualRun, dailyManualRunLimit: form.dailyManualRunLimit, manualRunCooldownMinutes: form.manualRunCooldownMinutes } });
    modal.value = ""; await load(); notify("成员资料已更新");
  } catch (error) { notify(error.message, "error"); }
}
async function remove() {
  await api(`/admin/users/${target.value.id}`, { method: "DELETE" });
  modal.value = ""; await load(); notify("成员已移出系统，历史数据仍被保留");
}
async function restore(user) {
  await api(`/admin/users/${user.id}`, { method: "PUT", body: { restore: true } });
  await load(); notify("成员账号已恢复");
}
</script>
<template>
  <div class="page">
    <header class="page-head"><div><h1>成员管理</h1><p>创建核心成员账号，并查看每位成员的使用状态。</p></div><button class="btn primary" @click="openCreate"><UserPlus :size="17"/>新增成员</button></header>
    <section class="member-summary">
      <div><UsersRound :size="20"/><span><b>{{ users.filter(x=>x.role==='USER'&&!x.deletedAt).length }}</b>位成员</span></div>
      <div class="summary-actions"><label class="search-box compact"><Search :size="16"/><input v-model="search" placeholder="搜索姓名或账号" aria-label="搜索成员"/></label><button @click="showArchived=!showArchived">{{showArchived?"返回成员列表":"查看已移除成员"}}</button></div>
    </section>
    <section class="card member-card">
      <div class="table users"><div class="tr th"><span>成员</span><span>登录账号</span><span>使用情况</span><span>状态</span><span>加入时间</span><span>操作</span></div>
        <div class="tr" v-for="u in visibleUsers" :key="u.id">
          <span class="person"><i>{{u.name.slice(0,1)}}</i><span><b>{{u.name}}</b><small>{{u.role==="ADMIN"?"系统管理员":"核心成员"}}</small></span></span>
          <span class="mono">@{{u.username}}</span>
          <span>{{u.taskCount}} 个任务 · {{u.reportCount}} 份报告</span>
          <span><em class="status" :class="u.active&&!u.deletedAt?'success':'paused'"><i></i>{{u.deletedAt?"已移除":u.active?"正常":"已停用"}}</em></span>
          <span>{{new Date(u.createdAt).toLocaleDateString("zh-CN")}}</span>
          <span v-if="u.role!=='ADMIN'&&!u.deletedAt" class="row-actions"><button @click="openEdit(u)"><Pencil :size="14"/>编辑</button><button @click="openReset(u)"><KeyRound :size="14"/>密码</button><button @click="toggle(u)"><component :is="u.active?PauseCircle:PlayCircle" :size="14"/>{{u.active?"停用":"恢复"}}</button><button class="danger-action" @click="target=u;modal='remove'"><Trash2 :size="14"/></button></span>
          <span v-else-if="u.deletedAt" class="row-actions"><button @click="restore(u)"><RotateCcw :size="14"/>恢复账号</button></span>
        </div>
        <div v-if="!visibleUsers.length" class="empty">没有匹配的成员</div>
      </div>
    </section>
    <div class="modal-wrap" v-if="modal" @mousedown.self="modal=''">
      <form v-if="modal==='create'" class="modal small" @submit.prevent="create">
        <button type="button" class="close" @click="modal=''"><X :size="20"/></button><h2>新增核心成员</h2><p class="modal-intro">创建后将账号和初始密码单独发送给成员。</p>
        <label>成员姓名<input v-model="form.name" required placeholder="例如：陈晓雨" /></label>
        <label>登录账号<input v-model="form.username" required minlength="3" placeholder="字母、数字或 . _ -" /></label>
        <label>报告接收邮箱（选填）<input v-model="form.email" type="email" placeholder="用于接收 Word 报告"/></label>
        <label>初始密码<input v-model="form.password" required minlength="8" type="password" placeholder="至少 8 位" /></label>
        <div class="quota-fields"><label>每日手动上限<input v-model.number="form.dailyManualRunLimit" type="number" min="1" max="50"/></label><label>冷却时间（分钟）<input v-model.number="form.manualRunCooldownMinutes" type="number" min="0" max="1440"/></label></div>
        <label class="check-row"><input v-model="form.allowManualRun" type="checkbox"/><span>允许该成员手动立即生成报告</span></label>
        <div class="modal-actions"><button type="button" class="btn ghost" @click="modal=''">取消</button><button class="btn primary"><UserPlus :size="16"/>创建账号</button></div>
      </form>
      <form v-else class="modal small" @submit.prevent="reset">
        <template v-if="modal==='reset'">
        <button type="button" class="close" @click="modal=''"><X :size="20"/></button><h2>重置成员密码</h2><p class="modal-intro">正在为 {{target?.name}} 设置新的登录密码。</p>
        <label>新密码<input v-model="form.password" required minlength="8" type="password" autofocus placeholder="至少 8 位" /></label>
        <div class="modal-actions"><button type="button" class="btn ghost" @click="modal=''">取消</button><button class="btn primary"><KeyRound :size="16"/>确认重置</button></div>
        </template>
        <template v-else-if="modal==='edit'">
          <button type="button" class="close" @click="modal=''"><X :size="20"/></button><h2>编辑成员资料</h2><p class="modal-intro">登录账号 @{{target?.username}} 不会改变。</p>
          <label>成员姓名<input v-model="form.name" required /></label>
          <label>报告接收邮箱<input v-model="form.email" type="email" placeholder="留空则不发送邮件"/></label>
          <div class="quota-fields"><label>每日手动上限<input v-model.number="form.dailyManualRunLimit" type="number" min="1" max="50"/></label><label>冷却时间（分钟）<input v-model.number="form.manualRunCooldownMinutes" type="number" min="0" max="1440"/></label></div>
          <label class="check-row"><input v-model="form.allowManualRun" type="checkbox"/><span>允许该成员手动立即生成报告</span></label>
          <div class="modal-actions"><button type="button" class="btn ghost" @click="modal=''">取消</button><button type="button" class="btn primary" @click="edit"><Pencil :size="16"/>保存更改</button></div>
        </template>
        <template v-else>
          <button type="button" class="close" @click="modal=''"><X :size="20"/></button><h2>移出成员？</h2><p class="modal-intro">“{{target?.name}}”将无法登录，任务也不会继续执行；历史报告和使用记录会保留，可随时恢复。</p>
          <div class="modal-actions"><button type="button" class="btn ghost" @click="modal=''">取消</button><button type="button" class="btn danger" @click="remove"><Trash2 :size="16"/>确认移出</button></div>
        </template>
      </form>
    </div>
  </div>
</template>
