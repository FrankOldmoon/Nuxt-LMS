/**
 * 3D 模型的「尺寸归一化 + 自定义变换」计算（纯函数，便于单测；不依赖 Babylon）。
 *
 * 归一化规则：
 *   以「同一节点内最大模型的包围盒最大边」为目标，把每个模型按其**自身**包围盒最大边
 *   等比缩放到该目标。
 *   - 多模型：避免「大模型决定取景、小模型只剩几个像素」而看起来像没渲染
 *     （例如 0.29 与 28 相差约 96 倍）；
 *   - 单模型：目标 == 自身，系数恒为 1，尺度与旧行为完全一致。
 *
 * 变换语义：
 *   - scale：倍率，叠加在归一化系数之后（默认 1）；
 *   - position：XYZ 偏移（默认 [0,0,0]）；
 *   - rotation：XYZ 旋转，配置单位为**度**，此处转换为 Babylon 需要的弧度。
 */

/** 度 → 弧度 */
export function degToRad(deg) {
    const n = Number(deg)
    return Number.isFinite(n) ? n * Math.PI / 180 : 0
}

function num(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

/**
 * 由场景尺度推导相机取景参数（纯函数，便于单测）。
 *
 * 关键：**近/远裁剪面必须随场景尺度缩放**。
 * Babylon 相机默认 minZ = 1，若模型尺寸只有零点几单位
 * （例如 0.29 的盒子，取景半径仅 0.29 × 1.6 ≈ 0.46），
 * 整个模型都会落在近裁剪面之内被裁掉 —— 画面上什么都看不到。
 * 这正是「只有一个很小的 3D 模型时完全看不见」的原因。
 *
 * @param {number} maxDim 场景包围盒的最大边
 * @returns {{radius:number, lowerRadiusLimit:number, upperRadiusLimit:number, minZ:number, maxZ:number}}
 */
export function computeCameraFit(maxDim) {
    const raw = Number(maxDim)
    const size = (Number.isFinite(raw) && raw > 0) ? raw : 0.01
    const radius = size * 1.6
    return {
        radius,
        lowerRadiusLimit: radius * 0.2,
        upperRadiusLimit: radius * 10,
        // 近裁剪面取取景半径的 1/20：远小于「最近几何面到相机的距离」(≈ radius - size/2)，
        // 保证任意尺度的模型都不会被裁掉；同时保持 maxZ/minZ 比例不至于过大影响深度精度。
        minZ: Math.max(radius / 20, 1e-4),
        // 远裁剪面需覆盖场景（含暗色背景下的 20 单位地面）
        maxZ: Math.max(size * 10, 100),
    }
}

/**
 * 计算每个模型最终要应用的变换。
 *
 * 自动网格布局：position 未手工摆位（缺失或全为 [0,0,0]）的模型 ≥2 个时，
 * 按 grid 分散排列在 XZ 平面（行距/列距 = 归一化后模型最大边 × 1.5），
 * 整体居中；避免多模型全部堆叠在原点互相遮挡（如章节 215 的 22 个模型）。
 * 任一模型配置了非零 position 则尊重显式值、不参与 grid。
 *
 * @param {Array<{scale?:number, position?:number[], rotation?:number[]}>} models 模型配置（与 dims 同序）
 * @param {number[]} dims 每个模型自身包围盒的最大边（加载失败置 0）
 * @returns {Array<{scale:number, position:number[], rotation:number[]}>} rotation 为弧度
 */
export function computeModelTransforms(models, dims) {
    const list = Array.isArray(models) ? models : []
    const measured = Array.isArray(dims) ? dims : []
    const valid = measured.filter((d) => Number.isFinite(d) && d > 0)
    // 归一化目标：本节点内最大模型的尺寸；没有任何有效模型时为 0（系数退化为 1）
    const target = valid.length ? Math.max(...valid) : 0

    // —— 自动 grid：收集未摆位的模型下标，按 cols=ceil(√n) 排成居中网格 ——
    const gridIdx = []
    list.forEach((m, i) => {
        const pos = m?.position
        const hasOffset = Array.isArray(pos) && pos.some((v) => Number(v) !== 0)
        if (!hasOffset) gridIdx.push(i)
    })
    let gridPos = null
    const n = gridIdx.length
    if (n >= 2 && target > 0) {
        const cols = Math.ceil(Math.sqrt(n))
        const rows = Math.ceil(n / cols)
        const spacing = target * 1.5
        gridPos = new Map()
        gridIdx.forEach((modelIdx, k) => {
            const r = Math.floor(k / cols)
            const c = k % cols
            gridPos.set(modelIdx, [
                (c - (cols - 1) / 2) * spacing,
                0,
                (r - (rows - 1) / 2) * spacing,
            ])
        })
    }

    return list.map((m, i) => {
        const dim = Number(measured[i])
        const normFactor = (target > 0 && Number.isFinite(dim) && dim > 0) ? target / dim : 1

        const rawScale = Number(m?.scale)
        const userScale = (Number.isFinite(rawScale) && rawScale !== 0) ? rawScale : 1

        const pos = Array.isArray(m?.position) ? m.position : []
        const rot = Array.isArray(m?.rotation) ? m.rotation : []
        const position = gridPos?.get(i) || [num(pos[0]), num(pos[1]), num(pos[2])]

        return {
            scale: normFactor * userScale,
            position,
            rotation: [degToRad(rot[0]), degToRad(rot[1]), degToRad(rot[2])],
        }
    })
}
