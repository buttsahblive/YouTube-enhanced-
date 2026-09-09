import React from "react";
import { Video } from "../types";
import { formatViews, formatPublishedDate } from "../utils/formatters";
import { Clock, Bookmark, ThumbsUp, CheckCircle2 } from "lucide-react";

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
      className="group cursor-pointer flex flex-col gap-2.5 transition-transform duration-150 focus:outline-none"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-stone-800">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-stone-950/85 text-stone-100 text-[11px] font-semibold px-1.5 py-0.5 rounded tracking-tight shadow">
            {video.duration}
          </div>
        )}

        {/* Hover Quick Action Overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-stone-950/70 p-1 rounded-lg backdrop-blur-sm">
          {onToggleWatchLater && (
            <button
              onClick={(e) => onToggleWatchLater(video, e)}
              className={`p-1.5 rounded hover:bg-stone-700 transition-colors ${
                isWatchLater ? "text-red-400" : "text-stone-300 hover:text-white"
              }`}
              title="Watch Later"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleLike && (
            <button
              onClick={(e) => onToggleLike(video, e)}
              className={`p-1.5 rounded hover:bg-stone-700 transition-colors ${
                isLiked ? "text-red-400" : "text-stone-300 hover:text-white"
              }`}
              title="Like"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex gap-3 px-0.5">
        {/* Channel Avatar Placeholder / Icon */}
        <div className="w-9 h-9 rounded-full bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-stone-800">
          {video.channelTitle ? video.channelTitle.charAt(0).toUpperCase() : "Y"}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <h3
            className="text-sm font-semibold text-stone-100 line-clamp-2 group-hover:text-red-400 transition-colors leading-snug"
            title={video.title}
          >
            {video.title}
          </h3>

          <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
            <span className="truncate hover:text-stone-200 transition-colors">
              {video.channelTitle}
            </span>
            <CheckCircle2 className="w-3 h-3 text-stone-500 shrink-0" />
          </div>

          <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
            <span>{formatViews(video.viewCount)}</span>
            <span>•</span>
            <span>{formatPublishedDate(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
