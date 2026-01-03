import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Shield,
  Database,
  Globe,
  Keyboard,
  Monitor,
  Moon,
  Sun,
  Check,
  Leaf,
  Sparkles,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Toggle, Checkbox } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { useThemeStore, type ThemeMode, type AccentColor } from '@/store/themeStore';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Accent color options
const accentColors: { value: AccentColor; name: string; class: string }[] = [
  { value: 'grass', name: 'Grass Green', class: 'bg-grass-500' },
  { value: 'meadow', name: 'Meadow', class: 'bg-meadow-500' },
  { value: 'emerald', name: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', name: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', name: 'Cyan', class: 'bg-cyan-500' },
];

// Theme mode options
const themeModes: { value: ThemeMode; name: string; icon: React.ElementType }[] = [
  { value: 'light', name: 'Light', icon: Sun },
  { value: 'dark', name: 'Dark', icon: Moon },
  { value: 'system', name: 'System', icon: Monitor },
];

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [clearingData, setClearingData] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const { 
    theme, 
    accentColor, 
    compactMode, 
    animationsEnabled,
    setTheme, 
    setAccentColor,
    setCompactMode,
    setAnimationsEnabled,
  } = useThemeStore();

  const handleClearDemoData = async () => {
    if (!confirm('Are you sure you want to clear all demo data? This action cannot be undone.')) {
      return;
    }
    setClearingData(true);
    setClearSuccess(false);
    try {
      // Clear local storage
      localStorage.removeItem('esg-activities');
      localStorage.removeItem('esg-projects');
      localStorage.removeItem('esg-reports');
      localStorage.removeItem('esg-calculations');
      
      // Simulate API call to clear backend data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
    } finally {
      setClearingData(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (!confirm('This will load demo data into your account. Continue?')) {
      return;
    }
    setSeedingData(true);
    setSeedSuccess(false);
    try {
      // Simulate API call to seed demo data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to load demo data:', error);
    } finally {
      setSeedingData(false);
    }
  };

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
          Settings
        </h1>
        <p className="text-earth-500 dark:text-earth-400 mt-1">
          Customize your ESG reporting experience
        </p>
      </motion.div>

      <motion.div variants={item}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Settings Navigation */}
          <Card variant="default" className="lg:w-64 shrink-0">
            <nav className="space-y-1">
              {[
                { id: 'appearance', name: 'Appearance', icon: Palette },
                { id: 'profile', name: 'Profile', icon: User },
                { id: 'notifications', name: 'Notifications', icon: Bell },
                { id: 'security', name: 'Security', icon: Shield },
                { id: 'data', name: 'Data & Export', icon: Database },
                { id: 'language', name: 'Language & Region', icon: Globe },
                { id: 'shortcuts', name: 'Keyboard Shortcuts', icon: Keyboard },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-grass-100 dark:bg-earth-700 text-grass-700 dark:text-grass-400'
                        : 'text-earth-600 dark:text-earth-400 hover:bg-grass-50 dark:hover:bg-earth-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </Card>

          {/* Settings Content */}
          <div className="flex-1">
            {activeTab === 'appearance' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Theme Mode */}
                <Card variant="default">
                  <CardHeader
                    title="Theme"
                    subtitle="Select your preferred color mode"
                  />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {themeModes.map((mode) => {
                      const Icon = mode.icon;
                      const isSelected = theme === mode.value;
                      return (
                        <button
                          key={mode.value}
                          onClick={() => setTheme(mode.value)}
                          className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                              : 'border-grass-200 dark:border-earth-700 hover:border-grass-300 dark:hover:border-earth-600'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-4 h-4 text-grass-500" />
                            </div>
                          )}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isSelected 
                              ? 'bg-grass-500 text-white' 
                              : 'bg-grass-100 dark:bg-earth-700 text-grass-600 dark:text-grass-400'
                          }`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="font-medium text-earth-800 dark:text-earth-100">
                            {mode.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Accent Color */}
                <Card variant="default">
                  <CardHeader
                    title="Accent Color"
                    subtitle="Choose your preferred accent color"
                    action={
                      <Badge variant="grass">
                        <Leaf className="w-3 h-3" />
                        Nature Theme
                      </Badge>
                    }
                  />
                  <div className="flex flex-wrap gap-3 mt-4">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setAccentColor(color.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                          accentColor === color.value
                            ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                            : 'border-grass-200 dark:border-earth-700 hover:border-grass-300 dark:hover:border-earth-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full ${color.class}`} />
                        <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                          {color.name}
                        </span>
                        {accentColor === color.value && (
                          <Check className="w-4 h-4 text-grass-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Display Options */}
                <Card variant="default">
                  <CardHeader
                    title="Display Options"
                    subtitle="Customize the interface layout"
                  />
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between py-3 border-b border-grass-100 dark:border-earth-700">
                      <div>
                        <p className="font-medium text-earth-800 dark:text-earth-100">
                          Compact Mode
                        </p>
                        <p className="text-sm text-earth-500 dark:text-earth-400">
                          Reduce spacing for denser information display
                        </p>
                      </div>
                      <Toggle
                        checked={compactMode}
                        onChange={(checked) => setCompactMode(checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-grass-100 dark:border-earth-700">
                      <div>
                        <p className="font-medium text-earth-800 dark:text-earth-100">
                          Animations
                        </p>
                        <p className="text-sm text-earth-500 dark:text-earth-400">
                          Enable smooth transitions and animations
                        </p>
                      </div>
                      <Toggle
                        checked={animationsEnabled}
                        onChange={(checked) => setAnimationsEnabled(checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-earth-800 dark:text-earth-100">
                          Sidebar Collapsed by Default
                        </p>
                        <p className="text-sm text-earth-500 dark:text-earth-400">
                          Start with a minimized sidebar
                        </p>
                      </div>
                      <Toggle
                        checked={false}
                        onChange={() => {}}
                      />
                    </div>
                  </div>
                </Card>

                {/* Theme Preview */}
                <Card variant="grass">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-grass-700 dark:text-grass-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-earth-800 dark:text-earth-100">
                        Light Green Grass Theme
                      </h3>
                      <p className="text-sm text-earth-600 dark:text-earth-400">
                        A nature-inspired theme designed for comfortable extended use
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card variant="default">
                  <CardHeader
                    title="Profile Information"
                    subtitle="Update your account details"
                  />
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-grass-500 flex items-center justify-center text-white text-2xl font-bold">
                        JD
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          Change Avatar
                        </Button>
                        <p className="text-xs text-earth-500 mt-1">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="First Name" defaultValue="John" />
                      <Input label="Last Name" defaultValue="Doe" />
                    </div>
                    <Input label="Email" type="email" defaultValue="john.doe@company.com" />
                    <Input label="Job Title" defaultValue="Sustainability Manager" />
                    <Input label="Organization" defaultValue="Acme Corporation" />
                  </div>
                  <div className="mt-6">
                    <Button variant="primary">Save Changes</Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card variant="default">
                  <CardHeader
                    title="Notification Preferences"
                    subtitle="Choose how you want to be notified"
                  />
                  <div className="space-y-4 mt-4">
                    {[
                      { label: 'Report Generation Complete', description: 'When a report finishes generating', email: true, push: true },
                      { label: 'Activity Approval Required', description: 'When activities need your review', email: true, push: true },
                      { label: 'Project Updates', description: 'Changes to projects you are a member of', email: true, push: false },
                      { label: 'Weekly Summary', description: 'Weekly digest of emissions and activities', email: true, push: false },
                      { label: 'System Announcements', description: 'Important updates and new features', email: true, push: false },
                    ].map((pref, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-grass-100 dark:border-earth-700 last:border-0">
                        <div>
                          <p className="font-medium text-earth-800 dark:text-earth-100">
                            {pref.label}
                          </p>
                          <p className="text-sm text-earth-500 dark:text-earth-400">
                            {pref.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Checkbox label="Email" defaultChecked={pref.email} />
                          <Checkbox label="Push" defaultChecked={pref.push} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'language' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card variant="default">
                  <CardHeader
                    title="Language & Region"
                    subtitle="Set your preferred language and regional settings"
                  />
                  <div className="space-y-4 mt-4">
                    <Select
                      label="Language"
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Español' },
                        { value: 'fr', label: 'Français' },
                        { value: 'de', label: 'Deutsch' },
                        { value: 'ja', label: '日本語' },
                      ]}
                    />
                    <Select
                      label="Timezone"
                      options={[
                        { value: 'UTC', label: 'UTC' },
                        { value: 'America/New_York', label: 'Eastern Time (ET)' },
                        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                        { value: 'Europe/London', label: 'London (GMT)' },
                        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                      ]}
                    />
                    <Select
                      label="Date Format"
                      options={[
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                      ]}
                    />
                    <Select
                      label="Number Format"
                      options={[
                        { value: '1,234.56', label: '1,234.56' },
                        { value: '1.234,56', label: '1.234,56' },
                        { value: '1 234.56', label: '1 234.56' },
                      ]}
                    />
                  </div>
                  <div className="mt-6">
                    <Button variant="primary">Save Changes</Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Placeholder for other tabs */}
            {['security', 'shortcuts'].includes(activeTab) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card variant="grass">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-grass-200 dark:bg-earth-600 flex items-center justify-center mb-4">
                      <SettingsIcon className="w-8 h-8 text-grass-600 dark:text-grass-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
                    </h3>
                    <p className="text-sm text-earth-500 dark:text-earth-400 mt-1">
                      This section is coming soon
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Data & Export Tab */}
            {activeTab === 'data' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Data Management */}
                <Card variant="default">
                  <CardHeader
                    title="Data Management"
                    subtitle="Manage your ESG data and reporting history"
                  />
                  <div className="space-y-4 mt-4">
                    {/* Clear Demo Data */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-red-800 dark:text-red-200">
                            Clear All Demo Data
                          </h4>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                            Remove all sample data to start fresh with your own ESG reporting. This will delete all demo projects, activities, calculations, and reports.
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearDemoData}
                              disabled={clearingData}
                              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                            >
                              {clearingData ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Clearing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Clear Demo Data
                                </>
                              )}
                            </Button>
                            {clearSuccess && (
                              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Data cleared successfully!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Load Demo Data */}
                    <div className="p-4 bg-grass-50 dark:bg-grass-900/20 rounded-xl border border-grass-200 dark:border-grass-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-grass-100 dark:bg-grass-900/40 flex items-center justify-center shrink-0">
                          <Upload className="w-5 h-5 text-grass-600 dark:text-grass-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-earth-800 dark:text-earth-100">
                            Load Demo Data
                          </h4>
                          <p className="text-sm text-earth-600 dark:text-earth-400 mt-1">
                            Populate your account with sample ESG data to explore all features. Great for learning and testing.
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLoadDemoData}
                              disabled={seedingData}
                            >
                              {seedingData ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Load Demo Data
                                </>
                              )}
                            </Button>
                            {seedSuccess && (
                              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Demo data loaded!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Export Options */}
                <Card variant="default">
                  <CardHeader
                    title="Export Your Data"
                    subtitle="Download your ESG data in various formats"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[
                      { format: 'JSON', desc: 'Full data export for backup', icon: '{}' },
                      { format: 'CSV', desc: 'Spreadsheet compatible format', icon: '📊' },
                      { format: 'PDF', desc: 'Formatted reports for sharing', icon: '📄' },
                      { format: 'Excel', desc: 'Microsoft Excel workbook', icon: '📗' },
                    ].map((opt) => (
                      <button
                        key={opt.format}
                        className="flex items-center gap-3 p-4 rounded-xl border border-grass-200 dark:border-earth-700 hover:border-grass-400 dark:hover:border-earth-500 hover:bg-grass-50 dark:hover:bg-earth-800 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-grass-100 dark:bg-earth-700 flex items-center justify-center text-lg">
                          {opt.icon}
                        </div>
                        <div>
                          <p className="font-medium text-earth-800 dark:text-earth-100">
                            Export as {opt.format}
                          </p>
                          <p className="text-sm text-earth-500 dark:text-earth-400">
                            {opt.desc}
                          </p>
                        </div>
                        <Download className="w-5 h-5 text-grass-500 ml-auto" />
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Storage Usage */}
                <Card variant="default">
                  <CardHeader
                    title="Storage Usage"
                    subtitle="Your data storage allocation"
                  />
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-earth-600 dark:text-earth-400">
                        Used: 2.4 GB of 10 GB
                      </span>
                      <span className="text-sm font-medium text-grass-600 dark:text-grass-400">
                        24%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-grass-100 dark:bg-earth-700 rounded-full overflow-hidden">
                      <div className="h-full bg-grass-500 rounded-full" style={{ width: '24%' }} />
                    </div>
                    <div className="flex items-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-grass-500" />
                        <span className="text-earth-600 dark:text-earth-400">Reports: 1.2 GB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-meadow-500" />
                        <span className="text-earth-600 dark:text-earth-400">Files: 0.8 GB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-teal-500" />
                        <span className="text-earth-600 dark:text-earth-400">Activities: 0.4 GB</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Warning Notice */}
                <Card variant="default" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">
                        Data Retention Policy
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Your data is retained for 7 years to comply with ESG reporting regulations. Contact support if you need data permanently deleted.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Settings;
