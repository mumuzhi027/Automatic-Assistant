<script setup>
import { onMounted, reactive, ref } from "vue";
import { api } from "../api";
import { notify } from "../main";
import { CheckCircle2, FlaskConical, Save, Trash2 } from "@lucide/vue";

const form = reactive({ provider: "DeepSeek", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com", apiKey: "", enabled: true, temperature: .3, hasApiKey: false });
const loaded = ref(false);
const mask = ref("");
const testing = ref(false);
const testResult = ref(null);
onMounted(async () => {
  const data = await api("/admin/model");
  Object.assign(form, data, { apiKey: "" });
  mask.value = data.maskedKey;
  loaded.value = true;
});
async function save() {
  try {
    const data = await api("/admin/model", { method: "PUT", body: form });
    form.apiKey = "";
    form.hasApiKey = data.hasApiKey;
    notify("模型配置已保存");
  } catch (error) { notify(error.message, "error"); }
}
async function test() {
  testing.value = true; testResult.value = null;
  try {
    testResult.value = await api("/admin/model/test", { method: "POST" });
    notify(`连接成功，耗时 ${testResult.value.latencyMs} ms`);
  } catch (error) { notify(error.message, "error"); }
  finally { testing.value = false; }
}
async function clearKey() {
  if (!confirm("确定清除当前 API Key？清除后将切换到演示模式。")) return;
  await api("/admin/model", { method: "PUT", body: { clearApiKey: true } });
  form.hasApiKey = false; mask.value = ""; testResult.value = null; notify("API Key 已清除");
}
</script>

<template>
  <div class="page narrow" v-if="loaded">
    <header class="page-head"><div><h1>模型设置</h1><p>所有成员任务统一使用这里启用的模型。</p></div></header>
    <form class="card profile-form" @submit.prevent="save">
      <div class="model-state"><div><span class="pulse"></span><b>{{form.enabled?"模型服务已启用":"模型服务已停用"}}</b><small>{{form.hasApiKey?"已配置 API Key":"未配置 Key，将使用演示报告模式"}}</small></div><label class="switch"><input v-model="form.enabled" type="checkbox" /><span></span></label></div>
      <div class="form-grid"><label>供应商<input v-model="form.provider" /></label><label>模型标识<input v-model="form.model" /></label></div>
      <label>接口地址<input v-model="form.baseUrl" type="url" /></label>
      <label>API Key <small>{{mask?`当前：${mask}`:"尚未配置"}}</small><input v-model="form.apiKey" type="password" placeholder="留空则保留现有 Key" /></label>
      <label>生成温度：{{form.temperature}}<input v-model.number="form.temperature" type="range" min="0" max="1" step="0.1" /></label>
      <div v-if="testResult" class="test-result"><CheckCircle2 :size="18"/><div><b>模型连接正常</b><small>{{testResult.model}} · {{testResult.latencyMs}} ms · 返回“{{testResult.response.trim()}}”</small></div></div>
      <div class="notice">API Key 仅由服务端使用，前端不会读取完整内容。正式长期使用时建议接入服务端密钥管理。</div>
      <div class="model-actions"><button type="button" class="btn ghost" :disabled="testing||!form.hasApiKey" @click="test"><FlaskConical :size="16"/>{{testing?"测试中…":"测试连接"}}</button><button v-if="form.hasApiKey" type="button" class="btn ghost danger-text" @click="clearKey"><Trash2 :size="15"/>清除 Key</button><button class="btn primary"><Save :size="16"/>保存配置</button></div>
    </form>
  </div>
</template>
