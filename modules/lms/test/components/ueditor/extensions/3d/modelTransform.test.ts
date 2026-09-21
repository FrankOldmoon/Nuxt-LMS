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
import { computeModelTransforms, degToRad } from '../../../../../components/ueditor/extensions/nodes/vue/3d/modelTransform'

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
