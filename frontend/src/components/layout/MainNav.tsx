import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Calculator,
  FileBarChart,
  PieChart,
  Plug,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface SubTab {
  name: string;
  path: string;
}

interface MainTab {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  match: string[];
  children: SubTab[];
}

export const mainTabs: MainTab[] = [
  { id: 'home', name: 'Home', path: '/dashboard', icon: LayoutDashboard, match: ['/dashboard'], children: [] },
  {
    id: 'measure',
    name: 'Measure',
    path: '/projects',
    icon: FolderOpen,
    match: ['/projects', '/activities', '/emission-factors'],
    children: [
      { name: 'Projects', path: '/projects' },
      { name: 'Activities', path: '/activities' },
      { name: 'Factors', path: '/emission-factors' },
    ],
  },
  {
    id: 'calculate',
    name: 'Calculate',
    path: '/calculations',
    icon: Calculator,
    match: ['/calculations'],
    children: [
      { name: 'Calculator', path: '/calculations' },
      { name: 'History', path: '/calculations/history' },
    ],
  },
  {
    id: 'report',
    name: 'Report',
    path: '/reports',
    icon: FileBarChart,
    match: ['/reports', '/goals', '/signatures'],
    children: [
      { name: 'Reports', path: '/reports' },
      { name: 'Goals', path: '/goals' },
      { name: 'Signatures', path: '/signatures' },
    ],
  },
  {
    id: 'insights',
    name: 'Insights',
    path: '/analytics',
    icon: PieChart,
    match: ['/analytics'],
    children: [
      { name: 'Overview', path: '/analytics' },
      { name: 'Trends', path: '/analytics/trends' },
      { name: 'Benchmarks', path: '/analytics/benchmarks' },
    ],
  },
  {
    id: 'connect',
    name: 'Connect',
    path: '/connect',
    icon: Plug,
    match: ['/connect', '/import', '/export'],
    children: [
      { name: 'Sites', path: '/connect' },
      { name: 'Import', path: '/import' },
      { name: 'Export', path: '/export' },
    ],
  },
  {
    id: 'account',
    name: 'Account',
    path: '/settings',
    icon: UserRound,
    match: ['/settings', '/audit-log', '/help'],
    children: [
      { name: 'Profile', path: '/settings' },
      { name: 'Audit', path: '/audit-log' },
      { name: 'Help', path: '/help' },
    ],
  },
];

function tabIsActive(tab: MainTab, pathname: string) {
  return tab.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const MainNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = useAppStore((state) => state.user?.role?.toLowerCase());
  const accountChildren: SubTab[] = [
    { name: 'Profile', path: '/settings' },
    { name: 'Audit', path: '/audit-log' },
    { name: 'Help', path: '/help' },
  ];
  if (userRole === 'owner' || userRole === 'admin') {
    accountChildren.splice(1, 0, { name: 'Security', path: '/security' });
  }
  const tabs = mainTabs.map((tab) =>
    tab.id === 'account' ? { ...tab, match: [...tab.match, '/security'], children: accountChildren } : tab
  );
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tabIsActive(tab, location.pathname)));
  const active = tabs[activeIndex];

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = (activeIndex + direction + tabs.length) % tabs.length;
    navigate(tabs[next].path);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons[next]?.focus();
  };

  const purpose = useMemo(() => routePurpose(location.pathname), [location.pathname]);

  return (
    <div className="border-b border-earth-200 bg-white dark:border-earth-700 dark:bg-earth-800">
      <div
        role="tablist"
        aria-label="Main menu"
        className="flex gap-1 overflow-x-auto px-3 py-2"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const selected = index === activeIndex;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`main-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`main-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => navigate(tab.path)}
              className={`flex min-w-[7.5rem] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                selected
                  ? 'bg-azure-500 text-white'
                  : 'text-earth-600 hover:bg-earth-100 dark:text-earth-200 dark:hover:bg-earth-700'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {tab.name}
            </button>
          );
        })}
      </div>
      {active.children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-3" aria-label={`${active.name} sections`}>
          {active.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              end={child.path === '/analytics' || child.path === '/calculations' || child.path === '/settings'}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-azure-50 text-azure-700 dark:bg-earth-700 dark:text-white'
                    : 'text-earth-500 hover:bg-earth-50 dark:text-earth-300 dark:hover:bg-earth-700'
                }`
              }
            >
              {child.name}
            </NavLink>
          ))}
        </div>
      )}
      <p className="px-4 pb-3 text-sm text-earth-500 dark:text-earth-300">{purpose}</p>
    </div>
  );
};

const ROUTE_PURPOSES: ReadonlyArray<readonly [string, string]> = [
  ['/projects', 'Open a reporting project, or create one, before you enter activity data.'],
  ['/activities', 'Record the fuel, energy, and value-chain activities that feed the calculation.'],
  ['/emission-factors', 'Look up the factors used to turn activity data into emissions.'],
  ['/calculations/history', 'Review carbon footprint results already saved for this project.'],
  ['/calculations', 'Run a calculation for the current project and inspect the method.'],
  ['/reports', 'Generate a compliance report and download or delete it.'],
  ['/goals', 'Track emission targets and how close the project is to them.'],
  ['/signatures', 'Sign a completed report or check that an existing signature is valid.'],
  ['/analytics/trends', 'See how emissions move across reporting periods.'],
  ['/analytics/benchmarks', 'Compare this project with the benchmark values already in the app.'],
  ['/analytics', 'Read the emissions overview for the current project.'],
  ['/connect', 'Connect a website, file server, or spreadsheet, then test it before you save.'],
  ['/import', 'Upload a workbook, check the rows, and create activities from it.'],
  ['/export', 'Download activities or a generated report for the current project.'],
  ['/security', 'Review platform security alerts and resolve incidents.'],
  ['/audit-log', 'See who changed this project and when.'],
  ['/help', 'A short guide to the seven main tabs.'],
  ['/settings', 'Update your profile and password.'],
  ['/ai-assistant', 'Demo replies only. This assistant is not connected to a model.'],
];

export function routePurpose(pathname: string): string {
  const match = ROUTE_PURPOSES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : 'Emissions, reports, and connections for the project selected in the header.';
}
