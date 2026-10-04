import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Leaf, LogOut, Monitor, Moon, Search, Sun } from 'lucide-react';
import { dataSourcesApi, projectsApi } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { useThemeStore } from '@/store/themeStore';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { user, logout, projects, setProjects, currentProject, setCurrentProject } = useAppStore();
  const [query, setQuery] = useState('');
  const [syncLabel, setSyncLabel] = useState('No connections yet');
  const [showSync, setShowSync] = useState(false);
  const [showUser, setShowUser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    projectsApi.getAll().then((response) => {
      if (cancelled || !response.success) return;
      const data = response.data as { projects?: unknown[] } | unknown[] | undefined;
      const list = Array.isArray(data) ? data : data?.projects || [];
      if (Array.isArray(list)) setProjects(list as typeof projects);
    });
    return () => {
      cancelled = true;
    };
  }, [setProjects]);

  useEffect(() => {
    if (!currentProject?.id) {
      setSyncLabel('Select a project to see connection status');
      return;
    }
    let cancelled = false;
    dataSourcesApi.list(currentProject.id).then((response) => {
      if (cancelled) return;
      const rows = Array.isArray(response.data) ? response.data : [];
      if (!response.success || rows.length === 0) {
        setSyncLabel(response.success ? 'No sites connected' : response.error || 'Could not load connections');
        return;
      }
      const latest = rows[0] as { name?: string; lastSyncStatus?: string; last_sync_status?: string };
      const status = latest.lastSyncStatus || latest.last_sync_status || 'pending';
      setSyncLabel(`${latest.name || 'Connection'}: ${status}`);
    });
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return projects
      .filter((project) => project.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [projects, query]);

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const;
    const index = order.indexOf(theme);
    setTheme(order[(index + 1) % order.length]);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-earth-200 bg-white px-4 py-3 dark:border-earth-700 dark:bg-earth-800">
      <button type="button" className="flex items-center gap-2 font-semibold text-earth-800 dark:text-earth-100" onClick={() => navigate('/dashboard')}>
        <Leaf className="h-5 w-5 text-sustain-500" />
        ESG Reporting
      </button>

      <label className="relative min-w-[12rem] flex-1">
        <span className="sr-only">Search projects</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-earth-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
          className="w-full rounded-lg border border-earth-200 bg-earth-50 py-2 pl-9 pr-3 text-sm dark:border-earth-600 dark:bg-earth-900"
        />
        {matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-lg border border-earth-200 bg-white shadow-card dark:border-earth-600 dark:bg-earth-800">
            {matches.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-earth-50 dark:hover:bg-earth-700"
                  onClick={() => {
                    setCurrentProject(project);
                    setQuery('');
                    navigate('/projects');
                  }}
                >
                  {project.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>

      <label className="text-sm text-earth-600 dark:text-earth-200">
        <span className="sr-only">Current project</span>
        <select
          aria-label="Current project"
          className="max-w-[14rem] rounded-lg border border-earth-200 bg-white px-3 py-2 dark:border-earth-600 dark:bg-earth-900"
          value={currentProject?.id || ''}
          onChange={(event) => {
            const next = projects.find((project) => project.id === event.target.value) || null;
            setCurrentProject(next);
          }}
        >
          <option value="">No project selected</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <div className="relative">
        <button
          type="button"
          aria-label="Connection status"
          className="rounded-lg p-2 text-earth-600 hover:bg-earth-100 dark:text-earth-200 dark:hover:bg-earth-700"
          onClick={() => setShowSync((open) => !open)}
        >
          <Bell className="h-5 w-5" />
        </button>
        {showSync && (
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-earth-200 bg-white p-3 text-sm shadow-card dark:border-earth-600 dark:bg-earth-800">
            {syncLabel}
          </div>
        )}
      </div>

      <button type="button" aria-label={`Theme ${theme}`} className="rounded-lg p-2 text-earth-600 hover:bg-earth-100 dark:text-earth-200" onClick={cycleTheme}>
        <ThemeIcon className="h-5 w-5" />
      </button>

      <div className="relative">
        <button type="button" className="rounded-lg px-3 py-2 text-sm font-medium text-earth-700 dark:text-earth-100" onClick={() => setShowUser((open) => !open)}>
          {user?.name || 'Account'}
        </button>
        {showUser && (
          <button
            type="button"
            className="absolute right-0 z-20 mt-2 flex items-center gap-2 rounded-lg border border-earth-200 bg-white px-3 py-2 text-sm shadow-card dark:border-earth-600 dark:bg-earth-800"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </div>
    </header>
  );
};
