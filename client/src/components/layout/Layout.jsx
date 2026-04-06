import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Container, ScrollText, Bell, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMetrics } from '../../hooks/useMetrics';
import { clsx } from 'clsx';

const nav = [
  { to: '/',       label: 'Overview',    icon: LayoutDashboard, end: true },
  { to: '/docker', label: 'Docker',      icon: Container },
  { to: '/logs',   label: 'Logs',        icon: ScrollText },
  { to: '/alerts', label: 'Alerts',      icon: Bell },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useMetrics();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-surface-card border-r border-surface-border shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-surface-border">
          <Activity size={18} className="text-accent" />
          <span className="font-mono text-sm font-medium text-white">5erg10<span className="text-accent">.monitor</span></span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              clsx('flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )
            }>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-surface-border">
          <div className="flex items-center gap-2 px-2 py-1.5">
            {user?.avatar
              ? <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />
              : <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent">{user?.name?.[0]}</div>
            }
            <span className="text-xs text-white/60 truncate flex-1">{user?.email}</span>
            <button onClick={logout} className="text-white/30 hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={13} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2 mt-1">
            <div className={clsx('w-1.5 h-1.5 rounded-full', connected ? 'bg-accent-green' : 'bg-red-500')} />
            <span className="text-xs font-mono text-white/30">{connected ? 'live' : 'reconnecting...'}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
