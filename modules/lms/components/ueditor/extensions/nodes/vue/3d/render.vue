<template>
    <div class="model3d-render" :style="{ height: config.height + 'px', background: config.bg }">
        <div ref="canvasHost" class="model3d-canvas-host"></div>

        <!-- Loading -->
        <div v-if="loadingCount" class="model3d-loading">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-5" />
            <span class="text-sm ml-2">{{ t('ueditor.modelLoading') }} ({{ loadingCount }})</span>
        </div>

        <!-- Error -->
        <div v-if="errors.length" class="model3d-errors">
            <div v-for="(e, i) in errors" :key="i" class="text-xs text-error">⚠ {{ e }}</div>
        </div>

        <!-- Toolbar overlay -->
        <div class="model3d-toolbar">
            <UTooltip :text="t('ueditor.modelResetCamera')">
                <UButton icon="i-lucide-camera" size="2xs" variant="ghost" color="neutral" @click="resetCamera" />
            </UTooltip>
            <UTooltip :text="t('ueditor.modelWireframe')">
                <UButton icon="i-lucide-grid-3x3" size="2xs" variant="ghost" color="neutral" @click="toggleWireframe" :class="{ 'ring-1 ring-primary': wireframeMode }" />
            </UTooltip>
            <UTooltip :text="autoRotateState ? t('ueditor.modelRotateOff') : t('ueditor.modelRotateOn')">
                <UButton :icon="autoRotateState ? 'i-lucide-pause' : 'i-lucide-rotate-cw'" size="2xs" variant="ghost" color="neutral" @click="toggleAutoRotate" />
            </UTooltip>
            <UTooltip :text="t('ueditor.modelExplode')">
                <UButton icon="i-lucide-maximize-2" size="2xs" variant="ghost" color="neutral" @click="toggleExplode" />
            </UTooltip>
            <UTooltip :text="t('ueditor.modelFullscreen')">
                <UButton icon="i-lucide-fullscreen" size="2xs" variant="ghost" color="neutral" @click="toggleFullscreen" />
            </UTooltip>
            <UTooltip :text="t('ueditor.modelDownloadAll')">
                <UButton icon="i-lucide-download" size="2xs" variant="ghost" color="neutral" :loading="downloading" @click="downloadAll" />
            </UTooltip>
        </div>

        <!-- Model list panel -->
        <div v-if="modelList.length > 1" class="model3d-models">
            <p class="text-xs text-muted mb-1.5 px-1">{{ t('ueditor.modelList') }}</p>
            <div class="flex flex-col gap-1">
                <label
                    v-for="(m, idx) in modelList"
                    :key="idx"
                    class="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 cursor-pointer text-xs"
                    :title="t('ueditor.modelFocus')"
                    @dblclick="focusModel(idx)"
                >
                    <input type="checkbox" :checked="m.visible" @change="toggleVisible(idx)" />
                    <span class="truncate flex-1" :style="{ color: m.color }">◉</span>
                    <span class="truncate flex-1 text-white/80">{{ m.name || `Model ${idx + 1}` }}</span>
                    <UIcon name="i-lucide-download" class="size-3.5 cursor-pointer text-white/60 hover:text-white flex-shrink-0" @click.stop="downloadOne(idx)" />
                </label>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: { type: Object, default: () => ({}) },
})

const { t } = useI18n()

const canvasHost = ref(null)
const loadingCount = ref(0)
const errors = ref([])
const wireframeMode = ref(false)
const autoRotateState = ref(false)
const exploded = ref(false)
const downloading = ref(false)

const parseConfig = () => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return { models: [], height: 500, bg: '#e0f2fe', autoRotate: false }
}
const config = ref(parseConfig())

const modelList = ref([])

// Babylon references
let engine = null
let scene = null
let camera = null
let canvas = null
let resizeObs = null
let loadedMeshes = []
let sceneLoaded = false

// CDN (sandbox.babylonjs.com 同款 CDN)
const BJS_CORE = 'https://cdn.babylonjs.com/babylon.js'
const BJS_LOADERS = 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js'

// 全局缓存 promise，避免重复加载或竞态
let _babylonPromise = null

async function ensureBabylon() {
    if (window.BABYLON && window.BABYLON.SceneLoader) return window.BABYLON
    if (_babylonPromise) return _babylonPromise
    _babylonPromise = new Promise((resolve, reject) => {
        const loadScript = (src, onLoad) => {
            const existing = document.querySelector(`script[data-bjs-src="${src}"]`)
            if (existing) {
                // 已存在：如果已加载完成直接回调，否则等 onload 事件
                if (existing.dataset.loaded === '1') onLoad()
                else existing.addEventListener('load', onLoad, { once: true })
                return
            }
            const s = document.createElement('script')
            s.src = src
            s.dataset.bjsSrc = src
            s.onload = () => { s.dataset.loaded = '1'; onLoad() }
            s.onerror = () => reject(new Error(`Failed to load ${src}`))
            document.head.appendChild(s)
        }
        loadScript(BJS_CORE, () => {
            loadScript(BJS_LOADERS, () => {
                if (window.BABYLON && window.BABYLON.SceneLoader) {
                    resolve(window.BABYLON)
                } else {
                    reject(new Error('Babylon.js loaded but BABYLON global not available'))
                }
            })
        })
    })
    // 失败时清空缓存，允许重试
    _babylonPromise.catch(() => { _babylonPromise = null })
    return _babylonPromise
}

