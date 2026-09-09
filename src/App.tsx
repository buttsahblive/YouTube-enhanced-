import React, { useState, useEffect } from "react";
import { Video } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CategoryChips } from "./components/CategoryChips";
import { VideoCard } from "./components/VideoCard";
import { PlayerView } from "./components/PlayerView";
import { LibraryView } from "./components/LibraryView";
import { ChannelStudioView } from "./components/ChannelStudioView";
import { MiniPlayer } from "./components/MiniPlayer";
import { AuthModal } from "./components/AuthModal";
import { AIAssistantModal } from "./components/AIAssistantModal";
import { SearchConsoleModal } from "./components/SearchConsoleModal";
import { loadVideos, getLocalFallbackVideos } from "./services/videoService";
import { initAuth, googleSignIn, logout, setCachedAccessToken } from "./services/googleAuth";
import {
  testFirestoreConnection,
  saveLibraryItemToFirestore,
  removeLibraryItemFromFirestore,
  fetchUserLibraryFromFirestore,
  subscribeToUserProfile,
  clearUserLibraryInFirestore,
  incrementUserVideoWatchStats,
} from "./services/db";
import { User } from "firebase/auth";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Compass,
  X,
  Bot,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Coding & Tech",
  "Music",
  "Education",
  "Gaming",
  "AI & Machine Learning",
  "Podcasts",
  "News",
  "Trending",
];

