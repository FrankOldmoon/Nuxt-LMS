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
 * 计算每个模型最终要应用的变换。
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

    return list.map((m, i) => {
        const dim = Number(measured[i])
        const normFactor = (target > 0 && Number.isFinite(dim) && dim > 0) ? target / dim : 1

        const rawScale = Number(m?.scale)
        const userScale = (Number.isFinite(rawScale) && rawScale !== 0) ? rawScale : 1

        const pos = Array.isArray(m?.position) ? m.position : []
        const rot = Array.isArray(m?.rotation) ? m.rotation : []

        return {
            scale: normFactor * userScale,
            position: [num(pos[0]), num(pos[1]), num(pos[2])],
            rotation: [degToRad(rot[0]), degToRad(rot[1]), degToRad(rot[2])],
        }
    })
}
