import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MainNav } from './MainNav';
import { useAppStore } from '@/store/appStore';

const PROJECT_FREE = ['/dashboard', '/projects', '/settings', '/help', '/audit-log'];

export const Layout: React.FC = () => {
  const location = useLocation();
  const currentProject = useAppStore((state) => state.currentProject);
  const needsProject = !PROJECT_FREE.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-earth-900">
      <Header />
      <MainNav />
      <main id="main-panel" className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl p-4 md:p-6">
        {!currentProject && needsProject && (
          <div className="mb-4 rounded-xl border border-azure-200 bg-azure-50 px-4 py-3 text-sm text-azure-800 dark:border-earth-600 dark:bg-earth-800 dark:text-earth-100">
            Choose a project in the header, or{' '}
            <Link className="font-semibold underline" to="/projects">
              create one
            </Link>
            , before entering data.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};
