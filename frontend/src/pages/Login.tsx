import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { authApi, healthCheck } from '@/lib/api';
import { cn } from '@/lib/utils';

// Microsoft-style Icons
const SustainabilityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="url(#globe-gradient)"/>
    <path d="M24 8c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16S32.837 8 24 8z" fill="url(#inner-gradient)" fillOpacity="0.3"/>
    <path d="M18 24c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="#fff" fillOpacity="0.9"/>
    <path d="M24 14v-4M24 38v-4M14 24h-4M38 24h-4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 17l-2-2M33 33l-2-2M17 31l-2 2M33 15l-2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7"/>
    <defs>
      <linearGradient id="globe-gradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0078D4"/>
        <stop offset="0.5" stopColor="#00A36C"/>
        <stop offset="1" stopColor="#107C10"/>
      </linearGradient>
      <linearGradient id="inner-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff"/>
        <stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

const MicrosoftLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="10" height="10" fill="#F25022"/>
    <rect x="11" width="10" height="10" fill="#7FBA00"/>
    <rect y="11" width="10" height="10" fill="#00A4EF"/>
    <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={cn("animate-spin", className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

type AuthMode = 'login' | 'register';

type LoginFormData = {
  email: string;
  password: string;
  name: string;
  company: string;
  confirmPassword: string;
};

function fieldClass(invalid: boolean, extra = ''): string {
  return cn(
    'w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900',
    'focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent',
    'transition-all placeholder:text-gray-400',
    invalid ? 'border-red-300' : 'border-gray-300',
    extra
  );
}

function submitLabel(isLoading: boolean, mode: AuthMode): string {
  if (isLoading) return mode === 'register' ? 'Creating account...' : 'Signing in...';
  return mode === 'register' ? 'Create Account' : 'Sign In';
}

function authCopy(mfaStep: boolean, mode: AuthMode) {
  if (mfaStep) {
    return {
      title: 'Two-step verification',
      subtitle: 'Enter the code from your authenticator app or a backup code',
    };
  }
  if (mode === 'login') {
    return { title: 'Welcome back', subtitle: 'Sign in to access your sustainability dashboard' };
  }
  return { title: 'Get started', subtitle: 'Create an account to start tracking emissions' };
}

async function registerAccount(formData: LoginFormData) {
  const response = await authApi.register({
    email: formData.email,
    password: formData.password,
    name: formData.name,
    company: formData.company || undefined,
  });
  if (response.success && response.data) return { ok: true as const };
  return { ok: false as const, error: response.error || 'Registration failed. Please try again.' };
}

async function loginAccount(formData: LoginFormData) {
  const response = await authApi.login({
    email: formData.email,
    password: formData.password,
  });
  if (!(response.success && response.data)) {
    return { kind: 'error' as const, error: response.error || 'Invalid email or password' };
  }
  const data = response.data;
  if ('mfaRequired' in data && data.mfaRequired) {
    return { kind: 'mfa' as const, mfaToken: data.mfaToken };
  }
  if ('token' in data && data.token) {
    return {
      kind: 'session' as const,
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.user,
    };
  }
  return { kind: 'error' as const, error: 'Unexpected login response' };
}

function AuthStatusBanner({ status }: Readonly<{ status: 'checking' | 'online' | 'offline' }>) {
  if (status === 'online') return null;
  const checking = status === 'checking';
  return (
    <div className={cn(
      'mb-6 p-4 rounded-lg flex items-center gap-3',
      checking ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
    )}>
      {checking ? (
        <>
          <LoadingSpinner className="w-5 h-5" />
          <span>Connecting to server...</span>
        </>
      ) : (
        <>
          <AlertIcon className="w-5 h-5" />
          <div>
            <p className="font-medium">Server Offline</p>
            <p className="text-sm opacity-80">Please start the backend server to continue.</p>
          </div>
        </>
      )}
    </div>
  );
}

function AuthModeTabs({ mode, onSwitch }: Readonly<{ mode: AuthMode; onSwitch: (mode: AuthMode) => void }>) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      <button
        onClick={() => onSwitch('login')}
        className={cn(
          'flex-1 pb-3 text-sm font-medium transition-colors relative',
          mode === 'login' ? 'text-[#0078D4]' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Sign In
        {mode === 'login' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0078D4]" />}
      </button>
      <button
        onClick={() => onSwitch('register')}
        className={cn(
          'flex-1 pb-3 text-sm font-medium transition-colors relative',
          mode === 'register' ? 'text-[#0078D4]' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Create Account
        {mode === 'register' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0078D4]" />}
      </button>
    </div>
  );
}

function AuthMessages({ success, formError }: Readonly<{ success: string | null; formError?: string }>) {
  return (
    <>
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckIcon className="w-5 h-5" />
          {success}
        </div>
      )}
      {formError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertIcon className="w-5 h-5" />
          {formError}
        </div>
      )}
    </>
  );
}

function PasswordInput({
  id,
  name,
  value,
  onChange,
  invalid,
  disabled,
  shown,
  onToggle,
}: Readonly<{
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invalid: boolean;
  disabled: boolean;
  shown: boolean;
  onToggle: () => void;
}>) {
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        className={fieldClass(invalid, 'pr-12')}
        placeholder="••••••••"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {shown ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}

function MfaForm({
  code,
  error,
  isLoading,
  onChange,
  onSubmit,
  onBack,
}: Readonly<{
  code: string;
  error?: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  onBack: () => void;
}>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-1.5">Verification code</label>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900 text-center tracking-widest',
            'focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent',
            error ? 'border-red-300' : 'border-gray-300'
          )}
          placeholder="000000"
          disabled={isLoading}
          maxLength={32}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold text-white transition-all',
          'bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50',
          'flex items-center justify-center gap-2'
        )}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="w-5 h-5" />
            <span>Verifying…</span>
          </>
        ) : (
          <span>Verify &amp; sign in</span>
        )}
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-gray-500 hover:text-gray-700">
        Back to sign in
      </button>
    </form>
  );
}