export default function App() {
  // Navigation & View
  const [currentView, setCurrentView] = useState<
    "home" | "player" | "history" | "liked" | "library" | "channel"
  >("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Videos & Search
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);

  // User Library (Persisted in localStorage & Firestore)
  const [history, setHistory] = useState<Video[]>(() => {
    const saved = localStorage.getItem("yt_enhanced_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [likedVideos, setLikedVideos] = useState<Video[]>(() => {
    const saved = localStorage.getItem("yt_enhanced_liked");
    return saved ? JSON.parse(saved) : [];
  });

  const [watchLater, setWatchLater] = useState<Video[]>(() => {
    const saved = localStorage.getItem("yt_enhanced_watchlater");
    return saved ? JSON.parse(saved) : [];
  });

  // Auth & Database State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [, setIsDbConnected] = useState(false);

  // Floating Mini-Player State
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  // Gemini AI Studio & Search Console Modals
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSearchConsoleModalOpen, setIsSearchConsoleModalOpen] = useState(false);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("yt_enhanced_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("yt_enhanced_liked", JSON.stringify(likedVideos));
  }, [likedVideos]);

  useEffect(() => {
    localStorage.setItem("yt_enhanced_watchlater", JSON.stringify(watchLater));
  }, [watchLater]);

  // Test Firestore Connection on mount
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setIsDbConnected(connected);
    });
  }, []);

  // Sync user data with Firestore when authenticated
  useEffect(() => {
    if (!user?.uid) return;

    // Listen to real-time user profile stored in Firestore
    const unsubProfile = subscribeToUserProfile(user.uid, (profile) => {
      if (profile?.preferences?.preferredCategory) {
        setSelectedCategory((curr) => (curr === "All" ? profile.preferences!.preferredCategory! : curr));
      }
    });

    // Sync History from Firestore
    fetchUserLibraryFromFirestore(user.uid, "history").then((cloudHistory) => {
      if (cloudHistory && cloudHistory.length > 0) {
        setHistory((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newHistory = cloudHistory.filter((v) => !existingIds.has(v.id));
          return [...prev, ...newHistory];
        });
      }
    });

    // Sync Liked videos from Firestore
    fetchUserLibraryFromFirestore(user.uid, "liked").then((cloudLiked) => {
      if (cloudLiked && cloudLiked.length > 0) {
        setLikedVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newLiked = cloudLiked.filter((v) => !existingIds.has(v.id));
          return [...prev, ...newLiked];
        });
      }
    });

    // Sync Watch Later from Firestore
    fetchUserLibraryFromFirestore(user.uid, "watchlater").then((cloudWl) => {
      if (cloudWl && cloudWl.length > 0) {
        setWatchLater((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newWl = cloudWl.filter((v) => !existingIds.has(v.id));
          return [...prev, ...newWl];
        });
      }
    });

    return () => {
      if (typeof unsubProfile === "function") unsubProfile();
    };
  }, [user?.uid]);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setCachedAccessToken(token);
      },
      () => {
        // Not signed in or no token cached
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Fetch Videos (Trending or Category) with triple fallback (API -> Direct -> Curated)
  const fetchVideos = async (cat: string, query?: string) => {
    setIsLoadingVideos(true);
    try {
      const videoList = await loadVideos(cat, query);
      if (videoList && Array.isArray(videoList) && videoList.length > 0) {
        setVideos(videoList);
      } else {
        setVideos(getLocalFallbackVideos(cat, query));
      }
    } catch (err) {
      console.error("Failed to load videos:", err);
      setVideos(getLocalFallbackVideos(cat, query));
    } finally {
      setIsLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos(selectedCategory, searchQuery);
  }, [selectedCategory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentView("home");
    fetchVideos(selectedCategory, query);
  };

  // Select Video to Play
  const handleSelectVideo = (video: Video) => {
    setCurrentVideo(video);
    setCurrentView("player");
    setShowMiniPlayer(false);

    // Add to history (avoid duplicates at the top)
    setHistory((prev) => {
      const filtered = prev.filter((v) => v.id !== video.id);
      return [video, ...filtered].slice(0, 50);
    });

    if (user?.uid) {
      saveLibraryItemToFirestore(user.uid, "history", video);
      incrementUserVideoWatchStats(user.uid, video.title, likedVideos.length, watchLater.length);
    }
  };

  // Clear Watch History locally and in Firestore
  const handleClearHistory = async () => {
    setHistory([]);
    if (user?.uid) {
      await clearUserLibraryInFirestore(user.uid, "history");
    }
  };

  // Toggle Like
  const handleToggleLike = (video: Video, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedVideos((prev) => {
      const exists = prev.some((v) => v.id === video.id);
      if (exists) {
        if (user?.uid) removeLibraryItemFromFirestore(user.uid, "liked", video.id);
        return prev.filter((v) => v.id !== video.id);
      } else {
        if (user?.uid) saveLibraryItemToFirestore(user.uid, "liked", video);
        return [video, ...prev];
      }
    });
  };

  // Toggle Watch Later
  const handleToggleWatchLater = (video: Video, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchLater((prev) => {
      const exists = prev.some((v) => v.id === video.id);
      if (exists) {
        if (user?.uid) removeLibraryItemFromFirestore(user.uid, "watchlater", video.id);
        return prev.filter((v) => v.id !== video.id);
      } else {
        if (user?.uid) saveLibraryItemToFirestore(user.uid, "watchlater", video);
        return [video, ...prev];
      }
    });
  };

  // Login handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setCachedAccessToken(res.accessToken);
        setAuthError(null);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      if (!err?.message?.includes("closed before completing")) {
        setAuthError(err?.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAuthError(null);
  };

  // Navigation handler
  const handleNavigate = (view: typeof currentView) => {
    if (currentView === "player" && view !== "player" && currentVideo) {
      setShowMiniPlayer(true);
    }
    setCurrentView(view);
  };

  const isLiked = (vidId: string) => likedVideos.some((v) => v.id === vidId);
  const isWatchLater = (vidId: string) => watchLater.some((v) => v.id === vidId);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Navigation Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onNavigate={handleNavigate}
        currentView={currentView}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenSearchConsole={() => setIsSearchConsoleModalOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          activeView={currentView}
          onNavigate={handleNavigate}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setSearchQuery("");
          }}
          likedCount={likedVideos.length}
          historyCount={history.length}
          onOpenAIModal={() => setIsAIModalOpen(true)}
          onOpenSearchConsole={() => setIsSearchConsoleModalOpen(true)}
        />

        {/* Dynamic Center Stage */}
        <main className="flex-1 overflow-y-auto bg-stone-950 flex flex-col">
          {authError && (
            <div className="w-full max-w-7xl mx-auto px-4 pt-3">
              <div className="bg-red-950/80 border border-red-800/80 text-red-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-lg animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{authError}</span>
                </div>
                <button
                  onClick={() => setAuthError(null)}
                  className="p-1 hover:bg-red-900/50 rounded-lg text-red-300 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Home / Search Feed */}
          {currentView === "home" && (
            <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-4">
              {/* Category Chips Bar */}
              <CategoryChips
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setSearchQuery("");
                }}
              />

              {/* Extra Feature Spotlight Banner */}
              <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-850 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>YouTube Studio & Gemini AI Edition</span>
                      <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-full font-semibold">
                        Gemini Powered
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      High-definition YouTube playback, intelligent Gemini AI question answering, and integrated YouTube Channel Studio.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavigate("channel")}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow"
                  >
                    <span>My Channel</span>
                  </button>

                  <button
                    onClick={() => setIsAIModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-600/40 flex items-center gap-1.5 transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gemini AI Assistant</span>
                  </button>
                </div>
              </div>

              {/* Videos Feed Header */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-base font-bold text-stone-200 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-red-500" />
                  <span>
                    {searchQuery
                      ? `Search results for "${searchQuery}"`
                      : selectedCategory === "All"
                      ? "Recommended & Trending"
                      : `${selectedCategory} Videos`}
                  </span>
                </h2>
                <span className="text-xs text-stone-500">
                  {videos.length} videos available
                </span>
              </div>

              {/* Video Grid */}
              {isLoadingVideos ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-400">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <p className="text-xs font-medium">Fetching YouTube videos...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-16 bg-stone-900/40 border border-stone-800 rounded-2xl p-8">
                  <AlertCircle className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-stone-300">
                    No videos found
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Try searching for another topic or select "All".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onSelectVideo={handleSelectVideo}
                      isLiked={isLiked(video.id)}
                      isWatchLater={isWatchLater(video.id)}
                      onToggleLike={handleToggleLike}
                      onToggleWatchLater={handleToggleWatchLater}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: Active Video Player */}
          {currentView === "player" && currentVideo && (
            <PlayerView
              video={currentVideo}
              relatedVideos={videos.filter((v) => v.id !== currentVideo.id).slice(0, 10)}
              onSelectVideo={handleSelectVideo}
              isLiked={isLiked(currentVideo.id)}
              onToggleLike={() => handleToggleLike(currentVideo)}
              isWatchLater={isWatchLater(currentVideo.id)}
              onToggleWatchLater={() => handleToggleWatchLater(currentVideo)}
            />
          )}

          {/* VIEW: Channel Studio (My Channel, Videos & Upload) */}
          {currentView === "channel" && (
            <ChannelStudioView
              user={user}
              onLogin={handleLogin}
              isLoggingIn={isLoggingIn}
              onSelectVideo={handleSelectVideo}
            />
          )}

          {/* VIEW: Library / History / Liked */}
          {(currentView === "history" ||
            currentView === "liked" ||
            currentView === "library") && (
            <LibraryView
              history={history}
              likedVideos={likedVideos}
              watchLater={watchLater}
              onSelectVideo={handleSelectVideo}
              onClearHistory={handleClearHistory}
              initialTab={
                currentView === "liked"
                  ? "liked"
                  : currentView === "history"
                  ? "history"
                  : "watch-later"
              }
            />
          )}
        </main>
      </div>

      {/* Floating Picture-in-Picture Mini-Player when navigating outside player */}
      {showMiniPlayer && currentVideo && currentView !== "player" && (
        <MiniPlayer
          video={currentVideo}
          onExpand={() => {
            setCurrentView("player");
            setShowMiniPlayer(false);
          }}
          onClose={() => setShowMiniPlayer(false)}
        />
      )}

      {/* User Account & Database Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onAuthSuccess={(u) => {
          setUser(u);
          setIsAuthModalOpen(false);
        }}
        likedCount={likedVideos.length}
        historyCount={history.length}
        watchLaterCount={watchLater.length}
      />

      {/* Gemini AI Studio Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        currentVideo={currentVideo}
      />

      {/* Google Search Console Owner Verification Modal */}
      <SearchConsoleModal
        isOpen={isSearchConsoleModalOpen}
        onClose={() => setIsSearchConsoleModalOpen(false)}
      />
    </div>
  );
}
