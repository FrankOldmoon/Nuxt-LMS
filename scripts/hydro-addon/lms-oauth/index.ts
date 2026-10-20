/**
 * Hydro OJ 的 LMS 登录插件（Hydro 5）
 *
 * 作用：在 Hydro 登录页注册一个「校园账号登录」按钮，走 LMS 的 OAuth 授权码流程。
 * 与「用微信登录」同构：Hydro 是 client，LMS 是 provider。
 *
 * 安装（在 155 上）：
 *   mkdir -p ~/.hydro/addon/lms-oauth
 *   cp index.ts package.json ~/.hydro/addon/lms-oauth/
 *   hydrooj addon add ~/.hydro/addon/lms-oauth
 *   pm2 restart hydrooj
 *
 * 配置（控制面板 → 系统设置，或 hydrooj cli system set）：
 *   lms-oauth.endpoint   http://10.28.1.151            （不要带末尾斜杠）
 *   lms-oauth.id         <LMS oauth_clients.client_id>
 *   lms-oauth.secret     <LMS oauth_clients 的明文 secret>
 *   lms-oauth.callback   http://10.28.1.155/oauth/lms/callback
 *
 * 注意：不能拿 server.url 拼回调地址 —— 本站 server.url 是 "/"（Caddy 反代、相对路径），
 * 拼出来是相对地址，和 LMS 白名单里的完整 URL 对不上。所以回调地址单独配置。
 * 这个值必须与 LMS oauth_clients.redirect_uris 里的字符串完全一致。
 */

import { Context, Handler, SystemModel, TokenModel, superagent } from 'hydrooj'

// cordis 要求：不声明 inject 就访问 ctx.oauth 会抛
// "cannot get property \"oauth\" without inject"（core 的 handler/user.ts 也是这么写的）
export const inject = ['oauth']

declare module 'hydrooj' {
    interface SystemKeys {
        'lms-oauth.endpoint': string
        'lms-oauth.id': string
        'lms-oauth.secret': string
        'lms-oauth.callback': string
    }
}

export async function apply(ctx: Context) {
    ctx.oauth.provide('lms', {
        // 这里是 i18n key，模板会用 _() 翻译。对应 locales/en.yaml、locales/zh.yaml
        text: 'Sign in with LMS',
        // 内部标识，不能改 —— mongo oauth 集合里的 platform 已经是 lms
        name: 'lms',
        // 必须先由 LMS 侧预填绑定表；不自动建号，避免邮箱对不上时产生重复账号
        canRegister: false,
        lockUsername: true,

        async get(this: Handler) {
            const [endpoint, clientId, callback, state] = await Promise.all([
                SystemModel.get('lms-oauth.endpoint'),
                SystemModel.get('lms-oauth.id'),
                SystemModel.get('lms-oauth.callback'),
                TokenModel.add(TokenModel.TYPE_OAUTH, 600, { redirect: this.request.referer || '/' })
                    .then((r) => r[0]),
            ])
            this.response.redirect = `${endpoint}/api/oauth/authorize`
                + `?response_type=code&client_id=${encodeURIComponent(clientId)}`
                + `&redirect_uri=${encodeURIComponent(callback)}`
                + `&state=${state}`
        },

        async callback({ code }) {
            const [endpoint, clientId, secret] = await Promise.all([
                SystemModel.get('lms-oauth.endpoint'),
                SystemModel.get('lms-oauth.id'),
                SystemModel.get('lms-oauth.secret'),
            ])
            const tokenRes = await superagent.post(`${endpoint}/api/oauth/token`).send({
                grant_type: 'authorization_code',
                code: String(code),
                client_id: clientId,
                client_secret: secret,
            })
            const accessToken = tokenRes.body?.access_token
            if (!accessToken) throw new Error('LMS oauth: no access_token in response')

            const { body: profile } = await superagent
                .get(`${endpoint}/api/oauth/userinfo`)
                .set('Authorization', `Bearer ${accessToken}`)

            return {
                // 绑定键：LMS 的 users.id（Hydro 用它写 oauth 集合 platform=lms）
                _id: String(profile.sub),
                email: profile.email || '',
                uname: profile.username ? [profile.username] : [],
                avatar: profile.avatar || '',
            }
        },
    })
}
