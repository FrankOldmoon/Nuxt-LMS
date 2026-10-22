/**
 * 将文件 url 数组解析为可显示的 { url, name } 列表。
 * 优先通过 /api/files/meta 获取服务端原始文件名，失败时回退到从 url 解析。
 * 仅对状态为成功的已上传文件使用。
 */
import { ref, watch } from 'vue'
import { getFileNameFromUrl } from './useFileUploader'

export function useFileNames(urls: () => any[]) {
  const items = ref<{ url: string; name: string; size?: number }[]>([])
  const nameByUrl = new Map<string, string>()
  const sizeByUrl = new Map<string, number>()

  async function fetchMeta(url: string) {
    try {
      const u = new URL(url, window.location.origin)
      const pathname = u.searchParams.get('pathname')
      if (!pathname) return
      const data = await cRequest(`/api/files/meta?pathname=${encodeURIComponent(pathname)}`)
      if (!data?.name) return
      nameByUrl.set(url, data.name)
      if (data.size) sizeByUrl.set(url, data.size)
      const idx = items.value.findIndex((it) => it.url === url)
      if (idx >= 0) {
        items.value[idx] = { ...items.value[idx], name: data.name, size: data.size || undefined }
      }
    } catch {
      // 补全失败保持 url 解析名
    }
  }

  watch(
    () => urls(),
    (val) => {
      const arr = (Array.isArray(val) ? val : [])
        .filter(Boolean)
        .map((x) => (typeof x === 'string' ? x : x?.url))
        .filter(Boolean)
      items.value = arr.map((url) => ({
        url,
        name: nameByUrl.get(url) || getFileNameFromUrl(url),
        size: sizeByUrl.get(url),
      }))
      // 异步补全服务端原始文件名
      for (const url of arr) {
        if (!nameByUrl.has(url)) fetchMeta(url)
      }
    },
    { immediate: true, deep: true },
  )

  return items
}