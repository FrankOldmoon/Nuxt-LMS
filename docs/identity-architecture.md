# 统一身份（账号同步）架构决策

> 结论先行：**不要做"账号密码同步"，做"唯一 IdP + 全部系统当 SP"。**
> **LMS 可以直接当这个 IdP**（等价于"其它系统接入微信登录"），前提是把协议实现成标准 OIDC。
> 改不了代码的系统（Velxio / Web Maker）用反代 forward-auth 兜住 —— oauth2-proxy 能对接任意 OIDC issuer，包括 LMS。
>
> 状态：方案待实施 ｜ 最后更新 2026-10-20（v2：修正"LMS 不能当 IdP"的错误结论）

---

## 1. 为什么不能继续点对点

已有 / 规划中的系统：

| 系统 | 地址 | 能否改代码 |
|---|---|---|
| LMS | 10.28.1.151 | 能（本项目） |
| Hydro OJ | 10.28.1.155 | 能（可装 addon 插件） |
| AI Tech Hub（vision） | 10.28.1.152 | 能（Nuxt4） |
| Velxio 模拟器 | 10.28.1.154:3080 | **不能**（第三方预构建） |
| Web Maker | 10.28.1.154:8095 | **不能**（第三方预构建） |
| 后续采购系统（ManageBac 等） | — | 不能 |

点对点对接的链路数 = n(n-1)/2：3 个系统 3 条、4 个系统 6 条、6 个系统 15 条。
每条链路都要单独做账号映射、密码策略、改密回调、离职停用，运维成本平方级增长。

**硬约束：有两个系统根本改不了代码**，任何"改应用登录逻辑"的方案都覆盖不到它们，必须在**反向代理**上拦截。

但这**不构成"LMS 不能当 IdP"的理由**：forward-auth 组件（oauth2-proxy / Casdoor forward-auth / Authentik outpost）本质是**标准 OIDC 客户端**，对接谁都可以。oauth2-proxy 配 `--oidc-issuer-url=http://10.28.1.151` 就完事了。

所以真正的约束只有一条：**LMS 的认证端点必须说标准协议**，否则任何标准客户端都接不上。

---

## 2. 选型：谁当 IdP

### 2.1 先看学校有没有现成的

学校（民心港人子弟学校）大概率已有 Microsoft 365 或 Google Workspace。
学生邮箱是 `@minxinnansha.org.cn`，如果这个域在 Workspace / Entra ID 里：

- **首选：直接用 Google Workspace 或 Entra ID 当 IdP。**
  - 零运维、天然 MFA、天然覆盖采购系统（它们本来就走 SSO）
  - LMS / Hydro / Vision 都注册成 OIDC client（或 SAML SP）
  - 缺点：账号生命周期受制于学校 IT，退学/转学要等他们操作
- 此时 Casdoor 只在一种情况下才需要：要把**老协议客户端**（LDAP/RADIUS/CAS）或**数据库里的历史账号**桥到 OIDC。

### 2.2 没有现成 IdP 时

| 方案 | 适合 | 不适合 |
|---|---|---|
| **Casdoor**（推荐） | 单 Go 二进制，无 JVM；原生中文界面；OIDC + SAML + CAS + **LDAP/RADIUS 服务端** + SCIM；可从 AD / Workspace / 任意 SQL 导入用户 | 超大企业级授权场景 |
| Authentik | 反代 forward-auth 最强，可视化 flow，给没有登录能力的老应用加 SSO 最顺 | 单租户，部分功能在企业版 |
| Keycloak | 生态最大、审计友好、认证流最深 | Java 栈重，中文界面生硬，运维成本高 |
| Zitadel | B2B 多租户 SaaS | 我们是单租户学校，用不上 |
| 自建薄 OIDC（写在 LMS 里） | 只有 2 个系统、都是自己的代码 | 覆盖不了改不了代码的系统 |

**推荐 Casdoor**，三个现实理由：

1. 155 上已有 `mysql:8.4.4` docker（13306），151 上有 PG —— Casdoor 两者都支持，**不用引入新数据库**
2. 自带 **LDAP / RADIUS / CAS 服务端**，学校以后接打印机、VPN、Wi-Fi 认证不用再找别的组件
3. 中文界面，交给学校 IT 同事维护成本最低

部署建议：放在 151（与 LMS 同机，nginx 反代方便），或单独一台小 VM。
**不要**和 Hydro 放同一台 —— 155 已经跑着评测机，负载敏感。

### 2.3 决策树

```
学校有没有 Workspace / Entra ID？
├─ 有 ──→ 优先用它（零运维、天然 MFA、采购系统本来就认它）
└─ 没有 ──→ LMS 直接当 IdP（推荐起步，见 2.4）
            只需要在下面任一信号出现时才换成独立 IdP：
            ├─ 有第三方厂商系统要对接（对方不会为你定制 client）
            ├─ 学校 IT 要独立管账号（不想进 LMS 后台加人）
            ├─ 需要 MFA / Passkey / 审计日志 / 登录风控
            └─ LMS 本身要重构或更换
```

### 2.4 把 LMS 做成 IdP 需要什么

"其它系统加一个『用 LMS 账号登录』按钮" = 其它系统成为 OIDC client，LMS 成为 issuer。
和"微信登录"完全同构，差异只有三点：

| | 微信 | LMS 当 IdP |
|---|---|---|
| 授权页 | 统一授权确认页 | 内部系统可跳过（已登录直接回调） |
| 暴露信息 | openid / 昵称 / 头像 | `sub` / name / avatar / 班级（可选） |
| 凭证有效期 | access_token + refresh_token | **只用短命 code**，SP 换到身份后自己建 session，不需要 refresh |

第三点是关键简化：Hydro 这类系统拿到身份后走自己的 session，**不需要长期 access_token 去调 LMS API**。
所以不必实现完整 OIDC 的 token 刷新、scope 授权、userinfo 缓存那一整套。

**最小可用 = 2 个端点**：`/oauth/authorize`（发 code）+ `/oauth/token`（换身份）。
**推荐做满 = 再加 2 个**：`/.well-known/openid-configuration` + `/oauth/userinfo`，这样 oauth2-proxy、采购系统、以后的 Casdoor 都能直接对接，不用改一行代码。

代价对比：

| | LMS 当 IdP | 独立 IdP（Casdoor） |
|---|---|---|
| 新增组件 | 0 | 1 个服务 + 1 个库 |
| 新系统接入成本 | 注册 client + 加按钮 | 同上，外加运维 IdP |
| 账号来源 | 现成的 `users` 表，零迁移 | 要导入 + 长期双写 |
| 故障域 | LMS 挂 = 全校登不上 | IdP 挂 = 全校登不上（**一样**） |
| 发版风险 | LMS 每次部署都可能影响认证 | 与业务隔离 |
| 学校 IT 自助管理 | 要进 LMS 后台 | 有独立管理台 |

**结论：系统数量少、都自己维护、学校没有现成 IdP → LMS 当 IdP 是正确选择，不是过渡方案。**
换独立 IdP 的成本被"标准 OIDC"这个前提压到了极低：SP 侧只改 `issuer` 一行。

---

## 3. 核心数据模型

### 3.1 原则

1. **应用侧只认 `sub`**（IdP 内的稳定用户标识），永不拿 username / email 当外键。
   - 用户改名、换邮箱、学号变更都不会炸。
   - Hydro 现有 uname 是 `Anna Zhong` 这种带空格的真实姓名，拿名字做键必然出错。
2. **账号主数据在 IdP**，LMS 的 `users` 表降级为**业务档案**（班级、角色、成绩、头像），不再存唯一凭据。
3. **映射表独立**，不要往业务表里塞 `hydro_uid`、`casdoor_id` 这类字段 —— 接第 5 个系统时又要改表。

### 3.2 映射表（LMS 侧）

```sql
CREATE TABLE external_identities (
  id            serial PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  system        varchar(50)  NOT NULL,   -- 'idp' | 'hydro' | 'vision' | ...
  external_id   varchar(255) NOT NULL,   -- IdP 的 sub / Hydro 的 uid
  external_name varchar(255),            -- 仅用于人工排查，不参与匹配
  linked_at     timestamptz DEFAULT now(),
  UNIQUE (system, external_id)
);
CREATE INDEX ON external_identities (user_id);
```

