// store/authStore.ts
'use client'
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";

interface AuthStore {
  accessToken: string | null;
  email: string | null;
  isRefreshing: boolean;
  setAccessToken: (token: string) => void;
  setEmail: (email: string) => void;
  clearTokens: () => void;
  refreshAccessToken: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      accessToken: null,
      email: null,
      isRefreshing: false,
      setAccessToken: (accessToken) => set({ accessToken }),
      setEmail: (email) => set({ email }),
      clearTokens: () => set({ accessToken: null, email: null, isRefreshing: false }),

      refreshAccessToken: async (): Promise<boolean> => {
        const { isRefreshing } = get();
        if (isRefreshing) {
          return new Promise((resolve) => {
            const checkRefresh = () => {
              const state = get();
              if (!state.isRefreshing) resolve(!!state.accessToken);
              else setTimeout(checkRefresh, 100);
            };
            checkRefresh();
          });
        }

        set({ isRefreshing: true });

        try {
          const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;
          const refreshApi = axios.create({
            baseURL: rootUrl,
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          });

          const response = await refreshApi.post('/auth/refresh');

          if (response.data.accessToken) {
            set({ accessToken: response.data.accessToken, isRefreshing: false });
            return true;
          }

          set({ accessToken: null, email: null, isRefreshing: false });
          return false;
        } catch (error) {
          console.error('Token refresh failed:', error);
          set({ accessToken: null, email: null, isRefreshing: false });
          return false;
        }
      },

      initializeAuth: async (): Promise<void> => {
        const { accessToken, refreshAccessToken } = get();
        if (!accessToken) {
          await refreshAccessToken();
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // persist only email (do NOT persist accessToken)
      partialize: (state) => ({
        email: state.email,
      }),
    }
  )
);

export default useAuthStore;