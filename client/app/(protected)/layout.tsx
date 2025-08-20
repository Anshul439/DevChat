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
  const { accessToken, setAccessToken, setEmail, clearTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  const navigateToChat = () => router.push("/chat");
  const navigateToFriendRequests = () => router.push("/friend-requests");
  const navigateToProfile = () => router.push("/profile");

  useEffect(() => {
    const validateToken = async () => {
      // Prevent multiple validation attempts
      if (isValidating) return;
      
      setIsValidating(true);
      setIsLoading(true);

      try {
        // First, try to refresh token if no access token exists
        if (!accessToken) {
          console.log('No access token found, attempting refresh...');
          try {
            const refreshResponse = await axios.post(
              `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            );
            
            if (refreshResponse.data.accessToken) {
              console.log('Token refreshed successfully');
              setAccessToken(refreshResponse.data.accessToken);
              setIsLoading(false);
              setIsValidating(false);
              return;
            }
          } catch (refreshError) {
            console.log('Token refresh failed, redirecting to signin');
            clearTokens();
            router.push('/signin');
            setIsValidating(false);
            return;
          }
        }

        // If we have an access token, validate it
        if (accessToken) {
          try {
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/validate-token`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                withCredentials: true,
              }
            );

            if (response.status === 200) {
              console.log('Token validated successfully');
              setIsLoading(false);
              setIsValidating(false);
              return;
            }
          } catch (validationError: any) {
            console.log('Token validation failed, attempting refresh...');
            
            // Token validation failed, try to refresh
            if (validationError.response?.status === 401) {
              try {
                const refreshResponse = await axios.post(
                  `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/refresh`,
                  {},
                  { withCredentials: true }
                );
                
                if (refreshResponse.data.accessToken) {
                  console.log('Token refreshed after validation failure');
                  setAccessToken(refreshResponse.data.accessToken);
                  setIsLoading(false);
                  setIsValidating(false);
                  return;
                }
              } catch (refreshError) {
                console.log('Token refresh failed after validation failure');
              }
            }
            
            // If all fails, clear tokens and redirect
            clearTokens();
            router.push('/signin');
            setIsValidating(false);
            return;
          }
        }

        // If we reach here without a token, redirect to signin
        clearTokens();
        router.push('/signin');
        setIsValidating(false);

      } catch (error) {
        console.error('Unexpected error during token validation:', error);
        clearTokens();
        router.push('/signin');
        setIsValidating(false);
      }
    };

    validateToken();
  }, []); // Remove accessToken from dependencies to prevent infinite loops

  // Separate effect to handle accessToken changes
  useEffect(() => {
    if (accessToken && !isLoading && !isValidating) {
      // Token was updated, validation already happened
      return;
    }
  }, [accessToken, isLoading, isValidating]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      clearTokens();
      router.push("/signin");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails on server, clear local tokens
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