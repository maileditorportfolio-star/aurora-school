'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { api, setToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

/** Where each role lands after signing in. */
export const roleHome = (role: User['role'] | undefined): string => {
  if (role === 'TEACHER') return '/teacher';
  if (role === 'STUDENT' || role === 'PARENT') return '/portal';
  return '/admin';
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      // Stay in "checking" state until the persisted session is revalidated.
      isLoading: true,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await api.auth.login({ email, password });
          setToken(token);
          set({ user, token, isLoading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to sign in';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      logout: () => {
        setToken(null);
        set({ user: null, token: null, error: null });
      },

      hydrate: async () => {
        set({ isLoading: true });
        try {
          const { user } = await api.auth.me();
          set({ user, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
        }
      },

      setUser: (user) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'aurora-school-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }) as AuthState,
      onRehydrateStorage: () => (state) => {
        // Keep the API token in sync with the persisted session.
        if (state?.token) setToken(state.token);
      },
    },
  ),
);
