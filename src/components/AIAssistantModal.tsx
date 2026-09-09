import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  Lightbulb,
  HelpCircle,
  X,
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
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "ai"; text: string }>
  >([
    {
      role: "ai",
      text: currentVideo
        ? `Hello! I'm your Gemini AI video companion. Ask me anything about "${currentVideo.title}" or request a quick summary, key concepts, or quiz!`
        : "Hello! I am your YouTube Enhanced AI companion powered by Gemini. Ask me about any topic, tutorial, or study guide!",
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  if (!isOpen) return null;

  const handleSendQuery = async (userPrompt?: string) => {
    const textToSend = userPrompt || query.trim();
    if (!textToSend || isAsking) return;

    setChatHistory((prev) => [...prev, { role: "user", text: textToSend }]);
    if (!userPrompt) setQuery("");
    setIsAsking(true);

    try {
      const res = await fetch("/api/gemini/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend,
          videoContext: currentVideo
            ? {
                id: currentVideo.id,
                title: currentVideo.title,
                description: currentVideo.description,
                channelTitle: currentVideo.channelTitle,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setChatHistory((prev) => [...prev, { role: "ai", text: data.answer }]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "ai",
            text: "I analyzed the topic. Could you clarify your question so I can provide deeper insights?",
          },
        ]);
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, I had trouble reaching the AI service. Please verify your connection or try asking again.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
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
                  : "Smart video study companion & interactive assistant"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-4 flex flex-col h-full">
            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2">
              {[
                "Explain this video in simple terms",
                "Give me 3 key takeaways",
                "Create a 3-question quiz on this topic",
                "Summarize the main argument",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(prompt)}
                  className="text-[11px] bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-700/70 hover:border-amber-500/40 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                >
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 min-h-[220px] max-h-[350px] overflow-y-auto space-y-3 pr-1">
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 text-xs ${
                    item.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {item.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                      item.role === "user"
                        ? "bg-amber-600 text-white rounded-br-none"
                        : "bg-stone-950 border border-stone-800 text-stone-200 rounded-bl-none"
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
              {isAsking && (
                <div className="flex gap-2 text-xs items-center text-stone-400 bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 w-fit">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Gemini is thinking...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2 pt-2 border-t border-stone-800"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything about the video concepts..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={isAsking || !query.trim()}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
