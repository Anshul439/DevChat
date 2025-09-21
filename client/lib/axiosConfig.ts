// lib/axiosConfig.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import useAuthStore from "@/store/authStore";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ROOT_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Function to add subscribers waiting for token refresh
const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to notify all subscribers when refresh is complete
const onRefreshComplete = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshAccessToken, accessToken, clearTokens } =
        useAuthStore.getState();

      // If we're already refreshing, wait for it to complete
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshSuccess = await refreshAccessToken();

        if (refreshSuccess) {
          const { accessToken: newToken } = useAuthStore.getState();
          isRefreshing = false;

          // Update the original request with new token
          if (originalRequest.headers && newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          // Notify all waiting requests
          onRefreshComplete(newToken || "");

          // Retry the original request
          return api(originalRequest);
        } else {
          // Refresh failed, clear tokens and redirect
          isRefreshing = false;
          clearTokens();

          if (typeof window !== "undefined") {
            window.location.href = "/signin";
          }

          return Promise.reject(error);
        }
      } catch (refreshError) {
        isRefreshing = false;
        clearTokens();

        if (typeof window !== "undefined") {
          window.location.href = "/signin";
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
