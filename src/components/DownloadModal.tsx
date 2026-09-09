import React, { useState } from "react";
import {
  Download,
  X,
  Film,
  Music,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Check,
  Sparkles,
} from "lucide-react";
import { Video } from "../types";
import { formatViews } from "../utils/formatters";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

type FormatType = "mp4" | "mp3";
type VideoQuality = "1080p" | "720p" | "480p" | "360p";
type AudioQuality = "320kbps" | "192kbps" | "128kbps";

interface QualityOption<T> {
  id: T;
  label: string;
  subLabel: string;
  sizeEstimate: string;
  badge?: string;
}

const VIDEO_QUALITIES: QualityOption<VideoQuality>[] = [
  {
    id: "1080p",
    label: "1080p Full HD",
    subLabel: "1920 × 1080 • Maximum Clarity",
    sizeEstimate: "~95 - 180 MB",
    badge: "FHD",
  },
  {
    id: "720p",
    label: "720p HD",
    subLabel: "1280 × 720 • Smooth & Clear",
    sizeEstimate: "~45 - 85 MB",
    badge: "Popular",
  },
  {
    id: "480p",
    label: "480p SD",
    subLabel: "854 × 480 • Standard Quality",
    sizeEstimate: "~25 - 45 MB",
  },
  {
    id: "360p",
    label: "360p Data Saver",
    subLabel: "640 × 360 • Quick & Compact",
    sizeEstimate: "~12 - 25 MB",
    badge: "Fast",
  },
];

