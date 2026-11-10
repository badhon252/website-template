import axios from "axios";
import { getSession, signOut } from "next-auth/react";
import { getApiUrl } from "@/lib/api-url";

export const api = axios.create({
  timeout: 10_000,
  maxRedirects: 0,
  withCredentials: true,
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  async (config) => {
    const baseURL = getApiUrl();
    const target = new URL(config.url ?? "", `${baseURL}/`);
    const allowed = new URL(baseURL);
    if (
      target.origin !== allowed.origin ||
      target.username ||
      target.password
    ) {
      throw new Error("API requests must use the configured backend origin");
    }
    config.baseURL = baseURL;
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const session = await getSession();

      // If there's an error in the session (refresh failed), log out
      if (session?.error === "RefreshAccessTokenError") {
        await signOut({ callbackUrl: "/login" });
        return Promise.reject(error);
      }

      // If we have a new access token, retry the request
      if (session?.accessToken) {
        originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
