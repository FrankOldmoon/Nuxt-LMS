<script setup>
// mmo.vue —— MMO 游戏页（Colyseus 实时同步）
// 登录校验：未登录不渲染游戏；已登录则预载存档 + 申请 token + 加入 Colyseus 房间。
import { DEFAULT_CFG } from '../gamejs/config/characterConfig'
import { GameClient } from '../gamejs/net/client'
import { appStore } from '../gamejs/game/appStore'
import { MAPS } from '../gamejs/shared/maps'
import { instanceStore } from '../gamejs/shared/instanceStore'
import { addRuntimeTasks } from '../gamejs/shared/tasks'
import { setLang, setTranslator } from '../gamejs/i18n'
import { generateChapterLayers } from '../gamejs/rpg/chapterInstance'

definePageMeta({ layout: false })

const { isLoggedIn, user, isLoading } = useAuth()
const { t, locale } = useI18n()
const route = useRoute()
const { public: mmoConfig } = useRuntimeConfig()

// 必须带课程参数才能进入：游戏数据（存档/背包/任务）与金币都绑定到该课程。
// 入口路径：/course/:id/mmo（课程世界）与 /course/:id/:cid/mmo（章节副本）。课程 ID 取自路由参数。
const courseId = computed(() => Number(route.params.id) || Number(route.query.course || route.query.courseId) || 0)

// 章节副本模式：路由 /course/:id/:cid/mmo（兼容旧的 ?chapter= 查询参数）。
// 点击章节页「MMO 副本」按钮进入，按章节内容生成地牢副本。
const chapterId = computed(() => Number(route.params.cid) || Number(route.query.chapter) || 0)

// 章节副本进度上下文：直接复用 LMS 的 useChapterTask 口径，
// 使游戏内的「读完 / 答对」都能落回 chapter.progress（含持久化与奖励结算）。
const chapterContent = ref(null)
const chapterTitleRef = ref('')
const chapterLayers = ref([]) // 生成的各层（供 DOM 进度面板展示）
const chapterTaskCtx = setupChapterTask({
  content: chapterContent,
  chapterId: computed(() => chapterId.value),
  courseId: computed(() => courseId.value),
  chapterTitle: chapterTitleRef,
})

// 返回章节页地址（地牢左上角返回按钮用）
const chapterBackUrl = computed(() => `/course/${Number(courseId.value)}/${Number(chapterId.value)}`)

// 通关最后一层 → 直接回章节页面并退出游戏（由 MapScene 通过 appStore.onChapterExit 触发）
function exitChapterDungeon() {
  if (!import.meta.client) return
  appStore.onChapterExit = null
  navigateTo(chapterBackUrl.value)
}

// 整章进度（与 LMS 章节页同一口径：已完成 heading / 全部 heading）
const chapterProgress = computed(() => {
  const heads = chapterTaskCtx.taskMap.value.headings || []
  const total = heads.length
  const done = heads.filter((h) => chapterTaskCtx.taskStatus.value[h.id] === true).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
})
// 逐层进度（含敌人击杀数）
const layerProgressList = computed(() =>
  chapterLayers.value.map((L, i) => {
    const ids = (L.layer && L.layer.headingIds) || []
    const done = ids.filter((id) => chapterTaskCtx.taskStatus.value[id] === true).length
    const tasks = (L.layer && L.layer.tasks) || []
    const killed = tasks.filter((t) => chapterTaskCtx.nodeStatus.value[t.key] === true).length
    return { i, name: L.name, done, total: ids.length, killed, enemies: tasks.length, cleared: ids.length === 0 || done === ids.length }
  }),
)

// 游戏内点击「可提交任务」敌人 → 弹出 LMS 原生任务渲染弹窗（question/homework/comment/quiz）
const chapterTaskOpen = ref(false)
const chapterTaskState = reactive({ type: '', id: 0, key: '' })
const TaskModalComp = resolveComponent('CourseTaskModal')
const hasTaskModal = typeof TaskModalComp !== 'string'

// 章节副本：图文/组件类内容 → 用 LMS 的**原始渲染组件**原样展示章节里的那一块内容
// （组件名来自 lms 模块 addComponentsDir({ pathPrefix: true })：
//   components/ueditor/render/node.vue → UeditorRenderNode）
const RenderNodeComp = resolveComponent('UeditorRenderNode')
const hasRenderNode = typeof RenderNodeComp !== 'string'
const chapterBlockOpen = ref(false)
const chapterBlockState = reactive({ nodeIndex: null, readKey: '' })
const chapterBlockNode = computed(() => {
  const list = chapterContent.value && chapterContent.value.content
  const i = chapterBlockState.nodeIndex
  return Array.isArray(list) && Number.isInteger(i) ? (list[i] || null) : null
})

// 游戏内弹窗打开期间锁住玩家输入（移动/交互），避免角色在弹窗后面走动
function syncModalLock() {
  appStore.taskModalOpen = !!(chapterTaskOpen.value || chapterBlockOpen.value)
}

