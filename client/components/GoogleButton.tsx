import React from "react";
import { Button } from "./ui/button";
import Image from "next/image";

const GoogleButton = () => {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  }).toString();

  const handleGoogleLogin = () => {
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}&state=google`;
    window.location.href = googleUrl;
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition duration-300 h-11"
      variant="outline"
    >
      <Image
        src="/google.svg"
        alt="Google Logo"
        width={35}
        height={35}
      />
    </Button>
  );
};

export default GoogleButton;