/**
 * File upload API
 * POST /api/files/upload
 *
 * Two sources:
 *  1) JSON body: { url }        - remote image download + sharp webp compression
 *  2) multipart: files[] + group - raw form upload
 *
 * Flow: resolve source → validate → quota → hash+dedup → persist to disk + write DB
 */
import { db } from '@nuxthub/db'
import { formatBytes } from '../../../utils/fileUtils'
import { UploadError, resolveUploadSource } from '../../utils/upload/parse'
import { validateUpload, buildDedupWhere } from '../../utils/upload/validate'
import { persistUploadedFile, sha256Hex } from '../../utils/upload/persist'

const UPLOAD_ROOT = './storage/'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  // 1. Resolve source
  let source: any
  try {
    source = await resolveUploadSource(event, body)
  } catch (e: any) {
    if (e instanceof UploadError && e.code === 'empty') return cResp(null, e.message, false)
    return cResp(null, `Remote image fetch failed: ${e?.message || e}`, false)
  }
  const { buffer, originalName, ext, fileType, group } = source

  // 2. Validate (size + extension)
  try {
    validateUpload(buffer, ext)
  } catch (e: any) {
    return cResp(e.extra || null, e.message, false)
  }

  // 3. Drive quota
  const space = await checkDriveSpace({ id: user.id, roles: user.roles }, buffer.length)
  if (!space.ok) {
    return cResp(
      { quota: space.quota, used: space.used, need: buffer.length },
      `Drive space insufficient: used ${formatBytes(space.used)}, quota ${formatBytes(space.quota)}, this upload needs ${formatBytes(buffer.length)}`,
      false,
    )
  }

  // 4. Hash + dedup
  const hash = sha256Hex(buffer)
  const dedupWhere = buildDedupWhere(hash, group)
  const existing = await db.query.files.findFirst({ where: dedupWhere })
  if (existing) {
    return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(existing.path.replace(/^\/+/, ''))}` }, 'File already exists', true)
  }

  // 5. Persist to disk + write DB + rename (concurrent conflict catch branch reuses dedupWhere to re-dedup)
  try {
    const { id, finalDbPath } = await persistUploadedFile({
      buffer, hash, ext, originalName, fileType, group,
      userId: user.id, uploadRoot: UPLOAD_ROOT,
    })
    return cResp(
      { id, url: `/api/files/serve?pathname=${encodeURIComponent(finalDbPath.replace(/^\/+/, ''))}` },
      'Upload successful', true,
    )
  } catch (err: any) {
    const conflict = await db.query.files.findFirst({ where: dedupWhere })
    if (conflict) {
      return cResp({ url: `/api/files/serve?pathname=${encodeURIComponent(conflict.path.replace(/^\/+/, ''))}` }, 'File already exists', true)
    }
    throw err
  }
})
