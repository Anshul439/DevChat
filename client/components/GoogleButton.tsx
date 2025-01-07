import React from "react";
import { Button } from "./ui/button";
import { FaGoogle } from "react-icons/fa"; 

const GoogleButton = () => {

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
  }).toString();

  const handleGoogleLogin = () => {
    const githubUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}&state=google`;
    window.location.href = githubUrl;
  };
  return (
    <Button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-2"
      variant="outline"
    >
      <FaGoogle className="w-5 h-5" />
      Continue with Google
    </Button>
  );
};

export default GoogleButton;
