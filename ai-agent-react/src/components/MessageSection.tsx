import type { SubmitStatus } from '../types'
import { useTranslation } from 'react-i18next'

type MessageSectionProps = {
  message: string
  onChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  status: SubmitStatus
}

export function MessageSection({
  message,
  onChange,
  onSubmit,
  isSubmitting,
  status,
}: MessageSectionProps) {
  const { t } = useTranslation()
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">
            {t('message.label')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">{t('message.heading')}</h2>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? t('message.sending') : t('message.send')}
        </button>
      </div>

      <textarea
        value={message}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('message.placeholder')}
        rows={5}
        className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
      />

      {status.type !== 'idle' ? (
        <p
          className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </section>
  )
}
