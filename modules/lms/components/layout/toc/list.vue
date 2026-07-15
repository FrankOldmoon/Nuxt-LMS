<template>
  <nav class="flex flex-col gap-2 overflow-y-auto max-h-[240px]">
    <template v-if="links?.length">
      <p v-if="title" class="text-sm font-semibold text-highlighted px-2 mb-1">
        {{ title }}
      </p>

      <ul class="flex flex-col gap-0.5">
        <li v-for="link in links" :key="link.id">
          <a
            :href="`#${link.id}`"
            :class="[
              'flex items-center gap-1 text-sm leading-6 rounded-sm transition-colors px-2 cursor-pointer',
              activeId === link.id
                ? 'text-primary font-medium bg-primary/10'
                : 'text-muted hover:text-highlighted',
            ]"
            @click.prevent="scrollToHeading(link.id)"
          >
            <span class="flex-1 truncate">{{ link.text }}</span>
            <UIcon v-if="isDone(link.id)" name="i-lucide-circle-check-big"
              class="size-3.5 shrink-0 text-success" />
          </a>

          <!-- recursiveRenderSonTitle -->
          <ul
            v-if="link.children?.length"
            class="flex flex-col gap-0.5 ms-3 border-s border-default ps-2 mt-0.5"
          >
            <li v-for="child in link.children" :key="child.id">
              <a
                :href="`#${child.id}`"
                :class="[
                  'flex items-center gap-1 text-sm leading-6 rounded-sm transition-colors px-2 cursor-pointer',
                  activeId === child.id
                    ? 'text-primary font-medium bg-primary/10'
                    : 'text-muted hover:text-highlighted',
                ]"
                @click.prevent="scrollToHeading(child.id)"
              >
                <span class="flex-1 truncate">{{ child.text }}</span>
                <UIcon v-if="isDone(child.id)" name="i-lucide-circle-check-big"
                  class="size-3.5 shrink-0 text-success" />
              </a>

              <!-- support three-levelTitle -->
              <ul
                v-if="child.children?.length"
                class="flex flex-col gap-0.5 ms-3 border-s border-default ps-2 mt-0.5"
              >
                <li v-for="grandchild in child.children" :key="grandchild.id">
                  <a
                    :href="`#${grandchild.id}`"
                    :class="[
                      'flex items-center gap-1 text-xs leading-6 rounded-sm transition-colors px-2 cursor-pointer',
                      activeId === grandchild.id
                        ? 'text-primary font-medium bg-primary/10'
                        : 'text-dimmed hover:text-highlighted',
                    ]"
                    @click.prevent="scrollToHeading(grandchild.id)"
                  >
                    <span class="flex-1 truncate">{{ grandchild.text }}</span>
                    <UIcon v-if="isDone(grandchild.id)" name="i-lucide-circle-check-big"
                      class="size-3 shrink-0 text-success" />
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useList, type TocLink } from './useList'

const props = withDefaults(defineProps<{
  links?: TocLink[]
  title?: string
}>(), {
  title: '',
})

const {
  activeId, isDone, scrollToHeading,
} = useList(props)
</script>
