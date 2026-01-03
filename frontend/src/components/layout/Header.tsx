import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Command,
} from 'lucide-react';
import { useThemeStore, useAppStore, useUser, useCurrentProject } from '@/store';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { logout } = useAppStore();
  const user = useUser();
  const currentProject = useCurrentProject();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const notifications = [
    { id: 1, title: 'Report Generated', message: 'EU CBAM Q4 2024 report is ready', time: '5m ago', unread: true },
    { id: 2, title: 'Activity Added', message: '15 new activities imported from Excel', time: '1h ago', unread: true },
    { id: 3, title: 'Calculation Complete', message: 'Scope 3 emissions calculated', time: '2h ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const ThemeIcon = themeOptions.find(t => t.value === theme)?.icon || Sun;

  return (
    <>
      <header className="h-16 bg-white/80 dark:bg-earth-800/80 backdrop-blur-xl 
                       border-b border-earth-200 dark:border-earth-700 
                       sticky top-0 z-30 px-6 flex items-center justify-between">
        {/* Left Side - Search & Project */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-3 px-4 py-2.5 bg-earth-50 dark:bg-earth-700 
                       rounded-xl text-earth-500 hover:bg-earth-100 dark:hover:bg-earth-600
                       transition-colors min-w-[280px] group"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search anything...</span>
              <div className="ml-auto flex items-center gap-1 text-xs text-earth-400">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </button>
          </div>

          {/* Current Project Indicator */}
          {currentProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 
                          rounded-lg text-sm">
              <div className="w-2 h-2 rounded-full bg-[#107C10] animate-pulse" />
              <span className="text-earth-600 dark:text-earth-300 font-medium">
                {currentProject.name}
              </span>
            </div>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Add Button */}
          <button
            onClick={() => navigate('/projects/new')}
            className="btn-primary hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          {/* Theme Toggle */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="btn-icon"
              title="Change theme"
            >
              <ThemeIcon className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showThemeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="dropdown right-0"
                >
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTheme(option.value);
                          setShowThemeMenu(false);
                        }}
                        className={`dropdown-item w-full ${
                          theme === option.value ? 'bg-grass-50 dark:bg-earth-600' : ''
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                        {theme === option.value && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-grass-500" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn-icon relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white 
                               text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="dropdown right-0 w-80 p-0"
                >
                  <div className="px-4 py-3 border-b border-grass-100 dark:border-earth-700">
                    <h3 className="font-semibold text-earth-800 dark:text-earth-100">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-grass-50 dark:hover:bg-earth-700 
                                  cursor-pointer border-b border-grass-50 dark:border-earth-700
                                  last:border-0 ${notification.unread ? 'bg-grass-50/50 dark:bg-earth-700/50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {notification.unread && (
                            <div className="w-2 h-2 rounded-full bg-grass-500 mt-2 flex-shrink-0" />
                          )}
                          <div className={notification.unread ? '' : 'ml-5'}>
                            <p className="text-sm font-medium text-earth-800 dark:text-earth-100">
                              {notification.title}
                            </p>
                            <p className="text-xs text-earth-500 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-earth-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-grass-100 dark:border-earth-700">
                    <button className="text-sm text-grass-600 hover:text-grass-700 font-medium w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-grass-50 
                       dark:hover:bg-earth-700 transition-colors"
            >
              <div className="avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{user?.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-earth-800 dark:text-earth-100">
                  {user?.name || 'Guest User'}
                </p>
                <p className="text-xs text-earth-500">{user?.role || 'Viewer'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-earth-400" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="dropdown right-0"
                >
                  <div className="px-4 py-3 border-b border-grass-100 dark:border-earth-700">
                    <p className="text-sm font-medium text-earth-800 dark:text-earth-100">
                      {user?.name || 'Guest User'}
                    </p>
                    <p className="text-xs text-earth-500">{user?.email || 'guest@example.com'}</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      navigate('/settings/profile');
                      setShowUserMenu(false);
                    }}
                    className="dropdown-item w-full"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="dropdown-item w-full"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <div className="border-t border-grass-100 dark:border-earth-700 my-1" />
                  
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="dropdown-item w-full text-error-600 hover:bg-error-50 
                             dark:hover:bg-error-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-earth-800 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center gap-4 px-6 py-4 border-b border-grass-100 dark:border-earth-700">
                <Search className="w-5 h-5 text-earth-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects, activities, reports..."
                  className="flex-1 bg-transparent text-lg text-earth-800 dark:text-earth-100 
                           placeholder-earth-400 focus:outline-none"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs bg-earth-100 dark:bg-earth-700 rounded text-earth-500">
                  ESC
                </kbd>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-earth-500 text-center py-8">
                  Start typing to search...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
