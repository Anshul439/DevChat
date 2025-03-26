"use client";
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Users, Settings, User, Search } from "lucide-react";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { ApiMessage } from "@/types/ApiResponse";
import Image from "next/image";

interface User {
  id: number;
  username: string;
  email: string;
  hasNewMessages?: boolean;
  avatar?: string;
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  sender: string;
  receiver: string;
  createdAt?: string;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const formatMessageTime = (dateString?: string) => {
  if (!dateString) return '';
  return format(new Date(dateString), 'h:mm a');
};

let socket: Socket | null = null;

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { email } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Set up message listener
  useEffect(() => {
    socket?.off("receive-message");

    socket?.on("receive-message", (data) => {
      console.log("Received message:", data);
      const isUser = data.sender === email;

      if (selectedUser) {
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
        } else {
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.email === data.sender
                ? { ...user, hasNewMessages: true }
                : user
            )
          );
        }
      } else {
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

        // const filteredUsers = res.data
        //   .filter((user) => user.email !== email)
        //   .map((user) => ({ ...user, hasNewMessages: false }));

        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [email]);

  // Fetch messages when user is selected
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!loadingMessages) {
      scrollToBottom(true); // Instant scroll when messages are loaded
    }
  }, [messages, loadingMessages]);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: instant ? "auto" : "smooth",
    });
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === user.id ? { ...u, hasNewMessages: false } : u
      )
    );
    setMessages([]);
    socket?.emit("join-room", {
      sender: email,
      receiver: user.email,
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !email) return;

    const tempId = Date.now();
    const messageData = {
      text: newMessage.trim(),
      sender: email,
      receiver: selectedUser.email,
    };

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
      const response = await axios.post(`${rootUrl}/message`, messageData, {
        withCredentials: true,
      });

      if (response.data.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, id: response.data.id } : msg
          )
        );
      }

      socket?.emit("message", {
        ...messageData,
        id: response.data.id,
        createdAt: response.data.createdAt,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Left Navigation Sidebar */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-6">
        <div className="p-2 rounded-lg bg-orange-500 text-white">
          <MessageCircle className="h-6 w-6" />
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
          <Users className="h-6 w-6" />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
          <User className="h-6 w-6" />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
          <Settings className="h-6 w-6" />
        </button>
      </div>

      {/* Contacts List */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer ${
                  selectedUser?.id === user.id 
                    ? "bg-orange-100 dark:bg-gray-700" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="relative mr-3">
                  <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center">
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
                  {user.hasNewMessages && (
                    <div className="absolute top-0 right-0 h-3 w-3 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{user.username}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.lastMessage || `Start chatting with ${user.username}`}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No contacts found
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center">
              <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                {selectedUser.avatar ? (
                  <Image
                    src={selectedUser.avatar}
                    alt={selectedUser.username}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-orange-600 dark:text-gray-300 font-medium">
                    {getInitials(selectedUser.username)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-medium">{selectedUser.username}</h2>
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={messagesEndRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading messages...
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                        message.isUser
                          ? "bg-orange-500 text-white rounded-tr-none"
                          : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none"
                      }`}
                    >
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message input */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 mr-2 py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-full text-sm focus:outline-none"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-6 max-w-md">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-orange-500 dark:text-gray-400" />
              </div>
              <h2 className="text-xl font-medium mb-2">Your Messages</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Select a contact to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
