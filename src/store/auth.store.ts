import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/types';

interface AuthState {
  user: UserInfo | null;
  token: string | null;

  setAuth: (user: UserInfo, token: string | null) => void;
  setUser: (user: UserInfo) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;

  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setAuth: (user, token) => set({ user, token }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearAuth: () => set({ user: null, token: null }),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
