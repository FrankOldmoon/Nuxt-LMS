<template>
  <template v-if="myClasses.length">
    <URadioGroup v-model="selectedMyClassId" :items="myClassOptions" value-key="value" label-key="label"
      @update:model-value="onMyClassChange" />
  </template>
  <div v-else class="text-sm text-muted py-8 text-center">
    {{ $t('classSelector.noMyClasses') }}
  </div>
</template>

<script setup lang="ts">
const { myClasses, myClassOptions, selectedMyClassId, onMyClassChange } = useClassModalContext()
</script>
