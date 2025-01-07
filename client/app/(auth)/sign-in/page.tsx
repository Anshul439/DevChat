"use client";

/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { useDebounceCallback } from "usehooks-ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { SignInSchema } from "@/lib/utils";
import axios, { AxiosError } from "axios";
import { ApiResponse } from "@/types/ApiResponse";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleButton";
import GithubButton from "@/components/GithubButton";
import GoogleButton from "@/components/GoogleButton";

export default function Signin() {
  const [authError, setAuthError] = useState<string>("");
  const [username, setUsername] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setToken } = useAuthStore();

  const debounced = useDebounceCallback(setUsername, 300);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof SignInSchema>) => {
    setIsSubmitting(true);
    setAuthError(""); // Clear previous errors
    try {
      const response = await axios.post<ApiResponse>(
        "http://localhost:8000/api/signin",
        data,
        { withCredentials: true }
      );

      toast({
        title: "Success",
        description: response.data.message,
      });
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof AxiosError<ApiResponse>) {
        // For authentication errors (401), show inline
        if (error.response?.status === 401 || 404) {
          setAuthError(
            "Invalid email or password"
          );
          return;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg  shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-light lg:text-5xl mb-6">
            Join Chatter
          </h1>
          <p className="mb-4">Sign In</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {authError && (
              <div className="text-sm font-medium text-red-600 mt-1">{authError}</div>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please Wait
                </>
              ) : (
                "Signin"
              )}
            </Button>
          </form>
        </Form>

        
        <GoogleButton />
        <GithubButton />


        <div className="text-center mt-4">
          <p>
            New to Chatter?{" "}
            <Link href="/sign-up" className="text-blue-600 hover:text-blue-800">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
