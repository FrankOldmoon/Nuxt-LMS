/**
 * Hydro OJ 的 LMS 登录插件（Hydro 5）
 *
 * 作用：
 *   1. 在 Hydro 登录页注册「LMS 账号登录」按钮，走 LMS 的 OAuth 授权码流程
 *   2. **自动 SSO**：没登录的人访问任何页面，直接 302 到 LMS 授权端点。
 *      LMS 那边如果浏览器已登录（同一个 10.28.1.151 域下的 auth_token cookie），
 *      会立刻签发 code 跳回来 —— 用户完全看不到登录页，就是"打开 155 就进去了"。
 *      LMS 没登录时才会看到 LMS 的登录页，登录完自动回到原页面。
 *
 * 安装（在 155 上）：
 *   mkdir -p ~/.hydro/addon/lms-oauth
 *   cp index.ts package.json locales/* ~/.hydro/addon/lms-oauth/  (locales 放 locales/)
 *   hydrooj addon add ~/.hydro/addon/lms-oauth
 *   pm2 restart hydrooj
 *
 * 配置（控制面板 → 系统设置，或 hydrooj cli system set）：
 *   lms-oauth.endpoint          http://10.28.1.151       （不要带末尾斜杠）
 *   lms-oauth.id                <LMS oauth_clients.client_id>
 *   lms-oauth.secret            <LMS oauth_clients 的明文 secret>
 *   lms-oauth.callback          http://10.28.1.155/oauth/lms/callback
 *   lms-oauth.autologin         true                     （默认 true，关掉就回到手动点按钮）
 *   lms-oauth.autologin.skip    /oauth/,/static/,/api/,/favicon,/_
 *
 * 注意：不能拿 server.url 拼回调地址 —— 本站 server.url 是 "/"（Caddy 反代、相对路径），
 * 拼出来是相对地址，和 LMS 白名单里的完整 URL 对不上。所以回调地址单独配置。
 * 这个值必须与 LMS oauth_clients.redirect_uris 里的字符串完全一致。
 */

import { Context, Handler, SystemModel, TokenModel, superagent } from 'hydrooj'

// cordis 要求：不声明 inject 就访问 ctx.oauth 会抛
// "cannot get property \"oauth\" without inject"（core 的 handler/user.ts 也是这么写的）
export const inject = ['oauth', 'server']

declare module 'hydrooj' {
    interface SystemKeys {
        'lms-oauth.endpoint': string
        'lms-oauth.id': string
        'lms-oauth.secret': string
        'lms-oauth.callback': string
        'lms-oauth.autologin': boolean
        'lms-oauth.autologin.skip': string
    }
}

/**
 * 不参与自动跳转的路径前缀
 *
 * /oauth/    —— 授权入口与回调本身，拦了就是无限循环
 * /static/   —— 静态资源
 * /api/      —— 前端 fetch，302 过去会拿到 HTML 解析失败，应该原样返回 401
 * /favicon   —— 图标
 * /_         —— Hydro 的内部路径（_server、_mongo 之类）
 */
const DEFAULT_SKIP = '/oauth/,/static/,/api/,/favicon,/_,/gen/'

function shouldSkip(path: string, skipList: string): boolean {
    return skipList
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .some((prefix) => path.startsWith(prefix))
}

