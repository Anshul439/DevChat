"use client";
import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX } from "lucide-react";
import useAuthStore from "@/store/authStore";
import axios from "axios";

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export default function FriendRequestsPage() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { email } = useAuthStore();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_ROOT_URL}/friend-requests`,
          { withCredentials: true }
        );
        setRequests(response.data);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [email]);

  const handleRequest = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/friend-requests/${requestId}`,
        { action },
        { withCredentials: true }
      );
      setRequests(requests.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full p-6">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm p-4">
        <h1 className="text-xl font-semibold">Friend Requests</h1>
      </div>

      <div className="mt-16 lg:mt-0">
        <h1 className="text-2xl font-bold mb-6">Friend Requests</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No pending friend requests
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                    {request.sender.avatar ? (
                      <img
                        src={request.sender.avatar}
                        alt={request.sender.username}
                        className="rounded-full h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-orange-600 dark:text-gray-300 font-medium">
                        {request.sender.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{request.sender.username}</h3>
                    <p className="text-sm text-gray-500">
                      {request.sender.email}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRequest(request.id, "accept")}
                    className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                    title="Accept"
                  >
                    <UserCheck className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRequest(request.id, "reject")}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                    title="Reject"
                  >
                    <UserX className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
