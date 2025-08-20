"use client";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus, User, LogOut, Loader2 } from "lucide-react";
import useAuthStore from "@/store/authStore";
import axios from "axios";
import { useEffect, useState } from "react";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken, setAccessToken, clearTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  const navigateToChat = () => router.push("/chat");
  const navigateToFriendRequests = () => router.push("/friend-requests");
  const navigateToProfile = () => router.push("/profile");

  useEffect(() => {
    const checkAccess = async () => {
      if (!accessToken) {
        // No token → try refresh
        try {
          const refreshResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          if (refreshResponse.data.accessToken) {
            setAccessToken(refreshResponse.data.accessToken);
          } else {
            throw new Error("No access token in response");
          }
        } catch (error) {
          console.log("Token refresh failed, redirecting to signin");
          clearTokens();
          router.push("/signin");
          return;
        }
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear tokens and redirect, even if API call fails
      clearTokens();
      router.push("/signin");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Persistent Sidebar */}
      <div className="hidden lg:flex w-16 bg-gray-800 flex-col items-center py-4 space-y-6">
        <button
          onClick={navigateToChat}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white"
          title="Chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        <button
          onClick={navigateToFriendRequests}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white"
          title="Friend Requests"
        >
          <UserPlus className="h-6 w-6" />
        </button>
        <button
          onClick={navigateToProfile}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white"
          title="Profile"
        >
          <User className="h-6 w-6" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white"
          title="Logout"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}