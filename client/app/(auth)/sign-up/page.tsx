"use client";

import React, { useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { SignUpSchema } from "@/lib/utils";
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
import {
  Loader2,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import GitHubButton from "@/components/GithubButton";
import GoogleButton from "@/components/GoogleButton";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmaill] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setEmail = useAuthStore((state) => state.setEmail);

  const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL;

  const debouncedUsername = useDebounceCallback(setUsername, 500);
  const debouncedEmail = useDebounceCallback(setEmaill, 500);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: "",
      fullName: "",
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    const checkUsernameUnique = async () => {
      if (username && username.length >= 3) {
        setIsCheckingUsername(true);
        setUsernameMessage("");
        try {
          const response = await axios.get(`${rootUrl}/auth/check-username`, {
            params: { username: username },
          });

          const message = response.data.message;
          setUsernameMessage(message);
        } catch (error) {
          const axiosError = error as AxiosError<ApiResponse>;
          setUsernameMessage(
            axiosError.response?.data.message ?? "Error checking username"
          );
        } finally {
          setIsCheckingUsername(false);
        }
      }
    };

    checkUsernameUnique();
  }, [username]);

  useEffect(() => {
    const checkEmailUnique = async () => {
      if (email && email.includes("@")) {
        setIsCheckingEmail(true);
        setEmailMessage("");
        try {
          const response = await axios.get(`${rootUrl}/auth/check-email`, {
            params: { email: email },
          });
          const message = response.data.message;
          setEmailMessage(message);
        } catch (error) {
          const axiosError = error as AxiosError<ApiResponse>;
          setEmailMessage(
            axiosError.response?.data.message ?? "Error checking email"
          );
        } finally {
          setIsCheckingEmail(false);
        }
      }
    };
    checkEmailUnique();
  }, [email]);

  const onSubmit = async (data: z.infer<typeof SignUpSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post<ApiResponse>(
        `${rootUrl}/auth/signup`,
        data,
        { withCredentials: true }
      );
      setEmail(data.email);

      toast({
        title: "Success",
        description: response.data.message,
      });
      router.replace(`/verify/${username}`);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      let errorMessage = axiosError.response?.data.message;
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
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
            <h1 className="text-3xl font-bold mb-2">Create your account</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Join DevChat and start connecting with others
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
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Email
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            className="border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              debouncedEmail(e.target.value);
                            }}
                          />
                        </FormControl>
                        {isCheckingEmail && (
                          <div className="absolute right-3 top-3">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          </div>
                        )}
                        {emailMessage === "Email is available" &&
                          !isCheckingEmail && (
                            <div className="absolute right-3 top-3">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                        {emailMessage &&
                          emailMessage !== "Email is available" &&
                          !isCheckingEmail && (
                            <div className="absolute right-3 top-3">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                      </div>
                      {!fieldState.error ? (
                        <p
                          className={`text-xs mt-1 ${
                            emailMessage === "Email is available"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {emailMessage}
                        </p>
                      ) : (
                        <FormMessage />
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  name="fullName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className="border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="username"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Username
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="johndoe"
                            className="border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              debouncedUsername(e.target.value);
                            }}
                          />
                        </FormControl>
                        {isCheckingUsername && (
                          <div className="absolute right-3 top-3">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          </div>
                        )}
                        {usernameMessage === "Username is available" &&
                          !isCheckingUsername && (
                            <div className="absolute right-3 top-3">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                        {usernameMessage &&
                          usernameMessage !== "Username is available" &&
                          !isCheckingUsername && (
                            <div className="absolute right-3 top-3">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                      </div>
                      {!fieldState.error ? (
                        <p
                          className={`text-xs mt-1 ${
                            usernameMessage === "Username is available"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {usernameMessage}
                        </p>
                      ) : (
                        <FormMessage />
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">
                        Password
                      </FormLabel>
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

                <Button
                  type="submit"
                  className="w-full bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating
                      Account...
                    </>
                  ) : (
                    "Create Account"
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
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-600 font-medium"
              >
                Sign In
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
