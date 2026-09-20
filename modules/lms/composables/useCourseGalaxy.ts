import type { Ref, ComputedRef } from 'vue'
import { buildGalaxyModel, GALAXY_SOURCE_COLORS, type GalaxyModel } from '../utils/galaxy'

/**
 * 课程「知识星系」3D 可视化（three.js）
 *
 * 用同一套 CDN 按需加载机制（esm.sh 主 / jsdelivr +esm 备）拉取 three，
 * 把课程结构渲染成一座可旋转的星系：
 *   - 核心球体   = 课程本身
 *   - 螺旋上的节点 = 各章节（按文档顺序，已通过=金色 / 未通过=蓝色）
 *   - 外层球壳节点 = 标签（按来源配色、按出现次数定大小）
 *   - 连线       = 标签 → 引用它的章节（无归属则连核心）
 *
 * 交互：拖拽旋转、滚轮缩放、悬停高亮、点击查看详情（弹 HTML 信息卡）。
 * 数据源：/api/courses/galaxy?courseId=...（所有登录用户可读）。
 */

export type GalaxyNodeKind = 'core' | 'chapter' | 'tag'

export interface GalaxySelection {
  kind: GalaxyNodeKind
  title: string
  tags: string[]
  chapterId?: number
  chapterIsPass?: boolean
  chapterIsOpen?: boolean
  tagCount?: number
  tagSources?: string[]
}

