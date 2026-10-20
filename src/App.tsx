import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { AdminHome } from './features/admin/AdminHome'
import { PrincipalHome } from './features/principal/PrincipalHome'
import { ReportsPage } from './features/reports/ReportsPage'
import { SecretaryHome } from './features/secretary/SecretaryHome'
import { MissionPlay } from './features/student/MissionPlay'
import { MissionResult } from './features/student/MissionResult'
import { StudentHome } from './features/student/StudentHome'
import { StudentProgress } from './features/student/StudentProgress'
import { ClassDetail } from './features/teacher/ClassDetail'
import { StudentDetail } from './features/teacher/StudentDetail'
import { TeacherHome } from './features/teacher/TeacherHome'
import { useAuth } from './lib/auth'
import { ROLE_HOME, ROUTES } from './lib/constants'
import { ProtectedRoute } from './routes/ProtectedRoute'

function HomeRedirect() {
  const { loading, profile } = useAuth()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-brand-800">
        <p className="text-sm font-extrabold">Carregando sessão...</p>
      </main>
    )
  }

  if (!profile) return <Navigate to={ROUTES.login} replace />
  return <Navigate to={ROLE_HOME[profile.role]} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route
        path={ROUTES.student}
        element={
          <ProtectedRoute roles={['student']}>
            <StudentHome />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.studentProgress}
        element={
          <ProtectedRoute roles={['student']}>
            <StudentProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.missionResult}
        element={
          <ProtectedRoute roles={['student']}>
            <MissionResult />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.mission}
        element={
          <ProtectedRoute roles={['student']}>
            <MissionPlay />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.teacher}
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherHome />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.teacherClass}
        element={
          <ProtectedRoute roles={['teacher']}>
            <ClassDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.teacherStudent}
        element={
          <ProtectedRoute roles={['teacher', 'principal']}>
            <StudentDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.principal}
        element={
          <ProtectedRoute roles={['principal']}>
            <PrincipalHome />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.secretary}
        element={
          <ProtectedRoute roles={['secretary']}>
            <SecretaryHome />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.admin}
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminHome />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.reports}
        element={
          <ProtectedRoute roles={['teacher', 'principal', 'secretary', 'admin']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}