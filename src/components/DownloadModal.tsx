import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  X,
  Film,
  Music,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { Video } from "../types";
import { formatViews } from "../utils/formatters";
import { useIsRunningInApp } from "../utils/appDetection";

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
    subLabel: "1920 × 1080 • Best High Quality",
    sizeEstimate: "~75 - 150 MB",
    badge: "FHD",
  },
  {
    id: "720p",
    label: "720p HD",
    subLabel: "1280 × 720 • Smooth & Fast",
    sizeEstimate: "~35 - 70 MB",
    badge: "Popular",
  },
  {
    id: "480p",
    label: "480p SD",
    subLabel: "854 × 480 • Standard Quality",
    sizeEstimate: "~18 - 35 MB",
  },
  {
    id: "360p",
    label: "360p Instant",
    subLabel: "640 × 360 • Quickest Download",
    sizeEstimate: "~10 - 20 MB",
    badge: "Fastest",
  },
];

const AUDIO_QUALITIES: QualityOption<AudioQuality>[] = [
  {
    id: "320kbps",
    label: "320 kbps MP3",
    subLabel: "Studio High Quality Audio",
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
  const isRunningInApp = useIsRunningInApp();
  const [format, setFormat] = useState<FormatType>("mp4");
  const [selectedVideoQuality, setSelectedVideoQuality] =
    useState<VideoQuality>("720p");
  const [selectedAudioQuality, setSelectedAudioQuality] =
    useState<AudioQuality>("320kbps");

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [isDone, setIsDone] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedFileName, setDownloadedFileName] = useState<string>("");

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Clear state on modal close or new video
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadStatus("");
      setIsDone(false);
      setDownloadError(null);
    }
  }, [isOpen, video.id]);

  if (!isOpen) return null;

  const currentQuality = format === "mp4" ? selectedVideoQuality : selectedAudioQuality;
  const sanitizedTitle =
    video.title
      .replace(/[\\/:*?"<>|]/g, "")
      .trim()
      .slice(0, 50) || "video";

  // Trigger browser's native file download without opening new tabs
  const triggerNativeDownload = (fileUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    // Invisible trigger to avoid navigating away
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 2000);
  };

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(8);
    setDownloadStatus("Connecting to Native In-App Downloader...");
    setIsDone(false);
    setDownloadError(null);

    // Case 1: Custom User-Uploaded Video (from Studio)
    if (video.videoUrl) {
      setTimeout(() => {
        setDownloadProgress(50);
        setDownloadStatus("Preparing direct local file...");
      }, 300);

      setTimeout(() => {
        setDownloadProgress(100);
        setDownloadStatus("Saved directly to your device!");
        setIsDone(true);
        setIsDownloading(false);
        const fileName = `${sanitizedTitle}_${currentQuality}.${format}`;
        setDownloadedFileName(fileName);
        triggerNativeDownload(video.videoUrl!, fileName);
      }, 800);
      return;
    }

    // Case 2: YouTube Video via our own native backend service
    try {
      setDownloadProgress(15);
      setDownloadStatus("Initializing stream extraction on server...");

      const startRes = await fetch(
        `/api/youtube/download/start?id=${encodeURIComponent(video.id)}&format=${format}&quality=${currentQuality}&title=${encodeURIComponent(sanitizedTitle)}`
      );

      if (!startRes.ok) {
        throw new Error(`Server returned status ${startRes.status}`);
      }

      const startData = await startRes.json();

      if (startData.error) {
        throw new Error(startData.error);
      }

      const jobId = startData.jobId;

      // If already finished and cached
      if (startData.stage === "complete" && startData.downloadUrl) {
        setDownloadProgress(100);
        setDownloadStatus("File ready! Saving to your device...");
        setIsDone(true);
        setIsDownloading(false);
        const fileName = `${sanitizedTitle}_${currentQuality}.${format}`;
        setDownloadedFileName(fileName);
        triggerNativeDownload(startData.downloadUrl, fileName);
        return;
      }

      // Poll progress every 600ms
      let attempts = 0;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 120) {
          // 72 seconds max timeout
          clearInterval(pollIntervalRef.current);
          setIsDownloading(false);
          setDownloadError("Download took too long. Please try 360p Fast Mode or MP3.");
          return;
        }

        try {
          const pollRes = await fetch(`/api/youtube/download/status/${jobId}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();

          if (pollData.stage === "downloading") {
            setDownloadProgress(Math.max(20, pollData.progress || 35));
            setDownloadStatus(
              format === "mp4"
                ? `Downloading ${currentQuality} video stream (${pollData.progress || 35}%)...`
                : `Extracting high-clarity audio stream (${pollData.progress || 35}%)...`
            );
          } else if (pollData.stage === "converting") {
            setDownloadProgress(Math.max(85, pollData.progress || 90));
            setDownloadStatus(
              format === "mp4"
                ? `Muxing & finalizing ${currentQuality} MP4 file...`
                : `Encoding high quality MP3 file...`
            );
          } else if (pollData.stage === "complete" && pollData.downloadUrl) {
            clearInterval(pollIntervalRef.current);
            setDownloadProgress(100);
            setDownloadStatus("Complete! Download started in your browser.");
            setIsDone(true);
            setIsDownloading(false);

            const fileName = `${sanitizedTitle}_${currentQuality}.${format}`;
            setDownloadedFileName(fileName);
            triggerNativeDownload(pollData.downloadUrl, fileName);
          } else if (pollData.stage === "failed") {
            clearInterval(pollIntervalRef.current);
            setIsDownloading(false);
            setDownloadError(
              pollData.error || "This specific video has playback restrictions on server."
            );
          }
        } catch (e: any) {
          console.warn("Poll check error:", e.message);
        }
      }, 650);
    } catch (err: any) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setIsDownloading(false);
      setDownloadError(err?.message || "Failed to connect to internal downloader.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        id="video-download-modal"
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  APNA Downloader
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-400" />
                  Direct In-App
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Direct phone / PC download • Kisi or website per jane ki zaroorat nahi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
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
              className="w-20 sm:w-24 h-14 sm:h-16 rounded-lg object-cover shrink-0 border border-stone-800"
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
              1. Choose Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFormat("mp4");
                  setDownloadError(null);
                }}
                disabled={isDownloading}
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
                      HD Video
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Video with clear sound
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormat("mp3");
                  setDownloadError(null);
                }}
                disabled={isDownloading}
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
              2. Select Quality / Resolution
            </label>

            {format === "mp4" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIDEO_QUALITIES.map((q) => {
                  const isSelected = selectedVideoQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={isDownloading}
                      onClick={() => {
                        setSelectedVideoQuality(q.id);
                        setDownloadError(null);
                      }}
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
                      disabled={isDownloading}
                      onClick={() => {
                        setSelectedAudioQuality(q.id);
                        setDownloadError(null);
                      }}
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

          {/* Active Download Progress Box */}
          {isDownloading && (
            <div className="p-3.5 bg-stone-950 border border-emerald-700/60 rounded-xl space-y-2.5 animate-fade-in shadow-inner">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>{downloadStatus}</span>
                </span>
                <span className="text-stone-300 font-mono font-bold">
                  {downloadProgress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 flex items-center gap-1">
                <span>Direct in-app processing: file will download directly into your browser without redirecting.</span>
              </p>
            </div>
          )}

          {/* Download Error Alert & In-App Recovery */}
          {downloadError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-start gap-2 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-red-200">
                    In-App Downloader Notice
                  </p>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    {downloadError}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setFormat("mp4");
                    setSelectedVideoQuality("360p");
                    setDownloadError(null);
                    setTimeout(handleStartDownload, 50);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Try 360p Fast Mode</span>
                </button>
                <button
                  onClick={() => {
                    setFormat("mp3");
                    setSelectedAudioQuality("128kbps");
                    setDownloadError(null);
                    setTimeout(handleStartDownload, 50);
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Music className="w-3 h-3" />
                  <span>Try MP3 Audio</span>
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {isDone && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/70 rounded-xl flex items-start gap-2.5 text-emerald-200 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <p className="font-bold text-white text-xs">
                  Downloading Started Directly!
                </p>
                <p className="text-stone-300 mt-0.5">
                  File aapke phone ya computer ke <strong>Downloads / Files app</strong> mein save ho rahi hai. Kisi or website per jaane ki koi zaroorat nahi pari!
                </p>
                {downloadedFileName && (
                  <p className="mt-1.5 text-emerald-300 font-mono text-[10px] truncate bg-emerald-900/40 px-2 py-1 rounded border border-emerald-700/50">
                    Saved: {downloadedFileName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Storage & Native File Notice */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 space-y-1.5 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5 font-semibold text-stone-300">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Where does the file get saved?</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-stone-400 pl-1 text-[10.5px]">
              <li>
                <strong>Mobile (Android):</strong> Directly in your <em>Files / Downloads</em> folder.
              </li>
              <li>
                <strong>iPhone / iPad:</strong> Built-in <em>Files app → Downloads</em> tab.
              </li>
              <li>
                <strong>Laptop / Desktop:</strong> Browser's default <em>Downloads</em> folder.
              </li>
            </ul>
          </div>

          {/* Official Android App APK Option (Hidden if already in app) */}
          {!isRunningInApp && (
            <a
              id="download-modal-apk-btn"
              href="https://apkpure.com/p/app.youpro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-stone-900 border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-stone-200 group-hover:text-emerald-300 transition-colors">
                    Prefer the Native Android App?
                  </span>
                  <p className="text-[10.5px] text-stone-400">Download YouPro APK on APKPure</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-400 transition-colors shrink-0" />
            </a>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-400 hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% In-App • No ads • No redirects</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {isDone ? "Close" : "Cancel"}
            </button>

            <button
              id="modal-confirm-download-btn"
              onClick={handleStartDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : isDone ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Download Again</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Download {format.toUpperCase()} ({currentQuality})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
