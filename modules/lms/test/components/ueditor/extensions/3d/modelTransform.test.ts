/**
 * 3d/modelTransform.js 单测
 *
 * 复现线上问题（/course/4/175）：同一 3D 节点内 box.stl 包围盒最大边 0.29、
 * gear2.stl 27.97，相差约 96 倍；取景由大模型决定后小模型只剩几个像素，
 * 看起来像"没渲染"。归一化后两者应与节点内最大模型同量级。
 *
 * @see modules/lms/components/ueditor/extensions/nodes/vue/3d/modelTransform.js
 */
import { describe, it, expect } from 'vitest'
import { computeModelTransforms, computeCameraFit, degToRad } from '../../../../../components/ueditor/extensions/nodes/vue/3d/modelTransform'

describe('3d/modelTransform', () => {
  it('多模型：按各自包围盒归一化到「节点内最大尺寸」', () => {
    const models = [
      { scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] },
      { scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] },
    ]
    const dims = [0.29, 27.97]
    const t = computeModelTransforms(models, dims)
    // 目标 = 最大尺寸 27.97
    expect(t[0].scale).toBeCloseTo(27.97 / 0.29, 6)
    expect(t[1].scale).toBeCloseTo(1, 6)
    // 归一化后两者实际尺寸一致
    expect(dims[0] * t[0].scale).toBeCloseTo(dims[1] * t[1].scale, 4)
  })

  it('单模型：系数恒为 1，不改变既有尺度', () => {
    const t = computeModelTransforms([{ scale: 1 }], [12.5])
    expect(t[0].scale).toBe(1)
  })

  it('用户 scale 作为倍率叠加在归一化之后', () => {
    const t = computeModelTransforms([{ scale: 1 }, { scale: 2 }], [0.5, 10])
    expect(t[0].scale).toBeCloseTo((10 / 0.5) * 1, 6)
    expect(t[1].scale).toBeCloseTo(1 * 2, 6)
  })

  it('rotation 配置单位为「度」，输出为弧度', () => {
    const t = computeModelTransforms([{ rotation: [90, 180, -90] }], [1])
    expect(t[0].rotation[0]).toBeCloseTo(Math.PI / 2, 6)
    expect(t[0].rotation[1]).toBeCloseTo(Math.PI, 6)
    expect(t[0].rotation[2]).toBeCloseTo(-Math.PI / 2, 6)
    expect(degToRad(45)).toBeCloseTo(Math.PI / 4, 6)
  })

  it('缺省/非法值兜底：position 缺失补 [0,0,0]，scale 为 0 或 NaN 时视为 1', () => {
    const t = computeModelTransforms([{ scale: 0 }, { scale: 'abc', position: 'bad' }], [2, 4])
    expect(t[0].scale).toBeCloseTo(2, 6)
    expect(t[1].scale).toBeCloseTo(1, 6)
    expect(t[1].position).toEqual([0, 0, 0])
    expect(t[1].rotation).toEqual([0, 0, 0])
  })

  it('全部模型加载失败（dims 全 0）时不缩放', () => {
    const t = computeModelTransforms([{ scale: 1 }, { scale: 1 }], [0, 0])
    expect(t.map(x => x.scale)).toEqual([1, 1])
  })
})

describe('3d/modelTransform - computeCameraFit（相机取景 / 裁剪面）', () => {
  // 回归：章节 175 只有一个 box.stl（最大边 0.29），取景半径仅 ~0.46，
  // 整个模型落在 Babylon 默认 minZ=1 之内被裁掉 → 完全看不见
  it('小模型：minZ 必须小于「最近几何面到相机的距离」且小于默认 1', () => {
    const fit = computeCameraFit(0.29)
    expect(fit.radius).toBeCloseTo(0.464, 6)
    const nearest = fit.radius - 0.29 / 2
    expect(fit.minZ).toBeLessThan(nearest)
    expect(fit.minZ).toBeLessThan(1)
  })

  it('大模型：同样满足 minZ < 最近几何面距离，且 maxZ 足够大', () => {
    const fit = computeCameraFit(27.972)
    const nearest = fit.radius - 27.972 / 2
    expect(fit.minZ).toBeLessThan(nearest)
    expect(fit.maxZ).toBeGreaterThanOrEqual(100)
  })

  it('退化输入（0 / 负数 / NaN）回退到最小尺寸，不产生 0 半径或 0 近裁剪面', () => {
    for (const bad of [0, -1, NaN, undefined]) {
      const fit = computeCameraFit(bad as any)
      expect(fit.radius).toBeGreaterThan(0)
      expect(fit.minZ).toBeGreaterThan(0)
      expect(fit.minZ).toBeLessThan(fit.radius)
    }
  })
})
