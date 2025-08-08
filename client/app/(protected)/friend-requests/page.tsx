"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { UserPlus, UserCheck, UserX, Users, Search, X } from "lucide-react";
import useAuthStore from "@/store/authStore";
import axios from "axios";
import { io, Socket } from "socket.io-client";

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

interface FriendRequest {
  id: number;
  user1: User;
  user2: User;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

interface FriendRequestNotification {
  requestId: number;
  sender: User;
  receiver: User;
  status: string;
  createdAt: string;
}

export default function FriendRequestsPage() {
  const [activeTab, setActiveTab] = useState<"suggestions" | "received" | "sent">("suggestions");
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { email } = useAuthStore();
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;
  const socketRef = useRef<Socket | null>(null);

  // Socket event handlers
  const handleFriendRequestReceived = useCallback((data: FriendRequestNotification) => {
    // Add to received requests
    setReceivedRequests(prev => [{
      id: data.requestId,
      user1: data.sender,
      user2: data.receiver,
      status: "PENDING" as const,
      createdAt: data.createdAt
    }, ...prev]);

    // Remove from suggestions if present
    setSuggestions(prev => prev.filter(user => user.id !== data.sender.id));

    // Show notification (optional)
    console.log(`New friend request from ${data.sender.username}`);
  }, []);

  const handleFriendRequestAccepted = useCallback((data: any) => {
    // Remove from sent requests
    setSentRequests(prev => prev.filter(req => req.id !== data.requestId));
    
    // Show success notification (optional)
    console.log(`${data.acceptedBy.username} accepted your friend request`);
  }, []);

 // Update the handleFriendRequestRejected callback
const handleFriendRequestRejected = useCallback((data: any) => {
  // Remove from sent requests
  setSentRequests(prev => prev.filter(req => req.id !== data.requestId));
  
  // Add the rejected user back to suggestions if they meet criteria
  setSuggestions(prev => {
    // Check if user already exists in suggestions to avoid duplicates
    const userExists = prev.some(user => user.id === data.rejectedBy.id);
    return userExists ? prev : [...prev, data.rejectedBy];
  });
  
  console.log(`Your friend request was declined by ${data.rejectedBy.username}`);
}, []);

  const handleFriendRequestCancelled = useCallback((data: any) => {
    // Remove from received requests
    setReceivedRequests(prev => prev.filter(req => req.id !== data.requestId));
    
    // Add back to suggestions
    setSuggestions(prev => [...prev, data.cancelledBy]);
  }, []);

  // Setup socket connection
  const setupSocket = useCallback(() => {
    if (!socketRef.current && email) {
      socketRef.current = io("http://localhost:8000", {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket server for friend requests");
        
        // Join user-specific room
        socketRef.current?.emit("user-online", email);
      });

      // Set up friend request event listeners
      socketRef.current.on("friend-request-received", handleFriendRequestReceived);
      socketRef.current.on("friend-request-was-accepted", handleFriendRequestAccepted);
      socketRef.current.on("friend-request-was-rejected", handleFriendRequestRejected);
      socketRef.current.on("friend-request-was-cancelled", handleFriendRequestCancelled);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("friend-request-received", handleFriendRequestReceived);
        socketRef.current.off("friend-request-was-accepted", handleFriendRequestAccepted);
        socketRef.current.off("friend-request-was-rejected", handleFriendRequestRejected);
        socketRef.current.off("friend-request-was-cancelled", handleFriendRequestCancelled);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    email,
    handleFriendRequestReceived,
    handleFriendRequestAccepted,
    handleFriendRequestRejected,
    handleFriendRequestCancelled
  ]);

  useEffect(() => {
    const cleanup = setupSocket();
    return cleanup;
  }, [setupSocket]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [suggestionsRes, receivedRes, sentRes] = await Promise.all([
        axios.get(`${rootUrl}/friend/suggestions`, { withCredentials: true }),
        axios.get(`${rootUrl}/friend/requests`, { withCredentials: true }),
        axios.get(`${rootUrl}/friend/sent`, { withCredentials: true })
      ]);
      
      setSuggestions(suggestionsRes.data);
      setReceivedRequests(receivedRes.data);
      setSentRequests(sentRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: number) => {
    try {
      const response = await axios.post(
        `${rootUrl}/friend/request`,
        { receiverId },
        { withCredentials: true }
      );
      
      // Find the user to move to sent requests
      const userToMove = suggestions.find(user => user.id === receiverId);
      
      if (userToMove) {
        // Move user from suggestions to sent requests optimistically
        setSuggestions(prev => prev.filter(user => user.id !== receiverId));
        setSentRequests(prev => [{
          id: response.data.id,
          user1: response.data.user1,
          user2: response.data.user2,
          status: "PENDING" as const,
          createdAt: response.data.createdAt
        }, ...prev]);

        // Emit socket event for real-time update
        if (socketRef.current) {
          socketRef.current.emit("friend-request-sent", {
            requestId: response.data.id,
            sender: response.data.user1,
            receiver: response.data.user2,
            receiverEmail: userToMove.email,
            status: "PENDING",
            createdAt: response.data.createdAt
          });
        }
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      // Revert optimistic update on error
      fetchAllData();
    }
  };

const handleRequest = async (requestId: number, action: "accept" | "reject") => {
  try {
    // Get the request before modifying state
    const requestToHandle = receivedRequests.find(req => req.id === requestId);
    if (!requestToHandle) return;

    // Optimistically update UI immediately
    setReceivedRequests(prev => prev.filter(req => req.id !== requestId));

    // Make API call
    const response = await axios.patch(
      `${rootUrl}/friend/request/${requestId}`,
      { action },
      { withCredentials: true }
    );

    // Emit socket event based on action
    if (socketRef.current) {
      if (action === "accept") {
        socketRef.current.emit("friend-request-accepted", {
          requestId,
          senderEmail: requestToHandle.user1.email,
          acceptedBy: requestToHandle.user2
        });
      } else {
        socketRef.current.emit("friend-request-rejected", {
          requestId,
          senderEmail: requestToHandle.user1.email,
          rejectedBy: requestToHandle.user2
        });
      }
    }

    // For accept, we might want to add to friends list (if you have one)
    // Or you can let the socket event from the backend handle this
  } catch (error) {
    console.error(`Error ${action}ing friend request:`, error);
    // Revert optimistic update on error
    fetchAllData();
  }
};

const cancelRequest = async (requestId: number) => {
  try {
    const requestToCancel = sentRequests.find(req => req.id === requestId);
    
    if (!requestToCancel) return;

    await axios.delete(
      `${rootUrl}/friend/request/${requestId}`,
      { withCredentials: true }
    );
    
    // Remove from sent requests optimistically
    setSentRequests(prev => prev.filter(req => req.id !== requestId));
    
    // Emit socket event for real-time update
    if (socketRef.current) {
      socketRef.current.emit("friend-request-cancelled", {
        requestId,
        receiverEmail: requestToCancel.user2.email,
        cancelledBy: requestToCancel.user1
      });
    }
    
    // Refresh suggestions as user might appear there again
    const suggestionsRes = await axios.get(`${rootUrl}/friend/suggestions`, { 
      withCredentials: true 
    });
    setSuggestions(suggestionsRes.data);
  } catch (error) {
    console.error("Error canceling request:", error);
    // Revert optimistic update on error
    fetchAllData();
  }
};

  const getInitials = (name: string) => {
    return name.split(" ").map(part => part[0]).join("").toUpperCase();
  };

  const filterUsers = (users: User[]) => {
    if (!searchQuery) return users;
    return users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderUserCard = (user: User, actionButton: React.ReactNode) => (
    <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="h-12 w-12 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="rounded-full h-full w-full object-cover"
            />
          ) : (
            <span className="text-orange-600 dark:text-gray-300 font-medium text-lg">
              {getInitials(user.username)}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{user.username}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
      {actionButton}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm p-4">
        <h1 className="text-xl font-semibold text-center">Friends</h1>
      </div>

      <div className="flex-1 flex flex-col mt-16 lg:mt-0">
        {/* Desktop Header */}
        <div className="hidden lg:block p-6 bg-white dark:bg-gray-800 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Friends</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Connect with people on the platform</p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-6">
            {[
              { key: "suggestions", label: "Find Friends", count: suggestions.length },
              { key: "received", label: "Requests", count: receivedRequests.length },
              { key: "sent", label: "Sent", count: sentRequests.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs rounded-full px-2 py-1">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 bg-white dark:bg-gray-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "suggestions" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">People you may know</h2>
              {filterUsers(suggestions).length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? "No users found matching your search." : "No suggestions available at the moment."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterUsers(suggestions).map(user => 
                    renderUserCard(user, 
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "received" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Friend Requests</h2>
              {receivedRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No pending friend requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedRequests.map(request => 
                    renderUserCard(request.user1, 
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRequest(request.id, "accept")}
                          className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          title="Accept"
                        >
                          <UserCheck className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRequest(request.id, "reject")}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Reject"
                        >
                          <UserX className="h-5 w-5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "sent" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sent Requests</h2>
              {sentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No sent requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map(request => 
                    renderUserCard(request.user2, 
                      <button
                        onClick={() => cancelRequest(request.id)}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}