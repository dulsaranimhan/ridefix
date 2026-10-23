import { NavLink, Navigate, Route, Routes } from 'react-router';
import { PlaceholderPage } from './pages/PlaceholderPage';

const sections = [
  { path: 'users', label: 'Users', note: 'Look up, block or unblock drivers.' },
  { path: 'providers', label: 'Providers', note: 'Approve, block or unblock service providers.' },
  { path: 'bookings', label: 'Bookings', note: 'All bookings with their status history.' },
  {
    path: 'payments',
    label: 'Payments',
    note: 'PayHere payments: pending, paid, failed, refunded.',
  },
  { path: 'disputes', label: 'Disputes', note: 'Review a booking and its payment, then decide.' },
];

export function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          Ride<span>Fix</span> Admin
        </div>
        <nav>
          {sections.map((s) => (
            <NavLink key={s.path} to={`/${s.path}`} className="nav-link">
              {s.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/bookings" replace />} />
          {sections.map((s) => (
            <Route
              key={s.path}
              path={`/${s.path}`}
              element={<PlaceholderPage title={s.label} note={s.note} />}
            />
          ))}
        </Routes>
      </main>
    </div>
  );
}