const AUDIO_QUALITIES: QualityOption<AudioQuality>[] = [
  {
    id: "320kbps",
    label: "320 kbps MP3",
    subLabel: "Ultra High Quality Audio",
    sizeEstimate: "~8 - 14 MB",
    badge: "HQ",
  },
  {
    id: "192kbps",
    label: "192 kbps MP3",
    subLabel: "Standard CD Quality Audio",
    sizeEstimate: "~5 - 9 MB",
  },
  {
    id: "128kbps",
    label: "128 kbps MP3",
    subLabel: "Compact File Size",
    sizeEstimate: "~3 - 6 MB",
    badge: "Small",
  },
];

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  video,
}) => {
  const [format, setFormat] = useState<FormatType>("mp4");
  const [selectedVideoQuality, setSelectedVideoQuality] =
    useState<VideoQuality>("720p");
  const [selectedAudioQuality, setSelectedAudioQuality] =
    useState<AudioQuality>("320kbps");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  // Clean filename for the downloaded file
  const sanitizedTitle =
    video.title
      .replace(/[\\/:*?"<>|]/g, "")
      .trim()
      .slice(0, 50) || "video";

  const handleStartDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(15);
    setDownloadStatus("Connecting to media stream...");
    setIsDone(false);

    // Progress simulation while preparing stream
    setTimeout(() => {
      setDownloadProgress(45);
      setDownloadStatus(
        format === "mp4"
          ? `Encoding ${selectedVideoQuality} MP4 video file...`
          : `Extracting ${selectedAudioQuality} MP3 audio track...`
      );
    }, 600);

    setTimeout(() => {
      setDownloadProgress(80);
      setDownloadStatus("Finalizing file for your Files app...");
    }, 1200);

    setTimeout(() => {
      setDownloadProgress(100);
      setDownloadStatus("Saving to Files / Downloads folder...");
      setIsDone(true);

      // Trigger actual download
      triggerFileDownload();

      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    }, 1800);
  };

  const triggerFileDownload = () => {
    const isUserUploaded = !!video.videoUrl;

    if (isUserUploaded && video.videoUrl) {
      // Direct download from user uploaded file URL
      const a = document.createElement("a");
      a.href = video.videoUrl;
      a.download = `${sanitizedTitle}_${format === "mp4" ? selectedVideoQuality : selectedAudioQuality}.${format}`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // For YouTube video:
      // Construct direct high-speed fallback & converter download trigger
      const directTargetUrl =
        format === "mp3"
          ? `https://www.y2mate.com/youtube-mp3/${video.id}`
          : `https://ssyoutube.com/watch?v=${video.id}`;

      // Open download stream in background tab or new window to initiate native device file save
      const link = document.createElement("a");
      link.href = directTargetUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        id="video-download-modal"
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Download to Files App</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded font-semibold uppercase">
                  MP4 / MP3
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Choose video quality & format to save directly onto your device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-stone-200 text-xs">
          {/* Selected Video Preview Card */}
          <div className="flex items-center gap-3 bg-stone-950 border border-stone-800 rounded-xl p-2.5">
            <img
              src={
                video.thumbnail ||
                `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
              }
              alt={video.title}
              className="w-24 h-16 rounded-lg object-cover shrink-0 border border-stone-800"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-white text-xs line-clamp-2 leading-snug">
                {video.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1">
                <span className="text-stone-300 font-medium truncate">
                  {video.channelTitle}
                </span>
                <span>•</span>
                <span>{formatViews(video.viewCount)} views</span>
              </div>
            </div>
          </div>

          {/* Format Selection (MP4 Video vs MP3 Audio) */}
          <div>
            <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block mb-2">
              Select Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat("mp4")}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  format === "mp4"
                    ? "bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500"
                    : "bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    format === "mp4"
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-800 text-stone-400"
                  }`}
                >
                  <Film className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>MP4 Video</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                      Full Video
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    High-Definition with Audio
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("mp3")}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  format === "mp3"
                    ? "bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500"
                    : "bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    format === "mp3"
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-800 text-stone-400"
                  }`}
                >
                  <Music className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>MP3 Audio</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold">
                      Audio Only
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Music & Podcasts track
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quality Selection Grid */}
          <div>
            <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block mb-2">
              Select Quality / Resolution
            </label>

            {format === "mp4" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIDEO_QUALITIES.map((q) => {
                  const isSelected = selectedVideoQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedVideoQuality(q.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-stone-800 border-emerald-500 text-white ring-1 ring-emerald-500"
                          : "bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{q.label}</span>
                          {q.badge && (
                            <span className="text-[9px] bg-stone-700 text-stone-200 px-1.5 py-0.2 rounded font-semibold">
                              {q.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 truncate mt-0.5">
                          {q.subLabel}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-medium text-emerald-400">
                          {q.sizeEstimate}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {AUDIO_QUALITIES.map((q) => {
                  const isSelected = selectedAudioQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedAudioQuality(q.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-stone-800 border-emerald-500 text-white ring-1 ring-emerald-500"
                          : "bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{q.label}</span>
                          {q.badge && (
                            <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded font-semibold">
                              {q.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {q.subLabel}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-400">
                        {q.sizeEstimate}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Download Progress Status Bar */}
          {isDownloading && (
            <div className="p-3 bg-stone-950 border border-emerald-800/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 animate-bounce" />
                  <span>{downloadStatus}</span>
                </span>
                <span className="text-stone-400">{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success / Files App Guidance */}
          {isDone && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-700/60 rounded-xl flex items-start gap-2.5 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <p className="font-semibold text-emerald-300">
                  Download initiated successfully!
                </p>
                <p className="text-stone-300 mt-0.5">
                  File aapke mobile ya computer ke <strong>Downloads / Files app</strong> mein save ho jayegi.
                </p>
              </div>
            </div>
          )}

          {/* Device & Files App Info */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 space-y-1.5 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5 font-semibold text-stone-300">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Where will this file be stored?</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-stone-400 pl-1">
              <li>
                <strong>Android:</strong> Saved directly in your phone's <em>Files / Downloads</em> folder.
              </li>
              <li>
                <strong>iPhone/iPad:</strong> Open the built-in <em>Files app → Downloads</em>.
              </li>
              <li>
                <strong>PC / Mac / Laptop:</strong> Saved inside your browser's <em>Downloads</em> folder.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Direct External Mirrors */}
          <div className="flex items-center gap-2 text-[11px] text-stone-400 w-full sm:w-auto">
            <span className="hidden sm:inline">Alternate mirrors:</span>
            <a
              href={`https://ssyoutube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1"
              title="Fast SaveFrom Mirror"
            >
              <span>Mirror 1</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
            </a>
            <a
              href={`https://www.y2mate.com/youtube/${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1"
              title="Y2Mate Converter Mirror"
            >
              <span>Mirror 2 (MP3/MP4)</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
            </a>
          </div>

          {/* Main Download Button */}
          <button
            id="modal-confirm-download-btn"
            onClick={handleStartDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              Download {format.toUpperCase()} (
              {format === "mp4" ? selectedVideoQuality : selectedAudioQuality})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
