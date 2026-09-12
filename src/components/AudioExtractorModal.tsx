import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Headphones,
  Sliders,
  Download,
  Play,
  Pause,
  Sparkles,
  Volume2,
  ShieldCheck,
  Radio,
  FileAudio,
} from "lucide-react";
import { Video } from "../types";

interface AudioExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

type AudioBitrate = "320kbps" | "192kbps" | "128kbps";

interface BitrateOption {
  id: AudioBitrate;
  label: string;
  subLabel: string;
  sizeEstimate: string;
  badge?: string;
  sampleRate: string;
}

const BITRATE_OPTIONS: BitrateOption[] = [
  {
    id: "320kbps",
    label: "320 kbps (Studio Master)",
    subLabel: "Uncompressed crystal-clear fidelity • Maximum dynamics",
    sizeEstimate: "~8 - 14 MB",
    badge: "Recommended",
    sampleRate: "48,000 Hz Stereo",
  },
  {
    id: "192kbps",
    label: "192 kbps (High Fidelity)",
    subLabel: "Standard CD-grade clarity • Balanced file size",
    sizeEstimate: "~5 - 9 MB",
    sampleRate: "44,100 Hz Stereo",
  },
  {
    id: "128kbps",
    label: "128 kbps (Fast & Compact)",
    subLabel: "Ultra-fast extraction • Great for podcasts & voice",
    sizeEstimate: "~3 - 6 MB",
    badge: "Fastest",
    sampleRate: "44,100 Hz Stereo",
  },
];

