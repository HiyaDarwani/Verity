import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Bell, BookOpen, ChartNoAxesColumn, Check, ChevronDown,
  ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu,
  PanelLeftClose, PanelLeftOpen, ShieldAlert, Users, X,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types/user';

interface NavItem { path: string; label: string; segment: string; icon: LucideIcon }

const NAV: Record<UserRole, NavItem[]> = {
  Student: [
    { path: '/student/dashboard', label: 'Overview', segment: 'dashboard', icon: LayoutDashboard },
    { path: '/student/results', label: 'My results', segment: 'results', icon: ChartNoAxesColumn },
  ],
  Examiner: [
    { path: '/examiner/dashboard', label: 'Overview', segment: 'dashboard', icon: LayoutDashboard },
    { path: '/examiner/exams', label: 'Examinations', segment: 'exams', icon: BookOpen },
    { path: '/examiner/attempts', label: 'Attempts', segment: 'attempts', icon: ClipboardList },
    { path: '/examiner/results', label: 'Results', segment: 'results', icon: ChartNoAxesColumn },
    { path: '/examiner/proctoring', label: 'Proctoring', segment: 'proctoring', icon: ShieldAlert },
    { path: '/examiner/activities', label: 'My activity', segment: 'activities', icon: Activity },
  ],
  Administrator: [
    { path: '/admin/dashboard', label: 'Overview', segment: 'dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', segment: 'users', icon: Users },
    { path: '/admin/exams', label: 'Examinations', segment: 'exams', icon: BookOpen },
    { path: '/admin/attempts', label: 'Attempts', segment: 'attempts', icon: ClipboardList },
    { path: '/admin/results', label: 'Results', segment: 'results', icon: ChartNoAxesColumn },
    { path: '/admin/proctoring', label: 'Proctoring', segment: 'proctoring', icon: ShieldAlert },
    { path: '/admin/activities', label: 'Activity log', segment: 'activities', icon: Activity },
  ],
};

const TITLES: Record<string, string> = {
  dashboard: 'Overview', results: 'Results', exams: 'Examinations',
  attempts: 'Attempts', proctoring: 'Proctoring', users: 'Users',
  activities: 'Activity log',
};

const DASHBOARD_PATH: Record<UserRole, string> = {
  Student: '/student/dashboard',
  Examiner: '/examiner/dashboard',
  Administrator: '/admin/dashboard',
};

interface Props { title?: string; children: ReactNode }

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function DashboardLayout({ title, children }: Props) {
  const { authUser, logout, proctoringEvents } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const items = authUser ? NAV[authUser.role] : [];
  const segments = location.pathname.split('/').filter(Boolean);
  const activeSegment = segments[1] ?? 'dashboard';
  const pageTitle = title ?? TITLES[activeSegment] ?? 'Workspace';
  const avatarText = authUser ? initials(authUser.name) || 'V' : 'V';
  const staffRole = authUser ? authUser.role !== 'Student' : false;
  const openEvents = proctoringEvents.filter((event) => event.reviewStatus === 'Open');
  const proctoringPath = authUser?.role === 'Administrator' ? '/admin/proctoring' : '/examiner/proctoring';

  useEffect(() => {
    if (!profileOpen && !notificationsOpen) return;
    const dismiss = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
      if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen, notificationsOpen]);

  async function handleLogout() {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  }

  if (!authUser) return null;

  return (
    <div className={`shell${collapsed ? ' side-collapsed' : ''}`}>
      {mobileOpen && <button type="button" className="side-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`side${mobileOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-topline">
          <Link className="brand-lockup sidebar-brand" to={DASHBOARD_PATH[authUser.role]} aria-label="Verity workspace home">
            <span className="brand-mark">V</span><span className="brand-name">verity</span>
          </Link>
          <button type="button" className="sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="side-section-label">WORKSPACE</div>
        <nav className="side-nav">
          {items.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`) ||
              (authUser.role === 'Student' && item.segment === 'dashboard' && location.pathname.startsWith('/student/exam/'));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                className={`nav${active ? ' on' : ''}`}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} /><span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-bottom">
          <div className="sidebar-account" title={collapsed ? `${authUser.name}, ${authUser.role}` : undefined}>
            <span className="avatar">{avatarText}</span>
            <span className="account-copy"><strong>{authUser.name}</strong><small>{authUser.role}</small></span>
          </div>
          <button type="button" className="nav logout-nav" onClick={() => void handleLogout()} title={collapsed ? 'Sign out' : undefined}>
            <LogOut size={17} /><span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <button type="button" className="menu-icon" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
            <Menu size={20} />
          </button>
          <button type="button" className="sidebar-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="top-title">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link to={DASHBOARD_PATH[authUser.role]}>Workspace</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">{pageTitle}</span>
            </nav>
            <h2>{pageTitle}</h2>
          </div>
          <div className="top-actions">
            {staffRole && (
              <div className="top-popover-wrap" ref={notificationsRef}>
                <button type="button" className="icon-button notification-trigger" aria-label={`Proctoring alerts${openEvents.length ? `, ${openEvents.length} open` : ''}`} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}>
                  <Bell size={18} />{openEvents.length > 0 && <span className="notification-count">{openEvents.length > 9 ? '9+' : openEvents.length}</span>}
                </button>
                {notificationsOpen && (
                  <div className="top-popover notification-popover" role="dialog" aria-label="Open proctoring events">
                    <div className="popover-heading"><div><span className="eyebrow">REVIEW QUEUE</span><h3>Proctoring events</h3></div><span className="count-pill">{openEvents.length}</span></div>
                    {openEvents.length === 0 ? <p className="popover-empty"><Check size={16} /> Everything is reviewed.</p> : (
                      <div className="popover-list">
                        {openEvents.slice(0, 4).map((event) => (
                          <button type="button" key={event.id} className="popover-item" onClick={() => { setNotificationsOpen(false); navigate(proctoringPath); }}>
                            <span className="event-dot" /><span><strong>{event.studentName}</strong><small>{event.type.replaceAll('_', ' ')} · {event.examTitle ?? 'Examination'}</small></span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button type="button" className="popover-link" onClick={() => { setNotificationsOpen(false); navigate(proctoringPath); }}>Review proctoring queue <ChevronRight size={15} /></button>
                  </div>
                )}
              </div>
            )}
            <div className="profile-menu-wrap" ref={profileRef}>
              <button type="button" className="profile-trigger" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} aria-expanded={profileOpen} aria-haspopup="menu">
                <span className="avatar avatar-small">{avatarText}</span><span className="profile-copy"><strong>{authUser.name}</strong><small>{authUser.role}</small></span><ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-popover" role="menu" aria-label="Account menu">
                  <div className="profile-summary"><strong>{authUser.name}</strong><span>{authUser.email}</span><small>{authUser.role} account</small></div>
                  <button type="button" role="menuitem" className="profile-signout" onClick={() => void handleLogout()}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="pad" key={location.pathname}>
          <div className="page-enter">{children}</div>
        </main>
        <footer className="app-footer"><span>Verity examination platform</span><span><Activity size={14} /> Secure session</span></footer>
      </div>
    </div>
  );
}
