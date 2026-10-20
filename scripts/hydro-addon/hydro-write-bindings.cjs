/**
 * 在 Hydro 服务器上执行：把 LMS <-> Hydro 绑定写入 mongo 的 oauth 集合
 *
 * 由 scripts/seed-oauth-bindings.mjs 通过 ssh 调用，不单独跑。
 *
 * 用法（155 上）：
 *   NODE_PATH=/usr/local/share/.config/yarn/global/node_modules \
 *   node hydro-write-bindings.cjs /tmp/oauth-bindings.json [--apply]
 *
 * 不带 --apply 只统计不写库。
 * 使用 bulkWrite + upsert，重复执行安全（唯一索引 platform+id）。
 */

const fs = require('fs')
const { MongoClient } = require('mongodb')

const file = process.argv[2]
const apply = process.argv.includes('--apply')

const cfg = JSON.parse(fs.readFileSync('/root/.hydro/config.json', 'utf8'))
const uri = cfg.uri
const bindings = JSON.parse(fs.readFileSync(file, 'utf8'))

;(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  const coll = client.db('hydro').collection('oauth')

  const before = await coll.countDocuments({ platform: 'lms' })

  if (!apply) {
    console.log(`[dry] 待写入 ${bindings.length} 条，当前 lms 绑定 ${before} 条，未做任何修改`)
    await client.close()
    return
  }

  const ops = bindings.map((b) => ({
    updateOne: {
      filter: { platform: 'lms', id: String(b.id) },
      update: { $set: { uid: Number(b.uid) } },
      upsert: true,
    },
  }))

  const res = await coll.bulkWrite(ops, { ordered: false })
  const after = await coll.countDocuments({ platform: 'lms' })
  console.log(JSON.stringify({
    matched: res.matchedCount,
    upserted: res.upsertedCount,
    modified: res.modifiedCount,
    before,
    after,
  }))
  await client.close()
})().catch((e) => {
  console.error('写入失败:', e.message)
  process.exit(1)
})
