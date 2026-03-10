"use client";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import { FileCode2, Package, Code2, TestTube2, FileText } from "lucide-react";

const FILE_META: Record<string, { icon: React.ElementType; color: string; lang: string }> = {
  "lib.rs": { icon: FileCode2, color: "text-orange-400/70", lang: "rust" },
  "Cargo.toml": { icon: Package, color: "text-yellow-400/60", lang: "ini" },
  "client.ts": { icon: Code2, color: "text-blue-400/70", lang: "typescript" },
  "tests.ts": { icon: TestTube2, color: "text-emerald-400/70", lang: "typescript" },
};

const PLACEHOLDERS: Record<string, string> = {
  "lib.rs": "// Your Anchor program will appear here\n// Describe your program in the chat and hit send",
  "Cargo.toml": "# Cargo.toml will be generated",
  "client.ts": "// TypeScript client will be generated",
  "tests.ts": "// Bankrun tests will be generated",
};

const beforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("solforge", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "c9c4e0" },
      { token: "comment", foreground: "4a4568", fontStyle: "italic" },
      { token: "keyword", foreground: "bd93f9" },
      { token: "keyword.control", foreground: "bd93f9" },
      { token: "storage.type", foreground: "bd93f9" },
      { token: "string", foreground: "a8d8a8" },
      { token: "string.quoted", foreground: "a8d8a8" },
      { token: "number", foreground: "f1b977" },
      { token: "constant.numeric", foreground: "f1b977" },
      { token: "type", foreground: "8be9fd" },
      { token: "entity.name.type", foreground: "8be9fd" },
      { token: "entity.name.function", foreground: "cfa3ff" },
      { token: "variable", foreground: "c9c4e0" },
      { token: "support.function", foreground: "cfa3ff" },
      { token: "punctuation", foreground: "6e6a86" },
      { token: "operator", foreground: "9d96b5" },
      { token: "macro", foreground: "ff79c6" },
      { token: "attribute", foreground: "ff79c6" },
      { token: "tag", foreground: "bd93f9" },
      { token: "key", foreground: "8be9fd" },
      { token: "delimiter", foreground: "6e6a86" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#c9c4e0",
      "editorLineNumber.foreground": "#2d2845",
      "editorLineNumber.activeForeground": "#5c5478",
      "editor.lineHighlightBackground": "#111111",
      "editor.selectionBackground": "#4d3a7a55",
      "editor.inactiveSelectionBackground": "#4d3a7a28",
      "editorCursor.foreground": "#9945ff",
      "editorWhitespace.foreground": "#1e1b2e",
      "editorIndentGuide.background1": "#1e1b2e",
      "editorIndentGuide.activeBackground1": "#362f52",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff0a",
      "scrollbarSlider.hoverBackground": "#ffffff14",
      "scrollbarSlider.activeBackground": "#ffffff20",
      "editor.findMatchBackground": "#9945ff33",
      "editor.findMatchHighlightBackground": "#9945ff1a",
      "editorBracketMatch.background": "#9945ff22",
      "editorBracketMatch.border": "#9945ff60",
    },
  });
};

export function EditorPanel({
  files,
  activeFile,
  onChange,
  isGenerating,
}: {
  files: Record<string, string>;
  activeFile: string;
  onChange: (filename: string, value: string) => void;
  isGenerating: boolean;
}) {
  const meta = FILE_META[activeFile] ?? { icon: FileText, color: "text-white/40", lang: "plaintext" };
  const Icon = meta.icon;
  const content = files[activeFile] ?? PLACEHOLDERS[activeFile] ?? "";
  const hasFiles = Object.keys(files).length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: "#000000" }}>
      {/* File tab header */}
      <div className="h-11 shrink-0 flex items-center px-4 border-b border-white/6 gap-2" style={{ background: "#0a0a0a" }}>
        <Icon size={13} className={meta.color} />
        <span className="text-[12px] font-mono text-white/50">{activeFile}</span>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        {isGenerating && !hasFiles && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="flex gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.14}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-white/25 font-mono">generating {activeFile}…</p>
          </div>
        )}
        <Editor
          height="100%"
          language={meta.lang}
          value={content}
          onChange={(val) => onChange(activeFile, val ?? "")}
          theme="solforge"
          beforeMount={beforeMount}
          loading={
            <div className="h-full w-full flex items-center justify-center" style={{ background: "#000000" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white/10 animate-pulse" />
            </div>
          }
          options={{
            fontSize: 13,
            lineHeight: 22,
            fontFamily: "'GeistMono', 'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 20, bottom: 20 },
            renderLineHighlight: "gutter",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            folding: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: false, indentation: true },
            readOnly: isGenerating,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 3, horizontalScrollbarSize: 3, useShadows: false },
            renderValidationDecorations: "off",
            glyphMargin: false,
          }}
        />
      </div>
    </div>
  );
}