- 唯一键放在 `(system, external_id)`：一个外部账号只能绑一个 LMS 用户。
- `user_id` 不唯一：一个用户可以有 idp + hydro + vision 多条。
- **迁移必须用新文件名**（`npx nuxt db generate` → `0005_xxx`），生产迁移器只按文件名判重，改已发布的 0000–0004 不会生效。

### 3.3 登录时的 JIT provisioning

```
IdP 回调 → 拿到 sub
  ├─ external_identities 有 (idp, sub) → 直接登录
  ├─ 没有 → 用 email 找 users
  │    ├─ 找到 → 建映射（写 external_identities）→ 登录
  │    └─ 没有 → 建 users 行（username 取 IdP 提供的学号/邮箱前缀，冲突加后缀）→ 建映射 → 登录
  └─ 全程失败 → 拒绝并提示"账号未开通，联系管理员"
```

email 匹配**只能用于首次绑定**，绑完就以 `sub` 为准。学生会改邮箱，不能长期依赖。

---

## 4. 各系统接入方式

| 系统 | 接入方式 | 工作量 |
|---|---|---|
| LMS | OIDC client（`nuxt-auth-utils` 或自写 3 个端点） | 1 天 |
| Hydro | 自定义 `ctx.oauth.provide()` provider 插件，约 60 行 | 半天 |
| Vision（Nuxt4） | 同 LMS | 半天 |
| Velxio / Web Maker | **不改应用**，nginx `auth_request` + forward-auth，或 IdP 的 proxy outpost | 半天 |
| 采购系统 | 看它支持 SAML 还是 OIDC，IdP 后台建应用即可 | 按系统 |

### 4.1 forward-auth 是覆盖"改不了代码"的唯一办法

```nginx
location / {
    auth_request /_auth;                       # 未登录 → 302 到 IdP
    auth_request_set $user $upstream_http_x_auth_user;
    proxy_set_header X-Auth-User $user;
    proxy_pass http://127.0.0.1:3080;
}
location = /_auth {
    internal;
    proxy_pass http://idp-outpost/outpost.goauthentik.io/auth/nginx;
}
```

Casdoor 有 `casdoor-forward-auth`（Traefik/Caddy/Nginx），Authentik 有 outpost。这条路让**完全不能改的服务**也纳入统一登录。

---

## 5. 实施顺序（每步都可回退）

| 阶段 | 动作 | 回退方式 |
|---|---|---|
| 0 | LMS 实现 `authorize` / `token` / `userinfo` + discovery，注册 hydro、vision 两个 client | 纯新增接口，不启用 |
| 1 | 建 `external_identities`，回填 `(hydro, uid)`；把 `getOjStatus` 改成按 uid 查 | 只增表 / 回滚代码 |
| 2 | Hydro 装 provider 插件，登录页出现「LMS 账号登录」，**保留原密码登录** | 卸载 addon |
| 3 | Vision 接入；Velxio / WebMaker 上 `oauth2-proxy` + nginx `auth_request` | 撤 nginx 配置 |
| 4 | 观察 1–3 个月，确认无人用本地密码后再关闭 | 重新打开 |

**永远不要在第 5 步之前删掉本地密码登录。** IdP 挂掉 = 全校登不上，必须留 break-glass 管理员账号（本地密码 + 强口令 + 限制内网）。

---

## 6. 已知的坑

### 6.1 iframe 内的登录态不会被 SSO 解决

章节里的 OJ 题目是 iframe 嵌入的。即使 LMS 已登录，Hydro 在 iframe 里仍是未登录状态：

- 浏览器把不同 IP/域视作不同站点，第三方 cookie 在跨站 iframe 里默认不发
- 纯 http 内网无法设置 `SameSite=None; Secure`（Secure 要求 https）

三种解法，按成本排序：

1. **OJ 题目改成新窗口打开**（最省事，体验略降）
2. **Hydro 插件提供一次性票据**：LMS 渲染时生成 `ticket`（30s、一次性、绑定 uid），iframe src 带上 → Hydro 插件校验后建 session。能让 iframe 内直接是登录态，但需要改 Hydro 插件 + LMS 渲染端
3. 全站上 https（真实域名或内网 CA），再用 `SameSite=None`

建议先做 1，稳定后再做 2。

### 6.2 用户名/邮箱不能当主键

- Hydro 1042 个用户的 uname 是带空格的真实姓名
- LMS 现有 OJ 判定是 `GET /record?uidOrName=<username>`，靠名字反查 —— 只要一个学生两边名字不一致，AC 永远判不到
- 阶段 1 必须把这条查询改成 `uid=<hydro uid>`（走映射表），这是**比密码同步更紧急**的修复

### 6.3 密码迁移没有捷径

- LMS 存 `scrypt(salt:key)`，Hydro 存 `pbkdf2(pwd, salt, 100000, 64, sha256)`，哈希互不兼容
- 唯一正确做法：用户下次成功登录时（手上有明文）顺手在另一侧写一份，或直接让 SSO 取代密码
- **不要**为了同步而把密码存成可逆加密

### 6.4 http 内网的 OIDC

- 顶级跳转（302 → IdP → 302 回应用）在 http 下可用，`SameSite=Lax` 的 cookie 会随顶级导航带上
- 但任何**隐藏 iframe / XHR 跨站**方式都会失败
- 长期建议给 IdP 一个真实域名 + 证书（如 `id.minxin.app`），内网 DNS 指向 151

---

## 7. LMS 作为 IdP 的实现清单（阶段 0）

### 7.1 新增两个表

```sql
CREATE TABLE oauth_clients (
  id            serial PRIMARY KEY,
  client_id     varchar(64)  NOT NULL UNIQUE,
  client_secret varchar(255) NOT NULL,          -- 存 hash，不存明文
  name          varchar(100) NOT NULL,          -- 'Hydro OJ'
  redirect_uris jsonb        NOT NULL,          -- ["http://10.28.1.155/oauth/lms/callback"]
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE oauth_codes (
  code         varchar(64) PRIMARY KEY,
  client_id    varchar(64) NOT NULL,
  user_id      integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri varchar(500) NOT NULL,
  expires_at   timestamptz NOT NULL,            -- 签发 + 60 秒
  used         boolean     DEFAULT false
);
```

### 7.2 四个端点

| 路径 | 文件 | 要点 |
|---|---|---|
| `GET /api/oauth/authorize` | `modules/base/server/api/oauth/authorize.get.ts` | 校验 client + `redirect_uri` 白名单；`getCurrentUser(event)` 已登录则直接发 code，未登录 302 到 `/login?redirect=<本站路径>` |
| `POST /api/oauth/token` | `.../oauth/token.post.ts` | 校验 `client_secret`（比对 hash）；code 必须**一次性 + 60s 过期**；返回 `access_token`（复用 `tokens` 表）+ `id_token` |
| `GET /api/oauth/userinfo` | `.../oauth/userinfo.get.ts` | `Authorization: Bearer <token>` → 返回 `{ sub, name, username, avatar }` |
| `GET /.well-known/openid-configuration` | `server/routes/.well-known/openid-configuration.get.ts` | 声明 issuer / authorization_endpoint / token_endpoint / jwks_uri |

> Nitro 对点开头的目录名处理不稳定。若 `/.well-known/...` 注册不上，退回：把 discovery 放在 `/api/oauth/discovery`，nginx 加一条 `location = /.well-known/openid-configuration { proxy_pass http://127.0.0.1:3000/api/oauth/discovery; }`。

### 7.3 authorize 骨架（贴合现有代码风格）

