import type { Response } from 'express'
import { env } from '../config/env.js'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const sendError = (res: Response, error: unknown) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    })
  }

  const message =
    env.NODE_ENV === 'production'
      ? 'Unexpected server error'
      : error instanceof Error
        ? error.message
        : 'Unexpected error'
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  })
}
