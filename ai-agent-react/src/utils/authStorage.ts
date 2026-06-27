const STORAGE_KEY = 'ai-agent-auth-user'
const ACCESS_TOKEN_KEY = 'ai-agent-access-token'
const SESSION_TTL_MS = 15 * 60 * 1000
const SESSION_TIMESTAMP_KEY = 'ai-agent-session-timestamp'
const OAUTH_STATE_KEY = 'ai-agent-oauth-state'
const OAUTH_NONCE_KEY = 'ai-agent-oauth-nonce'

export const authStorage = {
  read(key: string) {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(key)
  },
  write(key: string, value: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.setItem(key, value)
  },
  remove(key: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.removeItem(key)
  },
  clearSession() {
    this.remove(STORAGE_KEY)
    this.remove(ACCESS_TOKEN_KEY)
    this.remove(SESSION_TIMESTAMP_KEY)
    this.remove(OAUTH_STATE_KEY)
    this.remove(OAUTH_NONCE_KEY)
  },
  isSessionValid() {
    if (typeof window === 'undefined') {
      return false
    }

    const timestamp = window.sessionStorage.getItem(SESSION_TIMESTAMP_KEY)
    if (!timestamp) {
      return false
    }

    return Date.now() - Number(timestamp) < SESSION_TTL_MS
  },
  touchSession() {
    this.write(SESSION_TIMESTAMP_KEY, String(Date.now()))
  },
}

export { STORAGE_KEY, ACCESS_TOKEN_KEY, SESSION_TTL_MS, SESSION_TIMESTAMP_KEY, OAUTH_STATE_KEY, OAUTH_NONCE_KEY }
