import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from '@/lib/motion';
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
  Users,
  Copy,
  KeyRound,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Toggle, Checkbox } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { useThemeStore, type ThemeMode, type AccentColor } from '@/store/themeStore';
import { useAppStore } from '@/store/appStore';
import { authApi, projectsApi, type ProjectMember } from '@/lib/api';

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

const PROJECT_ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'director', label: 'Director' },
];

const canManageTeam = (globalRole: string | undefined, projectRole: string | null) => {
  if (globalRole === 'owner' || globalRole === 'admin') return true;
  return projectRole === 'owner' || projectRole === 'director' || projectRole === 'admin';
};

const MfaSecurityPanel: React.FC = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRecommended, setMfaRecommended] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoadingProfile(true);
    const res = await authApi.getCurrentUser();
    if (res.success && res.data) {
      setMfaEnabled(!!res.data.mfaEnabled);
      setMfaRecommended(!!res.data.mfaRecommended);
    }
    setLoadingProfile(false);
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await authApi.setupMfa();
    if (!res.success || !res.data) {
      setError(res.error || 'Could not start MFA setup');
    } else {
      setSetupSecret(res.data.secret);
      setSetupUrl(res.data.otpauthUrl);
      setBackupCodes(null);
    }
    setBusy(false);
  };

  const confirmSetup = async () => {
    if (!confirmCode.trim()) return;
    setBusy(true);
    setError(null);
    const res = await authApi.confirmMfa(confirmCode.trim());
    if (!res.success || !res.data) {
      setError(res.error || 'Invalid code');
    } else {
      setMfaEnabled(true);
      setBackupCodes(res.data.backupCodes);
      setSetupSecret(null);
      setSetupUrl(null);
      setConfirmCode('');
      setMessage('Two-factor authentication is now enabled.');
    }
    setBusy(false);
  };

  const disableMfa = async () => {
    setBusy(true);
    setError(null);
    const res = await authApi.disableMfa(disablePassword, disableCode.trim());
    if (!res.success) {
      setError(res.error || 'Could not disable MFA');
    } else {
      setMfaEnabled(false);
      setDisablePassword('');
      setDisableCode('');
      setMessage('MFA has been disabled.');
      setBackupCodes(null);
    }
    setBusy(false);
  };

  const regenerateCodes = async () => {
    setBusy(true);
    setError(null);
    const res = await authApi.regenerateBackupCodes();
    if (!res.success || !res.data) {
      setError(res.error || 'Could not regenerate backup codes. Sign in again with MFA if needed.');
    } else {
      setBackupCodes(res.data.backupCodes);
      setMessage('New backup codes generated. Previous codes no longer work.');
    }
    setBusy(false);
  };

  return (
    <Card variant="default">
      <CardHeader
        title="Two-factor authentication"
        subtitle="Protect your account with an authenticator app"
        action={
          mfaEnabled ? (
            <Badge variant="success">Enabled</Badge>
          ) : mfaRecommended ? (
            <Badge variant="warning">Recommended for your role</Badge>
          ) : (
            <Badge variant="default">Off</Badge>
          )
        }
      />
      {loadingProfile && <p className="text-sm text-earth-500 mt-4">Loading security status…</p>}
      {!loadingProfile && (
        <div className="space-y-4 mt-4">
          {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
          {message && <p className="text-sm text-sustain-700">{message}</p>}

          {!mfaEnabled && !setupSecret && (
            <Button variant="primary" onClick={startSetup} disabled={busy}>
              <KeyRound className="w-4 h-4 mr-2" />
              Set up authenticator
            </Button>
          )}

          {setupSecret && (
            <div className="rounded-xl border border-grass-200 dark:border-earth-700 p-4 space-y-3">
              <p className="text-sm text-earth-600 dark:text-earth-300">
                Scan this key in Google Authenticator, Microsoft Authenticator, or similar:
              </p>
              <code className="block text-xs break-all bg-earth-50 dark:bg-earth-800 p-2 rounded-lg">{setupSecret}</code>
              {setupUrl && (
                <a href={setupUrl} className="text-sm text-grass-600 hover:underline break-all" target="_blank" rel="noreferrer">
                  Open otpauth link
                </a>
              )}
              <Input
                label="6-digit verification code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="000000"
              />
              <Button variant="primary" onClick={confirmSetup} disabled={busy || !confirmCode.trim()}>
                Confirm and enable MFA
              </Button>
            </div>
          )}

          {mfaEnabled && (
            <div className="space-y-4">
              <Button variant="outline" size="sm" onClick={regenerateCodes} disabled={busy}>
                Regenerate backup codes
              </Button>
              <div className="grid max-w-md gap-3 pt-2 border-t border-grass-100 dark:border-earth-700">
                <p className="text-sm font-medium text-earth-700 dark:text-earth-200">Disable MFA</p>
                <Input label="Current password" type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
                <Input label="Authenticator or backup code" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} />
                <Button variant="outline" onClick={disableMfa} disabled={busy}>
                  Turn off two-factor
                </Button>
              </div>
            </div>
          )}

          {backupCodes && backupCodes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Save these backup codes now</p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">Each code works once. Store them somewhere safe.</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code) => (
                  <li key={code} className="bg-white dark:bg-earth-800 rounded px-2 py-1">{code}</li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy all
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const TeamPanel: React.FC = () => {
  const { user, currentProject } = useAppStore();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [projectRole, setProjectRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manage = canManageTeam(user?.role, projectRole);

  const loadMembers = useCallback(async () => {
    if (!currentProject?.id) {
      setMembers([]);
      setProjectRole(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await projectsApi.getMembers(currentProject.id);
    if (!res.success) {
      setError(res.error || 'Could not load team members');
      setMembers([]);
    } else {
      const list = Array.isArray(res.data) ? res.data : [];
      setMembers(list);
      const self = list.find((m) => m.id === user?.id);
      setProjectRole(self?.role ?? null);
    }
    setLoading(false);
  }, [currentProject?.id, user?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const invite = async () => {
    if (!currentProject?.id || !inviteEmail.trim()) return;
    setLoading(true);
    setError(null);
    const res = await projectsApi.addMember(currentProject.id, { email: inviteEmail.trim(), role: inviteRole });
    if (!res.success) setError(res.error || 'Invite failed');
    else {
      setInviteEmail('');
      await loadMembers();
    }
    setLoading(false);
  };

  const updateRole = async (memberId: string, role: string) => {
    if (!currentProject?.id) return;
    setError(null);
    const res = await projectsApi.updateMember(currentProject.id, memberId, { role });
    if (!res.success) setError(res.error || 'Could not update role');
    else await loadMembers();
  };

  const remove = async (memberId: string) => {
    if (!currentProject?.id || !confirm('Remove this member from the project?')) return;
    const res = await projectsApi.removeMember(currentProject.id, memberId);
    if (!res.success) setError(res.error || 'Could not remove member');
    else await loadMembers();
  };

  return (
    <Card variant="default">
      <CardHeader
        title="Project team"
        subtitle={currentProject ? `Members for ${currentProject.name}` : 'Select a project in the header to manage its team'}
        action={<Users className="w-5 h-5 text-earth-400" />}
      />
      {error && <p role="alert" className="text-sm text-error-600 mt-4">{error}</p>}
      {!currentProject && (
        <p className="text-sm text-earth-500 mt-4">No project selected.</p>
      )}
      {currentProject && (
        <div className="mt-4 space-y-4">
          {manage && (
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
              <Select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} options={PROJECT_ROLES} />
              <Button variant="primary" onClick={invite} disabled={loading || !inviteEmail.trim()}>
                Invite member
              </Button>
            </div>
          )}
          {!manage && (
            <p className="text-sm text-earth-500">You can view members. Only directors and owners can invite or change roles.</p>
          )}
          {loading && <p className="text-sm text-earth-500">Loading members…</p>}
          <ul className="divide-y divide-grass-100 dark:divide-earth-700">
            {members.map((member) => (
              <li key={member.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="font-medium text-earth-800 dark:text-earth-100">{member.name}</p>
                  <p className="text-sm text-earth-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {manage && member.id !== user?.id && member.role !== 'owner' && member.role !== 'admin' ? (
                    <>
                      <Select
                        value={member.role}
                        onChange={(e) => updateRole(member.id, e.target.value)}
                        options={PROJECT_ROLES}
                        className="min-w-[8rem]"
                      />
                      <Button variant="outline" size="sm" onClick={() => remove(member.id)}>
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Badge variant="grass">{member.role}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!loading && members.length === 0 && (
            <p className="text-sm text-earth-500">No members listed for this project.</p>
          )}
        </div>
      )}
    </Card>
  );
};

const PasswordForm: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">Change password</h3>
      <div className="mt-4 grid max-w-md gap-3">
        <Input label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <Input label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
        {message && <p className="text-sm text-sustain-700">{message}</p>}
        <Button
          variant="primary"
          onClick={async () => {
            setError(null);
            setMessage(null);
            const response = await authApi.changePassword(currentPassword, newPassword);
            if (!response.success) setError(response.error || 'Could not change password');
            else setMessage('Password updated.');
          }}
        >
          Update password
        </Button>
      </div>
    </Card>
  );
};

const settingsTabIds = ['appearance', 'profile', 'notifications', 'security', 'team', 'data', 'language', 'shortcuts'] as const;

export const Settings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const { user } = useAppStore();

  const userInitials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const userFirstName = user?.name ? user.name.split(' ')[0] || '' : '';
  const userLastName = user?.name ? user.name.split(' ').slice(1).join(' ') || '' : '';

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

  useEffect(() => {
    const segment = location.pathname.replace(/^\/settings\/?/, '').split('/')[0];
    if (segment && (settingsTabIds as readonly string[]).includes(segment)) {
      setActiveTab(segment);
    } else if (location.pathname === '/settings' || location.pathname === '/settings/') {
      setActiveTab('appearance');
    }
  }, [location.pathname]);

  const goToTab = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabId === 'appearance' ? '/settings' : `/settings/${tabId}`);
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
                { id: 'team', name: 'Team', icon: Users },
                { id: 'data', name: 'Data & Export', icon: Database },
                { id: 'language', name: 'Language & Region', icon: Globe },
                { id: 'shortcuts', name: 'Keyboard Shortcuts', icon: Keyboard },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => goToTab(tab.id)}
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
                        {userInitials}
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
                      <Input label="First Name" defaultValue={userFirstName} />
                      <Input label="Last Name" defaultValue={userLastName} />
                    </div>
                    <Input label="Email" type="email" defaultValue={user?.email || ''} />
                    <Input label="Job Title" defaultValue={user?.role || 'Viewer'} />
                    <Input label="Organization" defaultValue={user?.organization || ''} />
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

            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <MfaSecurityPanel />
                <PasswordForm />
              </motion.div>
            )}

            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <TeamPanel />
              </motion.div>
            )}
            {activeTab === 'shortcuts' && (
              <Card>
                <p className="text-sm text-earth-600 dark:text-earth-300">
                  Use the large tabs at the top of the app. Left and right arrow keys move between them when a tab is focused.
                </p>
              </Card>
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
