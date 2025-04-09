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
  UserPlus,
  Check,
  Clock,
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
import { useToast } from "@/hooks/use-toast";

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
  status?: "friend" | "pending" | "non-friend";
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

export default function ChatPage() {
  const { toast } = useToast();
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
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [nonFriends, setNonFriends] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"friends" | "add">("friends");

  const router = useRouter();

  const handleReceiveMessage = useCallback(
    (data: any) => {
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
        }
      }
    },
    [email, selectedUser]
  );

  const handleNewGroupAdded = useCallback(
    (newGroup: any) => {
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

  const fetchFriendRequests = useCallback(async () => {
    try {
      const res = await axios.get<Friendship[]>(`${rootUrl}/friend`, {
        withCredentials: true,
      });
      console.log(res);

      setFriendRequests(res.data);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  }, [rootUrl]);

  const setupSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:8000", {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      if (email) {
        socketRef.current?.emit("join-user-room", email);
      }

      // Add this inside your useEffect with socket setup
      socketRef.current.on("receive-friend-request", (data) => {
        console.log("Friend request received:", data);
        fetchFriendRequests();

        toast({
          title: "New Friend Request",
          description: `${data.senderName} sent you a friend request`,
        });
      });

      socketRef.current.on("friend-request-accepted", (data) => {
        console.log("Friend request accepted notification:", data);

        // Add the new friend to friends list
        if (data.newFriend) {
          setFriends((prevFriends) => {
            if (!prevFriends.some((f) => f.id === data.newFriend.id)) {
              return [...prevFriends, data.newFriend];
            }
            return prevFriends;
          });
          toast({
            title: "Friend request accepted",
            description: `${data.newFriend.username} accepted your friend request!`,
          });
        }
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket server:", socketRef.current?.id);

        if (selectedUser && email) {
          socketRef.current?.emit("join-room", {
            sender: email,
            receiver: selectedUser.email,
          });
        }

        if (selectedGroup) {
          socketRef.current?.emit("join-group-room", selectedGroup.id);
        }
      });

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
        socketRef.current.off("friend-request-accepted");
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
    fetchFriendRequests,
    toast,
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

    return [...userChats, ...groupChats];
  }, []);

  useEffect(() => {
    setCombinedChats(combineAndSortChats(friends, groups));
  }, [friends, groups, combineAndSortChats]);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await axios.get<User[]>(`${rootUrl}/friend/friends-list`, {
        withCredentials: true,
      });
      setFriends(res.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  }, [rootUrl]);

  const fetchNonFriends = useCallback(
    async (searchQuery = "") => {
      try {
        const res = await axios.get<User[]>(`${rootUrl}/user`, {
          params: { search: searchQuery },
          withCredentials: true,
        });
        setNonFriends(res.data);
      } catch (error) {
        console.error("Error fetching non-friends:", error);
      }
    },
    [rootUrl]
  );

  const sendFriendRequest = async (userId: number) => {
    try {
      const response = await axios.post(
        `${rootUrl}/friend`,
        { friendId: userId },
        {
          withCredentials: true,
        }
      );

      // If API request is successful, get the user's email and emit socket event
      const targetUser = nonFriends.find((user) => user.id === userId);
      if (socketRef.current && targetUser) {
        socketRef.current.emit("send-friend-request", {
          senderEmail: email,
          receiverEmail: targetUser.email,
          senderName: response.data.senderUsername,
          friendRequest: response.data, // Include the request data from the API response
        });
      }

      fetchNonFriends(searchQuery);
    } catch (error) {
      console.error("Error sending friend request:", error);
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

        if (friendRequest && friendRequest.user && socketRef.current) {
          socketRef.current.emit("friend-request-accepted", {
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

        // Show success toast
        toast({
          title: "Friend request accepted",
          description: `You are now friends with ${friendRequest?.user?.username}!`,
        });
      } else {
        await axios.delete(`${rootUrl}/friend/${requestId}`, {
          withCredentials: true,
        });
        // Show rejection toast if needed
        toast({
          title: "Friend request declined",
          variant: "destructive",
        });
      }

      fetchFriendRequests();
      fetchFriends();
      fetchNonFriends(searchQuery);
    } catch (error) {
      console.error("Error responding to friend request:", error);
      toast({
        title: "Error",
        description: "Failed to process friend request",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!selectedUser || !email) return;

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
  }, [selectedUser, email, rootUrl]);

  useEffect(() => {
    if (selectedUser && email) {
      fetchMessages();
    }
  }, [selectedUser, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser, groupMessages, selectedGroup]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await axios.get<Group[]>(`${rootUrl}/group`, {
        withCredentials: true,
      });
      setGroups(res.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }, [rootUrl]);

  useEffect(() => {
    fetchGroups();
    fetchFriendRequests();
    fetchFriends();
  }, [fetchGroups, fetchFriendRequests, fetchFriends]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleUserSelect = useCallback(
    (user: User) => {
      const isFriend = friends.some((friend) => friend.id === user.id);
      if (!isFriend) {
        alert("You can only message friends");
        return;
      }

      // Only reset messages if we're selecting a different user
      if (!selectedUser || selectedUser.id !== user.id) {
        setMessages([]);
      }

      setSelectedUser(user);
      setSelectedGroup(null);

      if (socketRef.current) {
        socketRef.current.emit("join-room", {
          sender: email,
          receiver: user.email,
        });
      }

      // Always fetch messages when selecting a user
      fetchMessages();

      setIsMobileSidebarOpen(false);
    },
    [email, friends, selectedUser, fetchMessages]
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !email) return;

    const isFriend = friends.some((friend) => friend.id === selectedUser.id);
    if (!isFriend) {
      alert("You can only message friends");
      return;
    }

    const tempId = Date.now();
    const messageData = {
      text: newMessage.trim(),
      senderEmail: email,
      receiverEmail: selectedUser.email,
    };

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: newMessage.trim(),
        isUser: true,
        sender: email,
        receiver: selectedUser.email,
        createdAt: new Date().toString(),
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

      if (socketRef.current) {
        socketRef.current.emit("message", {
          text: newMessage.trim(),
          sender: email,
          receiver: selectedUser.email,
          id: response.data.id,
          createdAt: response.data.createdAt,
        });
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
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
        createdAt: new Date().toString(),
      },
    ]);

    try {
      const response = await axios.post<GroupMessage[]>(
        `${rootUrl}/group/${selectedGroup.id}/messages`,
        messageData,
        {
          withCredentials: true,
        }
      );

      if (socketRef.current) {
        socketRef.current.emit("group-message", messageData);
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending group message:", error);
      setGroupMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

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

    const allFriends = selectedUsersForGroup.every((user) =>
      friends.some((friend) => friend.id === user.id)
    );

    if (!allFriends) {
      alert("You can only add friends to groups");
      return;
    }

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

      if (socketRef.current) {
        socketRef.current.emit("join-group-room", response.data.id);
      }
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleGroupSelect = useCallback((group: Group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, hasNewMessages: false } : g))
    );
    fetchGroupMessages(group.id);

    if (socketRef.current) {
      socketRef.current.emit("join-group-room", group.id);
    }

    setIsMobileSidebarOpen(false);
  }, []);

  const fetchGroupMessages = useCallback(
    async (groupId: number) => {
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
    },
    [rootUrl]
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

  const filteredChats = combinedChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Mobile Header */}
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
        <button
          onClick={() => setIsFriendRequestsOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 relative"
        >
          <Users className="h-6 w-6" />
          {friendRequests.length > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">
              {friendRequests.length}
            </span>
          )}
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFriendRequestsOpen(true)}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 relative"
            >
              <Users className="h-5 w-5" />
              {friendRequests.length > 0 && (
                <span className="absolute top-0 right-0 h-3 w-3 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
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

        {/* Search Box */}
        <div className="sticky top-16 lg:top-0 z-0 bg-white dark:bg-gray-800 px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab === "add") {
                  fetchNonFriends(e.target.value);
                }
              }}
              placeholder={
                activeTab === "friends" ? "Search chats" : "Search users"
              }
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none"
            />
          </div>
          <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2">
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === "friends"
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => {
                setActiveTab("add");
                fetchNonFriends(searchQuery);
              }}
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === "add"
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Add Friends
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {isCreatingGroup ? (
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

              {/* Friends list for group creation */}
              <div className="flex-1 overflow-y-auto">
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No friends to add to group
                  </div>
                ) : (
                  friends.map((user) => (
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
                        {selectedUsersForGroup.some(
                          (u) => u.id === user.id
                        ) && (
                          <div className="absolute top-0 right-0 h-4 w-4 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {user.username}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "friends" ? (
            <>
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
            </>
          ) : (
            <>
              {nonFriends.length > 0 ? (
                nonFriends.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center">
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
                      <div>
                        <h3 className="font-medium">{user.username}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? "No users found"
                    : "Search for users to add as friends"}
                </div>
              )}
            </>
          )}
        </div>

        {/* Empty State for No Friends */}
        {activeTab === "friends" &&
          friends.length === 0 &&
          !isCreatingGroup && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-orange-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-1">No Friends Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                Add friends to start chatting and create groups
              </p>
              <button
                onClick={() => {
                  setActiveTab("add");
                  fetchNonFriends(searchQuery);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-md"
              >
                Add Friends
              </button>
            </div>
          )}
      </div>

      {/* Friend Requests Modal */}
      {isFriendRequestsOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Friend Requests</h2>
              <button
                onClick={() => setIsFriendRequestsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {friendRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No pending friend requests
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {friendRequests.map((request) => (
                  <div
                    key={request.userId}
                    className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                        {request.user?.avatar ? (
                          <Image
                            src={request.user.avatar}
                            alt={request.user.username}
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
                      <div>
                        <h3 className="font-medium">
                          {request.user?.username}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          respondToFriendRequest(request.userId, "accepted")
                        }
                        className="px-3 py-1 bg-green-500 text-white rounded-md text-sm flex items-center"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          respondToFriendRequest(request.userId, "rejected")
                        }
                        className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
                        title="Decline and remove request"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                    <p
                      className={`text-xs mt-1 text-right ${
                        message.sender.email === email
                          ? "text-orange-200"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
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
                        <p
                          className={`text-xs mt-1 text-right ${
                            message.isUser
                              ? "text-orange-200"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {message.createdAt &&
                            new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </p>
                      </div>
                    </div>
                  ))}
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
                {friends.length === 0
                  ? "Add friends to start chatting"
                  : "Select a contact to start chatting"}
              </p>
              {friends.length === 0 && (
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(true);
                    setActiveTab("add");
                    fetchNonFriends(searchQuery);
                  }}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md"
                >
                  Add Friends
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
