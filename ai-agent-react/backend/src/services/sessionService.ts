import { createHash } from 'node:crypto'
import { db } from '../config/firebase.js'

const REVOKED_SESSIONS_COLLECTION = 'revokedSessions'
const revokedInMemory = new Map<string, number>()

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const removeExpiredEntries = () => {
  const now = Date.now()
  for (const [hash, expiresAt] of revokedInMemory) {
    if (expiresAt <= now) {
      revokedInMemory.delete(hash)
    }
  }
}

export const revokeRefreshToken = async (token: string, expiresAt: number) => {
  const hash = hashToken(token)
  revokedInMemory.set(hash, expiresAt)

  if (db) {
    try {
      await db.collection(REVOKED_SESSIONS_COLLECTION).doc(hash).set({
        expiresAt,
        revokedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.warn('[sessionService] Failed to persist refresh token revocation.', error)
    }
  }
}

export const isRefreshTokenRevoked = async (token: string) => {
  removeExpiredEntries()
  const hash = hashToken(token)
  const inMemoryExpiry = revokedInMemory.get(hash)

  if (inMemoryExpiry && inMemoryExpiry > Date.now()) {
    return true
  }

  if (!db) {
    return false
  }

  try {
    const snapshot = await db.collection(REVOKED_SESSIONS_COLLECTION).doc(hash).get()
    if (!snapshot.exists) {
      return false
    }

    const data = snapshot.data() as { expiresAt?: number }
    if (!data.expiresAt || data.expiresAt <= Date.now()) {
      await snapshot.ref.delete()
      return false
    }

    revokedInMemory.set(hash, data.expiresAt)
    return true
  } catch (error) {
    console.warn('[sessionService] Failed to read refresh token revocation.', error)
    return Boolean(inMemoryExpiry && inMemoryExpiry > Date.now())
  }
}
