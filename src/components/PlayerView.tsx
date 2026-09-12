import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { Video, VideoComment, AISummary, AIQuizQuestion } from "../types";
import { loadVideoComments } from "../services/videoService";
import {
  saveVideoPlaybackProgress,
  getVideoPlaybackProgress,
} from "../services/db";
import {
  formatViews,
  formatPublishedDate,
  formatTime,
} from "../utils/formatters";
import {
  ThumbsUp,
  Share2,
  Clock,
  Sparkles,
  FastForward,
  Rewind,
  MessageSquare,
  Check,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Send,
  Bot,
  ExternalLink,
  Download,
  BookOpen,
  HelpCircle,
  Award,
  ListChecks,
  Copy,
  RotateCcw,
  Layers,
  FileText,
  Lightbulb,
  CheckCircle2,
  PlayCircle,
  Headphones,
  Music,
  Sun,
  SunMedium,
  Moon,
  Volume2,
  Volume1,
  VolumeX,
  Sliders,
  Maximize,
  Minimize,
  Battery,
  BatteryCharging,
} from "lucide-react";
import { DownloadModal } from "./DownloadModal";
import { AudioExtractorModal } from "./AudioExtractorModal";

interface PlayerViewProps {
  video: Video;
  relatedVideos: Video[];
  onSelectVideo: (video: Video) => void;
  isLiked: boolean;
  onToggleLike: (video: Video) => void;
  isWatchLater: boolean;
  onToggleWatchLater: (video: Video) => void;
  user?: User | null;
}

