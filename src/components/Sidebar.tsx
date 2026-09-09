import React from "react";
import {
  Home,
  Compass,
  Clock,
  ThumbsUp,
  Sparkles,
  Code,
  Music2,
  GraduationCap,
  Gamepad2,
  FolderHeart,
  Video,
  Globe,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  activeView: string;
  onNavigate: (view: any) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  likedCount: number;
  historyCount: number;
  onOpenAIModal?: () => void;
  onOpenSearchConsole?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeView,
  onNavigate,
  selectedCategory,
  onSelectCategory,
  likedCount,
  historyCount,
  onOpenAIModal,
  onOpenSearchConsole,
}) => {
  const mainNav = [
    { id: "home", label: "Home", icon: Home },
    { id: "channel", label: "My Channel Studio", icon: Video, highlight: true },
    { id: "explore", label: "Trending & Explore", icon: Compass },
  ];

  const categories = [
    { id: "Coding & Tech", label: "Coding & Tech", icon: Code },
    { id: "Music", label: "Music", icon: Music2 },
    { id: "Education", label: "Education & Science", icon: GraduationCap },
    { id: "Gaming", label: "Gaming", icon: Gamepad2 },
  ];

  const personalNav = [
    { id: "history", label: "Watch History", icon: Clock, count: historyCount },
    { id: "liked", label: "Liked Videos", icon: ThumbsUp, count: likedCount },
    { id: "library", label: "Full Library", icon: FolderHeart },
  ];

  if (!isOpen) {
    // Mini icon sidebar
    return (
      <aside className="w-16 bg-stone-900 border-r border-stone-800 flex flex-col items-center py-4 gap-6 shrink-0 z-30 select-none">
        <button
          onClick={() => onNavigate("home")}
          className={`p-2.5 rounded-xl transition-colors ${
            activeView === "home"
              ? "bg-red-600/20 text-red-400"
              : "text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
          title="Home"
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavigate("channel")}
          className={`p-2.5 rounded-xl transition-colors ${
            activeView === "channel"
              ? "bg-red-600/20 text-red-400"
              : "text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
          title="My YouTube Channel Studio"
        >
          <Video className="w-5 h-5" />
        </button>

        {onOpenAIModal && (
          <button
            onClick={onOpenAIModal}
            className="p-2.5 rounded-xl transition-colors text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
            title="Gemini AI Studio"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        )}

        {onOpenSearchConsole && (
          <button
            onClick={onOpenSearchConsole}
            className="p-2.5 rounded-xl transition-colors text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
            title="Search Console Owner Verification"
          >
            <Globe className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => onNavigate("history")}
          className={`p-2.5 rounded-xl transition-colors ${
            activeView === "history"
              ? "bg-red-600/20 text-red-400"
              : "text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
          title="History"
        >
          <Clock className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-60 bg-stone-900 border-r border-stone-800 flex flex-col py-3 shrink-0 overflow-y-auto z-30 select-none">
      {/* Main Section */}
      <div className="px-3 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-800 text-white font-semibold"
                  : "text-stone-300 hover:bg-stone-800/60 hover:text-white"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-red-500" : "text-stone-400"
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="my-3 border-t border-stone-800/80" />

      {/* AI & Google Services */}
      {(onOpenAIModal || onOpenSearchConsole) && (
        <>
          <div className="px-3">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              <span>AI & Tools</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <div className="space-y-1 mt-1">
              {onOpenAIModal && (
                <button
                  onClick={onOpenAIModal}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 border border-amber-800/30 bg-amber-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Gemini AI Studio</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                    AI
                  </span>
                </button>
              )}

              {onOpenSearchConsole && (
                <button
                  onClick={onOpenSearchConsole}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-blue-300 hover:bg-blue-950/40 hover:text-blue-200 border border-blue-800/30 bg-blue-950/20 mt-1"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>Search Console</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    SEO
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="my-3 border-t border-stone-800/80" />
        </>
      )}

      {/* Explore Topics */}
      <div className="px-3">
        <div className="px-3 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
          Explore Topics
        </div>
        <div className="space-y-1 mt-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onNavigate("home");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-stone-800 text-white font-medium"
                    : "text-stone-400 hover:bg-stone-800/60 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 text-stone-400" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="my-3 border-t border-stone-800/80" />

      {/* Library Section */}
      <div className="px-3">
        <div className="px-3 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
          Library
        </div>
        <div className="space-y-1 mt-1">
          {personalNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-stone-800 text-white font-semibold"
                    : "text-stone-300 hover:bg-stone-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-red-500" : "text-stone-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[11px] text-stone-500 font-medium">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto px-4 pt-4 border-t border-stone-800 text-xs text-stone-500">
        <p className="text-[11px] leading-relaxed">
          YouTube Enhanced Studio Edition
        </p>
      </div>
    </aside>
  );
};
