/**
 * 上传视频到 PeerTube
 * POST /api/peertube/upload  (multipart: files)
 *
 * 将 ueditor 上传的视频改为走 PeerTube，返回 embed 格式 URL，
 * 前端插入 iframe 框（http://{host}/videos/embed/{uuid}）。
 * 配置（runtimeConfig.peertube）可通过环境变量 NUXT_PEERTUBE_URL 等覆盖。
 */
import { uploadVideoToPeerTube } from '../../utils/peertube/upload'

const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  // 仅教师/管理员可上传视频
  const isAllowed = user.roles.includes('admin') || user.roles.includes('teacher')
  if (!isAllowed) {
    return cResp(null, '仅教师和管理员可上传视频', false)
  }

  const peertube = useRuntimeConfig(event).peertube
  // 视频大小上限（MB，可配 NUXT_PEERTUBE_MAX_SIZE_MB），默认 2GB
  const maxSizeMB = Number(peertube?.maxSizeMB) || 2048
  const MAX_SIZE = maxSizeMB * 1024 * 1024

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'files' || (p.filename && p.type?.startsWith('video/')))
  if (!file || !file.data?.length || !file.filename) {
    return cResp(null, '未收到有效的视频文件', false)
  }

  if (file.type && !ALLOWED_VIDEO_MIME.includes(file.type)) {
    return cResp(null, `不支持的视频类型: ${file.type}`, false)
  }
  if (file.data.byteLength > MAX_SIZE) {
    return cResp(null, `视频文件超过 ${maxSizeMB}MB 限制`, false)
  }

  if (!peertube?.url || !peertube?.username || !peertube?.password) {
    // 未配置 PeerTube → 前端据此回退为普通视频上传
    return cResp({ enabled: false }, '未配置 PeerTube，使用普通视频上传', false)
  }

  try {
    const result = await uploadVideoToPeerTube(
      {
        url: String(peertube.url),
        username: String(peertube.username),
        password: String(peertube.password),
        privacy: String(peertube.privacy || '1'),
        channelId: peertube.channelId ? String(peertube.channelId) : undefined,
      },
      file.data,
      file.filename,
    )
    return cResp({ ...result, enabled: true }, '上传成功', true)
  } catch (err: any) {
    console.error('[peertube] 上传失败:', err)
    return cResp(null, `上传 PeerTube 失败: ${err?.message || err}`, false)
  }
})