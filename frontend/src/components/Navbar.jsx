import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Wifi, WifiOff, RefreshCw, Compass, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount } = useSync();
  const { isDark, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <nav className="glass-panel sticky top-0 z-50 px-4 sm:px-6 py-2.5 sm:py-3 shadow-md mb-4 sm:mb-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
          <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg shadow-emerald-500/20">
            <Compass className="w-5 h-5 sm:w-6 h-6 text-slate-950" />
          </div>
          <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[var(--text-primary)] font-sans">
            Trip<span className="text-emerald-500 dark:text-emerald-400">Sync</span>
          </span>
        </div>

        {/* Action Controls & Profile info */}
        <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6">
          {/* Connection status indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {isOnline ? (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 font-medium animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
                <span className="sm:hidden">Offline</span>
              </div>
            )}

            {/* Offline queue indicator */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-xs text-sky-400 font-medium">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{pendingCount} Pending Sync</span>
                <span className="sm:hidden">{pendingCount} Pending</span>
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-xl transition-all duration-300 outline-none cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 h-5 text-indigo-500" />
            )}
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2 sm:gap-3 border-l border-[var(--border-subtle)] pl-3 sm:pl-4 md:pl-6">
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-8 h-8 sm:w-9 h-9 rounded-full border border-[var(--border-subtle)] object-cover bg-[var(--surface-elevated)]"
            />
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">{user.email}</p>
            </div>
            
            {/* Logout Trigger */}
            <button 
              onClick={logout}
              className="p-1.5 sm:p-2 ml-1 sm:ml-2 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 rounded-xl transition-all outline-none cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
