import { Link } from "react-router-dom";
import { Layers } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Branding Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              WorkspaceHub
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            The high-performance, responsive collaborative environment for tracking projects, priorities, and tasks seamlessly.
          </p>
        </div>

        {/* Product Navigation */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-white transition">Features</Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition">Pricing Plan</Link>
            </li>
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="text-gray-500">Security Rules</span>
            </li>
          </ul>
        </div>

        {/* Workspace Credits */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Core Platform</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Built with modern MERN-like stack including Express APIs, JWT verification, and styled with responsive Tailwind CSS utilities.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Server status: Online</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Workspace Dashboard Hub. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <span className="hover:text-slate-300">Privacy Policy</span>
          <span className="hover:text-slate-300">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
