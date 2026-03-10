import React, { useState, useRef } from "react";
import { Mic, ArrowUp, Sparkles, Zap, Code2, Shield, Globe, Paperclip, ChevronDown, Brain, Gauge, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";



const models = [
  { id: "gemini-flash", label: "Gemini 2.0 Flash", badge: "Free", badgeColor: "text-emerald-400 bg-emerald-400/10", desc: "Fast, free tier" },
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Pro", badgeColor: "text-amber-400 bg-amber-400/10", desc: "Better code quality" },
  { id: "claude-opus", label: "Claude Opus", badge: "Pro", badgeColor: "text-amber-400 bg-amber-400/10", desc: "Complex programs" },
  { id: "gpt-4o", label: "GPT-4o", badge: "Pro", badgeColor: "text-amber-400 bg-amber-400/10", desc: "Via OpenRouter" },
];

const thinkingModes = [
  { id: "fast", label: "Fast", icon: "", desc: "Single shot, ~5s", detail: "No planning step" },
  { id: "balanced", label: "Balanced", icon: "", desc: "Plan → Generate", detail: "Planner outlines structure first" },
  { id: "deep", label: "Deep", icon: "", desc: "Multi-agent loop", detail: "Research → Plan → Generate → Validate → Refine" },
];

const reasoningLevels = [
  { id: "low", label: "Low", desc: "Minimal thinking budget" },
  { id: "medium", label: "Medium", desc: "Balanced reasoning" },
  { id: "high", label: "High", desc: "Maximum thinking tokens" },
];

const AgentChatBar = ({ onSubmit: onSubmitProp }: { onSubmit?: (message: string, model: string, thinking: string) => void } = {}) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [selectedThinking, setSelectedThinking] = useState(thinkingModes[0]);
  const [selectedReasoning, setSelectedReasoning] = useState(reasoningLevels[1]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const supportsReasoning = selectedModel?.id === "claude-sonnet" || selectedModel?.id === "claude-opus";

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleSubmit = () => {
    if (!message.trim()) return;
    if (onSubmitProp) {
      onSubmitProp(message, selectedModel?.id ?? "gemini-flash", selectedThinking?.id ?? "fast");
    } else {
      console.log("Send:", { message, model: selectedModel?.id, thinking: selectedThinking?.id });
    }
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleSuggestion = (prompt: string) => {
    setMessage(prompt);
    textareaRef.current?.focus();
  };

  const hasContent = message.trim().length > 0;

  return (
    <div className="w-full max-w-[760px] mx-auto px-4">
   
   <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="relative"
      >
        {/* Outer glow */}
        <div className={cn("absolute -inset-[1px] rounded-[20px] transition-opacity duration-700 pointer-events-none", isFocused ? "opacity-100" : "opacity-0")} style={{ background: "linear-gradient(135deg, hsl(280 80% 60% / 0.15), hsl(320 70% 55% / 0.1), hsl(200 80% 55% / 0.15))", filter: "blur(1px)" }} />
        {/* Gradient border */}
        <div className={cn("absolute -inset-[1px] rounded-[20px] transition-opacity duration-500 pointer-events-none", isFocused ? "opacity-100" : "opacity-30")} style={{ background: "linear-gradient(135deg, hsl(280 80% 60% / 0.3), hsl(270 15% 28% / 0.6), hsl(320 70% 55% / 0.2), hsl(270 15% 28% / 0.6), hsl(200 80% 55% / 0.3))" }} />

        <div className={cn("relative rounded-[19px] overflow-hidden transition-shadow duration-700", isFocused ? "shadow-[0_8px_60px_-12px_hsl(var(--primary)/0.2),0_0_100px_-20px_hsl(var(--accent)/0.1)]" : "shadow-[0_4px_30px_-8px_rgba(0,0,0,0.4)]")}>
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(270_25%_13%)] via-[hsl(270_20%_11%)] to-[hsl(270_22%_10%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.02]" />

          <div className="relative">
            {/* Textarea */}
            <div className="px-5 pt-5 pb-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your Solana program..."
                rows={2}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/40 text-[15px] leading-relaxed resize-none outline-none min-h-[56px] max-h-[200px]"
              />
            </div>

            {/* Config pills row */}
            <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
              {/* Model Selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60 transition-all duration-200 text-[11px] font-medium text-muted-foreground hover:text-foreground group">
                    <div className="w-1.5 h-1.5 rounded-full bg-chat-send" />
                    <span>{selectedModel?.label}</span>
                    <ChevronDown size={12} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-1.5 bg-[hsl(270_25%_12%)] border-border/50 backdrop-blur-xl" align="start" sideOffset={8}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold px-2.5 py-1.5">Model</div>
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                        selectedModel?.id === m.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      <div>
                        <div className="text-xs font-medium flex items-center gap-2">
                          {m.label}
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-semibold", m.badgeColor)}>{m.badge}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 mt-0.5">{m.desc}</div>
                      </div>
                      {selectedModel?.id === m.id && <Check size={14} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Thinking Mode */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60 transition-all duration-200 text-[11px] font-medium text-muted-foreground hover:text-foreground group">
                    <Brain size={12} className="text-primary/50" />
                    <span>{selectedThinking?.icon} {selectedThinking?.label}</span>
                    <ChevronDown size={12} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-1.5 bg-[hsl(270_25%_12%)] border-border/50 backdrop-blur-xl" align="start" sideOffset={8}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold px-2.5 py-1.5">Thinking Mode</div>
                  {thinkingModes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThinking(t)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-left transition-all duration-150",
                        selectedThinking?.id === t.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      <div>
                        <div className="text-xs font-medium flex items-center gap-2">
                          <span>{t.icon}</span> {t.label}
                          <span className="text-[10px] text-muted-foreground/40">— {t.desc}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/40 mt-0.5 ml-5">{t.detail}</div>
                      </div>
                      {selectedThinking?.id === t.id && <Check size={14} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Reasoning Effort — only for Claude */}
              {supportsReasoning && (
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60 transition-all duration-200 text-[11px] font-medium text-muted-foreground hover:text-foreground group"
                    >
                      <Gauge size={12} className="text-accent/60" />
                      <span>Reasoning: {selectedReasoning?.label}</span>
                      <ChevronDown size={12} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1.5 bg-[hsl(270_25%_12%)] border-border/50 backdrop-blur-xl" align="start" sideOffset={8}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-semibold px-2.5 py-1.5">Reasoning Effort</div>
                    {reasoningLevels.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedReasoning(r)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                          selectedReasoning?.id === r.id ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        <div>
                          <div className="text-xs font-medium">{r.label}</div>
                          <div className="text-[10px] text-muted-foreground/40">{r.desc}</div>
                        </div>
                        {selectedReasoning?.id === r.id && <Check size={14} className="text-accent shrink-0" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-1">
                <ToolbarButton icon={Paperclip} label="Attach file" />
                <ToolbarButton icon={Globe} label="Web search" />
                <ToolbarButton icon={Mic} label="Voice input" />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground/30 select-none hidden sm:block font-mono">↵ send</span>
                <AnimatePresence mode="wait">
                  <motion.button
                    key={hasContent ? "active" : "inactive"}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    onClick={handleSubmit}
                    disabled={!hasContent}
                    className={cn(
                      "relative p-2.5 rounded-xl transition-all duration-400 group overflow-hidden",
                      hasContent ? "text-primary-foreground" : "bg-muted/30 text-muted-foreground/20 cursor-not-allowed"
                    )}
                    aria-label="Send message"
                  >
                    {hasContent && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite]" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-primary/90 via-accent/90 to-primary/90" />
                      </>
                    )}
                    <ArrowUp size={18} strokeWidth={2.5} className="relative z-10" />
                  </motion.button>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-muted-foreground/30 mt-5 select-none">
        SolanaForge may produce inaccurate code. Always review before deploying.
      </p>
    </div>
  );
};

const ToolbarButton = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <button className="p-2 rounded-xl text-muted-foreground/35 hover:text-primary/70 hover:bg-primary/[0.06] transition-all duration-200" aria-label={label}>
    <Icon size={17} />
  </button>
);

export default AgentChatBar;
