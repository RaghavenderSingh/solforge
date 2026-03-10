"use client";
import Logo from "@/components/ui/logo";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2, CheckCircle2, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ForgeHeader({
  programName,
  isGenerating,
  hasFiles,
}: {
  programName: string;
  isGenerating: boolean;
  hasFiles: boolean;
}) {
  return (
    <header className="h-11 shrink-0 flex items-center justify-between px-4 border-b border-white/6 z-20" style={{ background: "#0a0a0a" }}>
      <div className="flex items-center gap-3">
        <Link href="/" className="opacity-60 hover:opacity-100 transition-opacity">
          <Logo size="sm" />
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <Loader2 size={11} className="text-primary animate-spin shrink-0" />
          ) : programName ? (
            <CheckCircle2 size={11} className="text-emerald-400/60 shrink-0" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />
          )}
          <span
            className={cn(
              "text-xs font-mono truncate max-w-xs",
              isGenerating ? "text-primary/70" : programName ? "text-white/60" : "text-white/20"
            )}
          >
            {isGenerating ? "generating…" : programName || "untitled"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasFiles && (
          <>
            <button className="flex items-center gap-1.5 h-7 px-3 rounded-md border border-white/8 bg-white/4 text-[11px] text-white/40 hover:text-white/60 hover:bg-white/6 transition-all font-medium">
              <Download size={11} />
              Clone to backend
            </button>
            <button className="flex items-center gap-1.5 h-7 px-3 rounded-md border border-white/8 bg-white/4 text-[11px] text-white/40 hover:text-white/60 hover:bg-white/6 transition-all font-medium">
              <RefreshCw size={11} />
              Read only
            </button>
            <button className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-[11px] text-white hover:opacity-90 transition-all font-medium">
              Update
            </button>
          </>
        )}
        <WalletMultiButton />
      </div>
    </header>
  );
}
