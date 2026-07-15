import { ref, reactive, watch, provide } from 'vue'

export function useNodeView(props: any, emit: any) {
    const { t } = useI18n()
    const comp = ref<any>(null)
    const loading = ref(false)

    // ====================== commonuseStatus（provide toChild Component） ======================

    // ConfigurationPanelon/off
    const showConfig = ref(false)

    // ComponentelementInfo（Child Component setup MiddleSettings）
    const meta = reactive({
        title: '',
        icon: '',
        hasSettings: false,
    })

    // providetoChild Component
    provide('nodeViewShowConfig', showConfig)
    provide('nodeViewMeta', meta)

    // ====================== dynamicLoadChild Component ======================

    // preRegisterAllextension Componentpath（import.meta.glob Build whenGenerateMap，runtimelinesload on demand whenLoad）
    // Vite  dynamic-import-vars not supportfromCurrentTable of ContentsasVariableImport（./${type}.vue），
    // insteaduse import.meta.glob matchSonTable of ContentsDownComponentFile（./timer/timer.vue etc.）
    // race / chatroom alsoalreadyrevert doc Module extensions Table of Contents，unifyby glob Load
    const extensionComponents = import.meta.glob([
        './*/*.vue',
    ])

    // race ComponentCreateNewCompetitionBackPass emit('init', cid) NotificationFatherlevelUpdatenodePoint content Property
    function onInit(cid: any) {
        if (cid != null) {
            props.updateAttributes({ content: String(cid) })
        }
    }

    watch(
        () => props.node.attrs.type,
        async (type: string) => {
            // SwitchComponentwhenReset meta
            meta.title = ''
            meta.icon = ''
            meta.hasSettings = false
            showConfig.value = false

            comp.value = null
            if (!type) return
            loading.value = true
            try {
                // find localTable of ContentsDownextension：./timer/index.vue（main，threeFilestructure）or ./timer/timer.vue（backup，Oldstructure）
                const primary = `./${type}/index.vue`
                const fallback = `./${type}/${type}.vue`
                const loader = extensionComponents[primary] || extensionComponents[fallback]
                if (loader) {
                    const mod = await loader()
                    comp.value = mod.default
                } else {
                    console.warn(`Component ${type} Does not exist`)
                }
            } catch (err) {
                console.warn(`Component ${type} Failed to load`, err)
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
