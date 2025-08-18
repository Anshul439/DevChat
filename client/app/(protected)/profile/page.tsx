"use client";
import { useState, useEffect } from "react";
import { User, Mail, Edit, Save, LogOut, User as UserIcon, FileText, Camera, Check, X, Moon, Sun, Trash2 } from "lucide-react";
import useAuthStore from "@/store/authStore";
import axios from "axios";

export default function ProfilePage() {
  const { email, setEmail, setToken } = useAuthStore();
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    fullName: "",
    bio: "",
    profilePic: "",
    isVerified: false,
    createdAt: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved dark mode preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_ROOT_URL}/profile`,
          { withCredentials: true }
        );
        setUserData(response.data.user);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [email]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const formData = new FormData();
      formData.append("username", userData.username);
      formData.append("fullName", userData.fullName);
      formData.append("bio", userData.bio);
      
      if (profilePicFile) {
        formData.append("profilePic", profilePicFile);
      }

      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/profile`,
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setUserData(response.data.user);
      setIsEditing(false);
      setProfilePicFile(null);
      setProfilePicPreview("");
      
    } catch (error) {
      console.error("Error updating profile:", error);
      
      if (axios.isAxiosError(error)) {
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    
    if (confirmed) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_ROOT_URL}/profile`,
          { withCredentials: true }
        );
        setToken("");
        setEmail("");
        window.location.href = "/signin";
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      setToken("");
      setEmail("");
      window.location.href = "/signin";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
        {isEditing && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setProfilePicPreview("");
                setProfilePicFile(null);
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={saving}
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-2 text-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-orange-500 hover:text-orange-600 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {/* Profile Picture */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden ring-2 ring-orange-200 dark:ring-gray-600">
                {profilePicPreview ? (
                  <img
                    src={profilePicPreview}
                    alt={userData.username}
                    className="h-full w-full object-cover"
                  />
                ) : userData.profilePic ? (
                  <img
                    src={userData.profilePic}
                    alt={userData.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-10 w-10 text-orange-500" />
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-orange-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="hidden"
                  />
                  <Camera className="h-4 w-4" />
                </label>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Profile Photo
              </p>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            {/* Username */}
            <div className="flex items-center space-x-3 py-3 border-b border-gray-100 dark:border-gray-700">
              <User className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={userData.username}
                    onChange={(e) =>
                      setUserData({ ...userData, username: e.target.value })
                    }
                    className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white focus:ring-0 p-0 text-base mt-1"
                    placeholder="Enter username"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white mt-1">{userData.username || "Not set"}</p>
                )}
              </div>
            </div>

            {/* Full Name */}
            <div className="flex items-center space-x-3 py-3 border-b border-gray-100 dark:border-gray-700">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={userData.fullName}
                    onChange={(e) =>
                      setUserData({ ...userData, fullName: e.target.value })
                    }
                    className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white focus:ring-0 p-0 text-base mt-1"
                    placeholder="Enter full name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white mt-1">{userData.fullName || "Not set"}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-3 py-3 border-b border-gray-100 dark:border-gray-700">
              <Mail className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white mt-1">{userData.email}</p>
              </div>
            </div>

            {/* Bio */}
            <div className="flex items-start space-x-3 py-3">
              <FileText className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Bio</p>
                {isEditing ? (
                  <textarea
                    value={userData.bio}
                    onChange={(e) =>
                      setUserData({ ...userData, bio: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 min-h-[80px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                    maxLength={160}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white whitespace-pre-line">
                    {userData.bio || "No bio added yet"}
                  </p>
                )}
                {isEditing && (
                  <p className="text-xs text-gray-400 mt-1">
                    {userData.bio.length}/160 characters
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Settings</h3>
          
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {isDarkMode ? (
                <Moon className="h-5 w-5 text-gray-400" />
              ) : (
                <Sun className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isDarkMode ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isDarkMode ? 'transform translate-x-6' : 'transform translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Logout */}
          <div className="py-3 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-900 dark:text-white">Sign Out</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sign out of your account</p>
              </div>
            </button>
          </div>

          {/* Delete Account */}
          <div className="py-3">
            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center space-x-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg p-2 -m-2 transition-colors"
            >
              <Trash2 className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-red-600 dark:text-red-400">Delete Account</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Permanently delete your account</p>
              </div>
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Member since {new Date(userData.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </div>
        </div>
      </div>

      {/* Floating Edit Button (when not editing) */}
      {!isEditing && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Edit className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
            <span className="text-gray-900 dark:text-white">Saving changes...</span>
          </div>
        </div>
      )}
    </div>
  );
}