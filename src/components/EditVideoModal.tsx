import React, { useState } from "react";
import { MyChannelVideo } from "../services/youtubeChannelService";
import { updateYouTubeVideo } from "../services/youtubeChannelService";
import {
  X,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  EyeOff,
  Lock,
  Tag,
} from "lucide-react";

interface EditVideoModalProps {
  video: MyChannelVideo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: MyChannelVideo) => void;
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  video,
  isOpen,
  onClose,
  onUpdated,
}) => {
  if (!isOpen || !video) return null;

  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [tagsInput, setTagsInput] = useState(video.tags?.join(", ") || "");
  const [privacyStatus, setPrivacyStatus] = useState<"public" | "private" | "unlisted">(
    video.privacyStatus
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await updateYouTubeVideo({
        videoId: video.id,
        title: title.trim(),
        description: description.trim(),
        tags,
        privacyStatus,
      });

      onUpdated({
        ...video,
        title: title.trim(),
        description: description.trim(),
        tags,
        privacyStatus,
      });
      onClose();
    } catch (err: any) {
      console.error("Update video error:", err);
      setError(err?.message || "Failed to update video.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-white">Edit Video Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3 p-2.5 bg-stone-950 rounded-xl border border-stone-800">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-20 aspect-video object-cover rounded-lg border border-stone-800"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-stone-200 truncate">
                {video.title}
              </p>
              <p className="text-[10px] text-stone-500">ID: {video.id}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Video Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <span>Tags</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Privacy Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrivacyStatus("public")}
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

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
