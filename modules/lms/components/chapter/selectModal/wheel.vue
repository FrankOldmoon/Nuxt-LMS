<template>
    <div class="flex flex-col items-center gap-2 py-2">
        <div class="relative wheel-box">
            <svg viewBox="0 0 360 360" class="w-full h-full select-none" role="img" :aria-label="$t('chapter.wheelTitle')">
                <defs>
                    <linearGradient id="wheel-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#ff6b6b" />
                        <stop offset="25%" stop-color="#ffd43b" />
                        <stop offset="50%" stop-color="#69db7c" />
                        <stop offset="75%" stop-color="#4dabf7" />
                        <stop offset="100%" stop-color="#da77f2" />
                    </linearGradient>
                    <radialGradient id="wheel-hub" cx="0.35" cy="0.35" r="0.8">
                        <stop offset="0%" stop-color="#ffffff" />
                        <stop offset="100%" stop-color="#e5e7eb" />
                    </radialGradient>
                    <!-- 头像圆形遮罩：以引用元素自身的外接框为单位（objectBoundingBox），
                         图片是正方形，0.5/0.5 半径 0.5 的内切圆即完美圆形，
                         不受所在分组平移 / 转盘旋转影响 -->
                    <clipPath :id="AVATAR_CLIP_ID" clipPathUnits="objectBoundingBox">
                        <circle cx="0.5" cy="0.5" r="0.5" />
                    </clipPath>
                </defs>

                <!-- 彩色外圈 -->
                <circle :cx="CX" :cy="CY" :r="R + 6" fill="none" stroke="url(#wheel-ring)" stroke-width="10" />

                <!-- 扇区（随转盘一起旋转） -->
                <g class="wheel-rotor" :style="rotorStyle">
                    <path v-for="(user, i) in users" :key="user.id" class="wheel-sector"
                        :class="{ 'wheel-sector-selected': isSelected(user) }" :d="sectorPath(i)"
                        :fill="colorAt(i)" stroke="#ffffff" stroke-width="1" @click="onSectorClick(i)" />
                    <!-- 头像：贴在扇区中线上，随转盘旋转；无头像时降级为首字圆牌 -->
                    <g v-for="(user, i) in users" :key="`face-${user.id}`" class="wheel-face"
                        :transform="avatarTransform(i)">
                        <circle class="wheel-avatar-bg" cx="0" cy="0" :r="avatarSize" />
                        <!-- 图片保持正方形（宽高都是直径），圆形遮罩的内切圆才能正好贴边 -->
                        <image v-if="avatarOf(user)" class="wheel-avatar" :href="avatarOf(user)"
                            :x="-avatarSize" :y="-avatarSize" :width="avatarSize * 2" :height="avatarSize * 2"
                            :clip-path="`url(#${AVATAR_CLIP_ID})`" preserveAspectRatio="xMidYMid slice" />
                        <text v-else class="wheel-avatar-text" x="0" y="0" text-anchor="middle"
                            dominant-baseline="central" :font-size="avatarSize">{{ initialOf(user) }}</text>
                        <circle class="wheel-avatar-ring" cx="0" cy="0" :r="avatarSize" />
                    </g>
                    <!-- 姓名：排在头像外侧，沿半径方向排布 -->
                    <text v-for="(user, i) in users" :key="`label-${user.id}`" class="wheel-label"
                        :x="labelPos(i).x" :y="labelPos(i).y" :transform="labelTransform(i)"
                        :font-size="labelSize" text-anchor="middle" dominant-baseline="central">{{ labelOf(user) }}</text>
                </g>

                <!-- 指针 -->
                <polygon class="wheel-pointer" :points="`${CX},4 ${CX - 14},40 ${CX + 14},40`" />

                <!-- 中心按钮：一键开转 -->
                <g class="wheel-hub" @click="emit('spin')">
                    <circle :cx="CX" :cy="CY" r="38" fill="#ffffff" />
                    <circle :cx="CX" :cy="CY" r="32" fill="url(#wheel-hub)" />
                    <text :x="CX" :y="CY" class="wheel-hub-text" text-anchor="middle" dominant-baseline="central">
                        {{ spinning ? '···' : $t('chapter.wheelSpin') }}
                    </text>
                </g>
            </svg>

            <!-- 烟花粒子：铺满转盘区域 -->
            <div v-if="celebrate" class="absolute inset-0 pointer-events-none">
                <Fireworks @done="emit('celebrateEnd')" />
            </div>

            <!-- 中奖卡片：从小到大放大 -->
            <div v-if="winner" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AuthUserCard :user="winner" size="lg" class="winner-card" />
            </div>
        </div>

        <p class="text-xs text-muted">{{ $t('chapter.wheelHint') }}</p>
    </div>
</template>

<script setup lang="ts">
import { sectorAngles, colorAt, useWheelPicker } from './useWheel'
import Fireworks from '../../ueditor/extensions/nodes/vue/question/render/fireworks.vue'

const props = withDefaults(defineProps<{
    users: any[]
    selectedIds?: number[]
    winner?: any
    celebrate?: boolean
    spinning?: boolean
}>(), {
    selectedIds: () => [],
    winner: null,
    celebrate: false,
    spinning: false,
})

