<template>
  <div class="max-w-[600px] p-4 bg-white rounded-lg shadow">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Select Language</label>
      <select v-model="selectedLang" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option v-for="(name, code) in languageMap" :key="code" :value="code">{{ name }}</option>
      </select>
    </div>

    <div class="mb-4 flex items-center gap-4">
      <label class="flex items-center">
        <input v-model="continuous" type="checkbox" class="mr-2" />
        <span class="text-sm text-gray-700">Continuous recognition</span>
      </label>
      <label class="flex items-center">
        <input v-model="interimResults" type="checkbox" class="mr-2" />
        <span class="text-sm text-gray-700">Show interim results</span>
      </label>
    </div>

    <div class="mb-4">
      <button
        @click="handleToggle"
        :class="[
          'px-6 py-3 rounded-full text-white font-medium transition-all',
          isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
        ]"
      >
        <div class="flex items-center gap-2">
          <UIcon v-if="isListening" name="i-lucide-circle" class="size-5" />
          <UIcon v-else name="i-lucide-mic" class="size-5" />
          <span>{{ isListening ? 'Stop recognition' : 'Start recognition' }}</span>
        </div>
      </button>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Recognition result</label>
      <div class="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
        <div v-if="finalTranscript" class="text-gray-900">{{ finalTranscript }}</div>
        <div v-if="interimTranscript" class="text-gray-500 italic">{{ interimTranscript }}</div>
        <div v-if="!finalTranscript && !interimTranscript" class="text-gray-400">
          Click"Start recognition"button to start Speech Recognition...
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleClear"
        :disabled="!finalTranscript"
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Clear
      </button>
      <button
        @click="handleCopy"
        :disabled="!finalTranscript"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Copy
      </button>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-red-100 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="!isSupported" class="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
      Your browser does not support Web Speech API Speech Recognition functionality
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  selectedLang, continuous, interimResults, isListening, finalTranscript,
  interimTranscript, error, isSupported, handleToggle, handleClear, handleCopy,
  languageMap,
} = useAsr()
</script>
