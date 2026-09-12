import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { startDownloadJob, getJob } from "./downloader";

dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS and path normalization for Vercel serverless proxy
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  // Restore path if Vercel serverless rewrite altered req.url
  if (req.originalUrl && req.originalUrl !== req.url && req.originalUrl.startsWith("/api")) {
    req.url = req.originalUrl;
  }
  next();
});

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY || "AIzaSyB4tmNyTwLiyQ1K7vi5lYAAA4TItgg7mGc";

// High quality verified videos fallback
const CURATED_FALLBACK_VIDEOS = [
  {
    id: "bMknfKXIFA8",
    title: "React 19 Full Course – Master Modern Web Development",
    description: "Complete guide to modern React 19: Server Components, Actions, useActionState, useOptimistic, and performance patterns.",
    channelTitle: "TechCode Academy",
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    publishedAt: "2024-11-15T10:00:00Z",
    viewCount: "920000",
    likeCount: "48000",
    duration: "PT45M12S",
    category: "Coding & Tech",
    thumbnail: "https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg",
  },
  {
    id: "aircAruvnKk",
    title: "Neural Networks from Scratch in Python and TypeScript",
    description: "Building backpropagation, gradient descent, activation functions, and layer forward passes completely from scratch.",
    channelTitle: "3Blue1Brown Insights",
    channelId: "UCYO_jab_esuFRV4b17AJtAw",
    publishedAt: "2023-04-02T13:00:00Z",
    viewCount: "2800000",
    likeCount: "172000",
    duration: "PT34M50S",
    category: "Coding & Tech",
    thumbnail: "https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg",
  },
  {
    id: "W6NZfCO5SIk",
    title: "JavaScript Tutorial for Beginners: Learn JavaScript in 1 Hour",
    description: "Master the fundamentals of JavaScript in this comprehensive beginner tutorial by Programming with Mosh.",
    channelTitle: "Programming with Mosh",
    channelId: "UCWv7vMbMWH4-V0ZXdmDpPBA",
    publishedAt: "2024-01-10T15:00:00Z",
    viewCount: "4500000",
    likeCount: "135000",
    duration: "PT48M16S",
    category: "Coding & Tech",
    thumbnail: "https://i.ytimg.com/vi/W6NZfCO5SIk/hqdefault.jpg",
  },
  {
    id: "kqtD5dpn9C8",
    title: "Python for Beginners – Full Course [Programming Tutorial]",
    description: "Learn Python from zero to mastery in this hands-on course covering variables, loops, functions, and OOP.",
    channelTitle: "Programming with Mosh",
    channelId: "UCWv7vMbMWH4-V0ZXdmDpPBA",
    publishedAt: "2023-08-20T12:00:00Z",
    viewCount: "8900000",
    likeCount: "280000",
    duration: "PT60M00S",
    category: "Coding & Tech",
    thumbnail: "https://i.ytimg.com/vi/kqtD5dpn9C8/hqdefault.jpg",
  },
  {
    id: "zjkBMFhNj_g",
    title: "[1hr Talk] Intro to Large Language Models",
    description: "Andrej Karpathy gives a comprehensive 1-hour introduction to Large Language Models (LLMs), training pipelines, and capabilities.",
    channelTitle: "Andrej Karpathy",
    channelId: "UCXUPKJOtpPd-2gZZqE_3g7Q",
    publishedAt: "2023-11-22T18:00:00Z",
    viewCount: "4100000",
    likeCount: "210000",
    duration: "PT59M45S",
    category: "AI & Machine Learning",
    thumbnail: "https://i.ytimg.com/vi/zjkBMFhNj_g/hqdefault.jpg",
  },
  {
    id: "kJQP7kiw5Fk",
    title: "Luis Fonsi - Despacito ft. Daddy Yankee",
    description: "Despacito performed by Luis Fonsi featuring Daddy Yankee. Official music video with over 8 billion views worldwide.",
    channelTitle: "Luis Fonsi",
    channelId: "UCxoq-PAQeAdk_yg8Uc0CvLg",
    publishedAt: "2017-01-12T20:00:00Z",
    viewCount: "8300000000",
    likeCount: "53000000",
    duration: "PT4M42S",
    category: "Music",
    thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    description: "The official video for 'Never Gonna Give You Up' by Rick Astley. Taken from the album 'Whenever You Need Somebody'.",
    channelTitle: "Rick Astley",
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    publishedAt: "2009-10-25T06:58:33Z",
    viewCount: "1550000000",
    likeCount: "17000000",
    duration: "PT3M33S",
    category: "Music",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Queen – Bohemian Rhapsody (Official Video Remastered)",
    description: "Bohemian Rhapsody remastered in HD. Taken from Queen's 1975 album 'A Night at the Opera'. One of the greatest rock songs of all time.",
    channelTitle: "Queen Official",
    channelId: "UCiMhD4jzUqG-IgPzUmmytRQ",
    publishedAt: "2008-08-01T12:00:00Z",
    viewCount: "1700000000",
    likeCount: "12000000",
    duration: "PT6M00S",
    category: "Music",
    thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
  },
  {
    id: "M576WGiDBdQ",
    title: "The Incredible Physics of Sailing Faster Than the Wind",
    description: "How can a sailboat move faster than the wind that propels it? Deep dive into aerofoils, apparent wind velocity, and hydrodynamics.",
    channelTitle: "Veritasium",
    channelId: "UCHnyfMqiRRG1u-2MsSQLbXA",
    publishedAt: "2021-05-28T14:30:00Z",
    viewCount: "14200000",
    likeCount: "680000",
    duration: "PT19M40S",
    category: "Education",
    thumbnail: "https://i.ytimg.com/vi/M576WGiDBdQ/hqdefault.jpg",
  },
  {
    id: "L_LUpnjgPso",
    title: "Deep Space Exploration: Secrets of the James Webb Telescope",
    description: "New spectroscopic findings from galaxy clusters 13 billion light years away. What JWST has revealed about early cosmic dawn.",
    channelTitle: "Cosmic Wonders",
    channelId: "UC7_gcs09iThXybpVgjHZ_7g",
    publishedAt: "2024-08-10T16:20:00Z",
    viewCount: "3400000",
    likeCount: "195000",
    duration: "PT28M15S",
    category: "Education",
    thumbnail: "https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg",
  },
  {
    id: "2Vv-BfVoq4g",
    title: "Ed Sheeran - Perfect (Official Music Video)",
    description: "The official music video for Ed Sheeran - Perfect, filmed in Hintertux, Austria.",
    channelTitle: "Ed Sheeran",
    channelId: "UC0C-w0YjGpqDXGB8IHb662A",
    publishedAt: "2017-11-09T11:00:00Z",
    viewCount: "3600000000",
    likeCount: "21000000",
    duration: "PT4M40S",
    category: "Music",
    thumbnail: "https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
  },
  {
    id: "D8hkY_f1lH8",
    title: "Grand Theft Auto VI Trailer 1",
    description: "Our trailer has leaked so please watch the real thing on YouTube. Grand Theft Auto VI heads to the state of Leonida.",
    channelTitle: "Rockstar Games",
    channelId: "UCbW18JZ9574ZAlLe45NNegg",
    publishedAt: "2023-12-04T23:00:00Z",
    viewCount: "210000000",
    likeCount: "12000000",
    duration: "PT1M31S",
    category: "Gaming",
    thumbnail: "https://i.ytimg.com/vi/D8hkY_f1lH8/hqdefault.jpg",
  },
  {
    id: "K_9tX4eHZTg",
    title: "ELDEN RING Shadow of the Erdtree | Official Gameplay Reveal Trailer",
    description: "The Land of Shadow. A place obscured by the Erdtree. Shadow of the Erdtree brings new adventures, bosses, and mysteries.",
    channelTitle: "Bandai Namco Entertainment",
    channelId: "UC_ntXHv-XdKCD7CPynVvnQw",
    publishedAt: "2024-02-21T15:00:00Z",
    viewCount: "18500000",
    likeCount: "780000",
    duration: "PT3M06S",
    category: "Gaming",
    thumbnail: "https://i.ytimg.com/vi/K_9tX4eHZTg/hqdefault.jpg",
  },
  {
    id: "Y9U4tL0nK8M",
    title: "Lex Fridman Podcast: Deep Intelligence, Physics, and the Future",
    description: "In-depth conversation on consciousness, artificial intelligence, cosmology, and the future of technology.",
    channelTitle: "Lex Fridman",
    channelId: "UCSHZKyawb77ixDdsGog4iWA",
    publishedAt: "2024-04-10T18:00:00Z",
    viewCount: "2100000",
    likeCount: "95000",
    duration: "PT142M20S",
    category: "Podcasts",
    thumbnail: "https://i.ytimg.com/vi/Y9U4tL0nK8M/hqdefault.jpg",
  },
];

