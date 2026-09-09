import React from "react";
import { Video } from "../types";
import { formatViews, formatPublishedDate } from "../utils/formatters";
import { Clock, ThumbsUp, CheckCircle2 } from "lucide-react";

interface VideoCardProps {
  video: Video;
  onSelectVideo: (video: Video) => void;
  isLiked?: boolean;
  isWatchLater?: boolean;
  onToggleLike?: (video: Video, e: React.MouseEvent) => void;
  onToggleWatchLater?: (video: Video, e: React.MouseEvent) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onSelectVideo,
  isLiked,
  isWatchLater,
  onToggleLike,
  onToggleWatchLater,
}) => {
  return (
    <div
      onClick={() => onSelectVideo(video)}
      className="group cursor-pointer flex flex-col gap-2.5 transition-transform duration-150 active:scale-[0.99] focus:outline-none"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-stone-800 shadow-sm">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-stone-950/85 text-stone-100 text-[11px] font-semibold px-1.5 py-0.5 rounded tracking-tight shadow backdrop-blur-xs">
            {video.duration}
          </div>
        )}

        {/* Quick Action Overlay (Hover on Desktop, persistent icon on mobile if saved/liked) */}
        <div className={`absolute top-2 right-2 flex items-center gap-1 p-1 rounded-lg backdrop-blur-sm transition-opacity ${
          isLiked || isWatchLater ? "opacity-100 bg-stone-950/80" : "opacity-0 group-hover:opacity-100 bg-stone-950/70"
        }`}>
          {onToggleWatchLater && (
            <button
              onClick={(e) => onToggleWatchLater(video, e)}
              className={`p-1.5 rounded hover:bg-stone-700 transition-colors cursor-pointer ${
                isWatchLater ? "text-red-400" : "text-stone-300 hover:text-white"
              }`}
              title={isWatchLater ? "Saved in Watch Later" : "Watch Later"}
              aria-label="Save for later"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleLike && (
            <button
              onClick={(e) => onToggleLike(video, e)}
              className={`p-1.5 rounded hover:bg-stone-700 transition-colors cursor-pointer ${
                isLiked ? "text-red-400 fill-current" : "text-stone-300 hover:text-white"
              }`}
              title={isLiked ? "Liked" : "Like"}
              aria-label="Like video"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex gap-2.5 sm:gap-3 px-0.5">
        {/* Channel Avatar Placeholder / Icon */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-stone-800">
          {video.channelTitle ? video.channelTitle.charAt(0).toUpperCase() : "Y"}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <h3
            className="text-xs sm:text-sm font-semibold text-stone-100 line-clamp-2 group-hover:text-red-400 transition-colors leading-snug"
            title={video.title}
          >
            {video.title}
          </h3>

          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-stone-400 mt-1">
            <span className="truncate hover:text-stone-200 transition-colors">
              {video.channelTitle}
            </span>
            <CheckCircle2 className="w-3 h-3 text-stone-500 shrink-0" />
          </div>

          <div className="text-[11px] sm:text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
            <span>{formatViews(video.viewCount)}</span>
            <span>•</span>
            <span>{formatPublishedDate(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
