import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const DOWNLOAD_DIR = "/tmp/youtube_downloads";
if (!fs.existsSync(DOWNLOAD_DIR)) {
  try {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create download dir", e);
  }
}

// Clean up files older than 45 minutes
function cleanOldFiles() {
  try {
    if (!fs.existsSync(DOWNLOAD_DIR)) return;
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const now = Date.now();
    for (const f of files) {
      const full = path.join(DOWNLOAD_DIR, f);
      try {
        const stat = fs.statSync(full);
        if (now - stat.mtimeMs > 45 * 60 * 1000) {
          fs.unlinkSync(full);
        }
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.error("Clean old files error:", err);
  }
}

setInterval(cleanOldFiles, 10 * 60 * 1000);

export interface DownloadJob {
  id: string;
  videoId: string;
  format: "mp4" | "mp3";
  quality: string;
  title: string;
  stage: "starting" | "downloading" | "converting" | "complete" | "failed";
  progressPercent: number;
  outputFile: string | null;
  fileSize: number;
  error?: string;
  createdAt: number;
}

const activeJobs = new Map<string, DownloadJob>();

export function getJob(jobId: string): DownloadJob | undefined {
  return activeJobs.get(jobId);
}

export function startDownloadJob(options: {
  videoId: string;
  format?: "mp4" | "mp3";
  quality?: string;
  title?: string;
}): DownloadJob {
  cleanOldFiles();

  const videoId = options.videoId.trim();
  const format = options.format === "mp3" ? "mp3" : "mp4";
  const quality = options.quality || (format === "mp3" ? "320kbps" : "720p");
  const rawTitle = (options.title || "Video").replace(/[/\\?%*:|"<>]/g, "_").trim();
  const safeTitle = rawTitle.slice(0, 60) || "Download";

  // Check if an existing identical job is already running or complete
  const existingKey = `${videoId}_${format}_${quality}`;
  for (const job of activeJobs.values()) {
    if (
      job.videoId === videoId &&
      job.format === format &&
      job.quality === quality &&
      (job.stage === "complete" || job.stage === "downloading" || job.stage === "converting")
    ) {
      if (job.stage === "complete" && job.outputFile && fs.existsSync(job.outputFile)) {
        return job;
      }
      if (Date.now() - job.createdAt < 5 * 60 * 1000) {
        return job;
      }
    }
  }

  const jobId = `${existingKey}_${Date.now()}`;
  const filePrefix = `${safeTitle.replace(/\s+/g, "_")}_${jobId.slice(-6)}`;
  const templateOutput = path.join(DOWNLOAD_DIR, `${filePrefix}.%(ext)s`);

  const job: DownloadJob = {
    id: jobId,
    videoId,
    format,
    quality,
    title: safeTitle,
    stage: "starting",
    progressPercent: 5,
    outputFile: null,
    fileSize: 0,
    createdAt: Date.now(),
  };

  activeJobs.set(jobId, job);

  // Build arguments for yt-dlp
  const ytDlpPath = path.resolve("./bin/yt-dlp");
  try {
    if (fs.existsSync(ytDlpPath)) {
      fs.chmodSync(ytDlpPath, 0o755);
    }
  } catch {}

  const args: string[] = [
    "--ffmpeg-location",
    "/usr/bin/ffmpeg",
    "--no-playlist",
    "--no-check-certificates",
    "--newline",
  ];

  if (format === "mp3") {
    let audioQuality = "0"; // 320k best
    if (quality === "192kbps") audioQuality = "2";
    if (quality === "128kbps") audioQuality = "5";

    args.push(
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      audioQuality,
      "-o",
      templateOutput,
      `https://www.youtube.com/watch?v=${videoId}`
    );
  } else {
    // MP4 video
    let formatSelector = "18/b[ext=mp4]/best";
    if (quality === "1080p") {
      formatSelector =
        "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]/18/best";
    } else if (quality === "720p") {
      formatSelector =
        "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/18/best";
    } else if (quality === "480p") {
      formatSelector =
        "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/18/best";
    } else if (quality === "360p") {
      formatSelector = "18/bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]/best";
    }

    args.push(
      "-f",
      formatSelector,
      "--merge-output-format",
      "mp4",
      "-o",
      templateOutput,
      `https://www.youtube.com/watch?v=${videoId}`
    );
  }

  const child = spawn(ytDlpPath, args);

  child.stdout.on("data", (data: Buffer) => {
    const text = data.toString();
    // Parse progress: [download]  45.6% of ~ 11.28MiB
    const match = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (match && match[1]) {
      const p = parseFloat(match[1]);
      if (!isNaN(p)) {
        job.stage = "downloading";
        job.progressPercent = Math.min(95, Math.max(job.progressPercent, Math.round(p)));
      }
    }
    if (text.includes("[ExtractAudio]") || text.includes("[Merger]")) {
      job.stage = "converting";
      job.progressPercent = 92;
    }
  });

  let stderrOutput = "";
  child.stderr.on("data", (data: Buffer) => {
    stderrOutput += data.toString();
  });

  child.on("close", (code) => {
    if (code === 0) {
      // Find output file
      try {
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const match = files.find(
          (f) => f.startsWith(filePrefix) && (f.endsWith(".mp4") || f.endsWith(".mp3"))
        );
        if (match) {
          const finalPath = path.join(DOWNLOAD_DIR, match);
          const stat = fs.statSync(finalPath);
          job.outputFile = finalPath;
          job.fileSize = stat.size;
          job.stage = "complete";
          job.progressPercent = 100;
          return;
        }
      } catch (e) {
        console.error("Error reading output file:", e);
      }
      job.stage = "failed";
      job.error = "File processed but not found on server.";
    } else {
      job.stage = "failed";
      const cleanErr = stderrOutput
        .split("\n")
        .filter((l) => l.includes("ERROR:") || l.includes("Sign in"))
        .join(" ");
      job.error = cleanErr || `Process exited with code ${code}`;
    }
  });

  return job;
}