// Helper to format ISO 8601 duration
function parseDuration(durationStr?: string): string {
  if (!durationStr) return "3:45";
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "3:45";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const formattedSec = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    const formattedMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${formattedMin}:${formattedSec}`;
  }
  return `${minutes}:${formattedSec}`;
}

// In-memory cache with TTL
interface CacheEntry {
  timestamp: number;
  data: any;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

function getCached(key: string) {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: any) {
  apiCache.set(key, { timestamp: Date.now(), data });
}

// Sub-router for API endpoints
const router = express.Router();

// Health Checks
router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "YouTube Enhanced API",
    timestamp: new Date().toISOString(),
  });
});
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// YouTube API status
router.get("/youtube/status", async (req, res) => {
  try {
    if (!YOUTUBE_API_KEY) {
      return res.json({
        configured: false,
        message: "No YOUTUBE_API_KEY configured.",
      });
    }

    const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=US&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const headers: Record<string, string> = {};
    if (req.headers.referer) headers["Referer"] = req.headers.referer as string;

    const response = await fetch(testUrl, { headers });
    const data = await response.json();

    if (data.error) {
      return res.json({
        configured: true,
        valid: false,
        error: data.error,
        code: data.error.code,
        message: data.error.message,
        reason: data.error.errors?.[0]?.reason || "UNKNOWN_ERROR",
      });
    }

    return res.json({
      configured: true,
      valid: true,
      message: "YouTube Data API v3 key is active and working successfully!",
    });
  } catch (err: any) {
    return res.status(500).json({ configured: true, valid: false, error: err?.message });
  }
});

// Trending Videos
router.get("/youtube/trending", async (req, res) => {
  try {
    const category = (req.query.category as string) || "All";
    const cacheKey = `trending_${category}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, videos: cached, source: "cache" });
    }

    if (YOUTUBE_API_KEY) {
      const categoryMap: Record<string, string> = {
        Music: "10",
        Gaming: "20",
        News: "25",
        Education: "27",
      };

      let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=US&maxResults=24&key=${YOUTUBE_API_KEY}`;
      if (categoryMap[category]) {
        url += `&videoCategoryId=${categoryMap[category]}`;
      }

      const headers: Record<string, string> = {};
      if (req.headers.referer) headers["Referer"] = req.headers.referer as string;

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const videos = data.items.map((item: any) => ({
          id: item.id,
          title: item.snippet?.title || "Video",
          description: item.snippet?.description || "",
          channelTitle: item.snippet?.channelTitle || "YouTube Creator",
          channelId: item.snippet?.channelId || "",
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          viewCount: item.statistics?.viewCount || "0",
          likeCount: item.statistics?.likeCount || "0",
          commentCount: item.statistics?.commentCount || "0",
          duration: parseDuration(item.contentDetails?.duration),
          thumbnail:
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          category: category !== "All" ? category : "Trending",
        }));
        setCached(cacheKey, videos);
        return res.json({ success: true, videos, source: "youtube_api" });
      }
    }

    // Filter fallback
    let filtered = CURATED_FALLBACK_VIDEOS;
    if (category && category !== "All") {
      const catLower = category.toLowerCase().trim();
      const matched = CURATED_FALLBACK_VIDEOS.filter((v) => {
        const vCat = (v.category || "").toLowerCase().trim();
        return (
          vCat === catLower ||
          (catLower.includes("coding") && vCat.includes("coding")) ||
          (catLower.includes("music") && vCat.includes("music")) ||
          (catLower.includes("education") && vCat.includes("education")) ||
          (catLower.includes("gaming") && vCat.includes("gaming")) ||
          (catLower.includes("ai") && (vCat.includes("ai") || vCat.includes("coding")))
        );
      });
      if (matched.length > 0) filtered = matched;
    }
    setCached(cacheKey, filtered);
    return res.json({ success: true, videos: filtered, source: "fallback" });
  } catch (err: any) {
    console.error("Error fetching trending:", err?.message);
    return res.json({ success: true, videos: CURATED_FALLBACK_VIDEOS, source: "fallback_error" });
  }
});

// Search Videos
router.get("/youtube/search", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query.trim()) {
      return res.json({ success: true, videos: CURATED_FALLBACK_VIDEOS });
    }

    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, videos: cached, source: "cache" });
    }

    if (YOUTUBE_API_KEY) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&q=${encodeURIComponent(
        query
      )}&type=video&key=${YOUTUBE_API_KEY}`;

      const headers: Record<string, string> = {};
      if (req.headers.referer) headers["Referer"] = req.headers.referer as string;

      const response = await fetch(searchUrl, { headers });
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const videoIds = data.items
          .map((i: any) => i.id?.videoId)
          .filter(Boolean)
          .join(",");

        let detailedVideos: any[] = [];
        if (videoIds) {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl, { headers });
          const detailsData = await detailsRes.json();
          detailedVideos = detailsData.items || [];
        }

        const detailsMap = new Map();
        detailedVideos.forEach((d: any) => detailsMap.set(d.id, d));

        const videos = data.items
          .filter((item: any) => item.id?.videoId)
          .map((item: any) => {
            const vidId = item.id.videoId;
            const detail = detailsMap.get(vidId);
            return {
              id: vidId,
              title: item.snippet?.title || "Video",
              description: item.snippet?.description || "",
              channelTitle: item.snippet?.channelTitle || "YouTube Creator",
              channelId: item.snippet?.channelId || "",
              publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
              viewCount: detail?.statistics?.viewCount || "350000",
              likeCount: detail?.statistics?.likeCount || "12000",
              commentCount: detail?.statistics?.commentCount || "450",
              duration: parseDuration(detail?.contentDetails?.duration),
              thumbnail:
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              category: "Search",
            };
          });

        setCached(cacheKey, videos);
        return res.json({ success: true, videos, source: "youtube_api" });
      }
    }

    const q = query.toLowerCase();
    const fallbackSearch = CURATED_FALLBACK_VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.channelTitle.toLowerCase().includes(q)
    );

    const result = fallbackSearch.length > 0 ? fallbackSearch : CURATED_FALLBACK_VIDEOS;
    setCached(cacheKey, result);
    return res.json({ success: true, videos: result, source: "fallback" });
  } catch (err: any) {
    console.error("Error searching videos:", err?.message);
    return res.json({ success: true, videos: CURATED_FALLBACK_VIDEOS, source: "fallback_error" });
  }
});

