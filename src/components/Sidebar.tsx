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
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeView: string;
  onNavigate: (view: any) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  likedCount: number;
  historyCount: number;
  onOpenAIModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  selectedCategory,
  onSelectCategory,
  likedCount,
  historyCount,
  onOpenAIModal,
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

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    if (onClose) onClose();
  };

  const handleCategoryClick = (catId: string) => {
    onSelectCategory(catId);
    if (onClose) onClose();
  };

  const renderSidebarContent = (isDrawer = false) => (
    <>
      {/* Drawer Header if Mobile */}
      {isDrawer && (
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 200 142"
              className="w-7 h-5 filter drop-shadow-sm"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#00A2E8"
                d="M196.4 22.8c-2.3-8.6-9.1-15.4-17.7-17.7C163.1 0 100 0 100 0S36.9 0 21.3 5.1C12.7 7.4 5.9 14.2 3.6 22.8 0 38.4 0 71 0 71s0 32.6 3.6 48.2c2.3 8.6 9.1 15.4 17.7 17.7C36.9 142 100 142 100 142s63.1 0 78.7-5.1c8.6-2.3 15.4-9.1 17.7-17.7 3.6-15.6 3.6-48.2 3.6-48.2s0-32.6-3.6-48.2z"
              />
              <polygon fill="#FFFFFF" points="80,43 130,71 80,99" />
            </svg>
            <span className="font-bold text-base text-white">YouTube Enhanced</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Section */}
      <div className="px-3 py-2 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-stone-800 text-white font-semibold"
                  : "text-stone-300 hover:bg-stone-800/60 hover:text-white"
              } ${item.highlight ? "border border-red-500/20 bg-red-950/20 text-red-300" : ""}`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive || item.highlight ? "text-red-500" : "text-stone-400"
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="my-2 border-t border-stone-800/80" />

      {/* AI Assistant Section */}
      {onOpenAIModal && (
        <>
          <div className="px-3">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              <span>AI Companion</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <div className="space-y-1 mt-1">
              <button
                onClick={() => {
                  onOpenAIModal();
                  if (onClose) onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 border border-amber-800/30 bg-amber-950/20 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Gemini AI Studio</span>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                  AI
                </span>
              </button>
            </div>
          </div>
          <div className="my-2 border-t border-stone-800/80" />
        </>
      )}

      {/* Explore / Top Categories */}
      <div className="px-3">
        <div className="px-3 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
          Explore
        </div>
        <div className="space-y-1 mt-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-stone-800 text-white font-semibold"
                    : "text-stone-300 hover:bg-stone-800/60 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isSelected ? "text-red-500" : "text-stone-400"
                  }`}
                />
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="my-2 border-t border-stone-800/80" />

      {/* Library / Personal */}
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
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
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
      <div className="mt-auto px-4 pt-4 pb-2 border-t border-stone-800 text-xs text-stone-500">
        <p className="text-[11px] leading-relaxed">
          YouTube Enhanced Studio Edition
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Slide-Over Drawer (when isOpen is true on mobile) */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Dark Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-out Panel */}
        <aside
          className={`absolute top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-stone-900 border-r border-stone-800 flex flex-col py-2 shrink-0 overflow-y-auto touch-momentum z-50 select-none shadow-2xl transform transition-transform duration-200 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>

      {/* Desktop Sidebar */}
      {!isOpen ? (
        // Mini icon sidebar on desktop only
        <aside className="hidden md:flex w-16 bg-stone-900 border-r border-stone-800 flex-col items-center py-4 gap-6 shrink-0 z-30 select-none">
          <button
            onClick={() => onNavigate("home")}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
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
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
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
              className="p-2.5 rounded-xl transition-colors text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 cursor-pointer"
              title="Gemini AI Studio"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => onNavigate("history")}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              activeView === "history"
                ? "bg-red-600/20 text-red-400"
                : "text-stone-400 hover:text-white hover:bg-stone-800"
            }`}
            title="History"
          >
            <Clock className="w-5 h-5" />
          </button>
        </aside>
      ) : (
        // Expanded sidebar on desktop
        <aside className="hidden md:flex w-60 bg-stone-900 border-r border-stone-800 flex-col py-3 shrink-0 overflow-y-auto z-30 select-none">
          {renderSidebarContent(false)}
        </aside>
      )}
    </>
  );
};
