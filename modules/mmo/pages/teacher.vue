<script setup>
// teacher.vue —— 教师编排副本: 提交 JSON 生成副本地图/NPC/对话/怪物/任务
// 仅 teacher / admin 可访问; 副本按班级隔离。
import { useAuth } from '#imports'

definePageMeta({ layout: false })

const { isLoggedIn, user, isLoading } = useAuth()
const { t, locale } = useI18n()

// 服务端错误多为中文兜底：英文界面下若消息含中文则改用本地化文案（中文界面保留服务端详情）
function serverMsg(msg, key) {
  if (!msg) return t(key)
  if (locale.value !== 'cn' && /[\u4e00-\u9fff]/.test(msg)) return t(key)
  return msg
}

const SAMPLE = JSON.stringify({
  id: "fire_cave",
  name: t('mmo.teacher.sampleName'),
  description: t('mmo.teacher.sampleDesc'),
  map: {
    file: "maps/Map_New_Inside.json",
    tex: "rpgInside",
    spawn: [10, 12],
    features: { npc: true, monsters: true },
    doors: [{ tile: [10, 14], to: "world", spawn: [9, 18] }]
  },
  npcs: [
    { key: "guide", name: t('mmo.teacher.sampleNpcName'), tile: [12, 14], lines: [t('mmo.teacher.sampleNpcLine1'), t('mmo.teacher.sampleNpcLine2')] }
  ],
  monsters: [
    { key: "bat", tile: [14, 18] },
    { key: "bat", tile: [16, 20] },
    { key: "ghost", tile: [18, 16] }
  ],
  tasks: [
    { id: "clear_fire", name: t('mmo.teacher.sampleTaskName'), desc: t('mmo.teacher.sampleTaskDesc'), type: "kill", target: "bat", count: 3, giver: "guide", reward: { xp: 80, gold: 120 } }
  ]
}, null, 2)

const text = ref(SAMPLE)
const status = ref("")
const err = ref("")
const list = ref([])

async function loadList() {
  try {
    const res = await $fetch("/api/mmo/instances")
    list.value = (res && res.success && res.data) || []
  } catch (e) { /* ignore */ }
}
async function save() {
  err.value = ""; status.value = ""
  let json
  try { json = JSON.parse(text.value) } catch (e) { err.value = t('mmo.teacher.jsonParseFailed') + e.message; return }
  try {
    const res = await $fetch("/api/mmo/instances", { method: "POST", body: { json } })
    if (res && res.success) { status.value = t('mmo.teacher.savedOk') + (res.data && res.data.name); await loadList() }
    else err.value = serverMsg(res && res.msg, 'mmo.teacher.saveFailed')
  } catch (e) { err.value = serverMsg(e && e.data && e.data.msg, 'mmo.teacher.saveFailed') }
}
async function remove(id) {
  if (!confirm(t('mmo.teacher.removeConfirm', { id }))) return
  await $fetch("/api/mmo/instances/" + id, { method: "DELETE" })
  await loadList()
}
function loadSample() { text.value = SAMPLE }

onMounted(() => { if (isLoggedIn.value) loadList() })
watch(isLoggedIn, (v) => { if (v) loadList() })
</script>

<template>
  <div class="tch-page">
    <div v-if="!isLoggedIn && !isLoading" class="tch-gate">
      <h1>{{ $t('mmo.teacher.title') }}</h1>
      <p>{{ $t('mmo.teacher.gate') }}</p>
      <NuxtLink to="/" class="tch-btn">{{ $t('mmo.teacher.goLogin') }}</NuxtLink>
    </div>

    <template v-else>
      <div class="tch-bar">
        <b>{{ $t('mmo.teacher.bar') }}</b>
        <span class="tch-user">{{ (user && user.name) || $t('mmo.teacher.teacher') }}</span>
      </div>

      <div class="tch-body">
        <div class="tch-left">
          <div class="tch-row">
            <button class="tch-btn" @click="loadSample">{{ $t('mmo.teacher.loadSample') }}</button>
            <button class="tch-btn primary" @click="save">{{ $t('mmo.teacher.save') }}</button>
          </div>
          <div v-if="err" class="tch-err">⚠ {{ err }}</div>
          <div v-if="status" class="tch-ok">✅ {{ status }}</div>
          <textarea v-model="text" class="tch-area" spellcheck="false"></textarea>
          <div class="tch-hint">
            {{ $t('mmo.teacher.fieldsHint') }}<code>id</code>{{ $t('mmo.teacher.fieldsIdNote') }} · <code>name</code> · <code>map.file/tex/spawn/doors</code> ·
            <code>npcs[]</code>(key,name,tile,lines,cfg?) · <code>monsters[]</code>(key,tile) ·
            <code>tasks[]</code>(type: kill/collect/talk, target, count, reward)
          </div>
        </div>

        <div class="tch-right">
          <h3>{{ $t('mmo.teacher.listTitle') }}</h3>
          <div v-if="!list.length" class="tch-empty">{{ $t('mmo.teacher.empty') }}</div>
          <div v-for="it in list" :key="it.id" class="tch-card">
            <div class="tch-card-name">{{ it.name }} <span class="tch-card-id">{{ it.id }}</span></div>
            <div class="tch-card-desc">{{ it.description || $t('mmo.teacher.noDesc') }}</div>
            <button class="tch-btn danger" @click="remove(it.id)">{{ $t('mmo.teacher.remove') }}</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
.tch-page { position: fixed; inset: 0; background: #0f1520; color: #e6edf7; font-family: "PingFang SC","Microsoft YaHei",system-ui,sans-serif; display: flex; flex-direction: column; overflow: hidden; }
.tch-gate { margin: auto; text-align: center; display: flex; flex-direction: column; gap: 16px; align-items: center; }
.tch-bar { display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: #182131; border-bottom: 1px solid #2c3a52; }
.tch-user { font-size: 13px; color: #8fa0b8; }
.tch-btn { background: #2c3a52; color: #e6edf7; border: 1px solid #3b4c6b; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; text-decoration: none; }
.tch-btn:hover { background: #34465f; }
.tch-btn.primary { background: #2f6faf; border-color: #4f8cff; }
.tch-btn.danger { background: #a03030; border-color: #a03030; }
.tch-body { flex: 1; display: grid; grid-template-columns: 1fr 320px; min-height: 0; }
.tch-left { display: flex; flex-direction: column; padding: 14px 16px; gap: 10px; min-height: 0; }
.tch-right { border-left: 1px solid #2c3a52; padding: 14px 16px; overflow-y: auto; }
.tch-row { display: flex; gap: 10px; }
.tch-area { flex: 1; min-height: 0; width: 100%; resize: none; background: #0c1118; color: #d6e2f0; border: 1px solid #2c3a52; border-radius: 10px; padding: 12px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; line-height: 1.5; }
.tch-hint { font-size: 12px; color: #8fa0b8; line-height: 1.6; }
.tch-hint code { background: #1a2334; color: #9fe8a0; padding: 1px 5px; border-radius: 4px; }
.tch-err { color: #ff8a8a; font-size: 13px; }
.tch-ok { color: #8dff9a; font-size: 13px; }
.tch-card { background: #141b28; border: 1px solid #2c3a52; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
.tch-card-name { font-size: 14px; font-weight: 700; color: #7fd4ff; }
.tch-card-id { font-size: 11px; color: #8fa0b8; font-weight: 400; margin-left: 6px; }
.tch-card-desc { font-size: 12px; color: #b9c8dd; margin: 4px 0 8px; }
.tch-empty { color: #8fa0b8; font-size: 13px; }
</style>
