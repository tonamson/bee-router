"use client";

import Image from "next/image";

export default function HowItWorks() {
  return (
    <section className="py-24 border-y border-[#282B37] bg-[#12141A]/50" id="how-it-works">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">route</span>
            Request Architecture
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            How BeeRouter Works
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Client requests flow into BeeRouter on localhost, dynamically translate formats, execute through the best provider node, and stream back in real time.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection line behind cards */}
          <div className="hidden md:block absolute top-12 left-[18%] right-[18%] h-[2px] bg-gradient-to-r from-gray-700 via-[#FFC700] to-gray-700 -z-10" />
          
          {/* Step 1: CLI & SDKs */}
          <div className="flex flex-col gap-6 relative group text-center md:text-left">
            <div className="w-24 h-24 rounded-2xl bg-[#16181F] border border-[#282B37] flex items-center justify-center shadow-xl group-hover:border-[#FFC700]/50 group-hover:shadow-[0_0_20px_rgba(255,199,0,0.2)] transition-all duration-300 z-10 mx-auto md:mx-0">
              <span className="material-symbols-outlined text-4xl text-gray-300 group-hover:text-[#FFC700] transition-colors">
                terminal
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">1. CLI &amp; SDK Clients</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Claude Code, Cursor, Cline, Codex, Antigravity, or any standard OpenAI SDK pointing to your local gateway.
              </p>
            </div>
          </div>

          {/* Step 2: BeeRouter Hub */}
          <div className="flex flex-col gap-6 relative group text-center">
            <div className="w-24 h-24 rounded-2xl bg-[#16181F] border-2 border-[#FFC700] flex items-center justify-center shadow-[0_0_35px_rgba(255,199,0,0.3)] z-10 mx-auto group-hover:scale-105 transition-transform duration-300">
              {/* Official BeeRouter Logo */}
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
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-[#FFC700]">2. BeeRouter Engine</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Inspects payload format, selects optimal accounts/combos, applies caching, and translates protocols on-the-fly.
              </p>
            </div>
          </div>

          {/* Step 3: AI Providers */}
          <div className="flex flex-col gap-6 relative group text-center md:text-right">
            <div className="w-24 h-24 rounded-2xl bg-[#16181F] border border-[#282B37] flex items-center justify-center shadow-xl group-hover:border-[#FFC700]/50 group-hover:shadow-[0_0_20px_rgba(255,199,0,0.2)] transition-all duration-300 z-10 mx-auto md:ml-auto md:mr-0">
              <span className="material-symbols-outlined text-4xl text-gray-300 group-hover:text-[#FFC700] transition-colors">
                dns
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">3. AI Model Providers</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Dispatches to OpenAI, Anthropic, Gemini, DeepSeek, Groq, local Ollama, or custom configured provider nodes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
