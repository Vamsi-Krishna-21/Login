import React, { createContext, useContext, useState, useEffect } from "react";
import { getApiUrl } from "../utils/api.js";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token") || localStorage.getItem("workspace_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(getApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          localStorage.removeItem("token");
          localStorage.removeItem("workspace_token");
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  const login = (newToken, newUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("workspace_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("workspace_token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // Helper function to call backend API with automatic token attachment
  const apiFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(getApiUrl(url), {
      ...options,
      headers,
    });

    if (response.status === 411 || response.status === 401) {
      // Trigger logout if unauthenticated
      logout();
      throw new Error("Session expired. Please log in again.");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