const THREE_VERSION = 'three@0.169.0'
const DIST_MIN = 14
const DIST_MAX = 74

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function truncate(text: string, max: number): string {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

export function useCourseGalaxy(courseId: Ref<number | string> | ComputedRef<number | string>) {
  const { t } = useI18n()

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const state = ref<'loading' | 'ready' | 'error'>('loading')
  const errorMsg = ref('')
  const summary = ref<{ title: string, tags: string[] }>({ title: '', tags: [] })
  const totals = ref<{ chapters: number, tags: number, contents: number }>({ chapters: 0, tags: 0, contents: 0 })
  const legend = ref<{ key: string, color: string }[]>([])
  const selected = ref<GalaxySelection | null>(null)
  const hover = ref<{ x: number, y: number, text: string } | null>(null)

  const empty = computed(() => totals.value.chapters === 0 && totals.value.tags === 0)

  const THREE_PRIMARY = esmAsset(THREE_VERSION)
  const THREE_FALLBACK = npmEsmAsset(THREE_VERSION)

  // 非响应式的 three 对象
  let THREE: any = null
  let renderer: any = null
  let scene: any = null
  let camera: any = null
  let root: any = null
  let stars: any = null
  let glow: any = null
  let raycaster: any = null
  let pointer: any = null
  let clock: any = null
  let glowScale = 0

  const pickables: { mesh: any, sel: GalaxySelection }[] = []

  let rafId: number | null = null
  let cancelled = false
  let ready = false

  // 视角（球坐标）
  let theta = 0.7
  let phi = 1.02
  let dist = 36
  let dragging = false
  let moved = false
  let lastX = 0
  let lastY = 0

  // ===================== 基础工具 =====================
  function updateCamera() {
    if (!camera) return
    const sinPhi = Math.sin(phi)
    camera.position.set(
      dist * sinPhi * Math.sin(theta),
      dist * Math.cos(phi),
      dist * sinPhi * Math.cos(theta),
    )
    camera.lookAt(0, 0, 0)
  }

  function resize() {
    if (!renderer || !camera) return
    const w = window.innerWidth
    const h = Math.max(1, window.innerHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  /** 文字精灵（章节/课程标题） */
  function makeLabel(text: string, color: string, scale: number) {
    const fs = 40
    const pad = 14
    const font = `600 ${fs}px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`
    const canvas = document.createElement('canvas')
    let ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = font
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2
    const h = fs + pad * 2
    canvas.width = w
    canvas.height = h
    ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = font
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 10
    ctx.fillText(text, pad, h / 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set((w / h) * scale, scale, 1)
    sprite.renderOrder = 20
    return sprite
  }

  /** 核心的柔光贴图精灵 */
  function makeGlowSprite(size: number, colorHex: number, opacity: number) {
    const s = 256
    const canvas = document.createElement('canvas')
    canvas.width = s
    canvas.height = s
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const col = new THREE.Color(colorHex)
      const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      g.addColorStop(0, `rgba(${rgb},0.95)`)
      g.addColorStop(0.35, `rgba(${rgb},0.35)`)
      g.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, s, s)
    }
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(size, size, 1)
    return sprite
  }

  /** 背景星空 */
  function makeStars(count: number) {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 90 + Math.random() * 130
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = r * Math.cos(ph)
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({ color: 0xbcd3ff, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false })
    return new THREE.Points(geo, mat)
  }

  function disposeGroup(group: any) {
    if (!group || typeof group.traverse !== 'function') return
    try {
      group.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose?.()
        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : [])
        for (const m of mats) {
          if (m.map) m.map.dispose?.()
          m.dispose?.()
        }
      })
    } catch { /* 卸载时序问题，忽略 */ }
  }

  // ===================== 加载 three 与数据 =====================
  async function loadThree() {
    try {
      THREE = await import(/* @vite-ignore */ THREE_PRIMARY)
    } catch {
      THREE = await import(/* @vite-ignore */ THREE_FALLBACK)
    }
    if (!THREE || !THREE.Scene) throw new Error(t('course3d.loadFailed'))
  }

  function initRenderer(): boolean {
    const canvas = canvasRef.value
    if (!canvas || !THREE) return false
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x05070f, 1)

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x05070f, 0.011)

    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500)
    raycaster = new THREE.Raycaster()
    pointer = new THREE.Vector2()
    clock = new THREE.Clock()

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const coreLight = new THREE.PointLight(0xa78bfa, 90, 90, 2)
    coreLight.position.set(0, 0, 0)
    scene.add(coreLight)
    const key = new THREE.DirectionalLight(0x93c5fd, 1.1)
    key.position.set(12, 18, 14)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xf0abfc, 0.6)
    rim.position.set(-14, -10, -12)
    scene.add(rim)

    stars = makeStars(900)
    scene.add(stars)

    resize()
    return true
  }

  /** 依据模型搭建/重建星系内容 */
  function buildScene(m: GalaxyModel) {
    if (!THREE || !scene) return
    if (root) {
      scene.remove(root)
      disposeGroup(root)
    }
    root = new THREE.Group()
    scene.add(root)
    pickables.length = 0

    // 核心
    const coreGeo = new THREE.IcosahedronGeometry(m.core.radius, 3)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, emissive: 0x7c3aed, emissiveIntensity: 1.15, roughness: 0.32, metalness: 0.25,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    core.userData.baseY = 0
    core.userData.phase = 0
    root.add(core)
    pickables.push({ mesh: core, sel: { kind: 'core', title: m.core.title, tags: m.core.tags } })

    glow = makeGlowSprite(6.4, 0x8b5cf6, 0.6)
    glowScale = 6.4
    root.add(glow)

    if (m.core.title) {
      const label = makeLabel(m.core.title, '#ede9fe', 1.15)
      if (label) {
        label.position.set(0, m.core.radius + 2.2, 0)
        root.add(label)
      }
    }

    // 章节（螺旋）
    m.chapters.forEach((c, i) => {
      const geo = new THREE.OctahedronGeometry(c.radius, 0)
      const mat = new THREE.MeshStandardMaterial({
        color: c.color, emissive: c.color, emissiveIntensity: 0.55,
        roughness: 0.4, metalness: 0.25, transparent: true, opacity: c.isOpen ? 1 : 0.5,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(c.pos[0], c.pos[1], c.pos[2])
      mesh.userData.baseY = c.pos[1]
      mesh.userData.phase = i * 1.3
      root.add(mesh)
      pickables.push({
        mesh,
        sel: {
          kind: 'chapter', title: c.title, tags: c.tags,
          chapterId: c.id, chapterIsPass: c.isPass, chapterIsOpen: c.isOpen,
        },
      })
      const label = makeLabel(`${i + 1}. ${truncate(c.title, 18)}`, c.isPass ? '#fde68a' : '#bfdbfe', 0.72)
      if (label) {
        label.position.set(0, c.radius + 1.0, 0)
        mesh.add(label)
      }
    })

    // 标签（外层球壳）
    m.tags.forEach((tg, i) => {
      const geo = new THREE.SphereGeometry(tg.radius, 18, 14)
      const mat = new THREE.MeshStandardMaterial({
        color: tg.color, emissive: tg.color, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(tg.pos[0], tg.pos[1], tg.pos[2])
      mesh.userData.baseY = tg.pos[1]
      mesh.userData.phase = 2 + i * 0.7
      root.add(mesh)
      pickables.push({
        mesh,
        sel: { kind: 'tag', title: tg.tag, tags: [tg.tag], tagCount: tg.count, tagSources: tg.sources },
      })
    })

    // 连线（标签 → 章节 / 核心）
    if (m.links.length) {
      const positions: number[] = []
      const colors: number[] = []
      const col = new THREE.Color()
      for (const l of m.links) {
        positions.push(l.from[0], l.from[1], l.from[2], l.to[0], l.to[1], l.to[2])
        col.set(l.color)
        colors.push(col.r, col.g, col.b, col.r, col.g, col.b)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.26 })
      root.add(new THREE.LineSegments(geo, mat))
    }
  }

  function applyPayload(resp: any) {
    const m = buildGalaxyModel(resp)
    summary.value = { title: m.core.title, tags: m.core.tags }
    totals.value = {
      chapters: Number(resp?.totals?.chapters) || m.chapters.length,
      tags: Number(resp?.totals?.tags) || m.tags.length,
      contents: Number(resp?.totals?.contents) || 0,
    }
    legend.value = m.usedSources.map(k => ({ key: k, color: GALAXY_SOURCE_COLORS[k] }))
    buildScene(m)
  }

  async function load() {
    state.value = 'loading'
    errorMsg.value = ''
    try {
      const cid = Number(toValue(courseId)) || 0
      if (!cid) throw new Error(t('course3d.loadFailed'))
      const resp = await cRequest<any>('/api/courses/galaxy', { query: { courseId: cid } })
      if (cancelled) return
      applyPayload(resp)
      state.value = 'ready'
    } catch (e: any) {
      if (cancelled) return
      errorMsg.value = e?.message || t('course3d.loadFailed')
      state.value = 'error'
    }
  }

  // ===================== 渲染循环 =====================
  function animate() {
    if (cancelled) return
    rafId = requestAnimationFrame(animate)
    if (!ready || !renderer || !scene || !camera) return
    const dt = clock.getDelta()
    const time = clock.elapsedTime

    if (root && !dragging) root.rotation.y += dt * 0.06
    for (const p of pickables) {
      const m = p.mesh
      if (m.userData.baseY != null) {
        m.position.y = m.userData.baseY + Math.sin(time * 0.9 + m.userData.phase) * 0.18
      }
    }
    if (glow) {
      const s = 1 + Math.sin(time * 1.4) * 0.06
      glow.scale.set(glowScale * s, glowScale * s, 1)
    }
    if (stars) stars.rotation.y += dt * 0.004

    updateCamera()
    try { renderer.render(scene, camera) } catch { /* HMR 后偶发失败 */ }
  }

  // ===================== 交互 =====================
  function pickAt(clientX: number, clientY: number) {
    const canvas = canvasRef.value
    if (!canvas || !camera || !raycaster) return null
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(pickables.map(p => p.mesh), false)
    if (!hits.length) return null
    return pickables.find(p => p.mesh === hits[0].object) || null
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true
    moved = false
    lastX = e.clientX
    lastY = e.clientY
    const canvas = canvasRef.value
    if (canvas) canvas.style.cursor = 'grabbing'
  }

  function onPointerMove(e: PointerEvent) {
    if (dragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true
      theta -= dx * 0.005
      phi = clamp(phi - dy * 0.005, 0.25, Math.PI - 0.25)
      return
    }
    const p = pickAt(e.clientX, e.clientY)
    const canvas = canvasRef.value
    if (p) {
      hover.value = { x: e.clientX, y: e.clientY, text: p.sel.title }
      if (canvas) canvas.style.cursor = 'pointer'
    } else {
      hover.value = null
      if (canvas) canvas.style.cursor = 'grab'
    }
  }

  function onPointerUp(e: PointerEvent) {
    const wasDrag = moved
    dragging = false
    const canvas = canvasRef.value
    if (canvas) canvas.style.cursor = 'grab'
    if (wasDrag) return
    const p = pickAt(e.clientX, e.clientY)
    selected.value = p ? p.sel : null
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    dist = clamp(dist * (1 + Math.sign(e.deltaY) * 0.09), DIST_MIN, DIST_MAX)
  }

  function onPointerLeave() {
    hover.value = null
  }

  function bindControls() {
    const canvas = canvasRef.value
    if (!canvas) return
    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerleave', onPointerLeave)
  }

  function unbindControls() {
    const canvas = canvasRef.value
    if (canvas) {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  function resetView() {
    theta = 0.7
    phi = 1.02
    dist = 36
  }

  function clearSelection() {
    selected.value = null
  }

  // ===================== 生命周期 =====================
  /** 完整启动：WebGL 预检 → 加载 three → 建渲染器 → 取数据渲染。可重入（重试用）。 */
  async function boot() {
    state.value = 'loading'
    errorMsg.value = ''

    // WebGL 能力预检
    try {
      const probe = document.createElement('canvas')
      const gl = probe.getContext('webgl2') || probe.getContext('webgl')
      if (!gl) throw new Error(t('course3d.webglUnsupported'))
    } catch (e: any) {
      errorMsg.value = e?.message || t('course3d.webglUnsupported')
      state.value = 'error'
      return
    }

    try {
      if (!THREE) await loadThree()
      if (cancelled) return
      await nextTick()
      if (cancelled) return
      if (!renderer) {
        if (!initRenderer()) throw new Error(t('course3d.loadFailed'))
        bindControls()
        window.addEventListener('resize', resize)
        clock.start()
      }
      ready = true
      if (rafId === null) animate()
      await load()
    } catch (e: any) {
      if (cancelled) return
      errorMsg.value = e?.message || t('course3d.loadFailed')
      state.value = 'error'
    }
  }

  onMounted(boot)

  onBeforeUnmount(() => {
    cancelled = true
    ready = false
    unbindControls()
    window.removeEventListener('resize', resize)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (root) { disposeGroup(root); root = null }
    if (stars) { disposeGroup(stars); stars = null }
    glow = null
    if (renderer) {
      renderer.dispose()
      renderer.forceContextLoss?.()
      renderer = null
    }
    scene = null
    camera = null
    raycaster = null
    pointer = null
    clock = null
  })

  return {
    canvasRef, state, errorMsg, summary, totals, legend, selected, hover, empty,
    resetView, clearSelection, reload: boot,
  }
}
