import { watch } from 'vue'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const UI_SETTINGS_KEY = 'openclaw-ui-settings'

export const useUiSettingsStore = defineStore('uiSettings', () => {
  const blurAmount = ref(12)
  const isAdmin = ref(false)

  function load() {
    try {
      // Check URL for code
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (code === '1111011') {
        window.localStorage.setItem('openclaw_admin', '1')
        // Optional: remove code from URL to keep it clean
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (code !== null) {
        window.localStorage.setItem('openclaw_admin', '0')
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      isAdmin.value = window.localStorage.getItem('openclaw_admin') === '1'

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

  return { blurAmount, isAdmin }
})
