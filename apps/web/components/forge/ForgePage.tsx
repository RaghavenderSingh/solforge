"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ForgeHeader } from "./ForgeHeader";
import { ChatPanel } from "./ChatPanel";
import { FileExplorer } from "./FileExplorer";
import { EditorPanel } from "./EditorPanel";

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

const STEP_TEXTS = [
  "Analyzing program requirements",
  "Fetching Anchor 0.30 patterns",
  "Generating program accounts",
  "Writing lib.rs",
  "Generating Cargo.toml",
  "Building TypeScript client",
  "Writing Bankrun tests",
  "Validating program structure",
];

export function ForgePage({
  initialPrompt,
  initialModel = "gemini-flash",
}: {
  initialPrompt: string;
  initialModel?: string;
}) {
  const [model, setModel] = useState(initialModel);
  const [files, setFiles] = useState<FileMap>({});
  const [activeFile, setActiveFile] = useState("lib.rs");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const thinkingStartRef = useRef<number>(0);

  // Panel widths
  const [chatWidth, setChatWidth] = useState(300);
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
    async (userPrompt: string, currentFiles?: FileMap, overrideModel?: string) => {
      if (!userPrompt.trim() || isGenerating) return;

      setIsGenerating(true);
      thinkingStartRef.current = Date.now();

      const userId = `u-${Date.now()}`;
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text: userPrompt },
        {
          id: assistantId,
          role: "assistant",
          text: "",
          isGenerating: true,
          steps: STEP_TEXTS.map((text, i) => ({
            text,
            status: i === 0 ? ("active" as const) : ("pending" as const),
          })),
        },
      ]);

      setFiles({});

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        stepIndex++;
        if (stepIndex < STEP_TEXTS.length) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    steps: m.steps?.map((s, i) => ({
                      ...s,
                      status: (
                        i < stepIndex ? "done" : i === stepIndex ? "active" : "pending"
                      ) as "done" | "active" | "pending",
                    })),
                  }
                : m
            )
          );
        }
      }, 700);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userPrompt,
            model: overrideModel ?? model,
            existingFiles:
              currentFiles && Object.keys(currentFiles).length > 0 ? currentFiles : undefined,
          }),
        });
        const data = await res.json();
        clearInterval(stepInterval);

        const newFiles: FileMap = data.files ?? {};
        const elapsed = Math.round((Date.now() - thinkingStartRef.current) / 1000);

        setFiles(newFiles);
        setActiveFile("lib.rs");

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isGenerating: false,
                  text: data.programName ?? "program",
                  programName: data.programName ?? "program",
                  files: newFiles,
                  thinkingSeconds: elapsed,
                  steps: STEP_TEXTS.map((text) => ({ text, status: "done" as const })),
                }
              : m
          )
        );
      } catch {
        clearInterval(stepInterval);
        const elapsed = Math.round((Date.now() - thinkingStartRef.current) / 1000);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isGenerating: false,
                  text: "Generation failed. Please try again.",
                  thinkingSeconds: elapsed,
                  steps: STEP_TEXTS.map((text) => ({ text, status: "done" as const })),
                }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isGenerating, model]
  );

  useEffect(() => {
    if (initialPrompt) {
      generate(initialPrompt, undefined, initialModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProgram = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.programName)?.programName ?? "";

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#000000" }}>
      <ForgeHeader
        programName={activeProgram}
        isGenerating={isGenerating}
        hasFiles={Object.keys(files).length > 0}
      />
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat panel */}
        <div style={{ width: chatWidth, minWidth: chatWidth }} className="flex overflow-hidden">
          <ChatPanel
            messages={messages}
            isGenerating={isGenerating}
            model={model}
            onModelChange={setModel}
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
