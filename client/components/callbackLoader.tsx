"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useAuthStore from "@/store/authStore";

const LoadingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const { setAccessToken, setEmail } = useAuthStore(); // Changed from setToken
  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;

  useEffect(() => {
    if (code && state) {
      exchangeCodeForToken(code, state);
    }
  }, [code, state]);

  const exchangeCodeForToken = async (code: string, state: string) => {
    try {
      const response = await fetch(`${rootUrl}/auth/${state}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
        credentials: "include",
      });

      const data = await response.json();
      console.log("OAuth response:", data);

      // FIX: Handle the new response structure
      if (data.success && data.accessToken && data.user) {
        setEmail(data.user.email);
        setAccessToken(data.accessToken); // Changed from data.token
        router.push("/chat");
      } else if (data.accessToken && data.user) {
        // Handle case where success flag might not be present
        setEmail(data.user.email);
        setAccessToken(data.accessToken);
        router.push("/chat");
      } else {
        console.error("Invalid OAuth response:", data);
        router.push("/signin");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      router.push("/signin");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );
};

export default LoadingPage;