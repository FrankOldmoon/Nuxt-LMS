/**
 * 重量级依赖资源基址（可配置）
 * @see modules/base/utils/heavyAssets.ts
 *
 * 这类库体积过大不随仓库分发，默认走公网 CDN；
 * 内网/无外网部署时用 NUXT_PUBLIC_NPM_ASSETS_BASE / NUXT_PUBLIC_ESM_ASSETS_BASE
 * 指向本地镜像即可完全脱网。本测试锁定「默认值」与「配置覆盖」两条路径。
 */
import { describe, it, expect } from 'vitest'
import { setMockRuntimeConfig } from '../../../../test/setup/nuxt-stubs'

describe('utils/heavyAssets', () => {
  it('默认指向公网 CDN（零配置也能用）', async () => {
    const { npmAssetsBase, esmAssetsBase, npmAsset, esmAsset, npmEsmAsset } =
      await import('../../utils/heavyAssets')

    expect(npmAssetsBase()).toBe('https://cdn.jsdelivr.net/npm')
    expect(esmAssetsBase()).toBe('https://esm.sh')
    expect(npmAsset('babylonjs@latest/babylon.js'))
      .toBe('https://cdn.jsdelivr.net/npm/babylonjs@latest/babylon.js')
    expect(esmAsset('three@0.169.0')).toBe('https://esm.sh/three@0.169.0')
    expect(npmEsmAsset('@mlc-ai/web-llm@0.2.84'))
      .toBe('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm')
  })

  it('配置镜像基址后全部改走镜像（内网脱网）', async () => {
    setMockRuntimeConfig({
      public: {
        npmAssetsBase: 'https://mirror.internal/npm/',
        esmAssetsBase: 'https://mirror.internal/esm/',
      },
    })
    const { npmAssetsBase, esmAssetsBase, npmAsset, esmAsset } =
      await import('../../utils/heavyAssets')

    // 末尾斜杠会被裁剪，避免拼出双斜杠
    expect(npmAssetsBase()).toBe('https://mirror.internal/npm')
    expect(esmAssetsBase()).toBe('https://mirror.internal/esm')
    expect(npmAsset('rxjs@latest/dist/bundles/rxjs.umd.min.js'))
      .toBe('https://mirror.internal/npm/rxjs@latest/dist/bundles/rxjs.umd.min.js')
    expect(esmAsset('/three@0.169.0')).toBe('https://mirror.internal/esm/three@0.169.0')
  })
})
