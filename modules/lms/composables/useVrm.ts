import { subscribeVrmSpeech, consumeVrmAudioChars } from '../utils/vrm'

export interface VrmProps {
  /** VRM model URL, defaults to the three-vrm official sample model */
  modelUrl?: string
}

/**
 * VRM 3D digital human component logic
 *
 * Loads three + three-vrm via CDN, idle animation + text-driven lip sync
 *
 * Key behaviors (user requirements, do not change):
 * - Arm/hand movements are disabled, only natural rest pose is retained
 * - When not speaking, the face keeps a smile (happy=0.4), weakens when speaking (0.12) to yield to viseme lip sync
 * - Lip sync only follows TTS audio (speechState.audioSpeaking), does not follow LLM text stream
 * - HMR race protection: cancelled flag stops the onMounted async flow; does not clear THREE/VRM/GLTFLoader
 */
export function useVrm(props: VrmProps, emit: (event: string, ...args: any[]) => void) {
  const { t } = useI18n()

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const loadState = ref<'loading' | 'ready' | 'error'>('loading')
  const loadingLabel = ref(t('ai.vrmLoading'))
  const errorMsg = ref('')

  function close() {
    emit('close')
  }

  // ===================== CDN loading three + three-vrm =====================
  // Dual CDN fallback: esm.sh (primary) → esm.run (jsdelivr's ESM CDN, backup)
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

  // three-vrm module instances (do not enter reactivity)
  let THREE: any = null
  let VRM: any = null
  let GLTFLoader: any = null

  // ===================== Three.js scene objects =====================
  let renderer: any = null
  let scene: any = null
  let camera: any = null
  let clock: any = null
  let vrm: any = null
  let animationId: number | null = null

  // HMR race protection: set to true in onBeforeUnmount, stops the onMounted async flow from continuing
  let cancelled = false

  // ===================== VRM speech state subscription =====================
  let speechState = { isSpeaking: false, pendingText: '', audioSpeaking: false, audioText: '' }
  const unsubscribeVrmSpeech = subscribeVrmSpeech((s) => {
    speechState = s
  })

  // ===================== Lip sync state =====================
  const MOUTH_VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'] as const
  const CONSUME_RATE = 14 // chars per second
  let charAccumulator = 0
  let targetViseme: string | null = null
  let targetValue = 0

  // char → viseme mapping (English vowels + common Chinese pinyin finals)
  const VISEME_MAP: Record<string, string> = {
    // English vowels
    a: 'aa', A: 'aa',
    e: 'ee', E: 'ee',
    i: 'ih', I: 'ih',
    o: 'oh', O: 'oh',
    u: 'ou', U: 'ou',
    // Common Chinese open-mouth sounds
    '啊': 'aa', '阿': 'aa', '呀': 'aa', '哇': 'aa', '哈': 'aa', '妈': 'aa', '大': 'aa',
    // Common Chinese level-mouth sounds
    '衣': 'ih', '期': 'ih', '里': 'ih', '你': 'ih', '一': 'ih', '七': 'ih',
    // Common Chinese rounded-mouth sounds
    '乌': 'ou', '书': 'ou', '出': 'ou', '如': 'ou', '无': 'ou', '五': 'ou',
    // Common Chinese level-mouth sounds (e category)
    '鹅': 'ee', '客': 'ee', '的': 'ee', '和': 'ee',
    // Common Chinese rounded-lip sounds
    '哦': 'oh', '波': 'oh', '多': 'oh', '罗': 'oh', '我': 'oh',
  }

  function mapCharToViseme(char: string): string | null {
    return VISEME_MAP[char] || null
  }

  // ===================== Idle animation state =====================
  let nextBlinkTime = 3 + Math.random() * 2
  let blinkPhase: 'idle' | 'closing' | 'opening' = 'idle'
  let blinkStartTime = 0

  // ===================== CDN module loading (does not depend on canvas) =====================
  async function loadCDNModules() {
    loadingLabel.value = t('ai.vrmLoading')

    // 1. THREE
    THREE = await dynamicImportWithFallback<any>(THREE_CDN_PRIMARY, THREE_CDN_FALLBACK)
    if (!THREE.Scene) throw new Error('THREE module invalid: missing Scene')

    // 2. GLTFLoader — try multiple extraction paths
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

  // ===================== Three.js scene initialization (depends on canvas + CDN modules) =====================
  async function initScene() {
    const canvas = canvasRef.value
    if (!canvas) throw new Error('Canvas element not available')
    if (!THREE) throw new Error('THREE not loaded')

    // Detect WebGL support
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

    // Lights — multiple light sources to ensure the VRM MToon material is fully lit
    const ambient = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambient)

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x999999, 1.5)
    hemiLight.position.set(0, 1, 0)
    scene.add(hemiLight)

    // Front main light (directly illuminating the face)
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0)
    dirLight.position.set(0, 1.4, 3)
    scene.add(dirLight)

    // Side fill light
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight2.position.set(2, 1.5, 1)
    scene.add(dirLight2)

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight3.position.set(-2, 1.2, 1)
    scene.add(dirLight3)

    // Clock
    clock = new THREE.Clock()
  }

  // ===================== VRM model loading =====================
  async function loadVRMModel() {
    // Safety net: if GLTFLoader is null (HMR race, etc.), reload from CDN
    if (!GLTFLoader || typeof GLTFLoader !== 'function') {
      const m = await dynamicImportWithFallback<any>(GLTF_CDN_PRIMARY, GLTF_CDN_FALLBACK)
      GLTFLoader = m.GLTFLoader || m.default?.GLTFLoader || m.default || (typeof m === 'function' ? m : null)
    }
    if (!GLTFLoader || typeof GLTFLoader !== 'function') {
      throw new Error(`GLTFLoader is not a constructor (type: ${typeof GLTFLoader})`)
    }

    // Safety net: if VRM is null, reload from CDN
    if (!VRM || !VRM.VRMLoaderPlugin) {
      VRM = await dynamicImportWithFallback<any>(VRM_CDN_PRIMARY, VRM_CDN_FALLBACK)
      if (!VRM.VRMLoaderPlugin && VRM.default?.VRMLoaderPlugin) VRM = VRM.default
    }
    if (!VRM || !VRM.VRMLoaderPlugin) throw new Error('VRM module invalid: missing VRMLoaderPlugin')
    if (!scene) throw new Error('Scene not initialized')

    const loader = new GLTFLoader()
    loader.register((parser: any) => new VRM.VRMLoaderPlugin(parser))

    const gltf = await loader.loadAsync(props.modelUrl!)
    vrm = gltf.userData.vrm
    if (!vrm) throw new Error('Invalid VRM model: no vrm in userData')

    // Optimization (VRMUtils may internally traverse the scene graph, wrap with try-catch to avoid occasional failures)
    try {
      VRM.VRMUtils?.removeUnnecessaryVertices?.(gltf.scene)
      VRM.VRMUtils?.combineSkeletons?.(vrm)
    } catch { /* Occasional traverse failure after HMR, ignored */ }

    // VRM model facing the camera
    scene.add(vrm.scene)

    // Arms naturally lowered (VRM defaults to T-pose, rotate upper/lower arms to a relaxed position)
    const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode?.('leftUpperArm')
    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode?.('rightUpperArm')
    const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode?.('leftLowerArm')
    const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode?.('rightLowerArm')
    if (leftUpperArm) leftUpperArm.rotation.z = -1.3
    if (rightUpperArm) rightUpperArm.rotation.z = 1.3
    if (leftLowerArm) leftLowerArm.rotation.y = -0.3
    if (rightLowerArm) rightLowerArm.rotation.y = 0.3

    // Brighten MToon material shadow color (reduce dark contrast on the face)
    vrm.scene.traverse((obj: any) => {
      const mat = obj.material
      if (mat && mat.isMToonMaterial) {
        // shadeColorFactor controls the shadow area color, brighten to 0.7 so dark areas aren't pitch black
        if (mat.shadeColorFactor) {
          mat.shadeColorFactor.set(0.7, 0.65, 0.65)
        }
        // Increase ambient light contribution (parametricRimLightingMixFactor / shadeMultiplier)
        if (mat.shadeMultiplier !== undefined) mat.shadeMultiplier = 0.8
      }
    })

    // Initial smile expression (more pronounced when silent, dynamically adjusted by applySmile when speaking)
    vrm.expressionManager?.setValue('happy', 0.4)
    vrm.expressionManager?.setValue('relaxed', 0.1)
  }

  // ===================== Animation loop =====================
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
    } catch { /* Occasional failure after HMR */ }

    try {
      renderer.render(scene, camera)
    } catch { /* Occasional failure after HMR */ }
  }

  // ===================== Idle animation =====================
  // Smile intensity (smooth transition: pronounced when silent, weakens when speaking to yield to viseme lip sync)
  let smileIntensity = 0.4

  function applyIdleAnimations(time: number) {
    if (!vrm) return

    // Breathing: spine tilts forward slightly
    const spine = vrm.humanoid?.getNormalizedBoneNode?.('spine')
    if (spine) {
      spine.rotation.x = Math.sin(time * 0.8) * 0.02
    }

    // Head sway
    const head = vrm.humanoid?.getNormalizedBoneNode?.('head')
    if (head) {
      head.rotation.y = Math.sin(time * 0.3) * 0.05
      head.rotation.x = Math.sin(time * 0.2) * 0.03
    }

    // Smile: face keeps a smile (no hand movements involved)
    applySmile()

    applyBlink(time)
  }

  // ===================== Smile =====================
  // Keep a pronounced smile when silent, weaken when speaking to avoid conflict with viseme lip sync
  function applySmile() {
    const em = vrm?.expressionManager
    if (!em) return
    // When speaking (TTS audio playing), weaken the smile to let viseme lip sync dominate
    const target = (speechState.audioSpeaking || speechState.audioText) ? 0.12 : 0.4
    smileIntensity += (target - smileIntensity) * 0.08
    em.setValue('happy', smileIntensity)
    em.setValue('relaxed', 0.1)
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

  // ===================== Lip sync (only follows TTS audio) =====================
  function applyLipSync(delta: number) {
    const em = vrm?.expressionManager
    if (!em) return

    // Lip sync only follows the actually playing speech, not the LLM text stream
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

  // ===================== Lifecycle =====================
  onMounted(async () => {
    try {
      loadState.value = 'loading'
      loadingLabel.value = t('ai.vrmLoading')

      // 1. Load CDN modules (does not depend on canvas)
      await loadCDNModules()
      if (cancelled) return

      // 2. Initialize Three.js scene (depends on canvas + CDN modules)
      await nextTick()
      await initScene()
      if (cancelled) return

      // 3. Load VRM model
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

    // Clean up the scene (traverse internally recursively calls children's traverse, children may be invalid after HMR)
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
      } catch { /* HMR/unmount timing issue, ignored */ }
    }
    scene = null
    vrm = null
    clock = null

    // ⚠️ Do not clear THREE / VRM / GLTFLoader:
    // Clearing would cause the onMounted async flow to read null during HMR (race condition)
  })

  return { canvasRef, loadState, loadingLabel, errorMsg, t, close }
}
