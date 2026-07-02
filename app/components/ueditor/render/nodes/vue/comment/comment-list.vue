<template>
    <div v-if="comments.length" class="space-y-2 ml-8">
        <div v-for="(item, idx) in comments" :key="item.cid || idx">
            <CommentCard :comment="item" :current-user-id="currentUserId"
                @toggle-like="$emit('toggle-like', $event)"
                @delete="$emit('delete', $event)" />
        </div>
    </div>
    <div v-else class="text-xs text-gray-400 text-center py-2">{{ $t('comment.noReplies') }}</div>
</template>

<script setup>
import CommentCard from './comment-card.vue'

defineProps({
    comments: { type: Array, default: () => [] },
    currentUserId: { type: Number, default: null },
})

defineEmits(['toggle-like', 'delete'])
</script>
