"use client";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus, User, LogOut } from "lucide-react";
import useAuthStore from "@/store/authStore";
import axios from "axios";
import AuthGuard from "@/components/authGuard";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { setToken, setEmail } = useAuthStore();

  const navigateToChat = () => router.push("/chat");
  const navigateToFriendRequests = () => router.push("/friend-requests");
  const navigateToProfile = () => router.push("/profile");

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      setToken("");
      setEmail("");
      router.push("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
