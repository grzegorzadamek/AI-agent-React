import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type AccessDeniedPageProps = {
  email?: string
  reason?: 'forbidden' | 'session-expired'
}

export function AccessDeniedPage({ email, reason = 'forbidden' }: AccessDeniedPageProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isExpired = reason === 'session-expired'
  const title = isExpired ? t('accessDenied.expiredTitle') : t('accessDenied.forbiddenTitle')
  const description = isExpired
    ? t('accessDenied.expiredDescription')
    : email
      ? t('accessDenied.emailDescription', { email })
      : t('accessDenied.forbiddenDescription')
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.16),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#111827_100%)] px-4 py-10 text-white">
      <section className="w-full max-w-2xl rounded-[32px] border border-rose-500/20 bg-slate-900/70 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/15 text-2xl">
            🚫
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">
              {t('accessDenied.label')}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-slate-300">{description}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
          <p className="font-medium text-slate-200">{t('accessDenied.accessCheckTitle')}</p>
          <p className="mt-2 leading-6">
            {isExpired
              ? t('accessDenied.expiredAccessDescription')
              : t('accessDenied.forbiddenAccessDescription')}
          </p>
        </div>
        <div className="mt-6 flex">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
          >
            {t('accessDenied.backToLogin')}
          </button>
        </div>
      </section>
    </main>
  )
}
