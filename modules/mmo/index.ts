import { defineNuxtModule, createResolver, addComponentsDir, addServerScanDir } from '@nuxt/kit'

/**
 * mmo module —— 多人在线游戏（MMO）模块
 *
 * 功能：
 * - MMO 游戏页面（mmo.vue / mmo-test.vue）
 * - 角色生成器页面（character.vue）
 * - 瓦片图集编辑器页面（tileset.vue）
 * - 角色创建组件（MvCharacterCreator）
 * - Colyseus 实时游戏服务器（GameRoom / schema）
 * - MMO REST API（state / join / reset）
 * - 游戏素材服务（game-assets）
 * - schema：game_info（玩家存档）
 * - 客户端游戏库（mmo/ 目录：scenes / net / rpg / config / shared）
 *
 * 依赖：base（auth / db / response）、lms（users / classes / tokens）
 *
 * 开关：NUXT_MODULE_MMO=true 时注册功能。
 */
export default defineNuxtModule({
  meta: { name: 'module-mmo', configKey: 'moduleMmo' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // schema 注册（始终生效，确保 hub:db 能聚合 game_info 表）
    nuxt.hook("hub:db:schema:extend", async ({ dialect, paths }) => {
      paths.push(resolve(`./server/db/schema.ts`));
    });

    nuxt.options.alias['#mmo'] = resolve('.')

    const enabled = process.env.NUXT_MODULE_MMO === 'true'
    if (!enabled) return

    // 标记 mmo 模块已启用
    nuxt.options.runtimeConfig.public.moduleMmo = true

    // MMO 前端连接 Colyseus 服务的端口（与 MMO_WS_PORT 保持一致）
    nuxt.options.runtimeConfig.public.mmoWsPort = Number(process.env.MMO_WS_PORT || 2567)

    // 注册组件目录（pathPrefix: true → 子目录作为前缀）
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // 注册 i18n locale（MMO 界面/游戏内文案跟随主项目语言 en / cn）
    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [
          { code: 'en', file: 'en.json' },
          { code: 'cn', file: 'cn.json' },
        ],
      })
    })

    // 所有 MMO 页面禁用 SSR（Canvas / DOM 操作仅客户端执行）
    nuxt.options.nitro.routeRules = {
      ...(nuxt.options.nitro.routeRules || {}),
      // MMO 入口挂到课程路径下：/course/:id/mmo（世界）与 /course/:id/:cid/mmo（章节副本）
      '/course/:id/mmo': { ssr: false },
      '/course/:id/:cid/mmo': { ssr: false },
      '/mmo-test': { ssr: false },
      '/mmo-character': { ssr: false },
      '/mmo-tileset': { ssr: false },
      '/mmo-teacher': { ssr: false },
    }

    // 注册 pages（合并到主 pages）
    nuxt.hook('pages:extend', (pages) => {
      // MMO 入口：/course/:id/mmo（游戏数据与金币按课程绑定，课程 ID 取自路由参数）
      pages.push({
        name: 'mmo-game',
        path: '/course/:id/mmo',
        file: resolve('./pages/mmo.vue'),
      })
      // 章节副本入口：/course/:id/:cid/mmo（层数 = 章节二级标题数）
      pages.push({
        name: 'mmo-chapter',
        path: '/course/:id/:cid/mmo',
        file: resolve('./pages/mmo.vue'),
      })
      pages.push({
        name: 'mmo-test',
        path: '/mmo-test',
        file: resolve('./pages/mmo-test.vue'),
      })
      pages.push({
        name: 'mmo-character',
        path: '/mmo-character',
        file: resolve('./pages/character.vue'),
      })
      pages.push({
        name: 'mmo-tileset',
        path: '/mmo-tileset',
        file: resolve('./pages/tileset.vue'),
      })
      pages.push({
        name: 'mmo-teacher',
        path: '/mmo-teacher',
        file: resolve('./pages/teacher.vue'),
      })
    })

    // 注册 server 路由 / utils / plugins（Colyseus 服务器在 plugins/ 下自动发现）
    addServerScanDir(resolve('./server'))
  },
})
