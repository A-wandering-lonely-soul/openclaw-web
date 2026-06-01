import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const AUTH_KEY = 'openclaw-auth'

interface AuthState {
  username: string
  role: 'guest' | 'admin'
  displayName: string
}

export const useAuthStore = defineStore('auth', () => {
  const auth = ref<AuthState | null>(null)

  const isLoggedIn = computed(() => auth.value !== null)
  const isAdmin = computed(() => auth.value?.role === 'admin')
  const displayName = computed(() => auth.value?.displayName ?? '')
  const username = computed(() => auth.value?.username ?? '')

  function load() {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY)
      if (raw) {
        auth.value = JSON.parse(raw) as AuthState
      }
    } catch {
      // ignore
    }
  }

  function setAuth(state: AuthState) {
    auth.value = state
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(state))
  }

  function logout() {
    auth.value = null
    window.localStorage.removeItem(AUTH_KEY)
  }

  load()

  return { isLoggedIn, isAdmin, displayName, username, setAuth, logout }
})
