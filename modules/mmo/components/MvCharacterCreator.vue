<script setup>
// MvCharacterCreator.vue —— 人物外观配置面板(创建页 / 外观设置共用)
// 统一承载: 性别 + 眼睛/鼻子/嘴巴/耳朵/前发/后发 的配置、face 头像与全身实时预览。
// 通过 created 事件把 {gender, layers} 交给使用者(mmo.vue 保存到服务器 / mmo-test 本地进场)。
import { ref, reactive, watch, onMounted } from 'vue'
import { DEFAULT_CFG, applyOutfit } from '../gamejs/config/characterConfig'
import { MV_GENDERS } from '../gamejs/rpg/buildMvCharacter'
import { buildMvCharacter } from '../gamejs/rpg/buildMvCharacter'
import { faceNums, buildFaceAvatar, faceSpriteImg } from '../gamejs/shared/face'

const props = defineProps({
  nickname: { type: String, default: '' },
  buttonText: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  embedded: { type: Boolean, default: false }, // true=仅配置面板(供外观设置)
})
const emit = defineEmits(['created'])

const { t } = useI18n()

const GENDER_LABELS = { Male: 'mmo.creator.male', Female: 'mmo.creator.female', Kid: 'mmo.creator.kid' }
function genderLabel(g) { return t(GENDER_LABELS[g] || g) }

const genders = MV_GENDERS.filter((g) => g !== 'Kid') // 性别不提供小孩

// 配置项: 眼/鼻/嘴/眉(必选) + 发型(仅两种预设, 前发/后发同步)
// 不提供耳朵选择(耳朵外观由兽耳类道具决定)
const HAIR_LAYERS = ['FrontHair1', 'FrontHair2', 'RearHair1', 'RearHair2']
const cats = [
  { key: 'Eyes', labelKey: 'mmo.creator.eyes', fv: 'Eyes', allowNone: false },
  { key: 'Nose', labelKey: 'mmo.creator.nose', fv: 'Nose', allowNone: false },
  { key: 'Mouth', labelKey: 'mmo.creator.mouth', fv: 'Mouth', allowNone: false },
  { key: 'Eyebrows', labelKey: 'mmo.creator.eyebrows', fv: 'Eyebrows', allowNone: false },
  { key: 'Hair', labelKey: 'mmo.creator.hair', fv: 'FrontHair', allowNone: false, nums: [1, 2], setKeys: HAIR_LAYERS },
]

const cfg = ref({ ...DEFAULT_CFG })
const catNums = reactive({})
const chipImgs = reactive({}) // `${gender}:${catKey}:${num}` -> 部件缩略图
const previewImg = ref(null)
const previewAvatar = ref(null)
let pvTimer = null
let pvBusy = false

async function refreshCatNums() {
  for (const c of cats) catNums[c.key] = c.nums ? [...c.nums] : faceNums(cfg.value.gender, c.fv)
}
async function buildChipImgs() {
  for (const c of cats) {
    for (const n of (catNums[c.key] || [])) {
      const k = `${cfg.value.gender}:${c.key}:${n}`
      if (chipImgs[k]) continue
      chipImgs[k] = await faceSpriteImg(cfg.value.gender, c.fv, n, 30)
    }
  }
}

// 设置某个部件编号;发型会同步前/后发各层
function setPart(c, n) {
  if (c.setKeys) { for (const k of c.setKeys) cfg.value.layers[k] = n; renderPreview(); return }
  cfg.value.layers[c.key] = n
  const sub = c.key === 'FrontHair1' ? 'FrontHair2' : c.key === 'RearHair1' ? 'RearHair2' : null
  if (sub) cfg.value.layers[sub] = n
  renderPreview()
}

// 当前按钮是否为选中态(合并类目按 setKeys 判断)
function isActive(c, n) {
  if (c.setKeys) return c.setKeys.every((k) => cfg.value.layers[k] === n)
  return cfg.value.layers[c.key] === n
}