function CredentialsForm({
  mode,
  formData,
  errors,
  isLoading,
  backendOffline,
  showPassword,
  showConfirmPassword,
  onChange,
  onTogglePassword,
  onToggleConfirm,
  onSubmit,
}: Readonly<{
  mode: AuthMode;
  formData: LoginFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  backendOffline: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: () => void;
  onToggleConfirm: () => void;
  onSubmit: (e: React.SubmitEvent) => void;
}>) {
  const register = mode === 'register';
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {register && (
        <div>
          <label htmlFor="login-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="login-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            className={fieldClass(Boolean(errors.name))}
            placeholder="John Doe"
            disabled={isLoading}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
      )}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Work Email <span className="text-red-500">*</span>
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          className={fieldClass(Boolean(errors.email))}
          placeholder="you@company.com"
          disabled={isLoading}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>
      {register && (
        <div>
          <label htmlFor="login-company" className="block text-sm font-medium text-gray-700 mb-1.5">Organization</label>
          <input
            id="login-company"
            type="text"
            name="company"
            value={formData.company}
            onChange={onChange}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent',
              'transition-all placeholder:text-gray-400 border-gray-300'
            )}
            placeholder="Acme Corporation"
            disabled={isLoading}
          />
        </div>
      )}
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Password <span className="text-red-500">*</span>
        </label>
        <PasswordInput
          id="login-password"
          name="password"
          value={formData.password}
          onChange={onChange}
          invalid={Boolean(errors.password)}
          disabled={isLoading}
          shown={showPassword}
          onToggle={onTogglePassword}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>
      {register && (
        <div>
          <label htmlFor="login-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            id="login-confirm"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={onChange}
            invalid={Boolean(errors.confirmPassword)}
            disabled={isLoading}
            shown={showConfirmPassword}
            onToggle={onToggleConfirm}
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
        </div>
      )}
      <button
        type="submit"
        disabled={isLoading || backendOffline}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold text-white transition-all mt-6',
          'bg-[#0078D4] hover:bg-[#106EBE]',
          'focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2'
        )}
      >
        {isLoading && <LoadingSpinner className="w-5 h-5" />}
        <span>{submitLabel(isLoading, mode)}</span>
      </button>
    </form>
  );
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setToken, setRefreshToken, setLoading, isLoading } = useAppStore();
  
  const [mode, setMode] = useState<AuthMode>('register'); // Default to register for new users
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const storeAuthSession = (
    token: string,
    refreshToken: string | undefined,
    user: { id: string; email: string; name: string; role: string; company?: string | null }
  ) => {
    setToken(token);
    setRefreshToken(refreshToken || null);
    setUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.company || undefined,
    });
    navigate('/dashboard');
  };

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const isHealthy = await healthCheck();
        setBackendStatus(isHealthy ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (mode === 'register') {
      if (!formData.name) {
        newErrors.name = 'Full name is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const finishRegistration = async () => {
    const result = await registerAccount(formData);
    if (result.ok) {
      setSuccessMessage('Account created successfully! You can now sign in.');
      setMode('login');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      return;
    }
    setErrors({ form: result.error });
  };

  const finishLogin = async () => {
    const result = await loginAccount(formData);
    if (result.kind === 'mfa') {
      setMfaToken(result.mfaToken);
      setMfaStep(true);
      setMfaCode('');
      return;
    }
    if (result.kind === 'session') {
      storeAuthSession(result.token, result.refreshToken, result.user);
      return;
    }
    setErrors({ form: result.error });
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (backendStatus === 'offline') {
      setErrors({ form: 'Backend server is offline. Please ensure the server is running.' });
      return;
    }
    setLoading(true);
    setErrors({});
    setSuccessMessage(null);
    try {
      if (mode === 'register') await finishRegistration();
      else await finishLogin();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!mfaToken || !mfaCode.trim()) {
      setErrors({ mfaCode: 'Enter your 6-digit code or a backup code' });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const response = await authApi.verifyMfa(mfaToken, mfaCode.trim());
      if (response.success && response.data?.token) {
        storeAuthSession(response.data.token, response.data.refreshToken, response.data.user);
      } else {
        setErrors({ form: response.error || 'Invalid verification code' });
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setMfaStep(false);
    setMfaToken(null);
    setMfaCode('');
    setErrors({});
    setSuccessMessage(null);
    setFormData({
      email: formData.email, // Keep email
      password: '',
      name: '',
      company: '',
      confirmPassword: '',
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0078D4] via-[#00A36C] to-[#107C10] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-40 right-20 w-80 h-80 rounded-full bg-white blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white blur-2xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <MicrosoftLogo className="w-6 h-6" />
            <span className="text-lg font-semibold">Microsoft Cloud</span>
          </div>
          
          {/* Main Content */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <SustainabilityIcon className="w-20 h-20" />
              <div>
                <h1 className="text-4xl font-bold leading-tight">
                  Cloud for<br />Sustainability
                </h1>
              </div>
            </div>
            
            <p className="text-xl text-white/90 max-w-md leading-relaxed">
              Track, report, and reduce your organization's environmental impact with comprehensive ESG reporting tools.
            </p>
            
            {/* Features */}
            <div className="space-y-4 pt-4">
              {[
                'GHG Protocol compliant emissions tracking',
                'Multi-standard reporting (EU CBAM, UK CBAM, etc.)',
                'AI-powered emission factor suggestions',
                'Digital signatures and audit trails',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-white/60 text-sm">
            © {new Date().getFullYear()} ESG Reporting Platform. All rights reserved.
          </div>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAF9F8]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <SustainabilityIcon className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cloud for Sustainability</h1>
            </div>
          </div>
          
          <AuthStatusBanner status={backendStatus} />

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {!mfaStep && <AuthModeTabs mode={mode} onSwitch={switchMode} />}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{authCopy(mfaStep, mode).title}</h2>
              <p className="text-gray-500 mt-1">{authCopy(mfaStep, mode).subtitle}</p>
            </div>
            <AuthMessages success={successMessage} formError={errors.form} />
            {mfaStep ? (
              <MfaForm
                code={mfaCode}
                error={errors.mfaCode}
                isLoading={isLoading}
                onChange={(value) => {
                  setMfaCode(value);
                  if (errors.mfaCode) setErrors((prev) => ({ ...prev, mfaCode: '' }));
                }}
                onSubmit={handleMfaSubmit}
                onBack={() => {
                  setMfaStep(false);
                  setMfaToken(null);
                  setMfaCode('');
                  setErrors({});
                }}
              />
            ) : (
              <CredentialsForm
                mode={mode}
                formData={formData}
                errors={errors}
                isLoading={isLoading}
                backendOffline={backendStatus === 'offline'}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                onChange={handleInputChange}
                onTogglePassword={() => setShowPassword(!showPassword)}
                onToggleConfirm={() => setShowConfirmPassword(!showConfirmPassword)}
                onSubmit={handleSubmit}
              />
            )}
            {mode === 'register' && (
              <p className="mt-4 text-xs text-gray-500 text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-[#0078D4] hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-[#0078D4] hover:underline">Privacy Policy</a>
              </p>
            )}
          </div>

          {/* Help Link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Need help?{' '}
            <a href="#" className="text-[#0078D4] hover:underline">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
