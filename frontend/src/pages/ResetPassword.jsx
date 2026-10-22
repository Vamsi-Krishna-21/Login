import React, { useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isMinLength) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!hasUppercase) {
      setError("Password must contain at least one uppercase letter");
      return;
    }

    if (!hasNumber) {
      setError("Password must contain at least one number");
      return;
    }

    if (!hasSpecial) {
      setError("Password must contain at least one special character");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `/api/auth/reset-password/${token}`,
        { password }
      );

      setSuccess("Password reset successful!");

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired reset link");
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
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-slate-900 dark:text-slate-100 tracking-tight mb-2">
          Reset Password
        </h2>
        <p className="text-center text-sm text-slate-500 dark:text-indigo-300 mb-8">
          Enter your new password below to secure your account.
        </p>

        <form onSubmit={handleReset} className="space-y-6">
          {/* Password input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-indigo-200 block">
              New Password
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

            {password && (
              <div className="p-3 bg-indigo-50/30 dark:bg-[#080c14] border border-indigo-100/60 dark:border-indigo-950/80 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-indigo-200 mt-1">
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

          {/* Confirm Password input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-indigo-200 block">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-indigo-400/60">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
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

          {success && (
            <div className="flex items-center space-x-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-xl text-sm border border-emerald-100/60 dark:border-emerald-900/50">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{success}</span>
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
              "Reset Password"
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

export default ResetPassword;
