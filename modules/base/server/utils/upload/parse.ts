/**
 * Upload step 1: resolve source
 *
 * Two sources:
 *  1) JSON body: { url }        - remote image download + sharp webp compression
 *  2) multipart: files[] + group - raw form upload
 *
 * Also defines UploadError (business error classification), handler formats response accordingly.
 */
import { extname } from 'node:path'
import { readMultipartFormData } from 'h3'
import { downloadAndCompressImageToWebp } from '../files/remoteImage'

/** Business error classification */
export class UploadError extends Error {
  code: 'size' | 'type' | 'empty' | 'quota' | 'generic' = 'generic'
  extra: Record<string, any> = {}
  constructor(msg: string, code: UploadError['code'] = 'generic', extra: Record<string, any> = {}) {
    super(msg)
    this.code = code
    this.extra = extra
  }
}

/** Parse file source + group from multipart form, return buffer / ext / fileType / group */
export async function resolveUploadSource(event: any, body: any) {
  let group = body?.group ? String(body.group).trim() : ''
  if (body?.url) {
    const resData = await downloadAndCompressImageToWebp(body.url)
    return {
      buffer: resData.buffer,
      originalName: resData.originalFilename,
      ext: resData.originalExt,
      fileType: resData.mimeType,
      group,
    }
  }
  const formData = await readMultipartFormData(event)
  const fileField = formData?.find((f: any) => f.name === 'files')
  if (!fileField || !fileField.filename) {
    throw new UploadError('Please upload a file', 'empty')
  }
  const groupField = formData?.find((f: any) => f.name === 'group')
  if (groupField?.data) {
    group = Buffer.from(groupField.data).toString('utf8').trim()
  }
  return {
    buffer: fileField.data,
    originalName: fileField.filename,
    ext: extname(fileField.filename).toLowerCase(),
    fileType: fileField.type,
    group,
  }
}
