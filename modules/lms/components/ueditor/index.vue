<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated" @paste="onPaste">
        </umo-editor>
        <div ref="cinsertsWrapper" v-show="false">
            <Cinserts v-if="canInsert" :editor="editorRef" />
        </div>

        <UeditorWs v-if="lockId" :lock-id="lockId" @update:readonly="onLockUpdate" />

        <!-- teacher Visible AI GeneratehoverButton（Bottom-rightAngle） -->
        <AiFloat :editor="editorRef" :readonly="isReadonly" :can-insert-question="canInsert" />
    </client-only>
</template>

<script setup>
import { UmoEditor } from '@umoteam/editor'
import Cinserts from './cinserts.vue'
import UeditorWs from './ws.vue'
import AiFloat from './ai-float.vue'
import { useUeditorIndex } from './useUeditorIndex'

const json = defineModel()
const props = defineProps({
    saveHandler: {
        type: Function,
        default: null,
    },
    lockId: {
        type: [String, Number],
        default: null,
    },
    showInsert: {
        type: Boolean,
        default: false,
    },
    pasteable: {
        type: Boolean,
        default: true,
    },
    // Course ID：admin BackreplayTime Usedpass in，overlay route.params.id
    courseId: {
        type: [Number, String],
        default: undefined,
    },
})

const {
    isReadonly,
    effectiveCourseId,
    canInsert,
    editorRef,
    tiptapEditor,
    cinsertsWrapper,
    options,
    onCreated,
    onPaste,
    onLockUpdate,
    on changed,
    saveDocument,
} = useUeditorIndex(props, json)

defineExpose({ saveDocument })
</script>
