"use client";
import React, { useState, useEffect } from "react";
import { MessageCircle, Users, Lock } from "lucide-react";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { ApiMessage } from "@/types/ApiResponse";

interface User {
  id: number;
  username: string;
  email: string;
  hasNewMessages?: boolean; // Add this to track new messages
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  sender: string;
  receiver: string;
}

let socket: Socket | null = null; // Global socket reference

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { email } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:8000", {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on("connect", () => {
        console.log("connected", socket?.id);
      });
    }

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, []);

  // Set up message listener that depends on the selected user
  useEffect(() => {
    // Remove previous listener to prevent duplicates
    socket?.off("receive-message");

    // Set up new listener
    socket?.on("receive-message", (data) => {
      console.log("Received message:", data);
      const isUser = data.sender === email;

      if (selectedUser) {
        // If message is relevant to current chat, add it to messages
        if (
          data.sender === selectedUser.email ||
          data.receiver === selectedUser.email
        ) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: prevMessages.length + 1,
              text: data.text,
              isUser: isUser,
              sender: data.sender,
              receiver: data.receiver,
            },
          ]);
        }
        // If message is from someone else, mark that user as having new messages
        else {
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.email === data.sender
                ? { ...user, hasNewMessages: true }
                : user
            )
          );
        }
      } else {
        // No selected user, mark sender as having new messages
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.email === data.sender
              ? { ...user, hasNewMessages: true }
              : user
          )
        );
      }
    });

    return () => {
      socket?.off("receive-message");
    };
  }, [email, selectedUser]);

  // Fetch users from the backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get<User[]>(`${rootUrl}/user`, {
          withCredentials: true,
        });

        // Exclude the logged-in user from the list
        const filteredUsers = res.data
          .filter((user) => user.email !== email)
          .map((user) => ({ ...user, hasNewMessages: false }));

        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [email]);

  useEffect(() => {
    if (selectedUser && email) {
      const fetchMessages = async () => {
        setLoadingMessages(true);
        try {
          const res = await axios.get<ApiMessage[]>(`${rootUrl}/message`, {
            params: {
              user1: email,
              user2: selectedUser.email,
            },
            withCredentials: true,
          });

          // Convert API messages to your frontend format
          const formattedMessages = res.data.map((msg) => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.sender === email,
            sender: msg.sender,
            receiver: msg.receiver,
            createdAt: msg.createdAt,
          }));

          setMessages(formattedMessages);
        } catch (error) {
          console.error("Error fetching messages:", error);
        } finally {
          setLoadingMessages(false);
        }
      };

      fetchMessages();
    }
  }, [selectedUser, email, rootUrl]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);

    // Clear the new message indicator for this user
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === user.id ? { ...u, hasNewMessages: false } : u
      )
    );

    // Clear previous messages when switching users
    setMessages([]);

    // Join the private room for these two users
    socket?.emit("join-room", {
      sender: email,
      receiver: user.email,
    });
  };

  // Function to handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !email) return;

    const tempId = Date.now(); // Temporary ID for optimistic update
    const messageData = {
      text: newMessage.trim(),
      sender: email,
      receiver: selectedUser.email,
    };

    // Optimistic UI update
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: newMessage.trim(),
        isUser: true,
        sender: email,
        receiver: selectedUser.email,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      // Send to backend
      const response = await axios.post(`${rootUrl}/message`, messageData, {
        withCredentials: true,
      });

      // Update with real ID from server
      if (response.data.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, id: response.data.id } : msg
          )
        );
      }

      // Emit via socket
      socket?.emit("message", {
        ...messageData,
        id: response.data.id, // Include server-generated ID
        createdAt: response.data.createdAt,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      // Rollback optimistic update
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="flex flex-grow">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              <span className="text-gray-700 dark:text-gray-300">Chats</span>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              <span className="text-gray-700 dark:text-gray-300">Contacts</span>
            </div>
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              <span className="text-gray-700 dark:text-gray-300">Security</span>
            </div>
          </div>
        </aside>

        {/* Chat List */}
        <div className="w-1/3 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <div className="space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`p-2 rounded-md cursor-pointer ${
                      selectedUser?.id === user.id
                        ? "bg-gray-300 dark:bg-gray-700"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center space-x-3 relative">
                      <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full">
                        {user.hasNewMessages && (
                          <div className="absolute top-0 right-0 h-3 w-3 bg-orange-500 rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-gray-700 dark:text-gray-300 flex items-center">
                          {user.username}
                          {user.hasNewMessages && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                              New
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Click to chat with {user.username}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No users found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-grow bg-white dark:bg-gray-900 p-4">
          {selectedUser ? (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-md">
                Chatting with <strong>{selectedUser.username}</strong>
              </div>

              {/* Chat Messages */}
              <div className="flex-grow overflow-y-auto mt-4 mb-4 p-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.isUser ? "justify-end" : "justify-start"
                    } mb-4`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-xs ${
                        message.isUser
                          ? "bg-orange-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="mt-auto flex space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                />
                <Button
                  type="submit"
                  onClick={handleSendMessage}
                  className="bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300"
                >
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Select a user to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
