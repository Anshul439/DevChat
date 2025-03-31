"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Users,
  Settings,
  User,
  Search,
  MoreVertical,
  UsersIcon,
  LogOut,
  X,
} from "lucide-react";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { io, Socket } from "socket.io-client";
// import { ApiMessage } from "@/types/ApiResponse";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

// Type Definitions
interface User {
  id: number;
  username: string;
  email: string;
  hasNewMessages?: boolean;
  avatar?: string;
  lastMessage?: string;
}

interface ApiMessage {
  id: number;
  text: string;
  sender: {
    id: number;
    email: string;
    username: string;
  };
  receiver: {
    id: number;
    email: string;
    username: string;
  };
  createdAt: string;
}

// And update your client-side Message type to handle the new structure
interface Message {
  id: number;
  text: string;
  isUser: boolean;
  sender: string; // Still using email for simplicity in the UI
  receiver: string; // Still using email for simplicity in the UI
  createdAt?: string;
  senderObject?: {
    id: number;
    email: string;
    username: string;
  };
  receiverObject?: {
    id: number;
    email: string;
    username: string;
  };
}

interface Group {
  id: number;
  name: string;
  description?: string;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
  hasNewMessages?: boolean;
  lastMessage?: string;
  members: GroupMember[];
}

interface GroupMember {
  id: number;
  user: User;
}

interface GroupMessage {
  id: number;
  text: string;
  groupId: number;
  sender: User;
  createdAt: string;
}

// Utility Functions
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

// Socket Management
let socket: Socket | null = null;

