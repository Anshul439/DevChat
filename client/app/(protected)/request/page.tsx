"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  Check,
  ArrowLeft,
  UserPlus,
  Users,
  Clock,
  MessageCircle,
  MoreVertical,
  LogOut,
  Search,
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import { io } from "socket.io-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "@/components/Sidebar";

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

interface Friendship {
  id: number;
  userId: number;
  friendId: number;
  status: "pending" | "accepted" | "rejected";
  user?: User;
  friend?: User;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export default function FriendRequestsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { email, setToken, setEmail } = useAuthStore();
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;

  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [nonFriends, setNonFriends] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "sent" | "find">(
    "received"
  );
  const [socketInstance, setSocketInstance] = useState<any>(null);

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

  useEffect(() => {
    const socket = io("http://localhost:8000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    if (email) {
      socket.emit("join-user-room", email);
    }

    socket.on("connect", () => {
      console.log("Connected to socket server:", socket.id);
    });

    socket.on("receive-friend-request", (data) => {
      console.log("Friend request received:", data);
      fetchFriendRequests();

      toast({
        title: "New Friend Request",
        description: `${data.senderName} sent you a friend request`,
      });
    });

    socket.on("friend-request-accepted", (data) => {
      console.log("Friend request accepted notification:", data);
      fetchSentRequests();

      toast({
        title: "Friend request accepted",
        description: `${data.newFriend.username} accepted your friend request!`,
      });
    });

    setSocketInstance(socket);

    return () => {
      socket.disconnect();
    };
  }, [email, toast]);

