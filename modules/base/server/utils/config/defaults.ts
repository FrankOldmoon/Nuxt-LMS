/**
 * site 配置默认值（拍平存储）
 *
 * 每个 key 独立存为 configs 表一行（id = 带点 key，value = 标量 jsonb）。
 * 由 settingsModal 读写，启动插件播种默认值。
 */
export const DEFAULT_SITE_CONFIG: Record<string, any> = {
  // 站点基础
  'site:title': 'AI LMS',
  'site:description': '',
  'site:keywords': '',
  'site:logo': '',
  'site:favicon': '',
  'site:footerText': '',
  'site:defaultLocale': 'en',
  'site:timezone': '',
  'site:pageSize': 20,
  'site:maxFileSize': 50,
  'site:allowedFileTypes': '',
  'site:maintenanceMode': false,
  // OAuth2/OIDC 对外基址（issuer）。留空 = 用请求 origin；
  // 反代没透传 Host 导致 origin 变成内网地址时，在这里填 http://10.28.1.151 兜底
  'site:oauth.issuer': '',
  // 注意：不要在这里给 site:oauth.idPrivateKey 播种空串。
  // 该键由 utils/oauthKeys.ts 在首次使用时生成并写入（upsert）；
  // 播种空值会让「密钥已存在」的判断失效 —— 曾经导致 8 个进程各自生成一把密钥，
  // JWKS 的 kid 与 id_token 的 kid 不一致，客户端验签全失败。
  // 账号安全
  'site:allowRegistration': false,
  'site:allowForgotPassword': true,
  'site:defaultUserRole': 'student',
  'site:passwordMinLength': 6,
  'site:sessionMaxAge': 604800,
  // 网盘配额
  'site:driveQuota': 1073741824,
  'site:teacherDriveMultiplier': 1,
  // 邮件
  'site:mail.host': '',
  'site:mail.port': 465,
  'site:mail.secure': true,
  'site:mail.user': '',
  'site:mail.pass': '',
  'site:mail.from': '',
  'site:mail.siteUrl': '',
  // PeerTube 视频上传（ueditor 视频走 PeerTube，插入 embed iframe）
  // 系统设置 → 存储 里可编辑；为空时回退读 .env 的 NUXT_PEERTUBE_* 变量
  'site:peertube.url': 'http://10.28.1.156',
  'site:peertube.username': 'root',
  // 不设默认密码：由系统设置或 NUXT_PEERTUBE_PASSWORD 环境变量提供
  'site:peertube.password': '',
  'site:peertube.privacy': '1',
  'site:peertube.channelId': '1',
  // 前端页面显示控制（拍平）
  'site:showNotify': true,
  'site:showMsg': true,
  'site:showMyFiles': true,
}
