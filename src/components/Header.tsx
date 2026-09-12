import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Sparkles,
  LogOut,
  X,
  User as UserIcon,
  Database,
  ArrowLeft,
  Video,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { User } from "firebase/auth";
import { useIsRunningInApp } from "../utils/appDetection";

interface HeaderProps {
  onToggleSidebar: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onNavigate: (view: any) => void;
  currentView: string;
  onOpenAuthModal?: () => void;
  onOpenAIModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onSearch,
  searchQuery,
  setSearchQuery,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onNavigate,
  currentView,
  onOpenAuthModal,
  onOpenAIModal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const isRunningInApp = useIsRunningInApp();

  useEffect(() => {
    if (isMobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setIsMobileSearchOpen(false);
    }
  };

  return (
    <header className="shrink-0 z-40 bg-stone-900/95 backdrop-blur-md text-stone-100 border-b border-stone-800 px-3 sm:px-4 py-2 sm:py-2.5">
      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen ? (
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 w-full animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(false)}
            className="p-2 -ml-1 text-stone-300 hover:text-white rounded-full hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Back to main header"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search YouTube..."
              className="w-full bg-stone-950 border border-stone-700 focus:border-red-500 rounded-full px-4 py-2 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  onSearch("");
                }}
                className="absolute right-3 p-1 text-stone-400 hover:text-stone-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow"
            title="Search"
            aria-label="Submit Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Hamburger & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              id="toggle-sidebar-btn"
              onClick={onToggleSidebar}
              className="p-2 rounded-full hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
              title="Toggle Navigation Menu"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              id="brand-logo-btn"
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            >
              {/* YouTube Cyan/Blue Badge Logo */}
              <div className="relative flex items-center justify-center transition-transform duration-150 group-hover:scale-105 shrink-0">
                <svg
                  viewBox="0 0 200 142"
                  className="w-7 h-5 sm:w-8 sm:h-6 filter drop-shadow-sm transition-opacity group-hover:opacity-90"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#00A2E8"
                    d="M196.4 22.8c-2.3-8.6-9.1-15.4-17.7-17.7C163.1 0 100 0 100 0S36.9 0 21.3 5.1C12.7 7.4 5.9 14.2 3.6 22.8 0 38.4 0 71 0 71s0 32.6 3.6 48.2c2.3 8.6 9.1 15.4 17.7 17.7C36.9 142 100 142 100 142s63.1 0 78.7-5.1c8.6-2.3 15.4-9.1 17.7-17.7 3.6-15.6 3.6-48.2 3.6-48.2s0-32.6-3.6-48.2z"
                  />
                  <polygon fill="#FFFFFF" points="80,43 130,71 80,99" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tighter text-white">YouTube</span>
                <span className="hidden sm:inline bg-sky-950/80 text-sky-400 border border-sky-700/60 text-[9px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.2 rounded tracking-wide uppercase">
                  Enhanced
                </span>
              </div>
            </button>
          </div>

          {/* Center: Search Bar (Desktop / Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:flex flex-1 max-w-xl mx-2 items-center"
          >
            <div className="relative w-full flex items-center">
              <input
                id="main-video-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search YouTube videos..."
                className="w-full bg-stone-950 border border-stone-700 focus:border-red-500 rounded-l-full px-4 py-2 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    onSearch("");
                  }}
                  className="absolute right-3 text-stone-400 hover:text-stone-200"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              id="submit-search-btn"
              type="submit"
              className="bg-stone-800 hover:bg-stone-700 border border-l-0 border-stone-700 rounded-r-full px-4 sm:px-5 py-2 text-stone-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              title="Search"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Right: Actions & Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Search Trigger Button */}
            <button
              id="mobile-search-trigger-btn"
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="sm:hidden p-2 rounded-full text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Search"
              aria-label="Open Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* My Channel Studio quick button (compact on mobile) */}
            <button
              id="nav-channel-studio-btn"
              onClick={() => onNavigate("channel")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                currentView === "channel"
                  ? "bg-red-600 text-white border-red-500 shadow-md"
                  : "bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/50"
              }`}
              title="Open YouTube Channel Studio"
            >
              <Video className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">My Channel</span>
            </button>

            {/* Gemini AI Studio Button */}
            <button
              id="nav-gemini-ai-btn"
              onClick={onOpenAIModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-full border bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 transition-all shadow-sm cursor-pointer"
              title="Open Gemini AI Video Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Gemini AI</span>
            </button>

            {/* Download Android App Button (Hidden if already using the app) */}
            {!isRunningInApp && (
              <a
                id="nav-download-app-btn"
                href="https://apkpure.com/p/app.youpro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-full border bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:border-emerald-400/60 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                title="Download Android App APK (YouPro on APKPure)"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Download App</span>
                <span className="sm:hidden">App</span>
              </a>
            )}

            {/* Auth Section */}
            {user ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-red-500/50 focus:outline-none transition-all cursor-pointer"
                  aria-label="User Account Menu"
                >
                  <img
                    src={
                      user.photoURL ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    }
                    alt={user.displayName || "User"}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-stone-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-stone-800">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.displayName || "Google Account"}
                      </p>
                      <p className="text-xs text-stone-400 truncate">{user.email}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-400 bg-red-950/50 border border-red-800/40 rounded px-2 py-0.5">
                        <Video className="w-3 h-3 text-red-400" />
                        <span>YouTube Account Connected</span>
                      </div>
                    </div>

                    {!isRunningInApp && (
                      <a
                        href="https://apkpure.com/p/app.youpro"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-2.5 text-left text-xs text-emerald-300 hover:bg-stone-800 flex items-center justify-between font-medium border-b border-stone-800/80 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                          <span>Download Android App (APK)</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-stone-200 hover:bg-stone-800 flex items-center gap-2 font-medium border-b border-stone-800/80 cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Account & DB Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate("channel");
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-stone-800 flex items-center gap-2 font-semibold cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-red-500" />
                      <span>My YouTube Channel Studio</span>
                    </button>

                    <button
                      id="sign-out-btn"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-stone-800 flex items-center gap-2 border-t border-stone-800 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="account-signin-btn"
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal();
                  else onLogin();
                }}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                title="Sign in or create account"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isLoggingIn ? "Signing In..." : "Sign in"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
