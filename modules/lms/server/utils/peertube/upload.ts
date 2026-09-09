/**
 * PeerTube 视频上传工具
 *
 * 参考 scripts/upload-peertube.js 的流程：OAuth client → 登录取 token → multipart 上传。
 * 供 modules/lms/server/api/peertube/upload.post.ts 调用。
 */

export interface PeerTubeUploadConfig {
  url: string      // 例如 http://10.28.1.156 （去掉结尾斜杠）
  username: string
  password: string
  privacy?: string       // 1=Public 2=Unlisted 3=Private
  channelId?: string     // 默认频道 id（root 常见 1）
}

export interface PeerTubeUploadResult {
  uuid: string
  embedUrl: string
  watchUrl: string
  name?: string
}

/** 登录获取 access_token */
async function login(cfg: PeerTubeUploadConfig): Promise<string> {
  const base = cfg.url.replace(/\/+$/, '')
  const { client_id, client_secret } = await $fetch<{ client_id: string; client_secret: string }>(
    `${base}/api/v1/oauth-clients/local`,
  )
  const form = new URLSearchParams()
  form.append('grant_type', 'password')
  form.append('response_type', 'code')
  form.append('client_id', client_id)
  form.append('client_secret', client_secret)
  form.append('username', cfg.username)
  form.append('password', cfg.password)

  const res = await $fetch<{ access_token: string }>(`${base}/api/v1/users/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  return res.access_token
}

/**
 * 上传视频到 PeerTube，返回带 embed 的 URL。
 * @param buffer 视频文件内容
 * @param filename 视频文件名
 */
export async function uploadVideoToPeerTube(
  cfg: PeerTubeUploadConfig,
  buffer: Buffer,
  filename: string,
): Promise<PeerTubeUploadResult> {
  const base = cfg.url.replace(/\/+$/, '')
  const token = await login(cfg)

  const form = new FormData()
  form.append('name', filename.replace(/\.[^.]+$/, '') || 'video')
  form.append('privacy', String(cfg.privacy || '1'))
  if (cfg.channelId) form.append('channelId', String(cfg.channelId))
  form.append('waitTranscoding', 'true')
  form.append('videofile', new Blob([buffer], { type: 'video/mp4' }), filename)

  const res = await $fetch<{ video?: any } & Record<string, any>>(`${base}/api/v1/videos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const v = res.video || res
  const uuid = v.uuid || v.id
  if (!uuid) throw new Error('上传 PeerTube 失败：响应缺少视频 uuid')
  return {
    uuid,
    embedUrl: `${base}/videos/embed/${uuid}`,
    watchUrl: `${base}/w/${uuid}`,
    name: v.name || filename,
  }
}