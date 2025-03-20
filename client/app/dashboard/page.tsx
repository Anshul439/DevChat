'use client'
import React, { useState } from "react";
import { MessageCircle, Users, Lock } from "lucide-react";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const { email } = useAuthStore();

  // State for managing messages
  const [messages, setMessages] = useState<{ id: number; text: string; isUser: boolean }[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Function to handle sending a new message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage.trim(),
        isUser: true, // Assuming the current user is sending the message
      };
      setMessages([...messages, message]);
      setNewMessage(""); // Clear the input field
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Navbar */}
      <Navbar/>

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
              placeholder="Search chats..."
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <div className="space-y-2">
              {[1, 2, 3].map((chat) => (
                <div
                  key={chat}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div>
                      <h3 className="text-gray-700 dark:text-gray-300">Chat {chat}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last message...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-grow bg-white dark:bg-gray-900 p-4">
          <div className="h-full flex flex-col">
            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-xs ${
                      message.isUser
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              />
              <Button
                onClick={handleSendMessage}
                className="bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};