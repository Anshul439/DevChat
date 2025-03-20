'use client'
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthStore {
  token: string | null;
  email: string | null;
  setToken: (token: string) => void;
  setEmail: (email: string) => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      setToken: (token) => set({ token }),
      setEmail: (email) => set({ email }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;