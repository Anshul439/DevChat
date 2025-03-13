'use client'
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthStore {
  tokenResponse: boolean | null;
  email: string | null;
  setTokenResponse: (tokenResponse: boolean) => void;
  setEmail: (email: string) => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tokenResponse: null,
      email: null,
      setTokenResponse: (tokenResponse) => set({ tokenResponse }),
      setEmail: (email) => set({ email }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;