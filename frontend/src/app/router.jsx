import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import PageLoader from '../components/PageLoader.jsx';
import RouteError from '../components/RouteError.jsx';
import { AuthProvider, useAuth } from '../features/auth/AuthContext.jsx';

// Cada página se descarga solo cuando se visita (carga inicial más liviana).
const ConsultaPage = lazy(() => import('../features/consulta/pages/ConsultaPage.jsx'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage.jsx'));
const UsersPage = lazy(() => import('../features/users/pages/UsersPage.jsx'));
const EntregasPage = lazy(() => import('../features/entregas/pages/EntregasPage.jsx'));
const AuditPage = lazy(() => import('../features/audit/pages/AuditPage.jsx'));

const page = (element) => <Suspense fallback={<PageLoader />}>{element}</Suspense>;

// La sesión (y su renovación automática) solo se inicia en las rutas de administración:
// la consulta pública no hace ninguna petición de autenticación.
function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function Protected({ children, roles }) {
  const { status, user } = useAuth();

  if (status === 'loading') return <PageLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;

  return children;
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: page(<LoginPage />) },

      // Consulta de DNI: cualquier usuario activo (el que crea el administrador en "Usuarios").
      {
        path: '/',
        element: <Protected>{page(<ConsultaPage />)}</Protected>,
      },

      // Administración: solo Super Admin.
      {
        element: (
          <Protected roles={['SUPER_ADMIN']}>
            <MainLayout />
          </Protected>
        ),
        children: [
          { path: '/dashboard', element: page(<DashboardPage />) },
          { path: '/usuarios', element: page(<UsersPage />) },
          { path: '/entregas', element: page(<EntregasPage />) },
          { path: '/auditoria', element: page(<AuditPage />) },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
