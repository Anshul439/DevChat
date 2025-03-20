"use client";

import React, { useState } from "react";
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
import { Loader2, MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import GitHubButton from "@/components/GithubButton";
import GoogleButton from "@/components/GoogleButton";

export default function Signin() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string>("");

  const { setToken } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  const setEmail = useAuthStore((state) => state.setEmail);

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
      console.log(response);
      
      setEmail(response.data.user.email);
      setToken(response.data.token);

      toast({
        title: "Success",
        description: response.data.message,
      });
      router.replace("/dashboard");
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      if (
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 404
      ) {
        setAuthError("Invalid email or password");
      } else {
        toast({
          title: "Sign-in failed",
          description: axiosError.response?.data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="container mx-auto px-6 py-12 flex-grow flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Header with logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="bg-orange-600 dark:bg-orange-500 p-2 rounded-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                DevChat
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sign in to your DevChat account
            </p>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          className="border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                          {...field}
                        />
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
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-gray-700 dark:text-gray-300">
                          Password
                        </FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-600"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {authError && (
                  <div className="text-sm font-medium text-red-600 mt-1">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                      in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Side-by-side OAuth buttons */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <GoogleButton />
                </div>
                <div>
                  <GitHubButton />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              New to DevChat?{" "}
              <Link
                href="/sign-up"
                className="text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-600 font-medium"
              >
                Create an account
              </Link>
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
