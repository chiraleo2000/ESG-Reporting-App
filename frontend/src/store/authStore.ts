import { useAppStore } from './appStore';

// Re-export auth-related state and actions from appStore
export const useAuthStore = () => {
  const store = useAppStore();

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    setUser: store.setUser,
    setToken: store.setToken,
    logout: store.logout,
    isLoading: store.isLoading,
    error: store.error,
    setLoading: store.setLoading,
    setError: store.setError,
  };
};

// Export individual selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useToken = () => useAppStore((state) => state.token);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