```ts
// modules/base/server/api/oauth/authorize.get.ts
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const { client_id, redirect_uri, state, response_type } = q

  const [client] = await db.select().from(schema.oauthClients)
    .where(eq(schema.oauthClients.clientId, client_id || '')).limit(1)

  // redirect_uri 必须精确命中白名单，绝不做前缀匹配（防开放重定向）
  if (response_type !== 'code' || !client || !client.redirectUris.includes(redirect_uri)) {
    return sendError(event, createError({ statusCode: 400, statusMessage: 'invalid_request' }))
  }

  const user = await getCurrentUser(event)          // guards.ts，未登录返回 null
  if (!user) {
    // 只允许回到本站，不能把外部 redirect_uri 塞进登录回跳
    return sendRedirect(event, `/login?redirect=${encodeURIComponent(event.path + '?' + new URLSearchParams(q))}`)
  }

  const code = generateToken()
  await db.insert(schema.oauthCodes).values({
    code, clientId: client_id, userId: user.id, redirectUri: redirect_uri,
    expiresAt: new Date(Date.now() + 60_000),
  })
  return sendRedirect(event, `${redirect_uri}?code=${code}&state=${state || ''}`)
})
```

`sub` 必须用 `users.id`，**不要**用 username。SP 侧一旦把 username 存成主键，学生改名就断链。

### 7.4 SP 侧（Hydro / Vision）要做的

- Hydro：装 2.1 节给的 `ctx.oauth.provide('lms', …)` 插件，回调里拿 `sub` 当绑定键
- Vision（Nuxt）：`nuxt-auth-utils` 或自写 callback，逻辑同上
- 两边都复用**各自的** session 机制，LMS 不参与

### 7.5 单点登出做不到，要提前想清楚

SSO 解决"一次登录全通"，**不解决"一次登出全退"**。LMS 登出后，Hydro 里的 session 还在，机房共用电脑上会出现"下一个学生打开 OJ 还是上一个人的账号"。

Hydro 不支持 back-channel logout，所以只有三个现实选项：

1. **短 session**：SP 侧 session TTL 压到 30 分钟（最省事）
2. **登出广播**：LMS 登出页用隐藏 iframe 依次打各 SP 的 `/logout`（老式 SSO 做法，依赖各 SP 允许被 iframe）
3. **forward-auth 兜底**：所有请求都过 nginx `auth_request` 校验 LMS session，天然联动（代价是每个请求多一跳）

机房场景建议 1 + 2 组合。

---

## 8. 切换到纯 SSO：关掉 Hydro 的密码登录

### 8.1 好消息：不需要改代码

Hydro 的 `server.login` 开关同时控制前后端：

| 位置 | 行为 |
|---|---|
| `templates/user_login.html` | `{% if model.system.get('server.login') %}` 包住用户名/密码表单 → 关掉后**自动只剩 OAuth 按钮** |
| `templates/partials/login_dialog.html` | 同上（导航栏登录弹窗） |
| `templates/partials/nav.html` | 关掉后注册入口消失 |
| `handler/user.ts:76` | `if (!judge && !system.get('server.login')) throw new BuiltinLoginError()` → **POST /login 后端也拒绝**，不只是藏 UI |
| `handler/user.ts:246` | 注册同样被拒 |

所以"取消账号密码登录"= 一条命令：

```bash
hydrooj cli system set server.login false
pm2 restart hydrooj
```

### 8.2 但顺序不能反

Hydro 的 OAuth 回调认领旧账号只有两条路（`OauthCallbackHandler`）：

1. `oauth` 表里有 `(platform=lms, id=<sub>)` → 直接登录
2. 没有 → **按 email 查已有账号**（`user.getByEmail('system', r.email)`）→ 找到就绑定
3. 都没有 → `canRegister` 为真则走注册，为假则报 `No bound account found`

**所以必须先预填绑定、再关密码登录。** 反过来做，email 对不上的学生会在关掉开关的那一刻集体登不进去。

预填脚本思路（只读导出 → 比对 → 写绑定）：

```js
// 1. Hydro 侧导出：{ uid, uname, mail }
// 2. LMS 侧导出：{ id, username, email, name }
// 3. 按 email 小写精确匹配 → 生成 { platform:'lms', id:String(lmsId), uid:hydroUid }
// 4. 写入 mongo oauth 集合（唯一索引 platform+id，重复写无害）
db.oauth.insertMany(bindings, { ordered: false })
```

### 8.3 155 的实测数据（2026-10-20）

| 指标 | 数量 |
|---|---|
| 总用户 | 1042 |
| `@minxinnansha.org.cn` 邮箱 | **1038** ← 可自动认领的池子 |
| `@hydro.local` 占位邮箱 | 3（Guest / Hydro / admin，不该给学生用） |
| 其它（qq.com） | 1（Frank 自己） |
| uname 带空格 | 9 |
| **有过提交记录的用户** | **284** ← 这 284 个必须 100% 对上，否则 AC 记录成孤岛 |

匹配可行性高：1038/1042 是真实域名邮箱。真正的校验点是 **LMS 的 `users.email` 是否也是同一批地址**。

### 8.4 必须一起处理的三件事

**① `canRegister` 设成 `false`**

```ts
ctx.oauth.provide('lms', { ..., canRegister: false, lockUsername: true })
```

设 true 会在 email 对不上时**自动新建账号**，旧账号的提交记录就变成孤儿数据 —— 对已有 1042 用户的系统这是灾难。

**② 关掉 `/lostpass` 入口**

模板里 "Forgot password" 链接在 `{% if %}` **外面**，关掉 `server.login` 后它仍然显示。点进去能重置密码，但密码登录已经不可用，纯粹制造困惑。要一并隐藏（改模板或加 before 钩子拦截 `/lostpass`）。

**③ 管理员应急通道**

`POST /login` 带 `judge=true` 且账号有 `PRIV_JUDGE` 时仍可登录（`handler/user.ts:79` 的评测机通道）。这是隐藏后门，可用但别依赖。

更可靠的做法：出问题时临时打开

```bash
hydrooj cli system set server.login true && pm2 restart hydrooj
# 处理完再关回去
```

### 8.5 收尾检查

- [ ] 已有 session 不会立刻失效（老账号仍在线），要不要主动清由你决定
- [ ] 评测机 / 任何用账号密码调 API 的脚本：确认走的是 token 不是 `/login`
- [ ] 关掉后从**学生视角**走一遍：LMS 登录 → 打开 Hydro → 点「LMS 账号登录」→ 回到 Hydro 且是自己的账号
- [ ] 抽查 3 个历史上提交最多的账号，确认 AC 记录还在

### 8.6 实测比对结果（2026-10-20，只读）

| 指标 | 数量 | 占比 |
|---|---|---|
| LMS 有效用户（未软删） | 1070 | — |
| Hydro 用户 | 1042 | — |
| **可自动绑定（邮箱命中）** | **1034** | **99.2%** |
| 无法自动绑定 | 8 | 0.8% |
| Hydro 活跃用户（有提交记录） | 284 | — |
| 活跃用户可自动绑定 | 281 | 98.9% |

LMS 侧无重复邮箱。8 条差异全部核实：

| Hydro | 情况 | 处理 |
|---|---|---|
| uid=0 `Guest` / uid=1 `Hydro` | 系统账号 | 不绑定 |
| uid=2 `admin` (admin@hydro.local) | 占位邮箱 | **必须手工指定一个 LMS 管理员账号**，否则关掉密码登录后没人能进后台 |
| uid=3 `frank.hu` (hxf2020@qq.com) | 与 LMS #32 邮箱不同 | 个人测试号，可弃用或手工绑 |
| uid=4 `Anna Zhong` | LMS #35 存在，但 **email 为空** | 按姓名手工绑定 |
| uid=12 `Zoey Wu` | LMS #33 存在，但邮箱是 `zoey.**zhou**@` 而 Hydro 是 `zoey.**wu**@` | 按姓名手工绑定 |
| uid=176 `20230414` / uid=416 `20246333` | LMS 中查无此人（姓名与学号都无） | 疑似离校学生，需确认是否保留账号 |

### 8.7 实施进度（2026-10-20）

已完成：

