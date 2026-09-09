import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  Lightbulb,
  HelpCircle,
  Copy,
  Check,
  Tag,
  Wand2,
} from "lucide-react";
import { Video } from "../types";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVideo?: Video | null;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  currentVideo,
}) => {
  const [tab, setTab] = useState<"ask" | "optimizer">("ask");

  // Ask AI tab
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "ai"; text: string }>
  >([
    {
      role: "ai",
      text: currentVideo
        ? `Hello! I'm your Gemini AI companion. Ask me anything about "${currentVideo.title}" or request a quick quiz, deep explanation, or key timestamps!`
        : "Hello! I am your YouTube Enhanced AI companion powered by Gemini. Ask me about any video concept, study strategy, or topic!",
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  // SEO Optimizer tab
  const [videoTitleDraft, setVideoTitleDraft] = useState(currentVideo?.title || "");
  const [videoDescDraft, setVideoDescDraft] = useState(currentVideo?.description || "");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedData, setOptimizedData] = useState<{
    optimizedTitles?: string[];
    tags?: string[];
    seoAdvice?: string;
  } | null>(null);
  const [copiedTag, setCopiedTag] = useState(false);

  if (!isOpen) return null;

  const handleSendQuery = async (userPrompt?: string) => {
    const textToSend = userPrompt || query.trim();
    if (!textToSend || isAsking) return;

    setChatHistory((prev) => [...prev, { role: "user", text: textToSend }]);
    if (!userPrompt) setQuery("");
    setIsAsking(true);

    try {
      const res = await fetch("/api/gemini/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTitle: currentVideo?.title || "Educational Video",
          videoDescription: currentVideo?.description || "",
          userQuery: textToSend,
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: data.answer || "No response received." },
      ]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Error contacting AI assistant: " + err?.message },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitleDraft.trim() || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/gemini/optimize-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawTitle: videoTitleDraft,
          description: videoDescDraft,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setOptimizedData(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyTags = () => {
    if (!optimizedData?.tags) return;
    navigator.clipboard.writeText(optimizedData.tags.join(", "));
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl overflow-hidden text-stone-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Gemini AI Studio</h2>
                <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full font-mono">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {currentVideo
                  ? `Active video: "${currentVideo.title.slice(0, 45)}..."`
                  : "Smart study companion & video SEO optimizer"}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-800 px-6 bg-stone-950/30">
          <button
            onClick={() => setTab("ask")}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              tab === "ask"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Companion</span>
          </button>
          <button
            onClick={() => setTab("optimizer")}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              tab === "optimizer"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Creator SEO & Title Optimizer</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === "ask" ? (
            <div className="space-y-4 flex flex-col h-full">
              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Explain this video in simple terms",
                  "Give me 3 test quiz questions",
                  "What are the top 3 practical tips?",
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSendQuery(preset)}
                    className="px-2.5 py-1 bg-stone-800/80 hover:bg-stone-800 text-[11px] text-stone-300 rounded-lg border border-stone-700/60 transition-colors flex items-center gap-1.5"
                  >
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
                {chatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 text-xs ${
                      item.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {item.role === "ai" && (
                      <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        item.role === "user"
                          ? "bg-stone-800 text-stone-100 rounded-tr-none border border-stone-700"
                          : "bg-stone-950/80 text-stone-200 rounded-tl-none border border-stone-800"
                      }`}
                    >
                      <p className="whitespace-pre-line">{item.text}</p>
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini is analyzing...</span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery();
                }}
                className="flex gap-2 pt-2 border-t border-stone-800"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about this video or topic..."
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isAsking || !query.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            /* SEO & Title Optimizer */
            <div className="space-y-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                Use Gemini to generate viral titles, high-volume SEO search tags, and thumbnail tips for your YouTube channel uploads.
              </p>

              <form onSubmit={handleOptimize} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Video Topic or Working Title
                  </label>
                  <input
                    type="text"
                    value={videoTitleDraft}
                    onChange={(e) => setVideoTitleDraft(e.target.value)}
                    placeholder="e.g. Build a modern full stack app with React 19"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Key Topics / Short Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={videoDescDraft}
                    onChange={(e) => setVideoDescDraft(e.target.value)}
                    placeholder="Key concepts discussed, target audience, tools used..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isOptimizing || !videoTitleDraft.trim()}
                  className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Optimizing with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Optimized Titles & Tags</span>
                    </>
                  )}
                </button>
              </form>

              {optimizedData && (
                <div className="space-y-4 pt-3 border-t border-stone-800 animate-in fade-in">
                  {/* High CTR Titles */}
                  {optimizedData.optimizedTitles && (
                    <div>
                      <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Recommended Click-Worthy Titles:</span>
                      </h4>
                      <div className="space-y-1.5">
                        {optimizedData.optimizedTitles.map((t, idx) => (
                          <div
                            key={idx}
                            className="bg-stone-950 border border-stone-800 rounded-lg p-2.5 flex items-center justify-between text-xs text-stone-200 group hover:border-amber-500/40 transition-colors"
                          >
                            <span>{t}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(t);
                              }}
                              className="text-[10px] text-stone-400 hover:text-amber-400 px-2 py-0.5 rounded bg-stone-900 border border-stone-800 shrink-0 ml-2"
                            >
                              Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Tags */}
                  {optimizedData.tags && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-400" />
                          <span>YouTube SEO Tags:</span>
                        </h4>
                        <button
                          onClick={copyTags}
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                        >
                          {copiedTag ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedTag ? "Copied All!" : "Copy All"}</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800">
                        {optimizedData.tags.map((tg, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-stone-900 text-stone-300 text-[11px] rounded-md border border-stone-700/60 font-mono"
                          >
                            #{tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thumbnail / Hook advice */}
                  {optimizedData.seoAdvice && (
                    <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-200">
                      <p className="font-semibold flex items-center gap-1.5 text-amber-300 mb-1">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>CTR & Retention Recommendation:</span>
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-200/90">
                        {optimizedData.seoAdvice}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
