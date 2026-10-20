/**
 * 在 Hydro 服务器上设置系统配置（等价于 hydrooj cli system set，但一次可设多条）
 *
 * 用法（155 上）：
 *   NODE_PATH=/usr/local/share/.config/yarn/global/node_modules \
 *   node set-system.cjs lms-oauth.endpoint=http://10.28.1.151 lms-oauth.id=xxx
 *
 * 值统一按字符串写入（LMS 插件的 4 个配置都是 string 类型）。
 * 写完需要 pm2 restart hydrooj 才生效。
 */

const fs = require('fs')
const { MongoClient } = require('mongodb')

const pairs = process.argv.slice(2).filter((a) => a.includes('='))
if (!pairs.length) {
  console.error('用法: node set-system.cjs key=value [key=value ...]')
  process.exit(1)
}

const cfg = JSON.parse(fs.readFileSync('/root/.hydro/config.json', 'utf8'))

;(async () => {
  const client = new MongoClient(cfg.uri, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  const coll = client.db('hydro').collection('system')

  for (const p of pairs) {
    const i = p.indexOf('=')
    const key = p.slice(0, i)
    const value = p.slice(i + 1)
    await coll.updateOne({ _id: key }, { $set: { value } }, { upsert: true })
    console.log(`  ${key} = ${value}`)
  }

  const rows = await coll.find({ _id: { $regex: '^lms-oauth\\.' } }).toArray()
  console.log('当前 lms-oauth.* 配置:')
  for (const r of rows) console.log(`  ${r._id} = ${r.value}`)
  await client.close()
})().catch((e) => {
  console.error('写入失败:', e.message)
  process.exit(1)
})