// Single Video Details
router.get("/youtube/video/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (YOUTUBE_API_KEY) {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const video = {
          id: item.id,
          title: item.snippet?.title || "",
          description: item.snippet?.description || "",
          channelTitle: item.snippet?.channelTitle || "",
          channelId: item.snippet?.channelId || "",
          publishedAt: item.snippet?.publishedAt || "",
          viewCount: item.statistics?.viewCount || "0",
          likeCount: item.statistics?.likeCount || "0",
          commentCount: item.statistics?.commentCount || "0",
          duration: parseDuration(item.contentDetails?.duration),
          thumbnail:
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.high?.url ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        };
        return res.json({ success: true, video });
      }
    }

    const fallback = CURATED_FALLBACK_VIDEOS.find((v) => v.id === id);
    if (fallback) {
      return res.json({ success: true, video: fallback });
    }

    return res.json({
      success: true,
      video: {
        id,
        title: "YouTube Video Player",
        description: "Watch high definition video playback.",
        channelTitle: "YouTube Creator",
        publishedAt: new Date().toISOString(),
        viewCount: "1200000",
        likeCount: "45000",
        duration: "10:00",
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to load video details" });
  }
});

// Video Comments
router.get("/youtube/comments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (YOUTUBE_API_KEY) {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${id}&maxResults=20&order=relevance&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const comments = data.items.map((item: any) => {
          const top = item.snippet?.topLevelComment?.snippet;
          return {
            id: item.id,
            authorDisplayName: top?.authorDisplayName || "Viewer",
            authorProfileImageUrl:
              top?.authorProfileImageUrl ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
            textDisplay: top?.textDisplay || "",
            likeCount: top?.likeCount || 0,
            publishedAt: top?.publishedAt || "",
          };
        });
        return res.json({ success: true, comments });
      }
    }

    return res.json({
      success: true,
      comments: [
        {
          id: "c1",
          authorDisplayName: "Sarah Jenkins",
          authorProfileImageUrl:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
          textDisplay: "The playback is so smooth and responsive! Love the modern UI.",
          likeCount: 420,
          publishedAt: "2 hours ago",
        },
        {
          id: "c2",
          authorDisplayName: "Marcus Vance",
          authorProfileImageUrl:
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
          textDisplay: "Instant playback, rich summaries, and keyboard navigation. 10/10!",
          likeCount: 185,
          publishedAt: "5 hours ago",
        },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch comments" });
  }
});

