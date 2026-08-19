"use client";

import { useState, useEffect } from "react";
import ProviderIcon from "@/shared/components/ProviderIcon";

const STRATEGIES = [
  {
    id: "latency",
    name: "Lowest Latency",
    icon: "bolt",
    tag: "Latency",
    description: "Example combo that prefers a fast OpenAI-compatible node when one is configured.",
    request: {
      model: "auto:fastest",
      prompt: "Generate instant code autocomplete for TypeScript interface...",
      tokens: 140,
    },
    routeResult: {
      provider: "Groq (Llama 3.3 70B)",
      providerId: "groq",
      iconSrc: "/providers/groq.png",
      latency: "14ms",
      throughput: "380 tps",
      status: "200 OK",
      reason: "Illustration only: this combo listed Groq first.",
      cost: "$0.00008",
    },
  },
  {
    id: "cost",
    name: "Cost Optimizer",
    icon: "savings",
    tag: "Cost",
    description: "Example combo that lists a cheaper model first. You pick the order; BeeRouter does not invent prices.",
    request: {
      model: "auto:cost-efficient",
      prompt: "Summarize 12 pages of markdown documentation into bullet points...",
      tokens: 4200,
    },
    routeResult: {
      provider: "DeepSeek V3",
      providerId: "deepseek",
      iconSrc: "/providers/deepseek.png",
      latency: "42ms",
      throughput: "120 tps",
      status: "200 OK",
      reason: "Illustration only: cheaper model listed first in the combo.",
      cost: "list price of that model",
    },
  },
  {
    id: "fallback",
    name: "Zero-Downtime Fallback",
    icon: "health_and_safety",
    tag: "Fallback",
    description: "Example combo: first member 429s, BeeRouter tries the next member and returns that stream to the client.",
    request: {
      model: "combo:prod-critical",
      prompt: "Execute critical payment webhook validation and transaction log...",
      tokens: 520,
    },
    routeResult: {
      provider: "Anthropic Claude 3.7 Sonnet",
      providerId: "anthropic",
      iconSrc: "/providers/anthropic.png",
      latency: "28ms",
      throughput: "95 tps",
      status: "200 OK (Auto-recovered)",
      reason: "Illustration only: first member 429, second member served the response.",
      cost: "$0.0012",
      fallbackEvent: "429 Rate Limit → Recovered",
    },
  },
  {
    id: "reasoning",
    name: "Deep Reasoning",
    icon: "psychology",
    tag: "High Quality",
    description: "Detects complex algorithmic and multi-step reasoning tasks to dispatch to top-tier frontier models.",
    request: {
      model: "combo:coding-pro",
      prompt: "Refactor distributed consensus algorithm with raft protocol in Go...",
      tokens: 1850,
    },
    routeResult: {
      provider: "Claude 3.7 Sonnet / o3-mini",
      providerId: "anthropic",
      iconSrc: "/providers/anthropic.png",
      latency: "65ms",
      throughput: "88 tps",
      status: "200 OK",
      reason: "High reasoning depth detected. Routed to primary frontier coding engine.",
      cost: "$0.0031",
    },
  },
];

