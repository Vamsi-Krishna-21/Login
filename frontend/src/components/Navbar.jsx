import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, LayoutDashboard, User as UserIcon, LogOut, Settings as SettingsIcon, Layers, Info, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const activeLink = (path) => {
    return location.pathname === path
      ? "text-indigo-600 font-semibold"
      : "text-slate-600 hover:text-indigo-600 transition-colors duration-200";
  };

  const activeMobileLink = (path) => {
    return location.pathname === path
      ? "bg-indigo-50 text-indigo-600 font-semibold border-l-4 border-indigo-600 pl-3 py-2 rounded-r-md"
      : "text-slate-600 hover:bg-slate-50 pl-3 py-2 rounded-md transition-all duration-200";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2" id="nav-logo">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800">
                WorkspaceHub
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className={activeLink("/")}>Home</Link>

            {user ? (
              <>
                <Link to="/dashboard" className={activeLink("/dashboard")}>
                  <span className="flex items-center space-x-1">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </span>
                </Link>
                
                {/* User Info Menu */}
                <div className="h-6 w-px bg-slate-200"></div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 p-1">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                      {user.avatar && user.avatar.length === 1 ? user.avatar : "👤"}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{user.name}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-semibold shadow-sm hover:shadow-md transition duration-200"
                >
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 rounded-md"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-100 bg-white"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className={`block ${activeMobileLink("/")}`}
              >
                Home
              </Link>

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className={`block ${activeMobileLink("/dashboard")}`}
                  >
                    <span className="flex items-center space-x-2">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center space-x-2 text-red-600 hover:bg-red-50 pl-3 py-2 rounded-md font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <div className="pt-4 pb-2 border-t border-slate-100 mt-2 flex flex-col space-y-2 px-3">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-2 text-slate-700 hover:text-indigo-600 font-medium text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-sm"
                  >
                    Sign Up Free
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
