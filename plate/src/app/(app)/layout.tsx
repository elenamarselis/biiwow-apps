'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppDataProvider } from '@/components/AppData';
import { Wordmark } from '@/components/Logo';

const TABS = [
  { href: '/today', label: 'Today', icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></> },
  { href: '/week', label: 'Week', icon: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></> },
  { href: '/foods', label: 'Foods', icon: <><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4" /></> },
  { href: '/settings', label: 'Settings', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <AppDataProvider>
      <div className="app">
        <header className="top">
          <Link href="/today" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="biiwow Plate, Today"><Wordmark /></Link>
        </header>
        <main id="main"><div className="page">{children}</div></main>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} aria-current={path.startsWith(t.href) ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </AppDataProvider>
  );
}
