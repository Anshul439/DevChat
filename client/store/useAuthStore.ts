import {create} from "zustand";

// Create the Zustand store for authentication
const useAuthStore = create((set) => ({
  email: null, // Default state
  setEmail: (email) => set({ email }), // Action to update the email
}));

export default useAuthStore;
