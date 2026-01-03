import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { 
  Dashboard, 
  Projects, 
  Activities, 
  Reports, 
  Settings, 
  Login,
  EmissionFactors,
  Signatures,
  AuditLog,
  DataImport,
  DataExport,
  AIAssistant,
  Analytics,
  Calculations
} from '@/pages';
import { ToastProvider } from '@/components/ui/Toast';
import { useThemeStore } from '@/store/themeStore';
import { useAppStore } from '@/store/appStore';

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

// Help page component
const Help: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100 mb-4">
      Help & Documentation
    </h1>
    <p className="text-earth-500 dark:text-earth-400">
      Access guides, tutorials, and support resources.
    </p>
  </div>
);

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
            {/* Main Routes */}
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
            
            {/* Analytics */}
            <Route path="analytics" element={<Analytics />} />
            <Route path="analytics/*" element={<Analytics />} />
            
            {/* Tools */}
            <Route path="emission-factors" element={<EmissionFactors />} />
            <Route path="signatures" element={<Signatures />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="import" element={<DataImport />} />
            <Route path="export" element={<DataExport />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            
            {/* Settings & Help */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/*" element={<Settings />} />
            <Route path="help" element={<Help />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
};

export default App;
