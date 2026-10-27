/**
 * 打开/关闭 SurveyKing 的自助注册开关（registerInfo.registerEnabled）
 *
 * 为什么需要它
 * ------------
 * SurveyKing 的 OAuth 首次登录（LMS 里有、SurveyKing 里没有账号）走的是
 * **注册流程**，而这条路的总开关就是 `registerInfo.registerEnabled`：
 *
 *     if (!isRegistrationEnabled()) return failure("not_bound");
 *     // → 前端提示「该第三方账号尚未绑定，请先使用账号密码登录并在安全设置中绑定」
 *
 * 也就是说这个开关关着的时候，**没绑定的 LMS 用户根本进不来**。
 * 但它是系统设置页上的一个普通开关，任何人在「系统设置」里点一次保存
 * 都可能把它写回 false（UI 回填不对时尤其容易），开关就悄悄失效了。
 *
 * 所以用它随时校正；不需要停容器（走 admin API，不碰 H2 文件）。
 *
 * 用法：
 *   node scripts/surveyking-oauth/set-register.mjs            # 查看当前状态
 *   node scripts/surveyking-oauth/set-register.mjs --enable   # 打开
 *   node scripts/surveyking-oauth/set-register.mjs --disable  # 关闭
 */
import { createClient, SK } from './sk-client.mjs'

const argv = process.argv.slice(2)
const enable = argv.includes('--enable')
const disable = argv.includes('--disable')

const client = await createClient()
try {
  const sys = (await (await client.step(`${SK}/api/system`)).json())?.data
  const current = sys?.registerInfo
  console.log('当前 registerInfo:', JSON.stringify(current))

  if (!enable && !disable) {
    const on = current?.registerEnabled === true
    console.log(`\n自助注册（OAuth 首次登录建号）：${on ? '已开启 ✓' : '已关闭 ❌ 未绑定的 LMS 用户进不来'}`)
  } else {
    const roles = current?.roles || []
    if (!roles.length) {
      console.error('❌ registerInfo.roles 为空，先设置一个默认角色再开启')
      process.exit(1)
    }
    const body = {
      id: sys.id || '1',
      registerInfo: {
        ...current,
        registerEnabled: enable,
        // roles 里存的是角色 id（不是 code），注册时按它分配
        roles,
      },
    }
    const r = await client.step(`${SK}/api/system/update`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const b = await r.json().catch(() => ({}))
    if (b.code !== 200) throw new Error(`更新失败：${JSON.stringify(b).slice(0, 200)}`)

    const after = (await (await client.step(`${SK}/api/system`)).json())?.data
    console.log('更新后 registerInfo:', JSON.stringify(after?.registerInfo))
    console.log(after?.registerInfo?.registerEnabled === enable ? '\n✅ 已生效' : '\n⚠️ 没生效，检查接口返回')
  }
} finally {
  await client.close()
}
