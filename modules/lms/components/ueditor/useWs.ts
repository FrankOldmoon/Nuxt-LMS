import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export function useWs(props: any, emit: any) {
    const { user } = useAuth()
    const toast = useToast()
    const { t } = useI18n()

    let ws = null
    let reconnectTimer = null
    const isLockedByOther = ref(false)

    function connect() {
        if (import.meta.server || !props.lockId) return
        if (ws && ws.readyState === WebSocket.OPEN) return

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const url = `${protocol}//${window.location.host}/api/ws_lock`

        const socket = new WebSocket(url)
        ws = socket

        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'lockJoin',
                lockId: String(props.lockId),
                userId: user.value?.id,
                userName: user.value?.name,
            }))
        }

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                handleMessage(data)
            } catch {}
        }

        socket.onclose = () => {
            ws = null
            reconnectTimer = setTimeout(() => {
                if (props.lockId) connect()
            }, 3000)
        }

        socket.onerror = () => {}
    }

    function handleMessage(data) {
        switch (data.type) {
            case 'lockAcquired':
                isLockedByOther.value = false
                emit('update:readonly', false)
                break
            case 'lockDenied':
                isLockedByOther.value = true
                emit('update:readonly', true)
                toast.add({
                    title: t('ueditorLock.editing', { user: data.lockedBy }),
                    description: t('ueditorLock.readonlyMode'),
                    color: 'warning',
                })
                break
            case 'error':
                console.error('ws_lock error:', data.message)
                break
        }
    }

    function disconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
        }
        if (ws) {
            ws.close()
            ws = null
        }
        isLockedByOther.value = false
        emit('update:readonly', false)
    }

    watch(() => props.lockId, (newId, oldId) => {
        if (newId !== oldId) {
            disconnect()
            if (newId) connect()
        }
    })

    onMounted(() => {
        if (props.lockId) connect()
    })

    onBeforeUnmount(() => {
        disconnect()
    })

    return { isLockedByOther }
}