const emit = defineEmits<{
    spin: []
    pick: [user: any]
    celebrateEnd: []
}>()

// 转盘几何：以 360×360 视口中心为圆心
const CX = 180
const CY = 180
const R = 166
// 头像圆心所在半径；姓名再往外排，位于头像外侧
const AVATAR_R = 106
// 头像圆形裁剪的 id（同一转盘内所有头像共用）
const AVATAR_CLIP_ID = 'wheel-avatar-clip'

const { rotation, duration, spinTo, rotateTo } = useWheelPicker()

const rotorStyle = computed(() => ({
    transform: `rotate(${rotation.value}deg)`,
    transformBox: 'view-box',
    transformOrigin: '50% 50%',
    transitionDuration: `${duration.value}ms`,
}))

// 头像尺寸随人数自适应：人少画大，人多自动缩小
const avatarSize = computed(() => {
    const total = props.users.length
    if (total <= 6) return 24
    if (total <= 10) return 20
    if (total <= 16) return 16
    if (total <= 24) return 13
    if (total <= 36) return 10
    return 8
})

// 姓名半径：始终排在头像外沿再往外一点，且不超出扇区外径
const labelRadius = computed(() => AVATAR_R + avatarSize.value + 8)

function polar(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return {
        x: Number((CX + radius * Math.cos(rad)).toFixed(2)),
        y: Number((CY + radius * Math.sin(rad)).toFixed(2)),
    }
}

function sectorPath(index: number) {
    const total = props.users.length
    // 单人时用两段半圆弧拼成整圆，避免起止点重合导致路径退化
    if (total <= 1) {
        return `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX} ${CY + R} A ${R} ${R} 0 1 1 ${CX} ${CY - R} Z`
    }
    const { start, end } = sectorAngles(index, total)
    const from = polar(start, R)
    const to = polar(end, R)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${CX} ${CY} L ${from.x} ${from.y} A ${R} ${R} 0 ${largeArc} 1 ${to.x} ${to.y} Z`
}

// 头像：平移到扇区中线上的头像圆心，子元素再以 (0,0) 为中心绘制
function avatarTransform(index: number) {
    const { x, y } = polar(sectorAngles(index, props.users.length).mid, AVATAR_R)
    return `translate(${x}, ${y})`
}

function avatarOf(user: any) {
    return user?.avatarImg || ''
}

function initialOf(user: any) {
    const raw = String(user?.name || user?.preferName || user?.username || '').trim()
    return raw ? raw.charAt(0) : '?'
}

function labelPos(index: number) {
    return polar(sectorAngles(index, props.users.length).mid, labelRadius.value)
}

// 文字沿半径方向排布；下半圈翻转 180° 避免倒置
function labelTransform(index: number) {
    const { mid } = sectorAngles(index, props.users.length)
    const { x, y } = labelPos(index)
    const flip = mid > 90 && mid < 270 ? 180 : 0
    return `rotate(${Number((mid + flip).toFixed(2))}, ${x}, ${y})`
}

const labelSize = computed(() => {
    const total = props.users.length
    if (total <= 8) return 15
    if (total <= 16) return 12
    if (total <= 28) return 10
    return 8
})

function labelOf(user: any) {
    const raw = String(user?.name || user?.preferName || user?.username || '')
    return raw.length > 6 ? `${raw.slice(0, 6)}…` : raw
}

function isSelected(user: any) {
    return (props.selectedIds || []).includes(user?.id)
}

// 手动选人：转向该扇区并通知父组件切换选中
function onSectorClick(index: number) {
    if (props.spinning) return
    const user = props.users[index]
    if (!user) return
    rotateTo(index, props.users.length)
    emit('pick', user)
}

defineExpose({ spinTo, rotateTo })
</script>

<style scoped>
.wheel-box {
    width: 360px;
    height: 360px;
}

.wheel-rotor {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.15, 0.85, 0.25, 1);
}

.wheel-sector {
    cursor: pointer;
}

.wheel-sector-selected {
    stroke: #111827;
    stroke-width: 3;
}

.wheel-face {
    pointer-events: none;
}

.wheel-avatar-bg {
    fill: #ffffff;
}

.wheel-avatar-ring {
    fill: none;
    stroke: #ffffff;
    stroke-width: 2;
}

.wheel-avatar-text {
    fill: #374151;
    font-weight: 600;
}

.wheel-label {
    fill: #ffffff;
    font-weight: 600;
    pointer-events: none;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 2px;
}

.wheel-pointer {
    fill: #ef4444;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.wheel-hub {
    cursor: pointer;
}

.wheel-hub-text {
    font-size: 16px;
    font-weight: 700;
    fill: #374151;
}

.winner-card {
    animation: winner-pop 0.6s cubic-bezier(0.22, 1.2, 0.36, 1) both;
}

@keyframes winner-pop {
    0% {
        transform: scale(0.2);
        opacity: 0;
    }

    60% {
        transform: scale(1.18);
        opacity: 1;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
