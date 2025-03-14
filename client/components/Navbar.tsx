"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
const Navbar = () => {
  const router = useRouter();

  const handleSignUp = () => {
    router.push("/sign-up");
  };

  const handleSignIn = () => {
    router.push("/sign-in");
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

          {/* Navigation - centered */}
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

          <div className="flex items-center space-x-4">
            {/* Sign In and Get Started Buttons */}
            <Button
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white dark:border-orange-500 dark:text-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition duration-300"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
            <Button
              className="bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300"
              onClick={handleSignUp}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