function renderPreview() {
  if (pvBusy) return
  if (pvTimer) clearTimeout(pvTimer)
  pvTimer = setTimeout(async () => {
    pvBusy = true
    try {
      const r = await buildMvCharacter({ ...cfg.value })
      if (!r || !r.sheets || !r.sheets.walk) { previewImg.value = null; previewAvatar.value = null; return }
      previewImg.value = r.sheets.walk.toDataURL()
      previewAvatar.value = await faceAvatar(cfg.value.gender, cfg.value.layers)
    } catch (e) {
      console.warn('[creator preview]', e)
      previewImg.value = null
      previewAvatar.value = null
    } finally {
      pvBusy = false
    }
  }, 250)
}

async function faceAvatar(gender, layers) {
  try {
    const cv = await buildFaceAvatar(gender, layers)
    if (!cv) return null
    const S = 120
    const c = document.createElement('canvas')
    c.width = S; c.height = S
    const x = c.getContext('2d')
    x.imageSmoothingEnabled = false
    x.drawImage(cv, 0, 0, S, S)
    return c.toDataURL()
  } catch (e) {
    console.warn('[creator face]', e)
    return null
  }
}

watch(() => cfg.value.gender, async () => {
  cfg.value.layers = { ...cfg.value.layers, Body: 1 }
  applyOutfit(cfg.value.layers, cfg.value.gender)
  await refreshCatNums()
  buildChipImgs()
  renderPreview()
}, { immediate: true })
watch(() => JSON.stringify(cfg.value.layers), () => renderPreview())

onMounted(() => { refreshCatNums(); buildChipImgs() })

function emitCreated() {
  emit('created', { gender: cfg.value.gender, layers: { ...cfg.value.layers } })
}

// 外观设置(embedded)：改动即实时生效;创建页则点按钮触发
watch(
  () => [cfg.value.gender, JSON.stringify(cfg.value.layers)],
  () => { if (props.embedded) emit('created', { gender: cfg.value.gender, layers: { ...cfg.value.layers } }) },
  { immediate: props.embedded, deep: true }
)
</script>

