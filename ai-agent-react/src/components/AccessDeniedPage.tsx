type AccessDeniedPageProps = {
  email?: string
  reason?: 'forbidden' | 'session-expired'
}

export function AccessDeniedPage({ email, reason = 'forbidden' }: AccessDeniedPageProps) {
  const title = reason === 'session-expired' ? 'Sesja wygasła' : 'Nie masz dostępu do panelu'
  const description = reason === 'session-expired'
    ? 'Twoja sesja wygasła z powodu bezczynności albo upłynięcia czasu. Zaloguj się ponownie, aby wrócić do dashboardu.'
    : email
      ? `Konto ${email} nie jest dopuszczone do tej aplikacji w trybie mockowym.`
      : 'To konto nie ma uprawnień do wejścia do dashboardu.'
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.16),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#111827_100%)] px-4 py-10 text-white">
      <section className="w-full max-w-2xl rounded-[32px] border border-rose-500/20 bg-slate-900/70 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/15 text-2xl">
            🚫
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">Dostęp zablokowany</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-slate-300">{description}</p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
          <p className="font-medium text-slate-200">Mock sprawdzania dostępu</p>
          <p className="mt-2 leading-6">
            {reason === 'session-expired'
              ? 'Sesja jest automatycznie kończona po czasie bezczynności lub po upływie limitu ważności tokena.'
              : 'W tej wersji tylko użytkownik z adresem nakoniecdnia@gmail.com może zobaczyć Dashboard.'}
          </p>
        </div>
      </section>
    </main>
  )
}
