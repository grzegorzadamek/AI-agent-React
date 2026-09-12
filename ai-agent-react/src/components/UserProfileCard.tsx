import type { UserProfile } from '../types'
import { useTranslation } from 'react-i18next'

type UserProfileCardProps = {
  user: UserProfile
  onLogout: () => void
}

export function UserProfileCard({ user, onLogout }: UserProfileCardProps) {
  const { t } = useTranslation()
  return (
    <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">
          {t('profile.dashboard')}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {t('profile.greeting', { name: user.name })}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{user.email}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 font-semibold text-white">
          {user.avatar}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
        >
          {t('profile.logout')}
        </button>
      </div>
    </header>
  )
}
