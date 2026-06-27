type LoginPageProps = {
  onLogin: () => void
  isLoading: boolean
  authStep: 'idle' | 'redirecting' | 'authenticating' | 'success'
  sessionNotice?: string | null
}

const authStepLabels: Record<LoginPageProps['authStep'], string> = {
  idle: 'Kliknij przycisk, aby rozpocząć logowanie przez Google.',
  redirecting: 'Przekierowuję do Google…',
  authenticating: 'Trwa autoryzacja konta…',
  success: 'Logowanie zakończone. Przekierowuję do dashboardu…',
}

const isMissingGoogleConfig = !import.meta.env.VITE_GOOGLE_CLIENT_ID

export function LoginPage({ onLogin, isLoading, authStep, sessionNotice }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_100%)] px-4 py-10 text-white">
      <section className="w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/70 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 p-8 sm:p-10 lg:p-12">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-medium text-white/90">
                Secure AI workspace
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Zaloguj się i zacznij pracę w swoim panelu.
              </h1>
              <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                Współpracuj z zespołem, monitoruj postępy i zarządzaj zadaniami bezpośrednio po wejściu do aplikacji.
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-white/20 bg-slate-950/20 p-5 text-sm text-white/85">
              <p className="font-semibold">Bezpieczne logowanie</p>
              <p className="mt-2 leading-6 text-white/80">
                Obecnie flow jest podpięte pod OAuth w stylu Google. Po powrocie z Google aplikacja finalizuje sesję i przekierowuje do dashboardu.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-slate-950/90 px-8 py-10 sm:px-10 lg:px-12">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">
                Welcome back
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Zaloguj się przez Google</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Kliknij przycisk poniżej, aby rozpocząć autoryzację i przejść do panelu zarządzania.
              </p>
            </div>

            <button
              type="button"
              onClick={onLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                G
              </span>
              {isLoading ? 'Trwa logowanie...' : 'Kontynuuj z Google'}
            </button>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-200">Status procesu</p>
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                  {isLoading ? 'W toku' : 'Gotowe'}
                </span>
              </div>
              <p className="mt-2 leading-6">{authStepLabels[authStep]}</p>
              {sessionNotice ? (
                <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300">
                  {sessionNotice}
                </p>
              ) : null}
              {isMissingGoogleConfig ? (
                <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300">
                  Brakuje ustawienia VITE_GOOGLE_CLIENT_ID. Dodaj poprawny client ID z Google Cloud Console, aby OAuth zaczął działać.
                </p>
              ) : null}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 ${
                    authStep === 'idle'
                      ? 'w-0'
                      : authStep === 'redirecting'
                        ? 'w-1/3'
                        : authStep === 'authenticating'
                          ? 'w-2/3'
                          : 'w-full'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
