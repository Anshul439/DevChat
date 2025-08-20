'use client'
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthStore {
  accessToken: string | null;
  email: string | null;
  setAccessToken: (token: string) => void;
  setEmail: (email: string) => void;
  clearTokens: () => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      email: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setEmail: (email) => set({ email }),
      clearTokens: () => set({ accessToken: null, email: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;