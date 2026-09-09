import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileVideo,
  Globe,
  Lock,
  EyeOff,
  Tag,
  Sparkles,
} from "lucide-react";
import { uploadVideoToYouTube } from "../services/youtubeChannelService";

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (video: { id: string; title: string }) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState<"public" | "private" | "unlisted">("public");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successVideo, setSuccessVideo] = useState<{ id: string; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      // Auto-set title from file name without extension
      if (!title) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(cleanName);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.type.startsWith("video/")) {
        setFile(selected);
        if (!title) {
          setTitle(selected.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        setError("Please drop a valid video file (MP4, MOV, WebM, AVI).");
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide a title for your video.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const uploaded = await uploadVideoToYouTube({
        file,
        title: title.trim(),
        description: description.trim(),
        tags,
        privacyStatus,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      setSuccessVideo(uploaded);
      onUploadSuccess(uploaded);
    } catch (err: any) {
      console.error("Video upload error:", err);
      setError(err?.message || "Failed to upload video to YouTube.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setTagsInput("");
    setPrivacyStatus("public");
    setSuccessVideo(null);
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Upload Video to Your YouTube Channel
              </h3>
              <p className="text-[11px] text-stone-400">
                Direct instant upload to your connected YouTube profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {successVideo ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-700/60 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  Video Uploaded Successfully!
                </h4>
                <p className="text-xs text-stone-300 mt-1 max-w-sm mx-auto">
                  "{successVideo.title}" has been transmitted to your YouTube channel and is now processing.
                </p>
              </div>

              {successVideo.id && successVideo.id !== "uploaded" && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={`https://www.youtube.com/watch?v=${successVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow"
                  >
                    <span>View on YouTube</span>
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-stone-800 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  Upload Another Video
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Dropzone */}
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-700 hover:border-red-500/80 bg-stone-950/60 hover:bg-stone-950 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600/10 group-hover:bg-red-600/20 text-red-500 flex items-center justify-center transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-200">
                      Drag and drop your video file here, or click to browse
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Supports MP4, MOV, WebM, AVI, or MKV
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                      <FileVideo className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1 text-stone-400 hover:text-red-400 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Video Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next.js 15 Full Tutorial - Build Modern Web Apps"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500"
                  disabled={isUploading}
                  required
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what your video is about, timestamps, links, etc."
                  rows={3}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500 resize-none"
                  disabled={isUploading}
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-stone-400" />
                  <span>Tags (comma separated)</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="react, tutorial, tech, education"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500"
                  disabled={isUploading}
                />
              </div>

              {/* Privacy Setting */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Visibility / Privacy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrivacyStatus("public")}
                    disabled={isUploading}
                    className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      privacyStatus === "public"
                        ? "bg-red-600/20 border-red-500 text-white"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacyStatus("unlisted")}
                    disabled={isUploading}
                    className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      privacyStatus === "unlisted"
                        ? "bg-amber-600/20 border-amber-500 text-white"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>Unlisted</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacyStatus("private")}
                    disabled={isUploading}
                    className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      privacyStatus === "private"
                        ? "bg-blue-600/20 border-blue-500 text-white"
                        : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </button>
                </div>
              </div>

              {/* Upload Progress Indicator */}
              {isUploading && (
                <div className="space-y-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                      <span>Transmitting video to YouTube...</span>
                    </span>
                    <span className="font-mono font-bold text-red-400">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all duration-200 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Upload Error</p>
                    <p className="text-[11px] text-red-400 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Footer buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !file || !title.trim()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload to YouTube</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
