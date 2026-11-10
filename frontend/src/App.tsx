import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { ToastProvider } from '@/components/ui/Toast';
import { useThemeStore } from '@/store/themeStore';
import { useAppStore } from '@/store/appStore';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Projects = lazy(() => import('@/pages/Projects').then((module) => ({ default: module.Projects })));
const Activities = lazy(() => import('@/pages/Activities').then((module) => ({ default: module.Activities })));
const Reports = lazy(() => import('@/pages/Reports').then((module) => ({ default: module.Reports })));
const Settings = lazy(() => import('@/pages/Settings').then((module) => ({ default: module.Settings })));
const EmissionFactors = lazy(() => import('@/pages/EmissionFactors').then((module) => ({ default: module.EmissionFactors })));
const Signatures = lazy(() => import('@/pages/Signatures').then((module) => ({ default: module.Signatures })));
const AuditLog = lazy(() => import('@/pages/AuditLog').then((module) => ({ default: module.AuditLog })));
const DataImport = lazy(() => import('@/pages/DataImport').then((module) => ({ default: module.DataImport })));
const DataExport = lazy(() => import('@/pages/DataExport').then((module) => ({ default: module.DataExport })));
const DataSources = lazy(() => import('@/pages/DataSources').then((module) => ({ default: module.DataSources })));
const AIAssistant = lazy(() => import('@/pages/AIAssistant').then((module) => ({ default: module.AIAssistant })));
const Analytics = lazy(() => import('@/pages/Analytics').then((module) => ({ default: module.Analytics })));
const Calculations = lazy(() => import('@/pages/Calculations').then((module) => ({ default: module.Calculations })));
const ESGGoals = lazy(() => import('@/pages/ESGGoals').then((module) => ({ default: module.ESGGoals })));
const HelpGuide = lazy(() => import('@/pages/HelpGuide').then((module) => ({ default: module.HelpGuide })));
const SecurityAlerts = lazy(() => import('@/pages/SecurityAlerts').then((module) => ({ default: module.SecurityAlerts })));

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppStore((state) => state.user);
  const role = user?.role?.toLowerCase();
  if (role !== 'owner' && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const { theme } = useThemeStore();

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<div className="p-6 text-sm text-earth-500">Loading…</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          
          {/* Protected Routes with Layout */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/*" element={<Projects />} />
            <Route path="activities" element={<Activities />} />
            <Route path="activities/*" element={<Activities />} />
            <Route path="calculations" element={<Calculations />} />
            <Route path="calculations/*" element={<Calculations />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/*" element={<Reports />} />
            <Route path="goals" element={<ESGGoals />} />
            <Route path="goals/*" element={<ESGGoals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="analytics/*" element={<Analytics />} />
            <Route path="emission-factors" element={<EmissionFactors />} />
            <Route path="signatures" element={<Signatures />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="security" element={<OwnerRoute><SecurityAlerts /></OwnerRoute>} />
            <Route path="import" element={<DataImport />} />
            <Route path="export" element={<DataExport />} />
            <Route path="connect" element={<DataSources />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/*" element={<Settings />} />
            <Route path="help" element={<HelpGuide />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  );
};

export default App;
