// 让图标全部本地化，不再在运行时访问公网 Iconify API (api.iconify.design)。
// <UIcon> / <UButton icon> 底层用 @iconify/vue：遇到本地未注册的图标会去外网现拉，
// 导致偶有外网请求（如 lucide:bounding-box）。这里把已安装的 @iconify-json/* 图标集
// 注册进内存，SSR 与客户端都从本地解析，零公网依赖。
// 新增图标集时：先 pnpm add @iconify-json/<name>，再在下面补一行 import + addCollection。
import { addCollection } from '@iconify/vue'
import lucide from '@iconify-json/lucide/icons.json'
import heroicons from '@iconify-json/heroicons/icons.json'
import vscodeIcons from '@iconify-json/vscode-icons/icons.json'

export default defineNuxtPlugin(() => {
  addCollection(lucide as never)
  addCollection(heroicons as never)
  // Nuxt UI 自带组件（如文件类型图标 i-vscode-icons-file-type-*）用 vscode-icons 集
  addCollection(vscodeIcons as never)
})
