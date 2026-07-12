import { ref, reactive, watch, provide } from 'vue'

export function useNodeView(props: any, emit: any) {
    const { t } = useI18n()
    const comp = ref<any>(null)
    const loading = ref(false)

    // ====================== 通用状态（provide 给子组件） ======================

    // 配置面板开关
    const showConfig = ref(false)

    // 组件元信息（子组件在 setup 中设置）
    const meta = reactive({
        title: '',
        icon: '',
        hasSettings: false,
    })

    // 提供给子组件
    provide('nodeViewShowConfig', showConfig)
    provide('nodeViewMeta', meta)

    // ====================== 动态加载子组件 ======================

    // 预注册所有扩展组件路径（import.meta.glob 在构建时生成映射，运行时按需懒加载）
    // Vite 的 dynamic-import-vars 不支持从当前目录做变量导入（./${type}.vue），
    // 改用 import.meta.glob 匹配子目录下的组件文件（./timer/timer.vue 等）
    // race / chatroom 也已迁回 doc 模块的 extensions 目录，统一由 glob 加载
    const extensionComponents = import.meta.glob([
        './*/*.vue',
    ])

    // race 组件创建新竞赛后通过 emit('init', cid) 通知父级更新节点 content 属性
    function onInit(cid: any) {
        if (cid != null) {
            props.updateAttributes({ content: String(cid) })
        }
    }

    watch(
        () => props.node.attrs.type,
        async (type: string) => {
            // 切换组件时重置 meta
            meta.title = ''
            meta.icon = ''
            meta.hasSettings = false
            showConfig.value = false

            comp.value = null
            if (!type) return
            loading.value = true
            try {
                // 查找本目录下的扩展：./timer/index.vue（主，三文件结构）或 ./timer/timer.vue（备，旧结构）
                const primary = `./${type}/index.vue`
                const fallback = `./${type}/${type}.vue`
                const loader = extensionComponents[primary] || extensionComponents[fallback]
                if (loader) {
                    const mod = await loader()
                    comp.value = mod.default
                } else {
                    console.warn(`组件 ${type} 不存在`)
                }
            } catch (err) {
                console.warn(`组件 ${type} 加载失败`, err)
            } finally {
                loading.value = false
            }
        },
        { immediate: true }
    )

    return {
        t,
        comp,
        loading,
        showConfig,
        meta,
        onInit,
    }
}
