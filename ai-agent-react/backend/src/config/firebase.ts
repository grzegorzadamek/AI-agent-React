import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'
import { env } from './env.js'

const configuredCredentials = env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
const resolvedServiceAccountPath = configuredCredentials
  ? path.resolve(process.cwd(), configuredCredentials)
  : undefined

let firebaseEnabled = false

if (!admin.apps.length) {
  const appOptions: admin.AppOptions = {
    projectId: env.FIREBASE_PROJECT_ID,
  }

  if (resolvedServiceAccountPath && fs.existsSync(resolvedServiceAccountPath)) {
    appOptions.credential = admin.credential.cert(resolvedServiceAccountPath)
  } else if (configuredCredentials) {
    console.warn(
      `[firebase] Ignoring invalid GOOGLE_APPLICATION_CREDENTIALS path: ${configuredCredentials}. Falling back to local in-memory user storage.`,
    )
  } else {
    try {
      appOptions.credential = admin.credential.applicationDefault()
    } catch (error) {
      console.warn(
        '[firebase] Firebase Admin default credentials are not available. Falling back to local in-memory user storage.',
      )
    }
  }

  try {
    admin.initializeApp(appOptions)
    firebaseEnabled = true
  } catch (error) {
    console.warn(
      '[firebase] Firebase Admin SDK initialization failed. Falling back to local in-memory user storage.',
    )
  }
}

export const db = firebaseEnabled ? admin.firestore() : null
export const auth = firebaseEnabled ? admin.auth() : null
export const isFirebaseEnabled = () => firebaseEnabled
