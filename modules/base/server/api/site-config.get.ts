import { getSiteConfig } from '../utils/siteConfig'

export default defineEventHandler(async () => {
  return await getSiteConfig()
})
