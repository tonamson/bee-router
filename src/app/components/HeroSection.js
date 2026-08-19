"use client";

import { useRouter } from "next/navigation";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { APP_CONFIG } from "@/shared/constants/config";

export default function HeroSection() {
  const router = useRouter();
  const { copied, copy } = useCopyToClipboard();

  return (
    <section className="relative pt-32 pb-12 px-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-[#FFC700]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center gap-8">
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight text-white">
          One endpoint for every<br />
          <span className="bg-gradient-to-r from-[#FFC700] via-[#FFD633] to-[#F59E0B] bg-clip-text text-transparent">
            provider your agents already speak
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          BeeRouter runs on your machine. Point Claude Code, Codex, Cursor, Cline, Antigravity, or any OpenAI SDK at{" "}
          <span className="text-gray-200 font-mono text-base">localhost:20128/v1</span>.
          It translates formats, fails over across accounts and models, and keeps OAuth plus usage on disk.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 w-full pt-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="h-12 px-8 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-base font-bold transition-all shadow-[0_0_20px_rgba(255,199,0,0.45)] hover:shadow-[0_0_30px_rgba(255,199,0,0.65)] hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Open Dashboard
          </button>

          <a
            href="#simulator"
            className="h-12 px-6 rounded-xl border border-[#282B37] bg-[#16181F] hover:bg-[#1F222B] hover:border-[#FFC700]/40 text-white text-base font-semibold transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-[#FFC700]">tune</span>
            See a combo route
          </a>

          <div
            onClick={() => copy("npx @tonamson2/bee-router", "hero-npx")}
            className="h-12 px-4 rounded-xl border border-[#282B37] bg-[#0D0E12] hover:border-[#FFC700]/50 text-gray-300 font-mono text-xs flex items-center gap-3 transition-all cursor-pointer group"
            title="Click to copy quickstart command"
          >
            <span className="text-[#FFC700]">$</span>
            <span className="text-white font-medium">npx @tonamson2/bee-router</span>
            <span className="text-gray-500 group-hover:text-[#FFC700] transition-colors material-symbols-outlined text-[16px]">
              {copied === "hero-npx" ? "check" : "content_copy"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
