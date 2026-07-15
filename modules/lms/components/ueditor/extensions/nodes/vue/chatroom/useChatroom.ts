import { ref, computed, onMounted, nextTick } from 'vue'

export interface ChatroomProps {
    node?: any
}

export function useChatroom(props: ChatroomProps) {
    const { user } = useAuth()
    const { t } = useI18n()
    const { moduleLms } = useRuntimeConfig().public
    const { wsConnected, connect, sendChatroom, onChatroom } = useWebSocket()

    const userId = computed(() => user.value?.id || 0)
    const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)
    const userName = computed(() => user.value?.name || 'anonymous')
    const avatarImg = computed(() => user.value?.avatarImg || null)

    // lms notEnableornotJoin Classnot whenShow
    const canShow = computed(() => !!moduleLms && !!classId.value)
    const placeholderText = computed(() => {
        if (!moduleLms) return t('chatroom.needLms')
        if (!classId.value) return t('chatroom.needClass')
        return ''
    })

    // YesNocanChat：alreadyLogin + HasClass + ws Connected
    const canChat = computed(() => !!userId.value && !!classId.value && wsConnected.value)
    const cannotChatReason = computed(() => {
        if (!userId.value) return t('chatroom.needLogin')
        if (!classId.value) return t('chatroom.needClass')
        if (!wsConnected.value) return t('chatroom.connecting')
        return ''
    })

    // Message List（onlyInsidestore，not persistent）
    const messages = ref<any[]>([])
    const inputText = ref('')
    const msgListRef = ref<any>(null)
    const onlineCount = ref(0)

    // listenChatroomMessage
    onChatroom((data: any) => {
        // onlyShowlocalClassMessage（Serviceserveralreadyby classId roombetweenbroadcast，twotimesCheckmore robust）
        if (data.classId !== classId.value) return
        messages.value.push({
            userId: data.userId,
            from: data.from,
            avatarImg: data.avatarImg,
            text: data.text,
            ts: data.ts,
        })
        // limitMessagecount（keep most recent 200 items）
        if (messages.value.length > 200) {
            messages.value = messages.value.slice(-200)
        }
        nextTick(scrollToBottom)
    })

    function sendMessage() {
        const text = inputText.value.trim()
        if (!text || !canChat.value) return
        sendChatroom(classId.value, userId.value, userName.value, avatarImg.value, text)
        inputText.value = ''
    }

    function scrollToBottom() {
        const el = msgListRef.value
        if (el) el.scrollTop = el.scrollHeight
    }

    function formatTime(ts: any) {
        if (!ts) return ''
        const d = new Date(ts)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    // ensure ws ConnectionandJoin Classroombetween（ws.vue alreadyAutoHandle，ThisInsideas fallbackBottom）
    onMounted(() => {
        if (!canShow.value) return
        if (classId.value && !wsConnected.value) {
            connect()
        }
    })

    return {
        t, canShow, placeholderText, canChat, cannotChatReason,
        messages, inputText, msgListRef, onlineCount, userId, sendMessage, formatTime,
    }
}
