<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "../api";
import { notify } from "../main";
import { Trash2, ArrowUpRight, FileText, Search } from "@lucide/vue";
const reports=ref([]), deleting=ref(""), query=ref("");
const visibleReports=computed(()=>{
  const keyword=query.value.trim().toLowerCase();
  if(!keyword) return reports.value;
  return reports.value.filter(r=>[r.title,r.summary,r.period].some(value=>String(value||"").toLowerCase().includes(keyword)));
});
const load=async()=>reports.value=await api("/reports");
onMounted(load);
async function remove(report) {
  if (!confirm(`确定删除“${report.title}”？该操作会同时删除这份报告的反馈。`)) return;
  deleting.value=report.id;
  try { await api(`/reports/${report.id}`,{method:"DELETE"}); await load(); notify("报告已删除"); }
  catch(error){notify(error.message,"error")} finally{deleting.value=""}
}
</script>
<template><div class="page"><header class="page-head"><div><h1>行业报告</h1><p>每份报告都保留来源、判断依据和下一步建议。</p></div><label v-if="reports.length" class="search-box"><Search :size="17"/><input v-model="query" placeholder="搜索标题或摘要" aria-label="搜索报告"/></label></header>
<div class="report-list"><article v-for="(r,i) in visibleReports" :key="r.id" class="report-card"><RouterLink :to="`/reports/${r.id}`" class="report-card-link"><span class="report-index">{{ String(visibleReports.length-i).padStart(2,"0") }}</span><div class="grow"><small>{{ new Date(r.createdAt).toLocaleDateString("zh-CN") }} · {{ r.period }}</small><h2>{{ r.title }}</h2><p>{{ r.summary }}</p><div class="meta"><span>输入 {{ r.usage?.inputTokens||0 }} tokens</span><span>输出 {{ r.usage?.outputTokens||0 }} tokens</span></div></div><ArrowUpRight :size="19"/></RouterLink><button class="icon-action danger-action" title="删除报告" :disabled="deleting===r.id" @click="remove(r)"><Trash2 :size="16"/></button></article>
<div v-if="!visibleReports.length" class="empty-state"><FileText :size="28"/><b>{{reports.length?"没有匹配的报告":"还没有行业报告"}}</b><p>{{reports.length?"换个关键词再试试。":"创建任务并执行一次后，报告会出现在这里。"}}</p><RouterLink v-if="!reports.length" to="/tasks" class="btn primary">前往我的任务</RouterLink></div></div>
</div></template>
