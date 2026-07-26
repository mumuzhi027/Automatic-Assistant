<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "../api";
import { notify } from "../main";
import { Brain, Check, Pencil, Plus, Trash2, X } from "@lucide/vue";

const items = ref([]);
const content = ref("");
const editingId = ref("");
const draft = ref("");
const activeItems = computed(() => items.value.filter((item) => item.status === "ACTIVE"));
const candidates = computed(() => items.value.filter((item) => item.status === "PENDING"));
const load = async () => { items.value = await api("/memories"); };
onMounted(load);

async function add() {
  if (!content.value.trim()) return;
  try {
    await api("/memories", { method: "POST", body: { content: content.value, type: "PROFILE" } });
    content.value = ""; await load(); notify("记忆已添加");
  } catch (error) { notify(error.message, "error"); }
}
function beginEdit(item) { editingId.value = item.id; draft.value = item.content; }
async function saveEdit(item) {
  if (!draft.value.trim()) return;
  await api(`/memories/${item.id}`, { method: "PUT", body: { content: draft.value.trim() } });
  editingId.value = ""; await load(); notify("记忆已更新");
}
async function accept(item) {
  await api(`/memories/${item.id}`, { method: "PUT", body: { status: "ACTIVE" } });
  await load(); notify("候选记忆已确认");
}
async function remove(item) {
  if (!confirm("确定删除这条记忆？")) return;
  await api(`/memories/${item.id}`, { method: "DELETE" });
  await load(); notify("记忆已删除");
}
</script>

<template>
  <div class="page">
    <header class="page-head"><div><h1>长期记忆</h1><p>只保留稳定、有用且由你掌控的偏好，不保存整份报告。</p></div></header>
    <div class="memory-layout">
      <section class="card">
        <div class="section-title"><h2>已生效的记忆</h2><span class="count-pill">{{activeItems.length}}</span></div>
        <article class="memory" v-for="item in activeItems" :key="item.id">
          <span>{{item.type==="TASK"?"任务":"画像"}}</span>
          <template v-if="editingId===item.id">
            <textarea v-model="draft" rows="3" autofocus></textarea>
            <div class="memory-actions"><button title="保存" @click="saveEdit(item)"><Check :size="16"/></button><button title="取消" @click="editingId=''"><X :size="16"/></button></div>
          </template>
          <template v-else>
            <p>{{item.content}}</p>
            <div class="memory-actions"><button title="编辑" @click="beginEdit(item)"><Pencil :size="15"/></button><button title="删除" class="danger-action" @click="remove(item)"><Trash2 :size="15"/></button></div>
          </template>
        </article>
        <div v-if="!activeItems.length" class="empty-state compact"><Brain :size="25"/><b>还没有长期记忆</b><p>从右侧写下第一条稳定偏好。</p></div>
      </section>
      <aside>
        <form class="card memory-add" @submit.prevent="add"><h2>告诉系统更多</h2><p>写下你的工作方向、报告偏好，或明确不想看到的内容。</p><textarea v-model="content" rows="5" placeholder="例如：我更关注小团队能快速验证的机会，不需要纯融资新闻。"></textarea><button class="btn primary wide"><Plus :size="16"/>添加到长期记忆</button></form>
        <section class="card candidates"><div class="section-title"><h2>待确认候选</h2><span class="count-pill">{{candidates.length}}</span></div><article v-for="item in candidates" :key="item.id"><p>{{item.content}}</p><div><button @click="accept(item)">确认保留</button><button @click="remove(item)">忽略</button></div></article><p class="muted" v-if="!candidates.length">目前没有待确认内容。</p></section>
      </aside>
    </div>
  </div>
</template>
