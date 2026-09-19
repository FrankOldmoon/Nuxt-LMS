<script setup>
// mmo-test.vue —— MMO 模块测试页（虚拟账号，纯前端本地模拟）
// 提供两个真实页面：
//   1) 初始页面  —— 首次进入的角色创建界面（性别/分层/编号 + 实时预览，可操作）。
//   2) 多人游戏界面 —— 用视图 OfflineNetClient 本地渲染 MultiScene（地图/角色/背包/商店），不连真实 Colyseus。
// 数据不落库、不上服务器，便于开发期回归界面与交互。
import { ref, shallowRef, computed, onBeforeUnmount, nextTick } from 'vue'
import { appStore } from '../gamejs/game/appStore'
import { OfflineNetClient } from '../gamejs/net/offline.js'
import { setLang, setTranslator } from '../gamejs/i18n'

definePageMeta({ layout: false })

const { t, locale } = useI18n()

// 游戏内文案（Phaser 画布/DOM 覆盖层）跟随主项目语言；
// locale JSON 会被 i18n 插件编译成 AST，游戏侧读不了，故注入 Vue 的 t
function syncGameLang() {
  setLang(locale.value === 'cn' ? 'zh' : 'en')
  setTranslator((key, params) => t(key, params))
}
watch(locale, syncGameLang)
if (import.meta.client) syncGameLang()

const tabs = computed(() => [
  { key: 'create', label: t('mmo.test.tabCreate') },
  { key: 'mmo', label: t('mmo.test.tabMmo') },
])
const tab = ref('create')

/* ---------- 初始页面(角色创建): 复用 MvCharacterCreator 组件 ---------- */
const playerName = ref(t('mmo.test.virtualPlayer'))

// 创建完成(共享组件派发本次外观): 在本机建虚拟玩家进场
function onCreated(v) {
  const appearance = { gender: v.gender, layers: { ...v.layers } }
  tab.value = 'mmo'
  const p = {
    sessionId: 'virtual-' + Date.now(),
    name: playerName.value || t('mmo.test.virtualPlayer'),
    gold: 100,
    hp: 100, maxHp: 100, level: 1, xp: 0,
    mode: 'idle', facing: 2, mapId: 'world',
    cfgJSON: JSON.stringify(appearance),
    inventoryJSON: JSON.stringify({
      bread: 3, herb: 2, potion: 1, sword: 1,
      leather_armor: 1, coat_m_1: 1, cloak_a1: 1, ears_f_3: 1,
    }),
    equippedJSON: '{}',
    onChange: () => {},
  }
  appStore.playerState = { name: p.name, cfg: appearance }
  appStore.selfP = p
  appStore.sharedNet = new OfflineNetClient(p)
  appStore.gameToken = null
  appStore.classId = 0
  nextTick(startMulti)
}

function closeTasks() {
  if (typeof document === "undefined") return
  const el = document.getElementById("tasks")
  if (el) el.hidden = true
}

/* ---------- 多人游戏界面（本地模拟） ---------- */
const game = shallowRef(null)
const bootState = ref('idle') // idle | loading | ready | error
const gameErr = ref('')

function stopMulti() {
  if (game.value) { game.value.destroy(true); game.value = null }
  if (appStore.sharedNet) { appStore.sharedNet.leave(); appStore.sharedNet = null }
  appStore.playerState = null
  appStore.selfP = null
  bootState.value = 'idle'
  tab.value = 'create'
}

async function startMulti() {
  if (game.value) return
  syncGameLang()
  bootState.value = 'loading'
  try {
    const Phaser = (await import('phaser')).default
    const { default: MapScene } = await import('../gamejs/game/scenes/MapScene')
    const { MAPS } = await import('../gamejs/shared/maps')
    game.value = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'mt-multi-host',
      width: 1280,
      height: 720,
      backgroundColor: '#0f1520',
      pixelArt: true,
      render: { pixelArt: true, roundPixels: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: Object.keys(MAPS).map((key) => new (MapScene)({ key })),
    })
    bootState.value = 'ready'
  } catch (e) {
    console.error('[mmo-test start]', e)
    gameErr.value = (e && e.message) || t('mmo.page.startFailed')
    bootState.value = 'error'
  }
}

onBeforeUnmount(() => {
  if (game.value) game.value.destroy(true)
  if (appStore.sharedNet) appStore.sharedNet.leave()
})
</script>

