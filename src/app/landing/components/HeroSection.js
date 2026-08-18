"use client";

import { useRouter } from "next/navigation";
import { APP_CONFIG } from "@/shared/constants/config";

export default function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative pt-32 pb-16 px-6 flex flex-col items-center justify-center overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-[#FFC700]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center gap-8">
        {/* Version badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FFC700]/30 bg-[#FFC700]/10 px-3.5 py-1 text-xs font-semibold text-[#FFC700] shadow-[0_0_12px_rgba(255,199,0,0.15)]">
          <span className="flex h-2 w-2 rounded-full bg-[#FFC700] animate-pulse" />
          BeeRouter v{APP_CONFIG?.version || "1.0"} Live
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight text-white">
          Unified AI Gateway with <br />
          <span className="bg-gradient-to-r from-[#FFC700] via-[#FFD633] to-[#F59E0B] bg-clip-text text-transparent">
            Lightning-Fast Routing
          </span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          The intelligent AI routing proxy with a reactive web dashboard. Connect Claude Code, OpenAI Codex, Cursor, Cline, and SDKs to dozens of LLM providers with automatic fallback, load balancing, and zero latency.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full pt-2">
          <button 
            onClick={() => router.push("/dashboard")}
            className="h-12 px-8 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-base font-bold transition-all shadow-[0_0_20px_rgba(255,199,0,0.45)] hover:shadow-[0_0_30px_rgba(255,199,0,0.65)] hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Open Dashboard
          </button>
          <a 
            href="https://github.com/decolua/9router" 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-12 px-8 rounded-xl border border-[#282B37] bg-[#16181F] hover:bg-[#1F222B] hover:border-[#FFC700]/40 text-white text-base font-bold transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">code</span>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