function openChapterBlock(nodeIndex, readKey) {
  if (!Number.isInteger(nodeIndex)) return
  chapterBlockState.nodeIndex = nodeIndex
  chapterBlockState.readKey = readKey || ''
  chapterBlockOpen.value = true
}
// 关闭弹窗：必读块（codeBlock/blockquote）关闭即视为「读完」，回写 LMS 进度
function closeChapterBlock() {
  const key = chapterBlockState.readKey
  chapterBlockOpen.value = false
  chapterBlockState.readKey = ''
  if (key) chapterTaskCtx.markBlockRead(key)
}
watch(chapterBlockOpen, syncModalLock)

let chapterTaskCloseTimer = null
let chapterTaskHideTimer = null
watch(chapterTaskOpen, (v) => {
  if (v) {
    if (chapterTaskHideTimer) { clearTimeout(chapterTaskHideTimer); chapterTaskHideTimer = null }
    syncModalLock()
    return
  }
  if (chapterTaskCloseTimer) { clearTimeout(chapterTaskCloseTimer); chapterTaskCloseTimer = null }
  if (chapterTaskHideTimer) clearTimeout(chapterTaskHideTimer)
  // Modal 离场动画 ≈300ms：这段时间内仍视为"题目未隐藏"，
  // 场景不会播放斩杀动画；动画与"题目确实消失"严格先后发生。
  chapterTaskHideTimer = setTimeout(() => { chapterTaskHideTimer = null; syncModalLock() }, 320)
})
watch(() => (chapterTaskState.key ? chapterTaskCtx.nodeStatus.value[chapterTaskState.key] : false), (done) => {
  if (!done || !chapterTaskOpen.value) return
  if (chapterTaskCloseTimer) clearTimeout(chapterTaskCloseTimer)
  chapterTaskCloseTimer = setTimeout(() => { chapterTaskOpen.value = false }, 500)
})

function openChapterTask(type, cid, key) {
  if (!type || !Number(cid)) return
  chapterTaskState.type = type
  chapterTaskState.id = Number(cid)
  chapterTaskState.key = key || ''
  chapterTaskOpen.value = true
}

// 游戏内文案（Phaser 画布/DOM 覆盖层）跟随主项目语言。
// locale JSON 会被 i18n 插件编译成 vue-i18n 消息 AST，游戏侧无法直接读 JSON，
// 因此把 Vue 的 t 注入给游戏（游戏内的 key 会自动补 'mmo.' 前缀）。
function syncGameLang() {
  setLang(locale.value === 'cn' ? 'zh' : 'en')
  setTranslator((key, params) => t(key, params))
}
watch(locale, syncGameLang)

// 服务端错误多为中文兜底：英文界面下若消息含中文则改用本地化文案（中文界面保留服务端详情）
function serverMsg(msg, key) {
  if (!msg) return t(key)
  if (locale.value !== 'cn' && /[\u4e00-\u9fff]/.test(msg)) return t(key)
  return msg
}

const game = shallowRef(null)
const bootState = ref('idle') // idle | loading | ready | error
const errorMsg = ref('')
const playerName = ref('')
const cfg = ref({ ...DEFAULT_CFG })
const needCreate = ref(false) // 首次进入（无存档）：先显示角色创建页
const creating = ref(false)
const createError = ref('')

// 首帧就位门控：本机角色落到存档坐标前，用不透明遮罩盖住画面，
// 避免"出生点 → 存档坐标"的瞬移被看到。
let readyTimer = null
function disarmReadyGate() {
  appStore.onSelfReady = null
  if (readyTimer) { clearTimeout(readyTimer); readyTimer = null }
}
function armReadyGate() {
  disarmReadyGate()
  appStore.onSelfReady = () => {
    disarmReadyGate()
    if (bootState.value === 'loading') bootState.value = 'ready'
  }
  // 兜底：场景异常时 8s 后仍放行，避免一直卡在加载遮罩
  readyTimer = setTimeout(() => { if (bootState.value === 'loading') bootState.value = 'ready' }, 8000)
}

// 创建页确认(MvCharacterCreator)：写入 cfg 后保存存档进入游戏
function onCreatorCreated(v) {
  cfg.value = { ...cfg.value, gender: v.gender, layers: { ...v.layers } }
  confirmCreation()
}

function closeTasks() {
  if (typeof document === "undefined") return
  const el = document.getElementById("tasks")
  if (el) el.hidden = true
}