  const fetchFriendRequests = useCallback(async () => {
    try {
      const res = await axios.get<Friendship[]>(`${rootUrl}/friend`, {
        withCredentials: true,
      });
      setFriendRequests(res.data);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  }, [rootUrl]);

  const fetchSentRequests = useCallback(async () => {
    try {
      const res = await axios.get<Friendship[]>(`${rootUrl}/friend/sent`, {
        withCredentials: true,
      });
      setSentRequests(res.data);
    } catch (error) {
      console.error("Error fetching sent requests:", error);
    }
  }, [rootUrl]);

  const fetchNonFriends = useCallback(
    async (query = "") => {
      try {
        const res = await axios.get<User[]>(`${rootUrl}/user`, {
          params: { search: query },
          withCredentials: true,
        });
        setNonFriends(res.data);
      } catch (error) {
        console.error("Error fetching non-friends:", error);
      }
    },
    [rootUrl]
  );

  useEffect(() => {
    fetchFriendRequests();
    fetchSentRequests();
    fetchNonFriends();
  }, [fetchFriendRequests, fetchSentRequests, fetchNonFriends]);

  const sendFriendRequest = async (userId: number) => {
    try {
      const response = await axios.post(
        `${rootUrl}/friend`,
        { friendId: userId },
        {
          withCredentials: true,
        }
      );

      const targetUser = nonFriends.find((user) => user.id === userId);
      if (socketInstance && targetUser) {
        socketInstance.emit("send-friend-request", {
          senderEmail: email,
          receiverEmail: targetUser.email,
          senderName: response.data.senderUsername,
          friendRequest: response.data,
        });
      }

      fetchNonFriends(searchQuery);
      fetchSentRequests();

      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${targetUser?.username}`,
      });
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    }
  };

const respondToFriendRequest = async (
  requestId: number,
  status: "accepted" | "rejected"
) => {
  try {
    if (status === "accepted") {
      const response = await axios.post(
        `${rootUrl}/friend/${requestId}/accept-request`,
        {},
        { withCredentials: true }
      );

      const friendRequest = friendRequests.find(
        (req) => req.userId === requestId
      );

      if (friendRequest?.user && socketInstance) {
        socketInstance.emit("friend-request-accepted", {
          senderEmail: friendRequest.user.email,
          receiverEmail: email,
          newFriend: {
            id: friendRequest.userId,
            username: friendRequest.user.username,
            email: friendRequest.user.email,
            avatar: friendRequest.user.avatar,
          },
        });
      }

      toast({
        title: "Friend request accepted",
        description: `You are now friends with ${friendRequest?.user?.username}!`,
      });
    } else {
      await axios.delete(`${rootUrl}/friend/${requestId}`, {
        withCredentials: true,
      });
      
      if (socketInstance && friendRequests.find(req => req.userId === requestId)) {
        socketInstance.emit("friend-request-rejected", {
          requestId
        });
      }
      
      toast({
        title: "Friend request declined",
        variant: "destructive",
      });
    }

    fetchFriendRequests();
  } catch (error) {
    console.error("Error responding to friend request:", error);
    toast({
      title: "Error",
      description: "Failed to process friend request",
      variant: "destructive",
    });
  }
};

  const cancelFriendRequest = async (requestId: number) => {
    try {
      await axios.delete(`${rootUrl}/friend/${requestId}`, {
        withCredentials: true,
      });

      fetchSentRequests();

      toast({
        title: "Request Cancelled",
        description: "Friend request was cancelled",
      });
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* <Sidebar/> */}
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex justify-between items-center p-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">Friend Requests</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 z-[100] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              align="end"
              sideOffset={5}
            >
              <Link href="/chat">
                <DropdownMenuItem className="focus:bg-orange-100 dark:focus:bg-gray-700 cursor-pointer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span>Chats</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="focus:bg-orange-100 dark:focus:bg-gray-700 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 mt-16 lg:mt-0">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h1 className="text-xl font-semibold">Friend Requests</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 z-[100] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              align="end"
              sideOffset={5}
            >
              <Link href="/chat">
                <DropdownMenuItem className="focus:bg-orange-100 dark:focus:bg-gray-700 cursor-pointer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span>Chats</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="focus:bg-orange-100 dark:focus:bg-gray-700 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("received")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "received"
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <div className="flex items-center justify-center">
                <Users className="h-4 w-4 mr-2" />
                Received
                {friendRequests.length > 0 && (
                  <span className="ml-2 bg-orange-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                    {friendRequests.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "sent"
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 mr-2" />
                Sent
                {sentRequests.length > 0 && (
                  <span className="ml-2 bg-gray-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                    {sentRequests.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("find")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "find"
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <div className="flex items-center justify-center">
                <UserPlus className="h-4 w-4 mr-2" />
                Find Friends
              </div>
            </button>
          </div>
        </div>

        {/* Search Box (for Find Friends tab) */}
        {activeTab === "find" && (
          <div className="sticky top-0 z-0 bg-white dark:bg-gray-800 px-4 pb-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchNonFriends(e.target.value);
                }}
                placeholder="Search for users"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "received" && (
            <>
              {friendRequests.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6 max-w-md">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="h-8 w-8 text-orange-500 dark:text-gray-400" />
                    </div>
                    <h2 className="text-xl font-medium mb-2">
                      No Friend Requests
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      When someone sends you a friend request, it will appear
                      here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {friendRequests.map((request) => (
                    <div
                      key={request.userId}
                      className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                        {request.user?.avatar ? (
                          <Image
                            src={request.user.avatar}
                            alt={request.user?.username || ""}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-orange-600 dark:text-gray-300 font-medium">
                            {getInitials(request.user?.username || "")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {request.user?.username}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {request.user?.email}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            respondToFriendRequest(request.userId, "accepted")
                          }
                          className="p-2 bg-green-500 text-white rounded-full"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            respondToFriendRequest(request.userId, "rejected")
                          }
                          className="p-2 bg-red-500 text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "sent" && (
            <>
              {sentRequests.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6 max-w-md">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-orange-500 dark:text-gray-400" />
                    </div>
                    <h2 className="text-xl font-medium mb-2">
                      No Pending Requests
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Friend requests you've sent will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {sentRequests.map((request) => (
                    <div
                      key={request.friendId}
                      className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                        {request.friend?.avatar ? (
                          <Image
                            src={request.friend.avatar}
                            alt={request.friend?.username || ""}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-orange-600 dark:text-gray-300 font-medium">
                            {getInitials(request.friend?.username || "")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {request.friend?.username}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {request.friend?.email}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Pending</span>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelFriendRequest(request.id)}
                        className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "find" && (
            <>
              {nonFriends.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6 max-w-md">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                      <UserPlus className="h-8 w-8 text-orange-500 dark:text-gray-400" />
                    </div>
                    <h2 className="text-xl font-medium mb-2">
                      {searchQuery ? "No users found" : "Find Friends"}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery
                        ? "Try a different search term"
                        : "Search for users to add as friends"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {nonFriends.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.username}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-orange-600 dark:text-gray-300 font-medium">
                            {getInitials(user.username)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{user.username}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="p-2 bg-orange-500 text-white rounded-full"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}