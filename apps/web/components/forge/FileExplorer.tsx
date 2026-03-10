"use client";
import { cn } from "@/lib/utils";
import { FileCode2, Package, Code2, TestTube2, FileText } from "lucide-react";
import type { FileMap } from "./ForgePage";

const FILE_META: Record<string, { icon: React.ElementType; color: string }> = {
  "lib.rs": { icon: FileCode2, color: "text-orange-400/60" },
  "Cargo.toml": { icon: Package, color: "text-yellow-400/50" },
  "client.ts": { icon: Code2, color: "text-blue-400/60" },
  "tests.ts": { icon: TestTube2, color: "text-emerald-400/60" },
};

const ALL_FILES = ["lib.rs", "Cargo.toml", "client.ts", "tests.ts"];

export function FileExplorer({
  files,
  activeFile,
  onFileSelect,
}: {
  files: FileMap;
  activeFile: string;
  onFileSelect: (file: string) => void;
}) {
  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{ background: "#080808" }}
    >
      {/* Header */}
      <div className="h-11 shrink-0 flex items-center px-3 border-b border-white/6">
        <span className="text-[10px] font-semibold text-white/25 tracking-widest uppercase">
          Files
        </span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-2">
        {ALL_FILES.map((filename) => {
          const meta = FILE_META[filename] ?? { icon: FileText, color: "text-white/30" };
          const Icon = meta.icon;
          const hasContent = !!files[filename];
          const isActive = activeFile === filename;

          return (
            <button
              key={filename}
              onClick={() => onFileSelect(filename)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group",
                isActive
                  ? "bg-primary/10 text-white/80"
                  : "text-white/35 hover:bg-white/4 hover:text-white/55"
              )}
            >
              <Icon
                size={13}
                className={cn(isActive ? meta.color : "text-white/20 group-hover:text-white/35")}
              />
              <span className="text-[12px] font-mono truncate">{filename}</span>
              {hasContent && !isActive && (
                <span className="w-1 h-1 rounded-full bg-primary/40 ml-auto shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