export default function ChatPage() {
  // State Management
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { email, setToken, setEmail } = useAuthStore();
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<User[]>(
    []
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);

  const router = useRouter();

  // Socket Connection
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

  // Message Listener
  useEffect(() => {
    socket?.off("receive-message");

    socket?.on("receive-message", (data) => {
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

  useEffect(() => {
    socket?.off("receive-group-message");

    socket?.on("receive-group-message", (message: GroupMessage) => {
      if (selectedGroup && message.groupId === selectedGroup.id) {
        setGroupMessages((prev) => [...prev, message]);
      } else {
        setGroups((prev) =>
          prev.map((group) =>
            group.id === message.groupId
              ? {
                  ...group,
                  hasNewMessages: true,
                  lastMessage: message.text,
                }
              : group
          )
        );
      }
    });

    return () => {
      socket?.off("receive-group-message");
    };
  }, [selectedGroup]);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get<User[]>(`${rootUrl}/user`, {
          withCredentials: true,
        });
        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [email, rootUrl]);

  // Fetch Messages
  useEffect(() => {
    if (selectedUser && email) {
      const fetchMessages = async () => {
        setLoadingMessages(true);
        try {
          const res = await axios.get<ApiMessage[]>(`${rootUrl}/message`, {
            params: {
              user1Email: email,
              user2Email: selectedUser.email,
            },
            withCredentials: true,
          });

          const formattedMessages = res.data.map((msg) => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.sender.email === email,
            sender: msg.sender.email,
            receiver: msg.receiver.email,
            createdAt: msg.createdAt,
            senderObject: msg.sender,
            receiverObject: msg.receiver,
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get<Group[]>(`${rootUrl}/group`, {
          withCredentials: true,
        });
        setGroups(res.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    fetchGroups();
  }, [rootUrl]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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
    setIsMobileSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !email) return;

    const tempId = Date.now();
    const messageData = {
      text: newMessage.trim(),
      senderEmail: email, // Change from 'sender' to 'senderEmail'
      receiverEmail: selectedUser.email, // Change from 'receiver' to 'receiverEmail'
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
        text: newMessage.trim(),
        sender: email,
        receiver: selectedUser.email,
        id: response.data.id,
        createdAt: response.data.createdAt,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  // Group Creation Methods
  const handleCreateGroup = () => {
    setIsCreatingGroup(true);
    setSelectedUsersForGroup([]);
  };

  const toggleUserForGroup = (user: User) => {
    setSelectedUsersForGroup((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const cancelGroupCreation = () => {
    setIsCreatingGroup(false);
    setSelectedUsersForGroup([]);
  };

  const confirmGroupCreation = async () => {
    if (selectedUsersForGroup.length === 0) return;

    try {
      const memberIds = selectedUsersForGroup.map((user) => user.id);
      const currentUser = users.find((user) => user.email === email);

      if (currentUser) {
        memberIds.push(currentUser.id);
      }

      const response = await axios.post(
        `${rootUrl}/group`,
        {
          name: `Group with ${selectedUsersForGroup.length + 1} members`,
          memberIds,
        },
        {
          withCredentials: true,
        }
      );

      setGroups((prev) => [...prev, response.data]);
      setIsCreatingGroup(false);
      setSelectedUsersForGroup([]);

      // Join the group room
      socket?.emit("join-group-room", response.data.id);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, hasNewMessages: false } : g))
    );
    fetchGroupMessages(group.id);
    socket?.emit("join-group-room", group.id);
    setIsMobileSidebarOpen(false);
  };

  const fetchGroupMessages = async (groupId: number) => {
    try {
      const res = await axios.get<GroupMessage[]>(
        `${rootUrl}/group/${groupId}/messages`,
        {
          withCredentials: true,
        }
      );
      setGroupMessages(res.data);
    } catch (error) {
      console.error("Error fetching group messages:", error);
    }
  };

  const sendGroupMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !email) return;

    const tempId = Date.now();
    const messageData = {
      text: newMessage.trim(),
      groupId: selectedGroup.id,
      senderEmail: email,
    };

    setGroupMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: newMessage.trim(),
        groupId: selectedGroup.id,
        sender: {
          id: tempId,
          email,
          username: users.find((u) => u.email === email)?.username || "",
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      socket?.emit("group-message", messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending group message:", error);
      setGroupMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

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
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Filtered Users for Search
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Mobile Header (Hidden on larger screens) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex justify-between items-center p-4">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Users className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">Chats</h1>
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
              <DropdownMenuItem
                className="focus:bg-orange-100 dark:focus:bg-gray-700 cursor-pointer"
                onClick={handleCreateGroup}
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Create Group</span>
              </DropdownMenuItem>
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

      {/* Left Navigation Sidebar (Desktop) */}
      <div className="hidden lg:flex w-16 bg-gray-800 flex-col items-center py-4 space-y-6">
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
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-72 md:w-96 transform 
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 
        border-r border-gray-200 dark:border-gray-700 
        bg-white dark:bg-gray-800 flex flex-col
        transition-transform duration-300 ease-in-out
      `}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Contacts Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center mt-16 lg:mt-0">
          <h1 className="text-xl font-semibold">Chats</h1>
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
              <DropdownMenuItem
                className="focus:bg-orange-100 dark:focus:bg-gray-700 cursor-pointer"
                onClick={handleCreateGroup}
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                <span>Create Group</span>
              </DropdownMenuItem>
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

        {/* Search Box */}
        <div className="sticky top-16 lg:top-0 z-0 bg-white dark:bg-gray-800 px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {/* Groups Section */}
          <div className="px-4 py-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Groups
            </h3>
          </div>
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => handleGroupSelect(group)}
              className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer ${
                selectedGroup?.id === group.id
                  ? "bg-orange-100 dark:bg-gray-700"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <div className="relative mr-3">
                <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center">
                  <span className="text-orange-600 dark:text-gray-300 font-medium">
                    {getInitials(group.name)}
                  </span>
                </div>
                {group.hasNewMessages && (
                  <div className="absolute top-0 right-0 h-3 w-3 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{group.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {group.lastMessage || `${group.members.length} members`}
                </p>
              </div>
            </div>
          ))}

          {/* Users Section */}
          <div className="px-4 py-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Contacts
            </h3>
          </div>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  handleUserSelect(user);
                  setSelectedGroup(null);
                }}
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

        {/* Group Creation Sidebar */}
        {isCreatingGroup && (
          <div className="absolute inset-0 z-20 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={cancelGroupCreation}
                className="text-orange-500 flex items-center"
              >
                <X className="h-6 w-6 mr-2" />
                <span>Cancel</span>
              </button>
              <h2 className="font-semibold text-lg">New Group</h2>
              <button
                onClick={confirmGroupCreation}
                className={`${
                  selectedUsersForGroup.length > 0
                    ? "text-orange-500"
                    : "text-gray-400"
                } font-medium`}
                disabled={selectedUsersForGroup.length === 0}
              >
                Create
              </button>
            </div>

            {/* Selected members preview */}
            {selectedUsersForGroup.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {selectedUsersForGroup.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center bg-orange-100 dark:bg-gray-700 rounded-full px-3 py-1"
                    >
                      <span className="text-sm mr-2">{user.username}</span>
                      <button
                        onClick={() => toggleUserForGroup(user)}
                        className="text-orange-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users list for group creation */}
            <div className="flex-1 overflow-y-auto">
              {[...users]
                .filter((user) => user.email !== email)
                .sort((a, b) => a.username.localeCompare(b.username))
                .map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUserForGroup(user)}
                    className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer ${
                      selectedUsersForGroup.some((u) => u.id === user.id)
                        ? "bg-orange-50 dark:bg-gray-700"
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
                      {selectedUsersForGroup.some((u) => u.id === user.id) && (
                        <div className="absolute top-0 right-0 h-4 w-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{user.username}</h3>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 mt-16 lg:mt-0">
        {selectedGroup ? (
          <>
            {/* Group Chat Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center">
              <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                <span className="text-orange-600 dark:text-gray-300 font-medium">
                  {getInitials(selectedGroup.name)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-medium">{selectedGroup.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedGroup.members.length} members
                </p>
              </div>
            </div>

            {/* Group Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {groupMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender.email === email
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                      message.sender.email === email
                        ? "bg-orange-500 text-white rounded-tr-none"
                        : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none"
                    }`}
                  >
                    {message.sender.email !== email && (
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">
                        {message.sender.username}
                      </p>
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Group Message Input */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendGroupMessage();
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 mr-2 py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-full text-sm focus:outline-none"
                />
                <Button
                  onClick={sendGroupMessage}
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
        ) : selectedUser ? (
          <>
            {/* Chat Header */}
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

            {/* Messages Area */}
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading messages...
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
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
                  ))}
                  {/* This empty div will be scrolled into view */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
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
