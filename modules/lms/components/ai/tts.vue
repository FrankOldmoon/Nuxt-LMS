<template>
  <div class="max-w-[600px] p-4 bg-white rounded-lg shadow">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Input Text</label>
      <textarea
        v-model="text"
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Please enter text to read..."
      />
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
        <select v-model="selectedLang" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option v-for="(name, code) in languageMap" :key="code" :value="code">{{ name }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Voice</label>
        <select v-model="selectedVoice" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Default voice</option>
          <option v-for="voice in filteredVoices" :key="voice.voiceURI" :value="voice.voiceURI">
            {{ voice.name }} ({{ voice.lang }})
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
        <select v-model="selectedGender" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="female">Female voice</option>
          <option value="male">Male voice</option>
        </select>
      </div>
    </div>

    <div class="space-y-3 mb-4">
      <div v-for="s in sliders" :key="s.label">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ s.label }}: {{ s.ref.value.toFixed(1) }}
        </label>
        <input
          :value="s.ref.value"
          @input="updateSlider(s, $event)"
          type="range"
          :min="s.min"
          :max="s.max"
          :step="s.step"
          class="w-full"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleSpeak"
        :disabled="!text || isSpeaking"
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ isSpeaking ? 'Playing...' : 'Play' }}
      </button>
      <button v-if="isSpeaking" @click="handlePause" class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
        {{ isPaused ? 'Continue' : 'Pause' }}
      </button>
      <button v-if="isSpeaking" @click="handleStop" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
        Stop
      </button>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-red-100 text-red-700 rounded-md">{{ error }}</div>
    <div v-if="!isSupported" class="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
      Speech Synthesis requires a browser environment to use
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  text, selectedLang, selectedVoice, selectedGender, rate, pitch, volume,
  isSpeaking, isPaused, error, isSupported, filteredVoices,
  handleSpeak, handlePause, handleStop, languageMap,
} = useTts()

const sliders = [
  { label: 'Speed', min: 0.5, max: 2, step: 0.1, ref: rate },
  { label: 'Pitch', min: 0.5, max: 2, step: 0.1, ref: pitch },
  { label: 'Volume', min: 0, max: 1, step: 0.1, ref: volume },
]

function updateSlider(s: { ref: Ref<number> }, e: Event) {
  s.ref.value = Number((e.target as HTMLInputElement).value)
}
</script>
