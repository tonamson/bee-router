"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import ProviderIcon from "@/shared/components/ProviderIcon";

const CLI_TOOLS = [
  { id: "claude", name: "Claude Code", image: "/providers/claude.png" },
  { id: "codex", name: "OpenAI Codex", image: "/providers/codex.png" },
  { id: "cursor", name: "Cursor", image: "/providers/cursor.png" },
  { id: "cline", name: "Cline", image: "/providers/cline.png" },
];

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    image: "/providers/openai.png",
    latency: "24ms",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    image: "/providers/anthropic.png",
    latency: "18ms",
  },
  {
    id: "gemini",
    name: "Gemini",
    image: "/providers/gemini.png",
    latency: "31ms",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    image: "/providers/deepseek.png",
    latency: "15ms",
  },
];

export default function FlowAnimation() {
  const [activeFlow, setActiveFlow] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % PROVIDERS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-12 w-full max-w-4xl relative h-[380px] hidden md:flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
      {/* BeeRouter Center Hub */}
      <div className="relative z-20 w-36 h-36 rounded-3xl bg-[#16181F] border-2 border-[#FFC700] shadow-[0_0_45px_rgba(255,199,0,0.35)] flex flex-col items-center justify-center gap-1.5 group cursor-pointer hover:scale-105 transition-transform duration-300">
        {/* Bee Logo Icon */}
        <div className="relative flex items-center justify-center size-12">
          <Image
            src="/logo.png?v=2"
            alt="BeeRouter Logo"
            width={48}
            height={48}
            className="object-contain drop-shadow-[0_0_12px_rgba(255,199,0,0.5)]"
            unoptimized
          />
        </div>
        <span className="text-xs font-extrabold text-white tracking-wider group-hover:text-[#FFC700] transition-colors">
          BeeRouter
        </span>
        <span className="text-[10px] font-semibold text-[#FFC700] tracking-widest uppercase">
          AI GATEWAY
        </span>

        {/* Glowing pulse rings */}
        <div className="absolute inset-0 rounded-3xl border border-[#FFC700]/40 animate-ping opacity-25 pointer-events-none" />
      </div>

      {/* CLI Tools - Left side */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-20">
        {CLI_TOOLS.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center gap-3 group cursor-pointer"
            title={tool.name}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#16181F] border border-[#282B37] flex items-center justify-center p-2 group-hover:border-[#FFC700]/60 group-hover:shadow-[0_0_20px_rgba(255,199,0,0.25)] group-hover:scale-105 transition-all">
              <ProviderIcon
                src={tool.image}
                alt={tool.name}
                size={38}
                className="object-contain rounded-xl max-w-[38px] max-h-[38px]"
                fallbackText={tool.name.slice(0, 2).toUpperCase()}
              />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none">
              {tool.name}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Input Streams: Left CLI tools -> BeeRouter Hub */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none stroke-[#FFC700]/40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="animate-[dash_2s_linear_infinite]"
          d="M 68 55 C 240 70, 250 190, 360 190"
          fill="none"
          strokeDasharray="4,4"
          strokeWidth="2"
        />
        <path
          className="animate-[dash_2s_linear_infinite]"
          d="M 68 145 C 240 145, 250 190, 360 190"
          fill="none"
          strokeDasharray="4,4"
          strokeWidth="2"
        />
        <path
          className="animate-[dash_2s_linear_infinite]"
          d="M 68 235 C 240 235, 250 190, 360 190"
          fill="none"
          strokeDasharray="4,4"
          strokeWidth="2"
        />
        <path
          className="animate-[dash_2s_linear_infinite]"
          d="M 68 325 C 240 310, 250 190, 360 190"
          fill="none"
          strokeDasharray="4,4"
          strokeWidth="2"
        />
      </svg>

      {/* SVG Output Streams: BeeRouter Hub -> AI Providers */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 440 190 C 550 190, 560 55, 730 55"
          fill="none"
          stroke={activeFlow === 0 ? "#FFC700" : "#282B37"}
          strokeWidth={activeFlow === 0 ? "3.5" : "1.5"}
          className={activeFlow === 0 ? "transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,199,0,0.8)]" : "transition-all duration-300"}
        />
        <path
          d="M 440 190 C 550 190, 560 145, 730 145"
          fill="none"
          stroke={activeFlow === 1 ? "#FFC700" : "#282B37"}
          strokeWidth={activeFlow === 1 ? "3.5" : "1.5"}
          className={activeFlow === 1 ? "transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,199,0,0.8)]" : "transition-all duration-300"}
        />
        <path
          d="M 440 190 C 550 190, 560 235, 730 235"
          fill="none"
          stroke={activeFlow === 2 ? "#FFC700" : "#282B37"}
          strokeWidth={activeFlow === 2 ? "3.5" : "1.5"}
          className={activeFlow === 2 ? "transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,199,0,0.8)]" : "transition-all duration-300"}
        />
        <path
          d="M 440 190 C 550 190, 560 325, 730 325"
          fill="none"
          stroke={activeFlow === 3 ? "#FFC700" : "#282B37"}
          strokeWidth={activeFlow === 3 ? "3.5" : "1.5"}
          className={activeFlow === 3 ? "transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,199,0,0.8)]" : "transition-all duration-300"}
        />
      </svg>

      {/* AI Providers - Right side */}
      <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between py-2 z-20">
        {PROVIDERS.map((provider, idx) => {
          const isActive = activeFlow === idx;
          return (
            <div
              key={provider.id}
              className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 font-semibold text-xs transition-all duration-300 cursor-pointer min-w-[160px] ${
                isActive
                  ? "bg-[#1F222B] border-[#FFC700] text-[#FFC700] ring-2 ring-[#FFC700]/50 shadow-[0_0_24px_rgba(255,199,0,0.35)] scale-105"
                  : "bg-[#16181F] border-[#282B37] text-gray-300 hover:border-gray-500 hover:bg-[#1A1D26]"
              }`}
              title={provider.name}
            >
              <div className="flex items-center gap-2.5">
                <ProviderIcon
                  src={provider.image}
                  alt={provider.name}
                  size={20}
                  className="rounded-md object-contain"
                  fallbackText={provider.name.slice(0, 2)}
                />
                <span>{provider.name}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span
                  className={`size-1.5 rounded-full ${
                    isActive ? "bg-[#FFC700] animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className={isActive ? "text-[#FFC700]" : "text-gray-500"}>
                  {provider.latency}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile fallback */}
      <div className="md:hidden mt-8 w-full p-4 rounded-xl bg-[#16181F] border border-[#282B37]">
        <p className="text-sm text-center text-gray-400">
          Interactive flow diagram visible on desktop
        </p>
      </div>
    </div>
  );
}
