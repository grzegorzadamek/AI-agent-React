import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { requireAuth } from './middleware/auth.js'
import {
  dashboard,
  dashboardMessage,
  googleCallback,
  googleLogin,
  logout,
  me,
  publicDashboardMessage,
  refresh,
} from './controllers/authController.js'
import { sendError } from './utils/errors.js'

export const app = express()

app.set('trust proxy', 1)
app.use(helmet())

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
)
app.use(express.json({ limit: '32kb' }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const publicMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const dashboardMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

app.get('/api/auth/google/login', authLimiter, googleLogin)
app.get('/api/auth/google/callback', authLimiter, googleCallback)
app.post('/api/auth/refresh', refreshLimiter, refresh)
app.get('/api/public/message', publicMessageLimiter, publicDashboardMessage)
app.post('/api/auth/logout', authLimiter, logout)
app.get('/api/me', requireAuth, me)
app.get('/api/dashboard', requireAuth, dashboard)
app.post('/api/dashboard/message', requireAuth, dashboardMessageLimiter, dashboardMessage)

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, error)
  },
)