interface AIQnAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  video,
  relatedVideos,
  onSelectVideo,
  isLiked,
  onToggleLike,
  isWatchLater,
  onToggleWatchLater,
  user,
}) => {
  // Current playback tracking
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ai" | "comments">("ai");
  const [aiSubTab, setAiSubTab] = useState<"summary" | "qa" | "quiz" | "notes">("summary");

  // Playback resume indicator
  const [resumeNotice, setResumeNotice] = useState<{ seconds: number; visible: boolean } | null>(null);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [checkedActionItems, setCheckedActionItems] = useState<Record<number, boolean>>({});
  const [copiedSummary, setCopiedSummary] = useState(false);

  // AI Q&A State
  const [qnaList, setQnaList] = useState<AIQnAItem[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // AI Quiz State
  const [quizQuestions, setQuizQuestions] = useState<AIQuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Comments State
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  // Copy share feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Video download & Audio extractor modal states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showAudioExtractorModal, setShowAudioExtractorModal] = useState(false);

  // Custom Gesture Controls State (VLC / MX Player Style)
  const [gestureControlsActive, setGestureControlsActive] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(100);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gestureHud, setGestureHud] = useState<{
    type: "brightness" | "volume";
    value: number;
    visible: boolean;
  } | null>(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    side: "left" | "right";
    text: string;
  } | null>(null);
  const [showGestureGuide, setShowGestureGuide] = useState<boolean>(false);

  // System Clock & Fullscreen States (VLC / MX Player Landscape Clock)
  const [systemTime, setSystemTime] = useState<Date>(new Date());
  const [use24HourFormat, setUse24HourFormat] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isBatteryCharging, setIsBatteryCharging] = useState<boolean>(false);

  // Player & Gesture Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudTimeoutRef = useRef<any>(null);
  const tapTimeoutRef = useRef<any>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startVal: number;
    type: "brightness" | "volume";
    hasMoved: boolean;
  } | null>(null);

  // Real-time System Clock Interval (Updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);

    // Read Battery Status if supported by browser/device
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          const syncBattery = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsBatteryCharging(Boolean(battery.charging));
          };
          syncBattery();
          battery.addEventListener("levelchange", syncBattery);
          battery.addEventListener("chargingchange", syncBattery);
        })
        .catch(() => {});
    }

    // Detect Screen Orientation (Landscape vs Portrait)
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    const handleOrientation = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsLandscape(e.matches);
    };
    setIsLandscape(mediaQuery.matches);
    try {
      mediaQuery.addEventListener("change", handleOrientation as any);
    } catch {
      mediaQuery.addListener(handleOrientation as any);
    }

    // Fullscreen Change Listeners
    const handleFullscreenChange = () => {
      const isNowFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
      );
      setIsFullscreen(isNowFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      try {
        mediaQuery.removeEventListener("change", handleOrientation as any);
      } catch {
        mediaQuery.removeListener(handleOrientation as any);
      }
    };
  }, []);

  // Keyboard shortcut listener ('f' or 'F' to toggle fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA"].includes(targetTag)) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Auto-timer to simulate video playback progression if iframe API is sandboxed
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Check saved playback progress on video load (Firestore Sync)
  useEffect(() => {
    setCurrentTime(0);
    setAiSummary(null);
    setQnaList([]);
    setUserQuery("");
    setQuizQuestions([]);
    setSelectedQuizAnswers({});
    setShowQuizResults(false);
    setCheckedActionItems({});
    setResumeNotice(null);

    // Fetch saved resume timestamp from Firestore
    if (user?.uid && video.id) {
      getVideoPlaybackProgress(user.uid, video.id).then((savedSeconds) => {
        if (savedSeconds && savedSeconds > 5) {
          seekToSeconds(savedSeconds);
          setResumeNotice({ seconds: savedSeconds, visible: true });
          setTimeout(() => {
            setResumeNotice((prev) => (prev ? { ...prev, visible: false } : null));
          }, 8000);
        }
      });
    }

    setIsLoadingComments(true);
    loadVideoComments(video.id)
      .then((data) => {
        if (data && data.length > 0) {
          setComments(data);
        }
      })
      .catch((err) => console.error("Comments error:", err))
      .finally(() => setIsLoadingComments(false));
  }, [video.id, user?.uid]);

  // Real-time playback timestamp syncing to Firestore every 5 seconds
  useEffect(() => {
    if (!user?.uid || !video?.id) return;

    const syncInterval = setInterval(() => {
      if (isPlaying && currentTime > 4) {
        saveVideoPlaybackProgress(user.uid, video.id, currentTime, video.title);
      }
    }, 5000);

    return () => {
      clearInterval(syncInterval);
      if (currentTime > 4) {
        saveVideoPlaybackProgress(user.uid, video.id, currentTime, video.title);
      }
    };
  }, [user?.uid, video?.id, currentTime, isPlaying, video?.title]);

  // Seek video
  const seekToSeconds = (seconds: number) => {
    const target = Math.max(0, Math.floor(seconds));
    setCurrentTime(target);
    if (iframeRef.current) {
      iframeRef.current.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&start=${target}&enablejsapi=1`;
      setIsPlaying(true);
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    seekToSeconds(currentTime + deltaSeconds);
  };

  // YouTube IFrame API command dispatcher
  const sendIframeCommand = (func: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      }
    } catch (err) {
      console.warn("Iframe postMessage command error:", err);
    }
  };

  // On-screen HUD helper (VLC / MX Player style indicator)
  const showHud = (type: "brightness" | "volume", value: number) => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setGestureHud({ type, value, visible: true });
    hudTimeoutRef.current = setTimeout(() => {
      setGestureHud((prev) => (prev ? { ...prev, visible: false } : null));
    }, 1200);
  };

  // Adjust volume with real-time feedback
  const updateVolume = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setVolume(clamped);
    if (clamped === 0) {
      setIsMuted(true);
      sendIframeCommand("mute");
    } else {
      setIsMuted(false);
      sendIframeCommand("unMute");
      sendIframeCommand("setVolume", [clamped]);
    }
    showHud("volume", clamped);
  };

  // Adjust brightness with real-time feedback (range 20% to 150%)
  const updateBrightness = (newBri: number) => {
    const clamped = Math.max(20, Math.min(150, Math.round(newBri)));
    setBrightness(clamped);
    showHud("brightness", clamped);
  };

  // Pointer & Touch Handlers for custom gestures (VLC/MX Player)
  const handlePointerStart = (clientX: number, clientY: number) => {
    if (!gestureControlsActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const isLeftSide = relX < rect.width / 2;
    const gestureType: "brightness" | "volume" = isLeftSide ? "brightness" : "volume";

    // Detect double-tap gesture
    const now = Date.now();
    if (
      lastTapRef.current &&
      now - lastTapRef.current.time < 320 &&
      Math.abs(clientX - lastTapRef.current.x) < 50 &&
      Math.abs(clientY - lastTapRef.current.y) < 50
    ) {
      lastTapRef.current = null;
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

      if (isLeftSide) {
        handleSkip(-10);
        setDoubleTapFeedback({ side: "left", text: "-10s" });
      } else {
        handleSkip(10);
        setDoubleTapFeedback({ side: "right", text: "+10s" });
      }
      setTimeout(() => setDoubleTapFeedback(null), 800);
      dragRef.current = null;
      return;
    }

    lastTapRef.current = { time: now, x: clientX, y: clientY };

    dragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startVal: gestureType === "brightness" ? brightness : volume,
      type: gestureType,
      hasMoved: false,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!dragRef.current?.isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaY = dragRef.current.startY - clientY; // Upwards swipe increases value

    if (Math.abs(deltaY) > 6) {
      dragRef.current.hasMoved = true;
    }

    if (!dragRef.current.hasMoved) return;

    // Movement scale: full height of video is ~110% change
    const deltaPct = (deltaY / Math.max(1, rect.height)) * 110;
    if (dragRef.current.type === "brightness") {
      updateBrightness(dragRef.current.startVal + deltaPct);
    } else {
      updateVolume(dragRef.current.startVal + deltaPct);
    }
  };

  const handlePointerEnd = () => {
    if (dragRef.current?.isDragging) {
      // If it was a tap with no drag movement, toggle play/pause after brief double-tap window
      if (!dragRef.current.hasMoved) {
        tapTimeoutRef.current = setTimeout(() => {
          const nextPlaying = !isPlaying;
          setIsPlaying(nextPlaying);
          sendIframeCommand(nextPlaying ? "playVideo" : "pauseVideo");
        }, 220);
      }
      dragRef.current = null;
    }
  };

  // Toggle Fullscreen mode (supports native browser Fullscreen API & In-App / Landscape fallback)
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
      );

      if (!isCurrentlyFs) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          await (containerRef.current as any).mozRequestFullScreen();
        } else {
          setIsFullscreen((prev) => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn("Fullscreen API fallback:", err);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Format system time (HH:MM:SS AM/PM or 24h)
  const formatSystemClock = (date: Date, is24h: boolean) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !is24h,
    });
  };

  // Generate AI Summary
  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: video.title,
          description: video.description,
          channelTitle: video.channelTitle,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error("AI Summary error:", err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Generate AI Quiz
  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setSelectedQuizAnswers({});
    setShowQuizResults(false);
    try {
      const res = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: video.title,
          description: video.description,
        }),
      });
      const data = await res.json();
      if (data.quiz && Array.isArray(data.quiz)) {
        setQuizQuestions(data.quiz);
      }
    } catch (err) {
      console.error("AI Quiz error:", err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle Ask Gemini
  const handleAskQuestion = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery || userQuery).trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    try {
      const res = await fetch("/api/gemini/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: video.title,
          description: video.description,
          currentTime,
          userQuery: q,
          question: q,
        }),
      });
      const data = await res.json();
      if (data.answer || data.reply) {
        const newItem: AIQnAItem = {
          id: "qna-" + Date.now(),
          question: q,
          answer: data.answer || data.reply,
          timestamp: formatTime(currentTime),
        };
        setQnaList((prev) => [newItem, ...prev]);
        if (!customQuery) setUserQuery("");
      }
    } catch (err) {
      console.error("Ask question error:", err);
    } finally {
      setIsAsking(false);
    }
  };

  // Copy Summary or Study Notes
  const handleCopySummary = () => {
    if (!aiSummary) return;
    const text = `# AI Study Notes: ${video.title}
Creator: ${video.channelTitle}

## Overview
${aiSummary.overview}

## Key Takeaways
${aiSummary.keyTakeaways.map((t) => `- ${t}`).join("\n")}

## Action Items
${aiSummary.actionItems.map((a) => `[ ] ${a}`).join("\n")}

${
  aiSummary.chapters && aiSummary.chapters.length > 0
    ? `## Chapters\n${aiSummary.chapters.map((c) => `- ${c.timestamp} : ${c.title}`).join("\n")}`
    : ""
}
`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Copy share link with timestamp
  const handleCopyShareLink = () => {
    const url = `https://youtu.be/${video.id}?t=${Math.floor(currentTime)}s`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Add local comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newComm: VideoComment = {
      id: "local-" + Date.now(),
      authorDisplayName: user?.displayName || "You",
      authorProfileImageUrl:
        user?.photoURL ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      textDisplay: newCommentText.trim(),
      likeCount: 0,
      publishedAt: "Just now",
    };
    setComments([newComm, ...comments]);
    setNewCommentText("");
  };

  // Calculate Quiz Score
  const quizScore = quizQuestions.reduce((acc, q, idx) => {
    return acc + (selectedQuizAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left 2 Cols: Main Player, Controls & Tabbed Content */}
        <div className="lg:col-span-2">
          {/* Main Video Embed with VLC / MX Player Style Custom Gestures & Fullscreen Support */}
          <div
            ref={containerRef}
            className={`relative w-full overflow-hidden bg-black select-none group transition-all ${
              isFullscreen
                ? "fixed inset-0 z-50 w-screen h-screen aspect-auto rounded-none"
                : "aspect-video rounded-xl sm:rounded-2xl border border-stone-800 shadow-2xl"
            }`}
            onMouseEnter={() => setShowGestureGuide(true)}
            onMouseLeave={() => setShowGestureGuide(false)}
          >
            {/* Filterable Video Wrapper (Reacts dynamically to Brightness Gestures) */}
            <div
              className="w-full h-full transition-[filter] duration-75"
              style={{ filter: `brightness(${brightness}%)` }}
            >
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className={`w-full h-full border-0 ${
                  gestureControlsActive ? "pointer-events-none" : "pointer-events-auto"
                }`}
              />
            </div>

            {/* Ambient Darkening Tint for ultra-low brightness */}
            {brightness < 100 && (
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-75 z-10"
                style={{ opacity: Math.max(0, ((100 - brightness) / 100) * 0.75) }}
              />
            )}

            {/* Custom Gestures Interaction Layer (Left: Brightness, Right: Volume, Double-Tap: ±10s) */}
            {gestureControlsActive && (
              <div
                className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing touch-none select-none"
                onTouchStart={(e) =>
                  e.touches[0] && handlePointerStart(e.touches[0].clientX, e.touches[0].clientY)
                }
                onTouchMove={(e) =>
                  e.touches[0] && handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
                }
                onTouchEnd={handlePointerEnd}
                onMouseDown={(e) => {
                  if (e.button === 0) handlePointerStart(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerEnd}
                onMouseLeave={handlePointerEnd}
              />
            )}

            {/* TOP-LEFT: SYSTEM CLOCK DISPLAY (VLC / MX Player Style in Fullscreen & Landscape) */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
              <button
                type="button"
                id="player-system-clock-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setUse24HourFormat(!use24HourFormat);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 select-none ${
                  isFullscreen || isLandscape
                    ? "bg-stone-950/90 text-emerald-300 border-emerald-500/50 hover:bg-stone-900/95 ring-1 ring-emerald-500/30"
                    : "bg-black/80 text-stone-200 border-stone-700/70 hover:bg-stone-900/90"
                }`}
                title={`System Clock (VLC/MX Style): ${formatSystemClock(systemTime, use24HourFormat)}. Click to toggle 12h/24h format.`}
              >
                <Clock
                  className={`w-3.5 h-3.5 ${
                    isFullscreen || isLandscape ? "text-emerald-400 animate-pulse" : "text-amber-400"
                  }`}
                />
                <span className="font-semibold tracking-wider">
                  {formatSystemClock(systemTime, use24HourFormat)}
                </span>

                {/* Battery percentage if supported by browser */}
                {batteryLevel !== null && (
                  <span className="hidden sm:flex items-center gap-1 pl-1.5 border-l border-stone-700/80 text-[11px] text-stone-300 font-sans">
                    {isBatteryCharging ? (
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    ) : (
                      <Battery className="w-3.5 h-3.5 text-stone-300" />
                    )}
                    <span className="font-mono text-[10px]">{batteryLevel}%</span>
                  </span>
                )}

                {(isFullscreen || isLandscape) && (
                  <span className="hidden md:inline-flex text-[9px] uppercase tracking-wider font-sans font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-1.5 py-0.2 rounded">
                    {isFullscreen ? "Fullscreen" : "Landscape"}
                  </span>
                )}
              </button>
            </div>

            {/* TOP-RIGHT: Gesture Mode Badge & Fullscreen Mode Toggle (VLC / MX Player) */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGestureControlsActive(!gestureControlsActive);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
                  gestureControlsActive
                    ? "bg-amber-950/85 text-amber-300 border-amber-500/50 hover:bg-amber-900/90"
                    : "bg-stone-900/85 text-stone-400 border-stone-700 hover:bg-stone-800/90"
                }`}
                title={
                  gestureControlsActive
                    ? "Gesture Controls Active: Swipe Left ↕ for Brightness, Right ↕ for Volume, Double-tap for ±10s. Click to switch to YouTube native clicks."
                    : "Native Click Mode: Click to activate VLC/MX Player swipe gesture controls."
                }
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>{gestureControlsActive ? "Gestures: ON" : "Gestures: OFF"}</span>
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                id="player-fullscreen-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isFullscreen
                    ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/95 ring-1 ring-emerald-500/30"
                    : "bg-stone-900/85 text-stone-300 border-stone-700 hover:bg-stone-800/90 hover:text-white"
                }`}
                title={isFullscreen ? "Exit Fullscreen (Esc or F)" : "Fullscreen Mode (F)"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-3 h-3 text-stone-300" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>
            </div>

            {/* On-Screen HUD Overlay (VLC / MX Player Style Center Floating Card) */}
            {gestureHud?.visible && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center animate-fade-in">
                <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl bg-stone-950/90 backdrop-blur-md border border-stone-700/70 shadow-2xl min-w-[150px]">
                  {gestureHud.type === "brightness" ? (
                    <>
                      {gestureHud.value > 80 ? (
                        <Sun className="w-8 h-8 text-amber-400 animate-pulse" />
                      ) : gestureHud.value > 40 ? (
                        <SunMedium className="w-8 h-8 text-amber-300" />
                      ) : (
                        <Moon className="w-8 h-8 text-amber-200" />
                      )}
                      <div className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                        <span>Brightness</span>
                        <span className="font-mono text-amber-400">{gestureHud.value}%</span>
                      </div>
                      <div className="w-28 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700/50">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-75 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (gestureHud.value / 150) * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-400">Swipe Left ↕</span>
                    </>
                  ) : (
                    <>
                      {gestureHud.value === 0 ? (
                        <VolumeX className="w-8 h-8 text-red-400" />
                      ) : gestureHud.value > 50 ? (
                        <Volume2 className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <Volume1 className="w-8 h-8 text-emerald-300" />
                      )}
                      <div className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                        <span>Volume</span>
                        <span className="font-mono text-emerald-400">{gestureHud.value}%</span>
                      </div>
                      <div className="w-28 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700/50">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-75 rounded-full"
                          style={{ width: `${gestureHud.value}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-400">Swipe Right ↕</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Double Tap Skip Ripple Feedback (<< 10s / 10s >>) */}
            {doubleTapFeedback && (
              <div
                className={`absolute inset-y-0 z-30 pointer-events-none flex items-center justify-center w-1/2 ${
                  doubleTapFeedback.side === "left" ? "left-0 bg-white/5" : "right-0 bg-white/5"
                } transition-all duration-300`}
              >
                <div className="flex flex-col items-center gap-1 bg-stone-950/85 px-4 py-3 rounded-2xl border border-white/20 shadow-2xl">
                  {doubleTapFeedback.side === "left" ? (
                    <Rewind className="w-7 h-7 text-amber-400 animate-pulse" />
                  ) : (
                    <FastForward className="w-7 h-7 text-amber-400 animate-pulse" />
                  )}
                  <span className="text-xs font-bold font-mono text-white tracking-wide">
                    {doubleTapFeedback.text}
                  </span>
                </div>
              </div>
            )}

            {/* Gesture Guides (Subtle MX Player / VLC hints) */}
            {gestureControlsActive && (
              <div
                className={`absolute inset-x-0 bottom-3 z-25 pointer-events-none px-4 flex items-center justify-between text-[11px] text-stone-300/80 transition-opacity duration-300 ${
                  showGestureGuide ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-stone-700/60 shadow">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>Left: Swipe ↕ Brightness</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-stone-700/60 shadow">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Right: Swipe ↕ Volume</span>
                </div>
              </div>
            )}
          </div>

          {/* Resume Playback Notice */}
          {resumeNotice?.visible && (
            <div className="mt-2.5 flex items-center justify-between px-3.5 py-2 bg-amber-950/70 border border-amber-500/40 rounded-xl text-xs text-amber-200 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                <span>
                  Resumed playback from where you left off at{" "}
                  <strong className="text-amber-300 font-mono">
                    {formatTime(resumeNotice.seconds)}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => seekToSeconds(0)}
                className="text-xs text-amber-400 hover:text-amber-200 underline cursor-pointer ml-2 shrink-0 font-medium"
              >
                Start from 0:00
              </button>
            </div>
          )}

          {/* PLAYBACK CONTROLS BAR WITH GESTURE SLIDERS & DIRECT MP3 BUTTON */}
          <div className="mt-3 bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
            {/* Play/Pause & Quick Skip */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = !isPlaying;
                  setIsPlaying(next);
                  sendIframeCommand(next ? "playVideo" : "pauseVideo");
                }}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                title={isPlaying ? "Pause Video" : "Play Video"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{formatTime(currentTime)}</span>
              </button>

              <button
                onClick={() => handleSkip(-10)}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Rewind 10s"
              >
                <Rewind className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSkip(10)}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Forward 10s"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>

            {/* Gesture Sliders (Brightness & Volume) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Brightness slider */}
              <div
                className="flex items-center gap-1.5 text-xs text-stone-400 bg-stone-950/70 border border-stone-800 px-2.5 py-1 rounded-lg"
                title="Brightness (or swipe up/down on left half of video)"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="range"
                  min={20}
                  max={150}
                  value={brightness}
                  onChange={(e) => updateBrightness(Number(e.target.value))}
                  className="w-16 sm:w-20 accent-amber-500 h-1 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-stone-300 min-w-[32px]">
                  {brightness}%
                </span>
                {brightness !== 100 && (
                  <button
                    onClick={() => updateBrightness(100)}
                    className="text-[10px] text-amber-400 hover:text-amber-200 underline cursor-pointer ml-0.5"
                    title="Reset brightness to 100%"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Volume slider */}
              <div
                className="flex items-center gap-1.5 text-xs text-stone-400 bg-stone-950/70 border border-stone-800 px-2.5 py-1 rounded-lg"
                title="Volume (or swipe up/down on right half of video)"
              >
                <button
                  type="button"
                  onClick={() => updateVolume(isMuted ? 80 : 0)}
                  className="text-stone-300 hover:text-emerald-400 cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => updateVolume(Number(e.target.value))}
                  className="w-16 sm:w-20 accent-emerald-500 h-1 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-stone-300 min-w-[28px]">
                  {isMuted ? 0 : volume}%
                </span>
              </div>
            </div>

            {/* Quick Actions in Player Bar: Built-in Audio Extractor & Share */}
            <div className="flex items-center gap-2">
              {/* Direct Audio Extractor MP3 button right in controls */}
              <button
                onClick={() => setShowAudioExtractorModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Extract studio-quality MP3 audio directly from this video"
              >
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio (MP3)</span>
              </button>

              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Copy link with current timestamp"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share @ {formatTime(currentTime)}</span>
                  </>
                )}
              </button>

              {/* Fullscreen Mode Toggle in Controls Bar */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isFullscreen
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "bg-stone-800 hover:bg-stone-700 text-stone-200"
                }`}
                title={isFullscreen ? "Exit Fullscreen (Esc or F)" : "Fullscreen Mode (F)"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-3.5 h-3.5 text-stone-300" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Video Metadata Header */}
          <div className="mt-4">
            <h1 className="text-lg md:text-xl font-bold text-stone-100 leading-snug">
              {video.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800">
              {/* Channel Info & Subscribe */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-stone-700 to-stone-600 text-white font-bold flex items-center justify-center text-sm shadow">
                  {video.channelTitle ? video.channelTitle.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-100">
                    {video.channelTitle}
                  </h4>
                  <p className="text-xs text-stone-400">Official Channel</p>
                </div>

                <button
                  onClick={() => setIsSubscribed(!isSubscribed)}
                  className={`ml-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isSubscribed
                      ? "bg-stone-800 text-stone-300 hover:bg-stone-700"
                      : "bg-white text-stone-900 hover:bg-stone-200"
                  }`}
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </button>
              </div>

              {/* Action Buttons: Extract MP3, Download, Like, Watch Later, YouTube */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-1 touch-momentum">
                {/* Built-in Audio Extractor / MP3 Downloader Button */}
                <button
                  id="video-player-audio-extract-btn"
                  onClick={() => setShowAudioExtractorModal(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 shadow-md transition-all cursor-pointer shrink-0"
                  title="Directly extract and download video audio as MP3"
                >
                  <Headphones className="w-3.5 h-3.5 text-stone-950" />
                  <span>Extract MP3</span>
                </button>

                {/* Download Button */}
                <button
                  id="video-player-download-btn"
                  onClick={() => setShowDownloadModal(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-sm transition-all cursor-pointer shrink-0"
                  title="Download MP4 video or MP3 audio directly to your device files"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => onToggleLike(video)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                    isLiked
                      ? "bg-red-600/20 text-red-300 border-red-700/60"
                      : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                  <span>{formatViews(video.likeCount)}</span>
                </button>

                <button
                  onClick={() => onToggleWatchLater(video)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                    isWatchLater
                      ? "bg-red-600/20 text-red-300 border-red-700/60"
                      : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isWatchLater ? "Saved" : "Save"}</span>
                </button>

                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700 transition-colors shrink-0"
                  title="Watch directly on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
              </div>
            </div>

            {/* Quick Download & Audio Extractor Strip Under Video */}
            <div className="mt-3 bg-gradient-to-r from-emerald-950/40 via-amber-950/30 to-stone-900 border border-emerald-800/40 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>APNA Downloader & Audio Extractor</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/50 px-1.5 py-0.2 rounded font-semibold uppercase">
                      In-App MP3 & Video
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Ek click mein direct MP3 audio extract karein ya full HD video download karein
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  id="direct-audio-extract-strip-btn"
                  onClick={() => setShowAudioExtractorModal(true)}
                  className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                  title="Directly download high-quality MP3 audio without leaving the player"
                >
                  <Headphones className="w-3.5 h-3.5 text-stone-950" />
                  <span>Extract MP3 Audio</span>
                </button>

                <button
                  id="choose-quality-download-btn"
                  onClick={() => setShowDownloadModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Video</span>
                </button>
              </div>
            </div>

            {/* Description Box */}
            <div className="mt-3 bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-300 leading-relaxed">
              <div className="flex items-center gap-3 font-semibold text-stone-200 mb-1">
                <span>{formatViews(video.viewCount)}</span>
                <span>{formatPublishedDate(video.publishedAt)}</span>
                {video.category && (
                  <span className="bg-stone-800 text-stone-400 px-2 py-0.5 rounded text-[11px]">
                    #{video.category}
                  </span>
                )}
              </div>

              <p className={isDescExpanded ? "whitespace-pre-line" : "line-clamp-2"}>
                {video.description || "No description provided."}
              </p>

              <button
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="mt-1 font-semibold text-stone-400 hover:text-stone-200 flex items-center gap-1"
              >
                <span>{isDescExpanded ? "Show less" : "...more"}</span>
                {isDescExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* TABBED MODULE: AI Summary & Comments */}
          <div className="mt-5 sm:mt-6">
            <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto no-scrollbar touch-momentum">
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  activeTab === "ai"
                    ? "bg-amber-600/20 text-amber-300 border border-amber-700/50"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI Key Points & Summary</span>
              </button>

              <button
                onClick={() => setActiveTab("comments")}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  activeTab === "comments"
                    ? "bg-stone-800 text-white"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments ({comments.length})</span>
              </button>
            </div>

            {/* TAB 1: AI Suite (Summary, Chapters, Q&A, Quiz, Notes) */}
            {activeTab === "ai" && (
              <div className="mt-4 bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5">
                {/* AI Sub-navigation */}
                <div className="flex items-center gap-1.5 pb-3 border-b border-stone-800/80 overflow-x-auto no-scrollbar">
                  {[
                    { id: "summary", label: "Summary & Chapters", icon: Sparkles },
                    { id: "qa", label: "Ask Gemini", icon: Bot },
                    { id: "quiz", label: "Interactive Quiz", icon: Award },
                    { id: "notes", label: "Study Notes", icon: FileText },
                  ].map((sub) => {
                    const Icon = sub.icon;
                    const isActive = aiSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setAiSubTab(sub.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-stone-500"}`} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SUB-TAB 1: Summary & Smart Chapters */}
                {aiSubTab === "summary" && (
                  <div className="pt-4 space-y-4">
                    {!aiSummary ? (
                      <div className="text-center py-7">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                        </div>
                        <h3 className="text-sm font-bold text-stone-100">
                          Gemini 3.8-Flash Video Intelligence
                        </h3>
                        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto leading-relaxed">
                          Extract structured key takeaways, actionable implementation steps, and
                          clickable smart video chapters powered by Gemini.
                        </p>
                        <button
                          onClick={handleGenerateSummary}
                          disabled={isSummarizing}
                          className="mt-4 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer active:scale-98 flex items-center gap-2 mx-auto"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{isSummarizing ? "Synthesizing with Gemini..." : "Generate AI Summary & Chapters"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Top toolbar */}
                        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                              Executive Synopsis
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopySummary}
                              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Copy notes"
                            >
                              {copiedSummary ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Notes</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleGenerateSummary}
                              disabled={isSummarizing}
                              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Regenerate with Gemini"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Regenerate</span>
                            </button>
                          </div>
                        </div>

                        {/* Overview Box */}
                        <p className="text-xs text-stone-200 leading-relaxed bg-stone-950/70 p-3.5 rounded-xl border border-stone-800">
                          {aiSummary.overview}
                        </p>

                        {/* Interactive Chapters (Clickable Seek) */}
                        {aiSummary.chapters && aiSummary.chapters.length > 0 && (
                          <div className="pt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="w-3.5 h-3.5 text-amber-400" />
                              <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                                Smart Interactive Chapters (Click to Jump)
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {aiSummary.chapters.map((ch, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => seekToSeconds(ch.seconds)}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/80 hover:bg-amber-950/40 border border-stone-800/80 hover:border-amber-500/40 text-left transition-all group cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <PlayCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-stone-200 group-hover:text-amber-200 truncate">
                                      {ch.title}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800/50 px-2 py-0.5 rounded ml-2 shrink-0">
                                    {ch.timestamp}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Key Takeaways */}
                        <div className="pt-2">
                          <h4 className="text-xs font-bold text-stone-200 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                            <span>Core Key Takeaways</span>
                          </h4>
                          <div className="space-y-1.5">
                            {aiSummary.keyTakeaways.map((item, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2.5 p-2 rounded-lg bg-stone-950/40 text-xs text-stone-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                <span className="leading-relaxed">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Action Items Checklist */}
                        <div className="pt-2">
                          <h4 className="text-xs font-bold text-stone-200 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                            <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Actionable Checklist (Interactive)</span>
                          </h4>
                          <div className="space-y-1.5">
                            {aiSummary.actionItems.map((item, i) => {
                              const isChecked = !!checkedActionItems[i];
                              return (
                                <button
                                  key={i}
                                  onClick={() =>
                                    setCheckedActionItems((prev) => ({
                                      ...prev,
                                      [i]: !prev[i],
                                    }))
                                  }
                                  className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                                    isChecked
                                      ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300 line-through opacity-80"
                                      : "bg-stone-950/40 border-stone-800/70 text-stone-300 hover:border-stone-700"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                      isChecked
                                        ? "bg-emerald-600 border-emerald-500 text-white"
                                        : "border-stone-600 bg-stone-900"
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="leading-relaxed">{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 2: Ask Gemini (Interactive Q&A) */}
                {aiSubTab === "qa" && (
                  <div className="pt-4 space-y-4">
                    {/* Quick Suggestion Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                        Quick Questions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Explain like I'm 5",
                          "Top 3 technical takeaways",
                          "Step-by-step tutorial checklist",
                          "Common mistakes & pitfalls mentioned",
                          "What tools or libraries are used?",
                        ].map((promptText, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAskQuestion(undefined, promptText)}
                            disabled={isAsking}
                            className="text-[11px] bg-stone-950 hover:bg-amber-950/50 text-stone-300 hover:text-amber-200 border border-stone-800 hover:border-amber-500/40 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Lightbulb className="w-3 h-3 text-amber-400" />
                            <span>{promptText}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ask Form */}
                    <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Ask anything about the video concepts or timestamp..."
                        disabled={isAsking}
                        className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={isAsking || !userQuery.trim()}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAsking ? "Thinking..." : "Ask"}</span>
                      </button>
                    </form>

                    {/* Q&A List */}
                    {qnaList.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {qnaList.map((qa) => (
                          <div
                            key={qa.id}
                            className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 text-xs space-y-2 animate-fade-in"
                          >
                            <div className="flex items-center justify-between text-stone-400 text-[11px]">
                              <span className="font-bold text-amber-300">
                                Q: {qa.question}
                              </span>
                              <span className="font-mono bg-stone-900 border border-stone-800 px-2 py-0.5 rounded text-stone-400">
                                @ {qa.timestamp}
                              </span>
                            </div>
                            <div className="text-stone-200 leading-relaxed pl-3 border-l-2 border-amber-500/50">
                              {qa.answer}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                        No questions asked yet. Choose a prompt chip above or type your question!
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 3: AI Video Quiz */}
                {aiSubTab === "quiz" && (
                  <div className="pt-4 space-y-4">
                    {quizQuestions.length === 0 ? (
                      <div className="text-center py-7">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <Award className="w-6 h-6 text-amber-400 animate-pulse" />
                        </div>
                        <h3 className="text-sm font-bold text-stone-100">
                          AI Video Knowledge Quiz
                        </h3>
                        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto leading-relaxed">
                          Test your retention and comprehension of this video with 3 targeted multiple-choice
                          questions generated by Gemini.
                        </p>
                        <button
                          onClick={handleGenerateQuiz}
                          disabled={isGeneratingQuiz}
                          className="mt-4 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer active:scale-98 flex items-center gap-2 mx-auto"
                        >
                          <Award className="w-4 h-4" />
                          <span>{isGeneratingQuiz ? "Generating Quiz Questions..." : "Start AI Video Quiz"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Header & Score */}
                        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                          <div>
                            <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                              Comprehension Quiz ({quizQuestions.length} Questions)
                            </span>
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Click an option to see instant verification and explanation.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {Object.keys(selectedQuizAnswers).length > 0 && (
                              <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1 rounded-lg">
                                Score: {quizScore} / {quizQuestions.length}
                              </span>
                            )}
                            <button
                              onClick={handleGenerateQuiz}
                              disabled={isGeneratingQuiz}
                              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Regenerate fresh quiz"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-5">
                          {quizQuestions.map((q, qIdx) => {
                            const selectedOption = selectedQuizAnswers[qIdx];
                            const isAnswered = selectedOption !== undefined;

                            return (
                              <div
                                key={qIdx}
                                className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 text-xs space-y-3"
                              >
                                <h4 className="font-semibold text-stone-100 text-xs sm:text-sm">
                                  {qIdx + 1}. {q.question}
                                </h4>

                                <div className="space-y-2">
                                  {q.options.map((opt, optIdx) => {
                                    const isSelected = selectedOption === optIdx;
                                    const isCorrect = q.correctIndex === optIdx;

                                    let btnClasses =
                                      "w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ";

                                    if (!isAnswered) {
                                      btnClasses +=
                                        "bg-stone-900 border-stone-800 text-stone-200 hover:border-amber-500/50 hover:bg-stone-800";
                                    } else if (isCorrect) {
                                      btnClasses +=
                                        "bg-emerald-950/60 border-emerald-500/70 text-emerald-200 font-semibold";
                                    } else if (isSelected && !isCorrect) {
                                      btnClasses +=
                                        "bg-red-950/60 border-red-500/70 text-red-200 font-semibold";
                                    } else {
                                      btnClasses +=
                                        "bg-stone-900/60 border-stone-800/60 text-stone-500 opacity-60";
                                    }

                                    return (
                                      <button
                                        key={optIdx}
                                        disabled={isAnswered}
                                        onClick={() =>
                                          setSelectedQuizAnswers((prev) => ({
                                            ...prev,
                                            [qIdx]: optIdx,
                                          }))
                                        }
                                        className={btnClasses}
                                      >
                                        <span>{opt}</span>
                                        {isAnswered && isCorrect && (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {isAnswered && (
                                  <div className="mt-2.5 p-3 rounded-lg bg-stone-900 border border-stone-800 text-[11px] leading-relaxed text-stone-300">
                                    <span className="font-bold text-amber-400">Explanation: </span>
                                    {q.explanation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 4: Study Notes */}
                {aiSubTab === "notes" && (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                      <div>
                        <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                          Exportable Study Sheet
                        </span>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Formatted Markdown notes for Notion, Obsidian, or local study journals.
                        </p>
                      </div>

                      <button
                        onClick={handleCopySummary}
                        disabled={!aiSummary}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied to Clipboard</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy All Notes</span>
                          </>
                        )}
                      </button>
                    </div>

                    {!aiSummary ? (
                      <div className="text-center py-6 text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                        Generate a summary first under "Summary & Chapters" to populate your study sheet.
                      </div>
                    ) : (
                      <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-300 space-y-3 leading-relaxed select-all">
                        <div className="text-amber-400 font-bold"># {video.title}</div>
                        <div className="text-stone-400">Creator: {video.channelTitle}</div>
                        <div className="text-stone-400">Source: https://youtu.be/{video.id}</div>
                        <hr className="border-stone-800" />
                        <div className="text-stone-200 font-bold">## Overview</div>
                        <div>{aiSummary.overview}</div>
                        <div className="text-stone-200 font-bold">## Key Takeaways</div>
                        {aiSummary.keyTakeaways.map((t, idx) => (
                          <div key={idx}>- {t}</div>
                        ))}
                        <div className="text-stone-200 font-bold">## Action Items</div>
                        {aiSummary.actionItems.map((a, idx) => (
                          <div key={idx}>[ ] {a}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Comments */}
            {activeTab === "comments" && (
              <div className="mt-4 space-y-4">
                {/* Add Comment */}
                <form
                  onSubmit={handleAddComment}
                  className="flex gap-2 bg-stone-900 border border-stone-800 rounded-xl p-3"
                >
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a public comment..."
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium disabled:opacity-40"
                  >
                    Comment
                  </button>
                </form>

                {/* Comment List */}
                <div className="space-y-3">
                  {isLoadingComments ? (
                    <div className="text-center py-6 text-xs text-stone-400">
                      Loading comments...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-6 text-xs text-stone-500">
                      No comments yet. Be the first to share your thoughts!
                    </div>
                  ) : (
                    comments.map((comm) => (
                      <div key={comm.id} className="flex gap-3 text-xs">
                        <img
                          src={comm.authorProfileImageUrl}
                          alt={comm.authorDisplayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-stone-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-200">
                              {comm.authorDisplayName}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              {comm.publishedAt}
                            </span>
                          </div>
                          <p className="mt-1 text-stone-300 leading-relaxed">
                            {comm.textDisplay}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-stone-400">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{comm.likeCount}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Up Next / Related Videos */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider">
            Up Next
          </h3>

          <div className="space-y-3">
            {relatedVideos.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectVideo(item)}
                className={`group flex gap-2.5 p-1.5 rounded-xl cursor-pointer transition-colors ${
                  item.id === video.id
                    ? "bg-stone-800/90 ring-1 ring-red-500/50"
                    : "hover:bg-stone-800/50"
                }`}
              >
                <div className="relative w-36 aspect-video shrink-0 rounded-lg overflow-hidden bg-stone-800">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  {item.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 py-0.2 rounded font-semibold">
                      {item.duration}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4
                    className="text-xs font-semibold text-stone-200 line-clamp-2 group-hover:text-red-400 leading-snug"
                    title={item.title}
                  >
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-stone-400 truncate mt-1">
                    {item.channelTitle}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {formatViews(item.viewCount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video & Audio Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        video={video}
      />

      {/* Built-in Audio Extractor / MP3 Downloader Modal */}
      <AudioExtractorModal
        isOpen={showAudioExtractorModal}
        onClose={() => setShowAudioExtractorModal(false)}
        video={video}
      />
    </div>
  );
};
