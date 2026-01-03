import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ThemeMode = Theme;
export type AccentColor = 'grass' | 'meadow' | 'forest' | 'ocean' | 'sunset' | 'emerald' | 'teal' | 'cyan';

interface ThemeState {
  theme: Theme;
  accentColor: AccentColor;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: 'grass',
      sidebarCollapsed: false,
      compactMode: false,
      animationsEnabled: true,

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      setAccentColor: (accentColor) => set({ accentColor }),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setCompactMode: (compactMode) => set({ compactMode }),

      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
    }),
    {
      name: 'esg-theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}
