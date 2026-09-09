import React, { useState } from "react";
import { Video } from "../types";
import { VideoCard } from "./VideoCard";
import {
  Clock,
  ThumbsUp,
  FolderHeart,
  Trash2,
} from "lucide-react";

interface LibraryViewProps {
  history: Video[];
  likedVideos: Video[];
  watchLater: Video[];
  onSelectVideo: (video: Video) => void;
  onClearHistory: () => void;
  initialTab?: "history" | "liked" | "watch-later";
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  history,
  likedVideos,
  watchLater,
  onSelectVideo,
  onClearHistory,
  initialTab = "history",
}) => {
  const [activeTab, setActiveTab] = useState<"history" | "liked" | "watch-later">(
    initialTab
  );

  let currentVideos: Video[] = [];
  let currentLabel = "";
  if (activeTab === "history") {
    currentVideos = history;
    currentLabel = "Watch History";
  } else if (activeTab === "liked") {
    currentVideos = likedVideos;
    currentLabel = "Liked Videos";
  } else {
    currentVideos = watchLater;
    currentLabel = "Watch Later";
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-1 touch-momentum">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === "history"
                ? "bg-red-600/20 text-red-300 border border-red-700/50"
                : "text-stone-400 hover:text-white hover:bg-stone-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("liked")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === "liked"
                ? "bg-red-600/20 text-red-300 border border-red-700/50"
                : "text-stone-400 hover:text-white hover:bg-stone-800"
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Liked ({likedVideos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("watch-later")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === "watch-later"
                ? "bg-red-600/20 text-red-300 border border-red-700/50"
                : "text-stone-400 hover:text-white hover:bg-stone-800"
            }`}
          >
            <FolderHeart className="w-4 h-4" />
            <span>Saved ({watchLater.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "history" && history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Videos Grid */}
      <div className="mt-6">
        {currentVideos.length === 0 ? (
          <div className="text-center py-16 bg-stone-900/40 border border-dashed border-stone-800 rounded-2xl p-8">
            <FolderHeart className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-300">
              No videos in {currentLabel}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Browse videos and save your favorites to review later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelectVideo={onSelectVideo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
