import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Video } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CategoryChips } from "./components/CategoryChips";
import { VideoCard } from "./components/VideoCard";
import { PlayerView } from "./components/PlayerView";
import { LibraryView } from "./components/LibraryView";
import { ChannelStudioView } from "./components/ChannelStudioView";
import { MiniPlayer } from "./components/MiniPlayer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { AuthModal } from "./components/AuthModal";
import { AIAssistantModal } from "./components/AIAssistantModal";
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
  Copy,
  Check,
  ExternalLink,
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
  const [copiedAuthDomain, setCopiedAuthDomain] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [, setIsDbConnected] = useState(false);

  // Floating Mini-Player State
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  // Gemini AI Studio Assistant Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentView("home");
    fetchVideos(selectedCategory, query);
  }, [selectedCategory]);

  // Select Video to Play
  const handleSelectVideo = useCallback((video: Video) => {
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
  }, [user?.uid, likedVideos.length, watchLater.length]);

  // Clear Watch History locally and in Firestore
  const handleClearHistory = useCallback(async () => {
    setHistory([]);
    if (user?.uid) {
      await clearUserLibraryInFirestore(user.uid, "history");
    }
  }, [user?.uid]);

  // Toggle Like
  const handleToggleLike = useCallback((video: Video, e?: React.MouseEvent) => {
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
  }, [user?.uid]);

  // Toggle Watch Later
  const handleToggleWatchLater = useCallback((video: Video, e?: React.MouseEvent) => {
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
  }, [user?.uid]);

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
  const handleNavigate = useCallback((view: typeof currentView) => {
    if (currentView === "player" && view !== "player" && currentVideo) {
      setShowMiniPlayer(true);
    }
    setCurrentView(view);
  }, [currentView, currentVideo]);

  // Instant O(1) set lookups for scroll performance
  const likedSet = useMemo(() => new Set(likedVideos.map((v) => v.id)), [likedVideos]);
  const watchLaterSet = useMemo(() => new Set(watchLater.map((v) => v.id)), [watchLater]);
  const isLiked = useCallback((vidId: string) => likedSet.has(vidId), [likedSet]);
  const isWatchLater = useCallback((vidId: string) => watchLaterSet.has(vidId), [watchLaterSet]);


  return (
    <div className="h-full h-[100dvh] bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-red-500 selection:text-white overflow-hidden">
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
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
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
        />

        {/* Dynamic Center Stage */}
        <main
          id="main-scroll-container"
          className="flex-1 min-h-0 overflow-y-auto bg-stone-950 flex flex-col pb-24 md:pb-8 touch-momentum"
        >
          {authError && (
            <div className="w-full max-w-7xl mx-auto px-4 pt-3">
              {authError.includes("unauthorized-domain") ? (
                <div className="bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs p-4 rounded-2xl shadow-xl animate-fade-in space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Firebase Authorization Required: Add Vercel Domain</span>
                    </div>
                    <button
                      onClick={() => setAuthError(null)}
                      className="p-1 hover:bg-amber-900/50 rounded-lg text-amber-400 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Firebase blocks Google Sign-In popups on new domains until they are whitelisted. Add your current deployment domain to your Firebase project authorized domains list.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(window.location.hostname);
                          setCopiedAuthDomain(true);
                          setTimeout(() => setCopiedAuthDomain(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-900/90 hover:bg-amber-800 border border-amber-700/60 rounded-lg text-[11px] font-semibold text-amber-100 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedAuthDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAuthDomain ? "Domain Copied!" : `Copy: ${typeof window !== "undefined" ? window.location.hostname : "Domain"}`}</span>
                    </button>

                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0124649179/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-[11px] font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Open Firebase Authorized Domains</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => {
                        setAuthError(null);
                        setIsAuthModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-[11px] font-medium text-stone-200 transition-colors"
                    >
                      Sign in with Email &amp; Password instead
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* VIEW: Home / Search Feed */}
          {currentView === "home" && (
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4">
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
              <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-850 border border-stone-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>YouTube Studio & Gemini AI Edition</span>
                      <span className="text-[9px] sm:text-[10px] bg-amber-950 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-full font-semibold">
                        Gemini Powered
                      </span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 leading-relaxed">
                      High-definition YouTube playback, direct MP4 & MP3 downloads to your Files app, and Gemini AI assistant.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => handleNavigate("channel")}
                    className="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow cursor-pointer"
                  >
                    <span>My Channel</span>
                  </button>

                  <button
                    onClick={() => setIsAIModalOpen(true)}
                    className="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-600/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gemini AI</span>
                  </button>
                </div>
              </div>

              {/* Videos Feed Header */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm sm:text-base font-bold text-stone-200 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-red-500" />
                  <span className="truncate">
                    {searchQuery
                      ? `Results for "${searchQuery}"`
                      : selectedCategory === "All"
                      ? "Recommended & Trending"
                      : `${selectedCategory} Videos`}
                  </span>
                </h2>
                <span className="text-xs text-stone-500 shrink-0">
                  {videos.length} videos
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
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
              user={user}
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

      {/* Mobile Bottom Navigation Bar (Docked on phones) */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAIModal={() => setIsAIModalOpen(true)}
      />
    </div>
  );
}
