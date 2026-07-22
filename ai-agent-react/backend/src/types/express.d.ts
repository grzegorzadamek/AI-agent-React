declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        plan: string
        avatar: string
      }
    }
  }
}

export {}
