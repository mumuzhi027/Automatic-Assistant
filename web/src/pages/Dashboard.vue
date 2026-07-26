<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api, session } from "../api";
const data = ref(null);
const isAdmin = session()?.user?.role === "ADMIN";
onMounted(async () => { data.value = await api("/dashboard"); });
const fmt = (v) => v ? new Date(v).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "尚未执行";
</script>

<template>
  <div class="page" v-if="data">
    <header class="page-head">
      <div><span class="eyebrow ink">{{ isAdmin ? "SYSTEM OVERVIEW" : "GOOD MORNING" }}</span><h1>{{ isAdmin ? "系统概览" : `早上好，${session()?.user?.name}` }}</h1><p>{{ isAdmin ? "查看成员、任务与自动运行的整体状态。" : "这里是今天与你最相关的行业信号和自动任务。" }}</p></div>
      <RouterLink v-if="!isAdmin" to="/tasks" class="btn primary">＋ 新建情报任务</RouterLink>
    </header>
    <template v-if="isAdmin">
      <div class="stat-grid admin-stats">
        <div class="stat"><span>核心成员</span><strong>{{ data.stats.users }}</strong><small>{{ data.stats.activeUsers }} 人正常使用</small></div>
        <div class="stat"><span>运行中任务</span><strong>{{ data.stats.activeTasks }}</strong><small>按成员计划自动执行</small></div>
        <div class="stat"><span>累计报告</span><strong>{{ data.stats.reports }}</strong><small>结构化情报报告</small></div>
        <div class="stat"><span>失败运行</span><strong>{{ data.stats.failedRuns }}</strong><small>建议及时检查</small></div>
      </div>
      <section class="card">
        <div class="section-title"><div><span class="eyebrow ink">LATEST ACTIVITY</span><h2>最近运行</h2></div><RouterLink to="/admin/runs">查看全部 →</RouterLink></div>
        <div class="table">
          <div class="tr th"><span>任务</span><span>状态</span><span>开始时间</span><span>说明</span></div>
          <div class="tr" v-for="run in data.recentRuns" :key="run.id"><b>{{ run.taskName }}</b><span><em class="status" :class="run.status.toLowerCase()">{{ run.status }}</em></span><span>{{ fmt(run.startedAt) }}</span><span>{{ run.message }}</span></div>
        </div>
      </section>
    </template>
    <template v-else>
      <div class="stat-grid">
        <div class="stat accent"><span>运行中的任务</span><strong>{{ data.stats.activeTasks }}</strong><small>安静地为你持续观察</small></div>
        <div class="stat"><span>已生成报告</span><strong>{{ data.stats.reports }}</strong><small>沉淀为可检索的洞察</small></div>
        <div class="stat"><span>长期记忆</span><strong>{{ data.stats.memories }}</strong><small>让下一份报告更懂你</small></div>
        <div class="stat"><span>成功运行</span><strong>{{ data.stats.successfulRuns }}</strong><small>最近状态稳定</small></div>
      </div>
      <div class="dashboard-grid">
        <section class="card">
          <div class="section-title"><div><span class="eyebrow ink">YOUR WATCHLIST</span><h2>正在观察</h2></div><RouterLink to="/tasks">管理任务 →</RouterLink></div>
          <div class="task-row" v-for="task in data.tasks" :key="task.id">
            <div class="task-icon">⌁</div><div class="grow"><b>{{ task.name }}</b><p>{{ task.industry }} · 最近 {{ task.lookbackHours }} 小时</p></div>
            <div class="next"><small>下次执行</small><b>{{ fmt(task.nextRunAt) }}</b></div>
          </div>
        </section>
        <section class="card">
          <div class="section-title"><div><span class="eyebrow ink">LATEST REPORTS</span><h2>最近报告</h2></div><RouterLink to="/reports">全部报告 →</RouterLink></div>
          <RouterLink class="report-row" v-for="report in data.recentReports" :key="report.id" :to="`/reports/${report.id}`">
            <span class="date-block">{{ new Date(report.createdAt).getDate() }}<small>{{ new Date(report.createdAt).toLocaleString("zh-CN",{month:"short"}) }}</small></span>
            <div><b>{{ report.title }}</b><p>{{ report.summary }}</p></div><i>→</i>
          </RouterLink>
        </section>
      </div>
      <div class="insight-banner"><div><span class="eyebrow">AUTOMATIC NOTE</span><h2>你的情报系统正在逐渐形成自己的判断坐标。</h2></div><p>持续反馈“有价值”与“不感兴趣”，系统会把稳定偏好整理为候选记忆，并在你确认后用于后续报告。</p></div>
    </template>
  </div>
</template>
