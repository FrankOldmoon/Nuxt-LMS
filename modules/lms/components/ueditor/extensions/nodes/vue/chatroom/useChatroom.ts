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
    const avatarFrame = computed(() => user.value?.avatarFrame || null)

    // lms 未启用或未加入班级时不显示
    const canShow = computed(() => !!moduleLms && !!classId.value)
    const placeholderText = computed(() => {
        if (!moduleLms) return t('chatroom.needLms')
        if (!classId.value) return t('chatroom.needClass')
        return ''
    })

    // 是否可聊天：已登录 + 有班级 + ws 已连接
    const canChat = computed(() => !!userId.value && !!classId.value && wsConnected.value)
    const cannotChatReason = computed(() => {
        if (!userId.value) return t('chatroom.needLogin')
        if (!classId.value) return t('chatroom.needClass')
        if (!wsConnected.value) return t('chatroom.connecting')
        return ''
    })

    // 消息列表（仅内存，不持久化）
    const messages = ref<any[]>([])
    const inputText = ref('')
    const msgListRef = ref<any>(null)
    const onlineCount = ref(0)

    // 监听聊天室消息
    onChatroom((data: any) => {
        // 仅显示本班级消息（服务端已按 classId 房间广播，二次校验更稳妥）
        if (data.classId !== classId.value) return
        messages.value.push({
            userId: data.userId,
            from: data.from,
            avatarImg: data.avatarImg,
            avatarFrame: data.avatarFrame || null,
            text: data.text,
            ts: data.ts,
        })
        // 限制消息数量（保留最近 200 条）
        if (messages.value.length > 200) {
            messages.value = messages.value.slice(-200)
        }
        nextTick(scrollToBottom)
    })

    function sendMessage() {
        const text = inputText.value.trim()
        if (!text || !canChat.value) return
        sendChatroom(classId.value, userId.value, userName.value, avatarImg.value, text, avatarFrame.value)
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

    // 确保 ws 连接并加入班级房间（ws.vue 已自动处理，这里做兜底）
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
