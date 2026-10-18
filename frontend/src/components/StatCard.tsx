import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: ReactNode
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}
