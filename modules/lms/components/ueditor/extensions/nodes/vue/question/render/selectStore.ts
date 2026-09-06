import { ref, type Ref } from 'vue'

/**
 * select（下拉）题型：自定义下拉框与判分逻辑之间的桥梁。
 *
 * 原生 <select> 的下拉菜单是操作系统渲染的，无法用 CSS 美化，故换成自定义下拉组件。
 * 但 useSelect.ts 原本通过遍历 DOM <select> 读写答案/着色。这里用一个注册表，
 * 让每个 select.vue 暴露 { value: Ref, mark }，useSelect.ts 按 questionId 取到全部并操作。
 *
 * 注意：注册表**故意不用 reactive 集合**——把「含 ref 的对象」放进响应式集合后，
 * 访问代理对象的 `.value` 会被 Vue 自动解包成字符串，彻底破坏 ref 语义。
 * 因此这里用普通 Map 存对象（不响应式解包），另设一个版本号 revision（ref）来表示
 * "成员增减变化"，useSelect 读 revision 建立响应式依赖；值变化则仍由每个独立 ref 驱动。
 */
export interface SelectBinding {
  /** 当前选中值（响应式 Ref） */
  value: Ref<string>
  /** 标记作答正确性样式：'correct' | 'wrong' | ''（清空） */
  mark(state: 'correct' | 'wrong' | ''): void
}

const bindings = new Map<number, (SelectBinding | undefined)[]>()
/** 成员增减的版本号：新增/移除下拉框时 +1，供 useSelect 的 computed/侦听建立依赖 */
const revision = ref(0)

/** 取版本号 ref（在 computed/getter 里读 .value 以建立响应式依赖） */
export function getSelectRevision(): Ref<number> {
  return revision
}

/** 注册一个下拉框（按 questionId 聚合，返回注销函数；序号即挂载顺序） */
export function registerSelect(questionId: number, binding: SelectBinding): () => void {
  if (!questionId) return () => {}
  let arr = bindings.get(questionId)
  if (!arr) {
    arr = []
    bindings.set(questionId, arr)
  }
  arr.push(binding)
  revision.value++
  return () => {
    const i = arr.indexOf(binding)
    if (i >= 0) {
      arr[i] = undefined
      revision.value++
    }
  }
}

/** 取某题下全部（存活）下拉框，顺序与内容渲染顺序一致 */
export function getSelectBindings(questionId: number): SelectBinding[] {
  return (bindings.get(questionId) || []).filter((b): b is SelectBinding => !!b)
}