// client.js —— 玩家数据 REST 客户端（存档预加载 / 重置 / 游戏 token / 副本列表）
// 实时状态同步由 Colyseus（net/colyseus.js）负责；此模块只负责初始数据与辅助操作。
//
// 游戏数据与课程绑定：所有请求都带上 courseId（必填）。
// 金币不使用存档里的值，而是服务端从该课程的 user_courses.coin 读取并回写。
import { t } from "../i18n.js";

const API = "/api/mmo";

export class GameClient {
  constructor(courseId) {
    this.courseId = Number(courseId) || 0;
    this.loading = false;
  }

  // 课程查询串（如 "?course=12"，可附加额外参数）
  _q(extra = "") {
    const course = this.courseId ? `course=${encodeURIComponent(this.courseId)}` : "";
    const q = [course, extra].filter(Boolean).join("&");
    return q ? `?${q}` : "";
  }

  // 读取当前用户在该课程下的存档（外观/名字/出生位置等）；失败返回 null
  async load() {
    this.loading = true;
    try {
      const res = await $fetch(`${API}/state${this._q()}`)
      return res && res.success ? res.data : null
    } catch (e) {
      console.error("[mmo load]", e)
      return null
    } finally {
      this.loading = false
    }
  }

  // 申请一次性 Colyseus 游戏 token + 房间号（default_class.id）+ 课程号；服务端用后即删
  async joinGame() {
    try {
      const res = await $fetch(`${API}/join`, { method: 'POST', body: { courseId: this.courseId } })
      if (res && res.success) {
        return { token: res.data.token, classId: res.data.classId || 0, courseId: res.data.courseId || this.courseId }
      }
      return null
    } catch (e) {
      console.error("[mmo join]", e)
      return null
    }
  }

  // 保存外观配置（首次创建角色时写入该课程存档）
  async saveCfg(cfg) {
    const res = await $fetch(`${API}/state${this._q()}`, { method: 'POST', body: { cfg, courseId: this.courseId } })
    return res && res.success ? res.data : null
  }

  // 读取本班副本列表（启动时预注册，保证刷新/重连后能回到所在副本）
  // includeExt=true 时连外部副本(ext_)一起取，用于恢复 `?json=` 分享链接进入的副本
  async listInstances(includeExt = false) {
    try {
      const res = await $fetch(`${API}/instances${this._q(includeExt ? 'includeExt=1' : '')}`)
      return res && res.success && Array.isArray(res.data) ? res.data : []
    } catch (e) {
      console.error('[mmo instances]', e)
      return []
    }
  }

  // 重置当前用户在该课程下的存档（其它课程的存档不受影响）
  async reset() {
    const res = await $fetch(`${API}/reset`, { method: 'POST', body: { courseId: this.courseId } })
    return res && res.success
  }

  // 通过 json 链接加载外部副本：服务端拉取并持久化为本班实例，返回 { id, name, json }
  async loadExternalInstance(url) {
    const res = await $fetch(`${API}/instances/from-url`, { method: 'POST', body: { url, courseId: this.courseId } })
    if (res && res.success) return res.data
    throw new Error((res && res.message) || t("page.loadExternalFailed"))
  }
}