function truthy(v: any): boolean {
    if (v === false || v === 'false' || v === 0 || v === '0') return false
    return true
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
                // 优先用显式传进来的 redirect（自动 SSO 层会把原始 URL 带过来），
                // 退回到 referer —— 302 跳转时浏览器不一定带 referer，不可靠
                TokenModel.add(TokenModel.TYPE_OAUTH, 600, {
                    redirect: this.session.oauthRedirect || this.request.referer || '/',
                }).then((r) => r[0]),
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

    // ---------------------------------------------------------------- 自动 SSO
    //
    // 用 serverLayer（在路由之前），不能用手 handlerLayer：
    // handlerLayers 外面包着 base 图层，它 await next() 之后会检查 ctx.handler，
    // 发现没有 handler 就 log「No handler found」并把 status 改成 500 —— 302 会被吃掉。
    // serverLayer 在 router 之前短路，koa 直接按我们设的 status 返回。
    ctx.server.addServerLayer('lms-sso-auto', async (c: any, next: () => Promise<void>) => {
        // 只处理浏览器的页面导航：GET + 要 HTML。
        // 图片/脚本/fetch 一律放行，避免把资源请求也 302 成 HTML。
        if (c.method !== 'GET') return next()
        const accept = String(c.request?.headers?.accept || '')
        if (!accept.includes('text/html')) return next()

        // ------------------------------------------------------------ 判断依据说明
        // serverLayer 阶段拿不到 Hydro 的 session（实测 c.session === undefined，
        // 连 c.HydroContext 都没有 —— 那些要等更内层的 userLayer 才建好）。
        // 所以只能看 cookie：
        //   hydro_uid  由下面的 sync 层在「确认已登录」时种的标记，值是 uid
        //   sso_off    主动登出后的静默期，避免刚点登出就被自动登回去
        //   sso_try    120 秒短标记，防重定向死循环
        //
        // 注意：**不能用 sid 判断**。koa-session 给每个访客都发 sid（游客也有），
        // 早先按 sid 放行，结果「访问过一次 155 但没登录」的浏览器永远不再跳 SSO ——
        // 表现就是「151 明明登录着，155 还是未登录」。
        const cookieHeader = String(c.request?.headers?.cookie || '')
        const readCookie = (name: string) => {
            const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
            return m ? m[1] : null
        }

        // 刚主动登出 → 静默期内别打扰（否则 LMS 会把人立刻登回来，根本退不出去）
        if (readCookie('sso_off')) return next()

        // 确认登录过 → 放行
        if (readCookie('hydro_uid')) return next()

        // 刚从 SSO 回来但还没拿到会话（用户取消、或 LMS 报错）→ 放行这一次，别死循环
        if (readCookie('sso_try')) return next()

        if (!truthy(await SystemModel.get('lms-oauth.autologin'))) return next()

        const skip = (await SystemModel.get('lms-oauth.autologin.skip')) || DEFAULT_SKIP
        if (shouldSkip(c.path, skip)) return next()

        // 没会话也没标记 → 送去 LMS。LMS 那边如果已登录会立刻签 code 回来，
        // 用户看不到任何登录页；没登录才会看到 LMS 的登录页。
        c.append('Set-Cookie', 'sso_try=1; Path=/; Max-Age=120; SameSite=Lax')
        c.status = 302
        c.set('Location', `/oauth/lms/login?redirect=${encodeURIComponent(c.path + (c.search || ''))}`)
        c.set('Cache-Control', 'no-store')
    })

    // ------------------------------------------------ 登录标记同步（handlerLayer）
    //
    // serverLayer 拿不到 session，但这里可以（在 userLayer 之后）。
    // 职责：把「这个浏览器当前是否真的登录着」写成 hydro_uid cookie，
    // 供上面那个 serverLayer 判断。
    ctx.server.addHandlerLayer('lms-sso-sync', async (c: any, next: () => Promise<void>) => {
        const cookieHeader = String(c.request?.headers?.cookie || '')
        const readCookie = (name: string) => {
            const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
            return m ? m[1] : null
        }

        // 主动登出：清标记 + 静默 10 分钟
        // （放在 next() 之后设置 —— session 中间件在 next() 内部跑，
        //   它会用 set 覆盖 Set-Cookie，我们在它之后 append 才留得住）
        const isLogout = c.path === '/logout'
        await next()

        if (isLogout) {
            c.append('Set-Cookie', 'hydro_uid=; Path=/; Max-Age=0')
            c.append('Set-Cookie', 'sso_off=1; Path=/; Max-Age=600; SameSite=Lax')
            return
        }

        const isPage = c.method === 'GET' && String(c.request?.headers?.accept || '').includes('text/html')
        if (!isPage) return

        const uid = c.session?.uid
        if (uid) {
            // 已登录 → 确保标记存在（uid 变了也更新）
            if (readCookie('hydro_uid') !== String(uid)) {
                c.append('Set-Cookie', `hydro_uid=${uid}; Path=/; Max-Age=31536000; SameSite=Lax`)
            }
        } else if (readCookie('hydro_uid')) {
            // 标记还在但 session 已无 uid（过期/被清）→ 清标记，下次访问重新走 SSO
            c.append('Set-Cookie', 'hydro_uid=; Path=/; Max-Age=0')
        }
    })
}