| 项 | 结果 |
|---|---|
| 生产库迁移 | ✅ `oauth_clients` / `oauth_codes` 已建 |
| OAuth client | ✅ `lms_a22e55d339d0a7a6`，redirect_uris 已登记 |
| Hydro 绑定预填 | ✅ **1037 条** upsert（email 1034 + 姓名兜底 2 + admin 手工 1） |
| Hydro 插件 | ✅ 已注册、4 项配置已写、`pm2 restart` 通过 |
| 跳转验证 | ✅ `GET /oauth/lms/login` → 302 到 LMS authorize，参数正确 |
| LMS 发版 | ✅ 已上线，端到端登录通过 |
| **关闭密码登录** | ✅ `server.login = false`（布尔），表单 0 处、`POST /login` 403 |

关闭后实测：

| 检查项 | 结果 |
|---|---|
| 登录页 `name="uname"` 输入框 | **0 处**（表单已消失） |
| 「Sign in with LMS」按钮 | 2 处（登录页 + 登录弹窗） |
| `GET /oauth/lms/login` | 302 正常 |
| `POST /login` | **403**（后端拒绝，不只是藏 UI） |
| `GET /` 首页 | 200 |

遗留：`/lostpass` 仍可访问（返回 200），登录页也还有 "Forgot password" 链接 ——
因为该链接在模板 `{% if %}` **外面**，不受 `server.login` 控制。用户点进去能重置密码，
但密码登录已关闭，重置完仍然登不进去，属于纯困惑项。处理方式见 8.10。

### 8.10 关闭 `server.login` 的两个坑

**① CLI 写入的是字符串 `"false"`，不是布尔 `false`**

```bash
hydrooj cli system set server.login false   # mongo 里变成 "false"（string）
```

字符串 `"false"` 是 truthy，所以：

- 模板 `{% if system.get('server.login') %}` 仍然成立 → **表单还在**
- 但后端 `if (!system.get('server.login'))` 判假 → 登录被拒（403）

结果就是「表单还在、但登不进去」。正确做法是直接写布尔值：

```js
db.system.updateOne({ _id: 'server.login' }, { $set: { value: false } })
```

写完必须 `pm2 restart hydrooj`。验证：`typeof db.system.findOne({_id:'server.login'}).value === 'boolean'`。

**② `/lostpass` 不受 `server.login` 控制**

`handler/user.ts` 只给 `UserLoginHandler.post` 和 `UserRegisterHandler.post` 加了
`BuiltinLoginError` 检查，`UserLostPassHandler` 没有。要挡可以在插件里加：

```ts
ctx.on('handler/before/user_lostpass#get', (h) => {
    h.response.redirect = '/login'
    return 'cleanup'   // 跳过原 handler；该返回值取自 framework 的 steps 机制，需实测
})
```

---

剩余未绑定的 4 个 Hydro 账号：

| uid | uname | 说明 |
|---|---|---|
| 1 | Hydro | 系统号，有提交记录（评测测试），不绑 |
| 176 / 416 | 20230414 / 20246333 | LMS 查无此人，疑似离校 |
| 5 | Frank Hu | 与 uid=3 抢 LMS #32，保留 uid=5（email 命中） |

### 8.8 实测踩到的三个坑

**① 插件必须声明 `export const inject = ['oauth']`**
否则运行时抛 `cannot get property "oauth" without inject`，插件静默加载失败（页面照常返回 200，只是没按钮）。

**② `server.url` 的值是 `/`，不能用来拼回调地址**
本站 Caddy 反代、相对路径，拼出来是 `/oauth/lms/callback`，和 LMS 白名单里的完整 URL 对不上。必须单独配置 `lms-oauth.callback`。

**③ Hydro 5 的登录页是前端渲染，curl 看不到按钮**
~~`curl /login` 只有 11KB 骨架~~ 实际是服务端渲染，能看到 `immersive--content` 区块；
但**按钮文案要靠 i18n 才知道对不对**，所以验证插件是否生效仍以 `GET /oauth/lms/login` 是否 302 为准。

### 8.9 按钮文案与多语言

`ctx.oauth.provide()` 的 `text` 是 **i18n key**，模板里走 `{{ _(v.text) }}`。
写死中文会导致英文界面也显示中文，所以必须配 locale 文件。

插件目录下放 `locales/<lang>.yaml`，Hydro 启动时扫每个插件的 `locale` / `locales` 目录
（`hydrooj/src/entry/common.ts` 的 `locale()`，文件名去扩展名即语言码）：

```
~/.hydro/addon/lms-oauth/locales/en.yaml   →  'Sign in with LMS': 'Sign in with LMS'
~/.hydro/addon/lms-oauth/locales/zh.yaml   →  'Sign in with LMS': 'LMS 账号登录'
```

启动日志出现 `Locale init: /root/.hydro/addon/lms-oauth` 即加载成功。
**locale 只在启动时加载，改文案后必须 `pm2 restart hydrooj`。**

代码里对应的 key 是：

```ts
text: 'Sign in with LMS',   // i18n key，不是显示文本
name: 'lms',                // 内部标识，不可改（mongo oauth 的 platform 已是 lms）
```

当前缺 `zh_TW.yaml`（港人子弟学校若用繁体需补 `'LMS 帳號登入'`）。

---

## 9. 接入 Gitea（10.28.1.160）

### 9.1 Gitea 侧的现实约束

| 事实 | 影响 |
|---|---|
| Gitea 1.27.3，systemd 直跑（无 docker、无 nginx），`/data/gitea/conf/app.ini`，PostgreSQL | 改配置 = 改 app.ini + `systemctl restart gitea` |
| 没有「通用 OAuth2」provider，通用档只有 **OpenID Connect** | 必须让 LMS 变成真正的 OIDC Provider |
| `openidConnect.New(...)` 强制 ① discovery 文档 ② token 响应里有 `id_token` | 只做 OAuth2 不够，goth 直接报 `cannot get user information without id_token` |
| goth 的 `getOpenIDConfig` 是 `GET` 传入的整个 URL，**不拼** `/.well-known/openid-configuration` | discovery 可以放在任意路径，不必占根目录 |
| goth 只校验 `aud` / `iss` / `exp`，**不验签** id_token | 先用 HS256(client_secret) 签名即可，不必上 JWKS/RS256 |
| 1030 个账号里 1029 个邮箱是 `<学号>@students.local` 占位符 | **不能像 Hydro 那样按 email 认领**，只能按「学号 = LMS username」预绑定 |

### 9.2 LMS 侧新增（OIDC 补齐）

| 文件 | 作用 |
|---|---|
| `modules/base/server/api/oauth/openid-configuration.get.ts` | discovery 文档（issuer / 三个端点 / 支持的 alg 与 claims） |
| `oauth/token.post.ts` | 增加 `id_token` 签发；同时接受 `client_secret_post` 与 `client_secret_basic`；自己解析 urlencoded 与 JSON 两种请求体 |
| `oauth/userinfo.get.ts` | 补 `preferred_username` / `nickname` / `picture` / `email_verified`（Gitea 读 nickname→preferred_username、picture） |

issuer 默认取请求 origin，可用配置项 `site:oauth.issuer` 覆盖（反代没透传 Host 时兜底）。
三个端点、discovery、`id_token.iss` 必须同源，否则客户端 `iss` 校验直接失败。

### 9.3 账号绑定（不是 email，是学号）

Gitea 回调查找顺序（`routers/web/auth/oauth.go` → `oAuth2UserLoginCallback`）：

1. `users.login_source` + `login_name` —— 只有 OAuth 自动注册的账号才有
2. **`external_login_user(login_source_id, external_id)`** ← 预绑定写这里，`external_id = sub = LMS users.id`
3. 都没命中 → 因为 `ENABLE_AUTO_REGISTRATION=false`，弹「关联已有账号」页 —— 那时密码登录已关，等于进不去

实测匹配（`scripts/gitea-oauth/build-bindings.mjs`）：1030 → 1027 条按学号自动命中，剩 3 条：

