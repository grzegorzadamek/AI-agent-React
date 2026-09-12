import { useDashboardMessage } from '../hooks/useDashboardMessage'
import type { DashboardStats, UserProfile } from '../types'
import { MessageSection } from './MessageSection'
import { StatCard } from './StatCard'
import { UserProfileCard } from './UserProfileCard'

type DashboardPageProps = {
  user: UserProfile
  stats: DashboardStats | undefined
  isLoading: boolean
  onLogout: () => void
  accessToken?: string | null
}

export function DashboardPage({
  user,
  stats,
  isLoading,
  onLogout,
  accessToken,
}: DashboardPageProps) {
  const { message, setMessage, isSubmitting, submitStatus, handleSubmit } = useDashboardMessage({
    accessToken,
  })

  const safeStats: DashboardStats = {
    projects: stats?.projects ?? 0,
    tasks: stats?.tasks ?? 0,
    notifications: stats?.notifications ?? 0,
    completion: stats?.completion ?? 0,
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <UserProfileCard user={user} onLogout={onLogout} />

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatCard label="Projekty" value={isLoading ? '…' : safeStats.projects} />
              <StatCard label="Zadania" value={isLoading ? '…' : safeStats.tasks} />
              <StatCard label="Powiadomienia" value={isLoading ? '…' : safeStats.notifications} />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-600/90 to-cyan-500/90 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/80">Postęp</p>
            <p className="mt-3 text-5xl font-semibold text-white">
              {isLoading ? '…' : `${safeStats.completion}%`}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Dane są pobierane przez TanStack Query i mogą być łatwo wymienione na prawdziwy
              backend.
            </p>
          </div>
        </section>

        <MessageSection
          message={message}
          onChange={setMessage}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          status={submitStatus}
        />
      </div>
    </main>
  )
}
