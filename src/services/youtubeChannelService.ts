import { Video } from "../types";
import { getAccessToken } from "./googleAuth";

export interface YouTubeChannelProfile {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default?: string;
    medium?: string;
    high?: string;
  };
  bannerImageUrl?: string;
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface MyChannelVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  privacyStatus: "public" | "private" | "unlisted";
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
  tags?: string[];
}

export interface VideoUploadParams {
  file: File;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "public" | "private" | "unlisted";
  onProgress?: (percent: number) => void;
}

// 1. Fetch authenticated user's YouTube Channel
export async function getMyChannel(): Promise<YouTubeChannelProfile | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please sign in with Google to view and manage your YouTube channel.");
  }

  const url = "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,brandingSettings&mine=true";
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to fetch YouTube channel (${response.status})`
    );
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    return null; // User does not have a YouTube channel yet on this Google account
  }

  const item = data.items[0];
  return {
    id: item.id,
    title: item.snippet?.title || "My Channel",
    description: item.snippet?.description || "",
    customUrl: item.snippet?.customUrl,
    publishedAt: item.snippet?.publishedAt,
    thumbnails: {
      default: item.snippet?.thumbnails?.default?.url,
      medium: item.snippet?.thumbnails?.medium?.url,
      high: item.snippet?.thumbnails?.high?.url,
    },
    bannerImageUrl: item.brandingSettings?.image?.bannerExternalUrl,
    statistics: {
      viewCount: item.statistics?.viewCount || "0",
      subscriberCount: item.statistics?.subscriberCount || "0",
      hiddenSubscriberCount: !!item.statistics?.hiddenSubscriberCount,
      videoCount: item.statistics?.videoCount || "0",
    },
  };
}

// 2. Fetch authenticated user's uploaded videos (with privacy & stats)
export async function getMyChannelVideos(): Promise<MyChannelVideo[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please sign in with Google.");
  }

  // First fetch the uploads playlist ID or search mine
  const searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50";
  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!searchRes.ok) {
    const errorData = await searchRes.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to fetch channel videos (${searchRes.status})`
    );
  }

  const searchData = await searchRes.json();
  if (!searchData.items || searchData.items.length === 0) {
    return [];
  }

  const videoIds = searchData.items
    .map((item: any) => item.id?.videoId)
    .filter(Boolean)
    .join(",");

  if (!videoIds) return [];

  // Get full details including status (privacyStatus) and statistics
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics&id=${videoIds}`;
  const detailsRes = await fetch(detailsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const detailsData = await detailsRes.json();
  if (!detailsData.items) return [];

  return detailsData.items.map((item: any) => ({
    id: item.id,
    title: item.snippet?.title || "Untitled",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || "",
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    privacyStatus: (item.status?.privacyStatus as any) || "public",
    viewCount: item.statistics?.viewCount || "0",
    likeCount: item.statistics?.likeCount || "0",
    commentCount: item.statistics?.commentCount || "0",
    tags: item.snippet?.tags || [],
  }));
}

// 3. Upload a new video file directly to YouTube channel
export async function uploadVideoToYouTube({
  file,
  title,
  description,
  tags,
  privacyStatus,
  onProgress,
}: VideoUploadParams): Promise<{ id: string; title: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please sign in with Google to upload videos to your YouTube channel.");
  }

  // Resumable upload metadata init
  const metadata = {
    snippet: {
      title: title.trim() || file.name,
      description: description.trim(),
      tags: tags,
      categoryId: "22", // People & Blogs default
    },
    status: {
      privacyStatus: privacyStatus || "public",
      selfDeclaredMadeForKids: false,
    },
  };

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": file.size.toString(),
        "X-Upload-Content-Type": file.type || "video/*",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const errorData = await initRes.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `YouTube upload initialization failed (${initRes.status})`
    );
  }

  const uploadLocation = initRes.headers.get("Location");
  if (!uploadLocation) {
    throw new Error("Failed to receive upload endpoint from YouTube.");
  }

  // Upload video binary with XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadLocation);
    xhr.setRequestHeader("Content-Type", file.type || "video/*");

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            id: response.id,
            title: response.snippet?.title || title,
          });
        } catch (e) {
          resolve({ id: "uploaded", title });
        }
      } else {
        let errMessage = `Upload failed with HTTP status ${xhr.status}`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed?.error?.message) {
            errMessage = parsed.error.message;
          }
        } catch (e) {}
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error occurred during video upload."));
    };

    xhr.send(file);
  });
}

// 4. Update an existing video (Title, Description, Tags, Privacy)
export async function updateYouTubeVideo(params: {
  videoId: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus: "public" | "private" | "unlisted";
  categoryId?: string;
}): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please sign in with Google.");
  }

  const payload = {
    id: params.videoId,
    snippet: {
      title: params.title,
      description: params.description,
      tags: params.tags || [],
      categoryId: params.categoryId || "22",
    },
    status: {
      privacyStatus: params.privacyStatus,
    },
  };

  const response = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,status", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to update video (${response.status})`
    );
  }
}

// 5. Delete a video from authenticated user's channel
export async function deleteYouTubeVideo(videoId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please sign in with Google.");
  }

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to delete video (${response.status})`
    );
  }
}
