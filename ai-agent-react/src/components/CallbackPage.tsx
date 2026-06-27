type CallbackPageProps = {
  status: 'processing' | 'error'
}

export function CallbackPage({ status }: CallbackPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/15 text-xl">
            {status === 'processing' ? '⏳' : '⚠️'}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">
              Google OAuth
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {status === 'processing' ? 'Kończymy logowanie' : 'Nie udało się zakończyć logowania'}
            </h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-300">
          {status === 'processing'
            ? 'Udało się wrócić z Google. Trwa finalizacja sesji i przekierowanie do panelu.'
            : 'Podczas powrotu z Google wystąpił problem. Spróbuj ponownie.'}
        </p>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 ${
              status === 'processing' ? 'w-full' : 'w-1/2'
            }`}
          />
        </div>
      </section>
    </main>
  )
}
