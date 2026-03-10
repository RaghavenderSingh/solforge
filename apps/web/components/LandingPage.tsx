"use client";
import Image from "next/image";
import { Navbar } from "./navbar";
import AgentChatBar from "./ui/AgentChatBar";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
export function LandingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Full-screen gradient background image */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/gradient-background.svg"
          alt=""
          fill
          className="object-cover opacity-60"
          priority
        />
        {/* Overlay to darken and blend */}
        <div className="absolute inset-0 bg-background/50" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <Navbar />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20 pt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto mb-10"
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
            className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold text-foreground mb-5 leading-[1.12] tracking-tight"
          >
            Build{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #9945FF, #14F195)" }}
            >
              Solana Programs
            </span>
            <br />
            in seconds
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
          >
            Describe your program in plain English. Get production-ready Anchor code,
            TypeScript clients, and deployment scripts — instantly.
          </motion.p>
        </motion.div>

        {/* Chat Bar */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="w-full"
        >
          <AgentChatBar onSubmit={(msg, model) => router.push(`/forge?prompt=${encodeURIComponent(msg)}&model=${model}`)} />
        </motion.div>

        {/* Social proof pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-10 text-muted-foreground/40 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Anchor 0.30 compatible</span>
          </div>
          <div className="hidden sm:block w-px h-3 bg-white/10" />
          <span className="hidden sm:block">Mainnet &amp; Devnet ready</span>
          <div className="hidden sm:block w-px h-3 bg-white/10" />
          <span className="hidden sm:block">No setup required</span>
          <div className="hidden sm:block w-px h-3 bg-white/10" />
          <span className="hidden sm:block">Multi-model AI</span>
        </motion.div>
      </div>
    </div>
  );
}
