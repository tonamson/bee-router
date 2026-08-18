"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import ProviderIcon from "@/shared/components/ProviderIcon";

const CLI_TOOLS = [
  { id: "claude", name: "Claude Code", image: "/providers/claude.png", y: 55 },
  { id: "codex", name: "OpenAI Codex", image: "/providers/codex.png", y: 145 },
  { id: "cursor", name: "Cursor IDE", image: "/providers/cursor.png", y: 235 },
  { id: "cline", name: "Cline / Roo", image: "/providers/cline.png", y: 325 },
];

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI GPT-4o",
    image: "/providers/openai.png",
    latency: "24ms",
    y: 55,
    tag: "High Quality",
  },
  {
    id: "anthropic",
    name: "Claude 3.7 Sonnet",
    image: "/providers/anthropic.png",
    latency: "18ms",
    y: 145,
    tag: "Reasoning",
  },
  {
    id: "gemini",
    name: "Gemini 2.0 Flash",
    image: "/providers/gemini.png",
    latency: "21ms",
    y: 235,
    tag: "Cost Saver",
  },
  {
    id: "deepseek",
    name: "DeepSeek-V3",
    image: "/providers/deepseek.png",
    latency: "14ms",
    y: 325,
    tag: "Ultra Fast",
  },
];

export default function FlowAnimation() {
  const [activeFlow, setActiveFlow] = useState(0);
  const [hoveredTool, setHoveredTool] = useState(null);
  const [hoveredProvider, setHoveredProvider] = useState(null);

  useEffect(() => {
    if (hoveredProvider !== null) return;
    const interval = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % PROVIDERS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [hoveredProvider]);

  const currentActive = hoveredProvider !== null ? hoveredProvider : activeFlow;

  return (
    <div className="mt-8 w-full max-w-5xl relative h-[420px] hidden md:flex items-center justify-center select-none">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-[#FFC700]/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* SVG Canvas for Pixel-Perfect Snap Wires & Energy Particles */}
      <svg
        viewBox="0 0 920 380"
        className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="streamActive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFC700" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#FFD633" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFC700" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="streamInactive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#282B37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#282B37" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="streamInbound" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#FFC700" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FFC700" stopOpacity="1" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="superGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ================= INBOUND WIRES (LEFT TOOLS -> CENTER HUB) ================= */}
        {CLI_TOOLS.map((tool, idx) => {
          const isToolActive = hoveredTool === idx || hoveredTool === null;
          const d = `M 175 ${tool.y} C 280 ${tool.y}, 310 190, 390 190`;
          return (
            <g key={`inbound-${tool.id}`}>
              {/* Outer trace line */}
              <path
                d={d}
                fill="none"
                stroke="#282B37"
                strokeWidth="2"
                strokeDasharray="4,4"
                className="opacity-40"
              />
              {/* Animated stream line */}
              <path
                d={d}
                fill="none"
                stroke={isToolActive ? "url(#streamInbound)" : "#282B37"}
                strokeWidth={isToolActive ? "2.5" : "1"}
                strokeDasharray="8,8"
                className="animate-[dash_1.5s_linear_infinite]"
                style={{ opacity: isToolActive ? 0.9 : 0.2 }}
              />
              {/* Glowing Inbound Energy Pulse Particle */}
              {isToolActive && (
                <circle r="3.5" fill="#FFC700" filter="url(#glow)">
                  <animateMotion
                    path={d}
                    dur={`${2.2 + idx * 0.4}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* ================= OUTBOUND WIRES (CENTER HUB -> RIGHT PROVIDERS) ================= */}
        {PROVIDERS.map((provider, idx) => {
          const isActive = currentActive === idx;
          const d = `M 530 190 C 610 190, 640 ${provider.y}, 740 ${provider.y}`;
          return (
            <g key={`outbound-${provider.id}`}>
              {/* Base background wire */}
              <path
                d={d}
                fill="none"
                stroke={isActive ? "url(#streamActive)" : "url(#streamInactive)"}
                strokeWidth={isActive ? "3.5" : "1.5"}
                className={
                  isActive
                    ? "transition-all duration-300 drop-shadow-[0_0_12px_rgba(255,199,0,0.8)]"
                    : "transition-all duration-300 opacity-40"
                }
              />

              {/* Active flowing neon stream */}
              {isActive && (
                <>
                  <path
                    d={d}
                    fill="none"
                    stroke="#FFF"
                    strokeWidth="1.5"
                    strokeDasharray="6,12"
                    className="animate-[dash_1s_linear_infinite] opacity-80"
                    filter="url(#glow)"
                  />

                  {/* Traveling Energy Orb */}
                  <circle r="4.5" fill="#FFF" filter="url(#superGlow)">
                    <animateMotion
                      path={d}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="2.5" fill="#FFC700">
                    <animateMotion
                      path={d}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}
            </g>
          );
        })}

        {/* Center Hive Glowing Core Circles */}
        <circle cx="460" cy="190" r="68" fill="none" stroke="#FFC700" strokeWidth="1" strokeDasharray="3,6" className="animate-[spin_20s_linear_infinite] opacity-30 origin-[460px_190px]" />
      </svg>

      {/* ================= LEFT SIDE: CLI & AGENT TOOLS ================= */}
      <div className="absolute left-4 top-0 bottom-0 w-44 flex flex-col justify-between py-2 z-20">
        {CLI_TOOLS.map((tool, idx) => {
          const isHovered = hoveredTool === idx;
          return (
            <div
              key={tool.id}
              onMouseEnter={() => setHoveredTool(idx)}
              onMouseLeave={() => setHoveredTool(null)}
              className={`h-[60px] px-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 cursor-pointer ${
                isHovered
                  ? "bg-[#1F222B] border-[#FFC700] ring-2 ring-[#FFC700]/40 shadow-[0_0_20px_rgba(255,199,0,0.3)] scale-105"
                  : "bg-[#16181F]/90 border-[#282B37] hover:border-gray-500 hover:bg-[#1A1D26]"
              }`}
              title={tool.name}
            >
              <div className="w-10 h-10 rounded-lg bg-[#0D0E12] border border-[#282B37] flex items-center justify-center p-1.5 flex-none">
                <ProviderIcon
                  src={tool.image}
                  alt={tool.name}
                  size={26}
                  className="object-contain rounded-md"
                  fallbackText={tool.name.slice(0, 2).toUpperCase()}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{tool.name}</span>
                <span className="text-[10px] font-mono text-gray-500">Agent Client</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= CENTER: BEEROUTER SMART HIVE HUB ================= */}
      <div className="relative z-20 w-40 h-40 rounded-3xl bg-[#16181F] border-2 border-[#FFC700] shadow-[0_0_55px_rgba(255,199,0,0.4)] flex flex-col items-center justify-center gap-1.5 group cursor-pointer hover:scale-105 transition-all duration-300">
        {/* Animated Cyber Corner Accents */}
        <div className="absolute -top-1.5 -left-1.5 size-3 border-t-2 border-l-2 border-[#FFC700]" />
        <div className="absolute -top-1.5 -right-1.5 size-3 border-t-2 border-r-2 border-[#FFC700]" />
        <div className="absolute -bottom-1.5 -left-1.5 size-3 border-b-2 border-l-2 border-[#FFC700]" />
        <div className="absolute -bottom-1.5 -right-1.5 size-3 border-b-2 border-r-2 border-[#FFC700]" />

        {/* Bee Logo Icon */}
        <div className="relative flex items-center justify-center size-14">
          <Image
            src="/logo.png?v=2"
            alt="BeeRouter Logo"
            width={54}
            height={54}
            className="object-contain drop-shadow-[0_0_15px_rgba(255,199,0,0.6)]"
            unoptimized
          />
        </div>
        <span className="text-xs font-black text-white tracking-wider group-hover:text-[#FFC700] transition-colors">
          BeeRouter
        </span>
        <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#FFC700] bg-[#FFC700]/10 px-2 py-0.5 rounded-full border border-[#FFC700]/30">
          <span className="size-1.5 rounded-full bg-[#FFC700] animate-pulse" />
          <span>LOCAL PROXY</span>
        </div>

        {/* Glowing pulse aura */}
        <div className="absolute inset-0 rounded-3xl border border-[#FFC700]/50 animate-ping opacity-20 pointer-events-none" />
      </div>

      {/* ================= RIGHT SIDE: TARGET PROVIDERS ================= */}
      <div className="absolute right-4 top-0 bottom-0 w-44 flex flex-col justify-between py-2 z-20">
        {PROVIDERS.map((provider, idx) => {
          const isActive = currentActive === idx;
          return (
            <div
              key={provider.id}
              onClick={() => setActiveFlow(idx)}
              onMouseEnter={() => setHoveredProvider(idx)}
              onMouseLeave={() => setHoveredProvider(null)}
              className={`h-[60px] px-3.5 rounded-xl border flex items-center justify-between gap-2 transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-[#1F222B] border-[#FFC700] text-white ring-2 ring-[#FFC700]/50 shadow-[0_0_25px_rgba(255,199,0,0.35)] scale-105"
                  : "bg-[#16181F]/90 border-[#282B37] text-gray-300 hover:border-gray-500 hover:bg-[#1A1D26]"
              }`}
              title={`Click to route to ${provider.name}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ProviderIcon
                  src={provider.image}
                  providerId={provider.id}
                  alt={provider.name}
                  size={24}
                  className="rounded-md object-contain flex-none"
                  fallbackText={provider.name.slice(0, 2)}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs truncate text-white">{provider.name}</span>
                  <span
                    className={`text-[9px] font-mono font-medium ${
                      isActive ? "text-[#FFC700]" : "text-gray-500"
                    }`}
                  >
                    {provider.tag}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end font-mono text-[10px] flex-none">
                <span
                  className={`size-2 rounded-full mb-0.5 ${
                    isActive ? "bg-[#FFC700] shadow-[0_0_8px_#FFC700] animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className={isActive ? "text-[#FFC700] font-bold" : "text-gray-500"}>
                  {provider.latency}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
