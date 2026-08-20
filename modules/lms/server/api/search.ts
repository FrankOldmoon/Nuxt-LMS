import { readFile } from 'fs/promises'
import { resolve, sep } from 'path'
import { getQuery } from 'h3'

export default eventHandler(async (event) => {
  const { courseId } = getQuery(event)

  // 安全：courseId 必须是纯数字，避免路径穿越（../ 逃逸 storage 目录读取任意 JSON）
  const rawCourseId = String(courseId || '')
  if (rawCourseId && !/^\d+$/.test(rawCourseId)) {
    return cResp(null, '无效的 courseId', false)
  }

  const filename = rawCourseId
    ? `search/${rawCourseId}.json`
    : 'search/index.json'

  const searchRoot = resolve('./storage', 'search')
  const filePath = resolve(searchRoot, filename)

  // 兜底：确保解析后的路径仍在 storage/search 目录内
  if (filePath !== resolve(searchRoot, 'index.json') && !filePath.startsWith(searchRoot + sep)) {
    return cResp(null, '无效的路径', false)
  }

  try {
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
})
