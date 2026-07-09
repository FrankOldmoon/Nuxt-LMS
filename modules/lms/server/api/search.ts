import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { getQuery } from 'h3'

export default eventHandler(async (event) => {
  const { courseId } = getQuery(event)

  const filename = courseId
    ? `search/${courseId}.json`
    : 'search/index.json'

  const filePath = resolve('./storage', filename)

  try {
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
})
