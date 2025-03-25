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
  console.log(state);
  console.log(code);

  const { setEmail, setToken } = useAuthStore();
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
      console.log(response);

      const data = await response.json();
      console.log(data);

      setEmail(data.user.email);
      setToken(data.token);

      if (data.success || data.token) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );
};

export default LoadingPage;
