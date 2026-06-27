import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { DashboardPage } from './components/DashboardPage'
import { CallbackPage } from './components/CallbackPage'
import { AccessDeniedPage } from './components/AccessDeniedPage'
import { useAuth } from './hooks/useAuth'

function App() {
  const {
    authUser,
    accessToken,
    authStep,
    callbackStatus,
    sessionNotice,
    accessDeniedEmail,
    dashboardQuery,
    loginMutation,
    handleGoogleLogin,
    handleLogout,
    isDashboardAccessible,
  } = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LoginPage
            onLogin={handleGoogleLogin}
            isLoading={loginMutation.isPending}
            authStep={authStep}
            sessionNotice={sessionNotice}
          />
        }
      />
      <Route path="/auth/callback" element={<CallbackPage status={callbackStatus} />} />
      <Route
        path="/dashboard"
        element={
          isDashboardAccessible ? (
            dashboardQuery.isError ? (
              <AccessDeniedPage email={authUser?.email ?? accessDeniedEmail ?? undefined} />
            ) : (
              <DashboardPage
                user={authUser!}
                stats={dashboardQuery.data}
                isLoading={dashboardQuery.isLoading}
                onLogout={handleLogout}
                accessToken={accessToken}
              />
            )
          ) : (
            <AccessDeniedPage email={authUser?.email ?? accessDeniedEmail ?? undefined} />
          )
        }
      />
      <Route
        path="/access-denied"
        element={authUser || sessionNotice || accessDeniedEmail ? <AccessDeniedPage email={authUser?.email ?? accessDeniedEmail ?? undefined} reason={sessionNotice ? 'session-expired' : 'forbidden'} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
