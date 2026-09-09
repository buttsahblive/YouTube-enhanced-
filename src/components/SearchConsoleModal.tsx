import React, { useState, useEffect } from "react";
import {
  Globe,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Code,
  FileCode,
  RefreshCw,
} from "lucide-react";

export const SearchConsoleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/seo/verification")
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
            setSavedToken(data.token);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      // Clean token if user pasted the entire <meta ...> tag
      let cleanToken = token.trim();
      const metaMatch = cleanToken.match(/content=["']([^"']+)["']/i);
      if (metaMatch && metaMatch[1]) {
        cleanToken = metaMatch[1];
        setToken(cleanToken);
      }

      const res = await fetch("/api/seo/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cleanToken }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedToken(cleanToken);
        setStatusMessage("Verification token saved successfully! You can now verify in Search Console.");
        // Dynamically update document meta tag
        const metaTag = document.getElementById("google-site-verification-meta");
        if (metaTag) {
          metaTag.setAttribute("content", cleanToken);
        } else {
          const newMeta = document.createElement("meta");
          newMeta.name = "google-site-verification";
          newMeta.content = cleanToken;
          newMeta.id = "google-site-verification-meta";
          document.head.appendChild(newMeta);
        }
      }
    } catch (err: any) {
      setStatusMessage("Failed to save verification token: " + err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const appUrl = window.location.origin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-stone-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Google Search Console Owner Verification</span>
                <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                  SEO & Indexing
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Verify domain ownership to index your web app on Google Search
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status notice */}
        {statusMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Method 1: HTML Tag (Most Popular) */}
        <div className="space-y-3 bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Code className="w-4 h-4 text-blue-400" />
              <span>Recommended: HTML Meta Tag Verification</span>
            </div>
            {savedToken && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            In Google Search Console, select <strong>HTML tag</strong> as the verification method. Paste either the full meta tag or just the code below:
          </p>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder='e.g. google-site-verification=abc123xyz or <meta name="google-site-verification" content="..." />'
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-stone-400">
                Current App URL: <code className="text-blue-300 font-mono">{appUrl}</code>
              </span>
              <button
                type="submit"
                disabled={isSaving || !token.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Save Token</span>
              </button>
            </div>
          </form>
        </div>

        {/* Method 2: HTML File verification */}
        <div className="bg-stone-950/40 border border-stone-800/60 rounded-xl p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-stone-300">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>HTML File Verification</span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" /> Live & Ready
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Your verification file <code className="text-emerald-300 font-mono">google08535f3aa485e30d.html</code> is live and returns the exact required verification token:
          </p>
          <div className="flex items-center justify-between bg-stone-900/80 border border-stone-800 rounded-lg p-2 font-mono text-[11px] text-stone-300">
            <a
              href={`${appUrl}/google08535f3aa485e30d.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1.5"
            >
              <span>{appUrl}/google08535f3aa485e30d.html</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => copyToClipboard(`${appUrl}/google08535f3aa485e30d.html`, "url")}
              className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800 flex items-center gap-1 shrink-0 ml-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied === "url" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800">
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
            <span>Open Google Search Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