<template>
  <div class="mt-page">
    <div class="mt-head">
      <h1>{{ $t('mmo.test.title') }}</h1>
      <div class="mt-tabs">
        <button v-for="tb in tabs" :key="tb.key" class="mt-tab" :class="{ on: tab === tb.key }" @click="tab = tb.key">
          {{ tb.label }}
        </button>
      </div>
      <span class="mt-badge">{{ playerName }}{{ $t('mmo.test.badge') }}</span>
    </div>

    <!-- ============ 初始页面（角色创建·复用共享组件） ============ -->
    <div v-if="tab === 'create'" class="mt-create">
      <MvCharacterCreator
      :nickname="playerName"
      :button-text="$t('mmo.test.enterVirtual')"
      @created="onCreated"
    />
    </div>

    <!-- ============ 多人游戏界面（本地模拟） ============ -->
    <div v-else-if="tab === 'mmo'" class="mt-game">
      <div class="mt-sub-bar">
        <b>{{ $t('mmo.test.bar') }}</b>
        <span class="mt-player">{{ $t('mmo.test.playerLine', { name: playerName }) }}</span>
        <button class="mt-btn" @click="stopMulti">{{ $t('mmo.test.exitToCreate') }}</button>
      </div>

      <div id="mt-multi-host" class="mt-multi-host">
        <div v-if="bootState !== 'ready'" class="mt-boot">
          <template v-if="bootState === 'loading'">{{ $t('mmo.page.loadingWorld') }}</template>
          <template v-else-if="bootState === 'error'">{{ $t('mmo.page.bootFailed', { msg: gameErr }) }}</template>
        </div>
      </div>

      <div class="mt-hints">{{ $t('mmo.test.hints') }}</div>

      <!-- 覆盖层 DOM（供真实 Overlay 渲染背包/商店） -->
      <div id="backpack" class="ov ov-demo" hidden>
        <div class="ov-box"><div class="ov-head"><b>{{ $t('mmo.bag.title') }}</b><button class="ov-close" id="bpClose">✕</button></div><div class="ov-gold">{{ $t('mmo.gold.label') }}: <b id="bpGold">0</b></div><div class="ov-list" id="bpList"></div></div>
      </div>
      <div id="shop" class="ov ov-demo" hidden>
        <div class="ov-box shop-box"><div class="ov-head"><b>{{ $t('mmo.shop.title') }}</b><button class="ov-close" id="shClose">✕</button></div><div class="ov-gold">{{ $t('mmo.gold.label') }}: <b id="shGold">0</b></div><div class="shop-cols"><div class="shop-col"><div class="col-title">{{ $t('mmo.shop.buy') }}</div><div class="ov-list col-list" id="shBuyList"></div></div><div class="shop-col"><div class="col-title">{{ $t('mmo.shop.sell') }}</div><div class="ov-list col-list" id="shSellList"></div></div></div><div class="ov-foot">{{ $t('mmo.shop.closeHint') }}</div></div>
      </div>
      <div id="tasks" class="ov ov-demo" hidden>
        <div class="ov-box task-box"><div class="ov-head"><b>{{ $t('mmo.task.title') }}</b><button class="ov-close" @click="closeTasks">✕</button></div><div class="ov-list" id="taskList"></div><div class="ov-foot">{{ $t('mmo.task.closeHint') }}</div></div>
      </div>
    </div>
  </div>
</template>

