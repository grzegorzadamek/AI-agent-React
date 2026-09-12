import { useTranslation } from 'react-i18next'

type CallbackPageProps = {
  status: 'processing' | 'error'
}

export function CallbackPage({ status }: CallbackPageProps) {
  const { t } = useTranslation()
  const isProcessing = status === 'processing'
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/15 text-xl">
            {status === 'processing' ? '⏳' : '⚠️'}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">
              {t('callback.label')}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {isProcessing ? t('callback.processingTitle') : t('callback.errorTitle')}
            </h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-300">
          {isProcessing ? t('callback.processingDescription') : t('callback.errorDescription')}
        </p>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 ${
              isProcessing ? 'w-full' : 'w-1/2'
            }`}
          />
        </div>
      </section>
    </main>
  )
}
