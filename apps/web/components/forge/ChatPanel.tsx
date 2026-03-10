"use client";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2, Check, ChevronDown, Zap, User } from "lucide-react";
import type { ChatMessage, AgentStep } from "./ForgePage";

const MODELS = [
  { id: "gemini-flash", label: "Gemini Flash" },
  { id: "gemini-pro", label: "Gemini Pro" },
  { id: "claude-sonnet", label: "Claude Sonnet" },
  { id: "gpt-4o", label: "GPT-4o" },
];

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "done") {
    return (
      <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
        <Check size={8} className="text-emerald-400" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Loader2 size={8} className="text-primary animate-spin" />
      </span>
    );
  }
  return (
    <span className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center shrink-0">
      <span className="w-1 h-1 rounded-full bg-white/15" />
    </span>
  );
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const doneCount = msg.steps?.filter((s) => s.status === "done").length ?? 0;
  const total = msg.steps?.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Thinking header */}
      <div className="flex items-center gap-1.5">
        <Zap
          size={11}
          className={cn(msg.isGenerating ? "text-primary" : "text-emerald-400/50")}
        />
        <span className="text-[11px] text-white/30 font-mono">
          {msg.isGenerating
            ? `Thinking… ${doneCount}/${total}`
            : `Thought for ${msg.thinkingSeconds ?? 0}s`}
        </span>
      </div>

      {/* Steps */}
      {msg.steps && msg.steps.length > 0 && (
        <div className="flex flex-col gap-0.5 pl-1">
          {msg.steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 py-0.5 text-[11px]",
                step.status === "done" && "text-white/30",
                step.status === "active" && "text-white/80",
                step.status === "pending" && "text-white/15"
              )}
            >
              <StepIcon status={step.status} />
              <span>{step.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Result summary */}
      {!msg.isGenerating && msg.programName && (
        <div className="mt-1 px-3 py-2 rounded-lg bg-white/4 border border-white/6">
          <p className="text-[12px] text-white/70 font-mono">{msg.programName}</p>
          <p className="text-[11px] text-white/30 mt-0.5">Program generated successfully</p>
        </div>
      )}

      {/* Error */}
      {!msg.isGenerating && msg.text && !msg.programName && (
        <div className="mt-1 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20">
          <p className="text-[11px] text-red-400/70">{msg.text}</p>
        </div>
      )}
    </div>
  );
}

export function ChatPanel({
  messages,
  isGenerating,
  model,
  onModelChange,
  onSubmit,
}: {
  messages: ChatMessage[];
  isGenerating: boolean;
  model: string;
  onModelChange: (m: string) => void;
  onSubmit: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    onSubmit(prompt.trim());
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const activeModel = MODELS.find((m) => m.id === model) ?? MODELS[0]!;
  const hasContent = prompt.trim().length > 0;

  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{ background: "#0d0d0d" }}
    >
      {/* Header */}
      <div className="h-11 shrink-0 flex items-center px-4 border-b border-white/6">
        <span className="text-[10px] font-semibold text-white/25 tracking-widest uppercase">
          Chat
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap size={14} className="text-primary/50" />
            </div>
            <p className="text-[11px] text-white/20 text-center leading-relaxed max-w-50">
              Describe your Solana program and I&apos;ll generate the code.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-1">
              {msg.role === "user" ? (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={10} className="text-white/40" />
                  </div>
                  <p className="text-[12px] text-white/70 leading-relaxed pt-0.5">{msg.text}</p>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={9} className="text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <AssistantMessage msg={msg} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/6 p-3 flex flex-col gap-2">
        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setModelOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/4 transition-colors text-[11px] text-white/30 hover:text-white/50"
          >
            <span>{activeModel.label}</span>
            <ChevronDown size={10} className={cn("transition-transform", modelOpen && "rotate-180")} />
          </button>
          {modelOpen && (
            <div
              className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-white/8 py-1 z-50"
              style={{ background: "#111111" }}
            >
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onModelChange(m.id); setModelOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/6 transition-colors",
                    m.id === model ? "text-primary/80" : "text-white/40"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea + send */}
        <div className="relative rounded-xl border border-white/8 bg-white/3 focus-within:border-primary/30 focus-within:bg-white/5 transition-all">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={messages.length > 0 ? "Refine the program…" : "Describe your Solana program…"}
            rows={1}
            className="w-full bg-transparent text-[12px] text-white/75 placeholder:text-white/20 resize-none outline-none px-3 py-2.5 pr-9 min-h-9 max-h-28 disabled:opacity-40 leading-relaxed"
          />
          <button
            onClick={handleSubmit}
            disabled={!hasContent || isGenerating}
            className={cn(
              "absolute right-1.5 bottom-1.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
              hasContent && !isGenerating
                ? "bg-primary text-white hover:opacity-85"
                : "text-white/15 cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <Loader2 size={12} className="animate-spin text-white/20" />
            ) : (
              <ArrowUp size={12} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