async function startGame() {
  if (!import.meta.client || bootState.value === 'loading' || game.value) return
  if (!courseId.value) return // 无课程参数：由模板层拦截（不启动游戏）
  syncGameLang()
  bootState.value = 'loading'
  try {
    // 清除旧连接状态(防止 HMR/旧会话残留导致坐标错误)
    if (window.__mmoGame) { try { window.__mmoGame.destroy(true); } catch { /* ignore */ } window.__mmoGame = null; }
    if (appStore.sharedNet) { appStore.sharedNet.leave(); appStore.sharedNet = null; }
    appStore.selfP = null;

    const Phaser = (await import('phaser')).default
    const client = new GameClient(courseId.value)
    appStore.gameClient = client
    appStore.courseId = courseId.value

    // 外部副本模式：?json=<url> 或 ?url=<url> 直接加载并进入该副本地图
    // （服务端拉取 json、校验结构并持久化为本班实例，保证任务/掉落权威结算）
    const extUrl = route.query.json || route.query.url
    let externalMapId = null
    if (extUrl && typeof extUrl === 'string') {
      try {
        const inst = await client.loadExternalInstance(extUrl)
        externalMapId = 'inst_' + inst.id
        instanceStore.register(inst.json, externalMapId)
        addRuntimeTasks(inst.json.tasks)
      } catch (e) {
        console.error('[mmo external instance]', e)
        errorMsg.value = serverMsg(e && e.message, 'mmo.page.loadExternalFailed')
        disarmReadyGate()
        bootState.value = 'error'
        return
      }
    }

    // 章节副本模式：?chapter=<id> → 用 chapterId 作种子生成地牢，按 LMS 进度分层门控出口
    if (chapterId.value) {
      try {
        const showRes = await $fetch(`/api/chapters/show?id=${chapterId.value}`)
        const ch = showRes && showRes.data && showRes.data.chapter
        chapterContent.value = (ch && ch.content) || null
        chapterTitleRef.value = (ch && ch.title) || ''
        // 材料通行 flags（tileset 4 = Dungeon）：墙面/地面候选、可通行格判定
        const tiles = await $fetch('/api/game-assets/mmo/tilesets/Tilesets.json').catch(() => null)
        const flags = (tiles && tiles[4] && tiles[4].flags) || []
        // 服务端进度（恢复已完成层/已答对任务）
        try {
          const me = await $fetch('/api/courses/me', {
            query: { courseId: courseId.value, chapterId: chapterId.value },
          })
          const st = me && me.data ? me.data.chapterTaskStatus : null
          if (st) chapterTaskCtx.applyServerTaskStatus(st, !!(me.data && me.data.chapterIsPass))
        } catch { /* 忽略：进度稍后由 useChapterTask 兜底 */ }

        const built = generateChapterLayers({
          content: chapterContent.value,
          chapterId: chapterId.value,
          flags,
          courseId: courseId.value,
        })
        chapterLayers.value = built.layers
        for (const L of built.layers) {
          instanceStore.register({
            id: L.mapId, type: 'chapter', name: L.name,
            map: L.cfg, npcs: L.npcs, enemies: L.enemies, monsters: [], tasks: [],
          }, L.mapId)
        }
        const layerDone = (i) => {
          const L = built.layers[i]
          return !!L && L.layer.headingIds.every((id) => chapterTaskCtx.taskStatus.value[id] === true)
        }
        // 始终从第 1 层（入口）进入：保证在入口瓦片出生，并逐层推进到下一个二级标题
        const start = 0
        appStore.chapterRuntime = {
          active: true,
          chapterId: chapterId.value,
          layers: built.layers,
          ctx: chapterTaskCtx,
          isLayerDone: layerDone,
          layerProgress(i) {
            const ids = (built.layers[i] && built.layers[i].layer.headingIds) || []
            const done = ids.filter((id) => chapterTaskCtx.taskStatus.value[id] === true).length
            return { done, total: ids.length }
          },
          markRead(key) { if (key) chapterTaskCtx.markBlockRead(key) },
          // 任务是否答对（nodeStatus 由 LMS reportNodeDone 写入）→ 敌人被消灭
          isTaskDone(key) { return !!key && chapterTaskCtx.nodeStatus.value[key] === true },
          // 阅读块是否已读（本会话）/ heading 是否已通过 → 场景据此隐藏 NPC 头顶的 ❗
          isReadDone(key) { return !!key && chapterTaskCtx.isBlockRead(key) },
          isHeadingDone(id) { return !!id && chapterTaskCtx.isHeadingDone(id) },
          requestTask(type, cid, key) { openChapterTask(type, cid, key) },
          // 图文/组件类内容（含 codeBlock/blockquote 必读块）→ 原始组件弹窗
          openBlock(nodeIndex, readKey) { openChapterBlock(nodeIndex, readKey) },
        }
        appStore.openChapterTask = (type, cid, key) => openChapterTask(type, cid, key)
        appStore.openChapterBlock = (nodeIndex, readKey) => openChapterBlock(nodeIndex, readKey)
        appStore.onChapterExit = exitChapterDungeon
        if (built.layers[start]) externalMapId = built.layers[start].mapId
      } catch (e) {
        console.error('[mmo chapter instance]', e)
        errorMsg.value = serverMsg(e && e.message, 'mmo.page.startFailed')
        disarmReadyGate()
        bootState.value = 'error'
        return
      }
    }

    // Colyseus 服务地址（与 MMO_WS_PORT 一致）
    const port = mmoConfig.mmoWsPort || 2567
    appStore.netURL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname || 'localhost'}:${port}`

    // 预载存档（外观/名字/出生位置）；无存档（首次进入）先显示角色创建页
    const state = await client.load()
    if (!state) {
      appStore.playerState = null
      playerName.value = (user.value && user.value.name) || t('mmo.player.default')
      cfg.value = { ...DEFAULT_CFG }
      needCreate.value = true
      bootState.value = 'idle'
      return
    }
    needCreate.value = false
    appStore.playerState = state
    playerName.value = (state && state.name) || (user.value && user.value.name) || t('mmo.player.default')
    cfg.value = { ...DEFAULT_CFG, ...((state && state.cfg) || {}) }

    // 申请一次性 Colyseus 游戏 token + 房间号（default_class.id，每人只进自己班级的房间）
    const gj = await client.joinGame()
    appStore.gameToken = gj ? gj.token : null
    appStore.classId = gj ? gj.classId : 0

    // 预注册本班教师编排副本：刷新/断线重连后仍能解析存档 mapId（inst_<id>），
    // 并直接回到所在副本（否则 instanceStore 为空会回退主世界）
    try {
      const insts = await client.listInstances(true)
      for (const it of insts) {
        if (!it || !it.json) continue
        instanceStore.register(it.json, 'inst_' + it.id)
        addRuntimeTasks(it.json.tasks)
      }
    } catch (e) { console.error('[mmo preload instances]', e) }

    const { default: MapScene } = await import('../gamejs/game/scenes/MapScene')
    // 按 maps.json 所有地图 + 本班副本，为同一场景类(MapScene)注册多个 key
    // 直接激活目标地图(外部副本优先, 其次存档所在地图[含副本], 再其次 world), 避免刷新时先闪 world 再跳转
    const knownMap = (id) => !!MAPS[id] || !!instanceStore.getMap(id)
    const savedMapId = state && typeof state.mapId === 'string' && knownMap(state.mapId) ? state.mapId : 'world'
    const targetMapId = externalMapId || savedMapId
    // 注意: Phaser 会强制启动 scene 数组中下标为 0 的场景(autoStart = i === 0)。
    // 必须把目标地图放到第一位, 否则 world 与目标地图会同时启动, 两个场景都会用
    // 同一个一次性 token 调用 joinServer → 第二个 join 认证失败 → 1005 断连,
    // 表现为"看不到别人但别人能看到我"。
    const orderedKeys = [...new Set([targetMapId, ...Object.keys(MAPS), ...Object.keys(instanceStore.maps)])]
    const sceneArgs = orderedKeys.map((key) => {
      const cfg = { key }
      if (key === targetMapId) cfg.active = true
      return new (MapScene)(cfg)
    })

    armReadyGate()
    game.value = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'multi-host',
      width: 1280,
      height: 720,
      backgroundColor: '#0f1520',
      pixelArt: true,
      render: { pixelArt: true, roundPixels: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: sceneArgs,
    })
    if (import.meta.client) window.__mmoGame = game.value  // 调试/自动化辅助
    // bootState 由 appStore.onSelfReady 在角色就位后置为 'ready'（见 armReadyGate）
  } catch (e) {
    console.error('[mmo init]', e)
    errorMsg.value = e && e.message ? e.message : t('mmo.page.startFailed')
    disarmReadyGate()
    bootState.value = 'error'
  }
}

// 离开房间（Colyseus 服务端会在离房时写入存档）
function leaveRoom() {
  if (appStore.sharedNet) {
    appStore.sharedNet.leave()
    appStore.sharedNet = null
  }
}

// 角色创建页确认：保存外观存档后进入多人游戏（昵称取自账号，无需输入）
async function confirmCreation() {
  if (creating.value) return
  creating.value = true
  createError.value = ''
  try {
    const client = appStore.gameClient || new GameClient(courseId.value)
    appStore.gameClient = client
    const state = await client.saveCfg(cfg.value)
    if (!state) throw new Error(t('mmo.page.saveFailed'))
    needCreate.value = false
    await startGame() // 已有存档，直接进入游戏
  } catch (e) {
    console.error('[mmo create]', e)
    createError.value = serverMsg(e && e.message, 'mmo.page.saveRetry')
  } finally {
    creating.value = false
  }
}

watch(isLoggedIn, (v) => {
  if (v && !game.value) startGame()
  else if (!v && game.value) {
    leaveRoom()
    game.value.destroy(true)
    game.value = null
    bootState.value = 'idle'
  }
})

onMounted(() => {
  if (isLoggedIn.value) startGame()
})
onBeforeUnmount(() => {
  disarmReadyGate()
  leaveRoom()
  if (game.value) game.value.destroy(true)
  // 清理章节副本运行时/回调，避免下次进入时残留
  appStore.onChapterExit = null
  appStore.openChapterTask = null
  appStore.openChapterBlock = null
  appStore.taskModalOpen = false
  appStore.chapterRuntime = null
})
</script>

<template>
  <div class="mmo-page">
    <!-- 未登录：不显示游戏 -->
    <div v-if="!isLoggedIn && !isLoading" class="mmo-login-gate">
      <h1>{{ $t('mmo.title') }}</h1>
      <p>{{ $t('mmo.page.loginRequired') }}</p>
      <NuxtLink to="/" class="mmo-btn">{{ $t('mmo.page.goLogin') }}</NuxtLink>
    </div>

    <!-- 缺少课程参数：不允许直接进入（游戏存档与金币都绑定到课程） -->
    <div v-else-if="!courseId" class="mmo-login-gate">
      <h1>{{ $t('mmo.title') }}</h1>
      <p>{{ $t('mmo.page.courseRequired') }}</p>
      <NuxtLink to="/" class="mmo-btn">{{ $t('mmo.page.goCourse') }}</NuxtLink>
    </div>

    <template v-else>
      <!-- 首次进入（无存档）：角色创建页(共享组件,配置一处维护) -->
      <div v-if="needCreate" class="mmo-create">
        <MvCharacterCreator
          :nickname="(user && user.name) || playerName"
          :loading="creating"
          :error="createError"
          :button-text="$t('mmo.page.enterGame')"
          @created="onCreatorCreated"
        />
      </div>

      <template v-else>
      <!-- 游戏画面全屏铺满（Phaser FIT 自适应居中） -->
      <div id="multi-host" class="mmo-host"></div>

      <!-- 章节副本：左上角返回章节页 + 整章进度（带 slider） -->
      <div v-if="chapterId" class="chapter-hud">
        <NuxtLink :to="chapterBackUrl" class="ch-back">← {{ $t('mmo.chapterInst.back') }}</NuxtLink>
        <div class="ch-title">{{ chapterTitleRef || $t('mmo.chapterInst.layer', { n: 1 }) }}</div>
        <div class="ch-bar"><i :style="{ width: chapterProgress.pct + '%' }" /></div>
        <div class="ch-meta">
          <span>{{ $t('mmo.chapterInst.progress', { done: chapterProgress.done, total: chapterProgress.total }) }}</span>
          <b>{{ chapterProgress.pct }}%</b>
        </div>
        <ul class="ch-layers">
          <li v-for="L in layerProgressList" :key="L.i" :class="{ cleared: L.cleared }">
            <span class="ch-lname">{{ $t('mmo.chapterInst.layer', { n: L.i + 1 }) }}</span>
            <span class="ch-lprog">
              {{ L.done }}/{{ L.total }}
              <template v-if="L.enemies"> · {{ $t('mmo.chapterInst.enemiesShort', { a: L.killed, b: L.enemies }) }}</template>
            </span>
          </li>
        </ul>
      </div>

      <!-- 首帧就位前用不透明遮罩盖住，避免看到出生点 → 存档坐标的瞬移 -->
      <div v-if="bootState !== 'ready'" class="mmo-boot">
        <template v-if="bootState === 'error'">{{ $t('mmo.page.bootFailed', { msg: errorMsg }) }}</template>
        <template v-else>{{ $t('mmo.page.loadingWorld') }}</template>
      </div>

      <!-- 背包覆盖层 -->
      <div id="backpack" class="ov" hidden>
        <div class="ov-box bp-box">
          <div class="ov-head"><b>{{ $t('mmo.bag.title') }}</b><button class="ov-close" id="bpClose">✕</button></div>
          <div class="ov-gold">{{ $t('mmo.gold.label') }}: <b id="bpGold">0</b></div>
          <div class="ov-list" id="bpList"></div>
        </div>
      </div>

      <!-- 商店覆盖层 -->
      <div id="shop" class="ov" hidden>
        <div class="ov-box shop-box">
          <div class="ov-head"><b>{{ $t('mmo.shop.title') }}</b><button class="ov-close" id="shClose">✕</button></div>
          <div class="ov-gold">{{ $t('mmo.gold.label') }}: <b id="shGold">0</b></div>
          <div class="shop-cols">
            <div class="shop-col">
              <div class="col-title">{{ $t('mmo.shop.buy') }}</div>
              <div class="ov-list col-list" id="shBuyList"></div>
            </div>
            <div class="shop-col">
              <div class="col-title">{{ $t('mmo.shop.sell') }}</div>
              <div class="ov-list col-list" id="shSellList"></div>
            </div>
          </div>
          <div class="ov-foot">{{ $t('mmo.shop.closeHint') }}</div>
        </div>
      </div>

      <!-- 任务完成全局提示 -->
      <div id="taskBanner" class="task-banner" hidden>
        <div class="tb-title">{{ $t('mmo.task.completeBanner') }}</div>
        <div class="tb-name" id="taskBannerName"></div>
        <div class="tb-reward" id="taskBannerReward"></div>
      </div>

      <!-- 任务覆盖层 -->
      <div id="tasks" class="ov" hidden>
        <div class="ov-box task-box">
          <div class="ov-head"><b>{{ $t('mmo.task.title') }}</b><button class="ov-close" @click="closeTasks">✕</button></div>
          <div class="task-tabs" id="taskTabs"></div>
          <div class="ov-list" id="taskList"></div>
          <div class="ov-foot">{{ $t('mmo.task.closeHint') }}</div>
        </div>
      </div>

      <!-- 章节副本：游戏内点击任务 NPC → LMS 原生渲染弹窗作答 -->
      <component v-if="hasTaskModal" :is="TaskModalComp" v-model:open="chapterTaskOpen"
        :course-id="courseId" :type="chapterTaskState.type" :id="chapterTaskState.id" status="todo" />

      <!-- 章节副本：图文/组件类内容 → 用 LMS 原始渲染组件原样展示
           （图片/表格/列表/公式/视频/各类自定义扩展框……章节里有什么就渲染什么） -->
      <div v-if="chapterBlockOpen" class="ov" @click.self="closeChapterBlock">
        <div class="ov-box ch-block-box">
          <div class="ov-head">
            <b>{{ $t('mmo.chapterInst.blockView') }}</b>
            <button class="ov-close" @click="closeChapterBlock">✕</button>
          </div>
          <div class="ov-list ch-block-body">
            <component v-if="hasRenderNode && chapterBlockNode" :is="RenderNodeComp"
              :node="chapterBlockNode" :course-id="courseId" :track-reading="false" />
            <div v-else class="ch-block-fallback">{{ $t('mmo.chapterInst.blockUnavailable') }}</div>
          </div>
        </div>
      </div>
      </template>
    </template>
  </div>
</template>

<style>
.mmo-page { position: fixed; inset: 0; background: #0f1520; color: #e6edf7; font-family: "PingFang SC","Microsoft YaHei",system-ui,sans-serif; overflow: hidden; }
.mmo-login-gate { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; text-align: center; }
.mmo-login-gate h1 { font-size: 26px; }
/* 全屏游戏画面 */
.mmo-host { position: absolute; inset: 0; overflow: hidden; }
.mmo-host canvas { border-radius: 0; box-shadow: none; }
/* 首帧就位前的全屏不透明遮罩 */
.mmo-boot { position: absolute; inset: 0; z-index: 70; display: grid; place-items: center; background: #0f1520; color: #8fa0b8; font-size: 15px; }

/* 章节副本左上角面板：返回章节页 + 整章进度 slider + 逐层进度 */
.chapter-hud { position: absolute; top: 12px; left: 12px; z-index: 60; width: 248px; padding: 10px 12px; background: rgba(16,22,31,.86); border: 1px solid #2c3a52; border-radius: 10px; color: #e6edf7; font-size: 12px; backdrop-filter: blur(3px); box-shadow: 0 6px 22px rgba(0,0,0,.4); }
.ch-back { display: inline-block; color: #7fd4ff; font-size: 13px; text-decoration: none; margin-bottom: 6px; }
.ch-back:hover { text-decoration: underline; }
.ch-title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-bar { height: 8px; background: #202a3c; border-radius: 5px; overflow: hidden; border: 1px solid #2c3a52; }
.ch-bar i { display: block; height: 100%; background: linear-gradient(90deg, #4f8cff, #7fd4ff); transition: width .25s ease; }
.ch-meta { display: flex; justify-content: space-between; margin: 4px 0 6px; color: #9fb3d0; }
.ch-meta b { color: #9fe8a0; }
.ch-layers { list-style: none; margin: 0; padding: 0; max-height: 42vh; overflow-y: auto; }
.ch-layers li { display: flex; justify-content: space-between; gap: 6px; padding: 3px 0; color: #b9c8dd; border-top: 1px dashed #26324a; }
.ch-layers li:first-child { border-top: none; }
.ch-layers li.cleared { color: #9fe8a0; }
.ch-layers li.cleared .ch-lprog::after { content: " \2713"; }
.ch-lname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-lprog { flex: none; color: #8fa0b8; }

/* 章节副本：图文/组件内容弹窗（LMS 原始组件渲染） */
.ch-block-box { width: 880px; max-width: 94vw; }
.ch-block-body { padding: 14px 18px; }
.ch-block-body img, .ch-block-body video, .ch-block-body iframe { max-width: 100%; }
.ch-block-fallback { color: #8fa0b8; font-size: 13px; text-align: center; padding: 24px 0; }

/* 角色创建页（首次进入，无存档） */
.mmo-create { position: absolute; inset: 0; display: grid; place-items: center; overflow: auto; padding: 16px; z-index: 65; background: #0f1520; }
.create-box { width: 760px; max-width: 96vw; background: #141b28; border: 1px solid #2c3a52; border-radius: 14px; padding: 22px 26px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.create-box h1 { font-size: 24px; margin-bottom: 14px; }
.create-name { display: flex; align-items: baseline; gap: 10px; padding: 12px 16px; background: #182131; border: 1px solid #2c3a52; border-radius: 10px; margin-bottom: 14px; }
.create-name .label { font-size: 13px; color: #8fa0b8; }
.create-name b { font-size: 18px; color: #7fd4ff; }
.create-name .tip { margin-left: auto; font-size: 12px; color: #8fa0b8; }
.create-groups { max-height: 52vh; overflow-y: auto; margin-bottom: 14px; padding-right: 4px; flex: 1; }
.create-spread { display: flex; gap: 22px; margin-bottom: 14px; }
.create-preview { flex: none; width: 168px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.create-avatar { width: 96px; height: 96px; image-rendering: pixelated; background: #0d141f; border: 1px solid #2c3a52; border-radius: 10px; }
.create-avatar-empty { width: 96px; height: 96px; display: grid; place-items: center; color: #8fa0b8; font-size: 11px; background: #0d141f; border: 1px solid #2c3a52; border-radius: 10px; }
.create-full { width: 120px; height: auto; image-rendering: pixelated; background: #0d141f; border: 1px solid #2c3a52; border-radius: 8px; }
.create-preview-tip { font-size: 12px; color: #8fa0b8; }
.create-err { color: #ff8a8a; font-size: 13px; margin-bottom: 10px; }
.create-btn { width: 100%; background: #4f8cff; color: #fff; border: none; border-radius: 10px; padding: 12px 0; font-size: 16px; cursor: pointer; }
.create-btn:hover { background: #6b9fff; }
.create-btn:disabled { opacity: .6; cursor: not-allowed; }

/* 覆盖层（背包/商店/任务）—— 由 overlay.js 动态注入内容，故使用全局样式 */
.ov { position: fixed; inset: 0 0 0 0; z-index: 100; display: grid; place-items: center; background: rgba(6,10,18,.55); }
.ov[hidden] { display: none; }
.ov-box { width: 560px; max-width: 92vw; max-height: 86vh; display: flex; flex-direction: column; background: #141b28; border: 1px solid #2c3a52; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.ov-box.shop-box { width: 760px; height: 500px; }
.ov-box.task-box { width: 480px; }
.ov-box.bp-box { width: 780px; max-width: 96vw; max-height: 92vh; }
.shop-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px 14px; flex: 1; min-height: 0; }
.shop-col { display: flex; flex-direction: column; min-height: 0; }
.col-title { font-size: 13px; color: #9fb3d0; padding: 0 2px 6px; }
.col-list { flex: 1; overflow-y: auto; }
#shBuyList { overflow-y: hidden; display: flex; flex-direction: column; }
#shSellList { overflow-y: auto; }
.shop-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 0 8px; flex: none; }
.shop-tab { background: #182131; color: #b9c8dd; border: 1px solid #2c3a52; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.shop-tab:hover { background: #22304a; }
.shop-tab.active { background: #2f6faf; color: #fff; border-color: #4f8cff; }
.shop-list { flex: 1; overflow-y: auto; padding-right: 2px; }
.ov-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #2c3a52; }
.ov-head b { font-size: 16px; }
.ov-close { background: #2c3a52; color: #e6edf7; border: none; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-size: 14px; }
.ov-close:hover { background: #3b4c6b; }
.ov-gold { padding: 10px 16px; font-size: 14px; color: #ffd66b; border-bottom: 1px solid #202a3c; }
.ov-list { flex: 1; overflow-y: auto; padding: 10px 14px; }
.ov-foot { padding: 8px 16px; font-size: 12px; color: #8fa0b8; border-top: 1px solid #202a3c; }
.irow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 6px; background: #182131; border: 1px solid #2c3a52; border-radius: 10px; }
.iicon { width: 30px; height: 30px; flex: none; image-rendering: pixelated; }
#bpList { overflow: hidden; flex: 1; min-height: 0; }
.bp-body { display: flex; align-items: stretch; width: 100%; flex: 1; min-height: 0; }
.bp-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 14px 16px; gap: 10px; min-height: 0; }
.bp-main .bp-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(8, 1fr); grid-auto-rows: 1fr; gap: 6px; align-content: stretch; }
.bpc { position: relative; min-height: 40px; display: grid; place-items: center; border: 1px solid #2c3a52; border-radius: 8px; background: #1a2334; transition: border-color .12s, box-shadow .12s, transform .08s; }
.bpc:not(.filled) { border-style: dashed; border-color: #2a3850; opacity: .5; }
.bpc.filled:hover { border-color: #7fd4ff; transform: translateY(-1px); }
.bpc.selected { border-color: #4f8cff; background: #22334f; box-shadow: inset 0 0 0 1.5px #4f8cff; }
.bpc .iicon { width: 30px; height: 30px; }
.bpc .bcnt { position: absolute; right: 3px; bottom: 2px; font-size: 11px; color: #fff; background: rgba(0,0,0,.6); border-radius: 6px; padding: 0 3px; }
.eq-col { width: 148px; flex: none; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 10px; border-right: 1px solid #202a3c; overflow-y: auto; }
.eq-group-title { font-size: 11px; color: #7d8da6; font-weight: 700; letter-spacing: .5px; padding: 0 1px; }
.eq-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.eq-slot { aspect-ratio: 1; border: 1px solid #2c3a52; border-radius: 7px; background: #141b28; position: relative; display: grid; place-items: center; cursor: pointer; }
.eq-slot.filled { border-color: #3a5a8c; background: #16233a; }
.eq-slot .iicon { width: 74%; height: 74%; }
.eq-slot .eq-ghost { font-size: 10px; color: #5c6d8a; text-align: center; line-height: 1.15; }
.eq-slot .uneq { position: absolute; right: 1px; top: 1px; font-size: 9px; line-height: 1; color: #ffd0a0; background: rgba(80,40,10,.75); border: 1px solid #a06a2a; border-radius: 3px; padding: 1px 2px; cursor: pointer; }
.eq-slot .uneq:hover { background: #c07a20; color: #fff; }
.bp-empty { flex: 1; display: grid; place-items: center; color: #7d8da6; font-size: 13px; }
.bp-actions { min-height: 48px; flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; background: #10161f; border: 1px solid #2c3a52; border-radius: 10px; }
.bp-actions-tip { font-size: 12px; color: #7d8da6; }
.bp-selinfo { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bp-selinfo .iicon { width: 30px; height: 30px; flex: none; }
.bp-selname { font-size: 13px; color: #e6edf7; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bp-selcount { font-size: 12px; color: #ffd66b; flex: none; }
.bp-btns { display: flex; gap: 8px; flex: none; }
.act-btn { background: #2c3a52; color: #e6edf7; border: 1px solid #3b4c6b; border-radius: 8px; padding: 6px 16px; cursor: pointer; font-size: 13px; }
.act-btn:hover { opacity: .9; }
.act-btn.use { background: #2f8f4e; border-color: #2f8f4e; color: #fff; }
.act-btn.equip { background: #2f6faf; border-color: #2f6faf; color: #fff; }
.act-btn.drop { background: #a03030; border-color: #a03030; color: #fff; }
.act-btn.close { background: #202a3c; color: #8fa0b8; }
.uneq { flex: none; margin-left: auto; }
.bp-tip { position: fixed; z-index: 130; pointer-events: none; background: #10161f; border: 1px solid #4f8cff; border-radius: 8px; padding: 8px 10px; max-width: 220px; box-shadow: 0 4px 18px rgba(0,0,0,.5); }
.bp-tip .tip-name { font-size: 13px; color: #7fd4ff; font-weight: bold; margin-bottom: 3px; }
.bp-tip .tip-desc { font-size: 12px; color: #b9c8dd; line-height: 1.4; margin-bottom: 4px; }
.bp-tip .tip-price { font-size: 12px; color: #ffd66b; }
.bp-tip .tip-stat { font-size: 12px; color: #9fe8a0; margin-bottom: 4px; }
.iname { flex: 1; font-size: 14px; }
.icount { color: #cfe0f5; font-size: 13px; }
.iprice { color: #ffd66b; font-size: 13px; min-width: 56px; text-align: right; }
.ibtn { background: #2f8f4e; color: #fff; border: none; border-radius: 8px; padding: 5px 14px; cursor: pointer; font-size: 13px; }
.ibtn:hover { background: #39ab60; }
.ibtn.sell { background: #d99a1b; }
.ibtn.sell:hover { background: #efb234; }
.ibtn.disabled, .ibtn:disabled { background: #2c3a52; color: #7d8da6; cursor: not-allowed; }
.ibtn.disabled:hover, .ibtn:disabled:hover { background: #2c3a52; }
.empty { text-align: center; color: #8fa0b8; padding: 24px 0; font-size: 13px; }

/* 任务面板 */
.task-row { padding: 8px 10px; margin-bottom: 8px; background: #182131; border: 1px solid #2c3a52; border-radius: 10px; }
.task-row.done { opacity: .7; }
.task-name { font-size: 14px; color: #7fd4ff; font-weight: bold; }
.task-desc { font-size: 12px; color: #b9c8dd; margin: 3px 0 6px; line-height: 1.4; }
.task-bar { height: 6px; background: #202a3c; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.task-bar i { display: block; height: 100%; background: #4f8cff; }
.task-prog { font-size: 12px; color: #9fb3d0; }
.task-reward { font-size: 12px; color: #ffd66b; margin-top: 2px; }
.task-banner {
  position: fixed; top: 90px; left: 50%; transform: translateX(-50%); z-index: 300;
  background: linear-gradient(135deg, #1c3a5f, #14243c); border: 1px solid #4f8cff;
  border-radius: 14px; padding: 14px 28px; min-width: 300px; max-width: 60vw;
  text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(79,140,255,.25);
  animation: taskBannerIn .35s cubic-bezier(.18,.89,.32,1.28), taskBannerOut .4s ease 2.4s 1 forwards;
}
.task-banner .tb-title { font-size: 17px; color: #ffd66b; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; }
.task-banner .tb-name { font-size: 15px; color: #7fd4ff; font-weight: 700; margin-bottom: 2px; }
.task-banner .tb-reward { font-size: 13px; color: #9fe8a0; }
@keyframes taskBannerIn { from { opacity: 0; transform: translate(-50%, -18px) scale(.85); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
@keyframes taskBannerOut { from { opacity: 1; } to { opacity: 0; transform: translate(-50%, -14px) scale(.92); } }
.task-tabs { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid #2c3a52; }
.task-tab { flex: 1; padding: 6px 0; font-size: 13px; color: #9fb3d0; background: #182131; border: 1px solid #2c3a52; border-radius: 6px; cursor: pointer; text-align: center; }
.task-tab.on { color: #7fd4ff; border-color: #4f8cff; background: #1a2b48; font-weight: bold; }
</style>
