"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ForgeHeader } from "./ForgeHeader";
import { ChatPanel } from "./ChatPanel";
import { FileExplorer } from "./FileExplorer";
import { EditorPanel } from "./EditorPanel";
import type { AgentEvent, PipelineMode } from "@repo/ai-core";

export type FileMap = Record<string, string>;

export interface AgentStep {
  text: string;
  status: "done" | "active" | "pending";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps?: AgentStep[];
  thinkingSeconds?: number;
  programName?: string;
  files?: FileMap;
  isGenerating?: boolean;
}

// Maps AgentName → human-readable step label
const AGENT_STEP_LABEL: Record<string, string> = {
  planner:    "Analyzing requirements",
  researcher: "Fetching Anchor 0.30 patterns",
  generator:  "Generating program",
  tester:     "Reviewing code quality",
  debugger:   "Debugging issues",
  deployer:   "Preparing deployment",
};

export function ForgePage({
  initialPrompt,
  initialModel = "gemini-flash",
}: {
  initialPrompt: string;
  initialModel?: string;
}) {
  const [model, setModel]     = useState(initialModel);
  const [mode, setMode]       = useState<PipelineMode>("fast");
  const [files, setFiles]     = useState<FileMap>({});
  const [activeFile, setActiveFile] = useState("lib.rs");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const thinkingStartRef = useRef<number>(0);
  const hasGeneratedRef  = useRef(false);

  // Panel widths
  const [chatWidth, setChatWidth]         = useState(300);
  const [explorerWidth, setExplorerWidth] = useState(176);

  const startResize = useCallback(
    (panel: "chat" | "explorer") => (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panel === "chat" ? chatWidth : explorerWidth;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        if (panel === "chat") {
          setChatWidth(Math.max(200, Math.min(520, startWidth + delta)));
        } else {
          setExplorerWidth(Math.max(100, Math.min(280, startWidth + delta)));
        }
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [chatWidth, explorerWidth]
  );

  const generate = useCallback(
    async (userPrompt: string, currentFiles?: FileMap) => {
      if (!userPrompt.trim() || isGenerating) return;

      setIsGenerating(true);
      thinkingStartRef.current = Date.now();
      setFiles({});

      const userId      = `u-${Date.now()}`;
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text: userPrompt },
        {
          id: assistantId,
          role: "assistant",
          text: "",
          isGenerating: true,
          steps: [],
        },
      ]);

      try {
        const res = await fetch("/api/forge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userPrompt,
            model,
            mode,
            existingFiles:
              currentFiles && Object.keys(currentFiles).length > 0
                ? currentFiles
                : undefined,
          }),
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as AgentEvent;
              handleEvent(event, assistantId);
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      } catch (err) {
        const elapsed = Math.round((Date.now() - thinkingStartRef.current) / 1000);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isGenerating: false,
                  text: `Error: ${err instanceof Error ? err.message : "generation failed"}`,
                  thinkingSeconds: elapsed,
                }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isGenerating, model, mode]
  );

  // Handles a single AgentEvent from the SSE stream
  function handleEvent(event: AgentEvent, assistantId: string) {
    switch (event.type) {
      case "agent:start": {
        const label = AGENT_STEP_LABEL[event.agent] ?? event.agent;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  steps: [
                    ...(m.steps ?? []).map((s) => ({ ...s, status: "done" as const })),
                    { text: label, status: "active" as const },
                  ],
                }
              : m
          )
        );
        break;
      }

      case "agent:complete": {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  steps: (m.steps ?? []).map((s) =>
                    s.status === "active" ? { ...s, status: "done" as const } : s
                  ),
                }
              : m
          )
        );
        break;
      }

      case "file:ready": {
        setFiles((f) => ({ ...f, [event.name]: event.content }));
        if (event.name === "lib.rs") setActiveFile("lib.rs");
        break;
      }

      case "pipeline:done": {
        const elapsed = Math.round((Date.now() - thinkingStartRef.current) / 1000);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isGenerating: false,
                  text: event.programName,
                  programName: event.programName,
                  files: event.files as unknown as FileMap,
                  thinkingSeconds: elapsed,
                  steps: (m.steps ?? []).map((s) => ({ ...s, status: "done" as const })),
                }
              : m
          )
        );
        break;
      }

      case "pipeline:failed": {
        const elapsed = Math.round((Date.now() - thinkingStartRef.current) / 1000);
        const msg = event.errors[0]?.message ?? "Generation failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isGenerating: false,
                  text: msg,
                  thinkingSeconds: elapsed,
                  steps: (m.steps ?? []).map((s) => ({ ...s, status: "done" as const })),
                }
              : m
          )
        );
        break;
      }
    }
  }

  useEffect(() => {
    if (initialPrompt && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generate(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProgram =
    [...messages].reverse().find((m) => m.role === "assistant" && m.programName)
      ?.programName ?? "";

  const handleDownload = () => {
    Object.entries(files).forEach(([filename, content]) => {
      const blob = new Blob([content], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#000000" }}>
      <ForgeHeader
        programName={activeProgram}
        isGenerating={isGenerating}
        hasFiles={Object.keys(files).length > 0}
        onDownload={handleDownload}
      />
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat panel */}
        <div style={{ width: chatWidth, minWidth: chatWidth }} className="flex overflow-hidden">
          <ChatPanel
            messages={messages}
            isGenerating={isGenerating}
            model={model}
            mode={mode}
            onModelChange={setModel}
            onModeChange={setMode}
            onSubmit={(p: string) => generate(p, files)}
          />
        </div>

        {/* Resize handle: chat | explorer */}
        <div
          onMouseDown={startResize("chat")}
          className="w-1 shrink-0 cursor-col-resize bg-white/6 hover:bg-primary/40 transition-colors duration-150"
        />

        {/* File explorer */}
        <div style={{ width: explorerWidth, minWidth: explorerWidth }} className="flex overflow-hidden">
          <FileExplorer
            files={files}
            activeFile={activeFile}
            onFileSelect={setActiveFile}
          />
        </div>

        {/* Resize handle: explorer | editor */}
        <div
          onMouseDown={startResize("explorer")}
          className="w-1 shrink-0 cursor-col-resize bg-white/6 hover:bg-primary/40 transition-colors duration-150"
        />

        {/* Editor */}
        <EditorPanel
          files={files}
          activeFile={activeFile}
          onChange={(filename, value) => setFiles((f) => ({ ...f, [filename]: value }))}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}
