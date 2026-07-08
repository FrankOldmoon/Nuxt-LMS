<template>
  <div class="relative pointer-events-auto shrink-0">
    <div
      class="relative w-[300px] h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-default bg-default/90 backdrop-blur-sm"
    >
      <!-- 关闭按钮 -->
      <button
        type="button"
        class="absolute top-2 right-2 z-10 size-7 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
        :title="t('common.close')"
        @click="emit('close')"
      >
        <UIcon name="i-lucide-x" class="size-4" />
      </button>

      <!-- 标题 -->
      <div class="absolute top-2 left-3 z-10 text-xs text-white/70 font-medium pointer-events-none">
        {{ t('ai.digitalHuman') }}
      </div>

      <!-- 加载中 -->
      <div
        v-if="loadState === 'loading'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
        <span class="text-xs text-muted">{{ loadingLabel }}</span>
      </div>

      <!-- 错误 -->
      <div
        v-else-if="loadState === 'error'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6"
      >
        <UIcon name="i-lucide-alert-triangle" class="size-8 text-red-500" />
        <span class="text-xs text-red-500 text-center leading-relaxed">{{ errorMsg }}</span>
      </div>

      <!-- Canvas（3D 渲染） -->
      <canvas v-show="loadState === 'ready'" ref="canvasRef" class="w-full h-full block" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { subscribeVrmSpeech, consumeVrmAudioChars } from '../../utils/vrm'
// VRM 3D 数字人组件：CDN 加载 three + three-vrm，待机动画 + 文本驱动口型同步

const { t } = useI18n()

const props = withDefaults(defineProps<{
  /** VRM 模型 URL，默认 three-vrm 官方示例模型 */
  modelUrl?: string
}>(), {
  modelUrl: 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@master/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
})

