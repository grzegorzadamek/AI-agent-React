import { env } from '../config/env.js'
import { db } from '../config/firebase.js'
import type { UserProfile } from '../types.js'

const USERS_COLLECTION = 'users'
const ALLOWED_USERS_COLLECTION = 'allowedUsers'
const memoryUsers = new Map<string, UserProfile>()
const memoryAllowedEmails = new Set<string>(
  (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

const memoryDashboardProgress = new Map<string, { message: string; completion: number }>()

const upsertMemoryUser = (user: UserProfile) => {
  const memoryUser: UserProfile = {
    ...user,
  }

  memoryUsers.set(user.id, memoryUser)

  return memoryUsers.get(user.id) as UserProfile
}

const findUserInMemory = (email: string) => {
  for (const user of memoryUsers.values()) {
    if (user.email === email) {
      return user
    }
  }

  return null
}

export const upsertUser = async (user: UserProfile) => {
  if (!db) {
    return upsertMemoryUser(user)
  }

  try {
    const ref = db.collection(USERS_COLLECTION).doc(user.id)
    await ref.set(
      {
        ...user,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )

    const snapshot = await ref.get()
    return snapshot.data() as UserProfile
  } catch (error) {
    console.warn('[userService] Firestore write failed, falling back to in-memory user storage.', error)
    return upsertMemoryUser(user)
  }
}

export const getUserByEmail = async (email: string) => {
  const memoryUser = findUserInMemory(email)
  if (memoryUser) {
    return memoryUser
  }

  if (!db) {
    return null
  }

  try {
    const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get()

    if (snapshot.empty) {
      return null
    }

    return snapshot.docs[0].data() as UserProfile
  } catch (error) {
    console.warn('[userService] Firestore read failed, falling back to in-memory user storage.', error)
    return findUserInMemory(email)
  }
}

export const addAllowedEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  memoryAllowedEmails.add(normalizedEmail)

  if (!db) {
    return normalizedEmail
  }

  await db.collection(ALLOWED_USERS_COLLECTION).doc(normalizedEmail).set({
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  })

  return normalizedEmail
}

export const isEmailAllowed = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase()

  if (memoryAllowedEmails.has(normalizedEmail)) {
    return true
  }

  if (!db) {
    return false
  }

  try {
    const snapshot = await db.collection(ALLOWED_USERS_COLLECTION).doc(normalizedEmail).get()
    if (snapshot.exists) {
      memoryAllowedEmails.add(normalizedEmail)
      return true
    }

    return false
  } catch (error) {
    console.warn('[userService] Allowed email lookup failed.', error)
    return memoryAllowedEmails.has(normalizedEmail)
  }
}

export const getDashboardStatsForUser = async (email: string) => {
  const normalized = email.trim().toLowerCase()

  // try to read persisted progress from Firestore if available
  if (db) {
    try {
      const snap = await db.collection('dashboardProgress').doc(normalized).get()
      if (snap.exists) {
        const data = snap.data() as { message: string; completion: number }
        memoryDashboardProgress.set(normalized, { message: data.message, completion: data.completion })
      }
    } catch (error) {
      console.warn('[userService] Failed to read dashboard progress from Firestore, using memory.', error)
    }
  }

  return {
    projects: 12,
    tasks: 34,
    notifications: 7,
    completion: memoryDashboardProgress.get(normalized)?.completion ?? 84,
  }
}

export const saveDashboardMessageForUser = async (email: string, message: string) => {
  const normalized = email.trim().toLowerCase()

  // try to extract a percentage number from the message
  const match = message.match(/(\d{1,3})/)?.[1]
  let completion = 84
  if (match) {
    const parsed = Number(match)
    if (!Number.isNaN(parsed)) {
      completion = Math.max(0, Math.min(100, parsed))
    }
  } else {
    completion = Math.max(0, Math.min(100, Math.floor((message.trim().length / 200) * 100)))
  }

  memoryDashboardProgress.set(normalized, { message, completion })

  if (db) {
    try {
      await db.collection('dashboardProgress').doc(normalized).set({
        message,
        completion,
        updatedAt: new Date().toISOString(),
      }, { merge: true })
    } catch (error) {
      console.warn('[userService] Failed to persist dashboard progress to Firestore, using memory only.', error)
    }
  }

  return { message, completion }
}
