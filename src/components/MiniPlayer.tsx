import React from "react";
import { Video } from "../types";
import { Maximize2, X, Play, Pause } from "lucide-react";

interface MiniPlayerProps {
  video: Video;
  onExpand: () => void;
  onClose: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  video,
  onExpand,
  onClose,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&enablejsapi=1`}
          title={video.title}
          className="w-full h-full border-0 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />

        {/* Overlay controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 p-1 rounded-lg backdrop-blur-sm">
          <button
            onClick={onExpand}
            className="p-1 text-stone-200 hover:text-white rounded hover:bg-white/20 transition-colors"
            title="Expand player"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-stone-200 hover:text-white rounded hover:bg-white/20 transition-colors"
            title="Close mini player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-2.5 flex items-center justify-between gap-2 bg-stone-900">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-stone-200 truncate">
            {video.title}
          </h4>
          <p className="text-[10px] text-stone-400 truncate">
            {video.channelTitle}
          </p>
        </div>

        <button
          onClick={onExpand}
          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold shrink-0"
        >
          Expand
        </button>
      </div>
    </div>
  );
};
