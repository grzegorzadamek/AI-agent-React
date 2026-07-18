import type { ReactNode } from 'react'

type ProtectedRouteProps = {
  condition: boolean
  fallback: ReactNode
  children: ReactNode
}

export function ProtectedRoute({ condition, fallback, children }: ProtectedRouteProps) {
  return condition ? <>{children}</> : <>{fallback}</>
}
