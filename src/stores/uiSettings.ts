import { watch } from 'vue'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const UI_SETTINGS_KEY = 'openclaw-ui-settings'

export const useUiSettingsStore = defineStore('uiSettings', () => {
  const blurAmount = ref(12)

  function load() {
    try {
      const raw = window.localStorage.getItem(UI_SETTINGS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { blurAmount?: number }
        if (typeof parsed.blurAmount === 'number') {
          blurAmount.value = Math.max(0, Math.min(40, parsed.blurAmount))
        }
      }
    } catch {
      // ignore
    }
  }

  function persist() {
    window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify({ blurAmount: blurAmount.value }))
  }

  watch(blurAmount, persist)

  load()

  return { blurAmount }
})