<style>
.mt-page { position: fixed; inset: 0; background: #0f1520; color: #e6edf7; font-family: "PingFang SC","Microsoft YaHei",system-ui,sans-serif; display: flex; flex-direction: column; overflow: hidden; }
.mt-head { display: flex; align-items: center; gap: 14px; padding: 12px 20px; background: #182131; border-bottom: 1px solid #2c3a52; flex: none; }
.mt-head h1 { font-size: 18px; margin: 0; }
.mt-tabs { display: flex; gap: 6px; flex: 1; }
.mt-tab { background: #202a3c; color: #b9c8dd; border: 1px solid #2c3a52; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
.mt-tab.on { background: #4f8cff; color: #fff; border-color: #4f8cff; }
.mt-badge { font-size: 12px; color: #ffd66b; background: #202a3c; border: 1px solid #3b4c6b; border-radius: 20px; padding: 4px 12px; flex: none; }
.mt-btn { background: #2c3a52; color: #e6edf7; border: 1px solid #3b4c6b; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
.mt-btn:hover { opacity: .9; }

/* 初始页面（角色创建） */
.mt-create { flex: 1; display: grid; place-items: center; overflow: auto; padding: 16px; }
.mt-create-box { width: 820px; max-width: 96vw; background: #141b28; border: 1px solid #2c3a52; border-radius: 14px; padding: 22px 26px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.mt-create-box h1 { font-size: 24px; margin-bottom: 14px; }
.mt-create-name { display: flex; align-items: baseline; gap: 10px; padding: 12px 16px; background: #182131; border: 1px solid #2c3a52; border-radius: 10px; margin-bottom: 14px; }
.mt-create-name label { font-size: 13px; color: #8fa0b8; }
.mt-create-name b { font-size: 18px; color: #7fd4ff; }
.mt-create-name .tip { margin-left: auto; font-size: 12px; color: #8fa0b8; }
.mt-create-body { display: flex; gap: 24px; margin-bottom: 14px; }
.mt-preview-col { flex: none; width: 176px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.mt-avatar { width: 120px; height: 120px; image-rendering: pixelated; background: #0f1520; border: 1px solid #2c3a52; border-radius: 10px; }
.mt-preview { width: 120px; height: auto; image-rendering: pixelated; background: #0f1520; border: 1px solid #2c3a52; border-radius: 8px; }
.mt-preview-empty { width: 144px; height: 192px; display: grid; place-items: center; color: #8fa0b8; font-size: 12px; background: #0f1520; border: 1px solid #2c3a52; border-radius: 8px; }
.mt-preview-tip { font-size: 12px; color: #8fa0b8; }
.mt-groups { flex: 1; max-height: 52vh; overflow-y: auto; padding-right: 4px; }
.mt-create-box .create-btn { width: 100%; background: #4f8cff; color: #fff; border: none; border-radius: 10px; padding: 12px 0; font-size: 16px; cursor: pointer; }
.mt-create-box .create-btn:hover { background: #6b9fff; }
.mt-create-box .create-btn:disabled { opacity: .6; cursor: not-allowed; }
.mt-create-box .create-err { color: #ff8a8a; font-size: 13px; margin-bottom: 10px; }

/* 多人游戏界面 */
.mt-game { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.mt-sub-bar { display: flex; align-items: center; gap: 14px; padding: 8px 16px; background: #182131; border-bottom: 1px solid #2c3a52; flex: none; }
.mt-sub-bar b { font-size: 15px; }
.mt-player { font-size: 13px; color: #8fa0b8; flex: 1; }
.mt-multi-host { flex: 1; min-height: 0; position: relative; }
.mt-boot { position: absolute; inset: 0; display: grid; place-items: center; color: #8fa0b8; font-size: 15px; }
.mt-hints { padding: 6px 14px; font-size: 12px; color: #8fa0b8; border-top: 1px solid #202a3c; flex: none; }

/* 覆盖层（演示用，固定浮层） */
.ov-demo { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; background: rgba(6,10,18,.55); }
.ov-demo[hidden] { display: none; }
.ov-demo .ov-box { width: 560px; max-width: 92vw; max-height: 86vh; display: flex; flex-direction: column; background: #141b28; border: 1px solid #2c3a52; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.ov-demo .ov-box.shop-box { width: 880px; height: 500px; }
.ov-demo #backpack .ov-box { width: 720px; height: 500px; }
.ov-demo .shop-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px 14px; flex: 1; min-height: 0; }
.ov-demo .shop-col { display: flex; flex-direction: column; min-height: 0; }
.ov-demo .col-title { font-size: 13px; color: #9fb3d0; padding: 0 2px 6px; }
.ov-demo .ov-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #2c3a52; }
.ov-demo .ov-head b { font-size: 16px; }
.ov-demo .ov-close { background: #2c3a52; color: #e6edf7; border: none; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-size: 14px; }
.ov-demo .ov-gold { padding: 10px 16px; font-size: 14px; color: #ffd66b; border-bottom: 1px solid #202a3c; }
.ov-demo .ov-list { flex: 1; overflow-y: auto; padding: 10px 14px; }
.ov-demo .col-list { flex: 1; overflow-y: auto; }
.ov-demo #shBuyList { overflow-y: hidden; display: flex; flex-direction: column; }
.ov-demo #shSellList { overflow-y: auto; }
.ov-demo .ov-foot { padding: 8px 16px; font-size: 12px; color: #8fa0b8; border-top: 1px solid #202a3c; }
</style>