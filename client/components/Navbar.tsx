"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore"; // Import the auth store
import axios from "axios";
import { ApiResponse } from "@/types/ApiResponse";

const Navbar = () => {
  const router = useRouter();
  const { email, setAccessToken, setEmail } = useAuthStore(); // Get email and logout functions
  console.log(email);
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;

  // Handle logout
  const handleLogout = async () => {
    const response = await axios.post<ApiResponse>(`${rootUrl}/auth/logout`, {
      withCredentials: true,
    });
    console.log(response);

    setAccessToken(""); // Clear the token
    setEmail(""); // Clear the email
    router.push("/signin"); // Redirect to the sign-in page
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-10 relative">
        <div className="h-16 flex items-center justify-between">
          {/* Logo and Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-orange-600 dark:bg-orange-500 p-2 rounded-lg">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-orange-600 dark:text-orange-500">
              DevChat
            </span>
          </div>

          {/* Navigation - centered (only shown when not logged in) */}
          {!email && (
            <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
              <a
                href="#features"
                className="text-sm font-medium hover:text-orange-600 dark:hover:text-orange-500 transition"
              >
                Features
              </a>
              <a
                href="#testimonials"
                className="text-sm font-medium hover:text-orange-600 dark:hover:text-orange-500 transition"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium hover:text-orange-600 dark:hover:text-orange-500 transition"
              >
                Pricing
              </a>
              <a
                href="#about"
                className="text-sm font-medium hover:text-orange-600 dark:hover:text-orange-500 transition"
              >
                About
              </a>
            </nav>
          )}

          {/* Show email and logout button if logged in, otherwise show sign-in and get-started buttons */}
          <div className="flex items-center space-x-4">
            {email ? (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {email}
                </span>
                <Button
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white dark:border-orange-500 dark:text-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition duration-300"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white dark:border-orange-500 dark:text-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition duration-300"
                  onClick={() => router.push("/signin")}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300"
                  onClick={() => router.push("/signup")}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
