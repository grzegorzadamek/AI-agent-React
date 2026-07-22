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

export const getDashboardStatsForUser = async (email: string) => ({
  projects: 12,
  tasks: 34,
  notifications: 7,
  completion: 84,
})
