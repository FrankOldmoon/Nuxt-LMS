# 前端开发约定：Lazy + v-if 门控弹窗的初始化时机

> 适用对象：本项目（nuxt_lms_2026）所有弹窗组件与其 composable 的维护者。
> 本文记录一条**反复踩到、且已在多轮增长中复发**的约定，以及可复制的回归测试写法。

## 1. 背景：为什么弹窗要 Lazy + v-if

首屏加载优化时（提交 `09a33ec`）确立了这条模式：常驻在布局里的弹窗（侧边栏、header、章节按钮组）
一律改成「**Lazy 组件 + `v-if` 门控**」：

```vue
<!-- modules/lms/components/layout/aside.vue -->
<LazyUeditorContentPicker v-if="contentPickerOpen" v-model="contentPickerOpen" preview-mode />
<LazyClassModal          v-if="classModalOpen"     v-model:open="classModalOpen" />
```

原因有两层，缺一不可：

- **仅 `Lazy` 不够**：`defineAsyncComponent` 只是把代码拆成独立 chunk，但如果组件在 SSR 期间照常渲染，
  Nuxt 仍会把该 chunk 放进 `modulepreload`，照样阻塞首屏。本项目实测曾有 4MB 公共 chunk 因此进入关键路径。
- **加上 `v-if` 后**，组件在「未打开」时完全不参与渲染，才真正移出首屏阻塞路径。

代价是一个**反直觉的副作用**，见下节。

## 2. 核心坑：`v-if` 门控让 `watch(open)` 的初始值永不触发

门控之后，组件的生命周期顺序变成：

1. 用户点击按钮 → `contentPickerOpen = true`
2. Vue 才**创建**组件 → `props.modelValue === true` 从 setup 第一帧就成立
3. composable 里 `watch(open, cb)` 注册 —— 但 `watch` 默认**只在值变化时触发**，不触发初始值
4. 于是 `cb` 永远不执行，取数逻辑永不运行 → **弹窗打开后一片空白**

这**不是** `v-if` 的 bug，而是「组件创建时已经是打开态」这个前提被忽略了。

### 症状对照表

| 弹窗 | 症状 | 根因位置 |
| --- | --- | --- |
| 内容管理 Content Manager | 打开后只有 `No content` | `useContentPicker.ts` 的 `watch(open)` |
| 班级选择 ClassModal | 班级列表/成员为空 | `useClassModal.ts` 的 `watch(open)` |
| 章节得分 | 表格无数据 | `useChapterScore.ts`（已修） |
| 章节点名 | 名单为空 | `useChapterSelect.ts`（已修） |
| 消息中心 | 首开无会话列表 | `useMessages.ts`（已修） |
| 通知中心 | 列表空白 | `useNotifications.ts`（已修） |
| 意见反馈 | 管理员列表为空 | `feedbackModal.vue`（已修） |
| 登录后设置 | 设置项为空 | `auth/settingsModal.vue`（已修） |
| 登录后设置（二次踩坑） | 保存后重开，PeerTube 等字段为空 | `useSettingsForm.ts` 的 `watch(isOpen)`——重构进 composable 时丢了 immediate（2026-09-29 已修，回归测试：`useSettingsForm(ref(true))` 挂载即加载） |

## 3. 约定（强制）

### 3.1 弹窗 composable 里 `watch(open, …)` 一律加 `{ immediate: true }`

```ts
// ✅ 正确
watch(open, (val) => {
  if (val) { initForm(); fetchItems() }
}, { immediate: true })
```

```ts
// ❌ 错误：门控挂载时初始值不触发，首次打开必然空白
watch(open, (val) => {
  if (val) { initForm(); fetchItems() }
})
```

`if (val)` 守卫必须保留 —— `immediate` 在「挂载时 open 为 false」的场景会立刻执行一次回调，
守卫保证这时不会误发请求。这也是**加了 `immediate` 不会破坏现有行为**的原因。

### 3.2 什么情况**不需要** `immediate`

不要无脑全局加，判断依据是「**组件创建时 open 是否可能已经为 true**」：

