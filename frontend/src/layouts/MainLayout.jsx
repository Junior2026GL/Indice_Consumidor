import { NavLink, Outlet } from 'react-router-dom';
import { IconDashboard, IconUsers, IconLogbook, IconSearch, IconDelivery } from '../components/icons.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import UserMenu from './UserMenu.jsx';
import TwoFactorBanner from '../features/auth/components/TwoFactorBanner.jsx';

const menu = [
  ['/dashboard', 'Dashboard', IconDashboard],
  ['/usuarios', 'Usuarios', IconUsers],
  ['/entregas', 'Entregas', IconDelivery],
  ['/auditoria', 'Bitácora', IconLogbook],
];

const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

export default function MainLayout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          IPC <span>INSEP</span>
        </div>

        <nav aria-label="Administración">
          <span className="nav-section">Administración</span>
          {menu.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <a className="nav-link" href="/" target="_blank" rel="noopener noreferrer">
            <IconSearch />
            Ir a la consulta
          </a>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="brand topbar-brand">
            IPC <span>INSEP</span>
          </div>
          <UserMenu user={user} />
        </header>

        <main className="content">
          <TwoFactorBanner />
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="app-footer-brand">
            <span className="app-footer-mark">IP</span>
            IPC <span>INSEP</span>
          </div>
          <div className="app-footer-meta">
            <span>© {new Date().getFullYear()}</span>
            <span className="app-footer-version">v1.1.0</span>
          </div>
        </footer>
      </div>

      {/* Navegación inferior: solo en celular */}
      <nav className="bottom-nav" aria-label="Navegación principal">
        {menu.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <a href="/" target="_blank" rel="noopener noreferrer">
          <IconSearch />
          <span>Consulta</span>
        </a>
      </nav>
    </div>
  );
}
