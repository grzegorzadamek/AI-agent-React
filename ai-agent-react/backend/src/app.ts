import cors from 'cors'
import express from 'express'
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

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/auth/google/login', googleLogin)
app.get('/api/auth/google/callback', googleCallback)
app.post('/api/auth/refresh', refresh)
app.get('/api/public/message', publicDashboardMessage)
app.post('/api/auth/logout', requireAuth, logout)
app.get('/api/me', requireAuth, me)
app.get('/api/dashboard', requireAuth, dashboard)
app.post('/api/dashboard/message', requireAuth, dashboardMessage)

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, error)
  },
)
