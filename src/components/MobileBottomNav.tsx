import React from "react";
import {
  Home,
  Compass,
  Sparkles,
  Video,
  FolderHeart,
} from "lucide-react";

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onOpenAIModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenAIModal,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800/90 pb-safe transition-all shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-5 items-center h-14 px-1">
        {/* Home */}
        <button
          onClick={() => onNavigate("home")}
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
            currentView === "home"
              ? "text-red-500 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
          aria-label="Home"
        >
          <Home className={`w-5 h-5 ${currentView === "home" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="truncate">Home</span>
        </button>

        {/* Explore / Trending */}
        <button
          onClick={() => onNavigate("home")}
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
            currentView === "explore"
              ? "text-red-500 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
          aria-label="Explore"
        >
          <Compass className={`w-5 h-5 ${currentView === "explore" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="truncate">Explore</span>
        </button>

        {/* Gemini AI Floating Center Item */}
        <button
          onClick={onOpenAIModal}
          className="flex flex-col items-center justify-center py-1 gap-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 transition-transform active:scale-95 cursor-pointer"
          aria-label="Gemini AI Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <span className="truncate text-amber-300">Gemini</span>
        </button>

        {/* My Channel Studio */}
        <button
          onClick={() => onNavigate("channel")}
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
            currentView === "channel"
              ? "text-red-500 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
          aria-label="My Channel"
        >
          <Video className={`w-5 h-5 ${currentView === "channel" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="truncate">Studio</span>
        </button>

        {/* Library */}
        <button
          onClick={() => onNavigate("library")}
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
            currentView === "library" || currentView === "history" || currentView === "liked"
              ? "text-red-500 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
          aria-label="Library"
        >
          <FolderHeart className={`w-5 h-5 ${currentView === "library" || currentView === "history" || currentView === "liked" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="truncate">Library</span>
        </button>
      </div>
    </nav>
  );
};
