import React, { useState, useEffect, useRef } from "react";
import { Video, VideoComment } from "../types";
import { loadVideoComments } from "../services/videoService";
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
} from "lucide-react";

interface PlayerViewProps {
  video: Video;
  relatedVideos: Video[];
  onSelectVideo: (video: Video) => void;
  isLiked: boolean;
  onToggleLike: (video: Video) => void;
  isWatchLater: boolean;
  onToggleWatchLater: (video: Video) => void;
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
}) => {
  // Current playback tracking
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ai" | "comments">("ai");

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<{
    overview: string;
    keyTakeaways: string[];
    actionItems: string[];
  } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // AI Q&A State
  const [qnaList, setQnaList] = useState<AIQnAItem[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Comments State
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  // Copy share feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Player iframe ref
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Load comments when video changes
  useEffect(() => {
    setCurrentTime(0);
    setAiSummary(null);
    setQnaList([]);
    setUserQuery("");

    setIsLoadingComments(true);
    loadVideoComments(video.id)
      .then((data) => {
        if (data && data.length > 0) {
          setComments(data);
        }
      })
      .catch((err) => console.error("Comments error:", err))
      .finally(() => setIsLoadingComments(false));
  }, [video.id]);

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

  // Handle Ask Gemini
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isAsking) return;

    const q = userQuery.trim();
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
        }),
      });
      const data = await res.json();
      if (data.answer) {
        const newItem: AIQnAItem = {
          id: "qna-" + Date.now(),
          question: q,
          answer: data.answer,
          timestamp: formatTime(currentTime),
        };
        setQnaList((prev) => [newItem, ...prev]);
        setUserQuery("");
      }
    } catch (err) {
      console.error("Ask question error:", err);
    } finally {
      setIsAsking(false);
    }
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
      authorDisplayName: "You",
      authorProfileImageUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      textDisplay: newCommentText.trim(),
      likeCount: 0,
      publishedAt: "Just now",
    };
    setComments([newComm, ...comments]);
    setNewCommentText("");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Player, Controls & Tabbed Content */}
        <div className="lg:col-span-2">
          {/* Main Video Embed */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-stone-800">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* PLAYBACK CONTROLS BAR */}
          <div className="mt-3 bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
            {/* Play/Pause & Quick Skip */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg transition-colors flex items-center gap-1.5 font-semibold"
                title={isPlaying ? "Pause Timer" : "Play Timer"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{formatTime(currentTime)}</span>
              </button>

              <button
                onClick={() => handleSkip(-10)}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 hover:text-white transition-colors"
                title="Rewind 10s"
              >
                <Rewind className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSkip(10)}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 hover:text-white transition-colors"
                title="Forward 10s"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>

            {/* Share with Timestamp */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
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

              {/* Action Buttons: Like, Watch Later */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLike(video)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700 transition-colors"
                  title="Watch directly on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
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
          <div className="mt-6">
            <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "comments"
                    ? "bg-stone-800 text-white"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments ({comments.length})</span>
              </button>
            </div>

            {/* TAB 1: AI Summary & Q&A */}
            {activeTab === "ai" && (
              <div className="mt-4 bg-stone-900 border border-stone-800 rounded-xl p-4">
                {!aiSummary ? (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-pulse" />
                    <h3 className="text-sm font-semibold text-stone-200">
                      Extract AI Key Points & Summary
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                      Generate structured key concepts, core principles, and actionable items
                      from this video using Gemini.
                    </p>
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing}
                      className="mt-4 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-all shadow-md disabled:opacity-50"
                    >
                      {isSummarizing ? "Synthesizing Key Points..." : "Generate AI Summary"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                          Executive Summary
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-3 rounded-lg border border-stone-800">
                      {aiSummary.overview}
                    </p>

                    <div>
                      <h4 className="text-xs font-semibold text-stone-200 mb-2">
                        Key Takeaways:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-stone-300">
                        {aiSummary.keyTakeaways.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-stone-200 mb-2">
                        Action Items:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-stone-300">
                        {aiSummary.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Ask Gemini Section */}
                <div className="mt-6 pt-4 border-t border-stone-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-stone-200">
                      Ask Gemini about this video
                    </span>
                  </div>

                  <form onSubmit={handleAskQuestion} className="flex gap-2">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="e.g. Can you explain the main idea in simple terms?"
                      disabled={isAsking}
                      className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isAsking || !userQuery.trim()}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAsking ? "Thinking..." : "Ask"}</span>
                    </button>
                  </form>

                  {/* Q&A List */}
                  {qnaList.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {qnaList.map((qa) => (
                        <div
                          key={qa.id}
                          className="bg-stone-950/70 border border-stone-800 rounded-lg p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-stone-400 text-[11px]">
                            <span className="font-semibold text-amber-300">
                              Q: {qa.question}
                            </span>
                            <span>@ {qa.timestamp}</span>
                          </div>
                          <div className="text-stone-200 leading-relaxed pl-2 border-l-2 border-amber-500/40">
                            {qa.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
    </div>
  );
};
