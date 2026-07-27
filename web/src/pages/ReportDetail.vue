<script setup>
import { onMounted, ref } from "vue"; import { useRoute, useRouter } from "vue-router"; import { api, apiDownload } from "../api"; import { notify } from "../main";
import { ArrowLeft, CircleAlert, CircleCheck, Download, Trash2, Mail, LoaderCircle } from "@lucide/vue";
const route=useRoute(),router=useRouter(),report=ref(null),selected=ref(""),note=ref(""),emailing=ref(false);
onMounted(async()=>{report.value=await api(`/reports/${route.params.id}`);selected.value=report.value.feedback?.rating||"";note.value=report.value.feedback?.note||""});
async function feedback(v=selected.value){selected.value=v;await api(`/reports/${route.params.id}/feedback`,{method:"POST",body:{rating:v,note:note.value}});notify("反馈已保存，将用于后续报告")}
async function remove(){if(!confirm("确定删除这份报告？"))return;await api(`/reports/${route.params.id}`,{method:"DELETE"});notify("报告已删除");router.replace("/reports")}
async function exportWord(){try{await apiDownload(`/reports/${route.params.id}/export.docx`,`${report.value.title.replace(/[\\/:*?"<>|]/g,"_")}.docx`);notify("Word 报告已生成")}catch(error){notify(error.message,"error")}}
async function sendEmail(){if(emailing.value)return;emailing.value=true;try{report.value.emailDelivery=await api(`/reports/${route.params.id}/email`,{method:"POST"});notify(`Word 报告已发送到 ${report.value.emailDelivery.to}`)}catch(error){report.value.emailDelivery={status:"FAILED",error:error.message,failedAt:new Date().toISOString()}}finally{emailing.value=false}}
function importanceLevel(value){
  const number=Number(value);
  if(Number.isFinite(number))return number>=8?"high":number>=5?"medium":"low";
  const text=String(value||"").trim().toLowerCase();
  if(["high","高","critical","important"].includes(text))return"high";
  if(["low","低","minor"].includes(text))return"low";
  return"medium";
}
const importanceLabel=(value)=>({high:"高",medium:"中",low:"低"})[importanceLevel(value)];
const importanceHint=(value)=>({high:"优先关注",medium:"持续观察",low:"补充了解"})[importanceLevel(value)];
</script>
<template><div class="page report-page" v-if="report"><div class="report-topbar"><RouterLink to="/reports" class="back"><ArrowLeft :size="19"/><span>返回报告中心</span></RouterLink><div><button class="btn ghost" @click="exportWord"><Download :size="15"/>导出 Word</button><button class="btn ghost" :disabled="emailing" @click="sendEmail"><LoaderCircle v-if="emailing" class="spin" :size="15"/><Mail v-else :size="15"/>{{emailing?"发送中":"发送邮箱"}}</button><button class="btn ghost danger-text" @click="remove"><Trash2 :size="15"/>删除报告</button></div></div><div v-if="report.emailDelivery" class="delivery-state" :class="report.emailDelivery.status.toLowerCase()" :role="report.emailDelivery.status==='FAILED'?'alert':'status'" aria-live="polite"><CircleCheck v-if="report.emailDelivery.status==='SENT'" :size="16"/><CircleAlert v-else :size="16"/><span>{{report.emailDelivery.status==="SENT"?`最近已发送至 ${report.emailDelivery.to}`:`上次发送失败：${report.emailDelivery.error}`}}</span></div><header class="report-hero"><h1>{{ report.title }}</h1><p>{{ new Date(report.createdAt).toLocaleString("zh-CN") }} · {{ report.period }} · {{ report.sources.length }} 条来源</p></header>
<div class="report-layout"><article class="report-body"><section><span class="section-no">01</span><h2>本期摘要</h2><p class="lead">{{report.summary}}</p></section>
<section><span class="section-no">02</span><h2>重要动态</h2><div class="importance-legend" aria-label="重要程度说明"><span class="high"><i></i>高 · 优先关注</span><span class="medium"><i></i>中 · 持续观察</span><span class="low"><i></i>低 · 补充了解</span></div><div class="update" v-for="u in report.sections.updates" :key="u.title"><span class="score" :class="importanceLevel(u.importance)" :title="`重要程度：${importanceHint(u.importance)}`">{{importanceLabel(u.importance)}}</span><div><h3>{{u.title}}</h3><p>{{u.summary}}</p><small>来源：{{u.source}}</small></div></div></section>
<section><span class="section-no">03</span><h2>趋势判断</h2><ol class="editorial-list"><li v-for="x in report.sections.trends" :key="x">{{x}}</li></ol></section>
<div class="two-sections"><section><span class="section-no">04</span><h2>潜在机会</h2><ul><li v-for="x in report.sections.opportunities" :key="x">{{x}}</li></ul></section><section><span class="section-no">05</span><h2>风险与不确定性</h2><ul><li v-for="x in report.sections.risks" :key="x">{{x}}</li></ul></section></div>
<section class="action-section"><span class="section-no">06</span><h2>建议下一步</h2><div v-for="(x,i) in report.sections.actions" :key="x" class="action"><b>{{String(i+1).padStart(2,"0")}}</b><p>{{x}}</p></div></section>
<section><span class="section-no">07</span><h2>信息来源</h2><a class="source" v-for="s in report.sources" :key="s.url" :href="s.url" target="_blank" rel="noreferrer"><div><b>{{s.title}}</b><small>{{new Date(s.publishedAt).toLocaleString("zh-CN")}}</small></div><i>↗</i></a><p v-if="!report.sources.length" class="muted">本次未获取到可展示的外部来源，报告使用演示内容生成。</p></section></article>
<aside class="report-aside"><div class="aside-card"><h3>这份报告对你有帮助吗？</h3><div class="feedbacks"><button v-for="x in ['有价值','一般','不感兴趣','继续关注']" :class="{active:selected===x}" @click="feedback(x)">{{x}}</button></div><textarea v-model="note" class="feedback-note" rows="3" placeholder="还可以补充具体意见（选填）"></textarea><button class="btn primary wide" :disabled="!selected" @click="feedback()">保存反馈</button></div><div class="aside-card usage"><small>本次生成</small><b>{{report.usage.inputTokens}} / {{report.usage.outputTokens}}</b><span>输入 / 输出 Token</span><small>耗时 {{Math.round(report.usage.durationMs/1000)}} 秒</small></div></aside></div></div></template>
