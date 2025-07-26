"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

type ChatItem = {
  id: number;
  name: string;
  type: "user" | "group";
  lastMessage?: string;
  lastMessageTime?: string;
  hasNewMessages?: boolean;
  avatar?: string;
  members?: GroupMember[];
  userObject?: User;
  groupObject?: Group;
};

interface User {
  id: number;
  username: string;
  email: string;
  hasNewMessages?: boolean;
  avatar?: string;
  lastMessage?: string;
}

interface UserMessage {
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

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  sender: string;
  receiver: string;
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
  const [groupName, setGroupName] = useState("");
  const [combinedChats, setCombinedChats] = useState<ChatItem[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();

  // Memoize socket handlers to prevent re-creation on each render
  const handleReceiveMessage = useCallback(
    (data: any) => {
      const isUser = data.sender === email;

      // Only update messages if we're in the relevant chat
      if (
        selectedUser &&
        (data.sender === selectedUser.email ||
          data.receiver === selectedUser.email)
      ) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: data.id || Date.now(), // Use server ID if available
            text: data.text,
            isUser: isUser,
            sender: data.sender,
            receiver: data.receiver,
            createdAt: data.createdAt || new Date().toISOString(),
          },
        ]);
      }
    },
    [email, selectedUser?.email]
  ); // Add selectedUser.email to dependencies

  const handleNewGroupAdded = useCallback(
    (newGroup: any) => {
      // Check if the current user is a member of this group
      const userIsMember = newGroup.members.some(
        (member: any) => member.user.email === email
      );

      if (userIsMember) {
        setGroups((prev) => [...prev, newGroup]);
      }
    },
    [email]
  );

  const handleReceiveGroupMessage = useCallback(
    (message: GroupMessage) => {
      if (selectedGroup && message.groupId === selectedGroup.id) {
        setGroupMessages((prev) => [...prev, message]);
      }
    },
    [selectedGroup]
  );

  // Socket connection with improved handling for hot reloading
  const setupSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:8000", {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket server:", socketRef.current?.id);

        // If there's a selected user, join their room immediately
        if (selectedUser && email) {
          socketRef.current?.emit("join-room", {
            sender: email,
            receiver: selectedUser.email,
          });
        }

        // If there's a selected group, join that room immediately
        if (selectedGroup) {
          socketRef.current?.emit("join-group-room", selectedGroup.id);
        }
      });

      // Set up event listeners
      socketRef.current.on("receive-message", handleReceiveMessage);
      socketRef.current.on("new-group-added", handleNewGroupAdded);
      socketRef.current.on("receive-group-message", handleReceiveGroupMessage);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("receive-message", handleReceiveMessage);
        socketRef.current.off("new-group-added", handleNewGroupAdded);
        socketRef.current.off(
          "receive-group-message",
          handleReceiveGroupMessage
        );
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    email,
    selectedUser,
    selectedGroup,
    handleReceiveMessage,
    handleNewGroupAdded,
    handleReceiveGroupMessage,
  ]);

  useEffect(() => {
    const cleanup = setupSocket();
    return cleanup;
  }, [setupSocket]);

  const combineAndSortChats = useCallback((users: User[], groups: Group[]) => {
    const userChats: ChatItem[] = users.map((user) => ({
      id: user.id,
      name: user.username,
      type: "user",
      lastMessage: user.lastMessage,
      avatar: user.avatar,
      userObject: user,
    }));

    const groupChats: ChatItem[] = groups.map((group) => ({
      id: group.id,
      name: group.name,
      type: "group",
      lastMessage: group.lastMessage,
      members: group.members,
      groupObject: group,
    }));

    // Just combine without sorting
    return [...userChats, ...groupChats];
  }, []);

  useEffect(() => {
    setCombinedChats(combineAndSortChats(users, groups));
  }, [users, groups, combineAndSortChats]);

  // Replace the separate fetchUsers and fetchGroups useEffect hooks with this:
  const fetchUsersAndGroups = useCallback(async () => {
    try {
      // Fetch both simultaneously
      const [usersResponse, groupsResponse] = await Promise.all([
        axios.get<User[]>(`${rootUrl}/user`, { withCredentials: true }),
        axios.get<Group[]>(`${rootUrl}/group`, { withCredentials: true }),
      ]);

      // Set both states together
      setUsers(usersResponse.data);
      setGroups(groupsResponse.data);
    } catch (error) {
      console.error("Error fetching users and groups:", error);
      // Set empty arrays on error to prevent undefined states
      setUsers([]);
      setGroups([]);
    }
  }, [rootUrl]);

  useEffect(() => {
    fetchUsersAndGroups();
  }, [fetchUsersAndGroups]);

  // Fetch Messages
  const fetchMessages = useCallback(async () => {
    if (!selectedUser || !email) return;

    setLoadingMessages(true);
    try {
      const res = await axios.get<UserMessage[]>(`${rootUrl}/message`, {
        params: {
          user1Email: email,
          user2Email: selectedUser.email,
        },
        withCredentials: true,
        timeout: 10000,
      });

      const formattedMessages = res.data.map((msg) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender.email,
        receiver: msg.receiver.email,
        createdAt: msg.createdAt,
        senderObject: msg.sender,
        receiverObject: msg.receiver,
        isUser: msg.sender.email === email,
      }));

      setMessages(formattedMessages);

      // Scroll to bottom after messages are set
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedUser?.email, email, rootUrl]);

  useEffect(() => {
    if (selectedUser && email) {
      fetchMessages();
    }
  }, [selectedUser, fetchMessages]);

  useEffect(() => {
    // Only scroll on new messages, not when switching chats
    if (
      (messages.length > 0 && selectedUser) ||
      (groupMessages.length > 0 && selectedGroup)
    ) {
      scrollToBottom();
    }
  }, [messages.length, groupMessages.length]); // Changed dependencies

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  };

  const handleUserSelect = useCallback(
    (user: User) => {
      setSelectedUser(user);
      setSelectedGroup(null);
      setMessages([]); // Clear messages immediately
      setLoadingMessages(true);

      // Join room immediately
      if (socketRef.current && email) {
        socketRef.current.emit("join-room", {
          sender: email,
          receiver: user.email,
        });
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === user.id ? { ...u, hasNewMessages: false } : u
        )
      );

      setIsMobileSidebarOpen(false);
    },
    [email]
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !email) return;

    const messageText = newMessage.trim();
    const tempId = Date.now();

    // Clear input immediately for better UX
    setNewMessage("");

    // Add message to UI immediately (optimistic update)
    const optimisticMessage = {
      id: tempId,
      text: messageText,
      isUser: true,
      sender: email,
      receiver: selectedUser.email,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // Send to server and socket concurrently
      const [response] = await Promise.all([
        axios.post(
          `${rootUrl}/message`,
          {
            text: messageText,
            senderEmail: email,
            receiverEmail: selectedUser.email,
          },
          {
            withCredentials: true,
            timeout: 10000,
          }
        ),
        // Send socket message immediately without waiting for server response
        socketRef.current?.emit("message", {
          text: messageText,
          sender: email,
          receiver: selectedUser.email,
          id: tempId,
          createdAt: new Date().toISOString(),
        }),
      ]);

      // Update with server response
      if (response.data.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.data.id,
                  createdAt: response.data.createdAt,
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      // Restore message in input
      setNewMessage(messageText);
    }
  };

  const sendGroupMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !email) return;

    const messageText = newMessage.trim();
    const tempId = Date.now();

    // Clear input immediately
    setNewMessage("");

    // Optimistic update
    const optimisticMessage = {
      id: tempId,
      text: messageText,
      groupId: selectedGroup.id,
      sender: {
        id: tempId,
        email,
        username: users.find((u) => u.email === email)?.username || "",
      },
      createdAt: new Date().toISOString(),
    };

    setGroupMessages((prev) => [...prev, optimisticMessage]);

    try {
      // Send socket message immediately
      if (socketRef.current) {
        socketRef.current.emit("group-message", {
          text: messageText,
          groupId: selectedGroup.id,
          senderEmail: email,
        });
      }

      // Server request can happen in background
      await axios.post(
        `${rootUrl}/group/${selectedGroup.id}/messages`,
        {
          text: messageText,
          groupId: selectedGroup.id,
          senderEmail: email,
        },
        {
          withCredentials: true,
          timeout: 10000,
        }
      );
    } catch (error) {
      console.error("Error sending group message:", error);
      // Remove optimistic message on error
      setGroupMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageText);
    }
  };

  // Group Creation Methods
  const handleCreateGroup = () => {
    setIsCreatingGroup(true);
    setSelectedUsersForGroup([]);
  };

  const toggleUserForGroup = useCallback((user: User) => {
    setSelectedUsersForGroup((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }, []);

  const cancelGroupCreation = () => {
    setIsCreatingGroup(false);
    setSelectedUsersForGroup([]);
    setGroupName("");
  };

  const confirmGroupCreation = async () => {
    if (selectedUsersForGroup.length === 0 || !groupName.trim()) return;

    try {
      const memberIds = selectedUsersForGroup.map((user) => user.id);
      const currentUser = users.find((user) => user.email === email);

      if (currentUser) {
        memberIds.push(currentUser.id);
      }

      const response = await axios.post(
        `${rootUrl}/group`,
        {
          name: groupName.trim(),
          memberIds,
        },
        {
          withCredentials: true,
        }
      );

      if (socketRef.current) {
        socketRef.current.emit("group-created", response.data);
      }

      setGroups((prev) => [...prev, response.data]);
      setIsCreatingGroup(false);
      setSelectedUsersForGroup([]);
      setGroupName("");

      // Join the group room
      if (socketRef.current) {
        socketRef.current.emit("join-group-room", response.data.id);
      }
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const fetchGroupMessages = useCallback(
    async (groupId: number) => {
      setLoadingMessages(true);
      try {
        const res = await axios.get<GroupMessage[]>(
          `${rootUrl}/group/${groupId}/messages`,
          {
            withCredentials: true,
          }
        );

        const formattedGroupMessages = res.data.map((msg) => ({
          ...msg,
          isUser: msg.sender.email === email, // Add this line
        }));
        setGroupMessages(formattedGroupMessages);

        // Scroll to bottom after messages are set
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } catch (error) {
        console.error("Error fetching group messages:", error);
        setGroupMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [rootUrl]
  );

  const handleGroupSelect = useCallback(
    (group: Group) => {
      setSelectedGroup(group);
      setSelectedUser(null);
      setGroupMessages([]);
      setLoadingMessages(true);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id ? { ...g, hasNewMessages: false } : g
        )
      );

      if (socketRef.current) {
        socketRef.current.emit("join-group-room", group.id);
      }

      fetchGroupMessages(group.id);
      setIsMobileSidebarOpen(false);
    },
    [fetchGroupMessages]
  );

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

  // Filtered Users for Search
  const filteredChats = combinedChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
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

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={`${chat.type}-${chat.id}`}
                onClick={() => {
                  if (chat.type === "user" && chat.userObject) {
                    handleUserSelect(chat.userObject);
                    setSelectedGroup(null);
                  } else if (chat.type === "group" && chat.groupObject) {
                    handleGroupSelect(chat.groupObject);
                  }
                }}
                className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer ${
                  (selectedUser?.id === chat.id && chat.type === "user") ||
                  (selectedGroup?.id === chat.id && chat.type === "group")
                    ? "bg-orange-100 dark:bg-gray-700"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="relative mr-3">
                  <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center">
                    {chat.type === "user" ? (
                      chat.avatar ? (
                        <Image
                          src={chat.avatar}
                          alt={chat.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-orange-600 dark:text-gray-300 font-medium">
                          {getInitials(chat.name)}
                        </span>
                      )
                    ) : (
                      <span className="text-orange-600 dark:text-gray-300 font-medium">
                        {getInitials(chat.name)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{chat.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {chat.lastMessage ||
                      (chat.type === "group"
                        ? `${chat.members?.length || 0} members`
                        : `Start chatting with ${chat.name}`)}
                  </p>
                </div>
                {chat.lastMessageTime && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                    {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No chats found
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
                  selectedUsersForGroup.length > 0 && groupName.trim()
                    ? "text-orange-500"
                    : "text-gray-400"
                } font-medium`}
                disabled={
                  selectedUsersForGroup.length === 0 || !groupName.trim()
                }
              >
                Create
              </button>
            </div>

            {/* Group Name Input */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none"
              />
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
            {/* Group Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading messages...
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
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
