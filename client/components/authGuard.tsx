"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import axios from "axios";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { setToken, setEmail } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get("http://localhost:8000/api/validate-token", {
          withCredentials: true,
        });
        setIsLoading(false); // User is authenticated
      } catch (error) {
        console.log(error);
        setToken(false); // Clear the token
        setEmail(null); // Clear the email
        router.push("/"); // Redirect if unauthorized
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) return <div>Loading...</div>; // Show a loader while checking auth

  return <>{children}</>;
}