export default function RouteSimulator() {
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
  const [isSimulating, setIsSimulating] = useState(false);

  const active = STRATEGIES.find((s) => s.id === selectedStrategy) || STRATEGIES[0];

  const handleSelect = (id) => {
    setSelectedStrategy(id);
    setIsSimulating(true);
  };

  useEffect(() => {
    if (isSimulating) {
      const timer = setTimeout(() => setIsSimulating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isSimulating]);

  return (
    <section className="py-20 px-6" id="simulator">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Interactive Simulation
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            How a combo pick looks
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            These cards are illustrations of combo order, not live measurements from this machine.
          </p>
        </div>

        {/* Strategy Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8">
          {STRATEGIES.map((item) => {
            const isCurrent = item.id === selectedStrategy;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col gap-2 relative ${
                  isCurrent
                    ? "bg-[#1F222B] border-[#FFC700] ring-2 ring-[#FFC700]/40 shadow-[0_0_20px_rgba(255,199,0,0.2)]"
                    : "bg-[#16181F] border-[#282B37] hover:border-gray-600 hover:bg-[#1A1D26]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isCurrent ? "text-[#FFC700]" : "text-gray-400"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isCurrent
                        ? "bg-[#FFC700]/20 text-[#FFC700]"
                        : "bg-[#282B37] text-gray-400"
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{item.name}</div>
              </button>
            );
          })}
        </div>

        {/* Interactive Live Playground Card */}
        <div className="max-w-5xl mx-auto rounded-2xl bg-[#12141A] border border-[#282B37] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#16181F] border-b border-[#282B37] gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-gray-300">
                Active Strategy: <strong className="text-white">{active.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
              <span className="bg-[#0D0E12] px-2.5 py-1 rounded border border-[#282B37]">
                Overhead: <strong className="text-[#FFC700]">&lt;0.6ms</strong>
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Inbound Request (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-sky-400">input</span>
                  Inbound Client Request
                </span>
                <span className="font-mono text-[11px] text-gray-500">POST /v1/chat/completions</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0E12] border border-[#282B37] font-mono text-xs text-gray-300 space-y-2 relative">
                <div className="text-gray-500">// Target alias configured by client</div>
                <div>
                  <span className="text-[#FFC700]">model:</span>{" "}
                  <span className="text-emerald-400">&quot;{active.request.model}&quot;</span>
                </div>
                <div>
                  <span className="text-[#FFC700]">messages:</span> [
                  <div className="pl-4 text-gray-400 truncate">
                    &#123; role: &quot;user&quot;, content: &quot;{active.request.prompt}&quot; &#125;
                  </div>
                  ]
                </div>
                <div className="pt-2 border-t border-[#282B37] flex items-center justify-between text-[11px] text-gray-500">
                  <span>Estimated tokens: ~{active.request.tokens}</span>
                  <span className="text-[#FFC700]">Keep-Warm Active</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed italic">
                {active.description}
              </p>
            </div>

            {/* Middle: BeeRouter Decision Engine (2 cols) */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#16181F] border-2 border-[#FFC700] flex items-center justify-center shadow-[0_0_25px_rgba(255,199,0,0.3)] relative group">
                <span className="material-symbols-outlined text-2xl text-[#FFC700] animate-[spin_10s_linear_infinite]">
                  hub
                </span>
                <div className="absolute -top-2 px-1.5 py-0.2 rounded bg-[#FFC700] text-[9px] font-black text-black uppercase">
                  BEE
                </div>
              </div>
              <div className="text-center font-mono text-[10px] text-gray-400">
                <div className="text-white font-bold">SMART ROUTER</div>
                <div className="text-[#FFC700] flex items-center justify-center gap-1">
                  <span>⚡ 0.4ms inspect</span>
                </div>
              </div>
            </div>

            {/* Right: Routed Destination & Live Metrics (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">output</span>
                  Routed Destination &amp; Response
                </span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold">
                  {active.routeResult.status}
                </span>
              </div>

              <div className={`p-4 rounded-xl bg-[#0D0E12] border transition-all duration-300 ${
                isSimulating ? "border-[#FFC700] scale-[0.99]" : "border-[#282B37]"
              }`}>
                {/* Target Provider Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#282B37]">
                  <div className="flex items-center gap-2.5">
                    <ProviderIcon
                      src={active.routeResult.iconSrc}
                      providerId={active.routeResult.providerId}
                      alt={active.routeResult.provider}
                      size={24}
                      className="rounded-md object-contain"
                      fallbackText={active.routeResult.provider.slice(0, 2)}
                    />
                    <span className="font-bold text-sm text-white">
                      {active.routeResult.provider}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#FFC700] font-bold">
                    {active.routeResult.latency}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
                  <div className="p-2 rounded bg-[#16181F] border border-[#282B37]">
                    <div className="text-gray-500 text-[10px]">THROUGHPUT</div>
                    <div className="text-white font-bold">{active.routeResult.throughput}</div>
                  </div>
                  <div className="p-2 rounded bg-[#16181F] border border-[#282B37]">
                    <div className="text-gray-500 text-[10px]">ESTIMATED COST</div>
                    <div className="text-emerald-400 font-bold">{active.routeResult.cost}</div>
                  </div>
                </div>

                {/* Reason */}
                <div className="text-xs text-gray-300 leading-relaxed bg-[#16181F]/60 p-2.5 rounded border border-[#282B37]">
                  <span className="text-[#FFC700] font-bold">Decision: </span>
                  {active.routeResult.reason}
                </div>

                {active.routeResult.fallbackEvent && (
                  <div className="mt-2 text-[11px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">sync_problem</span>
                    {active.routeResult.fallbackEvent}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
