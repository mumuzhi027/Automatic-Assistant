<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "../api";
import { RefreshCw } from "@lucide/vue";
const runs = ref([]);
const status = ref("ALL");
const loading = ref(false);
const visibleRuns = computed(() => status.value === "ALL" ? runs.value : runs.value.filter((run) => run.status === status.value));
async function load() { loading.value = true; try { runs.value = await api("/admin/runs"); } finally { loading.value = false; } }
onMounted(load);
</script>
<template>
  <div class="page">
    <header class="page-head"><div><h1>运行记录</h1><p>查看自动和手动任务的执行结果与错误信息。</p></div><div class="head-actions"><select v-model="status"><option value="ALL">全部状态</option><option value="SUCCESS">成功</option><option value="FAILED">失败</option><option value="RUNNING">运行中</option></select><button class="btn ghost" :disabled="loading" @click="load"><RefreshCw :size="16" :class="{spin:loading}"/>刷新</button></div></header>
    <section class="card"><div class="table runs"><div class="tr th"><span>任务</span><span>触发方式</span><span>状态</span><span>开始时间</span><span>耗时</span><span>说明</span></div><div class="tr" v-for="run in visibleRuns" :key="run.id"><b>{{run.taskName}}</b><span>{{run.trigger==="SCHEDULED"?"自动":"手动"}}</span><span><em class="status" :class="run.status.toLowerCase()">{{run.status}}</em></span><span>{{new Date(run.startedAt).toLocaleString("zh-CN")}}</span><span>{{run.finishedAt?Math.round((new Date(run.finishedAt)-new Date(run.startedAt))/1000)+" 秒":"—"}}</span><span class="run-message" :title="run.message">{{run.message}}</span></div></div><div v-if="!visibleRuns.length" class="empty">没有符合当前条件的运行记录。</div></section>
  </div>
</template>