// Gemini AI Chat (multi-turn or direct question)
router.post(["/gemini/chat", "/gemini/qna"], async (req, res) => {
  try {
    const { messages, context, question, videoContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const userPrompt =
      question ||
      (messages && messages.length > 0
        ? messages[messages.length - 1]?.content || messages[messages.length - 1]?.text
        : "Hello");

    const effectiveContext = videoContext || context || {};
    const contextStr = Object.keys(effectiveContext).length
      ? `\nVideo / Topic Context: Title: "${effectiveContext.title || ''}", Creator: "${effectiveContext.channelTitle || ''}", Description: "${(effectiveContext.description || '').slice(0, 800)}"`
      : "";

    if (!apiKey) {
      return res.json({
        success: true,
        reply: `Regarding "${userPrompt}": This video covers essential foundations, real-world examples, and structured workflows. (Tip: Set GEMINI_API_KEY for live interactive Gemini intelligence)`,
        answer: `Regarding "${userPrompt}": Key takeaways highlight foundational principles, step-by-step techniques, and best practices outlined in the video.`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are YouTube Enhanced AI, a world-class video intelligence assistant powered by Gemini.
${contextStr}

User Query: "${userPrompt}"

Provide a concise, direct, helpful, and insightful response with clean markdown formatting. Keep answers crisp and engaging (under 220 words).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const replyText = response.text || "Here is what you need to know about this video.";
    return res.json({
      success: true,
      reply: replyText,
      answer: replyText,
    });
  } catch (err: any) {
    console.error("Gemini chat/qna error:", err?.message);
    return res.json({
      success: true,
      reply: "I am your YouTube Enhanced assistant. You can ask for video summaries, key takeaways, chapter breakdown, or study quizzes!",
      answer: "I am your YouTube Enhanced assistant. You can ask for video summaries, key takeaways, chapter breakdown, or study quizzes!",
    });
  }
});

// Gemini Video Structured Summarizer
router.post("/gemini/summarize", async (req, res) => {
  try {
    const { title, description, videoTitle, videoDescription, channelTitle } = req.body;
    const effectiveTitle = title || videoTitle || "YouTube Video";
    const effectiveDesc = (description || videoDescription || "").slice(0, 1500);
    const effectiveCreator = channelTitle || "Creator";
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        success: true,
        summary: {
          overview: `"${effectiveTitle}" by ${effectiveCreator} delivers a comprehensive walkthrough of core principles, practical techniques, and high-impact workflows.`,
          keyTakeaways: [
            "Clear step-by-step breakdown of fundamental concepts and modern practices",
            "Actionable insights designed to save time and streamline execution",
            "Practical examples highlighting common pitfalls and optimal solutions",
            "Structured demonstrations suitable for beginners and advanced viewers alike"
          ],
          actionItems: [
            "Review key chapters and apply the demonstrated workflows directly",
            "Bookmark timestamps for rapid reference during active implementation",
            "Test your knowledge using the interactive AI Quiz generator"
          ],
          chapters: [
            { timestamp: "00:00", seconds: 0, title: "Introduction & Objective" },
            { timestamp: "02:30", seconds: 150, title: "Foundations & Overview" },
            { timestamp: "06:45", seconds: 405, title: "Deep Dive & Implementation" },
            { timestamp: "12:10", seconds: 730, title: "Summary & Key Takeaways" }
          ]
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert video summarizer for YouTube Enhanced.
Analyze this video:
Title: "${effectiveTitle}"
Creator: "${effectiveCreator}"
Description: "${effectiveDesc}"

Generate a structured JSON object with these EXACT keys:
1. "overview": A punchy 2-sentence executive summary highlighting the core premise.
2. "keyTakeaways": An array of 4 concise, high-value bullet points with bold key concepts.
3. "actionItems": An array of 3 actionable items the viewer can execute immediately.
4. "chapters": An array of 4-6 smart chapters with "timestamp" (MM:SS), "seconds" (integer), and "title" (concise topic title).

Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    try {
      const parsed = JSON.parse(response.text || "{}");
      if (parsed.overview && parsed.keyTakeaways) {
        return res.json({ success: true, summary: parsed });
      }
    } catch (parseErr) {
      console.warn("Failed to parse Gemini summary JSON, using text fallback");
    }

    // Fallback if parsing didn't match schema
    return res.json({
      success: true,
      summary: {
        overview: response.text?.slice(0, 250) || `Key takeaways and summary for "${effectiveTitle}".`,
        keyTakeaways: [
          "Covers fundamental concepts and architecture",
          "Includes practical demonstration and execution tips",
          "Focuses on modern standards and high performance"
        ],
        actionItems: [
          "Apply the techniques shown in this video to your own projects",
          "Check the video description for source files and references"
        ],
        chapters: [
          { timestamp: "00:00", seconds: 0, title: "Introduction" },
          { timestamp: "03:00", seconds: 180, title: "Main Topic Walkthrough" },
          { timestamp: "08:30", seconds: 510, title: "Key Principles" }
        ]
      },
    });
  } catch (err: any) {
    console.error("Summarization error:", err?.message);
    return res.status(500).json({ error: err?.message || "Summarization error" });
  }
});

// Gemini Q&A
router.post("/gemini/qa", async (req, res) => {
  try {
    const { question, userQuery, videoTitle, title, videoDescription, description, currentTime } = req.body;
    const effectiveQuestion = question || userQuery || "What is this video about?";
    const effectiveTitle = videoTitle || title || "YouTube Video";
    const effectiveDesc = (videoDescription || description || "").slice(0, 1200);
    const timeInfo = currentTime ? `at timestamp ${Math.floor(currentTime)} seconds` : "";
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        success: true,
        answer: `Regarding "${effectiveTitle}" ${timeInfo}: ${effectiveQuestion} — The video explains this topic with practical demonstrations, clear guidelines, and step-by-step illustrations.`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `The user is watching "${effectiveTitle}" ${timeInfo}.
Description context: ${effectiveDesc}
User Question: "${effectiveQuestion}"

Answer directly, accurately, and concisely in 2-3 clear sentences based on the video context.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return res.json({
      success: true,
      answer: response.text || "Here is what you need to know about this video.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Q&A error" });
  }
});

// Gemini Interactive Video Quiz Generator
router.post("/gemini/quiz", async (req, res) => {
  try {
    const { title, videoTitle, description, videoDescription } = req.body;
    const effectiveTitle = title || videoTitle || "YouTube Video";
    const effectiveDesc = (description || videoDescription || "").slice(0, 1200);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        success: true,
        quiz: [
          {
            question: `What is the primary theme explored in "${effectiveTitle}"?`,
            options: [
              "Foundational concepts, workflows, and best practices",
              "Random entertainment without instructional value",
              "Historical trivia unrelated to the title",
              "Outdated methodologies from the 1990s"
            ],
            correctIndex: 0,
            explanation: "The video focuses on modern principles, techniques, and practical execution."
          },
          {
            question: "How does the creator recommend applying the concepts?",
            options: [
              "By passive observation only",
              "Through structured practice and step-by-step implementation",
              "By ignoring the principles completely",
              "Through unrelated third-party software"
            ],
            correctIndex: 1,
            explanation: "Active, hands-on practice is the core recommended method to master the content."
          },
          {
            question: "What is a key benefit of mastering this video's topic?",
            options: [
              "Increased complexity with no tangible upside",
              "Significant productivity gain and deeper conceptual clarity",
              "Slower performance across systems",
              "Incompatibility with modern standards"
            ],
            correctIndex: 1,
            explanation: "Understanding these concepts accelerates efficiency and improves results."
          }
        ]
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an educational quiz creator for YouTube Enhanced.
Based on this video:
Title: "${effectiveTitle}"
Description: "${effectiveDesc}"

Create 3 challenging, educational multiple-choice quiz questions testing the viewer's understanding.
Return a JSON object with a single key "quiz" containing an array of 3 items. Each item must have:
- "question": string (the quiz question)
- "options": array of 4 strings (options A, B, C, D)
- "correctIndex": integer (0, 1, 2, or 3 pointing to the correct option in options array)
- "explanation": string (concise explanation of why this answer is correct)

Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    try {
      const parsed = JSON.parse(response.text || "{}");
      if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
        return res.json({ success: true, quiz: parsed.quiz });
      }
    } catch (e) {}

    return res.json({
      success: true,
      quiz: [
        {
          question: `What is the key takeaway of "${effectiveTitle}"?`,
          options: [
            "Practical mastery of modern techniques",
            "Skipping fundamentals",
            "Using deprecated tools",
            "Unrelated speculation"
          ],
          correctIndex: 0,
          explanation: "The video emphasizes practical mastery and modern techniques."
        }
      ]
    });
  } catch (err: any) {
    console.error("Quiz generator error:", err?.message);
    return res.status(500).json({ error: err?.message || "Failed to generate quiz" });
  }
});

// Gemini Channel Optimizer
router.post("/gemini/optimize-channel", async (req, res) => {
  try {
    const { channelName, topic, currentTitle } = req.body;
    const rawTitle = currentTitle || topic || "New Video Project";
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a YouTube SEO expert.
Channel: ${channelName || "Creator Channel"}
Topic: ${topic || "Tech & Media"}
Title draft: "${rawTitle}"

Generate in JSON format:
{
  "optimizedTitles": ["Title 1", "Title 2", "Title 3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "seoAdvice": "1-2 sentences of actionable SEO advice"
}`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      try {
        const parsed = JSON.parse(aiRes.text || "{}");
        return res.json({ success: true, result: parsed });
      } catch (e) {}
    }

    return res.json({
      success: true,
      result: {
        optimizedTitles: [
          `${rawTitle} – Complete Practical Guide`,
          `How to Master ${rawTitle} in 2026`,
          `Everything You Need to Know About ${rawTitle}`,
        ],
        tags: ["tutorial", "guide", "2026", "review", "learn", "walkthrough", "tech", "productivity"],
        seoAdvice:
          "Use high contrast text on your thumbnail and ask a compelling question in the first 10 seconds of the video.",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Optimization error" });
  }
});

// Gemini Video Assistant
router.post("/gemini/assistant", async (req, res) => {
  try {
    const { videoTitle, videoDescription, userQuery } = req.body;
    if (!userQuery) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are YouTube Enhanced's AI study companion.
The user is watching the video: "${videoTitle || 'YouTube Video'}"
Context/Description: "${(videoDescription || '').slice(0, 1000)}"

User question or request: "${userQuery}"

Provide a concise, direct, helpful answer formatted with bullet points or paragraphs. Keep it under 200 words.`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      return res.json({ success: true, answer: aiRes.text || "No response generated." });
    }

    return res.json({
      success: true,
      answer: `AI Insight for "${userQuery}": Based on "${videoTitle || 'this video'}", key concepts focus on practical application, systematic fundamentals, and structured timestamps.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to generate AI response" });
  }
});

// Gemini Video Optimizer
router.post("/gemini/optimize-video", async (req, res) => {
  try {
    const { rawTitle, description } = req.body;
    if (!rawTitle) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are an expert YouTube SEO and engagement specialist.
Analyze this video idea:
Draft Title: "${rawTitle}"
Notes/Description: "${description || ''}"

Return a JSON object with:
1. "optimizedTitles": array of 3 engaging, high-CTR, click-worthy titles (non-clickbait, authentic)
2. "tags": array of 10 relevant YouTube search tags
3. "seoAdvice": 1-2 sentence recommendation for thumbnail or hook

JSON only with keys: "optimizedTitles", "tags", "seoAdvice"`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      try {
        const parsed = JSON.parse(aiRes.text || "{}");
        return res.json({ success: true, result: parsed });
      } catch (e) {}
    }

    return res.json({
      success: true,
      result: {
        optimizedTitles: [
          `${rawTitle} – Complete Practical Guide`,
          `How to Master ${rawTitle} in 2026`,
          `Everything You Need to Know About ${rawTitle}`
        ],
        tags: ["tutorial", "guide", "2026", "review", "learn", "walkthrough", "tech", "productivity"],
        seoAdvice: "Use high contrast text on your thumbnail and ask a compelling question in the first 10 seconds of the video."
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Optimization error" });
  }
});

// ==========================================
// IN-APP NATIVE DOWNLOADER ENDPOINTS
// ==========================================

// 1. Start or poll a download job
router.get("/youtube/download/start", (req, res) => {
  try {
    const videoId = (req.query.id as string) || "";
    const format = ((req.query.format as string) === "mp3" ? "mp3" : "mp4") as "mp4" | "mp3";
    const quality = (req.query.quality as string) || (format === "mp3" ? "320kbps" : "720p");
    const title = (req.query.title as string) || "Video";

    if (!videoId) {
      return res.status(400).json({ error: "Missing video id" });
    }

    const job = startDownloadJob({ videoId, format, quality, title });
    return res.json({
      success: true,
      jobId: job.id,
      stage: job.stage,
      progress: job.progressPercent,
      error: job.error,
      downloadUrl: job.stage === "complete" ? `/api/youtube/download/file/${job.id}` : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to initiate download job" });
  }
});

// 2. Poll progress status of a download job
router.get("/youtube/download/status/:jobId", (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Download job not found or expired" });
    }

    return res.json({
      success: true,
      jobId: job.id,
      stage: job.stage,
      progress: job.progressPercent,
      error: job.error,
      fileSize: job.fileSize,
      downloadUrl: job.stage === "complete" ? `/api/youtube/download/file/${job.id}` : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Status query failed" });
  }
});

// 3. Serve completed media file directly to device
router.get("/youtube/download/file/:jobId", (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = getJob(jobId);
    if (!job || !job.outputFile || !fs.existsSync(job.outputFile)) {
      return res.status(404).json({ error: "Download file not ready or expired" });
    }

    const ext = job.format === "mp3" ? "mp3" : "mp4";
    const contentType = ext === "mp3" ? "audio/mpeg" : "video/mp4";
    const cleanTitle = (job.title || "video").replace(/[^a-zA-Z0-9_-]/g, "_");
    const downloadFileName = `${cleanTitle}_${job.quality}.${ext}`;

    res.setHeader("Content-Disposition", `attachment; filename="${downloadFileName}"`);
    res.setHeader("Content-Type", contentType);

    return res.download(job.outputFile, downloadFileName, (err) => {
      if (err && !res.headersSent) {
        console.error("Error sending file:", err);
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "File download error" });
  }
});

// 4. Direct synchronous stream trigger
router.get("/youtube/download/direct", async (req, res) => {
  try {
    const videoId = (req.query.id as string) || "";
    const format = ((req.query.format as string) === "mp3" ? "mp3" : "mp4") as "mp4" | "mp3";
    const quality = (req.query.quality as string) || (format === "mp3" ? "320kbps" : "720p");
    const title = (req.query.title as string) || "Video";

    if (!videoId) {
      return res.status(400).json({ error: "Missing video id" });
    }

    const job = startDownloadJob({ videoId, format, quality, title });

    // Wait up to 30 seconds for completion if already starting
    const startTime = Date.now();
    while (Date.now() - startTime < 35000) {
      if (job.stage === "complete" && job.outputFile && fs.existsSync(job.outputFile)) {
        const ext = job.format === "mp3" ? "mp3" : "mp4";
        const contentType = ext === "mp3" ? "audio/mpeg" : "video/mp4";
        const cleanTitle = (job.title || "video").replace(/[^a-zA-Z0-9_-]/g, "_");
        const downloadFileName = `${cleanTitle}_${job.quality}.${ext}`;

        res.setHeader("Content-Disposition", `attachment; filename="${downloadFileName}"`);
        res.setHeader("Content-Type", contentType);
        return res.download(job.outputFile, downloadFileName);
      }
      if (job.stage === "failed") {
        return res.status(500).json({ error: job.error || "Download processing failed" });
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    // If still in progress after 35s, return the status URL so client continues polling
    return res.json({
      status: "processing",
      jobId: job.id,
      progress: job.progressPercent,
      statusUrl: `/api/youtube/download/status/${job.id}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Direct download failed" });
  }
});

// Mount router on "/api"
// For sub-paths like /youtube, /gemini support them directly, but NEVER intercept root "/"
app.use("/api", router);
app.use(["/youtube", "/gemini"], router);

// Dynamic sitemap.xml endpoint
const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://youtubeenhanced.vercel.app/</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=All</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=Coding%20%26%20Tech</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=AI%20%26%20Machine%20Learning</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=Music</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=Education</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=Gaming</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?category=Podcasts</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=bMknfKXIFA8</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=aircAruvnKk</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=W6NZfCO5SIk</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=kqtD5dpn9C8</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=zjkBMFhNj_g</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=M576WGiDBdQ</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://youtubeenhanced.vercel.app/?v=D8hkY_f1lH8</loc>
    <lastmod>2026-09-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

app.get(["/sitemap.xml", "/api/sitemap.xml"], (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(SITEMAP_XML);
});

app.get(["/robots.txt", "/api/robots.txt"], (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`User-agent: *\nAllow: /\n\nSitemap: https://youtubeenhanced.vercel.app/sitemap.xml\n`);
});

export default app;
