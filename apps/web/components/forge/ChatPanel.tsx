"use client";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2, Check, ChevronDown, Zap, Rabbit, Scale, Brain } from "lucide-react";
import type { ChatMessage, AgentStep } from "./ForgePage";
import type { PipelineMode } from "@repo/ai-core";

const MODES: { id: PipelineMode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "fast",     label: "Fast",     icon: Rabbit, desc: "Single shot · ~5s" },
  { id: "balanced", label: "Balanced", icon: Scale,  desc: "RAG + review · ~20s" },
  { id: "deep",     label: "Deep",     icon: Brain,  desc: "Self-healing · ~60s" },
];

const MODELS = [
  { id: "gemini-flash", label: "Gemini Flash" },
  { id: "gemini-pro", label: "Gemini Pro" },
  { id: "claude-sonnet", label: "Claude Sonnet" },
  { id: "gpt-4o", label: "GPT-4o" },
];

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "done") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
        <Check size={7} className="text-emerald-400" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Loader2 size={7} className="text-primary animate-spin" />
      </span>
    );
  }
  return (
    <span className="w-3.5 h-3.5 rounded-full border border-white/8 flex items-center justify-center shrink-0">
      <span className="w-1 h-1 rounded-full bg-white/10" />
    </span>
  );
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const doneCount = msg.steps?.filter((s) => s.status === "done").length ?? 0;
  const total = msg.steps?.length ?? 0;
  const activeStep = msg.steps?.find((s) => s.status === "active");

  return (
    <div className="flex flex-col gap-2">
      {/* Thinking header */}
      <div className="flex items-center gap-1.5">
        <Zap
          size={10}
          className={cn(msg.isGenerating ? "text-primary animate-pulse" : "text-emerald-400/40")}
        />
        <span className="text-[10px] text-white/30 font-mono">
          {msg.isGenerating
            ? `${activeStep?.text ?? "Thinking"}…`
            : `Thought for ${msg.thinkingSeconds ?? 0}s`}
        </span>
        {!msg.isGenerating && (
          <span className="text-[10px] text-white/15 font-mono">
            ({doneCount}/{total} steps)
          </span>
        )}
      </div>

      {/* Steps — only shown while actively generating */}
      {msg.isGenerating && msg.steps && (
        <div className="flex flex-col gap-0.5 pl-0.5">
          {msg.steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 py-0.5 text-[11px] transition-opacity",
                step.status === "done" && "opacity-30",
                step.status === "active" && "opacity-100 text-white/80",
                step.status === "pending" && "opacity-20"
              )}
            >
              <StepIcon status={step.status} />
              <span>{step.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Result card — shown after generation */}
      {!msg.isGenerating && msg.programName && (
        <div className="px-3 py-2.5 rounded-lg border border-white/6 bg-white/2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Check size={7} className="text-emerald-400" />
            </span>
            <p className="text-[11px] text-white/50">Program generated</p>
          </div>
          <p className="text-[13px] text-white/80 font-mono font-medium">{msg.programName}</p>
        </div>
      )}

      {/* Error card */}
      {!msg.isGenerating && !msg.programName && msg.text && (
        <div className="px-3 py-2.5 rounded-lg border border-red-500/15 bg-red-500/5">
          <p className="text-[11px] text-red-400/70 leading-relaxed">{msg.text}</p>
        </div>
      )}
    </div>
  );
}

export function ChatPanel({
  messages,
  isGenerating,
  model,
  mode,
  onModelChange,
  onModeChange,
  onSubmit,
}: {
  messages: ChatMessage[];
  isGenerating: boolean;
  model: string;
  mode: PipelineMode;
  onModelChange: (m: string) => void;
  onModeChange: (m: PipelineMode) => void;
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
    <div className="w-full flex flex-col overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Header */}
      <div className="shrink-0 border-b border-white/6">
        {/* Top row: title + model */}
        <div className="h-11 flex items-center justify-between px-4">
          <span className="text-[10px] font-semibold text-white/20 tracking-widest uppercase">
            Chat
          </span>
          {/* Model pill */}
          <div className="relative">
            <button
              onClick={() => setModelOpen((o) => !o)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/6 bg-white/3 hover:bg-white/6 transition-colors text-[10px] text-white/30 hover:text-white/50"
            >
              <span>{activeModel.label}</span>
              <ChevronDown size={9} className={cn("transition-transform", modelOpen && "rotate-180")} />
            </button>
            {modelOpen && (
              <div
                className="absolute top-full right-0 mt-1 w-40 rounded-lg border border-white/8 py-1 z-50 shadow-2xl"
                style={{ background: "#161616" }}
              >
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onModelChange(m.id); setModelOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors",
                      m.id === model ? "text-primary/80" : "text-white/40"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mode selector row */}
        <div className="flex items-center gap-1 px-3 pb-2.5">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex-1 justify-center",
                  active
                    ? "bg-primary/15 border border-primary/25 text-primary/80"
                    : "border border-white/5 bg-white/3 text-white/30 hover:text-white/50 hover:bg-white/5"
                )}
                title={m.desc}
              >
                <Icon size={10} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 mt-16">
            <div className="w-8 h-8 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center">
              <Zap size={13} className="text-primary/40" />
            </div>
            <p className="text-[11px] text-white/20 text-center leading-relaxed max-w-48">
              Describe your Solana program and I&apos;ll generate the code.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === "user" ? (
                /* User message — right-aligned pill */
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm bg-white/6 border border-white/6">
                    <p className="text-[12px] text-white/75 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ) : (
                /* Assistant message — left-aligned with icon */
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
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
      <div className="shrink-0 border-t border-white/6 p-3">
        <div className="relative rounded-xl border border-white/8 bg-white/3 focus-within:border-primary/25 focus-within:bg-white/4 transition-all">
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
                : "text-white/12 cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <Loader2 size={11} className="animate-spin text-white/25" />
            ) : (
              <ArrowUp size={11} strokeWidth={2.5} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/15 mt-1.5 px-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