// JSZip CDN 加载（按需，打包下载时用）
const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
let _jszipPromise = null
async function ensureJSZip() {
    if (window.JSZip) return window.JSZip
    if (_jszipPromise) return _jszipPromise
    _jszipPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = JSZIP_CDN
        s.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip load failed'))
        s.onerror = () => reject(new Error('Failed to load JSZip'))
        document.head.appendChild(s)
    })
    _jszipPromise.catch(() => { _jszipPromise = null })
    return _jszipPromise
}

// 从 modelList 项提取原始文件名（用于下载命名）
function getModelFileName(idx) {
    const m = modelList.value[idx]
    if (!m) return `model_${idx + 1}`
    let name = m.name || `model_${idx + 1}`
    // 保证有扩展名（无扩展名时根据 url 推断）
    if (!/\.[a-z0-9]+$/i.test(name)) {
        try {
            const u = new URL(m.url, window.location.origin)
            const pathname = u.searchParams.get('pathname') || ''
            const decoded = decodeURIComponent(pathname)
            const ext = decoded.match(/\.[a-z0-9]+$/i)
            if (ext) name += ext[0].toLowerCase()
        } catch (_) { /* noop */ }
    }
    return name
}

// 触发浏览器下载（blob → 文件）
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 下载单个模型
async function downloadOne(idx) {
    const m = modelList.value[idx]
    if (!m || !m.url) return
    try {
        const resp = await fetch(m.url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        triggerDownload(blob, getModelFileName(idx))
    } catch (e) {
        errors.value.push(`Download failed: ${e.message}`)
    }
}

// 打包下载全部模型为 zip
async function downloadAll() {
    if (downloading.value || !modelList.value.length) return
    downloading.value = true
    try {
        const JSZip = await ensureJSZip()
        const zip = new JSZip()
        // 用于避免重名
        const usedNames = new Set()
        for (let i = 0; i < modelList.value.length; i++) {
            const m = modelList.value[i]
            if (!m.url) continue
            const resp = await fetch(m.url)
            if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${m.name}`)
            const blob = await resp.blob()
            let name = getModelFileName(i)
            // 处理重名：追加 _1, _2...
            if (usedNames.has(name)) {
                const ext = name.match(/\.[a-z0-9]+$/i)?.[0] || ''
                const base = ext ? name.slice(0, -ext.length) : name
                let n = 1
                while (usedNames.has(`${base}_${n}${ext}`)) n++
                name = `${base}_${n}${ext}`
            }
            usedNames.add(name)
            zip.file(name, blob)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const sceneName = config.value?.name || 'models'
        triggerDownload(zipBlob, `${sceneName}.zip`)
    } catch (e) {
        errors.value.push(`Download all failed: ${e.message}`)
    } finally {
        downloading.value = false
    }
}

function palette(i) {
    const colors = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee', '#fb923c']
    return colors[i % colors.length]
}

async function initScene() {
    if (!import.meta.client || !canvasHost.value || sceneLoaded) return
    const BABYLON = await ensureBabylon()
    const host = canvasHost.value
    host.style.position = 'relative'
    host.style.width = '100%'
    host.style.height = '100%'
    host.style.overflow = 'hidden'

    canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.touchAction = 'none'
    canvas.style.outline = 'none'
    host.appendChild(canvas)

    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    scene = new BABYLON.Scene(engine)
    // 关闭 offline manifest 检查，否则 Babylon 会先请求 .manifest.json 返回 404 报错
    scene.enableOfflineSupport = false

    const bg = config.value.bg || '#e0f2fe'
    const rgb = hexToRgb(bg)
    scene.clearColor = new BABYLON.Color4(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1)

    // Camera (ArcRotate 轨道相机，类似 Sandbox)
    camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), scene)
    camera.attachControl(canvas, true)
    camera.wheelDeltaPercentage = 0.01
    camera.upperRadiusLimit = 1000
    camera.lowerRadiusLimit = 0.01
    camera.useAutoRotationBehavior = !!(config.value.autoRotate)
    if (camera.autoRotationBehavior) {
        camera.autoRotationBehavior.idleRotationSpeed = 1
        camera.autoRotationBehavior.idleRotationSpinupTime = 2000
        camera.autoRotationBehavior.idleRotationWaitTime = 2000
    }
    autoRotateState.value = !!camera.useAutoRotationBehavior

    // Lights
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene)
    hemi.intensity = 0.8
    const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -2, -1), scene)
    dir.intensity = 0.6

    // Ground + skybox 仅暗色系背景显示
    if (isDark(bg)) {
        const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene)
        const mat = new BABYLON.StandardMaterial('gmat', scene)
        mat.alpha = 0.35
        mat.specularColor = new BABYLON.Color3(0, 0, 0)
        mat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.2)
        ground.material = mat
        ground.isPickable = false
    }

    resizeObs = new ResizeObserver(() => { engine.resize() })
    resizeObs.observe(host)

    engine.runRenderLoop(() => { scene.render() })

    sceneLoaded = true
    await loadModels()
}

function isDark(hex) {
    const c = hexToRgb(hex)
    const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255
    return lum < 0.55
}

function hexToRgb(hex) {
    const h = (hex || '').replace('#', '')
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    const num = parseInt(full || '1e293b', 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

async function loadModels() {
    if (!sceneLoaded || !scene) return
    const BABYLON = window.BABYLON
    if (!BABYLON) return

    loadedMeshes.forEach((entry) => {
        try { entry.container.dispose() } catch (_) {}
    })
    loadedMeshes = []
    modelList.value = []
    errors.value = []

    const models = Array.isArray(config.value.models) ? config.value.models : []
    if (!models.length) return

    loadingCount.value = models.length
    const allMeshes = []

    for (let i = 0; i < models.length; i++) {
        const m = models[i]
        try {
            // 用 fetch 加载文件内容，构造 blob URL 传给 Babylon
            // 避免 Babylon 对 URL 二次编码导致服务器 404
            const url = m.url || ''
            const resp = await fetch(url)
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
            const blob = await resp.blob()
            // 创建 blob URL（同源，无 / 路径，不会被二次编码）
            const blobUrl = URL.createObjectURL(blob)
            // 从 URL 提取文件名（带扩展名，用于 Babylon 选择 loader）
            // Babylon 用文件名扩展名选择 loader，但加载用 blobUrl
            let fname = m.name || 'model.stl'
            const lastSlash = Math.max(url.lastIndexOf('/'), url.lastIndexOf('\\'))
            if (lastSlash >= 0) fname = url.slice(lastSlash + 1)
            // 用 pluginName 强制指定扩展名，避免 fname 中的 ? 干扰
            const ext = (fname.match(/\.[a-z0-9]+$/i) || ['.stl'])[0].toLowerCase()
            const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(blobUrl, '', scene, undefined, ext)
            container.addAllToScene()
            // 释放 blob URL
            URL.revokeObjectURL(blobUrl)
            loadedMeshes.push({ container, meshes: container.meshes, modelIdx: i })

            const name = m.name || fname || `Model ${i + 1}`
            const color = palette(i)
            modelList.value.push({ name, url: m.url, visible: true, color })

            // Per-model transform (scale/position/rotation)
            const scale = m.scale ?? 1
            const pos = Array.isArray(m.position) ? m.position : [0, 0, 0]
            const rot = Array.isArray(m.rotation) ? m.rotation : [0, 0, 0]
            container.meshes.forEach((mesh) => {
                if (mesh.parent) return // 只调整顶层
                mesh.scaling = mesh.scaling.scale(scale)
                mesh.position.x += pos[0] || 0
                mesh.position.y += pos[1] || 0
                mesh.position.z += pos[2] || 0
                mesh.rotation.x += rot[0] || 0
                mesh.rotation.y += rot[1] || 0
                mesh.rotation.z += rot[2] || 0
                mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY
            })
            allMeshes.push(...container.meshes)
        } catch (err) {
            errors.value.push(`${m.name || `model${i + 1}`}: ${err?.message || String(err)}`)
        } finally {
            loadingCount.value = Math.max(0, loadingCount.value - 1)
        }
    }

    if (allMeshes.length) {
        frameAll(allMeshes)
    }
}

function frameAll(meshes) {
    const BABYLON = window.BABYLON
    const minVec = new BABYLON.Vector3(Infinity, Infinity, Infinity)
    const maxVec = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity)
    meshes.forEach((mesh) => {
        if (!mesh.getBoundingInfo) return
        mesh.computeWorldMatrix(true)
        const bi = mesh.getBoundingInfo()
        const bbMin = bi.boundingBox.minimumWorld
        const bbMax = bi.boundingBox.maximumWorld
        minVec.x = Math.min(minVec.x, bbMin.x)
        minVec.y = Math.min(minVec.y, bbMin.y)
        minVec.z = Math.min(minVec.z, bbMin.z)
        maxVec.x = Math.max(maxVec.x, bbMax.x)
        maxVec.y = Math.max(maxVec.y, bbMax.y)
        maxVec.z = Math.max(maxVec.z, bbMax.z)
    })
    if (!isFinite(minVec.x)) return
    const center = minVec.add(maxVec).scale(0.5)
    const sizeVec = maxVec.subtract(minVec)
    const size = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.01)
    camera.target.copyFrom(center)
    const radius = size * 1.6
    camera.radius = radius
    camera.lowerRadiusLimit = radius * 0.2
    camera.upperRadiusLimit = radius * 10
}

function resetCamera() {
    const all = []
    loadedMeshes.forEach((e) => all.push(...e.meshes))
    if (all.length) frameAll(all)
}

// 双击物体列表项：聚焦到该模型的包围盒
function focusModel(idx) {
    const entry = loadedMeshes.find((e) => e.modelIdx === idx)
    if (!entry || !entry.meshes.length) return
    frameAll(entry.meshes)
}

function toggleWireframe() {
    wireframeMode.value = !wireframeMode.value
    loadedMeshes.forEach((e) => {
        e.meshes.forEach((m) => {
            if (m.material) m.material.wireframe = wireframeMode.value
        })
    })
}

function toggleAutoRotate() {
    if (!camera) return
    camera.useAutoRotationBehavior = !camera.useAutoRotationBehavior
    autoRotateState.value = !!camera.useAutoRotationBehavior
}

function toggleExplode() {
    const BABYLON = window.BABYLON
    if (!loadedMeshes.length) return
    exploded.value = !exploded.value
    // Compute common center
    const allCenters = []
    loadedMeshes.forEach((e) => {
        e.meshes.forEach((m) => {
            if (m.getBoundingInfo) {
                m.computeWorldMatrix(true)
                const bb = m.getBoundingInfo().boundingBox
                allCenters.push(bb.centerWorld.clone())
            }
        })
    })
    if (!allCenters.length) return
    const center = BABYLON.Vector3.Zero()
    allCenters.forEach((c) => center.addInPlace(c))
    center.scaleInPlace(1 / allCenters.length)

    const factor = exploded.value ? 1.5 : 1
    loadedMeshes.forEach((e) => {
        e.meshes.forEach((m) => {
            if (!m.position) return
            if (!m._origPos) {
                m._origPos = m.position.clone()
            }
            const op = m._origPos
            const dir = op.subtract(center)
            const dist = dir.length()
            if (dist < 0.0001) { m.position.copyFrom(op); return }
            dir.normalize()
            const newCenter = center.add(dir.scale(dist * factor))
            // offset between original position and original exploded position
            const delta = newCenter.subtract(op)
            m.position.copyFrom(op.add(delta))
        })
    })
}

function toggleFullscreen() {
    // 找到最外层 .model3d-render 容器，只全屏这个容器
    const host = canvasHost.value
    if (!host) return
    const el = host.closest('.model3d-render') || host.parentElement
    if (!el) return
    const fs = document.fullscreenElement || document.webkitFullscreenElement
    const reqFs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
    if (!fs) reqFs?.call(el)
    else exitFs?.call(document)
}

function toggleVisible(idx) {
    const item = modelList.value[idx]
    if (!item) return
    item.visible = !item.visible
    const entry = loadedMeshes.find((e) => e.modelIdx === idx)
    if (entry) {
        entry.meshes.forEach((m) => { m.setEnabled(item.visible) })
    }
}

watch(() => props.node?.attrs?.content, () => {
    config.value = parseConfig()
    modelList.value = []
    if (sceneLoaded) loadModels()
}, { deep: true })

onMounted(() => {
    nextTick(initScene)
})

onBeforeUnmount(() => {
    resizeObs?.disconnect()
    try { engine?.dispose() } catch (_) {}
    canvas?.remove?.()
    engine = null
    scene = null
    camera = null
    canvas = null
    sceneLoaded = false
    loadedMeshes = []
})
</script>

<style scoped>
.model3d-render {
    position: relative;
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.2);
    margin: 12px 0;
}
.model3d-render:fullscreen {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    margin: 0;
}
.model3d-render:fullscreen .model3d-canvas-host {
    position: absolute;
    inset: 0;
}
.model3d-canvas-host {
    position: absolute;
    inset: 0;
}
.model3d-toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 8px;
    z-index: 3;
}
.model3d-toolbar :deep(.u-button) {
    color: #fff;
}
.model3d-models {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 3;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 8px;
    max-width: 45%;
    max-height: 85%;
    overflow: auto;
    color: #fff;
}
.model3d-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    z-index: 2;
}
.model3d-errors {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.55);
    padding: 6px 8px;
    border-radius: 6px;
    z-index: 3;
}
</style>
