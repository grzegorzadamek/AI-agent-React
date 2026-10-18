import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'
import { z } from 'zod'
import { env } from './env.js'

const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().min(1),
  private_key: z.string().min(1),
})

const getServiceAccountFromEnv = () => {
  const configuredServiceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (!configuredServiceAccount) {
    return undefined
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(configuredServiceAccount)
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.', { cause: error })
  }

  const result = serviceAccountSchema.safeParse(parsedJson)
  if (!result.success) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON must include project_id, client_email, and private_key.',
      { cause: result.error },
    )
  }

  if (result.data.project_id !== env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON project_id must match FIREBASE_PROJECT_ID.')
  }

  return {
    projectId: result.data.project_id,
    clientEmail: result.data.client_email,
    privateKey: result.data.private_key,
  }
}

const configuredServiceAccount = getServiceAccountFromEnv()
const configuredCredentials = env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
const resolvedServiceAccountPath = configuredCredentials
  ? path.resolve(process.cwd(), configuredCredentials)
  : undefined
const serviceAccountFileExists =
  resolvedServiceAccountPath !== undefined && fs.existsSync(resolvedServiceAccountPath)

let firebaseEnabled = false

if (!admin.apps.length) {
  if (
    env.NODE_ENV === 'production' &&
    !configuredServiceAccount &&
    !serviceAccountFileExists
  ) {
    throw new Error(
      'Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON for production.',
    )
  }

  const appOptions: admin.AppOptions = {
    projectId: env.FIREBASE_PROJECT_ID,
  }

  if (configuredServiceAccount) {
    appOptions.credential = admin.credential.cert(configuredServiceAccount)
  } else if (resolvedServiceAccountPath && serviceAccountFileExists) {
    appOptions.credential = admin.credential.cert(resolvedServiceAccountPath)
  } else if (configuredCredentials) {
    console.warn(
      `[firebase] Ignoring invalid GOOGLE_APPLICATION_CREDENTIALS path: ${configuredCredentials}. Falling back to local in-memory user storage.`,
    )
  } else {
    try {
      appOptions.credential = admin.credential.applicationDefault()
    } catch {
      console.warn(
        '[firebase] Firebase Admin default credentials are not available. Falling back to local in-memory user storage.',
      )
    }
  }

  try {
    admin.initializeApp(appOptions)
    firebaseEnabled = true
    console.info('[firebase] Admin SDK initialized', {
      projectId: env.FIREBASE_PROJECT_ID,
      credentialSource: configuredServiceAccount
        ? 'service-account-env'
        : serviceAccountFileExists
          ? 'service-account-file'
          : 'application-default',
    })
  } catch (error) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Firebase Admin SDK initialization failed.', { cause: error })
    }

    console.warn(
      '[firebase] Firebase Admin SDK initialization failed. Falling back to local in-memory user storage.',
      error,
    )
  }
}

if (!firebaseEnabled && env.NODE_ENV === 'production') {
  throw new Error('Firebase is required in production but could not be initialized')
}

export const db = firebaseEnabled ? admin.firestore() : null
export const auth = firebaseEnabled ? admin.auth() : null
export const isFirebaseEnabled = () => firebaseEnabled
