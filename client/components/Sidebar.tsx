"use client"
import Link from "next/link";
import { MessageCircle, Users, User, Settings, LogOut } from "lucide-react";
import useAuthStore from "@/store/authStore";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function Sidebar() {
  const router = useRouter();
  const { email, setToken, setEmail } = useAuthStore();
  const [friendRequests, setFriendRequests] = useState(0);
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const res = await axios.get(`${rootUrl}/friend`, {
          withCredentials: true,
        });
        setFriendRequests(res.data.length);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }
    };

    fetchFriendRequests();

    // Initialize Socket.IO connection
    const newSocket = io("http://localhost:8000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    setSocket(newSocket);

    // Join user room
    if (email) {
      newSocket.emit("join-user-room", email);
    }

    // Listen for friend request notifications
    newSocket.on("receive-friend-request", () => {
      setFriendRequests(prev => prev + 1);
    });

    // Listen for when a friend request is accepted
    newSocket.on("friend-request-accepted", () => {
      fetchFriendRequests(); // Refetch the count instead of decrementing
    });

    // Listen for when a friend request is rejected
    newSocket.on("friend-request-rejected", () => {
      fetchFriendRequests(); // Refetch the count instead of decrementing
    });

    return () => {
      newSocket.disconnect();
    };
  }, [rootUrl, email]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${rootUrl}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );

      setToken("");
      setEmail("");
      router.push("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="hidden lg:flex w-16 bg-gray-800 flex-col items-center py-4 space-y-6">
      <Link
        href="/chat"
        className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
      >
        <MessageCircle className="h-6 w-6" />
      </Link>
      
      <Link
        href="/request"
        className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 relative"
      >
        <Users className="h-6 w-6" />
        {friendRequests > 0 && (
          <span className="absolute top-0 right-0 bg-orange-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
            {friendRequests}
          </span>
        )}
      </Link>

      <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
        <User className="h-6 w-6" />
      </button>
      
      <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
        <Settings className="h-6 w-6" />
      </button>
      
      <button 
        onClick={handleLogout}
        className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 mt-auto"
      >
        <LogOut className="h-6 w-6" />
      </button>
    </div>
  );
}