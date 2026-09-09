import React, { useState } from "react";
import {
  Search,
  X,
  Menu,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  Video,
  Upload,
  User as UserIcon,
  Database,
  Globe,
} from "lucide-react";
import { User } from "firebase/auth";

interface HeaderProps {
  onToggleSidebar: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onNavigate: (view: "home" | "library" | "channel") => void;
  currentView: string;
  onOpenAuthModal?: () => void;
  onOpenAIModal?: () => void;
  onOpenSearchConsole?: () => void;
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
  onOpenSearchConsole,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between gap-4">
      {/* Left: Hamburger & Brand Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-2 rounded-full hover:bg-stone-800 text-stone-300 transition-colors"
          title="Toggle Navigation"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          id="brand-logo-btn"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 group cursor-pointer focus:outline-none"
        >
          {/* YouTube red badge */}
          <div className="w-8 h-6 bg-red-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-red-500 transition-colors">
            <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-lg tracking-tighter text-white">YouTube</span>
            <span className="bg-red-950/80 text-red-400 border border-red-800/60 text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase">
              Enhanced
            </span>
          </div>
        </button>
      </div>

      {/* Center: Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex-1 max-w-xl mx-2 flex items-center"
      >
        <div className="relative w-full flex items-center">
          <input
            id="main-video-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search YouTube videos instantly..."
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
          className="bg-stone-800 hover:bg-stone-700 border border-l-0 border-stone-700 rounded-r-full px-5 py-2 text-stone-300 hover:text-white transition-colors flex items-center justify-center"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* Right: Actions & Auth */}
      <div className="flex items-center gap-2 shrink-0">
        {/* My Channel Studio quick button */}
        <button
          id="nav-channel-studio-btn"
          onClick={() => onNavigate("channel")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
            currentView === "channel"
              ? "bg-red-600 text-white border-red-500 shadow-md"
              : "bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/50"
          }`}
          title="Open YouTube Channel Studio & Uploads"
        >
          <Video className="w-3.5 h-3.5 text-red-400" />
          <span>My Channel</span>
        </button>

        {/* Gemini AI Studio Button */}
        <button
          id="nav-gemini-ai-btn"
          onClick={onOpenAIModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 transition-all shadow-sm"
          title="Open Gemini AI Studio (Video Assistant & Creator SEO)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Gemini AI</span>
        </button>

        {/* Search Console Owner Verify Button */}
        <button
          id="nav-search-console-btn"
          onClick={onOpenSearchConsole}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30 transition-all"
          title="Google Search Console Owner Verification"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>GSC Verify</span>
        </button>


        {/* Auth Section */}
        {user ? (
          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-red-500/50 focus:outline-none transition-all"
            >
              <img
                src={
                  user.photoURL ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                }
                alt={user.displayName || "User"}
                className="w-8 h-8 rounded-full border border-stone-700 object-cover"
                referrerPolicy="no-referrer"
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl py-2 z-50">
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

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-stone-200 hover:bg-stone-800 flex items-center gap-2 font-medium border-b border-stone-800/80"
                >
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Account & DB Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate("channel");
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-stone-800 flex items-center gap-2 font-semibold"
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
                  className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-stone-800 flex items-center gap-2 border-t border-stone-800"
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
            className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            title="Sign in or create account with password and information"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isLoggingIn ? "Signing In..." : "Sign in / Account"}</span>
          </button>
        )}
      </div>
    </header>
  );
};
