import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle2, KeyRound, ArrowLeft } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "/api/auth/forgot-password",
        { email }
      );

      setMessage(res.data.message || "Password reset link sent successfully!");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || "Failed to send reset link. Please check your email address.");
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
            <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-slate-900 dark:text-slate-100 tracking-tight mb-2">
          Forgot Password
        </h2>
        <p className="text-center text-sm text-slate-500 dark:text-indigo-300 mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-indigo-200 block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-indigo-400/60">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3 border border-slate-200/80 dark:border-indigo-950/80 rounded-xl text-sm focus:bg-white dark:focus:bg-[#080c14] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition duration-150 text-slate-900 dark:text-slate-100 bg-white dark:bg-[#080c14]/50 placeholder-slate-400 dark:placeholder-indigo-300/30"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100/60 dark:border-red-900/50">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center space-x-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-xl text-sm border border-emerald-100/60 dark:border-emerald-900/50">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{message}</span>
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
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 flex justify-center border-t border-slate-100/60 dark:border-indigo-950/80">
          <button
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
