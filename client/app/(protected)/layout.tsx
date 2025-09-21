// components/ChatLayout.tsx (or wherever your layout is)
"use client";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus, User, LogOut, Loader2 } from "lucide-react";
import useAuthStore from "@/store/authStore";
import api from "@/lib/axiosConfig";
import { useEffect, useState } from "react";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken, clearTokens, initializeAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const navigateToChat = () => router.push("/chat");
  const navigateToFriendRequests = () => router.push("/friend-requests");
  const navigateToProfile = () => router.push("/profile");

useEffect(() => {
  const { email, accessToken } = useAuthStore.getState();
  
  if (!email) {
    // No saved user, redirect to signin
    router.push("/signin");
    return;
  }
  
  if (!accessToken) {
    // Let axios interceptor handle refresh on first request
    setIsLoading(false);
    setIsInitialized(true);
  } else {
    // Already have token
    setIsLoading(false);
    setIsInitialized(true);
  }
}, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Use the configured api instance for logout
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear tokens and redirect, even if API call fails
      clearTokens();
      router.push("/signin");
    }
  };

  // Show loading while initializing auth
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            {isLoading ? "Initializing..." : "Verifying authentication..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Persistent Sidebar */}
      <div className="hidden lg:flex w-16 bg-gray-800 flex-col items-center py-4 space-y-6">
        <button
          onClick={navigateToChat}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        <button
          onClick={navigateToFriendRequests}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Friend Requests"
        >
          <UserPlus className="h-6 w-6" />
        </button>
        <button
          onClick={navigateToProfile}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Profile"
        >
          <User className="h-6 w-6" />
        </button>
        
        {/* Spacer to push logout to bottom */}
        <div className="flex-1"></div>
        
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
          title="Logout"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-800 flex justify-around items-center py-2 z-50">
        <button
          onClick={navigateToChat}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          onClick={navigateToFriendRequests}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Friend Requests"
        >
          <UserPlus className="h-5 w-5" />
        </button>
        <button
          onClick={navigateToProfile}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Profile"
        >
          <User className="h-5 w-5" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto lg:pb-0 pb-16">{children}</div>
    </div>
  );
}