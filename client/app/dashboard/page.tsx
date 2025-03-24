"use client";
import React, { useState, useEffect, useMemo } from "react";
import { MessageCircle, Users, Lock } from "lucide-react";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { io, Socket } from "socket.io-client";

interface User {
  id: number;
  username: string;
  email: string;
}

let socket: Socket | null = null; // Global socket reference

export default function DashboardPage() {
  const [message, setMessage] = useState("");
  const { email } = useAuthStore();

  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:8000");
      // socket = useMemo(() => {
      //   io("http://localhost:8000");
      // }, []);

      socket.on("connect", () => {
        console.log("connected", socket?.id);
      });

      socket.on("receive-message", (data) => {
        console.log("Received:", data);
        const isUser = data.sender === email;
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: prevMessages.length + 1, text: data.text, isUser: isUser },
        ]);
      });

      // socket.on("disconnect", () => {
      //   console.log("User disconnected", socket?.id);
      // });
    }

    return () => {
      socket?.disconnect();
      socket = null; // Reset on unmount
    };
  }, [email]);



  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<
    { id: number; text: string; isUser: boolean }[]
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // State for selected user

  // Fetch users from the backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get<User[]>("http://localhost:8000/api/users", {
          withCredentials: true,
        });

        // Exclude the logged-in user from the list
        const filteredUsers = res.data.filter((user) => user.email !== email);

        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [email]); // Re-run when email changes


  const handleUserSelect = (user) => {
    setSelectedUser(user);
    
    // Clear previous messages when switching users
    setMessages([]);
    
    // Join the private room for these two users
    socket?.emit("join-room", {
      sender: email,
      receiver: user.email
    });
  };


  // Function to handle sending a new message
  const handleSendMessage = () => {
    if (newMessage.trim() && selectedUser) {
      const message = {
        id: messages.length + 1,
        text: newMessage.trim(),
        isUser: true,
      };
      setMessages([...messages, message]);

      // Emit message to socket server
      socket?.emit("message", { text: newMessage, sender: email, receiver: selectedUser.email  });

      setNewMessage("");
    }
  };

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   socket?.emit("message", { text: newMessage, sender: email }); // Send structured data
  //   setMessage(""); // Clear input field after sending
  // };

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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Search chats..."
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <div className="space-y-2">
              {users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)} // Set selected user on click
                    className={`p-2 rounded-md cursor-pointer ${
                      selectedUser?.id === user.id
                        ? "bg-gray-300 dark:bg-gray-700"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div>
                        <h3 className="text-gray-700 dark:text-gray-300">
                          {user.username}
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
              <div className="flex-grow overflow-y-auto mt-4">
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
              <div className="mt-4 flex space-x-2">
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
