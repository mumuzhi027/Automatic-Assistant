<script setup>
import { onMounted, reactive, ref } from "vue";
import { api } from "../api";
import { notify } from "../main";
import { ExternalLink, LoaderCircle, Search } from "@lucide/vue";
const tasks = ref([]), show = ref(false), editing = ref(null), running = ref(""), quota = ref(null);
const previewing = ref(false), preview = ref(null);
const form = reactive({ name:"", industry:"", description:"", keywords:"", excludedKeywords:"", sources:"", focusQuestions:"", lookbackHours:48, emailReport:false, scheduleMode:"interval_days", interval:2, weekdays:[1], time:"09:00" });
const load = async () => {
  const [taskResult, quotaResult] = await Promise.allSettled([api("/tasks"), api("/me/manual-run-quota")]);
  if (taskResult.status === "fulfilled") tasks.value = taskResult.value;
  else notify(`任务加载失败：${taskResult.reason.message}`, "error");
  quota.value = quotaResult.status === "fulfilled" ? quotaResult.value : null;
};
onMounted(load);
function open(task=null) {
  editing.value = task;
  preview.value = null;
  Object.assign(form, task ? { ...task, emailReport:Boolean(task.emailReport), keywords:task.keywords.join("，"), excludedKeywords:task.excludedKeywords.join("，"), sources:task.sources.join("\n"), scheduleMode:task.schedule.mode || "interval_days", interval:task.schedule.interval || 1, weekdays:task.schedule.weekdays || [1], time:task.schedule.time } : { name:"",industry:"",description:"",keywords:"",excludedKeywords:"",sources:"",focusQuestions:"",lookbackHours:48,emailReport:false,scheduleMode:"interval_days",interval:2,weekdays:[1],time:"09:00" });
  show.value = true;
}
const split = (v) => v.split(/[，,\n]/).map(x=>x.trim()).filter(Boolean);
const taskBody = () => {
  const schedule = form.scheduleMode === "weekly"
    ? { mode:"weekly", weekdays:form.weekdays.map(Number), time:form.time, timezone:"Asia/Shanghai" }
    : { mode:"interval_days", interval:Number(form.interval), time:form.time, timezone:"Asia/Shanghai" };
  return {...form,keywords:split(form.keywords),excludedKeywords:split(form.excludedKeywords),sources:form.sources.split("\n").map(x=>x.trim()).filter(Boolean),schedule};
};
async function previewSources() {
  if (!form.name.trim() || !form.industry.trim()) {
    notify("请先填写任务名称和行业主题", "error");
    return;
  }
  previewing.value = true;
  preview.value = null;
  try {
    preview.value = await api("/tasks/preview-sources", { method:"POST", body:taskBody() });
  } catch (error) {
    notify(error.message, "error");
  } finally {
    previewing.value = false;
  }
}
async function save() {
  const body=taskBody();
  try {
    await api(editing.value ? `/tasks/${editing.value.id}` : "/tasks",{method:editing.value?"PUT":"POST",body});
    show.value=false; await load(); notify(editing.value ? "任务已更新" : "任务已创建");
  } catch(error) { notify(error.message, "error"); }
}
async function toggle(task) { await api(`/tasks/${task.id}`,{method:"PUT",body:{status:task.status==="ACTIVE"?"PAUSED":"ACTIVE"}}); load(); }
async function run(task) { running.value=task.id; try { const r=await api(`/tasks/${task.id}/run`,{method:"POST"}); notify(`报告“${r.title}”已生成`); } catch(e){notify(e.message,"error")} finally{running.value="";await load()} }
async function remove(task) { if(confirm(`确定删除“${task.name}”？`)){await api(`/tasks/${task.id}`,{method:"DELETE"});load();notify("任务已删除")} }
const fmt=v=>v?new Date(v).toLocaleString("zh-CN",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
</script>
<template>
  <div class="page">
    <header class="page-head"><div><span class="eyebrow ink">AUTOMATED WATCHLIST</span><h1>我的情报任务</h1><p>定义关注方向和节奏，其余工作交给系统。</p></div><button class="btn primary" @click="open()">＋ 新建任务</button></header>
    <div v-if="quota" class="quota-strip" :class="{blocked:!quota.canRunNow}"><div><b>今日手动生成 {{quota.dailyUsed}} / {{quota.dailyLimit}} 次</b><span>自动定时任务不计入此限制 · 冷却 {{quota.cooldownMinutes}} 分钟</span></div><p>{{quota.canRunNow?`还可手动生成 ${quota.remaining} 次`:quota.reason}}</p></div>
    <div class="task-grid">
      <article class="task-card" v-for="task in tasks" :key="task.id">
        <div class="task-card-top"><span class="task-number">{{ String(tasks.indexOf(task)+1).padStart(2,"0") }}</span><em class="status" :class="task.status.toLowerCase()">{{ task.status==="ACTIVE"?"运行中":"已暂停" }}</em></div>
        <h2>{{ task.name }}</h2><p>{{ task.description }}</p>
        <div class="tags"><span v-for="tag in task.keywords.slice(0,4)" :key="tag">{{ tag }}</span></div>
        <div class="schedule-line"><div><small>执行节奏</small><b>{{ task.schedule.mode==="weekly" ? `每周 ${task.schedule.weekdays.length} 天` : `每 ${task.schedule.interval} 天` }} · {{ task.schedule.time }}</b></div><div><small>下次运行</small><b>{{ fmt(task.nextRunAt) }}</b></div></div>
        <div class="card-actions"><button @click="run(task)" :disabled="running===task.id||quota?.canRunNow===false" :title="quota?.canRunNow===false?quota.reason:''">{{ running===task.id?"生成中…":"立即执行" }}</button><button @click="open(task)">编辑</button><button @click="toggle(task)">{{ task.status==="ACTIVE"?"暂停":"恢复" }}</button><button class="danger-link" @click="remove(task)">删除</button></div>
      </article>
      <button v-if="!tasks.length" class="empty-add" @click="open()">＋<b>创建第一项情报任务</b><span>从一个你真正关心的行业问题开始</span></button>
    </div>
    <div v-if="show" class="modal-wrap" @mousedown.self="show=false">
      <form class="modal" @submit.prevent="save"><button class="close" type="button" @click="show=false">×</button><span class="eyebrow ink">{{ editing?"EDIT WATCH":"NEW WATCH" }}</span><h2>{{ editing?"编辑任务":"新建情报任务" }}</h2>
        <div class="form-grid"><label>任务名称<input v-model="form.name" required placeholder="例如：AI 音视频行业前沿" /></label><label>行业主题<input v-model="form.industry" required placeholder="例如：AI 音视频" /></label></div>
        <label>任务说明<textarea v-model="form.description" rows="2" placeholder="你希望系统持续观察什么？"></textarea></label>
        <div class="form-grid"><label>关注关键词<input v-model="form.keywords" placeholder="用逗号分隔" /></label><label>排除关键词<input v-model="form.excludedKeywords" placeholder="广告，课程推广" /></label></div>
        <label>重点问题<textarea v-model="form.focusQuestions" rows="2" placeholder="你希望报告重点回答什么？"></textarea></label>
        <label>补充信息源（选填，每行一个）<textarea v-model="form.sources" rows="3" placeholder="支持 RSS、新闻栏目或具体网页地址"></textarea><small class="field-help">系统会先根据行业主题和关键词自动检索近期新闻；这里适合补充官方博客、媒体栏目和你信任的网站。不要填写百度首页一类的搜索入口。</small></label>
        <div class="preview-toolbar">
          <div><b>保存前测试采集</b><span>按当前主题、关键词与信息源获取一小批真实结果，不会生成报告或消耗模型额度。</span></div>
          <button type="button" class="btn ghost" :disabled="previewing" @click="previewSources">
            <LoaderCircle v-if="previewing" class="spin" :size="16"/><Search v-else :size="16"/>{{previewing?"正在采集":"测试信息源"}}
          </button>
        </div>
        <section v-if="preview" class="source-preview">
          <div class="source-preview-head"><b>{{preview.count ? `找到 ${preview.count} 条近期信息` : "暂未找到近期信息"}}</b><span>{{preview.message}}</span></div>
          <a v-for="item in preview.items" :key="item.link" :href="item.link" target="_blank" rel="noreferrer" class="preview-item">
            <div><b>{{item.title}}</b><span>{{item.sourceType}}<template v-if="item.publishedAt"> · {{new Date(item.publishedAt).toLocaleString("zh-CN")}}</template></span><p v-if="item.summary">{{item.summary}}</p></div>
            <ExternalLink :size="15"/>
          </a>
        </section>
        <div class="form-grid three"><label>信息范围<select v-model="form.lookbackHours"><option :value="24">最近 24 小时</option><option :value="48">最近 48 小时</option><option :value="72">最近 3 天</option><option :value="168">最近 7 天</option></select></label><label>执行方式<select v-model="form.scheduleMode"><option value="interval_days">固定间隔</option><option value="weekly">每周指定日期</option></select></label><label>执行时间<input v-model="form.time" type="time" /></label></div>
        <label v-if="form.scheduleMode==='interval_days'">每隔几天执行<input v-model.number="form.interval" type="number" min="1" max="30" /></label>
        <div v-else class="weekday-field"><span>每周执行日</span><div class="weekday-picker"><label v-for="day in [{v:1,n:'一'},{v:2,n:'二'},{v:3,n:'三'},{v:4,n:'四'},{v:5,n:'五'},{v:6,n:'六'},{v:0,n:'日'}]" :key="day.v"><input v-model="form.weekdays" type="checkbox" :value="day.v"/><span>周{{day.n}}</span></label></div></div>
        <label class="check-row mail-option"><input v-model="form.emailReport" type="checkbox"/><span><b>生成后自动发送 Word 报告</b><small>发送到管理员为当前账号设置的报告接收邮箱；发送失败不会影响报告保存。</small></span></label>
        <div class="modal-actions"><button type="button" class="btn ghost" @click="show=false">取消</button><button class="btn primary">保存任务</button></div>
      </form>
    </div>
  </div>
</template>
