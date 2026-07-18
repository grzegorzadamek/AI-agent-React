const AUTH_USER_KEY = 'ai-agent-auth-user'
const ACCESS_TOKEN_KEY = 'ai-agent-access-token'
const SESSION_TTL_MS = 15 * 60 * 1000
const SESSION_TIMESTAMP_KEY = 'ai-agent-session-timestamp'
const OAUTH_STATE_KEY = 'ai-agent-oauth-state'
const OAUTH_NONCE_KEY = 'ai-agent-oauth-nonce'

const isBrowser = typeof window !== 'undefined'

const createStorage = () => ({
  read(key: string) {
    if (!isBrowser) return null
    return window.sessionStorage.getItem(key)
  },
  write(key: string, value: string) {
    if (!isBrowser) return
    window.sessionStorage.setItem(key, value)
  },
  remove(key: string) {
    if (!isBrowser) return
    window.sessionStorage.removeItem(key)
  },
})

export const authStorage = {
  ...createStorage(),
  clearSession() {
    this.remove(AUTH_USER_KEY)
    this.remove(ACCESS_TOKEN_KEY)
    this.remove(SESSION_TIMESTAMP_KEY)
    this.remove(OAUTH_STATE_KEY)
    this.remove(OAUTH_NONCE_KEY)
  },
  isSessionValid() {
    if (!isBrowser) return false
    const timestamp = window.sessionStorage.getItem(SESSION_TIMESTAMP_KEY)
    if (!timestamp) return false
    return Date.now() - Number(timestamp) < SESSION_TTL_MS
  },
  touchSession() {
    this.write(SESSION_TIMESTAMP_KEY, String(Date.now()))
  },
}

export { AUTH_USER_KEY, ACCESS_TOKEN_KEY, SESSION_TTL_MS, SESSION_TIMESTAMP_KEY, OAUTH_STATE_KEY, OAUTH_NONCE_KEY }
