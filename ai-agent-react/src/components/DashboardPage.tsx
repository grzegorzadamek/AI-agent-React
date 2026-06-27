import { useDashboardMessage } from '../hooks/useDashboardMessage'

type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  plan: string
  avatar: string
}

type DashboardStats = {
  projects: number
  tasks: number
  notifications: number
  completion: number
}

type DashboardPageProps = {
  user: UserProfile
  stats: DashboardStats | undefined
  isLoading: boolean
  onLogout: () => void
  accessToken?: string | null
}

export function DashboardPage({ user, stats, isLoading, onLogout, accessToken }: DashboardPageProps) {
  const { message, setMessage, isSubmitting, submitStatus, handleSubmit } = useDashboardMessage({
    accessToken,
    email: user.email,
  })

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Witaj, {user.name}</h1>
            <p className="mt-2 text-sm text-slate-400">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Wyloguj się
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 font-semibold text-white">
                {user.avatar}
              </div>
              <div>
                <p className="text-lg font-semibold">{user.name}</p>
                <p className="text-sm text-slate-400">{user.role} • {user.plan} plan</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Projekty</p>
                <p className="mt-2 text-2xl font-semibold text-white">{isLoading ? '…' : stats?.projects ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Zadania</p>
                <p className="mt-2 text-2xl font-semibold text-white">{isLoading ? '…' : stats?.tasks ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Powiadomienia</p>
                <p className="mt-2 text-2xl font-semibold text-white">{isLoading ? '…' : stats?.notifications ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-600/90 to-cyan-500/90 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/80">Postęp</p>
            <p className="mt-3 text-5xl font-semibold text-white">{isLoading ? '…' : `${stats?.completion ?? 0}%`}</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Dane są pobierane przez TanStack Query i są gotowe do zastąpienia przez prawdziwe endpointy backendowe.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">Wiadomość do backendu</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Napisz coś i wyślij POSTem</h2>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Wysyłam…' : 'Wyślij'}
            </button>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Wpisz wiadomość, którą backend ma odebrać..."
            rows={5}
            className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
          />

          {submitStatus.type !== 'idle' ? (
            <p className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${submitStatus.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}`}>
              {submitStatus.text}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}
