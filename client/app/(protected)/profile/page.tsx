"use client";
import { useState, useEffect } from "react";
import { User, Mail, Edit, Save, LogOut } from "lucide-react";
import useAuthStore from "@/store/authStore";
import axios from "axios";

export default function ProfilePage() {
  const { email, setEmail, setToken } = useAuthStore();
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    avatar: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_ROOT_URL}/profile`,
          { withCredentials: true }
        );
        setUserData(response.data);
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
      await axios.patch(
        `${process.env.NEXT_PUBLIC_ROOT_URL}/profile`,
        userData,
        { withCredentials: true }
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
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

  return (
    <div className="flex-1 flex flex-col h-full p-6">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm p-4">
        <h1 className="text-xl font-semibold">Profile</h1>
      </div>

      <div className="mt-16 lg:mt-0">
        <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full bg-orange-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                  {userData.avatar ? (
                    <img
                      src={userData.avatar}
                      alt={userData.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-orange-600 dark:text-gray-300" />
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full">
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={userData.username}
                  onChange={(e) =>
                    setUserData({ ...userData, username: e.target.value })
                  }
                  className="text-xl font-bold text-center bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 mb-1"
                />
              ) : (
                <h2 className="text-xl font-bold">{userData.username}</h2>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-500 mr-3" />
                {isEditing ? (
                  <input
                    type="email"
                    value={userData.email}
                    onChange={(e) =>
                      setUserData({ ...userData, email: e.target.value })
                    }
                    className="flex-1 bg-gray-100 dark:bg-gray-700 rounded px-3 py-2"
                  />
                ) : (
                  <span>{userData.email}</span>
                )}
              </div>

              {/* Add more profile fields as needed */}
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center text-red-500 hover:text-red-700"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}