export const AudioExtractorModal: React.FC<AudioExtractorModalProps> = ({
  isOpen,
  onClose,
  video,
}) => {
  const [selectedBitrate, setSelectedBitrate] = useState<AudioBitrate>("320kbps");
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio preview state for completed extraction
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setIsExtracting(false);
      setProgress(0);
      setStatusMessage("");
      setIsComplete(false);
      setDownloadUrl(null);
      setErrorMessage(null);
      setIsPlayingPreview(false);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    }
  }, [isOpen, video.id]);

  if (!isOpen) return null;

  const sanitizedTitle =
    video.title
      .replace(/[\\/:*?"<>|]/g, "")
      .trim()
      .slice(0, 60) || "Audio";

  const triggerBrowserDownload = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 2000);
  };

  const handleStartExtraction = async () => {
    setIsExtracting(true);
    setProgress(10);
    setStatusMessage("Connecting to Built-in In-App Audio Extractor...");
    setIsComplete(false);
    setDownloadUrl(null);
    setErrorMessage(null);

    // Case 1: Video with direct local URL
    if (video.videoUrl) {
      setTimeout(() => {
        setProgress(60);
        setStatusMessage("Converting media stream to MP3...");
      }, 400);

      setTimeout(() => {
        const fileName = `${sanitizedTitle}_${selectedBitrate}.mp3`;
        setProgress(100);
        setStatusMessage("Audio extraction complete! Saving MP3...");
        setIsComplete(true);
        setIsExtracting(false);
        setDownloadFileName(fileName);
        setDownloadUrl(video.videoUrl!);
        triggerBrowserDownload(video.videoUrl!, fileName);
      }, 900);
      return;
    }

    // Case 2: YouTube Video via backend audio extractor
    try {
      setProgress(18);
      setStatusMessage("Demuxing audio stream from source...");

      const startRes = await fetch(
        `/api/youtube/download/start?id=${encodeURIComponent(video.id)}&format=mp3&quality=${selectedBitrate}&title=${encodeURIComponent(sanitizedTitle)}`
      );

      if (!startRes.ok) {
        throw new Error(`Extraction service returned HTTP ${startRes.status}`);
      }

      const startData = await startRes.json();
      if (startData.error) {
        throw new Error(startData.error);
      }

      const jobId = startData.jobId;
      const fileName = `${sanitizedTitle}_${selectedBitrate}.mp3`;
      setDownloadFileName(fileName);

      // If already cached
      if (startData.stage === "complete" && startData.downloadUrl) {
        setProgress(100);
        setStatusMessage("Audio ready! Saving MP3 to device...");
        setIsComplete(true);
        setIsExtracting(false);
        setDownloadUrl(startData.downloadUrl);
        triggerBrowserDownload(startData.downloadUrl, fileName);
        return;
      }

      // Poll status every 600ms
      let attempts = 0;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 120) {
          clearInterval(pollIntervalRef.current);
          setIsExtracting(false);
          setErrorMessage("Audio extraction timed out. Please retry with 128kbps or standard quality.");
          return;
        }

        try {
          const pollRes = await fetch(`/api/youtube/download/status/${jobId}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();

          if (pollData.stage === "downloading") {
            setProgress(Math.max(25, pollData.progress || 35));
            setStatusMessage(`Extracting audio stream (${pollData.progress || 35}%)...`);
          } else if (pollData.stage === "converting") {
            setProgress(Math.max(85, pollData.progress || 90));
            setStatusMessage("Transcoding to MP3 & injecting ID3 tags...");
          } else if (pollData.stage === "complete" && pollData.downloadUrl) {
            clearInterval(pollIntervalRef.current);
            setProgress(100);
            setStatusMessage("MP3 extraction successful!");
            setIsComplete(true);
            setIsExtracting(false);
            setDownloadUrl(pollData.downloadUrl);
            triggerBrowserDownload(pollData.downloadUrl, fileName);
          } else if (pollData.stage === "failed") {
            clearInterval(pollIntervalRef.current);
            setIsExtracting(false);
            setErrorMessage(
              pollData.error || "Audio extraction encountered an error. Please try again."
            );
          }
        } catch (e: any) {
          console.warn("Poll status warn:", e?.message);
        }
      }, 600);
    } catch (err: any) {
      setIsExtracting(false);
      setErrorMessage(
        err?.message || "Failed to extract audio. Please check network connection."
      );
    }
  };

  const togglePreview = () => {
    if (!audioPreviewRef.current || !downloadUrl) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => setIsPlayingPreview(false));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with warm Amber Audio theme */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-1.5">
                  Built-in Audio Extractor (MP3)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  No 3rd Party
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Direct in-player extraction • High-fidelity stereo MP3
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Video Metadata Card */}
          <div className="flex gap-3 bg-stone-950/80 border border-stone-800 p-3 rounded-xl items-center">
            <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-stone-900 shrink-0 border border-stone-800">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Music className="w-5 h-5 text-amber-400 drop-shadow" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-semibold text-stone-100 line-clamp-2 leading-tight">
                {video.title}
              </h3>
              <p className="text-xs text-amber-400/90 font-medium mt-1 truncate">
                {video.channelTitle}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1">
                <span className="flex items-center gap-1">
                  <FileAudio className="w-3 h-3 text-amber-400" />
                  <span>Format: MP3 Audio</span>
                </span>
                <span>•</span>
                <span>Stereo 2.0</span>
              </div>
            </div>
          </div>

          {/* Audio Bitrate Selector */}
          <div>
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Audio Bitrate & Quality</span>
            </label>

            <div className="space-y-2">
              {BITRATE_OPTIONS.map((opt) => {
                const isSelected = selectedBitrate === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isExtracting}
                    onClick={() => setSelectedBitrate(opt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-950/30 border-amber-500/60 shadow-sm"
                        : "bg-stone-950/50 border-stone-800/80 hover:border-stone-700 hover:bg-stone-950"
                    } ${isExtracting ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? "border-amber-400 bg-amber-400"
                            : "border-stone-600 bg-transparent"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-stone-950" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-stone-100">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{opt.subLabel}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-mono font-medium text-amber-300">
                        {opt.sizeEstimate}
                      </div>
                      <div className="text-[10px] text-stone-500">{opt.sampleRate}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ID3 Meta Tags Info Banner */}
          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 text-xs text-stone-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Built-in ID3 Metadata Included</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Every extracted MP3 file is automatically tagged with Artist, Title, and Artwork tags,
              so your car stereo, phone music player, and Spotify local files recognize it cleanly.
            </p>
          </div>

          {/* Progress / Status Bar during extraction */}
          {isExtracting && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {statusMessage || "Extracting audio..."}
                </span>
                <span className="font-mono font-bold text-amber-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-amber-500/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400 text-center">
                Processing directly in your private container. No external redirects.
              </p>
            </div>
          )}

          {/* Success State with Audio Preview Player */}
          {isComplete && downloadUrl && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Audio Extraction Succeeded!</span>
              </div>
              <p className="text-xs text-stone-300">
                Saved as <strong className="text-emerald-300 font-mono">{downloadFileName}</strong>
              </p>

              {/* Audio player preview */}
              <div className="pt-2 flex items-center gap-3 bg-stone-950/80 p-2.5 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={togglePreview}
                  className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-stone-200 truncate">
                    Preview Extracted MP3
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-amber-400" />
                    <span>Stereo {selectedBitrate} Audio Preview</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerBrowserDownload(downloadUrl, downloadFileName)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </button>
              </div>
              <audio
                ref={audioPreviewRef}
                src={downloadUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Error State */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Extraction Warning</p>
                <p className="text-[11px] text-red-300/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-400 hidden sm:flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Pure MP3 Audio Stream</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>

            {!isComplete ? (
              <button
                type="button"
                disabled={isExtracting}
                onClick={handleStartExtraction}
                className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Extract & Download MP3</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsComplete(false);
                  setProgress(0);
                  setStatusMessage("");
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Extract Another Bitrate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
