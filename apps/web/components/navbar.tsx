"use client";
import Logo from "./ui/logo";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Navbar() {
  return (
    <nav className="relative z-20 flex items-center justify-between px-5 py-3.5 border-b border-white/5">

      <Logo size="md" className="hidden md:inline-block lg:hidden" />
    
      <div className="flex items-center gap-3">
        <WalletMultiButton />
      </div>
    </nav>
  );
}