const emit = defineEmits<{
  close: []
  loaded: []
  error: [msg: string]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const loadState = ref<'loading' | 'ready' | 'error'>('loading')
const loadingLabel = ref(t('ai.vrmLoading'))
const errorMsg = ref('')

// ===================== CDN 加载 three + three-vrm =====================
// 双 CDN 回退：esm.sh（主）→ esm.run（jsdelivr 的 ESM CDN，备）
const THREE_CDN_PRIMARY = 'https://esm.sh/three@0.169.0'
const THREE_CDN_FALLBACK = 'https://esm.run/three@0.169.0'
const GLTF_CDN_PRIMARY = 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js'
const GLTF_CDN_FALLBACK = 'https://esm.run/three@0.169.0/examples/jsm/loaders/GLTFLoader.js'
const VRM_CDN_PRIMARY = 'https://esm.sh/@pixiv/three-vrm@3.5.4?deps=three@0.169.0'
const VRM_CDN_FALLBACK = 'https://esm.run/@pixiv/three-vrm@3.5.4'

async function dynamicImportWithFallback<T>(primary: string, fallback: string): Promise<T> {
  try {
    return await import(/* @vite-ignore */ primary)
  } catch {
    return await import(/* @vite-ignore */ fallback)
  }
}

// three-vrm 模块实例（不进入响应式）
let THREE: any = null
let VRM: any = null
let GLTFLoader: any = null

// ===================== Three.js 场景对象 =====================
let renderer: any = null
let scene: any = null
let camera: any = null
let clock: any = null
let vrm: any = null
let animationId: number | null = null

// HMR 竞态保护：onBeforeUnmount 设为 true，阻止 onMounted 异步流程继续执行
let cancelled = false

// ===================== VRM 语音状态订阅 =====================
let speechState = { isSpeaking: false, pendingText: '', audioSpeaking: false, audioText: '' }
const unsubscribeVrmSpeech = subscribeVrmSpeech((s) => {
  speechState = s
})

// ===================== 口型同步状态 =====================
const MOUTH_VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'] as const
const CONSUME_RATE = 14 // 字符/秒
let charAccumulator = 0
let targetViseme: string | null = null
let targetValue = 0

// 字符 → viseme 映射（英文元音 + 常见中文拼音韵母对应字）
const VISEME_MAP: Record<string, string> = {
  // 英文元音
  a: 'aa', A: 'aa',
  e: 'ee', E: 'ee',
  i: 'ih', I: 'ih',
  o: 'oh', O: 'oh',
  u: 'ou', U: 'ou',
  // 常见中文开口音字
  '啊': 'aa', '阿': 'aa', '呀': 'aa', '哇': 'aa', '哈': 'aa', '妈': 'aa', '大': 'aa',
  // 常见中文齐齿音字
  '衣': 'ih', '期': 'ih', '里': 'ih', '你': 'ih', '一': 'ih', '七': 'ih',
  // 常见中文合口音字
  '乌': 'ou', '书': 'ou', '出': 'ou', '如': 'ou', '无': 'ou', '五': 'ou',
  // 常见中文齐齿音字（e 类）
  '鹅': 'ee', '客': 'ee', '的': 'ee', '和': 'ee',
  // 常见中文圆唇音字
  '哦': 'oh', '波': 'oh', '多': 'oh', '罗': 'oh', '我': 'oh',
}

function mapCharToViseme(char: string): string | null {
  return VISEME_MAP[char] || null
}

// ===================== 待机动画状态 =====================
let nextBlinkTime = 3 + Math.random() * 2
let blinkPhase: 'idle' | 'closing' | 'opening' = 'idle'
let blinkStartTime = 0

// ===================== CDN 模块加载（不依赖 canvas） =====================
async function loadCDNModules() {
  loadingLabel.value = t('ai.vrmLoading')

  // 1. THREE
  THREE = await dynamicImportWithFallback<any>(THREE_CDN_PRIMARY, THREE_CDN_FALLBACK)
  if (!THREE.Scene) throw new Error('THREE module invalid: missing Scene')

  // 2. GLTFLoader — 尝试多种提取路径
  const gltfModule = await dynamicImportWithFallback<any>(GLTF_CDN_PRIMARY, GLTF_CDN_FALLBACK)
  GLTFLoader =
    gltfModule.GLTFLoader ||
    gltfModule.default?.GLTFLoader ||
    gltfModule.default ||
    (typeof gltfModule === 'function' ? gltfModule : null)
  if (!GLTFLoader || typeof GLTFLoader !== 'function') {
    throw new Error('Failed to load GLTFLoader')
  }

  // 3. VRM
  VRM = await dynamicImportWithFallback<any>(VRM_CDN_PRIMARY, VRM_CDN_FALLBACK)
  if (!VRM.VRMLoaderPlugin) {
    if (VRM.default?.VRMLoaderPlugin) {
      VRM = VRM.default
    } else {
      throw new Error('VRM module invalid: missing VRMLoaderPlugin')
    }
  }
}

// ===================== Three.js 场景初始化（依赖 canvas + CDN 模块） =====================
async function initScene() {
  const canvas = canvasRef.value
  if (!canvas) throw new Error('Canvas element not available')
  if (!THREE) throw new Error('THREE not loaded')

  // 检测 WebGL 支持
  const testCanvas = document.createElement('canvas')
  const testGl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')
  if (!testGl) throw new Error(t('ai.vrmWebglNotSupported'))

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(300, 400, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(30, 300 / 400, 0.1, 20)
  camera.position.set(0, 1.35, 1.5)
  camera.lookAt(0, 1.35, 0)

  // Lights — 多光源保证 VRM MToon 材质充分受光
  const ambient = new THREE.AmbientLight(0xffffff, 1.2)
  scene.add(ambient)

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x999999, 1.5)
  hemiLight.position.set(0, 1, 0)
  scene.add(hemiLight)

  // 正面主光（直射面部）
  const dirLight = new THREE.DirectionalLight(0xffffff, 3.0)
  dirLight.position.set(0, 1.4, 3)
  scene.add(dirLight)

  // 侧面补光
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight2.position.set(2, 1.5, 1)
  scene.add(dirLight2)

  const dirLight3 = new THREE.DirectionalLight(0xffffff, 1.0)
  dirLight3.position.set(-2, 1.2, 1)
  scene.add(dirLight3)

  // Clock
  clock = new THREE.Clock()
}

// ===================== VRM 模型加载 =====================
async function loadVRMModel() {
  // 安全网：如果 GLTFLoader 为空（HMR 竞态等），重新从 CDN 加载
  if (!GLTFLoader || typeof GLTFLoader !== 'function') {
    const m = await dynamicImportWithFallback<any>(GLTF_CDN_PRIMARY, GLTF_CDN_FALLBACK)
    GLTFLoader = m.GLTFLoader || m.default?.GLTFLoader || m.default || (typeof m === 'function' ? m : null)
  }
  if (!GLTFLoader || typeof GLTFLoader !== 'function') {
    throw new Error(`GLTFLoader is not a constructor (type: ${typeof GLTFLoader})`)
  }

  // 安全网：如果 VRM 为空，重新从 CDN 加载
  if (!VRM || !VRM.VRMLoaderPlugin) {
    VRM = await dynamicImportWithFallback<any>(VRM_CDN_PRIMARY, VRM_CDN_FALLBACK)
    if (!VRM.VRMLoaderPlugin && VRM.default?.VRMLoaderPlugin) VRM = VRM.default
  }
  if (!VRM || !VRM.VRMLoaderPlugin) throw new Error('VRM module invalid: missing VRMLoaderPlugin')
  if (!scene) throw new Error('Scene not initialized')

  const loader = new GLTFLoader()
  loader.register((parser: any) => new VRM.VRMLoaderPlugin(parser))

  const gltf = await loader.loadAsync(props.modelUrl)
  vrm = gltf.userData.vrm
  if (!vrm) throw new Error('Invalid VRM model: no vrm in userData')

  // 优化（VRMUtils 内部可能 traverse 场景图，包裹 try-catch 避免偶发失败）
  try {
    VRM.VRMUtils?.removeUnnecessaryVertices?.(gltf.scene)
    VRM.VRMUtils?.combineSkeletons?.(vrm)
  } catch { /* HMR 后偶发 traverse 失败，忽略 */ }

  // VRM 模型面向相机
  scene.add(vrm.scene)

  // 手臂自然下垂（VRM 默认 T-pose，旋转大臂+小臂到放松位置）
  const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode?.('leftUpperArm')
  const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode?.('rightUpperArm')
  const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode?.('leftLowerArm')
  const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode?.('rightLowerArm')
  if (leftUpperArm) leftUpperArm.rotation.z = -1.3
  if (rightUpperArm) rightUpperArm.rotation.z = 1.3
  if (leftLowerArm) leftLowerArm.rotation.y = -0.3
  if (rightLowerArm) rightLowerArm.rotation.y = 0.3

  // 提亮 MToon 材质阴影色（减少面部暗部对比）
  vrm.scene.traverse((obj: any) => {
    const mat = obj.material
    if (mat && mat.isMToonMaterial) {
      // shadeColorFactor 控制阴影区域颜色，提亮到 0.7 让暗部不再死黑
      if (mat.shadeColorFactor) {
        mat.shadeColorFactor.set(0.7, 0.65, 0.65)
      }
      // 增加环境光贡献（parametricRimLightingMixFactor / shadeMultiplier）
      if (mat.shadeMultiplier !== undefined) mat.shadeMultiplier = 0.8
    }
  })

  // 初始放松表情
  vrm.expressionManager?.setValue('relaxed', 0.15)
}

// ===================== 动画循环 =====================
function animate() {
  if (cancelled || !clock) return
  animationId = requestAnimationFrame(animate)

  if (!vrm || !renderer || !scene || !camera) return

  const delta = clock.getDelta()
  const time = clock.elapsedTime

  applyIdleAnimations(time)
  applyLipSync(delta)

  try {
    vrm.update(delta)
  } catch { /* HMR 后偶发失败 */ }

  try {
    renderer.render(scene, camera)
  } catch { /* HMR 后偶发失败 */ }
}

// ===================== 待机动画 =====================
// 说话手势强度（0=静止下垂, 1=说话手势），平滑过渡
let speakGestureIntensity = 0

function applyIdleAnimations(time: number) {
  if (!vrm) return

  // 呼吸：spine 轻微前倾
  const spine = vrm.humanoid?.getNormalizedBoneNode?.('spine')
  if (spine) {
    spine.rotation.x = Math.sin(time * 0.8) * 0.02
  }

  // 头部摆动
  const head = vrm.humanoid?.getNormalizedBoneNode?.('head')
  if (head) {
    head.rotation.y = Math.sin(time * 0.3) * 0.05
    head.rotation.x = Math.sin(time * 0.2) * 0.03
  }

  // 说话手势
  applySpeakingGestures(time)

  applyBlink(time)
}

// ===================== 说话手势 =====================
// 思路：说话时把双手从「自然下垂」平滑过渡到「抱在胸前」——
// 双手抬至胸前中线附近（不向两侧张开、不交叉），掌心/手指朝前方（朝向观众）而非自己胸部。
// 然后在胸前位置做细微手势（小幅起伏、手腕轻转、偶发强调），不做左右晃动。
// 静默时平滑回到下垂姿势。
function applySpeakingGestures(time: number) {
  // 目标强度：说话时趋向 1，静默时趋向 0（由 LLM 文本流驱动，与口型音频通道独立）
  const target = (speechState.isSpeaking || speechState.pendingText) ? 1 : 0
  speakGestureIntensity += (target - speakGestureIntensity) * 0.06

  const leftUpperArm = vrm?.humanoid?.getNormalizedBoneNode?.('leftUpperArm')
  const rightUpperArm = vrm?.humanoid?.getNormalizedBoneNode?.('rightUpperArm')
  const leftLowerArm = vrm?.humanoid?.getNormalizedBoneNode?.('leftLowerArm')
  const rightLowerArm = vrm?.humanoid?.getNormalizedBoneNode?.('rightLowerArm')
  const leftHand = vrm?.humanoid?.getNormalizedBoneNode?.('leftHand')
  const rightHand = vrm?.humanoid?.getNormalizedBoneNode?.('rightHand')
  if (!leftUpperArm || !rightUpperArm) return

  const i = speakGestureIntensity

  // 静止下垂姿势（与 loadVRMModel 中设定一致）
  const restUpperZ = 1.3     // |Z|=1.3 → 大臂下垂
  const restUpperX = 0
  const restLowerY = 0.3     // 小臂微弯
  const restHandZ = 0
  const restHandY = 0

  // 抱在胸前姿势目标：
  const chestUpperZ = 0.55   // 大臂抬起（|Z| 1.3 → 0.55，约 43°），不过度外张
  const chestUpperX = -0.6   // 大臂前摆，肘部朝前，双手落到身前而非两侧
  const chestLowerY = 0.9    // 小臂内收，把双手带到胸前中线（不过度内旋，避免掌心朝胸）
  const chestHandZ = 0.1     // 手腕微翘
  // 手腕绕小臂长轴旋转，让掌心/手指朝前方（朝观众）而非自己胸部
  // 左右符号相反；若实际朝向不对，把这两个符号翻转即可
  const chestHandYL = -1.1
  const chestHandYR = 1.1

  // 线性插值：i=0 完全下垂，i=1 完全抱在胸前
  const upperZ = restUpperZ + (chestUpperZ - restUpperZ) * i
  const upperX = restUpperX + (chestUpperX - restUpperX) * i
  const lowerY = restLowerY + (chestLowerY - restLowerY) * i
  const handZ = restHandZ + (chestHandZ - restHandZ) * i
  const handYL = restHandY + (chestHandYL - restHandY) * i
  const handYR = restHandY + (chestHandYR - restHandY) * i

  // 胸前位置的细微手势（乘以 i，静默时归零；左右频率/相位错开更自然）
  const bobL = Math.sin(time * 2.0) * 0.05
  const bobR = Math.sin(time * 1.6 + 1.1) * 0.04
  // 偶发强调（低频脉冲）：双手短暂上抬一点再落回
  const pulse = Math.max(0, Math.sin(time * 0.7)) * 0.06
  // 手腕轻微转动（像在比划）
  const twistL = Math.sin(time * 1.8 + 0.3) * 0.06
  const twistR = Math.sin(time * 1.5 + 1.5) * 0.05

  // 大臂 Z：左负右正；强调时 |Z| 减小（更抬）
  leftUpperArm.rotation.z = -(upperZ - pulse * i)
  rightUpperArm.rotation.z = upperZ - pulse * i
  // 大臂 X：前摆 + 上下起伏
  leftUpperArm.rotation.x = upperX - pulse * 0.5 * i + bobL * i
  rightUpperArm.rotation.x = upperX - pulse * 0.5 * i + bobR * i

  // 小臂 Y：内收 + 轻微起伏（左右交叉，避免完全同步）
  if (leftLowerArm) leftLowerArm.rotation.y = -lowerY + bobR * 0.5 * i
  if (rightLowerArm) rightLowerArm.rotation.y = lowerY - bobL * 0.5 * i

  // 手腕：掌心朝前（Y 旋转）+ 翘起/转动（Z）+ 上下轻摆（X）
  if (leftHand) {
    leftHand.rotation.y = handYL + twistL * 0.3 * i
    leftHand.rotation.z = handZ + twistL * i
    leftHand.rotation.x = Math.sin(time * 1.3) * 0.08 * i
  }
  if (rightHand) {
    rightHand.rotation.y = handYR - twistR * 0.3 * i
    rightHand.rotation.z = -handZ - twistR * i
    rightHand.rotation.x = Math.sin(time * 1.1 + 0.9) * 0.08 * i
  }
}

function applyBlink(time: number) {
  const em = vrm?.expressionManager
  if (!em) return

  if (time > nextBlinkTime && blinkPhase === 'idle') {
    blinkPhase = 'closing'
    blinkStartTime = time
  }

  if (blinkPhase === 'closing') {
    const progress = (time - blinkStartTime) / 0.075
    em.setValue('blink', Math.min(progress, 1))
    if (progress >= 1) {
      blinkPhase = 'opening'
      blinkStartTime = time
    }
  } else if (blinkPhase === 'opening') {
    const progress = (time - blinkStartTime) / 0.075
    em.setValue('blink', Math.max(1 - progress, 0))
    if (progress >= 1) {
      blinkPhase = 'idle'
      nextBlinkTime = time + 3 + Math.random() * 2
    }
  }
}

// ===================== 口型同步（仅跟随 TTS 音频） =====================
function applyLipSync(delta: number) {
  const em = vrm?.expressionManager
  if (!em) return

  // 口型只跟随真实播放的语音，不跟随 LLM 文本流
  if (speechState.audioSpeaking || speechState.audioText) {
    charAccumulator += delta * CONSUME_RATE
    const n = Math.floor(charAccumulator)
    if (n > 0) {
      charAccumulator -= n
      const consumed = consumeVrmAudioChars(n)
      for (const char of consumed) {
        const viseme = mapCharToViseme(char)
        if (viseme) {
          targetViseme = viseme
          targetValue = 0.9
        }
        if (char === ' ' || char === ',' || char === '.' || char === '!' || char === '?' || char === '\n') {
          targetValue = 0.1
        }
      }
      if (!speechState.audioText) targetValue = 0
    }
  } else {
    targetViseme = null
    targetValue = 0
  }

  for (const viseme of MOUTH_VISEMES) {
    const current = em.getValue(viseme) || 0
    const target = (viseme === targetViseme) ? targetValue : 0
    const lerpFactor = (viseme === targetViseme && target > current) ? 0.4 : 0.15
    const next = current + (target - current) * lerpFactor
    em.setValue(viseme, Math.abs(next) < 0.001 ? 0 : next)
  }
}

// ===================== 生命周期 =====================
onMounted(async () => {
  try {
    loadState.value = 'loading'
    loadingLabel.value = t('ai.vrmLoading')

    // 1. 加载 CDN 模块（不依赖 canvas）
    await loadCDNModules()
    if (cancelled) return

    // 2. 初始化 Three.js 场景（依赖 canvas + CDN 模块）
    await nextTick()
    await initScene()
    if (cancelled) return

    // 3. 加载 VRM 模型
    await loadVRMModel()
    if (cancelled) return

    loadState.value = 'ready'
    emit('loaded')

    clock.start()
    animate()
  } catch (e: any) {
    if (cancelled) return
    errorMsg.value = e?.message || t('ai.vrmLoadFailed')
    loadState.value = 'error'
    emit('error', errorMsg.value)
  }
})

onBeforeUnmount(() => {
  cancelled = true

  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  unsubscribeVrmSpeech()

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
    renderer = null
  }

  // 清理场景（traverse 内部递归调用子节点 traverse，HMR 后子节点可能失效）
  if (scene && typeof scene.traverse === 'function') {
    try {
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose?.()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m.dispose?.())
          } else {
            obj.material.dispose?.()
          }
        }
      })
    } catch { /* HMR/卸载时序问题，忽略 */ }
  }
  scene = null
  vrm = null
  clock = null

  // ⚠️ 不清空 THREE / VRM / GLTFLoader：
  // 清空会导致 HMR 时 onMounted 异步流程读到 null（竞态条件）
})
</script>
