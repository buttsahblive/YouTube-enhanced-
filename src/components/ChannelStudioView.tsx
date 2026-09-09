import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  YouTubeChannelProfile,
  MyChannelVideo,
  getMyChannel,
  getMyChannelVideos,
  deleteYouTubeVideo,
} from "../services/youtubeChannelService";
import {
  Video as VideoIcon,
  Upload,
  Users,
  Eye,
  Play,
  Trash2,
  Edit3,
  ExternalLink,
  Globe,
  Lock,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle,
} from "lucide-react";
import { VideoUploadModal } from "./VideoUploadModal";
import { EditVideoModal } from "./EditVideoModal";
import { Video } from "../types";

interface ChannelStudioViewProps {
  user: User | null;
  onLogin: () => void;
  isLoggingIn: boolean;
  onSelectVideo: (video: Video) => void;
}

export const ChannelStudioView: React.FC<ChannelStudioViewProps> = ({
  user,
  onLogin,
  isLoggingIn,
  onSelectVideo,
}) => {
  const [channel, setChannel] = useState<YouTubeChannelProfile | null>(null);
  const [videos, setVideos] = useState<MyChannelVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<MyChannelVideo | null>(null);

  // Filter & Search inside channel videos
  const [filterQuery, setFilterQuery] = useState("");
  const [filterPrivacy, setFilterPrivacy] = useState<"all" | "public" | "unlisted" | "private">("all");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadChannelData = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const channelData = await getMyChannel();
      setChannel(channelData);
      if (channelData) {
        const myVideos = await getMyChannelVideos();
        setVideos(myVideos);
      }
    } catch (err: any) {
      console.error("Failed to load channel:", err);
      setError(err?.message || "Failed to load channel details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadChannelData();
    }
  }, [user]);

  const handleDeleteVideo = async (videoId: string) => {
    setDeletingId(videoId);
    try {
      await deleteYouTubeVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert("Delete failed: " + (err?.message || "Error"));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesPrivacy = filterPrivacy === "all" || v.privacyStatus === filterPrivacy;
    return matchesSearch && matchesPrivacy;
  });

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto shadow-xl">
          <VideoIcon className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Manage Your YouTube Channel
          </h1>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            Link your Google account with YouTube permissions to view your channel stats, manage existing uploads, and directly upload new video files to your channel instantly.
          </p>
        </div>
        <button
          onClick={onLogin}
          disabled={isLoggingIn}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 mx-auto transition-all shadow-lg disabled:opacity-50"
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting Google Account...</span>
            </>
          ) : (
            <>
              <VideoIcon className="w-4 h-4" />
              <span>Sign in & Connect YouTube Channel</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Channel Header Banner */}
      {channel && channel.bannerImageUrl && (
        <div className="w-full h-36 md:h-48 rounded-2xl overflow-hidden border border-stone-800 relative bg-stone-900">
          <img
            src={channel.bannerImageUrl}
            alt="Channel Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Channel Profile & Stats Overview */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={
                channel?.thumbnails?.high ||
                channel?.thumbnails?.medium ||
                user.photoURL ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              }
              alt={channel?.title || user.displayName || "Channel"}
              className="w-20 h-20 rounded-full border-2 border-red-500 object-cover shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">
                  {channel?.title || user.displayName || "My YouTube Channel"}
                </h1>
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-bold">
                  Active Channel
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1 max-w-xl">
                {channel?.description || "Manage your video catalog, upload new releases, and track audience performance directly from YouTube Enhanced Studio."}
              </p>
              {channel?.customUrl && (
                <p className="text-[11px] text-red-400 font-mono mt-1">
                  {channel.customUrl}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={loadChannelData}
              disabled={isLoading}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors"
              title="Refresh Channel Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {channel?.id && (
              <a
                href={`https://www.youtube.com/channel/${channel.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>View on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          </div>
        </div>

        {/* Channel Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-stone-800">
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>Subscribers</span>
            </div>
            <p className="text-lg font-bold text-white">
              {channel?.statistics?.subscriberCount
                ? Number(channel.statistics.subscriberCount).toLocaleString()
                : "0"}
            </p>
          </div>

          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Eye className="w-3.5 h-3.5 text-red-400" />
              <span>Total Lifetime Views</span>
            </div>
            <p className="text-lg font-bold text-white">
              {channel?.statistics?.viewCount
                ? Number(channel.statistics.viewCount).toLocaleString()
                : "0"}
            </p>
          </div>

          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <VideoIcon className="w-3.5 h-3.5 text-red-400" />
              <span>Uploaded Videos</span>
            </div>
            <p className="text-lg font-bold text-white">
              {channel?.statistics?.videoCount || videos.length}
            </p>
          </div>
        </div>
      </div>

      {/* Error notification & one-click resolution */}
      {error && (
        <div className="p-4 bg-red-950/70 border border-red-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-100">YouTube Data API Activation Required</p>
              <p className="text-xs text-red-300/90 mt-1 max-w-2xl leading-relaxed">
                Project <code className="bg-red-900/50 px-1.5 py-0.5 rounded text-red-200 font-mono text-[11px]">379967977891</code> needs the YouTube Data API v3 turned on in Google Cloud Console. Click the button to enable it in 1 click:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href="https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=379967977891"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all flex-1 sm:flex-initial"
            >
              <span>Enable YouTube API</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={loadChannelData}
              disabled={isLoading}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Check again after enabling"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Manage Videos Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <VideoIcon className="w-4 h-4 text-red-500" />
              <span>Manage Channel Videos ({videos.length})</span>
            </h2>
            <p className="text-[11px] text-stone-400">
              Edit metadata, update privacy status, or delete videos directly
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search filter */}
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search my videos..."
                className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Privacy filter */}
            <select
              value={filterPrivacy}
              onChange={(e) => setFilterPrivacy(e.target.value as any)}
              className="bg-stone-950 border border-stone-700 text-stone-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Privacy</option>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        {/* Video Table / List */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <span>Loading channel videos...</span>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 bg-stone-950/40 border border-dashed border-stone-800 rounded-xl p-6">
            <VideoIcon className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-300">
              {videos.length === 0 ? "No videos uploaded yet" : "No videos match your filter"}
            </p>
            <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
              {videos.length === 0
                ? "Click 'Upload Video' to publish your first video to YouTube."
                : "Try clearing your search query or privacy filter."}
            </p>
            {videos.length === 0 && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Upload Video Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredVideos.map((vid) => (
              <div
                key={vid.id}
                className="bg-stone-950/70 border border-stone-800 hover:border-stone-700 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    onClick={() =>
                      onSelectVideo({
                        id: vid.id,
                        title: vid.title,
                        description: vid.description,
                        channelTitle: channel?.title || user.displayName || "My Channel",
                        publishedAt: vid.publishedAt,
                        viewCount: vid.viewCount || "0",
                        likeCount: vid.likeCount || "0",
                        duration: "Video",
                        thumbnail: vid.thumbnail,
                      })
                    }
                    className="relative w-28 aspect-video rounded-lg overflow-hidden bg-stone-900 shrink-0 cursor-pointer group"
                  >
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-stone-200 truncate">
                      {vid.title}
                    </h4>
                    <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                      {vid.description || "No description provided"}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                      {/* Privacy Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                          vid.privacyStatus === "public"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                            : vid.privacyStatus === "unlisted"
                            ? "bg-amber-950 text-amber-400 border border-amber-800/60"
                            : "bg-blue-950 text-blue-400 border border-blue-800/60"
                        }`}
                      >
                        {vid.privacyStatus === "public" ? (
                          <Globe className="w-2.5 h-2.5" />
                        ) : vid.privacyStatus === "unlisted" ? (
                          <EyeOff className="w-2.5 h-2.5" />
                        ) : (
                          <Lock className="w-2.5 h-2.5" />
                        )}
                        <span className="capitalize">{vid.privacyStatus}</span>
                      </span>

                      <span className="text-stone-500">
                        {Number(vid.viewCount || 0).toLocaleString()} views
                      </span>
                      <span className="text-stone-600">•</span>
                      <span className="text-stone-500">
                        {Number(vid.likeCount || 0).toLocaleString()} likes
                      </span>
                      <span className="text-stone-600">•</span>
                      <span className="text-stone-500">
                        {new Date(vid.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Video Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() =>
                      onSelectVideo({
                        id: vid.id,
                        title: vid.title,
                        description: vid.description,
                        channelTitle: channel?.title || user.displayName || "My Channel",
                        publishedAt: vid.publishedAt,
                        viewCount: vid.viewCount || "0",
                        likeCount: vid.likeCount || "0",
                        duration: "Video",
                        thumbnail: vid.thumbnail,
                      })
                    }
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Play</span>
                  </button>

                  <button
                    onClick={() => setEditingVideo(vid)}
                    className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                    title="Edit video title & privacy"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={`https://www.youtube.com/watch?v=${vid.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Delete Button with inline confirmation */}
                  {deleteConfirmId === vid.id ? (
                    <div className="flex items-center gap-1 bg-red-950/80 border border-red-800/80 p-1 rounded-lg text-[10px]">
                      <span className="text-red-300 px-1 font-semibold">Delete?</span>
                      <button
                        onClick={() => handleDeleteVideo(vid.id)}
                        disabled={deletingId === vid.id}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold"
                      >
                        {deletingId === vid.id ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(vid.id)}
                      className="p-1.5 text-stone-500 hover:text-red-400 rounded-lg hover:bg-stone-800 transition-colors"
                      title="Delete video from channel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          loadChannelData();
        }}
      />

      {/* Edit Video Modal */}
      <EditVideoModal
        isOpen={!!editingVideo}
        video={editingVideo}
        onClose={() => setEditingVideo(null)}
        onUpdated={(updated) => {
          setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        }}
      />
    </div>
  );
};
