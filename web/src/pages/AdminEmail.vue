<script setup>
import { onMounted, reactive, ref } from "vue";
import { api } from "../api";
import { notify } from "../main";
import { CheckCircle2, FlaskConical, Mail, Save, Trash2 } from "@lucide/vue";

const form = reactive({
  host: "", port: 465, secure: true, username: "", password: "",
  fromAddress: "", fromName: "Automatic Assistant", enabled: false, hasPassword: false
});
const loaded = ref(false), loading = ref(false), loadError = ref(""), testing = ref(false), testRecipient = ref(""), testResult = ref(null), mask = ref("");
async function load() {
  loading.value = true; loadError.value = "";
  try {
    const data = await api("/admin/email");
    Object.assign(form, data, { password: "" });
    mask.value = data.maskedPassword;
  } catch (error) {
    loadError.value = error.message;
  } finally {
    loaded.value = true;
    loading.value = false;
  }
}
onMounted(load);
async function save(silent = false) {
  const data = await api("/admin/email", { method: "PUT", body: form });
  Object.assign(form, data, { password: "" });
  mask.value = data.maskedPassword;
  if (!silent) notify("邮件配置已保存");
}
async function test() {
  testing.value = true; testResult.value = null;
  try {
    await save(true);
    testResult.value = await api("/admin/email/test", { method: "POST", body: { recipient: testRecipient.value } });
    notify(testResult.value.sent ? "测试邮件已发送" : "SMTP 连接正常");
  } catch (error) { notify(error.message, "error"); }
  finally { testing.value = false; }
}
async function clearPassword() {
  if (!confirm("确定清除 SMTP 授权码？清除后无法发送报告邮件。")) return;
  const data = await api("/admin/email", { method: "PUT", body: { clearPassword: true, enabled: false } });
  form.enabled = false; form.hasPassword = data.hasPassword; mask.value = ""; testResult.value = null;
  notify("SMTP 授权码已清除");
}
</script>

<template>
  <div class="page narrow" v-if="loaded">
    <header class="page-head"><div><h1>邮件投递</h1><p>生成报告后，把同一份 Word 文件安全发送到成员邮箱。</p></div></header>
    <section v-if="loadError" class="card integration-error">
      <Mail :size="25"/>
      <div><h2>邮件服务接口尚未就绪</h2><p>{{loadError}}</p><small>请确认服务器已更新 server/src、安装后端依赖并重启 Node 项目。</small></div>
      <button class="btn primary" :disabled="loading" @click="load">{{loading?"检查中…":"重新检查"}}</button>
    </section>
    <form v-else class="card profile-form" @submit.prevent="save()">
      <div class="model-state"><div><span class="pulse"></span><b>{{form.enabled?"邮件投递已启用":"邮件投递未启用"}}</b><small>{{form.hasPassword?"已保存 SMTP 授权码":"尚未配置 SMTP 授权码"}}</small></div><label class="switch"><input v-model="form.enabled" type="checkbox"/><span></span></label></div>
      <div class="form-grid"><label>SMTP 服务器<input v-model="form.host" placeholder="例如：smtp.qq.com"/></label><label>端口<input v-model.number="form.port" type="number" min="1" max="65535"/></label></div>
      <label class="check-row email-secure"><input v-model="form.secure" type="checkbox"/><span>使用 SSL/TLS 直连（通常端口 465 开启，587 关闭）</span></label>
      <div class="form-grid"><label>SMTP 登录账号<input v-model="form.username" autocomplete="off"/></label><label>SMTP 授权码 <small>{{mask?`当前：${mask}`:"尚未配置"}}</small><input v-model="form.password" type="password" autocomplete="new-password" placeholder="留空则保留现有授权码"/></label></div>
      <div class="form-grid"><label>发件邮箱<input v-model="form.fromAddress" type="email" placeholder="assistant@example.com"/></label><label>发件人名称<input v-model="form.fromName" placeholder="Automatic Assistant"/></label></div>
      <div class="notice">请使用邮箱服务商提供的 SMTP 授权码，不要填写邮箱登录密码。授权码只由服务端使用，不会返回给前端。</div>
      <div class="email-test-row"><label>测试收件邮箱（选填）<input v-model="testRecipient" type="email" placeholder="填写后会实际发送一封测试邮件"/></label></div>
      <div v-if="testResult" class="test-result"><CheckCircle2 :size="18"/><div><b>{{testResult.sent?"测试邮件已发出":"SMTP 连接正常"}}</b><small>连接与验证耗时 {{testResult.latencyMs}} ms</small></div></div>
      <div class="model-actions"><button type="button" class="btn ghost" :disabled="testing" @click="test"><FlaskConical :size="16"/>{{testing?"测试中…":"保存并测试"}}</button><button v-if="form.hasPassword" type="button" class="btn ghost danger-text" @click="clearPassword"><Trash2 :size="15"/>清除授权码</button><button class="btn primary"><Save :size="16"/>保存配置</button></div>
    </form>
  </div>
</template>
