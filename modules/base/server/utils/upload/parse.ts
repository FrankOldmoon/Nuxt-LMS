/**
 * 上传步骤 1：解析来源
 *
 * 两种来源：
 *  1) JSON body: { url }        - 远程图片下载 + sharp webp 压缩
 *  2) multipart: files[] + group - 原始表单上传
 *
 * 同时定义 UploadError（业务错误分类），handler 据此格式化响应。
 */
import { extname } from 'node:path'
import { readMultipartFormData } from 'h3'
import { downloadAndCompressImageToWebp } from '../files/remoteImage'

/** 业务错误分类 */
export class UploadError extends Error {
  code: 'size' | 'type' | 'empty' | 'quota' | 'generic' = 'generic'
  extra: Record<string, any> = {}
  constructor(msg: string, code: UploadError['code'] = 'generic', extra: Record<string, any> = {}) {
    super(msg)
    this.code = code
    this.extra = extra
  }
}

/** 从 multipart form 中解析文件来源 + group，返回 buffer / ext / fileType / group */
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
    throw new UploadError('请上传文件', 'empty')
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
