import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  Activity,
  FileBarChart,
  Calculator,
  Settings,
  HelpCircle,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSignature,
  History,
  Upload,
  Download,
  Users,
  Building2,
  Globe,
  Target,
  Bell,
  FileText,
  Search,
  Sparkles,
  Brain,
  BarChart3,
  PieChart,
  TrendingUp,
  Shield,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { useThemeStore } from '@/store';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { 
    name: 'Projects', 
    path: '/projects', 
    icon: FolderOpen,
    children: [
      { name: 'All Projects', path: '/projects', icon: FolderOpen },
      { name: 'Create New', path: '/projects/new', icon: FolderOpen },
    ]
  },
  { 
    name: 'Activities', 
    path: '/activities', 
    icon: Activity,
    badge: '12',
    children: [
      { name: 'All Activities', path: '/activities', icon: Activity },
      { name: 'Import Data', path: '/activities/import', icon: Upload },
      { name: 'Bulk Upload', path: '/activities/bulk', icon: FileText },
    ]
  },
  { 
    name: 'Calculations', 
    path: '/calculations', 
    icon: Calculator,
    badge: 'Live',
    children: [
      { name: 'Calculator', path: '/calculations', icon: Calculator },
      { name: 'Batch Calculate', path: '/calculations/batch', icon: BarChart3 },
      { name: 'History', path: '/calculations/history', icon: History },
    ]
  },
  { 
    name: 'Reports', 
    path: '/reports', 
    icon: FileBarChart, 
    badge: 'New',
    children: [
      { name: 'Generate Report', path: '/reports', icon: FileBarChart },
      { name: 'Templates', path: '/reports/templates', icon: FileText },
      { name: 'Scheduled', path: '/reports/scheduled', icon: Bell },
    ]
  },
];

const analyticsNavItems: NavItem[] = [
  { name: 'Overview', path: '/analytics', icon: PieChart },
  { name: 'Trends', path: '/analytics/trends', icon: TrendingUp },
  { name: 'Benchmarks', path: '/analytics/benchmarks', icon: Target },
  { name: 'AI Insights', path: '/analytics/ai', icon: Brain, badge: 'Beta' },
];

const toolsNavItems: NavItem[] = [
  { name: 'Emission Factors', path: '/emission-factors', icon: Database },
  { name: 'Digital Signatures', path: '/signatures', icon: FileSignature },
  { name: 'Audit Log', path: '/audit-log', icon: History },
  { name: 'Data Import', path: '/import', icon: Upload },
  { name: 'Export Center', path: '/export', icon: Download },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Sparkles, badge: 'New' },
];

const settingsNavItems: NavItem[] = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Organization', path: '/settings/organization', icon: Building2 },
  { name: 'Team', path: '/settings/team', icon: Users },
  { name: 'Security', path: '/settings/security', icon: Shield },
  { name: 'Help & Support', path: '/help', icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, animationsEnabled } = useThemeStore();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const NavItemComponent: React.FC<{ item: NavItem; level?: number }> = ({ item, level = 0 }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.path);

    return (
      <div>
        <NavLink 
          to={hasChildren ? '#' : item.path}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpand(item.path);
            }
          }}
        >
          <motion.div
            className={`nav-item group relative ${active ? 'active' : ''} ${level > 0 ? 'ml-4 pl-4 border-l-2 border-grass-200 dark:border-earth-600' : ''}`}
            whileHover={animationsEnabled ? { x: 4 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? '' : 'group-hover:text-grass-600'}`} />
            
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="whitespace-nowrap flex-1"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>

            {item.badge && !sidebarCollapsed && (
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium
                ${item.badge === 'New' ? 'bg-grass-100 text-grass-700 dark:bg-grass-900/30 dark:text-grass-400' :
                  item.badge === 'Beta' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  item.badge === 'Live' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-earth-100 text-earth-600 dark:bg-earth-700 dark:text-earth-400'}`}
              >
                {item.badge}
              </span>
            )}

            {hasChildren && !sidebarCollapsed && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-earth-400" />
              </motion.div>
            )}

            {/* Tooltip for collapsed state */}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-earth-800 text-white 
                            text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 
                            group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                {item.name}
                {item.badge && (
                  <span className="ml-2 badge-grass text-[10px]">{item.badge}</span>
                )}
              </div>
            )}
          </motion.div>
        </NavLink>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {item.children!.map((child) => (
                <NavLink key={child.path} to={child.path}>
                  <motion.div
                    className={`nav-item group ml-6 pl-4 border-l-2 ${
                      isActive(child.path) 
                        ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20' 
                        : 'border-earth-200 dark:border-earth-700'
                    }`}
                    whileHover={animationsEnabled ? { x: 2 } : undefined}
                  >
                    <span className={`text-sm ${isActive(child.path) ? 'text-grass-700 dark:text-grass-400 font-medium' : 'text-earth-600 dark:text-earth-400'}`}>
                      {child.name}
                    </span>
                  </motion.div>
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.aside
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-earth-800 
                border-r border-earth-200 dark:border-earth-700 z-40
                flex flex-col transition-all duration-300 shadow-sm`}
      animate={{ width: sidebarCollapsed ? 80 : 280 }}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-earth-200 dark:border-earth-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0078D4] via-[#00A36C] to-[#107C10] 
                        flex items-center justify-center shadow-lg">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <h1 className="text-lg font-bold bg-gradient-to-r from-[#0078D4] to-[#107C10] bg-clip-text text-transparent">Cloud for</h1>
                <p className="text-[10px] text-earth-500 font-medium">Sustainability</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Bar */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-b border-earth-200 dark:border-earth-700">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-earth-50 dark:bg-earth-700/50 text-earth-500">
            <Search className="w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-0 outline-none text-sm w-full text-earth-700 dark:text-earth-200 placeholder:text-earth-400"
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-earth-200 dark:bg-earth-600 text-earth-500 dark:text-earth-400">⌘K</kbd>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <p className="px-4 text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">
              Main Menu
            </p>
          )}
          {mainNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </div>

        {/* Analytics Section */}
        <div className="mt-6 space-y-1">
          {!sidebarCollapsed && (
            <p className="px-4 text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">
              Analytics
            </p>
          )}
          {analyticsNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </div>

        {/* Tools Section */}
        <div className="mt-6 space-y-1">
          {!sidebarCollapsed && (
            <p className="px-4 text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">
              Tools
            </p>
          )}
          {toolsNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-earth-200 dark:border-earth-700 py-4 px-3 space-y-1">
        {settingsNavItems.slice(0, 2).map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </div>

      {/* User Profile Section */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0078D4] to-[#107C10] flex items-center justify-center text-white font-semibold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-earth-800 dark:text-earth-100 text-sm truncate">John Doe</p>
              <p className="text-xs text-earth-500 dark:text-earth-400 truncate">Admin</p>
            </div>
            <Settings className="w-4 h-4 text-earth-400 cursor-pointer hover:text-blue-600 transition-colors" />
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-earth-700 
                 border border-earth-200 dark:border-earth-600 shadow-sm
                 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-earth-600
                 transition-colors group"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-earth-500 group-hover:text-blue-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-earth-500 group-hover:text-blue-600" />
        )}
      </button>
    </motion.aside>
  );
};
