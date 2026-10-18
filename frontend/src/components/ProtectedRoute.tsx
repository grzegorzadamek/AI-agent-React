import type { ReactNode } from 'react'

type ProtectedRouteProps = {
  condition: boolean
  fallback: ReactNode
  loading?: ReactNode
  children: ReactNode
}

export function ProtectedRoute({ condition, fallback, loading, children }: ProtectedRouteProps) {
  if (loading) return <>{loading}</>
  return condition ? <>{children}</> : <>{fallback}</>
}
