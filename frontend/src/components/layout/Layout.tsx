import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useThemeStore } from '@/store';

export const Layout: React.FC = () => {
  const { sidebarCollapsed } = useThemeStore();

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-earth-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-[280px]'
        }`}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-6 min-h-[calc(100vh-64px)]">
          <div className="max-w-7xl mx-auto page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