| gitea | 情况 | 处理 |
|---|---|---|
| `frank`（admin） | LMS 无 `frank`，Frank 本人是 LMS `admin`(#1) | `--map 1:1` 手工绑 |
| `ict-demo` | LMS 无对应，从未登录过 | 不绑（登录不了，仓库仍在） |
| `teacher-admin` | 同上 | 不绑 |

### 9.4 关掉 Gitea 本地登录

```ini
[service]
ENABLE_PASSWORD_SIGNIN_FORM = false   ; 隐藏登录表单，且 POST /user/login 直接 403
ENABLE_BASIC_AUTHENTICATION = false   ; 密码式 Basic Auth（含 git over http 用密码）全关
ENABLE_PASSKEY_AUTHENTICATION = false ; 否则登录页留一个 passkey 入口
```

`DISABLE_REGISTRATION = true` 原本就开着，注册入口不存在。
注意 `ENABLE_BASIC_AUTHENTICATION=false` **不影响** token 形式的 Basic Auth —— 现在是 0 个 token，全是密码，届时若有人用 `git clone http://user:pass@...` 会失效，需改用 token。

一键脚本：`scripts/gitea-oauth/switch-to-sso.sh`（幂等；`--rollback` 恢复密码登录）。

### 9.5 break-glass

LMS 挂了 = Gitea 全站登不上。三条自救通道，都不需要登录页：

```bash
bash scripts/gitea-oauth/switch-to-sso.sh --rollback            # ① 开回密码登录
sudo -u git env GITEA_WORK_DIR=/data/gitea GITEA_CUSTOM=/data/gitea \
  /usr/local/bin/gitea admin user change-password -u frank -p 'xxx'   # ② 改管理员密码
```

### 9.6 实测结果（2026-10-23 已上线）

| 项 | 结果 |
|---|---|
| 登录源 | `login_source` id=**2**（不是 1，序列早先被消耗过），`Provider=openidConnect`，`is_active=t` |
| 绑定 | `external_login_user` **1028 条**，`login_source_id=2` |
| 管理员链路 | LMS admin → Gitea `frank`：303 回首页，导航出现 `/user/logout`，页面含 `frank` ×23 |
| 学生链路 | LMS 20220498（id 444）→ Gitea `20220498`：303 回首页，页面含 `20220498` ×44 |
| 未绑定账号 | LMS `test01`（无绑定）→ 303 `/user/link_account`，**未登录**（`ENABLE_AUTO_REGISTRATION=false` 生效，不会自动建号） |
| 密码表单 | 登录页已无表单；`POST /user/login` → **403** |
| token 交换 | Go x/oauth2 先用 `client_secret_basic`，端点两种都认；请求体是 urlencoded，端点自己解析 |

**注意 `/user/login` 现在直接 303 → `/user/oauth2/lms`**：因为满足 `performAutoLoginOAuth2` 的条件
（只有 1 个 OAuth provider + 关密码表单 + 关 OpenID + 关 passkey + 无 SSPI），Gitea 会跳过自己的登录页。
这是想要的效果，但也意味着**没有「登录页」可以放错误提示** —— LMS 挂了用户直接看到 LMS 的连接错误。

残留：`/user/forgot_password` 仍返回 200。密码登录已关，重置出来的密码没有任何入口可用（`ENABLE_BASIC_AUTHENTICATION=false`），属无害残留。

git over HTTP 用密码也会一起失效（`ENABLE_BASIC_AUTHENTICATION=false` 的本意）。学生要 `git push` 得先 SSO 登录 → Settings → Applications → 生成 access token，用 token 当密码。留一行可回退：
`[service] ENABLE_BASIC_AUTHENTICATION = true`（只放开 API/git 的密码认证，**不会**恢复网页登录表单）。

### 9.7 修正：只预绑定会让教师掉进死胡同（同日 13:00 修复）

第一版只做「按学号预绑定」，问题在真机上立刻暴露：

- Gitea 的 1030 个账号里 **1028 个是学生学号**，只有一个 `frank` 和一个从没用过的 `teacher-admin`。
- LMS 的 **10 个教师账号在 Gitea 侧根本不存在** → 点登录必然走 `showLinkingLogin` → `/user/link_account`。
- 而 link_account 页要输 Gitea 用户名 + 密码 —— 密码登录已经关了，等于**死胡同**。
- 具体触发：Frank 在 LMS 用的是 `Frank Hu`(#32)，而第一版把 Gitea `frank` 绑给了 LMS `admin`(#1)，于是他一登录就撞上 link 页。

两处修正：

1. **改绑**：`frank` 主绑 LMS `Frank Hu`(#32)，同时用 `--extra 1:1` 把 LMS `admin`(#1) 作为**附加绑定**。`external_login_user` 主键是 `(external_id, login_source_id)`，一个 Gitea 用户挂多条是允许的，任一条命中即可登录。
2. **打开自动建号**：`[oauth2_client] ENABLE_AUTO_REGISTRATION = true`。LMS 是唯一身份源，教师/新学生首次登录直接建号，用户名取 `preferred_username`（Gitea 会把空格换成 `-`：`Jessica Yang` → `jessica-yang`）。已预绑定的 1029 条不受影响（`external_login_user` 先命中）。

实测（LMS id → Gitea）：

| LMS 账号 | 结果 |
|---|---|
| `Frank Hu` #32 | 303 回首页，身份是 `frank` |
| `Jessica Yang` #34（原本无 Gitea 账号） | 303 回首页，**自动建号** `jessica-yang`（`login_type=6`, `login_source=2`） |
| `20220498` #444（学生） | 仍然走预绑定，身份 `20220498`，没有重复建号 |
| `Anna Zhong` #35（**LMS 里 email 为空**） | 仍是 `/user/link_account` —— Gitea 自动建号强制要 email |

所以最后一个坑：**LMS 用户必须有邮箱**，否则永远建不了号。Anna Zhong 是唯一一个 email 为空的，在 LMS 补上即可（其他人都有 `@minxinnansha.org.cn`）。

风险提示：自动建号后，「LMS 用户名和 Gitea 用户名不一致的老账号」可能被新建成第二个号（只有靠预绑定避免）。目前只有 `frank` 属于这种情况，已手工绑好。

---

## 10. 接入 SurveyKing 问卷系统（10.28.1.157）

### 10.1 SurveyKing 的现实约束

SurveyKing 1.13.0（`javahuang/SurveyKing`），Docker 部署，容器内 `java -jar /app/surveyking.jar`，H2 文件库（`/app/db/surveyking.mv.db`），对外 80。

| 事实 | 影响 |
|---|---|
| 只内置 **Google / 微信** 两种第三方登录，端点**硬编码**在 `OAuthServiceImpl` 的常量池里 | 没有通用 OIDC 配置项可填 |
| Google 通道本身就是标准 OIDC：授权码 + **PKCE(S256)** + **nonce**，换 token 后用 `NimbusJwtDecoder` 拿 **JWKS 验 RS256 签名** | LMS 必须补齐这四项能力（比 Gitea 多） |
| `iss` 硬编码校验 `https://accounts.google.com` | 也要一起替换 |
| 服务器只有 JRE（无 javac/maven），重新构建不现实 | 走**字节补丁**：改常量池里的字符串 |
| H2 模式下 `BINARY auth_account = ?`（MySQL 专有）报 BadSqlGrammarException | 顺带修掉这个 H2 兼容坑 |

### 10.2 方案对比：为什么选字节补丁

| 方案 | 成本 | 风险 |
|---|---|---|
| **字节补丁（采用）** | 改 4 个常量 + 1 条 SQL 字符串 | 升级 SurveyKing 会丢补丁（有脚本可重打） |
| 改源码重新构建 | 要 JDK + Maven + 整个依赖树 | 服务器上做不到，构建链不可复现 |
| DNS + TLS 劫持 google 域名 | 装自签 CA 进 JRE truststore + 改 /etc/hosts + nginx | 4 个脆弱点；而且**授权那一步浏览器走的是公网 DNS**，客户端电脑也得改 hosts，做不到 |
| forward-auth 包一层 | — | 对 OAuth 授权流无效（浏览器要跳 provider） |

字节补丁的原理：这 4 个 URL 是 `private static final String` 编译期常量，**被内联进各自的调用点**；常量池条目按**索引**引用，所以重写常量池、保留后续字节流即可精确替换（脚本带 round-trip 自检，解析→序列化必须逐字节相同才允许写出）。

### 10.3 LMS 侧补齐（本次新增）

| 文件 | 作用 |
|---|---|
| `modules/base/server/utils/oauthKeys.ts` | RSA 密钥管理：env `NUXT_OAUTH_ID_PRIVATE_KEY` → configs 表 `site:oauth.idPrivateKey` → 自动生成并落库；RS256 签名 + JWKS |
| `modules/base/server/api/oauth/jwks.get.ts` | `GET /api/oauth/jwks`（公钥集合，Nimbus 验签要用） |
| `oauth/authorize.get.ts` | 把 `nonce` 与 `code_challenge` 存进 `oauth_codes` |
| `oauth/token.post.ts` | id_token 改 **RS256**、回显 `nonce`、**校验 PKCE**（code_verifier） |
| `oauth/openid-configuration.get.ts` | 补 `jwks_uri`、`id_token_signing_alg_values_supported: [RS256]`、`code_challenge_methods_supported` |
| `server/db/migrations/postgresql/0007_oauth_nonce_pkce.sql` | `oauth_codes` 加 `nonce` / `code_challenge` 两列 |

> Gitea 走 goth 只解码不验签，HS256 也能用；SurveyKing 走 Nimbus 必须验签，所以统一改成 RS256。
> `email_verified` 必须是 `true`（SurveyKing 硬校验），LMS 侧 = 用户有邮箱即为 true（1070 个账号里只有 1 个没邮箱）。

### 10.4 SurveyKing 侧改动

- **jar 补丁**：`scripts/surveyking-oauth/patch_google_to_lms.py`
  - 4 个常量 → LMS 端点；`BINARY auth_account = {0}` → `auth_account = {0}`（H2 兼容）
  - 前端文案 7 处：「Google 登录」→「LMS 账号登录」、管理端「Google Client ID」→「LMS Client ID」等
  - 输出 `surveyking-lms.jar`，原 jar 备份在 `backup/surveyking.jar.orig`
- **部署**：compose 里 bind mount 补丁 jar（`${SURVEYKING_PATH}/surveyking-lms.jar:/app/surveyking.jar`）
- **配置**：`T_SYS_INFO.OAUTH_SETTING`（JSON）= `{publicBaseUrl, google:{enabled,clientId,clientSecret}}`
- **绑定**：`T_ACCOUNT` 插一行 `AUTH_TYPE='GOOGLE'`, `AUTH_ACCOUNT='<LMS users.id>'` → 对应问卷账号
  - SurveyKing 查绑定用 `auth_type + auth_account` 精确匹配（**不按 email**），所以 `sub` 必须是 LMS `users.id`

### 10.5 实测结果（2026-10-27）

用一份指向本地 dev LMS 的测试 jar 跑了完整链路（生产 LMS 当时还是旧代码）：

| 步骤 | 结果 |
|---|---|
| `POST /api/public/oauth/login/google/start` | 返回 `authorizationUrl` 指向 LMS，带 client_id/redirect_uri/scope/**state**/**nonce**/**code_challenge**/code_challenge_method=S256 |
| 浏览器跳 LMS 授权（LMS 已登录） | 302 → `http://10.28.1.157/api/public/oauth/callback/google?code=...&state=...` |
| SurveyKing 回调 | 换 token → Nimbus 用 LMS 的 JWKS 验签通过 → 匹配绑定 → **302 `/` + 下发 `sk-token` 会话** |
| `GET /api/currentUser`（带会话） | 200，返回 Admin 用户 + 管理员权限列表 |
| `GET /api/currentUser`（无会话） | 401 |
| LMS 侧 | id_token：RS256 + kid、aud=client_id、nonce 回显、email_verified=true；用 JWKS 公钥验签通过 |

### 10.6 遗留与注意

- **生产 LMS 部署后才真正可用**：现在 151 上跑的还是旧代码（HS256、无 nonce、无 JWKS），点「LMS 账号登录」会失败。部署新代码即恢复。
- **升级 SurveyKing 镜像会丢补丁**：升级后重跑 `patch_google_to_lms.py` 即可。
- 补丁只改内容不改前端文件名，避免动 webpack 的 chunk hash 映射；浏览器缓存了旧 JS 的话按钮文案仍是「Google」，强刷（Ctrl+F5）即可。

### 10.7 登录按钮为什么之前不显示

前端条件是 `ue = !oe && ce.google`：

- `ce.oauthProviders.google` —— 服务端返回，配置好了就是 `true` ✅
- `oe = /MicroMessenger/i.test(navigator.userAgent)` —— **微信内置浏览器**

也就是说**在微信里打开问卷系统，LMS 登录按钮整个是隐藏的**（那是为「Google 登不了」设计的，现在这个通道走 LMS，微信里完全可用）。补丁里去掉了 `!oe &&`，微信里也能看到按钮了。

### 10.7.1 界面上的 Google 痕迹已全部清掉

| 位置 | 处理 |
|---|---|
| 登录页按钮 | 「Google 登录」→ **「LMS 账号登录」** |
| 个人设置 → 安全 → 登录方式列表里的 Google 条目（带 Google 图标 + 修改按钮） | **整条去掉**（这个通道就是 LMS 本身，绑定是自动的，留着只会让人困惑） |
| 管理后台 → 系统设置 → 第三方登录 | 「Google Client ID/Secret」→ 「LMS Client ID/Secret」；「Google 授权回调地址」→「LMS 授权回调地址」 |

代码里仍能搜到 "Google" 的地方只剩**不可见**的两处：浏览器名列表（Chrome/Edge/Firefox/Google…）和被短路掉的死代码。

### 10.7.2 缓存 busting（为什么之前看到的还是旧按钮）

webpack 的 chunk 文件名带内容 hash。我们改了 JS 内容但**没改文件名** → 浏览器继续用缓存里的旧 JS → 看到的还是「Google 登录」按钮，强刷才好。

现在补丁会给**内容变了的** chunk 换新 hash 文件名，并同步三处引用：

1. `umi.js` 里的 chunk hash 映射（`9531:"7c34278b"` → 新值）
2. `asset-manifest.json` 里的文件名映射
3. `index.html` 里对主 chunk 的引用

顺序有讲究：主 chunk 自身的内容会因为「写入新的 hash 映射」而再次变化，所以它的 hash 必须最后算，manifest/index.html 要用最终名字替换。

---

### 10.8 没有账号的人怎么办：两条路都铺好了

**路 1：已预置的账号 → 零表单直接进**

`scripts/surveyking-oauth/sync-teachers.mjs` 把 LMS 的 13 个教师/管理员账号预置进 SurveyKing，并绑定 `GOOGLE`(=LMS users.id) 身份：

- LMS `Frank Hu`(#32) 和 `admin`(#1) → 同一个问卷管理员账号（超级管理员角色）
- 其余 11 位教师 → 各自新建账号 + 新建的「教师」角色
  （角色权限 = 管理员权限去掉 `system:*` / `user:update` 的子集：问卷、答卷、文件、模板、仓库、练习）

实测（LMS#34 Jessica Yang）：点「LMS 账号登录」→ LMS 授权 → **302 `/` 直接进**，零表单，角色 `ROLE_teacher`。

**路 2：没有预置的人 → 自动进注册页建号**

`T_SYS_INFO.REGISTER_INFO` 从 `{"registerEnabled":false}` 改成 `{"registerEnabled":true,"roles":["<教师角色 id>"]}`。

实测（LMS#2 test01，未预置）：点「LMS 账号登录」→ LMS 授权 → **302 `/user/register?oauthTicket=...`**，进注册页（用户名/姓名已按 LMS 资料预填，只需设个密码）→ 提交后账号自动创建并绑定。

> 想要「完全无声」的自动建号（连表单都不要），得改 Java 源码重编译（服务器只有 JRE，做不到）。现在的形态是：**已知的老师直接进，其余任何人第一次登录时建号**。

新增脚本：

| 脚本 | 作用 |
|---|---|
| `scripts/surveyking-oauth/patch_google_to_lms.py` | 字节补丁（改常量池 + 前端文案 + 缓存 busting） |
| `scripts/surveyking-oauth/deploy.sh` | **一条命令重新打补丁并部署**：取官方原件 → 打补丁 → 备份（jar + H2 库）→ 塞回容器重启 → 自动校验 |
| `scripts/surveyking-oauth/sync-teachers.mjs` | 生成「把 LMS 教师预置进 SurveyKing」的 SQL（幂等） |
| `scripts/surveyking-oauth/sk-h2.sh` | 在 H2 上执行 SQL / 配 OAuth / 绑身份 |
| `scripts/surveyking-oauth/mock-idp.mjs` | 模拟 LMS 的 OIDC 端点（authorize/token/jwks），用于不依赖 LMS 部署就能测 SurveyKing 侧逻辑 |

**官方原件**保存在服务器 `backup/surveyking.jar.orig`（`deploy.sh` 会优先用它，而不是容器里那份已打补丁的 jar —— 否则常量找不到，脚本会正确地拒绝部署）。

### 10.9 用 LMS course 5 出试卷（exam 模式）

`scripts/exam-course5/`：从 LMS 题库组卷并推到 SurveyKing。

```bash
node scripts/exam-course5/dump.mjs          # 导出 course 5 全部题目 → course5-questions.json
node scripts/exam-course5/build.mjs         # 组卷（30 单选 / 10 多选 / 10 填空，AI:Python = 1:1）→ exam.json
node scripts/exam-course5/push.mjs --dry    # 校验
node scripts/exam-course5/push.mjs          # 建卷（走 LMS SSO，不用 SurveyKing 密码）
node scripts/exam-course5/verify.mjs --id <projectId>       # 逐题比对远端与本地
node scripts/exam-course5/smoke-answer.mjs --id <projectId>  # 提交"全对"答卷验证判分
```

**SurveyKing exam schema 的五个坑**（都踩过；判分错了、前端崩了，接口却都是 200）：

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 正确答案标记位置 | 判分永远 0 | `examCorrectAnswer` 放在**每个选项节点**的 attribute（非 null 即正确），不是题目上 |
| 填空题结构 | 交卷返回 500（NPE） | 每个"空"必须是**子节点**（`type:'Option'`），不能是空 children |
| 填空题分值 | 填空全 0 分 | 题目节点也要有 `examScore`（`SelectCorrectEvaluator.support()` 检查它非 null），真正求和用子节点的 |
| 删除接口参数 | 删除返回 500（NPE） | `deleteProject` 用的是 `request.getId()`，传 `{id}` 不是 `{ids: [...]}` |
| **`setting` 必须传** | 前端整页崩：`Something went wrong. Cannot read properties of undefined (reading 'status')` | 建卷 payload 里必须带完整 `setting`（`status`/`mode`/`answerSetting`/`submittedSetting`/`examSetting`）。后端把 null 字段省略（`default-property-inclusion=non_null`），而前端直接读 `project.setting.status`（没有可选链） |

另外，**提交答案的 value 是对象 Map**（键 = 选项/空的 id），不是字符串数组：

```json
{ "q001": { "q001_o2": true },              // 单选
  "q031": { "q031_o1": true, "q031_o3": true },  // 多选
  "q041": { "q041_b1": "changes" } }             // 填空
```

题号与分段：单选 1–30（AI 15 + Python 15）、多选 31–40、填空 41–50；分值 2/3/1 → 满分 100。

### 10.10 id_token 私钥：8 个进程必须共用一把（2026-10-27 事故记录）

**症状**：SurveyKing 回调报 `invalid_identity`，而 LMS 单独测 token 端点正常。
原因：id_token 的 `kid` 与 JWKS 返回的 `kid` 不一致，Nimbus 按 kid 找不到公钥 → 验签失败。

**两个叠加的错**：

1. **密钥没落库**：初始实现用 `onConflictDoNothing` 写 `configs`，而该行早被
   `DEFAULT_SITE_CONFIG` 播种成空串 → 私钥永远写不进去 → 每次调用都现生成一把。
2. **进程内缓存锁死了各自的密钥**：生产是 nginx + **8 个 fork 进程**（`pm2 list` 里
   nuxt_3001…3008）。模块级变量 `_cached` 让每个进程各自持有一把，且永不失效 ——
   即使后来把正确密钥写进库，已缓存的进程仍用自己的那把，只能全部重启才对齐。

**修法**：
- `utils/oauthKeys.ts` 改成**每次都从库里读**（不再进程内缓存），生成时用
  `onConflictDoUpdate` 写库后**重读**，保证并发下所有进程最终用同一把；
- `defaults.ts` 里去掉 `site:oauth.idPrivateKey` 的空串播种（它正是"写不进去"的原因）。

**运维上记住**：LMS 的 `.output/server/index.mjs` 缺失时，pm2 里的进程显示 online
但实际靠已加载的内存态在跑；一旦 `pm2 restart` 就会全站 502 ——
重启前务必确认 `.output/server/index.mjs` 存在。

### 10.11 只留 LMS 登录 + 没账号的人自动建号

**目标**：登录页只有「LMS 账号登录」一个入口；LMS 里有的人第一次点就进去，不用设密码。

**登录页**（改前端 CSS，追加到 `p__user__Login.*.chunk.css`）：

```css
#root form{display:none!important}                    /* 账号密码表单 */
#root [class*=registerPrompt]{display:none!important} /* "No account yet?" */
#root [class*=socialIcon]{display:none!important}     /* 那个图标是 Google 的 G */
#root [class*=socialOption]{...}                      /* 做成一条完整按钮 */
```

实测 LMS 按钮**不在 `<form>` 里**（祖先链 `socialLogin → button`），所以藏 form 不会连带藏掉它；
选择器用 `[class*=xxx]` 而不是完整 hash 类名，升级后也不会失效。

**自动建号**（改前端 JS，`p__user__Register.*.async.js`）：
SurveyKing 的 OAuth 首次登录走"注册页"（`/user/register?oauthTicket=xxx`，要填姓名/账号/密码）。
补丁把那段改成：拿到预填信息后 → 自动生成随机强密码 → `setFieldsValue` → 自动 `requestSubmit()`。
用户点了按钮就直接进系统，**密码是随机的、之后永远走 SSO，用户根本用不到**。

**⚠️ 总开关 `registerInfo.registerEnabled` 必须是 true**
服务端逻辑是：

```java
if (!isRegistrationEnabled()) return failure("not_bound");
```

关着的时候，没绑定的 LMS 用户回调后会被拒，前端提示
**「该第三方账号尚未绑定，请先使用账号密码登录并在安全设置中绑定」** ——
看着像是"没绑定所以进不去"，其实只是这个开关被关了。

这个开关在「系统设置」页是一个普通 Switch（Enable Registration），随时可能被关掉；
它同时也控制公开注册接口 `POST /api/public/register`（匿名可调，注意）。

维护工具：

```bash
node scripts/surveyking-oauth/set-register.mjs            # 查看状态
node scripts/surveyking-oauth/set-register.mjs --enable   # 打开（走 admin API，不用停容器）
```

`deploy.sh` 的校验步骤里也会打印这个开关，部署时一眼能看到。

**端到端验证**（真实浏览器跑完整链路）：

```bash
node scripts/surveyking-oauth/e2e-login.mjs --lms-user test01 --lms-pass <test-password>
```

实测（2026-10-27）：未登录 LMS → 点「LMS 账号登录」→ 跳 LMS 认证页（带 state/nonce/code_challenge）
→ test01 登录（该账号在问卷系统里完全没绑定）→ 自动建号 → 落到 `/home`，`currentUser` = Test01，`ROLE_teacher`。

### 10.12 角色与权限：LMS 进来的账号一律「普通用户」

| 角色 | id | 权限 | 给谁 |
|---|---|---|---|
| 超级管理员 `admin` | 1457995481928998914 | 全部 | Frank（LMS #32 / #1 都绑到这一个账号） |
| 教师 `teacher` | 1780003000000000001 | 管理员去掉 `system:*`、含 `project:create` | 预留（默认不分配） |
| **普通用户 `user`** | 1780004000000000001 | `home` / `answer*` / `file*`，**没有 `project:create`** | LMS 自动建号 + 预置账号 |

`registerInfo.roles` 指向「普通用户」→ 自动建号的人只有答题和查看的权限，建不了问卷。

**双层拦截**（只藏按钮不够，接口也必须拒）：
- 服务端：建卷接口对没有 `project:create` 的人返回 `403`（实测）
- 前端：「我的项目」页的 New 按钮是**无条件渲染**的，点了才 403。
  补丁在 `p__Project.*.async.js` 末尾追加一小段脚本：查 `currentUser.authorityList`，
  没有 `project:create` 就给 `body` 加 `hide-project-create`，
  再由 CSS 把 `.project-create-button`（固定类名，不带 hash）藏掉。
  实测：普通用户 New 按钮 0 个，管理员 1 个。

### 10.13 「用户管理」页空白（No data）的真因

**症状**：`/system/user` 表格显示 No data，但页面不报错。接口 `/api/system/user/list` 返回 **500**。

**根因**（`UserServiceImpl.getUsers`）：

```java
Account account = accountMapper.selectOne(... authType = PWD);  // 只查密码账号
userView.setUsername(account.getAuthAccount());                 // account 为 null → NPE
```

**它假设每个用户都有密码账号。** 手工只插了 GOOGLE 账号的用户（`sync-teachers.mjs` 早期版本）
没有 PWD 账号 → 整个列表接口 NPE → 前端把 500 吞成 "No data"。

**修法**：给这类用户补一行 PWD 账号（`auth_secret` 用随机 BCrypt，没人知道，这些账号仍只走 SSO）：

```sql
INSERT INTO t_account (id, user_type, user_id, auth_type, auth_account, auth_secret, status, is_deleted, create_at)
SELECT CAST(CAST(a.user_id AS BIGINT) + 3000000 AS VARCHAR), 'SysUser', a.user_id, 'PWD',
       u.name, '$2a$10$<随机BCrypt>', 1, 0, CURRENT_TIMESTAMP
FROM t_account a JOIN t_user u ON u.id = a.user_id
WHERE a.auth_type = 'GOOGLE' AND a.is_deleted = 0
  AND NOT EXISTS (SELECT 1 FROM t_account p WHERE p.user_id = a.user_id AND p.auth_type = 'PWD');
```

> 走正常注册流程自动建号的用户不会有这个问题（注册时本来就会建 PWD 账号），
> 只有手工预置的要补。

---

### 10.14 Hydro（155）自动 SSO：LMS 已登录就直接进

**效果**：浏览器在 LMS 已登录的状态下打开 `http://10.28.1.155/任意页面`，
4 次 302、约 1.2 秒之后直接落到目标页面，**完全看不到登录页**。

```
GET 155/p
 → 302 155/oauth/lms/login?redirect=/p
 → 302 151/api/oauth/authorize?...          (浏览器带着 151 的 auth_token)
 → 302 155/oauth/lms/callback?code=...      (LMS 已登录 → 立即签 code)
 → 302 155/p                                (Hydro 建会话)
 → 200 已登录
```

LMS 没登录时：同一条链，但停在 `151/oauth/login` 让你登录，登录完自动回原页面。

**为什么不需要"判断 151 是否已登录"**

155 不探测 151（跨 IP 的 cookie 拿不到，而且 LMS 是 http，`SameSite=None` 必须配 `Secure`，根本发不出去）。
做法是把决定权交给 LMS：**只要没会话，就先跳过去**。LMS 有会话就立刻签 code 回来，用户无感；
没有才显示登录页。这就是标准 SSO，比探测更可靠。

**实现**（`scripts/hydro-addon/lms-oauth/index.ts`）

在 addon 里挂一个 serverLayer，未登录的页面请求 302 到 `/oauth/lms/login`：

```ts
ctx.server.addServerLayer('lms-sso-auto', async (c, next) => { ... })
```

判定只看 cookie，因为 serverLayer 阶段拿不到 Hydro 的 session：

| cookie | 含义 | 处理 |
|---|---|---|
| `hydro_uid` | **确认已登录**（值就是 uid，由同步层种） | 放行 |
| `sso_off` | 主动登出后的 10 分钟静默期 | 放行（否则一点登出就被登回来） |
| `sso_try` | 120 秒短标记，刚从 SSO 回来 | 放行，防重定向死循环 |
| 都没有 | 没登录过 | 设 `sso_try`，302 到 LMS |

**这里踩过一个坑：不能用 `sid` 判断。**
koa-session 会给**每个访客**都发 `sid`（游客也有）。最初按「有 sid 就放行」写，
结果「访问过一次 155 但没登录」的浏览器永远不再跳 SSO ——
表现就是 **「151 明明登录着，155 还是未登录」**（2026-10-30 实测复现）。
所以改成用 `hydro_uid`：只有**真正登录成功过**才会被种上。

`hydro_uid` 由另一个 handlerLayer（`lms-sso-sync`）维护：
- `c.session.uid` 有值 → 种/更新 `hydro_uid`（1 年）
- `c.session.uid` 为 0 但标记还在（session 过期）→ 清标记，下次访问重新走 SSO
- 访问 `/logout` → 清标记 + 种 `sso_off`（10 分钟）

**注意 `append` 要放在 `await next()` 之后**：
session 中间件在 `next()` 内部跑，它会用 `set` 覆盖 `Set-Cookie`，
在 `next()` 之前 append 的话 cookie 会被冲掉（实测：逻辑全对但 cookie 就是种不上）。

跳过路径（`lms-oauth.autologin.skip`，默认 `/oauth/,/static/,/api/,/favicon,/_,/gen/`），
另外只拦 `GET` + `Accept: text/html` —— 资源和 fetch 一律放行，避免把 JS 请求 302 成 HTML。

**踩过的三个坑（都很隐蔽）**

1. **用 handlerLayer 会吃掉 302**
   `handlerLayers` 外面包着 `base` 图层，它 `await next()` 之后会检查 `ctx.handler`，
   发现没有 handler 就 log `No handler found` 并把 status 改成 500 —— 302 白设了。
   必须用 `addServerLayer`（在 `router.routes()` 之前短路）。

2. **不能在 serverLayer 里碰 `c.session`**
   实测 `c.session` 在这个阶段是 `undefined`（`c.HydroContext` 也没有，那些要等 `userLayer` 才建好）。
   一开始往 session 里写 `ssoAt` 做冷却，结果是：callback 明明成功、也下发了新 sid，
   但后续请求读不到 uid —— 表现为**无限重定向**（`ERR_TOO_MANY_REDIRECTS`）。
   改成纯 cookie 判断后一切正常。

3. **Hydro 的 OAuth 回调有频率限制**
   `OauthCallbackHandler` 里有 `limitRate('oauth_callback', 60, 5)` ——
   **每分钟最多 5 次**。所以一旦出现重定向循环，很快就会彻底卡死（429），
   调试时更难定位。防循环必须在第一版就做对。

**开关**

```bash
# 关掉自动跳转，回到「手动点按钮登录」
# 控制面板 → 系统设置，或直接改 mongo:
#   system 集合 { _id: 'lms-oauth.autologin', value: false }
```

**验证脚本**

```bash
node scripts/hydro-sso/e2e.mjs                 # LMS 已登录 → 应自动进
node scripts/hydro-sso/e2e.mjs --no-lms        # LMS 未登录 → 应停在 LMS 登录页
node scripts/hydro-sso/e2e.mjs --path /p       # 指定路径
node scripts/hydro-sso/check-repeat.mjs        # 第 1 次跳、之后不跳
```

实测（2026-10-29）：第 1 次 5 跳 1.2s 登录成功；第 2、3 次各 1 跳 0.9s 直接 200。

---


## 11. 待确认

- [ ] 学校是否已有 Workspace / Entra ID，`@minxinnansha.org.cn` 是否在其中
- [ ] Hydro 1042 个用户与 LMS 用户的 email 匹配率（决定阶段 0 的清洗工作量）
- [ ] IdP 部署位置与域名方案（151 同机 or 独立）
- [ ] 谁来长期维护 IdP（决定了选 Casdoor 还是直接用 Workspace）
