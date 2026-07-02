import { readFile } from 'fs/promises'
import { resolve } from 'path'

export default eventHandler(async () => {
  const filePath = resolve('./storage/search.json')
  try {
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
})