| 场景 | 需要吗 | 例 |
| --- | --- | --- |
| `v-if` 门控 + `v-model` 双向绑定 | ✅ 需要 | `LazyClassModal`、`LazyUeditorContentPicker` |
| `open` 是**组件内部** `ref`，由弹窗内按钮触发 | ❌ 不需要 | `useNavEditor`、`useChapterHistory` |
| `watch(open)` 只做**关闭时清理**（不负责取数） | ❌ 不需要 | `useChapterVote`、`useChapterQuickAnswer` |
| 已有 `onMounted` 兜底首次加载 | ❌ 不需要 | `useMyFiles`、`danmaku/modal.vue` |
| 完全没有 open 相关 `watch` | ❌ 不需要 | `useImportUsers` |

### 3.3 顺便确认注解

加了 `immediate` 的 `watch` **建议写一行注释说明为什么**，因为下一个人看到「打开态」的
`watch` 很容易以为它是多余的。本项目已有大量此类注释，保持风格一致：

```ts
// immediate：调用方是 <LazyClassModal v-if="classModalOpen" v-model:open="classModalOpen" />，
// 组件 setup 执行时 open 已经是 true，watch 的初始值不触发会漏掉首次加载（班级列表/成员为空）。
watch(open, async (val) => { … }, { immediate: true })
```

## 4. 回归测试：用 `modelValue: true` 挂载

**这是防复发的关键。** 只传 `modelValue: false` 的测试永远覆盖不到「已打开」状态，
这正是本 bug 长期没被测试发现的原因 —— 原有 `contentPicker.test.ts` 三个用例全部传 `false`。

```ts
// modules/lms/test/components/ueditor/contentPicker.fetch.test.ts
it('以 modelValue=true 挂载（v-if 门控场景）时应立即拉取 /api/courses/content', async () => {
  const calls: string[] = []
  setMockFetchHandler(async (url: string) => {
    calls.push(url)
    if (url.startsWith('/api/courses/content')) {
      return { data: [{ type: 'question', cid: 1, name: 'Q1' }], success: true, msg: '' }
    }
    return { data: null, success: true, msg: '' }
  })

  const { default: ContentPicker } = await import('../../../components/ueditor/contentPicker.vue')
  mount(ContentPicker, {
    props: { modelValue: true, previewMode: true },   // ← 关键
    global: _globalConfig,
  })
  await flushPromises()

  expect(calls.some((u) => u.includes('/api/courses/content'))).toBe(true)
})
```

composable 层面的等价写法：

```ts
it('以 open=true 初始化（v-if 门控场景）时应立即执行首次加载', async () => {
  const loadClasses = vi.fn()
  ;(globalThis as any).useClasses = () => ({ classes: ref([]), classOptions: ref([]), loadClasses })

  const open = ref(true)          // ← 关键
  const { useClassModal } = await import('../../composables/useClassModal')
  useClassModal(open)
  await new Promise((r) => setTimeout(r, 0))

  expect(loadClasses).toHaveBeenCalled()
})
```

### 验证方法

```bash
# 单跑该弹窗
npx vitest run --project components modules/lms/test/components/ueditor/contentPicker.fetch.test.ts
# 或
npx vitest run --project composables modules/lms/test/composables/useClassModal.test.ts

# 全量
npx vitest run --project components
npx vitest run --project composables
```

写新用例时**先确认它在修复前是 FAIL**，否则测试没有真正钉住这个行为。

## 5. 排查清单（新增门控弹窗时逐条过）

1. 组件挂载点是否写成 `<LazyXxx v-if="xxxOpen" v-model:open="xxxOpen">`？
2. 其 composable 里是否有 `watch(open, …)` 承担**取数/初始化**职责？
3. 若有 → **加 `{ immediate: true }` 并写注释**。
4. 回归测试是否用 `modelValue: true` / `open = ref(true)` 覆盖了「挂载即已打开」？
5. 跑一遍该弹窗的测试，确认在移除 `immediate` 时会失败（可选但推荐）。
