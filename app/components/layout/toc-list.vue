<template>
  <nav class="flex flex-col gap-2">
    <template v-if="links?.length">
      <p v-if="title" class="text-sm font-semibold text-highlighted px-2 mb-1">
        {{ title }}
      </p>

      <ul class="flex flex-col gap-0.5">
        <li v-for="link in links" :key="link.id">
          <a
            :href="`#${link.id}`"
            :class="[
              'block text-sm leading-6 rounded-sm transition-colors px-2 cursor-pointer',
              activeId === link.id
                ? 'text-primary font-medium bg-primary/10'
                : 'text-muted hover:text-highlighted',
            ]"
            @click.prevent="scrollToHeading(link.id)"
          >
            {{ link.text }}
          </a>

          <!-- 递归渲染子标题 -->
          <ul
            v-if="link.children?.length"
            class="flex flex-col gap-0.5 ms-3 border-s border-default ps-2 mt-0.5"
          >
            <li v-for="child in link.children" :key="child.id">
              <a
                :href="`#${child.id}`"
                :class="[
                  'block text-sm leading-6 rounded-sm transition-colors px-2 cursor-pointer',
                  activeId === child.id
                    ? 'text-primary font-medium bg-primary/10'
                    : 'text-muted hover:text-highlighted',
                ]"
                @click.prevent="scrollToHeading(child.id)"
              >
                {{ child.text }}
              </a>

              <!-- 支持三级标题 -->
              <ul
                v-if="child.children?.length"
                class="flex flex-col gap-0.5 ms-3 border-s border-default ps-2 mt-0.5"
              >
                <li v-for="grandchild in child.children" :key="grandchild.id">
                  <a
                    :href="`#${grandchild.id}`"
                    :class="[
                      'block text-xs leading-6 rounded-sm transition-colors px-2 cursor-pointer',
                      activeId === grandchild.id
                        ? 'text-primary font-medium bg-primary/10'
                        : 'text-dimmed hover:text-highlighted',
                    ]"
                    @click.prevent="scrollToHeading(grandchild.id)"
                  >
                    {{ grandchild.text }}
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
interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

const props = withDefaults(defineProps<{
  links?: TocLink[]
  title?: string
}>(), {
  title: '本页目录',
})


const activeId = ref<string | null>(null)

/**
 * 将嵌套的 toc links 扁平化，用于 IntersectionObserver 监听
 */
function flatten(links: TocLink[] = []): { id: string }[] {
  return links.flatMap((link) => [
    { id: link.id },
    ...flatten(link.children),
  ])
}

const flatIds = computed(() => flatten(props.links))

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  observer = null

  if (!flatIds.value.length) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (visible.length) {
        activeId.value = visible[0]?.target?.id ?? null
      }
    },
    {
      rootMargin: '-80px 0px -70% 0px',
      threshold: [0, 1],
    },
  )

  nextTick(() => {
    flatIds.value.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer?.observe(el)
    })
  })
}

onMounted(setupObserver)
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(() => props.links, setupObserver)

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeId.value = id
  }
}
</script>