<template>
  <div :class="embedded ? 'cc-panel' : 'cc-box'">
    <template v-if="!embedded">
      <h1 class="cc-title">{{ $t('mmo.creator.title') }}</h1>
      <div class="cc-name">
        <label>{{ $t('mmo.creator.nickname') }}</label>
        <b>{{ nickname || $t('mmo.creator.player') }}</b>
        <span class="cc-tip">{{ nickname ? $t('mmo.creator.tipAccount') : $t('mmo.creator.tipVirtual') }}</span>
      </div>
    </template>

    <div class="cc-spread">
      <div v-if="!embedded" class="cc-preview">
        <img v-if="previewAvatar" :src="previewAvatar" class="cc-avatar" alt="avatar" />
        <span v-else class="cc-avatar-empty">{{ $t('mmo.creator.rendering') }}</span>
        <img v-if="previewImg" :src="previewImg" class="cc-full" alt="preview" />
        <span v-else class="cc-full-empty">{{ $t('mmo.creator.rendering') }}</span>
        <p class="cc-tip">{{ $t('mmo.creator.livePreview') }}</p>
      </div>

      <div class="cc-groups">
        <div class="cc-group">
          <div class="cc-row">
            <label>{{ $t('mmo.creator.gender') }}</label>
            <div class="cc-chips">
              <button v-for="g in genders" :key="g" type="button" class="cc-chip cc-chip-txt" :class="{ on: cfg.gender === g }" @click="cfg.gender = g">{{ genderLabel(g) }}</button>
            </div>
          </div>
        </div>
        <div v-for="c in cats" :key="c.key" class="cc-group">
          <div class="cc-row">
            <label class="cc-lab">{{ $t(c.labelKey) }}</label>
            <div class="cc-chips">
              <button v-if="c.allowNone" type="button" class="cc-chip cc-chip-txt" :class="{ on: !cfg.layers[c.key] }" @click="setPart(c, null)">{{ $t('mmo.creator.none') }}</button>
              <button v-for="n in (catNums[c.key] || [])" :key="n" type="button" class="cc-chip" :title="$t(c.labelKey) + ' ' + n" :class="{ on: isActive(c, n) }" @click="setPart(c, n)">
                <img v-if="chipImgs[`${cfg.gender}:${c.key}:${n}`]" :src="chipImgs[`${cfg.gender}:${c.key}:${n}`]" class="cc-chip-img" alt="">
                <span v-else class="cc-chip-ico">⚬</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-if="!embedded">
      <p v-if="error" class="cc-err">{{ error }}</p>
      <button type="button" class="cc-btn" :disabled="loading" @click="emitCreated">
        {{ loading ? $t('mmo.creator.entering') : (buttonText || $t('mmo.page.enterGame')) }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.cc-panel { width: 100%; }
.cc-panel .cc-group { margin-bottom: 8px; }
.cc-box { width: 820px; max-width: 96vw; background: #141b28; border: 1px solid #2c3a52; border-radius: 14px; padding: 22px 26px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.cc-title { font-size: 24px; margin-bottom: 14px; }
.cc-name { display: flex; align-items: baseline; gap: 10px; padding: 12px 16px; background: #182131; border: 1px solid #2c3a52; border-radius: 10px; margin-bottom: 14px; }
.cc-name label { font-size: 13px; color: #8fa0b8; }
.cc-name b { font-size: 18px; color: #7fd4ff; }
.cc-tip { font-size: 12px; color: #8fa0b8; }
.cc-name .cc-tip { margin-left: auto; }

.cc-spread { display: flex; gap: 24px; margin-bottom: 14px; }
.cc-preview { flex: none; width: 168px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.cc-avatar { width: 104px; height: 104px; image-rendering: pixelated; background: #0d141f; border: 1px solid #2c3a52; border-radius: 10px; }
.cc-avatar-empty { width: 104px; height: 104px; display: grid; place-items: center; color: #8fa0b8; font-size: 11px; background: #0d141f; border: 1px solid #2c3a52; border-radius: 10px; }
.cc-full { width: 120px; height: auto; image-rendering: pixelated; background: #0d141f; border: 1px solid #2c3a52; border-radius: 8px; }
.cc-full-empty { width: 120px; height: 160px; display: grid; place-items: center; color: #8fa0b8; font-size: 11px; background: #0d141f; border: 1px solid #2c3a52; border-radius: 8px; }

.cc-group { margin-bottom: 10px; }
.cc-row { display: flex; align-items: center; gap: 10px; }
.cc-lab { flex: 0 0 34px; font-size: 13px; color: #9fb3d0; white-space: nowrap; }
.cc-groups { flex: 1; max-height: 54vh; overflow-y: auto; padding-right: 4px; min-width: 0; }
.cc-chips { flex: 1; min-width: 0; display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
.cc-chip { flex: 0 0 auto; background: #182131; color: #cfdcf0; border: 1px solid #2c3a52; border-radius: 8px; padding: 2px; cursor: pointer; font-size: 12px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 30px; }
.cc-chip:hover { background: #22304a; }
.cc-chip.on { background: #2f5a9c; border-color: #4f8cff; color: #fff; }
.cc-chip-txt { padding: 3px 10px; min-width: 0; }
.cc-chip-img { width: 26px; height: 26px; image-rendering: pixelated; }
.cc-chip-ico { font-size: 14px; color: #5c6d8a; line-height: 1; }
.cc-err { color: #ff8a8a; font-size: 13px; margin-bottom: 10px; }
.cc-btn { width: 100%; background: #4f8cff; color: #fff; border: none; border-radius: 10px; padding: 12px 0; font-size: 16px; cursor: pointer; }
.cc-btn:hover { background: #6b9fff; }
.cc-btn:disabled { opacity: .6; cursor: not-allowed; }
</style>