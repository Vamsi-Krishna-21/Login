import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, LogIn } from "lucide-react";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter your credentials");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "/api/auth/login",
        {
          identifier,
          password
        }
      );

      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-50/30 dark:bg-[#030712] px-4 py-12 transition-colors duration-200">
      <div className="bg-white dark:bg-[#0b0f19]/80 backdrop-blur-md p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgba(99,102,241,0.08)] dark:shadow-[0_0_50px_rgba(99,102,241,0.15)] max-w-md w-full relative overflow-hidden border border-slate-200/80 dark:border-indigo-500/30 transition-all duration-200">
        {/* Logo/Icon Container */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-sm text-indigo-600 dark:text-indigo-400">
            <LogIn className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-slate-900 dark:text-slate-100 tracking-tight mb-8">
          Workspace Hub
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email or Username input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-indigo-200 block">
              Email or Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-indigo-400/60">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email or username"
                className="w-full pl-11 pr-4 py-3 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:bg-white dark:focus:bg-[#080c14] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition duration-150 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50 placeholder-slate-400 dark:placeholder-indigo-300/30"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-indigo-200 block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-indigo-400/60">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full pl-11 pr-11 py-3 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:bg-white dark:focus:bg-[#080c14] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition duration-150 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50 placeholder-slate-400 dark:placeholder-indigo-300/30"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-lg hover:opacity-80 transition text-slate-400 dark:text-indigo-400/60"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100/60 dark:border-red-900/50">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 hover:shadow-xl active:scale-[0.98] transition duration-150 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed text-base cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 flex flex-col items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-indigo-200">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
            >
              Create Account
            </button>
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-xs font-semibold text-slate-400 dark:text-indigo-400/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
