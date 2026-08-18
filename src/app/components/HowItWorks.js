"use client";

export default function HowItWorks() {
  return (
    <section className="py-24 border-y border-[#282B37] bg-[#12141A]/50" id="how-it-works">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-4">
            <span className="material-symbols-outlined text-[14px]">route</span>
            Smart Architecture
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
            How BeeRouter Works
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Data flows seamlessly from your application through our local intelligent routing layer to the optimal AI model in real time.
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
                Your requests start from Claude Code, Cursor, Cline, or any OpenAI-compatible SDK pointing to your local gateway URL.
              </p>
            </div>
          </div>

          {/* Step 2: BeeRouter Hub */}
          <div className="flex flex-col gap-6 relative group text-center">
            <div className="w-24 h-24 rounded-2xl bg-[#16181F] border-2 border-[#FFC700] flex items-center justify-center shadow-[0_0_35px_rgba(255,199,0,0.3)] z-10 mx-auto group-hover:scale-105 transition-transform duration-300">
              {/* Bee icon */}
              <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-[#FFC700] to-[#F59E0B] text-black">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2L3.5 6.9v10.2L12 22l8.5-4.9V6.9L12 2zm0 2.4l6.5 3.75v7.5L12 19.4l-6.5-3.75v-7.5L12 4.4z"
                    opacity="0.9"
                  />
                  <ellipse cx="12" cy="12" rx="3" ry="4" />
                  <path
                    d="M7.8 9.5c.8-1.5 2.3-2.5 4.2-2.5s3.4 1 4.2 2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 11.5h4M9.5 13.5h5"
                    stroke="#16181F"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-[#FFC700]">2. BeeRouter Hive</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                The smart engine inspects headers, enforces quota auto-pings, checks model health, and routes for zero latency.
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
                The request is executed instantly by OpenAI, Anthropic, Gemini, DeepSeek, Groq, or your local Ollama instance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

