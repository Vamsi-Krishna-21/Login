import React, { useEffect, useState } from "react";
import axios from "axios";
import { LayoutDashboard, LogOut, User, Shield, CheckCircle2, Calendar, Settings, AlertCircle, Mail, Lock, X, Check, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState("general");

  const [settingsName, setSettingsName] = useState("");
  const [settingsUsername, setSettingsUsername] = useState("");
  const [settingsDob, setSettingsDob] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailChangeStep, setEmailChangeStep] = useState("request");
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState("");
  const [emailChangeError, setEmailChangeError] = useState("");

  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordOtpInput, setPasswordOtpInput] = useState("");
  const [passwordChangeStep, setPasswordChangeStep] = useState("request");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const isMinLength = newPasswordInput.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPasswordInput);
  const hasNumber = /[0-9]/.test(newPasswordInput);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPasswordInput);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("workspace_token");
        if (!token) {
          window.location.href = "/";
          return;
        }

        const res = await axios.get(
          "/api/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setUserName(res.data.user.name || "User");
        setEmail(res.data.user.email || "");
        setUsername(res.data.user.username || "");
        setDob(res.data.user.dob || "");
        setSettingsName(res.data.user.name || "");
        setSettingsUsername(res.data.user.username || "");
        setSettingsDob(res.data.user.dob || "");
      } catch (err) {
        console.error(err);
        setError("Session expired or unauthorized. Please log in again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("workspace_token");
    window.location.href = "/";
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put("/api/auth/profile", {
        name: settingsName,
        username: settingsUsername,
        dob: settingsDob,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserName(res.data.name);
      setUsername(res.data.username);
      setDob(res.data.dob);
      setProfileSuccess("Profile updated successfully!");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setEmailChangeLoading(true);
    setEmailChangeError("");
    setEmailChangeSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/auth/request-email-change", {
        email: newEmailInput,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmailChangeStep('verify');
      setEmailChangeSuccess("Verification code sent to " + newEmailInput);
    } catch (err) {
      setEmailChangeError(err.response?.data?.message || "Failed to request email change.");
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    setEmailChangeLoading(true);
    setEmailChangeError("");
    setEmailChangeSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/auth/verify-email-change", {
        otp: emailOtpInput,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmail(res.data.user.email);
      setEmailChangeStep('request');
      setNewEmailInput("");
      setEmailOtpInput("");
      setEmailChangeSuccess("Email updated successfully to " + res.data.user.email);
    } catch (err) {
      setEmailChangeError(err.response?.data?.message || "Failed to verify email change.");
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleRequestPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordChangeLoading(true);
    setPasswordChangeError("");
    setPasswordChangeSuccess("");

    if (!isMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      setPasswordChangeError("Password does not meet the strength requirements.");
      setPasswordChangeLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/auth/request-password-change", {
        password: newPasswordInput,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordChangeStep('verify');
      setPasswordChangeSuccess("Verification code sent to current email.");
    } catch (err) {
      setPasswordChangeError(err.response?.data?.message || "Failed to request password change.");
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleVerifyPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordChangeLoading(true);
    setPasswordChangeError("");
    setPasswordChangeSuccess("");
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/auth/verify-password-change", {
        otp: passwordOtpInput,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordChangeStep('request');
      setNewPasswordInput("");
      setPasswordOtpInput("");
      setPasswordChangeSuccess("Password updated successfully!");
    } catch (err) {
      setPasswordChangeError(err.response?.data?.message || "Failed to verify password change.");
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-50/30 dark:bg-[#030712] flex flex-col items-center justify-center transition-colors duration-200">
        <div className="w-12 h-12 border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50/30 dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Navigation Bar */}
      <nav className="bg-indigo-50/20 dark:bg-[#0b0f19]/80 border-b border-indigo-100/80 dark:border-indigo-500/30 sticky top-0 z-10 shadow-[0_4px_30px_rgba(99,102,241,0.03)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-indigo-950 dark:text-indigo-100">
                AppPortal
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-800 dark:text-indigo-200">{userName}</span>
                <span className="text-xs text-indigo-600/60 dark:text-indigo-400/60">{email}</span>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center p-2 border border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-400 rounded-xl transition duration-150 active:scale-95 cursor-pointer"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                aria-label="Toggle Theme"
              >
                {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 border border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-400 text-sm font-medium rounded-xl transition duration-150 active:scale-95 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3.5 py-2 border border-indigo-100 dark:border-indigo-500/20 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-indigo-600 dark:text-indigo-300 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium rounded-xl transition duration-150 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {error ? (
          <div className="max-w-md mx-auto bg-white dark:bg-[#0b0f19]/80 backdrop-blur-md p-8 rounded-2xl border border-red-100/60 dark:border-red-900/30 shadow-xl text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Authentication Error</h3>
            <p className="text-slate-500 dark:text-indigo-300 text-sm mb-6">{error}</p>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-semibold rounded-xl shadow-md transition cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hero / Greeting Panel */}
            <div className="bg-white dark:bg-[#0b0f19]/60 backdrop-blur-md p-6 md:p-10 rounded-2xl border border-indigo-100/80 dark:border-indigo-500/20 shadow-[0_8px_30px_rgba(99,102,241,0.06)] dark:shadow-[0_0_40px_rgba(139,92,246,0.1)] relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-colors duration-200">
              <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-500"></div>
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{userName}</span>! 👋
                </h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-indigo-200">
                  You have successfully logged in and authenticated. Use the "Settings" button in the navigation bar above to manage your profile and security parameters.
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100/60 dark:border-emerald-900/50 rounded-2xl px-4 py-2.5 shrink-0 self-start md:self-auto">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider font-mono">Account Active</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0b0f19] rounded-3xl shadow-2xl border border-indigo-100/80 dark:border-indigo-500/30 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100/80 dark:border-indigo-500/20 bg-indigo-50/20 dark:bg-[#030712]/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Account Settings</h2>
                  <p className="text-xs text-indigo-600/60 dark:text-indigo-400/60">Manage your profile and security parameters</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setProfileError("");
                  setProfileSuccess("");
                  setEmailChangeError("");
                  setEmailChangeSuccess("");
                  setPasswordChangeError("");
                  setPasswordChangeSuccess("");
                }}
                className="p-1.5 rounded-lg text-slate-400 dark:text-indigo-400/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar + Content layout */}
            <div className="flex flex-1 flex-col md:flex-row overflow-hidden min-h-[400px]">
              {/* Tabs sidebar */}
              <div className="w-full md:w-48 bg-indigo-50/5 dark:bg-[#030712]/15 p-4 border-b md:border-b-0 md:border-r border-indigo-100/80 dark:border-indigo-500/20 flex flex-row md:flex-col gap-1 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsActiveTab("general")}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition w-full text-left whitespace-nowrap cursor-pointer ${
                    settingsActiveTab === "general"
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                      : "text-indigo-700/70 dark:text-indigo-400/80 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:text-indigo-900 dark:hover:text-indigo-250"
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>General Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsActiveTab("email")}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition w-full text-left whitespace-nowrap cursor-pointer ${
                    settingsActiveTab === "email"
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                      : "text-indigo-700/70 dark:text-indigo-400/80 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:text-indigo-900 dark:hover:text-indigo-250"
                  }`}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>Email Update</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsActiveTab("password")}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition w-full text-left whitespace-nowrap cursor-pointer ${
                    settingsActiveTab === "password"
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                      : "text-indigo-700/70 dark:text-indigo-400/80 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:text-indigo-900 dark:hover:text-indigo-250"
                  }`}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Security & Pass</span>
                </button>
              </div>

              {/* Main Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* GENERAL PROFILE TAB */}
                {settingsActiveTab === "general" && (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">General Profile</h3>
                    <p className="text-xs text-slate-500 dark:text-indigo-300 mb-4">Update your basic login information. Changes are updated instantly without requiring OTP.</p>

                    {profileSuccess && (
                      <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm font-medium rounded-xl flex items-center space-x-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{profileSuccess}</span>
                      </div>
                    )}
                    {profileError && (
                      <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900 text-red-800 dark:text-red-300 text-sm font-medium rounded-xl flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">Username</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-indigo-400/60 font-medium font-mono">@</span>
                        <input
                          type="text"
                          required
                          value={settingsUsername}
                          onChange={(e) => setSettingsUsername(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">Date of Birth</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-indigo-400/60">
                          <Calendar className="w-4 h-4 shrink-0 text-slate-400 dark:text-indigo-500/40" />
                        </span>
                        <input
                          type="date"
                          value={settingsDob}
                          onChange={(e) => setSettingsDob(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50 scheme-light dark:scheme-dark"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {profileLoading ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* EMAIL UPDATE TAB */}
                {settingsActiveTab === "email" && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Email Update</h3>
                    <p className="text-xs text-slate-500 dark:text-indigo-300 mb-4">Update your verified email address. Requires a 6-digit verification code sent to your new email.</p>

                    {emailChangeSuccess && (
                      <div className="space-y-2">
                        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm font-medium rounded-xl flex items-center space-x-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{emailChangeSuccess}</span>
                        </div>
                      </div>
                    )}
                    {emailChangeError && (
                      <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900 text-red-800 dark:text-red-300 text-sm font-medium rounded-xl flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{emailChangeError}</span>
                      </div>
                    )}

                    {emailChangeStep === "request" ? (
                      <form onSubmit={handleRequestEmailChange} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">Current Email Address</label>
                          <input
                            type="text"
                            disabled
                            value={email}
                            className="w-full px-4 py-2.5 bg-indigo-50/10 dark:bg-[#030712]/50 border border-indigo-100/50 dark:border-indigo-950/50 rounded-xl text-sm text-slate-500 dark:text-indigo-400/60 cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">New Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={newEmailInput}
                            onChange={(e) => setNewEmailInput(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50"
                          />
                        </div>

                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={emailChangeLoading}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                          >
                            {emailChangeLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>Request Email Change</span>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyEmailChange} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">Enter 6-Digit Verification Code</label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            placeholder="123456"
                            value={emailOtpInput}
                            onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 tracking-[0.5em] text-center font-bold text-xl border border-indigo-100/80 dark:border-indigo-950/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setEmailChangeStep("request");
                              setEmailChangeSuccess("");
                              setEmailChangeError("");
                            }}
                            className="flex-1 py-2.5 px-4 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700/80 dark:text-indigo-400/80 font-bold rounded-xl transition hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-sm cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={emailChangeLoading}
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center text-sm cursor-pointer"
                          >
                            {emailChangeLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>Verify & Update Email</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* SECURITY & PASSWORD TAB */}
                {settingsActiveTab === "password" && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Security & Password</h3>
                    <p className="text-xs text-slate-500 dark:text-indigo-300 mb-4">Change your account password securely. Requires a 6-digit verification code sent to your current verified email address.</p>

                    {passwordChangeSuccess && (
                      <div className="space-y-2">
                        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm font-medium rounded-xl flex items-center space-x-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{passwordChangeSuccess}</span>
                        </div>
                      </div>
                    )}
                    {passwordChangeError && (
                      <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900 text-red-800 dark:text-red-300 text-sm font-medium rounded-xl flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{passwordChangeError}</span>
                      </div>
                    )}

                    {passwordChangeStep === "request" ? (
                      <form onSubmit={handleRequestPasswordChange} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              required
                              placeholder="Enter new password"
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              className="w-full pl-4 pr-11 py-2.5 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50"
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-lg hover:opacity-85 transition cursor-pointer text-slate-400 dark:text-indigo-400/60"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? "👁️" : "🙈"}
                            </button>
                          </div>

                          {newPasswordInput && (
                            <div className="p-3 bg-indigo-50/30 dark:bg-[#080c14] border border-indigo-100/60 dark:border-indigo-950/80 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-indigo-200 mt-2">
                              <p className="font-bold text-slate-700 dark:text-indigo-300">Password requirements:</p>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isMinLength ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
                                  <span className={isMinLength ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-400 dark:text-indigo-300/50"}>Min 8 characters</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className={`w-2 h-2 rounded-full ${hasUppercase ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
                                  <span className={hasUppercase ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-400 dark:text-indigo-300/50"}>1 uppercase letter</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className={`w-2 h-2 rounded-full ${hasNumber ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
                                  <span className={hasNumber ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-400 dark:text-indigo-300/50"}>1 number</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className={`w-2 h-2 rounded-full ${hasSpecial ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
                                  <span className={hasSpecial ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-400 dark:text-indigo-300/50"}>1 special char</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={passwordChangeLoading}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                          >
                            {passwordChangeLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>Request Password Change</span>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyPasswordChange} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider block">Enter 6-Digit Verification Code</label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            placeholder="123456"
                            value={passwordOtpInput}
                            onChange={(e) => setPasswordOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 tracking-[0.5em] text-center font-bold text-xl border border-indigo-100/80 dark:border-indigo-950/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordChangeStep("request");
                              setPasswordChangeSuccess("");
                              setPasswordChangeError("");
                            }}
                            className="flex-1 py-2.5 px-4 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700/80 dark:text-indigo-400/80 font-bold rounded-xl transition hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-sm cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={passwordChangeLoading}
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center text-sm cursor-pointer"
                          >
                            {passwordChangeLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span>Verify & Update Password</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
